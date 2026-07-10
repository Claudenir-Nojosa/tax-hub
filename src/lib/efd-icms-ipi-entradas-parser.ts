// Parser client-side do EFD ICMS/IPI, granular por ITEM de entrada, com CNPJ do fornecedor —
// necessário pra aba "Entradas - EFD ICMS IPI" (crédito de IBS/CBS por fornecedor, Fase 5) e pro
// Passo 6 do wizard. Diferente de src/lib/efd-parser.ts (usado pelo wizard antigo), que só agrega
// por CFOP+CST+alíquota via registro C190 — aqui usamos C100/C170 (documento + item) e o registro
// 0150 (participantes) pra obter o CNPJ do fornecedor por nota, que nenhum parser existente
// carregava (gap identificado em docs/reforma-tributaria-v2.md).
//
// Campos 0150/0200/C100/C170 confirmados contra dado real em
// src/lib/efd-contribuicoes-saidas-parser.ts — mesmo layout de Bloco 0/C do SPED, reaproveitado
// aqui. C170 de entradas NÃO foi validado ainda contra amostra real com CFOP 1xxx/2xxx confirmado
// (ver gap documentado na Fase 5) — revisar ao integrar dados reais.

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
}

export interface LinhaEntradaEfd {
  cnpj: string
  pa: string
  empresa: string
  codigoParticipante: string
  cnpjFornecedor: string
  cpfFornecedor: string
  nomeFornecedor: string
  ufFornecedor: string
  numeroDocumento: string
  chaveNFe: string
  dataDocumento: string
  vlrDocumento: number
  numeroItem: string
  codigoItem: string
  descricaoItem: string
  ncm: string
  vlrItem: number
  qtde: number
  cfop: string
  vlrBaseCalculoIcms: number
  aliquotaIcms: number
  vlrIcms: number
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
  const periodosSet = new Set<string>()
  const participantes = new Map<string, Participante>()
  const itens = new Map<string, ItemCadastro>()

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    const tipo = f[1]

    if (tipo === "0000") {
      // |0000|COD_VER|COD_FIN|DT_INI|DT_FIN|NOME|CNPJ|IE|UF|COD_MUN|... (confirmado contra dado real)
      empresa = f[6]?.trim() ?? ""
      cnpj = f[7]?.trim() ?? ""
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

      resultado.push({
        cnpj, pa: yyyymm(h[10]), empresa,
        codigoParticipante: codPart ?? "",
        cnpjFornecedor: part?.cnpj ?? "", cpfFornecedor: part?.cpf ?? "", nomeFornecedor: part?.nome ?? "",
        ufFornecedor: part?.uf ?? "",
        numeroDocumento: h[8]?.trim() ?? "", chaveNFe: h[9]?.trim() ?? "",
        dataDocumento: ddmmaaaa(h[10]),
        vlrDocumento: num(h[12]),
        numeroItem: f[2] ?? "", codigoItem: f[3] ?? "",
        descricaoItem: item?.descricao ?? "", ncm: item?.ncm ?? "",
        vlrItem: num(f[7]), qtde: num(f[5]),
        cfop,
        vlrBaseCalculoIcms: num(f[13]), aliquotaIcms: num(f[14]) / 100, vlrIcms: num(f[15]),
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
