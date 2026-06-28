import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// POST — define este concurso como principal
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const existing = await db.concurso.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Un-set todos os outros
  await db.concurso.updateMany({
    where: { userId: session.user.id },
    data: { isPrincipal: false },
  })
  // Set este
  const updated = await db.concurso.update({
    where: { id },
    data: { isPrincipal: true },
  })
  return NextResponse.json(updated)
}
