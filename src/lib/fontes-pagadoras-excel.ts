import ExcelJS from "exceljs"
import type { DadosFontesPagadoras } from "./fontes-pagadoras-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Mesmo estilo de Excel Table das abas de Comprovante de Pagamentos / DCTF (filtro + zebra +
// linha de SUBTOTAL) — duplicado de propósito, ver docs.
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
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

export interface DeclaracaoFontesPagadorasRegistro {
  competencia: string
  dados: DadosFontesPagadoras
}

// Uma linha por (fonte pagadora × código de retenção), ordenada por ano, razão social da fonte e
// código — próximo da planilha de referência do usuário.
interface LinhaFonte {
  dados: DadosFontesPagadoras
  fonte: DadosFontesPagadoras["fontes"][number]
  codigo: DadosFontesPagadoras["fontes"][number]["codigos"][number]
}

function achatar(declaracoes: DeclaracaoFontesPagadorasRegistro[]): LinhaFonte[] {
  const linhas: LinhaFonte[] = []
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const { dados } of ordenadas) {
    const fontes = [...dados.fontes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    for (const fonte of fontes) {
      const codigos = [...fonte.codigos].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
      for (const codigo of codigos) linhas.push({ dados, fonte, codigo })
    }
  }
  return linhas
}

export async function montarAbaFontesPagadoras(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoFontesPagadorasRegistro[],
  logoBase64: string | null
): Promise<void> {
  const linhas = achatar(declaracoes)

  const ws = wb.addWorksheet("Fontes Pagadoras", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: TAB_COLOR }

  const larguras = [16, 32, 20, 44, 12, 14, 20, 18, 12, 18, 60, 18, 16, 16, 16, 18]
  ws.columns = [{ width: 3 }, ...larguras.map((w) => ({ width: w }))]

  ws.getRow(1).height = 60
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }
  const tituloCell = ws.getCell(3, 2)
  tituloCell.value = "Relatório de Fontes Pagadoras"
  tituloCell.font = { name: "Calibri", bold: true, size: 12 }

  const colunas = [
    "CNPJ Beneficiário", "Razão Social Beneficiário", "CNPJ Fonte Pagadora", "Razão Social Fonte Pagadora",
    "Ano Calendário", "Data DIRF", "Vlr Rendimento Tributável", "Vlr Imposto Retido", "Código Receita",
    "Grupo Tributo", "Descrição Código DARF", "Vlr Rendimento", "Vlr Imposto", "Oportunidade", "Contingência",
    "Valor Contingência",
  ]

  const LINHA_HEADER = 6
  const ultimaColuna = colunas.length + 1

  ws.addTable({
    name: "FontesPagadoras",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((name) => ({ name, filterButton: true })),
    rows:
      linhas.length > 0
        ? linhas.map(({ dados, fonte, codigo }) => [
            dados.cnpjBeneficiario,
            dados.nomeBeneficiario,
            fonte.cnpj,
            fonte.nome,
            dados.anoCalendario,
            fonte.dataDirf,
            fonte.rendimentoTributavel,
            fonte.impostoRetido,
            codigo.codigo,
            codigo.grupoTributo,
            codigo.descricaoDarf,
            codigo.rendimento,
            codigo.imposto,
            "", // Oportunidade — análise automática futura
            "", // Contingência
            "", // Valor Contingência
          ])
        : [colunas.map(() => "")],
  })

  // Linha de SUBTOTAL acima do cabeçalho (respeita filtro) nas colunas monetárias por código
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  const subtotais: { col: number; nome: string; soma: number }[] = [
    { col: 13, nome: "Vlr Rendimento", soma: linhas.reduce((s, l) => s + l.codigo.rendimento, 0) },
    { col: 14, nome: "Vlr Imposto", soma: linhas.reduce((s, l) => s + l.codigo.imposto, 0) },
  ]
  for (const { col, nome, soma } of subtotais) {
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,FontesPagadoras[${nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  // Formatação das linhas de dados: monetário nas colunas de valor, razões sociais/descrição à
  // esquerda, o resto centralizado.
  const COLS_MONEY = [8, 9, 13, 14, 17]
  const COLS_LEFT = [3, 5, 12] // Razão Social Beneficiário, Razão Social Fonte, Descrição DARF
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(linhas.length, 1)
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= ultimaColuna; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: COLS_LEFT.includes(c) ? "left" : "center", vertical: "middle" }
      if (COLS_MONEY.includes(c)) cell.numFmt = BRL
    }
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= ultimaColuna; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}

// Wrapper que carrega a logo (a UI/orquestrador chamam esta).
export async function montarAbasFontesPagadoras(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoFontesPagadorasRegistro[]
): Promise<void> {
  if (declaracoes.length === 0) return
  const logoBase64 = await carregarLogoBase64()
  await montarAbaFontesPagadoras(wb, declaracoes, logoBase64)
}

// Uso standalone (só Fontes Pagadoras) — cria o workbook, monta a aba (+ Checklist) e baixa.
export async function exportarFontesPagadorasExcel(
  declaracoes: DeclaracaoFontesPagadorasRegistro[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbasFontesPagadoras(wb, declaracoes)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - Fontes Pagadoras - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
