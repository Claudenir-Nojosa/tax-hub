"use client";

import { CheckCircle2, FileWarning, GraduationCap, Pencil, Trash2 } from "lucide-react";
import type { SimuladoConcurso } from "@/lib/simulados-data";

export default function SimuladoRow({
  simulado, onEditar, onExcluir, onFazerSimulado,
}: {
  simulado: SimuladoConcurso;
  onEditar: () => void;
  onExcluir: () => void;
  onFazerSimulado: () => void;
}) {
  const totalQuestoes = simulado.partes.reduce((s, p) => s + p.numeroQuestoes, 0);
  const totalMarcadas = simulado.partes.reduce((s, p) => s + p.gabarito.filter((g) => g.alternativaCorreta).length, 0);
  const gabaritoCompleto = totalQuestoes > 0 && totalMarcadas === totalQuestoes;

  // PDF é por parte — status agregado considera só as partes com questões de verdade (uma parte
  // vazia/desativada não deveria contar como "faltando PDF")
  const partesRelevantes = simulado.partes.filter((p) => p.numeroQuestoes > 0);
  const partesComPdf = partesRelevantes.filter((p) => p.arquivoEnviado);
  const temAlgumPdf = partesComPdf.length > 0;

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">{simulado.nome}</span>
          {gabaritoCompleto ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" /> gabarito completo
            </span>
          ) : totalQuestoes > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 flex items-center gap-0.5">
              <FileWarning className="h-2.5 w-2.5" /> gabarito {totalMarcadas}/{totalQuestoes}
            </span>
          ) : null}
          {partesRelevantes.length > 0 && partesComPdf.length === partesRelevantes.length ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              PDF completo
            </span>
          ) : temAlgumPdf ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              PDF {partesComPdf.length}/{partesRelevantes.length}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              sem PDF
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {[simulado.orgao, simulado.banca, simulado.ano].filter(Boolean).join(" · ") || "—"}
          {" · "}
          {simulado.partes.map((p) => `${p.nome} (${p.numeroQuestoes}q, ${p.tempoMinutos}min${p.arquivoEnviado ? ", PDF ✓" : ""})`).join(" · ")}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {temAlgumPdf && (
          <button
            type="button"
            onClick={onFazerSimulado}
            title="Fazer este simulado"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium transition-colors"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Fazer
          </button>
        )}
        <button
          type="button"
          onClick={onEditar}
          title="Editar"
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onExcluir}
          title="Excluir"
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
