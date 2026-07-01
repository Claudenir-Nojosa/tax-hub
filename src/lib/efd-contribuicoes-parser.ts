// Parser de EFD Contribuições (PIS/COFINS), formato texto pipe-delimited — roda no servidor,
// mesmo padrão do parser de EFD ICMS/IPI (src/lib/efd-icms-parser.ts). Cada arquivo = 1
// competência. Extrai o cabeçalho (0000), os documentos C100/C175 (receita com incidência,
// agregada por CFOP+CST+alíquota, separadamente para PIS e para COFINS) e a apuração de cada
// contribuição (M200/M210 para PIS, M600/M610 para COFINS).
//
// GAP CONHECIDO: os créditos (registros M100/M105 para PIS, M500/M505 para COFINS, com os ~18
// códigos de natureza de crédito) NÃO estão implementados nesta versão — o arquivo de amostra
// disponível não tinha nenhum crédito no período (registros ausentes), então não foi possível
// validar o layout de campos com dados reais. Ver docs/recuperacao-credito.md.

export interface TotaisOperacaoPisCofins {
  valorOperacional: number
  baseCalculo: number
  valor: number // valor do PIS ou da COFINS, conforme o campo
}

export interface RegistroAgregadoPisCofins extends TotaisOperacaoPisCofins {
  cfop: string
  cst: string
  aliquota: number
}

export interface ApuracaoContribuicao {
  receitaBruta: number
  baseCalculoApurada: number
  valorContribuicaoApurada: number // débito, antes de deduzir créditos
  valorARecolher: number
}

export interface DadosEfdContribuicoes {
  competencia: string // "YYYY-MM"
  cnpj: string
  razaoSocial: string
  uf: string
  arquivoNome: string
  registrosPis: RegistroAgregadoPisCofins[]
  registrosCofins: RegistroAgregadoPisCofins[]
  apuracaoPis: ApuracaoContribuicao
  apuracaoCofins: ApuracaoContribuicao
}

function parseNumeroEfd(raw: string | undefined): number {
  if (!raw) return 0
  const v = parseFloat(raw.trim().replace(",", "."))
  return Number.isFinite(v) ? v : 0
}

// CST do PIS/COFINS — tabela oficial (mesma tabela de códigos serve pra ambas as contribuições).
const CST_PIS_COFINS_LABELS: Record<string, string> = {
  "01": "Operação Tributável com Alíquota Básica",
  "02": "Operação Tributável com Alíquota Diferenciada",
  "03": "Operação Tributável com Alíquota por Unidade de Medida de Produto",
  "04": "Operação Tributável Monofásica - Revenda a Alíquota Zero",
  "05": "Operação Tributável por Substituição Tributária",
  "06": "Operação Tributável a Alíquota Zero",
  "07": "Operação Isenta da Contribuição",
  "08": "Operação sem Incidência da Contribuição",
  "09": "Operação com Suspensão da Contribuição",
  "49": "Outras Operações de Saída",
  "50": "Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno",
  "51": "Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno",
  "52": "Operação com Direito a Crédito - Vinculada Exclusivamente a Receita de Exportação",
  "53": "Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno",
  "54": "Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação",
  "55": "Operação com Direito a Crédito - Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação",
  "56": "Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação",
  "60": "Crédito Presumido - Vinculado Exclusivamente a Receita Tributada no Mercado Interno",
  "61": "Crédito Presumido - Vinculado Exclusivamente a Receita Não-Tributada no Mercado Interno",
  "62": "Crédito Presumido - Vinculado Exclusivamente a Receita de Exportação",
  "63": "Crédito Presumido - Vinculado a Receitas Tributadas e Não-Tributadas no Mercado Interno",
  "64": "Crédito Presumido - Vinculado a Receitas Tributadas no Mercado Interno e de Exportação",
  "65": "Crédito Presumido - Vinculado a Receitas Não-Tributadas no Mercado Interno e de Exportação",
  "66": "Crédito Presumido - Vinculado a Receitas Tributadas e Não-Tributadas no Mercado Interno, e de Exportação",
  "67": "Crédito Presumido - Outras Operações",
  "70": "Operação de Aquisição sem Direito a Crédito",
  "71": "Operação de Aquisição com Isenção",
  "72": "Operação de Aquisição com Suspensão",
  "73": "Operação de Aquisição a Alíquota Zero",
  "74": "Operação de Aquisição sem Incidência da Contribuição",
  "75": "Operação de Aquisição por Substituição Tributária",
  "98": "Outras Operações de Entrada",
  "99": "Outras Operações",
}

export function labelCstPisCofins(cst: string): string {
  return CST_PIS_COFINS_LABELS[cst] ? `${cst} - ${CST_PIS_COFINS_LABELS[cst]}` : cst
}

function novoRegistro(cfop: string, cst: string, aliquota: number): RegistroAgregadoPisCofins {
  return { cfop, cst, aliquota, valorOperacional: 0, baseCalculo: 0, valor: 0 }
}

