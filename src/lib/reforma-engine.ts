// Motor de cálculo da Reforma Tributária (EC 132/2023 + LC 214/2025)
// Alíquotas baseadas nas premissas da planilha Renova Embalagens

export type PremissaAno = {
  cbs: number       // Contribuição sobre Bens e Serviços
  ibsUF: number     // IBS estadual
  ibsMUN: number    // IBS municipal
  icmsReducao: number // fator de redução do ICMS (1.0 = 100%, 0 = extinto)
  ipiAtivo: boolean   // IPI ainda vigente (extinto a partir de 2027 fora ZFM)
  periodoTeste?: boolean // IBS/CBS em fase de teste (2026) — compensado por crédito PIS/COFINS, não onerava a carga
}

export const PREMISSAS_PADRAO: Record<number, PremissaAno> = {
  2026: { cbs: 0.009,  ibsUF: 0.001,  ibsMUN: 0.000,  icmsReducao: 1.00, ipiAtivo: true, periodoTeste: true },
  2027: { cbs: 0.087,  ibsUF: 0.0005, ibsMUN: 0.0005, icmsReducao: 1.00, ipiAtivo: false },
  2028: { cbs: 0.087,  ibsUF: 0.0005, ibsMUN: 0.0005, icmsReducao: 1.00, ipiAtivo: false },
  2029: { cbs: 0.088,  ibsUF: 0.0175, ibsMUN: 0.0087, icmsReducao: 0.90, ipiAtivo: false },
  2030: { cbs: 0.088,  ibsUF: 0.0342, ibsMUN: 0.0171, icmsReducao: 0.80, ipiAtivo: false },
  2031: { cbs: 0.088,  ibsUF: 0.0502, ibsMUN: 0.0251, icmsReducao: 0.70, ipiAtivo: false },
  2032: { cbs: 0.088,  ibsUF: 0.0656, ibsMUN: 0.0328, icmsReducao: 0.60, ipiAtivo: false },
  2033: { cbs: 0.088,  ibsUF: 0.1227, ibsMUN: 0.0543, icmsReducao: 0.00, ipiAtivo: false },
}

export const ANOS_TRANSICAO = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

export type RegimeTributario =
  | "SIMPLES_I"
  | "SIMPLES_II"
  | "SIMPLES_III"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL"

// Alíquotas nominais do Simples Nacional por anexo (faixa 1 até R$180k)
// Fonte: LC 123/2006 com vigência 2024
export const SIMPLES_ALIQUOTAS: Record<string, { nominal: number; descricao: string }> = {
  SIMPLES_I:   { nominal: 0.04,   descricao: "Comércio (Anexo I)" },
  SIMPLES_II:  { nominal: 0.045,  descricao: "Indústria (Anexo II)" },
  SIMPLES_III: { nominal: 0.06,   descricao: "Serviços (Anexo III)" },
}

export type InputSimulacao = {
  faturamento: number           // receita bruta anual (R$)
  regime: RegimeTributario
  simplesNacional: boolean
  aliquotaICMS: number          // ex: 0.12
  aliquotaICMSCompras: number   // para crédito (ex: 0.12)
  temIPI: boolean
  aliquotaIPI: number           // ex: 0.15
  percentualIPISaidas: number   // ex: 0.8 (80% das saídas com IPI)
  temFCBF: boolean
  fcbfPercentual: number        // ex: 0.02 (2%)
  fcbfBaseCalculoMensal: number // base de cálculo mensal do FCBF (R$)
  premissas?: Record<number, PremissaAno> // override das premissas padrão
}

export type ResultadoAno = {
  ano: number
  // Carga atual (baseline — sem reforma)
  pisCofinsAtual: number
  icmsAtual: number
  ipiAtual: number
  cargaAtualTotal: number
  cargaAtualPct: number

  // Carga com a reforma
  cbs: number
  ibsUF: number
  ibsMUN: number
  ibsCbsTotal: number
  icmsReforma: number
  ipiReforma: number
  creditoCompras: number
  cargaReformaTotal: number
  cargaReformaPct: number

  // Delta
  delta: number        // positivo = mais caro, negativo = economia
  deltaPct: number     // delta / faturamento

  // FCBF
  fcbfEconomia: number
  cargaLiquidaComFcbf: number
  cargaLiquidaPct: number

  // Comparativo Simples (se aplicável)
  cargaSimplesNominal: number
  cargaSimplesPct: number
  diferencaSimplesPct: number  // Simples - ReformaRegular (positivo = Simples mais caro)

  // Metadados
  ipiExtinto: boolean
  icmsReducaoFator: number
  ibsTotal: number
  ibsCbsPct: number
}

function calcularCargaSimples(faturamento: number, regime: RegimeTributario): number {
  const aliq = SIMPLES_ALIQUOTAS[regime]
  if (!aliq) return 0
  return faturamento * aliq.nominal
}

