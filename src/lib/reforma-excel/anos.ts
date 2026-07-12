import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { colLetra } from "./coluna-letra"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS } from "./calculo-linha-ano"
import { yieldToEventLoop } from "./yield"

// Gera as abas de ano (2026, "2027 e 2028", 2029...2033) — a peça central do Excel de entrega.
// Cada aba recebe o MESMO conjunto de linhas de saída (Passo 5 do wizard) e recalcula o imposto
// sob a premissa daquele ano — é uma simulação "e se essas mesmas notas tivessem ocorrido sob
// este regime", não um filtro por data real. "2027 e 2028" usa a premissa de 2027 (ambos os anos
// têm a mesma alíquota, ver Premissas).
//
// LAYOUT FIEL AO EXCEL-MODELO ("Reforma_Tributária - Art Farma vff.xlsx", aba 2026), extraído
// célula a célula: dados começam na coluna B, linha 8; título em B5; linha 6 = SUBTOTALs (com
// "X" nas colunas Frete/Seguro/Outras DA/Tipo Item); cabeçalho na linha 7; coluna "id" (fórmula
// =Chave&VlrDoc) entre Chave NF-e e Data Documento; coluna BI vazia separa dado bruto das
// colunas calculadas. Única diferença deliberada: todas as 7 abas usam o MESMO layout (no modelo
// as letras variam levemente entre abas — sem motivo pra herdar a inconsistência num arquivo
// gerado do zero).

const FONTE = "Calibri"

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

export interface AbaAno {
  label: string
  anoPremissa: number
}

export const ABAS_ANO: AbaAno[] = [
  { label: "2026", anoPremissa: 2026 },
  { label: "2027 e 2028", anoPremissa: 2027 },
  { label: "2029", anoPremissa: 2029 },
  { label: "2030", anoPremissa: 2030 },
  { label: "2031", anoPremissa: 2031 },
  { label: "2032", anoPremissa: 2032 },
  { label: "2033", anoPremissa: 2033 },
]

// Colunas B-BH (dado bruto do EFD, incluindo a coluna calculada "id") — ordem idêntica ao modelo
const RAW_HEADERS = [
  "CNPJ", "PA", "Empresa", "Registros", "Modelo", "Situação", "Código Participante",
  "CNPJ Participante", "CPF Participante", "Nome Participante", "UF Origem/Destino",
  "Número Documento", "Série", "Chave NF-e", "id", "Data Documento", "Data Entrada/Saída",
  "Vlr Documento", "Vlr Desconto NF", "Vlr Mercadoria/Operação", "Vlr Frete", "Vlr Seguro",
  "Vlr Outras DA", "Número Item", "Código Item", "Descrição Complementar", "Descrição Item",
  "NCM", "Código Serviço", "Código Barra", "Documento", "Tipo Item", "Vlr Item", "Qtde",
  "Unidade Medida", "Vlr Desconto Item", "CFOP", "Descrição CFOP", "Faturamento", "Natureza",
  "Alíquota ISS", "Vlr ISS", "Alíquota ICMS", "Vlr ICMS", "Vlr ICMS-ST", "Vlr IPI", "CST PIS",
  "Vlr Base Cálculo PIS", "Qtde Base Cálculo PIS", "Alíquota PIS", "Qtde Alíquota PIS", "Vlr PIS",
  "CST Cofins", "Vlr Base Cálculo Cofins", "Qtde Base Cálculo Cofins", "Alíquota Cofins",
  "Qtde Alíquota Cofins", "Vlr Cofins", "Conta Contábil", "",
] as const

// Colunas BJ em diante — a cadeia de fórmulas (ver docs/reforma-tributaria-v2.md)
const CALC_HEADERS = [
  "VALOR SEM TRIBUTO", "BASE PIS COFINS", "VLR PIS", "VLR COFINS", "VLR PIS + COFINS",
  "BASE ICMS FINANCE", "ICMS", "BASE ISS FINANCE", "ISS", "VLR PIS + COFINS + ISS",
  "DIF VALOR PRODUTO", "BASE IBS/CBS", "IBS", "CBS", "TOTAL NF FINANCE", "TOTAL NF CLIENTE", "DIF",
] as const

