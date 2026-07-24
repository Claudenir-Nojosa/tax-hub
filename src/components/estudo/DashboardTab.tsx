"use client";

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
import EstudoHero from "./ui/EstudoHero";
import StatTile from "./ui/StatTile";
import SectionCard from "./ui/SectionCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  state: EstudoState;
  materiasConcurso?: MateriaBase[];
  onIrParaTrilha?: () => void;
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
          <div className="text-sm font-semibold text-foreground">Ative sua trilha dinâmica</div>
          <div className="text-xs text-muted-foreground">
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
  const pendencias = meta.questoesPendentes.length + meta.reforcos.length + meta.revisoes30.length + (meta.revisarCartas ? 1 : 0);
  const totalAtividades = meta.blocos.length + pendencias;
  const concluidas = meta.analises.filter((a) => a.materiaConcluida).length;

  return (
    <button
      type="button"
      onClick={onIrParaTrilha}
      disabled={!onIrParaTrilha}
      className="w-full rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all text-left overflow-hidden disabled:cursor-default"
    >
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Flag className="h-3.5 w-3.5" /> Meta atual
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              Grupo {meta.grupoCiclo}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Iniciada: {fmtDataCurtaBR(trilha.iniciadaEm)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-sm font-bold tabular-nums ${feitos > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            ✓ {feitos}
          </span>
          <div className="flex-1 relative">
            <div className="bg-muted dark:bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full h-3 transition-all duration-700 ease-out"
                style={{ width: `${perc}%` }}
              />
            </div>
            {meta.blocos.length > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-card border-2 border-emerald-500 shadow transition-all duration-700 ease-out"
                style={{ left: `${perc}%` }}
              />
            )}
          </div>
          <span className="text-sm font-bold text-muted-foreground tabular-nums">{meta.blocos.length}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2.5">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {meta.analises.length} matéria{meta.analises.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> {totalAtividades} atividade{totalAtividades !== 1 ? "s" : ""}</span>
          {meta.blocosConcluidos && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold ml-auto"><CheckCircle2 className="h-3 w-3" /> dia entregue</span>
          )}
        </div>

        {concluidas > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-border dark:border-border flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
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
                className={`h-1.5 flex-1 ${b.concluido ? cor.dot : "bg-muted dark:bg-muted"}`}
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
      <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl">☀️</span>
        <div>
          <div className="text-sm font-medium text-foreground">Dia de descanso</div>
          <div className="text-xs text-muted-foreground">Configure horas no Ciclo de Estudos para ver sua meta diária</div>
        </div>
      </div>
    );
  }

  const perc = Math.min(100, Math.round((estudadoMin / metaMin) * 100));
  const done = perc >= 100;

  return (
    <div className={`rounded-2xl border px-5 py-4 ${done
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
      : "bg-card border-border"}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {done
            ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            : <BookOpen className="h-5 w-5 text-primary dark:text-primary flex-shrink-0" />}
          <span className="text-sm font-semibold text-foreground dark:text-foreground">Meta de hoje</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground dark:text-foreground"}`}>
          {fmt(estudadoMin)} / {fmt(metaMin)}
        </span>
      </div>
      <div className="bg-muted dark:bg-muted rounded-full h-2">
        <div
          className={`rounded-full h-2 transition-all duration-500 ${done ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${perc}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
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

  return (
    <div className="space-y-6">
      {/* Meta diária */}
      <MetaDiaria state={state} />

      {/* Meta de hoje da trilha dinâmica */}
      <CardTrilha state={state} materiasConcurso={materiasConcurso} onIrParaTrilha={onIrParaTrilha} />

      {/* Level + XP hero */}
      <EstudoHero>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-3xl font-bold mb-1">
              <NivelIcon className="h-7 w-7" />
              <span>Nível {nivel} — {nivelConfig.titulo}</span>
            </div>
            <div className="text-emerald-100 text-sm">
              {xp} XP acumulados
              {proximoNivel && ` · faltam ${xpProximo - xp} XP para o Nível ${nivel + 1}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-emerald-100">Streak</div>
            <div className="flex items-center justify-end gap-1.5 text-2xl font-bold">
              <Flame className="h-6 w-6 text-orange-300" />
              {streakDias}
            </div>
            <div className="text-xs text-emerald-100">dias</div>
          </div>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${Math.min(progNivel, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-emerald-100">
          <span>{xpNivelAtual} XP</span>
          <span>{progNivel}%</span>
          <span>{xpProximo === 999999 ? "∞" : xpProximo} XP</span>
        </div>
      </EstudoHero>

      {/* Stats — grid-cols do breakpoint largo acompanha a QUANTIDADE real de cards (5 sem
          Biblioteca, 6 com ela) pra nunca sobrar um card sozinho numa linha nova */}
      {(() => {
        const stats = [
          { label: "Tópicos Estudados", valor: `${estudados}/${totalTopicos}` as string | number, sublabel: undefined, icone: BookOpen, tone: "primary" as const },
          { label: "% do Edital", valor: `${percEdital}%`, sublabel: undefined, icone: TrendingUp, tone: "purple" as const },
          { label: "Questões Feitas", valor: totalQuestoes, sublabel: undefined, icone: HelpCircle, tone: "success" as const },
          { label: "% de Acertos", valor: totalQuestoes > 0 ? `${percAcertos}%` : "—", sublabel: undefined, icone: Target, tone: "warning" as const },
          {
            label: "Páginas/Hora",
            valor: pagPorHora !== null ? pagPorHora.toFixed(1) : "—",
            sublabel: pagPorHora !== null ? `${totalPaginas} pág registradas` : "registre páginas no timer",
            icone: Gauge,
            tone: "primary" as const,
          },
          ...(pdfs.length > 0
            ? [{
                label: "Leitura PDFs",
                valor: `${percPdfs}%` as string | number,
                sublabel: `${pdfLidasPag.toLocaleString("pt-BR")}/${pdfTotalPag.toLocaleString("pt-BR")} páginas` as string | undefined,
                icone: Library,
                tone: "success" as const,
              }]
            : []),
        ];
        const gridColsLg = stats.length >= 6 ? "lg:grid-cols-6" : "lg:grid-cols-5";
        return (
          <div className={`grid grid-cols-2 md:grid-cols-3 ${gridColsLg} gap-3`}>
            {stats.map((s) => (
              <StatTile key={s.label} icone={s.icone} label={s.label} valor={s.valor} sublabel={s.sublabel} tone={s.tone} />
            ))}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conquistas */}
        <SectionCard titulo="Conquistas" icone={Medal} corIcone="bg-amber-500">
          <ScrollArea className="max-h-[340px] pr-1">
            <div className="grid grid-cols-2 gap-2">
              {CONQUISTAS.map((c) => {
                const unlocked = conquistas[c.id as keyof typeof conquistas];
                const CIcon = c.icone;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                      unlocked
                        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
                        : "border-border opacity-50"
                    }`}
                  >
                    <CIcon className={`h-5 w-5 flex-shrink-0 ${unlocked ? c.cor : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${unlocked ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                        {c.nome}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{c.condicao}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SectionCard>

        {/* Progresso por matéria */}
        <SectionCard titulo="Progresso por Matéria" icone={BarChart3} corIcone="bg-primary">
          <ScrollArea className="max-h-[340px] pr-1">
            <div className="space-y-2.5">
              {MATERIAS_ATIVAS.map((m) => {
                const prog = getProgressoMateria(m.nome, state.topicos, MATERIAS_ATIVAS);
                return (
                  <div key={m.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium truncate max-w-[65%] ${"corText" in m ? (m as {corText: string}).corText : "text-foreground"}`}>
                        {m.nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {prog.estudados}/{prog.total}
                      </span>
                    </div>
                    <div className="bg-muted dark:bg-muted rounded-full h-1.5">
                      <div
                        className={`rounded-full h-1.5 transition-all duration-300 ${
                          prog.perc === 100
                            ? "bg-emerald-500"
                            : prog.perc > 0
                            ? "bg-primary"
                            : "bg-muted dark:bg-muted"
                        }`}
                        style={{ width: `${prog.perc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SectionCard>
      </div>

      {/* Níveis */}
      <SectionCard titulo="Tabela de Níveis" icone={TrendingUp} corIcone="bg-primary">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(NIVEL_CONFIG).map(([n, cfg]) => {
            const isAtual = Number(n) === nivel;
            const CfgIcon = cfg.icone;
            return (
              <div
                key={n}
                className={`rounded-lg border p-3 text-center transition-all ${
                  isAtual
                    ? "border-primary bg-primary/10 dark:bg-primary/40 dark:border-primary shadow-sm"
                    : Number(n) < nivel
                    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 opacity-70"
                    : "border-border opacity-50"
                }`}
              >
                <div className="flex items-center justify-center mb-1.5">
                  <CfgIcon className={`h-5 w-5 ${cfg.cor}`} />
                </div>
                <div className="text-xs font-bold text-foreground dark:text-foreground leading-tight">{cfg.titulo}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Nv {n}
                </div>
                <div className="text-xs text-muted-foreground">
                  {cfg.xpMin === 0 ? "0" : cfg.xpMin}{cfg.xpMax === 999999 ? "+" : `–${cfg.xpMax}`}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
