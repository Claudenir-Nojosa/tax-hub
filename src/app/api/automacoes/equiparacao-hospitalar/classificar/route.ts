import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../../auth"

// maxRetries alto pois essa rota é chamada em dezenas/centenas de lotes numa importação grande
// e a conta tem um limite baixo de tokens/min — a SDK já faz backoff respeitando o
// header retry-after do OpenAI em erros 429/5xx.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 6 })

export type ClassificacaoOportunidade = "Sim" | "Não" | "Meio" | "Dúvida"

const PROMPT_BASE = `Você é um especialista tributário analisando descrições de serviços em notas fiscais (NFS-e) de uma clínica/estabelecimento médico, para identificar oportunidade de equiparação hospitalar.

BASE LEGAL: Solução de Consulta Disit/SRRF04 nº 4027/2016 (vinculada às Soluções de Consulta Cosit nº 7, 47, 86 e 162/2014 e nº 36/2016) — para apuração do IRPJ e da CSLL no lucro presumido, aplica-se o coeficiente reduzido de 8% (IRPJ) e 12% (CSLL), em vez do coeficiente cheio de serviços, sobre a receita de prestação de atendimento de apoio ao diagnóstico e terapia (ultrassonografia, eletrocardiograma, ecocardiograma, teste ergométrico, holter, MAPA, doppler, exame de carótidas, tomografia, ressonância magnética e afins), desde que o prestador seja organizado como sociedade empresária e atenda a Resolução RDC Anvisa nº 50/2002.

PROCEDIMENTOS que SEMPRE se enquadram na equiparação (independentemente de estarem citados nominalmente ou de forma similar):
Defeitos cardíacos congênitos, cirurgia venosa, colocação do balão intra-aórtico, aneurisma do VE, cirurgia multivalvar, transplante de coração, implante de marcapasso e desfibriladores, terapia de conversão elétrica, terapia de cardioestimulação transesofágica, e qualquer outra cirurgia/procedimento cirúrgico ou anestesia.

EXAMES que SEMPRE se enquadram na equiparação:
Ecocardiograma, ecodoppler vertebral e arterial, ECG/eletrocardiograma, avaliação de marcapasso, teste ergométrico, MAPA 24h, holter 24h, looper de eventos, US doppler de carótidas, tomografia, ressonância magnética, e afins.

REGRAS DE CLASSIFICAÇÃO — analise a descrição do serviço de cada nota e classifique em uma destas 4 categorias:

- "Sim": a descrição cita, SEM estar junto de uma CONSULTA na mesma descrição, algum item das listas de procedimentos ou exames acima.
- "Meio": a descrição cita algum item das listas acima JUNTO com uma CONSULTA médica (cardiológica ou geral) na MESMA descrição/nota (ex.: "consulta com cardiologista + ECG/ecocardiograma"). Nesse caso só é meia oportunidade porque, pra ter oportunidade confiável (100%), a nota precisaria vir rateada/separada — uma nota só de consulta e outra nota só do exame/procedimento. Como vem tudo junto numa nota só, não dá pra ter certeza de quanto do valor é exame e quanto é consulta, por isso considera-se apenas metade da oportunidade.
- "Não": a descrição claramente NÃO se enquadra — ex.: "serviços médicos prestados" genérico sem detalhamento, "despesas médicas", consulta eletiva isolada sem nenhum exame/procedimento das listas acima, procedimento dentário sem especificar qual procedimento, ou qualquer descrição de mera consulta/atendimento sem exame complementar qualificado.
- "Dúvida": a descrição menciona algo que PODE se enquadrar mas não há informação suficiente pra confirmar com segurança — ex.: "exames laboratoriais" sem especificar qual exame foi feito, ou combinação de várias consultas de especialidades diferentes (cardiologista, endocrinologista, nutricionista, psicólogo, dentista) sem detalhamento do que foi feito em cada uma.

ATENÇÃO: sempre que a descrição tiver a palavra "CONSULTA" (em qualquer variação — consulta cardiológica, consulta com cardiologista, consulta geral etc.) E TAMBÉM citar um item das listas de procedimentos/exames acima, a classificação é "Meio" — mesmo que o item da lista pareça pouco detalhado (ex.: "avaliação de marcapasso" sozinha já conta). Só classifique como "Não" quando NENHUM item das listas aparecer na descrição.

EXEMPLOS (siga este padrão):
- "AVALIAÇÃO DE MARCA-PASSO." → Sim (exame da lista, sem consulta na mesma descrição)
- "CONSULTA CARDIOLÓGICA; AVALIAÇÃO DE MARCA-PASSO." → Meio (tem "consulta" + exame da lista juntos)
- "CONSULTA COM CARDIOLOGISTA. AVALIAÇÃO DE MARCA-PASSO." → Meio
- "CONSULTA COM CARDIOLOGISTA EXAMES CARDIOLÓGICOS (ECG, ECOCARDIOGRAMA)." → Meio
- "IMPLANTE DE MARCAPASSO NO PACIENTE X." → Sim (procedimento da lista, sem consulta)
- "SERVIÇOS MÉDICOS PRESTADOS NA DATA X DR. Y." → Não (nenhum item da lista)
- "CONSULTA ELETIVA." → Não (consulta sozinha, nenhum item da lista junto)

Analise cada item da lista abaixo (identificado pelo campo "id") e retorne APENAS um JSON no formato:
{"classificacoes": [{"id": 0, "classificacao": "Sim"}, {"id": 1, "classificacao": "Não"}, ...]}

Um item por "id" da lista, na mesma ordem. Não pule nenhum id.

ITENS:
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { itens } = body as { itens?: { id: number; descricao: string }[] }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: "itens é obrigatório" }, { status: 400 })
  }
  if (itens.length > 100) {
    return NextResponse.json({ error: "Máximo de 100 itens por lote" }, { status: 400 })
  }

  try {
    const listaTexto = itens
      .map((item) => `id=${item.id}: ${item.descricao.trim() || "(sem descrição)"}`)
      .join("\n")

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: PROMPT_BASE + listaTexto }],
    })

    const content = response.choices[0]?.message?.content ?? "{}"
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("IA não retornou JSON válido")

    const parsed = JSON.parse(jsonMatch[0]) as {
      classificacoes?: { id: number; classificacao: ClassificacaoOportunidade }[]
    }
    if (!parsed.classificacoes || !Array.isArray(parsed.classificacoes)) {
      throw new Error("IA não retornou classificações válidas")
    }

    return NextResponse.json({ classificacoes: parsed.classificacoes })
  } catch (err) {
    console.error("[equiparacao-hospitalar/classificar] erro:", err)
    return NextResponse.json({ error: "Erro ao classificar com IA" }, { status: 500 })
  }
}
