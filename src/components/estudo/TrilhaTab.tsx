"use client";

import { useMemo, useState } from "react";
import {
  BookOpen, HelpCircle, RotateCcw, Lock, CheckCircle2, ChevronDown, Sparkles,
  Signal, Route, RefreshCw, ArrowLeft, ArrowRight, PlusCircle, Target, CalendarClock, Trash2,
} from "lucide-react";
import {
  MATERIAS, topicoKey,
  TRILHA_DISPONIBILIDADE_CONFIG, TRILHA_NIVEL_CONFIG,
  type EstudoConfigCiclo, type MateriaBase, type TopicoState,
  type TrilhaAtividade, type TrilhaAtividadeStatus, type TrilhaConfig,
  type TrilhaDisponibilidade, type TrilhaEstudo, type TrilhaMeta, type TrilhaNivelMateria, type Grupo,
} from "@/lib/estudo-data";
import {
  gerarTrilha, estimarResumo, projetarTermino, atualizarTrilha, topicosNaoCobertos,
  proximoStatus, metaAtualIndex,
} from "@/lib/trilha-generator";

interface Props {
  trilha?: TrilhaEstudo;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  materiasConcurso?: MateriaBase[];
  dataProva?: string;
  concursoNome?: string;
  onUpdateTrilha: (trilha: TrilhaEstudo | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
}

// ─── Configs visuais ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TrilhaAtividadeStatus, { label: string; classe: string }> = {
  nao_iniciada: { label: "Não iniciada", classe: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600" },
  iniciada: { label: "Iniciada", classe: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
  falta_acabar: { label: "Falta acabar", classe: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
  concluida: { label: "Concluída", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
};

const TIPO_CONFIG = {
  teoria: { label: "Teoria", Icon: BookOpen, cor: "text-blue-500" },
  questoes: { label: "Questões", Icon: HelpCircle, cor: "text-violet-500" },
  revisao: { label: "Revisão", Icon: RotateCcw, cor: "text-emerald-500" },
} as const;

const DISPONIBILIDADE_ICONE: Record<TrilhaDisponibilidade, string> = {
  easy: "text-sky-500", normal: "text-emerald-500", hard: "text-amber-500", hardcore: "text-orange-600",
};

const NIVEIS: TrilhaNivelMateria[] = ["nunca", "comecei", "sem_confianca", "arestas"];

function fmtHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function fmtData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function corMateria(nome: string): string {
  const def = MATERIAS.find((m) => m.nome === nome) as { corBadge?: string } | undefined;
  return def?.corBadge ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TrilhaTab({
  trilha, topicos, configCiclo, materiasConcurso, dataProva, concursoNome,
  onUpdateTrilha, onUpdateTopicos,
}: Props) {
  const MATERIAS_ATIVAS: MateriaBase[] = materiasConcurso ?? MATERIAS;

  const [modoWizard, setModoWizard] = useState(false);
  const emWizard = !trilha || modoWizard;

  return emWizard ? (
    <Wizard
      materias={MATERIAS_ATIVAS}
      topicos={topicos}
      configCiclo={configCiclo}
      dataProva={dataProva}
      concursoNome={concursoNome}
      configAnterior={trilha?.config}
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
  materias, topicos, configCiclo, dataProva, concursoNome, configAnterior, onGerar, onCancelar,
}: {
  materias: MateriaBase[];
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  dataProva?: string;
  concursoNome?: string;
  configAnterior?: TrilhaConfig;
  onGerar: (trilha: TrilhaEstudo) => void;
  onCancelar?: () => void;
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [disponibilidade, setDisponibilidade] = useState<TrilhaDisponibilidade>(
    configAnterior?.disponibilidade ?? "normal"
  );
  // pré-preenchimento: matéria 100% estudada no Edital → arestas; incluir=false no ciclo → pulada
  const [niveis, setNiveis] = useState<Record<string, TrilhaNivelMateria>>(() => {
    if (configAnterior) return { ...configAnterior.nivelPorMateria };
    const init: Record<string, TrilhaNivelMateria> = {};
    for (const m of materias) {
      const todosEstudados = m.topicos.length > 0 && m.topicos.every((t) => topicos[topicoKey(m.nome, t)]?.estudado);
      init[m.nome] = todosEstudados ? "arestas" : "nunca";
    }
    return init;
  });
  const [puladas, setPuladas] = useState<Set<string>>(() => {
    if (configAnterior) return new Set(configAnterior.puladas);
    return new Set(materias.filter((m) => configCiclo.materias[m.nome]?.incluir === false).map((m) => m.nome));
  });

  const config: TrilhaConfig = useMemo(
    () => ({ disponibilidade, nivelPorMateria: niveis, puladas: [...puladas] }),
    [disponibilidade, niveis, puladas]
  );

  // passo 3: gera em memória (síncrono e rápido) pra mostrar o resumo antes de confirmar
  const preview = useMemo(() => {
    if (passo !== 3) return null;
    try {
      const metas = gerarTrilha({ materias, config, topicos, configCiclo });
      return { metas, resumo: estimarResumo(metas, dataProva) };
    } catch {
      return null;
    }
  }, [passo, materias, config, topicos, configCiclo, dataProva]);

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
            Isso define quanto de teoria e quantas questões a trilha vai propor por matéria. Matérias marcadas como
            "pular" ficam fora da trilha.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_repeat(4,110px)_70px] gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span>Disciplina</span>
              {NIVEIS.map((n) => (
                <span key={n} className="text-center leading-tight">{TRILHA_NIVEL_CONFIG[n].label}</span>
              ))}
              <span className="text-center">Pular</span>
            </div>
            {materias.map((m) => {
              const pulada = puladas.has(m.nome);
              return (
                <div
                  key={m.nome}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_repeat(4,110px)_70px] gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 items-center ${
                    pulada ? "opacity-40" : ""
                  }`}
                >
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{m.nome}</span>
                  {NIVEIS.map((n) => (
                    <div key={n} className="flex md:justify-center items-center gap-1.5">
                      <button
                        type="button"
                        disabled={pulada}
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
                  <div className="flex md:justify-center items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={pulada}
                      onChange={() =>
                        setPuladas((prev) => {
                          const nova = new Set(prev);
                          if (nova.has(m.nome)) nova.delete(m.nome);
                          else nova.add(m.nome);
                          return nova;
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                    />
                    <span className="md:hidden text-[11px] text-gray-500">Pular matéria</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Passo 3 — Conclusão */}
      {passo === 3 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sua trilha está pronta pra nascer</h3>
          {!preview ? (
            <p className="text-sm text-red-500">Não foi possível montar a trilha — verifique se há matérias não puladas.</p>
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
                A trilha cobre 100% dos tópicos das matérias não puladas: teoria conforme seu nível, questões com
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
              onClick={() => setPasso((p) => (p + 1) as 2 | 3)}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
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
  trilha, topicos, configCiclo, materias, dataProva, onUpdateTrilha, onUpdateTopicos, onRefazer, onExcluir,
}: {
  trilha: TrilhaEstudo;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  materias: MateriaBase[];
  dataProva?: string;
  onUpdateTrilha: (t: TrilhaEstudo) => void;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
  onRefazer: () => void;
  onExcluir: () => void;
}) {
  const [expandida, setExpandida] = useState<number | null>(null); // metas concluídas expansíveis
  const idxAtual = metaAtualIndex(trilha.metas);

  const totalAtividades = trilha.metas.reduce((s, m) => s + m.atividades.length, 0);
  const concluidas = trilha.metas.reduce((s, m) => s + m.atividades.filter((a) => a.status === "concluida").length, 0);
  const percGeral = totalAtividades > 0 ? Math.round((concluidas / totalAtividades) * 100) : 0;
  const projecao = projetarTermino(trilha);
  const naoCobertos = useMemo(() => topicosNaoCobertos(trilha, materias), [trilha, materias]);

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

      {/* Metas */}
      <div className="space-y-2.5">
        {trilha.metas.map((meta, idx) => {
          const status: "concluida" | "atual" | "futura" =
            idx < idxAtual ? "concluida" : idx === idxAtual ? "atual" : "futura";
          const aberta = status === "atual" || expandida === meta.numero;
          return (
            <MetaCard
              key={meta.numero}
              meta={meta}
              estado={status}
              aberta={aberta}
              onToggle={() =>
                status === "concluida" ? setExpandida(expandida === meta.numero ? null : meta.numero) : undefined
              }
              onStatusClick={(atividadeId) => handleStatusClick(meta.numero, atividadeId)}
              topicos={topicos}
              onUpdateTopicos={onUpdateTopicos}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Card de meta ────────────────────────────────────────────────────────────

function MetaCard({
  meta, estado, aberta, onToggle, onStatusClick, topicos, onUpdateTopicos,
}: {
  meta: TrilhaMeta;
  estado: "concluida" | "atual" | "futura";
  aberta: boolean;
  onToggle: () => void;
  onStatusClick: (atividadeId: string) => void;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
}) {
  const materiasDaMeta = [...new Set(meta.atividades.map((a) => a.materia))];
  const duracao = meta.atividades.reduce((s, a) => s + a.duracaoMin, 0);
  const feitas = meta.atividades.filter((a) => a.status === "concluida").length;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        estado === "atual"
          ? "border-emerald-400 dark:border-emerald-600 bg-white dark:bg-gray-800 shadow-md"
          : estado === "concluida"
          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60"
          : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 opacity-70"
      }`}
    >
      {/* Cabeçalho da meta */}
      <button
        type="button"
        onClick={onToggle}
        disabled={estado === "futura"}
        className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed"
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
            estado === "concluida"
              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              : estado === "atual"
              ? "bg-emerald-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400"
          }`}
        >
          {estado === "concluida" ? <CheckCircle2 className="h-4.5 w-4.5" /> : estado === "futura" ? <Lock className="h-4 w-4" /> : meta.numero}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Meta {meta.numero}</span>
            <span className="text-xs text-gray-400">
              {meta.atividades.length} atividades · {fmtHoras(duracao)}
              {estado !== "futura" && ` · ${feitas}/${meta.atividades.length} feitas`}
            </span>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {materiasDaMeta.slice(0, 4).map((m) => (
              <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded ${corMateria(m)}`}>
                {m.length > 28 ? m.slice(0, 28) + "…" : m}
              </span>
            ))}
            {materiasDaMeta.length > 4 && <span className="text-[10px] text-gray-400">+{materiasDaMeta.length - 4}</span>}
          </div>
        </div>
        {estado === "concluida" && (
          <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${aberta ? "" : "-rotate-90"}`} />
        )}
      </button>

      {/* Corpo */}
      {aberta && estado !== "futura" && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
          {meta.orientacao && (
            <div className="flex gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-3 py-2">
              <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">{meta.orientacao}</p>
            </div>
          )}
          {meta.atividades.map((a) => (
            <AtividadeRow
              key={a.id}
              atividade={a}
              somenteLeitura={estado === "concluida"}
              onStatusClick={() => onStatusClick(a.id)}
              topicos={topicos}
              onUpdateTopicos={onUpdateTopicos}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Linha de atividade ──────────────────────────────────────────────────────

function AtividadeRow({
  atividade, somenteLeitura, onStatusClick, topicos, onUpdateTopicos,
}: {
  atividade: TrilhaAtividade;
  somenteLeitura: boolean;
  onStatusClick: () => void;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
}) {
  const [formAberto, setFormAberto] = useState(false);
  const cfg = TIPO_CONFIG[atividade.tipo];
  const st = STATUS_CONFIG[atividade.status];

  const rotulo =
    atividade.tipo === "teoria"
      ? atividade.teoriaRapida ? "Teoria — revisão rápida" : "Teoria"
      : atividade.tipo === "questoes"
      ? `${atividade.quantidadeQuestoes} questões`
      : `Revisão ${atividade.numeroRevisao === 1 ? "(1ª — ±7 dias)" : "(2ª — ±30 dias)"}`;

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <cfg.Icon className={`h-4 w-4 flex-shrink-0 ${cfg.cor}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
            {rotulo} <span className="text-gray-400 font-normal">· {atividade.materia} · {fmtHoras(atividade.duracaoMin)}</span>
          </div>
          <div className="text-[11px] text-gray-400 truncate" title={atividade.topicos.join(" · ")}>
            {atividade.topicos.join(" · ")}
          </div>
        </div>
        {atividade.tipo === "questoes" && !somenteLeitura && (
          <button
            type="button"
            onClick={() => setFormAberto((v) => !v)}
            className="text-[11px] px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors flex-shrink-0"
          >
            Registrar resultado
          </button>
        )}
        <button
          type="button"
          disabled={somenteLeitura}
          onClick={onStatusClick}
          title="Clique pra avançar o status"
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${st.classe} ${
            somenteLeitura ? "cursor-default" : "hover:scale-105"
          }`}
        >
          {st.label}
        </button>
      </div>
      {formAberto && (
        <RegistrarResultado
          atividade={atividade}
          topicos={topicos}
          onUpdateTopicos={onUpdateTopicos}
          onFechar={() => setFormAberto(false)}
        />
      )}
    </div>
  );
}

// mini-form: soma acertos/erros no caderno (A-D) do tópico escolhido — mesmo shape do Edital,
// então a média/XP existentes reagem sozinhos. Registrar NÃO muda o status (fica manual).
function RegistrarResultado({
  atividade, topicos, onUpdateTopicos, onFechar,
}: {
  atividade: TrilhaAtividade;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
  onFechar: () => void;
}) {
  const [topico, setTopico] = useState(atividade.topicos[0] ?? "");
  const [grupo, setGrupo] = useState<Grupo>("A");
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");

  const salvar = () => {
    const a = parseInt(acertos) || 0;
    const e = parseInt(erros) || 0;
    if (a + e === 0 || !topico) return;
    const k = topicoKey(atividade.materia, topico);
    const atual = topicos[k] ?? {
      estudado: false,
      cadernos: { A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 } },
    };
    onUpdateTopicos({
      ...topicos,
      [k]: {
        ...atual,
        cadernos: {
          ...atual.cadernos,
          [grupo]: { acertos: atual.cadernos[grupo].acertos + a, erros: atual.cadernos[grupo].erros + e },
        },
      },
    });
    onFechar();
  };

  return (
    <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[10px] text-gray-400 mb-0.5">Tópico</label>
        <select
          value={topico}
          onChange={(e) => setTopico(e.target.value)}
          className="w-full text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {atividade.topicos.map((t) => (
            <option key={t} value={t}>{t.length > 60 ? t.slice(0, 60) + "…" : t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Grupo</label>
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as Grupo)}
          className="text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {(["A", "B", "C", "D"] as Grupo[]).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Acertos</label>
        <input
          type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)}
          className="w-16 text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Erros</label>
        <input
          type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)}
          className="w-16 text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>
      <button
        type="button"
        onClick={salvar}
        className="text-[11px] px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
      >
        Salvar no caderno
      </button>
    </div>
  );
}
