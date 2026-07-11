import ExcelJS from "exceljs"
import { ANOS_TRANSICAO } from "@/lib/reforma-engine"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import type { LegislacaoData } from "@/components/reforma/StepLegislacaoIA"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import { colLetra } from "./coluna-letra"
import { REDUCAO_ICMS_ISS } from "./calculo-linha-ano"

// Gera as abas "Premissas" e "Legislações" do Excel de entrega, seguindo o layout exato do
// modelo (ver docs/reforma-tributaria-v2.md): fórmulas nativas (padrão f(formula,result) de
// consolidacao-pis-cofins-excel.ts/selic-excel.ts), fonte Calibri, e a aba Legislações com B4 em
// diante deliberadamente em branco — a nota que o usuário escreveu no wizard (Passo 3) é só um
// apoio de decisão (ex: confirmar a redução de 60%), não é escrita no Excel entregue.

const FONTE = "Calibri"

function f(formula: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

function celula(ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue, opts?: { bold?: boolean; size?: number; numFmt?: string }) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: opts?.size ?? 11, bold: opts?.bold ?? false }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  return cell
}

export function montarAbaPremissas(wb: ExcelJS.Workbook, premissas: PremissasReformaData, empresa: EmpresaData) {
  const ws = wb.addWorksheet("Premissas", { views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 26 }, ...ANOS_TRANSICAO.map(() => ({ width: 12 }))]

  celula(ws, "C1", "Alíquotas Estimadas", { bold: true, size: 12 })

  // Linha 3: cabeçalho de anos
  celula(ws, "C3", "IBS/CBS", { bold: true })
  ANOS_TRANSICAO.forEach((ano, i) => celula(ws, `${colLetra(4 + i)}3`, ano, { bold: true }))

  // Linhas 4-6: alíquotas cheias (valor direto — não há fórmula fonte aqui, é a premissa em si)
  celula(ws, "C4", "ALIQ. CBS")
  celula(ws, "C5", "ALIQ. IBS UF")
  celula(ws, "C6", "ALIQ. IBS MUN")
  ANOS_TRANSICAO.forEach((ano, i) => {
    const p = premissas.premissasPorAno[ano]
    const col = colLetra(4 + i)
    celula(ws, `${col}4`, p.cbs, { numFmt: "0.00%" })
    celula(ws, `${col}5`, p.ibsUF, { numFmt: "0.00%" })
    celula(ws, `${col}6`, p.ibsMUN, { numFmt: "0.00%" })
  })
  // Linha 7: total (SUM das 3 linhas acima) — mesmo padrão do modelo
  ANOS_TRANSICAO.forEach((_, i) => {
    const col = colLetra(4 + i)
    celula(ws, `${col}7`, f(`SUM(${col}4:${col}6)`, premissas.premissasPorAno[ANOS_TRANSICAO[i]].cbs + premissas.premissasPorAno[ANOS_TRANSICAO[i]].ibsUF + premissas.premissasPorAno[ANOS_TRANSICAO[i]].ibsMUN), { bold: true, numFmt: "0.00%" })
  })

  // Linhas 8-10: variante com redução de 60% — só preenchida se o wizard confirmou a redução;
  // sempre como FÓRMULA referenciando a alíquota cheia × 0,4 (igual ao modelo), nunca valor solto
  celula(ws, "C8", "ALIQ.CBS (REDUÇÃO 60%)")
  celula(ws, "C9", "ALIQ. IBS UF (REDUÇÃO 60%)")
  celula(ws, "C10", "ALIQ. IBS MUN (REDUÇÃO 60%)")
  if (premissas.reducao60) {
    ANOS_TRANSICAO.forEach((_, i) => {
      const col = colLetra(4 + i)
      const p = premissas.premissasPorAno[ANOS_TRANSICAO[i]]
      celula(ws, `${col}8`, f(`${col}4*0.4`, p.cbs * 0.4), { numFmt: "0.00%" })
      celula(ws, `${col}9`, f(`${col}5*0.4`, p.ibsUF * 0.4), { numFmt: "0.00%" })
      celula(ws, `${col}10`, f(`${col}6*0.4`, p.ibsMUN * 0.4), { numFmt: "0.00%" })
    })
  }

  // Linhas 13-15: redução de ICMS/ISS 2029-2033 (só existe a partir de 2029 — 2026-2028 = 100%).
  // Mesma tabela REDUCAO_ICMS_ISS efetivamente aplicada nas fórmulas das abas de ano (anos.ts) —
  // aqui é só a exibição; a fonte de verdade é a constante compartilhada.
  const ANOS_ICMS_ISS = [2029, 2030, 2031, 2032, 2033]
  celula(ws, "C13", "ICMS e ISS", { bold: true })
  ANOS_ICMS_ISS.forEach((ano, i) => celula(ws, `${colLetra(3 + i + 1)}14`, ano, { bold: true }))
  ANOS_ICMS_ISS.forEach((ano, i) => celula(ws, `${colLetra(3 + i + 1)}15`, REDUCAO_ICMS_ISS[ano], { numFmt: "0%" }))

  // Estabelecimento → CNPJ (B47:C50 no modelo) — usado por VLOOKUP nas abas Valor Total NF-e e
  // Quadro Comparativo. "Todos" na linha 17, matriz na 18, filiais/grupo (Passo 1) a partir da 19
  // — tamanho da lista é dinâmico conforme quantos CNPJs o usuário cadastrou no Passo 1
  // (layoutListasPremissas calcula onde cada bloco começa a partir disso).
  const layout = layoutListasPremissas(empresa)
  celula(ws, `C${layout.linhaTodos}`, "Todos")
  const estabelecimentos = [
    { cnpj: empresa.cnpj, razaoSocial: empresa.razaoSocial },
    ...empresa.estabelecimentosAdicionais,
  ]
  estabelecimentos.forEach((e, i) => {
    const r = layout.linhaTodos + 1 + i
    celula(ws, `C${r}`, e.razaoSocial)
    celula(ws, `D${r}`, e.cnpj, { numFmt: "@" })
  })

  // Listas suspensas auxiliares (Documento / Ano) — reaproveitadas pelas abas Valor Total NF-e e
  // Quadro Comparativo. Ano usa os mesmos 7 rótulos das abas de ano geradas (anos.ts) — "2027 e
  // 2028" é uma única aba, por isso a lista tem 7 itens, não 8.
  celula(ws, `C${layout.linhaDocumentoDanfe}`, "Nota Fiscal de Mercadoria (DANFE)")
  celula(ws, `C${layout.linhaDocumentoNfs}`, "Nota Fiscal de Serviço (NFS)")
  LISTA_ANOS.forEach((label, i) => celula(ws, `C${layout.linhaAnoInicio + i}`, label))
}

