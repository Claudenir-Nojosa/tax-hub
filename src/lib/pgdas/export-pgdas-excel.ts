import ExcelJS from "exceljs"
import type { DadosPgdas, TipoDocumentoPgdas } from "./types"

export interface DeclaracaoPgdasRegistro {
  competencia: string // "YYYY-MM"
  tipoDocumento: TipoDocumentoPgdas
  dados: DadosPgdas
}

const BRL = "#,##0.00"
const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-")
  const idx = parseInt(mes, 10) - 1
  return `${MESES_ABREV[idx] ?? mes}/${ano}`
}

// Helper de estilo, mesma convenção usada em export-simulacao-excel.ts (duplicado aqui de
// propósito para não arriscar regressão no export já em produção).
function sc(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bold?: boolean
    align?: "left" | "center" | "right"
    numFmt?: string
  }
) {
  if (opts.value !== undefined) cell.value = opts.value
  cell.font = { name: "Calibri", bold: opts.bold, size: 10 }
  cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle" }
  if (opts.numFmt) cell.numFmt = opts.numFmt
}

// Agrupa declarações por mês, mesclando Declaração + Extrato quando ambos existem para o
// mesmo mês. O Extrato prevalece nos campos em comum (é o documento mais autoritativo sobre o
// que foi de fato apurado) e é a única fonte para as seções de pagamento do DAS.
export function agregarDeclaracoes(declaracoes: DeclaracaoPgdasRegistro[]): {
  competencias: string[]
  porCompetencia: Record<string, DadosPgdas>
  atividades: string[]
} {
  const declaracaoPorMes: Record<string, DadosPgdas> = {}
  const extratoPorMes: Record<string, DadosPgdas> = {}

  for (const d of declaracoes) {
    if (d.tipoDocumento === "DECLARACAO") declaracaoPorMes[d.competencia] = d.dados
    else extratoPorMes[d.competencia] = d.dados
  }

  const competencias = Array.from(new Set(declaracoes.map((d) => d.competencia))).sort()

  const porCompetencia: Record<string, DadosPgdas> = {}
  for (const comp of competencias) {
    const declaracao = declaracaoPorMes[comp]
    const extrato = extratoPorMes[comp]
    const mesclado = extrato ? { ...declaracao, ...extrato } : declaracao
    if (mesclado) porCompetencia[comp] = mesclado
  }

  const atividadesSet = new Set<string>()
  for (const dados of Object.values(porCompetencia)) {
    for (const a of dados.atividades) atividadesSet.add(a.descricao)
  }

  return { competencias, porCompetencia, atividades: Array.from(atividadesSet) }
}

interface LinhaSpec {
  label: string
  bold?: boolean
  valores?: (comp: string, dados: DadosPgdas | undefined) => number
}

function receitaAtividade(descricao: string) {
  return (_comp: string, dados: DadosPgdas | undefined) =>
    dados?.atividades.find((a) => a.descricao === descricao)?.receitaBrutaInformada ?? 0
}

