import ExcelJS from "exceljs"
import { montarAbaChecklist } from "./checklist-excel"
import type { ApuracaoContribuicao, DadosEfdContribuicoes, RegistroAgregadoPisCofins } from "./efd-contribuicoes-parser"
import { labelCstPisCofins } from "./efd-contribuicoes-parser"
import { labelCfop } from "./efd-icms-parser"

// Mesma convenção visual usada em src/lib/pgdas/export-pgdas-excel.ts e
// src/lib/efd-icms-excel.ts (duplicado de propósito pra não arriscar regressão nos exports já
// em produção).
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const PCT = "0.00%"
const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

const COR = {
  cinzaClaro: "FFBFBFBF",
  azulClaro: "FFB4C6E7",
}

const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-")
  const idx = parseInt(mes, 10) - 1
  return `${MESES_ABREV[idx] ?? mes}/${ano}`
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

export interface DeclaracaoEfdContribuicoesRegistro {
  competencia: string
  dados: DadosEfdContribuicoes
}

function dimensoesUnicas(
  porCompetencia: Record<string, DadosEfdContribuicoes>,
  extraiRegistros: (d: DadosEfdContribuicoes) => RegistroAgregadoPisCofins[],
  extraiChave: (r: RegistroAgregadoPisCofins) => string | number
): (string | number)[] {
  const set = new Set<string | number>()
  for (const dados of Object.values(porCompetencia)) {
    for (const r of extraiRegistros(dados)) set.add(extraiChave(r))
  }
  return Array.from(set).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

interface LinhaSpec {
  label: string
  bold?: boolean
  valores?: (dados: DadosEfdContribuicoes | undefined) => number
  destaque?: "cinza" | "azul"
  numFmt?: string
  align?: "left" | "center" | "right"
}

function somaRegistros(
  registros: RegistroAgregadoPisCofins[],
  filtro: (r: RegistroAgregadoPisCofins) => boolean,
  campo: keyof RegistroAgregadoPisCofins
): number {
  return registros.filter(filtro).reduce((s, r) => s + (r[campo] as number), 0)
}

function linhasPorDimensao(
  valores: (string | number)[],
  labelFn: (v: string | number) => string,
  extraiRegistros: (d: DadosEfdContribuicoes | undefined) => RegistroAgregadoPisCofins[],
  filtroDim: (r: RegistroAgregadoPisCofins, v: string | number) => boolean,
  campo: keyof RegistroAgregadoPisCofins
): LinhaSpec[] {
  return valores.map((v): LinhaSpec => ({
    label: `          ${labelFn(v)}`,
    valores: (dados) => somaRegistros(extraiRegistros(dados), (r) => filtroDim(r, v), campo),
  }))
}

// Monta uma aba (PIS ou COFINS) com a mesma estrutura — o único código diferente entre as duas
// contribuições é qual campo de `DadosEfdContribuicoes` cada uma lê.
function montarAbaContribuicao(
  ws: ExcelJS.Worksheet,
  nomeTributo: "PIS" | "COFINS",
  declaracoes: DeclaracaoEfdContribuicoesRegistro[],
  competencias: string[],
  extraiRegistros: (d: DadosEfdContribuicoes | undefined) => RegistroAgregadoPisCofins[],
  extraiApuracao: (d: DadosEfdContribuicoes | undefined) => ApuracaoContribuicao | undefined
) {
  const porCompetencia: Record<string, DadosEfdContribuicoes> = {}
  for (const d of declaracoes) porCompetencia[d.competencia] = d.dados

  const cfops = dimensoesUnicas(porCompetencia, extraiRegistros as any, (r) => r.cfop) as string[]
  const csts = dimensoesUnicas(porCompetencia, extraiRegistros as any, (r) => r.cst) as string[]
  const aliqs = dimensoesUnicas(porCompetencia, extraiRegistros as any, (r) => r.aliquota) as number[]

  const headerRow = ws.getRow(5)
  sc(headerRow.getCell(2), { value: `1. RESUMO ${nomeTributo}`, bold: true })
  competencias.forEach((comp, i) => {
    sc(headerRow.getCell(i + 3), { value: formatarCompetencia(comp), bold: true, align: "right" })
  })

  const linhas: LinhaSpec[] = [
    { label: "                     Valor Total das Receitas", valores: (d) => extraiApuracao(d)?.receitaBruta ?? 0 },
    { label: "" },
    { label: "     22. VALOR OPERACIONAL POR CFOP", bold: true },
    ...linhasPorDimensao(cfops, (v) => labelCfop(v as string), extraiRegistros, (r, v) => r.cfop === v, "valorOperacional"),
    { label: "" },
    { label: "" },
    { label: "     VALOR OPERACIONAL POR CST", bold: true },
    ...linhasPorDimensao(csts, (v) => labelCstPisCofins(v as string), extraiRegistros, (r, v) => r.cst === v, "valorOperacional"),
    { label: "" },
    { label: "     Valor da Base da Contribuição Apurada", valores: (d) => extraiApuracao(d)?.baseCalculoApurada ?? 0 },
    { label: "" },
    { label: "     BASE DE CÁLCULO POR CFOP", bold: true },
    ...linhasPorDimensao(cfops, (v) => labelCfop(v as string), extraiRegistros, (r, v) => r.cfop === v, "baseCalculo"),
    { label: "" },
    { label: "" },
    { label: "     BASE DE CÁLCULO POR CST", bold: true },
    ...linhasPorDimensao(csts, (v) => labelCstPisCofins(v as string), extraiRegistros, (r, v) => r.cst === v, "baseCalculo"),
    { label: "" },
    {
      label: `     ( = ) Débito da Contribuição - Não Cumulativo   ➤  Débito`,
      bold: true,
      destaque: "cinza",
      valores: (d) => extraiApuracao(d)?.valorContribuicaoApurada ?? 0,
    },
    { label: "" },
    { label: "     VALOR DA CONTRIBUIÇÃO POR ALÍQUOTA", bold: true },
    ...linhasPorDimensao(
      aliqs,
      (v) => `Alíquota:   ${(v as number).toFixed(2)}%`,
      extraiRegistros,
      (r, v) => r.aliquota === v,
      "valor"
    ),
    { label: "" },
    { label: "" },
    { label: "     TOTAL DOS DÉBITOS POR CFOP", bold: true },
    ...linhasPorDimensao(cfops, (v) => labelCfop(v as string), extraiRegistros, (r, v) => r.cfop === v, "valor"),
    { label: "" },
    {
      label: `                $  Valor da Contribuição do ${nomeTributo} a Recolher`,
      bold: true,
      destaque: "cinza",
      valores: (d) => extraiApuracao(d)?.valorARecolher ?? 0,
    },
    { label: "" },
    {
      label: "Carga Tributária",
      bold: true,
      align: "right",
      destaque: "azul",
      numFmt: PCT,
      valores: (d) => {
        const apuracao = extraiApuracao(d)
        if (!apuracao || apuracao.receitaBruta === 0) return 0
        return apuracao.valorARecolher / apuracao.receitaBruta
      },
    },
  ]

  const ROW_HEADER = 5
  linhas.forEach((linha, idx) => {
    const row = ws.getRow(idx + ROW_HEADER + 1)
    const bg = linha.destaque === "cinza" ? COR.cinzaClaro : linha.destaque === "azul" ? COR.azulClaro : undefined

    sc(row.getCell(2), { value: linha.label, bold: linha.bold, bg, align: linha.align })
    if (linha.valores) {
      competencias.forEach((comp, i) => {
        sc(row.getCell(i + 3), {
          value: linha.valores!(porCompetencia[comp]),
          numFmt: linha.numFmt ?? BRL,
          align: "right",
          bg,
          bold: linha.bold || linha.destaque === "azul",
        })
      })
    } else if (bg) {
      competencias.forEach((_comp, i) => sc(row.getCell(i + 3), { bg }))
    }
    row.outlineLevel = linha.bold && !linha.destaque ? 0 : 1
  })
}

// Monta as abas "PIS" e "COFINS" dentro de um workbook já existente (permite combinar com a
// aba de ICMS/IPI do mesmo projeto num único arquivo baixado). Não faz download.
//
// GAP CONHECIDO: não inclui a seção de créditos (registros M100/M105/M500/M505) — ver
// src/lib/efd-contribuicoes-parser.ts e docs/recuperacao-credito.md.
export async function montarAbasPisCofins(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoEfdContribuicoesRegistro[],
  nomeCliente: string
): Promise<void> {
  const competencias = Array.from(new Set(declaracoes.map((d) => d.competencia))).sort()
  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  const logoBase64 = await carregarLogoBase64()

  const cnpj = declaracoes[0]?.dados.cnpj ?? ""

  for (const [nomeAba, tituloTributo, extraiRegistros, extraiApuracao] of [
    [
      "PIS",
      "PIS",
      (d: DadosEfdContribuicoes | undefined) => d?.registrosPis ?? [],
      (d: DadosEfdContribuicoes | undefined) => d?.apuracaoPis,
    ],
    [
      "COFINS",
      "COFINS",
      (d: DadosEfdContribuicoes | undefined) => d?.registrosCofins ?? [],
      (d: DadosEfdContribuicoes | undefined) => d?.apuracaoCofins,
    ],
  ] as const) {
    const ws = wb.addWorksheet(nomeAba, {
      views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 5 }],
    })
    ws.columns = [{ width: 3 }, { width: 80 }, ...competencias.map(() => ({ width: 15.5 }))]

    ws.getRow(1).height = 60
    if (logoBase64) {
      const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
      ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
    }
    sc(ws.getCell(3, 2), { value: `${tituloTributo} - ${nomeCurto}`, bold: true, size: 12 })
    if (cnpj) sc(ws.getCell(4, 2), { value: `CNPJ: ${cnpj}`, size: 9 })

    montarAbaContribuicao(ws, tituloTributo, declaracoes, competencias, extraiRegistros, extraiApuracao)
  }
}

// Uso standalone (só PIS/COFINS, sem combinar com a aba de ICMS) — cria o workbook, monta as
// abas e já baixa. Pra combinar com ICMS/IPI num arquivo só, usar
// `exportarDeclaracaoFiscalExcel` em src/lib/recuperacao-credito-excel.ts.
export async function exportarEfdContribuicoesExcel(
  declaracoes: DeclaracaoEfdContribuicoesRegistro[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbasPisCofins(wb, declaracoes, nomeCliente)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - PIS e COFINS - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
