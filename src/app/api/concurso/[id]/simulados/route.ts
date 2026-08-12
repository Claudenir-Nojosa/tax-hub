import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import type { ParteSimulado } from "@/lib/simulados-data"

// Currículo de Simulados de um concurso — compartilhado (mesmo espírito de PdfConcurso), tabela
// própria (SimuladoConcurso), fora do blob EstudoState. Ver plano "Simulados + Discursiva".

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const simulados = await db.simuladoConcurso.findMany({ where: { concursoId }, orderBy: { criadoEm: "desc" } })
  return NextResponse.json(
    simulados.map((s) => ({
      id: s.id,
      nome: s.nome,
      orgao: s.orgao ?? undefined,
      banca: s.banca ?? undefined,
      ano: s.ano ?? undefined,
      partes: s.partes as unknown as ParteSimulado[],
      criadoEm: s.criadoEm.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))
  )
}

// body: { id (gerado no client — novoIdSimulado()), nome, orgao?, banca?, ano?, partes }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as { id: string; nome: string; orgao?: string; banca?: string; ano?: number; partes: ParteSimulado[] }
  if (!body.id || !body.nome?.trim()) return NextResponse.json({ error: "id e nome são obrigatórios" }, { status: 400 })

  const criado = await db.simuladoConcurso.create({
    data: {
      id: body.id,
      concursoId,
      nome: body.nome.trim(),
      orgao: body.orgao?.trim() || null,
      banca: body.banca?.trim() || null,
      ano: body.ano ?? null,
      criadoPorUserId: session.user.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      partes: (body.partes ?? []) as any,
    },
  })
  return NextResponse.json({
    id: criado.id,
    nome: criado.nome,
    orgao: criado.orgao ?? undefined,
    banca: criado.banca ?? undefined,
    ano: criado.ano ?? undefined,
    partes: criado.partes as unknown as ParteSimulado[],
    criadoEm: criado.criadoEm.toISOString(),
    updatedAt: criado.updatedAt.toISOString(),
  })
}
