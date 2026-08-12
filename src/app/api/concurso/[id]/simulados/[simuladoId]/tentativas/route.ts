import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../../../auth"
import db from "@/lib/db"
import type { ParteSimulado, ParteTentativa, TentativaSimulado } from "@/lib/simulados-data"

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

function serializar(t: { id: string; simuladoId: string; status: string; partes: unknown; criadoEm: Date; concluidaEm: Date | null }): TentativaSimulado {
  return {
    id: t.id,
    simuladoId: t.simuladoId,
    status: t.status as TentativaSimulado["status"],
    partes: t.partes as unknown as ParteTentativa[],
    criadoEm: t.criadoEm.toISOString(),
    concluidaEm: t.concluidaEm?.toISOString(),
  }
}

// GET — histórico de tentativas DESTE usuário nesse simulado (progresso é individual, mesmo que o
// simulado seja currículo compartilhado)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const tentativas = await db.simuladoTentativa.findMany({
    where: { simuladoId, userId: session.user.id },
    orderBy: { criadoEm: "desc" },
  })
  return NextResponse.json(tentativas.map(serializar))
}

// POST — nova tentativa. Se já existe uma "em_andamento" deste usuário nesse simulado, devolve ela
// em vez de criar outra (evita duplicar por causa de duplo clique/refresh na tela de início)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const simulado = await db.simuladoConcurso.findFirst({ where: { id: simuladoId, concursoId } })
  if (!simulado) return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 })

  const emAndamento = await db.simuladoTentativa.findFirst({
    where: { simuladoId, userId: session.user.id, status: "em_andamento" },
  })
  if (emAndamento) return NextResponse.json(serializar(emAndamento))

  const partesIniciais: ParteTentativa[] = (simulado.partes as unknown as ParteSimulado[]).map((p) => ({ parteId: p.id, respostas: [] }))
  const criada = await db.simuladoTentativa.create({
    data: {
      simuladoId,
      userId: session.user.id,
      status: "em_andamento",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      partes: partesIniciais as any,
    },
  })
  return NextResponse.json(serializar(criada))
}
