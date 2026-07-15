import ExcelJS from "exceljs"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { colLetra } from "./coluna-letra"

// Fator de crédito pela classificação do NCM na Base IBS-CBS (mesma régua do VLOOKUP das
// fórmulas): "Cheio" = 100%, "Alíquota reduzida em 60%" = 40%, zero/não permitido = 0.
// NCM fora da base = "Cheio" (comportamento do IFERROR do modelo).
export function fatorCreditoDoTipo(tipo: string): number {
  if (tipo === "Cheio") return 1
  if (tipo === "Alíquota reduzida em 60%") return 0.4
  return 0
}

// Map NCM → Descrição Alíquota (primeira ocorrência vence, igual ao VLOOKUP)
export function tipoCreditoPorNcm(baseIbsCbs: LinhaBaseIbsCbs[]): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const l of baseIbsCbs) {
    if (l.codigoNcm && !mapa.has(l.codigoNcm)) mapa.set(l.codigoNcm, l.descricaoAliquota)
  }
  return mapa
}

// Aba "Entradas - EFD ICMS IPI" — réplica coluna a coluna da planilha-original do usuário
// (conferir.xlsx, aba "original"): dados nas colunas B..BV a partir da linha 8, tabela de
// alíquotas IBS/CBS em AG1:AO4 (anos 2026-2033, alíquotas CHEIAS), título em B5 + SUBTOTAL dos
// créditos em AG5:AR5, SUBTOTAL dos valores de documento em R6:W6 + banda de anos mesclada em
// AG6:AR6, cabeçalho na linha 7. O bloco de créditos fica no MEIO da tabela (AD..AR): coluna
// "Crédito IBS" vazia (AD — existe no original, sem dados), "Crédito CBS"/"Crédito IBS" com a
// classificação do NCM (AE/AF) e 6 pares IBS/CBS (2027 e 2028, 2029..2033).
//
// Fórmulas de crédito idênticas às do original (lidas célula a célula):
//   IBS(ano) = SE(AE="Cheio";(AT-AU)*($col$3+$col$4);SE(AE="Alíquota reduzida em 60%";
//              (AT-AU)*(($col$3+$col$4)*0,4);SE(AE="Alíquota zero";0;SE(AE="Não permitido";0;0))))
//   CBS(ano) = idem com ($col$2)
// onde col é a coluna do ano na tabela AG1:AO4 (2027 e 2028 usam a coluna de 2027) e (AT-AU) é
// Vlr Item − Vlr Desconto Item. Ambas testam AE (Crédito CBS), como no original.

const FONTE = "Calibri"
const COR_BANDA = "FFDDEBF7" // azul claro da banda de anos e dos cabeçalhos de crédito
const FMT_RS = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'
const FMT_PA = "mm-dd-yy"
const BORDA_FINA: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
}

const ANOS_CREDITO: { label: string; anoPremissa: number }[] = [
  { label: "2027 e 2028", anoPremissa: 2027 },
  { label: "2029", anoPremissa: 2029 },
  { label: "2030", anoPremissa: 2030 },
  { label: "2031", anoPremissa: 2031 },
  { label: "2032", anoPremissa: 2032 },
  { label: "2033", anoPremissa: 2033 },
]
const ANOS_TABELA = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; size?: number; fundo?: string; centralizado?: boolean; borda?: boolean; corFonte?: string }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  if (opts?.bold || opts?.corFonte) {
    cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false, color: opts?.corFonte ? { argb: opts.corFonte } : undefined }
  }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.fundo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fundo } }
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  if (opts?.borda) cell.border = BORDA_FINA
  return cell
}

