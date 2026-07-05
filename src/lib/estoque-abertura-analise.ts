// Cruzamento "crédito de estoque de abertura": quando o contribuinte muda pro regime NÃO
// CUMULATIVO (Lucro Real) — vindo do Simples Nacional ou do Lucro Presumido —, tem direito ao
// crédito presumido sobre o estoque existente em 31/dez do último ano no regime anterior:
// PIS 0,65% e COFINS 3%, apropriável em 12 parcelas mensais (Lei 10.637/2002, art. 11; Lei
// 10.833/2003, art. 12).
//
// Como o analisador detecta e calcula (tudo determinístico, com os arquivos já importados):
//   1. Regime por ano pela EFD Contribuições: ano com contribuição NÃO cumulativa > 0 = Lucro
//      Real; só cumulativa = Presumido (ou equiparado). O ano da mudança (M) é o primeiro ano
//      não cumulativo cujo ano anterior era cumulativo (Presumido → Real) ou estava no Simples
//      (fim de período da Consulta Optantes do cadastro, ou ECF Presumido do ano anterior).
//   2. Estoque em 31/12/(M-1) = saldo de ABERTURA das contas de estoque na ECD do ano M (a
//      abertura pós-encerramento é a fonte validada — ver docs §10). Contas de estoque =
//      natureza Ativo com "estoque" no nome; soma só as RAÍZES do conjunto (contas sem outra
//      conta de estoque como ancestral) pra não contar sintética + analítica duas vezes.
//   3. Crédito potencial = estoque × 0,65% (PIS) e × 3% (COFINS).
// GAP CONHECIDO: não dá pra conferir se o crédito JÁ FOI aproveitado — o parser da EFD não lê
// os registros de crédito (F150/M105/M505), ver gap documentado em §5. A observação manda
// conferir manualmente.

