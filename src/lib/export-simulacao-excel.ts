import ExcelJS from "exceljs"
import type { ResultadoAno } from "./reforma-engine"
import { PREMISSAS_PADRAO } from "./reforma-engine"
import type { DadosReaisXml, ItemNFe } from "./nfe-parser"
import type { DadosEfd, RegistroC190 } from "./efd-parser"

// ── Paleta ────────────────────────────────────────────────────────────────────
const COR = {
  azulTitulo:   "FF1F3864",
  azulSecao:    "FF2E74B5",
  azulHeader:   "FFD6E4F7",
  azulSubtotal: "FFBDD7EE",
  verde:        "FFE2EFDA",
  vermelho:     "FFFCE4D6",
  cinzaFundo:   "FFF5F5F5",
  amarelo:      "FFFFF2CC",
  branco:       "FFFFFFFF",
  preto:        "FF000000",
  cinzaTexto:   "FF595959",
}

const BRL  = "#,##0.00"
const BRLP = `#,##0.00;[Red]-#,##0.00;"-"`
const PCT  = "0.00%"
const PCTP = `0.00%;[Red]-0.00%;"-"`
const ALQ  = "0.00%"

// ── Helper central de estilo ──────────────────────────────────────────────────

function sc(
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
    bt?: "thin" | "medium" | "hair"  // border-top
    bb?: "thin" | "medium" | "hair"  // border-bottom
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
  cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle", wrapText: opts.wrap, indent: opts.indent }
  if (opts.numFmt) cell.numFmt = opts.numFmt
  if (opts.bt || opts.bb) {
    cell.border = {
      top:    opts.bt ? { style: opts.bt, color: { argb: COR.azulSecao } } : undefined,
      bottom: opts.bb ? { style: opts.bb, color: { argb: COR.azulSecao } } : undefined,
    }
  }
}

// ── Blocos reutilizáveis ──────────────────────────────────────────────────────

function titulo(ws: ExcelJS.Worksheet, r: number, cols: number, txt: string, sub?: string) {
  ws.mergeCells(r, 1, r, cols)
  sc(ws.getCell(r, 1), { value: txt, bg: COR.azulTitulo, bold: true, size: 14, color: COR.branco, align: "center" })
  ws.getRow(r).height = 30
  if (sub) {
    ws.mergeCells(r + 1, 1, r + 1, cols)
    sc(ws.getCell(r + 1, 1), { value: sub, bg: COR.azulSecao, size: 10, color: COR.branco, align: "center", italic: true })
    ws.getRow(r + 1).height = 18
  }
}

function secao(ws: ExcelJS.Worksheet, r: number, cols: number, txt: string) {
  ws.mergeCells(r, 1, r, cols)
  sc(ws.getCell(r, 1), { value: txt, bg: COR.azulSecao, bold: true, size: 11, color: COR.branco, indent: 1 })
  ws.getRow(r).height = 20
}

function headers(ws: ExcelJS.Worksheet, r: number, hdrs: string[]) {
  hdrs.forEach((h, i) => {
    sc(ws.getCell(r, i + 1), {
      value: h, bg: COR.azulHeader, bold: true, size: 9,
      align: i === 0 ? "left" : "center", indent: i === 0 ? 1 : 0, bb: "medium", wrap: true,
    })
  })
  ws.getRow(r).height = 32
}

function vazio(ws: ExcelJS.Worksheet, r: number) { ws.getRow(r).height = 8 }

function linhaDados(
  ws: ExcelJS.Worksheet, r: number,
  vals: (ExcelJS.CellValue)[],
  fmts: string[],
  opts?: { bg?: string; bold?: boolean; color?: string; bt?: "thin" | "medium" },
) {
  vals.forEach((v, i) => {
    sc(ws.getCell(r, i + 1), {
      value: v ?? null, bg: opts?.bg, bold: opts?.bold, size: 9, color: opts?.color,
      align: i === 0 ? "left" : "right",
      numFmt: typeof v === "number" ? fmts[i] : undefined,
      indent: i === 0 ? 1 : 0, bt: i === 0 ? opts?.bt : undefined,
    })
  })
  ws.getRow(r).height = 15
}

function linhaTotal(
  ws: ExcelJS.Worksheet, r: number, ncols: number,
  label: string, vals: (number | null)[], fmts: string[],
  bg: string, cor: string,
) {
  sc(ws.getCell(r, 1), { value: label, bg, bold: true, size: 10, color: cor, indent: 1, bt: "medium" })
  for (let c = 2; c <= ncols - vals.length; c++) {
    sc(ws.getCell(r, c), { bg, bt: "medium" })
  }
  vals.forEach((v, i) => {
    sc(ws.getCell(r, ncols - vals.length + 1 + i), {
      value: v, bg, bold: true, size: 10, color: cor, align: "right",
      numFmt: typeof v === "number" ? fmts[i] : undefined, bt: "medium",
    })
  })
  ws.getRow(r).height = 18
}

