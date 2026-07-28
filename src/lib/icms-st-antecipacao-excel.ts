import ExcelJS from "exceljs"
import type { LinhaEntradaEfd } from "./efd-icms-ipi-entradas-parser"
import {
  calcularAntecipacaoItem,
  adicionalRegiao,
  parseDataBr,
  REGIAO_UF,
  CODIGOS_CSOSN,
  type ResultadoAntecipacaoItem,
  type Situacao,
} from "./icms-st-antecipacao-ce"
import { colLetra } from "./reforma-excel/coluna-letra"
import {
  celulaValor,
  celulaFormula,
  gerarLinhasXmlEmLotes,
  finalizarExcelComAbasHibridas,
  type AbaHibridaPendente,
} from "./excel-xml-hibrido"

// Export da automação "Antecipação ICMS-ST (Ceará)" — mesma convenção visual usada em todo o
// projeto (helpers duplicados de propósito, ver docs/recuperacao-credito.md seção 12).
//
// Traz TODOS os campos brutos do item (mesmo conjunto de colunas da aba "Entradas" da
// Recuperação de Crédito, src/lib/entradas-icms-excel.ts — duplicado de propósito, não
// reaproveitado por import, mesmo padrão já usado no resto do módulo) + as 7 colunas de
// ICMS-ST no final, em FÓRMULA (não valor estático) — pedido explícito do usuário. As fórmulas
// consultam duas tabelas auxiliares fora da área visível (CSOSN e UF→Adicional), mesma técnica
// da aba "Entradas - EFD ICMS IPI" da Reforma Tributária.
//
// GERAÇÃO HÍBRIDA (mesma técnica de src/lib/reforma-excel/gerar-excel-reforma.ts +
// reforma-excel/anos.ts): o ExcelJS monta só o CABEÇALHO da aba (linhas 1-6, estilos, larguras,
// subtotal) — as linhas de DADO são geradas como XML de planilha puro (gerarLinhasXmlAntecipacaoIcmsSt)
// e injetadas no .xlsx via jszip, sem passar pelo modelo de objeto Cell do ExcelJS. Com EFDs
// grandes (dezenas/centenas de milhares de itens × 71 colunas) o modelo normal do ExcelJS cria
// milhões de objetos de célula e o navegador estoura memória ("Out of Memory") — bug real
// reportado pelo usuário nesta sessão, mesma causa raiz já resolvida na Reforma Tributária.
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"

const LOGO_URL = "/icons/taxhub_logo_full.png"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function sc(
  cell: ExcelJS.Cell,
  opts: { value?: ExcelJS.CellValue; bold?: boolean; align?: "left" | "center" | "right"; numFmt?: string; bg?: string; color?: string; size?: number }
) {
  if (opts.value !== undefined) cell.value = opts.value
  cell.font = { name: "Calibri", bold: opts.bold, size: opts.size ?? 10, color: { argb: opts.color ?? "FF000000" } }
  cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle" }
  if (opts.numFmt) cell.numFmt = opts.numFmt
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } }
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const tamanhoBloco = 0x8000
  for (let i = 0; i < bytes.length; i += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tamanhoBloco))
  }
  return btoa(binario)
}

async function carregarLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) return null
    return arrayBufferParaBase64(await res.arrayBuffer())
  } catch {
    return null
  }
}

const LABEL_SITUACAO: Record<Situacao, string> = {
  dentro_estado: "Dentro do Estado",
  fora_estado: "Fora do Estado",
}

export interface LinhaCalculada {
  linha: LinhaEntradaEfd
  resultado: ResultadoAntecipacaoItem | null
}

// "YYYY-MM" → Date do 1º dia do mês (mesma convenção da aba "Entradas") — precisa ser um Date de
// verdade (não texto) pro AutoFilter do Excel agrupar por ano.
function paParaData(pa: string): Date | string {
  const m = /^(\d{4})-(\d{2})$/.exec(pa)
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : pa
}