export async function exportarPgdasExcel(declaracoes: DeclaracaoPgdasRegistro[], nomeCliente: string): Promise<void> {
  const { competencias, porCompetencia, atividades } = agregarDeclaracoes(declaracoes)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  const ws = wb.addWorksheet("Simples Nacional")

  ws.columns = [{ width: 90 }, ...competencias.map(() => ({ width: 15.5 }))]

  // Cabeçalho: coluna A + 1 coluna por mês
  const headerRow = ws.getRow(1)
  sc(headerRow.getCell(1), { value: "1. RESUMO SIMPLES NACIONAL", bold: true })
  competencias.forEach((comp, i) => {
    sc(headerRow.getCell(i + 2), { value: formatarCompetencia(comp), bold: true, align: "right" })
  })

  const linhas: LinhaSpec[] = [
    {
      label: "         Σ  RBT12 - Receita Bruta Acumulada nos 12 meses anteriores ao PA",
      valores: (_c, d) => d?.rbt12.total ?? 0,
    },
    {
      label: "         Σ  RBA Receita Bruta Acumulada no Ano-Calendário",
      valores: (_c, d) => d?.rba.total ?? 0,
    },
    { label: "       Receita Bruta do PA", valores: (_c, d) => d?.rpa.total ?? 0 },
    { label: "" },
    { label: "     2. RECEITA BRUTA POR ATIVIDADE", bold: true },
    ...atividades.map((descricao): LinhaSpec => ({
      label: `          ${descricao}`,
      valores: receitaAtividade(descricao),
    })),
    { label: "" },
    { label: "     4. POR QUALIFICAÇÃO", bold: true },
    {
      label: "          parcela",
      valores: (_c, d) => d?.atividades.reduce((soma, a) => soma + a.parcelas.reduce((s, p) => s + p, 0), 0) ?? 0,
    },
    { label: "" },
    {
      label: "                $  Vlr Débito Declarado PGDAS",
      valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.total ?? 0,
    },
    { label: "" },
    { label: "     3. VALOR TOTAL POR TRIBUTO", bold: true },
    { label: "           Vlr IRPJ", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.irpj ?? 0 },
    { label: "           Vlr CSLL", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.csll ?? 0 },
    { label: "           Vlr Cofins", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.cofins ?? 0 },
    { label: "           Vlr PIS", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.pisPasep ?? 0 },
    { label: "           Vlr INSS", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.inssCpp ?? 0 },
    { label: "           Vlr ICMS", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.icms ?? 0 },
    { label: "           Vlr IPI", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.ipi ?? 0 },
    { label: "           Vlr ISS", valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.iss ?? 0 },
    { label: "" },
    // ASSUNCAO: não confirmado nos PDFs de origem — espelha "Vlr Total Pago" (linha abaixo) até
    // ter uma fonte real para esta linha.
    {
      label: "                $  DAS - Documento de Arrecadação do Simples Nacional",
      valores: (_c, d) => (d?.arrecadacaoDas?.reconhecido ? d.arrecadacaoDas.total ?? 0 : 0),
    },
    { label: "" },
    { label: "     6. VALORES DEVIDOS NO DAS", bold: true },
    {
      label: "              Vlr Principal DAS",
      valores: (_c, d) => (d?.arrecadacaoDas?.reconhecido ? d.arrecadacaoDas.principal ?? 0 : 0),
    },
    {
      label: "              Vlr Juros",
      valores: (_c, d) => (d?.arrecadacaoDas?.reconhecido ? d.arrecadacaoDas.juros ?? 0 : 0),
    },
    {
      label: "              Vlr Multas",
      valores: (_c, d) => (d?.arrecadacaoDas?.reconhecido ? d.arrecadacaoDas.multa ?? 0 : 0),
    },
    {
      label: "                 $  Vlr Total Pago",
      valores: (_c, d) => (d?.arrecadacaoDas?.reconhecido ? d.arrecadacaoDas.total ?? 0 : 0),
    },
    { label: "" },
    // Comprovação de pagamento do DAS via portal eCAC — documento separado de
    // Declaração/Extrato, ainda não suportado neste importador. Fica sempre 0 por decisão
    // deliberada (não implementar automaticamente); revisitar quando houver um parser para
    // esse 3º tipo de PDF.
    { label: "                $  Valor eCAC - Pgtos DARF(DAS)", valores: () => 0 },
  ]

  linhas.forEach((linha, idx) => {
    const row = ws.getRow(idx + 2) // +2 porque a linha 1 é o cabeçalho
    sc(row.getCell(1), { value: linha.label, bold: linha.bold })
    if (linha.valores) {
      competencias.forEach((comp, i) => {
        sc(row.getCell(i + 2), { value: linha.valores!(comp, porCompetencia[comp]), numFmt: BRL, align: "right" })
      })
    }
    // Linhas de detalhe e em branco ficam recolhíveis; só os cabeçalhos de seção (bold) ficam
    // sempre visíveis, reproduzindo o agrupamento colapsável visto no exemplo original.
    row.outlineLevel = linha.bold ? 0 : 1
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `simples_nacional_${nomeCliente.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
