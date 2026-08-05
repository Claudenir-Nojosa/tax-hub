import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import { materiasDefaultSefaz } from "@/lib/estudo-data"

// POST — migra EstudoProgresso → Concurso "SEFAZ-CE 2026" + ConcursoAcesso
// Idempotente: só cria se o usuário ainda não tem acesso a NENHUM concurso — checado via
// ConcursoAcesso (não mais Concurso.userId), senão um usuário convidado pra um concurso
// compartilhado ganharia um concurso pessoal em branco (e marcado principal) na primeira visita
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id

  const existing = await db.concursoAcesso.count({ where: { userId } })
  if (existing > 0) return NextResponse.json({ ok: true, migrated: false })

  // Busca progresso antigo
  const progresso = await db.estudoProgresso.findUnique({ where: { userId } })

  // Cria concurso SEFAZ-CE 2026 (currículo compartilhado desde o início — este usuário é o
  // criador/único acessor por enquanto)
  const concurso = await db.concurso.create({
    data: {
      userId,
      criadoPorUserId: userId,
      nome: "SEFAZ-CE 2026",
      orgao: "SEFAZ-CE",
      foto: null,
      dataProva: null,
      materias: materiasDefaultSefaz() as object,
      acessos: { create: { userId, isPrincipal: true } },
    },
  })

  // Se tinha progresso, migra pro ConcursoProgressoUsuario (sem currículo compartilhado próprio
  // ainda — o progresso antigo já era 100% individual, então tudo cai como progresso)
  if (progresso) {
    await db.concursoProgressoUsuario.create({
      data: { concursoId: concurso.id, userId, dados: progresso.dados ?? {} },
    })
  }

  return NextResponse.json({ ok: true, migrated: true, concursoId: concurso.id })
}
