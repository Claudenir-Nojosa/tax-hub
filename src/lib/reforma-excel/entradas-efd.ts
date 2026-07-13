import ExcelJS from "exceljs"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { colLetra } from "./coluna-letra"

// Aba "Entradas - EFD ICMS IPI" — crédito de IBS/CBS por fornecedor. A lógica exata (não é um
// "percentual de crédito por ano" separado, como uma leitura apressada do pedido original sugeria
// — é a MESMA alíquota IBS/CBS do ano, aplicada sobre a base da compra) foi confirmada célula a
// célula no Excel-modelo (fórmulas reais da aba "Entradas - EFD ICMS IPI", linha de dado real):
//
//   tipoCrédito = SE Regime≠"Regime Regular": "Não permitido"
//                 SENÃO: VLOOKUP(NCM, 'Base IBS-CBS', coluna "Descrição Alíquota")
//                        (ou "Cheio" se o NCM não estiver na base — IFERROR)
//   créditoIBS(ano) = SE tipoCrédito="Cheio": base × (aliqIbsUF(ano)+aliqIbsMUN(ano))
//                     SE tipoCrédito="Alíquota reduzida em 60%": base × (aliqIbsUF+aliqIbsMUN)(ano)×0,4
//                     SE "Alíquota zero" ou "Não permitido": 0
//   créditoCBS(ano) = idem, com aliqCBS(ano)
//
// Importante: a redução de 60% aqui é por CLASSIFICAÇÃO DO NCM (Base IBS-CBS), independente do
// toggle "atividade com redução de 60%" do Passo 2 (que é sobre o DÉBITO das saídas da própria
// empresa) — são dois mecanismos distintos que coincidem no caso da Art Farma mas não são o mesmo
// campo. Por isso as alíquotas aqui são as CHEIAS da Premissa (sem o fator de redução do débito).
// Sem crédito em 2026 (período de teste) — só a partir de 2027, igual ao modelo.

const FONTE = "Calibri"
const ANOS_CREDITO: { label: string; anoPremissa: number }[] = [
  { label: "2027 e 2028", anoPremissa: 2027 },
  { label: "2029", anoPremissa: 2029 },
  { label: "2030", anoPremissa: 2030 },
  { label: "2031", anoPremissa: 2031 },
  { label: "2032", anoPremissa: 2032 },
  { label: "2033", anoPremissa: 2033 },
]

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

// Cores/formatos do estilo da planilha de referência (faixa azul do ano sobre pares IBS/CBS,
// cabeçalhos Crédito CBS/IBS em azul claro, valores em formato contábil R$)
const COR_BANDA_ANO = "FF5B9BD5"
const COR_HEADER_CREDITO = "FFDDEBF7"
const FMT_RS = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'
const BORDA_FINA: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
}

function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; size?: number; fundo?: string; centralizado?: boolean; borda?: boolean }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.fundo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fundo } }
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  if (opts?.borda) cell.border = BORDA_FINA
  return cell
}

const HEADERS = [
  "CNPJ", "PA", "Registros", "Código Participante", "CNPJ Participante", "Nome Participante",
  "UF Fornecedor", "Regime IBS/CBS", "Número Documento", "Chave NF-e", "Data Documento",
  "Vlr Documento", "Número Item", "Código Item", "Descrição Item", "NCM", "Vlr Item", "Qtde",
  "CFOP", "Vlr Base Cálculo ICMS", "Alíquota ICMS", "Vlr ICMS", "Crédito CBS", "Crédito IBS",
] as const

function creditColHeaders(): string[] {
  const h: string[] = []
  for (const { label } of ANOS_CREDITO) h.push(`Crédito IBS ${label}`, `Crédito CBS ${label}`)
  return h
}

