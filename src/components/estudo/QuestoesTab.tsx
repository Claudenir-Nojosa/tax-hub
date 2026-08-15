"use client";

import { useState } from "react";
import {
  MATERIAS, topicoKey, dateKeyLocal, defaultTopicoState, blocoDoTopico,
  type TopicoState, type MateriaConcurso, type ChecklistRevisaoLink, type EstudoConfigCiclo, type Bloco,
} from "@/lib/estudo-data";
import {
  statusRevisaoLink, statusRevisaoLinkBloco, CHECKPOINTS_REVISAO_LINK, DIAS_REVISAO_MATERIA,
  type StatusRevisaoLink,
} from "@/lib/trilha-dinamica";
import { resolverCorMateria } from "./trilha/trilha-ui";
import { ChevronDown, ChevronRight, ExternalLink, Search, Link2, Trophy, Zap, Layers, Plus, Trash2 } from "lucide-react";

interface Props {
  topicos: Record<string, TopicoState>;
  onUpdate: (topicos: Record<string, TopicoState>) => void;
  configCiclo: EstudoConfigCiclo;
  onUpdateConfigCiclo: (config: EstudoConfigCiclo) => void;
  materiasConcurso?: MateriaConcurso[]; // se passado, usa em vez de MATERIAS hardcoded
  blocos: Record<string, Bloco>;
  onUpdateBlocos: (blocos: Record<string, Bloco>) => void;
}

// Badge de status de UM checkpoint da revisão do link — mesmo motor da Trilha
// (statusRevisaoLink), só pra dar contexto de quando o link cadastrado aqui vira tarefa de
// verdade. `label` prefixa o texto (ex.: "7d") pra distinguir os dois checkpoints lado a lado.
function StatusBadge({
  label, status, pendenteLabel = "conclua os 4 grupos A-D no Edital",
}: {
  label?: string;
  status: StatusRevisaoLink;
  pendenteLabel?: string;
}) {
  const prefixo = label ? `${label}: ` : "";
  switch (status.tipo) {
    case "sem_link":
      return null;
    case "aguardando_grupos":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          {pendenteLabel}
        </span>
      );
    case "aguardando_prazo":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
          {prefixo}libera em {status.diasRestantes} dia{status.diasRestantes !== 1 ? "s" : ""}
        </span>
      );
    case "disponivel":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          {prefixo}disponível na Trilha
        </span>
      );
    case "feita":
      return (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            status.reforco
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          {prefixo}{status.perc}%{status.reforco ? " · reforçar" : ""}
        </span>
      );
  }
}

