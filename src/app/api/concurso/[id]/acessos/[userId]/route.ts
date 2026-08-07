import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"

// DELETE — revoga o acesso de outro usuário (só quem CRIOU o concurso pode) ou sai do concurso
// (removendo o próprio acesso, qualquer acessor pode)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id, userId: alvoUserId } = await params
  const chamadorId = session.user.id

  if (alvoUserId !== chamadorId) {
    const concurso = await db.concurso.findFirst({ where: { id, criadoPorUserId: chamadorId }, select: { id: true } })
    if (!concurso) return NextResponse.json({ error: "Só quem criou o concurso pode remover o acesso de outra pessoa" }, { status: 403 })
  } else {
    const meuAcesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: chamadorId } })
    if (meuAcesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  // remove só o ACESSO — o progresso (ConcursoProgressoUsuario) fica intacto, órfão mas
  // recuperável se a pessoa for convidada de novo, em vez de apagar dado de estudo sem confirmação
  await db.concursoAcesso.deleteMany({ where: { concursoId: id, userId: alvoUserId } })
  return NextResponse.json({ ok: true })
}
