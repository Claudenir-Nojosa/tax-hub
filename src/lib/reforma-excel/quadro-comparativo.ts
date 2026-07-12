import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { letraColunaAno, LINHA_DADOS_INICIO_ANO, LINHA_FIM_RANGE_ANO, ABAS_ANO } from "./anos"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS, type CamposCalculadosAno } from "./calculo-linha-ano"
import { layoutListasPremissas, listaEstabelecimentos } from "./premissas-legislacoes"

// Aba "Quadro Comparativo" — total de PIS/COFINS, ICMS, ISS, CBS e IBS por ano (2026-2033),
// filtrado por Empresa (dropdown). Visual replicado da planilha de referência do usuário:
// faixa azul-marinho com o título, caixa "Empresa" azul-marinho + dropdown com borda, cabeçalho
// e linha VALOR TOTAL em cinza claro, linha IMPACTO CARGA TRIBUTÁRIA em azul claro com o
// percentual de variação vs 2026. Cada coluna já sabe a aba de ano certa em tempo de geração
// (2027 e 2028 apontam pra mesma aba "2027 e 2028"), então não precisa de INDIRECT.

const FONTE = "Calibri"
const ANOS_COLUNA = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

// Cores da planilha de referência
const COR_TITULO = "FF1F3864" // azul-marinho da faixa do título e da caixa "Empresa"
const COR_BANDA_CINZA = "FFF2F2F2" // cabeçalho TRIBUTO/anos e linha VALOR TOTAL
const COR_BANDA_AZUL = "FFDDEBF7" // linha IMPACTO CARGA TRIBUTÁRIA
const COR_FONTE_TESTE = "FFA6A6A6" // CBS/IBS de 2026 (ano de teste) em cinza

const FMT_RS = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'

// Linhas do quadro — posições fixas do layout novo
const LINHA_TITULO = 2 // mesclada até a 3
const LINHA_EMPRESA = 5
const LINHA_HEADER = 7
const LINHA_PRIMEIRO_TRIBUTO = 8 // 8..12 (5 tributos)
const LINHA_TOTAL = 13
const LINHA_IMPACTO = 15

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; fundo?: string; corFonte?: string; centralizado?: boolean; size?: number }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false, color: opts?.corFonte ? { argb: opts.corFonte } : undefined }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.fundo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fundo } }
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  return cell
}

function abaDoAno(ano: number): string {
  const encontrada = ABAS_ANO.find((a) => a.anoPremissa === ano || (ano === 2028 && a.label === "2027 e 2028"))
  return encontrada?.label ?? String(ano)
}

const LINHAS_TRIBUTO: { label: string; campo: keyof CamposCalculadosAno }[] = [
  { label: "PIS/COFINS", campo: "vlrPisCofins" },
  { label: "ICMS (Não cumulativo)", campo: "icms" },
  { label: "ISS (Cumulativo)", campo: "iss" },
  { label: "CBS (Não cumulativo)", campo: "cbs" },
  { label: "IBS (Não cumulativo)", campo: "ibs" },
]
const CAMPO_PARA_COLUNA_ANO: Record<string, string> = {
  vlrPisCofins: "VLR PIS + COFINS", icms: "ICMS", iss: "ISS", cbs: "CBS", ibs: "IBS",
}

