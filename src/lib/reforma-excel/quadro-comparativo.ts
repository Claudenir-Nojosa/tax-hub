import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { letraColunaAno, LINHA_DADOS_INICIO_ANO, LINHA_FIM_RANGE_ANO, ABAS_ANO } from "./anos"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS, type CamposCalculadosAno } from "./calculo-linha-ano"
import { layoutListasPremissas } from "./premissas-legislacoes"

// Aba "Quadro Comparativo" — total de PIS/COFINS, ICMS, ISS, CBS e IBS por ano (2026-2033),
// filtrado por Empresa (dropdown). Diferente de Valor Total NF-e, aqui cada COLUNA já sabe a
// aba de ano certa em tempo de geração (2027 e 2028 apontam pra mesma aba "2027 e 2028"), então
// não precisa de INDIRECT — SUMIFS direto, igual ao padrão do Excel-modelo.

const FONTE = "Calibri"
const ANOS_COLUNA = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

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

function abaDoAno(ano: number): string {
  const encontrada = ABAS_ANO.find((a) => a.anoPremissa === ano || (ano === 2028 && a.label === "2027 e 2028"))
  return encontrada?.label ?? String(ano)
}

const LINHAS_TRIBUTO: { label: string; campo: keyof CamposCalculadosAno }[] = [
  { label: "PIS/COFINS", campo: "vlrPisCofins" },
  { label: "ICMS", campo: "icms" },
  { label: "ISS", campo: "iss" },
  { label: "CBS", campo: "cbs" },
  { label: "IBS", campo: "ibs" },
]
const CAMPO_PARA_COLUNA_ANO: Record<string, string> = {
  vlrPisCofins: "VLR PIS + COFINS", icms: "ICMS", iss: "ISS", cbs: "CBS", ibs: "IBS",
}

export function montarAbaQuadroComparativo(
  wb: ExcelJS.Workbook,
  empresa: EmpresaData,
  linhasSaidas: LinhaSaidaEfd[],
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet("Quadro Comparativo", { views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 16 }, ...ANOS_COLUNA.map(() => ({ width: 14 }))]

  celula(ws, "C1", "TOTAL DOS TRIBUTOS INDIRETOS", { bold: true })

  const layout = layoutListasPremissas(empresa)

  celula(ws, "C4", "Empresa")
  celula(ws, "D4", "Todos")
  ws.getCell("D4").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Premissas!$C$${layout.linhaTodos}:$C$${layout.linhaEstabelecimentoFim}`],
  }
  celula(ws, "E4", "CNPJ")
  celula(
    ws, "F4",
    f(`IFERROR(VLOOKUP(D4,Premissas!$C$${layout.linhaTodos}:$D$${layout.linhaEstabelecimentoFim},2,FALSE),"Todos")`, "Todos"),
    { numFmt: "@" }
  )

  celula(ws, "C5", "TRIBUTO", { bold: true })
  ANOS_COLUNA.forEach((ano, i) => celula(ws, `${String.fromCharCode(68 + i)}5`, ano, { bold: true }))

  const l1 = LINHA_DADOS_INICIO_ANO
  const l2 = LINHA_FIM_RANGE_ANO
  const cCnpj = letraColunaAno("CNPJ")

  // premissas por ano da coluna (2027/2028 usam a mesma, ver Premissas) — pré-computadas uma vez,
  // já com a redução de ICMS/ISS 2029-2033 aplicada (mesmo cronograma usado em anos.ts)
  const aliqPorAno = new Map<number, { aliqIss: number; aliqIbs: number; aliqCbs: number; aliqIcms: number }>()
  for (const ano of ANOS_COLUNA) {
    const anoPremissa = ano === 2028 ? 2027 : ano
    const p = premissas.premissasPorAno[anoPremissa]
    const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
    const fatorIcmsIss = REDUCAO_ICMS_ISS[anoPremissa] ?? 1
    // ICMS = premissa constante (mesma regra das abas de ano — o modelo não usa a alíquota do EFD)
    aliqPorAno.set(ano, {
      aliqIss: p.aliquotaISS * fatorIcmsIss, aliqIbs, aliqCbs,
      aliqIcms: (premissas.aliquotaICMS ?? 0.225) * fatorIcmsIss,
    })
  }

  // Uma única passada por linha por ano (não por tributo×ano) — calcularCamposAno já devolve os
  // 5 campos de uma vez, então soma-se todos aqui em vez de recalcular a mesma linha 5x (era
  // 5 tributos × 8 anos × N linhas = 40N chamadas; agora é 8 × N, a maior parte do tempo de
  // geração do Excel travando o navegador vinha daqui).
  const somasPorAno = new Map<number, Record<string, number>>()
  for (const ano of ANOS_COLUNA) {
    const { aliqIss, aliqIbs, aliqCbs, aliqIcms } = aliqPorAno.get(ano)!
    const somas: Record<string, number> = { vlrPisCofins: 0, icms: 0, iss: 0, cbs: 0, ibs: 0 }
    for (const l of linhasSaidas) {
      const aliqIcmsLinha = l.documento === "Nota Fiscal de Mercadoria (DANFE)" ? aliqIcms : 0
      const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha)
      somas.vlrPisCofins += c.vlrPisCofins
      somas.icms += c.icms
      somas.iss += c.iss
      somas.cbs += c.cbs
      somas.ibs += c.ibs
    }
    somasPorAno.set(ano, somas)
  }

  LINHAS_TRIBUTO.forEach((linha, li) => {
    const r = 6 + li
    celula(ws, `C${r}`, linha.label)
    const cValor = letraColunaAno(CAMPO_PARA_COLUNA_ANO[linha.campo])
    ANOS_COLUNA.forEach((ano, ci) => {
      const aba = abaDoAno(ano)
      const rangeValor = `'${aba}'!$${cValor}$${l1}:$${cValor}$${l2}`
      const rangeCnpj = `'${aba}'!$${cCnpj}$${l1}:$${cCnpj}$${l2}`
      const total = somasPorAno.get(ano)![linha.campo]
      celula(
        ws, `${String.fromCharCode(68 + ci)}${r}`,
        f(`IF($D$4="Todos",SUM(${rangeValor}),SUMIFS(${rangeValor},${rangeCnpj},$F$4))`, total),
        { numFmt: "#,##0.00" }
      )
    })
  })
}
