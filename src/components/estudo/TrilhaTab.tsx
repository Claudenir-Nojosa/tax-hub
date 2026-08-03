"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, Check, ChevronDown, Clock, ExternalLink,
  Flame, Layers, ListChecks, Route, Settings2, Sparkles, Target, Trash2, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MATERIAS, calcularStreakDias, dateKeyLocal, topicoKey, GRUPO_LABEL, GRUPO_BADGE,
  type AtividadeCalendario, type EstudoConfigCiclo, type Grupo, type MateriaConcurso,
  type MateriaDef, type PdfEstudo, type TopicoState, type TrilhaDinamicaState,
} from "@/lib/estudo-data";
import {
  computarMetaSemana, criarTrilhaDinamica,
  type AnaliseMateria, type BlocoEstudoSemana, type MetaSemana, type QuestaoLiberada,
  type ReforcoGrupo, type Revisao30, type RevisaoLinkPendente,
} from "@/lib/trilha-dinamica";
import { fmtHoras, resolverCorMateria, TIPO_ITEM_COR, type TipoPasso } from "./trilha/trilha-ui";
import ProgressRing from "./ui/ProgressRing";
import EstudoHero from "./ui/EstudoHero";

// Trilha DINÂMICA — nada de plano pré-gerado: a meta de HOJE é derivada na hora do estado real
// (tópicos estudados, cadernos A-D, sessões do calendário) pelas regras do método do usuário
// (src/lib/trilha-dinamica.ts). Este componente só apresenta a meta e grava o bookkeeping mínimo
// (posição do ciclo, datas de conclusão de matéria, revisões feitas) — se o usuário não entrega
// o dia, o grupo do ciclo não avança e a meta de amanhã "espera" por ele.
//
// Visual: um único "checklist" vertical (timeline) reúne tudo que é acionável hoje — blocos de
// estudo, questões liberadas, revisão de 30 e cartas — em vez de cards soltos sem hierarquia.
// Cores de cada TIPO de item (estudo/questões/revisão/cartas) são fixas (ver TIPO_ITEM), não
// dinâmicas por matéria, pra evitar classes Tailwind interpoladas (não são detectadas pelo JIT).

interface Props {
  trilha?: TrilhaDinamicaState;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
  materiasConcurso?: MateriaConcurso[];
  onUpdateTrilha: (trilha: TrilhaDinamicaState | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onIrParaCiclo?: () => void;
  onIrParaBiblioteca?: () => void;
  onIrParaCartas?: () => void;
}

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fmtDataLonga(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TrilhaTab({
  trilha, topicos, configCiclo, calendario, pdfs, materiasConcurso,
  onUpdateTrilha, onUpdateTopicos, onIrParaCiclo, onIrParaBiblioteca, onIrParaCartas,
}: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const hoje = dateKeyLocal();

  const temMateriasNoCiclo = materiasAtivas.some((m) => configCiclo.materias[m.nome]?.incluir);
  const streakDias = calcularStreakDias(calendario);

  const meta: MetaSemana | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return computarMetaSemana({ hoje, trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs });
  }, [trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, hoje]);