import type { DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import type { DeclaracaoEcdRegistro } from "./ecd-excel"
import type { DeclaracaoEcfRegistro } from "./ecf-excel"
import type { SimplesNacionalDados } from "./cadastro-parser"

export interface MudancaRegime {
  anoMudanca: string // primeiro ano no regime não cumulativo
  regimeAnterior: "Simples Nacional" | "Lucro Presumido"
}

export interface ResultadoEstoqueAbertura {
  anosAnalisados: string[]
  mudanca: MudancaRegime | null
  // presentes só quando há mudança E a ECD do ano da mudança foi importada
  estoque?: number
  contasEstoque?: { codigo: string; nome: string; valor: number }[]
  creditoPis?: number
  creditoCofins?: number
  temEcdDoAnoMudanca: boolean
}

const LIMIAR = 0.01

function regimePorAno(efd: DeclaracaoEfdContribuicoesRegistro[]): Map<string, "real" | "cumulativo"> {
  const somas = new Map<string, { nc: number; cum: number }>()
  for (const d of efd) {
    const ano = d.competencia.slice(0, 4)
    const s = somas.get(ano) ?? { nc: 0, cum: 0 }
    s.nc +=
      (d.dados.apuracaoPis?.valorContribuicaoNaoCumulativa ?? 0) +
      (d.dados.apuracaoCofins?.valorContribuicaoNaoCumulativa ?? 0)
    s.cum +=
      (d.dados.apuracaoPis?.valorContribuicaoCumulativa ?? 0) + (d.dados.apuracaoCofins?.valorContribuicaoCumulativa ?? 0)
    somas.set(ano, s)
  }
  const regimes = new Map<string, "real" | "cumulativo">()
  for (const [ano, s] of somas) {
    if (s.nc > LIMIAR) regimes.set(ano, "real")
    else if (s.cum > LIMIAR) regimes.set(ano, "cumulativo")
    // ano sem débito nenhum fica sem classificação — não dá pra afirmar o regime
  }
  return regimes
}

// o ano estava no Simples? — pela Consulta Optantes do cadastro (opção vigente ou períodos
// anteriores cujo intervalo cobre dezembro do ano)
function anoNoSimples(ano: string, simples: SimplesNacionalDados | null | undefined): boolean {
  if (!simples) return false
  const fimDoAno = `${ano}1231`
  const chave = (dataBR: string) => {
    const m = dataBR.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    return m ? `${m[3]}${m[2]}${m[1]}` : null
  }
  if (simples.optanteDesde) {
    const inicio = chave(simples.optanteDesde)
    if (inicio && inicio <= fimDoAno) return true
  }
  for (const p of simples.periodosAnteriores) {
    const inicio = chave(p.inicio)
    const fim = p.fim ? chave(p.fim) : null
    if (inicio && inicio <= fimDoAno && (!fim || fim >= fimDoAno)) return true
  }
  return false
}

function detectarMudanca(
  efd: DeclaracaoEfdContribuicoesRegistro[],
  ecf: DeclaracaoEcfRegistro[],
  simples: SimplesNacionalDados | null | undefined
): { mudanca: MudancaRegime | null; anosAnalisados: string[] } {
  const regimes = regimePorAno(efd)
  const anos = [...regimes.keys()].sort()
  const anosEcfPresumido = new Set(ecf.filter((d) => d.dados.formaTributacao === "5").map((d) => d.dados.anoCalendario))

  for (const ano of anos) {
    if (regimes.get(ano) !== "real") continue
    const anterior = String(Number(ano) - 1)
    if (regimes.get(anterior) === "cumulativo" || anosEcfPresumido.has(anterior)) {
      return { mudanca: { anoMudanca: ano, regimeAnterior: "Lucro Presumido" }, anosAnalisados: anos }
    }
    if (anoNoSimples(anterior, simples)) {
      return { mudanca: { anoMudanca: ano, regimeAnterior: "Simples Nacional" }, anosAnalisados: anos }
    }
    // primeiro ano já não cumulativo sem nenhum dado do ano anterior: sem base pra afirmar
    // mudança — segue procurando uma virada comprovada mais adiante
  }
  return { mudanca: null, anosAnalisados: anos }
}

// contas de estoque da ECD: natureza Ativo + "estoque" no nome; só as raízes do conjunto
// (nenhuma outra conta de estoque é ancestral), senão sintética e analítica somariam em dobro
function contasEstoqueRaiz(ecdDoAno: DeclaracaoEcdRegistro): { codigo: string; nome: string; valor: number }[] {
  const deEstoque = ecdDoAno.dados.contas.filter((c) => c.codNat === "01" && /estoque/i.test(c.nome))
  return deEstoque
    .filter((c) => !deEstoque.some((outra) => outra !== c && c.codCta.startsWith(outra.codCta)))
    .map((c) => ({ codigo: c.codFormatado, nome: c.nome, valor: Math.round(c.abertura * 100) / 100 }))
}

export function analisarEstoqueAbertura(
  efd: DeclaracaoEfdContribuicoesRegistro[],
  ecd: DeclaracaoEcdRegistro[],
  ecf: DeclaracaoEcfRegistro[],
  simples: SimplesNacionalDados | null | undefined
): ResultadoEstoqueAbertura | null {
  if (efd.length === 0) return null
  const { mudanca, anosAnalisados } = detectarMudanca(efd, ecf, simples)
  if (!mudanca) return { anosAnalisados, mudanca: null, temEcdDoAnoMudanca: false }

  const ecdDoAno = ecd.find((d) => d.competencia === mudanca.anoMudanca)
  if (!ecdDoAno) return { anosAnalisados, mudanca, temEcdDoAnoMudanca: false }

  const contas = contasEstoqueRaiz(ecdDoAno)
  const estoque = Math.round(contas.reduce((s, c) => s + c.valor, 0) * 100) / 100
  return {
    anosAnalisados,
    mudanca,
    temEcdDoAnoMudanca: true,
    estoque,
    contasEstoque: contas,
    creditoPis: Math.round(estoque * 0.0065 * 100) / 100,
    creditoCofins: Math.round(estoque * 0.03 * 100) / 100,
  }
}
