"use client";

import { Fragment, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, Lock, Star } from "lucide-react";
import type { MateriaConcurso, MateriaDef } from "@/lib/estudo-data";
import type { FilaAtividade, FilaAtividadeTipo } from "@/lib/trilha-fila";
import { resolverCorMateria } from "./trilha-ui";

// Tabela de atividades da Meta atual — puramente informativa (registrar resultado continua na aba
// Questões, mesmo fluxo de sempre; aqui é só o panorama). Sem coluna "Código" (decisão do
// usuário — específica do Guruja, não faz parte desta reforma).
//
// Cadeia bloqueada (pedido do usuário, mesmo espírito do motor semanal antigo): só a primeira
// atividade NÃO concluída fica desbloqueada — as de depois mostram cadeado até a anterior ser
// concluída. `concluida` continua sempre ao vivo (ver trilha-fila.ts): se algo depois da posição
// atual já estiver concluído por outro caminho (ex.: leu direto no PDF sem passar pela Trilha),
// aparece com o check verde normalmente, nunca cadeado — o cadeado é só pra "ainda não chegou a
// vez", nunca esconde um progresso real já feito.

const SUBTIPO_LABEL: Partial<Record<FilaAtividadeTipo, string>> = {
  reforco_imediato: "reforço rápido",
  revisao_link: "revisão de link",
  revisao_link_faltando: "falta link",
  revisao_materia: "revisão de matéria",
  reforco_materia: "reforço geral",
  cartas: "cartas",
};

function tipoPrincipal(tipo: FilaAtividadeTipo): "Teoria" | "Questões" | "Reforço" | "Simulado" | "Discursiva" {
  if (tipo === "teoria") return "Teoria";
  if (tipo === "reforco" || tipo === "reforco_materia" || tipo === "reforco_imediato") return "Reforço";
  if (tipo === "simulado") return "Simulado";
  if (tipo === "discursiva") return "Discursiva";
  return "Questões";
}

