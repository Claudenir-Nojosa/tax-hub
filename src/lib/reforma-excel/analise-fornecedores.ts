import ExcelJS from "exceljs"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import { letraColunaEntrada, LINHA_DADOS_INICIO_ENTRADA, LINHA_FIM_RANGE_ENTRADA } from "./entradas-efd"
import { renderizarGraficoFornecedoresPng } from "./grafico-fornecedores"

// Aba "Análise Fornecedores" — no Excel-modelo é construída sobre uma Tabela Dinâmica nativa
// (fórmulas GETPIVOTDATA). ExcelJS não tem API pra criar Tabela Dinâmica nem gráfico nativo do
// Excel (confirmado nesta fase — nem addChart existe na lib). Decisão já validada com o usuário:
// tabela SUMIFS equivalente (mesmo resultado numérico de uma pivot) + gráfico — aqui como imagem
// PNG renderizada com Chart.js e embutida via ws.addImage(), já que gráfico nativo não é possível
// com as ferramentas disponíveis. A imagem é estática (atualiza só quando o Excel é gerado de
// novo), diferente de um gráfico nativo ligado às células — trade-off documentado, não escondido.

const FONTE = "Calibri"

function f(formula: string, result: number): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue, opts?: { bold?: boolean; numFmt?: string; size?: number }) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  return cell
}

export async function montarAbaAnaliseFornecedores(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasEntradas: LinhaEntradaEfd[],
  classificacoes: Record<string, ResultadoConsultaCnpj>
) {
  const ws = wb.addWorksheet("Análise Fornecedores", { views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 20 }, { width: 20 }, { width: 12 }]

  celula(ws, "C1", `PRINCIPAIS FORNECEDORES — ${empresa.razaoSocial || "Empresa"} — SPED FISCAL`, { bold: true, size: 12 })

  celula(ws, "C2", "Rótulos de Linha", { bold: true })
  celula(ws, "D2", "Soma de Vlr Documento", { bold: true })
  celula(ws, "E2", "%", { bold: true })

  const cRegime = letraColunaEntrada("Regime IBS/CBS")
  const cVlrDoc = letraColunaEntrada("Vlr Documento")
  const l1 = LINHA_DADOS_INICIO_ENTRADA
  const l2 = LINHA_FIM_RANGE_ENTRADA
  const rangeVlr = `'Entradas - EFD ICMS IPI'!$${cVlrDoc}$${l1}:$${cVlrDoc}$${l2}`
  const rangeRegime = `'Entradas - EFD ICMS IPI'!$${cRegime}$${l1}:$${cRegime}$${l2}`

  const cnpjsPorRegime = new Map<string, number>()
  let totalRegular = 0
  let totalSimples = 0
  const vistos = new Set<string>()
  for (const l of linhasEntradas) {
    // soma por DOCUMENTO (não por item), pra bater com "Soma de Vlr Documento" — cada Número
    // Documento aparece 1x por item, então deduplica por chave de documento
    const chave = `${l.cnpjFornecedor}|${l.numeroDocumento}|${l.chaveNFe}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const classificacao = classificacoes[l.cnpjFornecedor]
    const simples = classificacao?.simplesNacional === true
    if (simples) totalSimples += l.vlrDocumento
    else totalRegular += l.vlrDocumento
  }
  const totalGeral = totalRegular + totalSimples

  celula(ws, "C3", "Regime Regular")
  celula(ws, "D3", f(`SUMIF(${rangeRegime},"Regime Regular",${rangeVlr})`, totalRegular), { numFmt: "#,##0.00" })
  celula(ws, "E3", f(`IFERROR(D3/D5,0)`, totalGeral > 0 ? totalRegular / totalGeral : 0), { numFmt: "0.0%" })

  celula(ws, "C4", "Simples Nacional")
  celula(ws, "D4", f(`SUMIF(${rangeRegime},"Simples Nacional",${rangeVlr})`, totalSimples), { numFmt: "#,##0.00" })
  celula(ws, "E4", f(`IFERROR(D4/D5,0)`, totalGeral > 0 ? totalSimples / totalGeral : 0), { numFmt: "0.0%" })

  celula(ws, "C5", "Total Geral", { bold: true })
  celula(ws, "D5", f(`SUM(D3:D4)`, totalGeral), { bold: true, numFmt: "#,##0.00" })
  celula(ws, "E5", f(`SUM(E3:E4)`, 1), { bold: true, numFmt: "0.0%" })

  // Gráfico: imagem PNG (ver comentário do topo — ExcelJS não cria gráfico nativo do Excel)
  try {
    const pctRegular = totalGeral > 0 ? totalRegular / totalGeral : 0
    const pctSimples = totalGeral > 0 ? totalSimples / totalGeral : 0
    const pngBuffer = await renderizarGraficoFornecedoresPng(pctRegular, pctSimples)
    const imageId = wb.addImage({ buffer: pngBuffer, extension: "png" })
    ws.addImage(imageId, { tl: { col: 6, row: 1 }, ext: { width: 480, height: 360 } })
    celula(ws, "C7", "Gráfico gerado como imagem — ExcelJS não cria gráficos nativos do Excel; os dados da tabela acima permitem recriar um gráfico interativo (Inserir > Gráfico) se preferir.", { size: 9 })
  } catch {
    // ambiente sem canvas/document (ex: teste em Node puro) — segue sem o gráfico, tabela continua íntegra
    celula(ws, "C7", "Gráfico não pôde ser gerado neste ambiente — os dados da tabela acima permanecem corretos.", { size: 9 })
  }
}
