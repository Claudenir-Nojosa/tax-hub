import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { letraColunaAno, LINHA_DADOS_INICIO_ANO, LINHA_FIM_RANGE_ANO, ABAS_ANO } from "./anos"
import { letraColunaEntrada, LINHA_DADOS_INICIO_ENTRADA, LINHA_FIM_RANGE_ENTRADA, tipoCreditoPorNcm, fatorCreditoDoTipo } from "./entradas-efd"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS, type CamposCalculadosAno } from "./calculo-linha-ano"
import { layoutListasPremissas, listaEstabelecimentos } from "./premissas-legislacoes"

// Aba "Quadro Comparativo" — PIS/COFINS, ICMS e ISS por ano + o bloco IBS/CBS aberto em DÉBITO
// (saídas, abas de ano), CRÉDITO (entradas, aba Entradas - EFD ICMS IPI) e SALDO (débito −
// crédito), como na referência do usuário. O VALOR TOTAL considera o SALDO de IBS/CBS (não o
// débito). Filtrado por Empresa (dropdown); cada coluna já sabe a aba de ano certa em tempo de
// geração (2027 e 2028 apontam pra mesma aba/par de crédito), então não precisa de INDIRECT.

const FONTE = "Calibri"
const ANOS_COLUNA = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

// Cores da planilha de referência
const COR_TITULO = "FF1F3864" // azul-marinho da faixa do título e da caixa "Empresa"
const COR_BANDA_CINZA = "FFF2F2F2" // cabeçalho TRIBUTO/anos e linha VALOR TOTAL
const COR_BANDA_AZUL = "FFDDEBF7" // linha IMPACTO CARGA TRIBUTÁRIA
const COR_FONTE_TESTE = "FFA6A6A6" // valores de 2026 do bloco IBS/CBS (ano de teste) em cinza
const COR_DEBITO = "FFFCE4D6" // salmão claro das linhas de DÉBITO
const COR_CREDITO = "FFE2EFDA" // verde claro das linhas de CRÉDITO

const FMT_RS = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'

// Linhas do quadro — posições fixas do layout
const LINHA_TITULO = 2 // mesclada até a 3
const LINHA_EMPRESA = 5
const LINHA_HEADER = 7
const LINHA_PRIMEIRO_TRIBUTO = 8 // 8..10 (PIS/COFINS, ICMS, ISS)
const LINHA_DEBITO = 11 // 11 CBS, 12 IBS
const LINHA_CREDITO = 13 // 13 CBS, 14 IBS
const LINHA_SALDO = 15 // 15 CBS, 16 IBS
const LINHA_TOTAL = 17
const LINHA_IMPACTO = 19

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

// par de crédito da aba Entradas usado por cada ano (2027 e 2028 compartilham o mesmo par)
function parCreditoDoAno(ano: number): string {
  return ano <= 2028 ? "2027 e 2028" : String(ano)
}

const LINHAS_TRIBUTO: { label: string; campo: keyof CamposCalculadosAno }[] = [
  { label: "PIS/COFINS", campo: "vlrPisCofins" },
  { label: "ICMS (Não cumulativo)", campo: "icms" },
  { label: "ISS (Cumulativo)", campo: "iss" },
]
const CAMPO_PARA_COLUNA_ANO: Record<string, string> = {
  vlrPisCofins: "VLR PIS + COFINS", icms: "ICMS", iss: "ISS", cbs: "CBS", ibs: "IBS",
}

// ---------------------------------------------------------------------------------------------
// Cálculo puro do Quadro Comparativo — fonte única de verdade dos números, usada tanto pelos
// caches das fórmulas do Excel (montarAbaQuadroComparativo) quanto pelo PDF executivo
// (src/lib/reforma-pdf.ts). Mesmas regras das abas: PIS/COFINS zera a partir de 2027, ICMS/ISS
// com o cronograma de redução, débito com redução 60% (se ativa), crédito com a classificação
// do NCM e sem crédito em 2026, VALOR TOTAL usa o SALDO de CBS/IBS (não o débito).

export const ANOS_QUADRO = ANOS_COLUNA

export interface QuadroComparativoAno {
  pisCofins: number
  icms: number
  iss: number
  debitoCbs: number
  debitoIbs: number
  creditoCbs: number
  creditoIbs: number
  saldoCbs: number
  saldoIbs: number
  total: number
  impactoPct: number | null // variação vs 2026; null no próprio 2026
}