const TODOS_HEADERS = [...RAW_HEADERS, ...CALC_HEADERS]
export const COL_INICIO_ANO = 2 // B — igual ao modelo
const LINHA_SUBTOTAL = 6
const LINHA_HEADER = 7
export const LINHA_DADOS_INICIO_ANO = 8

// Formatos numéricos — copiados do Excel-modelo
const FMT_CONTABIL_RS = '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'
const FMT_CONTABIL = '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-'
// linha de subtotal: negativo em vermelho, como na planilha-modelo
const FMT_CONTABIL_RS_SUBTOTAL = '_-"R$" * #,##0.00_-;[Red]-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-'
const FMT_PA = "mm-dd-yy"

// Largura de coluna por tipo de conteúdo — sem isso o ExcelJS usa a largura padrão (~8,43
// caracteres) e cabeçalhos/valores longos ficam cortados (chave de NF-e, nomes, descrições).
function larguraColuna(nome: string): number {
  if (nome === "") return 3
  if (nome === "Chave NF-e") return 46
  if (nome === "id") return 18
  if (nome === "Nome Participante" || nome === "Empresa") return 28
  if (nome === "Registros") return 32
  if (nome === "Descrição Complementar" || nome === "Descrição Item" || nome === "Descrição CFOP") return 30
  if (nome === "Documento" || nome === "Tipo Item") return 26
  if (nome === "CNPJ" || nome === "CNPJ Participante" || nome === "CPF Participante") return 17
  if (nome === "UF Origem/Destino") return 10
  if (nome === "PA" || nome === "Data Documento" || nome === "Data Entrada/Saída") return 12
  if (["Número Documento", "Código Participante", "Código Item", "Código Serviço", "Código Barra"].includes(nome)) return 14
  if (nome.startsWith("Alíquota")) return 11
  if (nome.startsWith("Qtde")) return 10
  if (nome === "CFOP") return 8
  if (["CST PIS", "CST Cofins", "Modelo", "Situação", "Série"].includes(nome)) return 9
  if (nome === "NCM") return 11
  if (nome === "Unidade Medida") return 11
  return 14 // colunas de valor (Vlr *, e todas as CALC_HEADERS)
}

// Colunas com SUBTOTAL(9,...) na linha 6 — conjunto EXATO do Excel-modelo (linha 6 da aba 2026;
// note que o modelo não subtotaliza Qtde, Vlr Mercadoria, Vlr ICMS-ST nem BASE ISS FINANCE)
const COLUNAS_SUBTOTAL = [
  "Vlr Documento", "Vlr Desconto NF", "Vlr Item", "Vlr Desconto Item", "Vlr ISS", "Vlr ICMS",
  "Vlr IPI", "Vlr Base Cálculo PIS", "Vlr PIS", "Vlr Base Cálculo Cofins", "Vlr Cofins",
  "VALOR SEM TRIBUTO", "BASE PIS COFINS", "VLR PIS", "VLR COFINS", "VLR PIS + COFINS",
  "BASE ICMS FINANCE", "ICMS", "ISS", "VLR PIS + COFINS + ISS", "DIF VALOR PRODUTO",
  "BASE IBS/CBS", "IBS", "CBS", "TOTAL NF FINANCE", "TOTAL NF CLIENTE", "DIF",
] as const
// Colunas marcadas com "X" na linha 6 do modelo (não somáveis, marcador visual de conferência)
const COLUNAS_X = ["Vlr Frete", "Vlr Seguro", "Vlr Outras DA", "Tipo Item"] as const

// margem generosa de linhas nas fórmulas cross-sheet (Valor Total NF-e, Quadro Comparativo) —
// mesmo espírito do "BJ8:BJ999999" do Excel-modelo, cobre reimportações futuras sem quebrar
export const LINHA_FIM_RANGE_ANO = 200_000

