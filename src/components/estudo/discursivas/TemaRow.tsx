"use client";

import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import type { DiscursivaTema } from "@/lib/discursivas-data";

export default function TemaRow({
  tema, ultimaNota, totalRespostas, onResponder, onEditar, onExcluir,
}: {
  tema: DiscursivaTema;
  ultimaNota: number | null;
  totalRespostas: number;
  onResponder: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">{tema.tema}</span>
          {ultimaNota !== null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              ultimaNota >= 7 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : ultimaNota >= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
            }`}>
              última nota {ultimaNota.toFixed(1)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {tema.materia ?? "Tema geral"}
          {totalRespostas > 0 ? ` · ${totalRespostas} resposta${totalRespostas !== 1 ? "s" : ""}` : " · ainda sem resposta"}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onResponder}
          title="Responder"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium transition-colors"
        >
          <NotebookPen className="h-3.5 w-3.5" /> Responder
        </button>
        <button type="button" onClick={onEditar} title="Editar" className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onExcluir} title="Excluir" className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