const TODOS_HEADERS = [...HEADERS, ...creditColHeaders()]
const COL_INICIO = 3 // C
const LINHA_TITULO = 1
const LINHA_ANOS_CREDITO = 2 // rótulos dos 6 grupos de ano (2027 e 2028, 2029...2033), colunas D..I
const LINHA_ALIQ_CBS = 3
const LINHA_ALIQ_IBSUF = 4
const LINHA_ALIQ_IBSMUN = 5
const LINHA_SUBTOTAL = 6 // SUBTOTAL(9,...) em R$ sobre as colunas de crédito, como na referência
const LINHA_BANDA_ANO = 7 // faixa azul com o ano, mesclada sobre cada par IBS/CBS
const LINHA_HEADER = 8
export const LINHA_DADOS_INICIO_ENTRADA = 9
// margem generosa de linhas nas fórmulas cross-sheet (Análise Fornecedores, Fase 6) — mesmo
// espírito de LINHA_FIM_RANGE_ANO em anos.ts
export const LINHA_FIM_RANGE_ENTRADA = 200_000

// Letra da coluna de um campo da aba Entradas — exportada pra Análise Fornecedores (Fase 6)
// referenciar as mesmas colunas sem duplicar a lista de headers.
export function letraColunaEntrada(nome: string): string {
  const idx = TODOS_HEADERS.indexOf(nome)
  if (idx === -1) throw new Error(`Coluna "${nome}" não existe no layout de Entradas`)
  return colLetra(COL_INICIO + idx)
}
const letraDe = letraColunaEntrada

// Tabela de fornecedores (CNPJ → Regime), fora da área de dados principal — fonte do VLOOKUP da
// coluna "Regime IBS/CBS". Colocada nas colunas AZ/BA pra não colidir com nada.
const COL_FORN_CNPJ = "AZ"
const COL_FORN_REGIME = "BA"
const LINHA_FORN_INICIO = 2

