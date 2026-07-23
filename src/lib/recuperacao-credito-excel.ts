import ExcelJS from "exceljs"
import { montarAbaIcms, type DeclaracaoEfdRegistro } from "./efd-icms-excel"
import { montarAbaEntradas } from "./entradas-icms-excel"
import { montarAbasPisCofins, type DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import { montarAbaComprovantePagamento } from "./comprovante-pagamento-excel"
import type { DadosComprovantePagamento } from "./comprovante-pagamento-parser"
import { montarAbasEcf, type DeclaracaoEcfRegistro } from "./ecf-excel"
import { montarAbasDctf, type DeclaracaoDctfWebRegistro, type DeclaracaoDctfRegistro } from "./dctf-excel"
import { montarAbasFontesPagadoras, type DeclaracaoFontesPagadorasRegistro } from "./fontes-pagadoras-excel"
import { montarAbasEcd, type DeclaracaoEcdRegistro } from "./ecd-excel"
import { criarAbaChecklist, preencherAbaChecklist } from "./checklist-excel"
import { criarAbaMenu, preencherAbaMenu, type ImpostosPagos } from "./cadastro-excel"
import { labelTributo } from "./comprovante-pagamento-parser"
import type { DadosCadastroEmpresa } from "./cadastro-parser"
import {
  calcularConsolidacaoIrpjCsll,
  calcularConsolidacaoPisCofins,
  montarAbaConsolidacaoIrpjCsll,
  montarAbaConsolidacaoPisCofins,
  resumoOportunidades,
} from "./consolidacao-pis-cofins-excel"
import type { AnaliseChecklist } from "./checklist-excel"
import { compararRetencoes, type ComparativoRetencao, type TributoRetencao } from "./retencoes-analise"
import { analisarEstoqueAbertura } from "./estoque-abertura-analise"
import { montarAbaSelic } from "./selic-excel"
import { montarAbaAntecipacaoIcmsStCabecalho, finalizarExcelComAntecipacaoIcmsSt, type PendenteAbaAntecipacaoIcmsSt } from "./icms-st-antecipacao-excel"
import { elegivelAntecipacaoIcmsSt } from "./icms-st-antecipacao-ce"

const BRL_FMT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

// Analisador do diagnóstico — cruzamento 1 (pagamentos × apurado): preenche o item "Pagamentos
// realizados no e-CAC x Tributos devidos" do Checklist. Oportunidade = recolhido a maior (🌟
// com totais, ☠️ quando confere); contingência = pago a MENOR que o apurado (🌟 = contingência
// identificada, seguindo a legenda do Checklist). Sem DARFs importados não há cruzamento — o
// item fica em branco como antes.
function analisePagamentos(
  temComprovantes: boolean,
  resumos: { rotulo: string; resumo: import("./consolidacao-pis-cofins-excel").ResumoOportunidades }[]
): AnaliseChecklist["situacoes"] {
  if (!temComprovantes || resumos.length === 0) return undefined
  const comCredito = resumos.filter((r) => r.resumo.credito > 0)
  const comContingencia = resumos.filter((r) => r.resumo.contingencia > 0)
  return {
    "Pagamentos realizados no e-CAC x Tributos devidos": {
      oportunidade: {
        situacao: comCredito.length > 0 ? "estrela" : "caveira",
        observacao:
          comCredito.length > 0
            ? `Recolhido a maior: ${comCredito
                .map(
                  (r) =>
                    `${r.rotulo} ${BRL_FMT.format(r.resumo.credito)} (+ Selic ${BRL_FMT.format(r.resumo.atualizacao)}) em ${r.resumo.competenciasComCredito} competência(s)`
                )
                .join("; ")} — ver coluna "Oportunidade" nas abas de consolidação`
            : "Pagamentos conferem com os débitos apurados em todas as competências cruzadas (sem recolhimento a maior)",
      },
      contingencia: {
        situacao: comContingencia.length > 0 ? "estrela" : "caveira",
        observacao:
          comContingencia.length > 0
            ? `Pago a menor que o apurado: ${comContingencia
                .map((r) => `${r.rotulo} ${BRL_FMT.format(r.resumo.contingencia)} em ${r.resumo.competenciasComContingencia} competência(s)`)
                .join("; ")} — ver coluna "Oportunidade" nas abas de consolidação`
            : "Pagamentos cobrem os débitos apurados em todas as competências cruzadas",
      },
    },
  }
}

// Analisador — cruzamento 2 (retenções × abatido): preenche os itens "Fontes pagadoras x
// utilizado nas apurações" (PIS/COFINS, categoria RETENÇÕES) e "Fontes Pagadoras x valor
// utilizado nas apurações" (IRPJ/CSLL). Oportunidade = retido pelas fontes e não abatido na
// apuração; contingência = abatido ACIMA do retido informado. Ver src/lib/retencoes-analise.ts.
function analiseRetencoes(comparativos: ComparativoRetencao[]): AnaliseChecklist["situacoes"] {
  if (comparativos.length === 0) return undefined

  const item = (tributos: TributoRetencao[]) => {
    const doGrupo = comparativos.filter((c) => tributos.includes(c.tributo))
    if (doGrupo.length === 0) return undefined
    const sobras = doGrupo.filter((c) => c.dif > 0.01)
    const excessos = doGrupo.filter((c) => c.dif < -0.01)
    const detalhe = (lista: ComparativoRetencao[], sinal: 1 | -1) =>
      lista.map((c) => `${c.tributo} ${c.ano}: ${BRL_FMT.format(sinal * c.dif)}`).join("; ")
    return {
      oportunidade: {
        situacao: (sobras.length > 0 ? "estrela" : "caveira") as "estrela" | "caveira",
        observacao:
          sobras.length > 0
            ? `Retenção não aproveitada (retido nas fontes > abatido na apuração): ${detalhe(sobras, 1)}`
            : `Retenções integralmente aproveitadas nos anos comparados (${[...new Set(doGrupo.map((c) => c.ano))].join(", ")})`,
      },
      contingencia: {
        situacao: (excessos.length > 0 ? "estrela" : "caveira") as "estrela" | "caveira",
        observacao:
          excessos.length > 0
            ? `Abatido acima do retido informado pelas fontes: ${detalhe(excessos, -1)} — conferir origem das deduções`
            : "Nenhum abatimento acima do retido informado pelas fontes",
      },
    }
  }

  const situacoes: NonNullable<AnaliseChecklist["situacoes"]> = {}
  const pisCofins = item(["PIS", "COFINS"])
  if (pisCofins) situacoes["Fontes pagadoras x utilizado nas apurações"] = pisCofins
  const irpjCsll = item(["IRPJ", "CSLL"])
  if (irpjCsll) situacoes["Fontes Pagadoras x valor utilizado nas apurações"] = irpjCsll
  return Object.keys(situacoes).length > 0 ? situacoes : undefined
}

// Analisador — cruzamento 5 (crédito de estoque de abertura): mudança pro Lucro Real vinda do
// Simples/Presumido dá crédito de PIS 0,65% + COFINS 3% sobre o estoque de 31/dez do último ano
// no regime anterior (saldo de abertura das contas de estoque na ECD do ano da mudança). Ver
// src/lib/estoque-abertura-analise.ts. Preenche o item "Mudança de Regime - Inventário".
function analiseEstoqueAbertura(dados: {
  pisCofins?: DeclaracaoEfdContribuicoesRegistro[]
  ecd?: DeclaracaoEcdRegistro[]
  ecf?: DeclaracaoEcfRegistro[]
  cadastro?: DadosCadastroEmpresa | null
}): AnaliseChecklist["situacoes"] {
  const resultado = analisarEstoqueAbertura(
    dados.pisCofins ?? [],
    dados.ecd ?? [],
    dados.ecf ?? [],
    dados.cadastro?.simplesNacional
  )
  if (!resultado) return undefined

  const chave = "Mudança de Regime - Inventário"
  if (!resultado.mudanca) {
    const anos = resultado.anosAnalisados
    return {
      [chave]: {
        oportunidade: {
          situacao: "caveira",
          observacao: `Nenhuma mudança para o regime não cumulativo (Lucro Real) identificada nos anos analisados (${anos[0]}–${anos[anos.length - 1]}) — sem crédito de estoque de abertura`,
        },
      },
    }
  }

  const { anoMudanca, regimeAnterior } = resultado.mudanca
  const anoEstoque = String(Number(anoMudanca) - 1)
  if (!resultado.temEcdDoAnoMudanca) {
    return {
      [chave]: {
        oportunidade: {
          // sem ícone: a mudança existe, mas sem a ECD não dá pra afirmar nem descartar o crédito
          observacao: `Mudança ${regimeAnterior} → Lucro Real em ${anoMudanca} detectada — importe a ECD de ${anoMudanca} para apurar o estoque de 31/12/${anoEstoque} e calcular o crédito (PIS 0,65% + COFINS 3%)`,
        },
      },
    }
  }

  if ((resultado.estoque ?? 0) <= 0.01) {
    return {
      [chave]: {
        oportunidade: {
          situacao: "caveira",
          observacao: `Mudança ${regimeAnterior} → Lucro Real em ${anoMudanca}, mas sem saldo de estoque em 31/12/${anoEstoque} na ECD — sem crédito de estoque de abertura`,
        },
      },
    }
  }

  return {
    [chave]: {
      oportunidade: {
        situacao: "estrela",
        observacao: `Mudança ${regimeAnterior} → Lucro Real em ${anoMudanca}: estoque de ${BRL_FMT.format(resultado.estoque!)} em 31/12/${anoEstoque} (ECD) → crédito potencial de PIS ${BRL_FMT.format(resultado.creditoPis!)} (0,65%) + COFINS ${BRL_FMT.format(resultado.creditoCofins!)} (3%), apropriável em 12 parcelas mensais — conferir se já foi aproveitado na EFD (F150/M105)`,
      },
    },
  }
}

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

// Quais tipos de declaração incluir no Excel — todos `true` por padrão quando omitido (mesmo
// comportamento de sempre, "baixar tudo"), preenchido pelo diálogo de seleção de abas na UI
// (SelecionarAbasExportDialog.tsx). DCTF e DCTFWeb compartilham um flag só (`dctf`) porque saem
// juntas na mesma chamada de montagem (`montarAbasDctf`) e aparecem como um grupo só no diálogo.
export interface IncluirAbas {
  icms?: boolean
  pisCofins?: boolean
  comprovantes?: boolean
  ecf?: boolean
  dctf?: boolean
  fontes?: boolean
  ecd?: boolean
  cadastro?: boolean
  antecipacaoIcmsSt?: boolean
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
  },
  incluir?: IncluirAbas
): Promise<void> {
  const temIcms = (dados.icms?.length ?? 0) > 0 && (incluir?.icms ?? true)
  const temPisCofins = (dados.pisCofins?.length ?? 0) > 0 && (incluir?.pisCofins ?? true)
  const temComprovantes = (dados.comprovantes?.length ?? 0) > 0 && (incluir?.comprovantes ?? true)
  const temEcf = (dados.ecf?.length ?? 0) > 0 && (incluir?.ecf ?? true)
  const temDctfWeb = (dados.dctfWeb?.length ?? 0) > 0 && (incluir?.dctf ?? true)
  const temDctf = (dados.dctf?.length ?? 0) > 0 && (incluir?.dctf ?? true)
  const temFontes = (dados.fontesPagadoras?.length ?? 0) > 0 && (incluir?.fontes ?? true)
  const temEcd = (dados.ecd?.length ?? 0) > 0 && (incluir?.ecd ?? true)
  const cadastro = incluir?.cadastro ?? true ? dados.cadastro ?? null : null
  const temCadastro = !!cadastro && !!(cadastro.consultaCnpj || cadastro.qsa || cadastro.simplesNacional)

  if (!temIcms && !temPisCofins && !temComprovantes && !temEcf && !temDctfWeb && !temDctf && !temFontes && !temEcd && !temCadastro)
    return

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()

  // A aba Menu precisa ser a PRIMEIRA do arquivo e a Checklist a SEGUNDA, mas o conteúdo das
  // duas depende do que vem depois (links internos / análise das consolidações) — então cria as
  // duas vazias agora e preenche no final.
  const wsMenu = temCadastro ? criarAbaMenu(wb) : null
  const wsChecklist = criarAbaChecklist(wb)

  // Antecipação ICMS-ST (Ceará) usa geração híbrida (ExcelJS só pro cabeçalho + linhas de dado
  // injetadas via XML/jszip, ver icms-st-antecipacao-excel.ts) pra não estourar memória do
  // navegador com EFDs grandes — por isso o `wb.xlsx.writeBuffer()` final não pode ser feito
  // direto aqui: precisa passar por `finalizarExcelComAntecipacaoIcmsSt` (abaixo), que só faz o
  // round-trip extra pelo jszip quando essa aba de fato entrou (`pendenteIcmsSt !== null`).
  let pendenteIcmsSt: PendenteAbaAntecipacaoIcmsSt | null = null

  if (temIcms) {
    await montarAbaIcms(wb, dados.icms!, nomeCliente)
    await montarAbaEntradas(
      wb,
      dados.icms!.map((d) => ({ competencia: d.competencia, linhasEntrada: d.dados.linhasEntrada })),
      nomeCliente
    )
    // Antecipação ICMS-ST (Ceará) — só entra quando o cliente é elegível (UF CE + CNAE têxtil no
    // Cartão CNPJ, ver elegivelAntecipacaoIcmsSt) e a aba não foi desmarcada no diálogo de export.
    if (elegivelAntecipacaoIcmsSt(dados.cadastro?.consultaCnpj) && (incluir?.antecipacaoIcmsSt ?? true)) {
      const linhasEntradaTodas = dados.icms!.flatMap((d) => d.dados.linhasEntrada ?? [])
      const resultado = await montarAbaAntecipacaoIcmsStCabecalho(wb, linhasEntradaTodas, nomeCliente)
      pendenteIcmsSt = resultado.pendente
    }
  }
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

  const resumos: { rotulo: string; resumo: import("./consolidacao-pis-cofins-excel").ResumoOportunidades }[] = []
  if (linhasPisCofins.length > 0) resumos.push({ rotulo: "PIS/COFINS", resumo: resumoOportunidades(linhasPisCofins) })
  if (linhasIrpjCsll.length > 0) resumos.push({ rotulo: "IRPJ/CSLL", resumo: resumoOportunidades(linhasIrpjCsll) })

  const comparativosRetencao = temFontes
    ? compararRetencoes(dados.fontesPagadoras!, dados.pisCofins ?? [], dados.ecf ?? [])
    : []
  const situacoes: NonNullable<AnaliseChecklist["situacoes"]> = {
    ...analisePagamentos(temComprovantes, resumos),
    ...analiseRetencoes(comparativosRetencao),
    ...analiseEstoqueAbertura(dados),
  }
  await preencherAbaChecklist(wsChecklist, wb, nomeCliente, Object.keys(situacoes).length > 0 ? { situacoes } : undefined)

  if (dadosConsolidacaoPisCofins) await montarAbaConsolidacaoPisCofins(wb, dadosConsolidacaoPisCofins, linhasPisCofins)
  if (dadosConsolidacaoIrpjCsll) await montarAbaConsolidacaoIrpjCsll(wb, dadosConsolidacaoIrpjCsll, linhasIrpjCsll)
  if (dadosConsolidacaoPisCofins || dadosConsolidacaoIrpjCsll) montarAbaSelic(wb)
  if (wsMenu && cadastro) {
    // quadro "Imposto pago" do Menu: Σ Vlr Principal dos DARFs por tributo (mesma conta da UI)
    let impostosPagos: ImpostosPagos | null = null
    if (temComprovantes) {
      impostosPagos = { PIS: 0, COFINS: 0, IRPJ: 0, CSLL: 0 }
      for (const darf of dados.comprovantes!) {
        for (const cod of darf.codigos) {
          const tributo = labelTributo(cod.codigo)
          if (tributo && tributo in impostosPagos) impostosPagos[tributo as keyof ImpostosPagos] += cod.principal
        }
      }
    }
    await preencherAbaMenu(wsMenu, wb, cadastro, nomeCliente, impostosPagos)
  }

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

  const blob = await finalizarExcelComAntecipacaoIcmsSt(wb, pendenteIcmsSt)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - ${contexto} - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
