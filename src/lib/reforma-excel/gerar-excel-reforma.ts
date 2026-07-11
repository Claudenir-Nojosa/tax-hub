import ExcelJS from "exceljs"
import { montarAbaPremissas, montarAbaLegislacoes } from "./premissas-legislacoes"
import { montarAbaAno, ABAS_ANO } from "./anos"
import { montarAbaValorTotalNfe } from "./valor-total-nfe"
import { montarAbaQuadroComparativo } from "./quadro-comparativo"
import { montarAbaBaseIbsCbs } from "./base-ibs-cbs"
import { montarAbaEntradasEfd } from "./entradas-efd"
import { montarAbaAnaliseFornecedores } from "./analise-fornecedores"
import { yieldToEventLoop } from "./yield"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import type { LegislacaoData } from "@/components/reforma/StepLegislacaoIA"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"

// Orquestrador do Excel de entrega da Reforma Tributária. Todas as abas planejadas até a Fase 6:
// Premissas, Legislações, as 7 abas de ano (2026-2033), Valor Total NF-e, Quadro Comparativo, Base
// IBS-CBS, Entradas EFD ICMS IPI e Análise Fornecedores (ver docs/reforma-tributaria-v2.md).

export interface DadosGeracaoExcel {
  empresa: EmpresaData
  premissasReforma: PremissasReformaData
  legislacao: LegislacaoData
  linhasSaidas: LinhaSaidaEfd[]
  baseIbsCbs: LinhaBaseIbsCbs[]
  linhasEntradas: LinhaEntradaEfd[]
  classificacoesFornecedores: Record<string, ResultadoConsultaCnpj>
}

export type ProgressoGeracao = (percentual: number, etapa: string) => void

export async function gerarExcelReforma(dados: DadosGeracaoExcel, onProgress?: ProgressoGeracao): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Reforma Tributária"
  wb.created = new Date()

  // Progresso ponderado: as 7 abas de ano são de longe a parte mais pesada (cada linha de saída
  // vira 1 linha × 7 abas), então pesam proporcionalmente a linhasSaidas.length×7; as demais abas
  // são rápidas e entram como uma fatia fixa pequena do total, só pra a barra não parecer parada.
  const pesoAnos = Math.max(dados.linhasSaidas.length * ABAS_ANO.length, 1)
  const pesoOutras = Math.max(Math.round(pesoAnos * 0.15), 7)
  const pesoTotal = pesoAnos + pesoOutras
  let concluido = 0
  const reportar = (etapa: string, incremento: number) => {
    concluido += incremento
    onProgress?.(Math.min(100, Math.round((concluido / pesoTotal) * 100)), etapa)
  }

  montarAbaPremissas(wb, dados.premissasReforma, dados.empresa)
  reportar("Premissas", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaLegislacoes(wb, dados.legislacao)
  reportar("Legislações", pesoOutras / 6)
  await yieldToEventLoop()

  for (const aba of ABAS_ANO) {
    const concluidoAntesDaAba = concluido
    await montarAbaAno(wb, aba, dados.linhasSaidas, dados.premissasReforma, (linhaAtual) => {
      const progressoNaAba = concluidoAntesDaAba + linhaAtual
      onProgress?.(
        Math.min(100, Math.round((progressoNaAba / pesoTotal) * 100)),
        `Aba ${aba.label} (${linhaAtual}/${dados.linhasSaidas.length})`
      )
    })
    concluido = concluidoAntesDaAba + dados.linhasSaidas.length
  }

  montarAbaValorTotalNfe(wb, dados.empresa, dados.linhasSaidas)
  reportar("Valor Total NF-e", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaQuadroComparativo(wb, dados.empresa, dados.linhasSaidas, dados.premissasReforma)
  reportar("Quadro Comparativo", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaBaseIbsCbs(wb, dados.baseIbsCbs)
  reportar("Base IBS-CBS", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaEntradasEfd(wb, dados.linhasEntradas, dados.classificacoesFornecedores, dados.premissasReforma)
  reportar("Entradas EFD ICMS/IPI", pesoOutras / 6)
  await yieldToEventLoop()

  await montarAbaAnaliseFornecedores(wb, dados.empresa, dados.linhasEntradas, dados.classificacoesFornecedores)
  onProgress?.(99, "Análise Fornecedores")

  onProgress?.(99, "Compactando o arquivo Excel...")
  const buffer = await wb.xlsx.writeBuffer()
  onProgress?.(100, "Pronto")

  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const nomeArquivo = `Reforma Tributária - ${dados.empresa.razaoSocial || "Empresa"}`.replace(/[\\/:*?"<>|]/g, "").trim()
  a.download = `${nomeArquivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
