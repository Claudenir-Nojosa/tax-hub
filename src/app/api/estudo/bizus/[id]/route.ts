import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { buscarBizuDoUsuario, lerJsonComLimite, validarAtualizacaoBizu } from "../_lib"

type Contexto = { params: Promise<{ id: string }> }

async function autenticarEBuscar(params: Contexto["params"], userId: string) {
  const { id } = await params
  if (!id || id.length > 100) return null
  return buscarBizuDoUsuario(id, userId)
}

// GET /api/estudo/bizus/[id] — detalhe de um Bizu do próprio usuário.
export async function GET(_req: NextRequest, { params }: Contexto) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const bizu = await autenticarEBuscar(params, session.user.id)
    if (!bizu) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(bizu)
  } catch (error) {
    console.error("[GET /api/estudo/bizus/[id]]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PATCH /api/estudo/bizus/[id] — edição parcial; concurso e proprietário são imutáveis.
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const leitura = await lerJsonComLimite(req)
  if (!leitura.ok) {
    return NextResponse.json({ error: leitura.error }, { status: leitura.status ?? 400 })
  }
  const validacao = validarAtualizacaoBizu(leitura.data)
  if (!validacao.ok) {
    return NextResponse.json({ error: validacao.error }, { status: validacao.status ?? 400 })
  }

  try {
    const existente = await autenticarEBuscar(params, session.user.id)
    if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const bizu = await db.bizuEstudo.update({
      where: { id: existente.id },
      data: validacao.data,
    })
    return NextResponse.json(bizu)
  } catch (error) {
    console.error("[PATCH /api/estudo/bizus/[id]]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/estudo/bizus/[id] — exclui somente um Bizu criado pelo usuário autenticado.
export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const existente = await autenticarEBuscar(params, session.user.id)
    if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await db.bizuEstudo.delete({ where: { id: existente.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/estudo/bizus/[id]]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
