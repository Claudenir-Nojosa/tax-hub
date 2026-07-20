"use client";

import { useSession } from "next-auth/react";
import { BookOpen, HelpCircle, Target, Medal, BarChart3, TrendingUp, Flame, CheckCircle2, Sparkles, Gauge, Route, ArrowRight, Trophy, Library, Flag, CalendarDays, ListChecks } from "lucide-react";
import {
  NIVEL_CONFIG,
  CONQUISTAS,
  MATERIAS,
  calcularXP,
  calcularNivel,
  calcularStreakDias,
  calcularPagPorHora,
  dateKeyLocal,
  type EstudoState,
  type TopicoState,
  type MateriaConcurso,
  type MateriaBase,
  topicoKey,
} from "@/lib/estudo-data";
import { computarMetaDia } from "@/lib/trilha-dinamica";
import { resolverCorMateria } from "./trilha/trilha-ui";

interface Props {
  state: EstudoState;
  materiasConcurso?: MateriaBase[];
  onIrParaTrilha?: () => void;
}

// Saudação + frase motivacional no topo da aba — usa o primeiro nome da sessão (NextAuth) e
// varia o tom conforme o horário e o progresso do dia (meta batida / streak / neutro).
function fraseMotivacional(streakDias: number, metaBatida: boolean): string {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  if (metaBatida) return `${saudacao}! Meta de hoje batida — orgulho disso. Aproveita o embalo. 🎉`;
  if (streakDias >= 7) return `${saudacao}! ${streakDias} dias seguidos estudando — sequência impecável, não para agora.`;
  if (streakDias >= 1) return `${saudacao}! Você está numa sequência de ${streakDias} dia${streakDias > 1 ? "s" : ""} — bora manter viva.`;
  return `${saudacao}! Bora começar mais um dia rumo à aprovação.`;
}

function Saudacao({ metaBatida, streakDias }: { metaBatida: boolean; streakDias: number }) {
  const { data: session } = useSession();
  const primeiroNome = session?.user?.name?.split(" ")[0] ?? "Concurseiro";
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span aria-hidden>👋</span> Oi, {primeiroNome}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fraseMotivacional(streakDias, metaBatida)}</p>
    </div>
  );
}

