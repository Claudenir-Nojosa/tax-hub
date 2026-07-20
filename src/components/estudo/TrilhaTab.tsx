"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, CalendarClock, CheckCircle2, ChevronDown, Clock, Layers,
  ListChecks, Route, Settings2, Sparkles, Trash2, Trophy, Zap,
} from "lucide-react";
import {
  MATERIAS, dateKeyLocal, topicoKey,
  type AtividadeCalendario, type EstudoConfigCiclo, type Grupo, type MateriaConcurso,
  type MateriaDef, type TopicoState, type TrilhaDinamicaState,
} from "@/lib/estudo-data";
import {
  computarMetaDia, criarTrilhaDinamica, grupoCicloSeguinte, resolverGrupoEfetivo,
  type MetaDia, type QuestaoLiberada,
} from "@/lib/trilha-dinamica";
import { fmtHoras, resolverCorMateria } from "./trilha/trilha-ui";

// Trilha DINÂMICA — nada de plano pré-gerado: a meta de HOJE é derivada na hora do estado real
// (tópicos estudados, cadernos A-D, sessões do calendário) pelas regras do método do usuário
// (src/lib/trilha-dinamica.ts). Este componente só apresenta a meta e grava o bookkeeping mínimo
// (posição do ciclo, datas de conclusão de matéria, revisões feitas) — se o usuário não entrega
// o dia, o grupo do ciclo não avança e a meta de amanhã "espera" por ele.

