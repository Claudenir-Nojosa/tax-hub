import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// Aba "Resumos" do Estudo: o usuário sobe um PDF de material de estudo + matéria/tópico; o
// texto é extraído com unpdf (determinístico) e vai pra IA gerar um resumo em markdown com o
// que mais cai em concursos, pegadinhas e conceitos explicados com analogias do cotidiano.
// O resumo fica salvo em ResumoEstudo (ver schema) vinculado à matéria/tópico.

export const maxDuration = 120 // resumo de PDF grande pode demorar

// PDFs de material podem ter centenas de páginas — corta o texto num teto seguro de contexto
// e avisa a IA que está truncado (melhor resumo parcial que erro de contexto estourado).
const MAX_CHARS_TEXTO = 90_000

const PROMPT_SISTEMA = `Você é um professor especialista em concursos públicos fiscais brasileiros (SEFAZ, Receita Federal), famoso por explicar temas áridos de um jeito simples e memorável.

Recebe o texto de um material de estudo e produz um RESUMO DE ALTA DENSIDADE em português, em markdown, com EXATAMENTE estas seções:

## 🎯 O que mais cai em prova
Os pontos do material com maior incidência em concursos (bancas FGV, Cebraspe, FCC). Liste em bullets objetivos, do mais cobrado pro menos cobrado. Quando fizer sentido, indique COMO a banca costuma cobrar.

## ⚠️ Pegadinhas clássicas
As confusões que as bancas exploram: trocas de conceito, exceções escondidas, prazos parecidos, palavras que mudam tudo ("salvo", "exceto", "independentemente"). Formato: **Pegadinha:** ... → **Como não cair:** ...

## 💡 Conceitos explicados como pra um amigo
Os conceitos centrais do material explicados de forma clara e simples, cada um com uma ANALOGIA DO COTIDIANO brasileiro (futebol, mercado, condomínio, família, trânsito...). Formato: **Conceito** — explicação curta. *Analogia:* ...

## ⚡ Revisão relâmpago
No máximo 10 frases telegráficas pra bater o olho na véspera da prova.

Regras:
- Fiel ao material: não invente conteúdo que não está no texto.
- Denso e direto: sem enrolação, sem parágrafos longos.
- Se o texto vier truncado, resuma o que há sem mencionar o corte.`

// GET ?materia=&topico= — lista resumos do usuário (filtros opcionais)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const materia = req.nextUrl.searchParams.get("materia")
  const topico = req.nextUrl.searchParams.get("topico")
  const resumos = await db.resumoEstudo.findMany({
    where: {
      userId: session.user.id,
      ...(materia ? { materia } : {}),
      ...(topico ? { topico } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(resumos)
}

// POST multipart: file (PDF) + materia + topico? + titulo? — gera o resumo via IA e salva
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const materia = ((formData.get("materia") as string) ?? "").trim()
  const topico = ((formData.get("topico") as string) ?? "").trim()
  const tituloCustom = ((formData.get("titulo") as string) ?? "").trim()

  if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Envie um arquivo PDF" }, { status: 400 })
  }
  if (!materia) {
    return NextResponse.json({ error: "Selecione a matéria" }, { status: 400 })
  }

  const uint8 = new Uint8Array(await file.arrayBuffer())
  const { extractText } = await import("unpdf")
  const { text } = await extractText(uint8, { mergePages: true })
  const textoBruto = (Array.isArray(text) ? text.join(" ") : text).trim()

  if (textoBruto.length < 200) {
    return NextResponse.json(
      { error: "O PDF não tem camada de texto legível (provavelmente escaneado) — não dá pra resumir ainda" },
      { status: 400 }
    )
  }

  const texto = textoBruto.slice(0, MAX_CHARS_TEXTO)
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })

  let conteudo = ""
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.4,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        {
          role: "user",
          content: `Matéria: ${materia}${topico ? `\nTópico: ${topico}` : ""}\n\nMaterial de estudo (extraído de "${file.name}"):\n\n${texto}`,
        },
      ],
    })
    conteudo = completion.choices[0]?.message?.content?.trim() ?? ""
  } catch (e) {
    return NextResponse.json(
      { error: `Erro da IA ao resumir: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }
  if (!conteudo) {
    return NextResponse.json({ error: "A IA não retornou conteúdo" }, { status: 502 })
  }

  const titulo = tituloCustom || file.name.replace(/\.pdf$/i, "")
  const resumo = await db.resumoEstudo.create({
    data: {
      userId: session.user.id,
      materia,
      topico,
      titulo,
      arquivoNome: file.name,
      conteudo,
    },
  })
  return NextResponse.json(resumo)
}

// DELETE ?id= — remove um resumo do usuário
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })

  const resumo = await db.resumoEstudo.findFirst({ where: { id, userId: session.user.id } })
  if (!resumo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  await db.resumoEstudo.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
