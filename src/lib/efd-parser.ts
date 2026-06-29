// Parser client-side do EFD ICMS IPI (SPED fiscal, formato pipe-delimited)
// Registros extraídos: 0000 (período), C100 (documentos), C190 (analítico), E110 (apuração ICMS)

export type RegistroC190 = {
  cst: string
  cfop: string
  aliqICMS: number
  vlOpr: number
  vlBCICMS: number
  vlICMS: number
  tipoOperacao: "entrada" | "saida" | "outro"
}

export type RegistroC100Resumo = {
  tipoOperacao: "entrada" | "saida"
  dtDoc: string   // YYYY-MM
  vlDoc: number   // VL_DOC = valor total do documento (campo 12)
  vlMerc: number  // VL_MERC = valor das mercadorias (campo 15)
  vlBCICMS: number
  vlICMS: number
  vlIPI: number
  vlPIS: number
  vlCOFINS: number
}

export type ApuracaoE110 = {
  vlTotDebitos: number
  vlTotCreditos: number
  vlSldApurado: number
  vlICMSRecolher: number
  vlSldCredorTransp: number
}

// Dados agregados de saídas derivados do C100 — mesma estrutura esperada pela calcularSimulacaoXml
export type EfdSaidasInput = {
  totalVProd: number           // soma VL_DOC saídas
  totalVICMS: number
  totalVPIS: number
  totalVCOFINS: number
  totalVIPI: number
  totalBaseIbsCbs: number      // totalVProd - totalVICMS - totalVPIS - totalVCOFINS
  aliquotaICMSEfetiva: number  // totalVICMS / totalVProd
  aliquotaIPIEfetiva: number   // totalVIPI / totalVProd (aproximação)
  percentualIPISaidas: number  // fração de docs com IPI
  mesesImportados: number
}

