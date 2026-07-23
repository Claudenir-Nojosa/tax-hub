import type { LinhaEntradaEfd } from "./efd-icms-ipi-entradas-parser"
import type { ConsultaCnpjDados } from "./cadastro-parser"

// Antecipação parcial de ICMS/FECOP do Ceará sobre entradas de mercadoria — Instrução Normativa
// CE n° 17/2013, com o critério de "origem estrangeira" da Resolução do Senado Federal n° 13/2012
// (CST/origem 1, 2, 3 ou 8). Regra confirmada com o usuário nesta sessão, não extraída de
// nenhuma legislação lida diretamente pela IA — ver docs/automacao-icms-st.md.
//
// Só se aplica a CFOP 1403 (dentro do estado) e 2403 (fora do estado) — os únicos CFOPs de
// "compra ... em operação com mercadoria sujeita ao regime de substituição tributária" (decisão
// confirmada com o usuário: todo item de toda nota é lido/listado, mas só esses dois CFOPs
// alimentam as colunas de ICMS-ST; qualquer outro CFOP fica de fora do cálculo).
//
// Alíquota base pela "situação":
//   CFOP 1403 (dentro do estado) → 3% até 31/12/2023, 3,33% a partir de 01/01/2024.
//   CFOP 2403 (fora do estado, interestadual) → 8% até 31/12/2023, 8,90% a partir de 01/01/2024.
// Adicional regional — SÓ quando fora do estado (2403) E mercadoria de origem estrangeira:
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
// Exportada (não só usada aqui): o export Excel precisa da mesma lista pra montar a tabela
// auxiliar que a fórmula da coluna "Origem Estrangeira" consulta (COUNTIF) — fonte única, pra
// não arriscar a lista divergir entre o cálculo em JS e a fórmula do Excel.
export const CODIGOS_CSOSN = ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"]
const SET_CSOSN = new Set(CODIGOS_CSOSN)

// true só quando o CST é de regime normal (não-CSOSN) com dígito de origem 1, 2, 3 ou 8.
export function origemEstrangeira(cstIcms: string): boolean {
  if (!cstIcms || SET_CSOSN.has(cstIcms)) return false
  return ["1", "2", "3", "8"].includes(cstIcms.charAt(0))
}

export type Situacao = "dentro_estado" | "fora_estado"

export function classificarSituacao(cfop: string): Situacao | null {
  if (cfop === "1403") return "dentro_estado"
  if (cfop === "2403") return "fora_estado"
  return null
}

const DATA_CORTE = Date.UTC(2024, 0, 1)

function aliquotaBase(situacao: Situacao, dataEntrada: Date): number {
  const novaFaixa = dataEntrada.getTime() >= DATA_CORTE
  if (situacao === "fora_estado") return novaFaixa ? 0.089 : 0.08
  return novaFaixa ? 0.0333 : 0.03
}

export function adicionalRegiao(ufFornecedor: string): number {
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

// null quando o CFOP não é 1403/2403 (item fora do escopo do ICMS-ST) ou a Data de Entrada/Saída
// não pôde ser lida — o item continua aparecendo na listagem/export, só sem as colunas de ICMS-ST.
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

// CNAE alvo pra inclusão automática na Recuperação de Crédito — "47.55-5-01 — Comércio varejista
// de tecidos". Decisão confirmada com o usuário: conta tanto se for o CNAE principal quanto se
// for um dos secundários do cliente (mais abrangente).
const CNAE_TEXTIL = "4755501"

function normalizarCnae(codigo: string): string {
  return codigo.replace(/\D/g, "")
}

// Determina se a Recuperação de Crédito deve mostrar a seção/aba de Antecipação ICMS-ST pra um
// cliente automaticamente: precisa ser do Ceará e ter o CNAE de comércio varejista de tecidos
// (principal ou secundário) no Cartão CNPJ (Consulta CNPJ) do projeto. Sem Consulta CNPJ ainda
// importada (`consultaCnpj` null/undefined), não há como checar — fica de fora silenciosamente
// (decisão confirmada com o usuário, mesmo comportamento de outras seções sem documento).
export function elegivelAntecipacaoIcmsSt(consultaCnpj: ConsultaCnpjDados | null | undefined): boolean {
  if (!consultaCnpj) return false
  if (consultaCnpj.uf !== "CE") return false
  const cnaes = [consultaCnpj.cnaePrincipal, ...consultaCnpj.cnaesSecundarios].filter((c): c is NonNullable<typeof c> => !!c)
  return cnaes.some((c) => normalizarCnae(c.codigo) === CNAE_TEXTIL)
}
