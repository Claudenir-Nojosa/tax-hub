import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import { nomeProfessora } from "@/lib/professora-data"

// Professora IA por voz: esta rota SÓ minta um token efêmero (client_secret) da OpenAI Realtime
// API — o áudio da conversa flui direto navegador↔OpenAI via WebRTC, sem passar pelo Vercel
// (zero risco de timeout de função, zero custo de banda no servidor). A persona (instruções da
// sabatina) é montada AQUI no servidor: o client manda só matéria/tópicos, nunca instruções
// prontas — evita prompt injection via payload.

// ─── Config (1 linha pra trocar) ─────────────────────────────────────────────
// gpt-realtime-mini é ~4-5x mais barato que gpt-realtime; subir pro cheio se a sabatina ficar
// fraca (perguntas rasas demais / correções erradas).
const MODELO = "gpt-realtime-mini"
const VOZ = "marin" // feminina; alternativas femininas: shimmer, coral, sage
const TOKEN_TTL_SEGUNDOS = 600 // só pra ESTABELECER a conexão — não limita a duração da sessão

interface BodyToken {
  materiaNome?: string
  topicos?: string[]
  concursoNome?: string
  topicosEstudados?: string[]
}

function montarInstrucoes(params: {
  nome: string
  materiaNome: string
  concursoNome: string
  topicos: string[]
  topicosEstudados: string[]
}): string {
  const { nome, materiaNome, concursoNome, topicos, topicosEstudados } = params
  return `Você é ${nome}, professora brasileira especialista em ${materiaNome}, preparando um aluno para o concurso ${concursoNome}. Fale SEMPRE em português brasileiro.

DINÂMICA — SABATINA ORAL:
- Comece se apresentando em 1 frase e já faça a primeira pergunta.
- Faça UMA pergunta por vez, SOMENTE sobre os tópicos da sabatina listados abaixo. Espere a resposta falada do aluno.
- Resposta certa: elogie brevemente (varie o elogio) e emende a próxima pergunta.
- Resposta errada ou incompleta: diga o que faltou, explique o correto em 2-3 frases, depois siga para a próxima pergunta.
- Se o aluno pedir para pular, repetir ou mudar de tópico (dentro da lista), atenda.
- Tom encorajador de professora experiente, nunca condescendente.
- Respostas CURTAS (isto é uma conversa falada): no máximo ~4 frases por turno.
- Não fuja de ${materiaNome}; se o aluno perguntar sobre outra coisa, redirecione com bom humor para a sabatina.

TÓPICOS DA SABATINA (pergunte EXCLUSIVAMENTE sobre eles — o aluno escolheu esta lista de propósito): ${topicos.join("; ")}
- Quando a lista for curta, APROFUNDE cada tópico em vez de correr: conceito, detalhes, exceções, pegadinhas clássicas de prova e casos práticos.${
    topicosEstudados.length > 0
      ? `\n\nPRIORIZE estes tópicos, que o aluno já estudou: ${topicosEstudados.join("; ")}`
      : ""
  }`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
  }

  const body = (await req.json()) as BodyToken
  const materiaNome = (body.materiaNome ?? "").trim().slice(0, 120)
  const topicos = (body.topicos ?? []).filter((t) => typeof t === "string" && t.trim() !== "").map((t) => t.slice(0, 200))
  if (materiaNome === "" || topicos.length === 0 || topicos.length > 300) {
    return NextResponse.json({ error: "materiaNome e topicos (1-300) são obrigatórios" }, { status: 400 })
  }
  const topicosEstudados = (body.topicosEstudados ?? [])
    .filter((t) => typeof t === "string" && t.trim() !== "")
    .map((t) => t.slice(0, 200))
    .slice(0, 300)
  const concursoNome = (body.concursoNome ?? "SEFAZ-CE").trim().slice(0, 120) || "SEFAZ-CE"

  const professoraNome = nomeProfessora(materiaNome)
  const instructions = montarInstrucoes({ nome: professoraNome, materiaNome, concursoNome, topicos, topicosEstudados })

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: TOKEN_TTL_SEGUNDOS },
        session: {
          type: "realtime",
          model: MODELO,
          instructions,
          audio: {
            input: { transcription: { model: "gpt-4o-mini-transcribe", language: "pt" } },
            output: { voice: VOZ },
          },
        },
      }),
    })
    if (!res.ok) {
      const detalhe = (await res.text()).slice(0, 300)
      console.error(`professora/token: OpenAI respondeu ${res.status} — ${detalhe}`)
      return NextResponse.json({ error: `Erro ao criar sessão de voz (${res.status})` }, { status: 502 })
    }
    const data = (await res.json()) as { value?: string; expires_at?: number }
    if (!data.value) throw new Error("resposta sem client_secret")
    return NextResponse.json({ token: data.value, expiresAt: data.expires_at, modelo: MODELO, professoraNome })
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao criar sessão de voz: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }
}
