import type { LinhaEntradaEfd } from "./efd-icms-ipi-entradas-parser"

// Antecipação parcial de ICMS/FECOP do Ceará sobre entradas de mercadoria — Instrução Normativa
// CE n° 17/2013, com o critério de "origem estrangeira" da Resolução do Senado Federal n° 13/2012
// (CST/origem 1, 2, 3 ou 8). Regra confirmada com o usuário nesta sessão, não extraída de
// nenhuma legislação lida diretamente pela IA — ver docs/automacao-icms-st.md.
//
// Alíquota base pela "situação" do CFOP da entrada:
//   CFOP 1xxx (dentro do estado) ou 3xxx (importação direta do exterior) → 3% até 31/12/2023,
//   3,33% a partir de 01/01/2024.
//   CFOP 2xxx (fora do estado, interestadual) → 8% até 31/12/2023, 8,90% a partir de 01/01/2024.
// Adicional regional — SÓ quando fora do estado (2xxx) E mercadoria de origem estrangeira:
//   +3% quando o fornecedor é do Sul (PR/SC/RS) ou Sudeste (SP/RJ/MG), exceto ES.
//   +8% quando o fornecedor é do Norte, Nordeste, Centro-Oeste, ou ES.
// Base de cálculo: Vlr Item − Vlr Desconto Item (decisão confirmada com o usuário).

export type Regiao = "norte" | "nordeste" | "centro-oeste" | "sul" | "sudeste"

export const REGIAO_UF: Record<string, Regiao> = {
  RO: "norte", AC: "norte", AM: "norte", RR: "norte", PA: "norte", AP: "norte", TO: "norte",
  MA: "nordeste", PI: "nordeste", CE: "nordeste", RN: "nordeste", PB: "nordeste", PE: "nordeste",
  AL: "nordeste", SE: "nordeste", BA: "nordeste",
  MS: "centro-oeste", MT: "centro-oeste", GO: "centro-oeste", DF: "centro-oeste",
  PR: "sul", SC: "sul", RS: "sul",
  SP: "sudeste", RJ: "sudeste", MG: "sudeste", ES: "sudeste",
}

// CSOSN (Simples Nacional) — mesma lista que efd-icms-parser.ts usa em CSOSN_LABELS, duplicada
// de propósito (ver docs/recuperacao-credito.md seção 12 sobre esse padrão neste projeto). Um
// código que bate aqui NÃO tem dígito de origem utilizável (é uma tabela totalmente diferente do
// CST de regime normal) — tratado como origem nacional, sem adicional (decisão confirmada com o
// usuário: não dá pra identificar importação só pelo CSOSN).
const CODIGOS_CSOSN = new Set(["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"])

// true só quando o CST é de regime normal (não-CSOSN) com dígito de origem 1, 2, 3 ou 8.
export function origemEstrangeira(cstIcms: string): boolean {
  if (!cstIcms || CODIGOS_CSOSN.has(cstIcms)) return false
  return ["1", "2", "3", "8"].includes(cstIcms.charAt(0))
}

export type Situacao = "dentro_estado" | "fora_estado" | "importacao_exterior"

export function classificarSituacao(cfop: string): Situacao | null {
  const primeiro = cfop.charAt(0)
  if (primeiro === "1") return "dentro_estado"
  if (primeiro === "2") return "fora_estado"
  if (primeiro === "3") return "importacao_exterior"
  return null
}

const DATA_CORTE = Date.UTC(2024, 0, 1)

function aliquotaBase(situacao: Situacao, dataEntrada: Date): number {
  const novaFaixa = dataEntrada.getTime() >= DATA_CORTE
  if (situacao === "fora_estado") return novaFaixa ? 0.089 : 0.08
  return novaFaixa ? 0.0333 : 0.03
}

function adicionalRegiao(ufFornecedor: string): number {
  const regiao = REGIAO_UF[ufFornecedor]
  if (!regiao) return 0
  if (regiao === "sul" || regiao === "sudeste") return ufFornecedor === "ES" ? 0.08 : 0.03
  return 0.08 // norte, nordeste, centro-oeste
}

export function parseDataBr(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
}

export interface ResultadoAntecipacaoItem {
  situacao: Situacao
  origemEstrangeira: boolean
  base: number
  aliquotaBase: number
  adicionalRegiao: number
  aliquotaTotal: number
  valor: number
}

// null quando o CFOP não é de entrada (guarda) ou a Data de Entrada/Saída não pôde ser lida.
export function calcularAntecipacaoItem(linha: LinhaEntradaEfd): ResultadoAntecipacaoItem | null {
  const situacao = classificarSituacao(linha.cfop)
  if (!situacao) return null
  const dataEntrada = parseDataBr(linha.dataEntradaSaida)
  if (!dataEntrada) return null

  const estrangeira = situacao === "fora_estado" && origemEstrangeira(linha.cstIcms)
  const aliqBase = aliquotaBase(situacao, dataEntrada)
  const adicional = estrangeira ? adicionalRegiao(linha.ufFornecedor) : 0
  const aliquotaTotal = aliqBase + adicional
  const base = linha.vlrItem - linha.vlrDescontoItem
  const valor = Math.round(base * aliquotaTotal * 100) / 100

  return { situacao, origemEstrangeira: estrangeira, base, aliquotaBase: aliqBase, adicionalRegiao: adicional, aliquotaTotal, valor }
}
