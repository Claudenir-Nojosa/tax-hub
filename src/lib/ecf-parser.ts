// Parser de ECF (Escrituração Contábil Fiscal) — IRPJ/CSLL de Lucro Presumido, formato texto
// pipe-delimited (SPED), determinístico como os demais parsers do módulo. Um arquivo = um
// ano-calendário inteiro; os períodos de apuração (trimestres T01..T04 no regime trimestral)
// vêm do registro P030, e cada bloco de apuração (P200/P300 para IRPJ, P400/P500 para CSLL)
// pertence ao período P030 imediatamente anterior no arquivo.
//
// Os registros P2xx-P5xx são "tabelas dinâmicas" do layout: cada linha é |REG|CODIGO|DESCRICAO|
// VALOR|. Os códigos das linhas principais (ex.: P300 código 15 = "IMPOSTO DE RENDA A PAGAR")
// foram validados como estáveis entre as versões de layout 0008 (2021) a 0011 (2024) contra 4
// arquivos reais do mesmo cliente — versões novas só ADICIONAM sub-códigos (ex.: 11.20/Perse).
// O parser guarda todas as linhas por período; quem escolhe o que mostrar é o exportador.
//
// ESCOPO ATUAL: só Lucro Presumido (bloco P). ECF de Lucro Real apura IRPJ/CSLL pelo bloco N
// (N500/N600 etc.) — ainda não implementado; arquivos sem bloco P preenchido são rejeitados no
// upload com mensagem explicando isso (ver GAP em docs/recuperacao-credito.md).

export interface LinhaEcf {
  codigo: string
  descricao: string
  valor: number | null // null = campo em branco no arquivo (linha de cabeçalho de seção)
}

export interface PeriodoEcf {
  periodo: string // "T01".."T04" (trimestral) | "A00" (anual)
  dataInicio: string // "DDMMAAAA"
  dataFim: string
  p200: LinhaEcf[] // apuração da base de cálculo do IRPJ — Lucro Presumido
  p300: LinhaEcf[] // cálculo do IRPJ
  p400: LinhaEcf[] // apuração da base de cálculo da CSLL
  p500: LinhaEcf[] // cálculo da CSLL
}

export interface DadosEcf {
  anoCalendario: string // "YYYY"
  cnpj: string
  razaoSocial: string
  formaTributacao: string // código do campo FORMA_TRIB do 0010 (5 = Lucro Presumido)
  formaApuracao: string // "T" trimestral | "A" anual
  arquivoNome: string
  periodos: PeriodoEcf[]
}

function parseNumeroEcf(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null
  const v = parseFloat(raw.trim().replace(/\./g, "").replace(",", "."))
  return Number.isFinite(v) ? v : null
}

// Rótulo do período pra coluna do Excel: "T01" + ano -> "1T/2021"; "A00" -> "2021".
export function labelPeriodoEcf(periodo: string, ano: string): string {
  const m = periodo.match(/^T0?(\d)$/)
  if (m) return `${m[1]}T/${ano}`
  return ano
}

export function detectarEcf(conteudo: string): boolean {
  return conteudo.startsWith("|0000|LECF|")
}

function parseUmEcf(conteudo: string, arquivoNome: string): DadosEcf | null {
  const linhas = conteudo.split(/\r?\n/)

  let cnpj = ""
  let razaoSocial = ""
  let anoCalendario = ""
  let formaTributacao = ""
  let formaApuracao = ""

  const periodos: PeriodoEcf[] = []
  let periodoAtual: PeriodoEcf | null = null

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const campos = linha.split("|")
    const registro = campos[1]

    if (registro === "0000") {
      // |0000|LECF|COD_VER|CNPJ|NOME|IND_SIT_INI_PER|SIT_ESPECIAL|PAT_REMAN_CIS|NUM_REC|DT_INI|DT_FIN|...
      // (índices validados contra arquivos reais: campos[4]=CNPJ, campos[5]=NOME, campos[10]=DT_INI)
      cnpj = (campos[4] ?? "").trim()
      razaoSocial = (campos[5] ?? "").trim()
      const dtIni = campos[10] ?? "" // DDMMAAAA
      if (dtIni.length === 8) anoCalendario = dtIni.slice(4, 8)
    } else if (registro === "0010") {
      // |0010|HASH_ECF_ANTERIOR|OPT_REFIS|FORMA_TRIB|FORMA_APUR|COD_QUALIF_PJ|FORMA_TRIB_PER|...
      // (índices validados contra arquivos reais das versões 0008 a 0011: campos[4]=FORMA_TRIB
      // "5"=Presumido, campos[5]=FORMA_APUR "T"=trimestral)
      formaTributacao = (campos[4] ?? "").trim()
      formaApuracao = (campos[5] ?? "").trim()
    } else if (registro === "P030") {
      // |P030|DT_INI|DT_FIN|PER_APUR| — abre um período de apuração do bloco P
      periodoAtual = {
        periodo: (campos[4] ?? "").trim(),
        dataInicio: (campos[2] ?? "").trim(),
        dataFim: (campos[3] ?? "").trim(),
        p200: [],
        p300: [],
        p400: [],
        p500: [],
      }
      periodos.push(periodoAtual)
    } else if (registro === "P200" || registro === "P300" || registro === "P400" || registro === "P500") {
      if (!periodoAtual) continue
      const linhaEcf: LinhaEcf = {
        codigo: (campos[2] ?? "").trim(),
        descricao: (campos[3] ?? "").trim(),
        valor: parseNumeroEcf(campos[4]),
      }
      if (registro === "P200") periodoAtual.p200.push(linhaEcf)
      else if (registro === "P300") periodoAtual.p300.push(linhaEcf)
      else if (registro === "P400") periodoAtual.p400.push(linhaEcf)
      else periodoAtual.p500.push(linhaEcf)
    }
  }

  if (!anoCalendario || !cnpj) return null

  return { anoCalendario, cnpj, razaoSocial, formaTributacao, formaApuracao, arquivoNome, periodos }
}

// true quando o ECF tem apuração de Lucro Presumido de verdade (algum período do bloco P com
// linhas) — usado pra rejeitar ECFs de Lucro Real (bloco N) com mensagem clara em vez de gravar
// um registro vazio.
export function temBlocoPresumido(dados: DadosEcf): boolean {
  return dados.periodos.some((p) => p.p300.length > 0 || p.p500.length > 0)
}

// Busca o valor de uma linha por código ("15", "11.20"...) — usado pelo exportador.
export function valorLinhaEcf(linhas: LinhaEcf[], codigo: string): number {
  return linhas.find((l) => l.codigo === codigo)?.valor ?? 0
}

// SPED é oficialmente latin1 — decodificar como UTF-8 corromperia os acentos das descrições
// (que aparecem no Excel, nas linhas de dedução).
export async function processarArquivosEcf(files: File[]): Promise<DadosEcf[]> {
  const resultados: DadosEcf[] = []
  for (const file of files) {
    const buffer = await file.arrayBuffer()
    const conteudo = new TextDecoder("latin1").decode(buffer)
    const dados = parseUmEcf(conteudo, file.name)
    if (dados) resultados.push(dados)
  }
  return resultados
}
