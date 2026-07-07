// Parser da ECD (Escrituração Contábil Digital, SPED Contábil) — texto pipe-delimited (latin1),
// determinístico. 1 arquivo = 1 ano-calendário. Extrai o plano de contas (I050) e monta os saldos
// MENSAIS das contas do Balanço Patrimonial, agregando as sintéticas pela árvore de contas.
//
// Método dos saldos (o trimestral foi validado contra a planilha de referência do usuário,
// 2021-2024; o mensal usa exatamente a mesma regra com limite no fim de cada mês):
//   - Saldo do mês M = saldo final acumulado (I155 VL_SLD_FIN) do período que termina no último
//     dia do mês (últ. I155 com data <= fim do mês M).
//   - Dez do ano PÓS-encerramento NÃO vem deste arquivo (o I155 de dez é pré-encerramento) — vem
//     da ABERTURA (VL_SLD_INI do 1º período) do arquivo do ano seguinte. Por isso guardamos
//     `abertura` (= Dez do ano anterior) em cada arquivo, e o Excel liga Dez/Y = abertura do
//     arquivo Y+1. O `saldosMensais["12"]` existe mas é o valor PRÉ-encerramento.
//   - Saldo de conta sintética = soma dos saldos (assinados: devedor +, credor -) das analíticas
//     descendentes. Exibição no Excel = módulo (valor positivo), como na referência.

function num(s: string | undefined): number {
  const v = parseFloat((s || "0").replace(/\./g, "").replace(",", "."))
  return Number.isFinite(v) ? v : 0
}

// COD_NAT do I050 -> rótulo de natureza (mesmos grupos do filtro da ECD)
const NATUREZA: Record<string, string> = {
  "01": "Ativo",
  "02": "Passivo",
  "03": "Patrimônio Líquido",
  "04": "Resultado",
  "05": "Compensação",
  "09": "Outras",
}
export function labelNaturezaEcd(codNat: string): string {
  return NATUREZA[codNat] ?? codNat
}

export interface ContaEcd {
  codCta: string // "1010101010001"
  codFormatado: string // "1.01.01.01.01.0001"
  nome: string
  tipo: "Sintética" | "Analítica"
  natureza: string // rótulo (Ativo/Passivo/PL/Resultado/Outras)
  codNat: string // "01".."09"
  nivel: number
  // saldos assinados (devedor +, credor -) já agregados para este ano-calendário:
  abertura: number // = saldo em 31/12 do ano anterior (VL_SLD_INI do 1º período)
  saldosMensais?: Record<string, number> // "01".."12" (12 = PRÉ-encerramento; ver cabeçalho)
  // legado: registros gravados antes da mudança pra mensal só têm os fechamentos de trimestre —
  // o Excel usa como fallback (Mar/Jun/Set) até o arquivo ser reimportado
  saldoMar?: number
  saldoJun?: number
  saldoSet?: number
}

export interface DadosEcd {
  anoCalendario: string // "YYYY"
  cnpj: string
  razaoSocial: string
  arquivoNome: string
  contas: ContaEcd[]
}

export function detectarEcd(conteudo: string): boolean {
  return conteudo.startsWith("|0000|LECD|")
}

// "101010101" -> "1.01.01.01.01" (cada nível acrescenta o incremento sobre o pai)
function formatarCodigo(codCta: string, codSup: Map<string, string>): string {
  const partes: string[] = []
  let atual: string | undefined = codCta
  while (atual) {
    const pai: string = codSup.get(atual) ?? ""
    partes.push(pai ? atual.slice(pai.length) : atual)
    atual = pai || undefined
  }
  return partes.reverse().join(".")
}

