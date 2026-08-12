import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../../auth"
import db from "@/lib/db"
import type { ParteSimulado } from "@/lib/simulados-data"

// Arquivos de Simulados (prova real em PDF) no Supabase Storage — mesmo padrão da Biblioteca
// (src/app/api/estudo/biblioteca/[id]/arquivo/route.ts): bucket PRIVADO, esta rota só minta URLs
// assinadas, o binário nunca passa pela function do Vercel. Currículo compartilhado por concurso
// (SimuladoConcurso), acesso autorizado via ConcursoAcesso.
//
// O arquivo é POR PARTE (não um único PDF pro simulado inteiro) — Conhecimentos Gerais e
// Específicos costumam vir em PDFs separados na prova real. `[id]` continua sendo o simuladoId;
// `parteId` chega por query string e decide QUAL storagePath (dentro do array partes, guardado
// como Json em SimuladoConcurso.partes) esta chamada lê/escreve.

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

// resolve o path JÁ EXISTENTE de uma parte específica (GET/DELETE) — access-check via ConcursoAcesso
async function resolverPathExistente(id: string, parteId: string, userId: string): Promise<string | null> {
  const simulado = await db.simuladoConcurso.findFirst({
    where: { id, concurso: { acessos: { some: { userId } } } },
    select: { partes: true },
  })
  const partes = (simulado?.partes as unknown as ParteSimulado[] | undefined) ?? []
  return partes.find((p) => p.id === parteId)?.storagePath ?? null
}

// POST — token de upload assinado pra UMA parte. O simulado pode ainda não ter linha em
// SimuladoConcurso (item sendo criado agora) — por isso recebe concursoId explícito e só checa
// acesso, sem depender da linha (ou da parte) já existir.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })
  const { id } = await params
  const concursoId = req.nextUrl.searchParams.get("concursoId")
  const parteId = req.nextUrl.searchParams.get("parteId")
  if (!concursoId) return NextResponse.json({ error: "concursoId obrigatório" }, { status: 400 })
  if (!parteId) return NextResponse.json({ error: "parteId obrigatório" }, { status: 400 })

  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId: session.user.id } })
  if (acesso === 0) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const path = `${concursoId}/${id}/${parteId}.pdf`

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

// GET — URL assinada de leitura (curta duração; o client faz fetch(url).blob()) pra UMA parte
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })
  const { id } = await params
  const parteId = req.nextUrl.searchParams.get("parteId")
  if (!parteId) return NextResponse.json({ error: "parteId obrigatório" }, { status: 400 })
  const path = await resolverPathExistente(id, parteId, session.user.id)
  if (!path) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, TTL_DOWNLOAD_SEGUNDOS)
  if (error || !data) {
    return NextResponse.json({ error: "Arquivo não encontrado no Storage" }, { status: 404 })
  }
  return NextResponse.json({ url: data.signedUrl })
}

// DELETE — remove o objeto de UMA parte (best-effort: se já não existir, não é erro pro chamador)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ ok: true })
  const { id } = await params
  const parteId = req.nextUrl.searchParams.get("parteId")
  if (!parteId) return NextResponse.json({ error: "parteId obrigatório" }, { status: 400 })
  const path = await resolverPathExistente(id, parteId, session.user.id)
  if (!path) return NextResponse.json({ ok: true })

  await admin.storage.from(BUCKET).remove([path])
  return NextResponse.json({ ok: true })
}
