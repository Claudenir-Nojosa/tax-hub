import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

// Bucket de RASCUNHO pro upload de PDFs/EFDs da Recuperação de Crédito — os objetos aqui são
// apagados depois de processados (ver .../pdf|efd/processar-storage/route.ts), a "verdade" que
// importa fica no Postgres via Prisma, igual já era antes. Existe só pra o navegador subir o
// arquivo DIRETO pro Storage, sem passar pelo corpo da função Vercel (limite de ~4,5MB) — mesmo
// padrão já usado na Biblioteca de PDFs (src/lib/pdf-storage.ts +
// src/app/api/estudo/biblioteca/[id]/arquivo/route.ts), adaptado aqui: path com prefixo do
// projeto (não só do usuário), sem restrição de MIME (.txt/.dec não têm MIME confiável entre
// navegadores — a validação de tipo já é feita por CONTEÚDO nos parsers, não precisa duplicar
// aqui) e minta N URLs numa chamada só (esses uploads chegam em lote, não um de cada vez).
const BUCKET = "recuperacao-credito-uploads"
// 50MB é o teto do plano FREE do Supabase (limite global de upload) — ver mesmo comentário em
// src/app/api/estudo/biblioteca/[id]/arquivo/route.ts.
const TAMANHO_MAX_BYTES = 50 * 1024 * 1024
// não minta as URLs todas de uma vez (um projeto de centenas de arquivos estressaria a API do
// Supabase) nem uma de cada vez (lento) — um meio-termo com concorrência limitada.
const CONCORRENCIA_MINT = 15

function clienteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function garantirBucket(admin: SupabaseClient) {
  const { error } = await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: "50MB" })
  // "already exists" é o caminho feliz normal (bucket já criado numa chamada anterior, ou por
  // outro worker concorrente desta mesma chamada) — só outros erros devem propagar
  if (error && !/already exists/i.test(error.message)) throw error
}

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9._-]/g, "_")
}

// POST — recebe {projetoId, arquivos: [{nome, tamanho}]}, minta uma URL de upload assinada por
// arquivo. Rejeita por-arquivo quem passar do teto de tamanho (erro claro, não silencioso) — o
// resto segue normal, mesmo idioma de "falha é por-arquivo" já usado no resto do módulo.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })

  const body = (await req.json().catch(() => null)) as
    | { projetoId?: string; arquivos?: { nome: string; tamanho: number }[] }
    | null
  const projetoId = body?.projetoId
  const arquivos = body?.arquivos ?? []

  if (!projetoId) return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 })
  if (arquivos.length === 0) return NextResponse.json({ error: "Nenhum arquivo informado" }, { status: 400 })

  const projeto = await db.projetoRecuperacaoCredito.findFirst({
    where: { id: projetoId, cliente: { userId: session.user.id } },
  })
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })

  const userId = session.user.id
  const validos = arquivos.filter((a) => a.tamanho <= TAMANHO_MAX_BYTES)
  const erros: { nome: string; motivo: string }[] = arquivos
    .filter((a) => a.tamanho > TAMANHO_MAX_BYTES)
    .map((a) => ({
      nome: a.nome,
      motivo: `Arquivo maior que 50MB (${(a.tamanho / 1024 / 1024).toFixed(1)}MB) — acima do limite do Storage`,
    }))

  const resultados: { nome: string; path: string; token: string }[] = []

  let indice = 0
  async function worker() {
    while (indice < validos.length) {
      const meu = indice++
      const arquivo = validos[meu]
      const path = `${userId}/${projetoId}/${crypto.randomUUID()}-${sanitizarNomeArquivo(arquivo.nome)}`
      try {
        let { data, error } = await admin!.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
        if (error && /bucket not found|related resource does not exist/i.test(error.message)) {
          await garantirBucket(admin!)
          ;({ data, error } = await admin!.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true }))
        }
        if (error || !data) throw error ?? new Error("resposta vazia do Storage")
        resultados.push({ nome: arquivo.nome, path: data.path, token: data.token })
      } catch (e) {
        erros.push({ nome: arquivo.nome, motivo: e instanceof Error ? e.message.slice(0, 200) : "erro ao preparar upload" })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA_MINT, validos.length) }, () => worker()))

  return NextResponse.json({ arquivos: resultados, erros })
}
