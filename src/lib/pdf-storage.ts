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

// Nenhum fetch() nativamente trava pra sempre, mas em navegadores/redes problemáticos (relatado
// pelo usuário: iPhone, PDF de 171 páginas) uma requisição pode ficar pendurada indefinidamente
// sem nunca resolver NEM rejeitar — sem timeout, isso vira um "Abrindo PDF..." eterno sem nenhum
// erro (o botão "Ler" fica girando pra sempre). Corrida contra um timer, igual ao watchdog do
// VisorPdf.tsx — não cancela a requisição de verdade (não dá pra confiar 100% em AbortController
// nesses mesmos navegadores problemáticos), só garante que a Promise que a UI espera SEMPRE
// resolve ou rejeita dentro do prazo.
function comTimeout<T>(promise: Promise<T>, timeoutMs: number, mensagem: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(mensagem)), timeoutMs)
    }),
  ])
}

export async function salvarArquivoPdf(id: string, arquivo: File | Blob, concursoId: string): Promise<void> {
  const { path, token } = (await jsonOuErro(
    await fetch(`/api/estudo/biblioteca/${id}/arquivo?concursoId=${encodeURIComponent(concursoId)}`, { method: "POST" })
  )) as { path: string; token: string }
  const { error } = await obterClienteBrowser()
    .storage.from("biblioteca-pdfs")
    .uploadToSignedUrl(path, token, arquivo, { contentType: "application/pdf" })
  if (error) throw new Error(error.message)
}

export async function obterArquivoPdf(id: string): Promise<Blob | null> {
  const res = await comTimeout(
    fetch(`/api/estudo/biblioteca/${id}/arquivo`),
    15000,
    "Tempo esgotado ao preparar o download do PDF — tente de novo"
  )
  if (res.status === 404) return null
  const { url } = (await jsonOuErro(res)) as { url: string }
  const resArquivo = await comTimeout(fetch(url), 60000, "Tempo esgotado ao baixar o PDF — verifique sua conexão e tente de novo")
  if (!resArquivo.ok) throw new Error(`Falha ao baixar o arquivo (${resArquivo.status})`)
  return comTimeout(resArquivo.blob(), 60000, "Tempo esgotado ao processar o PDF baixado — tente de novo")
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
