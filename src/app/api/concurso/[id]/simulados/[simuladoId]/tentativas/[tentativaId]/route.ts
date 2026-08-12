import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../../../../auth"
import db from "@/lib/db"
import type { ParteTentativa, RespostaTentativa, TentativaSimulado } from "@/lib/simulados-data"

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

async function carregarTentativaDoUsuario(tentativaId: string, simuladoId: string, userId: string) {
  return db.simuladoTentativa.findFirst({ where: { id: tentativaId, simuladoId, userId } })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string; tentativaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId, tentativaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const tentativa = await carregarTentativaDoUsuario(tentativaId, simuladoId, session.user.id)
  if (!tentativa) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(serializar(tentativa))
}

// PATCH — duas ações possíveis (tentativa/gabarito são individuais, nunca do currículo
// compartilhado, por isso sempre filtra por userId também):
//   { acao: "iniciarParte", parteId } — grava o iniciadoEm (idempotente: se já tinha, não mexe —
//     evita resetar o cronômetro de parede num duplo clique/retry de rede)
//   { acao: "responderParte", parteId, respostas } — grava o gabarito marcado + concluidoEm; se
//     isso fechar a ÚLTIMA parte pendente, a tentativa inteira vira "concluida"
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string; tentativaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId, tentativaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const tentativa = await carregarTentativaDoUsuario(tentativaId, simuladoId, session.user.id)
  if (!tentativa) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as
    | { acao: "iniciarParte"; parteId: string }
    | { acao: "responderParte"; parteId: string; respostas: RespostaTentativa[] }

  const partes = tentativa.partes as unknown as ParteTentativa[]
  const idx = partes.findIndex((p) => p.parteId === body.parteId)
  if (idx === -1) return NextResponse.json({ error: "Parte não encontrada na tentativa" }, { status: 400 })

  const agora = new Date()
  if (body.acao === "iniciarParte") {
    if (!partes[idx].iniciadoEm) partes[idx] = { ...partes[idx], iniciadoEm: agora.toISOString() }
  } else if (body.acao === "responderParte") {
    partes[idx] = { ...partes[idx], respostas: body.respostas, concluidoEm: agora.toISOString() }
  } else {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  }

  const todasConcluidas = partes.every((p) => !!p.concluidoEm)
  const atualizada = await db.simuladoTentativa.update({
    where: { id: tentativaId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      partes: partes as any,
      ...(todasConcluidas && tentativa.status !== "concluida" && { status: "concluida", concluidaEm: agora }),
    },
  })
  return NextResponse.json(serializar(atualizada))
}

// DELETE — só permite abandonar tentativas EM ANDAMENTO (histórico concluído nunca é apagável por
// aqui, é o registro de evolução que o usuário quer acompanhar)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string; tentativaId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId, tentativaId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const tentativa = await carregarTentativaDoUsuario(tentativaId, simuladoId, session.user.id)
  if (!tentativa) return NextResponse.json({ ok: true })
  if (tentativa.status !== "em_andamento") return NextResponse.json({ error: "Só dá pra abandonar tentativas em andamento" }, { status: 400 })

  await db.simuladoTentativa.delete({ where: { id: tentativaId } })
  return NextResponse.json({ ok: true })
}
