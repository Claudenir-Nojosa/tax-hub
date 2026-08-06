import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// POST — marca TODAS as mensagens recebidas como lidas (o sino do dashboard chama isso ao abrir
// o painel — mais simples que marcar uma por uma, e é o mesmo padrão de "abriu, viu, tá lido")
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  await db.mensagem.updateMany({
    where: { destinatarioId: session.user.id, lida: false },
    data: { lida: true },
  })
  return NextResponse.json({ ok: true })
}
