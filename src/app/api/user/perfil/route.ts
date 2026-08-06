import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

// GET — dados do próprio perfil (nome, e-mail, foto)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  })
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(user)
}

// PATCH — atualiza nome e/ou foto (só a URL — sem upload de arquivo nem Storage, de propósito:
// mais simples e não depende de nenhuma infra nova)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = (await req.json()) as { name?: string; image?: string | null }
  const data: { name?: string; image?: string | null } = {}

  if (body.name !== undefined) {
    const nome = body.name.trim()
    if (!nome) return NextResponse.json({ error: "Nome não pode ficar vazio" }, { status: 400 })
    data.name = nome
  }

  if (body.image !== undefined) {
    const url = body.image?.trim() ?? ""
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: "URL da foto precisa começar com http:// ou https://" }, { status: 400 })
    }
    data.image = url || null
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, email: true, image: true },
  })
  return NextResponse.json(updated)
}
