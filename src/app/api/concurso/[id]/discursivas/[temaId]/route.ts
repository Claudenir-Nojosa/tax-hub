import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; temaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, temaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const existente = await db.discursivaTema.findFirst({ where: { id: temaId, concursoId } })
  if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as Partial<{ materia: string | null; tema: string; orientacoes: string | null; pontosChave: string[] | null }>

  const atualizado = await db.discursivaTema.update({
    where: { id: temaId },
    data: {
      ...(body.materia !== undefined && { materia: body.materia?.trim() || null }),
      ...(body.tema !== undefined && { tema: body.tema.trim() }),
      ...(body.orientacoes !== undefined && { orientacoes: body.orientacoes?.trim() || null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      ...(body.pontosChave !== undefined && { pontosChave: (body.pontosChave && body.pontosChave.length > 0 ? body.pontosChave : null) as any }),
    },
  })
  return NextResponse.json({
    id: atualizado.id,
    materia: atualizado.materia ?? undefined,
    tema: atualizado.tema,
    orientacoes: atualizado.orientacoes ?? undefined,
    pontosChave: (atualizado.pontosChave as string[] | null) ?? undefined,
    criadoEm: atualizado.criadoEm.toISOString(),
    updatedAt: atualizado.updatedAt.toISOString(),
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; temaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, temaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const existente = await db.discursivaTema.findFirst({ where: { id: temaId, concursoId } })
  if (!existente) return NextResponse.json({ ok: true })

  await db.discursivaTema.delete({ where: { id: temaId } })
  return NextResponse.json({ ok: true })
}
