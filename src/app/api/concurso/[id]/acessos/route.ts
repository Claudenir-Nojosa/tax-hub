import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// GET — lista quem tem acesso a este concurso
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const meuAcesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: session.user.id } })
  if (meuAcesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const acessos = await db.concursoAcesso.findMany({
    where: { concursoId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { criadoEm: "asc" },
  })
  return NextResponse.json(acessos.map((a) => ({ userId: a.userId, name: a.user.name, email: a.user.email, criadoEm: a.criadoEm })))
}

// POST — convida um usuário já cadastrado (por e-mail) a acessar este concurso compartilhado
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const meuAcesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: session.user.id } })
  if (meuAcesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const { email } = (await req.json()) as { email?: string }
  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 })

  const convidado = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!convidado) {
    return NextResponse.json(
      { error: "Não encontrei uma conta com esse e-mail — a pessoa precisa criar uma conta primeiro (tela de cadastro)." },
      { status: 404 }
    )
  }

  // primeiro concurso do convidado vira principal dele automaticamente (mesma regra de sempre
  // pra quem cria o próprio primeiro concurso)
  const jaTemAlgum = await db.concursoAcesso.count({ where: { userId: convidado.id } })

  const acesso = await db.concursoAcesso.upsert({
    where: { concursoId_userId: { concursoId: id, userId: convidado.id } },
    update: {},
    create: { concursoId: id, userId: convidado.id, isPrincipal: jaTemAlgum === 0 },
  })
  return NextResponse.json({ userId: acesso.userId, name: convidado.name, email: convidado.email }, { status: 201 })
}
