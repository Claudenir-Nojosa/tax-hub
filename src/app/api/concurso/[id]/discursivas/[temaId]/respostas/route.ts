import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../../../auth"
import db from "@/lib/db"
import type { FeedbackDiscursiva } from "@/lib/discursivas-data"

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

// GET — histórico DESTE usuário nesse tema (evolução da nota ao longo do tempo é individual)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; temaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, temaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const respostas = await db.discursivaResposta.findMany({
    where: { temaId, userId: session.user.id },
    orderBy: { criadoEm: "desc" },
  })
  return NextResponse.json(
    respostas.map((r) => ({
      id: r.id,
      temaId: r.temaId,
      texto: r.texto,
      notaIA: r.notaIA,
      feedbackIA: (r.feedbackIA as unknown as FeedbackDiscursiva | null) ?? null,
      minutosGastos: r.minutosGastos ?? undefined,
      criadoEm: r.criadoEm.toISOString(),
    }))
  )
}

// POST — salva a resposta JÁ CORRIGIDA (o client chama /api/ai/discursiva-corrigir primeiro, essa
// rota só persiste o resultado — mesma separação de responsabilidade das outras rotas de IA do app)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; temaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, temaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const tema = await db.discursivaTema.findFirst({ where: { id: temaId, concursoId } })
  if (!tema) return NextResponse.json({ error: "Tema não encontrado" }, { status: 404 })

  const body = (await req.json()) as { texto: string; notaIA: number | null; feedbackIA: FeedbackDiscursiva | null; minutosGastos?: number }
  if (!body.texto?.trim()) return NextResponse.json({ error: "texto é obrigatório" }, { status: 400 })

  const criada = await db.discursivaResposta.create({
    data: {
      temaId,
      userId: session.user.id,
      texto: body.texto,
      notaIA: body.notaIA ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      feedbackIA: (body.feedbackIA ?? null) as any,
      minutosGastos: body.minutosGastos ?? null,
    },
  })
  return NextResponse.json({
    id: criada.id,
    temaId: criada.temaId,
    texto: criada.texto,
    notaIA: criada.notaIA,
    feedbackIA: (criada.feedbackIA as unknown as FeedbackDiscursiva | null) ?? null,
    minutosGastos: criada.minutosGastos ?? undefined,
    criadoEm: criada.criadoEm.toISOString(),
  })
}
