"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  Legend, LabelList, LineChart, Line, ReferenceLine,
} from "recharts";
import {
  Clock, BookOpen, Target, TrendingUp, BarChart3, Activity,
  PieChart as PieIcon, CalendarDays, Zap, Flag, Rocket, AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  MATERIAS, topicoKey, dateKeyLocal,
  type EstudoState, type TopicoState, type AtividadeTipo, type AtividadeCalendario, type MateriaBase,
} from "@/lib/estudo-data";

// ─── Configuração do concurso ─────────────────────────────────────────────────
// 1ª fase: 01/08/2026 · 2ª fase: 02/08/2026
const DATA_CONCURSO = new Date("2026-08-01T12:00:00");

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const MATERIA_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6",
  "#a855f7","#22c55e","#f43f5e","#0ea5e9","#d97706",
  "#6366f1","#059669","#dc2626","#7c3aed",
];

const TIPO_CONFIG: Record<AtividadeTipo, { nome: string; cor: string }> = {
  estudo:            { nome: "Estudo Teórico",    cor: "#3b82f6" },
  questoes:          { nome: "Questões",           cor: "#8b5cf6" },
  recall:            { nome: "Recall",             cor: "#10b981" },
  caderno_erros:     { nome: "Caderno de Erros",  cor: "#f59e0b" },
  bateria:           { nome: "Bateria de Provas",  cor: "#ef4444" },
  cartas:            { nome: "Revisão de Cartas",  cor: "#6366f1" },
  materia_concluida: { nome: "Matéria Concluída", cor: "#06b6d4" },
};

