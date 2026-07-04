import ExcelJS from "exceljs"
import type { DadosCadastroEmpresa, SimplesNacionalDados } from "./cadastro-parser"

// Aba "Menu" — primeira aba do Excel de Recuperação de Crédito quando o projeto tem dados
// cadastrais importados (Consulta CNPJ, QSA e/ou Consulta Optantes do Simples Nacional).
// Funciona como capa/painel do arquivo: identificação da empresa, CNAEs, situação no Simples
// Nacional (com duração dos períodos) e quadro societário, mais links internos pras demais
// abas. Como precisa ser a PRIMEIRA aba mas os links só existem depois que as outras foram
// montadas, o orquestrador chama criarAbaMenu() antes de tudo e preencherAbaMenu() no final —
// ver src/lib/recuperacao-credito-excel.ts.

const COR = {
  navy: "FF1F3864",
  navyClaro: "FFE7EAEC",
  cinza: "FFF2F2F2",
  branco: "FFFFFFFF",
}

const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

function sc(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bold?: boolean
    align?: "left" | "center" | "right"
    bg?: string
    color?: string
    size?: number
    wrap?: boolean
    border?: boolean
  }
) {
  if (opts.value !== undefined) cell.value = opts.value
  cell.font = { name: "Calibri", bold: opts.bold, size: opts.size ?? 11, color: { argb: opts.color ?? "FF000000" } }
  cell.alignment = { horizontal: opts.align ?? "left", vertical: "middle", wrapText: opts.wrap }
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } }
  if (opts.border) {
    const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } }
    cell.border = { left: thin, right: thin, top: thin, bottom: thin }
  }
}

function arrayBufferParaBase64(buffer: ArrayBuffer): string {
  let binario = ""
  const bytes = new Uint8Array(buffer)
  const tamanhoBloco = 0x8000
  for (let i = 0; i < bytes.length; i += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + tamanhoBloco))
  }
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

