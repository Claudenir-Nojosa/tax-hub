import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"

// Cronograma de redução de ICMS/ISS 2029-2033 — mesma tabela exibida na aba Premissas
// (montarAbaPremissas). Fixado pela LC 214/2025 (imutável por lei, mesmo espírito de
// PREMISSAS_PADRAO em reforma-engine.ts — não é editável pelo wizard). 2026-2028 = 100% (ICMS/ISS
// plenos, a transição de fato começa em 2029).
export const REDUCAO_ICMS_ISS: Record<number, number> = {
  2026: 1, 2027: 1, 2028: 1, 2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6, 2033: 0,
}

// Cadeia de cálculo de uma linha de saída sob a premissa de um ano — espelha exatamente as
// fórmulas gravadas em anos.ts (ver docs/reforma-tributaria-v2.md, "Cadeia de fórmulas das abas
// de ano"). Extraído como função pura pra ser reaproveitado tanto na escrita das abas de ano
// quanto no cálculo dos resultados pré-computados de Valor Total NF-e e Quadro Comparativo — sem
// isso, os dois lugares podiam divergir silenciosamente (ex: usar o valor bruto do EFD em vez do
// recalculado, o que já quase aconteceu nesta fase).

export interface CamposCalculadosAno {
  aliqIssLinha: number // resultado da fórmula AP: premissa ISS pra serviço, 0 pra mercadoria
  vlrIss: number // resultado da fórmula AQ = Vlr Item × Alíquota ISS
  vlrSemTributo: number
  basePisCofins: number
  vlrPis: number
  vlrCofins: number
  vlrPisCofins: number
  baseIcmsFinance: number
  icms: number
  baseIssFinance: number
  iss: number
  vlrPisCofinsIss: number
  difValorProduto: number
  baseIbsCbs: number
  ibs: number
  cbs: number
  totalNfFinance: number
  totalNfCliente: number
  dif: number
}

export function calcularCamposAno(
  l: LinhaSaidaEfd,
  aliqIss: number,
  aliqIbs: number,
  aliqCbs: number,
  aliqIcms: number = l.aliquotaIcms
): CamposCalculadosAno {
  // Convenções de unidade — as MESMAS do Excel-modelo, célula a célula:
  //   aliquotaPis/aliquotaCofins: número percentual (1,65) → fórmulas usam AY8% (÷100)
  //   aliquotaIcms: decimal (0,225) → fórmulas usam AR8% (÷100 DE NOVO — comportamento do
  //     modelo, reproduzido fielmente; o ICMS "finance" sai proporcionalmente pequeno lá também)
  //   aliqIss: decimal (0,03) → fórmulas usam AP8 direto (sem %)
  const isServico = l.documento === "Nota Fiscal de Serviço (NFS)"
  const aliqIssLinha = isServico ? aliqIss : 0 // fórmula AP: IF(Tipo Item="09 Serviços",premissa,0)
  const vlrIss = l.vlrItem * aliqIssLinha // fórmula AQ = AH×AP
  const vlrSemTributo = l.vlrItem - l.vlrDescontoItem - l.vlrIcms - l.vlrPis - l.vlrCofins - vlrIss
  const divisorPisCofins = 1 - l.aliquotaPis / 100 - l.aliquotaCofins / 100
  const basePisCofins = divisorPisCofins !== 0 ? vlrSemTributo / divisorPisCofins : 0
  const vlrPis = basePisCofins * (l.aliquotaPis / 100)
  const vlrCofins = basePisCofins * (l.aliquotaCofins / 100)
  const baseIcmsFinance = isServico ? 0 : (vlrSemTributo + vlrPis + vlrCofins) / (1 - aliqIcms / 100)
  const icms = baseIcmsFinance * (aliqIcms / 100)
  const baseIssFinance = isServico && aliqIss !== 1 ? (vlrSemTributo + vlrPis + vlrCofins) / (1 - aliqIss) : 0
  const iss = baseIssFinance * aliqIssLinha
  const difValorProduto = baseIssFinance - baseIcmsFinance - vlrSemTributo
  const baseIbsCbs = vlrSemTributo
  const ibs = baseIbsCbs * aliqIbs
  const cbs = baseIbsCbs * aliqCbs
  const totalNfFinance = baseIssFinance + baseIcmsFinance
  const totalNfCliente = l.vlrItem - l.vlrDescontoItem

  return {
    aliqIssLinha, vlrIss,
    vlrSemTributo, basePisCofins, vlrPis, vlrCofins, vlrPisCofins: vlrPis + vlrCofins,
    baseIcmsFinance, icms, baseIssFinance, iss, vlrPisCofinsIss: vlrPis + vlrCofins + iss,
    difValorProduto, baseIbsCbs, ibs, cbs, totalNfFinance, totalNfCliente,
    dif: totalNfCliente - totalNfFinance,
  }
}

// Alíquota IBS/CBS efetiva do ano (aplica a redução de 60% só no débito, se marcada na premissa)
export function aliquotasEfetivasDoAno(
  cbs: number, ibsUF: number, ibsMUN: number, reducao60: boolean
): { aliqIbs: number; aliqCbs: number } {
  const fator = reducao60 ? 0.4 : 1
  return { aliqIbs: (ibsUF + ibsMUN) * fator, aliqCbs: cbs * fator }
}
