import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET ?clienteId= — lista declarações PGDAS do cliente, ordenadas por competência
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clienteId = req.nextUrl.searchParams.get("clienteId")
  if (!clienteId) {
    return NextResponse.json({ error: "clienteId é obrigatório" }, { status: 400 })
  }

  const cliente = await db.clienteRecuperacaoCredito.findFirst({
    where: { id: clienteId, userId: session.user.id },
  })
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const declaracoes = await db.declaracaoPgdas.findMany({
    where: { clienteId },
    orderBy: { competencia: "asc" },
  })

  return NextResponse.json(declaracoes)
}

// DELETE ?id= — remove uma declaração específica (ex.: reenviar um mês errado)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
  }

  const declaracao = await db.declaracaoPgdas.findFirst({
    where: { id },
    include: { cliente: true },
  })
  if (!declaracao || declaracao.cliente.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.declaracaoPgdas.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