// Colunas B..BW na ordem exata do original — key única (pra letraColunaEntrada) + label exibido.
// "Crédito IBS" aparece DUAS vezes (AD vazia + AF com dados) e os pares de ano exibem só
// "IBS"/"CBS" (o ano fica na banda mesclada da linha 6).
interface ColunaEntrada { key: string; label: string }
const COLUNAS: ColunaEntrada[] = [
  { key: "CNPJ", label: "CNPJ" },
  { key: "PA", label: "PA" },
  { key: "Registros", label: "Registros" },
  { key: "Indicador Emitente", label: "Indicador Emitente" },
  { key: "Situação", label: "Situação" },
  { key: "Código Participante", label: "Código Participante" },
  { key: "CNPJ/CPF Participante", label: "CNPJ/CPF Participante" },
  { key: "Regime IBS/CBS", label: "Regime IBS/CBS" },
  { key: "Nome Participante", label: "Nome Participante" },
  { key: "UF Origem/Destino", label: "UF Origem/Destino" },
  { key: "Número Documento", label: "Número Documento" },
  { key: "Série", label: "Série" },
  { key: "Modelo", label: "Modelo" },
  { key: "Chave NF-e", label: "Chave NF-e" },
  { key: "Data Documento", label: "Data Documento" },
  { key: "Data Entrada/Saída", label: "Data Entrada/Saída" },
  { key: "Vlr Documento", label: "Vlr Documento" },
  { key: "Vlr Desconto NF", label: "Vlr Desconto NF" },
  { key: "Vlr Mercadoria", label: "Vlr Mercadoria" },
  { key: "Vlr Frete", label: "Vlr Frete" },
  { key: "Vlr Seguro", label: "Vlr Seguro" },
  { key: "Vlr Outras DA", label: "Vlr Outras DA" },
  { key: "Número Item", label: "Número Item" },
  { key: "Código Item", label: "Código Item" },
  { key: "Descrição Item", label: "Descrição Item" },
  { key: "Tipo Item", label: "Tipo Item" },
  { key: "Código Barra", label: "Código Barra" },
  { key: "NCM", label: "NCM" },
  { key: "Crédito IBS vazio", label: "Crédito IBS" }, // AD — existe no original, sem dados
  { key: "Crédito CBS", label: "Crédito CBS" },
  { key: "Crédito IBS", label: "Crédito IBS" },
  ...ANOS_CREDITO.flatMap(({ label }) => [
    { key: `IBS ${label}`, label: "IBS" },
    { key: `CBS ${label}`, label: "CBS" },
  ]),
  { key: "Vlr Operação", label: "Vlr Operação" },
  { key: "Vlr Item", label: "Vlr Item" },
  { key: "Vlr Desconto Item", label: "Vlr Desconto Item" },
  { key: "Qtde", label: "Qtde" },
  { key: "Unidade Medida", label: "Unidade Medida" },
  { key: "Indicador Movimento", label: "Indicador Movimento" },
  { key: "Natureza Crédito", label: "Natureza Crédito" },
  { key: "CFOP", label: "CFOP" },
  { key: "Descrição CFOP", label: "Descrição CFOP" },
  { key: "CST ICMS", label: "CST ICMS" },
  { key: "Vlr Base Cálculo ICMS", label: "Vlr Base Cálculo ICMS" },
  { key: "Vlr Redução Base ICMS", label: "Vlr Redução Base ICMS" },
  { key: "Alíquota ICMS", label: "Alíquota ICMS" },
  { key: "Vlr ICMS", label: "Vlr ICMS" },
  { key: "Vlr Base Cálculo ICMS-ST", label: "Vlr Base Cálculo ICMS-ST" },
  { key: "Alíquota ICMS-ST", label: "Alíquota ICMS-ST" },
  { key: "Vlr ICMS-ST", label: "Vlr ICMS-ST" },
  { key: "CST IPI", label: "CST IPI" },
  { key: "Vlr Base Cálculo IPI", label: "Vlr Base Cálculo IPI" },
  { key: "Alíquota IPI", label: "Alíquota IPI" },
  { key: "Vlr IPI", label: "Vlr IPI" },
  { key: "CST PIS", label: "CST PIS" },
  { key: "Vlr Base Cálculo PIS", label: "Vlr Base Cálculo PIS" },
  { key: "Alíquota PIS", label: "Alíquota PIS" },
  { key: "Vlr PIS", label: "Vlr PIS" },
  { key: "CST Cofins", label: "CST Cofins" },
  { key: "Vlr Base Cálculo Cofins", label: "Vlr Base Cálculo Cofins" },
  { key: "Alíquota Cofins", label: "Alíquota Cofins" },
  { key: "Vlr Cofins", label: "Vlr Cofins" },
  { key: "Conta Contábil", label: "Conta Contábil" },
  { key: "", label: "" }, // BW — coluna final vazia, como no original
]

