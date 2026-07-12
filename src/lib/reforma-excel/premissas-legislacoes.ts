import ExcelJS from "exceljs"
import { ANOS_TRANSICAO } from "@/lib/reforma-engine"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import type { LegislacaoData } from "@/components/reforma/StepLegislacaoIA"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import { colLetra } from "./coluna-letra"
import { REDUCAO_ICMS_ISS } from "./calculo-linha-ano"

// Gera as abas "Premissas" e "Legislações" do Excel de entrega, seguindo o layout exato do
// modelo (ver docs/reforma-tributaria-v2.md): fórmulas nativas (padrão f(formula,result) de
// consolidacao-pis-cofins-excel.ts/selic-excel.ts), fonte Calibri. A aba Legislações grava TODOS
// os achados da busca (fonte + artigo + texto completo) e, abaixo, a nota manual do usuário —
// a decisão original de deixá-la em branco foi revertida a pedido do usuário.

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

// amarelo alaranjado das guias Premissas/Legislações (mesma paleta das abas de ano, ver anos.ts)
const COR_GUIA = "FFFFC000"

export function montarAbaPremissas(
  wb: ExcelJS.Workbook,
  premissas: PremissasReformaData,
  empresa: EmpresaData,
  linhasSaidas: { cnpj: string; empresa: string }[] = []
) {
  const ws = wb.addWorksheet("Premissas", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: COR_GUIA }
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
  // Quadro Comparativo. "Todos" na linha 17, e a partir da 18 UM ITEM POR CNPJ presente nas
  // saídas importadas (matriz e filiais dos EFDs, com sufixo Matriz/Filial quando a razão social
  // se repete) — não a lista do cadastro, que pode ter menos estabelecimentos que os arquivos.
  const estabelecimentos = listaEstabelecimentos(empresa, linhasSaidas)
  const layout = layoutListasPremissas(estabelecimentos.length)
  celula(ws, `C${layout.linhaTodos}`, "Todos")
  estabelecimentos.forEach((e, i) => {
    const r = layout.linhaTodos + 1 + i
    celula(ws, `C${r}`, e.nome)
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

// Lista de estabelecimentos do dropdown "Empresa"/"Estabelecimento" — derivada dos CNPJs que
// REALMENTE aparecem nas saídas importadas (registros C010/A010/F010 dos EFDs), não do cadastro
// do Passo 1: o usuário pode ter cadastrado só as matrizes, mas os arquivos trazem as filiais, e
// o filtro por CNPJ das abas de ano precisa de um item por estabelecimento. Quando a mesma razão
// social tem mais de um CNPJ, o rótulo ganha o sufixo "- Matriz" / "- Filial NNNN" pra
// diferenciar. Se não houver saídas (não deveria acontecer no fluxo real), cai no cadastro.
export interface EstabelecimentoLista {
  nome: string
  cnpj: string
}

export function listaEstabelecimentos(
  empresa: EmpresaData,
  linhasSaidas: { cnpj: string; empresa: string }[]
): EstabelecimentoLista[] {
  const vistos = new Map<string, string>() // cnpj → razão social (ordem de aparição nas saídas)
  for (const l of linhasSaidas) {
    if (l.cnpj && !vistos.has(l.cnpj)) vistos.set(l.cnpj, l.empresa)
  }
  if (vistos.size === 0) {
    return [
      { nome: empresa.razaoSocial, cnpj: empresa.cnpj },
      ...empresa.estabelecimentosAdicionais.map((e) => ({ nome: e.razaoSocial, cnpj: e.cnpj })),
    ]
  }
  const cnpjsPorNome = new Map<string, number>()
  for (const nome of vistos.values()) cnpjsPorNome.set(nome, (cnpjsPorNome.get(nome) ?? 0) + 1)
  return [...vistos.entries()].map(([cnpj, nome]) => {
    if ((cnpjsPorNome.get(nome) ?? 0) <= 1) return { nome, cnpj }
    const numeroFilial = cnpj.slice(8, 12) // posições do nº do estabelecimento no CNPJ
    return {
      nome: numeroFilial === "0001" ? `${nome} - Matriz` : `${nome} - Filial ${numeroFilial}`,
      cnpj,
    }
  })
}

// Linhas das listas suspensas da aba Premissas — dependem de quantos estabelecimentos existem
// nas saídas importadas, por isso são calculadas a partir do total, não constantes fixas.
// Exportado pra Valor Total NF-e e Quadro Comparativo montarem os mesmos ranges de
// VLOOKUP/dropdown sem duplicar essa conta.
export function layoutListasPremissas(totalEstabelecimentos: number) {
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
  ws.properties.tabColor = { argb: COR_GUIA }
  ws.columns = [{ width: 3 }, { width: 3 }, { width: 110 }]

  celula(ws, "C1", "Legislações", { bold: true, size: 12 })

  // TODOS os achados da busca de legislação, completos: fonte + artigo/trecho + o texto do
  // resumo/trecho encontrado (com quebra de linha dentro da célula). Antes só saíam a fonte e o
  // rótulo do artigo do primeiro achado, e o usuário reclamou que "o valor achado da legislação
  // não está aparecendo tudo".
  let r = 2
  for (const achado of legislacao.achados) {
    celula(ws, `C${r}`, achado.fonte, { bold: true })
    r++
    if (achado.artigoOuTrecho?.trim()) {
      celula(ws, `C${r}`, achado.artigoOuTrecho, { bold: true })
      r++
    }
    if (achado.resumo?.trim()) {
      for (const paragrafo of achado.resumo.split(/\r?\n/)) {
        if (!paragrafo.trim()) continue
        const cell = celula(ws, `C${r}`, paragrafo)
        cell.alignment = { wrapText: true, vertical: "top" }
        r++
      }
    }
    r++ // linha em branco entre achados
  }

  // Nota manual do usuário (Passo 3) depois dos achados, uma linha por parágrafo
  if (legislacao.notaManual.trim()) {
    if (legislacao.achados.length > 0) {
      celula(ws, `C${r}`, "Anotações", { bold: true })
      r++
    }
    for (const linha of legislacao.notaManual.split(/\r?\n/)) {
      if (!linha.trim()) continue
      const cell = celula(ws, `C${r}`, linha)
      cell.alignment = { wrapText: true, vertical: "top" }
      r++
    }
  }
}
