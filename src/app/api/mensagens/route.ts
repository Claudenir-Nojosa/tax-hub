import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../auth"
import db from "@/lib/db"

const TEXTO_MAX = 500

// GET — caixa de entrada do usuário logado (mensagens RECEBIDAS, mais recente primeiro)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const mensagens = await db.mensagem.findMany({
    where: { destinatarioId: session.user.id },
    include: { remetente: { select: { id: true, name: true, image: true } } },
    orderBy: { criadoEm: "desc" },
    take: 50,
  })
  return NextResponse.json(
    mensagens.map((m) => ({
      id: m.id,
      texto: m.texto,
      lida: m.lida,
      criadoEm: m.criadoEm,
      remetente: m.remetente,
    }))
  )
}

// POST — manda um "Incentivo" (mensagem direta) pra outro usuário — só permitido entre quem
// compartilha pelo menos um concurso (ConcursoAcesso), não é uma DM genérica do app inteiro
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const remetenteId = session.user.id

  const { destinatarioId, texto } = (await req.json()) as { destinatarioId?: string; texto?: string }
  if (!destinatarioId || !texto?.trim()) {
    return NextResponse.json({ error: "destinatarioId e texto são obrigatórios" }, { status: 400 })
  }
  if (destinatarioId === remetenteId) {
    return NextResponse.json({ error: "Não dá pra mandar mensagem pra você mesmo" }, { status: 400 })
  }
  const textoLimpo = texto.trim().slice(0, TEXTO_MAX)

  const compartilham = await db.concursoAcesso.findFirst({
    where: { userId: remetenteId, concurso: { acessos: { some: { userId: destinatarioId } } } },
  })
  if (!compartilham) {
    return NextResponse.json({ error: "Só dá pra mandar incentivo pra quem compartilha um concurso com você" }, { status: 403 })
  }

  const mensagem = await db.mensagem.create({
    data: { remetenteId, destinatarioId, texto: textoLimpo },
  })
  return NextResponse.json({ id: mensagem.id }, { status: 201 })
}
