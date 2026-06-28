"use client"

// Parser 100% client-side para XMLs de NF-e (modelo 55)
// Suporta: .xml individual, .zip com múltiplos XMLs, múltiplos arquivos de uma vez
// Nenhum dado sobe para o servidor — apenas o JSON agregado

export type ItemNFe = {
  nNF: string
  dhEmi: string       // "YYYY-MM"
  nItem: number
  xProd: string
  ncm: string
  cfop: string
  cstICMS: string
  vProd: number
  vBCICMS: number
  pICMS: number
  vICMS: number
  vBCPIS: number
  pPIS: number
  vPIS: number
  vBCCOFINS: number
  pCOFINS: number
  vCOFINS: number
  vBCIPI: number
  pIPI: number
  vIPI: number
  baseIbsCbs: number  // vProd - vICMS - vPIS - vCOFINS
}

export type DadosReaisXml = {
  periodos: string[]
  totalNFs: number
  totalItens: number
  totalVProd: number
  totalVICMS: number
  totalVPIS: number
  totalVCOFINS: number
  totalVIPI: number
  totalVBCICMS: number
  totalBaseIbsCbs: number
  aliquotaICMSEfetiva: number
  aliquotaIPIEfetiva: number
  percentualIPISaidas: number
  mesesImportados: number
  fatorAnualizacao: number
  itens: ItemNFe[]
}

function getVal(el: Element | null, tag: string): number {
  if (!el) return 0
  const node = el.querySelector(tag)
  return node ? parseFloat(node.textContent || "0") || 0 : 0
}

function getText(el: Element | null, tag: string): string {
  if (!el) return ""
  const node = el.querySelector(tag)
  return node?.textContent?.trim() || ""
}

function parseNFeXml(xmlStr: string): { nNF: string; dhEmi: string; itens: ItemNFe[] } | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlStr, "text/xml")

    const parseErr = doc.querySelector("parsererror")
    if (parseErr) return null

    const ide = doc.querySelector("ide")
    if (!ide) return null

    const nNF = getText(ide, "nNF") || getText(doc.documentElement, "nNF")
    const dhEmiRaw = getText(ide, "dhEmi") || getText(ide, "dEmi") || ""
    const dhEmi = dhEmiRaw ? dhEmiRaw.substring(0, 7) : "0000-00"

    const dets = Array.from(doc.querySelectorAll("det"))
    if (dets.length === 0) return null

    const itens: ItemNFe[] = dets.map((det) => {
      const nItem = parseInt(det.getAttribute("nItem") || "0") || 0
      const prod = det.querySelector("prod")
      const imposto = det.querySelector("imposto")

      const xProd = getText(prod, "xProd")
      const ncm   = getText(prod, "NCM")
      const cfop  = getText(prod, "CFOP")
      const vProd = getVal(prod, "vProd")

      // ICMS — tenta vários grupos (ICMS00, ICMS10, ICMS20, ICMS40, ICMS60, ICMS70, etc.)
      const icmsGrupo = imposto?.querySelector("ICMS > *") || null
      const cstICMS   = getText(icmsGrupo, "CST") || getText(icmsGrupo, "CSOSN") || ""
      const vBCICMS   = getVal(icmsGrupo, "vBC")
      const pICMS     = getVal(icmsGrupo, "pICMS")
      const vICMS     = getVal(icmsGrupo, "vICMS")

      // PIS
      const pisGrupo = imposto?.querySelector("PIS > *") || null
      const vBCPIS   = getVal(pisGrupo, "vBC")
      const pPIS     = getVal(pisGrupo, "pPIS")
      const vPIS     = getVal(pisGrupo, "vPIS")

      // COFINS
      const cofinsGrupo = imposto?.querySelector("COFINS > *") || null
      const vBCCOFINS   = getVal(cofinsGrupo, "vBC")
      const pCOFINS     = getVal(cofinsGrupo, "pCOFINS")
      const vCOFINS     = getVal(cofinsGrupo, "vCOFINS")

      // IPI (por fora)
      const ipiGrupo = imposto?.querySelector("IPI IPITrib") || imposto?.querySelector("IPI > *") || null
      const vBCIPI   = getVal(ipiGrupo, "vBC")
      const pIPI     = getVal(ipiGrupo, "pIPI")
      const vIPI     = getVal(ipiGrupo, "vIPI")

      const baseIbsCbs = Math.max(0, vProd - vICMS - vPIS - vCOFINS)

      return {
        nNF, dhEmi, nItem, xProd, ncm, cfop, cstICMS,
        vProd, vBCICMS, pICMS, vICMS,
        vBCPIS, pPIS, vPIS,
        vBCCOFINS, pCOFINS, vCOFINS,
        vBCIPI, pIPI, vIPI,
        baseIbsCbs,
      }
    })

    return { nNF, dhEmi, itens }
  } catch {
    return null
  }
}

