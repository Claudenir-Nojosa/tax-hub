import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET ?projetoId= — lista DARFs (Comprovante de Arrecadação) do projeto, ordenados por data de
// vencimento (ordem cronológica, já que não há "competência" única por arquivo aqui)
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

  const declaracoes = await db.declaracaoComprovantePagamento.findMany({
    where: { projetoId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(declaracoes)
}

// DELETE ?id= — remove um DARF específico
// DELETE ?projetoId= — remove TODOS os DARFs do projeto (a UI mostra os comprovantes
// consolidados por ano, sem linha por DARF, então a exclusão também é em bloco)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get("id")
  const projetoId = req.nextUrl.searchParams.get("projetoId")

  if (projetoId) {
    const projeto = await db.projetoRecuperacaoCredito.findFirst({
      where: { id: projetoId, cliente: { userId: session.user.id } },
    })
    if (!projeto) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
    }
    await db.declaracaoComprovantePagamento.deleteMany({ where: { projetoId } })
    return NextResponse.json({ ok: true })
  }

  if (!id) {
    return NextResponse.json({ error: "id ou projetoId é obrigatório" }, { status: 400 })
  }

  const declaracao = await db.declaracaoComprovantePagamento.findFirst({
    where: { id },
    include: { projeto: { include: { cliente: true } } },
  })
  if (!declaracao || declaracao.projeto.cliente.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.declaracaoComprovantePagamento.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
