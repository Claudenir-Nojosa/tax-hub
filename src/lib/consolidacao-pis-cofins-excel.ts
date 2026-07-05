import ExcelJS from "exceljs"
import type { DeclaracaoEfdContribuicoesRegistro, RefsDebitoPisCofins } from "./efd-contribuicoes-excel"
import type { DeclaracaoEcfRegistro, RefsDebitoEcf } from "./ecf-excel"
import type { DeclaracaoDctfRegistro, DeclaracaoDctfWebRegistro } from "./dctf-excel"
import type { DadosComprovantePagamento } from "./comprovante-pagamento-parser"
import { labelTributo } from "./comprovante-pagamento-parser"
import { NOME_ABA_SELIC, selicAcumuladaParaPeriodo } from "./selic-excel"

// Abas de consolidação de créditos tributários — réplica do WP de diagnóstico do usuário:
//   "PIS e COFINS": uma linha por tributo × competência MENSAL da EFD Contribuições.
//   "IRPJ e CSLL": uma linha por tributo × TRIMESTRE da ECF (Lucro Presumido); o período (col E)
//     é o 1º dia do ÚLTIMO mês do trimestre (mar/jun/set/dez) — é assim que o débito aparece na
//     DCTF/DCTFWeb (competência do fechamento) e no DARF (PA impresso 31/03 → PA normalizado
//     01/03), então os mesmos SOMASES casam sem tratamento especial.
// As duas compartilham o mesmo layout e as mesmas fórmulas (núcleo genérico
// montarAbaConsolidacao), TUDO em fórmula (pedido explícito) pra o analista poder mexer em
// "Novo Débito"/restituído/parcelado/Dcomp e ver Crédito/Contingência/Atualização recalcularem.
//
// De onde vem cada coluna:
//   F (Apuração Débito Original) → referência direta à célula de débito da aba de origem:
//     PIS/COFINS = "$ Valor da Contribuição a Recolher" (validado contra o WP real: COFINS
//     04/2021 = 224,91 = valorARecolher); IRPJ/CSLL = "$ IMPOSTO DE RENDA/CSLL A PAGAR" da ECF.
//   I (DCTF) → SOMASES na aba DCTF (V=Vlr Débito Apurado, S=Tributo, D=PA) e/ou na DCTFWeb
//     (O=Vlr Débito Apurado, K=Tributo, E=PA) — a partir de 2025 a apuração migra pra DCTFWeb,
//     mas como cada competência só existe numa das duas, a soma das duas resolve sem SE por ano.
//   K (Pgto DARF) → SOMASES na aba Comprovante de Pagamentos (U=Vlr Principal, S=Tributo, F=PA).
//   S (Atualização) → PROCV(FIMMÊS(E;1); Selic!B:F; 5; 0) * Q — igual ao WP.
//   L/M/N (restituído/parcelado/Dcomp) → 0 por enquanto (pedido do usuário), editáveis à mão.
// As colunas de fórmula levam `result` pré-calculado em JS pra visualizadores que não recalculam.

const BRL = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-'
const COR_HEADER_BG = "FF0E2841"
const COR_HEADER_TEXTO = "FFFFFFFF"
const TAB_COLOR = "FF1F3864"
const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

const NOME_ABA_DCTF = "DCTF"
const NOME_ABA_DCTFWEB = "DCTFWeb"
const NOME_ABA_COMPROVANTE = "Comprovante de Pagamentos"

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const bloco = 0x8000
  for (let i = 0; i < bytes.length; i += bloco) binario += String.fromCharCode(...bytes.subarray(i, i + bloco))
  return btoa(binario)
}

async function carregarLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) return null
    return arrayBufferParaBase64(await res.arrayBuffer())
  } catch {
    return null
  }
}

interface FontesLookup {
  dctf?: DeclaracaoDctfRegistro[]
  dctfWeb?: DeclaracaoDctfWebRegistro[]
  comprovantes?: DadosComprovantePagamento[]
}

export interface DadosConsolidacaoPisCofins extends FontesLookup {
  declaracoes: DeclaracaoEfdContribuicoesRegistro[]
  refsDebito: RefsDebitoPisCofins
}

export interface DadosConsolidacaoIrpjCsll extends FontesLookup {
  declaracoes: DeclaracaoEcfRegistro[]
  refsDebito: RefsDebitoEcf
}

