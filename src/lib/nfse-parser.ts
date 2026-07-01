"use client"

// Parser 100% client-side para XMLs de NFS-e no padrão ABRASF (<ListaNotaFiscal><Nfse><InfNfse>...)
// Suporta: .xml individual, .zip com múltiplos XMLs, múltiplos arquivos de uma vez.
// Nenhum XML sobe para o servidor — só a descrição de cada serviço é enviada, em lotes, pra
// classificação por IA (ver src/lib/equiparacao-hospitalar-classificar.ts).

export type NotaFiscalServico = {
  numero: string
  dataEmissao: string // ISO completo, ex: "2026-06-30T15:19:22"
  valorServico: number
  pisRetido: number
  cofinsRetido: number
  inssRetido: number
  irrf: number
  csll: number
  issRetidoFlag: number // 1 ou 2, valor bruto do campo <IssRetido> do XML (não é um valor monetário)
  valorIss: number
  baseCalculo: number
  valorLiquido: number
  cnae: string
  descricaoServico: string
  prestadorCnpj: string
  prestadorRazaoSocial: string
}

export class RarNotSupportedError extends Error {
  constructor() {
    super("Arquivos .rar não são suportados. Por favor, extraia os XMLs e importe como .xml ou .zip.")
    this.name = "RarNotSupportedError"
  }
}

function getText(el: Element | null, tag: string): string {
  if (!el) return ""
  const node = el.querySelector(tag)
  return node?.textContent?.trim() || ""
}

function getVal(el: Element | null, tag: string): number {
  if (!el) return 0
  const node = el.querySelector(tag)
  return node ? parseFloat(node.textContent || "0") || 0 : 0
}

function parseNfseXml(xmlStr: string): NotaFiscalServico[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, "text/xml")
  if (doc.querySelector("parsererror")) return []

  const infNfseNodes = Array.from(doc.querySelectorAll("InfNfse"))
  const notas: NotaFiscalServico[] = []

  for (const inf of infNfseNodes) {
    const servico = inf.querySelector("Servico")
    const valores = servico?.querySelector("Valores") ?? null
    const prestador = inf.querySelector("PrestadorServico")

    const numero = getText(inf, "Numero")
    if (!numero) continue // registro incompleto/corrompido — ignora

    notas.push({
      numero,
      dataEmissao: getText(inf, "DataEmissao"),
      valorServico: getVal(valores, "ValorServicos"),
      pisRetido: getVal(valores, "ValorPis"),
      cofinsRetido: getVal(valores, "ValorCofins"),
      inssRetido: getVal(valores, "ValorInss"),
      irrf: getVal(valores, "ValorIr"),
      csll: getVal(valores, "ValorCsll"),
      issRetidoFlag: getVal(valores, "IssRetido"),
      valorIss: getVal(valores, "ValorIss"),
      baseCalculo: getVal(valores, "BaseCalculo"),
      valorLiquido: getVal(valores, "ValorLiquidoNfse"),
      cnae: getText(servico, "CodigoCnae"),
      descricaoServico: getText(servico, "Discriminacao"),
      prestadorCnpj: getText(prestador, "Cnpj"),
      prestadorRazaoSocial: getText(prestador, "RazaoSocial"),
    })
  }

  return notas
}

export async function processarArquivosNfse(
  files: File[],
  onProgress?: (atual: number, total: number) => void
): Promise<NotaFiscalServico[]> {
  const rarFiles = files.filter((f) => f.name.toLowerCase().endsWith(".rar"))
  if (rarFiles.length > 0) throw new RarNotSupportedError()

  const xmlStrings: string[] = []
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
        xmlStrings.push(await entry.async("text"))
      }
    } else if (file.name.toLowerCase().endsWith(".xml")) {
      xmlStrings.push(await file.text())
    }
    processados++
    onProgress?.(processados, totalFiles)
  }

  const todasNotas: NotaFiscalServico[] = []
  for (const xml of xmlStrings) {
    todasNotas.push(...parseNfseXml(xml))
  }

  // Remove duplicatas (o mesmo XML pode aparecer em mais de um arquivo/lote exportado)
  const vistos = new Set<string>()
  const unicas: NotaFiscalServico[] = []
  for (const nota of todasNotas) {
    const chave = `${nota.prestadorCnpj}-${nota.numero}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    unicas.push(nota)
  }

  return unicas
}
