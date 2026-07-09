import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import { materiasDefaultSefaz } from "@/lib/estudo-data"

// POST — migra EstudoProgresso → Concurso "SEFAZ-CE 2026" + ConcursoProgresso
// Idempotente: só cria se ainda não existem concursos para o usuário
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id

  // Verifica se já há concursos
  const existing = await db.concurso.count({ where: { userId } })
  if (existing > 0) return NextResponse.json({ ok: true, migrated: false })

  // Busca progresso antigo
  const progresso = await db.estudoProgresso.findUnique({ where: { userId } })

  // Cria concurso SEFAZ-CE 2026
  const concurso = await db.concurso.create({
    data: {
      userId,
      nome: "SEFAZ-CE 2026",
      orgao: "SEFAZ-CE",
      foto: null,
      dataProva: null,
      isPrincipal: true,
      materias: materiasDefaultSefaz() as object,
    },
  })

  // Se tinha progresso, migra
  if (progresso) {
    await db.concursoProgresso.create({
      data: { concursoId: concurso.id, dados: progresso.dados ?? {} },
    })
  }

  return NextResponse.json({ ok: true, migrated: true, concursoId: concurso.id })
}