interface Props {
  trilha?: TrilhaDinamicaState;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  calendario: Record<string, AtividadeCalendario[]>;
  materiasConcurso?: MateriaConcurso[];
  onUpdateTrilha: (trilha: TrilhaDinamicaState | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onIrParaCiclo?: () => void;
  onIrParaBiblioteca?: () => void;
  onIrParaCartas?: () => void;
}

const GRUPO_LABEL: Record<Grupo, string> = { A: "Grupo A", B: "Grupo B", C: "Grupo C", D: "Grupo D" };

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function TrilhaTab({
  trilha, topicos, configCiclo, calendario, materiasConcurso,
  onUpdateTrilha, onUpdateTopicos, onIrParaCiclo, onIrParaBiblioteca, onIrParaCartas,
}: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const hoje = dateKeyLocal();

  const temMateriasNoCiclo = materiasAtivas.some((m) => configCiclo.materias[m.nome]?.incluir);

  const meta: MetaDia | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return computarMetaDia({ hoje, trilha, configCiclo, materiasAtivas, topicos, calendario });
  }, [trilha, configCiclo, materiasAtivas, topicos, calendario, hoje]);

  // ── bookkeeping 1: registra a DATA de conclusão de matérias recém-100% (agenda a revisão de
  // 30 questões pro dia seguinte)
  useEffect(() => {
    if (!trilha?.ativa || !meta) return;
    const novas = meta.analises.filter((a) => a.materiaConcluida && !trilha.conclusaoMaterias[a.materia]);
    if (novas.length === 0) return;
    const conclusaoMaterias = { ...trilha.conclusaoMaterias };
    for (const a of novas) conclusaoMaterias[a.materia] = hoje;
    onUpdateTrilha({ ...trilha, conclusaoMaterias });
  }, [trilha, meta, hoje, onUpdateTrilha]);

  // ── bookkeeping 2: entregou todos os blocos do dia → o ciclo avança (1x por dia). Sem
  // entrega, amanhã repete o mesmo grupo — é isso que torna a trilha "mutável pela entrega".
  useEffect(() => {
    if (!trilha?.ativa || !meta) return;
    if (!meta.blocosConcluidos || trilha.grupoCicloAvancadoEm === hoje) return;
    onUpdateTrilha({
      ...trilha,
      grupoCiclo: grupoCicloSeguinte(meta.grupoCiclo),
      grupoCicloAvancadoEm: hoje,
    });
  }, [trilha, meta, hoje, onUpdateTrilha]);

  if (!trilha?.ativa || !meta) {
    return (
      <Intro
        temMateriasNoCiclo={temMateriasNoCiclo}
        onAtivar={() => onUpdateTrilha(criarTrilhaDinamica())}
        onIrParaCiclo={onIrParaCiclo}
      />
    );
  }

  const registrarQuestoes = (q: QuestaoLiberada, acertos: number, erros: number) => {
    const key = topicoKey(q.materia, q.topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: { ...estado, cadernos: { ...estado.cadernos, [q.grupo]: { acertos, erros } } },
    });
  };

  const marcarRevisao30 = (materia: string) => {
    onUpdateTrilha({
      ...trilha,
      revisoes30Feitas: {
        ...trilha.revisoes30Feitas,
        [materia]: [...(trilha.revisoes30Feitas[materia] ?? []), hoje],
      },
    });
  };

  const marcarCartasFeitas = () => {
    onUpdateTrilha({ ...trilha, cartasFeitasEm: [...trilha.cartasFeitasEm, hoje] });
  };

  const desativar = () => {
    if (!confirm("Desativar a trilha dinâmica? O progresso do edital e dos cadernos não é perdido — só o acompanhamento diário some.")) return;
    onUpdateTrilha(undefined);
  };

  const blocosFeitos = meta.blocos.filter((b) => b.concluido).length;
  const materiasEmRevisao = meta.analises.filter(
    (a) => a.materiaConcluida && (trilha.revisoes30Feitas[a.materia] ?? []).length > 0
  );

  return (
    <div className="space-y-4">
      {/* header do dia */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Route className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Meta de hoje · {fmtDataCurta(meta.data)}</div>
              <div className="text-xs text-emerald-100">
                Dia do <b>grupo {meta.grupoCiclo}</b> do ciclo
                {meta.minutosDia > 0
                  ? ` · ${fmtHoras(meta.minutosDia)} de estudo${meta.blocos.length > 0 ? ` divididas em ${meta.blocos.length} matéria${meta.blocos.length > 1 ? "s" : ""}` : ""}`
                  : " · sem horas configuradas pra hoje (dia livre)"}
              </div>
            </div>
          </div>
          {meta.blocos.length > 0 && (
            <div className={`text-center rounded-xl px-4 py-2 ${meta.blocosConcluidos ? "bg-white/25" : "bg-white/10"}`}>
              <div className="text-lg font-bold tabular-nums">{blocosFeitos}/{meta.blocos.length}</div>
              <div className="text-[10px] text-emerald-100 uppercase tracking-wide">{meta.blocosConcluidos ? "dia entregue ✓" : "blocos de estudo"}</div>
            </div>
          )}
        </div>
        {meta.blocosConcluidos && (
          <div className="mt-3 text-xs bg-white/15 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Blocos de hoje entregues! Amanhã o ciclo segue pro{" "}
            {/* grupo EFETIVO de amanhã: se o grupo seguinte não tiver matéria com teoria
                pendente, o motor pula pra frente — mostrar o que de fato vai acontecer */}
            <b>grupo {resolverGrupoEfetivo(grupoCicloSeguinte(meta.grupoCiclo), configCiclo, materiasAtivas, topicos)}</b>.
          </div>
        )}
      </div>

      {/* revisão das cartas (a cada 2 domingos) */}
      {meta.revisarCartas ? (
        <div className="rounded-xl border-2 border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Layers className="h-6 w-6 text-violet-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Hoje é dia de revisar as cartas</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">A cada 2 domingos (14 dias) — revise o baralho na aba Cartas.</div>
          </div>
          <div className="flex gap-2">
            {onIrParaCartas && (
              <button type="button" onClick={onIrParaCartas} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center gap-1">
                Ir pras cartas <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <button type="button" onClick={marcarCartasFeitas} className="px-3 py-1.5 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-300 text-xs font-medium">
              Marcar feita
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 px-1">
          <CalendarClock className="h-3 w-3" />
          Próxima revisão das cartas: domingo {fmtDataCurta(meta.proximoDomingoCartas)}
        </div>
      )}

      {/* revisões de 30 questões (matéria concluída ontem ou antes) */}
      {meta.revisoes30.map((r) => (
        <div key={r.materia} className="rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {r.materia} — revisão da matéria
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Matéria 100% concluída em {fmtDataCurta(r.concluidaEm)}. Faça <b>30 questões englobando todos os tópicos</b> (não é 30 por tópico).
            </div>
          </div>
          <button type="button" onClick={() => marcarRevisao30(r.materia)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium self-start sm:self-auto">
            Concluí as 30 questões
          </button>
        </div>
      ))}

      {/* blocos de estudo do dia */}
      {meta.blocos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">Estudo de hoje — grupo {meta.grupoCiclo}</span>
            <span className="text-[11px] text-gray-400">tempo monitorado pelo leitor de PDF / Timer</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {meta.blocos.map((b) => {
              const cor = resolverCorMateria(b.materia, materiasAtivas);
              const perc = Math.min(100, Math.round((b.minutosFeitos / b.minutosAlvo) * 100));
              return (
                <div key={b.materia} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cor.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{b.materia}</div>
                    <div className="text-[11px] text-gray-400 truncate" title={b.topico}>tópico atual: {b.topico}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`rounded-full h-1.5 transition-all ${b.concluido ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${perc}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
                        {b.minutosFeitos}/{b.minutosAlvo} min
                      </span>
                    </div>
                  </div>
                  {b.concluido ? (
                    <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold flex-shrink-0"><CheckCircle2 className="h-4 w-4" /> feito</span>
                  ) : (
                    onIrParaBiblioteca && (
                      <button type="button" onClick={onIrParaBiblioteca} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-medium flex items-center gap-1">
                        Ler PDF <ArrowRight className="h-3 w-3" />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {meta.blocos.length === 0 && meta.minutosDia > 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 text-center text-xs text-gray-400">
          Nenhuma matéria com teoria pendente nos grupos do ciclo — configure o Ciclo de Estudos ou aproveite as questões abaixo.
        </div>
      )}

      {/* questões liberadas (escalonamento A/B/C/D) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <ListChecks className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">Questões liberadas</span>
          <span className="text-[11px] text-gray-400">{meta.questoesPendentes.length} pendente{meta.questoesPendentes.length !== 1 ? "s" : ""}</span>
        </div>
        {meta.questoesPendentes.length === 0 ? (
          <div className="px-4 py-5 text-center text-xs text-gray-400">
            Nada pendente — concluir um tópico libera o grupo A do anterior, o B do antepenúltimo, e assim por diante.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {meta.questoesPendentes.map((q) => (
              <LinhaQuestao key={q.id} q={q} materiasAtivas={materiasAtivas} onRegistrar={registrarQuestoes} />
            ))}
          </div>
        )}
      </div>

      {/* progresso por matéria */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">Progresso rumo aos 100%</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {meta.analises.map((a) => {
            const cor = resolverCorMateria(a.materia, materiasAtivas);
            const totalGrupos = a.totalTopicos * 4;
            const emRevisao = materiasEmRevisao.some((m) => m.materia === a.materia);
            return (
              <div key={a.materia} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cor.dot}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{a.materia}</span>
                {a.materiaConcluida ? (
                  <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> 100%{emRevisao ? " · em revisão" : ""}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                    teoria {a.topicosEstudados}/{a.totalTopicos} · questões {a.gruposFeitos}/{totalGrupos}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={desativar} className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
          <Trash2 className="h-3 w-3" /> Desativar trilha
        </button>
      </div>
    </div>
  );
}

// ─── Linha de questão liberada (registro inline de acertos/erros) ────────────

function LinhaQuestao({
  q, materiasAtivas, onRegistrar,
}: {
  q: QuestaoLiberada;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (q: QuestaoLiberada, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const cor = resolverCorMateria(q.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  return (
    <div className="px-4 py-2.5">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 text-left">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cor.badge} flex-shrink-0`}>{GRUPO_LABEL[q.grupo]}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-700 dark:text-gray-300">{q.materia}</span>
          <span className="text-xs text-gray-400"> · tópico {q.ordemTopico}: </span>
          <span className="text-xs text-gray-500 dark:text-gray-400" title={q.topico}>{q.topico.length > 60 ? q.topico.slice(0, 60) + "…" : q.topico}</span>
          <div className="text-[10px] text-gray-400">{q.motivo}</div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <label className="text-[11px] text-gray-500">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-gray-500">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(q, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tela de ativação ─────────────────────────────────────────────────────────

function Intro({
  temMateriasNoCiclo, onAtivar, onIrParaCiclo,
}: {
  temMateriasNoCiclo: boolean;
  onAtivar: () => void;
  onIrParaCiclo?: () => void;
}) {
  const regras = [
    { icone: Clock, texto: "Cada dia pertence a um grupo do ciclo (A/B/C). As horas do dia são divididas entre as matérias do grupo — ex.: 3h e 3 matérias = 1h de PDF em cada, no tópico atual. O tempo é monitorado pelo leitor de PDF." },
    { icone: ListChecks, texto: "Concluir um tópico libera questões dos anteriores: grupo A do último, B do penúltimo, C do antepenúltimo, D do anterior a esse — até fechar os 4 grupos de todos os tópicos." },
    { icone: Trophy, texto: "Matéria 100% (teoria + todos os grupos) entra em modo revisão: no dia seguinte, 30 questões englobando todos os tópicos dela." },
    { icone: Layers, texto: "A cada 2 domingos, revisão das cartas." },
    { icone: Sparkles, texto: "Trilha 100% mutável: o ciclo só avança quando você entrega os blocos do dia — a meta de amanhã depende do que você fez hoje." },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2.5 mb-1">
          <Route className="h-6 w-6" />
          <div className="text-xl font-bold">Trilha dinâmica</div>
        </div>
        <p className="text-sm text-emerald-100">
          Sua meta diária calculada automaticamente do seu progresso real — sem plano fixo, ela se adapta ao que você entrega.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {regras.map((r, i) => (
          <div key={i} className="px-4 py-3 flex gap-3">
            <r.icone className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 dark:text-gray-300">{r.texto}</p>
          </div>
        ))}
      </div>
      {!temMateriasNoCiclo && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="flex-1">Nenhuma matéria incluída no Ciclo de Estudos — configure o ciclo primeiro (grupos A/B/C e horas por dia).</span>
          {onIrParaCiclo && (
            <button type="button" onClick={onIrParaCiclo} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium whitespace-nowrap">Ir pro Ciclo</button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onAtivar}
        disabled={!temMateriasNoCiclo}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="h-4 w-4" /> Ativar trilha dinâmica
      </button>
    </div>
  );
}
