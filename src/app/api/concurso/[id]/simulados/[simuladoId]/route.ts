import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"
import type { ParteSimulado } from "@/lib/simulados-data"

async function checarAcesso(concursoId: string, userId: string): Promise<boolean> {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

// PATCH — edita metadados/partes (gabarito, e também storagePath/arquivoEnviado DE CADA PARTE,
// já que o arquivo é por parte — o client manda o array `partes` inteiro já atualizado depois de
// terminar um upload direto no Storage, a rota de arquivo não toca na linha do banco)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const existente = await db.simuladoConcurso.findFirst({ where: { id: simuladoId, concursoId } })
  if (!existente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as Partial<{
    nome: string; orgao: string | null; banca: string | null; ano: number | null; partes: ParteSimulado[]
  }>

  const atualizado = await db.simuladoConcurso.update({
    where: { id: simuladoId },
    data: {
      ...(body.nome !== undefined && { nome: body.nome.trim() }),
      ...(body.orgao !== undefined && { orgao: body.orgao?.trim() || null }),
      ...(body.banca !== undefined && { banca: body.banca?.trim() || null }),
      ...(body.ano !== undefined && { ano: body.ano }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      ...(body.partes !== undefined && { partes: body.partes as any }),
    },
  })
  return NextResponse.json({
    id: atualizado.id,
    nome: atualizado.nome,
    orgao: atualizado.orgao ?? undefined,
    banca: atualizado.banca ?? undefined,
    ano: atualizado.ano ?? undefined,
    partes: atualizado.partes as unknown as ParteSimulado[],
    criadoEm: atualizado.criadoEm.toISOString(),
    updatedAt: atualizado.updatedAt.toISOString(),
  })
}

// DELETE — remove a linha + best-effort no Storage (mesmo padrão de excluir() na BibliotecaTab) —
// o arquivo é por parte, então precisa remover UM objeto por parte que tiver storagePath
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; simuladoId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id: concursoId, simuladoId } = await params
  if (!(await checarAcesso(concursoId, session.user.id))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const existente = await db.simuladoConcurso.findFirst({ where: { id: simuladoId, concursoId } })
  if (!existente) return NextResponse.json({ ok: true })

  await db.simuladoConcurso.delete({ where: { id: simuladoId } })

  const partes = (existente.partes as unknown as ParteSimulado[] | null) ?? []
  const paths = partes.map((p) => p.storagePath).filter((p): p is string => !!p)
  if (paths.length > 0) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && key) {
      const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      await admin.storage.from("simulados-pdfs").remove(paths).catch(() => { /* best-effort */ })
    }
  }
  return NextResponse.json({ ok: true })
}
