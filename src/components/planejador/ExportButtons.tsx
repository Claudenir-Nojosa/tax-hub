"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Presentation, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Imposto {
  nome: string;
  baseCalculo: number;
  aliquota: number;
  valor: number;
}

interface Regime {
  regime: string;
  label: string;
  cargaPercentual: number;
  totalAnual: number;
  elegivel: boolean;
  motivoInelegivel?: string;
  impostos: Imposto[];
}

interface AnaliseIA {
  regimeRecomendado: string;
  justificativa: string;
  economiaEstimada: number;
  economiaPercentual: number;
  comparativo: Regime[];
  oportunidades: string[];
  riscos: string[];
  consideracoes: string[];
}

interface FormData {
  companyName: string;
  cnpj?: string;
  estado: string;
  setor: string;
  porte: string;
  regimeAtual: string;
  faturamentoAnual: string;
}

interface Props {
  analise: AnaliseIA;
  formData: FormData;
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const REGIME_LABELS: Record<string, string> = {
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

export default function ExportButtons({ analise, formData, resultsRef }: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingPpt, setLoadingPpt] = useState(false);

  const handlePdfExport = async () => {
    setLoadingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }, { toPng }] =
        await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
          import("html-to-image").then((m) => ({ toPng: m.toPng })),
        ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      // ── Capa ─────────────────────────────────────────────
      doc.setFillColor(0, 124, 202);
      doc.rect(0, 0, pageW, 70, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Planejamento Tributário", pageW / 2, 28, { align: "center" });

      doc.setFontSize(15);
      doc.setFont("helvetica", "normal");
      doc.text(formData.companyName, pageW / 2, 42, { align: "center" });

      doc.setFontSize(10);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} • tax-hub`,
        pageW / 2,
        56,
        { align: "center" }
      );

      y = 85;
      doc.setTextColor(30, 30, 30);

      // ── Resumo executivo ──────────────────────────────────
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Executivo", margin, y);
      y += 8;

      doc.setDrawColor(0, 124, 202);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      const recomendado = analise.comparativo.find(
        (r) => r.regime === analise.regimeRecomendado
      );

      const resumoData = [
        ["Regime Recomendado", REGIME_LABELS[analise.regimeRecomendado] || analise.regimeRecomendado],
        ["Regime Atual", REGIME_LABELS[formData.regimeAtual] || formData.regimeAtual],
        ["Carga Tributária Estimada", `${recomendado?.cargaPercentual.toFixed(1)}% do faturamento`],
        ["Total Anual Estimado", formatCurrency(recomendado?.totalAnual || 0)],
        [
          "Economia Estimada vs. Regime Atual",
          `${formatCurrency(Math.abs(analise.economiaEstimada))} (${Math.abs(analise.economiaPercentual).toFixed(1)}%)`,
        ],
      ];

      autoTable(doc, {
        startY: y,
        head: [],
        body: resumoData,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 80, textColor: [60, 60, 60] },
          1: { textColor: [30, 30, 30] },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // ── Justificativa ──────────────────────────────────────
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Análise e Justificativa", margin, y);
      y += 8;
      doc.setDrawColor(0, 124, 202);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const justLines = doc.splitTextToSize(analise.justificativa, pageW - margin * 2);
      doc.text(justLines, margin, y);
      y += justLines.length * 5 + 12;

      // ── Comparativo ───────────────────────────────────────
      if (y > pageH - 60) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Comparativo de Regimes", margin, y);
      y += 8;
      doc.setDrawColor(0, 124, 202);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Regime", "Carga (%)", "Total Anual", "Elegível"]],
        body: analise.comparativo.map((r) => [
          r.label + (r.regime === analise.regimeRecomendado ? " ★" : ""),
          `${r.cargaPercentual.toFixed(1)}%`,
          formatCurrency(r.totalAnual),
          r.elegivel ? "Sim" : "Não",
        ]),
        theme: "striped",
        headStyles: { fillColor: [0, 124, 202], textColor: 255, fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 14;

      // ── Detalhamento por regime ────────────────────────────
      for (const regime of analise.comparativo) {
        if (!regime.elegivel || !regime.impostos?.length) continue;
        if (y > pageH - 60) { doc.addPage(); y = margin; }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Detalhamento — ${regime.label}`, margin, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Tributo", "Base de Cálculo", "Alíquota", "Valor Anual"]],
          body: regime.impostos.map((i) => [
            i.nome,
            formatCurrency(i.baseCalculo),
            `${i.aliquota.toFixed(2)}%`,
            formatCurrency(i.valor),
          ]),
          theme: "grid",
          headStyles: { fillColor: [240, 240, 245], textColor: [50, 50, 50], fontSize: 9 },
          styles: { fontSize: 9, cellPadding: 2 },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Oportunidades ──────────────────────────────────────
      if (y > pageH - 80) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Oportunidades Identificadas", margin, y);
      y += 8;
      doc.setDrawColor(0, 124, 202);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      analise.oportunidades.forEach((op, i) => {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        const lines = doc.splitTextToSize(`${i + 1}. ${op}`, pageW - margin * 2 - 5);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 3;
      });

      y += 6;

      // ── Riscos ─────────────────────────────────────────────
      if (y > pageH - 60) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Pontos de Atenção e Riscos", margin, y);
      y += 8;
      doc.setDrawColor(0, 124, 202);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      analise.riscos.forEach((r, i) => {
        if (y > pageH - 20) { doc.addPage(); y = margin; }
        const lines = doc.splitTextToSize(`${i + 1}. ${r}`, pageW - margin * 2 - 5);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 3;
      });

      // ── Rodapé ─────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `tax-hub | Planejamento Tributário — ${formData.companyName} | Página ${i} de ${totalPages}`,
          pageW / 2,
          pageH - 8,
          { align: "center" }
        );
      }

      doc.save(`planejamento-tributario-${formData.companyName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handlePptExport = async () => {
    setLoadingPpt(true);
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analise, formData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar PPT");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planejamento-tributario-${formData.companyName
        .toLowerCase()
        .replace(/\s+/g, "-")}.pptx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Apresentação PPT exportada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao exportar PPT.");
    } finally {
      setLoadingPpt(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={handlePdfExport}
        disabled={loadingPdf || loadingPpt}
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {loadingPdf ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Exportar PDF
      </Button>

      <Button
        onClick={handlePptExport}
        disabled={loadingPdf || loadingPpt}
        variant="outline"
        className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
      >
        {loadingPpt ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Presentation className="h-4 w-4 mr-2" />
        )}
        Exportar PPT
      </Button>
    </div>
  );
}