// Competência da coluna "Competência" = mês/ano da Data de Entrada/Saída (não o PA do EFD) —
// decisão confirmada com o usuário: uma nota emitida num mês pode entrar no estabelecimento no
// mês seguinte, e a antecipação é devida na entrada, não na competência declarada do EFD.
function competenciaDaEntrada(dataEntradaSaida: string): Date | null {
  const d = parseDataBr(dataEntradaSaida)
  if (!d) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

// Descrições de CFOP de entrada — mesma lista da aba "Entradas" (entradas-icms-excel.ts) e da
// Reforma Tributária (reforma-excel/entradas-efd.ts), duplicada de propósito.
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
  "1403": "Compra para industrialização em operação com mercadoria sujeita ao regime de substituição tributária",
  "2403": "Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária",
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

interface Coluna {
  nome: string
  valor?: (l: LinhaEntradaEfd) => string | number | Date | null // ausente = calculada (fórmula)
  monetaria?: boolean
  percentual?: boolean
  data?: boolean
  esquerda?: boolean // texto longo alinhado à esquerda (padrão = centro)
  largura?: number
}

const COLS_ESQUERDA = new Set(["Empresa", "Nome Fornecedor", "Descrição Item", "Natureza Crédito", "Descrição CFOP"])

// Colunas brutas — mesmo conjunto/ordem da aba "Entradas" (src/lib/entradas-icms-excel.ts).
const COLUNAS_BRUTAS_BASE: Coluna[] = [
  { nome: "CNPJ", valor: (l) => l.cnpj, largura: 17 },
  { nome: "Competência", valor: (l) => competenciaDaEntrada(l.dataEntradaSaida) ?? paParaData(l.pa), largura: 12, data: true },
  { nome: "Empresa", valor: (l) => l.empresa, largura: 26 },
  { nome: "UF Própria", valor: (l) => l.ufPropria, largura: 10 },
  { nome: "Registros", valor: (l) => l.registros, largura: 24 },
  { nome: "Indicador Emitente", valor: (l) => l.indicadorEmitente, largura: 18 },
  { nome: "Situação", valor: (l) => l.situacao || null },
  { nome: "Código Participante", valor: (l) => l.codigoParticipante || null, largura: 16 },
  { nome: "CNPJ/CPF Fornecedor", valor: (l) => l.cnpjFornecedor || l.cpfFornecedor || null, largura: 17 },
  { nome: "Nome Fornecedor", valor: (l) => l.nomeFornecedor || null, largura: 30 },
  { nome: "UF Fornecedor", valor: (l) => l.ufFornecedor || null, largura: 10 },
  { nome: "Número Documento", valor: (l) => l.numeroDocumento || null, largura: 16 },
  { nome: "Série", valor: (l) => l.serie || null },
  { nome: "Modelo", valor: (l) => l.modelo || null },
  { nome: "Chave NF-e", valor: (l) => l.chaveNFe || null, largura: 46 },
  { nome: "Data Documento", valor: (l) => l.dataDocumento || null, largura: 14 },
  { nome: "Data Entrada/Saída", valor: (l) => parseDataBr(l.dataEntradaSaida) ?? l.dataEntradaSaida ?? null, largura: 14, data: true },
  { nome: "Vlr Documento", valor: (l) => l.vlrDocumento, monetaria: true, largura: 16 },
  { nome: "Vlr Desconto NF", valor: (l) => l.vlrDescontoNF, monetaria: true, largura: 16 },
  { nome: "Vlr Mercadoria", valor: (l) => l.vlrMercadoria, monetaria: true, largura: 16 },
  { nome: "Vlr Frete", valor: (l) => l.vlrFrete, monetaria: true, largura: 14 },
  { nome: "Vlr Seguro", valor: (l) => l.vlrSeguro, monetaria: true, largura: 14 },
  { nome: "Vlr Outras DA", valor: (l) => l.vlrOutrasDA, monetaria: true, largura: 14 },
  { nome: "Número Item", valor: (l) => l.numeroItem || null, largura: 12 },
  { nome: "Código Item", valor: (l) => l.codigoItem || null, largura: 16 },
  { nome: "Descrição Item", valor: (l) => l.descricaoItem || null, largura: 34 },
  { nome: "Tipo Item", valor: (l) => l.tipoItem || null, largura: 26 },
  { nome: "Código Barra", valor: (l) => l.codigoBarra || null, largura: 16 },
  { nome: "NCM", valor: (l) => l.ncm || null },
  { nome: "Vlr Item", valor: (l) => l.vlrItem, monetaria: true, largura: 16 },
  { nome: "Vlr Desconto Item", valor: (l) => l.vlrDescontoItem, monetaria: true, largura: 16 },
  { nome: "Qtde", valor: (l) => l.qtde },
  { nome: "Unidade Medida", valor: (l) => l.unidadeMedida || null, largura: 14 },
  { nome: "Indicador Movimento", valor: (l) => l.indicadorMovimento || null, largura: 16 },
  { nome: "Natureza Crédito", valor: (l) => l.naturezaCredito || null, largura: 34 },
  { nome: "CFOP", valor: (l) => l.cfop || null },
  { nome: "Descrição CFOP", valor: (l) => CFOP_ENTRADA_DESCRICOES[l.cfop] ?? null, largura: 34 },
  { nome: "CST ICMS", valor: (l) => l.cstIcms || null },
  { nome: "Vlr Base Cálculo ICMS", valor: (l) => l.vlrBaseCalculoIcms, monetaria: true, largura: 18 },
  { nome: "Alíquota ICMS", valor: (l) => l.aliquotaIcms, largura: 14, percentual: true },
  { nome: "Vlr ICMS", valor: (l) => l.vlrIcms, monetaria: true, largura: 16 },
  { nome: "Vlr Base Cálculo ICMS-ST", valor: (l) => l.vlrBaseCalculoIcmsSt, monetaria: true, largura: 18 },
  { nome: "Alíquota ICMS-ST", valor: (l) => l.aliquotaIcmsSt, largura: 14, percentual: true },
  { nome: "Vlr ICMS-ST", valor: (l) => l.vlrIcmsSt, monetaria: true, largura: 16 },
  { nome: "CST IPI", valor: (l) => l.cstIpi || null },
  { nome: "Vlr Base Cálculo IPI", valor: (l) => l.vlrBaseCalculoIpi, monetaria: true, largura: 18 },
  { nome: "Alíquota IPI", valor: (l) => l.aliquotaIpi, largura: 14, percentual: true },
  { nome: "Vlr IPI", valor: (l) => l.vlrIpi, monetaria: true, largura: 16 },
  { nome: "CST PIS", valor: (l) => l.cstPis || null },
  { nome: "Vlr Base Cálculo PIS", valor: (l) => l.vlrBaseCalculoPis, monetaria: true, largura: 18 },
  { nome: "Alíquota PIS", valor: (l) => l.aliquotaPis, largura: 14 },
  { nome: "Vlr PIS", valor: (l) => l.vlrPis, monetaria: true, largura: 16 },
  { nome: "CST Cofins", valor: (l) => l.cstCofins || null },
  { nome: "Vlr Base Cálculo Cofins", valor: (l) => l.vlrBaseCalculoCofins, monetaria: true, largura: 18 },
  { nome: "Alíquota Cofins", valor: (l) => l.aliquotaCofins, largura: 14 },
  { nome: "Vlr Cofins", valor: (l) => l.vlrCofins, monetaria: true, largura: 16 },
  { nome: "Conta Contábil", valor: (l) => l.contaContabil || null, largura: 16 },
]
const COLUNAS_BRUTAS: Coluna[] = COLUNAS_BRUTAS_BASE.map((c) => ({ ...c, esquerda: COLS_ESQUERDA.has(c.nome) }))

// Colunas calculadas (ICMS-ST) — sem `valor`: preenchidas por fórmula (gerarLinhasXmlAntecipacaoIcmsSt).
// Nomes com sufixo "Antecipação" pra não colidir com as colunas brutas homônimas (ex.: "Situação"
// da nota vs. "Situação Antecipação" da regra de ICMS-ST).
const COLUNAS_CALCULADAS: Coluna[] = [
  { nome: "Situação Antecipação", largura: 20 },
  { nome: "Origem Estrangeira", largura: 16 },
  { nome: "Base Cálculo Antecipação", largura: 18, monetaria: true },
  { nome: "Alíquota Base Antecipação", largura: 16, percentual: true },
  { nome: "Adicional Região", largura: 16, percentual: true },
  { nome: "Alíquota Total Antecipação", largura: 16, percentual: true },
  { nome: "Valor Antecipação ICMS-ST", largura: 20, monetaria: true },
]

const COLUNAS = [...COLUNAS_BRUTAS, ...COLUNAS_CALCULADAS]
const COL_INICIO = 2 // B — coluna A é a margem
const LINHA_HEADER = 6

const IDX = Object.fromEntries(COLUNAS.map((c, i) => [c.nome, i])) as Record<string, number>
const letraDaColuna = (nome: string) => colLetra(COL_INICIO + IDX[nome])

// Letras/posições usadas nas fórmulas — puras funções do layout de colunas (COLUNAS), calculadas
// uma única vez no carregamento do módulo. Tanto o cabeçalho (ExcelJS) quanto o gerador de XML
// das linhas de dado usam as MESMAS constantes, então não há necessidade de passar esse contexto
// de um pro outro.
const cCfop = letraDaColuna("CFOP"), cSituacaoAntec = letraDaColuna("Situação Antecipação"), cCst = letraDaColuna("CST ICMS"),
  cOrigem = letraDaColuna("Origem Estrangeira"), cDataEntrada = letraDaColuna("Data Entrada/Saída"), cVlrItem = letraDaColuna("Vlr Item"),
  cVlrDescItem = letraDaColuna("Vlr Desconto Item"), cBaseAntec = letraDaColuna("Base Cálculo Antecipação"),
  cAliqBaseAntec = letraDaColuna("Alíquota Base Antecipação"), cAdicional = letraDaColuna("Adicional Região"),
  cAliqTotalAntec = letraDaColuna("Alíquota Total Antecipação"), cUfFornecedor = letraDaColuna("UF Fornecedor"),
  cValorAntec = letraDaColuna("Valor Antecipação ICMS-ST")

// Tabelas auxiliares que as fórmulas consultam — bem depois da última coluna de dados, fora da
// área visível/impressa (mesma técnica de reforma-excel/entradas-efd.ts).
const colAux1 = colLetra(COL_INICIO + COLUNAS.length + 2)
const colAux2 = colLetra(COL_INICIO + COLUNAS.length + 3)
const colAux3 = colLetra(COL_INICIO + COLUNAS.length + 4)
const UFS_REGIAO = Object.keys(REGIAO_UF)

// O que `gerarLinhasXmlAntecipacaoIcmsSt` precisa pra montar as linhas de dado sem depender do
// workbook/worksheet do ExcelJS (que nesse ponto já foi serializado pro buffer base) — fechado
// numa closure dentro do `AbaHibridaPendente.gerarLinhasXml` devolvido por
// `montarAbaAntecipacaoIcmsStCabecalho` (ver excel-xml-hibrido.ts).
interface DadosXmlAntecipacaoIcmsSt {
  calculadas: LinhaCalculada[]
  linhaCsosnInicio: number
  linhaUfInicio: number
  linhaUfFim: number
}

function estiloColunaDados(c: Coluna): Partial<ExcelJS.Style> {
  const style: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 10 },
    alignment: { horizontal: c.esquerda ? "left" : "center", vertical: "middle" },
  }
  if (c.monetaria) style.numFmt = BRL
  else if (c.percentual) style.numFmt = "0.00%"
  else if (c.data) style.numFmt = "mm-dd-yy"
  return style
}