// ── Aba de ano: versão XML granular ───────────────────────────────────────────
// Colunas: NF | Data | Item | Produto | CFOP | CST | Alíq ICMS |
//          vProd | BC ICMS | ICMS | PIS | COFINS | IPI | Base IBS/CBS |
//          CBS | IBS UF | IBS MUN | IBS/CBS Total | ICMS Reforma | IPI Reforma |
//          Carga Atual | Carga Reforma | Delta

function criarAbaAnoXml(
  wb: ExcelJS.Workbook,
  r: ResultadoAno,
  empresa: string,
  regime: string,
  xml: DadosReaisXml,
) {
  const NCOLS = 23
  const ws = wb.addWorksheet(String(r.ano), { views: [{ showGridLines: false }] })
  ws.columns = [
    { key: "nf",      width: 12 },  // A NF
    { key: "data",    width: 10 },  // B Data
    { key: "item",    width: 6  },  // C Item
    { key: "prod",    width: 28 },  // D Produto
    { key: "cfop",    width: 7  },  // E CFOP
    { key: "cst",     width: 6  },  // F CST
    { key: "aliqICMS",width: 8  },  // G Alíq ICMS
    { key: "vProd",   width: 14 },  // H vProd
    { key: "bcICMS",  width: 14 },  // I BC ICMS
    { key: "icms",    width: 12 },  // J ICMS
    { key: "pis",     width: 10 },  // K PIS
    { key: "cof",     width: 10 },  // L COFINS
    { key: "ipi",     width: 10 },  // M IPI
    { key: "baseIBS", width: 14 },  // N Base IBS/CBS
    { key: "cbs",     width: 12 },  // O CBS
    { key: "ibsuf",   width: 12 },  // P IBS UF
    { key: "ibsmun",  width: 12 },  // Q IBS MUN
    { key: "ibstot",  width: 12 },  // R IBS/CBS Total
    { key: "icmsRf",  width: 12 },  // S ICMS Reforma
    { key: "ipiRf",   width: 10 },  // T IPI Reforma
    { key: "cAtual",  width: 14 },  // U Carga Atual
    { key: "cReform", width: 14 },  // V Carga Reforma
    { key: "delta",   width: 14 },  // W Delta
  ]

  const p = PREMISSAS_PADRAO[r.ano]
  const fat = xml.fatorAnualizacao  // = 12 / mesesImportados

  let row = 1
  titulo(ws, row, NCOLS,
    `ANÁLISE TRIBUTÁRIA — ${r.ano} — DADOS POR ITEM DE NF-e`,
    `${empresa.toUpperCase()} · ${regime.toUpperCase()} · Projeção anual (fator ${fat.toFixed(2)}x — base: ${xml.mesesImportados} mês${xml.mesesImportados > 1 ? "es" : ""})`,
  )
  row += 3

  secao(ws, row++, NCOLS, "  SAÍDAS — COMPOSIÇÃO POR ITEM DE NF-e  (valores anualizados)")
  headers(ws, row++, [
    "NF", "Data", "Item", "Produto",
    "CFOP", "CST", "Alíq ICMS",
    "vProd (R$)", "BC ICMS (R$)", "ICMS (R$)", "PIS (R$)", "COFINS (R$)", "IPI (R$)",
    "Base IBS/CBS (R$)",
    "CBS (R$)", "IBS UF (R$)", "IBS MUN (R$)", "IBS/CBS Total (R$)",
    "ICMS Reforma (R$)", "IPI Reforma (R$)",
    "Carga Atual (R$)", "Carga Reforma (R$)", "Delta (R$)",
  ])

  // Totais para conferência
  let totVProd = 0, totICMS = 0, totPIS = 0, totCOF = 0, totIPI = 0
  let totBase = 0, totCBS = 0, totIBSUF = 0, totIBSMUN = 0
  let totICMSRf = 0, totIPIRf = 0, totCAtual = 0, totCReforma = 0, totDelta = 0

  xml.itens.forEach((it: ItemNFe, idx: number) => {
    const f = fat
    const vProd    = it.vProd    * f
    const bcICMS   = it.vBCICMS  * f
    const icmsA    = it.vICMS    * f
    const pisA     = it.vPIS     * f
    const cofA     = it.vCOFINS  * f
    const ipiA     = it.vIPI     * f
    const baseIBS  = it.baseIbsCbs * f

    const cbs      = baseIBS * p.cbs
    const ibsUF    = baseIBS * p.ibsUF
    const ibsMUN   = baseIBS * p.ibsMUN
    const ibsTot   = cbs + ibsUF + ibsMUN
    const icmsRf   = icmsA * p.icmsReducao
    const ipiRf    = p.ipiAtivo ? ipiA : 0

    const cAtual   = icmsA + pisA + cofA + ipiA
    const cReforma = ibsTot + icmsRf + ipiRf
    const delta    = cReforma - cAtual

    totVProd += vProd; totICMS += icmsA; totPIS += pisA; totCOF += cofA; totIPI += ipiA
    totBase  += baseIBS; totCBS += cbs; totIBSUF += ibsUF; totIBSMUN += ibsMUN
    totICMSRf += icmsRf; totIPIRf += ipiRf; totCAtual += cAtual
    totCReforma += cReforma; totDelta += delta

    const bg = idx % 2 === 0 ? COR.cinzaFundo : COR.branco
    const deltaBg = delta < 0 ? COR.verde : (delta > 0 ? COR.vermelho : bg)
    linhaDados(ws, row, [
      it.nNF, it.dhEmi, it.nItem, it.xProd,
      it.cfop, it.cstICMS, it.pICMS / 100,
      vProd, bcICMS, icmsA, pisA, cofA, ipiA,
      baseIBS, cbs, ibsUF, ibsMUN, ibsTot,
      icmsRf, ipiRf,
      cAtual, cReforma, delta,
    ], [
      "@", "@", "0", "@",
      "@", "@", ALQ,
      BRL, BRL, BRL, BRL, BRL, BRL,
      BRL, BRL, BRL, BRL, BRL,
      BRL, BRL,
      BRL, BRL, BRLP,
    ], { bg: delta === 0 ? bg : deltaBg })
    row++
  })

  // Linha total saídas
  linhaTotal(ws, row++, NCOLS, "TOTAL SAÍDAS", [
    totVProd, totICMS, totPIS, totCOF, totIPI,
    totBase, totCBS, totIBSUF, totIBSMUN, totCBS + totIBSUF + totIBSMUN,
    totICMSRf, totIPIRf, totCAtual, totCReforma, totDelta,
  ], [BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRLP],
  COR.azulTitulo, COR.branco)
  vazio(ws, row++)

  // ── Crédito nas entradas (agregado do ResultadoAno — entradas não vêm do XML de saídas) ──
  secao(ws, row++, NCOLS, "  CRÉDITO IBS/CBS NAS ENTRADAS (base consolidada do período)")
  headers(ws, row++, ["Descrição", ...Array(NCOLS - 2).fill(""), "Crédito (R$)"])
  linhaDados(ws, row++,
    ["(-) Crédito IBS/CBS sobre compras" + (r.usouEfd ? "  ★ base EFD (VL_OPR)" : " (estimativa)"),
     ...Array(NCOLS - 2).fill(null), -r.creditoCompras],
    ["@", ...Array(NCOLS - 2).fill("@"), BRLP],
    { bg: COR.verde, color: "FF375623" },
  )
  vazio(ws, row++)

  // ── Resumo do ano ──
  secao(ws, row++, NCOLS, "  POSIÇÃO LÍQUIDA DO ANO")
  headers(ws, row++, ["Indicador", ...Array(NCOLS - 3).fill(""), "Valor (R$)", "% Receita"])
  const fat2 = r.cargaAtualPct > 0 ? r.cargaAtualTotal / r.cargaAtualPct : 0
  const resumo: [string, number, number][] = [
    ["Carga Total Atual (baseline)",         r.cargaAtualTotal,   r.cargaAtualPct],
    ["IBS/CBS + ICMS Reforma (bruto)",        r.cargaReformaTotal + r.creditoCompras, (r.cargaReformaTotal + r.creditoCompras) / (fat2 || 1)],
    ["(-) Crédito IBS/CBS Entradas",          -r.creditoCompras,   fat2 > 0 ? -r.creditoCompras / fat2 : 0],
    ["Carga Total Reforma (líquida)",         r.cargaReformaTotal, r.cargaReformaPct],
  ]
  resumo.forEach(([lbl, val, pct], i) => {
    const bg = lbl.startsWith("(-)") ? COR.verde : (i % 2 === 0 ? COR.cinzaFundo : COR.branco)
    linhaDados(ws, row++,
      [lbl, ...Array(NCOLS - 3).fill(null), val, pct],
      ["@", ...Array(NCOLS - 3).fill("@"), BRLP, PCT],
      { bg, color: lbl.startsWith("(-)") ? "FF375623" : undefined },
    )
  })
  const deltaBg  = r.delta < 0 ? COR.verde : COR.vermelho
  const deltaCor = r.delta < 0 ? "FF375623" : "FF9C0006"
  linhaTotal(ws, row++, NCOLS,
    r.delta < 0 ? "▼ ECONOMIA com a Reforma" : "▲ CUSTO ADICIONAL com a Reforma",
    [r.delta, r.deltaPct], [BRLP, PCT],
    deltaBg, deltaCor,
  )

  if (temFCBFFromResultado(r)) {
    vazio(ws, row++)
    linhaDados(ws, row++,
      ["(-) Economia FCBF", ...Array(NCOLS - 3).fill(null), -r.fcbfEconomia, r.cargaAtualPct > 0 ? -r.fcbfEconomia / fat2 : 0],
      ["@", ...Array(NCOLS - 3).fill("@"), BRLP, PCT],
      { bg: COR.verde, color: "FF375623" },
    )
    linhaTotal(ws, row++, NCOLS, "Carga Líquida com FCBF",
      [r.cargaLiquidaComFcbf, r.cargaLiquidaPct], [BRLP, PCT],
      COR.azulTitulo, COR.branco,
    )
  }
}

