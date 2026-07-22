import ExcelJS from "exceljs"
import type { LinhaEntradaEfd } from "./efd-icms-ipi-entradas-parser"

// Aba "Entradas" — réplica dos dados brutos item a item (registros C100/C170 do EFD ICMS/IPI),
// mesma granularidade da aba "Entradas" de uma planilha de referência real do usuário (cliente
// GIGI Tecidos). As linhas vêm de `parseEntradasEfdIcmsIpi` (src/lib/efd-icms-ipi-entradas-parser.ts,
// já usado pela Reforma Tributária, reaproveitado aqui sem alteração). A planilha de referência
// também tinha 6 colunas de "oportunidade de crédito ICMS-ST" dependentes de uma tabela de
// alíquotas pesquisada manualmente pela equipe pra aquele cliente/produto/UF/período (VLOOKUP na
// aba "De x para") — decisão deliberada, confirmada com o usuário: NÃO replicar essas colunas
// aqui, por não serem generalizáveis a partir do EFD sozinho. Ver docs/recuperacao-credito.md
// seção 4 (GAP CONHECIDO — oportunidade ICMS-ST).

// Mesma convenção visual usada nos outros exports deste módulo (duplicado de propósito — ver
// docs/recuperacao-credito.md seção 12).
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

// PA "YYYY-MM" → Date do 1º dia do mês (mesma convenção usada nas outras abas do módulo).
function paParaData(pa: string): Date | string {
  const m = /^(\d{4})-(\d{2})$/.exec(pa)
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : pa
}

// Descrições de CFOP de entrada — mesma lista usada na aba "Entradas - EFD ICMS IPI" da Reforma
// Tributária (src/lib/reforma-excel/entradas-efd.ts), extraída da planilha-original do usuário.
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

interface ColunaEntrada {
  nome: string
  valor: (l: LinhaEntradaEfd) => string | number | Date | null
  monetaria?: boolean
  largura?: number
}

const COLUNAS: ColunaEntrada[] = [
  { nome: "CNPJ", valor: (l) => l.cnpj, largura: 17 },
  { nome: "PA", valor: (l) => paParaData(l.pa), largura: 12 },
  { nome: "Empresa", valor: (l) => l.empresa, largura: 30 },
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
  { nome: "Data Entrada/Saída", valor: (l) => l.dataEntradaSaida || null, largura: 14 },
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
  { nome: "Alíquota ICMS", valor: (l) => l.aliquotaIcms, largura: 14 },
  { nome: "Vlr ICMS", valor: (l) => l.vlrIcms, monetaria: true, largura: 16 },
  { nome: "Vlr Base Cálculo ICMS-ST", valor: (l) => l.vlrBaseCalculoIcmsSt, monetaria: true, largura: 18 },
  { nome: "Alíquota ICMS-ST", valor: (l) => l.aliquotaIcmsSt, largura: 14 },
  { nome: "Vlr ICMS-ST", valor: (l) => l.vlrIcmsSt, monetaria: true, largura: 16 },
  { nome: "CST IPI", valor: (l) => l.cstIpi || null },
  { nome: "Vlr Base Cálculo IPI", valor: (l) => l.vlrBaseCalculoIpi, monetaria: true, largura: 18 },
  { nome: "Alíquota IPI", valor: (l) => l.aliquotaIpi, largura: 14 },
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

export interface DeclaracaoEntradasRegistro {
  competencia: string
  linhasEntrada?: LinhaEntradaEfd[]
}

const LINHA_HEADER = 6

export async function montarAbaEntradas(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoEntradasRegistro[],
  nomeCliente: string
): Promise<void> {
  const linhas = declaracoes.flatMap((d) => d.linhasEntrada ?? [])
  if (linhas.length === 0) return

  const ws = wb.addWorksheet("Entradas", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF1F3864" }

  ws.columns = [{ width: 3 }, ...COLUNAS.map((c) => ({ width: c.largura ?? 12 }))]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  sc(ws.getCell(3, 2), { value: `Entradas - EFD ICMS IPI - ${nomeCurto}`, bold: true, size: 12 })

  ws.addTable({
    name: "EntradasEfd",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: COLUNAS.map((c) => ({ name: c.nome, filterButton: true })),
    rows: linhas.map((l) => COLUNAS.map((c) => c.valor(l))),
  })

  // Linha acima do cabeçalho: SUBTOTAL (respeita filtro) em todas as colunas monetárias.
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(linhas.length, 1)
  COLUNAS.forEach((c, i) => {
    if (!c.monetaria) return
    const col = i + 2 // B = coluna 2
    const soma = linhas.reduce((s, l) => s + (Number(c.valor(l)) || 0), 0)
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,EntradasEfd[${c.nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  })

  // Formatação das linhas de dados: contábil nas colunas monetárias, data nas colunas de
  // data/PA, tudo centralizado exceto colunas de texto longo (alinhadas à esquerda).
  const COLS_ESQUERDA = new Set(["Empresa", "Nome Fornecedor", "Descrição Item", "Natureza Crédito", "Descrição CFOP"])
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    COLUNAS.forEach((c, i) => {
      const col = i + 2
      const cell = row.getCell(col)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: COLS_ESQUERDA.has(c.nome) ? "left" : "center", vertical: "middle" }
      if (c.monetaria) cell.numFmt = BRL
      if (c.nome === "PA") cell.numFmt = "mm-dd-yy"
    })
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  COLUNAS.forEach((_c, i) => {
    sc(headerRow.getCell(i + 2), { bold: true, align: "center", color: COR_HEADER_TEXTO, bg: COR_HEADER_BG })
  })

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}

// Uso standalone (só a aba Entradas, sem combinar com ICMS/IPI) — cria o workbook, monta a aba e
// já baixa. Pra combinar com a aba "ICMS e IPI" num arquivo só, usar `exportarEfdIcmsExcel` em
// src/lib/efd-icms-excel.ts ou o orquestrador `exportarDeclaracaoFiscalExcel`.
export async function exportarEntradasIcmsExcel(
  declaracoes: DeclaracaoEntradasRegistro[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbaEntradas(wb, declaracoes, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - Entradas - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
