// Regex de valor monetário no formato BR: milhar opcional com ponto, decimal com vírgula.
const NUMERO_BR_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}/

// Converte "81.006,22" -> 81006.22. Retorna 0 se não conseguir parsear.
export function parseNumeroBR(raw: string | null | undefined): number {
  if (!raw) return 0
  const limpo = raw.trim().replace(/\./g, "").replace(",", ".")
  const valor = parseFloat(limpo)
  return Number.isFinite(valor) ? valor : 0
}

// Retorna o primeiro grupo capturado por um regex no texto, ou null se não achar.
export function matchGroup(texto: string, regex: RegExp): string | null {
  const m = texto.match(regex)
  return m ? m[1] ?? null : null
}

// Extrai os N primeiros valores monetários BR encontrados a partir de um offset no texto.
export function proximosValoresBR(texto: string, offset: number, quantidade: number): number[] {
  const janela = texto.slice(offset)
  const regexGlobal = new RegExp(NUMERO_BR_RE.source, "g")
  const valores: number[] = []
  let m: RegExpExecArray | null
  while (valores.length < quantidade && (m = regexGlobal.exec(janela))) {
    valores.push(parseNumeroBR(m[0]))
  }
  return valores
}

// Roda um regex global com 1 grupo de captura monetário sobre o texto e devolve todos os valores.
export function matchAllValores(texto: string, regexGlobal: RegExp): number[] {
  const re = new RegExp(regexGlobal.source, regexGlobal.flags.includes("g") ? regexGlobal.flags : regexGlobal.flags + "g")
  const valores: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    valores.push(parseNumeroBR(m[1]))
  }
  return valores
}

// Índice logo após a ÚLTIMA ocorrência de um regex no texto (usado para pegar a tabela de
// "Total Geral da Empresa", que repete o mesmo rótulo da tabela "por Estabelecimento" antes dela).
export function ultimoIndiceFimMatch(texto: string, regex: RegExp): number | null {
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g")
  let ultimo: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) ultimo = m
  return ultimo ? ultimo.index + ultimo[0].length : null
}

// unpdf com mergePages:true costuma devolver uma única linha, mas por segurança
// colapsamos quaisquer sequências de espaço/quebra de linha em um único espaço.
export function normalizarTexto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim()
}

// "01/01/2026 a 31/01/2026" -> "2026-01" (usa o mês final do intervalo)
// "01/2026" -> "2026-01"
export function extrairCompetencia(texto: string): string | null {
  const range = texto.match(
    /Per[íi]odo de Apura[çc][ãa]o:\s*\d{2}\/\d{2}\/\d{4}\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/
  )
  if (range) return `${range[3]}-${range[2]}`

  const direto = texto.match(/Per[íi]odo de Apura[çc][ãa]o\s*\(PA\):\s*(\d{2})\/(\d{4})/)
  if (direto) return `${direto[2]}-${direto[1]}`

  return null
}
