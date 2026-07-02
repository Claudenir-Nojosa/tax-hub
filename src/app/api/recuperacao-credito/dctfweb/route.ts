import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET ?projetoId= — lista DCTFWeb do projeto, ordenadas por competência
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const projetoId = req.nextUrl.searchParams.get("projetoId")
  if (!projetoId) {
    return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 })
  }

  const projeto = await db.projetoRecuperacaoCredito.findFirst({
    where: { id: projetoId, cliente: { userId: session.user.id } },
  })
  if (!projeto) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  }

  const declaracoes = await db.declaracaoDctfWeb.findMany({
    where: { projetoId },
    orderBy: { competencia: "asc" },
  })

  return NextResponse.json(declaracoes)
}

// DELETE ?id= — remove uma DCTFWeb específica
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
  }

  const declaracao = await db.declaracaoDctfWeb.findFirst({
    where: { id },
    include: { projeto: { include: { cliente: true } } },
  })
  if (!declaracao || declaracao.projeto.cliente.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.declaracaoDctfWeb.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