function fmtDataCurtaBR(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Card da meta de HOJE da trilha dinâmica — resumo dos blocos de estudo do dia e pendências;
// sem trilha ativa vira CTA pra ativar. Visual: eyebrow + badge do grupo, barra grossa com
// marcador, contagem de matérias/atividades, chips coloridos por matéria (cor real do Edital).
function CardTrilha({ state, materiasConcurso, onIrParaTrilha }: { state: EstudoState; materiasConcurso?: MateriaBase[]; onIrParaTrilha?: () => void }) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const trilha = state.trilhaDinamica;
  if (!trilha?.ativa) {
    return (
      <button
        type="button"
        onClick={onIrParaTrilha}
        disabled={!onIrParaTrilha}
        className="w-full rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-5 py-4 flex items-center gap-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:cursor-default"
      >
        <Route className="h-6 w-6 text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ative sua trilha dinâmica</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Meta diária calculada do seu progresso real — estudo por PDF, questões escalonadas A-D e revisões.
          </div>
        </div>
        {onIrParaTrilha && <ArrowRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
      </button>
    );
  }

  const meta = computarMetaDia({
    trilha,
    configCiclo: state.configCiclo,
    materiasAtivas,
    topicos: state.topicos,
    calendario: state.calendario,
  });
  const feitos = meta.blocos.filter((b) => b.concluido).length;
  const perc = meta.blocos.length > 0 ? Math.round((feitos / meta.blocos.length) * 100) : 0;
  const pendencias = meta.questoesPendentes.length + meta.revisoes30.length + (meta.revisarCartas ? 1 : 0);
  const totalAtividades = meta.blocos.length + pendencias;
  const concluidas = meta.analises.filter((a) => a.materiaConcluida).length;

  return (
    <button
      type="button"
      onClick={onIrParaTrilha}
      disabled={!onIrParaTrilha}
      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all text-left overflow-hidden disabled:cursor-default"
    >
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            <Flag className="h-3.5 w-3.5" /> Meta atual
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Grupo {meta.grupoCiclo}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <CalendarDays className="h-3 w-3" /> Iniciada: {fmtDataCurtaBR(trilha.iniciadaEm)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-sm font-bold tabular-nums ${feitos > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
            ✓ {feitos}
          </span>
          <div className="flex-1 relative">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full h-3 transition-all duration-700 ease-out"
                style={{ width: `${perc}%` }}
              />
            </div>
            {meta.blocos.length > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white dark:bg-gray-900 border-2 border-emerald-500 shadow transition-all duration-700 ease-out"
                style={{ left: `${perc}%` }}
              />
            )}
          </div>
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500 tabular-nums">{meta.blocos.length}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-2.5">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {meta.analises.length} matéria{meta.analises.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {totalAtividades} atividade{totalAtividades !== 1 ? "s" : ""}</span>
          {meta.blocosConcluidos && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold ml-auto"><CheckCircle2 className="h-3 w-3" /> dia entregue</span>
          )}
        </div>

        {concluidas > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Trophy className="h-3 w-3" />
            {concluidas === 1 ? "1 matéria 100% (em revisão)" : `${concluidas} matérias 100% (em revisão)`}
          </div>
        )}
      </div>

      {meta.blocos.length > 0 && (
        <div className="flex">
          {meta.blocos.map((b) => {
            const cor = resolverCorMateria(b.materia, materiasAtivas);
            return (
              <div
                key={b.materia}
                title={b.materia}
                className={`h-1.5 flex-1 ${b.concluido ? cor.dot : "bg-gray-100 dark:bg-gray-700"}`}
              />
            );
          })}
        </div>
      )}
    </button>
  );
}

function calcularConquistas(state: EstudoState, materiasAtivas: MateriaBase[] = MATERIAS) {
  const xp = calcularXP(state.topicos, state.calendario, state.cartas);
  const totalHorasCalendario = Object.values(state.calendario)
    .flat()
    .reduce((acc, a) => acc + a.duracao, 0) / 60;
  const streakDias = calcularStreakDias(state.calendario);

  const estudados = Object.values(state.topicos).filter((t) => t.estudado).length;

  // Total real de questões: soma de acertos + erros em todos os cadernos de todos os tópicos
  const totalQuestoes = Object.values(state.topicos).reduce((acc, t) =>
    acc + (["A", "B", "C", "D"] as const).reduce((s, g) => s + t.cadernos[g].acertos + t.cadernos[g].erros, 0), 0
  );

  const materiasConcluidas = materiasAtivas.filter(
    (m) => m.topicos.length > 0 && m.topicos.every((t) => state.topicos[topicoKey(m.nome, t)]?.estudado)
  ).length;

  // Cartas conquistas
  const totalCartas = state.cartas?.length ?? 0;
  const totalAcertosCartas = state.cartas?.reduce((acc, c) => acc + (c.acertos ?? 0), 0) ?? 0;
  const bossDerrotado = state.cartas?.some(c => c.tipo === "boss" && (c.repeticoes ?? 0) >= 3) ?? false;

  return {
    primeiro_passo: state.semanasOK >= 1,
    primeiro_mes: state.semanasOK >= 4,
    maratonista: Object.values(state.calendario).some((atividades) =>
      atividades.reduce((acc, a) => acc + a.duracao, 0) >= 2000
    ),
    em_chamas: streakDias >= 3,
    semana_fogo: streakDias >= 7,
    incansavel: streakDias >= 30,
    explorador: estudados >= 25,
    construtor: estudados >= 100,
    meio_caminho: xp >= 500,
    expert: xp >= 1500,
    fiscal_elite: xp >= 26100,
    sniper_edital: state.semanasOK >= 10,
    estudante_modelo: totalHorasCalendario >= 100,
    sefaz_ready: totalHorasCalendario >= 200 && state.semanasOK >= 30,
    primeira_vitoria: materiasConcluidas >= 1,
    pluridisciplinar: materiasConcluidas >= 3,
    generalista: materiasConcluidas >= 5,
    dominio_total: materiasConcluidas >= materiasAtivas.length,
    praticante: totalQuestoes >= 50,
    atirador: totalQuestoes >= 200,
    primeiro_baralho: totalCartas >= 10,
    colecionador: totalCartas >= 50,
    mestre_cartas: totalAcertosCartas >= 100,
    boss_derrotado: bossDerrotado,
    invicto: false, // calculado externamente via sessão de revisão
  };
}

function getProgressoMateria(nome: string, topicos: Record<string, TopicoState>, materiasAtivas: MateriaBase[] = MATERIAS) {
  const materia = materiasAtivas.find((m) => m.nome === nome);
  if (!materia) return { estudados: 0, total: 0, perc: 0, cadernos: 0 };
  const total = materia.topicos.length;
  let estudados = 0;
  let cadernos = 0;
  materia.topicos.forEach((t) => {
    const state = topicos[topicoKey(nome, t)];
    if (state?.estudado) estudados++;
    (["A", "B", "C", "D"] as const).forEach((g) => {
      if (state && state.cadernos[g].acertos + state.cadernos[g].erros > 0) cadernos++;
    });
  });
  return { estudados, total, perc: total > 0 ? Math.round((estudados / total) * 100) : 0, cadernos };
}

const DOW_TO_KEY = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;

function MetaDiaria({ state }: { state: EstudoState }) {
  const today = dateKeyLocal();
  const dayKey = DOW_TO_KEY[new Date().getDay()];
  const metaMin = state.configCiclo.horasPorDia[dayKey] ?? 0;
  const estudadoMin = (state.calendario[today] ?? []).reduce((s, a) => s + a.duracao, 0);

  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0 && m > 0) return `${h}h${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  if (metaMin === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl">☀️</span>
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Dia de descanso</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">Configure horas no Ciclo de Estudos para ver sua meta diária</div>
        </div>
      </div>
    );
  }

  const perc = Math.min(100, Math.round((estudadoMin / metaMin) * 100));
  const done = perc >= 100;

  return (
    <div className={`rounded-xl border px-5 py-4 ${done
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {done
            ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            : <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Meta de hoje</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-200"}`}>
          {fmt(estudadoMin)} / {fmt(metaMin)}
        </span>
      </div>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`rounded-full h-2 transition-all duration-500 ${done ? "bg-emerald-500" : "bg-blue-500"}`}
          style={{ width: `${perc}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-500">
        {done
          ? <span className="flex items-center gap-1">Meta atingida! <Sparkles className="h-3.5 w-3.5 text-emerald-500" /></span>
          : <span>{`Faltam ${fmt(Math.max(0, metaMin - estudadoMin))}`}</span>}
        <span>{perc}%</span>
      </div>
    </div>
  );
}

export default function DashboardTab({ state, materiasConcurso, onIrParaTrilha }: Props) {
  const MATERIAS_ATIVAS: MateriaBase[] = materiasConcurso ?? MATERIAS;
  const xp = calcularXP(state.topicos, state.calendario, state.cartas);
  const nivel = calcularNivel(xp);
  const nivelConfig = NIVEL_CONFIG[nivel];
  const proximoNivel = NIVEL_CONFIG[nivel + 1];
  const xpProximo = proximoNivel ? proximoNivel.xpMin : nivelConfig.xpMax;
  const xpNivelAtual = nivelConfig.xpMin;
  const progNivel = proximoNivel
    ? Math.round(((xp - xpNivelAtual) / (xpProximo - xpNivelAtual)) * 100)
    : 100;

  const streakDias = calcularStreakDias(state.calendario);
  const conquistas = calcularConquistas(state, MATERIAS_ATIVAS);

  const totalTopicos = MATERIAS_ATIVAS.reduce((acc, m) => acc + m.topicos.length, 0);
  const estudados = Object.values(state.topicos).filter((t) => t.estudado).length;
  const percEdital = totalTopicos > 0 ? Math.round((estudados / totalTopicos) * 100) : 0;

  const totalQuestoes = Object.values(state.topicos).reduce((acc, t) =>
    acc + (["A", "B", "C", "D"] as const).reduce((s, g) => s + t.cadernos[g].acertos + t.cadernos[g].erros, 0), 0);
  const totalAcertosCaderno = Object.values(state.topicos).reduce((acc, t) =>
    acc + (["A", "B", "C", "D"] as const).reduce((s, g) => s + t.cadernos[g].acertos, 0), 0);
  const percAcertos = totalQuestoes > 0 ? Math.round((totalAcertosCaderno / totalQuestoes) * 100) : 0;

  // Páginas por hora: só sessões que registraram páginas entram na conta (senão sessões sem
  // páginas diluiriam a velocidade real de leitura) — helper compartilhado com a Biblioteca
  const pagPorHora = calcularPagPorHora(state.calendario);
  const totalPaginas = Object.values(state.calendario).flat().reduce((s, a) => s + (a.paginas ?? 0), 0);

  // Biblioteca de PDFs: % geral de leitura (KPI só aparece quando há PDFs cadastrados)
  const pdfs = state.pdfs ?? [];
  const pdfTotalPag = pdfs.reduce((s, p) => s + p.totalPaginas, 0);
  const pdfLidasPag = pdfs.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
  const percPdfs = pdfTotalPag > 0 ? Math.round((pdfLidasPag / pdfTotalPag) * 100) : 0;

  const NivelIcon = nivelConfig.icone;

  // meta de hoje batida (mesmo cálculo que MetaDiaria) — só pra escolher o tom da frase da saudação
  const dayKeyHoje = DOW_TO_KEY[new Date().getDay()];
  const metaMinHoje = state.configCiclo.horasPorDia[dayKeyHoje] ?? 0;
  const estudadoMinHoje = (state.calendario[dateKeyLocal()] ?? []).reduce((s, a) => s + a.duracao, 0);
  const metaHojeBatida = metaMinHoje > 0 && estudadoMinHoje >= metaMinHoje;

  return (
    <div className="space-y-6">
      {/* Saudação + frase motivacional */}
      <Saudacao metaBatida={metaHojeBatida} streakDias={streakDias} />

      {/* Meta diária */}
      <MetaDiaria state={state} />

      {/* Meta de hoje da trilha dinâmica */}
      <CardTrilha state={state} materiasConcurso={materiasConcurso} onIrParaTrilha={onIrParaTrilha} />

      {/* Level + XP hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-3xl font-bold mb-1">
              <NivelIcon className="h-7 w-7" />
              <span>Nível {nivel} — {nivelConfig.titulo}</span>
            </div>
            <div className="text-blue-200 text-sm">
              {xp} XP acumulados
              {proximoNivel && ` · faltam ${xpProximo - xp} XP para o Nível ${nivel + 1}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-200">Streak</div>
            <div className="flex items-center justify-end gap-1.5 text-2xl font-bold">
              <Flame className="h-6 w-6 text-orange-300" />
              {streakDias}
            </div>
            <div className="text-xs text-blue-200">dias</div>
          </div>
        </div>
        <div className="bg-blue-800/40 rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${Math.min(progNivel, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-blue-200">
          <span>{xpNivelAtual} XP</span>
          <span>{progNivel}%</span>
          <span>{xpProximo === 999999 ? "∞" : xpProximo} XP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Tópicos Estudados", value: `${estudados}/${totalTopicos}` as string | number, sub: null as string | null, Icon: BookOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "% do Edital", value: `${percEdital}%`, sub: null, Icon: TrendingUp, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Questões Feitas", value: totalQuestoes, sub: null, Icon: HelpCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "% de Acertos", value: totalQuestoes > 0 ? `${percAcertos}%` : "—", sub: null, Icon: Target, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
          {
            label: "Páginas/Hora",
            value: pagPorHora !== null ? pagPorHora.toFixed(1) : "—",
            sub: pagPorHora !== null ? `${totalPaginas} pág registradas` : "registre páginas no timer",
            Icon: Gauge,
            color: "text-cyan-600 dark:text-cyan-400",
            bg: "bg-cyan-50 dark:bg-cyan-950/30",
          },
          ...(pdfs.length > 0
            ? [{
                label: "Leitura PDFs",
                value: `${percPdfs}%` as string | number,
                sub: `${pdfLidasPag.toLocaleString("pt-BR")}/${pdfTotalPag.toLocaleString("pt-BR")} páginas` as string | null,
                Icon: Library,
                color: "text-sky-600 dark:text-sky-400",
                bg: "bg-sky-50 dark:bg-sky-950/30",
              }]
            : []),
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg mx-auto mb-2 ${s.bg}`}>
              <s.Icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
            {s.sub && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conquistas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            Conquistas
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
            {CONQUISTAS.map((c) => {
              const unlocked = conquistas[c.id as keyof typeof conquistas];
              const CIcon = c.icone;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    unlocked
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
                      : "border-gray-200 dark:border-gray-700 opacity-50"
                  }`}
                >
                  <CIcon className={`h-5 w-5 flex-shrink-0 ${unlocked ? c.cor : "text-gray-400 dark:text-gray-600"}`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold truncate ${unlocked ? "text-amber-700 dark:text-amber-300" : "text-gray-500 dark:text-gray-400"}`}>
                      {c.nome}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.condicao}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progresso por matéria */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Progresso por Matéria
          </h3>
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {MATERIAS_ATIVAS.map((m) => {
              const prog = getProgressoMateria(m.nome, state.topicos, MATERIAS_ATIVAS);
              return (
                <div key={m.nome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium truncate max-w-[65%] ${"corText" in m ? (m as {corText: string}).corText : "text-gray-700 dark:text-gray-300"}`}>
                      {m.nome}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {prog.estudados}/{prog.total}
                    </span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`rounded-full h-1.5 transition-all duration-300 ${
                        prog.perc === 100
                          ? "bg-emerald-500"
                          : prog.perc > 0
                          ? "bg-blue-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      style={{ width: `${prog.perc}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Níveis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Tabela de Níveis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(NIVEL_CONFIG).map(([n, cfg]) => {
            const isAtual = Number(n) === nivel;
            const CfgIcon = cfg.icone;
            return (
              <div
                key={n}
                className={`rounded-lg border p-3 text-center transition-all ${
                  isAtual
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-600 shadow-sm"
                    : Number(n) < nivel
                    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 opacity-70"
                    : "border-gray-200 dark:border-gray-700 opacity-50"
                }`}
              >
                <div className="flex items-center justify-center mb-1.5">
                  <CfgIcon className={`h-5 w-5 ${cfg.cor}`} />
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight">{cfg.titulo}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Nv {n}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {cfg.xpMin === 0 ? "0" : cfg.xpMin}{cfg.xpMax === 999999 ? "+" : `–${cfg.xpMax}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
