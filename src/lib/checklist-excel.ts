import ExcelJS from "exceljs"

// Aba "Checklist" — adicionada em TODO Excel gerado pela Recuperação de Crédito (Simples
// Nacional, ICMS/IPI, PIS/COFINS e no arquivo combinado). Réplica visual de um checklist de
// diagnóstico usado manualmente pela equipe (arquivo de referência do usuário), com sua própria
// paleta (navy/cinza), diferente da paleta azul/cinza clara dos outros módulos — decisão
// deliberada: reproduzir o visual do arquivo de origem, só trocando a logo.
//
// ESTADO ATUAL — dados estáticos: os tópicos, categorias e textos de contingência abaixo são os
// mesmos do arquivo de referência, fixos no código. As colunas "Situação" (D para Oportunidade,
// G para Contingência) ficam em branco (só estilizadas, prontas para receber 🌟/☠️).
//
// TRABALHO FUTURO (ainda não implementado): a plataforma vai analisar automaticamente os dados
// já importados do cliente (PGDAS, EFD ICMS/IPI, EFD Contribuições, etc.) e preencher sozinha as
// colunas D e G: 🌟 quando o tópico indicar oportunidade/contingência real para aquele cliente,
// ☠️ quando não indicar. Ver docs/recuperacao-credito.md.

const LOGO_URL = "/icons/taxhub_logo_principal_claro_transparente.png"

const COR = {
  navy: "FF0E2841",
  navyClaro: "FFE7EAEC", // tint ~0.9 do navy — faixa de categoria
  cinzaSituacao: "FFF2F2F2", // fundo das células de "Situação" (D/G), ainda vazias
  estrela: "FFC3BF1B",
}

