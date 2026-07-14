"use client"

import type { SaidasEfdData } from "@/components/reforma/StepSaidasEfd"
import type { EntradasEfdData } from "@/components/reforma/StepEntradasEfd"
import type { BaseNcmData } from "@/components/reforma/StepBaseNcm"

// Persistência local (IndexedDB) dos dados PESADOS do wizard da Reforma — saídas/entradas de EFD
// (dezenas de milhares de linhas) e a base de NCM customizada. Eles não cabem no Postgres via API
// (o Vercel limita o body das functions a ~4,5MB), então ficam no navegador, chaveados pelo id da
// EmpresaReforma. Com isso o usuário reabre um estudo finalizado direto na Revisão e baixa o
// Excel de novo sem reimportar nada. Limitação assumida: os dados só existem NESTE navegador —
// em outra máquina o wizard volta vazio (premissas/legislação/nome do projeto continuam vindo do
// banco via parametrosExtra).

const DB_NAME = "taxhub-reforma"
const STORE = "wizard"

export type ProjetoWizardSalvo = {
  empresaId: string
  saidasEfd: SaidasEfdData
  entradasEfd: EntradasEfdData
  baseNcm: BaseNcmData
  atualizadoEm: number
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "empresaId" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function salvarProjetoWizard(dados: Omit<ProjetoWizardSalvo, "atualizadoEm">): Promise<void> {
  const db = await abrirDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put({ ...dados, atualizadoEm: Date.now() } satisfies ProjetoWizardSalvo)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function carregarProjetoWizard(empresaId: string): Promise<ProjetoWizardSalvo | null> {
  const db = await abrirDb()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(empresaId)
      req.onsuccess = () => resolve((req.result as ProjetoWizardSalvo | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function removerProjetoWizard(empresaId: string): Promise<void> {
  const db = await abrirDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(empresaId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