// título truncado ("...") — ao passar o mouse, se o texto de fato transbordar, desliza ele pra
// esquerda até revelar o final, na velocidade de leitura (~40px/s), e volta pro início ao sair.
// Sem JS não dá pra saber a largura real do texto (varia por linha) pra calcular o deslocamento.
function TextoComMarquee({ texto, className }: { texto: string; className?: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textoRef = useRef<HTMLSpanElement>(null);
  const [deslocamento, setDeslocamento] = useState(0);
  const [duracao, setDuracao] = useState(0);

  const iniciar = () => {
    const container = containerRef.current;
    const span = textoRef.current;
    if (!container || !span) return;
    const excesso = span.scrollWidth - container.clientWidth;
    if (excesso <= 0) return;
    setDuracao(Math.max(1, excesso / 40));
    setDeslocamento(excesso);
  };

  return (
    <span
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap block ${className ?? ""}`}
      onMouseEnter={iniciar}
      onMouseLeave={() => setDeslocamento(0)}
    >
      <span
        ref={textoRef}
        className="inline-block"
        style={{
          transform: `translateX(-${deslocamento}px)`,
          transition: `transform ${deslocamento > 0 ? duracao : 0.2}s linear`,
        }}
      >
        {texto}
      </span>
    </span>
  );
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

  // "passou" = concluída de verdade OU já leu tempo suficiente pra bater a estimativa (mesmo sem
  // concluir formalmente) — pedido do usuário: se o tempo feito alcançar o estimado (ex.: 64/60),
  // libera a atividade de baixo mesmo assim, sem exigir a conclusão. Não afeta o status dot (que
  // continua só olhando `concluida` — "passou do tempo" não é "concluída", só destrava a cadeia).
  const passouOuConcluiu = (a: FilaAtividade) =>
    a.concluida || (a.minutosFeitos !== undefined && a.minutosFeitos >= a.minutosEstimados);

  // a cadeia bloqueada só vale pra TEORIA (a leitura ciclo A/B/C, sequencial por natureza) —
  // questões (grupos A-D, reforço, revisões) nunca ficam com cadeado, pedido explícito do usuário:
  // elas ficam sempre disponíveis assim que aparecem na Meta, independente de onde a leitura foi
  // parar. Por isso o índice "primeira pendente" é calculado só dentro da SUBSEQUÊNCIA de teoria —
  // uma questão no meio da lista não empurra o cadeado pras teorias que vêm depois dela.
  const atividadesTeoria = atividades.filter((a) => a.tipo === "teoria");
  const primeiroPendenteTeoriaIdx = atividadesTeoria.findIndex((a) => !passouOuConcluiu(a));
  const idxTeoriaPorId = new Map(atividadesTeoria.map((a, i) => [a.id, i]));

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
          {atividades.map((a, i) => {
            const idxTeoria = idxTeoriaPorId.get(a.id);
            const bloqueada =
              a.tipo === "teoria" && !passouOuConcluiu(a) &&
              primeiroPendenteTeoriaIdx !== -1 && idxTeoria! > primeiroPendenteTeoriaIdx;
            const cor = resolverCorMateria(a.materia, materiasAtivas);
            const subtipo = SUBTIPO_LABEL[a.tipo];
            // além dos tipos com link externo, teoria (abre o PDF), cartas (vai pra aba Cartas) e
            // questões/reforço (abre o PDF do próprio tópico, de onde se responde as questões)
            // também são clicáveis — onAbrirLink decide o destino certo por tipo. Bloqueada nunca é
            // clicável, mesmo que o tipo permita.
            const clicavel =
              !bloqueada &&
              (!!a.link || a.tipo === "teoria" || a.tipo === "cartas" || a.tipo === "reforco_materia" ||
                a.tipo === "simulado" || a.tipo === "discursiva" ||
                ((a.tipo === "questoes" || a.tipo === "reforco" || a.tipo === "reforco_imediato") && !!a.topico));
            const temCapitulos = !bloqueada && (a.todosCapitulos?.length ?? 0) > 0;
            const expandido = expandidos.has(a.id);
            const passouDoTempo = !a.concluida && a.minutosFeitos !== undefined && a.minutosFeitos >= a.minutosEstimados;
            return (
              <Fragment key={a.id}>
                <tr
                  onClick={clicavel ? () => onAbrirLink(a) : undefined}
                  className={`border-b border-border/50 ${clicavel ? "cursor-pointer hover:bg-accent/40" : ""} ${a.concluida ? "bg-emerald-500/[0.06]" : ""} ${bloqueada ? "opacity-40" : ""}`}
                >
                  <td className="py-2 px-1">
                    {bloqueada ? (
                      <Lock className="h-3 w-3 text-muted-foreground/50" />
                    ) : a.concluida ? (
                      <span title="Concluída"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>
                    ) : (
                      <span
                        className={`block w-2 h-2 rounded-full ${a.tipo === "revisao_link_faltando" ? "bg-amber-500" : "bg-muted-foreground/30"}`}
                        title="Pendente"
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
                      <span className={`truncate ${a.concluida ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{a.materia}</span>
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
                    <span className="flex items-center gap-1 min-w-0" title={bloqueada ? "Conclua a atividade anterior primeiro" : a.titulo}>
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
                      <TextoComMarquee texto={a.titulo} className="min-w-0 flex-1" />
                      {!!a.link && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    </span>
                  </td>
                  <td className="py-2 px-2"><Estrelas nivel={a.relevancia} /></td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                    {a.minutosFeitos !== undefined ? (
                      <span
                        className={passouDoTempo ? "text-amber-500 font-medium" : undefined}
                        title={passouDoTempo ? "Já passou do tempo estimado — a próxima atividade já foi liberada" : undefined}
                      >
                        {Math.round(a.minutosFeitos)}/{Math.round(a.minutosEstimados)}min
                      </span>
                    ) : (
                      `${Math.round(a.minutosEstimados)}min`
                    )}
                  </td>
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