// Input de link com botão de abrir — reaproveitado pros 3 tipos de link (7d/30d por tópico e o
// da revisão de matéria).
function LinkInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir link"
          className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export default function QuestoesTab({
  topicos, onUpdate, configCiclo, onUpdateConfigCiclo, materiasConcurso, blocos, onUpdateBlocos,
}: Props) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const hoje = dateKeyLocal();

  const toggleExpand = (nome: string) => {
    setExpandidos((prev) => ({ ...prev, [nome]: !prev[nome] }));
  };

  const updateLinkTopico = (materia: string, topico: string, checkpoint: ChecklistRevisaoLink, link: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key] ?? defaultTopicoState();
    const campo = checkpoint === "d7" ? "linkRevisao7d" : "linkRevisao30d";
    onUpdate({ ...topicos, [key]: { ...estado, [campo]: link.trim() || undefined } });
  };

  // "sem link, não vou cadastrar" — só faz sentido pra tópico SEM Bloco e SEM link próprio; evita
  // que o item "revisao_link_faltando" da fila de atividades (trilha-fila.ts) fique pendente pra
  // sempre num tópico que genuinamente nunca vai ter caderno de questões próprio
  const updateRevisaoLinkDispensada = (materia: string, topico: string, dispensada: boolean) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key] ?? defaultTopicoState();
    onUpdate({ ...topicos, [key]: { ...estado, revisaoLinkDispensada: dispensada || undefined } });
  };

  const updateLinkReforcoImediato = (materia: string, topico: string, link: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key] ?? defaultTopicoState();
    onUpdate({ ...topicos, [key]: { ...estado, linkReforcoImediato: link.trim() || undefined } });
  };

  const updateLinkMateria = (materia: string, link: string) => {
    const cfg = configCiclo.materias[materia] ?? { incluir: true, peso: 1 as const, prioridade: "Baixa" as const, divisao: "A" as const };
    onUpdateConfigCiclo({
      ...configCiclo,
      materias: { ...configCiclo.materias, [materia]: { ...cfg, linkRevisaoMateria: link.trim() || undefined } },
    });
  };

  // Blocos (agrupam tópicos que compartilham um único caderno de questões — ver Bloco em
  // estudo-data.ts) — CRUD simples: cria com nome genérico (editável na hora), qualquer edição é
  // uma substituição do objeto inteiro em blocos[id].
  const criarBloco = (materia: string) => {
    const id = `bloco:${materia}:${Date.now().toString(36)}`;
    const numero = Object.values(blocos).filter((b) => b.materia === materia).length + 1;
    onUpdateBlocos({ ...blocos, [id]: { id, materia, nome: `Bloco ${numero}`, topicos: [] } });
  };

  const atualizarBloco = (id: string, patch: Partial<Bloco>) => {
    const bloco = blocos[id];
    if (!bloco) return;
    onUpdateBlocos({ ...blocos, [id]: { ...bloco, ...patch } });
  };

  const excluirBloco = (id: string) => {
    if (!confirm("Excluir esse Bloco? Os tópicos dele voltam a ficar soltos (sem link), o progresso deles não é afetado.")) return;
    const { [id]: _removido, ...resto } = blocos;
    onUpdateBlocos(resto);
  };

  // liga/desliga um tópico num Bloco — tira de qualquer OUTRO bloco da mesma matéria primeiro
  // (um tópico nunca pertence a 2 blocos ao mesmo tempo)
  const toggleTopicoNoBloco = (id: string, materia: string, topico: string) => {
    const bloco = blocos[id];
    if (!bloco) return;
    const jaEsta = bloco.topicos.includes(topico);
    const atualizados = { ...blocos };
    if (!jaEsta) {
      for (const outro of Object.values(atualizados)) {
        if (outro.id !== id && outro.materia === materia && outro.topicos.includes(topico)) {
          atualizados[outro.id] = { ...outro, topicos: outro.topicos.filter((t) => t !== topico) };
        }
      }
    }
    atualizados[id] = { ...bloco, topicos: jaEsta ? bloco.topicos.filter((t) => t !== topico) : [...bloco.topicos, topico] };
    onUpdateBlocos(atualizados);
  };

  const materiasFiltradas = materiasAtivas.map((m) => ({
    ...m,
    topicos: m.topicos.filter((t) =>
      busca === "" ||
      t.toLowerCase().includes(busca.toLowerCase()) ||
      m.nome.toLowerCase().includes(busca.toLowerCase())
    ),
  })).filter((m) => busca === "" || m.topicos.length > 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar tópico ou matéria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
        <Link2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Cadastre o link do caderno de questões de cada tópico (ex.: TecConcursos) — um pra
          revisão de {CHECKPOINTS_REVISAO_LINK[0].dias} dias e outro pra de {CHECKPOINTS_REVISAO_LINK[1].dias} dias, contados a
          partir de quando os 4 grupos A-D dele ficam completos no Edital. Um terceiro link, curto
          (até 10 questões), é o reforço rápido — aparece na Trilha assim que o tópico é marcado
          como estudado, pra praticar na hora. Cada matéria também tem um link próprio pra revisão
          de 30 questões, que libera {DIAS_REVISAO_MATERIA} dias depois dela bater 100%. Clicando
          na atividade na Trilha, o link abre direto.
        </span>
      </div>

      {/* Matérias */}
      <div className="space-y-2">
        {materiasFiltradas.map((m) => {
          const cor = resolverCorMateria(m.nome, materiasAtivas);
          const aberto = expandidos[m.nome] ?? false;
          const blocosDaMateria = Object.values(blocos).filter((b) => b.materia === m.nome);
          const comLink = m.topicos.filter((t) => {
            const bloco = blocoDoTopico(blocos, m.nome, t);
            if (bloco) return !!bloco.linkRevisao7d || !!bloco.linkRevisao30d;
            const estado = topicos[topicoKey(m.nome, t)];
            return !!estado?.linkRevisao7d || !!estado?.linkRevisao30d;
          }).length;

          return (
            <div key={m.nome} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(m.nome)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-l-4 ${cor.border} hover:bg-accent transition-colors`}
              >
                <span className="text-muted-foreground flex-shrink-0">
                  {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="font-semibold text-sm flex-1 text-left text-foreground">{m.nome}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {comLink}/{m.topicos.length} com link
                </span>
              </button>

              {aberto && (
                <div className="divide-y divide-border">
                  {/* link da revisão de 30 questões — é por MATÉRIA, não por tópico */}
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 bg-amber-50/50 dark:bg-amber-950/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /> Revisão da matéria (30 questões)
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Libera {DIAS_REVISAO_MATERIA} dias depois da matéria bater 100%
                      </p>
                    </div>
                    <div className="w-full sm:w-80 flex-shrink-0">
                      <LinkInput
                        value={configCiclo.materias[m.nome]?.linkRevisaoMateria ?? ""}
                        onChange={(v) => updateLinkMateria(m.nome, v)}
                        placeholder="Link da revisão de 30 questões"
                      />
                    </div>
                  </div>

                  {/* Blocos: agrupam vários tópicos num único caderno de questões (ex.: os
                      "Blocos de Assuntos" do QuestFlow) — a atividade de questões da Trilha
                      pra esse bloco só aparece UMA vez, depois que TODOS os tópicos marcados
                      abaixo estiverem estudados */}
                  <div className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-950/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" /> Blocos de questões
                      </p>
                      <button
                        type="button"
                        onClick={() => criarBloco(m.nome)}
                        className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Novo bloco
                      </button>
                    </div>
                    {blocosDaMateria.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        Nenhum bloco — cada tópico usa o link 7d/30d dele mesmo, na lista abaixo. Crie um bloco quando vários tópicos compartilham o MESMO caderno de questões (ex.: um "Bloco" do QuestFlow).
                      </p>
                    ) : (
                      blocosDaMateria.map((bloco) => (
                        <div key={bloco.id} className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-card p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={bloco.nome}
                              onChange={(e) => atualizarBloco(bloco.id, { nome: e.target.value })}
                              className="flex-1 min-w-0 text-xs font-medium border border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{bloco.topicos.length} tópico{bloco.topicos.length !== 1 ? "s" : ""}</span>
                            <button
                              type="button"
                              onClick={() => excluirBloco(bloco.id)}
                              title="Excluir bloco"
                              className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">7d</span>
                              <LinkInput
                                value={bloco.linkRevisao7d ?? ""}
                                onChange={(v) => atualizarBloco(bloco.id, { linkRevisao7d: v.trim() || undefined })}
                                placeholder="Link da revisão de 7 dias"
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">30d</span>
                              <LinkInput
                                value={bloco.linkRevisao30d ?? ""}
                                onChange={(v) => atualizarBloco(bloco.id, { linkRevisao30d: v.trim() || undefined })}
                                placeholder="Link da revisão de 30 dias"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border">
                            {m.topicos.map((t) => {
                              const outroBloco = blocoDoTopico(blocos, m.nome, t);
                              const nesteBloco = bloco.topicos.includes(t);
                              const desabilitado = !!outroBloco && !nesteBloco;
                              return (
                                <label
                                  key={t}
                                  title={desabilitado ? `Já está em "${outroBloco!.nome}"` : t}
                                  className={`flex items-center gap-1.5 text-[11px] ${desabilitado ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground cursor-pointer"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={nesteBloco}
                                    disabled={desabilitado}
                                    onChange={() => toggleTopicoNoBloco(bloco.id, m.nome, t)}
                                    className="h-3 w-3 flex-shrink-0"
                                  />
                                  <span className="truncate max-w-[220px]">{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {m.topicos.map((t) => {
                    const key = topicoKey(m.nome, t);
                    const estado = topicos[key];
                    const bloco = blocoDoTopico(blocos, m.nome, t);
                    const status7 = bloco ? statusRevisaoLinkBloco(bloco, topicos, hoje, "d7") : statusRevisaoLink(estado, hoje, "d7");
                    const status30 = bloco ? statusRevisaoLinkBloco(bloco, topicos, hoje, "d30") : statusRevisaoLink(estado, hoje, "d30");
                    const pendenteLabel = bloco ? "aguardando todos os tópicos do bloco" : "conclua os 4 grupos A-D no Edital";
                    return (
                      <div key={t} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-relaxed" title={t}>{t}</p>
                          {(status7.tipo !== "sem_link" || status30.tipo !== "sem_link") && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {status7.tipo === "aguardando_grupos" || status30.tipo === "aguardando_grupos" ? (
                                <StatusBadge status={{ tipo: "aguardando_grupos" }} pendenteLabel={pendenteLabel} />
                              ) : (
                                <>
                                  <StatusBadge label="7d" status={status7} />
                                  <StatusBadge label="30d" status={status30} />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0 w-full sm:w-80">
                          {bloco ? (
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                              <Layers className="h-3 w-3 flex-shrink-0" /> Link gerenciado pelo bloco &quot;{bloco.nome}&quot; acima
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">7d</span>
                                <LinkInput
                                  value={estado?.linkRevisao7d ?? ""}
                                  onChange={(v) => updateLinkTopico(m.nome, t, "d7", v)}
                                  placeholder="Link da revisão de 7 dias"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">30d</span>
                                <LinkInput
                                  value={estado?.linkRevisao30d ?? ""}
                                  onChange={(v) => updateLinkTopico(m.nome, t, "d30", v)}
                                  placeholder="Link da revisão de 30 dias"
                                />
                              </div>
                              {!estado?.linkRevisao7d && !estado?.linkRevisao30d && (
                                <label className="flex items-center gap-1.5 pl-7 text-[10px] text-muted-foreground cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!estado?.revisaoLinkDispensada}
                                    onChange={(e) => updateRevisaoLinkDispensada(m.nome, t, e.target.checked)}
                                    className="h-3 w-3 rounded border-border"
                                  />
                                  Sem link — não vou cadastrar (não cobrar revisão desse tópico)
                                </label>
                              )}
                            </>
                          )}
                          <div className="flex items-center gap-1">
                            <span title="Reforço rápido — até 10 questões" className="w-6 flex-shrink-0 flex items-center justify-center">
                              <Zap className="h-3 w-3 text-orange-500" />
                            </span>
                            <LinkInput
                              value={estado?.linkReforcoImediato ?? ""}
                              onChange={(v) => updateLinkReforcoImediato(m.nome, t, v)}
                              placeholder="Link do reforço rápido (até 10 questões)"
                            />
                            {estado?.reforcoImediatoFeito && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0" title="Reforço rápido já feito">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {materiasFiltradas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum tópico encontrado para &quot;{busca}&quot;
        </div>
      )}
    </div>
  );
}
