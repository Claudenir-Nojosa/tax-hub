// Cruzamento "retenções": imposto retido pelas fontes pagadoras (relatório DIRF do e-CAC, por
// ano-calendário) × o que foi efetivamente abatido nas apurações do mesmo ano. Retido e não
// abatido = crédito em potencial (🌟); abatido acima do retido informado = contingência.
//
// De onde vem cada lado (validado nos dados reais da CORE):
//   Retido (fontes) por tributo:
//     IRPJ  = códigos 1708 + 6256 + 3426 (IRRF)
//     PIS   = 5979 + rateio do 5952
//     COFINS= 5960 + rateio do 5952
//     CSLL  = 5987 + rateio do 5952
//     O código 5952 (retenção conjunta de PJ a PJ, 4,65%) é rateado na proporção legal
//     PIS 0,65 / COFINS 3,00 / CSLL 1,00 (Lei 10.833/2003, art. 31).
//   Abatido (apurações) por ano:
//     PIS/COFINS = Σ mensal de `retencoesOutrasDeducoes` da EFD Contribuições — CAVEAT: esse
//       campo soma retenções E outras deduções (F600 etc.), então a comparação é indicativa.
//     IRPJ = Σ das deduções do P300 cuja descrição contém "Retido na Fonte" (códigos 10/12/13);
//     CSLL = Σ das deduções do P500 cuja descrição contém "Retida na Fonte" (códigos 9-12).
// Só entram anos COMPARÁVEIS: com relatório de fontes E apuração correspondente importada
// (EFD pro PIS/COFINS, ECF pro IRPJ/CSLL). Ano com apuração parcial superestima a sobra —
// responsabilidade de quem importa subir o ano inteiro.

import type { DeclaracaoFontesPagadorasRegistro } from "./fontes-pagadoras-excel"
import type { DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import type { DeclaracaoEcfRegistro } from "./ecf-excel"
import type { LinhaEcf } from "./ecf-parser"

export type TributoRetencao = "IRPJ" | "CSLL" | "PIS" | "COFINS"

export interface ComparativoRetencao {
  ano: string
  tributo: TributoRetencao
  retido: number
  abatido: number
  dif: number // retido - abatido (>0 = retenção não aproveitada; <0 = abatido acima do retido)
}

const RATEIO_5952 = { PIS: 0.65 / 4.65, COFINS: 3.0 / 4.65, CSLL: 1.0 / 4.65 }
const CODIGOS_IRPJ = new Set(["1708", "6256", "3426"])
const RE_RETIDO_FONTE = /retid[oa] na fonte/i

function arred(v: number): number {
  return Math.round(v * 100) / 100
}

function retidoPorTributo(fonte: DeclaracaoFontesPagadorasRegistro): Record<TributoRetencao, number> {
  const r: Record<TributoRetencao, number> = { IRPJ: 0, CSLL: 0, PIS: 0, COFINS: 0 }
  for (const f of fonte.dados.fontes) {
    for (const c of f.codigos) {
      if (CODIGOS_IRPJ.has(c.codigo)) r.IRPJ += c.imposto
      else if (c.codigo === "5979") r.PIS += c.imposto
      else if (c.codigo === "5960") r.COFINS += c.imposto
      else if (c.codigo === "5987") r.CSLL += c.imposto
      else if (c.codigo === "5952") {
        r.PIS += c.imposto * RATEIO_5952.PIS
        r.COFINS += c.imposto * RATEIO_5952.COFINS
        r.CSLL += c.imposto * RATEIO_5952.CSLL
      }
    }
  }
  return r
}

function somaRetidoNaFonte(linhas: LinhaEcf[]): number {
  return linhas
    .filter((l) => /^\(-\)/.test(l.descricao) && RE_RETIDO_FONTE.test(l.descricao))
    .reduce((s, l) => s + (l.valor ?? 0), 0)
}

export function compararRetencoes(
  fontes: DeclaracaoFontesPagadorasRegistro[],
  efdContribuicoes: DeclaracaoEfdContribuicoesRegistro[],
  ecf: DeclaracaoEcfRegistro[]
): ComparativoRetencao[] {
  // abatido por ano nas apurações
  const efdPorAno = new Map<string, { PIS: number; COFINS: number }>()
  for (const d of efdContribuicoes) {
    const ano = d.competencia.slice(0, 4)
    const atual = efdPorAno.get(ano) ?? { PIS: 0, COFINS: 0 }
    atual.PIS += d.dados.apuracaoPis?.retencoesOutrasDeducoes ?? 0
    atual.COFINS += d.dados.apuracaoCofins?.retencoesOutrasDeducoes ?? 0
    efdPorAno.set(ano, atual)
  }
  const ecfPorAno = new Map<string, { IRPJ: number; CSLL: number }>()
  for (const d of ecf) {
    const ano = d.dados.anoCalendario
    const atual = ecfPorAno.get(ano) ?? { IRPJ: 0, CSLL: 0 }
    for (const p of d.dados.periodos) {
      atual.IRPJ += somaRetidoNaFonte(p.p300)
      atual.CSLL += somaRetidoNaFonte(p.p500)
    }
    ecfPorAno.set(ano, atual)
  }

  const comparativos: ComparativoRetencao[] = []
  const ordenadas = [...fontes].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const fonte of ordenadas) {
    const ano = fonte.competencia
    const retido = retidoPorTributo(fonte)
    const efdAno = efdPorAno.get(ano)
    const ecfAno = ecfPorAno.get(ano)

    if (efdAno) {
      for (const tributo of ["PIS", "COFINS"] as const) {
        const r = arred(retido[tributo])
        const a = arred(efdAno[tributo])
        comparativos.push({ ano, tributo, retido: r, abatido: a, dif: arred(r - a) })
      }
    }
    if (ecfAno) {
      for (const tributo of ["IRPJ", "CSLL"] as const) {
        const r = arred(retido[tributo])
        const a = arred(ecfAno[tributo])
        comparativos.push({ ano, tributo, retido: r, abatido: a, dif: arred(r - a) })
      }
    }
  }
  return comparativos
}
