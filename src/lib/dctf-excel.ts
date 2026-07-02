import ExcelJS from "exceljs"
import type { DadosDctfWeb } from "./dctfweb-parser"
import type { DadosDctf } from "./dctf-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Mesma convenção visual dos outros exports do módulo (duplicado de propósito — ver docs).
const DATA_FMT = "dd/mm/yyyy"
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const TAB_COLOR = "FF1F3864"
const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const bloco = 0x8000
  for (let i = 0; i < bytes.length; i += bloco) binario += String.fromCharCode(...bytes.subarray(i, i + bloco))
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

// Data do "Período Apuração" (coluna PA): primeiro dia do mês da competência, em UTC — replica a
// forma como a planilha de referência guarda a data (com numFmt de data).
function dataPrimeiroDia(competencia: string): Date | null {
  const m = competencia.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

export interface DeclaracaoDctfWebRegistro {
  competencia: string
  dados: DadosDctfWeb
}
export interface DeclaracaoDctfRegistro {
  competencia: string
  dados: DadosDctf
}

async function iniciarAba(
  wb: ExcelJS.Workbook,
  nomeAba: string,
  titulo: string,
  larguras: number[],
  cabecalhos: string[],
  logoBase64: string | null
): Promise<ExcelJS.Worksheet> {
  const ws = wb.addWorksheet(nomeAba, { views: [{ showGridLines: false, state: "frozen", ySplit: 5 }] })
  ws.properties.tabColor = { argb: TAB_COLOR }
  ws.columns = [{ width: 3 }, ...larguras.map((w) => ({ width: w }))]

  ws.getRow(1).height = 60
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }
  const tituloCell = ws.getCell(3, 2)
  tituloCell.value = titulo
  tituloCell.font = { name: "Calibri", bold: true, size: 12 }

  const header = ws.getRow(5)
  cabecalhos.forEach((c, i) => {
    const cell = header.getCell(i + 2)
    cell.value = c
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  })
  return ws
}

function escreverLinha(ws: ExcelJS.Worksheet, rowNumber: number, valores: ExcelJS.CellValue[], colsData: number[]) {
  const row = ws.getRow(rowNumber)
  valores.forEach((v, i) => {
    const c = i + 2
    const cell = row.getCell(c)
    cell.value = v ?? null
    cell.font = { name: "Calibri", size: 10 }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    if (colsData.includes(c)) cell.numFmt = DATA_FMT
  })
}

export async function montarAbaDctfWeb(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoDctfWebRegistro[],
  logoBase64: string | null
): Promise<void> {
  const cabecalhos = [
    "Nome Contribuinte", "CNPJ", "Período Apuração", "PA", "Número Recibo", "Data/Hora Transmissão",
    "Identificação Apuração Débitos", "Período Apuração Débito", "Código Receita", "Tributo", "Descrição", "CNO", "CNPJ Prestador",
  ]
  const larguras = [30, 16, 14, 12, 18, 22, 30, 20, 13, 10, 50, 10, 18]
  const ws = await iniciarAba(wb, "DCTFWeb", "Relatório DCTFWeb", larguras, cabecalhos, logoBase64)
  // coluna "PA" = 5ª coluna de dados => coluna absoluta 5 (B=2 ... PA=5)
  const colPA = 5

  let r = 6
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const { dados } of ordenadas) {
    const pa = dataPrimeiroDia(dados.competencia)
    const debitosOrdenados = [...dados.debitos].sort((a, b) => a.codigoReceita.localeCompare(b.codigoReceita, undefined, { numeric: true }))
    for (const d of debitosOrdenados) {
      escreverLinha(ws, r++, [
        dados.nomeContribuinte, dados.cnpj, dados.periodoApuracao, pa, dados.numeroRecibo, dados.dataHoraTransmissao,
        dados.identificacaoApuracao, d.periodoApuracaoDebito, d.codigoReceita, d.tributo ?? "", d.descricao, "", "",
      ], [colPA])
    }
  }
}

export async function montarAbaDctf(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoDctfRegistro[],
  logoBase64: string | null
): Promise<void> {
  const cabecalhos = [
    "CNPJ", "Período", "PA", "Mês", "Ano", "Periodicidade", "Declaração Retificadora", "Número Recibo",
    "Número Recibo DCTF Retificada", "Critério Variação Monetária", "Grupo", "Forma Tributação Lucro",
    "Regime Apuração PIS/Cofins", "Balanço Suspensão Mês", "Possui Débitos SCP",
  ]
  const larguras = [16, 12, 12, 12, 8, 14, 16, 16, 22, 22, 52, 18, 22, 18, 16]
  const ws = await iniciarAba(wb, "DCTF", "Relatório DCTF", larguras, cabecalhos, logoBase64)
  const colPA = 4 // CNPJ=2, Período=3, PA=4

  let r = 6
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const { dados } of ordenadas) {
    const m = dados.competencia.match(/^(\d{4})-(\d{2})$/)
    const ano = m ? m[1] : ""
    const mesNum = m ? Number(m[2]) : 0
    const periodo = m ? `01/${m[2]}/${m[1]}` : dados.competencia
    const pa = dataPrimeiroDia(dados.competencia)
    const debitosOrdenados = [...dados.debitos].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    for (const d of debitosOrdenados) {
      // Colunas codificadas do R01 (Critério, Forma Tributação, Regime, Balanço, SCP) ficam
      // vazias — ver GAP no dctf-parser.ts / docs.
      escreverLinha(ws, r++, [
        dados.cnpj, periodo, pa, MESES[mesNum - 1] ?? "", ano, d.periodicidade, dados.declaracaoRetificadora, "",
        "", "", d.grupo, "", "", "", "",
      ], [colPA])
    }
  }
}

// Monta as abas DCTFWeb e/ou DCTF (só as que tiverem dados) num workbook já existente.
export async function montarAbasDctf(
  wb: ExcelJS.Workbook,
  dados: { dctfWeb?: DeclaracaoDctfWebRegistro[]; dctf?: DeclaracaoDctfRegistro[] }
): Promise<void> {
  const logoBase64 = await carregarLogoBase64()
  if ((dados.dctfWeb?.length ?? 0) > 0) await montarAbaDctfWeb(wb, dados.dctfWeb!, logoBase64)
  if ((dados.dctf?.length ?? 0) > 0) await montarAbaDctf(wb, dados.dctf!, logoBase64)
}

// Uso standalone (só DCTF/DCTFWeb) — cria o workbook, monta as abas (+ Checklist) e baixa.
export async function exportarDctfExcel(
  nomeCliente: string,
  dados: { dctfWeb?: DeclaracaoDctfWebRegistro[]; dctf?: DeclaracaoDctfRegistro[] }
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbasDctf(wb, dados)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - DCTF e DCTFWeb - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