export function calcularSimulacao(input: InputSimulacao): ResultadoAno[] {
  const premissas = input.premissas ?? PREMISSAS_PADRAO
  const fcbfBaseAnual = input.fcbfBaseCalculoMensal * 12

  // Carga atual PIS/COFINS (regime regular: cumulativo 3.65% ou não-cumulativo 9.25% com crédito)
  // Para simplificação usamos 3.65% (cumulativo/presumido) ou 7.6% líquido para real
  // O usuário pode ajustar nas premissas
  const pisCofinsRate = (input.regime === "LUCRO_REAL") ? 0.0925 : 0.0365

  return ANOS_TRANSICAO.map((ano) => {
    const p = premissas[ano]

    // --- Carga ATUAL (baseline sem reforma) ---
    const pisCofinsAtual = input.simplesNacional ? 0 : input.faturamento * pisCofinsRate
    const icmsAtual = input.faturamento * input.aliquotaICMS
    const ipiAtual = (input.temIPI && p.ipiAtivo)
      ? input.faturamento * input.percentualIPISaidas * input.aliquotaIPI
      : (input.temIPI && ano === 2026) // 2026 IPI ainda vigente
        ? input.faturamento * input.percentualIPISaidas * input.aliquotaIPI
        : 0
    const cargaAtualTotal = pisCofinsAtual + icmsAtual + ipiAtual

    // --- Carga REFORMA ---
    const cbs      = input.faturamento * p.cbs
    const ibsUF    = input.faturamento * p.ibsUF
    const ibsMUN   = input.faturamento * p.ibsMUN
    const ibsCbsTotal = cbs + ibsUF + ibsMUN

    const icmsReforma = input.faturamento * input.aliquotaICMS * p.icmsReducao

    const ipiReforma = (input.temIPI && p.ipiAtivo)
      ? input.faturamento * input.percentualIPISaidas * input.aliquotaIPI
      : 0

    const creditoCompras = input.faturamento * input.aliquotaICMSCompras
      * (p.cbs + p.ibsUF + p.ibsMUN)

    // Em período de teste (2026): IBS/CBS são compensados por crédito PIS/COFINS — efeito líquido zero
    const ibsCbsNaCarga = p.periodoTeste ? 0 : ibsCbsTotal
    const cargaReformaTotal = ibsCbsNaCarga + icmsReforma + ipiReforma - creditoCompras

    const delta    = cargaReformaTotal - cargaAtualTotal
    const deltaPct = delta / input.faturamento

    // --- FCBF ---
    // Benefício expira gradualmente com o ICMS (redução = fator de redução ICMS)
    const fcbfEconomia = input.temFCBF && p.icmsReducao > 0
      ? fcbfBaseAnual * input.fcbfPercentual * p.icmsReducao
      : 0
    const cargaLiquidaComFcbf = cargaReformaTotal - fcbfEconomia

    // --- Simples Nacional ---
    const cargaSimplesNominal = input.simplesNacional
      ? calcularCargaSimples(input.faturamento, input.regime)
      : calcularCargaSimples(input.faturamento, input.regime) // para comparativo mesmo se não for simples
    const cargaSimplesPct = cargaSimplesNominal / input.faturamento
    const diferencaSimplesPct = cargaSimplesPct - (cargaReformaTotal / input.faturamento)

    return {
      ano,
      pisCofinsAtual,
      icmsAtual,
      ipiAtual,
      cargaAtualTotal,
      cargaAtualPct: cargaAtualTotal / input.faturamento,
      cbs,
      ibsUF,
      ibsMUN,
      ibsCbsTotal,
      icmsReforma,
      ipiReforma,
      creditoCompras,
      cargaReformaTotal: Math.max(0, cargaReformaTotal),
      cargaReformaPct: Math.max(0, cargaReformaTotal) / input.faturamento,
      delta,
      deltaPct,
      fcbfEconomia,
      cargaLiquidaComFcbf: Math.max(0, cargaLiquidaComFcbf),
      cargaLiquidaPct: Math.max(0, cargaLiquidaComFcbf) / input.faturamento,
      cargaSimplesNominal,
      cargaSimplesPct,
      diferencaSimplesPct,
      ipiExtinto: !p.ipiAtivo,
      icmsReducaoFator: p.icmsReducao,
      ibsTotal: ibsUF + ibsMUN,
      ibsCbsPct: (cbs + ibsUF + ibsMUN) / input.faturamento,
    }
  })
}

export type InputSimulacaoXml = {
  dadosXml: {
    totalBaseIbsCbs: number
    totalVICMS: number
    totalVPIS: number
    totalVCOFINS: number
    totalVIPI: number
    totalVProd: number
    aliquotaICMSEfetiva: number
    aliquotaIPIEfetiva: number
    percentualIPISaidas: number
    mesesImportados: number
  }
  regime: RegimeTributario
  simplesNacional: boolean
  aliquotaICMSCompras: number
  temFCBF: boolean
  fcbfPercentual: number
  fcbfBaseCalculoMensal: number
  premissas?: Record<number, PremissaAno>
}

