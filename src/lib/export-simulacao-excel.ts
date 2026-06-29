import ExcelJS from "exceljs"
import type { ResultadoAno } from "./reforma-engine"

// ── Paleta ────────────────────────────────────────────────────────────────────
const COR = {
  azulTitulo:   "FF1F3864",
  azulSecao:    "FF2E74B5",
  azulHeader:   "FFD6E4F7",
  azulSubtotal: "FFBDD7EE",
  verde:        "FFE2EFDA",
  verdeDelta:   "FF70AD47",
  vermelho:     "FFFCE4D6",
  cinzaFundo:   "FFF5F5F5",
  amarelo:      "FFFFF2CC",
  branco:       "FFFFFFFF",
  preto:        "FF000000",
  cinzaTexto:   "FF595959",
}

const BRL = "#,##0.00"
const BRL_PAR = `#,##0.00;[Red]-#,##0.00;"-"`
const PCT = "0.00%"
const PCT_PAR = `0.00%;[Red]-0.00%;"-"`

// ── Helpers de formatação ─────────────────────────────────────────────────────

function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bg?: string
    bold?: boolean
    italic?: boolean
    color?: string
    size?: number
    align?: "left" | "center" | "right"
    numFmt?: string
    indent?: number
    wrap?: boolean
    borderBottom?: "thin" | "medium" | "hair"
    borderTop?: "thin" | "medium" | "hair"
  },
) {
  if (opts.value !== undefined) cell.value = opts.value
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } }
  cell.font = {
    name: "Calibri",
    bold: opts.bold,
    italic: opts.italic,
    size: opts.size ?? 10,
    color: { argb: opts.color ?? COR.preto },
  }
  cell.alignment = {
    horizontal: opts.align ?? "left",
    vertical: "middle",
    wrapText: opts.wrap,
    indent: opts.indent,
  }
  if (opts.numFmt) cell.numFmt = opts.numFmt
  if (opts.borderBottom || opts.borderTop) {
    cell.border = {
      bottom: opts.borderBottom ? { style: opts.borderBottom, color: { argb: COR.azulSecao } } : undefined,
      top:    opts.borderTop    ? { style: opts.borderTop,    color: { argb: COR.azulSecao } } : undefined,
    }
  }
}

function tituloAba(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  cols: number,
  texto: string,
  sub?: string,
) {
  ws.mergeCells(rowNum, 1, rowNum, cols)
  const cell = ws.getCell(rowNum, 1)
  styleCell(cell, { value: texto, bg: COR.azulTitulo, bold: true, size: 14, color: COR.branco, align: "center" })
  ws.getRow(rowNum).height = 30
  if (sub) {
    ws.mergeCells(rowNum + 1, 1, rowNum + 1, cols)
    const sub_cell = ws.getCell(rowNum + 1, 1)
    styleCell(sub_cell, { value: sub, bg: COR.azulSecao, bold: false, size: 10, color: COR.branco, align: "center", italic: true })
    ws.getRow(rowNum + 1).height = 18
  }
}

function cabecalhoSecao(ws: ExcelJS.Worksheet, rowNum: number, cols: number, texto: string) {
  ws.mergeCells(rowNum, 1, rowNum, cols)
  const cell = ws.getCell(rowNum, 1)
  styleCell(cell, { value: texto, bg: COR.azulSecao, bold: true, size: 11, color: COR.branco, indent: 1 })
  ws.getRow(rowNum).height = 20
}

function cabecalhoColunas(ws: ExcelJS.Worksheet, rowNum: number, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(rowNum, i + 1)
    styleCell(cell, {
      value: h,
      bg: COR.azulHeader,
      bold: true,
      size: 10,
      align: i === 0 ? "left" : "center",
      indent: i === 0 ? 1 : 0,
      borderBottom: "medium",
    })
  })
  ws.getRow(rowNum).height = 18
}