export type DadosEfd = {
  periodos: string[]
  mesesImportados: number

  // C190 — entradas (crédito IBS/CBS)
  c190Entradas: RegistroC190[]
  c190Saidas: RegistroC190[]
  bcICMSEntradas: number          // base crédito IBS/CBS (soma VL_BC_ICMS entradas C190)
  icmsCreditoEntradas: number
  aliquotaMediaEntradas: number
  totalEntradasVlOpr: number
  totalSaidasVlOpr: number

  // C100 — documentos
  c100Resumo: RegistroC100Resumo[]
  totalDocumentosEntrada: number
  totalDocumentosSaida: number

  // Saídas agregadas do C100 (substitui XML quando fonteSaidas = "efd")
  saidasParaSimulacao: EfdSaidasInput

  // E110 — apuração ICMS
  apuracaoICMS: ApuracaoE110 | null
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

// DDMMAAAA → YYYY-MM para agrupamento
function dtToYearMonth(s: string): string {
  if (s.length === 8) return `${s.slice(4)}-${s.slice(2, 4)}`
  return s.slice(0, 7)
}

export function parseEfdTxt(texto: string): DadosEfd {
  const linhas = texto.split(/\r?\n/)

  const periodosSet = new Set<string>()
  const c190Entradas: RegistroC190[] = []
  const c190Saidas: RegistroC190[] = []
  const c100Resumo: RegistroC100Resumo[] = []
  let apuracaoICMS: ApuracaoE110 | null = null

  for (const linha of linhas) {
    if (!linha.startsWith("|")) continue
    const f = linha.split("|")
    // f[0]="" (antes do 1º pipe), f[1]=identificador do registro

    const tipo = f[1]

    if (tipo === "0000") {
      // |0000|COD_VER|COD_FIN|DT_INI|DT_FIN|...
      // f[4]=DT_INI
      const dtIni = f[4]?.trim()
      if (dtIni && dtIni.length === 8) periodosSet.add(dtToYearMonth(dtIni))
      continue
    }

    if (tipo === "C100") {
      // Layout EFD ICMS/IPI com IND_PAGTO em f[13] (versão atual):
      // f[2]=IND_OPER  f[10]=DT_DOC  f[11]=DT_E_S  f[12]=VL_DOC  f[16]=VL_MERC
      // f[21]=VL_BC_ICMS  f[22]=VL_ICMS  f[23]=VL_BC_ICMS_ST  f[24]=VL_ICMS_ST
      // f[25]=VL_IPI  f[26]=VL_PIS  f[27]=VL_COFINS
      const indOper = f[2]?.trim()
      if (indOper !== "0" && indOper !== "1") continue
      const dtDoc = f[10]?.trim()
      const ymDoc = dtDoc && dtDoc.length === 8 ? dtToYearMonth(dtDoc) : ""

      c100Resumo.push({
        tipoOperacao: indOper === "0" ? "entrada" : "saida",
        dtDoc: ymDoc,
        vlDoc: num(f[12]),
        vlMerc: num(f[16]),
        vlBCICMS: num(f[21]),
        vlICMS: num(f[22]),
        vlIPI: num(f[25]),
        vlPIS: num(f[26]),
        vlCOFINS: num(f[27]),
      })
      continue
    }

    if (tipo === "C190") {
      // f[2]=CST  f[3]=CFOP  f[4]=ALIQ_ICMS  f[5]=VL_OPR  f[6]=VL_BC_ICMS  f[7]=VL_ICMS
      const cfop = f[3]?.trim() ?? ""
      const tipo2 = classificarCfop(cfop)
      const reg: RegistroC190 = {
        cst: f[2]?.trim() ?? "",
        cfop,
        aliqICMS: num(f[4]),
        vlOpr: num(f[5]),
        vlBCICMS: num(f[6]),
        vlICMS: num(f[7]),
        tipoOperacao: tipo2,
      }
      if (tipo2 === "entrada") c190Entradas.push(reg)
      else if (tipo2 === "saida") c190Saidas.push(reg)
      continue
    }

    if (tipo === "E110") {
      // f[2]=VL_TOT_DEBITOS  f[6]=VL_TOT_CREDITOS  f[11]=VL_SLD_APURADO
      // f[13]=VL_ICMS_RECOLHER  f[14]=VL_SLD_CREDOR_TRANSP
      apuracaoICMS = {
        vlTotDebitos: num(f[2]),
        vlTotCreditos: num(f[6]),
        vlSldApurado: num(f[11]),
        vlICMSRecolher: num(f[13]),
        vlSldCredorTransp: num(f[14]),
      }
      continue
    }
  }

  // Agrega C190 entradas (crédito IBS/CBS)
  // Usa VL_OPR (valor total das operações) como base de crédito — sob a reforma, o crédito
  // IBS/CBS incide sobre o valor total das compras, não só sobre a base ICMS
  const totalEntradasVlOpr = c190Entradas.reduce((s, r) => s + r.vlOpr, 0)
  const totalSaidasVlOpr = c190Saidas.reduce((s, r) => s + r.vlOpr, 0)
  const bcICMSEntradas = totalEntradasVlOpr  // base real de crédito IBS/CBS nas entradas
  const icmsCreditoEntradas = c190Entradas.reduce((s, r) => s + r.vlICMS, 0)
  const vlBCICMSEntradas = c190Entradas.reduce((s, r) => s + r.vlBCICMS, 0)
  const aliquotaMediaEntradas = vlBCICMSEntradas > 0 ? icmsCreditoEntradas / vlBCICMSEntradas : 0

  // Agrega C100 por tipo
  const c100Saidas = c100Resumo.filter((r) => r.tipoOperacao === "saida")
  const c100Entradas = c100Resumo.filter((r) => r.tipoOperacao === "entrada")

  // Usa VL_MERC como base de receita (igual ao vProd do XML) — exclui IPI que será extinto
  const totalVProdSaidas = c100Saidas.reduce((s, r) => s + r.vlMerc, 0)
  const totalVICMSSaidas = c100Saidas.reduce((s, r) => s + r.vlICMS, 0)
  const totalVPISSaidas = c100Saidas.reduce((s, r) => s + r.vlPIS, 0)
  const totalVCOFINSSaidas = c100Saidas.reduce((s, r) => s + r.vlCOFINS, 0)
  const totalVIPISaidas = c100Saidas.reduce((s, r) => s + r.vlIPI, 0)
  const totalBaseIbsCbsSaidas = Math.max(0, totalVProdSaidas - totalVICMSSaidas - totalVPISSaidas - totalVCOFINSSaidas)
  const aliquotaICMSEfetivaSaidas = totalVProdSaidas > 0 ? totalVICMSSaidas / totalVProdSaidas : 0
  const aliquotaIPIEfetivaSaidas = totalVProdSaidas > 0 ? totalVIPISaidas / totalVProdSaidas : 0
  const docsComIPI = c100Saidas.filter((r) => r.vlIPI > 0).length
  const percentualIPISaidasEfd = c100Saidas.length > 0 ? docsComIPI / c100Saidas.length : 0

  const periodos = Array.from(periodosSet).sort()
  const mesesImportados = periodos.length || 1

  const saidasParaSimulacao: EfdSaidasInput = {
    totalVProd: totalVProdSaidas,
    totalVICMS: totalVICMSSaidas,
    totalVPIS: totalVPISSaidas,
    totalVCOFINS: totalVCOFINSSaidas,
    totalVIPI: totalVIPISaidas,
    totalBaseIbsCbs: totalBaseIbsCbsSaidas,
    aliquotaICMSEfetiva: aliquotaICMSEfetivaSaidas,
    aliquotaIPIEfetiva: aliquotaIPIEfetivaSaidas,
    percentualIPISaidas: percentualIPISaidasEfd,
    mesesImportados,
  }

  return {
    periodos,
    mesesImportados,

    c190Entradas,
    c190Saidas,
    bcICMSEntradas,
    icmsCreditoEntradas,
    aliquotaMediaEntradas,
    totalEntradasVlOpr,
    totalSaidasVlOpr,

    c100Resumo,
    totalDocumentosEntrada: c100Entradas.length,
    totalDocumentosSaida: c100Saidas.length,

    saidasParaSimulacao,

    apuracaoICMS,
  }
}
