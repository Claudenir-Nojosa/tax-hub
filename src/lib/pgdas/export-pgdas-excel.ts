import ExcelJS from "exceljs"
import type { DadosPgdas, TipoDocumentoPgdas } from "./types"
import { montarAbaChecklist } from "../checklist-excel"

export interface DeclaracaoPgdasRegistro {
  competencia: string // "YYYY-MM"
  tipoDocumento: TipoDocumentoPgdas
  dados: DadosPgdas
}

// Formato contábil BR: símbolo "R$" alinhado à esquerda, número à direita, "-" para zero.
const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const PCT = "0.00%"
const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

const COR = {
  cinzaClaro: "FFBFBFBF",
  azulClaro: "FFB4C6E7",
}

const LOGO_URL = "/icons/taxhub_logo_full.png"

// Remove só os caracteres inválidos em nome de arquivo no Windows/macOS — mantém acentos,
// espaços e hífen pra ficar legível (ex.: "Diagnóstico Tributário - EMS Comercio.xlsx").
function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

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
  destaque?: "cinza" | "azul"
  numFmt?: string
}

function receitaAtividade(descricao: string) {
  return (_comp: string, dados: DadosPgdas | undefined) =>
    dados?.atividades.find((a) => a.descricao === descricao)?.receitaBrutaInformada ?? 0
}

function cargaTributaria(_comp: string, dados: DadosPgdas | undefined): number {
  if (!dados || dados.rpa.total === 0) return 0
  return dados.debitoGeral.declaradoExigivelSuspenso.total / dados.rpa.total
}

// Converte pra base64 puro (sem depender do Buffer do Node, que não existe no browser) —
// ExcelJS aceita `base64` como alternativa a `buffer` pra anexar imagens.
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

export async function exportarPgdasExcel(declaracoes: DeclaracaoPgdasRegistro[], nomeCliente: string): Promise<void> {
  const { competencias, porCompetencia, atividades } = agregarDeclaracoes(declaracoes)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()
  const ws = wb.addWorksheet("Simples Nacional", {
    views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 5 }],
  })

  // Coluna A: margem estreita e vazia, só pra respiro visual. O conteúdo (rótulos) começa na B.
  ws.columns = [{ width: 3 }, { width: 80 }, ...competencias.map(() => ({ width: 15.5 }))]

  // Linha 1: logo (imagem sobreposta, ancorada na coluna B) — linha alta pra caber o logo inteiro
  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 41 } })
  }

  // Linha 3: título "Simples Nacional - <nome curto do cliente>"
  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  sc(ws.getCell(3, 2), { value: `Simples Nacional - ${nomeCurto}`, bold: true, size: 12 })

  // Linha 5: cabeçalho (coluna B + 1 coluna por mês)
  const headerRow = ws.getRow(5)
  sc(headerRow.getCell(2), { value: "1. RESUMO SIMPLES NACIONAL", bold: true })
  competencias.forEach((comp, i) => {
    sc(headerRow.getCell(i + 3), { value: formatarCompetencia(comp), bold: true, align: "center" })
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
      bold: true,
      valores: (_c, d) => d?.debitoGeral.declaradoExigivelSuspenso.total ?? 0,
      destaque: "cinza",
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
    { label: "" },
    {
      label: "Carga Tributária",
      bold: true,
      align: "right",
      valores: cargaTributaria,
      destaque: "azul",
      numFmt: PCT,
    } as LinhaSpec & { align: "right" },
  ]

  const ROW_HEADER = 5
  linhas.forEach((linha, idx) => {
    const row = ws.getRow(idx + ROW_HEADER + 1)
    const bg = linha.destaque === "cinza" ? COR.cinzaClaro : linha.destaque === "azul" ? COR.azulClaro : undefined
    const alinhaLabel = (linha as { align?: "left" | "center" | "right" }).align

    sc(row.getCell(2), { value: linha.label, bold: linha.bold, bg, align: alinhaLabel })
    if (linha.valores) {
      competencias.forEach((comp, i) => {
        sc(row.getCell(i + 3), {
          value: linha.valores!(comp, porCompetencia[comp]),
          numFmt: linha.numFmt ?? BRL,
          align: "right",
          bg,
          bold: linha.bold || linha.destaque === "azul",
        })
      })
    } else if (bg) {
      // linha em branco com destaque (ex.: espaçador dentro de um bloco colorido) — preenche
      // até a última coluna de mês pra manter a faixa de cor contínua
      competencias.forEach((_comp, i) => sc(row.getCell(i + 3), { bg }))
    }
    // Linhas de detalhe e em branco ficam recolhíveis; só os cabeçalhos de seção (bold sem
    // destaque) ficam sempre visíveis, reproduzindo o agrupamento colapsável do exemplo original.
    row.outlineLevel = linha.bold && !linha.destaque ? 0 : 1
  })

  await montarAbaChecklist(wb, nomeCliente)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
