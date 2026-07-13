import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { letraColunaAno, LINHA_DADOS_INICIO_ANO, LINHA_FIM_RANGE_ANO } from "./anos"
import { layoutListasPremissas, listaEstabelecimentos, LISTA_ANOS } from "./premissas-legislacoes"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS } from "./calculo-linha-ano"

// Aba "Valor Total NF-e" — réplica do layout da planilha de referência do usuário: bloco de
// filtros (Estabelecimento/CNPJ/Documento/Ano) com rótulos em azul claro, faixa azul-marinho
// "VALOR TOTAL DA NOTA FISCAL" e uma tabela 2×7 estilo "capa de DANFE" (BASE DE CÁLCULO DO ICMS,
// VALOR DO ICMS, ICMS SUBST., PIS/COFINS, ISS, TOTAL DOS PRODUTOS, FRETE, SEGURO, DESCONTO,
// OUTRAS DESP., CBS, IBS e VALOR TOTAL DA NOTA). Cada valor é um SUMIFS sobre a aba do ano
// selecionado via INDIRECT (o nome da aba muda conforme o dropdown Ano).

const FONTE = "Calibri"
const COR_TITULO = "FF1F3864" // faixa azul-marinho
const COR_FILTRO = "FFDDEBF7" // rótulos dos filtros e destaque do VALOR TOTAL DA NOTA
const FMT_CONTABIL = '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-'
const BORDA_FINA: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
}

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; fundo?: string; corFonte?: string; centralizado?: boolean; size?: number; borda?: boolean }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false, color: opts?.corFonte ? { argb: opts.corFonte } : undefined }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.fundo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fundo } }
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  if (opts?.borda) cell.border = BORDA_FINA
  return cell
}

// Campos da tabela 2×7, na ordem da referência: [rótulo, coluna da aba de ano]
const CAMPOS_LINHA_1: [string, string][] = [
  ["BASE DE CÁLCULO DO ICMS", "BASE ICMS FINANCE"],
  ["VALOR DO ICMS", "ICMS"],
  ["BASE DE CÁLCULO DO ICMS SUBST.", "Vlr ICMS-ST"],
  ["VALOR DO ICMS SUBST.", "Vlr ICMS-ST"],
  ["VALOR PIS/COFINS", "VLR PIS + COFINS"],
  ["VALOR DO ISS", "ISS"],
  ["VALOR TOTAL DOS PRODUTOS", "VALOR SEM TRIBUTO"],
]
const CAMPOS_LINHA_2: [string, string][] = [
  ["VALOR DO FRETE", "Vlr Frete"],
  ["VALOR DO SEGURO", "Vlr Seguro"],
  ["DESCONTO", "Vlr Desconto NF"],
  ["OUTRAS DESP. ACESS.", "Vlr Outras DA"],
  ["VALOR DA CBS", "CBS"],
  ["VALOR DO IBS", "IBS"],
  ["VALOR TOTAL DA NOTA", "TOTAL NF FINANCE"],
]

