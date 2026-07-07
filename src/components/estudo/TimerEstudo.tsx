"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Timer, ChevronDown, Check, RotateCcw, Zap, Coffee } from "lucide-react";
import { MATERIAS, ATIVIDADE_CONFIG, type AtividadeTipo, type Grupo } from "@/lib/estudo-data";

const GRUPOS: Grupo[] = ["A", "B", "C", "D"];
const GRUPO_PILL: Record<Grupo, string> = {
  A: "bg-blue-500 text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-violet-500 text-white",
  D: "bg-amber-500 text-white",
};
const GRUPO_OUTLINE: Record<Grupo, string> = {
  A: "border-blue-400 text-blue-600 dark:text-blue-400",
  B: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  C: "border-violet-400 text-violet-600 dark:text-violet-400",
  D: "border-amber-400 text-amber-600 dark:text-amber-400",
};

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function playBell() {
  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 830;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch { /* ignore */ }
}

interface Props {
  onSalvar: (
    duracao: number,
    tipo: AtividadeTipo,
    descricao: string,
    grupo?: Grupo,
    materia?: string,
    topico?: string,
    paginas?: number
  ) => void;
}

type Status = "idle" | "running" | "paused";
type PomodoroPhase = "work" | "break";

interface TimerSnapshot {
  status: Status;
  acc: number;
  startedAt: number;
  materia: string;
  topico: string;
  tipo: AtividadeTipo;
  grupo: Grupo | null;
  pomodoroMode?: boolean;
  pomodoroPhase?: PomodoroPhase;
  pomodoroCount?: number;
  paginas?: string;
}