const HEATMAP_LEVEL_CLASS = [
  "bg-muted dark:bg-muted",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
type HorasDia    = { dia: string; horas: number };
type TipoEntry   = { nome: string; horas: number; cor: string };
type MateriaProg = {
  nome: string; nomeCompleto: string; perc: number;
  estudados: number; total: number; acertos: number; erros: number; cor: string;
};
type SemanaEntry = { semana: string; horas: number };
type HeatDay     = { date: string; horas: number; nivel: 0|1|2|3|4; isFuture: boolean; label: string };
type BurnPoint   = { week: number; real?: number; projecao?: number };
type XPPoint     = { date: string; xp: number };
type PontoFraco  = { materia: string; topico: string; acertos: number; erros: number; taxaErro: number; corMateria: string };
type BurnInfo    = {
  velocidadeSemanal: number;
  topicosRestantes: number;
  examDias: number;
  coberturaNaProva: number;
  diasAteTerminar: number | null;
};

// ─── Helpers de data existentes ───────────────────────────────────────────────
type LeituraTopico  = { topico: string; paginas: number; minutos: number; pagHora: number };
type LeituraMateria = { materia: string; paginas: number; minutos: number; pagHora: number; topicos: LeituraTopico[] };

// KPI "páginas por hora": só sessões com páginas registradas entram (o tempo de sessões sem
// páginas não dilui a velocidade de leitura). Agrupa por matéria e, dentro dela, por tópico.
function paginasPorHoraPorMateria(calendario: Record<string, AtividadeCalendario[]>): LeituraMateria[] {
  const porMateria = new Map<string, { paginas: number; minutos: number; topicos: Map<string, { paginas: number; minutos: number }> }>();
  for (const atividades of Object.values(calendario)) {
    for (const a of atividades) {
      if (!a.paginas || a.paginas <= 0 || a.duracao <= 0) continue;
      const materia = a.materia || "Sem matéria";
      const m = porMateria.get(materia) ?? { paginas: 0, minutos: 0, topicos: new Map() };
      m.paginas += a.paginas;
      m.minutos += a.duracao;
      if (a.topico) {
        const t = m.topicos.get(a.topico) ?? { paginas: 0, minutos: 0 };
        t.paginas += a.paginas;
        t.minutos += a.duracao;
        m.topicos.set(a.topico, t);
      }
      porMateria.set(materia, m);
    }
  }
  return [...porMateria.entries()]
    .map(([materia, m]) => ({
      materia,
      paginas: m.paginas,
      minutos: m.minutos,
      pagHora: m.paginas / (m.minutos / 60),
      topicos: [...m.topicos.entries()]
        .map(([topico, t]) => ({ topico, paginas: t.paginas, minutos: t.minutos, pagHora: t.paginas / (t.minutos / 60) }))
        .sort((a, b) => b.paginas - a.paginas),
    }))
    .sort((a, b) => b.paginas - a.paginas);
}

function horasPorDiaSemana(calendario: Record<string, AtividadeCalendario[]>): HorasDia[] {
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const totais = [0, 0, 0, 0, 0, 0, 0];
  Object.entries(calendario).forEach(([ds, ativs]) => {
    const dow = new Date(ds + "T12:00:00").getDay();
    totais[dow] += ativs.reduce((s, a) => s + a.duracao, 0);
  });
  return DIAS.map((dia, i) => ({ dia, horas: Math.round((totais[i] / 60) * 10) / 10 }));
}

function distribuicaoPorTipo(calendario: Record<string, AtividadeCalendario[]>): TipoEntry[] {
  const acc: Partial<Record<AtividadeTipo, number>> = {};
  Object.values(calendario).flat().forEach((a) => {
    acc[a.tipo] = (acc[a.tipo] ?? 0) + a.duracao;
  });
  return (Object.entries(acc) as [AtividadeTipo, number][])
    .filter(([, v]) => v > 0)
    .map(([tipo, min]) => ({
      nome:  TIPO_CONFIG[tipo].nome,
      horas: Math.round((min / 60) * 10) / 10,
      cor:   TIPO_CONFIG[tipo].cor,
    }))
    .sort((a, b) => b.horas - a.horas);
}

function calcProgressoMaterias(topicos: Record<string, TopicoState>, materiasAtivas: MateriaBase[] = MATERIAS): MateriaProg[] {
  return materiasAtivas.map((m, i) => {
    const total = m.topicos.length;
    let estudados = 0, acertos = 0, erros = 0;
    m.topicos.forEach((t) => {
      const ts = topicos[topicoKey(m.nome, t)];
      if (!ts) return;
      if (ts.estudado) estudados++;
      (["A", "B", "C", "D"] as const).forEach((g) => {
        acertos += ts.cadernos[g].acertos;
        erros   += ts.cadernos[g].erros;
      });
    });
    const nomeAbrev = m.nome.length > 24 ? m.nome.slice(0, 24) + "…" : m.nome;
    return {
      nome: nomeAbrev, nomeCompleto: m.nome,
      perc: total > 0 ? Math.round((estudados / total) * 100) : 0,
      estudados, total, acertos, erros,
      cor: MATERIA_COLORS[i % MATERIA_COLORS.length],
    };
  });
}

function historicoSemanal(calendario: Record<string, AtividadeCalendario[]>): SemanaEntry[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weeks: SemanaEntry[] = [];
  for (let i = 7; i >= 0; i--) {
    const sun = new Date(today);
    sun.setDate(today.getDate() - today.getDay() - i * 7);
    sun.setHours(0, 0, 0, 0);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    sat.setHours(23, 59, 59, 999);
    let totalMin = 0;
    Object.entries(calendario).forEach(([ds, ativs]) => {
      const d = new Date(ds + "T12:00:00");
      if (d >= sun && d <= sat) totalMin += ativs.reduce((s, a) => s + a.duracao, 0);
    });
    weeks.push({
      semana: `${String(sun.getDate()).padStart(2, "0")}/${String(sun.getMonth() + 1).padStart(2, "0")}`,
      horas: Math.round((totalMin / 60) * 10) / 10,
    });
  }
  return weeks;
}

function buildHeatmap(calendario: Record<string, AtividadeCalendario[]>): HeatDay[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 11 * 7);
  const days: HeatDay[] = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(12, 0, 0, 0);
    const ds = dateKeyLocal(d);
    const min = (calendario[ds] ?? []).reduce((s, a) => s + a.duracao, 0);
    const h = min / 60;
    days.push({
      date: ds, horas: Math.round(h * 10) / 10,
      nivel: h === 0 ? 0 : h < 1 ? 1 : h < 2 ? 2 : h < 4 ? 3 : 4,
      isFuture: d > today,
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return days;
}

// ─── NOVOS helpers: alta prioridade ──────────────────────────────────────────

function getStartDate(calendario: Record<string, AtividadeCalendario[]>): Date | null {
  const datas = Object.keys(calendario).filter((d) => calendario[d].length > 0).sort();
  return datas.length > 0 ? new Date(datas[0] + "T12:00:00") : null;
}

function calcBurndown(
  topicos: Record<string, TopicoState>,
  calendario: Record<string, AtividadeCalendario[]>,
  totalTopicos: number,
  examDate: Date
): { data: BurnPoint[]; startDate: Date | null; examWeek: number; info: BurnInfo | null } {
  const startDate = getStartDate(calendario);
  if (!startDate) return { data: [], startDate: null, examWeek: -1, info: null };

  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const diasDecorridos = Math.max(1, Math.round((hoje.getTime() - startDate.getTime()) / 86400000));
  const semanasPassadas = Math.ceil(diasDecorridos / 7);

  const estudados = Object.values(topicos).filter((t) => t.estudado).length;
  const restantesHoje = Math.max(0, totalTopicos - estudados);
  const velocidade = estudados / diasDecorridos;
  const velocidadeSemanal = velocidade * 7;

  const examDias = Math.max(0, Math.round((examDate.getTime() - hoje.getTime()) / 86400000));
  const examWeek = semanasPassadas + Math.ceil(examDias / 7);

  const data: BurnPoint[] = [];

  // Histórico estimado (linear desde o início)
  for (let w = 0; w <= semanasPassadas; w++) {
    const estudadosW = Math.min(estudados, Math.round(velocidade * w * 7));
    const restW = Math.max(0, totalTopicos - estudadosW);
    const point: BurnPoint = { week: w, real: restW };
    if (w === semanasPassadas) point.projecao = restantesHoje;
    data.push(point);
  }

  // Projeção futura até o concurso + 4 semanas
  for (let w = semanasPassadas + 1; w <= examWeek + 4; w++) {
    const diasFuturos = (w - semanasPassadas) * 7;
    const restW = Math.max(0, restantesHoje - Math.round(velocidade * diasFuturos));
    data.push({ week: w, projecao: restW });
    if (restW === 0 && w > examWeek) break;
  }

  const topicosNaProva = estudados + Math.round(velocidade * examDias);
  const coberturaNaProva = Math.min(100, Math.round((topicosNaProva / totalTopicos) * 100));
  const diasAteTerminar = velocidade > 0 ? Math.round(restantesHoje / velocidade) : null;

  return {
    data,
    startDate,
    examWeek,
    info: {
      velocidadeSemanal: Math.round(velocidadeSemanal * 10) / 10,
      topicosRestantes: restantesHoje,
      examDias,
      coberturaNaProva,
      diasAteTerminar,
    },
  };
}

function calcXPEvolution(
  calendario: Record<string, AtividadeCalendario[]>,
): XPPoint[] {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const sorted = Object.keys(calendario)
    .filter((d) => {
      const dt = new Date(d + "T12:00:00");
      return calendario[d].length > 0 && dt <= hoje;
    })
    .sort();

  if (sorted.length === 0) return [];

  let cumXP = 0;
  return sorted.map((d) => {
    // 1 XP a cada 15 min de atividade registrada no calendário
    const xpDay = calendario[d].reduce((s, a) => s + Math.max(1, Math.floor(a.duracao / 15)), 0);
    cumXP += xpDay;
    const dt = new Date(d + "T12:00:00");
    return {
      date: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
      xp: cumXP,
    };
  });
}

function calcPontosFracos(topicos: Record<string, TopicoState>): PontoFraco[] {
  const result: PontoFraco[] = [];
  Object.entries(topicos).forEach(([key, ts]) => {
    const sep = key.indexOf("||");
    if (sep === -1) return;
    const materia = key.slice(0, sep);
    const topico  = key.slice(sep + 2);
    let acertos = 0, erros = 0;
    (["A", "B", "C", "D"] as const).forEach((g) => {
      acertos += ts.cadernos[g].acertos;
      erros   += ts.cadernos[g].erros;
    });
    const total = acertos + erros;
    if (total === 0) return;
    const idx = (MATERIAS as {nome:string}[]).findIndex((m) => m.nome === materia);
    result.push({
      materia, topico, acertos, erros,
      taxaErro: Math.round((erros / total) * 100),
      corMateria: MATERIA_COLORS[Math.max(0, idx) % MATERIA_COLORS.length],
    });
  });
  return result.sort((a, b) => b.taxaErro - a.taxaErro);
}

// ─── Tooltip helpers ──────────────────────────────────────────────────────────
type TTProps = {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown>; dataKey?: string; name?: string }[];
  label?: string;
};

function TooltipHoras({ active, payload, label }: TTProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-primary dark:text-primary">{payload[0].value}h estudadas</p>
    </div>
  );
}