export function calcularQuadroComparativo(
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData,
  linhasEntradas: LinhaEntradaEfd[] = [],
  classificacoesFornecedores: Record<string, ResultadoConsultaCnpj> = {},
  baseIbsCbs: LinhaBaseIbsCbs[] = []
): Record<number, QuadroComparativoAno> {
  const tipoPorNcm = tipoCreditoPorNcm(baseIbsCbs)
  const resultado: Record<number, QuadroComparativoAno> = {}

  for (const ano of ANOS_COLUNA) {
    const anoPremissa = ano === 2028 ? 2027 : ano
    const p = premissas.premissasPorAno[anoPremissa]
    const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
    const fatorIcmsIss = REDUCAO_ICMS_ISS[anoPremissa] ?? 1
    // ICMS = premissa constante (mesma regra das abas de ano — o modelo não usa a alíquota do
    // EFD); ISS ORIGINAL = sempre a alíquota normal de 2026, não a premissa do próprio ano
    const aliqIss = p.aliquotaISS * fatorIcmsIss
    const aliqIssOriginal = premissas.premissasPorAno[2026]?.aliquotaISS ?? p.aliquotaISS
    const aliqIcms = (premissas.aliquotaICMS ?? 0.225) * fatorIcmsIss
    const zerarPisCofins = ano >= 2027

    let pisCofins = 0, icms = 0, iss = 0, debitoCbs = 0, debitoIbs = 0
    for (const l of linhasSaidas) {
      const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcms : 0
      const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, zerarPisCofins, aliqIssOriginal)
      pisCofins += c.vlrPisCofins
      icms += c.icms
      iss += c.iss
      debitoCbs += c.cbs
      debitoIbs += c.ibs
    }

    // Créditos (entradas): alíquotas CHEIAS da premissa do par (sem redução 60% do débito),
    // fornecedor Simples Nacional/não classificado não gera crédito. Sem crédito em 2026.
    let creditoCbs = 0, creditoIbs = 0
    if (ano !== 2026) {
      for (const l of linhasEntradas) {
        const c = classificacoesFornecedores[l.cnpjFornecedor]
        const naoRegular = !c || Boolean(c.erro) || Boolean(c.simplesNacional)
        if (naoRegular) continue
        const fator = fatorCreditoDoTipo(tipoPorNcm.get(l.ncm) ?? "Cheio")
        if (fator === 0) continue
        const base = (l.vlrItem - l.vlrDescontoItem) * fator
        creditoCbs += base * p.cbs
        creditoIbs += base * (p.ibsUF + p.ibsMUN)
      }
    }

    const saldoCbs = debitoCbs - creditoCbs
    const saldoIbs = debitoIbs - creditoIbs
    // 2026: só PIS/COFINS + ICMS + ISS (CBS/IBS são alíquota-teste)
    const total = ano === 2026 ? pisCofins + icms + iss : pisCofins + icms + iss + saldoCbs + saldoIbs
    resultado[ano] = { pisCofins, icms, iss, debitoCbs, debitoIbs, creditoCbs, creditoIbs, saldoCbs, saldoIbs, total, impactoPct: null }
  }

  const total2026 = resultado[2026].total
  for (const ano of ANOS_COLUNA) {
    if (ano === 2026) continue
    resultado[ano].impactoPct = total2026 !== 0 ? resultado[ano].total / total2026 - 1 : 0
  }
  return resultado
}

