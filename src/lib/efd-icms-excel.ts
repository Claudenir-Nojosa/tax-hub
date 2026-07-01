import ExcelJS from "exceljs"
import type { DadosEfdIcmsIpi, RegistroAgregado } from "./efd-icms-parser"
import { isSaida, labelCfop, labelCst } from "./efd-icms-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Mesma convenção visual usada em src/lib/pgdas/export-pgdas-excel.ts (duplicado de propósito
// pra não arriscar regressão nos exports já em produção).
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const NUM_PLANO = "0.00" // sem "R$", usado só na linha "Saldo a Transportar" (replica o exemplo)
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

export interface DeclaracaoEfdRegistro {
  competencia: string
  dados: DadosEfdIcmsIpi
}

function agregarDeclaracoesEfd(declaracoes: DeclaracaoEfdRegistro[]): {
  competencias: string[]
  porCompetencia: Record<string, DadosEfdIcmsIpi>
} {
  const competencias = Array.from(new Set(declaracoes.map((d) => d.competencia))).sort()
  const porCompetencia: Record<string, DadosEfdIcmsIpi> = {}
  for (const d of declaracoes) porCompetencia[d.competencia] = d.dados
  return { competencias, porCompetencia }
}

function dimensoesUnicas(
  porCompetencia: Record<string, DadosEfdIcmsIpi>,
  filtro: (r: RegistroAgregado) => boolean,
  extrai: (r: RegistroAgregado) => string | number
): (string | number)[] {
  const set = new Set<string | number>()
  for (const dados of Object.values(porCompetencia)) {
    for (const r of dados.registros.filter(filtro)) set.add(extrai(r))
  }
  return Array.from(set).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

interface LinhaSpec {
  label: string
  bold?: boolean
  valores?: (dados: DadosEfdIcmsIpi | undefined) => number
  destaque?: "cinza" | "azul"
  numFmt?: string
  align?: "left" | "center" | "right"
}

// Soma o campo `campo` de todos os registros que passam no `filtro`, dentro de uma declaração.
function somaRegistros(
  dados: DadosEfdIcmsIpi | undefined,
  filtro: (r: RegistroAgregado) => boolean,
  campo: keyof RegistroAgregado
): number {
  if (!dados) return 0
  return dados.registros.filter(filtro).reduce((s, r) => s + (r[campo] as number), 0)
}

function linhasPorDimensao(
  valores: (string | number)[],
  labelFn: (v: string | number) => string,
  filtroDim: (r: RegistroAgregado, v: string | number) => boolean,
  campo: keyof RegistroAgregado
): LinhaSpec[] {
  return valores.map((v): LinhaSpec => ({
    label: `          ${labelFn(v)}`,
    valores: (dados) => somaRegistros(dados, (r) => filtroDim(r, v), campo),
  }))
}

// Monta a aba "ICMS e IPI" dentro de um workbook já existente (permite combinar com outras
// abas — ex.: PIS/COFINS do mesmo projeto — num único arquivo baixado). Não faz download.
export async function montarAbaIcms(
  wb: ExcelJS.Workbook,
  declaracoes: DeclaracaoEfdRegistro[],
  nomeCliente: string
): Promise<void> {
  const { competencias, porCompetencia } = agregarDeclaracoesEfd(declaracoes)

  const cfopsSaida = dimensoesUnicas(porCompetencia, (r) => isSaida(r.cfop), (r) => r.cfop) as string[]
  const cfopsEntrada = dimensoesUnicas(porCompetencia, (r) => !isSaida(r.cfop), (r) => r.cfop) as string[]
  const cstsSaida = dimensoesUnicas(porCompetencia, (r) => isSaida(r.cfop), (r) => r.cst) as string[]
  const cstsEntrada = dimensoesUnicas(porCompetencia, (r) => !isSaida(r.cfop), (r) => r.cst) as string[]
  const aliqsSaida = dimensoesUnicas(porCompetencia, (r) => isSaida(r.cfop), (r) => r.aliquota) as number[]
  const aliqsEntrada = dimensoesUnicas(porCompetencia, (r) => !isSaida(r.cfop), (r) => r.aliquota) as number[]

  const ws = wb.addWorksheet("ICMS e IPI", {
    views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 5 }],
  })

  ws.columns = [{ width: 3 }, { width: 80 }, ...competencias.map(() => ({ width: 15.5 }))]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  sc(ws.getCell(3, 2), { value: `ICMS e IPI - ${nomeCurto}`, bold: true, size: 12 })

  const headerRow = ws.getRow(5)
  sc(headerRow.getCell(2), { value: "1. RESUMO ICMS", bold: true })
  competencias.forEach((comp, i) => {
    sc(headerRow.getCell(i + 3), { value: formatarCompetencia(comp), bold: true, align: "right" })
  })

  const totalOperacionalSaida = (dados: DadosEfdIcmsIpi | undefined) =>
    somaRegistros(dados, (r) => isSaida(r.cfop), "valorOperacional")
  const totalOperacionalEntrada = (dados: DadosEfdIcmsIpi | undefined) =>
    somaRegistros(dados, (r) => !isSaida(r.cfop), "valorOperacional")

  const linhas: LinhaSpec[] = [
    { label: "     Valor Operacional - Saídas/Prestações", valores: totalOperacionalSaida },
    { label: "" },
    { label: "     2. VALOR OPERACIONAL POR REGISTRO - SAÍDAS/PRESTAÇÕES", bold: true },
    { label: "          C100/C190 - Nota Fiscal", valores: totalOperacionalSaida },
    { label: "" },
    { label: "" },
    { label: "     19. VALOR OPERACIONAL POR CFOP - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(cfopsSaida, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorOperacional"),
    { label: "" },
    { label: "" },
    { label: "     29. VALOR DA OPERAÇÃO POR CST - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(cstsSaida, (v) => labelCst(v as string), (r, v) => isSaida(r.cfop) && r.cst === v, "valorOperacional"),
    { label: "" },
    { label: "                   Base de Cálculo - Saídas/Prestações", valores: (d) => somaRegistros(d, (r) => isSaida(r.cfop), "baseCalculo") },
    { label: "" },
    { label: "     4. BASE DE CÁLCULO POR CFOP - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(cfopsSaida, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "baseCalculo"),
    { label: "" },
    { label: "" },
    { label: "     6. BASE DE CÁLCULO POR CST - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(cstsSaida, (v) => labelCst(v as string), (r, v) => isSaida(r.cfop) && r.cst === v, "baseCalculo"),
    { label: "" },
    {
      label: "     ( = ) Total dos débitos   ➤  Débito",
      bold: true,
      destaque: "cinza",
      valores: (d) => d?.apuracaoIcms.totalDebitos ?? 0,
    },
    { label: "" },
    { label: "     17. VALOR DO ICMS POR ALÍQUOTA - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(
      aliqsSaida,
      (v) => `Alíquota de ICMS:   ${(v as number).toFixed(2).padStart(5, "0")}%`,
      (r, v) => isSaida(r.cfop) && r.aliquota === v,
      "valorIcms"
    ),
    { label: "" },
    { label: "" },
    { label: "     27 - TOTAL DOS DÉBITOS POR CFOP", bold: true },
    ...linhasPorDimensao(cfopsSaida, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorIcms"),
    { label: "" },
    { label: "     Valor Operacional - Entradas/Aquisições", valores: totalOperacionalEntrada },
    { label: "" },
    { label: "     3. VALOR OPERACIONAL POR REGISTRO - ENTRADAS/AQUISIÇÕES", bold: true },
    { label: "          C100/C190 - Nota Fiscal", valores: totalOperacionalEntrada },
    { label: "" },
    { label: "" },
    { label: "     20. VALOR OPERACIONAL POR CFOP - ENTRADAS/AQUISIÇÕES", bold: true },
    ...linhasPorDimensao(cfopsEntrada, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorOperacional"),
    { label: "" },
    { label: "" },
    { label: "     32. VALOR DA OPERAÇÃO POR CST - ENTRADAS", bold: true },
    ...linhasPorDimensao(cstsEntrada, (v) => labelCst(v as string), (r, v) => !isSaida(r.cfop) && r.cst === v, "valorOperacional"),
    { label: "" },
    { label: "                   Base de Cálculo - Entradas/Aquisições", valores: (d) => somaRegistros(d, (r) => !isSaida(r.cfop), "baseCalculo") },
    { label: "" },
    { label: "     5. BASE DE CÁLCULO POR CFOP - ENTRADAS/AQUISIÇÕES", bold: true },
    ...linhasPorDimensao(cfopsEntrada, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "baseCalculo"),
    { label: "" },
    { label: "" },
    { label: "     7. BASE DE CÁLCULO POR CST - ENTRADAS/AQUISIÇÕES", bold: true },
    ...linhasPorDimensao(cstsEntrada, (v) => labelCst(v as string), (r, v) => !isSaida(r.cfop) && r.cst === v, "baseCalculo"),
    { label: "" },
    {
      label: "     ( = ) Total dos Créditos   ➤  Crédito",
      bold: true,
      destaque: "cinza",
      valores: (d) => d?.apuracaoIcms.totalCreditos ?? 0,
    },
    { label: "" },
    { label: "     18. VALOR DO ICMS POR ALÍQUOTA - ENTRADAS/AQUISIÇÕES", bold: true },
    ...linhasPorDimensao(
      aliqsEntrada,
      (v) => `Alíquota:   ${(v as number).toFixed(2)}`,
      (r, v) => !isSaida(r.cfop) && r.aliquota === v,
      "valorIcms"
    ),
    { label: "" },
    { label: "" },
    { label: "     28 - TOTAL DOS CRÉDITOS POR CFOP", bold: true },
    ...linhasPorDimensao(cfopsEntrada, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorIcms"),
    { label: "" },
    { label: "     ( = ) Saldo Devedor Apurado", valores: (d) => d?.apuracaoIcms.saldoApurado ?? 0 },
    {
      label: "                💲  Total de ICMS a Recolher",
      bold: true,
      destaque: "cinza",
      valores: (d) => d?.apuracaoIcms.icmsARecolher ?? 0,
    },
    { label: "" },
    { label: "     23. ABERTURA ICMS A RECOLHER POR CNPJ", bold: true },
    {
      label: `          ${declaracoes[0]?.dados.cnpj ?? ""} - ${declaracoes[0]?.dados.uf ?? ""}`,
      valores: (d) => d?.apuracaoIcms.icmsARecolher ?? 0,
    },
    { label: "" },
    { label: "" },
    { label: "     25. ABERTURA ICMS A RECOLHER POR UF", bold: true },
    { label: `          ${declaracoes[0]?.dados.uf ?? ""}`, valores: (d) => d?.apuracaoIcms.icmsARecolher ?? 0 },
    { label: "" },
    { label: "" },
    { label: "     22. ABERTURA SALDO A TRANSPORTAR POR CNPJ", bold: true },
    {
      label: `          ${declaracoes[0]?.dados.cnpj ?? ""} - ${declaracoes[0]?.dados.uf ?? ""}`,
      valores: (d) => d?.apuracaoIcms.saldoCredorTransportar ?? 0,
      numFmt: NUM_PLANO,
    },
    { label: "" },
    { label: "" },
    // IPI — usa a mesma base de registros C190 (campo VL_IPI), agregado por CFOP. A apuração de
    // IPI a nível de saldo devedor/credor (registro E520) não está incluída ainda: o layout
    // exato de campos do E520 não pôde ser validado contra um arquivo real com IPI diferente de
    // zero (ver ficheiro de decisões da Recuperação de Crédito).
    { label: "     31. VALOR DE IPI POR CFOP - SAÍDAS/PRESTAÇÕES", bold: true },
    ...linhasPorDimensao(cfopsSaida, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorIpi"),
    { label: "" },
    { label: "" },
    { label: "     33. VALOR DE IPI POR CFOP - ENTRADAS/AQUISIÇÕES", bold: true },
    ...linhasPorDimensao(cfopsEntrada, (v) => labelCfop(v as string), (r, v) => r.cfop === v, "valorIpi"),
    { label: "" },
    {
      label: "Carga Tributária",
      bold: true,
      align: "right",
      destaque: "azul",
      numFmt: PCT,
      valores: (dados) => {
        const saida = totalOperacionalSaida(dados)
        if (!dados || saida === 0) return 0
        return dados.apuracaoIcms.icmsARecolher / saida
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

// Uso standalone (só ICMS/IPI, sem combinar com outras abas) — cria o workbook, monta a aba e
// já baixa. Pra combinar com PIS/COFINS num arquivo só, usar `exportarDeclaracaoFiscalExcel`
// em src/lib/recuperacao-credito-excel.ts.
export async function exportarEfdIcmsExcel(
  declaracoes: DeclaracaoEfdRegistro[],
  nomeCliente: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbaIcms(wb, declaracoes, nomeCliente)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - ICMS e IPI - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
