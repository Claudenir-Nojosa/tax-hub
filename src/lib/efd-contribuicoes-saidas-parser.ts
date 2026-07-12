// Parser client-side do EFD Contribuições (PIS/COFINS), granular por ITEM/documento — cada linha
// de saída vira uma linha de dado no mesmo shape das colunas B-BH das abas de ano do Excel-modelo
// da Reforma Tributária (ver docs/reforma-tributaria-v2.md). A cadeia de fórmulas (BJ em diante)
// é responsabilidade do gerador de Excel, não deste parser.
//
// Fontes de linha (todas presentes no Excel-modelo "Reforma_Tributária - Art Farma vff.xlsx",
// validadas registro a registro contra os arquivos reais do grupo L Cardoso Melo/Pharmaplus):
//   C100/C170 — nota fiscal de mercadoria item a item (modelo 55)
//   C100/C175 — NFC-e (modelo 65) consolidada por CFOP/CST dentro do documento
//   A100/A170 — nota fiscal de serviço
//   F100      — demais documentos e operações (todas as linhas, sem filtro de IND_OPER — o
//               modelo incluiu as 685 linhas dos arquivos, incluindo IND_OPER=2)
//   F550      — consolidação das operações por regime de competência (escriturações consolidadas,
//               caso Pharmaplus: TODO o faturamento vem daqui; mod 98 = serviço, demais = DANFE)
//
// O CNPJ de cada linha é o do ESTABELECIMENTO corrente (registros C010/A010/F010) — não o CNPJ
// do arquivo (registro 0000, que é sempre a matriz). Um arquivo de empresa com filiais alterna
// blocos C010/A010/F010 e o Excel-modelo mostra cada linha com o CNPJ do estabelecimento certo.
//
// Alíquotas de PIS/COFINS ficam no formato do EFD e do Excel-modelo: NÚMERO PERCENTUAL
// (0,65 / 1,65 / 7,6) — as fórmulas das abas de ano usam "AY8%" (dividem por 100 no Excel).
// A alíquota de ICMS permanece decimal (0,225 = 22,5%), como no modelo.
//
// Layouts de campo confirmados contra arquivos reais (split por "|", f[1] = tipo do registro):
//   0000: f6=DT_INI f8=NOME f9=CNPJ f10=UF
//   0140: f3=NOME f4=CNPJ (estabelecimentos declarados)
//   0150: f2=COD_PART f3=NOME f5=CNPJ f6=CPF f8=COD_MUN
//   0200: f2=COD_ITEM f3=DESCR f7=TIPO_ITEM f8=NCM
//   C010/A010/F010: f2=CNPJ do estabelecimento
//   C100: f2=IND_OPER f4=COD_PART f5=COD_MOD f6=COD_SIT f7=SER f8=NUM_DOC f9=CHV f10=DT_DOC
//         f11=DT_E_S f12=VL_DOC f14=VL_DESC f16=VL_MERC f18=VL_FRT f19=VL_SEG f20=VL_OUT_DA
//         f21=VL_BC_ICMS f22=VL_ICMS
//   C170: f2=NUM_ITEM f3=COD_ITEM f4=DESCR_COMPL f5=QTD f6=UNID f7=VL_ITEM f8=VL_DESC f11=CFOP
//         f14=ALIQ_ICMS f15=VL_ICMS f25=CST_PIS f26=VL_BC_PIS f27=ALIQ_PIS f30=VL_PIS
//         f31=CST_COFINS f32=VL_BC_COFINS f33=ALIQ_COFINS f36=VL_COFINS f37=COD_CTA
//   C175: f2=CFOP f3=VL_OPR f4=VL_DESC f5=CST_PIS f6=VL_BC_PIS f7=ALIQ_PIS f10=VL_PIS
//         f11=CST_COFINS f12=VL_BC_COFINS f13=ALIQ_COFINS f16=VL_COFINS f17=COD_CTA
//   A100: f2=IND_OPER f4=COD_PART f5=COD_SIT f6=SER f8=NUM_DOC f9=CHV f10=DT_DOC f11=DT_EXE
//         f12=VL_DOC f14=VL_DESC
//   A170: f2=NUM_ITEM f3=COD_ITEM f5=VL_ITEM f6=VL_DESC f9=CST_PIS f10=VL_BC_PIS f11=ALIQ_PIS
//         f12=VL_PIS f13=CST_COFINS f14=VL_BC_COFINS f15=ALIQ_COFINS f16=VL_COFINS f17=COD_CTA
//   F100: f3=COD_PART f4=COD_ITEM f5=DT_OPER f6=VL_OPER f7=CST_PIS f8=VL_BC_PIS f9=ALIQ_PIS
//         f10=VL_PIS f11=CST_COFINS f12=VL_BC_COFINS f13=ALIQ_COFINS f14=VL_COFINS f17=COD_CTA
//   F550: f2=VL_REC_COMP f3=CST_PIS f5=VL_BC_PIS f6=ALIQ_PIS f7=VL_PIS f8=CST_COFINS
//         f10=VL_BC_COFINS f11=ALIQ_COFINS f12=VL_COFINS f13=COD_MOD f14=CFOP f15=COD_CTA

