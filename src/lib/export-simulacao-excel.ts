import * as XLSX from "xlsx"
import type { ResultadoAno } from "./reforma-engine"

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v)

const PCT = (v: number) =>
  `${(v * 100).toFixed(2)}%`

function criarAbaAno(wb: XLSX.WorkBook, r: ResultadoAno, temFCBF: boolean) {
  const rows: (string | number)[][] = [
    [`Simulação Reforma Tributária — ${r.ano}`],
    [],
    ["REGIME ATUAL (BASELINE)", "", ""],
    ["", "Valor (R$)", "% Receita"],
    ["PIS/COFINS", r.pisCofinsAtual, PCT(r.pisCofinsAtual / (r.cargaAtualTotal / r.cargaAtualPct || 1))],
    ["ICMS", r.icmsAtual, ""],
    ["IPI", r.ipiAtual, ""],
    ["Carga Total Atual", r.cargaAtualTotal, PCT(r.cargaAtualPct)],
    [],
    ["REGIME REFORMA (IBS/CBS)", "", ""],
    ["", "Valor (R$)", "% Receita"],
    ["CBS (federal)", r.cbs, ""],
    ["IBS UF (estadual)", r.ibsUF, ""],
    ["IBS MUN (municipal)", r.ibsMUN, ""],
    ["IBS/CBS Total", r.ibsCbsTotal, PCT(r.ibsCbsPct)],
    ["ICMS Residual", r.icmsReforma, ""],
    ["IPI Residual", r.ipiReforma, ""],
    ["(-) Crédito IBS/CBS Compras", -r.creditoCompras, ""],
    ["Carga Total Reforma", r.cargaReformaTotal, PCT(r.cargaReformaPct)],
    [],
  ]

  if (temFCBF) {
    rows.push(
      ["FCBF — FUNDO DE COMBATE À POBREZA", "", ""],
      ["Economia FCBF", -r.fcbfEconomia, ""],
      ["Carga Líquida c/ FCBF", r.cargaLiquidaComFcbf, PCT(r.cargaLiquidaPct)],
      [],
    )
  }

  rows.push(
    ["VARIAÇÃO ANUAL (DELTA)", "", ""],
    ["Delta (Reforma − Atual)", r.delta, PCT(r.deltaPct)],
    [r.delta < 0 ? "→ Economia com a Reforma" : "→ Custo Adicional com a Reforma", "", ""],
    [],
    ["INFORMAÇÕES DO PERÍODO", "", ""],
    ["Fator Redução ICMS", PCT(r.icmsReducaoFator), ""],
    ["IPI Extinto", r.ipiExtinto ? "Sim" : "Não", ""],
    ["Base EFD utilizada", r.usouEfd ? "Sim" : "Não", ""],
  )

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Largura das colunas
  ws["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 14 }]

  // Formatação numérica para células de valor
  // Linhas de valor: percorre e formata com BRL
  const currencyRows = [5, 6, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19]
  for (const row of currencyRows) {
    const cell = ws[XLSX.utils.encode_cell({ r: row - 1, c: 1 })]
    if (cell) cell.z = "#,##0.00"
  }

  XLSX.utils.book_append_sheet(wb, ws, String(r.ano))
}

function criarAbaResumo(wb: XLSX.WorkBook, resultados: ResultadoAno[], temFCBF: boolean) {
  const header1 = ["Indicador", ...resultados.map((r) => String(r.ano))]

  const rows: (string | number)[][] = [
    ["ANÁLISE COMPARATIVA — REFORMA TRIBUTÁRIA EC 132/2023 + LC 214/2025"],
    [],
    header1,
    [],
    ["── CARGA ATUAL (BASELINE) ──"],
    ["PIS/COFINS Atual", ...resultados.map((r) => r.pisCofinsAtual)],
    ["ICMS Atual", ...resultados.map((r) => r.icmsAtual)],
    ["IPI Atual", ...resultados.map((r) => r.ipiAtual)],
    ["Carga Total Atual (R$)", ...resultados.map((r) => r.cargaAtualTotal)],
    ["Carga Atual (%)", ...resultados.map((r) => PCT(r.cargaAtualPct))],
    [],
    ["── CARGA REFORMA ──"],
    ["CBS (R$)", ...resultados.map((r) => r.cbs)],
    ["IBS UF (R$)", ...resultados.map((r) => r.ibsUF)],
    ["IBS MUN (R$)", ...resultados.map((r) => r.ibsMUN)],
    ["IBS/CBS Total (R$)", ...resultados.map((r) => r.ibsCbsTotal)],
    ["ICMS Residual (R$)", ...resultados.map((r) => r.icmsReforma)],
    ["IPI Residual (R$)", ...resultados.map((r) => r.ipiReforma)],
    ["(-) Crédito IBS/CBS (R$)", ...resultados.map((r) => -r.creditoCompras)],
    ["Carga Total Reforma (R$)", ...resultados.map((r) => r.cargaReformaTotal)],
    ["Carga Reforma (%)", ...resultados.map((r) => PCT(r.cargaReformaPct))],
    [],
    ["── VARIAÇÃO (DELTA) ──"],
    ["Delta Anual (R$)", ...resultados.map((r) => r.delta)],
    ["Delta Anual (%)", ...resultados.map((r) => PCT(r.deltaPct))],
    [],
    ["── FCBF ──"],
    ["Economia FCBF (R$)", ...resultados.map((r) => r.fcbfEconomia)],
    ["Carga Líquida c/ FCBF (R$)", ...resultados.map((r) => r.cargaLiquidaComFcbf)],
    ["Carga Líquida c/ FCBF (%)", ...resultados.map((r) => PCT(r.cargaLiquidaPct))],
    [],
    ["── ACUMULADO ──"],
  ]

  // Delta acumulado progressivo
  let acum = 0
  const acumRow: (string | number)[] = ["Delta Acumulado (R$)"]
  for (const r of resultados) {
    acum += r.delta
    acumRow.push(acum)
  }
  rows.push(acumRow)

  const totalDelta = resultados.reduce((s, r) => s + r.delta, 0)
  const totalFCBF = resultados.reduce((s, r) => s + r.fcbfEconomia, 0)
  rows.push(
    ["Total Delta 2026–2033 (R$)", totalDelta, ...Array(resultados.length - 1).fill("")],
    ["Total Economia FCBF (R$)", totalFCBF, ...Array(resultados.length - 1).fill("")],
    [],
    ["── METADADOS ──"],
    ["Fator Redução ICMS (%)", ...resultados.map((r) => PCT(r.icmsReducaoFator))],
    ["IPI Extinto", ...resultados.map((r) => (r.ipiExtinto ? "Sim" : "Não"))],
    ["Base EFD utilizada", ...resultados.map((r) => (r.usouEfd ? "Sim" : "Não"))],
    [],
    [
      totalDelta < 0
        ? `Resultado: ECONOMIA de ${BRL(Math.abs(totalDelta))} no período 2026–2033`
        : `Resultado: CUSTO ADICIONAL de ${BRL(totalDelta)} no período 2026–2033`,
    ],
  )

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = [
    { wch: 35 },
    ...resultados.map(() => ({ wch: 18 })),
  ]

  XLSX.utils.book_append_sheet(wb, ws, "Resumo Comparativo")
}

export function exportarSimulacaoExcel(
  resultados: ResultadoAno[],
  temFCBF: boolean,
  nomeEmpresa?: string,
) {
  const wb = XLSX.utils.book_new()

  // Aba resumo primeiro
  criarAbaResumo(wb, resultados, temFCBF)

  // Uma aba por ano
  for (const r of resultados) {
    criarAbaAno(wb, r, temFCBF)
  }

  const nome = nomeEmpresa
    ? `simulacao_${nomeEmpresa.replace(/[^a-zA-Z0-9]/g, "_")}_reforma.xlsx`
    : "simulacao_reforma_tributaria.xlsx"

  XLSX.writeFile(wb, nome)
}
