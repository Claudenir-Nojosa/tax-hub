import ExcelJS from "exceljs"
import { montarAbaPremissas, montarAbaLegislacoes } from "./premissas-legislacoes"
import { montarAbaAno, ABAS_ANO } from "./anos"
import { montarAbaValorTotalNfe } from "./valor-total-nfe"
import { montarAbaQuadroComparativo } from "./quadro-comparativo"
import { montarAbaBaseIbsCbs } from "./base-ibs-cbs"
import { montarAbaEntradasEfd } from "./entradas-efd"
import { montarAbaAnaliseFornecedores } from "./analise-fornecedores"
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

export async function gerarExcelReforma(dados: DadosGeracaoExcel): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Reforma Tributária"
  wb.created = new Date()

  montarAbaPremissas(wb, dados.premissasReforma, dados.empresa)
  montarAbaLegislacoes(wb, dados.legislacao)
  for (const aba of ABAS_ANO) {
    montarAbaAno(wb, aba, dados.linhasSaidas, dados.premissasReforma)
  }
  montarAbaValorTotalNfe(wb, dados.empresa, dados.linhasSaidas)
  montarAbaQuadroComparativo(wb, dados.empresa, dados.linhasSaidas, dados.premissasReforma)
  montarAbaBaseIbsCbs(wb, dados.baseIbsCbs)
  montarAbaEntradasEfd(wb, dados.linhasEntradas, dados.classificacoesFornecedores, dados.premissasReforma)
  await montarAbaAnaliseFornecedores(wb, dados.empresa, dados.linhasEntradas, dados.classificacoesFornecedores)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const nomeArquivo = `Reforma Tributária - ${dados.empresa.razaoSocial || "Empresa"}`.replace(/[\\/:*?"<>|]/g, "").trim()
  a.download = `${nomeArquivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