// 2 primeiros dígitos do código IBGE de município → UF (Registro 0150 só traz COD_MUN, não UF)
const IBGE_UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
}

function ufDoCodMun(codMun: string | undefined): string {
  if (!codMun || codMun.length < 2) return ""
  return IBGE_UF[codMun.slice(0, 2)] ?? ""
}

// Tabela oficial de TIPO_ITEM do registro 0200 (Guia Prático EFD-Contribuições) — o cadastro só
// traz o código; o Excel-modelo exibe "código descrição" (ex: "00 Mercadoria para Revenda").
const TIPO_ITEM_DESCRICAO: Record<string, string> = {
  "00": "Mercadoria para Revenda",
  "01": "Matéria-Prima",
  "02": "Embalagem",
  "03": "Produto em Processo",
  "04": "Produto Acabado",
  "05": "Subproduto",
  "06": "Produto Intermediário",
  "07": "Material de Uso e Consumo",
  "08": "Ativo Imobilizado",
  "09": "Serviços",
  "10": "Outros insumos",
  "99": "Outras",
}

function formatarTipoItem(codigo: string): string {
  const desc = TIPO_ITEM_DESCRICAO[codigo]
  return desc ? `${codigo} ${desc}` : codigo
}

function num(s: string | undefined): number {
  if (!s) return 0
  return parseFloat(s.replace(",", ".")) || 0
}

// Rótulos de "Registros" — idênticos aos do Excel-modelo, célula a célula
const REG_C170 = "C100/C170 - Documento - Nota Fiscal"
const REG_C175 = "C100/C175 - Documento - Nota Fiscal Eletrônicas"
const REG_A170 = "A100/A170 - Nota Fiscal de Serviço"
const REG_F100 = "F100 - Demais Documentos e Operações"
const REG_F550 = "F550 - Consolidação das Operações Regime de Competência"

const DOC_DANFE = "Nota Fiscal de Mercadoria (DANFE)"
const DOC_NFS = "Nota Fiscal de Serviço (NFS)"

