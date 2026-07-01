import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET ?clienteId= — lista projetos do cliente (validando que pertence ao usuário logado)
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

  const projetos = await db.projetoRecuperacaoCredito.findMany({
    where: { clienteId },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(projetos)
}

// POST { clienteId, nome } — cria um novo projeto para o cliente
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { clienteId, nome } = body as { clienteId?: string; nome?: string }

  if (!clienteId || !nome?.trim()) {
    return NextResponse.json({ error: "clienteId e nome são obrigatórios" }, { status: 400 })
  }

  const cliente = await db.clienteRecuperacaoCredito.findFirst({
    where: { id: clienteId, userId: session.user.id },
  })
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const projeto = await db.projetoRecuperacaoCredito.create({
    data: { clienteId, nome: nome.trim() },
  })

  return NextResponse.json(projeto, { status: 201 })
}