function TooltipPie({ active, payload }: TTProps) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = payload[0] as any;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-0.5">{d.name}</p>
      <p style={{ color: d.payload.cor }}>{d.value}h</p>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Activity className="h-9 w-9 mb-2 opacity-40" />
      <p className="text-xs">{msg}</p>
    </div>
  );
}

function SectionTitle({ children, icon: Icon, color }: { children: React.ReactNode; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-1 h-5 rounded-full ${color}`} />
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-bold text-foreground dark:text-foreground tracking-wide uppercase">{children}</h2>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RelatoriosTab({ state, materiasConcurso }: { state: EstudoState; materiasConcurso?: MateriaBase[] }) {
  const MATERIAS_ATIVAS: MateriaBase[] = materiasConcurso ?? MATERIAS;
  // ── Dados existentes
  const diasData  = horasPorDiaSemana(state.calendario);
  const tiposData = distribuicaoPorTipo(state.calendario);
  const materias  = calcProgressoMaterias(state.topicos, MATERIAS_ATIVAS);
  const semanal   = historicoSemanal(state.calendario);
  const heatmap   = buildHeatmap(state.calendario);
  const leitura   = paginasPorHoraPorMateria(state.calendario);
  const leituraPaginas = leitura.reduce((s, m) => s + m.paginas, 0);
  const leituraMinutos = leitura.reduce((s, m) => s + m.minutos, 0);
  const leituraPagHora = leituraMinutos > 0 ? leituraPaginas / (leituraMinutos / 60) : null;

  // ── KPIs gerais
  const todasAtivs = Object.values(state.calendario).flat();
  const totalMin   = todasAtivs.reduce((s, a) => s + a.duracao, 0);
  const totalHoras = Math.round((totalMin / 60) * 10) / 10;
  const diasC      = Object.values(state.calendario).filter((a) => a.length > 0).length;
  const mediaH     = diasC > 0 ? Math.round((totalHoras / diasC) * 10) / 10 : 0;
  const totTops    = MATERIAS_ATIVAS.reduce((s, m) => s + m.topicos.length, 0);
  const estudados  = Object.values(state.topicos).filter((t) => t.estudado).length;
  const percEd     = totTops > 0 ? Math.round((estudados / totTops) * 100) : 0;

  let totalAcertos = 0, totalErros = 0;
  Object.values(state.topicos).forEach((t) => {
    (["A", "B", "C", "D"] as const).forEach((g) => {
      totalAcertos += t.cadernos[g].acertos;
      totalErros   += t.cadernos[g].erros;
    });
  });
  const taxaAc = totalAcertos + totalErros > 0
    ? Math.round((totalAcertos / (totalAcertos + totalErros)) * 100) : null;

  // ── Alta prioridade: burn-down, XP e pontos fracos
  const burndown     = calcBurndown(state.topicos, state.calendario, totTops, DATA_CONCURSO);
  const xpEvo        = calcXPEvolution(state.calendario);
  const pontosFracos = calcPontosFracos(state.topicos);

  const weekLabel = (w: number) => {
    if (!burndown.startDate) return `S${w}`;
    const d = new Date(burndown.startDate);
    d.setDate(burndown.startDate.getDate() + w * 7);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  // ── Derivados
  const materiasSort   = [...materias].sort((a, b) => b.perc - a.perc);
  const materiaAcErros = materias
    .filter((m) => m.acertos + m.erros > 0)
    .sort((a, b) => (b.acertos + b.erros) - (a.acertos + a.erros))
    .slice(0, 10);
  const taxaAcMateria = materias
    .filter((m) => m.acertos + m.erros > 0)
    .map((m) => ({
      nome: m.nome,
      nomeCompleto: m.nomeCompleto,
      taxa: Math.round((m.acertos / (m.acertos + m.erros)) * 100),
      total: m.acertos + m.erros,
      fill: m.acertos / (m.acertos + m.erros) >= 0.7 ? "#10b981"
           : m.acertos / (m.acertos + m.erros) >= 0.5 ? "#f59e0b" : "#ef4444",
    }))
    .sort((a, b) => b.taxa - a.taxa);

  const maxH     = Math.max(...diasData.map((d) => d.horas));
  const burnInterval = Math.max(0, Math.floor(burndown.data.length / 6) - 1);

  // ── Situação concurso
  const hasBurn = burndown.info !== null;
  const projecaoData = hasBurn && burndown.info!.diasAteTerminar !== null
    ? new Date(Date.now() + burndown.info!.diasAteTerminar * 86400000).toLocaleDateString("pt-BR")
    : null;
  const situacaoCor = !hasBurn ? "text-muted-foreground"
    : burndown.info!.coberturaNaProva >= 100 ? "text-emerald-600 dark:text-emerald-400"
    : burndown.info!.coberturaNaProva >= 75 ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";
  const situacaoIcon = !hasBurn ? AlertTriangle
    : burndown.info!.coberturaNaProva >= 100 ? CheckCircle2 : AlertTriangle;

  return (
    <div className="space-y-8">

      {/* ════════════════════════════════════════════════
          VISÃO GERAL — KPIs
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={BarChart3} color="bg-primary">Visão Geral</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            { label: "Total de Horas",   value: `${totalHoras}h`, sub: `${diasC} dia${diasC !== 1 ? "s" : ""} c/ estudo`, Icon: Clock,      color: "text-primary dark:text-primary",    bg: "bg-primary/10 dark:bg-primary/30" },
            { label: "Média Diária",     value: `${mediaH}h`,     sub: "nos dias estudados",                                 Icon: TrendingUp, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
            { label: "Cobertura Edital", value: `${percEd}%`,     sub: `${estudados}/${totTops} tópicos`,                    Icon: BookOpen,   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Taxa de Acertos",  value: taxaAc !== null ? `${taxaAc}%` : "—", sub: `${totalAcertos} ✓  ${totalErros} ✗`, Icon: Target, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
          ].map((k) => (
            <div key={k.label} className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg mx-auto mb-2 ${k.bg}`}>
                <k.Icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">{k.label}</div>
              <div className="text-xs text-muted-foreground">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PLANO DE ESTUDO — Burn-down & Projeção
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={Rocket} color="bg-purple-500">Plano de Estudo</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 ml-7">
          Data do concurso estimada: {DATA_CONCURSO.toLocaleDateString("pt-BR")} · histórico estimado com base no ritmo médio
        </p>

        {/* Mini-KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Ritmo */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/30 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-primary dark:text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ritmo atual</div>
              <div className="text-xl font-bold text-primary dark:text-primary">
                {hasBurn ? `${burndown.info!.velocidadeSemanal} tóp/sem` : "sem dados"}
              </div>
            </div>
          </div>

          {/* Previsão de conclusão */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
              <Flag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Previsão de conclusão</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {projecaoData ?? (hasBurn && burndown.info!.topicosRestantes === 0 ? "Concluído ✓" : "sem dados")}
              </div>
            </div>
          </div>

          {/* Situação */}
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              !hasBurn ? "bg-muted"
              : burndown.info!.coberturaNaProva >= 100 ? "bg-emerald-50 dark:bg-emerald-950/30"
              : burndown.info!.coberturaNaProva >= 75 ? "bg-amber-50 dark:bg-amber-950/30"
              : "bg-red-50 dark:bg-red-950/30"
            }`}>
              {(() => { const SIcon = situacaoIcon; return <SIcon className={`h-5 w-5 ${situacaoCor}`} />; })()}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Na data do concurso</div>
              <div className={`text-xl font-bold ${situacaoCor}`}>
                {hasBurn ? `${burndown.info!.coberturaNaProva}% do edital` : "sem dados"}
              </div>
            </div>
          </div>
        </div>

        {/* Burn-down chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-500" />
            Burn-down do Edital — tópicos restantes ao longo do tempo
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Azul sólido = real estimado · Laranja tracejado = projeção · Linha vermelha = data do concurso
          </p>
          {!hasBurn || burndown.data.length < 2 ? (
            <EmptyState msg="Adicione atividades no Calendário para ver a projeção" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={burndown.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={weekLabel}
                    interval={burnInterval}
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    className="text-muted-foreground"
                    domain={[0, totTops]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const w = Number(label);
                      const real = payload.find((p) => p.dataKey === "real");
                      const proj = payload.find((p) => p.dataKey === "projecao");
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
                          <p className="font-semibold text-foreground mb-1">{weekLabel(w)}</p>
                          {real && <p className="text-primary">Restantes (est.): {real.value}</p>}
                          {proj && !real && <p className="text-amber-500">Projeção: {proj.value}</p>}
                        </div>
                      );
                    }}
                  />
                  {/* Linha do concurso */}
                  <ReferenceLine
                    x={burndown.examWeek}
                    stroke="#ef4444"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: "Concurso", position: "top", fill: "#ef4444", fontSize: 9 }}
                  />
                  {/* Linha de conclusão */}
                  <ReferenceLine y={0} stroke="#10b981" strokeWidth={1} strokeDasharray="3 2" />

                  <Line
                    dataKey="real"
                    name="Real (estimado)"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    dataKey="projecao"
                    name="Projeção"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    connectNulls={false}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "real" ? "Real (estimado)" : "Projeção ao ritmo atual"
                    }
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          XP AO LONGO DO TEMPO
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={Zap} color="bg-violet-500">XP ao Longo do Tempo</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 ml-7">
          XP acumulado por dia de estudo (1 XP a cada 15 min de atividade no calendário)
        </p>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          {xpEvo.length < 2 ? (
            <EmptyState msg="Registre atividades no Calendário para ver a evolução de XP" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={xpEvo} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis
                  dataKey="date"
                  interval={Math.max(0, Math.floor(xpEvo.length / 6) - 1)}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => `${v} XP`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
                        <p className="font-semibold text-foreground mb-0.5">{label}</p>
                        <p className="text-primary dark:text-primary font-bold">{payload[0].value} XP acumulados</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone" dataKey="xp" stroke="#14b8a6" strokeWidth={2.5}
                  fill="url(#xpGrad)" dot={false} activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          TAXA DE ACERTOS POR MATÉRIA
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={Target} color="bg-amber-500">Performance por Matéria</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 ml-7">
          Verde ≥ 70% · Amarelo 50–70% · Vermelho &lt; 50% · apenas matérias com questões registradas
        </p>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          {taxaAcMateria.length === 0 ? (
            <EmptyState msg="Registre acertos e erros no Edital para ver a performance" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, taxaAcMateria.length * 28 + 40)}>
              <BarChart data={taxaAcMateria} layout="vertical" margin={{ top: 4, right: 64, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground"
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category" dataKey="nome" width={130}
                  tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground"
                />
                {/* Linha de meta a 70% */}
                <ReferenceLine x={70} stroke="#10b981" strokeDasharray="3 2" strokeWidth={1} label={{ value: "70%", position: "top", fill: "#10b981", fontSize: 9 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as typeof taxaAcMateria[0];
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
                        <p className="font-semibold text-foreground mb-1">{d.nomeCompleto}</p>
                        <p style={{ color: d.fill }} className="font-bold">{d.taxa}% de acertos</p>
                        <p className="text-muted-foreground">{d.total} questão(ões) respondida(s)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="taxa" radius={[0, 4, 4, 0]}>
                  {taxaAcMateria.map((m, i) => <Cell key={i} fill={m.fill} />)}
                  <LabelList
                    dataKey="taxa"
                    position="right"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 10, fontWeight: 600, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          PONTOS FRACOS
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={AlertTriangle} color="bg-rose-500">Pontos Fracos</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3 ml-7">
          Tópicos rankeados por taxa de erro — somente tópicos com questões registradas nas cadernos
        </p>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          {pontosFracos.length === 0 ? (
            <EmptyState msg="Registre questões nas cadernos do Edital para identificar pontos fracos" />
          ) : (
            <div className="space-y-3">
              {pontosFracos.slice(0, 15).map((p, i) => {
                const barCor  = p.taxaErro >= 50 ? "bg-red-500" : p.taxaErro >= 30 ? "bg-amber-400" : "bg-emerald-500";
                const txtCor  = p.taxaErro >= 50 ? "text-red-600 dark:text-red-400" : p.taxaErro >= 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
                return (
                  <div key={`${p.materia}||${p.topico}`} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.corMateria }} />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[30%]">{p.materia}</span>
                        <span className="text-[10px] text-muted-foreground dark:text-foreground">·</span>
                        <span className="text-xs font-medium text-foreground dark:text-foreground truncate">{p.topico}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted dark:bg-muted rounded-full h-1.5">
                          <div className={`rounded-full h-1.5 transition-all ${barCor}`} style={{ width: `${p.taxaErro}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-9 text-right flex-shrink-0 ${txtCor}`}>
                          {p.taxaErro}%
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 w-16 text-right">
                          {p.acertos}✓ {p.erros}✗
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pontosFracos.length > 15 && (
                <p className="text-xs text-muted-foreground text-center pt-1 border-t border-border dark:border-border">
                  + {pontosFracos.length - 15} tópicos com questões registradas
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          ATIVIDADE — Evolução Semanal + Tipos
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={Activity} color="bg-primary">Atividade</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-3">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Horas Semanais — últimas 8 semanas
            </h3>
            {semanal.every((w) => w.horas === 0) ? (
              <EmptyState msg="Nenhuma atividade registrada ainda" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={semanal} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="relGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" tickFormatter={(v) => `${v}h`} />
                  <Tooltip content={<TooltipHoras />} />
                  <Area type="monotone" dataKey="horas" stroke="#14b8a6" strokeWidth={2.5} fill="url(#relGrad)" dot={{ r: 3.5, fill: "#14b8a6" }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-purple-500" />
              Tipos de Atividade
            </h3>
            {tiposData.length === 0 ? (
              <EmptyState msg="Nenhuma atividade registrada" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={tiposData} dataKey="horas" nameKey="nome" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {tiposData.map((e, i) => <Cell key={i} fill={e.cor} />)}
                    </Pie>
                    <Tooltip content={<TooltipPie />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {tiposData.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.cor }} />
                        <span className="text-muted-foreground truncate">{t.nome}</span>
                      </div>
                      <span className="font-semibold text-foreground dark:text-foreground ml-2 flex-shrink-0">{t.horas}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          LEITURA — Páginas por Hora (matéria/tópico)
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={BookOpen} color="bg-primary">Leitura — Páginas por Hora</SectionTitle>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm mt-3">
          {leitura.length === 0 ? (
            <EmptyState msg="Registre as páginas lidas no Timer de Estudo para ver sua velocidade de leitura" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border dark:border-border">
                <span className="text-xs text-muted-foreground">
                  {leituraPaginas} páginas em {Math.round((leituraMinutos / 60) * 10) / 10}h de leitura registrada
                </span>
                <span className="text-sm font-bold text-primary">
                  {leituraPagHora !== null ? `${leituraPagHora.toFixed(1)} pág/h no geral` : "—"}
                </span>
              </div>
              <div className="space-y-3">
                {leitura.map((m) => (
                  <div key={m.materia}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground dark:text-foreground truncate max-w-[60%]">{m.materia}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.paginas} pág · {Math.round((m.minutos / 60) * 10) / 10}h ·{" "}
                        <span className="font-bold text-primary">{m.pagHora.toFixed(1)} pág/h</span>
                      </span>
                    </div>
                    {m.topicos.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {m.topicos.map((t) => (
                          <div key={t.topico} className="flex items-center justify-between pl-4">
                            <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">↳ {t.topico}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {t.paginas} pág · <span className="font-semibold text-primary/80">{t.pagHora.toFixed(1)} pág/h</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          DESEMPENHO — Progresso + Dias + Acertos/Erros
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={BarChart3} color="bg-emerald-500">Desempenho</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Progresso por Matéria (% tópicos estudados)
            </h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={materiasSort} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as MateriaProg;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
                        <p className="font-semibold text-foreground mb-1">{d.nomeCompleto}</p>
                        <p className="text-muted-foreground">{d.estudados}/{d.total} tópicos · {d.perc}%</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="perc" radius={[0, 4, 4, 0]}>
                  {materiasSort.map((m, i) => <Cell key={i} fill={m.cor} opacity={m.perc === 0 ? 0.25 : 1} />)}
                  <LabelList dataKey="perc" position="right" formatter={(v: number) => v > 0 ? `${v}%` : ""} style={{ fontSize: 10, fontWeight: 600, fill: "currentColor" }} className="text-muted-foreground" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                Horas por Dia da Semana
              </h3>
              {maxH === 0 ? (
                <EmptyState msg="Nenhuma atividade registrada" />
              ) : (
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={diasData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" tickFormatter={(v) => `${v}h`} />
                    <Tooltip content={<TooltipHoras />} />
                    <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
                      {diasData.map((e, i) => <Cell key={i} fill={e.horas === maxH && maxH > 0 ? "#0d9488" : "#5eead4"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Acertos vs Erros por Matéria
              </h3>
              {materiaAcErros.length === 0 ? (
                <EmptyState msg="Nenhuma questão registrada ainda" />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={materiaAcErros} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="nome" interval={0} tick={{ fontSize: 9, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const ac = (payload.find((p) => p.dataKey === "acertos")?.value as number) ?? 0;
                        const er = (payload.find((p) => p.dataKey === "erros")?.value as number) ?? 0;
                        const tot = ac + er;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
                            <p className="font-semibold text-foreground mb-1">{label}</p>
                            <p className="text-emerald-600">Acertos: {ac}</p>
                            <p className="text-red-500">Erros: {er}</p>
                            <p className="text-muted-foreground mt-1">Taxa: {tot > 0 ? Math.round((ac / tot) * 100) : 0}%</p>
                          </div>
                        );
                      }}
                    />
                    <Legend formatter={(v) => v === "acertos" ? "Acertos" : "Erros"} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="acertos" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="erros"   fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MAPA DE ATIVIDADE — Heatmap
      ════════════════════════════════════════════════ */}
      <div>
        <SectionTitle icon={CalendarDays} color="bg-green-500">Mapa de Atividade</SectionTitle>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm mt-3">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-green-500" />
            Últimas 12 semanas
          </h3>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1">
              <div className="flex flex-col gap-1 mr-1">
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} className="w-3.5 h-3.5 flex items-center justify-end text-[9px] text-muted-foreground pr-0.5">
                    {i % 2 !== 0 ? d : ""}
                  </div>
                ))}
              </div>
              {Array.from({ length: 12 }, (_, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, d) => {
                    const day = heatmap[w * 7 + d];
                    if (!day) return <div key={d} className="w-3.5 h-3.5 rounded-sm" />;
                    if (day.isFuture) return <div key={d} className="w-3.5 h-3.5 rounded-sm bg-muted/50" />;
                    return (
                      <div
                        key={d}
                        title={`${day.label}: ${day.horas}h`}
                        className={`w-3.5 h-3.5 rounded-sm cursor-default transition-transform hover:scale-125 ${HEATMAP_LEVEL_CLASS[day.nivel]}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Menos</span>
            {HEATMAP_LEVEL_CLASS.map((cls, i) => <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />)}
            <span>Mais</span>
            <span className="ml-auto text-muted-foreground dark:text-foreground">passe o mouse para ver detalhes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
