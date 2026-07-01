import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// PATCH { nome } — renomeia um projeto
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  const body = await req.json()
  const { nome } = body as { nome?: string }
  if (!nome?.trim()) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 })
  }

  const existente = await db.projetoRecuperacaoCredito.findFirst({
    where: { id, cliente: { userId: session.user.id } },
  })
  if (!existente) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  const projeto = await db.projetoRecuperacaoCredito.update({
    where: { id },
    data: { nome: nome.trim() },
  })
  return NextResponse.json(projeto)
}

// DELETE — remove um projeto (cascade apaga as declarações associadas)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  const existente = await db.projetoRecuperacaoCredito.findFirst({
    where: { id, cliente: { userId: session.user.id } },
  })
  if (!existente) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.projetoRecuperacaoCredito.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
