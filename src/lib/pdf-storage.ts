"use client"

// Arquivos da Biblioteca de PDFs — vivem no SUPABASE STORAGE (bucket privado "biblioteca-pdfs"),
// não mais no navegador: antes ficavam no IndexedDB deste dispositivo (pdf-storage.ts v1), o que
// significava reanexar o arquivo em cada computador/celular. Agora o binário é enviado uma vez e
// fica disponível em qualquer lugar que o usuário logar — a "verdade" de que existe é o campo
// `PdfEstudo.arquivoEnviado`, sincronizado junto com o resto do EstudoState.
//
// Fluxo (nunca o binário passa pela function do Vercel — limite de body ~4,5MB, PDFs do
// Estratégia passam disso fácil):
//   upload:   POST /api/estudo/biblioteca/{id}/arquivo → {path, token} (autenticado, path
//             derivado da sessão) → cliente Supabase (anon key) faz uploadToSignedUrl() DIRETO
//             pro Storage, sem passar pelo nosso servidor.
//   leitura:  GET  /api/estudo/biblioteca/{id}/arquivo → {url assinada, 5min} → fetch(url).blob()
//   exclusão: DELETE /api/estudo/biblioteca/{id}/arquivo
//
// A chave anon (NEXT_PUBLIC_*) é segura de expor no browser por design — quem autoriza a
// operação é o TOKEN assinado que a rota autenticada gera, não a chave em si.

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

export async function salvarArquivoPdf(id: string, arquivo: File | Blob): Promise<void> {
  const { path, token } = (await jsonOuErro(await fetch(`/api/estudo/biblioteca/${id}/arquivo`, { method: "POST" }))) as {
    path: string
    token: string
  }
  const { error } = await obterClienteBrowser()
    .storage.from("biblioteca-pdfs")
    .uploadToSignedUrl(path, token, arquivo, { contentType: "application/pdf" })
  if (error) throw new Error(error.message)
}

export async function obterArquivoPdf(id: string): Promise<Blob | null> {
  const res = await fetch(`/api/estudo/biblioteca/${id}/arquivo`)
  if (res.status === 404) return null
  const { url } = (await jsonOuErro(res)) as { url: string }
  const resArquivo = await fetch(url)
  if (!resArquivo.ok) throw new Error(`Falha ao baixar o arquivo (${resArquivo.status})`)
  return resArquivo.blob()
}

export async function excluirArquivoPdf(id: string): Promise<void> {
  await fetch(`/api/estudo/biblioteca/${id}/arquivo`, { method: "DELETE" }).catch(() => {
    /* best-effort — se falhar, fica um objeto órfão no Storage, inofensivo */
  })
}

// tenta contar as páginas do PDF no próprio navegador (pra preencher "Total de págs." sozinho ao
// anexar) — usa o build serverless do pdfjs que o unpdf embute (mesma lib já usada no servidor
// em /api/ai/edital-pdf). Import dinâmico pra não inchar o bundle da aba; qualquer falha vira
// null e o campo continua manual.
export async function contarPaginasPdf(arquivo: File | Blob): Promise<number | null> {
  try {
    const { getDocumentProxy } = await import("unpdf")
    const buf = new Uint8Array(await arquivo.arrayBuffer())
    const doc = await getDocumentProxy(buf)
    return doc.numPages > 0 ? doc.numPages : null
  } catch {
    return null
  }
}