function linhasDados(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  cols: (string | number | null | undefined)[],
  fmts: string[],
  opts?: { bg?: string; bold?: boolean; color?: string; borderTop?: "thin" | "medium" },
) {
  cols.forEach((v, i) => {
    const cell = ws.getCell(rowNum, i + 1)
    styleCell(cell, {
      value: v ?? null,
      bg: opts?.bg,
      bold: opts?.bold,
      size: 10,
      color: opts?.color,
      align: i === 0 ? "left" : "right",
      numFmt: v !== null && v !== undefined && typeof v === "number" ? fmts[i] : undefined,
      indent: i === 0 ? 2 : 0,
      borderTop: i === 0 ? opts?.borderTop : undefined,
    })
  })
  ws.getRow(rowNum).height = 16
}

function linhaVazia(ws: ExcelJS.Worksheet, rowNum: number) {
  ws.getRow(rowNum).height = 8
}

function totalLinha(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  cols: number,
  label: string,
  valor: number,
  pct: number,
  bg: string,
  colorTexto: string,
) {
  // Col A: label
  const cA = ws.getCell(rowNum, 1)
  styleCell(cA, { value: label, bg, bold: true, size: 10, color: colorTexto, indent: 1, borderTop: "medium" })
  // Col B e C: vazio
  for (let c = 2; c <= cols - 2; c++) {
    const cell = ws.getCell(rowNum, c)
    styleCell(cell, { bg, borderTop: "medium" })
  }
  // Col D: valor
  const cD = ws.getCell(rowNum, cols - 1)
  styleCell(cD, { value: valor, bg, bold: true, size: 10, color: colorTexto, align: "right", numFmt: BRL_PAR, borderTop: "medium" })
  // Col E: %
  const cE = ws.getCell(rowNum, cols)
  styleCell(cE, { value: pct, bg, bold: true, size: 10, color: colorTexto, align: "right", numFmt: PCT, borderTop: "medium" })
  ws.getRow(rowNum).height = 18
}

// ── Aba por Ano ───────────────────────────────────────────────────────────────

