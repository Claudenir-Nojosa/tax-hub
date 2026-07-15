"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2, Sparkles,
  Signal, Route, RefreshCw, ArrowLeft, ArrowRight, PlusCircle, Target, CalendarClock, Trash2, Settings2,
} from "lucide-react";
import {
  MATERIAS, topicoKey,
  TRILHA_DISPONIBILIDADE_CONFIG, TRILHA_NIVEL_CONFIG,
  type EstudoConfigCiclo, type MateriaConcurso, type MateriaDef, type TopicoState,
  type TrilhaConfig,
  type TrilhaDisponibilidade, type TrilhaEstudo, type TrilhaNivelMateria,
} from "@/lib/estudo-data";
import {
  gerarTrilha, estimarResumo, projetarTermino, atualizarTrilha, topicosNaoCobertos,
  proximoStatus, metaAtualIndex, materiasConcluidasNaTrilha,
} from "@/lib/trilha-generator";
import { fmtHoras, fmtData } from "./trilha/trilha-ui";
import TrilhaPath from "./trilha/TrilhaPath";
import MetaPainel from "./trilha/MetaPainel";
import MateriaConcluidaBanner from "./trilha/MateriaConcluidaBanner";

interface Props {
  trilha?: TrilhaEstudo;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  materiasConcurso?: MateriaConcurso[];
  dataProva?: string;
  concursoNome?: string;
  onUpdateTrilha: (trilha: TrilhaEstudo | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onUpdateConfigCiclo?: (config: EstudoConfigCiclo) => void;
  onIrParaCiclo?: () => void;
}

const DISPONIBILIDADE_ICONE: Record<TrilhaDisponibilidade, string> = {
  easy: "text-sky-500", normal: "text-emerald-500", hard: "text-amber-500", hardcore: "text-orange-600",
};

const NIVEIS: TrilhaNivelMateria[] = ["nunca", "comecei", "sem_confianca", "arestas"];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TrilhaTab({
  trilha, topicos, configCiclo, materiasConcurso, dataProva, concursoNome,
  onUpdateTrilha, onUpdateTopicos, onUpdateConfigCiclo, onIrParaCiclo,
}: Props) {
  const MATERIAS_ATIVAS: (MateriaDef | MateriaConcurso)[] = materiasConcurso ?? MATERIAS;

  const [modoWizard, setModoWizard] = useState(false);
  const emWizard = !trilha || modoWizard;

  // matérias já 100% concluídas na trilha atual — usado pro wizard (Refazer não regenera
  // conteúdo novo pra elas) e é vazio na primeiríssima geração (sem trilha anterior)
  const materiasConcluidas = useMemo(() => (trilha ? materiasConcluidasNaTrilha(trilha) : []), [trilha]);

  return emWizard ? (
    <Wizard
      materias={MATERIAS_ATIVAS}
      topicos={topicos}
      configCiclo={configCiclo}
      dataProva={dataProva}
      concursoNome={concursoNome}
      configAnterior={trilha?.config}
      materiasConcluidas={materiasConcluidas}
      onIrParaCiclo={onIrParaCiclo}
      onCancelar={trilha ? () => setModoWizard(false) : undefined}
      onGerar={(novaTrilha) => {
        onUpdateTrilha(novaTrilha);
        setModoWizard(false);
        buscarOrientacoes(novaTrilha, concursoNome, dataProva, onUpdateTrilha);
      }}
    />
  ) : (
    <TrilhaAtiva
      trilha={trilha!}
      topicos={topicos}
      configCiclo={configCiclo}
      materias={MATERIAS_ATIVAS}
      dataProva={dataProva}
      onUpdateTrilha={onUpdateTrilha}
      onUpdateTopicos={onUpdateTopicos}
      onUpdateConfigCiclo={onUpdateConfigCiclo}
      onRefazer={() => setModoWizard(true)}
      onExcluir={() => onUpdateTrilha(undefined)}
    />
  );
}

// orientações da IA em background: salva a trilha determinística primeiro; se a IA falhar,
// nada quebra (a trilha continua sem os textos)
async function buscarOrientacoes(
  trilha: TrilhaEstudo,
  concursoNome: string | undefined,
  dataProva: string | undefined,
  onUpdateTrilha: (t: TrilhaEstudo) => void
) {
  try {
    const resumo = trilha.metas.map((m) => ({
      numero: m.numero,
      materias: [...new Set(m.atividades.map((a) => a.materia))],
      nTopicos: new Set(m.atividades.flatMap((a) => a.topicos.map((t) => `${a.materia}|${t}`))).size,
      temTeoria: m.atividades.some((a) => a.tipo === "teoria"),
      temRevisao: m.atividades.some((a) => a.tipo === "revisao"),
    }));
    const res = await fetch("/api/estudo/trilha/orientacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concursoNome, dataProva, metas: resumo }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { orientacoes?: Record<string, string> };
    if (!data.orientacoes) return;
    onUpdateTrilha({
      ...trilha,
      metas: trilha.metas.map((m) => ({ ...m, orientacao: data.orientacoes![String(m.numero)] ?? m.orientacao })),
    });
  } catch {
    // silencioso por design — trilha funciona sem orientações
  }
}

// ─── Wizard (3 passos, estilo Gurujá) ────────────────────────────────────────

function Wizard({
  materias, topicos, configCiclo, dataProva, concursoNome, configAnterior, materiasConcluidas,
  onIrParaCiclo, onGerar, onCancelar,
}: {
  materias: (MateriaDef | MateriaConcurso)[];
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  dataProva?: string;
  concursoNome?: string;
  configAnterior?: TrilhaConfig;
  materiasConcluidas: string[];
  onIrParaCiclo?: () => void;
  onGerar: (trilha: TrilhaEstudo) => void;
  onCancelar?: () => void;
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [disponibilidade, setDisponibilidade] = useState<TrilhaDisponibilidade>(
    configAnterior?.disponibilidade ?? "normal"
  );
  const [niveis, setNiveis] = useState<Record<string, TrilhaNivelMateria>>(() => {
    if (configAnterior) return { ...configAnterior.nivelPorMateria };
    const init: Record<string, TrilhaNivelMateria> = {};
    for (const m of materias) {
      const todosEstudados = m.topicos.length > 0 && m.topicos.every((t) => topicos[topicoKey(m.nome, t)]?.estudado);
      init[m.nome] = todosEstudados ? "arestas" : "nunca";
    }
    return init;
  });

  // fonte de verdade de "matéria ativa" é o Ciclo de Estudos — não existe mais uma lista própria
  // de "puladas" no wizard da trilha (ver docs/estudo-trilha.md)
  const graduadasSet = new Set(materiasConcluidas);
  const totalNoCiclo = materias.filter((m) => configCiclo.materias[m.nome]?.incluir ?? false).length;
  const materiasElegiveis = materias.filter(
    (m) => (configCiclo.materias[m.nome]?.incluir ?? false) && !graduadasSet.has(m.nome)
  );

  const config: TrilhaConfig = useMemo(() => ({ disponibilidade, nivelPorMateria: niveis }), [disponibilidade, niveis]);

  // passo 3: gera em memória (síncrono e rápido) pra mostrar o resumo antes de confirmar
  const preview = useMemo(() => {
    if (passo !== 3) return null;
    try {
      const metas = gerarTrilha({ materias, config, topicos, configCiclo, materiasConcluidas });
      return { metas, resumo: estimarResumo(metas, dataProva) };
    } catch {
      return null;
    }
  }, [passo, materias, config, topicos, configCiclo, dataProva, materiasConcluidas]);

  const PASSOS = ["Disponibilidade", "Conhecimentos", "Conclusão"];

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-0">
        {PASSOS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const ativo = passo === n;
          const feito = passo > n;
          return (
            <div key={label} className="flex items-center">
              {i > 0 && <div className={`w-10 sm:w-20 h-0.5 ${feito || ativo ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
              <div className="flex flex-col items-center gap-1 px-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${
                    feito
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : ativo
                      ? "border-emerald-500 text-emerald-500"
                      : "border-gray-300 dark:border-gray-600 text-gray-400"
                  }`}
                >
                  {feito ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span className={`text-xs ${ativo ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"}`}>{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faixa fixa: Ciclo é a fonte de verdade das matérias ativas */}
      <div className="flex items-center justify-between gap-3 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-gray-400" />
          Matérias no Ciclo: <strong className="text-gray-700 dark:text-gray-200">{totalNoCiclo}</strong> incluída(s)
          {graduadasSet.size > 0 && ` · ${graduadasSet.size} já concluída(s)`}
        </span>
        {onIrParaCiclo && (
          <button type="button" onClick={onIrParaCiclo} className="shrink-0 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Editar Ciclo →
          </button>
        )}
      </div>

      {materiasElegiveis.length === 0 && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-3">
          <span>Nenhuma matéria elegível no Ciclo de Estudos (todas fora ou já concluídas na trilha) — inclua ao menos uma pra gerar a trilha.</span>
          {onIrParaCiclo && (
            <button type="button" onClick={onIrParaCiclo} className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors">
              Ir para o Ciclo
            </button>
          )}
        </div>
      )}

      {/* Passo 1 — Disponibilidade */}
      {passo === 1 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quanto tempo deseja se dedicar aos estudos?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(TRILHA_DISPONIBILIDADE_CONFIG) as TrilhaDisponibilidade[]).map((d) => {
              const cfg = TRILHA_DISPONIBILIDADE_CONFIG[d];
              const sel = disponibilidade === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDisponibilidade(d)}
                  className={`rounded-2xl border-2 p-5 text-center transition-all ${
                    sel
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <Signal className={`h-8 w-8 mx-auto mb-2 ${DISPONIBILIDADE_ICONE[d]}`} />
                  <div className="text-base font-bold text-gray-900 dark:text-white">{cfg.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cfg.faixa}</div>
                  <div
                    className={`mt-3 mx-auto w-4 h-4 rounded-full border-2 ${
                      sel ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Passo 2 — Conhecimentos */}
      {passo === 2 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Em que nível você se encontra em cada matéria?</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Isso define quanto de teoria e quantas questões a trilha vai propor por matéria. Só entram matérias incluídas no
            Ciclo de Estudos e ainda não concluídas na trilha.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_repeat(4,110px)] gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span>Disciplina</span>
              {NIVEIS.map((n) => (
                <span key={n} className="text-center leading-tight">{TRILHA_NIVEL_CONFIG[n].label}</span>
              ))}
            </div>
            {materiasElegiveis.map((m) => (
              <div
                key={m.nome}
                className="grid grid-cols-1 md:grid-cols-[1fr_repeat(4,110px)] gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 items-center"
              >
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{m.nome}</span>
                {NIVEIS.map((n) => (
                  <div key={n} className="flex md:justify-center items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNiveis((prev) => ({ ...prev, [m.nome]: n }))}
                      title={TRILHA_NIVEL_CONFIG[n].label}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        niveis[m.nome] === n
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300 dark:border-gray-600 hover:border-emerald-400"
                      }`}
                    >
                      {niveis[m.nome] === n && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                    <span className="md:hidden text-[11px] text-gray-500">{TRILHA_NIVEL_CONFIG[n].curto}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passo 3 — Conclusão */}
      {passo === 3 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sua trilha está pronta pra nascer</h3>
          {!preview ? (
            <p className="text-sm text-red-500">Não foi possível montar a trilha — verifique se há matérias incluídas no Ciclo de Estudos.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Metas", valor: String(preview.resumo.totalMetas), Icon: Target },
                  { label: "Carga total", valor: fmtHoras(preview.resumo.totalMinutos), Icon: CalendarClock },
                  { label: "Duração estimada", valor: `${preview.resumo.semanasEstimadas} semanas`, Icon: Route },
                  { label: "Término projetado", valor: fmtData(preview.resumo.dataProjetada), Icon: Sparkles },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                    <c.Icon className="h-5 w-5 mx-auto mb-1.5 text-emerald-500" />
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{c.valor}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
                  </div>
                ))}
              </div>
              {preview.resumo.diasAteProva !== undefined && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    preview.resumo.cabeAteProva
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                  }`}
                >
                  {preview.resumo.cabeAteProva
                    ? `No ritmo de 1 meta por semana você conclui o edital antes da prova (faltam ${preview.resumo.diasAteProva} dias). 🎯`
                    : `No ritmo de 1 meta por semana a trilha passa da data da prova (faltam ${preview.resumo.diasAteProva} dias). Considere subir a disponibilidade — ou conte com acelerar concluindo mais de uma meta por semana.`}
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                A trilha cobre 100% dos tópicos das matérias incluídas no Ciclo: teoria conforme seu nível, questões com
                quantidade definida e 2 revisões espaçadas por bloco. Depois de gerar, a IA escreve uma orientação
                pra cada meta.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navegação */}
      <div className="flex justify-between items-center pt-2">
        <div>
          {onCancelar && (
            <button type="button" onClick={onCancelar} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Cancelar e voltar pra trilha atual
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {passo > 1 && (
            <button
              type="button"
              onClick={() => setPasso((p) => (p - 1) as 1 | 2)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          {passo < 3 ? (
            <button
              type="button"
              disabled={materiasElegiveis.length === 0}
              onClick={() => setPasso((p) => (p + 1) as 2 | 3)}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40"
            >
              Avançar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!preview}
              onClick={() => {
                if (!preview) return;
                onGerar({ config, metas: preview.metas, criadaEm: new Date().toISOString(), versao: 1 });
              }}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" /> Gerar minha trilha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trilha ativa ────────────────────────────────────────────────────────────

function TrilhaAtiva({
  trilha, topicos, configCiclo, materias, dataProva, onUpdateTrilha, onUpdateTopicos, onUpdateConfigCiclo, onRefazer, onExcluir,
}: {
  trilha: TrilhaEstudo;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  materias: (MateriaDef | MateriaConcurso)[];
  dataProva?: string;
  onUpdateTrilha: (t: TrilhaEstudo) => void;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
  onUpdateConfigCiclo?: (c: EstudoConfigCiclo) => void;
  onRefazer: () => void;
  onExcluir: () => void;
}) {
  const [metaSelecionada, setMetaSelecionada] = useState<number | null>(null);
  const idxAtual = metaAtualIndex(trilha.metas);

  const totalAtividades = trilha.metas.reduce((s, m) => s + m.atividades.length, 0);
  const concluidas = trilha.metas.reduce((s, m) => s + m.atividades.filter((a) => a.status === "concluida").length, 0);
  const percGeral = totalAtividades > 0 ? Math.round((concluidas / totalAtividades) * 100) : 0;
  const projecao = projetarTermino(trilha);
  const naoCobertos = useMemo(() => topicosNaoCobertos(trilha, materias, configCiclo), [trilha, materias, configCiclo]);

  const handleStatusClick = (metaNumero: number, atividadeId: string) => {
    const metas = trilha.metas.map((m) => {
      if (m.numero !== metaNumero) return m;
      const atividades = m.atividades.map((a) =>
        a.id === atividadeId ? { ...a, status: proximoStatus(a.status) } : a
      );
      const completa = atividades.every((a) => a.status === "concluida");
      return {
        ...m,
        atividades,
        // marca a conclusão da meta na primeira vez que fecha; reabrir atividade reabre a meta
        concluidaEm: completa ? m.concluidaEm ?? new Date().toISOString() : undefined,
      };
    });
    onUpdateTrilha({ ...trilha, metas });

    // efeito colateral: TEORIA concluída marca os tópicos como estudados no Edital (one-way —
    // voltar o status da atividade NÃO desmarca o Edital, pra não perder XP por misclick)
    const meta = trilha.metas.find((m) => m.numero === metaNumero);
    const atividade = meta?.atividades.find((a) => a.id === atividadeId);
    if (atividade && atividade.tipo === "teoria" && proximoStatus(atividade.status) === "concluida") {
      const novos = { ...topicos };
      for (const t of atividade.topicos) {
        const k = topicoKey(atividade.materia, t);
        novos[k] = {
          estudado: true,
          cadernos: novos[k]?.cadernos ?? {
            A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 },
          },
        };
      }
      onUpdateTopicos(novos);
    }
  };

  const handleAtualizar = () => {
    onUpdateTrilha(atualizarTrilha(trilha, materias, topicos, configCiclo));
  };

  const idxSelecionada = metaSelecionada !== null ? trilha.metas.findIndex((m) => m.numero === metaSelecionada) : -1;
  const metaObj = idxSelecionada === -1 ? null : trilha.metas[idxSelecionada];
  const estadoSelecionada: "concluida" | "atual" | "futura" =
    idxSelecionada === -1 ? "futura" : idxSelecionada < idxAtual ? "concluida" : idxSelecionada === idxAtual ? "atual" : "futura";

  return (
    <div className="space-y-5">
      {/* Header de progresso */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Route className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Trilha de Estudos</div>
              <div className="text-xs text-emerald-100">
                Meta {trilha.metas[idxAtual]?.numero ?? "-"} de {trilha.metas.length} ·{" "}
                {projecao.ritmoMetasPorSemana !== null
                  ? `seu ritmo: ${projecao.ritmoMetasPorSemana} meta(s)/semana`
                  : "ritmo estimado: 1 meta/semana"}
                {projecao.dataProjetada && ` · término ~${fmtData(projecao.dataProjetada)}`}
                {dataProva && ` · prova ${fmtData(new Date(dataProva))}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {naoCobertos.length > 0 && (
              <button
                type="button"
                onClick={handleAtualizar}
                title={`${naoCobertos.length} tópico(s) novo(s) no edital fora da trilha`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Atualizar trilha ({naoCobertos.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm("Refazer a trilha do zero? Tópicos com teoria já concluída não repetirão teoria (o Edital continua marcado), mas o progresso de questões/revisões da trilha atual será perdido.")) onRefazer();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refazer
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Excluir a trilha atual? As metas e o progresso de atividades (status, orientações) somem — os tópicos já marcados como estudados no Edital e os cadernos de questões continuam intactos. Você pode criar uma trilha nova depois."))
                  onExcluir();
              }}
              title="Excluir a trilha e voltar ao início"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-red-500/40 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </div>
        <div className="bg-emerald-900/40 rounded-full h-2.5">
          <div className="bg-white rounded-full h-2.5 transition-all duration-500" style={{ width: `${percGeral}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-emerald-100">
          <span>{concluidas}/{totalAtividades} atividades</span>
          <span>{percGeral}%</span>
        </div>
      </div>

      {onUpdateConfigCiclo && (
        <MateriaConcluidaBanner
          trilha={trilha}
          materiasAtivas={materias}
          configCiclo={configCiclo}
          onUpdateConfigCiclo={onUpdateConfigCiclo}
        />
      )}

      {/* Caminho estilo Duolingo — 1 nó por meta */}
      <TrilhaPath
        metas={trilha.metas}
        idxAtual={idxAtual}
        materiasAtivas={materias}
        onSelectMeta={setMetaSelecionada}
      />
      <MetaPainel
        meta={metaObj}
        estado={estadoSelecionada}
        aberto={metaSelecionada !== null && estadoSelecionada !== "futura"}
        onClose={() => setMetaSelecionada(null)}
        onStatusClick={(atividadeId) => metaSelecionada !== null && handleStatusClick(metaSelecionada, atividadeId)}
        topicos={topicos}
        onUpdateTopicos={onUpdateTopicos}
      />
    </div>
  );
}