// ── Aba de ano: versão EFD C190 granular ──────────────────────────────────────
// Colunas: CFOP | CST | Alíq ICMS | VL_OPR | BC ICMS | VL ICMS |
//          Base IBS/CBS | CBS | IBS UF | IBS MUN | IBS/CBS Total |
//          ICMS Reforma | Carga Atual ICMS | Carga Reforma | Delta

function criarAbaAnoEfd(
  wb: ExcelJS.Workbook,
  r: ResultadoAno,
  empresa: string,
  regime: string,
  efd: DadosEfd,
) {
  const NCOLS = 15
  const ws = wb.addWorksheet(String(r.ano), { views: [{ showGridLines: false }] })
  ws.columns = [
    { key: "cfop",    width: 8  },  // A CFOP
    { key: "cst",     width: 6  },  // B CST
    { key: "aliq",    width: 9  },  // C Alíq ICMS
    { key: "vlopr",   width: 16 },  // D VL_OPR
    { key: "bcicms",  width: 14 },  // E BC ICMS
    { key: "vlicms",  width: 14 },  // F VL ICMS
    { key: "baseIBS", width: 16 },  // G Base IBS/CBS
    { key: "cbs",     width: 13 },  // H CBS
    { key: "ibsuf",   width: 13 },  // I IBS UF
    { key: "ibsmun",  width: 13 },  // J IBS MUN
    { key: "ibstot",  width: 13 },  // K IBS/CBS Total
    { key: "icmsrf",  width: 13 },  // L ICMS Reforma
    { key: "cAtual",  width: 14 },  // M Carga Atual (ICMS)
    { key: "cReform", width: 14 },  // N Carga Reforma
    { key: "delta",   width: 14 },  // O Delta
  ]

  const p   = PREMISSAS_PADRAO[r.ano]
  const fat = efd.mesesImportados > 0 ? 12 / efd.mesesImportados : 1

  let row = 1
  titulo(ws, row, NCOLS,
    `ANÁLISE TRIBUTÁRIA — ${r.ano} — DADOS EFD C190 POR CFOP/CST`,
    `${empresa.toUpperCase()} · ${regime.toUpperCase()} · Projeção anual (fator ${fat.toFixed(2)}x — base: ${efd.mesesImportados} mês${efd.mesesImportados > 1 ? "es" : ""})`,
  )
  row += 3

  // ── SAÍDAS ──
  secao(ws, row++, NCOLS, "  SAÍDAS — REGISTROS C190 (valores anualizados)")
  headers(ws, row++, [
    "CFOP", "CST", "Alíq ICMS",
    "VL_OPR (R$)", "BC ICMS (R$)", "VL ICMS (R$)",
    "Base IBS/CBS (R$)",
    "CBS (R$)", "IBS UF (R$)", "IBS MUN (R$)", "IBS/CBS Total (R$)",
    "ICMS Reforma (R$)",
    "Carga Atual ICMS (R$)", "Carga Reforma (R$)", "Delta (R$)",
  ])

  let sVlOpr = 0, sBcICMS = 0, sVlICMS = 0
  let sCBS = 0, sIBSUF = 0, sIBSMUN = 0, sICMSRf = 0
  let sCAtual = 0, sCReforma = 0, sDelta = 0

  efd.c190Saidas.forEach((reg: RegistroC190, idx: number) => {
    const vlOpr   = reg.vlOpr   * fat
    const bcICMS  = reg.vlBCICMS * fat
    const vlICMS  = reg.vlICMS  * fat
    const baseIBS = vlOpr  // VL_OPR = base IBS/CBS (valor total da operação)

    const cbs    = baseIBS * p.cbs
    const ibsUF  = baseIBS * p.ibsUF
    const ibsMUN = baseIBS * p.ibsMUN
    const ibsTot = cbs + ibsUF + ibsMUN
    const icmsRf = vlICMS  * p.icmsReducao

    const cAtual  = vlICMS
    const cReform = ibsTot + icmsRf
    const delta   = cReform - cAtual

    sVlOpr += vlOpr; sBcICMS += bcICMS; sVlICMS += vlICMS
    sCBS += cbs; sIBSUF += ibsUF; sIBSMUN += ibsMUN; sICMSRf += icmsRf
    sCAtual += cAtual; sCReforma += cReform; sDelta += delta

    const bg     = idx % 2 === 0 ? COR.cinzaFundo : COR.branco
    const deltaBg = delta < 0 ? COR.verde : (delta > 0 ? COR.vermelho : bg)
    linhaDados(ws, row++,
      [reg.cfop, reg.cst, reg.aliqICMS / 100, vlOpr, bcICMS, vlICMS, baseIBS, cbs, ibsUF, ibsMUN, ibsTot, icmsRf, cAtual, cReform, delta],
      ["@", "@", ALQ, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRLP],
      { bg: delta === 0 ? bg : deltaBg },
    )
  })

  linhaTotal(ws, row++, NCOLS, "TOTAL SAÍDAS",
    [sVlOpr, sBcICMS, sVlICMS, sVlOpr, sCBS, sIBSUF, sIBSMUN, sCBS + sIBSUF + sIBSMUN, sICMSRf, sCAtual, sCReforma, sDelta],
    [BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRLP],
    COR.azulTitulo, COR.branco,
  )
  vazio(ws, row++)

  // ── ENTRADAS (crédito) ──
  secao(ws, row++, NCOLS, "  ENTRADAS — CRÉDITO IBS/CBS (Registros C190 — valores anualizados)")
  headers(ws, row++, [
    "CFOP", "CST", "Alíq ICMS",
    "VL_OPR (R$)", "BC ICMS (R$)", "VL ICMS (R$)",
    "Base Crédito (R$)",
    "CBS (R$)", "IBS UF (R$)", "IBS MUN (R$)", "IBS/CBS Total (R$)",
    "ICMS Crédito (R$)",
    "Crédito IBS/CBS (R$)", "", "",
  ])

  let eVlOpr = 0, eBcICMS = 0, eVlICMS = 0, eCredIBS = 0

  efd.c190Entradas.forEach((reg: RegistroC190, idx: number) => {
    const vlOpr  = reg.vlOpr   * fat
    const bcICMS = reg.vlBCICMS * fat
    const vlICMS = reg.vlICMS  * fat
    const baseC  = vlOpr

    const cbs    = baseC * p.cbs
    const ibsUF  = baseC * p.ibsUF
    const ibsMUN = baseC * p.ibsMUN
    const ibsTot = cbs + ibsUF + ibsMUN

    eVlOpr += vlOpr; eBcICMS += bcICMS; eVlICMS += vlICMS; eCredIBS += ibsTot

    linhaDados(ws, row++,
      [reg.cfop, reg.cst, reg.aliqICMS / 100, vlOpr, bcICMS, vlICMS, baseC, cbs, ibsUF, ibsMUN, ibsTot, vlICMS, ibsTot, null, null],
      ["@", "@", ALQ, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, BRL, "@", "@"],
      { bg: idx % 2 === 0 ? COR.verde : "FFD9EAD3" },
    )
  })

  linhaTotal(ws, row++, NCOLS, "TOTAL ENTRADAS (crédito)",
    [eVlOpr, eBcICMS, eVlICMS, eVlOpr, null, null, null, null, eCredIBS, null, null, null],
    [BRL, BRL, BRL, BRL, "@", "@", "@", "@", BRLP, "@", "@", "@"],
    COR.azulSecao, COR.branco,
  )
  vazio(ws, row++)

  // ── Posição líquida ──
  secao(ws, row++, NCOLS, "  POSIÇÃO LÍQUIDA DO ANO")
  headers(ws, row++, ["Indicador", ...Array(NCOLS - 3).fill(""), "Valor (R$)", "% Receita"])
  const fat2 = r.cargaAtualPct > 0 ? r.cargaAtualTotal / r.cargaAtualPct : 0
  const resumo: [string, number, number][] = [
    ["Carga Total Atual — PIS/COFINS + ICMS + IPI (baseline)", r.cargaAtualTotal, r.cargaAtualPct],
    ["IBS/CBS + ICMS Reforma (bruto)",                         r.cargaReformaTotal + r.creditoCompras, fat2 > 0 ? (r.cargaReformaTotal + r.creditoCompras) / fat2 : 0],
    ["(-) Crédito IBS/CBS Entradas" + (r.usouEfd ? "  ★ EFD" : ""), -r.creditoCompras, fat2 > 0 ? -r.creditoCompras / fat2 : 0],
    ["Carga Total Reforma (líquida)",                          r.cargaReformaTotal, r.cargaReformaPct],
  ]
  resumo.forEach(([lbl, val, pct], i) => {
    const bg  = lbl.startsWith("(-)") ? COR.verde : (i % 2 === 0 ? COR.cinzaFundo : COR.branco)
    const cor = lbl.startsWith("(-)") ? "FF375623" : undefined
    linhaDados(ws, row++,
      [lbl, ...Array(NCOLS - 3).fill(null), val, pct],
      ["@", ...Array(NCOLS - 3).fill("@"), BRLP, PCT],
      { bg, color: cor },
    )
  })
  const dBg  = r.delta < 0 ? COR.verde : COR.vermelho
  const dCor = r.delta < 0 ? "FF375623" : "FF9C0006"
  linhaTotal(ws, row++, NCOLS,
    r.delta < 0 ? "▼ ECONOMIA com a Reforma" : "▲ CUSTO ADICIONAL com a Reforma",
    [r.delta, r.deltaPct], [BRLP, PCT],
    dBg, dCor,
  )

  if (temFCBFFromResultado(r)) {
    vazio(ws, row++)
    linhaDados(ws, row++,
      ["(-) Economia FCBF", ...Array(NCOLS - 3).fill(null), -r.fcbfEconomia, fat2 > 0 ? -r.fcbfEconomia / fat2 : 0],
      ["@", ...Array(NCOLS - 3).fill("@"), BRLP, PCT],
      { bg: COR.verde, color: "FF375623" },
    )
    linhaTotal(ws, row++, NCOLS, "Carga Líquida com FCBF",
      [r.cargaLiquidaComFcbf, r.cargaLiquidaPct], [BRLP, PCT],
      COR.azulTitulo, COR.branco,
    )
  }
}

