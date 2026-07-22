// Parser de EFD ICMS/IPI (SPED Fiscal), formato texto pipe-delimited — roda no servidor (mesmo
// padrão do parser de PGDAS em src/lib/pgdas/parser.ts, já que os dados são persistidos por
// projeto no banco). Cada arquivo = 1 competência (mês). Extrai o cabeçalho (0000), os
// registros C190 (valor operacional/base de cálculo/ICMS/IPI agregados por CFOP+CST+alíquota)
// e a apuração do ICMS (E110).

import type { LinhaEntradaEfd } from "./efd-icms-ipi-entradas-parser"

export interface TotaisOperacao {
  valorOperacional: number
  baseCalculo: number
  valorIcms: number
  valorIcmsSt: number
  valorIpi: number
}

export interface RegistroAgregado extends TotaisOperacao {
  cfop: string
  cst: string
  aliquota: number
}

export interface ApuracaoIcms {
  totalDebitos: number
  totalCreditos: number
  saldoApurado: number // positivo = saldo devedor
  icmsARecolher: number
  saldoCredorTransportar: number
}

export interface DadosEfdIcmsIpi {
  competencia: string // "YYYY-MM"
  cnpj: string
  razaoSocial: string
  uf: string
  arquivoNome: string
  registros: RegistroAgregado[] // um por combinação única (CFOP, CST, Alíquota)
  apuracaoIcms: ApuracaoIcms
  // Linhas de entrada item a item (C100/C170), pra aba "Entradas" — preenchido no upload route
  // via parseEntradasEfdIcmsIpi (src/lib/efd-icms-ipi-entradas-parser.ts), não por parseUmaEfd.
  // Opcional pra não quebrar registros antigos gravados antes dessa mudança.
  linhasEntrada?: LinhaEntradaEfd[]
}

function parseNumeroEfd(raw: string | undefined): number {
  if (!raw) return 0
  const v = parseFloat(raw.trim().replace(",", "."))
  return Number.isFinite(v) ? v : 0
}

// CFOP: código + descrição oficial (lista não-exaustiva, cobre os CFOPs de mercadoria mais
// comuns — códigos fora dessa lista aparecem só como "CFOP <código>", sem inventar descrição).
export const CFOP_LABELS: Record<string, string> = {
  "1101": "Compra para industrialização ou produção rural",
  "1102": "Compra para comercialização",
  "1111": "Compra para industrialização de mercadoria recebida anteriormente em consignação industrial",
  "1113": "Compra para comercialização de mercadoria recebida anteriormente em consignação mercantil",
  "1116": "Compra para industrialização originada de encomenda para recebimento futuro",
  "1117": "Compra para comercialização originada de encomenda para recebimento futuro",
  "1120": "Compra para industrialização, em venda à ordem, já recebida do vendedor remetente",
  "1122": "Compra para comercialização, em venda à ordem, já recebida do vendedor remetente",
  "1202": "Devolução de venda de mercadoria adquirida ou recebida de terceiros",
  "1401": "Compra para industrialização em operação com mercadoria sujeita ao regime de substituição tributária",
  "1403": "Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária",
  "1551": "Compra de bem para o ativo imobilizado",
  "1556": "Compra de material para uso ou consumo",
  "1653": "Compra de combustível ou lubrificante para comercialização",
  "1949": "Outra entrada de mercadoria ou prestação de serviço não especificada",
  "2101": "Compra para industrialização ou produção rural",
  "2102": "Compra para comercialização",
  "2202": "Devolução de venda de mercadoria adquirida ou recebida de terceiros",
  "2403": "Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária",
  "2551": "Compra de bem para o ativo imobilizado",
  "2556": "Compra de material para uso ou consumo",
  "2949": "Outra entrada de mercadoria ou prestação de serviço não especificado",
  "5101": "Venda de produção do estabelecimento",
  "5102": "Venda de mercadoria adquirida ou recebida de terceiros",
  "5103": "Venda de produção do estabelecimento, efetuada fora do estabelecimento",
  "5109": "Venda de produção do estabelecimento, destinada à ZFM ou ALC",
  "5202": "Devolução de compra para comercialização",
  "5405": "Venda de mercadoria adquirida ou recebida de terceiros sujeita ao regime de substituição tributária",
  "5910": "Remessa em bonificação, doação ou brinde",
  "5949": "Outra saída de mercadoria ou prestação de serviço não especificado",
  "6101": "Venda de produção do estabelecimento",
  "6102": "Venda de mercadoria adquirida ou recebida de terceiros",
  "6108": "Venda de mercadoria adquirida ou recebida de terceiros, destinada a não contribuinte",
  "6109": "Venda de produção do estabelecimento, destinada a não contribuinte",
  "6202": "Devolução de compra para comercialização",
  "6405": "Venda de mercadoria adquirida ou recebida de terceiros sujeita ao regime de substituição tributária",
  "6910": "Remessa em bonificação, doação ou brinde",
  "6949": "Outra saída de mercadoria ou prestação de serviço não especificado",
}

