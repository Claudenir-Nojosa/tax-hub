"use client"

// Arquivos de Simulados — mesmo padrão de src/lib/pdf-storage.ts (bucket privado no Supabase
// Storage, binário nunca passa pela function do Vercel). Ver comentário lá pro fluxo completo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let clienteBrowser: SupabaseClient | null = null
function obterClienteBrowser(): SupabaseClient {
  if (!clienteBrowser) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) throw new Error("Storage não configurado (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)")
    clienteBrowser = createClient(url, anonKey)
  }
  return clienteBrowser
}

async function jsonOuErro(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}`)
  return data
}

function comTimeout<T>(promise: Promise<T>, timeoutMs: number, mensagem: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(mensagem)), timeoutMs)
    }),
  ])
}

export async function salvarArquivoSimulado(id: string, arquivo: File | Blob, concursoId: string): Promise<void> {
  const { path, token } = (await jsonOuErro(
    await fetch(`/api/estudo/simulados/${id}/arquivo?concursoId=${encodeURIComponent(concursoId)}`, { method: "POST" })
  )) as { path: string; token: string }
  const { error } = await obterClienteBrowser()
    .storage.from("simulados-pdfs")
    .uploadToSignedUrl(path, token, arquivo, { contentType: "application/pdf" })
  if (error) throw new Error(error.message)
}

export async function obterArquivoSimulado(id: string): Promise<Blob | null> {
  const res = await comTimeout(
    fetch(`/api/estudo/simulados/${id}/arquivo`),
    15000,
    "Tempo esgotado ao preparar o download do PDF — tente de novo"
  )
  if (res.status === 404) return null
  const { url } = (await jsonOuErro(res)) as { url: string }
  const resArquivo = await comTimeout(fetch(url), 60000, "Tempo esgotado ao baixar o PDF — verifique sua conexão e tente de novo")
  if (!resArquivo.ok) throw new Error(`Falha ao baixar o arquivo (${resArquivo.status})`)
  return comTimeout(resArquivo.blob(), 60000, "Tempo esgotado ao processar o PDF baixado — tente de novo")
}

export async function excluirArquivoSimulado(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/estudo/simulados/${id}/arquivo`, { method: "DELETE" })
    if (!res.ok) console.error(`[simulados-storage] Falha ao excluir arquivo ${id} do Storage (${res.status}) — pode ter ficado órfão`)
  } catch (e) {
    console.error(`[simulados-storage] Erro de rede ao excluir arquivo ${id} do Storage — pode ter ficado órfão`, e)
  }
}
