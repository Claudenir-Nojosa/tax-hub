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

// Export da automação "Antecipação ICMS-ST (Ceará)" — mesma convenção visual usada em todo o
// projeto (helpers duplicados de propósito, ver docs/recuperacao-credito.md seção 12).
//
// Colunas de I a S (Situação, Origem Estrangeira, Base de Cálculo, Alíquota Base, Adicional
// Região, Alíquota Total, Valor Antecipação ICMS-ST) saem em FÓRMULA, não como valor estático —
// pedido explícito do usuário, mesmo padrão já usado nas abas de consolidação (PIS e COFINS /
// IRPJ e CSLL) da Recuperação de Crédito: o analista pode corrigir um CFOP, um CST ou um valor de
// item na planilha e o resto recalcula sozinho. As fórmulas consultam duas tabelas auxiliares
// (fora da área visível/impressa, colunas U em diante): lista de códigos CSOSN e a tabela
// UF→Adicional — mesma técnica (tabela auxiliar + VLOOKUP/IF) já usada na aba "Entradas - EFD
// ICMS IPI" da Reforma Tributária (src/lib/reforma-excel/entradas-efd.ts).
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

// "YYYY-MM" → Date do 1º dia do mês, mesma convenção usada na aba "Entradas" da Recuperação de
// Crédito — precisa ser um Date de verdade (não texto) pro AutoFilter do Excel agrupar por ano.
function paParaData(pa: string): Date | string {
  const m = /^(\d{4})-(\d{2})$/.exec(pa)
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : pa
}

function f(formula: string, result: ExcelJS.CellValue): ExcelJS.CellFormulaValue {
  return { formula, result } as unknown as ExcelJS.CellFormulaValue
}

const LINHA_HEADER = 6
// Tabelas auxiliares — fora da área visível/impressa da tabela principal (que termina em S).
const COL_CSOSN = "U" // U2:U11 — lista de códigos CSOSN
const LINHA_CSOSN_INICIO = 2
const COL_UF = "V" // V2:V28 — UF
const COL_ADICIONAL_UF = "W" // W2:W28 — Adicional se origem estrangeira
const LINHA_UF_INICIO = 2