// Letra da coluna de um campo das abas de ano — exportada pra Valor Total NF-e e Quadro
// Comparativo (Fase 4) referenciarem as mesmas colunas sem duplicar a lista de headers.
export function letraColunaAno(nomeCampo: string): string {
  const idx = TODOS_HEADERS.indexOf(nomeCampo as (typeof TODOS_HEADERS)[number])
  if (idx === -1) throw new Error(`Coluna "${nomeCampo}" não existe no layout das abas de ano`)
  return colLetra(COL_INICIO_ANO + idx)
}
const letraDe = letraColunaAno

const CFOP_DESCRICOES: Record<string, string> = {
  "5101": "Venda de produção do estabelecimento",
  "5102": "Venda de mercadoria adquirida ou recebida de terceiros",
  "5405": "Venda de mercadoria sujeita a ST",
  "6101": "Venda de produção do estabelecimento (fora do estado)",
  "6102": "Venda de mercadoria adquirida ou recebida de terceiros (fora do estado)",
}

// Cores do Excel-modelo (primeira imagem de referência do usuário)
const COR_LARANJA = "FFFFC000" // headers das colunas FINANCE + barra DÉBITO
const COR_VERMELHO = "FFFF0000" // headers BASE IBS/CBS, IBS, CBS e DIF
const COR_AZUL_ANO = "FF5B9BD5" // barra do ano (2026...) sobre o bloco DÉBITO
const COR_GUIA_ANO = "FF9DC3E6" // azul claro das guias das abas de ano
export const COR_GUIA_PREMISSAS = "FFFFC000" // amarelo alaranjado (Premissas/Legislações)

// Headers de coluna calculada com fundo laranja (bloco FINANCE + totais); o restante das
// calculadas (BASE IBS/CBS, IBS, CBS, DIF) é vermelho com fonte branca
const HEADERS_LARANJA = new Set<string>([
  "VALOR SEM TRIBUTO", "BASE PIS COFINS", "VLR PIS", "VLR COFINS", "VLR PIS + COFINS",
  "BASE ICMS FINANCE", "ICMS", "BASE ISS FINANCE", "ISS", "VLR PIS + COFINS + ISS",
  "DIF VALOR PRODUTO", "TOTAL NF FINANCE", "TOTAL NF CLIENTE",
])
const HEADERS_VERMELHO = new Set<string>(["BASE IBS/CBS", "IBS", "CBS", "DIF"])

function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; centralizado?: boolean; fundo?: string; corFonte?: string }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: 11, bold: opts?.bold ?? false, color: opts?.corFonte ? { argb: opts.corFonte } : undefined }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  if (opts?.fundo) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fundo } }
  return cell
}

// "2025-09" → Date de 1º do mês (PA no modelo é data de verdade, formatada mm-dd-yy)
function paParaData(pa: string): Date | string {
  const m = /^(\d{4})-(\d{2})$/.exec(pa)
  if (!m) return pa
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
}

// Literal de percentual pra fórmula (padrão do modelo: =BU8*0.9%) — sem zeros sobrando
function pctLiteral(aliquotaDecimal: number): string {
  const pct = aliquotaDecimal * 100
  return `${parseFloat(pct.toFixed(6))}%`
}

