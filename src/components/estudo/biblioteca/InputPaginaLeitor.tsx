"use client";

import { useEffect, useState } from "react";
import type { PdfEstudo } from "@/lib/estudo-data";

// input de página do leitor — separado pra ter estado local sem re-render do iframe a cada tecla
export default function InputPaginaLeitor({ pdf, onCommit }: { pdf: PdfEstudo; onCommit: (pag: number) => void }) {
  const [valor, setValor] = useState(String(pdf.paginaAtual));
  // pdf.paginaAtual agora avança sozinho (auto-commit ao rolar) — sem isso o campo ficava preso
  // no valor do mount, mesma classe de bug já corrigida em PdfRow.tsx (Biblioteca)
  useEffect(() => {
    setValor(String(pdf.paginaAtual));
  }, [pdf.paginaAtual]);
  const commit = () => {
    const n = parseInt(valor);
    if (!Number.isFinite(n)) { setValor(String(pdf.paginaAtual)); return; }
    const clamp = Math.max(0, Math.min(n, pdf.totalPaginas));
    setValor(String(clamp));
    if (clamp !== pdf.paginaAtual) onCommit(clamp);
  };
  return (
    <input
      type="number"
      min={0}
      max={pdf.totalPaginas}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-16 text-xs border border-border rounded-md px-1.5 py-1 bg-muted text-foreground focus:outline-none focus:border-primary flex-shrink-0"
    />
  );
}
