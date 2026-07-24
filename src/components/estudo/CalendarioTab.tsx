"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Flame, CalendarDays, Pencil } from "lucide-react";
import {
  ATIVIDADE_CONFIG,
  MATERIAS,
  GRUPO_PILL,
  GRUPO_OUTLINE,
  type AtividadeCalendario,
  type AtividadeTipo,
  type Grupo,
  type MateriaConcurso,
} from "@/lib/estudo-data";
import BottomSheetModal from "./ui/BottomSheetModal";

// Cores para células e modal
const CAL_COR: Record<AtividadeTipo, string> = {
  estudo:            "bg-primary/10   text-primary   dark:bg-primary/20   dark:text-primary",
  questoes:          "bg-purple-100 text-purple-800 dark:bg-purple-400/20 dark:text-purple-200",
  recall:            "bg-amber-100  text-amber-800  dark:bg-amber-400/20  dark:text-amber-200",
  caderno_erros:     "bg-red-100    text-red-800    dark:bg-red-400/20    dark:text-red-200",
  bateria:           "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
  cartas:            "bg-indigo-100  text-indigo-800  dark:bg-indigo-400/20  dark:text-indigo-200",
  materia_concluida: "bg-teal-100   text-teal-800   dark:bg-teal-400/20   dark:text-teal-200",
};