function parseUmEcd(conteudo: string, arquivoNome: string): DadosEcd | null {
  const linhas = conteudo.split(/\r?\n/)

  let cnpj = ""
  let razaoSocial = ""
  let anoCalendario = ""

  // I050 — plano de contas
  interface I050 {
    codNat: string
    indCta: string // S | A
    nivel: number
    codSup: string
    nome: string
  }
  const plano = new Map<string, I050>()
  const filhos = new Map<string, string[]>()

  // I150/I155 — saldos por período. Guardamos, por conta analítica, o histórico de saldos finais
  // (data-fim ISO -> saldo assinado) e a abertura (VL_SLD_INI do 1º período).
  const periodosFim: string[] = [] // AAAAMMDD por período
  let perAtual = -1
  const histFim = new Map<string, { iso: string; s: number }[]>()
  const abertura = new Map<string, number>()

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const c = linha.split("|")
    const reg = c[1]

    if (reg === "0000") {
      // |0000|LECD|DT_INI|DT_FIN|NOME|CNPJ|UF|...
      const dtIni = c[3] ?? ""
      if (dtIni.length === 8) anoCalendario = dtIni.slice(4, 8)
      razaoSocial = (c[5] ?? "").trim()
      cnpj = (c[6] ?? "").trim()
    } else if (reg === "I050") {
      // |I050|DT_ALT|COD_NAT|IND_CTA|NIVEL|COD_CTA|COD_CTA_SUP|CTA| (c[2]=DT_ALT, c[3]=COD_NAT)
      const codCta = c[6]
      const codSup = c[7] ?? ""
      plano.set(codCta, { codNat: c[3], indCta: c[4], nivel: Number(c[5]), codSup, nome: (c[8] ?? "").trim() })
      if (codSup) {
        if (!filhos.has(codSup)) filhos.set(codSup, [])
        filhos.get(codSup)!.push(codCta)
      }
    } else if (reg === "I150") {
      // |I150|DT_INI|DT_FIN|
      const fim = c[3] ?? "" // DDMMAAAA
      periodosFim.push(fim)
      perAtual = periodosFim.length - 1
    } else if (reg === "I155") {
      // |I155|COD_CTA|COD_CCUS|VL_SLD_INI|IND_DC_INI|VL_DEB|VL_CRED|VL_SLD_FIN|IND_DC_FIN|
      const codCta = c[2]
      const fim = periodosFim[perAtual] ?? ""
      const iso = fim.length === 8 ? fim.slice(4, 8) + fim.slice(2, 4) + fim.slice(0, 2) : ""
      const sFim = c[9] === "D" ? num(c[8]) : -num(c[8])
      if (!histFim.has(codCta)) histFim.set(codCta, [])
      histFim.get(codCta)!.push({ iso, s: sFim })
      if (perAtual === 0 && !abertura.has(codCta)) {
        abertura.set(codCta, c[5] === "D" ? num(c[4]) : -num(c[4]))
      }
    }
  }

  if (!anoCalendario || !cnpj || plano.size === 0) return null

  const codSupMap = new Map<string, string>()
  for (const [cod, info] of plano) if (info.codSup) codSupMap.set(cod, info.codSup)

  // saldo final acumulado de uma analítica até uma data-limite (últ. I155 com iso <= limite)
  const saldoAnaliticoFim = (cod: string, limiteIso: string): number => {
    const h = histFim.get(cod)
    if (!h) return 0
    let melhor: { iso: string; s: number } | null = null
    for (const r of h) if (r.iso && r.iso <= limiteIso && (!melhor || r.iso > melhor.iso)) melhor = r
    return melhor ? melhor.s : 0
  }
  const saldoContaFim = (cod: string, limiteIso: string): number => {
    const info = plano.get(cod)
    if (!info) return 0
    if (info.indCta === "A") return saldoAnaliticoFim(cod, limiteIso)
    let soma = 0
    for (const f of filhos.get(cod) ?? []) soma += saldoContaFim(f, limiteIso)
    return soma
  }
  const saldoAberturaConta = (cod: string): number => {
    const info = plano.get(cod)
    if (!info) return 0
    if (info.indCta === "A") return abertura.get(cod) ?? 0
    let soma = 0
    for (const f of filhos.get(cod) ?? []) soma += saldoAberturaConta(f)
    return soma
  }

  const contas: ContaEcd[] = []
  for (const [codCta, info] of plano) {
    // limite "AAAA MM 31": comparação lexicográfica de AAAAMMDD — dia 31 cobre o fim de
    // qualquer mês (30/28/29 <= 31)
    const saldosMensais: Record<string, number> = {}
    for (let mes = 1; mes <= 12; mes++) {
      const mm = String(mes).padStart(2, "0")
      saldosMensais[mm] = saldoContaFim(codCta, `${anoCalendario}${mm}31`)
    }
    contas.push({
      codCta,
      codFormatado: formatarCodigo(codCta, codSupMap),
      nome: info.nome,
      tipo: info.indCta === "A" ? "Analítica" : "Sintética",
      natureza: labelNaturezaEcd(info.codNat),
      codNat: info.codNat,
      nivel: info.nivel,
      abertura: saldoAberturaConta(codCta),
      saldosMensais,
    })
  }

  return { anoCalendario, cnpj, razaoSocial, arquivoNome, contas }
}

// SPED é latin1.
export async function processarArquivosEcd(files: File[]): Promise<DadosEcd[]> {
  const resultados: DadosEcd[] = []
  for (const file of files) {
    const conteudo = new TextDecoder("latin1").decode(await file.arrayBuffer())
    const dados = parseUmEcd(conteudo, file.name)
    if (dados) resultados.push(dados)
  }
  return resultados
}
