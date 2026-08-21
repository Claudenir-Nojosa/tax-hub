import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// Histórico de respostas do RPG (aba Mapa) — por usuário. POST grava um LOTE (todas as respostas de
// UMA luta, certas e erradas — precisa das duas pra taxa de acerto); GET devolve tudo do usuário
// nesse concurso, campos enxutos (sem o enunciado de volta, não precisa aqui) pra alimentar a tela
// de Estatísticas (agrega por matéria/tópico no cliente, mesmo idioma de calcPontosFracos em
// RelatoriosTab.tsx — volume baixo hoje, sem necessidade de groupBy no servidor ainda).

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const respostas = await db.respostaRPG.findMany({
    where: { concursoId, userId: session.user.id },
    select: { materia: true, topico: true, acertou: true },
  })
  return NextResponse.json(respostas)
}

interface RespostaBody {
  questaoRPGId: string
  materia: string
  topico: string
  alternativaMarcada: string
  acertou: boolean
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json().catch(() => null)) as { itens?: RespostaBody[] } | null
  const itens = body?.itens
  if (!Array.isArray(itens) || itens.length === 0) return NextResponse.json({ error: "itens vazio" }, { status: 400 })

  const userId = session.user.id
  await db.respostaRPG.createMany({
    data: itens.map((i) => ({
      userId,
      concursoId,
      questaoRPGId: i.questaoRPGId,
      materia: i.materia,
      topico: i.topico,
      alternativaMarcada: i.alternativaMarcada,
      acertou: i.acertou,
    })),
  })

  return NextResponse.json({ ok: true, gravadas: itens.length })
}