export class RarNotSupportedError extends Error {
  constructor() {
    super("Arquivos .rar não são suportados. Por favor, extraia os XMLs e importe como .xml ou .zip.")
    this.name = "RarNotSupportedError"
  }
}

export async function processarArquivos(
  files: File[],
  onProgress?: (atual: number, total: number) => void
): Promise<DadosReaisXml> {
  const xmlStrings: string[] = []

  // Detecta RAR antes de processar
  const rarFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".rar"))
  if (rarFiles.length > 0) {
    throw new RarNotSupportedError()
  }

  let processados = 0
  const totalFiles = files.length

  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const { default: JSZip } = await import("jszip")
      const zip = await JSZip.loadAsync(file)
      const xmlEntries = Object.values(zip.files).filter(
        (f) => !f.dir && f.name.toLowerCase().endsWith(".xml")
      )
      for (const entry of xmlEntries) {
        const text = await entry.async("text")
        xmlStrings.push(text)
      }
    } else if (file.name.toLowerCase().endsWith(".xml")) {
      const text = await file.text()
      xmlStrings.push(text)
    }
    processados++
    onProgress?.(processados, totalFiles)
  }

  const todosItens: ItemNFe[] = []
  const nfsSet = new Set<string>()
  const periodosSet = new Set<string>()

  for (const xml of xmlStrings) {
    const resultado = parseNFeXml(xml)
    if (!resultado) continue
    nfsSet.add(`${resultado.nNF}-${resultado.dhEmi}`)
    periodosSet.add(resultado.dhEmi)
    todosItens.push(...resultado.itens)
  }

  const totalNFs     = nfsSet.size
  const totalItens   = todosItens.length
  const periodos     = Array.from(periodosSet).sort()
  const mesesImportados = periodos.filter((p) => p !== "0000-00").length || 1

  const totalVProd    = todosItens.reduce((s, i) => s + i.vProd, 0)
  const totalVICMS    = todosItens.reduce((s, i) => s + i.vICMS, 0)
  const totalVPIS     = todosItens.reduce((s, i) => s + i.vPIS, 0)
  const totalVCOFINS  = todosItens.reduce((s, i) => s + i.vCOFINS, 0)
  const totalVIPI     = todosItens.reduce((s, i) => s + i.vIPI, 0)
  const totalVBCICMS  = todosItens.reduce((s, i) => s + i.vBCICMS, 0)
  const totalVBCIPI   = todosItens.reduce((s, i) => s + i.vBCIPI, 0)
  const totalBaseIbsCbs = todosItens.reduce((s, i) => s + i.baseIbsCbs, 0)

  const itensComIPI   = todosItens.filter((i) => i.vIPI > 0).length

  return {
    periodos,
    totalNFs,
    totalItens,
    totalVProd,
    totalVICMS,
    totalVPIS,
    totalVCOFINS,
    totalVIPI,
    totalVBCICMS,
    totalBaseIbsCbs,
    aliquotaICMSEfetiva: totalVProd > 0 ? totalVICMS / totalVProd : 0,
    aliquotaIPIEfetiva:  totalVBCIPI > 0  ? totalVIPI / totalVBCIPI   : 0,
    percentualIPISaidas: totalItens > 0   ? itensComIPI / totalItens   : 0,
    mesesImportados,
    fatorAnualizacao: 12 / mesesImportados,
    itens: todosItens,
  }
}
