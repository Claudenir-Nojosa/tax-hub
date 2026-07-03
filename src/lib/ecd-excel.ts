import ExcelJS from "exceljs"
import type { DadosEcd, ContaEcd } from "./ecd-parser"
import { montarAbaChecklist } from "./checklist-excel"

// Estilo Excel Table (filtro + zebra + congelado) das outras abas do módulo — duplicado de
// propósito, ver docs.
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const TAB_COLOR = "FF1F3864"
const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"
const MESES_TRI = ["MAR", "JUN", "SET"] as const

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const bloco = 0x8000
  for (let i = 0; i < bytes.length; i += bloco) binario += String.fromCharCode(...bytes.subarray(i, i + bloco))
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

export interface DeclaracaoEcdRegistro {
  competencia: string // ano "YYYY"
  dados: DadosEcd
}

// compara códigos formatados hierarquicamente (segmento a segmento, numérico)
function compararCodigo(a: string, b: string): number {
  const pa = a.split(".")
  const pb = b.split(".")
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number(pa[i] ?? -1)
    const nb = Number(pb[i] ?? -1)
    if (na !== nb) return na - nb
  }
  return 0
}

interface ColunaPeriodo {
  label: string // "MAR/2021"
  ano: string
  campo?: "saldoMar" | "saldoJun" | "saldoSet"
  dezDoProximo?: string // ano do arquivo cuja abertura vira o Dez desta coluna
}

// Monta a aba "Balanço Patrimonial (ECD)" — Código, Conta, Tipo, Natureza + colunas trimestrais
// (Mar/Jun/Set do ano vêm do próprio arquivo; Dez/Y = abertura do arquivo Y+1).
export async function montarAbaEcd(
  wb: ExcelJS.Workbook,
  registros: DeclaracaoEcdRegistro[],
  logoBase64: string | null
): Promise<void> {
  const anos = [...new Set(registros.map((r) => r.dados.anoCalendario))].sort()
  const porAno = new Map(registros.map((r) => [r.dados.anoCalendario, r.dados]))

  // colunas de período
  const colunas: ColunaPeriodo[] = []
  for (const ano of anos) {
    for (const campo of ["saldoMar", "saldoJun", "saldoSet"] as const) {
      colunas.push({ label: `${MESES_TRI[["saldoMar", "saldoJun", "saldoSet"].indexOf(campo)]}/${ano}`, ano, campo })
    }
    const proximo = String(Number(ano) + 1)
    if (porAno.has(proximo)) colunas.push({ label: `DEZ/${ano}`, ano, dezDoProximo: proximo })
  }

  // união de contas por código (info do arquivo mais recente que a tem)
  const uniao = new Map<string, ContaEcd>()
  for (const ano of anos) {
    for (const c of porAno.get(ano)!.contas) uniao.set(c.codCta, c) // anos crescentes => fica a mais recente
  }
  // saldo de uma conta numa coluna (módulo; vazio se a conta não existe naquele arquivo)
  const valor = (codCta: string, col: ColunaPeriodo): number | "" => {
    if (col.dezDoProximo) {
      const conta = porAno.get(col.dezDoProximo)?.contas.find((c) => c.codCta === codCta)
      return conta ? Math.abs(conta.abertura) : ""
    }
    const conta = porAno.get(col.ano)?.contas.find((c) => c.codCta === codCta)
    return conta ? Math.abs(conta[col.campo!]) : ""
  }

  // só contas do Balanço Patrimonial (Ativo/Passivo/PL) com algum saldo não-zero
  const contasBP = [...uniao.values()]
    .filter((c) => ["01", "02", "03"].includes(c.codNat))
    .map((c) => ({ conta: c, valores: colunas.map((col) => valor(c.codCta, col)) }))
    .filter((x) => x.valores.some((v) => typeof v === "number" && Math.abs(v) > 0.005))
    .sort((a, b) => compararCodigo(a.conta.codFormatado, b.conta.codFormatado))

  const ws = wb.addWorksheet("Balanço Patrimonial (ECD)", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: TAB_COLOR }

  const cabecalhos = ["Código Conta", "Conta", "Tipo Conta", "Natureza", ...colunas.map((c) => c.label)]
  const larguras = [22, 55, 14, 20, ...colunas.map(() => 15)]
  ws.columns = [{ width: 3 }, ...larguras.map((w) => ({ width: w }))]

  ws.getRow(1).height = 60
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }
  const tituloCell = ws.getCell(3, 2)
  tituloCell.value = "Balanço Patrimonial (ECD)"
  tituloCell.font = { name: "Calibri", bold: true, size: 12 }

  const LINHA_HEADER = 6
  const ultimaColuna = cabecalhos.length + 1

  ws.addTable({
    name: "BalancoPatrimonialEcd",
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: cabecalhos.map((name) => ({ name, filterButton: true })),
    rows:
      contasBP.length > 0
        ? contasBP.map(({ conta, valores }) => [conta.codFormatado, conta.nome, conta.tipo, conta.natureza, ...valores])
        : [cabecalhos.map(() => "")],
  })

  // Formatação: monetário nas colunas de período (a partir da 6), Conta à esquerda
  const primeiraLinhaDados = LINHA_HEADER + 1
  const ultimaLinhaDados = LINHA_HEADER + Math.max(contasBP.length, 1)
  for (let r = primeiraLinhaDados; r <= ultimaLinhaDados; r++) {
    const row = ws.getRow(r)
    for (let c = 2; c <= ultimaColuna; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: c === 3 ? "left" : "center", vertical: "middle" }
      if (c >= 6) cell.numFmt = BRL
    }
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= ultimaColuna; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: LINHA_HEADER }]
}

export async function montarAbasEcd(wb: ExcelJS.Workbook, registros: DeclaracaoEcdRegistro[]): Promise<void> {
  if (registros.length === 0) return
  const logoBase64 = await carregarLogoBase64()
  await montarAbaEcd(wb, registros, logoBase64)
}

// Uso standalone (só ECD) — cria o workbook, monta a aba (+ Checklist) e baixa.
export async function exportarEcdExcel(registros: DeclaracaoEcdRegistro[], nomeCliente: string): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  await montarAbasEcd(wb, registros)
  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - Balanço Patrimonial ECD - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