const TIMER_KEY = "taxhub_timer_v1";

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatCountdown(elapsed: number, phase: PomodoroPhase): string {
  const target = phase === "work" ? WORK_SECS : BREAK_SECS;
  const remaining = Math.max(0, target - elapsed);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerEstudo({ onSalvar }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [materia, setMateria] = useState("");
  const [topico, setTopico] = useState("");
  const [tipo, setTipo] = useState<AtividadeTipo>("estudo");
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [paginas, setPaginas] = useState(""); // páginas lidas na sessão (opcional)
  const [showSave, setShowSave] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pomodoro
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  // espelho de `paginas` pro saveSnapshot (useCallback com deps vazias) não capturar valor velho
  const paginasRef = useRef("");
  useEffect(() => {
    paginasRef.current = paginas;
  }, [paginas]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setElapsed(accRef.current + Math.floor((Date.now() - startRef.current) / 1000));
  }, []);

  // Restore timer state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as TimerSnapshot;
      if (!snap) return;

      setMateria(snap.materia ?? "");
      setTopico(snap.topico ?? "");
      setTipo(snap.tipo ?? "estudo");
      setGrupo(snap.grupo ?? null);
      setPaginas(snap.paginas ?? "");
      if (snap.pomodoroMode) setPomodoroMode(true);
      if (snap.pomodoroPhase) setPomodoroPhase(snap.pomodoroPhase);
      if (snap.pomodoroCount) setPomodoroCount(snap.pomodoroCount);

      if (snap.status === "running" && snap.startedAt) {
        accRef.current = snap.acc ?? 0;
        startRef.current = snap.startedAt;
        const restored = accRef.current + Math.floor((Date.now() - snap.startedAt) / 1000);
        setElapsed(restored);
        setStatus("running");
        intervalRef.current = setInterval(tick, 500);
        setExpanded(true);
      } else if (snap.status === "paused") {
        const e = snap.acc ?? 0;
        accRef.current = e;
        setElapsed(e);
        setStatus("paused");
        setExpanded(true);
      }
    } catch {
      // ignore corrupt data
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSnapshot = useCallback((
    nextStatus: Status,
    nextAcc: number,
    nextStartedAt: number,
    currentMateria: string,
    currentTopico: string,
    currentTipo: AtividadeTipo,
    currentGrupo: Grupo | null,
    currentPomodoroMode: boolean,
    currentPomodoroPhase: PomodoroPhase,
    currentPomodoroCount: number,
  ) => {
    const snap: TimerSnapshot = {
      status: nextStatus,
      acc: nextAcc,
      startedAt: nextStartedAt,
      materia: currentMateria,
      topico: currentTopico,
      tipo: currentTipo,
      grupo: currentGrupo,
      pomodoroMode: currentPomodoroMode,
      pomodoroPhase: currentPomodoroPhase,
      pomodoroCount: currentPomodoroCount,
      paginas: paginasRef.current,
    };
    localStorage.setItem(TIMER_KEY, JSON.stringify(snap));
  }, []);

  const clearSnapshot = useCallback(() => {
    localStorage.removeItem(TIMER_KEY);
  }, []);

  const handleStart = () => {
    const now = Date.now();
    accRef.current = 0;
    startRef.current = now;
    setElapsed(0);
    setStatus("running");
    setShowSave(false);
    setSaved(false);
    const startPhase: PomodoroPhase = "work";
    if (pomodoroMode) setPomodoroPhase(startPhase);
    intervalRef.current = setInterval(tick, 500);
    saveSnapshot("running", 0, now, materia, topico, tipo, grupo, pomodoroMode, pomodoroMode ? startPhase : pomodoroPhase, pomodoroCount);
  };

  const handlePause = () => {
    clearTimer();
    const cur = accRef.current + Math.floor((Date.now() - startRef.current) / 1000);
    accRef.current = cur;
    startRef.current = 0; // zera: em pausa o total já está todo em accRef
    setStatus("paused");
    saveSnapshot("paused", cur, 0, materia, topico, tipo, grupo, pomodoroMode, pomodoroPhase, pomodoroCount);
  };

  const handleResume = () => {
    const now = Date.now();
    startRef.current = now;
    setStatus("running");
    intervalRef.current = setInterval(tick, 500);
    saveSnapshot("running", accRef.current, now, materia, topico, tipo, grupo, pomodoroMode, pomodoroPhase, pomodoroCount);
  };

  const handleStop = () => {
    clearTimer();
    // BUG CORRIGIDO: parando a partir da PAUSA, o total já está em accRef — somar de novo o
    // delta desde startRef (que fica velho na pausa) dobrava o tempo (22min viravam 44min)
    const cur =
      status === "running" && startRef.current > 0
        ? accRef.current + Math.floor((Date.now() - startRef.current) / 1000)
        : accRef.current;
    accRef.current = cur;
    setElapsed(cur);
    setStatus("idle");
    // Não salva pausa do pomodoro manualmente
    if (cur > 0 && !(pomodoroMode && pomodoroPhase === "break")) setShowSave(true);
    clearSnapshot();
  };

  const handleReset = () => {
    clearTimer();
    accRef.current = 0;
    setElapsed(0);
    setStatus("idle");
    setShowSave(false);
    setSaved(false);
    setGrupo(null);
    setPaginas("");
    if (pomodoroMode) {
      setPomodoroPhase("work");
      setPomodoroCount(0);
    }
    clearSnapshot();
  };

  const handleSkipBreak = () => {
    clearTimer();
    accRef.current = 0;
    const now = Date.now();
    startRef.current = now;
    setElapsed(0);
    setPomodoroPhase("work");
    intervalRef.current = setInterval(tick, 500);
    saveSnapshot("running", 0, now, materia, topico, tipo, grupo, pomodoroMode, "work", pomodoroCount);
  };

  // Conclusão automática de fase no modo Pomodoro
  useEffect(() => {
    if (!pomodoroMode || status !== "running") return;
    const target = pomodoroPhase === "work" ? WORK_SECS : BREAK_SECS;
    if (elapsed < target) return;

    clearTimer();
    playBell();

    const now = Date.now();
    accRef.current = 0;
    startRef.current = now;

    if (pomodoroPhase === "work") {
      const sub = topico || materia;
      const descricao = sub ? `Pomodoro — ${sub}` : "Pomodoro";
      // páginas digitadas durante o bloco vão junto e o campo zera — cada work conta as suas
      const pgs = Number(paginas);
      onSalvar(
        Math.round(WORK_SECS / 60),
        tipo,
        descricao,
        grupo ?? undefined,
        materia || undefined,
        topico || undefined,
        Number.isFinite(pgs) && pgs > 0 ? pgs : undefined
      );
      setPaginas("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      setPomodoroPhase("break");
      setElapsed(0);
      intervalRef.current = setInterval(tick, 500);
      saveSnapshot("running", 0, now, materia, topico, tipo, grupo, pomodoroMode, "break", newCount);
    } else {
      setPomodoroPhase("work");
      setElapsed(0);
      intervalRef.current = setInterval(tick, 500);
      saveSnapshot("running", 0, now, materia, topico, tipo, grupo, pomodoroMode, "work", pomodoroCount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, pomodoroMode, pomodoroPhase, status]);

  const handleSalvar = () => {
    const duracao = Math.max(1, Math.round(elapsed / 60));
    let descricao: string;
    if (tipo === "questoes" || tipo === "bateria") {
      const base = tipo === "questoes" ? "Questões" : "Bateria";
      const grp = grupo ? ` Grupo ${grupo}` : "";
      const sub = topico ? ` — ${topico}` : materia ? ` — ${materia}` : "";
      descricao = `${base}${grp}${sub}`;
    } else {
      const tipoLabel = ATIVIDADE_CONFIG[tipo].label;
      const sub = topico || materia;
      descricao = sub ? `${tipoLabel} — ${sub}` : tipoLabel;
    }
    const pgs = Number(paginas);
    onSalvar(
      duracao,
      tipo,
      descricao,
      grupo ?? undefined,
      materia || undefined,
      topico || undefined,
      Number.isFinite(pgs) && pgs > 0 ? pgs : undefined
    );
    handleReset();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // pág/h da sessão atual (ao vivo no relógio e na hora de salvar)
  const paginasNum = Number(paginas);
  const pagPorHora =
    Number.isFinite(paginasNum) && paginasNum > 0 && elapsed >= 60
      ? paginasNum / (elapsed / 3600)
      : null;

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Atualiza o título da aba com o tempo atual
  useEffect(() => {
    if (status === "idle") {
      document.title = "Tax Hub";
      return () => { document.title = "Tax Hub"; };
    }
    const time = pomodoroMode
      ? formatCountdown(elapsed, pomodoroPhase)
      : formatTime(elapsed);
    const label = pomodoroMode
      ? pomodoroPhase === "work" ? "⚡ Pomodoro" : "☕ Pausa"
      : status === "paused" ? "⏸ Timer"
      : "⏱ Timer";
    document.title = `${time} — ${label}`;
    return () => { document.title = "Tax Hub"; };
  }, [status, elapsed, pomodoroMode, pomodoroPhase]);

  const topicoOptions = materia
    ? MATERIAS.find((m) => m.nome === materia)?.topicos ?? []
    : [];

  const isRunning = status === "running";
  const isPaused = status === "paused";

  const statusDot = isRunning
    ? pomodoroMode
      ? pomodoroPhase === "work" ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"
      : "bg-green-500 animate-pulse"
    : isPaused
    ? "bg-amber-500"
    : elapsed > 0
    ? "bg-blue-400"
    : "bg-gray-300 dark:bg-gray-600";

  const phasePerc = pomodoroMode && status !== "idle"
    ? Math.min(100, Math.round((elapsed / (pomodoroPhase === "work" ? WORK_SECS : BREAK_SECS)) * 100))
    : null;

  const displayTime = pomodoroMode && status !== "idle"
    ? formatCountdown(elapsed, pomodoroPhase)
    : formatTime(elapsed);

  const clockColor = isRunning
    ? pomodoroMode
      ? pomodoroPhase === "work" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
      : "text-gray-900 dark:text-white"
    : isPaused
    ? "text-amber-600 dark:text-amber-400"
    : "text-gray-400 dark:text-gray-500";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Saved toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-3.5 w-3.5" />
          {pomodoroMode ? <><Zap className="h-3.5 w-3.5" /> Pomodoro salvo!</> : "Salvo no calendário de hoje!"}
        </div>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-72 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Timer de Estudo
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Mode toggle — só quando idle */}
          {status === "idle" && !showSave && (
            <div className="px-4 pt-3">
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setPomodoroMode(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    !pomodoroMode
                      ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" /> Cronômetro
                </button>
                <button
                  type="button"
                  onClick={() => { setPomodoroMode(true); setPomodoroPhase("work"); setPomodoroCount(0); setTipo("estudo"); setGrupo(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    pomodoroMode
                      ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" /> Pomodoro
                </button>
              </div>
              {pomodoroMode && (
                <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-500">
                  25min trabalho · 5min pausa · salva automático
                </p>
              )}
            </div>
          )}

          {/* Fase do Pomodoro — quando rodando/pausado */}
          {pomodoroMode && status !== "idle" && (
            <div className={`mx-4 mt-3 rounded-lg px-3 py-2 flex items-center justify-between ${
              pomodoroPhase === "work"
                ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
            }`}>
              <div className="flex items-center gap-1.5">
                {pomodoroPhase === "work"
                  ? <Zap className="h-4 w-4 text-red-600 dark:text-red-400" />
                  : <Coffee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                <span className={`text-xs font-bold uppercase tracking-wide ${
                  pomodoroPhase === "work"
                    ? "text-red-700 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}>
                  {pomodoroPhase === "work" ? "Trabalho" : "Pausa"}
                </span>
              </div>
              {pomodoroCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Zap className="h-3 w-3" /> × {pomodoroCount}
                </span>
              )}
            </div>
          )}

          {/* Matéria + Tópico — sempre visível no Pomodoro; só quando idle no cronômetro */}
          {!showSave && (status === "idle" || pomodoroMode) && (
            <div className="px-4 pt-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Matéria <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  value={materia}
                  onChange={(e) => { setMateria(e.target.value); setTopico(""); }}
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Só marcar o tempo —</option>
                  {MATERIAS.map((m) => (
                    <option key={m.nome} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </div>

              {materia && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tópico</label>
                  <select
                    value={topico}
                    onChange={(e) => setTopico(e.target.value)}
                    className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tópico geral</option>
                    {topicoOptions.map((t) => (
                      <option key={t} value={t}>{t.length > 55 ? t.slice(0, 55) + "…" : t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Páginas lidas — no Pomodoro dá pra digitar durante o bloco (salva e zera a cada
                  work); no cronômetro também dá pra ajustar na hora de salvar */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Páginas lidas <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={paginas}
                  onChange={(e) => setPaginas(e.target.value)}
                  placeholder="ex.: 12"
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tipo e Grupo — só cronômetro quando idle */}
              {!pomodoroMode && status === "idle" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de atividade</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(["estudo", "questoes", "recall", "caderno_erros", "bateria", "cartas"] as AtividadeTipo[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTipo(t); setGrupo(null); }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                            tipo === t
                              ? ATIVIDADE_CONFIG[t].cor + " border-current font-semibold"
                              : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                          }`}
                        >
                          {(() => { const Icon = ATIVIDADE_CONFIG[t].icone; return <Icon className="h-3.5 w-3.5 flex-shrink-0" />; })()}
                          <span className="truncate">{ATIVIDADE_CONFIG[t].label.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(tipo === "questoes" || tipo === "bateria") && (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Grupo <span className="text-gray-400">(opcional)</span>
                      </label>
                      <div className="flex gap-1.5">
                        {GRUPOS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGrupo(grupo === g ? null : g)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              grupo === g
                                ? GRUPO_PILL[g]
                                : `border ${GRUPO_OUTLINE[g]} bg-transparent`
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Info panel — cronômetro rodando */}
          {!showSave && !pomodoroMode && isRunning && elapsed > 0 && (materia || grupo) && (
            <div className="px-4 pt-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                {materia && <div className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">{materia}</div>}
                {topico && (
                  <div className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5">{topico}</div>
                )}
                {grupo && (
                  <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Grupo {grupo}</div>
                )}
              </div>
            </div>
          )}

          {/* Clock */}
          <div className="px-4 py-4 text-center">
            <div className={`font-mono text-4xl font-bold tabular-nums tracking-tight transition-colors ${clockColor}`}>
              {displayTime}
            </div>
            {/* Barra de progresso no modo Pomodoro */}
            {phasePerc !== null && (
              <div className="mt-2 mx-2">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`rounded-full h-1.5 transition-all ${
                      pomodoroPhase === "work" ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${phasePerc}%` }}
                  />
                </div>
              </div>
            )}
            {!pomodoroMode && elapsed > 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {Math.round(elapsed / 60)} min líquidos
              </div>
            )}
            {pagPorHora !== null && (
              <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 font-medium">
                📖 {paginasNum} pág · {pagPorHora.toFixed(1)} pág/h
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-4 pb-4 flex items-center justify-center gap-2">
            {status === "idle" && (
              <button
                type="button"
                onClick={handleStart}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-medium rounded-xl transition-colors shadow-sm ${
                  pomodoroMode
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Play className="h-4 w-4 fill-white" />
                {pomodoroMode ? "Iniciar Pomodoro" : elapsed > 0 ? "Retomar" : "Iniciar"}
              </button>
            )}

            {status === "running" && (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Pause className="h-4 w-4 fill-white" />
                  Pausar
                </button>
                {pomodoroMode && pomodoroPhase === "break" ? (
                  <button
                    type="button"
                    onClick={handleSkipBreak}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5" /> Pular pausa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
                    title="Parar e salvar"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                )}
              </>
            )}

            {status === "paused" && (
              <div className="w-full space-y-2">
                {/* Banner de aviso: deixa claro que o timer está acumulado */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-center">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Em pausa · <span className="font-bold">{Math.round(elapsed / 60)} min acumulados</span>
                  </p>
                  <p className="text-[10px] text-amber-500 dark:text-amber-500 mt-0.5">
                    "Retomar" continua daqui. "Zerar" descarta e recomeça do zero.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResume}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-medium rounded-xl transition-colors ${
                      pomodoroMode && pomodoroPhase === "work"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Retomar
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
                    title="Parar e salvar"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-xl transition-colors"
                    title="Zerar timer e descartar sessão atual"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Zerar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save prompt */}
          {showSave && (
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                Sessão de <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(elapsed / 60)} min</span> concluída. Salvar no calendário?
              </div>
              <div className="mb-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Páginas lidas nessa sessão <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={paginas}
                  onChange={(e) => setPaginas(e.target.value)}
                  placeholder="ex.: 12"
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {pagPorHora !== null && (
                  <p className="mt-1 text-center text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                    📖 {pagPorHora.toFixed(1)} páginas/hora nessa sessão
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSalvar}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Salvar
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed pill */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full shadow-lg border transition-all hover:shadow-xl ${
          isRunning
            ? pomodoroMode
              ? pomodoroPhase === "work"
                ? "bg-red-600 border-red-600 text-white"
                : "bg-emerald-600 border-emerald-600 text-white"
              : "bg-blue-600 border-blue-600 text-white"
            : isPaused
            ? "bg-amber-500 border-amber-500 text-white"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isRunning ? "bg-white animate-pulse" : isPaused ? "bg-white opacity-80" : "bg-gray-300 dark:bg-gray-500"
          }`}
        />
        {pomodoroMode && status !== "idle" ? (
          pomodoroPhase === "work"
            ? <Zap className="h-4 w-4 flex-shrink-0" />
            : <Coffee className="h-4 w-4 flex-shrink-0" />
        ) : (
          <Timer className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="text-sm font-mono font-semibold tabular-nums">
          {status !== "idle" ? displayTime : "Timer"}
        </span>
        {pomodoroCount > 0 && !expanded && (
          <span className="hidden sm:block text-xs opacity-80">× {pomodoroCount}</span>
        )}
        {materia && !expanded && status === "idle" && (
          <span className="hidden sm:block text-xs max-w-[120px] truncate text-gray-400 dark:text-gray-500">
            · {materia.split(" ")[0]}
          </span>
        )}
      </button>
    </div>
  );
}