// 7 abas de ano (ver src/lib/reforma-excel/anos.ts — ABAS_ANO) — exportado pra reaproveitar em
// Valor Total NF-e e Quadro Comparativo sem duplicar a lista.
export const LISTA_ANOS = ["2026", "2027 e 2028", "2029", "2030", "2031", "2032", "2033"] as const

// Linhas das listas suspensas da aba Premissas — dependem de quantos estabelecimentos (matriz +
// adicionais do Passo 1) o usuário cadastrou, por isso são calculadas a partir de `empresa`, não
// constantes fixas. Exportado pra Valor Total NF-e e Quadro Comparativo montarem os mesmos
// ranges de VLOOKUP/dropdown sem duplicar essa conta.
export function layoutListasPremissas(empresa: EmpresaData) {
  const totalEstabelecimentos = 1 + empresa.estabelecimentosAdicionais.length
  const linhaTodos = 17
  const linhaEstabelecimentoFim = linhaTodos + totalEstabelecimentos
  const linhaDocumentoDanfe = linhaEstabelecimentoFim + 2 // 1 linha em branco de respiro
  const linhaDocumentoNfs = linhaDocumentoDanfe + 1
  const linhaAnoInicio = linhaDocumentoNfs + 2
  return {
    linhaTodos,
    linhaEstabelecimentoFim,
    linhaDocumentoDanfe,
    linhaDocumentoNfs,
    linhaAnoInicio,
    linhaAnoFim: linhaAnoInicio + LISTA_ANOS.length - 1,
  }
}

export function montarAbaLegislacoes(wb: ExcelJS.Workbook, legislacao: LegislacaoData) {
  const ws = wb.addWorksheet("Legislações", { views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 100 }]

  celula(ws, "C1", "Legislações", { bold: true, size: 12 })

  const primeiroAchado = legislacao.achados[0]
  celula(ws, "C2", primeiroAchado?.fonte ?? "", { bold: true })
  celula(ws, "C3", primeiroAchado?.artigoOuTrecho ?? "")

  // B4 em diante: a nota manual que o usuário escreveu no Passo 3 (revisão/confirmação do que a
  // IA encontrou). Se o usuário não escrever nada, fica em branco — espaço livre pro estudo do
  // próprio usuário, como pedido originalmente; mas se ele escreveu algo esperando que aparecesse
  // no Excel, agora aparece (uma linha por parágrafo, quebras de linha preservadas).
  if (legislacao.notaManual.trim()) {
    const linhas = legislacao.notaManual.split(/\r?\n/)
    linhas.forEach((linha, i) => {
      if (linha.trim()) celula(ws, `B${4 + i}`, linha)
    })
  }
}
