import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// POST — define este concurso como principal PRO USUÁRIO LOGADO (isPrincipal agora é por
// (concurso, usuário) — um concurso compartilhado pode ser principal pra um acessor e não pro outro)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  const existing = await db.concursoAcesso.findUnique({ where: { concursoId_userId: { concursoId: id, userId } } })
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  await db.$transaction([
    db.concursoAcesso.updateMany({ where: { userId }, data: { isPrincipal: false } }),
    db.concursoAcesso.update({ where: { concursoId_userId: { concursoId: id, userId } }, data: { isPrincipal: true } }),
  ])
  // o caller descarta o corpo da resposta (só usa o status) — buscar e devolver o Concurso inteiro
  // aqui só mandava os ~180 Blocos pela rede à toa
  return NextResponse.json({ ok: true, isPrincipal: true })
}
