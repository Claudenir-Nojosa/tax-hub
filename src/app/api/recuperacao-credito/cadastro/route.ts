import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET ?projetoId= — cadastro (Consulta CNPJ + QSA + Simples Nacional) do projeto, se existir
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

  const cadastro = await db.cadastroEmpresa.findUnique({ where: { projetoId } })
  return NextResponse.json(cadastro)
}

// DELETE ?projetoId= — remove o cadastro inteiro do projeto (as 3 partes)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const projetoId = req.nextUrl.searchParams.get("projetoId")
  if (!projetoId) {
    return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 })
  }

  const cadastro = await db.cadastroEmpresa.findFirst({
    where: { projetoId, projeto: { cliente: { userId: session.user.id } } },
  })
  if (!cadastro) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.cadastroEmpresa.delete({ where: { id: cadastro.id } })
  return NextResponse.json({ ok: true })
}