export function calcularSimulacaoXml(input: InputSimulacaoXml): ResultadoAno[] {
  const premissas = input.premissas ?? PREMISSAS_PADRAO
  const { dadosXml } = input

  // Usa os dados do XML diretamente — sem anualização
  // Para projeção anual, o usuário importa 12 meses de dados
  const baseIbsCbs  = dadosXml.totalBaseIbsCbs
  const vICMS       = dadosXml.totalVICMS
  const vIPI        = dadosXml.totalVIPI
  const faturamento = dadosXml.totalVProd

  // Carga atual real do XML (PIS/COFINS e ICMS reais — não estimados)
  const pisCofinsAtualReal = dadosXml.totalVPIS + dadosXml.totalVCOFINS
  const icmsAtualReal      = vICMS
  const ipiAtualReal       = vIPI

  // FCBF: proporcional ao período importado (base mensal × meses)
  const fcbfBaseperiodo = input.fcbfBaseCalculoMensal * dadosXml.mesesImportados

  return ANOS_TRANSICAO.map((ano) => {
    const p = premissas[ano]

    // Carga atual (valores reais do XML)
    const pisCofinsAtual  = input.simplesNacional ? 0 : pisCofinsAtualReal
    const icmsAtual       = icmsAtualReal
    const ipiAtual        = (p.ipiAtivo || ano === 2026) ? ipiAtualReal : 0
    const cargaAtualTotal = pisCofinsAtual + icmsAtual + ipiAtual

    // Carga reforma — base real (vProd - ICMS - PIS - COFINS)
    const cbs         = baseIbsCbs * p.cbs
    const ibsUF       = baseIbsCbs * p.ibsUF
    const ibsMUN      = baseIbsCbs * p.ibsMUN
    const ibsCbsTotal = cbs + ibsUF + ibsMUN

    // ICMS reforma:
    // 2026 (periodoTeste): usa o ICMS real do XML (sem alterar base)
    // 2027+: base_ICMS = (baseIbsCbs + IBS + CBS) / (1 − aliq×reducao) → ICMS = base × aliq×reducao
    let icmsReforma: number
    if (p.periodoTeste) {
      icmsReforma = vICMS
    } else {
      const aliq = dadosXml.aliquotaICMSEfetiva * p.icmsReducao
      icmsReforma = aliq < 1 ? (baseIbsCbs + ibsCbsTotal) * aliq / (1 - aliq) : 0
    }

    const ipiReforma  = p.ipiAtivo ? vIPI : 0

    // Em período de teste (2026): IBS/CBS compensados por crédito PIS/COFINS — efeito líquido zero
    const ibsCbsNaCarga = p.periodoTeste ? 0 : ibsCbsTotal
    const creditoCompras = 0

    const cargaReformaTotal = ibsCbsNaCarga + icmsReforma + ipiReforma

    const delta    = cargaReformaTotal - cargaAtualTotal
    const deltaPct = faturamento > 0 ? delta / faturamento : 0

    const fcbfEconomia = input.temFCBF && p.icmsReducao > 0
      ? fcbfBaseperiodo * input.fcbfPercentual * p.icmsReducao
      : 0
    const cargaLiquidaComFcbf = cargaReformaTotal - fcbfEconomia

    const cargaSimplesNominal = calcularCargaSimples(faturamento, input.regime)
    const cargaSimplesPct     = faturamento > 0 ? cargaSimplesNominal / faturamento : 0
    const diferencaSimplesPct = cargaSimplesPct - (Math.max(0, cargaReformaTotal) / faturamento)

    return {
      ano,
      pisCofinsAtual,
      icmsAtual,
      ipiAtual,
      cargaAtualTotal,
      cargaAtualPct: faturamento > 0 ? cargaAtualTotal / faturamento : 0,
      cbs,
      ibsUF,
      ibsMUN,
      ibsCbsTotal,
      icmsReforma,
      ipiReforma,
      creditoCompras,
      cargaReformaTotal: Math.max(0, cargaReformaTotal),
      cargaReformaPct: faturamento > 0 ? Math.max(0, cargaReformaTotal) / faturamento : 0,
      delta,
      deltaPct,
      fcbfEconomia,
      cargaLiquidaComFcbf: Math.max(0, cargaLiquidaComFcbf),
      cargaLiquidaPct: faturamento > 0 ? Math.max(0, cargaLiquidaComFcbf) / faturamento : 0,
      cargaSimplesNominal,
      cargaSimplesPct,
      diferencaSimplesPct,
      ipiExtinto: !p.ipiAtivo,
      icmsReducaoFator: p.icmsReducao,
      ibsTotal: ibsUF + ibsMUN,
      ibsCbsPct: faturamento > 0 ? (cbs + ibsUF + ibsMUN) / faturamento : 0,
    }
  })
}

export function formatarMoeda(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatarPorcentagem(value: number, decimais = 1): string {
  return `${(value * 100).toFixed(decimais)}%`
}
