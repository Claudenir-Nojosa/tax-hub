import ExcelJS from "exceljs"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { colLetra } from "./coluna-letra"
import { calcularCamposAno, aliquotasEfetivasDoAno, REDUCAO_ICMS_ISS } from "./calculo-linha-ano"

// Gera as abas de ano (2026, "2027 e 2028", 2029...2033) — a peça central do Excel de entrega.
// Cada aba recebe o MESMO conjunto de linhas de saída (Passo 5 do wizard) e recalcula o imposto
// sob a premissa daquele ano — é uma simulação "e se essas mesmas notas tivessem ocorrido sob
// este regime", não um filtro por data real. "2027 e 2028" usa a premissa de 2027 (ambos os anos
// têm a mesma alíquota, ver Premissas).
//
// Diferente do Excel-modelo (onde as letras de coluna variam levemente entre abas), aqui TODAS as
// abas de ano usam o MESMO layout de colunas — decisão deliberada documentada em
// docs/reforma-tributaria-v2.md: como o arquivo é gerado do zero (não clonado célula a célula do
// modelo), não há motivo pra herdar a inconsistência; a consistência facilita a Fase 4 (Quadro
// Comparativo) referenciar as mesmas colunas em todas as abas.

const FONTE = "Calibri"

function f(formula: string, result: number): ExcelJS.CellFormulaValue {
  return { formula, result } as ExcelJS.CellFormulaValue
}

export interface AbaAno {
  label: string
  anoPremissa: number
}

export const ABAS_ANO: AbaAno[] = [
  { label: "2026", anoPremissa: 2026 },
  { label: "2027 e 2028", anoPremissa: 2027 },
  { label: "2029", anoPremissa: 2029 },
  { label: "2030", anoPremissa: 2030 },
  { label: "2031", anoPremissa: 2031 },
  { label: "2032", anoPremissa: 2032 },
  { label: "2033", anoPremissa: 2033 },
]

// Colunas A-BH (dado bruto do EFD) — ordem 1:1 com os campos de LinhaSaidaEfd
const RAW_HEADERS = [
  "CNPJ", "PA", "Empresa", "Registros", "Modelo", "Situação", "Código Participante",
  "CNPJ Participante", "CPF Participante", "Nome Participante", "UF Origem/Destino",
  "Número Documento", "Série", "Chave NF-e", "Data Documento", "Data Entrada/Saída",
  "Vlr Documento", "Vlr Desconto NF", "Vlr Mercadoria/Operação", "Vlr Frete", "Vlr Seguro",
  "Vlr Outras DA", "Número Item", "Código Item", "Descrição Complementar", "Descrição Item",
  "NCM", "Código Serviço", "Código Barra", "Documento", "Tipo Item", "Vlr Item", "Qtde",
  "Unidade Medida", "Vlr Desconto Item", "CFOP", "Descrição CFOP", "Faturamento", "Natureza",
  "Alíquota ISS", "Vlr ISS", "Alíquota ICMS", "Vlr ICMS", "Vlr ICMS-ST", "Vlr IPI", "CST PIS",
  "Vlr Base Cálculo PIS", "Qtde Base Cálculo PIS", "Alíquota PIS", "Qtde Alíquota PIS", "Vlr PIS",
  "CST Cofins", "Vlr Base Cálculo Cofins", "Qtde Base Cálculo Cofins", "Alíquota Cofins",
  "Qtde Alíquota Cofins", "Vlr Cofins", "Conta Contábil", "",
] as const

// Colunas BI em diante — a cadeia de fórmulas (ver docs/reforma-tributaria-v2.md)
const CALC_HEADERS = [
  "VALOR SEM TRIBUTO", "BASE PIS COFINS", "VLR PIS", "VLR COFINS", "VLR PIS + COFINS",
  "BASE ICMS FINANCE", "ICMS", "BASE ISS FINANCE", "ISS", "VLR PIS + COFINS + ISS",
  "DIF VALOR PRODUTO", "BASE IBS/CBS", "IBS", "CBS", "TOTAL NF FINANCE", "TOTAL NF CLIENTE", "DIF",
] as const

const TODOS_HEADERS = [...RAW_HEADERS, ...CALC_HEADERS]
export const COL_INICIO_ANO = 3 // C — A/B são margem, igual ao padrão do módulo
const LINHA_TITULO = 1
const LINHA_ALIQ_IBS = 2
const LINHA_ALIQ_CBS = 3
const LINHA_SUBTOTAL = 4
const LINHA_HEADER = 5
export const LINHA_DADOS_INICIO_ANO = 6