export function montarAbaQuadroComparativo(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData,
  linhasEntradas: LinhaEntradaEfd[] = [],
  classificacoesFornecedores: Record<string, ResultadoConsultaCnpj> = {},
  baseIbsCbs: LinhaBaseIbsCbs[] = []
) {
  const ws = wb.addWorksheet("Quadro Comparativo", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF000000" } // guia preta, como na referência
  ws.columns = [
    { width: 3 }, { width: 12 }, { width: 26 },
    // 17: cabe "R$ 99.999.999,99" no formato contábil — com 14 o VALOR TOTAL (linha 17) virava #####
    ...ANOS_COLUNA.map(() => ({ width: 17 })),
    { width: 3 }, { width: 18 },
  ]
  const colFim = String.fromCharCode(68 + ANOS_COLUNA.length - 1) // K (última coluna de ano)

  // Faixa do título
  ws.mergeCells(`C${LINHA_TITULO}:${colFim}${LINHA_TITULO + 1}`)
  celula(ws, `C${LINHA_TITULO}`, "TOTAL DOS TRIBUTOS INDIRETOS", {
    bold: true, size: 14, fundo: COR_TITULO, corFonte: "FFFFFFFF", centralizado: true,
  })

  const layout = layoutListasPremissas(listaEstabelecimentos(empresa, linhasSaidas).length)

  // Caixa "Empresa" (azul-marinho, só na coluna C — sem mesclar) + dropdown com borda + lookup
  // do CNPJ fora da área visível
  celula(ws, `C${LINHA_EMPRESA}`, "Empresa", { bold: true, fundo: COR_TITULO, corFonte: "FFFFFFFF", centralizado: true })
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

  // Números do quadro — fonte única de verdade (também usada pelo PDF executivo)
  const quadro = calcularQuadroComparativo(linhasSaidas, premissas, linhasEntradas, classificacoesFornecedores, baseIbsCbs)
  const somaDebito = (ano: number, campo: "cbs" | "ibs") => (campo === "cbs" ? quadro[ano].debitoCbs : quadro[ano].debitoIbs)
  const somaCredito = (ano: number, campo: "cbs" | "ibs") => (campo === "cbs" ? quadro[ano].creditoCbs : quadro[ano].creditoIbs)
  const somaTributo = (ano: number, campo: keyof CamposCalculadosAno) =>
    campo === "vlrPisCofins" ? quadro[ano].pisCofins : campo === "icms" ? quadro[ano].icms : quadro[ano].iss

  // Linhas PIS/COFINS, ICMS, ISS
  LINHAS_TRIBUTO.forEach((linha, li) => {
    const r = LINHA_PRIMEIRO_TRIBUTO + li
    celula(ws, `C${r}`, linha.label, { bold: true })
    const cValor = letraColunaAno(CAMPO_PARA_COLUNA_ANO[linha.campo])
    ANOS_COLUNA.forEach((ano, ci) => {
      const aba = abaDoAno(ano)
      const rangeValor = `'${aba}'!$${cValor}$${l1}:$${cValor}$${l2}`
      const rangeCnpj = `'${aba}'!$${cCnpj}$${l1}:$${cCnpj}$${l2}`
      celula(
        ws, `${String.fromCharCode(68 + ci)}${r}`,
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, somaTributo(ano, linha.campo)),
        { numFmt: FMT_RS }
      )
    })
  })

  // Bloco DÉBITO (saídas, abas de ano) — salmão
  ws.mergeCells(`B${LINHA_DEBITO}:B${LINHA_DEBITO + 1}`)
  celula(ws, `B${LINHA_DEBITO}`, "DÉBITO", { bold: true, fundo: COR_DEBITO, centralizado: true })
  const camposDebito: ("cbs" | "ibs")[] = ["cbs", "ibs"]
  camposDebito.forEach((campo, i) => {
    const r = LINHA_DEBITO + i
    celula(ws, `C${r}`, `${campo.toUpperCase()} (Não cumulativo)`, { bold: true, fundo: COR_DEBITO })
    const cValor = letraColunaAno(CAMPO_PARA_COLUNA_ANO[campo])
    ANOS_COLUNA.forEach((ano, ci) => {
      const aba = abaDoAno(ano)
      const rangeValor = `'${aba}'!$${cValor}$${l1}:$${cValor}$${l2}`
      const rangeCnpj = `'${aba}'!$${cCnpj}$${l1}:$${cCnpj}$${l2}`
      celula(
        ws, `${String.fromCharCode(68 + ci)}${r}`,
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, somaDebito(ano, campo)),
        { numFmt: FMT_RS, fundo: COR_DEBITO, corFonte: ano === 2026 ? COR_FONTE_TESTE : undefined }
      )
    })
  })

  // Bloco CRÉDITO (entradas, aba Entradas - EFD ICMS IPI) — verde
  ws.mergeCells(`B${LINHA_CREDITO}:B${LINHA_CREDITO + 1}`)
  celula(ws, `B${LINHA_CREDITO}`, "CRÉDITO", { bold: true, fundo: COR_CREDITO, centralizado: true })
  const e1 = LINHA_DADOS_INICIO_ENTRADA
  const e2 = LINHA_FIM_RANGE_ENTRADA
  const cCnpjEntrada = letraColunaEntrada("CNPJ")
  camposDebito.forEach((campo, i) => {
    const r = LINHA_CREDITO + i
    celula(ws, `C${r}`, `${campo.toUpperCase()} (Não cumulativo)`, { bold: true, fundo: COR_CREDITO })
    ANOS_COLUNA.forEach((ano, ci) => {
      const col = String.fromCharCode(68 + ci)
      if (ano === 2026) {
        // sem crédito no ano de teste — mostra "R$ -" em cinza, como na referência
        celula(ws, `${col}${r}`, 0, { numFmt: FMT_RS, fundo: COR_CREDITO, corFonte: COR_FONTE_TESTE })
        return
      }
      const cValor = letraColunaEntrada(`${campo.toUpperCase()} ${parCreditoDoAno(ano)}`)
      const rangeValor = `'Entradas - EFD ICMS IPI'!$${cValor}$${e1}:$${cValor}$${e2}`
      const rangeCnpj = `'Entradas - EFD ICMS IPI'!$${cCnpjEntrada}$${e1}:$${cCnpjEntrada}$${e2}`
      const cache = somaCredito(ano, campo)
      celula(
        ws, `${col}${r}`,
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, cache),
        { numFmt: FMT_RS, fundo: COR_CREDITO }
      )
    })
  })

  // Bloco SALDO (débito − crédito)
  ws.mergeCells(`B${LINHA_SALDO}:B${LINHA_SALDO + 1}`)
  celula(ws, `B${LINHA_SALDO}`, "SALDO", { bold: true, centralizado: true })
  camposDebito.forEach((campo, i) => {
    const r = LINHA_SALDO + i
    const rDeb = LINHA_DEBITO + i
    const rCred = LINHA_CREDITO + i
    celula(ws, `C${r}`, `${campo.toUpperCase()} (Não cumulativo)`, { bold: true })
    ANOS_COLUNA.forEach((ano, ci) => {
      const col = String.fromCharCode(68 + ci)
      const saldo = campo === "cbs" ? quadro[ano].saldoCbs : quadro[ano].saldoIbs
      celula(
        ws, `${col}${r}`,
        f(`${col}${rDeb}-${col}${rCred}`, saldo),
        { numFmt: FMT_RS, corFonte: ano === 2026 ? COR_FONTE_TESTE : undefined }
      )
    })
  })

  // VALOR TOTAL (banda cinza). Em 2026 considera SÓ PIS/COFINS + ICMS + ISS (CBS/IBS de 2026 são
  // alíquota-teste); nos demais anos soma PIS/COFINS + ICMS + ISS + SALDO de CBS/IBS (o saldo,
  // não o débito — pedido do usuário).
  celula(ws, `C${LINHA_TOTAL}`, "VALOR TOTAL", { bold: true, fundo: COR_BANDA_CINZA })
  ws.getCell(`C${LINHA_TOTAL}`).alignment = { horizontal: "right" }
  const totalDoAno = (ano: number) => quadro[ano].total
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    const formula = ano === 2026
      ? `SUM(${col}${LINHA_PRIMEIRO_TRIBUTO}:${col}${LINHA_PRIMEIRO_TRIBUTO + 2})`
      : `SUM(${col}${LINHA_PRIMEIRO_TRIBUTO}:${col}${LINHA_PRIMEIRO_TRIBUTO + 2})+${col}${LINHA_SALDO}+${col}${LINHA_SALDO + 1}`
    celula(ws, `${col}${LINHA_TOTAL}`, f(formula, totalDoAno(ano)), { bold: true, numFmt: FMT_RS, fundo: COR_BANDA_CINZA })
  })

  // IMPACTO CARGA TRIBUTÁRIA (banda azul clara): variação percentual vs 2026; 2026 mostra "-"
  celula(ws, `C${LINHA_IMPACTO}`, "IMPACTO CARGA TRIBUTÁRIA", { bold: true, fundo: COR_BANDA_AZUL })
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    if (ano === 2026) {
      celula(ws, `${col}${LINHA_IMPACTO}`, "-", { bold: true, fundo: COR_BANDA_AZUL, centralizado: true })
      return
    }
    const impacto = quadro[ano].impactoPct ?? 0
    celula(
      ws, `${col}${LINHA_IMPACTO}`,
      f(`IFERROR(${col}${LINHA_TOTAL}/$D$${LINHA_TOTAL}-1,0)`, impacto),
      { bold: true, numFmt: "0.00%", fundo: COR_BANDA_AZUL }
    )
  })
}
