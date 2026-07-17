import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../../auth"

// Grifo → cartão: recebe um TRECHO grifado pelo usuário no leitor de PDF da Biblioteca e gera
// 1-3 flashcards daquele trecho, JÁ na matéria/tópico do PDF (vêm do client, mas são só
// metadados de organização — a IA não os infere, recebe prontos). Devolve cartas completas no
// shape de `Carta` (com defaults de repetição espaçada), prontas pra concatenar no baralho.

export const maxDuration = 60

interface BodyGrifo {
  trecho?: string
  materia?: string
  topico?: string
  nomePdf?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
  }

  const body = (await req.json()) as BodyGrifo
  const trecho = (body.trecho ?? "").trim().slice(0, 6000)
  const materia = (body.materia ?? "").trim().slice(0, 120)
  const topico = (body.topico ?? "").trim().slice(0, 200) || undefined
  if (trecho.length < 20 || materia === "") {
    return NextResponse.json({ error: "trecho (≥20 chars) e materia são obrigatórios" }, { status: 400 })
  }

  const prompt = `Você é especialista em criação de flashcards para concursos públicos brasileiros (área tributária/fiscal — SEFAZ).

O aluno GRIFOU o trecho abaixo enquanto lia um PDF de ${materia}${topico ? ` (tópico: ${topico})` : ""}${body.nomePdf ? ` — material: "${String(body.nomePdf).slice(0, 150)}"` : ""}. Gere flashcards SOMENTE sobre o que está no trecho grifado (é o que ele quer memorizar — não invente conteúdo de fora).

TRECHO GRIFADO:
\`\`\`
${trecho}
\`\`\`

REGRAS:
1. Gere 1 a 3 cartas, conforme a densidade do trecho (trecho curto e único conceito = 1 carta).
2. Tipos disponíveis:
   - "monstro": pergunta dissertativa aberta
   - "armadilha": afirmação Verdadeiro/Falso — inclua "gabarito": "verdadeiro" ou "falso"
   - "tesouro": complete a lacuna usando ___
3. A frente é a pergunta/afirmação/lacuna; o verso é a resposta completa, didática e autocontida.
4. Português brasileiro, linguagem de prova de concurso.

Retorne APENAS JSON válido:
{"cartas": [{"tipo": "monstro" | "armadilha" | "tesouro", "frente": "...", "verso": "...", "gabarito": "verdadeiro" | "falso" | null}]}`

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você é especialista em flashcards para concursos. Responda SEMPRE em JSON válido conforme a estrutura solicitada." },
        { role: "user", content: prompt },
      ],
    })
    const texto = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(texto) as { cartas?: Record<string, unknown>[] }
    // dia no fuso do usuário (BR), não UTC do servidor — mesmo cuidado da rota /api/ai/cartas
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date())
    const cartas = (parsed.cartas ?? []).slice(0, 3).map((c, i) => ({
      id: `grifo_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      tipo: c.tipo === "armadilha" || c.tipo === "tesouro" ? c.tipo : "monstro",
      materia,
      ...(topico ? { topico } : {}),
      frente: String(c.frente ?? "").trim(),
      verso: String(c.verso ?? "").trim(),
      ...(c.gabarito === "verdadeiro" || c.gabarito === "falso" ? { gabarito: c.gabarito } : {}),
      intervalo: 0,
      facilidade: 2.5,
      repeticoes: 0,
      proximaRevisao: today,
      criada: today,
      acertos: 0,
      erros: 0,
    })).filter((c) => c.frente !== "" && c.verso !== "")
    if (cartas.length === 0) throw new Error("IA não retornou cartas válidas")
    return NextResponse.json({ cartas })
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao gerar o cartão: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }
}
