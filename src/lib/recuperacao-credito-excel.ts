import ExcelJS from "exceljs"
import { montarAbaIcms, type DeclaracaoEfdRegistro } from "./efd-icms-excel"
import { montarAbasPisCofins, type DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import { montarAbaComprovantePagamento } from "./comprovante-pagamento-excel"
import type { DadosComprovantePagamento } from "./comprovante-pagamento-parser"
import { montarAbasEcf, type DeclaracaoEcfRegistro } from "./ecf-excel"
import { montarAbasDctf, type DeclaracaoDctfWebRegistro, type DeclaracaoDctfRegistro } from "./dctf-excel"
import { montarAbasFontesPagadoras, type DeclaracaoFontesPagadorasRegistro } from "./fontes-pagadoras-excel"
import { montarAbasEcd, type DeclaracaoEcdRegistro } from "./ecd-excel"
import { montarAbaChecklist } from "./checklist-excel"
import { criarAbaMenu, preencherAbaMenu } from "./cadastro-excel"
import type { DadosCadastroEmpresa } from "./cadastro-parser"
import {
  calcularConsolidacaoIrpjCsll,
  calcularConsolidacaoPisCofins,
  montarAbaConsolidacaoIrpjCsll,
  montarAbaConsolidacaoPisCofins,
  resumoOportunidades,
} from "./consolidacao-pis-cofins-excel"
import type { AnaliseChecklist } from "./checklist-excel"
import { montarAbaSelic } from "./selic-excel"

const BRL_FMT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

// Analisador do diagnóstico (primeiro cruzamento): recolhido a maior de PIS/COFINS/IRPJ/CSLL.
// Traduz os resumos das consolidações no preenchimento automático do item "Pagamentos
// realizados no e-CAC x Tributos devidos" do Checklist (🌟 com o total quando há crédito, ☠️
// quando os pagamentos conferem). Sem DARFs importados não há cruzamento possível — o item fica
// em branco como antes.
function analisePagamentos(
  temComprovantes: boolean,
  resumos: { rotulo: string; credito: number; atualizacao: number; competencias: number }[]
): AnaliseChecklist | undefined {
  if (!temComprovantes || resumos.length === 0) return undefined
  const comCredito = resumos.filter((r) => r.credito > 0)
  const observacao =
    comCredito.length > 0
      ? `Recolhido a maior: ${comCredito
          .map((r) => `${r.rotulo} ${BRL_FMT.format(r.credito)} (+ Selic ${BRL_FMT.format(r.atualizacao)}) em ${r.competencias} competência(s)`)
          .join("; ")} — ver coluna "Oportunidade" nas abas de consolidação`
      : "Pagamentos conferem com os débitos apurados em todas as competências cruzadas (sem recolhimento a maior)"
  return {
    situacoesOportunidade: {
      "Pagamentos realizados no e-CAC x Tributos devidos": {
        situacao: comCredito.length > 0 ? "estrela" : "caveira",
        observacao,
      },
    },
  }
}

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

// Monta um único Excel com uma aba por tipo de declaração fiscal presente no projeto (ICMS/IPI,
// PIS/COFINS e/ou Comprovante de Pagamentos) — é o que a UI de Recuperação de Crédito chama
// quando o usuário clica em "Baixar Excel" na seção de declarações fiscais, pra nunca gerar
// vários arquivos separados quando o mesmo projeto tem mais de um tipo importado. PGDAS (Simples
// Nacional) fica de fora de propósito — tem seu próprio botão/exportador, ver
// src/lib/pgdas/export-pgdas-excel.ts.
export async function exportarDeclaracaoFiscalExcel(
  nomeCliente: string,
  dados: {
    icms?: DeclaracaoEfdRegistro[]
    pisCofins?: DeclaracaoEfdContribuicoesRegistro[]
    comprovantes?: DadosComprovantePagamento[]
    ecf?: DeclaracaoEcfRegistro[]
    dctfWeb?: DeclaracaoDctfWebRegistro[]
    dctf?: DeclaracaoDctfRegistro[]
    fontesPagadoras?: DeclaracaoFontesPagadorasRegistro[]
    ecd?: DeclaracaoEcdRegistro[]
    cadastro?: DadosCadastroEmpresa | null
  }
): Promise<void> {
  const temIcms = (dados.icms?.length ?? 0) > 0
  const temPisCofins = (dados.pisCofins?.length ?? 0) > 0
  const temComprovantes = (dados.comprovantes?.length ?? 0) > 0
  const temEcf = (dados.ecf?.length ?? 0) > 0
  const temDctfWeb = (dados.dctfWeb?.length ?? 0) > 0
  const temDctf = (dados.dctf?.length ?? 0) > 0
  const temFontes = (dados.fontesPagadoras?.length ?? 0) > 0
  const temEcd = (dados.ecd?.length ?? 0) > 0
  const cadastro = dados.cadastro ?? null
  const temCadastro = !!cadastro && !!(cadastro.consultaCnpj || cadastro.qsa || cadastro.simplesNacional)

  if (!temIcms && !temPisCofins && !temComprovantes && !temEcf && !temDctfWeb && !temDctf && !temFontes && !temEcd && !temCadastro)
    return

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()

  // A aba Menu precisa ser a PRIMEIRA do arquivo, mas os links internos dela dependem das abas
  // que ainda vão ser montadas — então cria vazia agora e preenche no final.
  const wsMenu = temCadastro ? criarAbaMenu(wb) : null

  if (temIcms) await montarAbaIcms(wb, dados.icms!, nomeCliente)
  const refsDebito = temPisCofins ? await montarAbasPisCofins(wb, dados.pisCofins!, nomeCliente) : null
  const refsDebitoEcf = temEcf ? await montarAbasEcf(wb, dados.ecf!, nomeCliente) : null
  if (temEcd) await montarAbasEcd(wb, dados.ecd!)
  if (temDctfWeb || temDctf) await montarAbasDctf(wb, { dctfWeb: dados.dctfWeb, dctf: dados.dctf })
  if (temFontes) await montarAbasFontesPagadoras(wb, dados.fontesPagadoras!)
  if (temComprovantes) await montarAbaComprovantePagamento(wb, dados.comprovantes!, nomeCliente)

  // Consolidações "PIS e COFINS" / "IRPJ e CSLL" + tabela "Selic" ficam no FINAL do arquivo
  // (pedido do usuário); referenciam por fórmula as abas PIS/COFINS/IRPJ/CSLL, DCTF/DCTFWeb,
  // Comprovante e Selic. As linhas são calculadas ANTES do Checklist (que vem antes delas no
  // arquivo) pra alimentar o analisador de recolhido a maior.
  const dadosConsolidacaoPisCofins =
    temPisCofins && refsDebito
      ? {
          declaracoes: dados.pisCofins!,
          refsDebito,
          dctf: dados.dctf,
          dctfWeb: dados.dctfWeb,
          comprovantes: dados.comprovantes,
        }
      : null
  const dadosConsolidacaoIrpjCsll =
    temEcf && refsDebitoEcf
      ? {
          declaracoes: dados.ecf!,
          refsDebito: refsDebitoEcf,
          dctf: dados.dctf,
          dctfWeb: dados.dctfWeb,
          comprovantes: dados.comprovantes,
        }
      : null
  const linhasPisCofins = dadosConsolidacaoPisCofins ? calcularConsolidacaoPisCofins(dadosConsolidacaoPisCofins) : []
  const linhasIrpjCsll = dadosConsolidacaoIrpjCsll ? calcularConsolidacaoIrpjCsll(dadosConsolidacaoIrpjCsll) : []

  const resumos: { rotulo: string; credito: number; atualizacao: number; competencias: number }[] = []
  if (linhasPisCofins.length > 0) {
    const r = resumoOportunidades(linhasPisCofins)
    resumos.push({ rotulo: "PIS/COFINS", credito: r.credito, atualizacao: r.atualizacao, competencias: r.competenciasComCredito })
  }
  if (linhasIrpjCsll.length > 0) {
    const r = resumoOportunidades(linhasIrpjCsll)
    resumos.push({ rotulo: "IRPJ/CSLL", credito: r.credito, atualizacao: r.atualizacao, competencias: r.competenciasComCredito })
  }

  await montarAbaChecklist(wb, nomeCliente, analisePagamentos(temComprovantes, resumos))

  if (dadosConsolidacaoPisCofins) await montarAbaConsolidacaoPisCofins(wb, dadosConsolidacaoPisCofins, linhasPisCofins)
  if (dadosConsolidacaoIrpjCsll) await montarAbaConsolidacaoIrpjCsll(wb, dadosConsolidacaoIrpjCsll, linhasIrpjCsll)
  if (dadosConsolidacaoPisCofins || dadosConsolidacaoIrpjCsll) montarAbaSelic(wb)
  if (wsMenu && cadastro) await preencherAbaMenu(wsMenu, wb, cadastro, nomeCliente)

  const contextos: string[] = []
  if (temIcms) contextos.push("ICMS e IPI")
  if (temPisCofins) contextos.push("PIS e COFINS")
  if (temEcf) contextos.push("IRPJ e CSLL")
  if (temEcd) contextos.push("Balanço Patrimonial")
  if (temDctfWeb || temDctf) contextos.push("DCTF e DCTFWeb")
  if (temFontes) contextos.push("Fontes Pagadoras")
  if (temComprovantes) contextos.push("Comprovante de Pagamentos")
  // só cadastro importado → arquivo ainda precisa de um contexto no nome
  const contexto = contextos.join(", ") || "Cadastro"

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - ${contexto} - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
