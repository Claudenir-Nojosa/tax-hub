import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import { lerJsonComLimite, usuarioTemAcessoAoConcurso, validarCriacaoBizu } from "./_lib"

// GET /api/estudo/bizus?concursoId=...&materia=...&topico=...&q=...
// Lista apenas os Bizus do usuário autenticado dentro de um concurso ao qual ele ainda tem acesso.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const concursoId = req.nextUrl.searchParams.get("concursoId")?.trim() ?? ""
  if (!concursoId) return NextResponse.json({ error: "concursoId é obrigatório" }, { status: 400 })
  if (concursoId.length > 100) return NextResponse.json({ error: "concursoId inválido" }, { status: 400 })
  if (!(await usuarioTemAcessoAoConcurso(concursoId, session.user.id))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  const materia = req.nextUrl.searchParams.get("materia")?.trim()
  const topico = req.nextUrl.searchParams.get("topico")?.trim()
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if ((materia?.length ?? 0) > 180 || (topico?.length ?? 0) > 300 || (q?.length ?? 0) > 180) {
    return NextResponse.json({ error: "Filtro inválido" }, { status: 400 })
  }

  try {
    const bizus = await db.bizuEstudo.findMany({
      where: {
        concursoId,
        userId: session.user.id,
        ...(materia ? { materia } : {}),
        ...(topico ? { topico } : {}),
        ...(q
          ? {
              OR: [
                { titulo: { contains: q, mode: "insensitive" as const } },
                { conteudo: { contains: q, mode: "insensitive" as const } },
                { materia: { contains: q, mode: "insensitive" as const } },
                { topico: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })
    return NextResponse.json(bizus)
  } catch (error) {
    console.error("[GET /api/estudo/bizus]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/estudo/bizus — cria um Bizu pessoal no concurso selecionado.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const leitura = await lerJsonComLimite(req)
  if (!leitura.ok) {
    return NextResponse.json({ error: leitura.error }, { status: leitura.status ?? 400 })
  }
  const validacao = validarCriacaoBizu(leitura.data)
  if (!validacao.ok) {
    return NextResponse.json({ error: validacao.error }, { status: validacao.status ?? 400 })
  }

  const { concursoId, ...campos } = validacao.data
  if (!(await usuarioTemAcessoAoConcurso(concursoId, session.user.id))) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  }

  try {
    const bizu = await db.bizuEstudo.create({
      data: {
        userId: session.user.id,
        concursoId,
        ...campos,
      },
    })
    return NextResponse.json(bizu, { status: 201 })
  } catch (error) {
    console.error("[POST /api/estudo/bizus]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