const COL_INICIO = 2 // B — igual ao original
const LINHA_TITULO = 5 // B5 "Entradas - EFD ICMS IPI" + SUBTOTAL dos créditos (AG5:AR5)
const LINHA_SUBTOTAL_DOC = 6 // SUBTOTAL de Vlr Documento..Vlr Outras DA + banda de anos
const LINHA_HEADER = 7
export const LINHA_DADOS_INICIO_ENTRADA = 8
export const LINHA_FIM_RANGE_ENTRADA = 200_000

export function letraColunaEntrada(key: string): string {
  const idx = COLUNAS.findIndex((c) => c.key === key)
  if (idx === -1) throw new Error(`Coluna "${key}" não existe no layout de Entradas`)
  return colLetra(COL_INICIO + idx)
}
const letraDe = letraColunaEntrada

// coluna da tabela de alíquotas (AG1:AO4) de um ano: AH=2026 ... AO=2033
function colTabelaAno(ano: number): string {
  return colLetra(COL_INICIO + COLUNAS.findIndex((c) => c.key === "IBS 2027 e 2028") + 1 + (ano - 2026))
}

// Descrições de CFOP de entrada — extraídas da planilha-original (conferir.xlsx)
const CFOP_ENTRADA_DESCRICOES: Record<string, string> = {
  "1101": "Compra para Industrialização ou prod rural",
  "2101": "Compra para Industrialização ou prod rural",
  "1102": "Compra para comercialização",
  "2102": "Compra para comercialização",
  "1116": "Compra para Industrialização ou prod rural originada de encomenda para recebimento futuro",
  "2116": "Compra para Industrialização ou prod rural originada de encomenda para recebimento futuro",
  "1122": "Compra para Industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador sem transitar pelo estabelecimento adquirente",
  "2122": "Compra para Industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador sem transitar pelo estabelecimento adquirente",
  "1128": "Compra para utilização na prestação de serviço sujeita ao ISSQN",
  "2128": "Compra para utilização na prestação de serviço sujeita ao ISSQN",
  "1551": "Compra de bem para o ativo imobilizado",
  "2551": "Compra de bem para o ativo imobilizado",
  "1556": "Compra de material para uso ou consumo",
  "2556": "Compra de material para uso ou consumo",
  "1653": "Compra de combustível ou lubrificante por consumidor ou usuário final",
  "2653": "Compra de combustível ou lubrificante por consumidor ou usuário final",
  "1910": "Entrada de bonificação, doação ou brinde",
  "2910": "Entrada de bonificação, doação ou brinde",
  "1911": "Entrada de amostra grátis",
  "2911": "Entrada de amostra grátis",
  "1922": "Lançamento efetuado a título de simples faturamento decorrente de compra para recebimento futuro",
  "2922": "Lançamento efetuado a título de simples faturamento decorrente de compra para recebimento futuro",
  "2916": "Retorno de mercadoria ou bem remetido para conserto ou reparo",
  "1916": "Retorno de mercadoria ou bem remetido para conserto ou reparo",
  "1949": "Outra entrada de mercadoria ou prestação de serviço não especificada",
  "2949": "Outra entrada de mercadoria ou prestação de serviço não especificada",
}

function larguraColuna(label: string): number {
  if (label === "") return 3
  if (label === "Chave NF-e") return 46
  if (label === "Nome Participante") return 30
  if (label === "Descrição Item" || label === "Descrição CFOP" || label === "Natureza Crédito") return 34
  if (label === "Registros" || label === "Tipo Item") return 24
  if (["CNPJ", "CNPJ/CPF Participante"].includes(label)) return 17
  if (["Regime IBS/CBS", "Indicador Emitente", "Código Participante", "Código Item", "Código Barra"].includes(label)) return 16
  if (["PA", "Data Documento", "Data Entrada/Saída"].includes(label)) return 12
  return 14
}

// tabela de fornecedores (CNPJ → Regime), fonte do VLOOKUP da coluna "Regime IBS/CBS" — fica em
// BY/BZ, FORA do layout de dados (que agora vai até BW)
const COL_FORN_CNPJ = "BY"
const COL_FORN_REGIME = "BZ"
const LINHA_FORN_INICIO = 2