// Colunas numéricas que recebem SUBTOTAL(9,...) na linha 4 — mesmo espírito do Excel-modelo
// (linha de subtotal logo acima do cabeçalho, soma só o que estiver visível se a aba tiver
// filtro). Cobre os valores monetários/quantidades; deixa de fora códigos, datas e textos.
const COLUNAS_SUBTOTAL = [
  "Vlr Documento", "Vlr Desconto NF", "Vlr Mercadoria/Operação", "Vlr Frete", "Vlr Seguro",
  "Vlr Outras DA", "Vlr Item", "Qtde", "Vlr Desconto Item", "Vlr ISS", "Vlr ICMS", "Vlr ICMS-ST",
  "Vlr IPI", "Vlr Base Cálculo PIS", "Vlr PIS", "Vlr Base Cálculo Cofins", "Vlr Cofins",
  ...CALC_HEADERS,
] as const
// margem generosa de linhas nas fórmulas cross-sheet (Valor Total NF-e, Quadro Comparativo) —
// mesmo espírito do "BI8:BI999999" do Excel-modelo, cobre reimportações futuras sem quebrar
export const LINHA_FIM_RANGE_ANO = 200_000

// Letra da coluna de um campo das abas de ano — exportada pra Valor Total NF-e e Quadro
// Comparativo (Fase 4) referenciarem as mesmas colunas sem duplicar a lista de headers.
export function letraColunaAno(nomeCampo: string): string {
  const idx = TODOS_HEADERS.indexOf(nomeCampo as (typeof TODOS_HEADERS)[number])
  if (idx === -1) throw new Error(`Coluna "${nomeCampo}" não existe no layout das abas de ano`)
  return colLetra(COL_INICIO_ANO + idx)
}
const letraDe = letraColunaAno

const CFOP_DESCRICOES: Record<string, string> = {
  "5101": "Venda de produção do estabelecimento",
  "5102": "Venda de mercadoria adquirida ou recebida de terceiros",
  "5405": "Venda de mercadoria sujeita a ST",
  "6101": "Venda de produção do estabelecimento (fora do estado)",
  "6102": "Venda de mercadoria adquirida ou recebida de terceiros (fora do estado)",
}

function celula(ws: ExcelJS.Worksheet, ref: string, valor: ExcelJS.CellValue, opts?: { bold?: boolean; numFmt?: string; centralizado?: boolean }) {
  const cell = ws.getCell(ref)
  cell.value = valor
  cell.font = { name: FONTE, size: 11, bold: opts?.bold ?? false }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.centralizado) cell.alignment = { horizontal: "center", vertical: "middle" }
  return cell
}

function rawRowValues(l: LinhaSaidaEfd): (string | number)[] {
  const descricaoCfop = CFOP_DESCRICOES[l.cfop] ?? ""
  return [
    l.cnpj, l.pa, l.empresa, l.registros, l.modelo, l.situacao, l.codigoParticipante,
    l.cnpjParticipante, l.cpfParticipante, l.nomeParticipante, l.ufOrigemDestino,
    l.numeroDocumento, l.serie, l.chaveNFe, l.dataDocumento, l.dataEntradaSaida,
    l.vlrDocumento, l.vlrDescontoNF, l.vlrMercadoriaOperacao, l.vlrFrete, l.vlrSeguro,
    l.vlrOutrasDA, l.numeroItem, l.codigoItem, l.descricaoComplementar, l.descricaoItem,
    l.ncm, l.codigoServico, l.codigoBarra, l.documento, l.tipoItem, l.vlrItem, l.qtde,
    l.unidadeMedida, l.vlrDescontoItem, l.cfop, descricaoCfop, l.faturamento, l.natureza,
    0 /* Vlr ISS — EFD Contribuições não traz ISS por linha, é premissa (ver aliq. ISS) */,
    l.aliquotaIcms, l.vlrIcms, 0, 0, l.cstPis,
    l.vlrBaseCalculoPis, 0, l.aliquotaPis, 0, l.vlrPis,
    l.cstCofins, l.vlrBaseCalculoCofins, 0, l.aliquotaCofins, 0, l.vlrCofins,
    l.contaContabil, "",
  ]
}