export function montarAbaEntradasEfd(
  wb: ExcelJS.Workbook,
  linhas: LinhaEntradaEfd[],
  classificacoes: Record<string, ResultadoConsultaCnpj>,
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet("Entradas - EFD ICMS IPI", { views: [{ showGridLines: false }] })
  // formato R$ das colunas de crédito no nível da COLUNA (não célula a célula) — memória
  ws.columns = [
    { width: 3 }, { width: 3 },
    ...TODOS_HEADERS.map((nome) =>
      nome.startsWith("Crédito IBS ") || nome.startsWith("Crédito CBS ")
        ? { width: 14, style: { numFmt: FMT_RS } }
        : { width: 14 }
    ),
  ]

  celula(ws, `C${LINHA_TITULO}`, "Entradas - EFD ICMS IPI", { bold: true, size: 12 })

  // Tabela de alíquotas (cheias, sem o fator de redução do débito) por ano de crédito — 4 linhas
  // bem definidas, sem overlap: rótulo do ano (2), CBS (3), IBS UF (4), IBS MUN (5)
  celula(ws, `C${LINHA_ANOS_CREDITO}`, "Ano", { bold: true })
  celula(ws, `C${LINHA_ALIQ_CBS}`, "ALIQ. CBS")
  celula(ws, `C${LINHA_ALIQ_IBSUF}`, "ALIQ. IBS UF")
  celula(ws, `C${LINHA_ALIQ_IBSMUN}`, "ALIQ. IBS MUN")
  ANOS_CREDITO.forEach(({ label, anoPremissa }, i) => {
    const p = premissas.premissasPorAno[anoPremissa]
    const col = colLetra(4 + i) // D, E, F, G, H, I
    celula(ws, `${col}${LINHA_ANOS_CREDITO}`, label, { bold: true })
    celula(ws, `${col}${LINHA_ALIQ_CBS}`, p.cbs, { numFmt: "0.00%" })
    celula(ws, `${col}${LINHA_ALIQ_IBSUF}`, p.ibsUF, { numFmt: "0.00%" })
    celula(ws, `${col}${LINHA_ALIQ_IBSMUN}`, p.ibsMUN, { numFmt: "0.00%" })
  })

  // Tabela de fornecedores → regime (fonte do VLOOKUP da coluna "Regime IBS/CBS")
  const cnpjsUnicos = Array.from(new Set(linhas.map((l) => l.cnpjFornecedor).filter(Boolean)))
  celula(ws, `${COL_FORN_CNPJ}1`, "CNPJ Fornecedor", { bold: true })
  celula(ws, `${COL_FORN_REGIME}1`, "Regime", { bold: true })
  cnpjsUnicos.forEach((cnpj, i) => {
    const r = LINHA_FORN_INICIO + i
    const c = classificacoes[cnpj]
    const regime = c?.erro ? "Não classificado" : c?.simplesNacional ? "Simples Nacional" : "Regime Regular"
    celula(ws, `${COL_FORN_CNPJ}${r}`, cnpj, { numFmt: "@" })
    celula(ws, `${COL_FORN_REGIME}${r}`, regime)
  })
  const linhaFornFim = LINHA_FORN_INICIO + Math.max(cnpjsUnicos.length, 1) - 1

  // Cabeçalho: colunas brutas em negrito simples; "Crédito CBS"/"Crédito IBS" (classificação do
  // NCM) em azul claro; nos grupos de ano, faixa azul mesclada com o rótulo do ano em cima e
  // subcabeçalhos "IBS"/"CBS" com borda — estilo da planilha de referência
  TODOS_HEADERS.forEach((nome, i) => {
    const ref = `${colLetra(COL_INICIO + i)}${LINHA_HEADER}`
    if (nome === "Crédito CBS" || nome === "Crédito IBS") {
      celula(ws, ref, nome, { bold: true, centralizado: true, fundo: COR_HEADER_CREDITO, borda: true })
    } else if (nome.startsWith("Crédito IBS ")) {
      celula(ws, ref, "IBS", { bold: true, centralizado: true, borda: true })
    } else if (nome.startsWith("Crédito CBS ")) {
      celula(ws, ref, "CBS", { bold: true, centralizado: true, borda: true })
    } else {
      celula(ws, ref, nome, { bold: true })
    }
  })
  for (const { label } of ANOS_CREDITO) {
    const cIbs = letraColunaEntrada(`Crédito IBS ${label}`)
    const cCbs = letraColunaEntrada(`Crédito CBS ${label}`)
    ws.mergeCells(`${cIbs}${LINHA_BANDA_ANO}:${cCbs}${LINHA_BANDA_ANO}`)
    celula(ws, `${cIbs}${LINHA_BANDA_ANO}`, label, { bold: true, centralizado: true, fundo: COR_BANDA_ANO, borda: true })
  }

  const cCnpjPart = letraDe("CNPJ Participante"), cRegime = letraDe("Regime IBS/CBS"), cNcm = letraDe("NCM"),
    cVlrItem = letraDe("Vlr Item"), cTipoCredito = letraDe("Crédito CBS"), cTipoCreditoIbs = letraDe("Crédito IBS")

  // soma acumulada por coluna de crédito, pro SUBTOTAL da linha 6 (cache do resultado)
  const somasCredito: Record<string, number> = {}
  for (const nome of creditColHeaders()) somasCredito[nome] = 0

  linhas.forEach((l, i) => {
    const r = LINHA_DADOS_INICIO_ENTRADA + i
    const raw = [
      l.cnpj, l.pa, "C100/C170 - Documento - Nota Fiscal", l.codigoParticipante, l.cnpjFornecedor,
      l.nomeFornecedor, l.ufFornecedor, "", l.numeroDocumento, l.chaveNFe, l.dataDocumento,
      l.vlrDocumento, l.numeroItem, l.codigoItem, l.descricaoItem, l.ncm, l.vlrItem, l.qtde,
      l.cfop, l.vlrBaseCalculoIcms, l.aliquotaIcms, l.vlrIcms, "",
    ]
    raw.forEach((v, ci) => {
      // sem font por célula (Calibri 11 é o padrão do Excel) — crítico pra memória
      ws.getCell(r, COL_INICIO + ci).value = v as ExcelJS.CellValue
    })

    const classificacao = classificacoes[l.cnpjFornecedor]
    const regimeCalculado = classificacao?.erro ? "Não classificado" : classificacao?.simplesNacional ? "Simples Nacional" : "Regime Regular"
    celula(ws, `${cRegime}${r}`, f(
      `IFERROR(VLOOKUP(${cCnpjPart}${r},$${COL_FORN_CNPJ}$${LINHA_FORN_INICIO}:$${COL_FORN_REGIME}$${linhaFornFim},2,FALSE),"Não classificado")`,
      regimeCalculado
    ))

    const tipoCreditoFormula = `IFERROR(IF(${cRegime}${r}="Regime Regular",VLOOKUP(${cNcm}${r},'Base IBS-CBS'!$H:$K,4,FALSE),"Não permitido"),"Cheio")`
    const naoRegular = regimeCalculado !== "Regime Regular"
    // resultado default: "Cheio" quando Regime Regular (NCM não necessariamente na base — mesmo
    // comportamento IFERROR do modelo); "Não permitido" quando Simples/não classificado.
    // "Crédito CBS" e "Crédito IBS" mostram a mesma classificação (a base de NCM não distingue),
    // como na planilha de referência — duas colunas, mesmo conteúdo.
    celula(ws, `${cTipoCredito}${r}`, f(tipoCreditoFormula, naoRegular ? "Não permitido" : "Cheio"))
    celula(ws, `${cTipoCreditoIbs}${r}`, f(`${cTipoCredito}${r}`, naoRegular ? "Não permitido" : "Cheio"))

    ANOS_CREDITO.forEach(({ anoPremissa }, gi) => {
      const p = premissas.premissasPorAno[anoPremissa]
      const colAliq = colLetra(4 + gi)
      const refCbs = `$${colAliq}$${LINHA_ALIQ_CBS}`
      const refIbsUF = `$${colAliq}$${LINHA_ALIQ_IBSUF}`
      const refIbsMUN = `$${colAliq}$${LINHA_ALIQ_IBSMUN}`
      const cIbsCol = letraDe(`Crédito IBS ${ANOS_CREDITO[gi].label}`)
      const cCbsCol = letraDe(`Crédito CBS ${ANOS_CREDITO[gi].label}`)

      const aliqIbsAno = p.ibsUF + p.ibsMUN
      const creditoIbs = naoRegular ? 0 : l.vlrItem * aliqIbsAno // "Cheio" é o default quando Regular
      const creditoCbs = naoRegular ? 0 : l.vlrItem * p.cbs

      celula(ws, `${cIbsCol}${r}`, f(
        `IF(${cTipoCreditoIbs}${r}="Cheio",${cVlrItem}${r}*(${refIbsUF}+${refIbsMUN}),IF(${cTipoCreditoIbs}${r}="Alíquota reduzida em 60%",${cVlrItem}${r}*((${refIbsUF}+${refIbsMUN})*0.4),0))`,
        creditoIbs
      ), { numFmt: FMT_RS })
      celula(ws, `${cCbsCol}${r}`, f(
        `IF(${cTipoCredito}${r}="Cheio",${cVlrItem}${r}*${refCbs},IF(${cTipoCredito}${r}="Alíquota reduzida em 60%",${cVlrItem}${r}*(${refCbs}*0.4),0))`,
        creditoCbs
      ), { numFmt: FMT_RS })
      somasCredito[`Crédito IBS ${ANOS_CREDITO[gi].label}`] += creditoIbs
      somasCredito[`Crédito CBS ${ANOS_CREDITO[gi].label}`] += creditoCbs
    })
  })

  // Linha 6: SUBTOTAL(9,...) em R$ sobre cada coluna de crédito (soma só o visível com filtro),
  // logo acima da faixa azul dos anos — igual à planilha de referência
  if (linhas.length > 0) {
    const ultimaLinha = LINHA_DADOS_INICIO_ENTRADA + linhas.length - 1
    for (const nome of creditColHeaders()) {
      const col = letraDe(nome)
      celula(
        ws, `${col}${LINHA_SUBTOTAL}`,
        f(`SUBTOTAL(9,${col}${LINHA_DADOS_INICIO_ENTRADA}:${col}${ultimaLinha})`, somasCredito[nome]),
        { bold: true, numFmt: FMT_RS }
      )
    }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}
