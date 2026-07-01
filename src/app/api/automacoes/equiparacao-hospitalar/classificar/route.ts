import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../../auth"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type ClassificacaoOportunidade = "Sim" | "Não" | "Meio" | "Dúvida"

const PROMPT_BASE = `Você é um especialista tributário analisando descrições de serviços em notas fiscais (NFS-e) de uma clínica/estabelecimento médico, para identificar oportunidade de equiparação hospitalar.

BASE LEGAL: Solução de Consulta Disit/SRRF04 nº 4027/2016 (vinculada às Soluções de Consulta Cosit nº 7, 47, 86 e 162/2014 e nº 36/2016) — para apuração do IRPJ e da CSLL no lucro presumido, aplica-se o coeficiente reduzido de 8% (IRPJ) e 12% (CSLL), em vez do coeficiente cheio de serviços, sobre a receita de prestação de atendimento de apoio ao diagnóstico e terapia (ultrassonografia, eletrocardiograma, ecocardiograma, teste ergométrico, holter, MAPA, doppler, exame de carótidas, tomografia, ressonância magnética e afins), desde que o prestador seja organizado como sociedade empresária e atenda a Resolução RDC Anvisa nº 50/2002.

REGRAS DE CLASSIFICAÇÃO — analise a descrição do serviço de cada nota e classifique em uma destas 4 categorias:

- "Sim": a descrição indica claramente um procedimento/exame que se enquadra na equiparação, sem ambiguidade — ex.: cirurgia, procedimento cirúrgico, implante de marca-passo, anestesia, perfusão extracorpórea, ou exames cardiológicos específicos citados nominalmente (ECG/eletrocardiograma, ecocardiograma, holter, MAPA, doppler, US de carótidas, tomografia, ressonância) SEM estarem junto de uma consulta.
- "Meio": a descrição combina uma CONSULTA médica (cardiológica ou geral) JUNTO com exames específicos que se enquadram (ex.: "consulta com cardiologista + ECG/ecocardiograma/holter/MAPA/doppler") — parte do valor da nota tem oportunidade (o exame), parte não (a consulta em si).
- "Não": a descrição claramente NÃO se enquadra — ex.: "serviços médicos prestados" genérico sem detalhamento, "despesas médicas", consulta eletiva isolada sem nenhum exame, procedimento dentário sem especificar qual procedimento, ou qualquer descrição de mera consulta/atendimento sem exame complementar qualificado.
- "Dúvida": a descrição menciona algo que PODE se enquadrar mas não há informação suficiente pra confirmar com segurança — ex.: "avaliação de marca-passo" isolada sem nenhum exame associado, "exames laboratoriais" sem especificar qual exame foi feito, combinação de várias consultas de especialidades diferentes (cardiologista, endocrinologista, nutricionista, psicólogo, dentista) sem detalhamento do que foi feito em cada uma.

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
