import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

const REGIME_LABELS: Record<string, string> = {
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  nao_sei: "Não sei",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export async function POST(request: NextRequest) {
  try {
    const { analise, formData } = await request.json();

    const BLUE = "007CCA";
    const WHITE = "FFFFFF";
    const DARK = "1e293b";
    const GRAY = "64748b";

    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE";
    prs.title = `Planejamento Tributário — ${formData.companyName}`;

    const recomendado = analise.comparativo.find(
      (r: { regime: string }) => r.regime === analise.regimeRecomendado
    );

    // ── Slide 1: Capa ──────────────────────────────────
    const slide1 = prs.addSlide();
    slide1.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: BLUE },
    });
    slide1.addText("Planejamento Tributário", {
      x: 1, y: 1.8, w: 11, h: 0.9,
      fontSize: 36, bold: true, color: WHITE, align: "center",
    });
    slide1.addText(formData.companyName, {
      x: 1, y: 2.9, w: 11, h: 0.6,
      fontSize: 22, color: "cce8f7", align: "center",
    });
    slide1.addText(`Análise de Regime Tributário • ${new Date().getFullYear()}`, {
      x: 1, y: 4.5, w: 11, h: 0.4,
      fontSize: 13, color: "99ccee", align: "center",
    });
    slide1.addText("tax-hub", {
      x: 1, y: 6.8, w: 11, h: 0.3,
      fontSize: 11, color: "88bbdd", align: "center",
    });

    // ── Slide 2: Diagnóstico ──────────────────────────
    const slide2 = prs.addSlide();
    slide2.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.9,
      fill: { color: BLUE },
    });
    slide2.addText("Diagnóstico da Empresa", {
      x: 0.3, y: 0.12, w: 12, h: 0.65,
      fontSize: 22, bold: true, color: WHITE,
    });

    const diagItems = [
      ["Empresa", formData.companyName],
      ["Regime Atual", REGIME_LABELS[formData.regimeAtual] || formData.regimeAtual],
      ["Faturamento Anual", formatCurrency(parseFloat(formData.faturamentoAnual) || 0)],
      ["Estado", formData.estado],
    ];

    diagItems.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 0.5 : 6.5;
      const y = 1.4 + Math.floor(i / 2) * 1.3;
      slide2.addShape(prs.ShapeType.rect, {
        x, y, w: 5.5, h: 1.1,
        fill: { color: "f0f9ff" },
        line: { color: "bde3f7", width: 1 },
      });
      slide2.addText(label, {
        x, y: y + 0.05, w: 5.5, h: 0.35,
        fontSize: 10, color: GRAY, align: "center",
      });
      slide2.addText(value, {
        x, y: y + 0.4, w: 5.5, h: 0.55,
        fontSize: 14, bold: true, color: DARK, align: "center",
      });
    });

    // ── Slide 3: Recomendação ─────────────────────────
    const slide3 = prs.addSlide();
    slide3.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.9,
      fill: { color: BLUE },
    });
    slide3.addText("Recomendação", {
      x: 0.3, y: 0.12, w: 12, h: 0.65,
      fontSize: 22, bold: true, color: WHITE,
    });

    slide3.addShape(prs.ShapeType.rect, {
      x: 0.5, y: 1.1, w: 12, h: 1.5,
      fill: { color: "f0fdf4" },
      line: { color: "86efac", width: 1.5 },
    });
    slide3.addText("✓  Regime Recomendado", {
      x: 0.7, y: 1.2, w: 11, h: 0.4,
      fontSize: 12, color: "15803d",
    });
    slide3.addText(REGIME_LABELS[analise.regimeRecomendado] || analise.regimeRecomendado, {
      x: 0.7, y: 1.55, w: 11, h: 0.8,
      fontSize: 28, bold: true, color: "166534",
    });

    const economiaPositiva = analise.economiaEstimada > 0;
    slide3.addShape(prs.ShapeType.rect, {
      x: 0.5, y: 2.85, w: 5.5, h: 1.3,
      fill: { color: economiaPositiva ? "f0fdf4" : "fff7ed" },
      line: { color: economiaPositiva ? "86efac" : "fed7aa", width: 1 },
    });
    slide3.addText("Economia Estimada/Ano", {
      x: 0.7, y: 2.95, w: 5, h: 0.35,
      fontSize: 10, color: GRAY,
    });
    slide3.addText(formatCurrency(Math.abs(analise.economiaEstimada)), {
      x: 0.7, y: 3.25, w: 5, h: 0.7,
      fontSize: 22, bold: true,
      color: economiaPositiva ? "16a34a" : "ea580c",
    });

    slide3.addShape(prs.ShapeType.rect, {
      x: 7, y: 2.85, w: 5.5, h: 1.3,
      fill: { color: "eff6ff" },
      line: { color: "bfdbfe", width: 1 },
    });
    slide3.addText("Carga Tributária Estimada", {
      x: 7.2, y: 2.95, w: 5, h: 0.35,
      fontSize: 10, color: GRAY,
    });
    slide3.addText(`${recomendado?.cargaPercentual.toFixed(1)}% do faturamento`, {
      x: 7.2, y: 3.25, w: 5, h: 0.7,
      fontSize: 20, bold: true, color: "1d4ed8",
    });

    slide3.addText(
      analise.justificativa.slice(0, 400) +
        (analise.justificativa.length > 400 ? "..." : ""),
      {
        x: 0.5, y: 4.4, w: 12, h: 1.8,
        fontSize: 10, color: GRAY, wrap: true,
      }
    );

    // ── Slide 4: Comparativo ──────────────────────────
    const slide4 = prs.addSlide();
    slide4.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.9,
      fill: { color: BLUE },
    });
    slide4.addText("Comparativo de Regimes", {
      x: 0.3, y: 0.12, w: 12, h: 0.65,
      fontSize: 22, bold: true, color: WHITE,
    });

    const tableRows = analise.comparativo.map(
      (r: { regime: string; label: string; cargaPercentual: number; totalAnual: number; elegivel: boolean }) => [
        {
          text: r.label + (r.regime === analise.regimeRecomendado ? " ★" : ""),
          options: {
            bold: r.regime === analise.regimeRecomendado,
            color: r.regime === analise.regimeRecomendado ? "166534" : DARK,
          },
        },
        { text: `${r.cargaPercentual.toFixed(1)}%`, options: { color: DARK } },
        { text: formatCurrency(r.totalAnual), options: { bold: true, color: DARK } },
        {
          text: r.elegivel ? "Sim" : "Não",
          options: { color: r.elegivel ? "16a34a" : "dc2626" },
        },
      ]
    );

    slide4.addTable(
      [
        [
          { text: "Regime", options: { bold: true, color: WHITE, fill: { color: BLUE } } },
          { text: "Carga (%)", options: { bold: true, color: WHITE, fill: { color: BLUE }, align: "center" } },
          { text: "Total Anual", options: { bold: true, color: WHITE, fill: { color: BLUE }, align: "center" } },
          { text: "Elegível", options: { bold: true, color: WHITE, fill: { color: BLUE }, align: "center" } },
        ],
        ...tableRows,
      ],
      {
        x: 0.5, y: 1.1, w: 12,
        colW: [4, 2.5, 3.5, 2],
        fontSize: 12,
        border: { type: "solid", color: "e2e8f0" },
      }
    );

    // ── Slide 5: Oportunidades ────────────────────────
    const slide5 = prs.addSlide();
    slide5.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.9,
      fill: { color: BLUE },
    });
    slide5.addText("Oportunidades", {
      x: 0.3, y: 0.12, w: 12, h: 0.65,
      fontSize: 22, bold: true, color: WHITE,
    });

    analise.oportunidades.forEach((op: string, i: number) => {
      const y = 1.2 + i * 0.95;
      if (y > 6.5) return;
      slide5.addShape(prs.ShapeType.rect, {
        x: 0.5, y, w: 12, h: 0.8,
        fill: { color: "f0fdf4" },
        line: { color: "86efac", width: 1 },
      });
      slide5.addText(`✓  ${op}`, {
        x: 0.7, y: y + 0.12, w: 11.5, h: 0.55,
        fontSize: 11, color: "166534", wrap: true,
      });
    });

    // ── Slide 6: Riscos ───────────────────────────────
    const slide6 = prs.addSlide();
    slide6.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.9,
      fill: { color: BLUE },
    });
    slide6.addText("Pontos de Atenção", {
      x: 0.3, y: 0.12, w: 12, h: 0.65,
      fontSize: 22, bold: true, color: WHITE,
    });

    analise.riscos.forEach((r: string, i: number) => {
      const y = 1.2 + i * 0.95;
      if (y > 6.5) return;
      slide6.addShape(prs.ShapeType.rect, {
        x: 0.5, y, w: 12, h: 0.8,
        fill: { color: "fff7ed" },
        line: { color: "fed7aa", width: 1 },
      });
      slide6.addText(`⚠  ${r}`, {
        x: 0.7, y: y + 0.12, w: 11.5, h: 0.55,
        fontSize: 11, color: "92400e", wrap: true,
      });
    });

    // ── Slide 7: Encerramento ─────────────────────────
    const slide7 = prs.addSlide();
    slide7.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: BLUE },
    });
    slide7.addText("Próximos Passos", {
      x: 1, y: 1.5, w: 11, h: 0.8,
      fontSize: 30, bold: true, color: WHITE, align: "center",
    });
    slide7.addText(
      "Consulte um contador ou advogado tributarista para implementar este planejamento.\nAs estimativas apresentadas são baseadas nas informações fornecidas e nas alíquotas vigentes.",
      {
        x: 1, y: 2.8, w: 11, h: 1.5,
        fontSize: 13, color: "cce8f7", align: "center", wrap: true,
      }
    );
    slide7.addText("tax-hub | Planejamento Tributário", {
      x: 1, y: 5.5, w: 11, h: 0.4,
      fontSize: 12, color: "99ccee", align: "center",
    });

    // ── Generate buffer ───────────────────────────────
    const buffer = await prs.write({ outputType: "arraybuffer" });
    const uint8 = new Uint8Array(buffer as ArrayBuffer);

    const fileName = `planejamento-tributario-${formData.companyName
      .toLowerCase()
      .replace(/\s+/g, "-")}.pptx`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PPT:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar PPT" },
      { status: 500 }
    );
  }
}
