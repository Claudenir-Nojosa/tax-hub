import ExcelJS from "exceljs"
import type { DadosDctfWeb } from "./dctfweb-parser"
import type { DadosDctf } from "./dctf-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Mesma convenção visual do export de Comprovante de Pagamentos (Excel Table com filtro +
// linhas zebradas + linha de SUBTOTAL acima do cabeçalho) — duplicado de propósito, ver docs.
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const DATA_FMT = "mm-dd-yy"
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const TAB_COLOR = "FF1F3864"
const LOGO_URL = "/icons/taxhub_logo_full.png"

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

interface TabelaSpec {
  nomeAba: string
  titulo: string
  nomeTabela: string // sem espaços (nome de tabela do Excel)
  larguras: number[] // larguras das colunas de dados (a partir de B)
  colunas: string[]
  linhas: ExcelJS.CellValue[][]
  colsData: number[] // colunas absolutas com formato de data
  colsMoney: number[] // colunas absolutas com formato monetário
  colsLeft: number[] // colunas absolutas alinhadas à esquerda (texto longo)
  subtotais: { col: number; nome: string; soma: number }[]
}

// Monta uma aba no estilo "Excel Table" (igual à de Comprovante de Pagamentos): logo, título,
// tabela com filtro/zebra e linha de SUBTOTAL acima do cabeçalho para as colunas monetárias.
async function montarTabela(wb: ExcelJS.Workbook, spec: TabelaSpec, logoBase64: string | null): Promise<void> {
  const ws = wb.addWorksheet(spec.nomeAba, { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: TAB_COLOR }
  ws.columns = [{ width: 3 }, ...spec.larguras.map((w) => ({ width: w }))]

  ws.getRow(1).height = 60
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }
  const tituloCell = ws.getCell(3, 2)
  tituloCell.value = spec.titulo
  tituloCell.font = { name: "Calibri", bold: true, size: 12 }

  const LINHA_HEADER = 6
  const ultimaColuna = spec.colunas.length + 1 // B=2 é a 1ª coluna de dados

  ws.addTable({
    name: spec.nomeTabela,
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: spec.colunas.map((name) => ({ name, filterButton: true })),
    rows: spec.linhas.length > 0 ? spec.linhas : [spec.colunas.map(() => "")],
  })

  // Linha de SUBTOTAL (respeita filtro) acima do cabeçalho, nas colunas monetárias principais
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  for (const { col, nome, soma } of spec.subtotais) {
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,${spec.nomeTabela}[${nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  // Formatação das linhas de dados
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(spec.linhas.length, 1)
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= ultimaColuna; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: spec.colsLeft.includes(c) ? "left" : "center", vertical: "middle" }
      if (spec.colsMoney.includes(c)) cell.numFmt = BRL
      if (spec.colsData.includes(c)) cell.numFmt = DATA_FMT
    }
  }

  // Cabeçalho navy (garante a cor mesmo em leitores que não resolvem o estilo nomeado da tabela)
  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= ultimaColuna; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}

export async function montarAbaDctfWeb(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoDctfWebRegistro[],
  logoBase64: string | null
): Promise<void> {
  const colunas = [
    "Nome Contribuinte", "CNPJ", "Período Apuração", "PA", "Número Recibo", "Data/Hora Transmissão",
    "Identificação Apuração Débitos", "Período Apuração Débito", "Código Receita", "Tributo", "Descrição", "CNO", "CNPJ Prestador",
    "Vlr Débito Apurado", "Vlr Salário Família", "Vlr Salário Maternidade", "Vlr Retenção INSS", "Vlr Saldo Pagar", "Vlr Créditos",
    "Número Processo", "Tipo", "Vlr Processo", "Vara", "Munícipio - UF", "Data Decisão", "Motivo Suspensão", "Indicador Depósito",
  ]
  const larguras = [30, 16, 14, 12, 18, 22, 30, 20, 13, 10, 50, 10, 18, 16, 15, 18, 15, 14, 12, 15, 10, 14, 12, 16, 12, 16, 15]

  const linhas: ExcelJS.CellValue[][] = []
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const { dados } of ordenadas) {
    const pa = dataPrimeiroDia(dados.competencia)
    const debitos = [...dados.debitos].sort((a, b) => a.codigoReceita.localeCompare(b.codigoReceita, undefined, { numeric: true }))
    for (const d of debitos) {
      linhas.push([
        dados.nomeContribuinte, dados.cnpj, dados.periodoApuracao, pa, dados.numeroRecibo, dados.dataHoraTransmissao,
        dados.identificacaoApuracao, d.periodoApuracaoDebito, d.codigoReceita, d.tributo ?? "", d.descricao, "", "",
        d.debitoApurado, "", "", "", d.saldoAPagar, "", "", "", "", "", "", "", "",
      ])
    }
  }

  const somaDebito = ordenadas.reduce((s, x) => s + x.dados.debitos.reduce((a, d) => a + d.debitoApurado, 0), 0)
  const somaSaldo = ordenadas.reduce((s, x) => s + x.dados.debitos.reduce((a, d) => a + d.saldoAPagar, 0), 0)

  await montarTabela(
    wb,
    {
      nomeAba: "DCTFWeb",
      titulo: "Relatório DCTFWeb",
      nomeTabela: "DctfWeb",
      larguras,
      colunas,
      linhas,
      colsData: [5], // PA
      colsMoney: [15, 16, 17, 18, 19, 20, 23], // O..T + W (Vlr Processo)
      colsLeft: [2, 12], // Nome Contribuinte, Descrição
      subtotais: [
        { col: 15, nome: "Vlr Débito Apurado", soma: somaDebito },
        { col: 19, nome: "Vlr Saldo Pagar", soma: somaSaldo },
      ],
    },
    logoBase64
  )
}

