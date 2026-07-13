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
  // valores de 2026 (sem a redução de alíquota 2029-2033) — o VALOR SEM TRIBUTO deduz sempre
  // o ICMS/ISS ORIGINAIS, mesmo nas abas de ano com alíquota reduzida (pedido do usuário)
  "ICMS ORIGINAL", "ISS ORIGINAL",
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

// IMPORTANTE (memória): só cria objeto de fonte quando a célula precisa de algo diferente do
// padrão do Excel (que já é Calibri 11) — com ~200 mil linhas × 76 colunas, criar um objeto de
// estilo por célula estourava a memória da aba do navegador ("Out of Memory" no Chrome).
function celula(
  ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue,
  opts?: { bold?: boolean; numFmt?: string; centralizado?: boolean; fundo?: string; corFonte?: string }
) {
  const cell = ws.getCell(ref)
  cell.value = valor
  if (opts?.bold || opts?.corFonte) {
    cell.font = { name: FONTE, size: 11, bold: opts?.bold ?? false, color: opts?.corFonte ? { argb: opts.corFonte } : undefined }
  }
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

// Parâmetros derivados da premissa do ano — compartilhados entre o cabeçalho (ExcelJS) e o
// gerador de XML das linhas de dados (gerarXmlDadosAno)
function contextoDaAba(aba: AbaAno, premissas: PremissasReformaData) {
  const p = premissas.premissasPorAno[aba.anoPremissa]
  const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
  const fatorReducaoIcmsIss = REDUCAO_ICMS_ISS[aba.anoPremissa] ?? 1
  const aliqIss = p.aliquotaISS * fatorReducaoIcmsIss
  const aliqIssOriginal = p.aliquotaISS // cheia (2026), usada nas colunas ICMS/ISS ORIGINAL
  const pisCofinsZerado = aba.anoPremissa >= 2027
  const aliqIcmsPremissa = (premissas.aliquotaICMS ?? 0.225) * fatorReducaoIcmsIss
  return { aliqIss, aliqIssOriginal, aliqIbs, aliqCbs, pisCofinsZerado, aliqIcmsPremissa }
}

// GERAÇÃO EM DUAS PARTES (a "Fase 8" adaptada pro navegador): o ExcelJS monta só o CABEÇALHO
// das abas de ano (linhas 1-7, estilos, larguras, subtotais) — as ~200 mil linhas de dados são
// geradas como XML puro (gerarXmlDadosAno) e injetadas direto no .xlsx pelo orquestrador, sem
// criar objetos de célula do ExcelJS. Antes disso o Chrome estourava memória ("Out of Memory")
// com bases grandes: só as células de dados eram ~14 milhões de objetos.
export function montarAbaAnoCabecalho(
  wb: ExcelJS.Workbook,
  aba: AbaAno,
  linhas: LinhaSaidaEfd[],
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet(aba.label, { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: COR_GUIA_ANO } // azul claro nas guias dos anos
  // Formato numérico definido NO NÍVEL DA COLUNA (não célula a célula) — além de ser o que o
  // Excel faz, evita criar um objeto de estilo por célula em ~200 mil linhas (era uma das causas
  // do "Out of Memory" no navegador com bases grandes)
  const estiloColuna = (nome: string): Partial<ExcelJS.Style> | undefined => {
    if (nome === "PA") return { numFmt: FMT_PA }
    if (["Vlr Documento", "Vlr Desconto NF", "Vlr ISS", "BASE ISS FINANCE"].includes(nome)) return { numFmt: FMT_CONTABIL_RS }
    if (nome === "Alíquota ISS") return { numFmt: "0.00%" }
    if (nome === "Alíquota ICMS") return { numFmt: "0.0%" }
    if (nome !== "BASE ISS FINANCE" && (CALC_HEADERS as readonly string[]).includes(nome)) return { numFmt: FMT_CONTABIL }
    return undefined
  }
  ws.columns = [
    { width: 3 },
    ...TODOS_HEADERS.map((nome) => {
      const estilo = estiloColuna(nome)
      return estilo ? { width: larguraColuna(nome), style: estilo } : { width: larguraColuna(nome) }
    }),
  ]
  const { aliqIss, aliqIssOriginal, aliqIbs, aliqCbs, pisCofinsZerado, aliqIcmsPremissa } = contextoDaAba(aba, premissas)

  // letras usadas nas fórmulas (nomes de variável = letras da aba "2026" do modelo, por leitura)
  const cAH = letraDe("Vlr Item"),
    cBJ = letraDe("VALOR SEM TRIBUTO"), cBU = letraDe("BASE IBS/CBS"),
    cBV = letraDe("IBS"), cBW = letraDe("CBS")

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
  // numFmt General explícito: a coluna BU tem formato contábil e o ano viraria "2.026,00"
  celula(ws, `${cBU}4`, /^\d+$/.test(aba.label) ? Number(aba.label) : aba.label, { bold: true, centralizado: true, fundo: COR_AZUL_ANO, numFmt: "General" })
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

  // Linha 6 — SUBTOTAL(9,...) nas colunas do modelo (soma só as linhas visíveis com filtro) e
  // "X" nas colunas de conferência. As somas em cache vêm de uma passada 100% em JS pelas
  // linhas (nenhuma célula de dado é criada aqui — os dados entram como XML, ver gerarXmlDadosAno)
  if (linhas.length > 0) {
    const somasSubtotal: Record<string, number> = {}
    for (const nome of COLUNAS_SUBTOTAL) somasSubtotal[nome] = 0
    for (const l of linhas) {
      const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcmsPremissa : 0
      const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, pisCofinsZerado, aliqIssOriginal)
      somasSubtotal["Vlr Documento"] += l.vlrDocumento
      somasSubtotal["Vlr Desconto NF"] += l.vlrDescontoNF
      somasSubtotal["Vlr Item"] += l.vlrItem
      somasSubtotal["Vlr Desconto Item"] += l.vlrDescontoItem
      somasSubtotal["Vlr ISS"] += c.vlrIss
      somasSubtotal["Vlr ICMS"] += l.vlrIcms
      somasSubtotal["Vlr Base Cálculo PIS"] += l.vlrBaseCalculoPis
      somasSubtotal["Vlr PIS"] += l.vlrPis
      somasSubtotal["Vlr Base Cálculo Cofins"] += l.vlrBaseCalculoCofins
      somasSubtotal["Vlr Cofins"] += l.vlrCofins
      somasSubtotal["VALOR SEM TRIBUTO"] += c.vlrSemTributo
      somasSubtotal["BASE PIS COFINS"] += c.basePisCofins
      somasSubtotal["VLR PIS"] += c.vlrPis
      somasSubtotal["VLR COFINS"] += c.vlrCofins
      somasSubtotal["VLR PIS + COFINS"] += c.vlrPisCofins
      somasSubtotal["BASE ICMS FINANCE"] += c.baseIcmsFinance
      somasSubtotal["ICMS"] += c.icms
      somasSubtotal["ISS"] += c.iss
      somasSubtotal["VLR PIS + COFINS + ISS"] += c.vlrPisCofinsIss
      somasSubtotal["DIF VALOR PRODUTO"] += c.difValorProduto
      somasSubtotal["BASE IBS/CBS"] += c.baseIbsCbs
      somasSubtotal["IBS"] += c.ibs
      somasSubtotal["CBS"] += c.cbs
      somasSubtotal["TOTAL NF FINANCE"] += c.totalNfFinance
      somasSubtotal["TOTAL NF CLIENTE"] += c.totalNfCliente
      somasSubtotal["DIF"] += c.dif
    }
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

// ---------------------------------------------------------------------------------------------
// Gerador das LINHAS DE DADOS como XML de planilha (SpreadsheetML) — injetado no .xlsx depois
// que o ExcelJS gera o arquivo com os cabeçalhos. Strings usam inlineStr (sem sharedStrings),
// células sem estilo próprio (herdam o numFmt do <col> escrito pelo cabeçalho). Fórmulas saem
// com <f> + <v> (resultado em cache), então até visualizadores sem recálculo mostram os valores
// — e o Excel recalcula normal ao abrir.
// ---------------------------------------------------------------------------------------------

const EPOCH_EXCEL = 25569 // dias entre 1899-12-30 e 1970-01-01

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function numXml(n: number): string {
  if (!Number.isFinite(n)) return "0"
  return String(Math.round(n * 1e10) / 1e10) // evita 1.0000000000000002e-3 nas células
}

// Extrai do XML do stub (gerado pelo ExcelJS) o id de estilo de cada coluna (<col style="N">).
// As células injetadas precisam do atributo s="N" explícito: o Excel NÃO aplica o estilo da
// coluna a células gravadas sem estilo próprio — sem isso, PA aparecia como número serial e as
// colunas calculadas perdiam o formato contábil.
export function extrairEstilosDasColunas(sheetXml: string): Map<number, string> {
  const estilos = new Map<number, string>() // nº da coluna (1-based) → id do estilo
  for (const m of sheetXml.matchAll(/<col[^>]*min="(\d+)"[^>]*max="(\d+)"[^>]*style="(\d+)"[^>]*\/>/g)) {
    const min = Number(m[1])
    const max = Number(m[2])
    for (let c = min; c <= max; c++) estilos.set(c, m[3])
  }
  return estilos
}

export async function gerarXmlDadosAno(
  aba: AbaAno,
  linhas: LinhaSaidaEfd[],
  premissas: PremissasReformaData,
  estilosColunas: Map<number, string> = new Map(),
  onProgress?: (linhaAtual: number, totalLinhas: number) => void
): Promise<string> {
  const { aliqIss, aliqIssOriginal, aliqIbs, aliqCbs, pisCofinsZerado, aliqIcmsPremissa } = contextoDaAba(aba, premissas)
  const issLiteral = pctLiteral(aliqIss)
  const issOriginalLiteral = pctLiteral(aliqIssOriginal) // cheia (2026), pra coluna ISS ORIGINAL
  const ibsLiteral = pctLiteral(aliqIbs)
  const cbsLiteral = pctLiteral(aliqCbs)

  const letra = (i: number) => colLetra(COL_INICIO_ANO + i)
  const idxDe = (nome: string) => TODOS_HEADERS.indexOf(nome as (typeof TODOS_HEADERS)[number])
  const LETRAS = TODOS_HEADERS.map((_, i) => letra(i))
  const cAG = letraDe("Tipo Item"), cAH = letraDe("Vlr Item"), cAK = letraDe("Vlr Desconto Item"),
    cAP = letraDe("Alíquota ISS"), cAQ = letraDe("Vlr ISS"), cAR = letraDe("Alíquota ICMS"),
    cAS = letraDe("Vlr ICMS"), cAY = letraDe("Alíquota PIS"), cBA = letraDe("Vlr PIS"),
    cBE = letraDe("Alíquota Cofins"), cBG = letraDe("Vlr Cofins"),
    cO = letraDe("Chave NF-e"), cS = letraDe("Vlr Documento")
  const cBJ = letraDe("VALOR SEM TRIBUTO"), cBK = letraDe("BASE PIS COFINS"), cBL = letraDe("VLR PIS"),
    cBM = letraDe("VLR COFINS"), cBN = letraDe("VLR PIS + COFINS"), cBO = letraDe("BASE ICMS FINANCE"),
    cBQ = letraDe("BASE ISS FINANCE"), cBR = letraDe("ISS"),
    cBU = letraDe("BASE IBS/CBS"), cBV = letraDe("IBS"), cBW = letraDe("CBS"),
    cBX = letraDe("TOTAL NF FINANCE"), cBY = letraDe("TOTAL NF CLIENTE")
  const iAR = idxDe("Alíquota ICMS"), iP = idxDe("id"), iAP = idxDe("Alíquota ISS"), iAQ = idxDe("Vlr ISS")
  const idxCalc: Record<string, number> = {}
  for (const nome of CALC_HEADERS) idxCalc[nome] = idxDe(nome)

  // atributo s="N" por coluna (id de estilo herdado do <col> do stub) — obrigatório nas células
  // gravadas pra o Excel aplicar o formato (data no PA, contábil nas calculadas etc.)
  const S_ATTR = TODOS_HEADERS.map((_, ci) => {
    const id = estilosColunas.get(COL_INICIO_ANO + ci)
    return id ? ` s="${id}"` : ""
  })

  const chunks: string[] = []
  let lote: string[] = []
  const TAMANHO_LOTE = 1000

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    const r = LINHA_DADOS_INICIO_ANO + i
    const cells: (string | null)[] = new Array(TODOS_HEADERS.length).fill(null)

    // valores brutos (mesma ordem/conteúdo de rawRowValues)
    const raw = rawRowValues(l)
    for (let ci = 0; ci < raw.length; ci++) {
      const v = raw[ci]
      if (v === null) continue
      if (typeof v === "number") {
        cells[ci] = `<c r="${LETRAS[ci]}${r}"${S_ATTR[ci]}><v>${numXml(v)}</v></c>`
      } else if (v instanceof Date) {
        const serial = v.getTime() / 86400000 + EPOCH_EXCEL
        cells[ci] = `<c r="${LETRAS[ci]}${r}"${S_ATTR[ci]}><v>${serial}</v></c>`
      } else {
        cells[ci] = `<c r="${LETRAS[ci]}${r}"${S_ATTR[ci]} t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`
      }
    }

    const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcmsPremissa : 0
    cells[iAR] = `<c r="${cAR}${r}"${S_ATTR[iAR]}><v>${numXml(aliqIcmsLinha)}</v></c>`

    const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha, pisCofinsZerado, aliqIssOriginal)
    const cValorBase = l.registros.startsWith("F550") ? cS : cAH
    const fx = (idx: number, colLetraRef: string, formula: string, result: number) => {
      cells[idx] = `<c r="${colLetraRef}${r}"${S_ATTR[idx]}><f>${escXml(formula)}</f><v>${numXml(result)}</v></c>`
    }
    // id: fórmula com resultado TEXTO
    const idResult = `${l.chaveNFe}${String(l.vlrDocumento).replace(".", ",")}`
    cells[iP] = `<c r="${LETRAS[iP]}${r}"${S_ATTR[iP]} t="str"><f>${escXml(`${cO}${r}&${cS}${r}`)}</f><v>${escXml(idResult)}</v></c>`
    fx(iAP, cAP, `IF(${cAG}${r}="09 Serviços",${issLiteral},0)`, c.aliqIssLinha)
    fx(iAQ, cAQ, `${cAH}${r}*${cAP}${r}`, c.vlrIss)
    // Colunas ICMS/ISS ORIGINAL: os valores de 2026 (sem a redução 2029-2033) — o VALOR SEM
    // TRIBUTO deduz sempre os originais, senão a base "cresceria" nos anos de alíquota reduzida
    const cICMSO = letraDe("ICMS ORIGINAL")
    const cISSO = letraDe("ISS ORIGINAL")
    fx(idxCalc["ICMS ORIGINAL"], cICMSO, `${cAS}${r}`, c.vlrIcmsOriginal)
    fx(idxCalc["ISS ORIGINAL"], cISSO, `IF(${cAG}${r}="09 Serviços",${cAH}${r}*${issOriginalLiteral},0)`, c.vlrIssOriginal)
    fx(idxCalc["VALOR SEM TRIBUTO"], cBJ, `${cValorBase}${r}-${cAK}${r}-${cICMSO}${r}-${cBA}${r}-${cBG}${r}-${cISSO}${r}`, c.vlrSemTributo)
    if (pisCofinsZerado) fx(idxCalc["BASE PIS COFINS"], cBK, "0", 0)
    else fx(idxCalc["BASE PIS COFINS"], cBK, `${cBJ}${r}/(1-${cAY}${r}%-${cBE}${r}%)`, c.basePisCofins)
    fx(idxCalc["VLR PIS"], cBL, `${cBK}${r}*${cAY}${r}%`, c.vlrPis)
    fx(idxCalc["VLR COFINS"], cBM, `${cBK}${r}*${cBE}${r}%`, c.vlrCofins)
    fx(idxCalc["VLR PIS + COFINS"], cBN, `${cBL}${r}+${cBM}${r}`, c.vlrPisCofins)
    // Gross-up das bases de ICMS/ISS: 2026 embute PIS/COFINS (BL+BM); 2027+ embute IBS+CBS
    // (BV+BW), já que a CBS substitui PIS/COFINS — fórmula da referência do usuário
    const embutido = pisCofinsZerado ? `${cBV}${r}+${cBW}${r}` : `${cBL}${r}+${cBM}${r}`
    fx(idxCalc["BASE ICMS FINANCE"], cBO, `IF(${cAG}${r}="09 Serviços",0,(${cBJ}${r}+${embutido})/(1-${cAR}${r}%))`, c.baseIcmsFinance)
    fx(idxCalc["ICMS"], letraDe("ICMS"), `${cBO}${r}*${cAR}${r}%`, c.icms)
    fx(idxCalc["BASE ISS FINANCE"], cBQ, `IF(${cAG}${r}="09 Serviços",(${cBJ}${r}+${embutido})/(1-${cAP}${r}),0)`, c.baseIssFinance)
    fx(idxCalc["ISS"], cBR, `${cBQ}${r}*${cAP}${r}`, c.iss)
    fx(idxCalc["VLR PIS + COFINS + ISS"], letraDe("VLR PIS + COFINS + ISS"), `${cBR}${r}+${cBN}${r}`, c.vlrPisCofinsIss)
    fx(idxCalc["DIF VALOR PRODUTO"], letraDe("DIF VALOR PRODUTO"), `${cBQ}${r}-${cBO}${r}-${cBJ}${r}`, c.difValorProduto)
    fx(idxCalc["BASE IBS/CBS"], cBU, `${cBJ}${r}`, c.baseIbsCbs)
    fx(idxCalc["IBS"], letraDe("IBS"), `${cBU}${r}*${ibsLiteral}`, c.ibs)
    fx(idxCalc["CBS"], letraDe("CBS"), `${cBU}${r}*${cbsLiteral}`, c.cbs)
    fx(idxCalc["TOTAL NF FINANCE"], cBX, `${cBO}${r}+${cBQ}${r}`, c.totalNfFinance)
    fx(idxCalc["TOTAL NF CLIENTE"], cBY, `${cValorBase}${r}-${cAK}${r}`, c.totalNfCliente)
    fx(idxCalc["DIF"], letraDe("DIF"), `${cBY}${r}-${cBX}${r}`, c.dif)

    let row = `<row r="${r}">`
    for (const cell of cells) if (cell !== null) row += cell
    row += "</row>"
    lote.push(row)

    if (lote.length >= TAMANHO_LOTE || i === linhas.length - 1) {
      chunks.push(lote.join(""))
      lote = []
      onProgress?.(i + 1, linhas.length)
      await yieldToEventLoop()
    }
  }

  return chunks.join("")
}
