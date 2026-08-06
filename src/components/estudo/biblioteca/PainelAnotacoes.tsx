"use client";

import { NotebookText, Trash2, X } from "lucide-react";
import type { AnotacaoPdf } from "@/lib/estudo-data";

// Painel de anotações do PDF — mesmo tratamento de dock/overlay do PainelQuestoes/PainelCapitulos
// (lado a lado com o PDF em telas grandes, overlay em telas pequenas). Cada anotação vem de um
// trecho selecionado no leitor ("marca texto", ver handleMarcarSelecao em LeitorPdf.tsx) com uma
// nota opcional — clicar numa anotação leva pra página onde ela foi feita.
export default function PainelAnotacoes({
  anotacoes, onIrParaPagina, onExcluir, onFechar,
}: {
  anotacoes: AnotacaoPdf[];
  onIrParaPagina: (pagina: number) => void;
  onExcluir: (id: string) => void;
  onFechar: () => void;
}) {
  const ordenadas = [...anotacoes].sort((a, b) => a.pagina - b.pagina);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4 lg:static lg:inset-auto lg:z-auto lg:flex lg:items-stretch lg:justify-start lg:bg-transparent lg:p-0 lg:w-[440px] lg:flex-shrink-0 lg:h-full"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-4 space-y-3 max-h-[85vh] overflow-y-auto lg:rounded-none lg:border-0 lg:border-l lg:max-w-none lg:max-h-none lg:h-full lg:w-full"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <NotebookText className="h-4 w-4 text-amber-500" /> Anotações
            {ordenadas.length > 0 && <span className="text-xs text-muted-foreground font-normal">({ordenadas.length})</span>}
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {ordenadas.length === 0 ? (
          <div className="text-center py-10">
            <NotebookText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
              Nenhuma anotação ainda. Clique em &quot;Marca texto&quot; na barra e selecione um trecho do PDF pra salvar aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ordenadas.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onIrParaPagina(a.pagina)}
                    className="text-[10px] font-semibold text-primary hover:underline flex-shrink-0"
                  >
                    pág. {a.pagina}
                  </button>
                  <button
                    type="button"
                    onClick={() => onExcluir(a.id)}
                    title="Excluir anotação"
                    className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <blockquote className="text-xs text-foreground border-l-2 border-amber-400 pl-2 italic">
                  &quot;{a.trecho}&quot;
                </blockquote>
                {a.nota && <p className="text-[11px] text-muted-foreground">{a.nota}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
