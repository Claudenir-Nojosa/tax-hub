import ExcelJS from "exceljs"
import type { ResultadoConsultaCnpj } from "./consulta-simples-nacional"

// Mesmo padrão visual do equiparacao-hospitalar-excel.ts (Excel Table nativa, cabeçalho navy,
// zebra) — duplicado de propósito, ver docs de estilo do módulo de Automações.
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function dataBRparaDate(v: string | null): Date | null {
  if (!v) return null
  // BrasilAPI manda "YYYY-MM-DD"; ReceitaWS manda "DD/MM/YYYY" — aceita os dois
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  return null
}

export async function exportarConsultaSimplesNacionalExcel(resultados: ResultadoConsultaCnpj[]): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Automações"
  wb.created = new Date()
  const ws = wb.addWorksheet("Consulta Simples Nacional", { views: [{ showGridLines: false }] })

  ws.columns = [
    { width: 3 }, // A — margem
    { width: 20 }, // B CNPJ
    { width: 42 }, // C Razão Social
    { width: 28 }, // D Nome Fantasia
    { width: 16 }, // E Simples Nacional
    { width: 16 }, // F Data Opção
    { width: 16 }, // G Data Exclusão
    { width: 10 }, // H MEI
    { width: 22 }, // I Situação Cadastral
    { width: 8 }, // J UF
    { width: 22 }, // K Município
    { width: 22 }, // L Porte
    { width: 30 }, // M Observação/Erro
  ]

  const subtituloCell = ws.getCell(3, 2)
  subtituloCell.value = `Consulta Simples Nacional — ${new Date().toLocaleDateString("pt-BR")}`
  subtituloCell.font = { name: "Calibri", bold: true, size: 12 }

  const LINHA_HEADER = 5
  const colunas = [
    "CNPJ", "Razão Social", "Nome Fantasia", "Simples Nacional", "Data Opção", "Data Exclusão",
    "MEI", "Situação Cadastral", "UF", "Município", "Porte", "Observação",
  ]

  ws.addTable({
    name: "ConsultaSimplesNacional",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((name) => ({ name, filterButton: true })),
    rows: resultados.map((r) => [
      r.cnpjFormatado,
      r.razaoSocial ?? "",
      r.nomeFantasia ?? "",
      r.erro ? "" : r.simplesNacional === true ? "Sim" : r.simplesNacional === false ? "Não" : "",
      dataBRparaDate(r.dataOpcaoSimples),
      dataBRparaDate(r.dataExclusaoSimples),
      r.mei === true ? "Sim" : r.mei === false ? "Não" : "",
      r.situacaoCadastral ?? "",
      r.uf ?? "",
      r.municipio ?? "",
      r.porte ?? "",
      r.erro ?? "",
    ]),
  })

  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + resultados.length
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= 13; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 11 }
      cell.alignment = { horizontal: c === 3 || c === 4 || c === 13 ? "left" : "center", vertical: "middle" }
      if (c === 6 || c === 7) cell.numFmt = "dd/mm/yyyy"
    }
    // destaca a linha conforme o resultado — verde claro (optante), vermelho claro
    // (não optante) ou âmbar claro (não deu pra consultar)
    const resultado = resultados[r - primeiraLinhaDados]
    const bg = resultado.erro
      ? "FFFFF2CC"
      : resultado.simplesNacional === true
      ? "FFE2EFDA"
      : resultado.simplesNacional === false
      ? "FFFCE4E4"
      : undefined
    if (bg) {
      for (let c = 2; c <= 13; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
      }
    }
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= 13; c++) {
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
  a.download = `${sanitizarNomeArquivo(`Consulta Simples Nacional - ${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