export function labelCfop(cfop: string): string {
  return CFOP_LABELS[cfop] ? `${cfop} - ${CFOP_LABELS[cfop]}` : cfop
}

// CSOSN (Simples Nacional) — checado primeiro, pois pode aparecer no mesmo campo CST_ICMS
// quando a nota é de um participante optante pelo Simples Nacional.
const CSOSN_LABELS: Record<string, string> = {
  "101": "Tributada pelo Simples Nacional com permissão de crédito",
  "102": "Tributada pelo Simples Nacional sem permissão de crédito",
  "103": "Isenção do ICMS no Simples Nacional para faixa de receita bruta",
  "201": "Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por ST",
  "202": "Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por ST",
  "203": "Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por ST",
  "300": "Imune",
  "400": "Não tributada pelo Simples Nacional",
  "500": "ST ou por antecipação",
  "900": "Outros",
}

// CST-ICMS (regime normal) — últimos 2 dígitos do código de 3 dígitos (1º dígito = origem).
const CST_SUFIXO_LABELS: Record<string, string> = {
  "00": "Tributada integralmente",
  "10": "Tributada e com cobrança do ICMS por substituição tributária",
  "20": "Com redução de base de cálculo",
  "30": "Isenta ou não tributada e com cobrança do ICMS por substituição tributária",
  "40": "Isenta",
  "41": "Não tributada",
  "50": "Suspensão",
  "51": "Diferimento",
  "60": "ICMS cobrado anteriormente por substituição tributária",
  "70": "Com redução de base de cálculo e cobrança do ICMS por substituição tributária",
  "90": "Outras",
}

// ASSUNÇÃO: o campo CST_ICMS do C190 pode conter tanto um CST de regime normal quanto um
// CSOSN de Simples Nacional (isso reflete o regime de quem EMITIU a nota, não o do declarante
// do EFD) — não dá pra desambiguar com certeza só pelo código de 3 dígitos quando ele é válido
// nas duas tabelas (ex.: "400" e "500" existem em ambas). Prioriza a leitura como CSOSN.
export function labelCst(cst: string): string {
  if (CSOSN_LABELS[cst]) return `${cst} - ${CSOSN_LABELS[cst]}`
  const sufixo = cst.slice(-2)
  return CST_SUFIXO_LABELS[sufixo] ? `${cst} - ${CST_SUFIXO_LABELS[sufixo]}` : cst
}

export function isSaida(cfop: string): boolean {
  return /^[567]/.test(cfop)
}

