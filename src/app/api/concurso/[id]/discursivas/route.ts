import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const temas = await db.discursivaTema.findMany({ where: { concursoId }, orderBy: { criadoEm: "desc" } })
  return NextResponse.json(
    temas.map((t) => ({
      id: t.id,
      materia: t.materia ?? undefined,
      tema: t.tema,
      orientacoes: t.orientacoes ?? undefined,
      pontosChave: (t.pontosChave as string[] | null) ?? undefined,
      criadoEm: t.criadoEm.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as { id: string; materia?: string; tema: string; orientacoes?: string; pontosChave?: string[] }
  if (!body.id || !body.tema?.trim()) return NextResponse.json({ error: "id e tema são obrigatórios" }, { status: 400 })

  const criado = await db.discursivaTema.create({
    data: {
      id: body.id,
      concursoId,
      materia: body.materia?.trim() || null,
      tema: body.tema.trim(),
      orientacoes: body.orientacoes?.trim() || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      pontosChave: (body.pontosChave && body.pontosChave.length > 0 ? body.pontosChave : null) as any,
      criadoPorUserId: session.user.id,
    },
  })
  return NextResponse.json({
    id: criado.id,
    materia: criado.materia ?? undefined,
    tema: criado.tema,
    orientacoes: criado.orientacoes ?? undefined,
    pontosChave: (criado.pontosChave as string[] | null) ?? undefined,
    criadoEm: criado.criadoEm.toISOString(),
    updatedAt: criado.updatedAt.toISOString(),
  })
}
