import ExcelJS from "exceljs"
import type { DadosEcf, LinhaEcf, PeriodoEcf } from "./ecf-parser"
import { labelPeriodoEcf, valorLinhaEcf } from "./ecf-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Mesma convenção visual usada nos outros exports deste módulo (duplicado de propósito — ver
// docs/recuperacao-credito.md).
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const PCT = "0.00%"

const COR = {
  cinzaClaro: "FFBFBFBF",
  azulClaro: "FFB4C6E7",
}

const LOGO_URL = "/icons/taxhub_logo_full.png"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function sc(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bold?: boolean
    align?: "left" | "center" | "right"
    numFmt?: string
    bg?: string
    color?: string
    size?: number
  }
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

export interface DeclaracaoEcfRegistro {
  competencia: string // ano-calendário "YYYY"
  dados: DadosEcf
}

// Uma coluna por período de apuração (trimestre), ao longo de todos os anos importados.
interface ColunaEcf {
  label: string // "1T/2021"
  chave: string // "2021-T01" — chave usada pelas refs da consolidação IRPJ/CSLL
  periodo: PeriodoEcf
}

// Endereço + valor da célula "$ ... A PAGAR" por tributo × período ("YYYY-TXX") — é o "Apuração
// Débito Original" que a aba de consolidação "IRPJ e CSLL" referencia por fórmula (ver
// src/lib/consolidacao-pis-cofins-excel.ts). O valor vai junto pra consolidação embutir o
// `result` sem duplicar a regra do código a pagar (P300/15, P500/13).
export interface RefsDebitoEcf {
  celulaPorTributo: {
    IRPJ: Record<string, { celula: string; valor: number }>
    CSLL: Record<string, { celula: string; valor: number }>
  }
}

function montarColunas(declaracoes: DeclaracaoEcfRegistro[]): ColunaEcf[] {
  const colunas: ColunaEcf[] = []
  const ordenadas = [...declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const d of ordenadas) {
    const periodos = [...d.dados.periodos].sort((a, b) => a.periodo.localeCompare(b.periodo))
    for (const p of periodos) {
      colunas.push({
        label: labelPeriodoEcf(p.periodo, d.dados.anoCalendario),
        chave: `${d.dados.anoCalendario}-${p.periodo}`,
        periodo: p,
      })
    }
  }
  return colunas
}

const RECEITA_PERCENTUAL_RE = /^Receita Bruta Sujeita ao Percentual/i
const DEDUCAO_RE = /^\(-\)/

// Linhas de dimensão (receitas por percentual, deduções): união dos códigos com valor != 0 em
// pelo menos um período, rotuladas com a descrição do próprio arquivo (a mais recente vence, já
// que versões novas do layout às vezes reescrevem o texto).
function dimensaoNaoZerada(
  colunas: ColunaEcf[],
  extraiLinhas: (p: PeriodoEcf) => LinhaEcf[],
  filtro: (l: LinhaEcf) => boolean
): { codigo: string; descricao: string }[] {
  const porCodigo = new Map<string, { descricao: string; temValor: boolean }>()
  for (const col of colunas) {
    for (const l of extraiLinhas(col.periodo)) {
      if (!filtro(l)) continue
      const atual = porCodigo.get(l.codigo)
      porCodigo.set(l.codigo, {
        descricao: l.descricao,
        temValor: (atual?.temValor ?? false) || (l.valor !== null && l.valor !== 0),
      })
    }
  }
  return [...porCodigo.entries()]
    .filter(([, v]) => v.temValor)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([codigo, v]) => ({ codigo, descricao: v.descricao }))
}

interface LinhaSpec {
  label: string
  bold?: boolean
  valores?: (p: PeriodoEcf) => number
  destaque?: "cinza" | "azul"
  numFmt?: string
  align?: "left" | "center" | "right"
}

function somaDeducoes(linhas: LinhaEcf[]): number {
  return linhas.filter((l) => DEDUCAO_RE.test(l.descricao)).reduce((s, l) => s + (l.valor ?? 0), 0)
}

function receitaBrutaTotal(linhas: LinhaEcf[]): number {
  return linhas.filter((l) => RECEITA_PERCENTUAL_RE.test(l.descricao)).reduce((s, l) => s + (l.valor ?? 0), 0)
}

