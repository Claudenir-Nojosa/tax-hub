import ExcelJS from "exceljs"
import type { NotaClassificada } from "./equiparacao-hospitalar-classificar"

// Formato contábil BR: símbolo "R$" alinhado à esquerda, número à direita, "-" para zero —
// mesmo formato usado no arquivo de referência do usuário.
const BRL = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'
const DATA_FMT = "dd/mm/yyyy"

// Cores extraídas do tema do arquivo de referência (theme3/dk2 = cabeçalho da tabela).
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const COR_TITULO = "FF0E2841"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

export async function exportarEquiparacaoHospitalarExcel(
  notas: NotaClassificada[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Automações"
  wb.created = new Date()
  const ws = wb.addWorksheet("Análise Equiparação Hospitalar", {
    views: [{ showGridLines: false }],
  })

  ws.columns = [
    { width: 3 }, // A — margem estreita
    { width: 12 }, // B Número
    { width: 10 }, // C Data
    { width: 16 }, // D Valor Serviço
    { width: 14 }, // E PIS Retido
    { width: 18 }, // F COFINS Retido
    { width: 15 }, // G INSS Retido
    { width: 10 }, // H IRRF
    { width: 10 }, // I CSLL
    { width: 14 }, // J ISS Retido
    { width: 12 }, // K ISS
    { width: 13 }, // L BC
    { width: 17 }, // M Valor Líquido
    { width: 10 }, // N CNAE
    { width: 19 }, // O Oportunidade
    { width: 86 }, // P Descrição do Serviço
  ]

  // Linha 4: título com link pra base legal
  const tituloCell = ws.getCell(4, 2)
  tituloCell.value = {
    text: "Solução de Consulta Disit/SRRF04 nº 4027/2016",
    hyperlink: "https://normasinternet2.receita.fazenda.gov.br/",
  }
  tituloCell.font = { name: "Calibri", size: 11, color: { argb: COR_TITULO }, underline: true }

  // Linha 5: subtítulo
  const subtituloCell = ws.getCell(5, 2)
  subtituloCell.value = `Notas Fiscais de Serviços Emitidas — ${nomeCliente}`
  subtituloCell.font = { name: "Calibri", bold: true, size: 12 }

  // Linha 7: início da tabela (cabeçalho na linha 7, dados a partir da 8)
  const LINHA_HEADER = 7
  const colunas = [
    "Número", "Data", "Valor Serviço", "PIS Retido", "COFINS Retido", "INSS Retido",
    "IRRF", "CSLL", "ISS Retido", "ISS", "BC", "Valor Líquido", "CNAE", "Oportunidade",
    "Descrição do Serviço",
  ]

  ws.addTable({
    name: "Nfse",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((name) => ({ name, filterButton: true })),
    rows: notas.map((n) => [
      n.numero,
      n.dataEmissao ? new Date(n.dataEmissao) : null,
      n.valorServico,
      n.pisRetido,
      n.cofinsRetido,
      n.inssRetido,
      n.irrf,
      n.csll,
      n.issRetidoFlag,
      n.valorIss,
      n.baseCalculo,
      n.valorLiquido,
      n.cnae,
      n.oportunidade,
      n.descricaoServico,
    ]),
  })

  // Linha 6: total de Valor Líquido (SUBTOTAL sobre a coluna da tabela), acima do cabeçalho
  const totalCell = ws.getCell(6, 13) // coluna M = Valor Líquido
  const totalValorLiquido = notas.reduce((s, n) => s + n.valorLiquido, 0)
  totalCell.value = { formula: "SUBTOTAL(9,Nfse[Valor Líquido])", result: totalValorLiquido } as ExcelJS.CellFormulaValue
  totalCell.font = { name: "Calibri", bold: true, size: 11 }
  totalCell.numFmt = BRL
  totalCell.alignment = { horizontal: "center", vertical: "middle" }

  // Formatação por coluna: contábil pra valores monetários, data, tudo centralizado — replica
  // o alinhamento do arquivo de referência (inclusive números centralizados, não à direita).
  const COLS_MONETARIAS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13] // D..M
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + notas.length
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= 16; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 11 }
      cell.alignment = { horizontal: c === 16 ? "left" : "center", vertical: "middle" }
      if (COLS_MONETARIAS.includes(c)) cell.numFmt = BRL
      if (c === 3) cell.numFmt = DATA_FMT
    }
  }

  // Cabeçalho da tabela: cor de fundo/texto do tema (o addTable já aplica o estilo nomeado,
  // isso aqui garante a cor certa mesmo em leitores que não resolvem o tema TableStyleMedium2).
  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= 16; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: "Calibri", size: 11, color: { argb: COR_HEADER_TEXTO } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Equiparação Hospitalar - Análise XMLs - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