// Valores brutos B..BH na ordem de RAW_HEADERS; null = célula vazia (modelo deixa em branco).
// As colunas id / Alíquota ISS / Vlr ISS entram como null aqui e são escritas como FÓRMULA
// logo depois (ver montarAbaAno). Datas (PA) e formatos são aplicados na escrita.
function rawRowValues(l: LinhaSaidaEfd): (string | number | Date | null)[] {
  const descricaoCfop = (CFOP_DESCRICOES[l.cfop] ?? "").slice(0, 50) // modelo trunca em 50 chars
  return [
    l.cnpj, paParaData(l.pa), l.empresa, l.registros,
    l.modelo || null, l.situacao || null, l.codigoParticipante || null,
    l.cnpjParticipante || null, l.cpfParticipante || null, l.nomeParticipante || null,
    l.ufOrigemDestino || null, l.numeroDocumento || null, l.serie || null, l.chaveNFe || null,
    null /* id — fórmula =Chave&VlrDoc */,
    l.dataDocumento || null, l.dataEntradaSaida || null,
    l.vlrDocumento, l.vlrDescontoNF, l.vlrMercadoriaOperacao, l.vlrFrete, l.vlrSeguro,
    l.vlrOutrasDA, l.numeroItem || null, l.codigoItem || null, l.descricaoComplementar || null,
    l.descricaoItem || null, l.ncm || null, l.codigoServico || null, l.codigoBarra || null,
    l.documento, l.tipoItem, l.vlrItem, l.qtde, l.unidadeMedida || null,
    l.vlrDescontoItem, l.cfop || null, descricaoCfop || null, l.faturamento || null, l.natureza || null,
    null /* Alíquota ISS — fórmula IF(Tipo Item="09 Serviços",premissa,0) */,
    null /* Vlr ISS — fórmula =Vlr Item × Alíquota ISS */,
    null /* Alíquota ICMS — premissa constante (DANFE) ou 0 (NFS), escrita após o raw */,
    l.vlrIcms, 0, 0, l.cstPis || null,
    l.vlrBaseCalculoPis, null, l.aliquotaPis, null, l.vlrPis,
    l.cstCofins || null, l.vlrBaseCalculoCofins, null, l.aliquotaCofins, null, l.vlrCofins,
    l.contaContabil || null, null,
  ]
}

