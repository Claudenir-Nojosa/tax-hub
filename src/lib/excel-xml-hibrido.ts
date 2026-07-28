import ExcelJS from "exceljs"
import JSZip from "jszip"
import { yieldToEventLoop } from "./reforma-excel/yield"

// Mecânica genérica de "geração híbrida" de Excel: o ExcelJS monta só o CABEÇALHO de uma aba
// (estilos, larguras, subtotal) e as linhas de DADO são geradas como XML de planilha puro
// (SpreadsheetML), em lotes, e injetadas direto no .xlsx via jszip — nunca passam pelo modelo de
// objeto `Cell` do ExcelJS. Com centenas de milhares de linhas, esse modelo normal cria milhões de
// objetos e o navegador estoura memória ("Out of Memory") — bug real já reportado e corrigido uma
// vez (Antecipação ICMS-ST, ver src/lib/icms-st-antecipacao-excel.ts) e replicado depois pra
// aba "Entradas" (src/lib/entradas-icms-excel.ts), mesma causa raiz. Extraído aqui pra não deixar
// a mecânica (não a parte visual/de negócio, essa continua duplicada de propósito por aba — ver
// docs/recuperacao-credito.md seção 12) triplicada entre os dois módulos + reforma-excel/anos.ts.
export const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

const EPOCH_EXCEL = 25569 // dias entre 1899-12-30 e 1970-01-01

export function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function numXml(n: number): string {
  if (!Number.isFinite(n)) return "0"
  return String(Math.round(n * 1e10) / 1e10) // evita 1.0000000000000002e-3 nas células
}

