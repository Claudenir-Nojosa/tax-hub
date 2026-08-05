import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import type { MateriaConcurso } from "@/lib/estudo-data"

// GET — retorna concurso (acesso compartilhado: qualquer usuário com ConcursoAcesso pode ler)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const acesso = await db.concursoAcesso.findUnique({
    where: { concursoId_userId: { concursoId: id, userId: session.user.id } },
    include: { concurso: true },
  })
  if (!acesso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json({ ...acesso.concurso, isPrincipal: acesso.isPrincipal })
}

// PUT — atualiza concurso (currículo compartilhado: qualquer acessor pode editar matérias/tópicos)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const acesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: session.user.id } })
  if (acesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

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

// DELETE — exclui concurso. Restrito a quem CRIOU o concurso: uma vez compartilhado, um acessor
// convidado não pode apagar o curso pra todo mundo — quem quer sair usa DELETE .../acessos/[userId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const existing = await db.concurso.findFirst({ where: { id, criadoPorUserId: session.user.id } })
  if (!existing) {
    const acesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: session.user.id } })
    if (acesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ error: "Só quem criou o concurso pode excluí-lo. Use 'sair' pra remover só o seu acesso." }, { status: 403 })
  }

  await db.concurso.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
