import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// Progresso da campanha roguelike (aba Mapa) — POR USUÁRIO, diferente de QuestaoRPG/inimigos
// (currículo, compartilhado). Uma linha ativa por (concurso, usuário) — mesmo padrão de
// SimuladoTentativa. GET devolve a linha atual (ou null, se o usuário nunca começou uma campanha);
// POST faz upsert do objeto inteiro — o cliente decide o que muda ("Nova Campanha" reseta os
// campos de corrida mantendo os permanentes, um combate só atualiza HP/ouro/xp/rota).

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const campanha = await db.campanhaRPG.findUnique({
    where: { concursoId_userId: { concursoId, userId: session.user.id } },
  })
  if (!campanha) return NextResponse.json(null)

  return NextResponse.json({
    status: campanha.status,
    heroiHP: campanha.heroiHP,
    heroiHPMax: campanha.heroiHPMax,
    ouroCorrida: campanha.ouroCorrida,
    xpCorrida: campanha.xpCorrida,
    rota: campanha.rota,
    posicaoAtual: campanha.posicaoAtual,
    itens: campanha.itens,
    xpPermanente: campanha.xpPermanente,
    topicosVencidosTotal: campanha.topicosVencidosTotal,
  })
}

interface CampanhaBody {
  status: string
  heroiHP: number
  heroiHPMax: number
  ouroCorrida: number
  xpCorrida: number
  rota: { materia: string; topico: string }[]
  posicaoAtual: number
  itens: string[]
  xpPermanente: number
  topicosVencidosTotal: string[]
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as CampanhaBody
  const userId = session.user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
  const dados: any = {
    status: body.status,
    heroiHP: body.heroiHP,
    heroiHPMax: body.heroiHPMax,
    ouroCorrida: body.ouroCorrida,
    xpCorrida: body.xpCorrida,
    rota: body.rota,
    posicaoAtual: body.posicaoAtual,
    itens: body.itens,
    xpPermanente: body.xpPermanente,
    topicosVencidosTotal: body.topicosVencidosTotal,
  }

  const salvo = await db.campanhaRPG.upsert({
    where: { concursoId_userId: { concursoId, userId } },
    update: dados,
    create: { concursoId, userId, ...dados },
  })

  return NextResponse.json({
    status: salvo.status,
    heroiHP: salvo.heroiHP,
    heroiHPMax: salvo.heroiHPMax,
    ouroCorrida: salvo.ouroCorrida,
    xpCorrida: salvo.xpCorrida,
    rota: salvo.rota,
    posicaoAtual: salvo.posicaoAtual,
    itens: salvo.itens,
    xpPermanente: salvo.xpPermanente,
    topicosVencidosTotal: salvo.topicosVencidosTotal,
  })
}