function criarAbaAno(
  wb: ExcelJS.Workbook,
  r: ResultadoAno,
  temFCBF: boolean,
  empresa: string,
  regime: string,
) {
  const ws = wb.addWorksheet(String(r.ano), { views: [{ showGridLines: false }] })

  // Larguras das colunas
  ws.columns = [
    { key: "tributo", width: 38 },
    { key: "base",    width: 20 },
    { key: "aliq",    width: 14 },
    { key: "valor",   width: 20 },
    { key: "pct",     width: 14 },
  ]

  const NCOLS = 5
  const fat = r.cargaAtualPct > 0 ? r.cargaAtualTotal / r.cargaAtualPct : 0

  let row = 1

  // ── Título ──
  tituloAba(ws, row, NCOLS, `SIMULAÇÃO REFORMA TRIBUTÁRIA — ${r.ano}`, `${empresa.toUpperCase()} · ${regime.toUpperCase()}`)
  row += 3 // título + subtítulo + vazio

  // ── CARGA ATUAL ──
  cabecalhoSecao(ws, row++, NCOLS, "  REGIME ATUAL (BASELINE)")
  cabecalhoColunas(ws, row++, ["Tributo", "Base de Cálculo (R$)", "Alíquota Efetiva", "Valor (R$)", "% Receita Bruta"])

  const atualRows: [string, number, number, number, number][] = [
    ["PIS/COFINS",  fat, fat > 0 ? r.pisCofinsAtual / fat : 0, r.pisCofinsAtual, fat > 0 ? r.pisCofinsAtual / fat : 0],
    ["ICMS",        fat, fat > 0 ? r.icmsAtual / fat : 0,       r.icmsAtual,      fat > 0 ? r.icmsAtual / fat : 0],
    ["IPI",         fat, fat > 0 ? r.ipiAtual / fat : 0,        r.ipiAtual,       fat > 0 ? r.ipiAtual / fat : 0],
  ]
  const bgAtual = [COR.cinzaFundo, COR.branco, COR.cinzaFundo]
  atualRows.forEach(([nome, base, aliq, valor, pct], i) => {
    linhasDados(ws, row++, [nome, base, aliq, valor, pct], ["@", BRL, PCT, BRL_PAR, PCT_PAR], { bg: bgAtual[i] })
  })
  totalLinha(ws, row++, NCOLS, "TOTAL CARGA ATUAL", r.cargaAtualTotal, r.cargaAtualPct, COR.azulTitulo, COR.branco)
  linhaVazia(ws, row++)

  // ── CARGA REFORMA ──
  cabecalhoSecao(ws, row++, NCOLS, "  CARGA COM A REFORMA TRIBUTÁRIA (IBS/CBS)")
  cabecalhoColunas(ws, row++, ["Tributo", "Base de Cálculo (R$)", "Alíquota Efetiva", "Valor (R$)", "% Receita Bruta"])

  const reformaRows: [string, number | null, number | null, number, number][] = [
    ["CBS — Contribuição sobre Bens e Serviços (federal)", fat, fat > 0 ? r.cbs / fat : 0, r.cbs, fat > 0 ? r.cbs / fat : 0],
    ["IBS — Imposto sobre Bens e Serviços (UF estadual)", fat, fat > 0 ? r.ibsUF / fat : 0, r.ibsUF, fat > 0 ? r.ibsUF / fat : 0],
    ["IBS — Imposto sobre Bens e Serviços (Municipal)",   fat, fat > 0 ? r.ibsMUN / fat : 0, r.ibsMUN, fat > 0 ? r.ibsMUN / fat : 0],
  ]
  const bgReforma = [COR.cinzaFundo, COR.branco, COR.cinzaFundo]
  reformaRows.forEach(([nome, base, aliq, valor, pct], i) => {
    linhasDados(ws, row++, [nome, base, aliq, valor, pct], ["@", BRL, PCT, BRL_PAR, PCT_PAR], { bg: bgReforma[i] })
  })

  // Subtotal IBS/CBS
  const cellSub = ws.getCell(row, 1)
  ws.mergeCells(row, 1, row, 1)
  styleCell(cellSub, { value: "  Subtotal IBS/CBS", bg: COR.azulSubtotal, bold: true, size: 10, indent: 1, borderTop: "thin" })
  styleCell(ws.getCell(row, 2), { value: null, bg: COR.azulSubtotal, borderTop: "thin" })
  styleCell(ws.getCell(row, 3), { value: fat > 0 ? r.ibsCbsPct : null, bg: COR.azulSubtotal, bold: true, align: "right", numFmt: PCT, borderTop: "thin" })
  styleCell(ws.getCell(row, 4), { value: r.ibsCbsTotal, bg: COR.azulSubtotal, bold: true, align: "right", numFmt: BRL, borderTop: "thin" })
  styleCell(ws.getCell(row, 5), { value: r.ibsCbsPct, bg: COR.azulSubtotal, bold: true, align: "right", numFmt: PCT, borderTop: "thin" })
  ws.getRow(row).height = 16
  row++

  linhasDados(ws, row++, ["ICMS Residual (fator " + (r.icmsReducaoFator * 100).toFixed(0) + "%)", fat, fat > 0 ? r.icmsReforma / fat : 0, r.icmsReforma, fat > 0 ? r.icmsReforma / fat : 0], ["@", BRL, PCT, BRL_PAR, PCT_PAR], { bg: COR.branco })
  linhasDados(ws, row++, [r.ipiExtinto ? "IPI — EXTINTO (R$ 0)" : "IPI Residual", null, null, r.ipiReforma, fat > 0 ? r.ipiReforma / fat : 0], ["@", "@", "@", BRL_PAR, PCT_PAR], { bg: COR.cinzaFundo })

  // Crédito IBS/CBS (verde)
  linhasDados(ws, row++,
    ["(-) Crédito IBS/CBS nas Entradas" + (r.usouEfd ? "  ★ base EFD" : ""), null, null, -r.creditoCompras, fat > 0 ? -r.creditoCompras / fat : 0],
    ["@", "@", "@", BRL_PAR, PCT_PAR],
    { bg: COR.verde, color: "FF375623" },
  )

  totalLinha(ws, row++, NCOLS, "TOTAL CARGA REFORMA", r.cargaReformaTotal, r.cargaReformaPct, COR.azulSecao, COR.branco)
  linhaVazia(ws, row++)

  // ── FCBF ──
  if (temFCBF) {
    cabecalhoSecao(ws, row++, NCOLS, "  FUNDO DE COMBATE À POBREZA (FCBF)")
    cabecalhoColunas(ws, row++, ["Item", "", "", "Valor (R$)", "% Receita Bruta"])
    linhasDados(ws, row++, ["(-) Economia FCBF (crédito presumido)", null, null, -r.fcbfEconomia, fat > 0 ? -r.fcbfEconomia / fat : 0], ["@", "@", "@", BRL_PAR, PCT_PAR], { bg: COR.verde, color: "FF375623" })
    totalLinha(ws, row++, NCOLS, "CARGA LÍQUIDA COM FCBF", r.cargaLiquidaComFcbf, r.cargaLiquidaPct, COR.azulTitulo, COR.branco)
    linhaVazia(ws, row++)
  }

  // ── VARIAÇÃO ──
  cabecalhoSecao(ws, row++, NCOLS, "  VARIAÇÃO ANUAL (DELTA REFORMA vs. ATUAL)")
  cabecalhoColunas(ws, row++, ["Indicador", "", "", "Valor (R$)", "Variação (%)"])

  const deltaBg = r.delta < 0 ? COR.verde : COR.vermelho
  const deltaColor = r.delta < 0 ? "FF375623" : "FF9C0006"
  const deltaLabel = r.delta < 0
    ? "▼ ECONOMIA com a Reforma"
    : "▲ CUSTO ADICIONAL com a Reforma"

  linhasDados(ws, row++, [deltaLabel, null, null, r.delta, r.deltaPct], ["@", "@", "@", BRL_PAR, PCT_PAR], { bg: deltaBg, bold: true, color: deltaColor })
  linhaVazia(ws, row++)

  // ── METADADOS ──
  cabecalhoSecao(ws, row++, NCOLS, "  PREMISSAS DO PERÍODO")
  cabecalhoColunas(ws, row++, ["Parâmetro", "Valor", "", "", ""])
  const meta = [
    ["Ano do período",                    String(r.ano)],
    ["Fator de redução ICMS",             (r.icmsReducaoFator * 100).toFixed(0) + "%"],
    ["IPI extinto neste período",         r.ipiExtinto ? "Sim" : "Não"],
    ["Base de crédito EFD utilizada",     r.usouEfd ? "Sim (VL_OPR real)" : "Não (estimativa)"],
    ["Faturamento estimado (R$)",         fat.toFixed(2)],
  ]
  meta.forEach(([k, v], i) => {
    linhasDados(ws, row++, [k, v, "", "", ""], ["@", "@", "@", "@", "@"], { bg: i % 2 === 0 ? COR.cinzaFundo : COR.branco })
  })
}

