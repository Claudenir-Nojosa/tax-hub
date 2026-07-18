import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../../auth"

// Arquivos da Biblioteca de PDFs no Supabase Storage (bucket PRIVADO — são materiais pagos do
// usuário, ex.: aulas do Estratégia; nunca públicos). O binário nunca passa pela function do
// Vercel (limite de body ~4,5MB): esta rota só MINTA URLs assinadas — o upload/download em si é
// navegador↔Supabase direto. Path sempre `${userId}/${id}.pdf`, derivado da SESSÃO (nunca do
// client), então um id não pode ler/escrever o arquivo de outro usuário mesmo que adivinhado.
//
// Client admin é LAZY (não `@/lib/supabase-admin`, que instancia `createClient` no TOPO do
// módulo): sem as env vars, `createClient(undefined, undefined)` explode na hora do IMPORT e
// derruba a rota inteira com um 500 genérico do Next — nosso guard de "Storage não configurado"
// nunca chegaria a rodar. Instanciando só dentro do handler, o guard roda primeiro.

const BUCKET = "biblioteca-pdfs"
const TTL_DOWNLOAD_SEGUNDOS = 300

function caminho(userId: string, id: string): string {
  return `${userId}/${id}.pdf`
}

function clienteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function garantirBucket(admin: SupabaseClient) {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "200MB",
    allowedMimeTypes: ["application/pdf"],
  })
  // "already exists" é o caminho feliz normal (bucket já criado numa chamada anterior) — só
  // outros erros (permissão, config) devem propagar
  if (error && !/already exists/i.test(error.message)) throw error
}

// POST — token de upload assinado (o client faz supabase.storage.uploadToSignedUrl com ele)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })
  const { id } = await params
  const path = caminho(session.user.id, id)

  try {
    let { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (error && /bucket not found/i.test(error.message)) {
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
  const path = caminho(session.user.id, id)

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
  if (!admin) return NextResponse.json({ ok: true }) // sem Storage configurado, nada a apagar
  const { id } = await params
  const path = caminho(session.user.id, id)

  await admin.storage.from(BUCKET).remove([path])
  return NextResponse.json({ ok: true })
}
