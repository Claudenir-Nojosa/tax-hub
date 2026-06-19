"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Timer, ChevronDown, Check, RotateCcw } from "lucide-react";
import { MATERIAS, ATIVIDADE_CONFIG, type AtividadeTipo } from "@/lib/estudo-data";

interface Props {
  onSalvar: (duracao: number, tipo: AtividadeTipo, descricao: string) => void;
}

type Status = "idle" | "running" | "paused";

interface TimerSnapshot {
  status: Status;
  acc: number;
  startedAt: number;
  materia: string;
  topico: string;
  tipo: AtividadeTipo;
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

export default function TimerEstudo({ onSalvar }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [materia, setMateria] = useState("");
  const [topico, setTopico] = useState("");
  const [tipo, setTipo] = useState<AtividadeTipo>("estudo");
  const [showSave, setShowSave] = useState(false);
  const [saved, setSaved] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const accRef = useRef<number>(0);

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
  ) => {
    const snap: TimerSnapshot = {
      status: nextStatus,
      acc: nextAcc,
      startedAt: nextStartedAt,
      materia: currentMateria,
      topico: currentTopico,
      tipo: currentTipo,
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
    intervalRef.current = setInterval(tick, 500);
    saveSnapshot("running", 0, now, materia, topico, tipo);
  };

  const handlePause = () => {
    clearTimer();
    const cur = accRef.current + Math.floor((Date.now() - startRef.current) / 1000);
    accRef.current = cur;
    setStatus("paused");
    saveSnapshot("paused", cur, 0, materia, topico, tipo);
  };

  const handleResume = () => {
    const now = Date.now();
    startRef.current = now;
    setStatus("running");
    intervalRef.current = setInterval(tick, 500);
    saveSnapshot("running", accRef.current, now, materia, topico, tipo);
  };

  const handleStop = () => {
    clearTimer();
    const cur = accRef.current + Math.floor((Date.now() - startRef.current) / 1000);
    accRef.current = cur;
    setElapsed(cur);
    setStatus("idle");
    if (cur > 0) setShowSave(true);
    clearSnapshot();
  };

  const handleReset = () => {
    clearTimer();
    accRef.current = 0;
    setElapsed(0);
    setStatus("idle");
    setShowSave(false);
    setSaved(false);
    clearSnapshot();
  };

  const handleSalvar = () => {
    const duracao = Math.max(1, Math.round(elapsed / 60));
    const tipoLabel = ATIVIDADE_CONFIG[tipo].label;
    const sub = topico || materia;
    const descricao = sub ? `${tipoLabel} — ${sub}` : tipoLabel;
    onSalvar(duracao, tipo, descricao);
    setSaved(true);
    setShowSave(false);
    handleReset();
  };

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const topicoOptions = materia
    ? MATERIAS.find((m) => m.nome === materia)?.topicos ?? []
    : [];

  const isRunning = status === "running";
  const isPaused = status === "paused";

  const statusDot = isRunning
    ? "bg-green-500 animate-pulse"
    : isPaused
    ? "bg-amber-500"
    : elapsed > 0
    ? "bg-blue-400"
    : "bg-gray-300 dark:bg-gray-600";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Saved toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-3.5 w-3.5" /> Salvo no calendário de hoje!
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

          {/* Selectors — opcional */}
          {!isRunning || elapsed === 0 ? (
            <div className="px-4 pt-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Matéria <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  value={materia}
                  onChange={(e) => { setMateria(e.target.value); setTopico(""); }}
                  disabled={isRunning}
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
                    disabled={isRunning}
                    className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">Tópico geral</option>
                    {topicoOptions.map((t) => (
                      <option key={t} value={t}>{t.length > 55 ? t.slice(0, 55) + "…" : t}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de atividade</label>
                <div className="grid grid-cols-2 gap-1">
                  {(["estudo", "questoes", "recall", "caderno_erros", "bateria"] as AtividadeTipo[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      disabled={isRunning}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all disabled:opacity-60 ${
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
            </div>
          ) : (
            /* Info do tópico em execução */
            materia && (
              <div className="px-4 pt-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">{materia}</div>
                  {topico && (
                    <div className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5">{topico}</div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Clock */}
          <div className="px-4 py-4 text-center">
            <div
              className={`font-mono text-4xl font-bold tabular-nums tracking-tight transition-colors ${
                isRunning
                  ? "text-gray-900 dark:text-white"
                  : isPaused
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {formatTime(elapsed)}
            </div>
            {elapsed > 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {Math.round(elapsed / 60)} min líquidos
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-4 pb-4 flex items-center justify-center gap-2">
            {status === "idle" && (
              <button
                type="button"
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Play className="h-4 w-4 fill-white" />
                {elapsed > 0 ? "Retomar" : "Iniciar"}
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
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
                  title="Parar e salvar"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              </>
            )}

            {status === "paused" && (
              <>
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
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
                  className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-colors"
                  title="Resetar"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Save prompt */}
          {showSave && (
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                Sessão de <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(elapsed / 60)} min</span> concluída. Salvar no calendário?
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
            ? "bg-blue-600 border-blue-600 text-white"
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
        <Timer className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-mono font-semibold tabular-nums">
          {elapsed > 0 ? formatTime(elapsed) : "Timer"}
        </span>
        {materia && !expanded && (
          <span className={`hidden sm:block text-xs max-w-[120px] truncate ${isRunning ? "opacity-80" : "text-gray-400 dark:text-gray-500"}`}>
            · {materia.split(" ")[0]}
          </span>
        )}
      </button>
    </div>
  );
}
