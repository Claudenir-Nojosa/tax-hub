"use client"

import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import { ANOS_QUADRO, type QuadroComparativoAno } from "@/lib/reforma-excel/quadro-comparativo"
import { REDUCAO_ICMS_ISS } from "@/lib/reforma-excel/calculo-linha-ano"

// PDF executivo da Reforma Tributária — gerado 100% no navegador (jspdf + jspdf-autotable via
// import dinâmico, mesmo padrão de src/components/planejador/ExportButtons.tsx). Seções: capa,
// dados da empresa, premissas, legislações (texto salvo pelo usuário), quadro comparativo
// (números de calcularQuadroComparativo — a MESMA fonte dos caches do Excel) e considerações
// finais (texto salvo). Os textos vêm de parametrosExtra.pdfLegislacoes/pdfConsideracoes.

export interface DadosPdfReforma {
  empresa: EmpresaData
  nomeProjeto?: string | null
  premissas: PremissasReformaData
  textoLegislacoes: string
  textoConsideracoes: string
  quadro: Record<number, QuadroComparativoAno>
}

const AZUL: [number, number, number] = [31, 56, 100] // azul-marinho da identidade do Excel (1F3864)
const AZUL_CLARO: [number, number, number] = [221, 235, 247] // DDEBF7
const SALMAO: [number, number, number] = [252, 228, 214] // FCE4D6 (DÉBITO)
const VERDE: [number, number, number] = [226, 239, 218] // E2EFDA (CRÉDITO)
const CINZA_TXT: [number, number, number] = [60, 60, 60]

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_I: "Simples Nacional — Anexo I",
  SIMPLES_II: "Simples Nacional — Anexo II",
  SIMPLES_III: "Simples Nacional — Anexo III",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

const fmtRS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")}%`

// Logo (do cliente em data URL, ou a padrão do TaxHub) + proporção medida no navegador
async function carregarLogo(logoDataUrl?: string | null): Promise<{ dataUrl: string; ratio: number } | null> {
  try {
    let dataUrl = logoDataUrl ?? null
    if (!dataUrl) {
      const res = await fetch("/icons/taxhub_logo_principal_claro_transparente.png")
      if (!res.ok) return null
      const blob = await res.blob()
      dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(r.error)
        r.readAsDataURL(blob)
      })
    }
    const ratio = await new Promise<number>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1.9)
      img.onerror = () => reject(new Error("logo inválida"))
      img.src = dataUrl!
    })
    return { dataUrl, ratio }
  } catch {
    return null
  }
}

