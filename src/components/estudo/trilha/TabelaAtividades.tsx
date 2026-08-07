"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, Star } from "lucide-react";
import type { MateriaConcurso, MateriaDef } from "@/lib/estudo-data";
import type { FilaAtividade, FilaAtividadeTipo } from "@/lib/trilha-fila";
import { resolverCorMateria } from "./trilha-ui";

// Tabela de atividades da Meta atual — puramente informativa (registrar resultado continua na aba
// Questões, mesmo fluxo de sempre; aqui é só o panorama). Sem coluna "Código" (decisão do
// usuário — específica do Guruja, não faz parte desta reforma).

const SUBTIPO_LABEL: Partial<Record<FilaAtividadeTipo, string>> = {
  reforco: "reforço",
  reforco_imediato: "reforço rápido",
  revisao_link: "revisão de link",
  revisao_link_faltando: "falta link",
  revisao_materia: "revisão de matéria",
  cartas: "cartas",
};

function tipoPrincipal(tipo: FilaAtividadeTipo): "Teoria" | "Questões" {
  return tipo === "teoria" ? "Teoria" : "Questões";
}

function Estrelas({ nivel }: { nivel?: "alta" | "media" | "baixa" }) {
  const n = nivel === "alta" ? 3 : nivel === "media" ? 2 : nivel === "baixa" ? 1 : 0;
  if (n === 0) return <span className="text-muted-foreground/40 text-xs">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </div>
  );
}

export default function TabelaAtividades({
  atividades, materiasAtivas, onAbrirLink, onAbrirCapitulo, onToggleCapitulo,
}: {
  atividades: FilaAtividade[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onAbrirLink: (atividade: FilaAtividade) => void;
  // capítulo/subcapítulo tem página própria — clicar no nome abre o leitor JÁ naquele trecho, não
  // no início do tópico (diferente de onAbrirLink, que sempre manda pro início/link genérico)
  onAbrirCapitulo?: (pdfId: string, paginaInicio: number, paginaFim: number) => void;
  onToggleCapitulo?: (pdfId: string, paginaInicio: number) => void;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  if (atividades.length === 0) {
    return <p className="text-xs text-muted-foreground italic text-center py-6">Nenhuma atividade nesta Meta.</p>;
  }

  const toggleExpandido = (id: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-[560px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
            <th className="py-2 px-1 w-6"></th>
            <th className="py-2 px-2">Disciplina</th>
            <th className="py-2 px-2">Tipo</th>
            <th className="py-2 px-2">Título</th>
            <th className="py-2 px-2">Relevância</th>
            <th className="py-2 px-2 text-right">Tempo</th>
            <th className="py-2 px-2 text-right">Desempenho</th>
          </tr>
        </thead>
        <tbody>
          {atividades.map((a) => {
            const cor = resolverCorMateria(a.materia, materiasAtivas);
            const dotClasse = a.concluida
              ? "bg-emerald-500"
              : a.tipo === "revisao_link_faltando"
                ? "bg-amber-500"
                : "bg-muted-foreground/30";
            const subtipo = SUBTIPO_LABEL[a.tipo];
            // além dos tipos com link externo, teoria (abre o PDF) e cartas (vai pra aba Cartas)
            // também são clicáveis — onAbrirLink decide o destino certo por tipo
            const clicavel = !!a.link || a.tipo === "teoria" || a.tipo === "cartas";
            const temCapitulos = (a.todosCapitulos?.length ?? 0) > 0;
            const expandido = expandidos.has(a.id);
            return (
              <Fragment key={a.id}>
                <tr
                  onClick={clicavel ? () => onAbrirLink(a) : undefined}
                  className={`border-b border-border/50 ${clicavel ? "cursor-pointer hover:bg-accent/40" : ""} ${a.concluida ? "opacity-60" : ""}`}
                >
                  <td className="py-2 px-1">
                    <span className={`block w-2 h-2 rounded-full ${dotClasse}`} title={a.concluida ? "Concluída" : "Pendente"} />
                  </td>
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
                      <span className="truncate">{a.materia}</span>
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-foreground">{tipoPrincipal(a.tipo)}</span>
                      {subtipo && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                          {subtipo}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 max-w-[220px]">
                    <span className="flex items-center gap-1 truncate" title={a.titulo}>
                      {temCapitulos && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleExpandido(a.id); }}
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                          title={expandido ? "Recolher capítulos" : "Ver capítulos"}
                        >
                          {expandido ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      )}
                      <span className="truncate">{a.titulo}</span>
                      {!!a.link && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </span>
                  </td>
                  <td className="py-2 px-2"><Estrelas nivel={a.relevancia} /></td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{a.minutosEstimados}min</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {a.desempenhoPerc !== undefined ? `${a.desempenhoPerc}%` : <span className="text-muted-foreground/40">—</span>}
                  </td>
                </tr>
                {temCapitulos && expandido && (
                  <tr key={`${a.id}-capitulos`} className="border-b border-border/50 bg-muted/20">
                    <td colSpan={7} className="py-2 pl-8 pr-2">
                      <div className="space-y-1">
                        {a.todosCapitulos!.map((cap) => {
                          const travadoPelaLeitura = cap.lido && !cap.lidoManual;
                          const podeTogglar = !!onToggleCapitulo && !!a.pdfId && !travadoPelaLeitura;
                          return (
                            <div key={cap.indice} className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => podeTogglar && a.pdfId && onToggleCapitulo?.(a.pdfId, cap.paginaInicio)}
                                disabled={!podeTogglar}
                                title={
                                  travadoPelaLeitura
                                    ? "Concluído pela leitura real (a página já passou daqui) — não dá pra desmarcar"
                                    : cap.lido ? "Desmarcar capítulo" : "Marcar capítulo como concluído"
                                }
                                className="flex-shrink-0 disabled:cursor-default"
                              >
                                {cap.lido ? (
                                  <CheckCircle2 className={`h-3.5 w-3.5 ${travadoPelaLeitura ? "text-emerald-500/60" : "text-emerald-500"}`} />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => a.pdfId && onAbrirCapitulo?.(a.pdfId, cap.paginaInicio, cap.paginaFim)}
                                className="text-left text-[11px] text-muted-foreground hover:text-foreground truncate"
                                title={cap.nome}
                              >
                                Cap. {cap.indice}: {cap.nome}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
