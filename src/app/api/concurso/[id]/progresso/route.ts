import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// GET — retorna progresso do concurso
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const concurso = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const progresso = await db.concursoProgresso.findUnique({ where: { concursoId: id } })
  return NextResponse.json(progresso?.dados ?? null)
}

// POST — salva progresso do concurso
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const concurso = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const dados = await req.json()
  await db.concursoProgresso.upsert({
    where: { concursoId: id },
    update: { dados },
    create: { concursoId: id, dados },
  })
  return NextResponse.json({ ok: true })
}

// DELETE — apaga progresso (reseta para zero)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const concurso = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  await db.concursoProgresso.deleteMany({ where: { concursoId: id } })
  return NextResponse.json({ ok: true })
}