export interface LinhaSaidaEfd {
  cnpj: string // CNPJ do ESTABELECIMENTO (C010/A010/F010), não o da matriz
  pa: string // "YYYY-MM"
  empresa: string
  registros: string
  modelo: string
  situacao: string
  codigoParticipante: string
  cnpjParticipante: string
  cpfParticipante: string
  nomeParticipante: string
  ufOrigemDestino: string
  numeroDocumento: string
  serie: string
  chaveNFe: string
  dataDocumento: string // DD/MM/YYYY
  dataEntradaSaida: string
  vlrDocumento: number
  vlrDescontoNF: number
  vlrMercadoriaOperacao: number | null // null = célula vazia no Excel (A170/F550, como no modelo)
  vlrFrete: number
  vlrSeguro: number
  vlrOutrasDA: number
  numeroItem: string
  codigoItem: string
  descricaoComplementar: string
  descricaoItem: string
  ncm: string
  codigoServico: string
  codigoBarra: string
  documento: typeof DOC_DANFE | typeof DOC_NFS
  tipoItem: string
  vlrItem: number
  qtde: number | null // null = célula vazia (só C170 tem quantidade, como no modelo)
  unidadeMedida: string
  vlrDescontoItem: number
  cfop: string
  faturamento: string // "Faturamento" ou "" (A170/F100 ficam vazios no modelo)
  natureza: string
  cstPis: string
  vlrBaseCalculoPis: number
  aliquotaPis: number // número percentual (1,65 = 1,65%) — formato do EFD e do Excel-modelo
  vlrPis: number
  cstCofins: string
  vlrBaseCalculoCofins: number
  aliquotaCofins: number // número percentual
  vlrCofins: number
  vlrIcms: number
  aliquotaIcms: number // decimal (0,225 = 22,5%) — formato do Excel-modelo
  contaContabil: string
}

export interface DadosSaidasEfdContribuicoes {
  periodos: string[]
  cnpj: string
  empresa: string
  linhas: LinhaSaidaEfd[]
  totalDocumentos: number
}

