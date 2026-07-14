// Parser client-side do EFD ICMS/IPI, granular por ITEM de entrada, com CNPJ do fornecedor —
// alimenta a aba "Entradas - EFD ICMS IPI" (crédito de IBS/CBS por fornecedor) e o Passo 6 do
// wizard. Captura TODOS os campos exibidos na planilha-original do usuário (conferir.xlsx, aba
// "original"): indicador de emitente, série/modelo, datas, valores do documento (desconto,
// mercadoria, frete, seguro, outras DA), item completo (tipo, código de barra, desconto,
// unidade, indicador de movimento), natureza do crédito (derivada do CFOP), CST/base/alíquota/
// valor de ICMS, ICMS-ST, IPI, PIS e COFINS, e conta contábil.
//
// Layouts confirmados contra arquivos reais (SPED EFD ICMS/IPI, split por "|", f[1] = registro):
//   0000: f4=DT_INI f6=NOME f7=CNPJ f9=UF
//   0150: f2=COD_PART f3=NOME f5=CNPJ f6=CPF f8=COD_MUN
//   0200: f2=COD_ITEM f3=DESCR f4=COD_BARRA f7=TIPO_ITEM f8=NCM
//   C100: f2=IND_OPER(0=entrada) f3=IND_EMIT f4=COD_PART f5=COD_MOD f6=COD_SIT f7=SER f8=NUM_DOC
//         f9=CHV f10=DT_DOC f11=DT_E_S f12=VL_DOC f14=VL_DESC f16=VL_MERC f18=VL_FRT f19=VL_SEG
//         f20=VL_OUT_DA
//   C170: f2=NUM_ITEM f3=COD_ITEM f5=QTD f6=UNID f7=VL_ITEM f8=VL_DESC f9=IND_MOV f10=CST_ICMS
//         f11=CFOP f13=VL_BC_ICMS f14=ALIQ_ICMS f15=VL_ICMS f16=VL_BC_ICMS_ST f17=ALIQ_ST
//         f18=VL_ICMS_ST f20=CST_IPI f22=VL_BC_IPI f23=ALIQ_IPI f24=VL_IPI f25=CST_PIS
//         f26=VL_BC_PIS f27=ALIQ_PIS f30=VL_PIS f31=CST_COFINS f32=VL_BC_COFINS f33=ALIQ_COFINS
//         f36=VL_COFINS f37=COD_CTA

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

// Natureza do crédito por CFOP — mapeamento extraído linha a linha da planilha-original do
// usuário (conferir.xlsx): revenda→01, insumo/uso e consumo/combustível→02, ativo→10,
// faturamento p/ recebimento futuro→13; bonificação/amostra/conserto/outras→em branco.
const NATUREZA_LABEL: Record<string, string> = {
  "01": "01 - Aquisição de bens para revenda",
  "02": "02 - Aquisição de bens utilizados como insumo",
  "10": "10 - Máquinas, equip. bens do ativo - Aquisição",
  "13": "13 - Outras Operações com direito a crédito",
}
const NATUREZA_POR_CFOP: Record<string, string> = {
  "1102": "01", "2102": "01", "3102": "01",
  "1101": "02", "2101": "02", "3101": "02",
  "1116": "02", "2116": "02",
  "1122": "02", "2122": "02",
  "1128": "02", "2128": "02",
  "1556": "02", "2556": "02", "3556": "02",
  "1653": "02", "2653": "02",
  "2551": "10", // no original 1551 ficou em branco — mapeado literalmente como lá
  "1922": "13", "2922": "13",
}

export function naturezaCreditoDoCfop(cfop: string): string {
  const cod = NATUREZA_POR_CFOP[cfop]
  return cod ? NATUREZA_LABEL[cod] : ""
}

function num(s: string | undefined): number {
  if (!s) return 0
  return parseFloat(s.replace(",", ".")) || 0
}

function classificarCfop(cfop: string): "entrada" | "saida" | "outro" {
  const primeiro = cfop.charAt(0)
  if (["1", "2", "3"].includes(primeiro)) return "entrada"
  if (["5", "6", "7"].includes(primeiro)) return "saida"
  return "outro"
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
  codigoBarra: string
}

export interface LinhaEntradaEfd {
  cnpj: string
  pa: string // "YYYY-MM"
  empresa: string
  ufPropria: string
  registros: string // "C100/170/190 - Nota Fiscal" (rótulo da planilha-original)
  indicadorEmitente: string // "0 - Emissão própria" | "1 - Terceiros"
  situacao: string
  codigoParticipante: string
  cnpjFornecedor: string
  cpfFornecedor: string
  nomeFornecedor: string
  ufFornecedor: string
  numeroDocumento: string
  serie: string
  modelo: string
  chaveNFe: string
  dataDocumento: string // DD/MM/YYYY
  dataEntradaSaida: string
  vlrDocumento: number
  vlrDescontoNF: number
  vlrMercadoria: number
  vlrFrete: number
  vlrSeguro: number
  vlrOutrasDA: number
  numeroItem: string
  codigoItem: string
  descricaoItem: string
  tipoItem: string
  codigoBarra: string
  ncm: string
  vlrItem: number
  vlrDescontoItem: number
  qtde: number
  unidadeMedida: string
  indicadorMovimento: string
  naturezaCredito: string
  cfop: string
  cstIcms: string
  vlrBaseCalculoIcms: number
  aliquotaIcms: number // decimal (0,07 = 7%)
  vlrIcms: number
  vlrBaseCalculoIcmsSt: number
  aliquotaIcmsSt: number // decimal
  vlrIcmsSt: number
  cstIpi: string
  vlrBaseCalculoIpi: number
  aliquotaIpi: number // decimal
  vlrIpi: number
  cstPis: string
  vlrBaseCalculoPis: number
  aliquotaPis: number // número percentual (1,65), como no EFD
  vlrPis: number
  cstCofins: string
  vlrBaseCalculoCofins: number
  aliquotaCofins: number // número percentual
  vlrCofins: number
  contaContabil: string
}

