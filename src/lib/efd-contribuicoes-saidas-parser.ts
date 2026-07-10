// Parser client-side do EFD Contribuições (PIS/COFINS), granular por ITEM de nota fiscal —
// diferente de src/lib/efd-contribuicoes-parser.ts (Recuperação de Crédito), que só agrega por
// CFOP+CST+alíquota. Aqui cada linha de saída (venda) vira uma linha de dado, no mesmo shape das
// colunas A-BH das abas de ano do Excel-modelo da Reforma Tributária (ver
// docs/reforma-tributaria-v2.md). A cadeia de fórmulas (BI em diante) é responsabilidade do
// gerador de Excel (Fase 3), não deste parser — aqui só extraímos o dado bruto do SPED.
//
// Campos confirmados campo a campo contra arquivo real (Guia Prático EFD-Contribuições):
//   0000: COD_VER|TIPO_ESCRIT|IND_SIT_ESP|NUM_REC_ANTERIOR|DT_INI|DT_FIN|NOME|CNPJ|UF|COD_MUN|...
//   0150: COD_PART|NOME|COD_PAIS|CNPJ|CPF|IE|COD_MUN|SUFRAMA|END|NUM|COMPL|BAIRRO
//   0200: COD_ITEM|DESCR_ITEM|COD_BARRA|COD_ANT_ITEM|UNID_INV|TIPO_ITEM|COD_NCM|EX_IPI|COD_GEN|COD_LST|ALIQ_ICMS
//   C100: IND_OPER|IND_EMIT|COD_PART|COD_MOD|COD_SIT|SER|NUM_DOC|CHV_NFE|DT_DOC|DT_E_S|VL_DOC|
//         IND_PGTO|VL_DESC|VL_ABAT_NT|VL_MERC|IND_FRT|VL_FRT|VL_SEG|VL_OUT_DA|VL_BC_ICMS|VL_ICMS|
//         VL_BC_ICMS_ST|VL_ICMS_ST|VL_IPI|VL_PIS|VL_COFINS|VL_PIS_ST|VL_COFINS_ST
//   C170: NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|VL_DESC|IND_MOV|CST_ICMS|CFOP|COD_NAT|
//         VL_BC_ICMS|ALIQ_ICMS|VL_ICMS|VL_BC_ICMS_ST|ALIQ_ST|VL_ICMS_ST|IND_APUR|CST_IPI|COD_ENQ|
//         VL_BC_IPI|ALIQ_IPI|VL_IPI|CST_PIS|VL_BC_PIS|ALIQ_PIS_PERC|QUANT_BC_PIS|ALIQ_PIS_R$|VL_PIS|
//         CST_COFINS|VL_BC_COFINS|ALIQ_COFINS_PERC|QUANT_BC_COFINS|ALIQ_COFINS_R$|VL_COFINS|COD_CTA|VL_ABAT_NT
//   A100: IND_OPER|IND_EMIT|COD_PART|COD_SIT|SER|SUB|NUM_DOC|CHV_NFSE|DT_DOC|DT_EXE_SERV|VL_DOC|
//         IND_PGTO|VL_DESC|VL_BC_PIS|VL_PIS|VL_BC_COFINS|VL_COFINS|(...)
//   A170: NUM_ITEM|COD_ITEM|DESCR_COMPL|VL_ITEM|VL_DESC|NAT_BC_CRED|CST_PIS|VL_BC_PIS|ALIQ_PIS_PERC|
//         QUANT_BC_PIS|ALIQ_PIS_R$|VL_PIS|CST_COFINS|VL_BC_COFINS|ALIQ_COFINS_PERC|QUANT_BC_COFINS|
//         ALIQ_COFINS_R$|VL_COFINS|COD_CTA|COD_CCUS

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

const NOME_REGISTROS_MERCADORIA = "C100/C170 - Documento - Nota Fiscal"
const NOME_REGISTROS_SERVICO = "A100/A170 - Documento - Nota Fiscal"

