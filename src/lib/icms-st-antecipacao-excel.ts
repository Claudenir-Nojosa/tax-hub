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

// Export da automação "Antecipação ICMS-ST (Ceará)" — mesma convenção visual usada em todo o
// projeto (helpers duplicados de propósito, ver docs/recuperacao-credito.md seção 12).
//
// Traz TODOS os campos brutos do item (mesmo conjunto de colunas da aba "Entradas" da
// Recuperação de Crédito, src/lib/entradas-icms-excel.ts — duplicado de propósito, não
// reaproveitado por import, mesmo padrão já usado no resto do módulo) + as 7 colunas de
// ICMS-ST no final, em FÓRMULA (não valor estático) — pedido explícito do usuário. As fórmulas
// consultam duas tabelas auxiliares fora da área visível (CSOSN e UF→Adicional), mesma técnica
// da aba "Entradas - EFD ICMS IPI" da Reforma Tributária.
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

interface LinhaCalculada {
  linha: LinhaEntradaEfd
  resultado: ResultadoAntecipacaoItem | null
}

// "YYYY-MM" → Date do 1º dia do mês (mesma convenção da aba "Entradas") — precisa ser um Date de
// verdade (não texto) pro AutoFilter do Excel agrupar por ano.
function paParaData(pa: string): Date | string {
  const m = /^(\d{4})-(\d{2})$/.exec(pa)
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : pa
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
  largura?: number
}