// Todo item de toda nota entra na listagem (decisão confirmada com o usuário) — só os itens com
// CFOP 1403/2403 têm `resultado` preenchido; os demais aparecem com as colunas de ICMS-ST em
// branco, mantendo os dados brutos do item (Vlr Item, Vlr Desconto Item etc.).
export async function montarAbaAntecipacaoIcmsSt(wb: ExcelJS.Workbook, linhas: LinhaEntradaEfd[], nomeEmpresa: string): Promise<LinhaCalculada[]> {
  const calculadas: LinhaCalculada[] = linhas.map((linha) => ({ linha, resultado: calcularAntecipacaoItem(linha) }))

  const ws = wb.addWorksheet("Antecipação ICMS-ST", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: "FF1F3864" }

  const colunas = [
    { nome: "Competência", largura: 12, data: true },
    { nome: "CNPJ", largura: 17 },
    { nome: "Empresa", largura: 26 },
    { nome: "Fornecedor", largura: 30 },
    { nome: "CNPJ/CPF Fornecedor", largura: 17 },
    { nome: "UF Fornecedor", largura: 12 },
    { nome: "CFOP", largura: 10 },
    { nome: "Situação", largura: 20 },
    { nome: "CST ICMS", largura: 10 },
    { nome: "Origem Estrangeira", largura: 16 },
    { nome: "Data Entrada", largura: 14, data: true },
    { nome: "Vlr Item", largura: 16, monetaria: true },
    { nome: "Vlr Desconto Item", largura: 16, monetaria: true },
    { nome: "Base de Cálculo", largura: 16, monetaria: true },
    { nome: "Alíquota Base", largura: 14 },
    { nome: "Adicional Região", largura: 16 },
    { nome: "Alíquota Total", largura: 14 },
    { nome: "Valor Antecipação ICMS-ST", largura: 20, monetaria: true },
  ]
  // índice (0-based) de cada coluna, pra montar as fórmulas por letra sem números mágicos
  const idx = Object.fromEntries(colunas.map((c, i) => [c.nome, i])) as Record<string, number>
  const letra = (nome: string) => {
    const n = idx[nome] + 2 // B = 2 (col A é a margem)
    return String.fromCharCode(64 + n) // funciona até Z, suficiente aqui (última é S)
  }
  const cH = letra("CFOP"), cI = letra("Situação"), cJ = letra("CST ICMS"), cK = letra("Origem Estrangeira"),
    cL = letra("Data Entrada"), cM = letra("Vlr Item"), cN = letra("Vlr Desconto Item"),
    cO = letra("Base de Cálculo"), cP = letra("Alíquota Base"), cQ = letra("Adicional Região"),
    cR = letra("Alíquota Total")

  ws.columns = [{ width: 3 }, ...colunas.map((c) => ({ width: c.largura }))]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 41 } })
  }

  const nomeCurto = nomeEmpresa.trim().split(/\s+/)[0] || nomeEmpresa
  sc(ws.getCell(3, 2), { value: `Antecipação ICMS-ST (Ceará) - ${nomeCurto}`, bold: true, size: 12 })

  // Tabelas auxiliares que as fórmulas consultam (COUNTIF/VLOOKUP) — mesma fonte de dados que o
  // cálculo em JS usa (CODIGOS_CSOSN, REGIAO_UF, adicionalRegiao), pra nunca divergir.
  sc(ws.getCell(`${COL_CSOSN}1`), { value: "CSOSN", bold: true })
  CODIGOS_CSOSN.forEach((codigo, i) => {
    ws.getCell(`${COL_CSOSN}${LINHA_CSOSN_INICIO + i}`).value = codigo
  })
  sc(ws.getCell(`${COL_UF}1`), { value: "UF", bold: true })
  sc(ws.getCell(`${COL_ADICIONAL_UF}1`), { value: "Adicional", bold: true })
  const ufs = Object.keys(REGIAO_UF)
  ufs.forEach((uf, i) => {
    const r = LINHA_UF_INICIO + i
    ws.getCell(`${COL_UF}${r}`).value = uf
    ws.getCell(`${COL_ADICIONAL_UF}${r}`).value = adicionalRegiao(uf)
  })
  const linhaUfFim = LINHA_UF_INICIO + ufs.length - 1

  ws.addTable({
    name: "AntecipacaoIcmsSt",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((c) => ({ name: c.nome, filterButton: true })),
    rows: calculadas.map(({ linha, resultado }) => [
      paParaData(linha.pa),
      linha.cnpj,
      linha.empresa,
      linha.nomeFornecedor || null,
      linha.cnpjFornecedor || linha.cpfFornecedor || null,
      linha.ufFornecedor || null,
      linha.cfop,
      resultado ? LABEL_SITUACAO[resultado.situacao] : null, // sobrescrito com fórmula abaixo
      linha.cstIcms || null,
      resultado ? (resultado.origemEstrangeira ? "Sim" : "Não") : null, // idem
      parseDataBr(linha.dataEntradaSaida) ?? linha.dataEntradaSaida,
      linha.vlrItem,
      linha.vlrDescontoItem,
      resultado ? resultado.base : null, // idem
      resultado ? resultado.aliquotaBase : null, // idem
      resultado ? resultado.adicionalRegiao : null, // idem
      resultado ? resultado.aliquotaTotal : null, // idem
      resultado ? resultado.valor : null, // idem
    ]),
  })

  // Sobrescreve as colunas calculadas (I, K, O, P, Q, R, S) com fórmulas — o addTable acima só
  // serviu pra criar a estrutura da tabela com um valor inicial; a partir daqui cada célula vira
  // {formula, result}, com o result pré-calculado em JS (mesma técnica de
  // consolidacao-pis-cofins-excel.ts) pra visualizadores sem recálculo automático.
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(calculadas.length, 1)
  calculadas.forEach(({ resultado }, i) => {
    const r = primeiraLinhaDados + i

    ws.getCell(`${cI}${r}`).value = f(
      `IF(${cH}${r}="1403","Dentro do Estado",IF(${cH}${r}="2403","Fora do Estado",""))`,
      resultado ? LABEL_SITUACAO[resultado.situacao] : ""
    )
    ws.getCell(`${cK}${r}`).value = f(
      `IF(${cI}${r}="","",IF(AND(${cI}${r}="Fora do Estado",COUNTIF($${COL_CSOSN}$${LINHA_CSOSN_INICIO}:$${COL_CSOSN}$${LINHA_CSOSN_INICIO + CODIGOS_CSOSN.length - 1},${cJ}${r})=0,OR(LEFT(${cJ}${r},1)="1",LEFT(${cJ}${r},1)="2",LEFT(${cJ}${r},1)="3",LEFT(${cJ}${r},1)="8")),"Sim","Não"))`,
      resultado ? (resultado.origemEstrangeira ? "Sim" : "Não") : ""
    )
    ws.getCell(`${cO}${r}`).value = f(`IF(${cI}${r}="","",${cM}${r}-${cN}${r})`, resultado ? resultado.base : "")
    ws.getCell(`${cP}${r}`).value = f(
      `IF(${cI}${r}="","",IF(${cI}${r}="Fora do Estado",IF(${cL}${r}>=DATE(2024,1,1),0.089,0.08),IF(${cL}${r}>=DATE(2024,1,1),0.0333,0.03)))`,
      resultado ? resultado.aliquotaBase : ""
    )
    ws.getCell(`${cQ}${r}`).value = f(
      `IF(${cK}${r}="Sim",IFERROR(VLOOKUP(${letra("UF Fornecedor")}${r},$${COL_UF}$${LINHA_UF_INICIO}:$${COL_ADICIONAL_UF}$${linhaUfFim},2,0),0),0)`,
      resultado ? resultado.adicionalRegiao : 0
    )
    ws.getCell(`${cR}${r}`).value = f(`IF(${cI}${r}="","",${cP}${r}+${cQ}${r})`, resultado ? resultado.aliquotaTotal : "")
    ws.getCell(`${letra("Valor Antecipação ICMS-ST")}${r}`).value = f(
      `IF(${cI}${r}="","",ROUND(${cO}${r}*${cR}${r},2))`,
      resultado ? resultado.valor : ""
    )
  })

  const ROW_SUBTOTAL = LINHA_HEADER - 1
  colunas.forEach((c, i) => {
    if (!c.monetaria) return
    const col = i + 2
    const soma = calculadas.reduce((s, l) => {
      const campo = c.nome === "Vlr Item" ? l.linha.vlrItem
        : c.nome === "Vlr Desconto Item" ? l.linha.vlrDescontoItem
        : c.nome === "Base de Cálculo" ? (l.resultado?.base ?? 0)
        : (l.resultado?.valor ?? 0)
      return s + campo
    }, 0)
    const cell = ws.getCell(ROW_SUBTOTAL, col)
    cell.value = { formula: `SUBTOTAL(9,AntecipacaoIcmsSt[${c.nome}])`, result: soma } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  })

  const COLS_ESQUERDA = new Set(["Empresa", "Fornecedor"])
  const COLS_PCT = new Set(["Alíquota Base", "Adicional Região", "Alíquota Total"])
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    colunas.forEach((c, i) => {
      const col = i + 2
      const cell = row.getCell(col)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: COLS_ESQUERDA.has(c.nome) ? "left" : "center", vertical: "middle" }
      if (c.monetaria) cell.numFmt = BRL
      if (COLS_PCT.has(c.nome)) cell.numFmt = "0.00%"
      if (c.data) cell.numFmt = "mm-dd-yy"
    })
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  colunas.forEach((_c, i) => {
    sc(headerRow.getCell(i + 2), { bold: true, align: "center", color: COR_HEADER_TEXTO, bg: COR_HEADER_BG })
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
