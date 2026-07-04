import ExcelJS from "exceljs"
import type { DadosComprovantePagamento } from "./comprovante-pagamento-parser"
import { labelTributo } from "./comprovante-pagamento-parser"

// Mesma convenção visual usada nos outros exports deste módulo (duplicado de propósito — ver
// docs/recuperacao-credito.md seção 7).
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"

const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function sc(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bold?: boolean
    align?: "left" | "center" | "right"
    numFmt?: string
    bg?: string
    color?: string
    size?: number
  }
) {
  if (opts.value !== undefined) cell.value = opts.value
  cell.font = { name: "Calibri", bold: opts.bold, size: opts.size ?? 10, color: { argb: opts.color ?? "FF000000" } }
  cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle" }
  if (opts.numFmt) cell.numFmt = opts.numFmt
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } }
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const tamanhoBloco = 0x8000
  for (let i = 0; i < bytes.length; i += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tamanhoBloco))
  }
  return btoa(binario)
}

async function carregarLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) return null
    return arrayBufferParaBase64(await res.arrayBuffer())
  } catch {
    return null
  }
}

// PA normalizado pro 1º dia do mês: o período impresso no DARF varia o dia (01, 30, 31...), mas
// a coluna PA existe pra casar com o SOMASES da aba de consolidação "PIS e COFINS" (critério =
// 1º dia da competência), igual ao WP de referência do usuário. A data impressa continua
// visível na coluna "Período Apuração" (texto).
function primeiroDiaDoMes(data: string): Date | null {
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, 1))
}

// Uma linha por combinação (DARF, código de receita) — mesma granularidade do arquivo de
// referência do usuário ("Relatório de Pagamentos.xlsx"): os campos do DARF (CNPJ, datas, banco
// etc.) se repetem em cada linha de código daquele DARF.
interface LinhaComprovante {
  darf: DadosComprovantePagamento
  codigo: DadosComprovantePagamento["codigos"][number]
}

function achatarLinhas(declaracoes: DadosComprovantePagamento[]): LinhaComprovante[] {
  const linhas: LinhaComprovante[] = []
  for (const darf of declaracoes) {
    for (const codigo of darf.codigos) {
      linhas.push({ darf, codigo })
    }
  }
  return linhas
}

export async function montarAbaComprovantePagamento(
  wb: ExcelJS.Workbook,
  declaracoes: DadosComprovantePagamento[],
  nomeCliente: string
): Promise<void> {
  const linhas = achatarLinhas(declaracoes)

  const ws = wb.addWorksheet("Comprovante de Pagamentos", {
    views: [{ showGridLines: false }],
  })
  ws.properties.tabColor = { argb: "FF1F3864" }

  ws.columns = [
    { width: 3 }, // A margem
    { width: 8 }, // B Tipo
    { width: 16 }, // C CNPJ
    { width: 30 }, // D Contribuinte
    { width: 14 }, // E Período Apuração
    { width: 12 }, // F PA
    { width: 14 }, // G Data Vencimento
    { width: 20 }, // H Número Documento
    { width: 14 }, // I Data Arrecadação
    { width: 18 }, // J Identificação Depósito
    { width: 34 }, // K Banco
    { width: 14 }, // L Vlr Restituído
    { width: 18 }, // M Vlr Devolvido Contribuinte
    { width: 18 }, // N Vlr Transformado Pagamento
    { width: 14 }, // O Processo
    { width: 16 }, // P Número Referência
    { width: 20 }, // Q Observações
    { width: 10 }, // R Código
    { width: 10 }, // S Tributo
    { width: 45 }, // T Descrição Principal
    { width: 14 }, // U Vlr Principal
    { width: 12 }, // V Vlr Juros
    { width: 12 }, // W Vlr Multa
    { width: 14 }, // X Vlr Total
  ]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  sc(ws.getCell(3, 2), { value: `Comprovante de Pagamentos - DARFs - ${nomeCurto}`, bold: true, size: 12 })

  const colunas = [
    "Tipo",
    "CNPJ",
    "Contribuinte",
    "Período Apuração",
    "PA",
    "Data Vencimento",
    "Número Documento",
    "Data Arrecadação",
    "Identificação Depósito",
    "Banco",
    "Vlr Restituído",
    "Vlr Devolvido Contribuinte",
    "Vlr Transformado Pagamento",
    "Processo",
    "Número Referência",
    "Observações",
    "Código",
    "Tributo",
    "Descrição Principal",
    "Vlr Principal",
    "Vlr Juros",
    "Vlr Multa",
    "Vlr Total",
  ]

  const LINHA_HEADER = 6

  ws.addTable({
    name: "ComprovantePagamentos",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((name) => ({ name, filterButton: true })),
    rows: linhas.map(({ darf, codigo }) => [
      "DARF",
      darf.cnpj,
      darf.razaoSocial,
      darf.periodoApuracao,
      primeiroDiaDoMes(darf.periodoApuracao),
      darf.dataVencimento,
      darf.numeroDocumento,
      darf.dataArrecadacao,
      "",
      darf.banco,
      darf.valorRestituido,
      "",
      "",
      "",
      "",
      "",
      codigo.refCodigo ? `${codigo.codigo}-${codigo.refCodigo}` : codigo.codigo,
      labelTributo(codigo.codigo) ?? "",
      codigo.refDescricao ?? codigo.descricao,
      codigo.principal,
      codigo.juros,
      codigo.multa,
      codigo.total,
    ]),
  })

  // Linha acima do cabeçalho: total (SUBTOTAL, respeita filtro) das 4 colunas monetárias finais
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(linhas.length, 1)
  const colunasSubtotal: { col: number; nome: string; soma: number }[] = [
    { col: 21, nome: "Vlr Principal", soma: linhas.reduce((s, l) => s + l.codigo.principal, 0) },
    { col: 22, nome: "Vlr Juros", soma: linhas.reduce((s, l) => s + l.codigo.juros, 0) },
    { col: 23, nome: "Vlr Multa", soma: linhas.reduce((s, l) => s + l.codigo.multa, 0) },
    { col: 24, nome: "Vlr Total", soma: linhas.reduce((s, l) => s + l.codigo.total, 0) },
  ]
  for (const { col, nome, soma } of colunasSubtotal) {
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,ComprovantePagamentos[${nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  // Formatação das linhas de dados: contábil nas colunas monetárias, data nas colunas de data,
  // tudo centralizado (exceto Contribuinte e Descrição, alinhados à esquerda por serem texto
  // longo) — mesma convenção do export de Equiparação Hospitalar.
  const COLS_MONETARIAS = [11, 20, 21, 22, 23]
  const COLS_DATA = [6]
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= 24; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: c === 4 || c === 19 ? "left" : "center", vertical: "middle" }
      if (COLS_MONETARIAS.includes(c)) cell.numFmt = BRL
      if (COLS_DATA.includes(c)) cell.numFmt = "mm-dd-yy"
    }
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= 24; c++) {
    sc(headerRow.getCell(c), { bold: true, align: "center", color: COR_HEADER_TEXTO, bg: COR_HEADER_BG })
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}

// Uso standalone (só o Comprovante de Pagamentos, sem combinar com outras abas) — cria o
// workbook, monta a aba e já baixa. Pra combinar com outros tipos de declaração num arquivo só,
// usar `exportarDeclaracaoFiscalExcel` em src/lib/recuperacao-credito-excel.ts.
export async function exportarComprovantePagamentoExcel(
  declaracoes: DadosComprovantePagamento[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbaComprovantePagamento(wb, declaracoes, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - Comprovante de Pagamentos - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
