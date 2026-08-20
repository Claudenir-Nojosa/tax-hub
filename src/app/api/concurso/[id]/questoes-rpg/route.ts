import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// Banco de questões do RPG (aba Mapa) — currículo compartilhado por concurso, mesmo espírito de
// SimuladoConcurso/DiscursivaTema (tabela própria, fora do blob EstudoState). Só leitura por
// enquanto — a importação (de cadernos impressos do TecConcursos) é feita por script, não tem
// fluxo de upload na UI ainda.

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const questoes = await db.questaoRPG.findMany({ where: { concursoId }, orderBy: { criadoEm: "asc" } })
  return NextResponse.json(
    questoes.map((q) => ({
      id: q.id,
      banca: q.banca,
      cargo: q.cargo ?? undefined,
      orgao: q.orgao ?? undefined,
      area: q.area ?? undefined,
      ano: q.ano ?? undefined,
      materia: q.materia,
      topico: q.topico,
      enunciado: q.enunciado,
      alternativas: q.alternativas as unknown as Record<string, string>,
      correta: q.correta,
    }))
  )
}
