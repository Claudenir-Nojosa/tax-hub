// Consulta Simples Nacional (Automações): recebe uma lista de CNPJs (Excel ou colados) e
// verifica pra cada um se a empresa é optante do Simples Nacional, via BrasilAPI (dados
// públicos da Receita Federal) com fallback ReceitaWS — mesmas fontes já usadas na consulta
// unitária de src/app/api/reforma-tributaria/cnpj/[cnpj]/route.ts, mas aqui em lote.

export interface ResultadoConsultaCnpj {
  cnpj: string // 14 dígitos
  cnpjFormatado: string // XX.XXX.XXX/XXXX-XX
  razaoSocial: string | null
  nomeFantasia: string | null
  // true = optante hoje; false = não optante (nunca foi ou já foi excluída); null = não deu
  // pra consultar (ver `erro`) — a BrasilAPI já manda `false`-equivalente como `null` pra quem
  // nunca optou, então isso é normalizado pra `false` na rota antes de chegar aqui
  simplesNacional: boolean | null
  dataOpcaoSimples: string | null
  dataExclusaoSimples: string | null
  mei: boolean | null
  situacaoCadastral: string | null
  uf: string | null
  municipio: string | null
  porte: string | null
  erro: string | null
}

export function formatarCnpj(cnpjLimpo: string): string {
  if (cnpjLimpo.length !== 14) return cnpjLimpo
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "")
}

// Colar lista: aceita CNPJs separados por linha, vírgula, ponto-e-vírgula, tab ou espaço —
// formatados (com pontuação) ou só dígitos. Mesmo espírito do processPastedText do De-Para
// (src/app/dashboard/de-para/page.tsx), adaptado pra extrair só sequências de 14 dígitos.
export function extrairCnpjsDoTexto(texto: string): string[] {
  const tokens = texto
    .split(/[\n,;\t ]+/)
    .map((t) => somenteDigitos(t.trim()))
    .filter((t) => t.length === 14)
  return Array.from(new Set(tokens))
}

// Lê a primeira aba de um .xlsx/.xls/.csv e extrai a coluna de CNPJ: se houver cabeçalho,
// procura a coluna cujo título contém "cnpj" (senão usa a coluna A); linhas sem 14 dígitos são
// ignoradas silenciosamente (célula vazia, texto solto etc.) — mesmo padrão tolerante do De-Para.
export async function extrairCnpjsDoExcel(file: File): Promise<string[]> {
  const XLSX = await import("xlsx")
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][]
  if (linhas.length === 0) return []

  const primeiraLinha = linhas[0] ?? []
  let colunaCnpj = 0
  let temCabecalho = false
  for (let i = 0; i < primeiraLinha.length; i++) {
    const celula = String(primeiraLinha[i] ?? "").toLowerCase()
    if (celula.includes("cnpj")) {
      colunaCnpj = i
      temCabecalho = true
      break
    }
  }
  // sem coluna "cnpj" nominal: se a 1ª linha não parece dado (nenhuma célula com 14 dígitos),
  // trata como cabeçalho genérico e pula; senão começa do zero
  if (!temCabecalho) {
    const pareceDado = primeiraLinha.some((c) => somenteDigitos(String(c ?? "")).length === 14)
    temCabecalho = !pareceDado
  }

  const linhasDados = temCabecalho ? linhas.slice(1) : linhas
  const cnpjs = linhasDados
    .map((row) => somenteDigitos(String(row[colunaCnpj] ?? "")))
    .filter((v) => v.length === 14)
  return Array.from(new Set(cnpjs))
}

// ─── Consulta em lote (client → API interna) ─────────────────────────────────

// Requisições menores e sequenciais: BrasilAPI é gratuita/pública, listas grandes (centenas de
// CNPJs) não devem virar uma rajada de requisições simultâneas — cada request já processa seu
// lote com concorrência controlada no servidor (ver a rota).
const TAMANHO_LOTE = 20

async function consultarLote(cnpjs: string[]): Promise<ResultadoConsultaCnpj[]> {
  try {
    const res = await fetch("/api/automacoes/consulta-simples-nacional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpjs }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erro ao consultar lote")
    return data.resultados as ResultadoConsultaCnpj[]
  } catch (e) {
    // Falha do lote inteiro (rede caiu etc.) — marca cada CNPJ com erro em vez de derrubar a
    // consulta inteira; o usuário pode tentar de novo depois.
    const mensagem = e instanceof Error ? e.message : "Erro de rede"
    return cnpjs.map((cnpj) => ({
      cnpj,
      cnpjFormatado: formatarCnpj(cnpj),
      razaoSocial: null,
      nomeFantasia: null,
      simplesNacional: null,
      dataOpcaoSimples: null,
      dataExclusaoSimples: null,
      mei: null,
      situacaoCadastral: null,
      uf: null,
      municipio: null,
      porte: null,
      erro: mensagem,
    }))
  }
}

export async function consultarCnpjsEmLote(
  cnpjsUnicos: string[],
  onProgress?: (atual: number, total: number) => void
): Promise<ResultadoConsultaCnpj[]> {
  const resultados: ResultadoConsultaCnpj[] = []
  let concluidos = 0
  for (let inicio = 0; inicio < cnpjsUnicos.length; inicio += TAMANHO_LOTE) {
    const lote = cnpjsUnicos.slice(inicio, inicio + TAMANHO_LOTE)
    const resultadoLote = await consultarLote(lote)
    resultados.push(...resultadoLote)
    concluidos += lote.length
    onProgress?.(Math.min(concluidos, cnpjsUnicos.length), cnpjsUnicos.length)
  }
  return resultados
}