export function montarAbaEntradasEfd(
  wb: ExcelJS.Workbook,
  linhas: LinhaEntradaEfd[],
  classificacoes: Record<string, ResultadoConsultaCnpj>,
  premissas: PremissasReformaData,
  baseIbsCbs: LinhaBaseIbsCbs[] = []
) {
  const tipoPorNcm = tipoCreditoPorNcm(baseIbsCbs)
  const ws = wb.addWorksheet("Entradas - EFD ICMS IPI", { views: [{ showGridLines: false }] })
  // Colunas R..W (Vlr Documento..Vlr Outras DA): formato contábil nas linhas E nos subtotais
  // (linha 6), a pedido do usuário — o estilo de coluna cobre os dois
  const COLS_DOC_RS = new Set(["Vlr Documento", "Vlr Desconto NF", "Vlr Mercadoria", "Vlr Frete", "Vlr Seguro", "Vlr Outras DA"])
  // formatos por COLUNA (PA como data, créditos em R$) — memória e consistência
  ws.columns = [
    { width: 3 },
    ...COLUNAS.map((c) => {
      if (c.key === "PA") return { width: larguraColuna(c.label), style: { numFmt: FMT_PA } }
      if (c.key.startsWith("IBS ") || c.key.startsWith("CBS ")) return { width: larguraColuna(c.label), style: { numFmt: FMT_RS } }
      if (COLS_DOC_RS.has(c.key)) return { width: 18, style: { numFmt: FMT_RS } }
      return { width: larguraColuna(c.label) }
    }),
  ]

  // Tabela de alíquotas AG1:AO4 — anos 2026-2033 com as alíquotas CHEIAS da premissa (a redução
  // por classificação do NCM entra na fórmula de crédito, não aqui)
  // Fonte BRANCA em toda a tabela (linhas 1-4): os valores continuam lá (as fórmulas de crédito
  // apontam pra eles), mas ficam invisíveis pra quem abre a planilha — pedido do usuário
  const BRANCO = "FFFFFFFF"
  const colRotulo = letraDe("IBS 2027 e 2028") // AG
  celula(ws, `${colRotulo}1`, "IBS/CBS", { bold: true, corFonte: BRANCO })
  celula(ws, `${colRotulo}2`, "ALIQ. CBS", { bold: true, corFonte: BRANCO })
  celula(ws, `${colRotulo}3`, "ALIQ. IBS UF", { bold: true, corFonte: BRANCO })
  celula(ws, `${colRotulo}4`, "ALIQ. IBS MUN", { bold: true, corFonte: BRANCO })
  for (const ano of ANOS_TABELA) {
    const p = premissas.premissasPorAno[ano]
    const col = colTabelaAno(ano)
    celula(ws, `${col}1`, ano, { bold: true, centralizado: true, numFmt: "General", corFonte: BRANCO })
    celula(ws, `${col}2`, p.cbs, { numFmt: "0.00%", corFonte: BRANCO })
    celula(ws, `${col}3`, p.ibsUF, { numFmt: "0.00%", corFonte: BRANCO })
    celula(ws, `${col}4`, p.ibsMUN, { numFmt: "0.00%", corFonte: BRANCO })
  }

  celula(ws, "B5", "Entradas - EFD ICMS IPI", { bold: true })

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

  // Banda de anos (linha 6): rótulo mesclado sobre cada par IBS/CBS, azul claro
  for (const { label } of ANOS_CREDITO) {
    const cIbs = letraDe(`IBS ${label}`)
    const cCbs = letraDe(`CBS ${label}`)
    ws.mergeCells(`${cIbs}${LINHA_SUBTOTAL_DOC}:${cCbs}${LINHA_SUBTOTAL_DOC}`)
    celula(ws, `${cIbs}${LINHA_SUBTOTAL_DOC}`, /^\d+$/.test(label) ? Number(label) : label, {
      bold: true, centralizado: true, fundo: COR_BANDA, borda: true, numFmt: "General",
    })
  }

  // Cabeçalho (linha 7): negrito; azul claro de "Crédito CBS" (AE) até o último "CBS" (AR) —
  // a coluna "Crédito IBS" vazia (AD) fica sem fundo, como no original
  COLUNAS.forEach((c, i) => {
    if (c.label === "") return
    const ref = `${colLetra(COL_INICIO + i)}${LINHA_HEADER}`
    const noBlocoCredito = c.key === "Crédito CBS" || c.key === "Crédito IBS" || c.key.startsWith("IBS ") || c.key.startsWith("CBS ")
    if (noBlocoCredito) celula(ws, ref, c.label, { bold: true, centralizado: true, fundo: COR_BANDA, borda: true })
    else celula(ws, ref, c.label, { bold: true })
  })

  const cH = letraDe("CNPJ/CPF Participante"), cI = letraDe("Regime IBS/CBS"), cAC = letraDe("NCM"),
    cAE = letraDe("Crédito CBS"), cAF = letraDe("Crédito IBS"),
    cAT = letraDe("Vlr Item"), cAU = letraDe("Vlr Desconto Item")

  // "YYYY-MM" → Date 1º do mês (PA como data, formato mm-dd-yy — igual ao original)
  const paParaData = (pa: string): Date | string => {
    const m = /^(\d{4})-(\d{2})$/.exec(pa)
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : pa
  }

  const somasCredito: Record<string, number> = {}
  for (const { label } of ANOS_CREDITO) {
    somasCredito[`IBS ${label}`] = 0
    somasCredito[`CBS ${label}`] = 0
  }
  const somasDoc: Record<string, number> = {
    "Vlr Documento": 0, "Vlr Desconto NF": 0, "Vlr Mercadoria": 0, "Vlr Frete": 0, "Vlr Seguro": 0, "Vlr Outras DA": 0,
  }

  linhas.forEach((l, i) => {
    const r = LINHA_DADOS_INICIO_ENTRADA + i
    // valores brutos na ordem de COLUNAS (null = célula vazia; fórmulas entram depois)
    const raw: (string | number | Date | null)[] = [
      l.cnpj, paParaData(l.pa), l.registros, l.indicadorEmitente, l.situacao || null,
      l.codigoParticipante || null, l.cnpjFornecedor || l.cpfFornecedor || null,
      null /* Regime IBS/CBS — fórmula */,
      l.nomeFornecedor || null,
      l.ufFornecedor ? `${l.ufFornecedor}/${l.ufPropria || l.ufFornecedor}` : null,
      l.numeroDocumento || null, l.serie || null, l.modelo || null, l.chaveNFe || null,
      l.dataDocumento || null, l.dataEntradaSaida || null,
      l.vlrDocumento, l.vlrDescontoNF, l.vlrMercadoria, l.vlrFrete, l.vlrSeguro, l.vlrOutrasDA,
      l.numeroItem || null, l.codigoItem || null, l.descricaoItem || null, l.tipoItem || null,
      l.codigoBarra || null, l.ncm || null,
      null /* Crédito IBS vazio (AD) */, null /* Crédito CBS — fórmula */, null /* Crédito IBS — fórmula */,
      ...ANOS_CREDITO.flatMap(() => [null, null]) /* pares IBS/CBS — fórmulas */,
      null /* Vlr Operação — vazio no original */,
      l.vlrItem, l.vlrDescontoItem, l.qtde, l.unidadeMedida || null, l.indicadorMovimento || null,
      l.naturezaCredito || null, l.cfop || null, CFOP_ENTRADA_DESCRICOES[l.cfop] ?? null,
      l.cstIcms || null, l.vlrBaseCalculoIcms, null /* Vlr Redução Base ICMS — vazio */,
      l.aliquotaIcms, l.vlrIcms, l.vlrBaseCalculoIcmsSt, l.aliquotaIcmsSt, l.vlrIcmsSt,
      l.cstIpi || null, l.vlrBaseCalculoIpi, l.aliquotaIpi, l.vlrIpi,
      l.cstPis || null, l.vlrBaseCalculoPis, l.aliquotaPis, l.vlrPis,
      l.cstCofins || null, l.vlrBaseCalculoCofins, l.aliquotaCofins, l.vlrCofins,
      l.contaContabil || null, null,
    ]
    raw.forEach((v, ci) => {
      if (v === null) return
      ws.getCell(r, COL_INICIO + ci).value = v
    })

    const classificacao = classificacoes[l.cnpjFornecedor]
    const regimeCalculado = classificacao?.erro ? "Não classificado" : classificacao?.simplesNacional ? "Simples Nacional" : "Regime Regular"
    celula(ws, `${cI}${r}`, f(
      `IFERROR(VLOOKUP(${cH}${r},$${COL_FORN_CNPJ}$${LINHA_FORN_INICIO}:$${COL_FORN_REGIME}$${linhaFornFim},2,FALSE),"Não classificado")`,
      regimeCalculado
    ))

    const tipoCreditoFormula = `IFERROR(IF(${cI}${r}="Regime Regular",VLOOKUP(${cAC}${r},'Base IBS-CBS'!$H:$K,4,FALSE),"Não permitido"),"Cheio")`
    const naoRegular = regimeCalculado !== "Regime Regular"
    // cache = MESMA régua do VLOOKUP: classificação do NCM na Base IBS-CBS (Cheio/reduzida
    // 60%/zero/não permitido), "Cheio" quando o NCM não está na base — sem isso o valor
    // congelado divergia do recalculado pelo Excel (e o Excel do cliente, sem fórmulas,
    // congelava crédito superestimado)
    const tipoCache = naoRegular ? "Não permitido" : (tipoPorNcm.get(l.ncm) ?? "Cheio")
    const fatorCredito = naoRegular ? 0 : fatorCreditoDoTipo(tipoCache)
    celula(ws, `${cAE}${r}`, f(tipoCreditoFormula, tipoCache))
    celula(ws, `${cAF}${r}`, f(tipoCreditoFormula, tipoCache))

    const base = l.vlrItem - l.vlrDescontoItem
    for (const { label, anoPremissa } of ANOS_CREDITO) {
      const p = premissas.premissasPorAno[anoPremissa]
      const colT = colTabelaAno(anoPremissa)
      const cIbsCol = letraDe(`IBS ${label}`)
      const cCbsCol = letraDe(`CBS ${label}`)
      const creditoIbs = base * (p.ibsUF + p.ibsMUN) * fatorCredito
      const creditoCbs = base * p.cbs * fatorCredito
      // fórmulas idênticas às do original (IFs aninhados, ambas testam AE)
      celula(ws, `${cIbsCol}${r}`, f(
        `IF(${cAE}${r}="Cheio",(${cAT}${r}-${cAU}${r})*($${colT}$3+$${colT}$4),IF(${cAE}${r}="Alíquota reduzida em 60%",(${cAT}${r}-${cAU}${r})*(($${colT}$3+$${colT}$4)*0.4),IF(${cAE}${r}="Alíquota zero",0,IF(${cAE}${r}="Não permitido",0,0))))`,
        creditoIbs
      ))
      celula(ws, `${cCbsCol}${r}`, f(
        `IF(${cAE}${r}="Cheio",(${cAT}${r}-${cAU}${r})*($${colT}$2),IF(${cAE}${r}="Alíquota reduzida em 60%",(${cAT}${r}-${cAU}${r})*(($${colT}$2)*0.4),IF(${cAE}${r}="Alíquota zero",0,IF(${cAE}${r}="Não permitido",0,0))))`,
        creditoCbs
      ))
      somasCredito[`IBS ${label}`] += creditoIbs
      somasCredito[`CBS ${label}`] += creditoCbs
    }

    somasDoc["Vlr Documento"] += l.vlrDocumento
    somasDoc["Vlr Desconto NF"] += l.vlrDescontoNF
    somasDoc["Vlr Mercadoria"] += l.vlrMercadoria
    somasDoc["Vlr Frete"] += l.vlrFrete
    somasDoc["Vlr Seguro"] += l.vlrSeguro
    somasDoc["Vlr Outras DA"] += l.vlrOutrasDA
  })

  // SUBTOTAIS (como no original): créditos na linha 5 (R$), valores de documento na linha 6
  if (linhas.length > 0) {
    const ultimaLinha = LINHA_DADOS_INICIO_ENTRADA + linhas.length - 1
    for (const { label } of ANOS_CREDITO) {
      for (const key of [`IBS ${label}`, `CBS ${label}`]) {
        const col = letraDe(key)
        celula(
          ws, `${col}${LINHA_TITULO}`,
          f(`SUBTOTAL(9,${col}${LINHA_DADOS_INICIO_ENTRADA}:${col}${ultimaLinha})`, somasCredito[key]),
          { numFmt: FMT_RS }
        )
      }
    }
    for (const key of Object.keys(somasDoc)) {
      const col = letraDe(key)
      celula(
        ws, `${col}${LINHA_SUBTOTAL_DOC}`,
        f(`SUBTOTAL(9,${col}${LINHA_DADOS_INICIO_ENTRADA}:${col}${ultimaLinha})`, somasDoc[key])
      )
    }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}
