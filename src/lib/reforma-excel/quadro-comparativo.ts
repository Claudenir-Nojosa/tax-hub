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

export function montarAbaQuadroComparativo(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData,
  linhasEntradas: LinhaEntradaEfd[] = [],
  classificacoesFornecedores: Record<string, ResultadoConsultaCnpj> = {},
  baseIbsCbs: LinhaBaseIbsCbs[] = []
) {
  const tipoPorNcm = tipoCreditoPorNcm(baseIbsCbs)
  const ws = wb.addWorksheet("Quadro Comparativo", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF000000" } // guia preta, como na referência
  ws.columns = [
    { width: 3 }, { width: 12 }, { width: 26 },
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

  // premissas por ano da coluna (2027/2028 usam a mesma, ver Premissas) — pré-computadas uma vez,
  // já com a redução de ICMS/ISS 2029-2033 aplicada (mesmo cronograma usado em anos.ts)
  const aliqPorAno = new Map<number, { aliqIss: number; aliqIssOriginal: number; aliqIbs: number; aliqCbs: number; aliqIcms: number }>()
  for (const ano of ANOS_COLUNA) {
    const anoPremissa = ano === 2028 ? 2027 : ano
    const p = premissas.premissasPorAno[anoPremissa]
    const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
    const fatorIcmsIss = REDUCAO_ICMS_ISS[anoPremissa] ?? 1
    // ICMS = premissa constante (mesma regra das abas de ano — o modelo não usa a alíquota do EFD);
    // ISS ORIGINAL = sempre a alíquota normal de 2026, não a premissa do próprio ano
    aliqPorAno.set(ano, {
      aliqIss: p.aliquotaISS * fatorIcmsIss,
      aliqIssOriginal: premissas.premissasPorAno[2026]?.aliquotaISS ?? p.aliquotaISS,
      aliqIbs, aliqCbs,
      aliqIcms: (premissas.aliquotaICMS ?? 0.225) * fatorIcmsIss,
    })
  }

  // Uma única passada por linha por ano (não por tributo×ano) — calcularCamposAno já devolve os
  // 5 campos de uma vez. PIS/COFINS zera a partir de 2027 (a CBS substitui), igual às abas de ano.
  const somasPorAno = new Map<number, Record<string, number>>()
  for (const ano of ANOS_COLUNA) {
    const { aliqIss, aliqIssOriginal, aliqIbs, aliqCbs, aliqIcms } = aliqPorAno.get(ano)!
    const zerarPisCofins = ano >= 2027
    const somas: Record<string, number> = { vlrPisCofins: 0, icms: 0, iss: 0, cbs: 0, ibs: 0 }
    for (const l of linhasSaidas) {
      const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcms : 0
      const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, zerarPisCofins, aliqIssOriginal)
      somas.vlrPisCofins += c.vlrPisCofins
      somas.icms += c.icms
      somas.iss += c.iss
      somas.cbs += c.cbs
      somas.ibs += c.ibs
    }
    somasPorAno.set(ano, somas)
  }

  // Créditos de IBS/CBS por ano (entradas) — mesma regra da aba Entradas: base = Vlr Item −
  // Desconto, alíquotas CHEIAS da premissa do par (sem a redução de 60% do débito), fornecedor
  // Simples Nacional/não classificado não gera crédito, "Cheio" é o default do Regime Regular.
  // Sem crédito em 2026 (período de teste).
  const creditoPorAno = new Map<number, { cbs: number; ibs: number }>()
  for (const ano of ANOS_COLUNA) {
    if (ano === 2026) {
      creditoPorAno.set(ano, { cbs: 0, ibs: 0 })
      continue
    }
    const anoPremissa = ano === 2028 ? 2027 : ano
    const p = premissas.premissasPorAno[anoPremissa]
    let cbs = 0
    let ibs = 0
    for (const l of linhasEntradas) {
      const c = classificacoesFornecedores[l.cnpjFornecedor]
      const naoRegular = !c || Boolean(c.erro) || Boolean(c.simplesNacional)
      if (naoRegular) continue
      // mesma régua da aba Entradas: classificação do NCM (Cheio/reduzida 60%/zero/não permitido)
      const fator = fatorCreditoDoTipo(tipoPorNcm.get(l.ncm) ?? "Cheio")
      if (fator === 0) continue
      const base = (l.vlrItem - l.vlrDescontoItem) * fator
      cbs += base * p.cbs
      ibs += base * (p.ibsUF + p.ibsMUN)
    }
    creditoPorAno.set(ano, { cbs, ibs })
  }

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
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, somasPorAno.get(ano)![linha.campo]),
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
        f(`IF($D$${LINHA_EMPRESA}="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$M$${LINHA_EMPRESA}))`, somasPorAno.get(ano)![campo]),
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
      const cache = creditoPorAno.get(ano)![campo]
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
      const saldo = somasPorAno.get(ano)![campo] - creditoPorAno.get(ano)![campo]
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
  const totalDoAno = (ano: number) => {
    const somas = somasPorAno.get(ano)!
    const credito = creditoPorAno.get(ano)!
    return ano === 2026
      ? somas.vlrPisCofins + somas.icms + somas.iss
      : somas.vlrPisCofins + somas.icms + somas.iss + (somas.cbs - credito.cbs) + (somas.ibs - credito.ibs)
  }
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    const formula = ano === 2026
      ? `SUM(${col}${LINHA_PRIMEIRO_TRIBUTO}:${col}${LINHA_PRIMEIRO_TRIBUTO + 2})`
      : `SUM(${col}${LINHA_PRIMEIRO_TRIBUTO}:${col}${LINHA_PRIMEIRO_TRIBUTO + 2})+${col}${LINHA_SALDO}+${col}${LINHA_SALDO + 1}`
    celula(ws, `${col}${LINHA_TOTAL}`, f(formula, totalDoAno(ano)), { bold: true, numFmt: FMT_RS, fundo: COR_BANDA_CINZA })
  })

  // IMPACTO CARGA TRIBUTÁRIA (banda azul clara): variação percentual vs 2026; 2026 mostra "-"
  celula(ws, `C${LINHA_IMPACTO}`, "IMPACTO CARGA TRIBUTÁRIA", { bold: true, fundo: COR_BANDA_AZUL })
  const total2026 = totalDoAno(2026)
  ANOS_COLUNA.forEach((ano, ci) => {
    const col = String.fromCharCode(68 + ci)
    if (ano === 2026) {
      celula(ws, `${col}${LINHA_IMPACTO}`, "-", { bold: true, fundo: COR_BANDA_AZUL, centralizado: true })
      return
    }
    const totalAno = totalDoAno(ano)
    const impacto = total2026 !== 0 ? totalAno / total2026 - 1 : 0
    celula(
      ws, `${col}${LINHA_IMPACTO}`,
      f(`IFERROR(${col}${LINHA_TOTAL}/$D$${LINHA_TOTAL}-1,0)`, impacto),
      { bold: true, numFmt: "0.00%", fundo: COR_BANDA_AZUL }
    )
  })
}
