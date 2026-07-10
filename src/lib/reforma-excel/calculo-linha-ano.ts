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
  const isServico = l.documento === "Nota Fiscal de Serviço (NFS)"
  const vlrSemTributo = l.vlrItem - 0 - l.vlrPis - l.vlrCofins - l.vlrIcms - l.vlrDescontoItem
  const divisorPisCofins = 1 - l.aliquotaPis - l.aliquotaCofins
  const basePisCofins = divisorPisCofins !== 0 ? vlrSemTributo / divisorPisCofins : 0
  const vlrPis = basePisCofins * l.aliquotaPis
  const vlrCofins = basePisCofins * l.aliquotaCofins
  const baseIcmsFinance = isServico ? 0 : (aliqIcms !== 1 ? (vlrSemTributo + vlrPis + vlrCofins) / (1 - aliqIcms) : 0)
  const icms = baseIcmsFinance * aliqIcms
  const baseIssFinance = isServico ? (aliqIss !== 1 ? (vlrSemTributo + vlrPis + vlrCofins) / (1 - aliqIss) : 0) : 0
  const iss = baseIssFinance * aliqIss
  const difValorProduto = baseIssFinance - baseIcmsFinance - vlrSemTributo
  const baseIbsCbs = vlrSemTributo
  const ibs = baseIbsCbs * aliqIbs
  const cbs = baseIbsCbs * aliqCbs
  const totalNfFinance = baseIssFinance + baseIcmsFinance
  const totalNfCliente = l.vlrItem - l.vlrDescontoItem

  return {
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