function sc(
  cell: ExcelJS.Cell,
  opts: {
    value?: ExcelJS.CellValue
    bold?: boolean
    align?: "left" | "center" | "right"
    valign?: "top" | "middle" | "bottom"
    bg?: string
    color?: string
    size?: number
    wrap?: boolean
    border?: boolean
  }
) {
  if (opts.value !== undefined) cell.value = opts.value
  cell.font = { name: "Calibri", bold: opts.bold, size: opts.size ?? 11, color: { argb: opts.color ?? "FF000000" } }
  cell.alignment = { horizontal: opts.align ?? "left", vertical: opts.valign ?? "middle", wrapText: opts.wrap }
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } }
  if (opts.border) {
    const thin = { style: "thin" as const, color: { argb: "FF000000" } }
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

type Situacao = "estrela" | "caveira"

interface ChecklistItem {
  oportunidade: string
  contingencia?: string
  situacaoOportunidade?: Situacao
  observacaoOportunidade?: string
  situacaoContingencia?: Situacao
  observacaoContingencia?: string
}

interface ChecklistCategoria {
  nome: string
  itens: ChecklistItem[]
}

// Fonte: checklist de diagnóstico usado manualmente pela equipe (arquivo de referência do
// usuário) — tópicos e textos de contingência fixos, revisados pela equipe tributária.
const CATEGORIAS: ChecklistCategoria[] = [
  {
    nome: "SIMPLES NACIONAL",
    itens: [
      { oportunidade: "Tributação Incorreta de Produtos - Solicitando XML", contingencia: "Tributando de maneira incorreta " },
    ],
  },
  {
    nome: "PIS E COFINS INSUMOS/MERC. PARA REVENDA",
    itens: [
      { oportunidade: "Insumos com crédito não tomado (Empresa Lucro Real) - 865", contingencia: "Verificar se está se creditando de compras as quais não são tributadas" },
      { oportunidade: "Crédito com energia elétrica (EFD Cont. X Contabilidade)", contingencia: "Verificar se está se apropriando de um crédito indevido de Energia, conferir Balancete ou EFD ICMS IPI" },
      { oportunidade: "Crédito com depreciação (EFD Cont. X Contabilidade)", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Crédito com aluguel máquinas, equipamentos (EFD Cont. X Contabilidade) - Locação de Imóvel confirmar se é PF", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Crédito com devolução de Vendas (EFD Cont. X Contabilidade)", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Crédito com serviços tomados (EFD Cont. X Contabilidade)", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "NF não escriturada (EFD ICMS x EFD Cont) de acordo com a jurisprudência do CARF - 865", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Fretes", contingencia: "Verificar se está se creditando indevidamente " },
    ],
  },
  {
    nome: "REVISÃO DE BASE DE CÁLCULO",
    itens: [
      { oportunidade: "Receitas com tributação monofásica tributadas no EFD Contribuição", contingencia: "Se está se creditando de mercadorias ST/Monofásico" },
      { oportunidade: "Receitas com produtos alíquota Zero/ Substituição Tributária/Suspensão/Isenção", contingencia: "Se está se creditando de mercadorias ST/Monofásico" },
      { oportunidade: "Exclusão do ICMS normal da base de cálculo do PIS e COFINS - 901", contingencia: "Verificar se está se apropriando indevidamente da base cheia do PIS/COFINS, sem deduzir o ICMS" },
      { oportunidade: "Exclusão do ICMS ST da base de cálculo do PIS e COFINS", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Exclusão do ICMS DIFAL da base de cálculo do PIS e COFINS (GNRE também - Conforme SC nº 8.007, de 2026)" },
      { oportunidade: "Exportação", contingencia: "Não há possibilidade de contingência" },
      { oportunidade: "Operações que não incidem PIS e COFINS", contingencia: "Se creditando de operações que não permitem crédito" },
      { oportunidade: "Operações com empresas beneficiadas do REIDI" },
      { oportunidade: "Mudança de Regime - Inventário", contingencia: "Se houve apropriação de crédito de abertura de estoque em um valor superior " },
    ],
  },
  {
    nome: "DEVOLUÇÕES DE VENDA PRESUMIDO",
    itens: [
      { oportunidade: "Crédito de devoluções de venda", contingencia: "Inclusão de devolução de venda com valor superior ao real" },
    ],
  },
  {
    nome: "IMPORTAÇÃO",
    itens: [
      { oportunidade: "Verificação de NF´s de Importação creditadas", contingencia: "Verificar se está se creditando indevidamente " },
    ],
  },
  {
    nome: "CRÉDITO PRESUMIDO",
    itens: [
      { oportunidade: "Produtos com crédito presumido (Agroindustria)", contingencia: "Verificar se está se creditando indevidamente " },
    ],
  },
  {
    nome: "SALDO CREDOR",
    itens: [
      { oportunidade: "Empresa possui saldo credor acumulado", contingencia: "Verificar se está se creditando indevidamente " },
      { oportunidade: "Descontinuidade de saldo credor acumulado", contingencia: "Verificar se está se creditando indevidamente " },
    ],
  },
  {
    nome: "RETENÇÕES",
    itens: [
      { oportunidade: "Fontes pagadoras x utilizado nas apurações", contingencia: "Utilização incorreta de retenções no abatimento dos tributos" },
    ],
  },
  {
    nome: "PAGAMENTOS",
    itens: [
      { oportunidade: "Pagamentos realizados no e-CAC x Tributos devidos", contingencia: "Pagamento inferior ao devido" },
    ],
  },
  {
    nome: "REINTEGRA",
    itens: [
      { oportunidade: "Levantamento dos saldos de créditos com Reintegra (Empresas com exportação, tem direito)", contingencia: "Verificar se está se creditando indevidamente " },
    ],
  },
  {
    nome: "IPI",
    itens: [
      { oportunidade: "Crédito presumido com atacadistas" },
      { oportunidade: "Valores a recuperar de IPI com insumos, embalagens, Matéria Prima etc" },
      { oportunidade: "Crédito de IPI nas importações" },
      { oportunidade: "Saldo credor acumulado de IPI" },
      { oportunidade: "Crédito presumido de IPI para os exportadores (Pescados)" },
      { oportunidade: "Descontinuidade do saldo credor" },
    ],
  },
  {
    nome: "IRPJ/CSLL",
    itens: [
      { oportunidade: "Subvenções de ICMS" },
      { oportunidade: "Fontes Pagadoras x valor utilizado nas apurações" },
      { oportunidade: "PCLD" },
      { oportunidade: "JCSP" },
      { oportunidade: "PAT" },
      { oportunidade: "Lei do Bem" },
      { oportunidade: "Lucro Presumido - % Presunção" },
      { oportunidade: "Falta de Utilização do Prejuízo Acumulado" },
      { oportunidade: "Falta de Exclusão de: \"Subvenções, prêmios, provisões, receitas, saldo negativo, Perdas de Recebimento de Clientes Duvidosos, JCP,...\"" },
    ],
  },
  {
    nome: "Bônus de Adimplência",
    itens: [
      {
        oportunidade: "Bônus de 5% no CSLL - Lucro Presumido apenas",
        situacaoOportunidade: "caveira",
        observacaoOportunidade: "Sem oportunidade",
        contingencia: "Utilização indevida ",
      },
    ],
  },
]

// Itens de revisão manual — sempre "☠️" na Situação: não são analisáveis a partir dos arquivos
// importados (exigem checagem em outros sistemas/portais), por isso nunca recebem 🌟 automático.
const EXTRAS = [
  "Analisar contingências de entregas de Obrigações Acessórias",
  "Analisar contingências de Obrigações Principais",
  "Analisar Possibilidade de Transação",
  "Analisar Relação de QSA - Soma de Faturamento",
]

export async function montarAbaChecklist(wb: ExcelJS.Workbook, nomeCliente: string): Promise<void> {
  const ws = wb.addWorksheet("Checklist", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 5 }],
  })
  ws.properties.tabColor = { argb: "FFBF8F00" }

  ws.columns = [
    { width: 3 },
    { width: 6 },
    { width: 60 },
    { width: 13 },
    { width: 38 },
    { width: 50 },
    { width: 13 },
    { width: 38 },
  ]

  ws.getRow(1).height = 60
  const logoBase64 = await carregarLogoBase64()
  if (logoBase64) {
    const imageId = wb.addImage({ base64: `data:image/png;base64,${logoBase64}`, extension: "png" })
    ws.addImage(imageId, { tl: { col: 1, row: 0 }, ext: { width: 140, height: 74 } })
  }

  const nomeCurto = nomeCliente.trim().split(/\s+/)[0] || nomeCliente
  sc(ws.getCell(3, 2), { value: `Checklist - Diagnóstico - ${nomeCurto}`, bold: true, size: 12 })

  const ROW_HEADER = 5
  const headerRow = ws.getRow(ROW_HEADER)
  const headers = ["id", "Oportunidade", "Situação", "Observações", "Contingência", "Situação", "Observações"]
  headers.forEach((h, i) => {
    sc(headerRow.getCell(i + 2), { value: h, bold: true, align: "center", color: "FFFFFFFF", bg: COR.navy, border: true })
  })

  let linha = ROW_HEADER + 1

  const iconeValor = (s: Situacao | undefined) => (s === "estrela" ? "🌟" : s === "caveira" ? "☠️" : null)
  const corIcone = (s: Situacao | undefined) => (s === "estrela" ? COR.estrela : "FF000000")

  for (const categoria of CATEGORIAS) {
    // Estiliza TODAS as células do range antes de mesclar — mesclar faz as células
    // compartilharem o mesmo objeto de estilo internamente no ExcelJS, então estilizar de novo
    // depois (ex.: só a cor de fundo) sobrescreve negrito/alinhamento da célula mestre.
    const bandRow = ws.getRow(linha)
    for (let c = 2; c <= 8; c++) {
      sc(bandRow.getCell(c), { bold: true, align: "center", color: COR.navy, bg: COR.navyClaro, border: true })
    }
    bandRow.getCell(2).value = categoria.nome
    ws.mergeCells(linha, 2, linha, 8)
    linha++

    categoria.itens.forEach((item, idx) => {
      const row = ws.getRow(linha)
      sc(row.getCell(2), { value: idx + 1, align: "center", border: true })
      sc(row.getCell(3), { value: item.oportunidade, align: "left", wrap: true, border: true })
      sc(row.getCell(4), {
        value: iconeValor(item.situacaoOportunidade),
        align: "center",
        size: 12,
        color: corIcone(item.situacaoOportunidade),
        bg: COR.cinzaSituacao,
        wrap: true,
        border: true,
      })
      sc(row.getCell(5), { value: item.observacaoOportunidade ?? null, align: "center", wrap: true, border: true })
      sc(row.getCell(6), { value: item.contingencia ?? null, align: "left", wrap: true, border: true })
      sc(row.getCell(7), {
        value: iconeValor(item.situacaoContingencia),
        align: "center",
        size: 12,
        color: corIcone(item.situacaoContingencia),
        bg: COR.cinzaSituacao,
        wrap: true,
        border: true,
      })
      sc(row.getCell(8), { value: item.observacaoContingencia ?? null, align: "center", wrap: true, border: true })
      linha++
    })
  }

  linha++
  sc(ws.getCell(linha, 2), { value: "Extras (revisão manual):", bold: true, color: COR.navy })
  linha++

  for (const extra of EXTRAS) {
    const row = ws.getRow(linha)
    sc(row.getCell(2), { value: `- ${extra};`, align: "left", wrap: true })
    ws.mergeCells(linha, 2, linha, 3)
    sc(row.getCell(4), { value: "☠️", align: "center", size: 12, bg: COR.cinzaSituacao, wrap: true, border: true })
    linha++
  }

  linha += 2
  sc(ws.getCell(linha, 2), { value: "Legenda:", bold: true, color: COR.navy })
  linha++
  sc(ws.getCell(linha, 2), { value: "☠️  Sem oportunidade / sem contingência identificada", align: "left" })
  linha++
  sc(ws.getCell(linha, 2), { value: "🌟  Com oportunidade / com contingência identificada", align: "left" })
}
