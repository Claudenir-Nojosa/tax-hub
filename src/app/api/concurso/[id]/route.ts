import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import type { MateriaConcurso } from "@/lib/estudo-data"

// GET — retorna concurso + progresso
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const concurso = await db.concurso.findFirst({
    where: { id, userId: session.user.id },
    include: { progresso: true },
  })
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(concurso)
}

// PUT — atualiza concurso
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const existing = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = await req.json()
  const { nome, orgao, foto, dataProva, materias } = body as {
    nome?: string
    orgao?: string
    foto?: string
    dataProva?: string | null
    materias?: MateriaConcurso[]
  }

  const updated = await db.concurso.update({
    where: { id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(orgao !== undefined && { orgao }),
      ...(foto !== undefined && { foto }),
      ...(dataProva !== undefined && { dataProva: dataProva ? new Date(dataProva) : null }),
      ...(materias !== undefined && { materias: materias as object }),
    },
  })
  return NextResponse.json(updated)
}

// DELETE — exclui concurso
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const existing = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  await db.concurso.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