export function montarAbaQuadroComparativo(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet("Quadro Comparativo", { views: [{ showGridLines: false }] })
  ws.columns = [
    { width: 3 }, { width: 3 }, { width: 26 },
    ...ANOS_COLUNA.map(() => ({ width: 14 })),
    { width: 3 }, { width: 18 },
  ]
  const colFim = String.fromCharCode(68 + ANOS_COLUNA.length - 1) // K (última coluna de ano)

  // Faixa do título
  ws.mergeCells(`C${LINHA_TITULO}:${colFim}${LINHA_TITULO + 1}`)
  celula(ws, `C${LINHA_TITULO}`, "TOTAL DOS TRIBUTOS INDIRETOS", {
    bold: true, size: 14, fundo: COR_TITULO, corFonte: "FFFFFFFF", centralizado: true,
  })

  const layout = layoutListasPremissas(listaEstabelecimentos(empresa, linhasSaidas).length)

  // Caixa "Empresa" (azul-marinho) + dropdown com borda + lookup do CNPJ fora da área visível
  ws.mergeCells(`B${LINHA_EMPRESA}:C${LINHA_EMPRESA}`)
  celula(ws, `B${LINHA_EMPRESA}`, "Empresa", { bold: true, fundo: COR_TITULO, corFonte: "FFFFFFFF", centralizado: true })
  const dd = celula(ws, `D${LINHA_EMPRESA}`, "Todos")
  dd.border = {
    top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
  }
  dd.dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaTodos}:$C$${layout.linhaEstabelecimentoFim}`],
  }
  // lookup Empresa→CNPJ usado pelos SUMIFS — fica na coluna M, fora do quadro, discreto
  celula(
    ws, `M${LINHA_EMPRESA}`,
    f(`IFERROR(VLOOKUP(D${LINHA_EMPRESA},Premissas!$C$${layout.linhaTodos}:$D$${layout.linhaEstabelecimentoFim},2,FALSE),"Todos")`, "Todos"),
    { numFmt: "@", corFonte: COR_FONTE_TESTE, size: 9 }
  )

  // Cabeçalho TRIBUTO | 2026..2033 (banda cinza)
  celula(ws, `C${LINHA_HEADER}`, "TRIBUTO", { bold: true, fundo: COR_BANDA_CINZA, centralizado: true })
  ANOS_COLUNA.forEach((ano, i) =>
    celula(ws, `${String.fromCharCode(68 + i)}${LINHA_HEADER}`, ano, { bold: true, fundo: COR_BANDA_CINZA, centralizado: true })
  )

  const l1 = LINHA_DADOS_INICIO_ANO
  const l2 = LINHA_FIM_RANGE_ANO
  const cCnpj = letraColunaAno("CNPJ")

  // premissas por ano da coluna (2027/2028 usam a mesma, ver Premissas) — pré-computadas uma vez,
  // já com a redução de ICMS/ISS 2029-2033 aplicada (mesmo cronograma usado em anos.ts)
  const aliqPorAno = new Map<number, { aliqIss: number; aliqIbs: number; aliqCbs: number; aliqIcms: number }>()
  for (const ano of ANOS_COLUNA) {
    const anoPremissa = ano === 2028 ? 2027 : ano
    const p = premissas.premissasPorAno[anoPremissa]
    const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
    const fatorIcmsIss = REDUCAO_ICMS_ISS[anoPremissa] ?? 1
    // ICMS = premissa constante (mesma regra das abas de ano — o modelo não usa a alíquota do EFD)
    aliqPorAno.set(ano, {
      aliqIss: p.aliquotaISS * fatorIcmsIss, aliqIbs, aliqCbs,
      aliqIcms: (premissas.aliquotaICMS ?? 0.225) * fatorIcmsIss,
    })
  }

  // Uma única passada por linha por ano (não por tributo×ano) — calcularCamposAno já devolve os
  // 5 campos de uma vez. PIS/COFINS zera a partir de 2027 (a CBS substitui), igual às abas de ano.
  const somasPorAno = new Map<number, Record<string, number>>()
  for (const ano of ANOS_COLUNA) {
    const { aliqIss, aliqIbs, aliqCbs, aliqIcms } = aliqPorAno.get(ano)!
    const zerarPisCofins = ano >= 2027
    const somas: Record<string, number> = { vlrPisCofins: 0, icms: 0, iss: 0, cbs: 0, ibs: 0 }
    for (const l of linhasSaidas) {
      const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcms : 0
      const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, zerarPisCofins)
      somas.vlrPisCofins += c.vlrPisCofins
      somas.icms += c.icms
      somas.iss += c.iss
      somas.cbs += c.cbs
      somas.ibs += c.ibs
    }
    somasPorAno.set(ano, somas)
  }

  // Linhas de tributo
  LINHAS_TRIBUTO.forEach((linha, li) => {
    const r = LINHA_PRIMEIRO_TRIBUTO + li
    celula(ws, `C${r}`, linha.label, { bold: true })
    const cValor = letraColunaAno(CAMPO_PARA_COLUNA_ANO[linha.campo])
    ANOS_COLUNA.forEach((ano, ci) => {
      const aba = abaDoAno(ano)
      const rangeValor = `'${aba}'!$${cValor}$${l1}:$${cValor}$${l2}`
      const rangeCnpj = `'${aba}'!$${cCnpj}$${l1}:$${cCnpj}$${l2}`
      const total = somasPorAno.get(ano)![linha.campo]
      // CBS/IBS de 2026 (ano de teste, alíquota simbólica) em cinza, como na referência
      const ehTeste2026 = ano === 2026 && (linha.campo === "cbs" || linha.campo === "ibs")
      celula(
        ws, `${String.fromCharCode(68 + ci)}${r}`,
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, total),
        { numFmt: FMT_RS, corFonte: ehTeste2026 ? COR_FONTE_TESTE : undefined }
      )
    })
  })

  // VALOR TOTAL (banda cinza)
  celula(ws, `C${LINHA_TOTAL}`, "VALOR TOTAL", { bold: true, fundo: COR_BANDA_CINZA })
  ws.getCell(`C${LINHA_TOTAL}`).alignment = { horizontal: "right" }
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    const somas = somasPorAno.get(ano)!
    const total = somas.vlrPisCofins + somas.icms + somas.iss + somas.cbs + somas.ibs
    celula(
      ws, `${col}${LINHA_TOTAL}`,
      f(`SUM(${col}${LINHA_PRIMEIRO_TRIBUTO}:${col}${LINHA_PRIMEIRO_TRIBUTO + LINHAS_TRIBUTO.length - 1})`, total),
      { bold: true, numFmt: FMT_RS, fundo: COR_BANDA_CINZA }
    )
  })

  // IMPACTO CARGA TRIBUTÁRIA (banda azul clara): variação percentual vs 2026; 2026 mostra "-"
  celula(ws, `C${LINHA_IMPACTO}`, "IMPACTO CARGA TRIBUTÁRIA", { bold: true, fundo: COR_BANDA_AZUL })
  const total2026 = ANOS_COLUNA.length > 0
    ? Object.values(somasPorAno.get(2026)!).reduce((s, v) => s + v, 0)
    : 0
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    if (ano === 2026) {
      celula(ws, `${col}${LINHA_IMPACTO}`, "-", { bold: true, fundo: COR_BANDA_AZUL, centralizado: true })
      return
    }
    const somas = somasPorAno.get(ano)!
    const totalAno = somas.vlrPisCofins + somas.icms + somas.iss + somas.cbs + somas.ibs
    const impacto = total2026 !== 0 ? totalAno / total2026 - 1 : 0
    celula(
      ws, `${col}${LINHA_IMPACTO}`,
      f(`IFERROR(${col}${LINHA_TOTAL}/$D$${LINHA_TOTAL}-1,0)`, impacto),
      { bold: true, numFmt: "0.00%", fundo: COR_BANDA_AZUL }
    )
  })
}