// Monta uma aba (IRPJ ou CSLL) — a estrutura é a mesma, muda a origem dos números:
// IRPJ lê P200 (base) + P300 (cálculo); CSLL lê P400 (base) + P500 (cálculo).
function montarAbaTributoEcf(
  ws: ExcelJS.Worksheet,
  nomeTributo: "IRPJ" | "CSLL",
  colunas: ColunaEcf[],
  extraiBase: (p: PeriodoEcf) => LinhaEcf[],
  extraiCalculo: (p: PeriodoEcf) => LinhaEcf[],
  linhasCalculoEspecificas: LinhaSpec[],
  codigoAPagar: string
): Record<string, { celula: string; valor: number }> {
  const receitas = dimensaoNaoZerada(colunas, extraiBase, (l) => RECEITA_PERCENTUAL_RE.test(l.descricao))
  const deducoes = dimensaoNaoZerada(colunas, extraiCalculo, (l) => DEDUCAO_RE.test(l.descricao))

  const headerRow = ws.getRow(5)
  sc(headerRow.getCell(2), { value: `1. ${nomeTributo} - LUCRO PRESUMIDO`, bold: true })
  colunas.forEach((col, i) => {
    sc(headerRow.getCell(i + 3), { value: col.label, bold: true, align: "center" })
  })

  const linhas: LinhaSpec[] = [
    { label: "     RECEITA BRUTA POR PERCENTUAL DE PRESUNÇÃO", bold: true },
    ...receitas.map(
      (r): LinhaSpec => ({
        label: `          ${r.descricao}`,
        valores: (p) => valorLinhaEcf(extraiBase(p), r.codigo),
      })
    ),
    { label: "" },
    ...linhasCalculoEspecificas,
    {
      label: "     ( - ) DEDUÇÕES",
      bold: true,
      valores: (p) => somaDeducoes(extraiCalculo(p)),
    },
    { label: "" },
    { label: "     2. DEDUÇÕES - LUCRO PRESUMIDO", bold: true },
    ...deducoes.map(
      (d): LinhaSpec => ({
        label: `          ${d.codigo} - ${d.descricao}`,
        valores: (p) => valorLinhaEcf(extraiCalculo(p), d.codigo),
      })
    ),
    { label: "" },
    {
      label: `                $  ${nomeTributo === "IRPJ" ? "IMPOSTO DE RENDA" : "CSLL"} A PAGAR`,
      bold: true,
      destaque: "cinza",
      valores: (p) => valorLinhaEcf(extraiCalculo(p), codigoAPagar),
    },
    { label: "" },
    // Espelho do "a pagar" — mesma suposição do exemplo de referência do usuário (as duas linhas
    // vinham idênticas), já que DCTF é outra obrigação, fora dos arquivos importados.
    { label: "     Valor do Débito Apurado na DCTF", valores: (p) => valorLinhaEcf(extraiCalculo(p), codigoAPagar) },
    // Mesma decisão deliberada do módulo PGDAS: comprovação via e-CAC é outra fonte de dados,
    // fora do escopo — fica 0.
    { label: "     e-CAC - Pagamentos Consolidados/Darfs", valores: () => 0 },
    { label: "" },
    {
      label: "Carga Tributária",
      bold: true,
      align: "right",
      destaque: "azul",
      numFmt: PCT,
      valores: (p) => {
        const receita = receitaBrutaTotal(extraiBase(p))
        if (receita === 0) return 0
        return valorLinhaEcf(extraiCalculo(p), codigoAPagar) / receita
      },
    },
  ]

  const ROW_HEADER = 5
  const idxLinhaAPagar = linhas.findIndex((l) => l.destaque === "cinza")
  linhas.forEach((linha, idx) => {
    const row = ws.getRow(idx + ROW_HEADER + 1)
    const bg = linha.destaque === "cinza" ? COR.cinzaClaro : linha.destaque === "azul" ? COR.azulClaro : undefined

    sc(row.getCell(2), { value: linha.label, bold: linha.bold, bg, align: linha.align })
    if (linha.valores) {
      colunas.forEach((col, i) => {
        sc(row.getCell(i + 3), {
          value: linha.valores!(col.periodo),
          numFmt: linha.numFmt ?? BRL,
          align: "right",
          bg,
          bold: linha.bold || linha.destaque === "azul",
        })
      })
    } else if (bg) {
      colunas.forEach((_col, i) => sc(row.getCell(i + 3), { bg }))
    }
    row.outlineLevel = linha.bold && !linha.destaque ? 0 : 1
  })

  const linhaAPagar = idxLinhaAPagar + ROW_HEADER + 1
  const refs: Record<string, { celula: string; valor: number }> = {}
  colunas.forEach((col, i) => {
    refs[col.chave] = {
      celula: `'${nomeTributo}'!${ws.getCell(linhaAPagar, i + 3).address}`,
      valor: valorLinhaEcf(extraiCalculo(col.periodo), codigoAPagar),
    }
  })
  return refs
}

