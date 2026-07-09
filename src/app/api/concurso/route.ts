import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../auth"
import db from "@/lib/db"
import type { MateriaConcurso } from "@/lib/estudo-data"

// GET — lista concursos do usuário
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const concursos = await db.concurso.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isPrincipal: "desc" }, { createdAt: "asc" }],
    include: { progresso: false },
  })
  return NextResponse.json(concursos)
}

// POST — cria novo concurso
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const { nome, orgao, foto, dataProva, materias, isPrincipal } = body as {
    nome: string
    orgao?: string
    foto?: string
    dataProva?: string
    materias?: MateriaConcurso[]
    isPrincipal?: boolean
  }

  if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  // Se vai ser principal, un-set os outros
  if (isPrincipal) {
    await db.concurso.updateMany({
      where: { userId: session.user.id },
      data: { isPrincipal: false },
    })
  }

  const concurso = await db.concurso.create({
    data: {
      userId: session.user.id,
      nome,
      orgao: orgao ?? null,
      foto: foto ?? null,
      dataProva: dataProva ? new Date(dataProva) : null,
      isPrincipal: isPrincipal ?? false,
      materias: (materias ?? []) as object,
    },
  })
  return NextResponse.json(concurso, { status: 201 })
}

// materiasDefaultSefaz mudou pra src/lib/estudo-data.ts — route handlers não podem exportar
// além dos métodos HTTP (o typecheck dos tipos gerados em .next reprovava).