export async function montarAbaDctf(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoDctfRegistro[],
  logoBase64: string | null
): Promise<void> {
  const colunas = [
    "CNPJ", "Período", "PA", "Mês", "Ano", "Periodicidade", "Declaração Retificadora", "Número Recibo",
    "Número Recibo DCTF Retificada", "Critério Variação Monetária", "Grupo", "Forma Tributação Lucro",
    "Regime Apuração PIS/Cofins", "Balanço Suspensão Mês", "Possui Débitos SCP", "PJ Inativa Mês Declaração",
    "Qualificação PJ", "Tributo", "Código Receita DARF", "Descrição DARF", "Vlr Débito Apurado", "Vlr Principal",
    "Vlr Multa Pgto Com DARF", "Vlr Pagamento", "Vlr Compensação Débito", "Vlr Compensação Pagamento Indevido/Maior",
    "Número PER/DCOMP Compensação - Ficha 12", "Vlr Outras Compensações Débito", "Número PER/DCOMP Compensação - Ficha 13",
    "Tipo Crédito Compensação", "Total Compensações", "Vlr Suspensão Débito", "Vlr Parcelado Débito", "Vlr Deduzido Débito",
    "Saldo Pagar Débito",
  ]
  const larguras = [
    16, 12, 12, 12, 8, 14, 16, 14, 22, 22, 52, 16, 22, 16, 14, 16, 16, 10, 16, 40, 16, 14, 18, 14, 16, 22, 22, 20, 22, 16, 15, 15, 15, 15, 15,
  ]

  const linhas: ExcelJS.CellValue[][] = []
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const { dados } of ordenadas) {
    const m = dados.competencia.match(/^(\d{4})-(\d{2})$/)
    const ano = m ? m[1] : ""
    const mesNum = m ? Number(m[2]) : 0
    const periodo = m ? `01/${m[2]}/${m[1]}` : dados.competencia
    const pa = dataPrimeiroDia(dados.competencia)
    const debitos = [...dados.debitos].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    for (const d of debitos) {
      // Colunas codificadas do R01 e as de compensação/pagamento não decodificadas ficam vazias —
      // ver GAP no dctf-parser.ts / docs.
      linhas.push([
        dados.cnpj, periodo, pa, MESES[mesNum - 1] ?? "", ano, d.periodicidade, dados.declaracaoRetificadora, "",
        "", "", d.grupo, "", "", "", "", "", "", d.tributo ?? "", d.codigoVariacao, d.descricaoDarf,
        d.valorDebito, d.valorDebito, d.valorMulta, "", "", "", "", "", "", "", "", "", "", "", "",
      ])
    }
  }

  const soma = (fn: (d: DadosDctf["debitos"][number]) => number) =>
    ordenadas.reduce((s, x) => s + x.dados.debitos.reduce((a, d) => a + fn(d), 0), 0)

  await montarTabela(
    wb,
    {
      nomeAba: "DCTF",
      titulo: "Relatório DCTF",
      nomeTabela: "Dctf",
      larguras,
      colunas,
      linhas,
      colsData: [4], // PA
      colsMoney: [22, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 35, 36],
      colsLeft: [12, 20], // Grupo, Descrição DARF
      subtotais: [
        { col: 22, nome: "Vlr Débito Apurado", soma: soma((d) => d.valorDebito) },
        { col: 23, nome: "Vlr Principal", soma: soma((d) => d.valorDebito) },
        { col: 24, nome: "Vlr Multa Pgto Com DARF", soma: soma((d) => d.valorMulta) },
      ],
    },
    logoBase64
  )
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