export async function gerarPdfReforma(dados: DadosPdfReforma): Promise<void> {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margem = 16
  const nomeProjeto = dados.nomeProjeto?.trim() || `Reforma Tributária - ${dados.empresa.razaoSocial || "Empresa"}`

  // ------------------------------------------------------------------ CAPA
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, pageW, pageH, "F")
  // cartão branco central com a logo
  const logo = await carregarLogo(dados.empresa.logoDataUrl)
  if (logo) {
    const lw = Math.min(70, 26 * logo.ratio)
    const lh = lw / logo.ratio
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(pageW / 2 - (lw + 16) / 2, 52, lw + 16, lh + 14, 3, 3, "F")
    const tipo = /^data:image\/jpe?g/.test(logo.dataUrl) ? "JPEG" : "PNG"
    doc.addImage(logo.dataUrl, tipo, pageW / 2 - lw / 2, 59, lw, lh)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("RELATÓRIO EXECUTIVO", pageW / 2, 118, { align: "center" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.text(doc.splitTextToSize(nomeProjeto, pageW - 2 * margem), pageW / 2, 132, { align: "center" })
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.6)
  doc.line(pageW / 2 - 28, 148, pageW / 2 + 28, 148)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.text(dados.empresa.razaoSocial || "", pageW / 2, 160, { align: "center" })
  doc.setFontSize(10)
  doc.setTextColor(200, 214, 235)
  doc.text(formatCNPJ(dados.empresa.cnpj), pageW / 2, 168, { align: "center" })
  doc.text("Impactos da Reforma Tributária — EC 132/2023 · LC 214/2025", pageW / 2, 186, { align: "center" })
  doc.text(
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    pageW / 2, pageH - 24, { align: "center" }
  )

  // helper de título de seção
  let secao = 0
  const tituloSecao = (titulo: string, y: number): number => {
    secao++
    doc.setFillColor(...AZUL)
    doc.rect(margem, y - 5.2, 2.2, 7, "F")
    doc.setTextColor(...AZUL)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`${secao}. ${titulo}`, margem + 5, y)
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.3)
    doc.line(margem, y + 3, pageW - margem, y + 3)
    return y + 10
  }

  // texto longo com quebra de página automática
  const escreverTexto = (texto: string, y: number): number => {
    doc.setTextColor(...CINZA_TXT)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10.5)
    const linhas: string[] = doc.splitTextToSize(texto, pageW - 2 * margem)
    for (const linha of linhas) {
      if (y > pageH - 22) { doc.addPage("a4", "portrait"); y = 24 }
      doc.text(linha, margem, y)
      y += 5.4
    }
    return y
  }

  // -------------------------------------------------------- DADOS DA EMPRESA
  doc.addPage("a4", "portrait")
  let y = tituloSecao("Dados da empresa", 24)
  const linhasEmpresa: [string, string][] = [
    ["Razão social", dados.empresa.razaoSocial || "—"],
    ...(dados.empresa.nomeFantasia ? [["Nome fantasia", dados.empresa.nomeFantasia] as [string, string]] : []),
    ["CNPJ", formatCNPJ(dados.empresa.cnpj)],
    ["UF / Município", [dados.empresa.uf, dados.empresa.municipio].filter(Boolean).join(" / ") || "—"],
    ["Regime tributário", REGIME_LABELS[dados.empresa.regime] ?? dados.empresa.regime],
    ...(dados.empresa.cnaePrincipal
      ? [["CNAE principal", `${dados.empresa.cnaePrincipalCodigo ? dados.empresa.cnaePrincipalCodigo + " — " : ""}${dados.empresa.cnaePrincipal}`] as [string, string]]
      : []),
    ...dados.empresa.estabelecimentosAdicionais.map(
      (e, i) => [`Estabelecimento ${i + 2}`, `${e.razaoSocial} — ${formatCNPJ(e.cnpj)} (${REGIME_LABELS[e.regime] ?? e.regime})`] as [string, string]
    ),
  ]
  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: margem, right: margem },
    styles: { font: "helvetica", fontSize: 10.5, cellPadding: { top: 2.2, bottom: 2.2, left: 0, right: 4 }, textColor: CINZA_TXT },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, textColor: AZUL } },
    body: linhasEmpresa,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14

  // ------------------------------------------------------------- PREMISSAS
  y = tituloSecao("Premissas utilizadas", y)
  const anos = ANOS_QUADRO
  const pDe = (ano: number) => dados.premissas.premissasPorAno[ano === 2028 ? 2027 : ano]
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: margem, right: margem },
    styles: { font: "helvetica", fontSize: 8.5, halign: "center", cellPadding: 1.6, textColor: CINZA_TXT, lineColor: [200, 210, 225], lineWidth: 0.15 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 34 } },
    head: [["Alíquota", ...anos.map(String)]],
    body: [
      ["CBS", ...anos.map((a) => fmtPct(pDe(a).cbs))],
      ["IBS Estadual", ...anos.map((a) => fmtPct(pDe(a).ibsUF))],
      ["IBS Municipal", ...anos.map((a) => fmtPct(pDe(a).ibsMUN))],
      ["TOTAL IBS + CBS", ...anos.map((a) => fmtPct(pDe(a).cbs + pDe(a).ibsUF + pDe(a).ibsMUN))],
    ],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5
  if (dados.premissas.reducao60) {
    doc.setTextColor(...CINZA_TXT)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    doc.text(
      doc.splitTextToSize("Atividade com redução de 60% nas alíquotas de IBS/CBS nos débitos (LC 214/2025, art. 133) — os créditos das entradas permanecem integrais.", pageW - 2 * margem),
      margem, y
    )
    y += 10
  } else {
    y += 3
  }
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: margem, right: margem },
    styles: { font: "helvetica", fontSize: 8.5, halign: "center", cellPadding: 1.6, textColor: CINZA_TXT, lineColor: [200, 210, 225], lineWidth: 0.15 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 34 } },
    head: [["ICMS e ISS", ...anos.map(String)]],
    body: [
      ["% mantido", ...anos.map((a) => fmtPct(REDUCAO_ICMS_ISS[a === 2028 ? 2027 : a] ?? 1))],
      ["ICMS aplicado", ...anos.map((a) => fmtPct((dados.premissas.aliquotaICMS ?? 0.225) * (REDUCAO_ICMS_ISS[a === 2028 ? 2027 : a] ?? 1)))],
      ["ISS aplicado", ...anos.map((a) => fmtPct(pDe(a).aliquotaISS * (REDUCAO_ICMS_ISS[a === 2028 ? 2027 : a] ?? 1)))],
    ],
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5
  doc.setTextColor(...CINZA_TXT)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  doc.text(
    doc.splitTextToSize("Transição: PIS/COFINS extintos a partir de 2027 (substituídos pela CBS); ICMS e ISS reduzidos gradualmente de 2029 a 2032 e extintos em 2033. 2026 é ano-teste (CBS 0,9% + IBS 0,1%).", pageW - 2 * margem),
    margem, y
  )

  // ------------------------------------------------------------ LEGISLAÇÕES
  doc.addPage("a4", "portrait")
  y = tituloSecao("Legislações aplicáveis", 24)
  y = escreverTexto(dados.textoLegislacoes.trim() || "Nenhum tratamento legislativo específico informado.", y)

  // ------------------------------------------------- QUADRO COMPARATIVO (paisagem)
  doc.addPage("a4", "landscape")
  const pageWL = doc.internal.pageSize.getWidth()
  y = tituloSecao("Quadro comparativo — total dos tributos indiretos", 22)
  const q = dados.quadro
  const linhaQ = (rotulo: string, campo: keyof QuadroComparativoAno) =>
    [rotulo, ...anos.map((a) => fmtRS.format(q[a][campo] as number))]
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: margem, right: margem },
    styles: { font: "helvetica", fontSize: 8, halign: "right", cellPadding: 1.7, textColor: CINZA_TXT, lineColor: [200, 210, 225], lineWidth: 0.15 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 52 } },
    head: [["Tributo", ...anos.map(String)]],
    body: [
      linhaQ("PIS/COFINS", "pisCofins"),
      linhaQ("ICMS (não cumulativo)", "icms"),
      linhaQ("ISS (cumulativo)", "iss"),
      linhaQ("CBS — débito", "debitoCbs"),
      linhaQ("IBS — débito", "debitoIbs"),
      linhaQ("CBS — crédito", "creditoCbs"),
      linhaQ("IBS — crédito", "creditoIbs"),
      linhaQ("CBS — saldo", "saldoCbs"),
      linhaQ("IBS — saldo", "saldoIbs"),
      ["VALOR TOTAL", ...anos.map((a) => fmtRS.format(q[a].total))],
      ["IMPACTO vs 2026", ...anos.map((a) => (q[a].impactoPct === null ? "—" : `${q[a].impactoPct! >= 0 ? "+" : ""}${fmtPct(q[a].impactoPct!)}`))],
    ],
    didParseCell: (data) => {
      if (data.section !== "body") return
      const r = data.row.index
      if (r === 3 || r === 4) data.cell.styles.fillColor = SALMAO // débitos
      if (r === 5 || r === 6) data.cell.styles.fillColor = VERDE // créditos
      if (r === 9) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = [242, 242, 242] } // total
      if (r === 10) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = AZUL_CLARO } // impacto
      // 2026: CBS/IBS em cinza (ano-teste, fora do VALOR TOTAL)
      if (data.column.index === 1 && r >= 3 && r <= 8) data.cell.styles.textColor = [166, 166, 166]
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5
  doc.setTextColor(...CINZA_TXT)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8.5)
  doc.text(
    // atenção: sem "−" (menos tipográfico) — a helvetica do jsPDF não tem o glifo e vira aspas
    doc.splitTextToSize("Débitos calculados sobre as saídas (EFD Contribuições); créditos sobre as entradas (EFD ICMS/IPI) de fornecedores do Regime Regular, conforme classificação do NCM na base IBS/CBS. O VALOR TOTAL considera o SALDO (débito menos crédito) de CBS/IBS; em 2026 (ano-teste) considera apenas PIS/COFINS + ICMS + ISS.", pageWL - 2 * margem),
    margem, y
  )

  // ---------------------------------------------------- CONSIDERAÇÕES FINAIS
  doc.addPage("a4", "portrait")
  y = tituloSecao("Considerações finais", 24)
  y = escreverTexto(dados.textoConsideracoes.trim() || "Sem considerações adicionais.", y)

  // ------------------------------------------------------------- RODAPÉ
  const total = doc.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    doc.setPage(i)
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    doc.setDrawColor(210, 218, 230)
    doc.setLineWidth(0.2)
    doc.line(margem, h - 13, w - margem, h - 13)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("TaxHub — Reforma Tributária", margem, h - 8)
    doc.text(`Página ${i} de ${total}`, w - margem, h - 8, { align: "right" })
  }

  doc.save(`${nomeProjeto.replace(/[\\/:*?"<>|]/g, "").trim()}.pdf`)
}