function parseDataBR(v: string | null | undefined): Date | null {
  if (!v) return null
  const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

// "3 anos e 4 meses" entre duas datas (fim omitido = hoje) — usado pra responder "foi do
// Simples por quanto tempo?" direto na aba, sem o leitor precisar calcular.
export function duracaoEntre(inicioBR: string | null | undefined, fimBR?: string | null): string {
  const inicio = parseDataBR(inicioBR)
  if (!inicio) return ""
  const fim = fimBR ? parseDataBR(fimBR) : new Date()
  if (!fim) return ""
  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  if (fim.getDate() < inicio.getDate()) meses--
  if (meses < 0) return ""
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const partes: string[] = []
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`)
  if (resto > 0) partes.push(`${resto} ${resto > 1 ? "meses" : "mês"}`)
  if (partes.length === 0) return "menos de 1 mês"
  return partes.join(" e ")
}

// Resumo em uma linha da situação no Simples Nacional, incluindo o caso "já foi e saiu".
export function resumoSimples(sn: SimplesNacionalDados): string {
  const optante = /não\s+optante/i.test(sn.situacao) === false && /optante/i.test(sn.situacao)
  if (optante && sn.optanteDesde) {
    return `${sn.situacao} desde ${sn.optanteDesde} (${duracaoEntre(sn.optanteDesde)})`
  }
  if (!optante && sn.periodosAnteriores.length > 0) {
    const p = sn.periodosAnteriores[sn.periodosAnteriores.length - 1]
    const dur = duracaoEntre(p.inicio, p.fim || null)
    return `${sn.situacao} — já foi optante de ${p.inicio} a ${p.fim || "(em aberto)"}${dur ? ` (${dur})` : ""}`
  }
  return sn.situacao
}

export function criarAbaMenu(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = wb.addWorksheet("Menu", { views: [{ showGridLines: false }] })
  ws.properties.tabColor = { argb: COR.navy }
  return ws
}

export async function preencherAbaMenu(
  ws: ExcelJS.Worksheet,
  wb: ExcelJS.Workbook,
  cadastro: DadosCadastroEmpresa,
  nomeCliente: string
): Promise<void> {
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 62 }, { width: 34 }, { width: 20 }, { width: 16 }]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const cc = cadastro.consultaCnpj
  const qsa = cadastro.qsa
  const sn = cadastro.simplesNacional

  sc(ws.getCell(3, 2), {
    value: `Diagnóstico Tributário — ${cc?.nomeEmpresarial || qsa?.nome || nomeCliente}`,
    bold: true,
    size: 14,
    color: COR.navy,
  })

  let linha = 5

  const banda = (titulo: string) => {
    const row = ws.getRow(linha)
    for (let c = 2; c <= 6; c++) sc(row.getCell(c), { bold: true, color: COR.branco, bg: COR.navy, border: true })
    row.getCell(2).value = titulo
    ws.mergeCells(linha, 2, linha, 6)
    linha++
  }

  const par = (rotulo: string, valor: string | null | undefined) => {
    if (!valor) return
    const row = ws.getRow(linha)
    sc(row.getCell(2), { value: rotulo, bold: true, bg: COR.navyClaro, border: true })
    for (let c = 3; c <= 6; c++) sc(row.getCell(c), { border: true, wrap: true })
    row.getCell(3).value = valor
    ws.mergeCells(linha, 3, linha, 6)
    linha++
  }

  // ── Identificação ────────────────────────────────────────────────────────
  if (cc) {
    banda("IDENTIFICAÇÃO")
    par("CNPJ", `${cc.cnpj} (${cc.matrizFilial})`)
    par("Nome Empresarial", cc.nomeEmpresarial)
    par("Nome Fantasia", cc.nomeFantasia)
    par("Data de Abertura", cc.dataAbertura)
    par("Porte", cc.porte)
    par("Natureza Jurídica", cc.naturezaJuridica)
    par("Município/UF", cc.municipio && cc.uf ? `${cc.municipio}/${cc.uf}` : cc.municipio || cc.uf)
    par(
      "Situação Cadastral",
      cc.situacaoCadastral ? `${cc.situacaoCadastral}${cc.dataSituacaoCadastral ? ` desde ${cc.dataSituacaoCadastral}` : ""}` : null
    )
    linha++
  }

  // ── Atividades (CNAE) ────────────────────────────────────────────────────
  if (cc && (cc.cnaePrincipal || cc.cnaesSecundarios.length > 0)) {
    banda("ATIVIDADE ECONÔMICA (CNAE)")
    if (cc.cnaePrincipal) par("CNAE Principal", `${cc.cnaePrincipal.codigo} — ${cc.cnaePrincipal.descricao}`)
    cc.cnaesSecundarios.forEach((cnae, i) => {
      par(i === 0 ? "CNAEs Secundários" : "", `${cnae.codigo} — ${cnae.descricao}`)
    })
    linha++
  }

  // ── Simples Nacional ─────────────────────────────────────────────────────
  if (sn) {
    banda("SIMPLES NACIONAL")
    par("Situação", resumoSimples(sn))
    if (sn.simei) par("SIMEI", sn.simei)
    if (sn.periodosAnteriores.length > 0) {
      const row = ws.getRow(linha)
      sc(row.getCell(2), { value: "Períodos anteriores", bold: true, bg: COR.navyClaro, border: true })
      sc(row.getCell(3), { value: "Início", bold: true, align: "center", bg: COR.cinza, border: true })
      sc(row.getCell(4), { value: "Fim", bold: true, align: "center", bg: COR.cinza, border: true })
      sc(row.getCell(5), { value: "Duração", bold: true, align: "center", bg: COR.cinza, border: true })
      sc(row.getCell(6), { value: "Detalhe", bold: true, align: "center", bg: COR.cinza, border: true })
      linha++
      for (const p of sn.periodosAnteriores) {
        const r = ws.getRow(linha)
        sc(r.getCell(2), { border: true })
        sc(r.getCell(3), { value: p.inicio, align: "center", border: true })
        sc(r.getCell(4), { value: p.fim || "(em aberto)", align: "center", border: true })
        sc(r.getCell(5), { value: duracaoEntre(p.inicio, p.fim || null), align: "center", border: true })
        sc(r.getCell(6), { value: p.detalhe ?? "", wrap: true, border: true })
        linha++
      }
    }
    sc(ws.getCell(linha, 2), {
      value: `Fonte: ${sn.arquivoNome} (documento escaneado lido por IA — conferir contra o original)`,
      size: 9,
      color: "FF808080",
    })
    linha += 2
  }

  // ── QSA ──────────────────────────────────────────────────────────────────
  if (qsa) {
    banda("QUADRO DE SÓCIOS E ADMINISTRADORES (QSA)")
    if (qsa.responsavel) {
      par("Responsável perante o CNPJ", `${qsa.responsavel.cpf} — ${qsa.responsavel.nome} (${qsa.responsavel.qualificacao})`)
    }
    const cab = ws.getRow(linha)
    sc(cab.getCell(2), { value: "CPF", bold: true, align: "center", bg: COR.cinza, border: true })
    sc(cab.getCell(3), { value: "Nome", bold: true, align: "center", bg: COR.cinza, border: true })
    sc(cab.getCell(4), { value: "Qualificação", bold: true, align: "center", bg: COR.cinza, border: true })
    sc(cab.getCell(5), { value: "Capital Social", bold: true, align: "center", bg: COR.cinza, border: true })
    sc(cab.getCell(6), { value: "Situação CPF", bold: true, align: "center", bg: COR.cinza, border: true })
    linha++
    for (const socio of qsa.socios) {
      const r = ws.getRow(linha)
      sc(r.getCell(2), { value: socio.cpf, align: "center", border: true })
      sc(r.getCell(3), { value: socio.nome, border: true })
      sc(r.getCell(4), { value: socio.qualificacao, border: true })
      sc(r.getCell(5), { value: socio.capitalSocial, align: "center", border: true })
      sc(r.getCell(6), { value: socio.situacaoCadastral, align: "center", border: true })
      linha++
    }
    linha++
  }

  // ── Navegação: links internos pras demais abas ───────────────────────────
  const outrasAbas = wb.worksheets.map((w) => w.name).filter((n) => n !== ws.name)
  if (outrasAbas.length > 0) {
    banda("ABAS DESTE ARQUIVO")
    for (const nome of outrasAbas) {
      const row = ws.getRow(linha)
      sc(row.getCell(2), { border: true })
      row.getCell(2).value = { text: nome, hyperlink: `#'${nome}'!A1` }
      row.getCell(2).font = { name: "Calibri", size: 11, color: { argb: "FF0563C1" }, underline: true }
      for (let c = 3; c <= 6; c++) sc(row.getCell(c), { border: true })
      ws.mergeCells(linha, 2, linha, 6)
      linha++
    }
  }
}