function parseUmaEfd(conteudo: string, arquivoNome: string): DadosEfdIcmsIpi | null {
  const linhas = conteudo.split(/\r?\n/)

  let cnpj = ""
  let razaoSocial = ""
  let uf = ""
  let competencia = ""
  const registrosMap = new Map<string, RegistroAgregado>()
  let apuracaoIcms: ApuracaoIcms = {
    totalDebitos: 0,
    totalCreditos: 0,
    saldoApurado: 0,
    icmsARecolher: 0,
    saldoCredorTransportar: 0,
  }

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const campos = linha.split("|")
    const registro = campos[1]

    if (registro === "0000") {
      // |0000|COD_VER|COD_FIN|DT_INI|DT_FIN|NOME|CNPJ|CPF|UF|IE|COD_MUN|IM|SUFRAMA|IND_PERFIL|IND_ATIV|
      const dtIni = campos[4] ?? "" // DDMMAAAA
      razaoSocial = (campos[6] ?? "").trim()
      cnpj = (campos[7] ?? "").trim()
      uf = (campos[9] ?? "").trim()
      if (dtIni.length === 8) competencia = `${dtIni.slice(4, 8)}-${dtIni.slice(2, 4)}`
    } else if (registro === "C190") {
      // |C190|CST_ICMS|CFOP|ALIQ_ICMS|VL_OPR|VL_BC_ICMS|VL_ICMS|VL_BC_ICMS_ST|VL_ICMS_ST|VL_RED_BC|VL_IPI|COD_OBS|
      const cst = (campos[2] ?? "").trim()
      const cfop = (campos[3] ?? "").trim()
      const aliquota = parseNumeroEfd(campos[4])
      const valorOperacional = parseNumeroEfd(campos[5])
      const baseCalculo = parseNumeroEfd(campos[6])
      const valorIcms = parseNumeroEfd(campos[7])
      const valorIcmsSt = parseNumeroEfd(campos[9])
      const valorIpi = parseNumeroEfd(campos[11])

      const chave = `${cfop}|${cst}|${aliquota}`
      const atual = registrosMap.get(chave) ?? {
        cfop,
        cst,
        aliquota,
        valorOperacional: 0,
        baseCalculo: 0,
        valorIcms: 0,
        valorIcmsSt: 0,
        valorIpi: 0,
      }
      atual.valorOperacional += valorOperacional
      atual.baseCalculo += baseCalculo
      atual.valorIcms += valorIcms
      atual.valorIcmsSt += valorIcmsSt
      atual.valorIpi += valorIpi
      registrosMap.set(chave, atual)
    } else if (registro === "E110") {
      // |E110|VL_TOT_DEBITOS|VL_AJ_DEBITOS|VL_TOT_AJ_DEBITOS|VL_ESTORNOS_CRED|VL_TOT_CREDITOS|
      //  VL_AJ_CREDITOS|VL_TOT_AJ_CREDITOS|VL_ESTORNOS_DEB|VL_SLD_CREDOR_ANT|VL_SLD_APURADO|
      //  VL_TOT_DED|VL_ICMS_RECOLHER|VL_SLD_CREDOR_TRANSPORTAR|DEB_ESP|
      apuracaoIcms = {
        totalDebitos: parseNumeroEfd(campos[2]),
        totalCreditos: parseNumeroEfd(campos[6]),
        saldoApurado: parseNumeroEfd(campos[11]),
        icmsARecolher: parseNumeroEfd(campos[13]),
        saldoCredorTransportar: parseNumeroEfd(campos[14]),
      }
    }
  }

  if (!competencia || !cnpj) return null

  return {
    competencia,
    cnpj,
    razaoSocial,
    uf,
    arquivoNome,
    registros: Array.from(registrosMap.values()),
    apuracaoIcms,
  }
}

export async function processarArquivosEfd(
  files: File[],
  onProgress?: (atual: number, total: number) => void
): Promise<DadosEfdIcmsIpi[]> {
  const resultados: DadosEfdIcmsIpi[] = []
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

// Heurística pra detectar se um arquivo .txt é um EFD ICMS/IPI (sem precisar processar tudo).
export async function pareceEfdIcmsIpi(file: File): Promise<boolean> {
  const inicio = await file.slice(0, 200).text()
  return inicio.trimStart().startsWith("|0000|")
}
