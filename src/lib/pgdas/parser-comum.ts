import type { AtividadePgdas, DebitoGeralPgdas, TributosValores, ValoresMercado } from "./types"
import { matchAllValores, parseNumeroBR, proximosValoresBR, ultimoIndiceFimMatch } from "./text-utils"

function tributosZerados(): TributosValores {
  return { irpj: 0, csll: 0, cofins: 0, pisPasep: 0, inssCpp: 0, icms: 0, ipi: 0, iss: 0, total: 0 }
}

export function extrairCabecalho(texto: string): { cnpj: string; razaoSocial: string } {
  const cnpjMatriz = texto.match(/CNPJ Matriz:\s*([\d.\/-]+)/i)
  const cnpjEstabelecimento = texto.match(/CNPJ Estabelecimento:\s*([\d.\/-]+)/i)
  const cnpj = (cnpjMatriz?.[1] ?? cnpjEstabelecimento?.[1] ?? "").trim()

  const nomeMatch = texto.match(/Nome [Ee]mpresarial:\s*(.+?)\s+Data de/)
  const razaoSocial = (nomeMatch?.[1] ?? "").trim()

  return { cnpj, razaoSocial }
}

// rotulo deve casar exatamente até o fim do rótulo (sem incluir os valores) —
// os 3 próximos valores monetários no texto são interpretados como
// Mercado Interno / Mercado Externo / Total.
export function extrairValoresMercado(texto: string, rotulo: RegExp): ValoresMercado | null {
  const m = texto.match(rotulo)
  if (!m || m.index === undefined) return null
  const offset = m.index + m[0].length
  const [mercadoInterno, mercadoExterno, total] = proximosValoresBR(texto, offset, 3)
  return { mercadoInterno: mercadoInterno ?? 0, mercadoExterno: mercadoExterno ?? 0, total: total ?? 0 }
}

const TRIBUTOS_HEADER_RE = /IRPJ\s+CSLL\s+COFINS\s+PIS\/Pasep\s+INSS\/CPP\s+ICMS\s+IPI\s+ISS\s+Total/i

// Localiza o cabeçalho de 9 colunas (IRPJ..ISS+Total) a partir de um offset e captura os
// 9 valores monetários que vêm logo em seguida, na mesma ordem fixa em que sempre aparecem no PGDAS.
export function extrairTributosAposHeader(texto: string, fromIndex = 0): TributosValores | null {
  const janela = texto.slice(fromIndex)
  const m = janela.match(TRIBUTOS_HEADER_RE)
  if (!m || m.index === undefined) return null
  const offset = fromIndex + m.index + m[0].length
  const [irpj, csll, cofins, pisPasep, inssCpp, icms, ipi, iss, total] = proximosValoresBR(texto, offset, 9)
  return { irpj, csll, cofins, pisPasep, inssCpp, icms, ipi, iss, total }
}

function extrairTributosUltimaOcorrencia(texto: string, rotulo: RegExp): TributosValores | null {
  const offset = ultimoIndiceFimMatch(texto, rotulo)
  if (offset === null) return null
  return extrairTributosAposHeader(texto, offset)
}

const ATIVIDADE_HEADER_RE = /Valor do D[ée]bito por Tributo para a Atividade\s*\(R\$\):/gi
const FIM_BLOCO_RE = /(Totais do Estabelecimento|Informa[cç][õo]es por Estabelecimento)/i

export function extrairAtividades(texto: string): AtividadePgdas[] {
  const re = new RegExp(ATIVIDADE_HEADER_RE.source, "gi")
  const inicios: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) inicios.push(m.index + m[0].length)

  const atividades: AtividadePgdas[] = []
  for (let i = 0; i < inicios.length; i++) {
    const inicioBloco = inicios[i]
    let fimBloco = i + 1 < inicios.length ? inicios[i + 1] : texto.length

    const fimMatch = texto.slice(inicioBloco, fimBloco).match(FIM_BLOCO_RE)
    if (fimMatch && fimMatch.index !== undefined) fimBloco = inicioBloco + fimMatch.index

    const bloco = texto.slice(inicioBloco, fimBloco)

    const receitaMatch = bloco.match(/Receita Bruta Informada:\s*R\$\s*([\d.,]+)/i)
    if (!receitaMatch || receitaMatch.index === undefined) continue

    const descricao = bloco.slice(0, receitaMatch.index).trim()
    const receitaBrutaInformada = parseNumeroBR(receitaMatch[1])
    const tributos = extrairTributosAposHeader(bloco) ?? tributosZerados()
    const parcelas = matchAllValores(bloco, /Parcela\s*\d+:\s*R\$\s*([\d.,]+)/gi)

    atividades.push({ descricao, receitaBrutaInformada, tributos, parcelas })
  }
  return atividades
}

export function extrairDebitoGeral(texto: string): DebitoGeralPgdas {
  return {
    declaradoExigivelSuspenso:
      extrairTributosUltimaOcorrencia(texto, /Total do D[ée]bito Declarado \(exig[íi]vel \+ suspenso\)/i) ??
      tributosZerados(),
    exigibilidadeSuspensa:
      extrairTributosUltimaOcorrencia(texto, /Total do D[ée]bito com Exigibilidade Suspensa/i) ?? tributosZerados(),
    exigivel: extrairTributosUltimaOcorrencia(texto, /Total do D[ée]bito Exig[íi]vel/i) ?? tributosZerados(),
  }
}
