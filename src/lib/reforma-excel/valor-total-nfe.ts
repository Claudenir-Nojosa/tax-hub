import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import { letraColunaAno, LINHA_DADOS_INICIO_ANO, LINHA_FIM_RANGE_ANO } from "./anos"
import { layoutListasPremissas, listaEstabelecimentos, LISTA_ANOS } from "./premissas-legislacoes"

// Aba "Valor Total NF-e" — dropdowns (Estabelecimento/Documento/Ano) cruzando as abas de ano via
// INDIRECT (o nome da aba muda conforme o Ano escolhido, então SUMIFS sozinho não alcança — mesma
// necessidade que levou o modelo a usar VLOOKUP/lista suspensa pro mesmo fim).

const FONTE = "Calibri"

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue, opts?: { bold?: boolean; numFmt?: string }) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: 11, bold: opts?.bold ?? false }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  return cell
}

export function montarAbaValorTotalNfe(wb: ExcelJS.Workbook, empresa: EmpresaData, linhasSaidas: LinhaSaidaEfd[]) {
  const ws = wb.addWorksheet("Valor Total NF-e", { views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 22 }, { width: 30 }]

  celula(ws, "C1", "Valor Total NF-e", { bold: true })

  const layout = layoutListasPremissas(listaEstabelecimentos(empresa, linhasSaidas).length)

  celula(ws, "C2", "Estabelecimento")
  celula(ws, "D2", "Todos")
  ws.getCell("D2").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaTodos}:$C$${layout.linhaEstabelecimentoFim}`],
  }

  celula(ws, "C3", "CNPJ")
  celula(
    ws, "D3",
    f(
      `IFERROR(VLOOKUP(D2,Premissas!$C$${layout.linhaTodos}:$D$${layout.linhaEstabelecimentoFim},2,FALSE),"Todos")`,
      "Todos"
    ),
    { numFmt: "@" }
  )

  celula(ws, "C4", "Documento")
  celula(ws, "D4", "Nota Fiscal de Mercadoria (DANFE)")
  ws.getCell("D4").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaDocumentoDanfe}:$C$${layout.linhaDocumentoNfs}`],
  }

  celula(ws, "C5", "Ano")
  celula(ws, "D5", LISTA_ANOS[0])
  ws.getCell("D5").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaAnoInicio}:$C$${layout.linhaAnoFim}`],
  }

  const cCnpj = letraColunaAno("CNPJ")
  const cDocumento = letraColunaAno("Documento")
  const cTotalCliente = letraColunaAno("TOTAL NF CLIENTE")
  const l1 = LINHA_DADOS_INICIO_ANO
  const l2 = LINHA_FIM_RANGE_ANO

  const rangeTotal = `INDIRECT("'"&$D$5&"'!$${cTotalCliente}$${l1}:$${cTotalCliente}$${l2}")`
  const rangeCnpj = `INDIRECT("'"&$D$5&"'!$${cCnpj}$${l1}:$${cCnpj}$${l2}")`
  const rangeDoc = `INDIRECT("'"&$D$5&"'!$${cDocumento}$${l1}:$${cDocumento}$${l2}")`

  // resultado default calculado em JS (Estabelecimento=Todos, Documento=DANFE, Ano=1º da lista) —
  // espelha o que a fórmula produz ao abrir o arquivo com os valores padrão dos dropdowns
  const totalPadrao = linhasSaidas
    .filter((l) => l.documento === "Nota Fiscal de Mercadoria (DANFE)")
    // F550 (consolidação) não tem Vlr Item por linha — TOTAL NF CLIENTE parte do Vlr Documento,
    // mesma regra da coluna BY das abas de ano (ver anos.ts)
    .reduce((s, l) => s + ((l.registros.startsWith("F550") ? l.vlrDocumento : l.vlrItem) - l.vlrDescontoItem), 0)

  celula(ws, "C6", "VALOR TOTAL DA NOTA FISCAL", { bold: true })
  celula(
    ws, "D6",
    f(
      `IF($D$2="Todos",SUMIFS(${rangeTotal},${rangeDoc},$D$4),SUMIFS(${rangeTotal},${rangeCnpj},$D$3,${rangeDoc},$D$4))`,
      totalPadrao
    ),
    { bold: true, numFmt: "#,##0.00" }
  )
}
