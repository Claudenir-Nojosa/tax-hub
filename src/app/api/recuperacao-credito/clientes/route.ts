import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET — lista clientes de recuperação de crédito do usuário logado
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const clientes = await db.clienteRecuperacaoCredito.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(clientes)
}

// POST — cria ou atualiza (upsert por CNPJ) um cliente
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { cnpj, razaoSocial } = body as { cnpj?: string; razaoSocial?: string }

  if (!cnpj?.trim() || !razaoSocial?.trim()) {
    return NextResponse.json({ error: "CNPJ e Razão Social são obrigatórios" }, { status: 400 })
  }

  const cliente = await db.clienteRecuperacaoCredito.upsert({
    where: {
      userId_cnpj: {
        userId: session.user.id,
        cnpj: cnpj.trim(),
      },
    },
    create: {
      userId: session.user.id,
      cnpj: cnpj.trim(),
      razaoSocial: razaoSocial.trim(),
    },
    update: {
      razaoSocial: razaoSocial.trim(),
    },
  })

  return NextResponse.json(cliente, { status: 201 })
}
