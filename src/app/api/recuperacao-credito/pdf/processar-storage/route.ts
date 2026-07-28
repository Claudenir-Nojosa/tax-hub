import { NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { processarArquivoPdfRecuperacaoCredito } from "@/lib/recuperacao-credito/processar-pdf"

const BUCKET = "recuperacao-credito-uploads"
// orçamento conservador — seguro tanto no plano Hobby (teto real ~60s) quanto no Pro da Vercel;
// ajustar depois se sobrar margem, uma vez confirmado o plano em uso.
export const maxDuration = 60
const ORCAMENTO_MS = 50_000

function clienteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST — recebe {projetoId, arquivos: [{path, nomeOriginal}]} (paths já enviados pelo navegador
// direto pro Storage, ver .../upload/urls/route.ts). Baixa cada um, delega o parsing/persistência
// pra processarArquivoPdfRecuperacaoCredito (mesma função do upload direto via FormData) e apaga
// o objeto do Storage ao final (sucesso ou erro — é rascunho, a verdade fica no Postgres).
// Processa por ORÇAMENTO DE TEMPO, não contagem fixa: pára e devolve `restantes` assim que o
// tempo decorrido se aproxima do limite seguro da função, pro cliente continuar com uma chamada
// nova em vez de arriscar timeout no meio de um arquivo.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const admin = clienteAdmin()
  if (!admin) return NextResponse.json({ error: "Storage não configurado (variáveis do Supabase ausentes)" }, { status: 500 })

  const body = (await req.json().catch(() => null)) as
    | { projetoId?: string; arquivos?: { path: string; nomeOriginal: string }[] }
    | null
  const projetoId = body?.projetoId
  const arquivos = body?.arquivos ?? []

  if (!projetoId) return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 })
  if (arquivos.length === 0) return NextResponse.json({ salvos: [], erros: [], restantes: [] })

  const projeto = await db.projetoRecuperacaoCredito.findFirst({
    where: { id: projetoId, cliente: { userId: session.user.id } },
    include: { cliente: true },
  })
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  const cliente = projeto.cliente

  const salvos: { arquivoNome: string; tipo: string; detalhe: string }[] = []
  const erros: { arquivo: string; motivo: string }[] = []
  const processados: string[] = [] // paths já baixados (sucesso ou erro) — apagar do Storage ao final

  const inicio = Date.now()
  let i = 0
  for (; i < arquivos.length; i++) {
    if (i > 0 && Date.now() - inicio > ORCAMENTO_MS) break
    const { path, nomeOriginal } = arquivos[i]

    try {
      const { data: blob, error: erroDownload } = await admin.storage.from(BUCKET).download(path)
      if (erroDownload || !blob) throw erroDownload ?? new Error("arquivo não encontrado no Storage")
      processados.push(path)

      const file = new File([blob], nomeOriginal, { type: "application/pdf" })
      const resultado = await processarArquivoPdfRecuperacaoCredito(file, projeto, cliente)
      if (resultado.ok) {
        salvos.push({ arquivoNome: nomeOriginal, tipo: resultado.tipo, detalhe: resultado.detalhe })
        for (const aviso of resultado.avisos ?? []) erros.push({ arquivo: nomeOriginal, motivo: aviso })
      } else {
        erros.push({ arquivo: nomeOriginal, motivo: resultado.motivo })
      }
    } catch (e) {
      processados.push(path)
      erros.push({ arquivo: nomeOriginal, motivo: e instanceof Error ? e.message : "Erro ao processar arquivo" })
    }
  }

  const restantes = arquivos.slice(i)

  if (processados.length > 0) {
    await admin.storage.from(BUCKET).remove(processados).catch(() => {
      // best-effort — se falhar, fica um objeto órfão no bucket de rascunho, inofensivo
    })
  }

  return NextResponse.json({ salvos, erros, restantes })
}
