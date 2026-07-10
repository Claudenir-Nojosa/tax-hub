import ExcelJS from "exceljs"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"

// Aba "Base IBS-CBS" — tabela de referência estática (sem fórmulas, é dado de origem), padrão ou
// customizada (Passo 4 do wizard). Consumida por VLOOKUP na aba "Entradas - EFD ICMS IPI" (Fase 5).

const FONTE = "Calibri"
const HEADERS = [
  "Anexo", "Item", "Descrição Item", "Data Inicial", "Data Final", "Código NCM", "Código NBS",
  "Alíquota de Redução", "Descrição Alíquota", "CST IBS/CBS", "Código Classificação Tributária",
  "Nome Código Classificação Tributária", "Tipo Alíquota",
] as const

export function montarAbaBaseIbsCbs(wb: ExcelJS.Workbook, linhas: LinhaBaseIbsCbs[]) {
  const ws = wb.addWorksheet("Base IBS-CBS", { views: [{ showGridLines: false }] })
  ws.columns = [
    { width: 3 }, { width: 3 },
    { width: 8 }, { width: 8 }, { width: 42 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 22 }, { width: 10 }, { width: 12 }, { width: 32 }, { width: 12 },
  ]

  const tituloCell = ws.getCell("C1")
  tituloCell.value = "Base IBS/CBS"
  tituloCell.font = { name: FONTE, bold: true, size: 12 }

  const headerRow = ws.getRow(2)
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(3 + i)
    cell.value = h
    cell.font = { name: FONTE, bold: true }
  })

  linhas.forEach((l, i) => {
    const row = ws.getRow(3 + i)
    const valores = [
      l.anexo, l.item, l.descricaoItem, l.dataInicial, l.dataFinal, l.codigoNcm, l.codigoNbs,
      l.aliquotaReducao, l.descricaoAliquota, l.cstIbsCbs, l.codigoClassificacaoTributaria,
      l.nomeCodigoClassificacaoTributaria, l.tipoAliquota,
    ]
    valores.forEach((v, ci) => {
      const cell = row.getCell(3 + ci)
      cell.value = v
      cell.font = { name: FONTE, size: 10 }
      if (ci === 7) cell.numFmt = "0%" // Alíquota de Redução
    })
  })

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: 2 }]
}
