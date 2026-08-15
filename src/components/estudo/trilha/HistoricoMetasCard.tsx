"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, History } from "lucide-react";
import type { MateriaBase, MateriaConcurso, MateriaDef } from "@/lib/estudo-data";
import type { MetaHistoricoResumo } from "@/lib/trilha-fila";
import { resolverCorMateria } from "./trilha-ui";
import { tipoPrincipal } from "./TabelaAtividades";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Pedido do usuário: histórico das Metas antigas não deve ocupar espaço fixo na tela — vira um
// botão que abre um dialog. Dentro, cada Meta expande (clique) pra revelar as matérias, e cada
// matéria expande (outro clique) pra revelar a lista real de atividades feitas — não só a
// contagem agregada X/Y, que escondia QUAL capítulo/questão foi de fato concluído.
export default function HistoricoMetasCard({
  historico, materiasAtivas,
}: {
  historico: MetaHistoricoResumo[];
  materiasAtivas: (MateriaDef | MateriaConcurso | MateriaBase)[];
}) {
  const [metaAberta, setMetaAberta] = useState<number | null>(null);
  const [materiaAberta, setMateriaAberta] = useState<string | null>(null); // chave `${numero}:${materia}`

  if (historico.length === 0) return null;

  const toggleMeta = (numero: number) => {
    setMetaAberta((prev) => (prev === numero ? null : numero));
    setMateriaAberta(null);
  };
  const toggleMateria = (chave: string) => setMateriaAberta((prev) => (prev === chave ? null : chave));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-foreground/30 transition-all text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <History className="h-4 w-4 text-muted-foreground" /> Histórico de metas
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {historico.length} meta{historico.length !== 1 ? "s" : ""} · ver tudo
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de metas</DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5">
          {historico.map((m) => {
            const perc = m.total > 0 ? Math.round((m.concluidas / m.total) * 100) : 0;
            const aberta = metaAberta === m.numero;
            return (
              <div key={m.numero} className="rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleMeta(m.numero)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {aberta ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">Meta {m.numero}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {fmtDataCurta(m.iniciadaEm)}
                      {m.fechadaEm ? ` – ${fmtDataCurta(m.fechadaEm)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-14 bg-muted rounded-full h-1.5 inline-block">
                      <span
                        className={`rounded-full h-1.5 block ${perc === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${perc}%` }}
                      />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                      {m.concluidas}/{m.total}
                    </span>
                  </span>
                </button>

                {aberta && (
                  <div className="border-t border-border divide-y divide-border">
                    {m.fechamentoManual && perc < 100 && (
                      <div className="px-3 py-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                        Encerrada manualmente com pendências (viraram carry-over)
                      </div>
                    )}
                    {m.materias.map((mt) => {
                      const chave = `${m.numero}:${mt.materia}`;
                      const materiaExpandida = materiaAberta === chave;
                      const cor = resolverCorMateria(mt.materia, materiasAtivas);
                      return (
                        <div key={mt.materia}>
                          <button
                            type="button"
                            onClick={() => toggleMateria(chave)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent/60 transition-colors text-left"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              {materiaExpandida ? (
                                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
                              <span className="text-[11px] text-foreground truncate">{mt.materia}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                              {mt.concluidas}/{mt.total}
                            </span>
                          </button>
                          {materiaExpandida && (
                            <div className="pl-7 pr-3 pb-2 space-y-1">
                              {mt.atividades.map((a, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                  {a.concluida ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                                  )}
                                  <span className="flex-shrink-0 text-muted-foreground">{tipoPrincipal(a.tipo)}</span>
                                  <span className={`truncate ${a.concluida ? "text-foreground" : "text-muted-foreground"}`} title={a.titulo}>
                                    {a.titulo}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