// Célula de VALOR (não fórmula) — string/número/data. `sAttr` já vem pronto (` s="N"` ou "").
export function celulaValor(ref: string, sAttr: string, v: string | number | Date | null): string | null {
  if (v === null) return null
  if (typeof v === "number") return `<c r="${ref}"${sAttr}><v>${numXml(v)}</v></c>`
  if (v instanceof Date) {
    const serial = v.getTime() / 86400000 + EPOCH_EXCEL
    return `<c r="${ref}"${sAttr}><v>${serial}</v></c>`
  }
  return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`
}

// Célula de FÓRMULA cujo resultado em cache pode ser número ou texto.
export function celulaFormula(ref: string, sAttr: string, formula: string, result: string | number): string {
  if (typeof result === "number") return `<c r="${ref}"${sAttr}><f>${escXml(formula)}</f><v>${numXml(result)}</v></c>`
  return `<c r="${ref}"${sAttr} t="str"><f>${escXml(formula)}</f><v>${escXml(result)}</v></c>`
}

// Extrai do XML do stub (gerado pelo ExcelJS) o id de estilo de cada coluna (<col style="N">). As
// células injetadas precisam do atributo s="N" explícito: o Excel NÃO aplica o estilo da coluna a
// células gravadas sem estilo próprio.
export function extrairEstilosDasColunas(sheetXml: string): Map<number, string> {
  const estilos = new Map<number, string>() // nº da coluna (1-based) → id do estilo
  for (const m of sheetXml.matchAll(/<col[^>]*min="(\d+)"[^>]*max="(\d+)"[^>]*style="(\d+)"[^>]*\/>/g)) {
    const min = Number(m[1])
    const max = Number(m[2])
    for (let c = min; c <= max; c++) estilos.set(c, m[3])
  }
  return estilos
}

// Localiza o arquivo XML de uma aba dentro do .xlsx (nome da aba → rId → caminho da worksheet).
export async function mapearCaminhosDasAbas(zip: JSZip): Promise<Map<string, string>> {
  const workbookXml = await zip.file("xl/workbook.xml")!.async("string")
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")!.async("string")
  const caminhoPorRid = new Map<string, string>()
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    caminhoPorRid.set(m[1], `xl/${m[2].replace(/^\//, "").replace(/^xl\//, "")}`)
  }
  const caminhoPorNome = new Map<string, string>()
  for (const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    const caminho = caminhoPorRid.get(m[2])
    if (caminho) caminhoPorNome.set(m[1], caminho)
  }
  return caminhoPorNome
}

// Gera as linhas de dado de UMA aba híbrida como bytes (Uint8Array), em lotes, cedendo o event
// loop entre cada lote (sem isso, dezenas/centenas de milhares de linhas rodam 100% síncrono e o
// navegador mostra "Página sem resposta"). Devolve bytes, não string: uma string JS tem um limite
// absoluto de tamanho (~536 milhões de caracteres no V8) que um EFD grande o bastante consegue
// estourar mesmo depois de evitar o Out of Memory de objeto de célula — cada LOTE ainda é montado
// como string (pequeno, seguro) e convertido pra bytes imediatamente.
export async function gerarLinhasXmlEmLotes<T>(
  itens: T[],
  gerarLinhaXml: (item: T, indice: number) => string,
  opts?: { tamanhoLote?: number; onProgress?: (atual: number, total: number) => void }
): Promise<Uint8Array> {
  const TAMANHO_LOTE = opts?.tamanhoLote ?? 1000
  const encoder = new TextEncoder()
  const partesBytes: Uint8Array[] = []
  let lote: string[] = []

  for (let i = 0; i < itens.length; i++) {
    lote.push(gerarLinhaXml(itens[i], i))
    if (lote.length >= TAMANHO_LOTE || i === itens.length - 1) {
      partesBytes.push(encoder.encode(lote.join("")))
      lote = []
      opts?.onProgress?.(i + 1, itens.length)
      await yieldToEventLoop()
    }
  }

  const tamanhoTotal = partesBytes.reduce((s, p) => s + p.length, 0)
  const resultado = new Uint8Array(tamanhoTotal)
  let offset = 0
  for (const parte of partesBytes) {
    resultado.set(parte, offset)
    offset += parte.length
  }
  return resultado
}

// Descreve UMA aba que o ExcelJS só montou o CABEÇALHO — as linhas de dado entram depois, como
// XML puro, via `gerarLinhasXml` (chamado por `finalizarExcelComAbasHibridas` com o mapa de
// estilos de coluna já extraído do stub gerado).
export interface AbaHibridaPendente {
  sheetName: string
  dimensaoRef: string
  gerarLinhasXml: (
    estilosColunas: Map<number, string>,
    onProgress?: (atual: number, total: number) => void
  ) => Promise<Uint8Array>
}

// Ponto único de finalização de um workbook com 0+ abas híbridas pendentes — usado tanto pelos
// exports standalone quanto pelo orquestrador combinado da Recuperação de Crédito
// (recuperacao-credito-excel.ts): grava o workbook (só cabeçalhos) UMA vez, e só faz o round-trip
// pelo jszip (carregar → injetar XML de cada aba pendente → recompactar) quando há pelo menos uma
// — sem custo extra pros exports que não usam nenhuma aba híbrida.
export async function finalizarExcelComAbasHibridas(
  wb: ExcelJS.Workbook,
  pendentes: AbaHibridaPendente[],
  onProgress?: (linhaAtual: number, totalLinhas: number) => void
): Promise<Blob> {
  const bufferBase = await wb.xlsx.writeBuffer()
  if (pendentes.length === 0) return new Blob([bufferBase], { type: MIME_XLSX })

  const zip = await JSZip.loadAsync(bufferBase)
  const caminhos = await mapearCaminhosDasAbas(zip)

  for (const pendente of pendentes) {
    const caminho = caminhos.get(pendente.sheetName)
    if (!caminho || !zip.file(caminho)) throw new Error(`Aba "${pendente.sheetName}" não encontrada no arquivo gerado`)

    let sheetXml = await zip.file(caminho)!.async("string")
    const estilosColunas = extrairEstilosDasColunas(sheetXml)
    const linhasBytes = await pendente.gerarLinhasXml(estilosColunas, onProgress)
    sheetXml = sheetXml.replace(/<dimension ref="[^"]*"\s*\/>/, `<dimension ref="${pendente.dimensaoRef}"/>`)

    // Splice em BYTES, não em string: o stub (sheetXml) é pequeno (só cabeçalho), então cortar em
    // volta de "</sheetData>" nele é seguro, mas concatenar o resultado com `linhasBytes` como
    // string estouraria o limite de tamanho de string do V8 em EFDs grandes. Entregar bytes (não
    // string) ao JSZip também evita o "Reparado" por tamanho inconsistente de caracteres
    // multi-byte (ç, õ...) que apareceu na Reforma Tributária com esse mesmo tipo de injeção.
    const idxFechamento = sheetXml.indexOf("</sheetData>")
    const encoder = new TextEncoder()
    const headBytes = encoder.encode(sheetXml.slice(0, idxFechamento))
    const tailBytes = encoder.encode(sheetXml.slice(idxFechamento))
    const finalBytes = new Uint8Array(headBytes.length + linhasBytes.length + tailBytes.length)
    finalBytes.set(headBytes, 0)
    finalBytes.set(linhasBytes, headBytes.length)
    finalBytes.set(tailBytes, headBytes.length + linhasBytes.length)
    zip.file(caminho, finalBytes)
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: MIME_XLSX })
}