export function montarAbaAno(
  wb: ExcelJS.Workbook,
  aba: AbaAno,
  linhas: LinhaSaidaEfd[],
  premissas: PremissasReformaData
) {
  const ws = wb.addWorksheet(aba.label, { views: [{ showGridLines: false }] })
  const p = premissas.premissasPorAno[aba.anoPremissa]
  const { aliqIbs, aliqCbs } = aliquotasEfetivasDoAno(p.cbs, p.ibsUF, p.ibsMUN, premissas.reducao60)
  // ICMS/ISS reduzem gradualmente 2029-2033 (aba Premissas, tabela "ICMS e ISS") — a alíquota que
  // efetivamente incide na linha já sai daqui multiplicada pelo fator do ano; 2026-2028 = 100%
  const fatorReducaoIcmsIss = REDUCAO_ICMS_ISS[aba.anoPremissa] ?? 1
  const aliqIss = p.aliquotaISS * fatorReducaoIcmsIss

  celula(ws, `C${LINHA_TITULO}`, `Saídas - EFD Contribuições — ${aba.label}`, { bold: true })
  celula(ws, `C${LINHA_ALIQ_IBS}`, "Alíquota IBS (ano, já com redução se aplicável)")
  celula(ws, `D${LINHA_ALIQ_IBS}`, aliqIbs, { numFmt: "0.0000%" })
  celula(ws, `C${LINHA_ALIQ_CBS}`, "Alíquota CBS (ano, já com redução se aplicável)")
  celula(ws, `D${LINHA_ALIQ_CBS}`, aliqCbs, { numFmt: "0.0000%" })

  TODOS_HEADERS.forEach((nome, i) => celula(ws, `${colLetra(COL_INICIO_ANO + i)}${LINHA_HEADER}`, nome, { bold: true, centralizado: true }))

  const cAH = letraDe("Vlr Item"), cAQ = letraDe("Vlr ISS"), cBA = letraDe("Vlr PIS"),
    cBG = letraDe("Vlr Cofins"), cAS = letraDe("Vlr ICMS"), cAK = letraDe("Vlr Desconto Item"),
    cAY = letraDe("Alíquota PIS"), cBE = letraDe("Alíquota Cofins"), cAF = letraDe("Documento"),
    cAR = letraDe("Alíquota ICMS"), cAP = letraDe("Alíquota ISS")
  const cBJ = letraDe("VALOR SEM TRIBUTO"), cBK = letraDe("BASE PIS COFINS"), cBL = letraDe("VLR PIS"),
    cBM = letraDe("VLR COFINS"), cBO = letraDe("BASE ICMS FINANCE"), cBQ = letraDe("BASE ISS FINANCE"),
    cBU = letraDe("BASE IBS/CBS"), cBX = letraDe("TOTAL NF FINANCE")

  const refAliqIbs = `$D$${LINHA_ALIQ_IBS}`
  const refAliqCbs = `$D$${LINHA_ALIQ_CBS}`

  const somasSubtotal: Record<string, number> = {}
  for (const nome of COLUNAS_SUBTOTAL) somasSubtotal[nome] = 0

  linhas.forEach((l, i) => {
    const r = LINHA_DADOS_INICIO_ANO + i
    const raw = rawRowValues(l)
    raw.forEach((v, ci) => {
      const cell = ws.getCell(r, COL_INICIO_ANO + ci)
      cell.value = v
      cell.font = { name: FONTE, size: 10 }
    })
    // sobrescreve "Alíquota ISS" (premissa, não vem do EFD) e "Alíquota ICMS" (já reduzida pelo
    // fator do ano — a coluna bruta do EFD tinha a alíquota cheia); "Vlr ISS" fica 0 (já no raw)
    const aliqIcmsLinha = l.aliquotaIcms * fatorReducaoIcmsIss
    ws.getCell(`${cAP}${r}`).value = aliqIss
    ws.getCell(`${cAR}${r}`).value = aliqIcmsLinha

    // cadeia de fórmulas — espelha docs/reforma-tributaria-v2.md ("Cadeia de fórmulas das abas de
    // ano"), calculada por calcularCamposAno (compartilhada com Valor Total NF-e/Quadro Comparativo)
    const c = calcularCamposAno(l, aliqIss, aliqIbs, aliqCbs, aliqIcmsLinha)

    celula(ws, `${cBJ}${r}`, f(`${cAH}${r}-${cAQ}${r}-${cBA}${r}-${cBG}${r}-${cAS}${r}-${cAK}${r}`, c.vlrSemTributo))
    celula(ws, `${cBK}${r}`, f(`${cBJ}${r}/(1-${cAY}${r}-${cBE}${r})`, c.basePisCofins))
    celula(ws, `${cBL}${r}`, f(`${cBK}${r}*${cAY}${r}`, c.vlrPis))
    celula(ws, `${cBM}${r}`, f(`${cBK}${r}*${cBE}${r}`, c.vlrCofins))
    celula(ws, `${letraDe("VLR PIS + COFINS")}${r}`, f(`${cBL}${r}+${cBM}${r}`, c.vlrPisCofins))
    celula(ws, `${cBO}${r}`, f(`IF(${cAF}${r}="Nota Fiscal de Serviço (NFS)",0,(${cBJ}${r}+${cBL}${r}+${cBM}${r})/(1-${cAR}${r}))`, c.baseIcmsFinance))
    celula(ws, `${letraDe("ICMS")}${r}`, f(`${cBO}${r}*${cAR}${r}`, c.icms))
    celula(ws, `${cBQ}${r}`, f(`IF(${cAF}${r}="Nota Fiscal de Serviço (NFS)",(${cBJ}${r}+${cBL}${r}+${cBM}${r})/(1-${cAP}${r}),0)`, c.baseIssFinance))
    celula(ws, `${letraDe("ISS")}${r}`, f(`${cBQ}${r}*${cAP}${r}`, c.iss))
    celula(ws, `${letraDe("VLR PIS + COFINS + ISS")}${r}`, f(`${cBL}${r}+${cBM}${r}+${letraDe("ISS")}${r}`, c.vlrPisCofinsIss))
    celula(ws, `${letraDe("DIF VALOR PRODUTO")}${r}`, f(`${cBQ}${r}-${cBO}${r}-${cBJ}${r}`, c.difValorProduto))
    celula(ws, `${cBU}${r}`, f(`${cBJ}${r}`, c.baseIbsCbs))
    celula(ws, `${letraDe("IBS")}${r}`, f(`${cBU}${r}*${refAliqIbs}`, c.ibs))
    celula(ws, `${letraDe("CBS")}${r}`, f(`${cBU}${r}*${refAliqCbs}`, c.cbs))
    celula(ws, `${cBX}${r}`, f(`${cBQ}${r}+${cBO}${r}`, c.totalNfFinance))
    celula(ws, `${letraDe("TOTAL NF CLIENTE")}${r}`, f(`${cAH}${r}-${cAK}${r}`, c.totalNfCliente))
    celula(ws, `${letraDe("DIF")}${r}`, f(`${letraDe("TOTAL NF CLIENTE")}${r}-${cBX}${r}`, c.dif))

    // acumula pra linha de SUBTOTAL (escrita depois do loop, quando já sabemos o total de linhas)
    const valoresLinha: Record<string, number> = {
      "Vlr Documento": l.vlrDocumento, "Vlr Desconto NF": l.vlrDescontoNF,
      "Vlr Mercadoria/Operação": l.vlrMercadoriaOperacao, "Vlr Frete": l.vlrFrete,
      "Vlr Seguro": l.vlrSeguro, "Vlr Outras DA": l.vlrOutrasDA, "Vlr Item": l.vlrItem,
      "Qtde": l.qtde, "Vlr Desconto Item": l.vlrDescontoItem, "Vlr ISS": 0,
      "Vlr ICMS": l.vlrIcms, "Vlr ICMS-ST": 0, "Vlr IPI": 0,
      "Vlr Base Cálculo PIS": l.vlrBaseCalculoPis, "Vlr PIS": l.vlrPis,
      "Vlr Base Cálculo Cofins": l.vlrBaseCalculoCofins, "Vlr Cofins": l.vlrCofins,
      "VALOR SEM TRIBUTO": c.vlrSemTributo, "BASE PIS COFINS": c.basePisCofins,
      "VLR PIS": c.vlrPis, "VLR COFINS": c.vlrCofins, "VLR PIS + COFINS": c.vlrPisCofins,
      "BASE ICMS FINANCE": c.baseIcmsFinance, "ICMS": c.icms, "BASE ISS FINANCE": c.baseIssFinance,
      "ISS": c.iss, "VLR PIS + COFINS + ISS": c.vlrPisCofinsIss,
      "DIF VALOR PRODUTO": c.difValorProduto, "BASE IBS/CBS": c.baseIbsCbs, "IBS": c.ibs,
      "CBS": c.cbs, "TOTAL NF FINANCE": c.totalNfFinance, "TOTAL NF CLIENTE": c.totalNfCliente,
      "DIF": c.dif,
    }
    for (const nome of COLUNAS_SUBTOTAL) somasSubtotal[nome] += valoresLinha[nome] ?? 0
  })

  // Linha de SUBTOTAL (mesmo padrão do Excel-modelo: SUBTOTAL(9,...) logo acima do cabeçalho,
  // soma só as linhas visíveis se a aba tiver filtro aplicado)
  if (linhas.length > 0) {
    const primeiraLinhaDados = LINHA_DADOS_INICIO_ANO
    const ultimaLinhaDados = LINHA_DADOS_INICIO_ANO + linhas.length - 1
    for (const nome of COLUNAS_SUBTOTAL) {
      const col = letraDe(nome)
      celula(
        ws, `${col}${LINHA_SUBTOTAL}`,
        f(`SUBTOTAL(9,${col}${primeiraLinhaDados}:${col}${ultimaLinhaDados})`, somasSubtotal[nome]),
        { bold: true }
      )
    }
  }

  ws.views = [{ showGridLines: false, state: "frozen", xSplit: 0, ySplit: LINHA_HEADER }]
}
