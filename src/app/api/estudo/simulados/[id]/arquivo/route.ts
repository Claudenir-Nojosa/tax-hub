import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"

// Arquivos de Simulados (prova real em PDF) no Supabase Storage — mesmo padrão da Biblioteca
// (src/app/api/estudo/biblioteca/[id]/arquivo/route.ts): bucket PRIVADO, esta rota só minta URLs
// assinadas, o binário nunca passa pela function do Vercel. Currículo compartilhado por concurso
// (SimuladoConcurso), acesso autorizado via ConcursoAcesso.

const BUCKET = "simulados-pdfs"
const TTL_DOWNLOAD_SEGUNDOS = 300

function clienteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function garantirBucket(admin: SupabaseClient) {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "50MB",
    allowedMimeTypes: ["application/pdf"],
  })
  if (error && !/already exists/i.test(error.message)) throw error
}

async function resolverPathExistente(id: string, userId: string): Promise<string | null> {
  const simulado = await db.simuladoConcurso.findFirst({
    where: { id, concurso: { acessos: { some: { userId } } } },
    select: { storagePath: true },
  })
  return simulado?.storagePath ?? null
}

// POST — token de upload assinado. O simulado pode ainda não ter linha em SimuladoConcurso (item
// sendo criado agora) — por isso recebe concursoId explícito e só checa acesso.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })
  const { id } = await params
  const concursoId = req.nextUrl.searchParams.get("concursoId")
  if (!concursoId) return NextResponse.json({ error: "concursoId obrigatório" }, { status: 400 })

  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId: session.user.id } })
  if (acesso === 0) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const path = `${concursoId}/${id}.pdf`

  try {
    let { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (error && /bucket not found|related resource does not exist/i.test(error.message)) {
      await garantirBucket(admin)
      ;({ data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true }))
    }
    if (error || !data) throw error ?? new Error("resposta vazia do Storage")
    return NextResponse.json({ path: data.path, token: data.token })
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao preparar upload: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }
}

// GET — URL assinada de leitura (curta duração; o client faz fetch(url).blob())
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })
  const { id } = await params
  const path = await resolverPathExistente(id, session.user.id)
  if (!path) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, TTL_DOWNLOAD_SEGUNDOS)
  if (error || !data) {
    return NextResponse.json({ error: "Arquivo não encontrado no Storage" }, { status: 404 })
  }
  return NextResponse.json({ url: data.signedUrl })
}

// DELETE — remove o objeto (best-effort: se já não existir, não é erro pro chamador)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ ok: true })
  const { id } = await params
  const path = await resolverPathExistente(id, session.user.id)
  if (!path) return NextResponse.json({ ok: true })

  await admin.storage.from(BUCKET).remove([path])
  return NextResponse.json({ ok: true })
}
