"use client"

// Cliente de upload da Recuperação de Crédito — sobe PDFs/EFDs DIRETO pro Supabase Storage
// (bucket de rascunho "recuperacao-credito-uploads"), sem passar pelo corpo da função Vercel
// (limite ~4,5MB de payload) — mesmo padrão já usado na Biblioteca de PDFs
// (src/lib/pdf-storage.ts), adaptado pra chegar em LOTE (upload de centenas de arquivos de uma
// vez): minta N URLs assinadas numa chamada só (.../upload/urls) e sobe com concorrência
// limitada, em vez do antigo corte em lotes de 3,5MB enviados um de cada vez.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "recuperacao-credito-uploads"

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

export interface UrlUploadMintada {
  nome: string
  path: string
  token: string
}

// Minta uma URL assinada de upload por arquivo — server valida dono do projeto uma vez e rejeita
// por-arquivo quem passar de 50MB (ver src/app/api/recuperacao-credito/upload/urls/route.ts).
export async function mintarUrlsUpload(
  projetoId: string,
  arquivos: { nome: string; tamanho: number }[]
): Promise<{ urls: UrlUploadMintada[]; erros: { nome: string; motivo: string }[] }> {
  const res = await fetch("/api/recuperacao-credito/upload/urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projetoId, arquivos }),
  })
  const data = (await jsonOuErro(res)) as { arquivos: UrlUploadMintada[]; erros: { nome: string; motivo: string }[] }
  return { urls: data.arquivos, erros: data.erros }
}

// Pool simples de concorrência limitada — evita tanto "um de cada vez" (lento pra centenas de
// arquivos, o gargalo original) quanto "todos de uma vez" (sobrecarrega a conexão do navegador e
// a API do Supabase).
export async function comConcorrencia<T>(
  itens: T[],
  worker: (item: T, indice: number) => Promise<void>,
  concorrencia = 8
): Promise<void> {
  let indice = 0
  async function trabalhador() {
    while (indice < itens.length) {
      const meu = indice++
      await worker(itens[meu], meu)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concorrencia, itens.length) }, () => trabalhador()))
}

// Sobe um arquivo já mintado direto pro Storage — navegador↔Supabase, nunca passa pela função
// Vercel.
export async function uploadArquivoStorage(urlMintada: UrlUploadMintada, arquivo: File): Promise<void> {
  const { error } = await obterClienteBrowser().storage.from(BUCKET).uploadToSignedUrl(urlMintada.path, urlMintada.token, arquivo)
  if (error) throw new Error(error.message)
}