// linha da consolidação com os resultados pré-calculados em JS (mesma conta das fórmulas)
interface LinhaConsolidacao {
  cnpj: string
  tributo: string
  competencia: string // "YYYY-MM" — mês que casa com o PA das abas DCTF/DCTFWeb/Comprovante
  periodo: Date
  refDebitoOriginal: string // ex.: "'COFINS'!F40"
  debitoOriginal: number
  dctf: number
  darf: number
}

function somaDctf(tributo: string, competencia: string, dctf: DeclaracaoDctfRegistro[], dctfWeb: DeclaracaoDctfWebRegistro[]): number {
  let soma = 0
  for (const d of dctf) {
    if (d.competencia !== competencia) continue
    for (const deb of d.dados.debitos) if (deb.tributo === tributo) soma += deb.valorDebito ?? 0
  }
  for (const d of dctfWeb) {
    if (d.competencia !== competencia) continue
    for (const deb of d.dados.debitos) if (deb.tributo === tributo) soma += deb.debitoApurado
  }
  return soma
}

function somaDarf(tributo: string, competencia: string, comprovantes: DadosComprovantePagamento[]): number {
  let soma = 0
  for (const darf of comprovantes) {
    const m = darf.periodoApuracao.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m || `${m[3]}-${m[2]}` !== competencia) continue
    for (const cod of darf.codigos) if (labelTributo(cod.codigo) === tributo) soma += cod.principal
  }
  return soma
}

