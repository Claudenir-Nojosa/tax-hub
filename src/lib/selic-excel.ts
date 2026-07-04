import ExcelJS from "exceljs"
import { TAXAS_SELIC } from "./selic-dados"

// Aba "Selic" — réplica da tabela de atualização da planilha de referência do usuário: uma linha
// por mês desde 01/1996, com a taxa mensal e a acumulada usada pela coluna "Atualização" da aba
// de consolidação "PIS e COFINS" (PROCV pela coluna B). Tudo com fórmula, como a referência:
//   B (CRIT_FIM_MES) = FIMMÊS(D;0)   ← chave do PROCV
//   F (SELIC Acumulada) = SOMA(E[n+1]:E$fim) + 0,01   ← soma das taxas dos meses SEGUINTES + 1%
// A tabela vai até dezembro do último ano com taxa conhecida; meses sem taxa publicada ficam com
// E vazio (a SOMA ignora), igual à referência.

const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const TAB_COLOR = "FF1F3864"

export const NOME_ABA_SELIC = "Selic"

// Mesmo valor que o PROCV da consolidação encontra: dado o período do débito ("YYYY-MM"), busca
// o MÊS SEGUINTE (FIMMÊS(E;1)) na tabela e devolve a SELIC Acumulada dele = soma das taxas dos
// meses posteriores + 1%. Usado só pra embutir o `result` das fórmulas — o Excel recalcula ao
// abrir. Retorna null quando o mês seguinte está fora da tabela (fórmula daria #N/D).
export function selicAcumuladaParaPeriodo(competencia: string): number | null {
  const m = competencia.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  let ano = Number(m[1])
  let mes = Number(m[2]) + 1
  if (mes > 12) {
    mes = 1
    ano++
  }
  const chaveSeguinte = `${ano}-${String(mes).padStart(2, "0")}`
  const anoFinalTabela = Number(TAXAS_SELIC[TAXAS_SELIC.length - 1][0].slice(0, 4))
  if (chaveSeguinte < TAXAS_SELIC[0][0] || Number(chaveSeguinte.slice(0, 4)) > anoFinalTabela) return null
  let soma = 0
  for (const [chave, taxa] of TAXAS_SELIC) {
    if (chave > chaveSeguinte) soma += taxa
  }
  return soma + 0.01
}

export function montarAbaSelic(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet(NOME_ABA_SELIC, { views: [{ showGridLines: false, state: "frozen", ySplit: 9 }] })
  ws.properties.tabColor = { argb: TAB_COLOR }
  ws.columns = [{ width: 3 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 16 }]

  const titulo = ws.getCell(6, 2)
  titulo.value = "Tabela atualização taxa SELIC"
  titulo.font = { name: "Calibri", bold: true, size: 12 }

  const link = ws.getCell(7, 2)
  link.value = { text: "🔗 Sicalc — consulta SELIC", hyperlink: "https://sicalc.receita.fazenda.gov.br/sicalc/selic/consulta" }
  link.font = { name: "Calibri", size: 10, color: { argb: "FF0563C1" }, underline: true }

  const ROW_HEADER = 9
  const headers = ["CRIT_FIM_MES", "Parâmetro", "MÊS", "SELIC", "SELIC Acumulada"]
  headers.forEach((h, i) => {
    const cell = ws.getCell(ROW_HEADER, i + 2)
    cell.value = h
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  })

  const taxaPorMes = new Map(TAXAS_SELIC)
  const [primeiroMes] = TAXAS_SELIC[0]
  const [ultimoMesComTaxa] = TAXAS_SELIC[TAXAS_SELIC.length - 1]
  const anoFinal = Number(ultimoMesComTaxa.slice(0, 4))

  // gera 01/1996 .. 12/{ano da última taxa}, com E vazio nos meses ainda sem taxa
  const meses: string[] = []
  let [ano, mes] = primeiroMes.split("-").map(Number)
  while (ano < anoFinal || (ano === anoFinal && mes <= 12)) {
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`)
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
  }

  const primeiraLinha = ROW_HEADER + 1
  const ultimaLinha = ROW_HEADER + meses.length

  // soma acumulada de trás pra frente pra embutir o `result` de F (Excel recalcula ao abrir,
  // mas visualizadores que não recalculam mostram o valor certo)
  const taxasPorLinha = meses.map((m) => taxaPorMes.get(m))
  const acumuladaAposLinha: number[] = new Array(meses.length).fill(0)
  for (let i = meses.length - 2; i >= 0; i--) {
    acumuladaAposLinha[i] = acumuladaAposLinha[i + 1] + (taxasPorLinha[i + 1] ?? 0)
  }

  meses.forEach((m, i) => {
    const r = primeiraLinha + i
    const [a, mm] = m.split("-").map(Number)
    const data = new Date(Date.UTC(a, mm - 1, 1))
    const fimMes = new Date(Date.UTC(a, mm, 0))
    const row = ws.getRow(r)

    const celB = row.getCell(2)
    celB.value = { formula: `EOMONTH(D${r},0)`, result: fimMes } as ExcelJS.CellFormulaValue
    celB.numFmt = "dd/mm/yyyy"

    row.getCell(3).value = i + 1
    const celD = row.getCell(4)
    celD.value = data
    celD.numFmt = "mmm/yyyy"

    const taxa = taxasPorLinha[i]
    const celE = row.getCell(5)
    if (taxa !== undefined) {
      celE.value = taxa
      celE.numFmt = "0.00%"
    }

    const celF = row.getCell(6)
    celF.value = {
      formula: `SUM(E${r + 1}:$E$${ultimaLinha})+0.01`,
      result: acumuladaAposLinha[i] + 0.01,
    } as ExcelJS.CellFormulaValue
    celF.numFmt = "0.00%"

    for (let c = 2; c <= 6; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    }
  })
}
