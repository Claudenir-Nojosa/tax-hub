"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Flame, CalendarDays } from "lucide-react";
import { ATIVIDADE_CONFIG, type AtividadeCalendario, type AtividadeTipo } from "@/lib/estudo-data";

interface Props {
  calendario: Record<string, AtividadeCalendario[]>;
  onUpdate: (calendario: Record<string, AtividadeCalendario[]>) => void;
  onSemanasOKChange: (delta: number) => void;
  streak: number;
  semanasOK: number;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarioTab({ calendario, onUpdate, onSemanasOKChange, streak, semanasOK }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formTipo, setFormTipo] = useState<AtividadeTipo>("estudo");
  const [formDesc, setFormDesc] = useState("");
  const [formDuracao, setFormDuracao] = useState(50);

  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setViewDate(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  };
  const nextMonth = () => {
    setViewDate(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  };

  const openModal = (key: string) => {
    setSelectedDay(key);
    setFormTipo("estudo");
    setFormDesc("");
    setFormDuracao(50);
    setModalOpen(true);
  };

  const addAtividade = () => {
    if (!selectedDay || !formDesc.trim()) return;
    const nova: AtividadeCalendario = {
      id: Date.now().toString(),
      tipo: formTipo,
      descricao: formDesc.trim(),
      duracao: formDuracao,
    };
    const prev = calendario[selectedDay] ?? [];
    onUpdate({ ...calendario, [selectedDay]: [...prev, nova] });
    setFormDesc("");
  };

  const removeAtividade = (dayKey: string, id: string) => {
    const prev = calendario[dayKey] ?? [];
    const updated = prev.filter((a) => a.id !== id);
    if (updated.length === 0) {
      const { [dayKey]: _, ...rest } = calendario;
      onUpdate(rest);
    } else {
      onUpdate({ ...calendario, [dayKey]: updated });
    }
  };

  const totalMinMonth = Object.entries(calendario)
    .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((acc, [, atividades]) => acc + atividades.reduce((a, b) => a + b.duracao, 0), 0);

  const diasComAtividade = Object.keys(calendario).filter((key) =>
    key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)
  ).length;

  return (
    <div className="space-y-4">
      {/* Stats do mês */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{Math.round(totalMinMonth / 60)}h</div>
          <div className="text-xs text-blue-500 dark:text-blue-400">Estudadas no mês</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{diasComAtividade}</div>
          <div className="text-xs text-emerald-500 dark:text-emerald-400">Dias com atividade</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-amber-700 dark:text-amber-300">
            <Flame className="h-5 w-5 text-orange-500" />
            {streak}
          </div>
          <div className="text-xs text-amber-500 dark:text-amber-400">Semanas seguidas</div>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Navegação */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {MESES[month]} {year}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-r border-b border-gray-50 dark:border-gray-700/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dateKey(year, month, day);
            const atividades = calendario[key] ?? [];
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const tipos = [...new Set(atividades.map((a) => a.tipo))];
            const totalMin = atividades.reduce((acc, a) => acc + a.duracao, 0);

            return (
              <button
                key={day}
                type="button"
                onClick={() => openModal(key)}
                className={`h-16 border-r border-b border-gray-50 dark:border-gray-700/50 p-1 text-left hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group ${
                  isToday ? "bg-blue-50 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {isToday ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">{day}</span> : day}
                </div>
                {atividades.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {tipos.slice(0, 3).map((tipo) => (
                      <div
                        key={tipo}
                        className={`h-1.5 w-1.5 rounded-full ${ATIVIDADE_CONFIG[tipo].corDot}`}
                        title={ATIVIDADE_CONFIG[tipo].label}
                      />
                    ))}
                    {totalMin > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 leading-none">
                        {Math.round(totalMin / 60)}h
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
          {(Object.entries(ATIVIDADE_CONFIG) as [AtividadeTipo, typeof ATIVIDADE_CONFIG[AtividadeTipo]][]).map(
            ([tipo, cfg]) => {
              const Icon = cfg.icone;
              return (
                <div key={tipo} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${cfg.corDot}`} />
                  <Icon className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cfg.label}</span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Modal / painel lateral */}
      {modalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                {selectedDay}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Atividades existentes */}
            <div className="px-4 py-3 max-h-48 overflow-y-auto">
              {(calendario[selectedDay] ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">Sem atividades neste dia</p>
              ) : (
                <div className="space-y-1.5">
                  {(calendario[selectedDay] ?? []).map((a) => {
                    const AtivIcon = ATIVIDADE_CONFIG[a.tipo].icone;
                    return (
                      <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ATIVIDADE_CONFIG[a.tipo].cor}`}>
                        <AtivIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{a.descricao}</div>
                          <div className="text-xs opacity-70">{a.duracao} min</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAtividade(selectedDay, a.id)}
                          className="p-0.5 hover:opacity-70 flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form nova atividade */}
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Adicionar Atividade</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ATIVIDADE_CONFIG) as [AtividadeTipo, typeof ATIVIDADE_CONFIG[AtividadeTipo]][]).map(
                  ([tipo, cfg]) => {
                    const BtnIcon = cfg.icone;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setFormTipo(tipo)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                          formTipo === tipo
                            ? `${cfg.cor} border-current font-semibold`
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <BtnIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {cfg.label}
                      </button>
                    );
                  }
                )}
              </div>
              <input
                type="text"
                placeholder="Descrição (ex: Contabilidade Geral — Cap 1)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAtividade()}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Duração (min):</label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={formDuracao}
                  onChange={(e) => setFormDuracao(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-20 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addAtividade}
                  disabled={!formDesc.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