export async function montarAbaAno(
  wb: ExcelJS.Workbook,
  aba: AbaAno,
  linhas: LinhaSaidaEfd[],
  premissas: PremissasReformaData,
  onProgress?: (linhaAtual: number, totalLinhas: number) => void
) {
  const ws = wb.addWorksheet(aba.label, { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: COR_GUIA_ANO } // azul claro nas guias dos anos
  ws.columns = [{ width: 3 }, ...TODOS_HEADERS.map((nome) => ({ width: larguraColuna(nome) }))]
  const p = premissas.premissasPorAno[aba.anoPremissa]
  const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
  // ICMS/ISS reduzem gradualmente 2029-2033 (aba Premissas, tabela "ICMS e ISS") — a alíquota que
  // efetivamente incide na linha já sai daqui multiplicada pelo fator do ano; 2026-2028 = 100%
  const fatorReducaoIcmsIss = REDUCAO_ICMS_ISS[aba.anoPremissa] ?? 1
  const aliqIss = p.aliquotaISS * fatorReducaoIcmsIss
  // A partir de 2027 a CBS substitui PIS/COFINS: BASE PIS COFINS vira 0 (e VLR PIS/VLR COFINS/
  // VLR PIS + COFINS zeram por consequência, já que referenciam a base) — 2026 é o único ano em
  // que PIS/COFINS convive com IBS/CBS de teste
  const pisCofinsZerado = aba.anoPremissa >= 2027
  // Alíquota ICMS = PREMISSA constante (modal do estado, ex: 22,5%) em toda linha DANFE, 0 nas
  // NFS — exatamente como o Excel-modelo, que ignora a alíquota por item do EFD nessa coluna
  const aliqIcmsPremissa = (premissas.aliquotaICMS ?? 0.225) * fatorReducaoIcmsIss
  const issLiteral = pctLiteral(aliqIss) // vai dentro da fórmula da coluna Alíquota ISS
  const ibsLiteral = pctLiteral(aliqIbs)
  const cbsLiteral = pctLiteral(aliqCbs)

  // letras usadas nas fórmulas (nomes de variável = letras da aba "2026" do modelo, por leitura)
  const cAG = letraDe("Tipo Item"), cAH = letraDe("Vlr Item"), cAK = letraDe("Vlr Desconto Item"),
    cAP = letraDe("Alíquota ISS"), cAQ = letraDe("Vlr ISS"), cAR = letraDe("Alíquota ICMS"),
    cAS = letraDe("Vlr ICMS"), cAY = letraDe("Alíquota PIS"), cBA = letraDe("Vlr PIS"),
    cBE = letraDe("Alíquota Cofins"), cBG = letraDe("Vlr Cofins"),
    cO = letraDe("Chave NF-e"), cP = letraDe("id"), cS = letraDe("Vlr Documento")
  const cBJ = letraDe("VALOR SEM TRIBUTO"), cBK = letraDe("BASE PIS COFINS"), cBL = letraDe("VLR PIS"),
    cBM = letraDe("VLR COFINS"), cBN = letraDe("VLR PIS + COFINS"), cBO = letraDe("BASE ICMS FINANCE"),
    cBP = letraDe("ICMS"), cBQ = letraDe("BASE ISS FINANCE"), cBR = letraDe("ISS"),
    cBU = letraDe("BASE IBS/CBS"), cBV = letraDe("IBS"), cBW = letraDe("CBS"),
    cBX = letraDe("TOTAL NF FINANCE"), cBY = letraDe("TOTAL NF CLIENTE")

  // Cabeçalho da aba — réplica do modelo (linhas 2-5): rótulos de documento em AH2/AH3, alíquota
  // efetiva IBS+CBS em BU3, o ano em BU4, título em B5, "FINANCE" e "DÉBITO" sobre as colunas
  // calculadas na linha 5.
  const ultimaLinhaDados = LINHA_DADOS_INICIO_ANO + Math.max(linhas.length, 1) - 1
  celula(ws, `${cAH}2`, "Nota Fiscal de Mercadoria (DANFE)")
  celula(ws, `${cAH}3`, "Nota Fiscal de Serviço (NFS)")
  // Bloco DÉBITO (BASE IBS/CBS..CBS): alíquota efetiva em cima, barra azul do ano, barra amarela
  ws.mergeCells(`${cBU}3:${cBW}3`)
  celula(ws, `${cBU}3`, f(`IFERROR((${cBW}${LINHA_SUBTOTAL}+${cBV}${LINHA_SUBTOTAL})/${cBU}${LINHA_SUBTOTAL},0)`, aliqIbs + aliqCbs), { numFmt: "0.00%", bold: true, centralizado: true })
  ws.mergeCells(`${cBU}4:${cBW}4`)
  celula(ws, `${cBU}4`, /^\d+$/.test(aba.label) ? Number(aba.label) : aba.label, { bold: true, centralizado: true, fundo: COR_AZUL_ANO })
  ws.mergeCells(`${cBU}5:${cBW}5`)
  celula(ws, `${cBU}5`, "DÉBITO", { bold: true, centralizado: true, fundo: COR_LARANJA })
  celula(ws, "B5", "Saídas - EFD Contribuições", { bold: true })
  ws.mergeCells(`${cBJ}5:${letraDe("DIF VALOR PRODUTO")}5`)
  celula(ws, `${cBJ}5`, "FINANCE", { bold: true, centralizado: true })

  TODOS_HEADERS.forEach((nome, i) => {
    if (nome === "") return
    const ref = `${colLetra(COL_INICIO_ANO + i)}${LINHA_HEADER}`
    if (HEADERS_LARANJA.has(nome)) celula(ws, ref, nome, { bold: true, centralizado: true, fundo: COR_LARANJA })
    else if (HEADERS_VERMELHO.has(nome)) celula(ws, ref, nome, { bold: true, centralizado: true, fundo: COR_VERMELHO, corFonte: "FFFFFFFF" })
    else celula(ws, ref, nome, { bold: true, centralizado: true })
  })

  const somasSubtotal: Record<string, number> = {}
  for (const nome of COLUNAS_SUBTOTAL) somasSubtotal[nome] = 0

  const idxNumFmt = new Map<string, string>([
    [letraDe("PA"), FMT_PA],
    [cS, FMT_CONTABIL_RS],
    [letraDe("Vlr Desconto NF"), FMT_CONTABIL_RS],
  ])

  const TAMANHO_LOTE = 500 // cede o event loop e reporta progresso a cada N linhas
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    const r = LINHA_DADOS_INICIO_ANO + i
    const raw = rawRowValues(l)
    raw.forEach((v, ci) => {
      if (v === null) return
      const cell = ws.getCell(r, COL_INICIO_ANO + ci)
      cell.value = v
      cell.font = { name: FONTE, size: 11 }
      const fmt = idxNumFmt.get(colLetra(COL_INICIO_ANO + ci))
      if (fmt) cell.numFmt = fmt
    })

    // Alíquota ICMS: premissa constante pra DANFE, 0 pra NFS (já reduzida pelo fator do ano)
    const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcmsPremissa : 0
    celula(ws, `${cAR}${r}`, aliqIcmsLinha, { numFmt: aliqIcmsLinha === 0 ? "0%" : "0.0%" })

    // cadeia de cálculo em JS (compartilhada com Valor Total NF-e/Quadro Comparativo) — alimenta
    // o "result" em cache de cada fórmula, pro Excel abrir já mostrando os valores certos
    const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, pisCofinsZerado)

    // fórmulas idênticas ao modelo, célula a célula (aba 2026, linha 8)
    // F550 é consolidação sem Vlr Item por linha — VALOR SEM TRIBUTO e TOTAL NF CLIENTE partem
    // do Vlr Documento (coluna S) nessas linhas; nas demais, do Vlr Item (AH), como no modelo
    const cValorBase = l.registros.startsWith("F550") ? cS : cAH
    celula(ws, `${cP}${r}`, f(`${cO}${r}&${cS}${r}`, `${l.chaveNFe}${String(l.vlrDocumento).replace(".", ",")}`))
    celula(ws, `${cAP}${r}`, f(`IF(${cAG}${r}="09 Serviços",${issLiteral},0)`, c.aliqIssLinha), { numFmt: "0.00%" })
    celula(ws, `${cAQ}${r}`, f(`${cAH}${r}*${cAP}${r}`, c.vlrIss), { numFmt: FMT_CONTABIL_RS })
    celula(ws, `${cBJ}${r}`, f(`${cValorBase}${r}-${cAK}${r}-${cAS}${r}-${cBA}${r}-${cBG}${r}-${cAQ}${r}`, c.vlrSemTributo), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBK}${r}`, pisCofinsZerado ? f("0", 0) : f(`${cBJ}${r}/(1-${cAY}${r}%-${cBE}${r}%)`, c.basePisCofins), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBL}${r}`, f(`${cBK}${r}*${cAY}${r}%`, c.vlrPis), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBM}${r}`, f(`${cBK}${r}*${cBE}${r}%`, c.vlrCofins), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBN}${r}`, f(`${cBL}${r}+${cBM}${r}`, c.vlrPisCofins), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBO}${r}`, f(`IF(${cAG}${r}="09 Serviços",0,(${cBJ}${r}+${cBL}${r}+${cBM}${r})/(1-${cAR}${r}%))`, c.baseIcmsFinance), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBP}${r}`, f(`${cBO}${r}*${cAR}${r}%`, c.icms), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBQ}${r}`, f(`IF(${cAG}${r}="09 Serviços",(${cBJ}${r}+${cBL}${r}+${cBM}${r})/(1-${cAP}${r}),0)`, c.baseIssFinance), { numFmt: FMT_CONTABIL_RS })
    celula(ws, `${cBR}${r}`, f(`${cBQ}${r}*${cAP}${r}`, c.iss), { numFmt: FMT_CONTABIL })
    celula(ws, `${letraDe("VLR PIS + COFINS + ISS")}${r}`, f(`${cBR}${r}+${cBN}${r}`, c.vlrPisCofinsIss), { numFmt: FMT_CONTABIL })
    celula(ws, `${letraDe("DIF VALOR PRODUTO")}${r}`, f(`${cBQ}${r}-${cBO}${r}-${cBJ}${r}`, c.difValorProduto), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBU}${r}`, f(`${cBJ}${r}`, c.baseIbsCbs), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBV}${r}`, f(`${cBU}${r}*${ibsLiteral}`, c.ibs), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBW}${r}`, f(`${cBU}${r}*${cbsLiteral}`, c.cbs), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBX}${r}`, f(`${cBO}${r}+${cBQ}${r}`, c.totalNfFinance), { numFmt: FMT_CONTABIL })
    celula(ws, `${cBY}${r}`, f(`${cValorBase}${r}-${cAK}${r}`, c.totalNfCliente), { numFmt: FMT_CONTABIL })
    celula(ws, `${letraDe("DIF")}${r}`, f(`${cBY}${r}-${cBX}${r}`, c.dif), { numFmt: FMT_CONTABIL })

    // acumula pra linha de SUBTOTAL (escrita depois do loop, quando já sabemos o total de linhas)
    const valoresLinha: Record<string, number> = {
      "Vlr Documento": l.vlrDocumento, "Vlr Desconto NF": l.vlrDescontoNF,
      "Vlr Item": l.vlrItem, "Vlr Desconto Item": l.vlrDescontoItem, "Vlr ISS": c.vlrIss,
      "Vlr ICMS": l.vlrIcms, "Vlr IPI": 0,
      "Vlr Base Cálculo PIS": l.vlrBaseCalculoPis, "Vlr PIS": l.vlrPis,
      "Vlr Base Cálculo Cofins": l.vlrBaseCalculoCofins, "Vlr Cofins": l.vlrCofins,
      "VALOR SEM TRIBUTO": c.vlrSemTributo, "BASE PIS COFINS": c.basePisCofins,
      "VLR PIS": c.vlrPis, "VLR COFINS": c.vlrCofins, "VLR PIS + COFINS": c.vlrPisCofins,
      "BASE ICMS FINANCE": c.baseIcmsFinance, "ICMS": c.icms,
      "ISS": c.iss, "VLR PIS + COFINS + ISS": c.vlrPisCofinsIss,
      "DIF VALOR PRODUTO": c.difValorProduto, "BASE IBS/CBS": c.baseIbsCbs, "IBS": c.ibs,
      "CBS": c.cbs, "TOTAL NF FINANCE": c.totalNfFinance, "TOTAL NF CLIENTE": c.totalNfCliente,
      "DIF": c.dif,
    }
    for (const nome of COLUNAS_SUBTOTAL) somasSubtotal[nome] += valoresLinha[nome] ?? 0

    if ((i + 1) % TAMANHO_LOTE === 0 || i === linhas.length - 1) {
      onProgress?.(i + 1, linhas.length)
      await yieldToEventLoop()
    }
  }

  // Linha 6 — SUBTOTAL(9,...) nas colunas do modelo (soma só as linhas visíveis com filtro) e
  // "X" nas colunas de conferência, tudo em formato contábil R$ como no modelo
  if (linhas.length > 0) {
    for (const nome of COLUNAS_SUBTOTAL) {
      const col = letraDe(nome)
      celula(
        ws, `${col}${LINHA_SUBTOTAL}`,
        f(`SUBTOTAL(9,${col}${LINHA_DADOS_INICIO_ANO}:${col}${ultimaLinhaDados})`, somasSubtotal[nome]),
        { bold: true, numFmt: FMT_CONTABIL_RS_SUBTOTAL }
      )
    }
    for (const nome of COLUNAS_X) celula(ws, `${letraDe(nome)}${LINHA_SUBTOTAL}`, "X", { bold: true, centralizado: true })
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}