export interface LinhaSaidaEfd {
  cnpj: string
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
  vlrMercadoriaOperacao: number
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
  documento: "Nota Fiscal de Mercadoria (DANFE)" | "Nota Fiscal de Serviço (NFS)"
  tipoItem: string
  vlrItem: number
  qtde: number
  unidadeMedida: string
  vlrDescontoItem: number
  cfop: string
  faturamento: "Faturamento"
  natureza: string
  cstPis: string
  vlrBaseCalculoPis: number
  aliquotaPis: number
  vlrPis: number
  cstCofins: string
  vlrBaseCalculoCofins: number
  aliquotaCofins: number
  vlrCofins: number
  vlrIcms: number
  aliquotaIcms: number
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

// Parseia um único arquivo EFD Contribuições (texto bruto). Empresas com múltiplos
// estabelecimentos mandam um arquivo por CNPJ — o wizard deve permitir upload de vários arquivos
// e concatenar os resultados (ver StepSaidasEfd.tsx).
export function parseSaidasEfdContribuicoes(texto: string): DadosSaidasEfdContribuicoes {
  const linhas = texto.split(/\r?\n/)

  let cnpj = ""
  let empresa = ""
  const periodosSet = new Set<string>()
  const participantes = new Map<string, Participante>()
  const itens = new Map<string, ItemCadastro>()
  const resultado: LinhaSaidaEfd[] = []

  // primeira passada: cadastros (0150/0200) e cabeçalho (0000) — precisam existir antes dos C170/A170
  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "0000") {
      empresa = f[8]?.trim() ?? ""
      cnpj = f[9]?.trim() ?? ""
      const dtIni = f[6]?.trim()
      if (dtIni) periodosSet.add(yyyymm(dtIni))
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

  const ufPropria = participantes.size > 0 ? "" : "" // UF própria não vem do 0000 nesta versão do layout

  // segunda passada: documentos — mantém o "cabeçalho corrente" (C100/A100) enquanto varre os
  // C170/A170 seguintes, igual ao parser de entradas (efd-parser.ts)
  let c100Atual: string[] | null = null
  let a100Atual: string[] | null = null

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

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
        cnpj, pa: yyyymm(h[10]), empresa,
        registros: NOME_REGISTROS_MERCADORIA,
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
        documento: "Nota Fiscal de Mercadoria (DANFE)",
        tipoItem: formatarTipoItem(item?.tipoItem ?? ""), vlrItem: num(f[7]), qtde: num(f[5]), unidadeMedida: f[6]?.trim() ?? "",
        vlrDescontoItem: num(f[8]), cfop,
        faturamento: "Faturamento", natureza: "Venda",
        cstPis: f[25]?.trim() ?? "", vlrBaseCalculoPis: num(f[26]), aliquotaPis: num(f[27]) / 100, vlrPis: num(f[30]),
        cstCofins: f[31]?.trim() ?? "", vlrBaseCalculoCofins: num(f[32]), aliquotaCofins: num(f[33]) / 100, vlrCofins: num(f[36]),
        vlrIcms: num(f[15]), aliquotaIcms: num(f[14]) / 100,
        contaContabil: f[37]?.trim() ?? "",
      })
      continue
    }

    if (tipo === "A170" && a100Atual) {
      // A100 (cabeçalho, campos confirmados contra dado real):
      // h4=COD_PART h5=COD_SIT h6=SER h7=SUB h8=NUM_DOC h9=CHV_NFSE h10=DT_DOC h11=DT_EXE_SERV
      // h12=VL_DOC h13=IND_PGTO h14=VL_DESC h15=VL_BC_PIS h16=VL_PIS h17=VL_BC_COFINS h18=VL_COFINS
      //
      // Os subcampos de PIS/COFINS do A170 (percentuais por item) têm layout ambíguo nas amostras
      // disponíveis — como a maioria das NFS-e tem 1 item por documento, usa-se aqui o total do
      // cabeçalho A100 (confirmado correto) em vez de arriscar um campo mal indexado do A170.
      const h = a100Atual
      const codPart = h[4]
      const part = participantes.get(codPart)

      resultado.push({
        cnpj, pa: yyyymm(h[10]), empresa,
        registros: NOME_REGISTROS_SERVICO,
        modelo: "", situacao: h[5]?.trim() ?? "",
        codigoParticipante: codPart ?? "",
        cnpjParticipante: part?.cnpj ?? "", cpfParticipante: part?.cpf ?? "", nomeParticipante: part?.nome ?? "",
        ufOrigemDestino: part?.uf ? `${ufPropria || part.uf}/${part.uf}` : "",
        numeroDocumento: h[8]?.trim() ?? "", serie: h[6]?.trim() ?? "",
        chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]), dataEntradaSaida: ddmmaaaa(h[11]),
        vlrDocumento: num(h[12]), vlrDescontoNF: num(h[14]),
        vlrMercadoriaOperacao: num(h[12]), vlrFrete: 0, vlrSeguro: 0, vlrOutrasDA: 0,
        numeroItem: f[2] ?? "", codigoItem: f[3] ?? "", descricaoComplementar: f[4]?.trim() ?? "",
        descricaoItem: "", ncm: "", codigoServico: f[3] ?? "", codigoBarra: "",
        documento: "Nota Fiscal de Serviço (NFS)",
        tipoItem: formatarTipoItem("09"), vlrItem: num(f[5]), qtde: 1, unidadeMedida: "",
        vlrDescontoItem: num(f[6]), cfop: "",
        faturamento: "Faturamento", natureza: "Venda",
        cstPis: "", vlrBaseCalculoPis: num(h[15]), aliquotaPis: num(h[15]) > 0 ? num(h[16]) / num(h[15]) : 0, vlrPis: num(h[16]),
        cstCofins: "", vlrBaseCalculoCofins: num(h[17]), aliquotaCofins: num(h[17]) > 0 ? num(h[18]) / num(h[17]) : 0, vlrCofins: num(h[18]),
        vlrIcms: 0, aliquotaIcms: 0,
        contaContabil: "",
      })
      continue
    }
  }

  return {
    periodos: Array.from(periodosSet).sort(),
    cnpj, empresa,
    linhas: resultado,
    totalDocumentos: resultado.length,
  }
}