// Monta só o CABEÇALHO da aba (logo, título, tabelas auxiliares, linha de header, subtotal,
// larguras/estilos por COLUNA) — nenhuma célula de dado é criada aqui (isso é o que evitava
// estourar memória: ver nota "GERAÇÃO HÍBRIDA" no topo do arquivo). As linhas de dado entram
// depois, como XML puro, via `gerarLinhasXmlAntecipacaoIcmsSt` + injeção no .xlsx (jszip).
export async function montarAbaAntecipacaoIcmsStCabecalho(
  wb: ExcelJS.Workbook,
  linhas: LinhaEntradaEfd[],
  nomeEmpresa: string
): Promise<{ calculadas: LinhaCalculada[]; pendente: AbaHibridaPendente | null }> {
  const calculadas: LinhaCalculada[] = linhas.map((linha) => ({ linha, resultado: calcularAntecipacaoItem(linha) }))

  const sheetName = "Antecipação ICMS-ST"
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF1F3864" }

  // Estilo (fonte/alinhamento/numFmt) definido NO NÍVEL DA COLUNA, não célula a célula — além de
  // ser o que o Excel faz nativamente, é o que permite as linhas de dado (XML puro, sem objeto de
  // célula do ExcelJS) herdarem o formato certo: o id de estilo do <col> é extraído do stub
  // (extrairEstilosDasColunas, mesma técnica de reforma-excel/anos.ts) e carimbado em cada célula
  // gerada via atributo s="N".
  ws.columns = [{ width: 3 }, ...COLUNAS.map((c) => ({ width: c.largura ?? 12, style: estiloColunaDados(c) }))]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 41 } })
  }

  const nomeCurto = nomeEmpresa.trim().split(/\s+/)[0] || nomeEmpresa
  sc(ws.getCell(3, 2), { value: `Antecipação ICMS-ST (Ceará) - ${nomeCurto}`, bold: true, size: 12 })

  // Cabeçalho da tabela — escrito manualmente (sem addTable: um Excel Table/ListObject força o
  // ExcelJS a materializar um objeto de célula por linha de dado, o que é exatamente a causa do
  // "Out of Memory"). AutoFilter dá as setinhas de filtro sem esse custo (é 1 atributo no XML da
  // aba, não depende da quantidade de linhas).
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(calculadas.length, 1)
  const headerRow = ws.getRow(LINHA_HEADER)
  COLUNAS.forEach((c, i) => {
    sc(headerRow.getCell(COL_INICIO + i), { value: c.nome, bold: true, align: "center", color: COR_HEADER_TEXTO, bg: COR_HEADER_BG })
  })
  ws.autoFilter = {
    from: { row: LINHA_HEADER, column: COL_INICIO },
    to: { row: LINHA_HEADER, column: COL_INICIO + COLUNAS.length - 1 },
  }

  // Linha de SUBTOTAL (acima do header) — soma calculada em JS numa única passada (barata mesmo
  // com muitas linhas: só soma números, não cria célula nenhuma).
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  COLUNAS.forEach((c, i) => {
    if (!c.monetaria) return
    const col = COL_INICIO + i
    const letra = colLetra(col)
    const soma = calculadas.reduce((s, l) => {
      if (c.nome === "Base Cálculo Antecipação") return s + (l.resultado?.base ?? 0)
      if (c.nome === "Valor Antecipação ICMS-ST") return s + (l.resultado?.valor ?? 0)
      const valor = c.valor ? c.valor(l.linha) : null
      return s + (typeof valor === "number" ? valor : 0)
    }, 0)
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,${letra}${primeiraLinhaDados}:${letra}${ultimaLinhaDados})`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  })

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]

  if (calculadas.length === 0) return { calculadas, pendente: null }

  // Tabelas auxiliares — mesma fonte de dados que o cálculo em JS (CODIGOS_CSOSN, REGIAO_UF,
  // adicionalRegiao), pra nunca divergir. Posicionadas ALGUMAS LINHAS ABAIXO da última linha de
  // dado (não num intervalo fixo tipo "linha 2 em diante"): escrever essas células via ExcelJS
  // cria objetos de `<row>` de verdade no stub pras linhas que elas tocam — se esse intervalo
  // caísse dentro do intervalo das linhas de dado (que entram DEPOIS, como XML puro), o arquivo
  // final ficaria com `<row r="N">` DUPLICADO pra cada linha nesse cruzamento (uma vinda do stub,
  // só com as células da tabela auxiliar, e outra vinda da injeção, com os dados de verdade) — o
  // Excel some com uma delas, aparecendo como "linhas vazias" logo após o cabeçalho (bug real
  // reportado pelo usuário nesta sessão). Por isso o início das tabelas auxiliares é sempre
  // calculado a partir de `ultimaLinhaDados`, nunca fixo.
  const linhaCsosnInicio = ultimaLinhaDados + 2
  const linhaUfInicio = ultimaLinhaDados + 2
  const linhaUfFim = linhaUfInicio + UFS_REGIAO.length - 1
  sc(ws.getCell(`${colAux1}${linhaCsosnInicio - 1}`), { value: "CSOSN", bold: true })
  CODIGOS_CSOSN.forEach((codigo, i) => {
    ws.getCell(`${colAux1}${linhaCsosnInicio + i}`).value = codigo
  })
  sc(ws.getCell(`${colAux2}${linhaUfInicio - 1}`), { value: "UF", bold: true })
  sc(ws.getCell(`${colAux3}${linhaUfInicio - 1}`), { value: "Adicional", bold: true })
  UFS_REGIAO.forEach((uf, i) => {
    const r = linhaUfInicio + i
    ws.getCell(`${colAux2}${r}`).value = uf
    ws.getCell(`${colAux3}${r}`).value = adicionalRegiao(uf)
  })

  const dadosXml: DadosXmlAntecipacaoIcmsSt = { calculadas, linhaCsosnInicio, linhaUfInicio, linhaUfFim }
  const pendente: AbaHibridaPendente = {
    sheetName,
    dimensaoRef: `B1:${colAux3}${Math.max(ultimaLinhaDados, linhaUfFim)}`,
    gerarLinhasXml: (estilosColunas, onProgress) => gerarLinhasXmlAntecipacaoIcmsSt(dadosXml, estilosColunas, onProgress),
  }
  return { calculadas, pendente }
}

// ---------------------------------------------------------------------------------------------
// Geração das LINHAS DE DADO como XML de planilha (SpreadsheetML), injetadas no .xlsx depois que
// o ExcelJS grava o cabeçalho (mecânica genérica — lotes, yield, bytes — em excel-xml-hibrido.ts).
// Strings usam inlineStr (sem sharedStrings); células sem estilo próprio herdam o
// numFmt/fonte/alinhamento do <col> escrito pelo cabeçalho (atributo s="N").
// ---------------------------------------------------------------------------------------------

async function gerarLinhasXmlAntecipacaoIcmsSt(
  dados: DadosXmlAntecipacaoIcmsSt,
  estilosColunas: Map<number, string>,
  onProgress?: (linhaAtual: number, totalLinhas: number) => void
): Promise<Uint8Array> {
  const { calculadas, linhaCsosnInicio, linhaUfInicio, linhaUfFim } = dados

  const LETRAS = COLUNAS.map((_c, i) => colLetra(COL_INICIO + i))
  const S_ATTR = COLUNAS.map((_c, i) => {
    const id = estilosColunas.get(COL_INICIO + i)
    return id ? ` s="${id}"` : ""
  })
  const iSituacaoAntec = IDX["Situação Antecipação"], iOrigem = IDX["Origem Estrangeira"],
    iBaseAntec = IDX["Base Cálculo Antecipação"], iAliqBaseAntec = IDX["Alíquota Base Antecipação"],
    iAdicional = IDX["Adicional Região"], iAliqTotalAntec = IDX["Alíquota Total Antecipação"],
    iValorAntec = IDX["Valor Antecipação ICMS-ST"]

  return gerarLinhasXmlEmLotes(
    calculadas,
    ({ linha, resultado }, i) => {
      const r = LINHA_HEADER + 1 + i
      const cells: (string | null)[] = new Array(COLUNAS.length).fill(null)

      for (let ci = 0; ci < COLUNAS_BRUTAS.length; ci++) {
        const v = COLUNAS_BRUTAS[ci].valor!(linha)
        cells[ci] = celulaValor(`${LETRAS[ci]}${r}`, S_ATTR[ci], v)
      }

      cells[iSituacaoAntec] = celulaFormula(
        `${cSituacaoAntec}${r}`, S_ATTR[iSituacaoAntec],
        `IF(${cCfop}${r}="1403","Dentro do Estado",IF(${cCfop}${r}="2403","Fora do Estado",""))`,
        resultado ? LABEL_SITUACAO[resultado.situacao] : ""
      )
      cells[iOrigem] = celulaFormula(
        `${cOrigem}${r}`, S_ATTR[iOrigem],
        `IF(${cSituacaoAntec}${r}="","",IF(AND(${cSituacaoAntec}${r}="Fora do Estado",COUNTIF($${colAux1}$${linhaCsosnInicio}:$${colAux1}$${linhaCsosnInicio + CODIGOS_CSOSN.length - 1},${cCst}${r})=0,OR(LEFT(${cCst}${r},1)="1",LEFT(${cCst}${r},1)="2",LEFT(${cCst}${r},1)="3",LEFT(${cCst}${r},1)="8")),"Sim","Não"))`,
        resultado ? (resultado.origemEstrangeira ? "Sim" : "Não") : ""
      )
      cells[iBaseAntec] = celulaFormula(
        `${cBaseAntec}${r}`, S_ATTR[iBaseAntec],
        `IF(${cSituacaoAntec}${r}="","",${cVlrItem}${r}-${cVlrDescItem}${r})`,
        resultado ? resultado.base : ""
      )
      cells[iAliqBaseAntec] = celulaFormula(
        `${cAliqBaseAntec}${r}`, S_ATTR[iAliqBaseAntec],
        `IF(${cSituacaoAntec}${r}="","",IF(${cSituacaoAntec}${r}="Fora do Estado",IF(${cDataEntrada}${r}>=DATE(2024,1,1),0.089,0.08),IF(${cDataEntrada}${r}>=DATE(2024,1,1),0.0333,0.03)))`,
        resultado ? resultado.aliquotaBase : ""
      )
      cells[iAdicional] = celulaFormula(
        `${cAdicional}${r}`, S_ATTR[iAdicional],
        `IF(${cOrigem}${r}="Sim",IFERROR(VLOOKUP(${cUfFornecedor}${r},$${colAux2}$${linhaUfInicio}:$${colAux3}$${linhaUfFim},2,0),0),0)`,
        resultado ? resultado.adicionalRegiao : 0
      )
      cells[iAliqTotalAntec] = celulaFormula(
        `${cAliqTotalAntec}${r}`, S_ATTR[iAliqTotalAntec],
        `IF(${cSituacaoAntec}${r}="","",${cAliqBaseAntec}${r}+${cAdicional}${r})`,
        resultado ? resultado.aliquotaTotal : ""
      )
      cells[iValorAntec] = celulaFormula(
        `${cValorAntec}${r}`, S_ATTR[iValorAntec],
        `IF(${cSituacaoAntec}${r}="","",ROUND(${cBaseAntec}${r}*${cAliqTotalAntec}${r},2))`,
        resultado ? resultado.valor : ""
      )

      let row = `<row r="${r}">`
      for (const cell of cells) if (cell !== null) row += cell
      row += "</row>"
      return row
    },
    { onProgress }
  )
}

export async function exportarAntecipacaoIcmsStExcel(
  linhas: LinhaEntradaEfd[],
  nomeEmpresa: string,
  onProgress?: (linhaAtual: number, totalLinhas: number) => void
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Automações"
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true
  const { pendente } = await montarAbaAntecipacaoIcmsStCabecalho(wb, linhas, nomeEmpresa)
  const blob = await finalizarExcelComAbasHibridas(wb, pendente ? [pendente] : [], onProgress)

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Antecipação ICMS-ST (Ceará) - ${nomeEmpresa}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