// ── Aba Resumo Comparativo ────────────────────────────────────────────────────

function criarAbaResumo(
  wb: ExcelJS.Workbook,
  resultados: ResultadoAno[],
  temFCBF: boolean,
  empresa: string,
  regime: string,
) {
  const ws = wb.addWorksheet("Resumo Comparativo", { views: [{ showGridLines: false }] })
  const anos = resultados.map((r) => r.ano)
  const NCOLS = 1 + anos.length

  // Larguras
  ws.columns = [
    { key: "label", width: 40 },
    ...anos.map(() => ({ width: 20 })),
  ]

  let row = 1

  // Título
  tituloAba(ws, row, NCOLS, "TOTAL DOS TRIBUTOS INDIRETOS — REFORMA TRIBUTÁRIA", `${empresa.toUpperCase()} · ${regime.toUpperCase()} · EC 132/2023 + LC 214/2025`)
  row += 3

  // Cabeçalho de anos
  const hRow = ws.getRow(row)
  hRow.height = 20
  styleCell(ws.getCell(row, 1), { value: "TRIBUTO / INDICADOR", bg: COR.azulTitulo, bold: true, size: 10, color: COR.branco, align: "center", indent: 1 })
  anos.forEach((ano, i) => {
    styleCell(ws.getCell(row, 2 + i), { value: ano, bg: COR.azulTitulo, bold: true, size: 11, color: COR.branco, align: "center", numFmt: "0" })
  })
  row++

  const numRow = (label: string, vals: (number|null)[], bg: string, bold = false, numFmt = BRL_PAR, color?: string) => {
    ws.getRow(row).height = 16
    styleCell(ws.getCell(row, 1), { value: label, bg, bold, size: 10, color: color ?? COR.preto, indent: 2 })
    vals.forEach((v, i) => {
      styleCell(ws.getCell(row, 2 + i), { value: v, bg, bold, align: "right", numFmt: typeof v === "number" ? numFmt : undefined, size: 10, color })
    })
    row++
  }

  const totalRow = (label: string, vals: number[], bg: string, numFmt = BRL_PAR) => {
    ws.getRow(row).height = 18
    styleCell(ws.getCell(row, 1), { value: label, bg, bold: true, size: 10, color: COR.branco, indent: 1, borderTop: "medium" })
    vals.forEach((v, i) => {
      styleCell(ws.getCell(row, 2 + i), { value: v, bg, bold: true, align: "right", numFmt, size: 10, color: COR.branco, borderTop: "medium" })
    })
    row++
  }

  const secRow = (label: string) => {
    cabecalhoSecao(ws, row++, NCOLS, "  " + label)
  }

  const vazRow = () => { linhaVazia(ws, row++) }
  const hdrRow = (hdrs: string[]) => { cabecalhoColunas(ws, row++, hdrs) }

  // ── REGIME ATUAL ──
  secRow("REGIME ATUAL (BASELINE)")
  hdrRow(["Tributo", ...anos.map(() => "Valor (R$)")])
  numRow("PIS/COFINS",    resultados.map((r) => r.pisCofinsAtual), COR.cinzaFundo)
  numRow("ICMS",          resultados.map((r) => r.icmsAtual),      COR.branco)
  numRow("IPI",           resultados.map((r) => r.ipiAtual),       COR.cinzaFundo)
  totalRow("TOTAL CARGA ATUAL (R$)", resultados.map((r) => r.cargaAtualTotal), COR.azulTitulo)
  numRow("% Receita Bruta",      resultados.map((r) => r.cargaAtualPct),   COR.azulHeader, true, PCT)
  vazRow()

  // ── REFORMA ──
  secRow("REFORMA TRIBUTÁRIA (IBS/CBS)")
  hdrRow(["Tributo", ...anos.map(() => "Valor (R$)")])
  numRow("CBS — federal",                   resultados.map((r) => r.cbs),            COR.cinzaFundo)
  numRow("IBS — UF estadual",               resultados.map((r) => r.ibsUF),          COR.branco)
  numRow("IBS — Municipal",                 resultados.map((r) => r.ibsMUN),         COR.cinzaFundo)
  numRow("ICMS Residual",                   resultados.map((r) => r.icmsReforma),    COR.branco)
  numRow("IPI Residual",                    resultados.map((r) => r.ipiReforma),     COR.cinzaFundo)
  numRow("(-) Crédito IBS/CBS Entradas",    resultados.map((r) => -r.creditoCompras), COR.verde, false, BRL_PAR, "FF375623")
  totalRow("TOTAL CARGA REFORMA (R$)", resultados.map((r) => r.cargaReformaTotal), COR.azulSecao)
  numRow("% Receita Bruta",      resultados.map((r) => r.cargaReformaPct),   COR.azulHeader, true, PCT)
  vazRow()

  // ── FCBF ──
  if (temFCBF) {
    secRow("FUNDO DE COMBATE À POBREZA (FCBF)")
    hdrRow(["Item", ...anos.map(() => "Valor (R$)")])
    numRow("(-) Economia FCBF",           resultados.map((r) => -r.fcbfEconomia),         COR.verde, false, BRL_PAR, "FF375623")
    numRow("Carga Líquida com FCBF (R$)", resultados.map((r) => r.cargaLiquidaComFcbf),   COR.cinzaFundo)
    numRow("% Receita Bruta c/ FCBF",     resultados.map((r) => r.cargaLiquidaPct),       COR.branco, false, PCT)
    vazRow()
  }

  // ── VARIAÇÃO ──
  secRow("VARIAÇÃO ANUAL (DELTA REFORMA vs. ATUAL)")
  hdrRow(["Indicador", ...anos.map(() => "Valor")])
  numRow("Delta Anual (R$)",    resultados.map((r) => r.delta),    COR.branco, false, BRL_PAR)
  numRow("Delta Anual (%)",     resultados.map((r) => r.deltaPct), COR.cinzaFundo, false, PCT_PAR)

  // Delta acumulado progressivo
  let acum = 0
  const acumVals = resultados.map((r) => { acum += r.delta; return acum })
  numRow("Delta Acumulado (R$)", acumVals, COR.amarelo, true, BRL_PAR)
  vazRow()

  // ── IMPACTO ──
  secRow("IMPACTO DA CARGA TRIBUTÁRIA (Reforma / Atual − 1)")
  hdrRow(["Indicador", ...anos.map(() => "Variação %")])
  numRow("Impacto % (Reforma vs. Atual)",
    resultados.map((r) => r.cargaAtualTotal > 0 ? r.cargaReformaTotal / r.cargaAtualTotal - 1 : null),
    COR.branco, false, PCT_PAR,
  )
  vazRow()

  // ── NOTA ──
  const totalDelta = resultados.reduce((s, r) => s + r.delta, 0)
  ws.mergeCells(row, 1, row, NCOLS)
  const nota = ws.getCell(row, 1)
  styleCell(nota, {
    value: totalDelta < 0
      ? `★  RESULTADO: ECONOMIA TOTAL de R$ ${Math.abs(totalDelta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no período 2026–2033`
      : `★  RESULTADO: CUSTO ADICIONAL de R$ ${totalDelta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no período 2026–2033`,
    bg: totalDelta < 0 ? COR.verde : COR.vermelho,
    bold: true,
    size: 11,
    color: totalDelta < 0 ? "FF375623" : "FF9C0006",
    align: "center",
  })
  ws.getRow(row).height = 22
  row++

  vazRow()
  ws.mergeCells(row, 1, row, NCOLS)
  styleCell(ws.getCell(row, 1), {
    value: "* Créditos IBS/CBS calculados sobre o valor total das entradas (VL_OPR). Análise conforme EC 132/2023 e LC 214/2025.",
    bg: COR.amarelo, italic: true, size: 9, color: COR.cinzaTexto, align: "left", indent: 1,
  })
  ws.getRow(row).height = 14
}

// ── Export principal ──────────────────────────────────────────────────────────

export async function exportarSimulacaoExcel(
  resultados: ResultadoAno[],
  temFCBF: boolean,
  nomeEmpresa = "Empresa",
  regime = "Regime Regular",
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Reforma Tributária"
  wb.created = new Date()

  // Aba resumo primeiro (aparece à esquerda)
  criarAbaResumo(wb, resultados, temFCBF, nomeEmpresa, regime)

  // Uma aba por ano
  for (const r of resultados) {
    criarAbaAno(wb, r, temFCBF, nomeEmpresa, regime)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `simulacao_${nomeEmpresa.replace(/[^a-zA-Z0-9]/g, "_")}_reforma.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
