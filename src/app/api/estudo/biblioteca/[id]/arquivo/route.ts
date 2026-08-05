import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"

// Arquivos da Biblioteca de PDFs no Supabase Storage (bucket PRIVADO — são materiais pagos do
// usuário, ex.: aulas do Estratégia; nunca públicos). O binário nunca passa pela function do
// Vercel (limite de body ~4,5MB): esta rota só MINTA URLs assinadas — o upload/download em si é
// navegador↔Supabase direto.
//
// A biblioteca é COMPARTILHADA por concurso (PdfConcurso), não mais por usuário: o path no
// Storage é `${concursoId}/${id}.pdf` e o acesso é autorizado via ConcursoAcesso (qualquer usuário
// com acesso ao concurso pode ler/escrever o mesmo arquivo). Pro GET/DELETE, o path vem do campo
// PdfConcurso.storagePath (já existe uma linha, criada no autosave de progresso). Pro POST
// (upload de um PDF NOVO), a linha ainda não existe nesse momento — por isso o client manda
// `concursoId` explícito, e o path é construído direto (só com um check de acesso, sem lookup).
//
// Client admin é LAZY (não `@/lib/supabase-admin`, que instancia `createClient` no TOPO do
// módulo): sem as env vars, `createClient(undefined, undefined)` explode na hora do IMPORT e
// derruba a rota inteira com um 500 genérico do Next — nosso guard de "Storage não configurado"
// nunca chegaria a rodar. Instanciando só dentro do handler, o guard roda primeiro.

const BUCKET = "biblioteca-pdfs"
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
    // 50MB é o teto do plano FREE do Supabase (limite global de upload) — pedir mais que isso
    // faz o próprio createBucket falhar com "The object exceeded the maximum allowed size".
    // Se o projeto migrar pra um plano pago, dá pra subir este valor (e o limite global em
    // Storage Settings) pra até 500GB.
    fileSizeLimit: "50MB",
    allowedMimeTypes: ["application/pdf"],
  })
  // "already exists" é o caminho feliz normal (bucket já criado numa chamada anterior) — só
  // outros erros (permissão, config) devem propagar
  if (error && !/already exists/i.test(error.message)) throw error
}

// resolve o path autorizado pra um PDF já existente (GET/DELETE) — access-check via ConcursoAcesso
async function resolverPathExistente(id: string, userId: string): Promise<string | null> {
  const pdf = await db.pdfConcurso.findFirst({
    where: { id, concurso: { acessos: { some: { userId } } } },
  })
  return pdf?.storagePath ?? null
}

// POST — token de upload assinado (o client faz supabase.storage.uploadToSignedUrl com ele). PDF
// pode ainda não ter linha em PdfConcurso (upload de item novo, autosave ainda não rodou) —
// por isso recebe concursoId explícito e só checa acesso, sem depender da linha existir.
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
    // a API do Storage já usou "Bucket not found" e hoje usa "The related resource does not
    // exist" pro mesmo caso (bucket ausente) — cobre as duas variações de texto
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
  if (!admin) return NextResponse.json({ ok: true }) // sem Storage configurado, nada a apagar
  const { id } = await params
  const path = await resolverPathExistente(id, session.user.id)
  if (!path) return NextResponse.json({ ok: true }) // já não existe (ou sem acesso) — nada a fazer

  await admin.storage.from(BUCKET).remove([path])
  return NextResponse.json({ ok: true })
}