interface Props {
  calendario: Record<string, AtividadeCalendario[]>;
  onUpdate: (calendario: Record<string, AtividadeCalendario[]>) => void;
  onSemanasOKChange: (delta: number) => void;
  streak: number;
  semanasOK: number;
  materiasConcurso?: MateriaConcurso[];
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const GRUPOS: Grupo[] = ["A","B","C","D"];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildAutoDesc(tipo: AtividadeTipo, grupo: Grupo | null, materia: string, topico: string): string {
  if (tipo === "questoes" || tipo === "bateria") {
    const base = tipo === "questoes" ? "Questões" : "Bateria";
    const grp = grupo ? ` Grupo ${grupo}` : "";
    const sub = topico ? ` — ${topico}` : materia ? ` — ${materia}` : "";
    return `${base}${grp}${sub}`;
  }
  if (tipo === "estudo") {
    const sub = topico ? ` — ${topico}` : materia ? ` — ${materia}` : "";
    return `Estudo${sub}`;
  }
  if (tipo === "materia_concluida") {
    return materia ? `Matéria Concluída — ${materia}` : "Matéria Concluída";
  }
  return ATIVIDADE_CONFIG[tipo].label;
}

export default function CalendarioTab({ calendario, onUpdate, onSemanasOKChange, streak, semanasOK, materiasConcurso }: Props) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [formTipo, setFormTipo] = useState<AtividadeTipo>("estudo");
  const [formGrupo, setFormGrupo] = useState<Grupo | null>(null);
  const [formMateria, setFormMateria] = useState<string>("");
  const [formTopico, setFormTopico] = useState<string>("");
  const [formDesc, setFormDesc] = useState("");
  const [formDuracaoStr, setFormDuracaoStr] = useState("50");
  const [formPaginasStr, setFormPaginasStr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setViewDate(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const openModal = (key: string) => {
    setSelectedDay(key);
    setFormTipo("estudo");
    setFormGrupo(null);
    setFormMateria("");
    setFormTopico("");
    setFormDesc("");
    setFormDuracaoStr("50");
    setFormPaginasStr("");
    setEditingId(null);
    setModalOpen(true);
  };

  const startEdit = (a: AtividadeCalendario) => {
    setFormTipo(a.tipo);
    setFormGrupo(a.grupo ?? null);
    setFormMateria(a.materia ?? "");
    setFormTopico(a.topico ?? "");
    setFormDesc(a.descricao);
    setFormDuracaoStr(String(a.duracao));
    setFormPaginasStr(a.paginas ? String(a.paginas) : "");
    setEditingId(a.id);
  };

  const handleTipoChange = useCallback((tipo: AtividadeTipo) => {
    setFormTipo(tipo);
    setFormGrupo(null);
    setFormMateria("");
    setFormTopico("");
  }, []);

  const resetForm = () => {
    setFormDesc("");
    setFormDuracaoStr("50");
    setFormPaginasStr("");
    setFormGrupo(null);
    setFormMateria("");
    setFormTopico("");
    setEditingId(null);
  };

  const addAtividade = () => {
    if (!selectedDay) return;
    if (formTipo === "materia_concluida" && !formMateria) return;
    const duracao = Math.max(1, parseInt(formDuracaoStr) || 1);
    const paginas = parseInt(formPaginasStr) || 0;
    const autoDesc = buildAutoDesc(formTipo, formGrupo, formMateria, formTopico);
    const campos = {
      tipo: formTipo,
      descricao: formDesc.trim() || autoDesc,
      duracao,
      ...(formGrupo ? { grupo: formGrupo } : {}),
      ...(formMateria ? { materia: formMateria } : {}),
      ...(formTopico ? { topico: formTopico } : {}),
      // undefined LIMPA o campo ao editar (some no persist); os consumidores usam (paginas ?? 0)
      paginas: paginas > 0 ? paginas : undefined,
    };

    const prev = calendario[selectedDay] ?? [];
    if (editingId) {
      onUpdate({
        ...calendario,
        [selectedDay]: prev.map((a) => a.id === editingId ? { ...a, ...campos } : a),
      });
    } else {
      const nova: AtividadeCalendario = { id: Date.now().toString(), ...campos };
      onUpdate({ ...calendario, [selectedDay]: [...prev, nova] });
    }
    resetForm();
    setModalOpen(false);
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

  // Derived for form
  const showGrupo = formTipo === "questoes" || formTipo === "bateria";
  const showMateria = formTipo === "estudo" || formTipo === "questoes" || formTipo === "bateria" || formTipo === "materia_concluida";
  const showTopico = (formTipo === "estudo" || formTipo === "questoes" || formTipo === "bateria") && !!formMateria;
  const topicosMateria = materiasAtivas.find((m) => m.nome === formMateria)?.topicos ?? [];
  const autoDescPreview = buildAutoDesc(formTipo, formGrupo, formMateria, formTopico);
  const canAdd = formTipo !== "materia_concluida" || !!formMateria;

  return (
    <div className="space-y-4">
      {/* Stats do mês */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/10 dark:bg-primary/30 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-primary dark:text-primary">{Math.round(totalMinMonth / 60)}h</div>
          <div className="text-xs text-primary dark:text-primary">Estudadas no mês</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{diasComAtividade}</div>
          <div className="text-xs text-emerald-500 dark:text-emerald-400">Dias com atividade</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-amber-700 dark:text-amber-300">
            <Flame className="h-5 w-5 text-orange-500" />{streak}
          </div>
          <div className="text-xs text-amber-500 dark:text-amber-400">Semanas seguidas</div>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Navegação */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border">
          <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-accent text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">{MESES[month]} {year}</h3>
          <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-accent text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-border dark:border-border">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[88px] border-r border-b border-border/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dateKey(year, month, day);
            const atividades = calendario[key] ?? [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <button
                key={day}
                type="button"
                onClick={() => openModal(key)}
                className={`min-h-[88px] border-r border-b border-border/50 p-1.5 text-left hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors align-top ${isToday ? "bg-primary/10 dark:bg-primary/20" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary dark:text-primary" : "text-foreground"}`}>
                  {isToday
                    ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs">{day}</span>
                    : day}
                </div>
                {atividades.length > 0 && (
                  <div className="space-y-0.5 mt-0.5">
                    {atividades.slice(0, 3).map((a) => {
                      const Icon = ATIVIDADE_CONFIG[a.tipo].icone;
                      return (
                        <div key={a.id} className={`flex items-center gap-1 rounded px-1 py-0.5 min-w-0 ${CAL_COR[a.tipo]}`}>
                          <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="text-[10px] leading-tight truncate">
                            {a.descricao.length > 11 ? a.descricao.slice(0, 11) + "…" : a.descricao}
                          </span>
                        </div>
                      );
                    })}
                    {atividades.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{atividades.length - 3}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="px-4 py-2.5 border-t border-border dark:border-border flex flex-wrap gap-3">
          {(Object.entries(ATIVIDADE_CONFIG) as [AtividadeTipo, typeof ATIVIDADE_CONFIG[AtividadeTipo]][]).map(([tipo, cfg]) => {
            const Icon = cfg.icone;
            return (
              <div key={tipo} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${cfg.corDot}`} />
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selectedDay && (
        <BottomSheetModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          titulo={selectedDay}
          icone={CalendarDays}
        >
          {/* Atividades existentes */}
          <div className="px-4 py-3 max-h-40 overflow-y-auto">
            {(calendario[selectedDay] ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">Sem atividades neste dia</p>
            ) : (
              <div className="space-y-1.5">
                {(calendario[selectedDay] ?? []).map((a) => {
                  const AtivIcon = ATIVIDADE_CONFIG[a.tipo].icone;
                  return (
                    <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${CAL_COR[a.tipo]} ${editingId === a.id ? "ring-2 ring-ring" : ""}`}>
                      <AtivIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{a.descricao}</div>
                        <div className="text-xs opacity-70">
                          {a.duracao} min
                          {(a.paginas ?? 0) > 0 &&
                            ` · ${a.paginas} pág (${((a.paginas ?? 0) / (a.duracao / 60)).toFixed(1)} pág/h)`}
                        </div>
                      </div>
                      <button type="button" onClick={() => startEdit(a)} className="p-0.5 hover:opacity-70 flex-shrink-0" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => { removeAtividade(selectedDay, a.id); if (editingId === a.id) resetForm(); }} className="p-0.5 hover:opacity-70 flex-shrink-0" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form nova / editar atividade */}
          <div className="px-4 pb-4 border-t border-border dark:border-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {editingId ? "Editar Atividade" : "Adicionar Atividade"}
              </div>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                  Cancelar edição
                </button>
              )}
            </div>

            {/* Tipo — grid 3 colunas */}
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(ATIVIDADE_CONFIG) as [AtividadeTipo, typeof ATIVIDADE_CONFIG[AtividadeTipo]][]).map(([tipo, cfg]) => {
                const BtnIcon = cfg.icone;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleTipoChange(tipo)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                      formTipo === tipo
                        ? `${CAL_COR[tipo]} border-current font-semibold`
                        : "border-border dark:border-border text-muted-foreground hover:border-primary/40 dark:hover:border-primary/40"
                    }`}
                  >
                    <BtnIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Seletor de Grupo (questões / bateria) */}
            {showGrupo && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Grupo <span className="text-muted-foreground">(opcional)</span></div>
                <div className="flex gap-2">
                  {GRUPOS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormGrupo(formGrupo === g ? null : g)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        formGrupo === g
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

            {/* Seletor de Matéria */}
            {showMateria && (
              <select
                value={formMateria}
                onChange={(e) => { setFormMateria(e.target.value); setFormTopico(""); }}
                className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-white dark:bg-muted text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  {formTipo === "materia_concluida" ? "Selecione a matéria *" : "Selecione a matéria (opcional)"}
                </option>
                {materiasAtivas.map((m) => (
                  <option key={m.nome} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            )}

            {/* Seletor de Tópico (questões / bateria + matéria selecionada) */}
            {showTopico && (
              <select
                value={formTopico}
                onChange={(e) => setFormTopico(e.target.value)}
                className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-white dark:bg-muted text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o tópico (opcional)</option>
                {topicosMateria.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {/* Preview da descrição */}
            <div className={`text-xs px-3 py-2 rounded-lg ${CAL_COR[formTipo]}`}>
              <span className="opacity-60">Descrição: </span>
              <span className="font-medium">{formDesc.trim() || autoDescPreview}</span>
            </div>

            {/* Descrição customizada (opcional, exceto matéria concluída) */}
            {formTipo !== "materia_concluida" && (
              <input
                type="text"
                placeholder="Descrição personalizada (opcional)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAdd && addAtividade()}
                className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-white dark:bg-muted text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {/* Duração + páginas + botão */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Duração (min):</label>
              <input
                type="text"
                inputMode="numeric"
                value={formDuracaoStr}
                onChange={(e) => setFormDuracaoStr(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => e.target.select()}
                className="w-16 text-sm border border-border dark:border-border rounded-lg px-2 py-1.5 bg-white dark:bg-muted text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-center"
              />
              <label className="text-xs text-muted-foreground whitespace-nowrap">Páginas:</label>
              <input
                type="text"
                inputMode="numeric"
                value={formPaginasStr}
                onChange={(e) => setFormPaginasStr(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => e.target.select()}
                placeholder="—"
                title="Páginas lidas (opcional) — alimenta o KPI de páginas por hora"
                className="w-16 text-sm border border-border dark:border-border rounded-lg px-2 py-1.5 bg-white dark:bg-muted text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-center"
              />
              <button
                type="button"
                onClick={addAtividade}
                disabled={!canAdd}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingId ? <><Pencil className="h-3.5 w-3.5" /> Salvar</> : <><Plus className="h-3.5 w-3.5" /> Adicionar</>}
              </button>
            </div>
            {parseInt(formPaginasStr) > 0 && parseInt(formDuracaoStr) > 0 && (
              <p className="text-[11px] text-primary text-right font-medium">
                📖 {(parseInt(formPaginasStr) / (parseInt(formDuracaoStr) / 60)).toFixed(1)} pág/h
              </p>
            )}
          </div>
        </BottomSheetModal>
      )}
    </div>
  );
}