function ddmmaaaa(s: string | undefined): string {
  if (!s || s.length !== 8) return ""
  return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`
}

function yyyymm(s: string | undefined): string {
  if (!s || s.length !== 8) return ""
  return `${s.slice(4)}-${s.slice(2, 4)}`
}

interface Participante {
  nome: string
  cnpj: string
  cpf: string
  uf: string
}

interface ItemCadastro {
  descricao: string
  ncm: string
  tipoItem: string
}

// Parseia um único arquivo EFD Contribuições (texto bruto). O arquivo é da EMPRESA (matriz) e
// pode conter blocos de vários estabelecimentos (C010/A010/F010) — cada linha sai com o CNPJ do
// estabelecimento certo. O wizard permite upload de vários arquivos e concatena os resultados.
export function parseSaidasEfdContribuicoes(texto: string): DadosSaidasEfdContribuicoes {
  const linhas = texto.split(/\r?\n/)

  let cnpjMatriz = ""
  let empresa = ""
  let ufPropria = ""
  let periodoArquivo = "" // "YYYY-MM" do 0000 — PA das linhas F550 (não têm data própria)
  const periodosSet = new Set<string>()
  const participantes = new Map<string, Participante>()
  const itens = new Map<string, ItemCadastro>()
  const resultado: LinhaSaidaEfd[] = []

  // primeira passada: cadastros (0150/0200) e cabeçalho (0000) — precisam existir antes dos itens
  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "0000") {
      empresa = f[8]?.trim() ?? ""
      cnpjMatriz = f[9]?.trim() ?? ""
      ufPropria = f[10]?.trim() ?? ""
      const dtIni = f[6]?.trim()
      if (dtIni) {
        periodoArquivo = yyyymm(dtIni)
        periodosSet.add(periodoArquivo)
      }
      continue
    }
    if (tipo === "0150") {
      participantes.set(f[2], {
        nome: f[3]?.trim() ?? "",
        cnpj: f[5]?.trim() ?? "",
        cpf: f[6]?.trim() ?? "",
        uf: ufDoCodMun(f[8]?.trim()),
      })
      continue
    }
    if (tipo === "0200") {
      itens.set(f[2], {
        descricao: f[3]?.trim() ?? "",
        ncm: f[8]?.trim() ?? "",
        tipoItem: f[7]?.trim() ?? "",
      })
      continue
    }
  }

  // segunda passada: documentos — mantém o "cabeçalho corrente" (C100/A100) e o ESTABELECIMENTO
  // corrente (C010/A010/F010) enquanto varre os registros-filho
  let estabelecimento = cnpjMatriz
  let c100Atual: string[] | null = null
  let a100Atual: string[] | null = null

  const base = (): Pick<LinhaSaidaEfd, "cnpj" | "empresa"> => ({ cnpj: estabelecimento, empresa })

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "C010" || tipo === "A010" || tipo === "F010") {
      estabelecimento = f[2]?.trim() || cnpjMatriz
      c100Atual = null
      a100Atual = null
      continue
    }

    if (tipo === "C100") {
      c100Atual = f[2] === "1" ? f : null // só saída (IND_OPER=1); compras (0) não interessam aqui
      a100Atual = null
      continue
    }
    if (tipo === "A100") {
      a100Atual = f[2] === "1" ? f : null
      c100Atual = null
      continue
    }

    if (tipo === "C170" && c100Atual) {
      const h = c100Atual
      const codPart = h[4]
      const part = participantes.get(codPart)
      const item = itens.get(f[3])
      const cfop = f[11]?.trim() ?? "" // f10=CST_ICMS, f11=CFOP (confirmado contra dado real)

      resultado.push({
        ...base(), pa: yyyymm(h[10]),
        registros: REG_C170,
        modelo: h[5]?.trim() ?? "", situacao: h[6]?.trim() ?? "",
        codigoParticipante: codPart ?? "",
        cnpjParticipante: part?.cnpj ?? "", cpfParticipante: part?.cpf ?? "", nomeParticipante: part?.nome ?? "",
        ufOrigemDestino: part?.uf ? `${ufPropria || part.uf}/${part.uf}` : "",
        numeroDocumento: h[8]?.trim() ?? "", serie: h[7]?.trim() ?? "",
        chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]), dataEntradaSaida: ddmmaaaa(h[11]),
        vlrDocumento: num(h[12]), vlrDescontoNF: num(h[14]),
        vlrMercadoriaOperacao: num(h[16]), vlrFrete: num(h[18]), vlrSeguro: num(h[19]), vlrOutrasDA: num(h[20]),
        numeroItem: f[2] ?? "", codigoItem: f[3] ?? "", descricaoComplementar: f[4]?.trim() ?? "",
        descricaoItem: item?.descricao ?? "", ncm: item?.ncm ?? "", codigoServico: "", codigoBarra: "SEM GTIN",
        documento: DOC_DANFE,
        tipoItem: formatarTipoItem(item?.tipoItem ?? ""), vlrItem: num(f[7]), qtde: num(f[5]), unidadeMedida: f[6]?.trim() ?? "",
        vlrDescontoItem: num(f[8]), cfop,
        faturamento: "Faturamento", natureza: "Venda",
        cstPis: f[25]?.trim() ?? "", vlrBaseCalculoPis: num(f[26]), aliquotaPis: num(f[27]), vlrPis: num(f[30]),
        cstCofins: f[31]?.trim() ?? "", vlrBaseCalculoCofins: num(f[32]), aliquotaCofins: num(f[33]), vlrCofins: num(f[36]),
        vlrIcms: num(f[15]), aliquotaIcms: num(f[14]) / 100,
        contaContabil: f[37]?.trim() ?? "",
      })
      continue
    }

    if (tipo === "C175" && c100Atual) {
      // NFC-e (modelo 65) consolidada por CFOP/CST dentro do documento — no Excel-modelo cada
      // C175 vira uma linha sem participante/quantidade, com Vlr ICMS = 0 (o C175 não traz ICMS)
      // e Alíquota ICMS derivada do cabeçalho C100 (VL_ICMS / VL_BC_ICMS).
      const h = c100Atual
      const cfop = f[2]?.trim() ?? ""
      const bcIcmsDoc = num(h[21])
      const aliquotaIcms = bcIcmsDoc > 0 ? num(h[22]) / bcIcmsDoc : 0

      resultado.push({
        ...base(), pa: yyyymm(h[10]),
        registros: REG_C175,
        modelo: h[5]?.trim() ?? "", situacao: h[6]?.trim() ?? "",
        codigoParticipante: "", cnpjParticipante: "", cpfParticipante: "", nomeParticipante: "",
        ufOrigemDestino: "",
        numeroDocumento: h[8]?.trim() ?? "", serie: h[7]?.trim() ?? "",
        chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]), dataEntradaSaida: ddmmaaaa(h[11]),
        vlrDocumento: num(h[12]), vlrDescontoNF: num(h[14]),
        vlrMercadoriaOperacao: num(h[16]), vlrFrete: num(h[18]), vlrSeguro: num(h[19]), vlrOutrasDA: num(h[20]),
        numeroItem: "", codigoItem: "", descricaoComplementar: "",
        descricaoItem: "", ncm: "", codigoServico: "", codigoBarra: "",
        documento: DOC_DANFE,
        tipoItem: formatarTipoItem("00"), vlrItem: num(f[3]), qtde: null, unidadeMedida: "",
        vlrDescontoItem: num(f[4]), cfop,
        faturamento: "Faturamento", natureza: "Venda",
        cstPis: f[5]?.trim() ?? "", vlrBaseCalculoPis: num(f[6]), aliquotaPis: num(f[7]), vlrPis: num(f[10]),
        cstCofins: f[11]?.trim() ?? "", vlrBaseCalculoCofins: num(f[12]), aliquotaCofins: num(f[13]), vlrCofins: num(f[16]),
        vlrIcms: 0, aliquotaIcms,
        contaContabil: f[17]?.trim() ?? "",
      })
      continue
    }

    if (tipo === "A170" && a100Atual) {
      const h = a100Atual
      const codPart = h[4]
      const part = participantes.get(codPart)
      const item = itens.get(f[3])

      resultado.push({
        ...base(), pa: yyyymm(h[10]),
        registros: REG_A170,
        modelo: "", situacao: h[5]?.trim() ?? "",
        codigoParticipante: codPart ?? "",
        cnpjParticipante: part?.cnpj ?? "", cpfParticipante: part?.cpf ?? "", nomeParticipante: part?.nome ?? "",
        ufOrigemDestino: part?.uf ? `${ufPropria || part.uf}/${part.uf}` : "",
        numeroDocumento: h[8]?.trim() ?? "", serie: h[6]?.trim() ?? "",
        chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]), dataEntradaSaida: ddmmaaaa(h[11]),
        vlrDocumento: num(h[12]), vlrDescontoNF: num(h[14]),
        vlrMercadoriaOperacao: null, vlrFrete: 0, vlrSeguro: 0, vlrOutrasDA: 0,
        numeroItem: f[2] ?? "", codigoItem: f[3] ?? "", descricaoComplementar: f[4]?.trim() ?? "",
        descricaoItem: item?.descricao ?? "", ncm: "", codigoServico: "", codigoBarra: "",
        documento: DOC_NFS,
        tipoItem: formatarTipoItem("09"), vlrItem: num(f[5]), qtde: null, unidadeMedida: "",
        vlrDescontoItem: num(f[6]),
        // CFOP 5933 (prestação de serviço tributado pelo ISS) — o EFD não traz CFOP em NFS-e,
        // mas o Excel-modelo preenche 5933 em todas as linhas A100/A170
        cfop: "5933",
        faturamento: "", natureza: "",
        cstPis: f[9]?.trim() ?? "", vlrBaseCalculoPis: num(f[10]), aliquotaPis: num(f[11]), vlrPis: num(f[12]),
        cstCofins: f[13]?.trim() ?? "", vlrBaseCalculoCofins: num(f[14]), aliquotaCofins: num(f[15]), vlrCofins: num(f[16]),
        vlrIcms: 0, aliquotaIcms: 0,
        contaContabil: f[17]?.trim() ?? "",
      })
      continue
    }

    if (tipo === "F100") {
      // Demais documentos e operações — no Excel-modelo entram TODAS as linhas F100 (685/685 nos
      // arquivos reais), sem participante/CFOP/faturamento, como DANFE mercadoria.
      resultado.push({
        ...base(), pa: yyyymm(f[5]),
        registros: REG_F100,
        modelo: "", situacao: "",
        codigoParticipante: "", cnpjParticipante: "", cpfParticipante: "", nomeParticipante: "",
        ufOrigemDestino: "",
        numeroDocumento: "", serie: "", chaveNFe: "",
        dataDocumento: ddmmaaaa(f[5]), dataEntradaSaida: "",
        vlrDocumento: num(f[6]), vlrDescontoNF: 0,
        vlrMercadoriaOperacao: num(f[6]), vlrFrete: 0, vlrSeguro: 0, vlrOutrasDA: 0,
        numeroItem: "", codigoItem: "", descricaoComplementar: "",
        descricaoItem: "", ncm: "", codigoServico: "", codigoBarra: "",
        documento: DOC_DANFE,
        tipoItem: formatarTipoItem("00"), vlrItem: num(f[6]), qtde: null, unidadeMedida: "",
        vlrDescontoItem: 0, cfop: "",
        faturamento: "", natureza: "",
        cstPis: f[7]?.trim() ?? "", vlrBaseCalculoPis: num(f[8]), aliquotaPis: num(f[9]), vlrPis: num(f[10]),
        cstCofins: f[11]?.trim() ?? "", vlrBaseCalculoCofins: num(f[12]), aliquotaCofins: num(f[13]), vlrCofins: num(f[14]),
        vlrIcms: 0, aliquotaIcms: 0,
        contaContabil: f[17]?.trim() ?? "",
      })
      continue
    }

    if (tipo === "F550") {
      // Consolidação por regime de competência — 1 linha por F550, PA = período do arquivo.
      // COD_MOD 98 = serviço (NFS, sem CFOP); 55/65 = mercadoria (DANFE).
      const codMod = f[13]?.trim() ?? ""
      const isServico = codMod === "98"
      resultado.push({
        ...base(), pa: periodoArquivo,
        registros: REG_F550,
        modelo: codMod, situacao: "",
        codigoParticipante: "", cnpjParticipante: "", cpfParticipante: "", nomeParticipante: "",
        ufOrigemDestino: ufPropria,
        numeroDocumento: "", serie: "", chaveNFe: "",
        dataDocumento: "", dataEntradaSaida: "",
        vlrDocumento: num(f[2]), vlrDescontoNF: 0,
        vlrMercadoriaOperacao: null, vlrFrete: 0, vlrSeguro: 0, vlrOutrasDA: 0,
        numeroItem: "", codigoItem: "", descricaoComplementar: "",
        descricaoItem: "", ncm: "", codigoServico: "", codigoBarra: "",
        documento: isServico ? DOC_NFS : DOC_DANFE,
        // Vlr Item = 0 nas linhas F550 do Excel-modelo (o valor da operação fica só em Vlr Documento)
        tipoItem: formatarTipoItem(isServico ? "09" : "00"), vlrItem: 0, qtde: null, unidadeMedida: "",
        vlrDescontoItem: 0, cfop: f[14]?.trim() ?? "",
        faturamento: "Faturamento", natureza: "Venda",
        cstPis: f[3]?.trim() ?? "", vlrBaseCalculoPis: num(f[5]), aliquotaPis: num(f[6]), vlrPis: num(f[7]),
        cstCofins: f[8]?.trim() ?? "", vlrBaseCalculoCofins: num(f[10]), aliquotaCofins: num(f[11]), vlrCofins: num(f[12]),
        vlrIcms: 0, aliquotaIcms: 0,
        contaContabil: f[15]?.trim() ?? "",
      })
      continue
    }
  }

  return {
    periodos: Array.from(periodosSet).sort(),
    cnpj: cnpjMatriz, empresa,
    linhas: resultado,
    totalDocumentos: resultado.length,
  }
}