  // registra a DATA de conclusão de matérias recém-100% (agenda a revisão de 30 questões pra
  // DIAS_REVISAO_MATERIA dias depois) — sem carry-over de semana: cada MetaSemana é recalculada
  // do zero a cada render, não existe mais "avançar o ciclo" pra persistir (decisão do usuário:
  // se uma matéria não bate a meta de horas numa semana, a semana seguinte só reparte de novo).
  useEffect(() => {
    if (!trilha?.ativa || !meta) return;
    const novas = meta.analises.filter((a) => a.materiaConcluida && !trilha.conclusaoMaterias[a.materia]);
    if (novas.length === 0) return;
    const conclusaoMaterias = { ...trilha.conclusaoMaterias };
    for (const a of novas) conclusaoMaterias[a.materia] = hoje;
    onUpdateTrilha({ ...trilha, conclusaoMaterias });
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

  // caminho único de escrita de caderno (questão liberada OU reforço) — carimba atualizadoEm,
  // que é o que alimenta o cooldown de reforço (ver analisarReforcos em trilha-dinamica.ts)
  const registrarCaderno = (materia: string, topico: string, grupo: Grupo, acertos: number, erros: number) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: { ...estado, cadernos: { ...estado.cadernos, [grupo]: { acertos, erros, atualizadoEm: dateKeyLocal() } } },
    });
  };
  const registrarQuestoes = (q: QuestaoLiberada, acertos: number, erros: number) =>
    registrarCaderno(q.materia, q.topico, q.grupo, acertos, erros);
  const registrarReforco = (r: ReforcoGrupo, acertos: number, erros: number) =>
    registrarCaderno(r.materia, r.topico, r.grupo, acertos, erros);

  // registro da revisão das questões do link (1ª vez ou correção de reforço) — grava em
  // revisoesLink[checkpoint], não em cadernos (é um resultado do tópico inteiro, não de um grupo
  // A-D); os checkpoints de 7 e 30 dias são independentes, cada um com seu próprio registro
  const registrarRevisaoLink = (r: RevisaoLinkPendente, acertos: number, erros: number) => {
    const key = topicoKey(r.materia, r.topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: {
        ...estado,
        revisoesLink: { ...estado.revisoesLink, [r.checkpoint]: { acertos, erros, atualizadoEm: dateKeyLocal() } },
      },
    });
  };

  // marca o tópico atual de um bloco como estudado direto da Trilha, sem precisar trocar pra
  // aba Edital — só avança (não desmarca); corrigir um engano continua sendo ação do Edital
  const marcarTopicoEstudado = (materia: string, topico: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({ ...topicos, [key]: { ...estado, estudado: true } });
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
  const percBlocos = meta.blocos.length > 0 ? Math.round((blocosFeitos / meta.blocos.length) * 100) : 0;
  const materiasEmRevisao = meta.analises.filter(
    (a) => a.materiaConcluida && (trilha.revisoes30Feitas[a.materia] ?? []).length > 0
  );
  const pendencias = meta.questoesPendentes.length + meta.reforcos.length + meta.revisoesLink.length + meta.revisoes30.length + (meta.revisarCartas ? 1 : 0);

  // ── monta o checklist único do dia ────────────────────────────────────────
  type Passo = { id: string; tipo: TipoPasso; concluido: boolean; icone: LucideIcon; corpo: React.ReactNode };
  const passos: Passo[] = [];

  for (const b of meta.blocos) {
    passos.push({
      id: `bloco-${b.materia}`,
      tipo: "estudo",
      concluido: b.concluido,
      icone: BookOpen,
      corpo: (
        <CorpoBloco
          b={b}
          materiasAtivas={materiasAtivas}
          onIrParaBiblioteca={onIrParaBiblioteca}
          onMarcarEstudado={() => marcarTopicoEstudado(b.materia, b.topico)}
        />
      ),
    });
  }
  if (meta.reforcos.length > 0) {
    passos.push({
      id: "reforcos",
      tipo: "reforco",
      concluido: false,
      icone: AlertTriangle,
      corpo: <CorpoReforcos reforcos={meta.reforcos} materiasAtivas={materiasAtivas} onRegistrar={registrarReforco} />,
    });
  }
  if (meta.questoesPendentes.length > 0) {
    passos.push({
      id: "questoes",
      tipo: "questoes",
      concluido: false,
      icone: ListChecks,
      corpo: <CorpoQuestoes questoes={meta.questoesPendentes} materiasAtivas={materiasAtivas} onRegistrar={registrarQuestoes} />,
    });
  }
  if (meta.revisoesLink.length > 0) {
    passos.push({
      id: "revisoes-link",
      tipo: "linkQuestoes",
      concluido: false,
      icone: ExternalLink,
      corpo: <CorpoRevisoesLink revisoes={meta.revisoesLink} materiasAtivas={materiasAtivas} onRegistrar={registrarRevisaoLink} />,
    });
  }
  for (const r of meta.revisoes30) {
    passos.push({
      id: `revisao-${r.materia}`,
      tipo: "revisao",
      concluido: false,
      icone: Trophy,
      corpo: <CorpoRevisao30 r={r} onMarcar={() => marcarRevisao30(r.materia)} />,
    });
  }
  if (meta.revisarCartas) {
    passos.push({
      id: "cartas",
      tipo: "cartas",
      concluido: false,
      icone: Layers,
      corpo: <CorpoCartas onIrParaCartas={onIrParaCartas} onMarcar={marcarCartasFeitas} />,
    });
  }
  // primeiro passo ainda não concluído — é ele que ganha o destaque de "comece por aqui"
  const idxPassoAtual = passos.findIndex((p) => !p.concluido);

  return (
    <div className="space-y-4">
      {/* hero da semana */}
      <EstudoHero
        acaoCanto={
          <button
            type="button"
            onClick={desativar}
            title="Desativar trilha"
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      >
        <div className="flex items-center gap-4 sm:gap-5">
          <ProgressRing perc={meta.blocos.length > 0 ? percBlocos : 0} size={80} espessura={7}>
            <div className="text-center leading-none">
              <div className="text-lg font-bold">{meta.blocos.length > 0 ? `${percBlocos}%` : "—"}</div>
              <div className="text-[9px] text-emerald-100 uppercase tracking-wide mt-0.5">semana</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold mb-0.5">
              Semana de {fmtDataCurta(meta.inicioSemana)} a {fmtDataCurta(meta.fimSemana)}
            </div>
            <div className="text-lg sm:text-xl font-bold leading-snug">
              {meta.blocosConcluidos
                ? "Meta da semana entregue! 🎉"
                : meta.blocos.length > 0
                  ? `${blocosFeitos}/${meta.blocos.length} blocos da semana`
                  : "Semana livre de blocos"}
            </div>
            <div className="text-xs text-emerald-100 mt-1">
              {meta.minutosSemana > 0 ? `${fmtHoras(meta.minutosSemana)} de estudo essa semana` : "Sem horas configuradas pra essa semana"}
              {pendencias > 0 && ` · ${pendencias} pendência${pendencias !== 1 ? "s" : ""} no checklist`}
            </div>
          </div>
          {streakDias > 0 && (
            <div className="hidden sm:flex flex-col items-center flex-shrink-0 pl-4 border-l border-white/20">
              <div className="flex items-center gap-1 text-2xl font-bold">
                <Flame className="h-6 w-6 text-orange-300" />
                {streakDias}
              </div>
              <div className="text-[10px] text-emerald-100 uppercase tracking-wide">
                dia{streakDias !== 1 ? "s" : ""} seguidos
              </div>
            </div>
          )}
        </div>
        {!meta.revisarCartas && (
          <div className="mt-3 text-[11px] text-emerald-100/90 flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            Próxima revisão das cartas: domingo {fmtDataCurta(meta.proximoDomingoCartas)}
          </div>
        )}
      </EstudoHero>

      {/* checklist único da semana */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <div className="text-sm font-bold text-foreground dark:text-foreground mb-4">Sua trilha desta semana</div>
        {passos.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-sm font-semibold text-foreground">Tudo em dia por aqui! 🎉</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Nada pendente no checklist agora — volte mais tarde ou aproveite pra descansar.
            </div>
          </div>
        ) : (
          <div>
            {passos.map((p, i) => (
              <PassoLinha key={p.id} passo={p} ultimo={i === passos.length - 1} atual={i === idxPassoAtual} />
            ))}
          </div>
        )}
      </div>

      {/* progresso por matéria */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-bold text-foreground dark:text-foreground">Progresso rumo aos 100%</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {meta.analises.map((a) => (
            <CardMateria key={a.materia} a={a} materiasAtivas={materiasAtivas} emRevisao={materiasEmRevisao.some((m) => m.materia === a.materia)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Linha do checklist (timeline vertical conectada) ──────────────────────────

function PassoLinha({
  passo, ultimo, atual,
}: {
  passo: { tipo: TipoPasso; concluido: boolean; icone: LucideIcon; corpo: React.ReactNode };
  ultimo: boolean;
  atual: boolean;
}) {
  const Icone = passo.icone;
  return (
    <div className={`flex gap-3 rounded-xl transition-colors ${atual ? "-mx-2 px-2 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/25" : ""}`}>
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center transition-shadow ${
            passo.concluido
              ? "bg-emerald-500 text-white"
              : atual
                ? `${TIPO_ITEM_COR[passo.tipo]} ring-2 ring-emerald-400 dark:ring-emerald-500 ring-offset-2 ring-offset-card shadow-md`
                : TIPO_ITEM_COR[passo.tipo]
          }`}
        >
          {passo.concluido ? <Check className="h-4 w-4" /> : <Icone className="h-4 w-4" />}
        </div>
        {!ultimo && <div className="w-0.5 flex-1 min-h-[16px] bg-muted my-1 rounded-full" />}
      </div>
      <div className={`flex-1 min-w-0 ${ultimo ? "" : "pb-5"}`}>
        {atual && (
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
            Comece por aqui
          </div>
        )}
        {passo.corpo}
      </div>
    </div>
  );
}

function CorpoBloco({
  b, materiasAtivas, onIrParaBiblioteca, onMarcarEstudado,
}: {
  b: BlocoEstudoSemana;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onIrParaBiblioteca?: () => void;
  onMarcarEstudado: () => void;
}) {
  const cor = resolverCorMateria(b.materia, materiasAtivas);
  const perc = Math.min(100, Math.round((b.minutosFeitosSemana / Math.max(1, b.minutosAlvoSemana)) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cor.dot}`} />
          <span className="text-sm font-semibold text-foreground dark:text-foreground truncate">{b.materia}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={b.topico}>tópico atual: {b.topico}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 bg-muted dark:bg-muted rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${b.concluido ? "bg-emerald-500" : "bg-primary/50"}`} style={{ width: `${perc}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{fmtHoras(b.minutosFeitosSemana)}/{fmtHoras(b.minutosAlvoSemana)}</span>
        </div>
      </div>
      {!b.concluido && onIrParaBiblioteca && (
        <button type="button" onClick={onIrParaBiblioteca} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium flex items-center gap-1">
          Ler PDF <ArrowRight className="h-3 w-3" />
        </button>
      )}
      {b.concluido && (
        <button type="button" onClick={onMarcarEstudado} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1">
          <Check className="h-3 w-3" /> Marcar como estudado
        </button>
      )}
    </div>
  );
}

function CorpoReforcos({
  reforcos, materiasAtivas, onRegistrar,
}: {
  reforcos: ReforcoGrupo[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoGrupo, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {reforcos.length} grupo{reforcos.length !== 1 ? "s" : ""} pra reforçar
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        Desempenho abaixo de {"70%"} — refaça e atualize o resultado.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {reforcos.map((r) => (
          <LinhaReforco key={r.id} r={r} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

function CorpoQuestoes({
  questoes, materiasAtivas, onRegistrar,
}: {
  questoes: QuestaoLiberada[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (q: QuestaoLiberada, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {questoes.length} questõe{questoes.length !== 1 ? "s" : ""} liberada{questoes.length !== 1 ? "s" : ""}
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">Escalonadas pelos tópicos concluídos — sem prazo, ficam acumuladas até você registrar.</div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {questoes.map((q) => (
          <LinhaQuestao key={q.id} q={q} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

function CorpoRevisoesLink({
  revisoes, materiasAtivas, onRegistrar,
}: {
  revisoes: RevisaoLinkPendente[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: RevisaoLinkPendente, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {revisoes.length} revisão{revisoes.length !== 1 ? "ões" : ""} de questões do link
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        7 e 30 dias após concluir os 4 grupos A-D do tópico — refaça as questões do link cadastrado na aba Questões.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {revisoes.map((r) => (
          <LinhaRevisaoLink key={r.id} r={r} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

function LinhaRevisaoLink({
  r, materiasAtivas, onRegistrar,
}: {
  r: RevisaoLinkPendente;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: RevisaoLinkPendente, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState(r.reforco ? String(r.acertosAtual ?? "") : "");
  const [erros, setErros] = useState(r.reforco ? String(r.errosAtual ?? "") : "");
  const cor = resolverCorMateria(r.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  // clicar na atividade vai direto pro link (nova aba) E revela o form de registro — assim
  // quando o usuário volta de fazer as questões, os campos já estão à mostra pra preencher
  const abrirEExpandir = () => {
    window.open(r.link, "_blank", "noopener,noreferrer");
    setAberto(true);
  };

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <div className="w-full flex items-center gap-2.5">
        <button type="button" onClick={abrirEExpandir} title="Abrir questões" className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-foreground">{r.materia}</span>
            <span className="text-xs text-muted-foreground"> · tópico {r.ordemTopico}: </span>
            <span className="text-xs text-muted-foreground" title={r.topico}>{r.topico.length > 50 ? r.topico.slice(0, 50) + "…" : r.topico}</span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">{r.dias}d</span>
          {r.reforco && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex-shrink-0">reforço</span>}
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
        <button type="button" onClick={() => setAberto((v) => !v)} title="Registrar resultado" className="flex-shrink-0 p-1 -m-1">
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
      </div>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1 flex-wrap">
          <a
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink className="h-3 w-3" /> Abrir questões
          </a>
          {r.reforco && <span className="text-[10px] text-muted-foreground">{r.acertosAtual} acerto{r.acertosAtual !== 1 ? "s" : ""} / {r.errosAtual} erro{r.errosAtual !== 1 ? "s" : ""} — refaça e atualize</span>}
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(r, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

function CorpoRevisao30({ r, onMarcar }: { r: Revisao30; onMarcar: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {/* clicar na atividade vai direto pro link (nova aba) — sem link cadastrado (aba
          Questões), o botão fica desabilitado em vez de quebrar */}
      <button
        type="button"
        onClick={() => r.link && window.open(r.link, "_blank", "noopener,noreferrer")}
        disabled={!r.link}
        title={r.link ? "Abrir questões" : "Cadastre o link na aba Questões"}
        className="flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <div className="text-sm font-semibold text-foreground dark:text-foreground flex items-center gap-1.5">
          {r.materia} — revisão da matéria
          {r.link && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-muted-foreground">
          100% concluída em {fmtDataCurta(r.concluidaEm)} — <b>30 questões englobando todos os tópicos</b> (não 30 por tópico).
        </div>
      </button>
      <button type="button" onClick={onMarcar} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium">
        Concluí
      </button>
    </div>
  );
}

function CorpoCartas({
  onIrParaCartas, onMarcar,
}: {
  onIrParaCartas?: () => void;
  onMarcar: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground dark:text-foreground">Revisar as cartas</div>
        <div className="text-[11px] text-muted-foreground">A cada 2 domingos (14 dias)</div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {onIrParaCartas && (
          <button type="button" onClick={onIrParaCartas} className="px-2.5 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-medium flex items-center gap-1">
            Ir <ArrowRight className="h-3 w-3" />
          </button>
        )}
        <button type="button" onClick={onMarcar} className="px-2.5 py-1.5 rounded-lg border border-fuchsia-300 dark:border-fuchsia-700 text-fuchsia-600 dark:text-fuchsia-300 text-[11px] font-medium">
          Marquei
        </button>
      </div>
    </div>
  );
}

// ─── Card de progresso por matéria (mini anel) ─────────────────────────────────

function CardMateria({
  a, materiasAtivas, emRevisao,
}: {
  a: AnaliseMateria;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  emRevisao: boolean;
}) {
  const cor = resolverCorMateria(a.materia, materiasAtivas);
  const totalUnidades = a.totalTopicos * 5; // teoria (x1) + questões (4 grupos)
  const feitas = a.topicosEstudados + a.gruposFeitos;
  const perc = totalUnidades > 0 ? Math.round((feitas / totalUnidades) * 100) : 0;
  return (
    <div className="rounded-xl border border-border dark:border-border p-3 flex flex-col items-center text-center gap-1.5">
      <ProgressRing
        perc={perc}
        size={56}
        espessura={5}
        corStroke={a.materiaConcluida ? "stroke-amber-500" : "stroke-emerald-500"}
        corTrilho="stroke-border"
      >
        {a.materiaConcluida ? <Trophy className="h-4 w-4 text-amber-500" /> : <span className="text-xs font-bold text-foreground dark:text-foreground">{perc}%</span>}
      </ProgressRing>
      <span className="w-full flex items-center justify-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <span className="text-[11px] font-medium text-foreground truncate" title={a.materia}>{a.materia}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">
        {a.materiaConcluida ? (emRevisao ? "em revisão" : "100% concluída") : `teoria ${a.topicosEstudados}/${a.totalTopicos} · questões ${a.gruposFeitos}/${a.totalTopicos * 4}`}
      </span>
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
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 text-left">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${GRUPO_BADGE[q.grupo]}`}>{GRUPO_LABEL[q.grupo]}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">{q.materia}</span>
          <span className="text-xs text-muted-foreground"> · tópico {q.ordemTopico}: </span>
          <span className="text-xs text-muted-foreground" title={q.topico}>{q.topico.length > 50 ? q.topico.slice(0, 50) + "…" : q.topico}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-[10px] text-muted-foreground flex-1">{q.motivo}</span>
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
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

// ─── Linha de grupo pra reforçar — igual à de questão liberada, mas com os inputs pré-preenchidos
// (o usuário está corrigindo um resultado existente, não começando do zero) e um badge de % ────

function LinhaReforco({
  r, materiasAtivas, onRegistrar,
}: {
  r: ReforcoGrupo;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoGrupo, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState(String(r.acertos));
  const [erros, setErros] = useState(String(r.erros));
  const cor = resolverCorMateria(r.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 text-left">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${GRUPO_BADGE[r.grupo]}`}>{GRUPO_LABEL[r.grupo]}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">{r.materia}</span>
          <span className="text-xs text-muted-foreground"> · tópico {r.ordemTopico}: </span>
          <span className="text-xs text-muted-foreground" title={r.topico}>{r.topico.length > 50 ? r.topico.slice(0, 50) + "…" : r.topico}</span>
        </div>
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex-shrink-0">{r.perc}%</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-[10px] text-muted-foreground flex-1">{r.acertos} acerto{r.acertos !== 1 ? "s" : ""} / {r.erros} erro{r.erros !== 1 ? "s" : ""} — refaça e atualize</span>
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(r, Number(acertos), Number(erros))}
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
  const regras: { icone: LucideIcon; cor: string; texto: string }[] = [
    { icone: Clock, cor: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary", texto: "A semana cobre todas as matérias ativas de uma vez. As horas semanais (Ciclo de Estudos) são divididas proporcionalmente ao peso de cada matéria com teoria pendente, no tópico atual de cada uma. O tempo é monitorado pelo leitor de PDF." },
    { icone: ListChecks, cor: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400", texto: "Concluir um tópico libera questões dos anteriores: grupo A do último, B do penúltimo, C do antepenúltimo, D do anterior a esse — até fechar os 4 grupos de todos os tópicos." },
    { icone: ExternalLink, cor: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400", texto: "Cadastrado o link de questões do tópico (aba Questões), 7 e 30 dias após concluir os 4 grupos A-D a trilha pede pra refazer essas questões em cada checkpoint — abaixo de 70% volta como reforço." },
    { icone: Trophy, cor: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400", texto: "Matéria 100% (teoria + todos os grupos) entra em modo revisão: 3 dias depois, 30 questões englobando todos os tópicos dela, pelo link cadastrado na aba Questões." },
    { icone: Layers, cor: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400", texto: "A cada 2 domingos, revisão das cartas." },
    { icone: Sparkles, cor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400", texto: "Sem dívida acumulada: cada semana é recalculada do zero com base no peso configurado — se você não bate a meta de uma semana, a semana seguinte só reparte de novo, sem carregar o que faltou." },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <EstudoHero className="p-6 sm:p-7">
        <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
          <Route className="h-6 w-6" />
        </div>
        <div className="text-xl font-bold mb-1">Trilha dinâmica</div>
        <p className="text-sm text-emerald-100">
          Sua meta semanal calculada automaticamente do seu progresso real — sem plano fixo, ela se adapta ao que você entrega.
        </p>
      </EstudoHero>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border dark:divide-border">
        {regras.map((r, i) => (
          <div key={i} className="px-4 py-3.5 flex gap-3 items-start">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.cor}`}>
              <r.icone className="h-4 w-4" />
            </div>
            <p className="text-xs text-foreground pt-1.5">{r.texto}</p>
          </div>
        ))}
      </div>
      {!temMateriasNoCiclo && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="flex-1">Nenhuma matéria incluída no Ciclo de Estudos — configure o ciclo primeiro (peso e horas por dia).</span>
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
