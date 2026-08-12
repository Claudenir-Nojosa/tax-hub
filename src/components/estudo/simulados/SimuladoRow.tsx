"use client";

import { CheckCircle2, Download, FileWarning, GraduationCap, Loader2, Pencil, Trash2 } from "lucide-react";
import type { SimuladoConcurso } from "@/lib/simulados-data";

export default function SimuladoRow({
  simulado, baixando, onBaixar, onEditar, onExcluir, onFazerSimulado,
}: {
  simulado: SimuladoConcurso;
  baixando: boolean;
  onBaixar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onFazerSimulado: () => void;
}) {
  const totalQuestoes = simulado.partes.reduce((s, p) => s + p.numeroQuestoes, 0);
  const totalMarcadas = simulado.partes.reduce((s, p) => s + p.gabarito.filter((g) => g.alternativaCorreta).length, 0);
  const gabaritoCompleto = totalQuestoes > 0 && totalMarcadas === totalQuestoes;

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
          {!simulado.arquivoEnviado && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              sem PDF
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {[simulado.orgao, simulado.banca, simulado.ano].filter(Boolean).join(" · ") || "—"}
          {" · "}
          {simulado.partes.map((p) => `${p.nome} (${p.numeroQuestoes}q, ${p.tempoMinutos}min)`).join(" · ")}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {simulado.arquivoEnviado && (
          <button
            type="button"
            onClick={onFazerSimulado}
            title="Fazer este simulado"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium transition-colors"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Fazer
          </button>
        )}
        {simulado.arquivoEnviado && (
          <button
            type="button"
            onClick={onBaixar}
            disabled={baixando}
            title="Baixar PDF da prova"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
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
