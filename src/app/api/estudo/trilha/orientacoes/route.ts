import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../../auth"

// Orientações da Trilha de Estudos: recebe um RESUMO compacto das metas (nunca a trilha
// inteira) e devolve 1-2 frases táticas por meta, escritas pela IA. A trilha em si é gerada
// deterministicamente no cliente (src/lib/trilha-generator.ts) — esta rota é opcional por
// design: se falhar, a trilha funciona sem orientações (graceful degradation no TrilhaTab).

export const maxDuration = 60

interface MetaResumo {
  numero: number
  materias: string[]
  nTopicos: number
  temTeoria: boolean
  temRevisao: boolean
}

const PROMPT_SISTEMA = `Você é um coach de concursos públicos fiscais brasileiros (SEFAZ, Receita), direto e motivador.

Recebe a lista de metas de um plano de estudos. Cada meta é PEQUENA e focada: um bloco de poucos tópicos de UMA matéria só, só de TEORIA (sem questões — o plano é só de tarefas de estudo) — não é uma semana inteira, é uma sessão de estudo. Para CADA meta, escreva 1-2 frases curtas em português com orientação tática sobre ESSE bloco específico: como abordar o tópico, uma dica de estudo ou de prova, um empurrão de motivação quando fizer sentido (sem exagerar). Varie o tom entre as metas — nada de repetir a mesma fórmula.

Responda SOMENTE com JSON válido no formato:
{"orientacoes": {"1": "texto da meta 1", "2": "texto da meta 2", ...}}

Regras: uma entrada pra cada meta recebida (chave = número da meta como string); frases curtas; sem markdown; não invente matérias que não estão na meta.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
  }

  const body = (await req.json()) as { concursoNome?: string; dataProva?: string; metas?: MetaResumo[] }
  const metas = body.metas ?? []
  if (metas.length === 0 || metas.length > 120) {
    return NextResponse.json({ error: "Lista de metas inválida" }, { status: 400 })
  }

  const linhas = metas
    .map(
      (m) =>
        `Meta ${m.numero}: ${m.materias.join(", ")} · ${m.nTopicos} tópico(s)` +
        `${m.temTeoria ? " · com teoria nova" : " · sem teoria nova"}${m.temRevisao ? " · com revisões" : ""}`
    )
    .join("\n")

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        {
          role: "user",
          content: `Concurso: ${body.concursoNome ?? "concurso fiscal"}${body.dataProva ? `\nData da prova: ${body.dataProva}` : ""}\n\nMetas:\n${linhas}`,
        },
      ],
    })
    const texto = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(texto) as { orientacoes?: Record<string, string> }
    if (!parsed.orientacoes) throw new Error("resposta sem orientacoes")
    return NextResponse.json({ orientacoes: parsed.orientacoes })
  } catch (e) {
    return NextResponse.json(
      { error: `Erro da IA ao gerar orientações: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }
}