function parseUmaEfd(conteudo: string, arquivoNome: string): DadosEfdContribuicoes | null {
  const linhas = conteudo.split(/\r?\n/)

  let cnpj = ""
  let razaoSocial = ""
  let uf = ""
  let competencia = ""

  const pisMap = new Map<string, RegistroAgregadoPisCofins>()
  const cofinsMap = new Map<string, RegistroAgregadoPisCofins>()

  let apuracaoPis: ApuracaoContribuicao = { receitaBruta: 0, baseCalculoApurada: 0, valorContribuicaoApurada: 0, valorARecolher: 0 }
  let apuracaoCofins: ApuracaoContribuicao = { receitaBruta: 0, baseCalculoApurada: 0, valorContribuicaoApurada: 0, valorARecolher: 0 }

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const campos = linha.split("|")
    const registro = campos[1]

    if (registro === "0000") {
      // |0000|COD_VER|TIPO_ESCRIT|IND_SIT_ESP|NUM_REC_ANTERIOR|DT_INI|DT_FIN|NOME|CNPJ|UF|COD_MUN|SUFRAMA|IND_NAT_PJ|IND_ATIV|
      const dtIni = campos[6] ?? "" // DDMMAAAA
      razaoSocial = (campos[8] ?? "").trim()
      cnpj = (campos[9] ?? "").trim()
      uf = (campos[10] ?? "").trim()
      if (dtIni.length === 8) competencia = `${dtIni.slice(4, 8)}-${dtIni.slice(2, 4)}`
    } else if (registro === "C175") {
      // |C175|CFOP|VL_ITEM|VL_DESC|CST_PIS|VL_BC_PIS|ALIQ_PIS|QUANT_BC_PIS|ALIQ_PIS_QUANT|VL_PIS|
      //  CST_COFINS|VL_BC_COFINS|ALIQ_COFINS|QUANT_BC_COFINS|ALIQ_COFINS_QUANT|VL_COFINS|COD_CTA|COD_CCUS|
      const cfop = (campos[2] ?? "").trim()

      const cstPis = (campos[5] ?? "").trim()
      const aliqPis = parseNumeroEfd(campos[7])
      const chavePis = `${cfop}|${cstPis}|${aliqPis}`
      const regPis = pisMap.get(chavePis) ?? novoRegistro(cfop, cstPis, aliqPis)
      regPis.valorOperacional += parseNumeroEfd(campos[3])
      regPis.baseCalculo += parseNumeroEfd(campos[6])
      regPis.valor += parseNumeroEfd(campos[10])
      pisMap.set(chavePis, regPis)

      const cstCofins = (campos[11] ?? "").trim()
      const aliqCofins = parseNumeroEfd(campos[13])
      const chaveCofins = `${cfop}|${cstCofins}|${aliqCofins}`
      const regCofins = cofinsMap.get(chaveCofins) ?? novoRegistro(cfop, cstCofins, aliqCofins)
      regCofins.valorOperacional += parseNumeroEfd(campos[3])
      regCofins.baseCalculo += parseNumeroEfd(campos[12])
      regCofins.valor += parseNumeroEfd(campos[16])
      cofinsMap.set(chaveCofins, regCofins)
    } else if (registro === "M210") {
      // |M210|COD_CONT|VL_REC_BRT|VL_BC_CONT|VL_AJUS_ACRES_BC|VL_AJUS_REDUC_BC|VL_BC_CONT_AJUS|
      //  ALIQ_PIS|QUANT_BC_PIS|ALIQ_PIS_QUANT|VL_CONT_APUR|...
      apuracaoPis.receitaBruta += parseNumeroEfd(campos[3])
      apuracaoPis.baseCalculoApurada += parseNumeroEfd(campos[7])
    } else if (registro === "M200") {
      // |M200|VL_TOT_CONT_NC_PER|VL_TOT_CRED_DESC|VL_TOT_CRED_DESC_ANT|VL_TOT_CONT_NC_DEV|VL_RET_NC|
      //  VL_OUT_DED_NC|VL_CONT_NC_REC|VL_TOT_CONT_CUM_PER|VL_RET_CUM|VL_OUT_DED_CUM|VL_CONT_CUM_REC|VL_TOT_CONT_REC|
      apuracaoPis.valorContribuicaoApurada = parseNumeroEfd(campos[2])
      apuracaoPis.valorARecolher = parseNumeroEfd(campos[13])
    } else if (registro === "M610") {
      apuracaoCofins.receitaBruta += parseNumeroEfd(campos[3])
      apuracaoCofins.baseCalculoApurada += parseNumeroEfd(campos[7])
    } else if (registro === "M600") {
      apuracaoCofins.valorContribuicaoApurada = parseNumeroEfd(campos[2])
      apuracaoCofins.valorARecolher = parseNumeroEfd(campos[13])
    }
  }

  if (!competencia || !cnpj) return null

  return {
    competencia,
    cnpj,
    razaoSocial,
    uf,
    arquivoNome,
    registrosPis: Array.from(pisMap.values()),
    registrosCofins: Array.from(cofinsMap.values()),
    apuracaoPis,
    apuracaoCofins,
  }
}

export async function processarArquivosEfdContribuicoes(
  files: File[],
  onProgress?: (atual: number, total: number) => void
): Promise<DadosEfdContribuicoes[]> {
  const resultados: DadosEfdContribuicoes[] = []
  let processados = 0
  for (const file of files) {
    const conteudo = await file.text()
    const dados = parseUmaEfd(conteudo, file.name)
    if (dados) resultados.push(dados)
    processados++
    onProgress?.(processados, files.length)
  }
  return resultados
}

// Distingue um EFD ICMS/IPI de um EFD Contribuições — ambos são texto pipe-delimited começando
// com "|0000|", então a detecção usa registros exclusivos de cada leiaute: EFD Contribuições
// sempre tem blocos M (apuração de PIS/COFINS); EFD ICMS/IPI sempre tem bloco E (apuração de
// ICMS/IPI).
export type TipoEfd = "ICMS_IPI" | "CONTRIBUICOES" | null

export function detectarTipoEfd(conteudo: string): TipoEfd {
  if (/\|M200\|/.test(conteudo) || /\|M600\|/.test(conteudo)) return "CONTRIBUICOES"
  if (/\|E100\|/.test(conteudo) || /\|E110\|/.test(conteudo)) return "ICMS_IPI"
  return null
}