// ── Aba de ano: resumo agregado (fallback sem dados raw) ──────────────────────

function criarAbaAnoResumo(
  wb: ExcelJS.Workbook,
  r: ResultadoAno,
  temFCBF: boolean,
  empresa: string,
  regime: string,
) {
  const NCOLS = 5
  const ws = wb.addWorksheet(String(r.ano), { views: [{ showGridLines: false }] })
  ws.columns = [
    { key: "tributo", width: 38 },
    { key: "base",    width: 20 },
    { key: "aliq",    width: 14 },
    { key: "valor",   width: 20 },
    { key: "pct",     width: 14 },
  ]

  const fat = r.cargaAtualPct > 0 ? r.cargaAtualTotal / r.cargaAtualPct : 0
  let row = 1

  titulo(ws, row, NCOLS, `SIMULAÇÃO REFORMA TRIBUTÁRIA — ${r.ano}`, `${empresa.toUpperCase()} · ${regime.toUpperCase()}`)
  row += 3

  secao(ws, row++, NCOLS, "  REGIME ATUAL (BASELINE)")
  headers(ws, row++, ["Tributo", "Base de Cálculo (R$)", "Alíquota Efetiva", "Valor (R$)", "% Receita Bruta"])
  const bgA = [COR.cinzaFundo, COR.branco, COR.cinzaFundo]
  ;([
    ["PIS/COFINS", fat, fat > 0 ? r.pisCofinsAtual / fat : 0, r.pisCofinsAtual, fat > 0 ? r.pisCofinsAtual / fat : 0],
    ["ICMS",       fat, fat > 0 ? r.icmsAtual / fat : 0,       r.icmsAtual,      fat > 0 ? r.icmsAtual / fat : 0],
    ["IPI",        fat, fat > 0 ? r.ipiAtual / fat : 0,        r.ipiAtual,       fat > 0 ? r.ipiAtual / fat : 0],
  ] as [string, number, number, number, number][]).forEach(([nm, b, a, v, p], i) => {
    linhaDados(ws, row++, [nm, b, a, v, p], ["@", BRL, PCT, BRLP, PCTP], { bg: bgA[i] })
  })
  linhaTotal(ws, row++, NCOLS, "TOTAL CARGA ATUAL", [r.cargaAtualTotal, r.cargaAtualPct], [BRLP, PCT], COR.azulTitulo, COR.branco)
  vazio(ws, row++)

  secao(ws, row++, NCOLS, "  CARGA COM A REFORMA TRIBUTÁRIA (IBS/CBS)")
  headers(ws, row++, ["Tributo", "Base de Cálculo (R$)", "Alíquota Efetiva", "Valor (R$)", "% Receita Bruta"])
  ;([
    ["CBS — federal",          fat, fat > 0 ? r.cbs / fat : 0,     r.cbs,     fat > 0 ? r.cbs / fat : 0],
    ["IBS — UF estadual",      fat, fat > 0 ? r.ibsUF / fat : 0,   r.ibsUF,   fat > 0 ? r.ibsUF / fat : 0],
    ["IBS — Municipal",        fat, fat > 0 ? r.ibsMUN / fat : 0,  r.ibsMUN,  fat > 0 ? r.ibsMUN / fat : 0],
  ] as [string, number, number, number, number][]).forEach(([nm, b, a, v, p], i) => {
    linhaDados(ws, row++, [nm, b, a, v, p], ["@", BRL, PCT, BRLP, PCTP], { bg: [COR.cinzaFundo, COR.branco, COR.cinzaFundo][i] })
  })
  // Subtotal IBS/CBS
  linhaDados(ws, row++, ["  Subtotal IBS/CBS", null, r.ibsCbsPct, r.ibsCbsTotal, r.ibsCbsPct],
    ["@", "@", PCT, BRL, PCT], { bg: COR.azulSubtotal, bold: true })

  linhaDados(ws, row++, ["ICMS Residual (fator " + (r.icmsReducaoFator * 100).toFixed(0) + "%)", fat, fat > 0 ? r.icmsReforma / fat : 0, r.icmsReforma, fat > 0 ? r.icmsReforma / fat : 0],
    ["@", BRL, PCT, BRLP, PCTP], { bg: COR.branco })
  linhaDados(ws, row++, [r.ipiExtinto ? "IPI — EXTINTO" : "IPI Residual", null, null, r.ipiReforma, fat > 0 ? r.ipiReforma / fat : 0],
    ["@", "@", "@", BRLP, PCTP], { bg: COR.cinzaFundo })
  linhaDados(ws, row++, ["(-) Crédito IBS/CBS nas Entradas" + (r.usouEfd ? "  ★ EFD" : ""), null, null, -r.creditoCompras, fat > 0 ? -r.creditoCompras / fat : 0],
    ["@", "@", "@", BRLP, PCTP], { bg: COR.verde, color: "FF375623" })
  linhaTotal(ws, row++, NCOLS, "TOTAL CARGA REFORMA", [r.cargaReformaTotal, r.cargaReformaPct], [BRLP, PCT], COR.azulSecao, COR.branco)
  vazio(ws, row++)

  if (temFCBF) {
    secao(ws, row++, NCOLS, "  FUNDO DE COMBATE À POBREZA (FCBF)")
    headers(ws, row++, ["Item", "", "", "Valor (R$)", "% Receita"])
    linhaDados(ws, row++, ["(-) Economia FCBF", null, null, -r.fcbfEconomia, fat > 0 ? -r.fcbfEconomia / fat : 0],
      ["@", "@", "@", BRLP, PCTP], { bg: COR.verde, color: "FF375623" })
    linhaTotal(ws, row++, NCOLS, "CARGA LÍQUIDA COM FCBF", [r.cargaLiquidaComFcbf, r.cargaLiquidaPct], [BRLP, PCT], COR.azulTitulo, COR.branco)
    vazio(ws, row++)
  }

  secao(ws, row++, NCOLS, "  VARIAÇÃO ANUAL (DELTA)")
  headers(ws, row++, ["Indicador", "", "", "Valor (R$)", "Variação (%)"])
  const dBg = r.delta < 0 ? COR.verde : COR.vermelho
  const dC  = r.delta < 0 ? "FF375623" : "FF9C0006"
  linhaDados(ws, row++, [r.delta < 0 ? "▼ ECONOMIA com a Reforma" : "▲ CUSTO ADICIONAL", null, null, r.delta, r.deltaPct],
    ["@", "@", "@", BRLP, PCTP], { bg: dBg, bold: true, color: dC })
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
  ws.columns = [{ key: "label", width: 40 }, ...anos.map(() => ({ width: 20 }))]

  let row = 1
  titulo(ws, row, NCOLS, "TOTAL DOS TRIBUTOS INDIRETOS — REFORMA TRIBUTÁRIA",
    `${empresa.toUpperCase()} · ${regime.toUpperCase()} · EC 132/2023 + LC 214/2025`)
  row += 3

  ws.getRow(row).height = 20
  sc(ws.getCell(row, 1), { value: "TRIBUTO / INDICADOR", bg: COR.azulTitulo, bold: true, size: 10, color: COR.branco, align: "center", indent: 1 })
  anos.forEach((ano, i) => {
    sc(ws.getCell(row, 2 + i), { value: ano, bg: COR.azulTitulo, bold: true, size: 11, color: COR.branco, align: "center", numFmt: "0" })
  })
  row++

  const nr = (label: string, vals: (number | null)[], bg: string, bold = false, fmt = BRLP, cor?: string) => {
    ws.getRow(row).height = 16
    sc(ws.getCell(row, 1), { value: label, bg, bold, size: 10, color: cor ?? COR.preto, indent: 2 })
    vals.forEach((v, i) => {
      sc(ws.getCell(row, 2 + i), { value: v, bg, bold, align: "right", numFmt: typeof v === "number" ? fmt : undefined, size: 10, color: cor })
    })
    row++
  }
  const tr = (label: string, vals: number[], bg: string, fmt = BRLP) => {
    ws.getRow(row).height = 18
    sc(ws.getCell(row, 1), { value: label, bg, bold: true, size: 10, color: COR.branco, indent: 1, bt: "medium" })
    vals.forEach((v, i) => {
      sc(ws.getCell(row, 2 + i), { value: v, bg, bold: true, align: "right", numFmt: fmt, size: 10, color: COR.branco, bt: "medium" })
    })
    row++
  }
  const sec = (lbl: string) => { secao(ws, row++, NCOLS, "  " + lbl) }
  const hdr = (hs: string[]) => { headers(ws, row++, hs) }
  const vz  = () => { vazio(ws, row++) }

  sec("REGIME ATUAL (BASELINE)")
  hdr(["Tributo", ...anos.map(() => "Valor (R$)")])
  nr("PIS/COFINS",  resultados.map((r) => r.pisCofinsAtual), COR.cinzaFundo)
  nr("ICMS",        resultados.map((r) => r.icmsAtual),      COR.branco)
  nr("IPI",         resultados.map((r) => r.ipiAtual),       COR.cinzaFundo)
  tr("TOTAL CARGA ATUAL (R$)", resultados.map((r) => r.cargaAtualTotal), COR.azulTitulo)
  nr("% Receita Bruta",  resultados.map((r) => r.cargaAtualPct),   COR.azulHeader, true, PCT)
  vz()

  sec("REFORMA TRIBUTÁRIA (IBS/CBS)")
  hdr(["Tributo", ...anos.map(() => "Valor (R$)")])
  nr("CBS — federal",                resultados.map((r) => r.cbs),              COR.cinzaFundo)
  nr("IBS — UF estadual",            resultados.map((r) => r.ibsUF),            COR.branco)
  nr("IBS — Municipal",              resultados.map((r) => r.ibsMUN),           COR.cinzaFundo)
  nr("ICMS Residual",                resultados.map((r) => r.icmsReforma),      COR.branco)
  nr("IPI Residual",                 resultados.map((r) => r.ipiReforma),       COR.cinzaFundo)
  nr("(-) Crédito IBS/CBS Entradas", resultados.map((r) => -r.creditoCompras),  COR.verde, false, BRLP, "FF375623")
  tr("TOTAL CARGA REFORMA (R$)", resultados.map((r) => r.cargaReformaTotal), COR.azulSecao)
  nr("% Receita Bruta",  resultados.map((r) => r.cargaReformaPct),   COR.azulHeader, true, PCT)
  vz()

  if (temFCBF) {
    sec("FUNDO DE COMBATE À POBREZA (FCBF)")
    hdr(["Item", ...anos.map(() => "Valor (R$)")])
    nr("(-) Economia FCBF",           resultados.map((r) => -r.fcbfEconomia),        COR.verde, false, BRLP, "FF375623")
    nr("Carga Líquida com FCBF (R$)", resultados.map((r) => r.cargaLiquidaComFcbf),  COR.cinzaFundo)
    nr("% Receita Bruta c/ FCBF",     resultados.map((r) => r.cargaLiquidaPct),      COR.branco, false, PCT)
    vz()
  }

  sec("VARIAÇÃO ANUAL (DELTA REFORMA vs. ATUAL)")
  hdr(["Indicador", ...anos.map(() => "Valor")])
  nr("Delta Anual (R$)", resultados.map((r) => r.delta),    COR.branco, false, BRLP)
  nr("Delta Anual (%)",  resultados.map((r) => r.deltaPct), COR.cinzaFundo, false, PCTP)
  let acum = 0
  nr("Delta Acumulado (R$)", resultados.map((r) => { acum += r.delta; return acum }), COR.amarelo, true, BRLP)
  vz()

  sec("IMPACTO DA CARGA TRIBUTÁRIA (Reforma / Atual − 1)")
  hdr(["Indicador", ...anos.map(() => "Variação %")])
  nr("Impacto % (Reforma vs. Atual)",
    resultados.map((r) => r.cargaAtualTotal > 0 ? r.cargaReformaTotal / r.cargaAtualTotal - 1 : null),
    COR.branco, false, PCTP)
  vz()

  const totalDelta = resultados.reduce((s, r) => s + r.delta, 0)
  ws.mergeCells(row, 1, row, NCOLS)
  sc(ws.getCell(row, 1), {
    value: totalDelta < 0
      ? `★  ECONOMIA TOTAL de R$ ${Math.abs(totalDelta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no período 2026–2033`
      : `★  CUSTO ADICIONAL de R$ ${totalDelta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no período 2026–2033`,
    bg: totalDelta < 0 ? COR.verde : COR.vermelho,
    bold: true, size: 11,
    color: totalDelta < 0 ? "FF375623" : "FF9C0006",
    align: "center",
  })
  ws.getRow(row).height = 22; row++
  vz()
  ws.mergeCells(row, 1, row, NCOLS)
  sc(ws.getCell(row, 1), {
    value: "* Créditos IBS/CBS calculados sobre o valor total das entradas (VL_OPR). Análise conforme EC 132/2023 e LC 214/2025.",
    bg: COR.amarelo, italic: true, size: 9, color: COR.cinzaTexto, indent: 1,
  })
  ws.getRow(row).height = 14
}

// Detecta se FCBF foi usado (fcbfEconomia > 0)
function temFCBFFromResultado(r: ResultadoAno): boolean {
  return r.fcbfEconomia > 0
}

// ── Export principal ──────────────────────────────────────────────────────────

export async function exportarSimulacaoExcel(
  resultados: ResultadoAno[],
  temFCBF: boolean,
  nomeEmpresa = "Empresa",
  regime = "Regime Regular",
  dadosXml?: DadosReaisXml | null,
  dadosEfd?: DadosEfd | null,
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Reforma Tributária"
  wb.created = new Date()

  criarAbaResumo(wb, resultados, temFCBF, nomeEmpresa, regime)

  for (const r of resultados) {
    if (dadosXml?.itens?.length) {
      criarAbaAnoXml(wb, r, nomeEmpresa, regime, dadosXml)
    } else if (dadosEfd?.c190Saidas?.length) {
      criarAbaAnoEfd(wb, r, nomeEmpresa, regime, dadosEfd)
    } else {
      criarAbaAnoResumo(wb, r, temFCBF, nomeEmpresa, regime)
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `simulacao_${nomeEmpresa.replace(/[^a-zA-Z0-9]/g, "_")}_reforma.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
