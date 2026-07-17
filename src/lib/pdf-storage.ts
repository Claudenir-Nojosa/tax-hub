"use client"

// Persistência local (IndexedDB) dos ARQUIVOS da Biblioteca de PDFs — mesmo racional do
// reforma-wizard-store: PDFs do Estratégia têm 5-50MB e não passam pelo Vercel (body de function
// limitado a ~4,5MB) nem cabem no Postgres; ficam no navegador, chaveados pelo id do PdfEstudo.
// Os METADADOS + progresso (EstudoState.pdfs) continuam sincronizando via localStorage/banco —
// limitação assumida: o ARQUIVO só existe NESTE navegador; em outra máquina a Biblioteca mostra
// a entrada normalmente e oferece "reanexar o arquivo".

const DB_NAME = "taxhub-biblioteca"
const STORE = "arquivos"

interface ArquivoPdfSalvo {
  id: string // = PdfEstudo.id
  blob: Blob
  nomeArquivo: string
  atualizadoEm: number
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function salvarArquivoPdf(id: string, arquivo: File | Blob, nomeArquivo: string): Promise<void> {
  const db = await abrirDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put({ id, blob: arquivo, nomeArquivo, atualizadoEm: Date.now() } satisfies ArquivoPdfSalvo)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function obterArquivoPdf(id: string): Promise<Blob | null> {
  const db = await abrirDb()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id)
      req.onsuccess = () => resolve((req.result as ArquivoPdfSalvo | undefined)?.blob ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function excluirArquivoPdf(id: string): Promise<void> {
  const db = await abrirDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// ids que TÊM arquivo salvo neste navegador — a Biblioteca usa pra decidir entre "Ler PDF" e
// "Anexar arquivo" em cada entrada (a presença do arquivo é por-dispositivo, nunca persistida
// no EstudoState pra não mentir em outra máquina)
export async function listarIdsComArquivo(): Promise<Set<string>> {
  const db = await abrirDb()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys()
      req.onsuccess = () => resolve(new Set((req.result as string[]) ?? []))
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
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