// Colunas brutas — mesmo conjunto/ordem da aba "Entradas" (src/lib/entradas-icms-excel.ts).
const COLUNAS_BRUTAS: Coluna[] = [
  { nome: "CNPJ", valor: (l) => l.cnpj, largura: 17 },
  { nome: "Competência", valor: (l) => paParaData(l.pa), largura: 12, data: true },
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

// Colunas calculadas (ICMS-ST) — sem `valor`: preenchidas por fórmula depois do addTable. Nomes
// com sufixo "Antecipação" pra não colidir com as colunas brutas homônimas (ex.: "Situação" da
// nota vs. "Situação Antecipação" da regra de ICMS-ST).
const COLUNAS_CALCULADAS: Coluna[] = [
  { nome: "Situação Antecipação", largura: 20 },
  { nome: "Origem Estrangeira", largura: 16 },
  { nome: "Base Cálculo Antecipação", largura: 18, monetaria: true },
  { nome: "Alíquota Base Antecipação", largura: 16, percentual: true },
  { nome: "Adicional Região", largura: 16, percentual: true },
  { nome: "Alíquota Total Antecipação", largura: 16, percentual: true },
  { nome: "Valor Antecipação ICMS-ST", largura: 20, monetaria: true },
]

const LINHA_HEADER = 6

export async function montarAbaAntecipacaoIcmsSt(wb: ExcelJS.Workbook, linhas: LinhaEntradaEfd[], nomeEmpresa: string): Promise<LinhaCalculada[]> {
  const calculadas: LinhaCalculada[] = linhas.map((linha) => ({ linha, resultado: calcularAntecipacaoItem(linha) }))

  const colunas = [...COLUNAS_BRUTAS, ...COLUNAS_CALCULADAS]
  const COL_INICIO = 2 // B — coluna A é a margem
  const idx = Object.fromEntries(colunas.map((c, i) => [c.nome, i])) as Record<string, number>
  const letra = (nome: string) => colLetra(COL_INICIO + idx[nome])

  const ws = wb.addWorksheet("Antecipação ICMS-ST", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF1F3864" }

  // Tabelas auxiliares que as fórmulas consultam — bem depois da última coluna de dados, fora
  // da área visível/impressa (mesma técnica de reforma-excel/entradas-efd.ts).
  const colAux1 = colLetra(COL_INICIO + colunas.length + 2)
  const colAux2 = colLetra(COL_INICIO + colunas.length + 3)
  const colAux3 = colLetra(COL_INICIO + colunas.length + 4)
  const LINHA_CSOSN_INICIO = 2
  const LINHA_UF_INICIO = 2

  const cCfop = letra("CFOP"), cSituacaoAntec = letra("Situação Antecipação"), cCst = letra("CST ICMS"),
    cOrigem = letra("Origem Estrangeira"), cDataEntrada = letra("Data Entrada/Saída"), cVlrItem = letra("Vlr Item"),
    cVlrDescItem = letra("Vlr Desconto Item"), cBaseAntec = letra("Base Cálculo Antecipação"),
    cAliqBaseAntec = letra("Alíquota Base Antecipação"), cAdicional = letra("Adicional Região"),
    cAliqTotalAntec = letra("Alíquota Total Antecipação"), cUfFornecedor = letra("UF Fornecedor"),
    cValorAntec = letra("Valor Antecipação ICMS-ST")

  ws.columns = [{ width: 3 }, ...colunas.map((c) => ({ width: c.largura ?? 12 }))]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 41 } })
  }

  const nomeCurto = nomeEmpresa.trim().split(/\s+/)[0] || nomeEmpresa
  sc(ws.getCell(3, 2), { value: `Antecipação ICMS-ST (Ceará) - ${nomeCurto}`, bold: true, size: 12 })

  // Tabelas auxiliares — mesma fonte de dados que o cálculo em JS (CODIGOS_CSOSN, REGIAO_UF,
  // adicionalRegiao), pra nunca divergir.
  sc(ws.getCell(`${colAux1}1`), { value: "CSOSN", bold: true })
  CODIGOS_CSOSN.forEach((codigo, i) => {
    ws.getCell(`${colAux1}${LINHA_CSOSN_INICIO + i}`).value = codigo
  })
  sc(ws.getCell(`${colAux2}1`), { value: "UF", bold: true })
  sc(ws.getCell(`${colAux3}1`), { value: "Adicional", bold: true })
  const ufs = Object.keys(REGIAO_UF)
  ufs.forEach((uf, i) => {
    const r = LINHA_UF_INICIO + i
    ws.getCell(`${colAux2}${r}`).value = uf
    ws.getCell(`${colAux3}${r}`).value = adicionalRegiao(uf)
  })
  const linhaUfFim = LINHA_UF_INICIO + ufs.length - 1

  ws.addTable({
    name: "AntecipacaoIcmsSt",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((c) => ({ name: c.nome, filterButton: true })),
    rows: calculadas.map(({ linha, resultado }) =>
      colunas.map((c) => {
        if (c.valor) return c.valor(linha)
        // colunas calculadas: valor inicial só pra existir na tabela, sobrescrito com fórmula abaixo
        if (c.nome === "Situação Antecipação") return resultado ? LABEL_SITUACAO[resultado.situacao] : null
        if (c.nome === "Origem Estrangeira") return resultado ? (resultado.origemEstrangeira ? "Sim" : "Não") : null
        if (c.nome === "Base Cálculo Antecipação") return resultado ? resultado.base : null
        if (c.nome === "Alíquota Base Antecipação") return resultado ? resultado.aliquotaBase : null
        if (c.nome === "Adicional Região") return resultado ? resultado.adicionalRegiao : null
        if (c.nome === "Alíquota Total Antecipação") return resultado ? resultado.aliquotaTotal : null
        return resultado ? resultado.valor : null // Valor Antecipação ICMS-ST
      })
    ),
  })

  // Sobrescreve as 7 colunas calculadas com fórmulas — o addTable acima só serviu pra criar a
  // estrutura da tabela com um valor inicial; a partir daqui cada célula vira {formula, result},
  // com o result pré-calculado em JS (mesma técnica de consolidacao-pis-cofins-excel.ts) pra
  // visualizadores sem recálculo automático.
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(calculadas.length, 1)
  const f = (formula: string, result: ExcelJS.CellValue) => ({ formula, result } as unknown as ExcelJS.CellFormulaValue)

  calculadas.forEach(({ resultado }, i) => {
    const r = primeiraLinhaDados + i

    ws.getCell(`${cSituacaoAntec}${r}`).value = f(
      `IF(${cCfop}${r}="1403","Dentro do Estado",IF(${cCfop}${r}="2403","Fora do Estado",""))`,
      resultado ? LABEL_SITUACAO[resultado.situacao] : ""
    )
    ws.getCell(`${cOrigem}${r}`).value = f(
      `IF(${cSituacaoAntec}${r}="","",IF(AND(${cSituacaoAntec}${r}="Fora do Estado",COUNTIF($${colAux1}$${LINHA_CSOSN_INICIO}:$${colAux1}$${LINHA_CSOSN_INICIO + CODIGOS_CSOSN.length - 1},${cCst}${r})=0,OR(LEFT(${cCst}${r},1)="1",LEFT(${cCst}${r},1)="2",LEFT(${cCst}${r},1)="3",LEFT(${cCst}${r},1)="8")),"Sim","Não"))`,
      resultado ? (resultado.origemEstrangeira ? "Sim" : "Não") : ""
    )
    ws.getCell(`${cBaseAntec}${r}`).value = f(
      `IF(${cSituacaoAntec}${r}="","",${cVlrItem}${r}-${cVlrDescItem}${r})`,
      resultado ? resultado.base : ""
    )
    ws.getCell(`${cAliqBaseAntec}${r}`).value = f(
      `IF(${cSituacaoAntec}${r}="","",IF(${cSituacaoAntec}${r}="Fora do Estado",IF(${cDataEntrada}${r}>=DATE(2024,1,1),0.089,0.08),IF(${cDataEntrada}${r}>=DATE(2024,1,1),0.0333,0.03)))`,
      resultado ? resultado.aliquotaBase : ""
    )
    ws.getCell(`${cAdicional}${r}`).value = f(
      `IF(${cOrigem}${r}="Sim",IFERROR(VLOOKUP(${cUfFornecedor}${r},$${colAux2}$${LINHA_UF_INICIO}:$${colAux3}$${linhaUfFim},2,0),0),0)`,
      resultado ? resultado.adicionalRegiao : 0
    )
    ws.getCell(`${cAliqTotalAntec}${r}`).value = f(
      `IF(${cSituacaoAntec}${r}="","",${cAliqBaseAntec}${r}+${cAdicional}${r})`,
      resultado ? resultado.aliquotaTotal : ""
    )
    ws.getCell(`${cValorAntec}${r}`).value = f(
      `IF(${cSituacaoAntec}${r}="","",ROUND(${cBaseAntec}${r}*${cAliqTotalAntec}${r},2))`,
      resultado ? resultado.valor : ""
    )
  })

  const ROW_SUBTOTAL = LINHA_HEADER - 1
  colunas.forEach((c, i) => {
    if (!c.monetaria) return
    const col = COL_INICIO + i
    const soma = calculadas.reduce((s, l) => {
      if (c.nome === "Base Cálculo Antecipação") return s + (l.resultado?.base ?? 0)
      if (c.nome === "Valor Antecipação ICMS-ST") return s + (l.resultado?.valor ?? 0)
      const valor = c.valor ? c.valor(l.linha) : null
      return s + (typeof valor === "number" ? valor : 0)
    }, 0)
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,AntecipacaoIcmsSt[${c.nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  })

  const COLS_ESQUERDA = new Set(["Empresa", "Nome Fornecedor", "Descrição Item", "Natureza Crédito", "Descrição CFOP"])
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    colunas.forEach((c, i) => {
      const col = COL_INICIO + i
      const cell = row.getCell(col)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: COLS_ESQUERDA.has(c.nome) ? "left" : "center", vertical: "middle" }
      if (c.monetaria) cell.numFmt = BRL
      if (c.percentual) cell.numFmt = "0.00%"
      if (c.data) cell.numFmt = "mm-dd-yy"
    })
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  colunas.forEach((_c, i) => {
    sc(headerRow.getCell(COL_INICIO + i), { bold: true, align: "center", color: COR_HEADER_TEXTO, bg: COR_HEADER_BG })
  })

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]

  return calculadas
}

export async function exportarAntecipacaoIcmsStExcel(linhas: LinhaEntradaEfd[], nomeEmpresa: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Automações"
  wb.created = new Date()
  await montarAbaAntecipacaoIcmsSt(wb, linhas, nomeEmpresa)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Antecipação ICMS-ST (Ceará) - ${nomeEmpresa}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