export function montarAbaValorTotalNfe(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet("Valor Total NF-e", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF000000" } // guia preta, como na referência
  ws.columns = [{ width: 2 }, ...Array(7).fill({ width: 22 })] // B..H

  const layout = layoutListasPremissas(listaEstabelecimentos(empresa, linhasSaidas).length)

  // Bloco de filtros (B2:C5): rótulos em azul claro, valores com borda
  const filtros: [string, number][] = [["Estabelecimento", 2], ["CNPJ", 3], ["Documento", 4], ["Ano", 5]]
  for (const [rotulo, r] of filtros) celula(ws, `B${r}`, rotulo, { bold: true, fundo: COR_FILTRO, borda: true })
  const cEstab = celula(ws, "C2", "Todos", { borda: true })
  cEstab.dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaTodos}:$C$${layout.linhaEstabelecimentoFim}`],
  }
  celula(
    ws, "C3",
    f(`IFERROR(VLOOKUP(C2,Premissas!$C$${layout.linhaTodos}:$D$${layout.linhaEstabelecimentoFim},2,FALSE),"Todos")`, "Todos"),
    { numFmt: "@", borda: true }
  )
  const cDoc = celula(ws, "C4", "Nota Fiscal de Mercadoria (DANFE)", { borda: true })
  cDoc.dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaDocumentoDanfe}:$C$${layout.linhaDocumentoNfs}`],
  }
  const cAno = celula(ws, "C5", LISTA_ANOS[0], { borda: true })
  cAno.dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaAnoInicio}:$C$${layout.linhaAnoFim}`],
  }

  // Faixa azul-marinho com o título
  ws.mergeCells("B7:H7")
  celula(ws, "B7", "VALOR TOTAL DA NOTA FISCAL", { bold: true, size: 14, fundo: COR_TITULO, corFonte: "FFFFFFFF", centralizado: true })

  // Cabeçalho do ano selecionado (segue o dropdown)
  ws.mergeCells("B9:H9")
  celula(ws, "B9", f("C5", LISTA_ANOS[0]), { bold: true, size: 14, centralizado: true, borda: true })

  // SUMIFS sobre a aba do ano via INDIRECT, filtrando por Documento e (se não "Todos") por CNPJ
  const l1 = LINHA_DADOS_INICIO_ANO
  const l2 = LINHA_FIM_RANGE_ANO
  const cCnpj = letraColunaAno("CNPJ")
  const cDocumento = letraColunaAno("Documento")
  const rangeDe = (col: string) => `INDIRECT("'"&$C$5&"'!$${col}$${l1}:$${col}$${l2}")`
  const rangeCnpj = rangeDe(cCnpj)
  const rangeDoc = rangeDe(cDocumento)
  const somaDe = (campo: string) => {
    const rangeValor = rangeDe(letraColunaAno(campo))
    return `IF($C$2="Todos",SUMIFS(${rangeValor},${rangeDoc},$C$4),SUMIFS(${rangeValor},${rangeCnpj},$C$3,${rangeDoc},$C$4))`
  }

  // Valores default em cache (Estabelecimento=Todos, Documento=DANFE, Ano=2026) — espelham o que
  // as fórmulas produzem ao abrir o arquivo, usando a MESMA cadeia de cálculo das abas de ano
  const p2026 = premissas.premissasPorAno[2026]
  const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p2026.cbs, p2026.ibsUF, p2026.ibsMUN, premissas.reducao60)
  const fator2026 = REDUCAO_ICMS_ISS[2026] ?? 1
  const aliqIcms2026 = (premissas.aliquotaICMS ?? 0.225) * fator2026
  const defaults: Record<string, number> = {}
  for (const [, campo] of [...CAMPOS_LINHA_1, ...CAMPOS_LINHA_2]) defaults[campo] = 0
  for (const l of linhasSaidas) {
    if (l.documento !== "Nota Fiscal de Mercadoria (DANFE)") continue
    const c = calcularCamposAno(l, p2026.aliquotaISS * fator2026, aliqIbs, aliqCbs, aliqIcms2026, false)
    defaults["BASE ICMS FINANCE"] += c.baseIcmsFinance
    defaults["ICMS"] += c.icms
    defaults["VLR PIS + COFINS"] += c.vlrPisCofins
    defaults["ISS"] += c.iss
    defaults["VALOR SEM TRIBUTO"] += c.vlrSemTributo
    defaults["CBS"] += c.cbs
    defaults["IBS"] += c.ibs
    defaults["TOTAL NF FINANCE"] += c.totalNfFinance
    defaults["Vlr Frete"] += l.vlrFrete
    defaults["Vlr Seguro"] += l.vlrSeguro
    defaults["Vlr Desconto NF"] += l.vlrDescontoNF
    defaults["Vlr Outras DA"] += l.vlrOutrasDA
    defaults["Vlr ICMS-ST"] += 0
  }

  // Tabela 2×7: linha de rótulos (pequenos, centralizados) + linha de valores, tudo com borda
  const escreverBloco = (campos: [string, string][], linhaRotulo: number) => {
    campos.forEach(([rotulo, campo], i) => {
      const col = String.fromCharCode(66 + i) // B..H
      celula(ws, `${col}${linhaRotulo}`, rotulo, { bold: true, size: 9, centralizado: true, borda: true })
      const destaque = rotulo === "VALOR TOTAL DA NOTA"
      celula(
        ws, `${col}${linhaRotulo + 1}`,
        f(somaDe(campo), defaults[campo]),
        { bold: true, numFmt: FMT_CONTABIL, borda: true, fundo: destaque ? COR_FILTRO : undefined }
      )
    })
  }
  escreverBloco(CAMPOS_LINHA_1, 10)
  escreverBloco(CAMPOS_LINHA_2, 12)
}