export interface DadosEntradasEfdIcmsIpi {
  periodos: string[]
  cnpj: string
  empresa: string
  linhas: LinhaEntradaEfd[]
  cnpjsFornecedoresUnicos: string[]
}

export function parseEntradasEfdIcmsIpi(texto: string): DadosEntradasEfdIcmsIpi {
  const linhas = texto.split(/\r?\n/)

  let cnpj = ""
  let empresa = ""
  let ufPropria = ""
  const periodosSet = new Set<string>()
  const participantes = new Map<string, Participante>()
  const itens = new Map<string, ItemCadastro>()

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "0000") {
      empresa = f[6]?.trim() ?? ""
      cnpj = f[7]?.trim() ?? ""
      ufPropria = f[9]?.trim() ?? ""
      const dtIni = f[4]?.trim()
      if (dtIni && dtIni.length === 8) periodosSet.add(yyyymm(dtIni))
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
        codigoBarra: f[4]?.trim() ?? "",
      })
      continue
    }
  }

  const resultado: LinhaEntradaEfd[] = []
  let c100Atual: string[] | null = null

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "C100") {
      // IND_OPER: 0=entrada, 1=saída (EFD ICMS/IPI)
      c100Atual = f[2] === "0" ? f : null
      continue
    }

    if (tipo === "C170" && c100Atual) {
      const h = c100Atual
      const cfop = f[11]?.trim() ?? ""
      if (classificarCfop(cfop) !== "entrada") continue

      const codPart = h[4]
      const part = participantes.get(codPart)
      const item = itens.get(f[3])
      const indEmit = h[3]?.trim() ?? ""

      resultado.push({
        cnpj, pa: yyyymm(h[10]), empresa, ufPropria,
        registros: "C100/170/190 - Nota Fiscal",
        indicadorEmitente: indEmit === "0" ? "0 - Emissão própria" : "1 - Terceiros",
        situacao: h[6]?.trim() ?? "",
        codigoParticipante: codPart ?? "",
        cnpjFornecedor: part?.cnpj ?? "", cpfFornecedor: part?.cpf ?? "", nomeFornecedor: part?.nome ?? "",
        ufFornecedor: part?.uf ?? "",
        numeroDocumento: h[8]?.trim() ?? "", serie: h[7]?.trim() ?? "", modelo: h[5]?.trim() ?? "",
        chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]), dataEntradaSaida: ddmmaaaa(h[11]),
        vlrDocumento: num(h[12]), vlrDescontoNF: num(h[14]), vlrMercadoria: num(h[16]),
        vlrFrete: num(h[18]), vlrSeguro: num(h[19]), vlrOutrasDA: num(h[20]),
        numeroItem: f[2] ?? "", codigoItem: f[3] ?? "",
        descricaoItem: item?.descricao ?? "", tipoItem: formatarTipoItem(item?.tipoItem ?? ""),
        codigoBarra: item?.codigoBarra ?? "", ncm: item?.ncm ?? "",
        vlrItem: num(f[7]), vlrDescontoItem: num(f[8]), qtde: num(f[5]), unidadeMedida: f[6]?.trim() ?? "",
        indicadorMovimento: f[9]?.trim() ?? "",
        naturezaCredito: naturezaCreditoDoCfop(cfop),
        cfop,
        cstIcms: f[10]?.trim() ?? "",
        vlrBaseCalculoIcms: num(f[13]), aliquotaIcms: num(f[14]) / 100, vlrIcms: num(f[15]),
        vlrBaseCalculoIcmsSt: num(f[16]), aliquotaIcmsSt: num(f[17]) / 100, vlrIcmsSt: num(f[18]),
        cstIpi: f[20]?.trim() ?? "",
        vlrBaseCalculoIpi: num(f[22]), aliquotaIpi: num(f[23]) / 100, vlrIpi: num(f[24]),
        cstPis: f[25]?.trim() ?? "",
        vlrBaseCalculoPis: num(f[26]), aliquotaPis: num(f[27]), vlrPis: num(f[30]),
        cstCofins: f[31]?.trim() ?? "",
        vlrBaseCalculoCofins: num(f[32]), aliquotaCofins: num(f[33]), vlrCofins: num(f[36]),
        contaContabil: f[37]?.trim() ?? "",
      })
      continue
    }
  }

  const cnpjsFornecedoresUnicos = Array.from(
    new Set(resultado.map((l) => l.cnpjFornecedor).filter((c) => c.length === 14))
  )

  return {
    periodos: Array.from(periodosSet).sort(),
    cnpj, empresa,
    linhas: resultado,
    cnpjsFornecedoresUnicos,
  }
}