// Núcleo comum das duas consolidações: mesma tabela, mesmas colunas B..T, mesmas fórmulas.
async function montarAbaConsolidacao(
  wb: ExcelJS.Workbook,
  opts: {
    nomeAba: string
    nomeTabela: string
    titulo: string
    rotuloFonte: "EFD" | "ECF" // aparece nos cabeçalhos "Dif Cred …", "Dif DCTF x …", "DARF x … Orig"
    linhas: LinhaConsolidacao[]
    fontes: FontesLookup
  }
): Promise<void> {
  const { linhas } = opts
  if (linhas.length === 0) return
  const temDctf = (opts.fontes.dctf?.length ?? 0) > 0
  const temDctfWeb = (opts.fontes.dctfWeb?.length ?? 0) > 0
  const temComprovante = (opts.fontes.comprovantes?.length ?? 0) > 0

  const ws = wb.addWorksheet(opts.nomeAba, { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: TAB_COLOR }
  ws.columns = [
    { width: 3 }, // A
    { width: 17 }, // B CNPJ
    { width: 10 }, // C Tributo
    { width: 8 }, // D ANO
    { width: 11 }, // E Período
    { width: 15 }, // F Apuração Débito Original
    { width: 15 }, // G Novo Débito
    { width: 13 }, // H Dif Cred EFD
    { width: 15 }, // I DCTF
    { width: 14 }, // J Dif DCTF x EFD
    { width: 15 }, // K Pgto DARF
    { width: 14 }, // L Valor já restituído
    { width: 13 }, // M Parcelado
    { width: 13 }, // N Dcomp
    { width: 15 }, // O DARF x EFD Orig
    { width: 16 }, // P DIF DCTF x DARF x Dcomp
    { width: 15 }, // Q Crédito
    { width: 15 }, // R Contingência
    { width: 15 }, // S Atualização
    { width: 15 }, // T Pagamento Indev
  ]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const titulo = ws.getCell(5, 2)
  titulo.value = opts.titulo
  titulo.font = { name: "Calibri", bold: true, size: 12 }

  const LINHA_HEADER = 7
  const colunas = [
    "CNPJ", "Tributo", "ANO", "Período", "Apuração Débito Original", "Novo Débito", `Dif Cred ${opts.rotuloFonte}`, "DCTF",
    `Dif DCTF x ${opts.rotuloFonte}`, "Pgto DARF", "Valor já restituído", "Parcelado", "Dcomp", `DARF x ${opts.rotuloFonte} Orig`,
    "DIF DCTF x DARF x Dcomp", "Crédito", "Contingência", "Atualização", "Pagamento Indev",
  ]

  ws.addTable({
    name: opts.nomeTabela,
    ref: `B${LINHA_HEADER}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: colunas.map((name) => ({ name, filterButton: true })),
    // placeholders — as células de fórmula são sobrescritas logo abaixo
    rows: linhas.map((l) => [l.cnpj, l.tributo, 0, l.periodo, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  })

  const primeiraLinha = LINHA_HEADER + 1
  const f = (formula: string, result: number | Date): ExcelJS.CellFormulaValue =>
    ({ formula, result }) as ExcelJS.CellFormulaValue

  linhas.forEach((l, i) => {
    const r = primeiraLinha + i
    const row = ws.getRow(r)

    row.getCell(4).value = f(`YEAR(E${r})`, l.periodo.getUTCFullYear()) // D ANO
    row.getCell(5).numFmt = "mm/yyyy" // E Período (valor já veio da tabela)

    row.getCell(6).value = f(l.refDebitoOriginal, l.debitoOriginal) // F
    row.getCell(7).value = f(`F${r}`, l.debitoOriginal) // G Novo Débito
    row.getCell(8).value = f(`F${r}-G${r}`, 0) // H Dif Cred EFD

    // I DCTF: soma DCTF + DCTFWeb (só as abas presentes; competência vive em uma delas)
    const partesDctf: string[] = []
    if (temDctf) partesDctf.push(`SUMIFS('${NOME_ABA_DCTF}'!$V:$V,'${NOME_ABA_DCTF}'!$S:$S,$C${r},'${NOME_ABA_DCTF}'!$D:$D,$E${r})`)
    if (temDctfWeb)
      partesDctf.push(`SUMIFS('${NOME_ABA_DCTFWEB}'!$O:$O,'${NOME_ABA_DCTFWEB}'!$K:$K,$C${r},'${NOME_ABA_DCTFWEB}'!$E:$E,$E${r})`)
    row.getCell(9).value = partesDctf.length > 0 ? f(partesDctf.join("+"), l.dctf) : 0

    const jRes = Math.abs(Math.round((l.debitoOriginal - l.dctf) * 100) / 100) <= 0.01 ? 0 : Math.round((l.debitoOriginal - l.dctf) * 100) / 100
    row.getCell(10).value = f(`IF(ABS(ROUND(F${r}-I${r},2))<=0.01,0,ROUND(F${r}-I${r},2))`, jRes) // J

    row.getCell(11).value = temComprovante
      ? f(
          `SUMIFS('${NOME_ABA_COMPROVANTE}'!$U:$U,'${NOME_ABA_COMPROVANTE}'!$S:$S,$C${r},'${NOME_ABA_COMPROVANTE}'!$F:$F,$E${r})`,
          l.darf
        )
      : 0 // K Pgto DARF

    row.getCell(12).value = 0 // L Valor já restituído
    row.getCell(13).value = 0 // M Parcelado
    row.getCell(14).value = 0 // N Dcomp

    row.getCell(15).value = f(`SUM(+F${r}-K${r}+L${r}-M${r}-N${r})`, l.debitoOriginal - l.darf) // O
    row.getCell(16).value = f(`I${r}-K${r}-M${r}+L${r}-N${r}`, l.dctf - l.darf) // P

    const base = l.darf - l.debitoOriginal // K-L+M+N-G com L=M=N=0
    row.getCell(17).value = f(`IF((K${r}-L${r}+M${r}+N${r}-G${r})<0,0,K${r}-L${r}+M${r}+N${r}-G${r})`, base < 0 ? 0 : base) // Q
    row.getCell(18).value = f(`IF((K${r}-L${r}+M${r}+N${r}-G${r})<0,K${r}-L${r}+M${r}+N${r}-G${r},0)`, base < 0 ? base : 0) // R

    const acumulada = selicAcumuladaParaPeriodo(l.competencia)
    const credito = base < 0 ? 0 : base
    const sRes = acumulada === null ? 0 : Math.round(acumulada * credito * 100) / 100
    row.getCell(19).value = f(
      `ROUND(VLOOKUP(EOMONTH(E${r},1),'${NOME_ABA_SELIC}'!$B:$F,5,0)*Q${r},2)`,
      sRes
    ) // S Atualização
    row.getCell(20).value = f(`S${r}+Q${r}`, sRes + credito) // T Pagamento Indev

    for (let c = 2; c <= 20; c++) {
      const cell = row.getCell(c)
      cell.font = { name: "Calibri", size: 10 }
      cell.alignment = { horizontal: "center", vertical: "middle" }
      if (c >= 6) cell.numFmt = BRL
    }
  })

  // Linha de SUBTOTAL (respeita filtro) acima do cabeçalho, F..T (colunas 6..20)
  const ROW_SUBTOTAL = LINHA_HEADER - 1
  const ultimaLinha = primeiraLinha + linhas.length - 1
  for (let c = 6; c <= 20; c++) {
    const letra = ws.getCell(LINHA_HEADER, c).address.replace(/\d+$/, "")
    const cell = ws.getCell(ROW_SUBTOTAL, c)
    cell.value = { formula: `SUBTOTAL(9,${letra}${primeiraLinha}:${letra}${ultimaLinha})` } as ExcelJS.CellFormulaValue
    cell.font = { name: "Calibri", bold: true, size: 11 }
    cell.numFmt = BRL
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  const headerRow = ws.getRow(LINHA_HEADER)
  for (let c = 2; c <= 20; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COR_HEADER_TEXTO } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } }
  }

  // sem congelamento de painéis nas consolidações (pedido do usuário) — só oculta as gridlines
}

export async function montarAbaConsolidacaoPisCofins(wb: ExcelJS.Workbook, dados: DadosConsolidacaoPisCofins): Promise<void> {
  const porCompetencia = new Map(dados.declaracoes.map((d) => [d.competencia, d.dados]))

  // mesma ordem do WP de referência: bloco COFINS inteiro, depois bloco PIS
  const linhas: LinhaConsolidacao[] = []
  for (const tributo of ["COFINS", "PIS"] as const) {
    for (const comp of dados.refsDebito.competencias) {
      const decl = porCompetencia.get(comp)
      if (!decl) continue
      const apuracao = tributo === "PIS" ? decl.apuracaoPis : decl.apuracaoCofins
      const m = comp.match(/^(\d{4})-(\d{2})$/)
      if (!m) continue
      linhas.push({
        cnpj: decl.cnpj,
        tributo,
        competencia: comp,
        periodo: new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)),
        refDebitoOriginal: dados.refsDebito.celulaPorTributo[tributo][comp],
        debitoOriginal: apuracao?.valorARecolher ?? 0,
        dctf: somaDctf(tributo, comp, dados.dctf ?? [], dados.dctfWeb ?? []),
        darf: somaDarf(tributo, comp, dados.comprovantes ?? []),
      })
    }
  }

  await montarAbaConsolidacao(wb, {
    nomeAba: "PIS e COFINS",
    nomeTabela: "ConsolidacaoPisCofins",
    titulo: "Consolidação de Créditos Tributários - PIS e COFINS",
    rotuloFonte: "EFD",
    linhas,
    fontes: dados,
  })
}

// trimestre da ECF ("T01".."T04") → mês em que o débito fecha (competência da DCTF/DCTFWeb e mês
// do PA impresso no DARF: 31/03 → 01/03 etc.)
const MES_FIM_TRIMESTRE: Record<string, string> = { T01: "03", T02: "06", T03: "09", T04: "12" }

export async function montarAbaConsolidacaoIrpjCsll(wb: ExcelJS.Workbook, dados: DadosConsolidacaoIrpjCsll): Promise<void> {
  const ordenadas = [...dados.declaracoes].sort((a, b) => a.competencia.localeCompare(b.competencia))

  const linhas: LinhaConsolidacao[] = []
  for (const tributo of ["IRPJ", "CSLL"] as const) {
    for (const decl of ordenadas) {
      const periodos = [...decl.dados.periodos].sort((a, b) => a.periodo.localeCompare(b.periodo))
      for (const p of periodos) {
        const mesFim = MES_FIM_TRIMESTRE[p.periodo]
        if (!mesFim) continue // "A00" (anual) fica de fora — sem amostra validada de PA anual
        const ref = dados.refsDebito.celulaPorTributo[tributo][`${decl.dados.anoCalendario}-${p.periodo}`]
        if (!ref) continue
        const competencia = `${decl.dados.anoCalendario}-${mesFim}`
        linhas.push({
          cnpj: decl.dados.cnpj,
          tributo,
          competencia,
          periodo: new Date(Date.UTC(Number(decl.dados.anoCalendario), Number(mesFim) - 1, 1)),
          refDebitoOriginal: ref.celula,
          debitoOriginal: ref.valor,
          dctf: somaDctf(tributo, competencia, dados.dctf ?? [], dados.dctfWeb ?? []),
          darf: somaDarf(tributo, competencia, dados.comprovantes ?? []),
        })
      }
    }
  }

  await montarAbaConsolidacao(wb, {
    nomeAba: "IRPJ e CSLL",
    nomeTabela: "ConsolidacaoIrpjCsll",
    titulo: "Consolidação de Créditos Tributários - IRPJ e CSLL",
    rotuloFonte: "ECF",
    linhas,
    fontes: dados,
  })
}
