import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// DELETE — remove um cliente (cascade apaga as declarações associadas)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const { id } = await params

  const existente = await db.clienteRecuperacaoCredito.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existente) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  await db.clienteRecuperacaoCredito.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