// Monta as abas "IRPJ" e "CSLL" dentro de um workbook já existente (permite combinar com as
// outras abas do mesmo projeto num único arquivo baixado). Não faz download.
export async function montarAbasEcf(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoEcfRegistro[],
  nomeCliente: string
): Promise<RefsDebitoEcf> {
  const colunas = montarColunas(declaracoes)
  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  const logoBase64 = await carregarLogoBase64()
  const refs: RefsDebitoEcf = { celulaPorTributo: { IRPJ: {}, CSLL: {} } }

  const abas: {
    nome: "IRPJ" | "CSLL"
    tabColor: string
    extraiBase: (p: PeriodoEcf) => LinhaEcf[]
    extraiCalculo: (p: PeriodoEcf) => LinhaEcf[]
    linhas: LinhaSpec[]
    codigoAPagar: string
  }[] = [
    {
      nome: "IRPJ",
      tabColor: "FF1F3864",
      extraiBase: (p) => p.p200,
      extraiCalculo: (p) => p.p300,
      // Códigos validados como estáveis nas versões de layout 0008-0011 (ver ecf-parser.ts)
      linhas: [
        { label: "     RESULTADO SOBRE A RECEITA BRUTA AJUSTADO", valores: (p) => valorLinhaEcf(p.p200, "10") },
        { label: "     BASE DE CÁLCULO", valores: (p) => valorLinhaEcf(p.p300, "1") },
        { label: "" },
        { label: "     Alíquota de 15%", valores: (p) => valorLinhaEcf(p.p300, "3") },
        { label: "     Adicional", valores: (p) => valorLinhaEcf(p.p300, "4") },
        { label: "     Diferença de IR (Mudança de Coeficiente)", valores: (p) => valorLinhaEcf(p.p300, "5") },
      ],
      codigoAPagar: "15",
    },
    {
      nome: "CSLL",
      tabColor: "FF1F3864",
      extraiBase: (p) => p.p400,
      extraiCalculo: (p) => p.p500,
      linhas: [
        { label: "     RESULTADO SOBRE A RECEITA BRUTA AJUSTADO", valores: (p) => valorLinhaEcf(p.p400, "6") },
        { label: "     BASE DE CÁLCULO", valores: (p) => valorLinhaEcf(p.p500, "1") },
        { label: "" },
        { label: "     CSLL Apurada", valores: (p) => valorLinhaEcf(p.p500, "2") },
        { label: "     TOTAL DA CONTRIBUIÇÃO SOBRE O LUCRO LÍQUIDO", valores: (p) => valorLinhaEcf(p.p500, "4") },
      ],
      codigoAPagar: "13",
    },
  ]

  for (const aba of abas) {
    const ws = wb.addWorksheet(aba.nome, {
      views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 5 }],
    })
    ws.properties.tabColor = { argb: aba.tabColor }
    ws.columns = [{ width: 3 }, { width: 80 }, ...colunas.map(() => ({ width: 15.5 }))]

    ws.getRow(1).height = 60
    if (logoBase64) {
      const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
      ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
    }
    sc(ws.getCell(3, 2), { value: `${aba.nome} - Lucro Presumido - ${nomeCurto}`, bold: true, size: 12 })

    refs.celulaPorTributo[aba.nome] = montarAbaTributoEcf(
      ws,
      aba.nome,
      colunas,
      aba.extraiBase,
      aba.extraiCalculo,
      aba.linhas,
      aba.codigoAPagar
    )
  }
  return refs
}

// Uso standalone (só IRPJ/CSLL, sem combinar com outras abas) — cria o workbook, monta as abas
// (+ Checklist) e já baixa. Pra combinar com os outros tipos num arquivo só, usar
// `exportarDeclaracaoFiscalExcel` em src/lib/recuperacao-credito-excel.ts.
export async function exportarEcfExcel(declaracoes: DeclaracaoEcfRegistro[], nomeCliente: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbasEcf(wb, declaracoes, nomeCliente)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - IRPJ e CSLL - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
