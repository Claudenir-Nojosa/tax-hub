"use client";

import { useState, useCallback } from "react";
import {
  MATERIAS,
  calcularPerc,
  calcularMedia,
  topicoKey,
  dateKeyLocal,
  type TopicoState,
  type Grupo,
  type MateriaConcurso,
  type PdfEstudo,
} from "@/lib/estudo-data";
import { ChevronDown, ChevronRight, Search, CheckSquare, Square, BookOpen, EyeOff, RotateCcw, Trash2 } from "lucide-react";

interface Props {
  topicos: Record<string, TopicoState>;
  onUpdate: (topicos: Record<string, TopicoState>) => void;
  materiasConcurso?: MateriaConcurso[]; // se passado, usa em vez de MATERIAS hardcoded
  pdfs?: PdfEstudo[]; // Biblioteca: mostra % lido dos PDFs que cobrem cada tópico (opcional)
  // ocultar é reversível: some do Ciclo/Trilha/cálculos em todo o resto do app, mas o Edital
  // continua mostrando o tópico (esmaecido) pra dar a opção de reativar; progresso intacto
  topicosExcluidos?: string[];
  onToggleTopicoExcluido?: (materia: string, topico: string) => void;
  // excluir é DEFINITIVO: remove o tópico da matéria (concurso.materias) e apaga o progresso
  // dele — sem prop, o botão de lixeira não aparece (ex.: sem concurso ativo ainda carregado)
  onDeleteTopico?: (materia: string, topico: string) => void;
}

// % de leitura dos PDFs da Biblioteca que cobrem este tópico (média ponderada pelo total de
// páginas de cada PDF); null quando nenhum PDF cobre o tópico — aí o chip nem renderiza
function percLeituraTopico(pdfs: PdfEstudo[], materia: string, topico: string): number | null {
  const cobrem = pdfs.filter((p) => p.materia === materia && p.topicos?.includes(topico));
  if (cobrem.length === 0) return null;
  const total = cobrem.reduce((s, p) => s + p.totalPaginas, 0);
  if (total === 0) return null;
  const lidas = cobrem.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
  return Math.round((lidas / total) * 100);
}

function CadernoInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => {
        const v = parseInt(e.target.value) || 0;
        onChange(Math.max(0, v));
      }}
      className="w-10 text-center text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring py-0.5 px-0.5"
    />
  );
}

const GRUPO_COR: Record<Grupo, { badge: string; label: string }> = {
  A: { badge: "bg-primary/10 text-primary dark:bg-primary/60 dark:text-primary",   label: "text-primary dark:text-primary font-bold" },
  B: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300", label: "text-emerald-600 dark:text-emerald-400 font-bold" },
  C: { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",   label: "text-violet-600 dark:text-violet-400 font-bold" },
  D: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",   label: "text-amber-600 dark:text-amber-400 font-bold" },
};

function PercBadge({ perc }: { perc: number }) {
  const cor =
    perc === 0
      ? "text-muted-foreground"
      : perc >= 70
      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
      : perc >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  return <span className={`text-xs ${cor}`}>{perc === 0 ? "—" : `${perc}%`}</span>;
}

const COR_BORDER: Record<string, string> = {
  sky: "border-l-sky-500", blue: "border-l-blue-500", emerald: "border-l-emerald-500",
  violet: "border-l-violet-500", rose: "border-l-rose-500", amber: "border-l-amber-500",
  teal: "border-l-teal-500", indigo: "border-l-indigo-500", pink: "border-l-pink-500",
  cyan: "border-l-cyan-500", lime: "border-l-lime-500", orange: "border-l-orange-500",
  purple: "border-l-purple-500", red: "border-l-red-500", green: "border-l-green-500",
  yellow: "border-l-yellow-500",
};

export default function EditalTab({ topicos, onUpdate, materiasConcurso, pdfs = [], topicosExcluidos = [], onToggleTopicoExcluido, onDeleteTopico }: Props) {
  const materiasAtivas = materiasConcurso
    ? materiasConcurso.map(m => ({ ...m, corBorder: COR_BORDER[m.cor] ?? "border-l-border" }))
    : MATERIAS;
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const toggleExpand = (nome: string) => {
    setExpandidos((prev) => ({ ...prev, [nome]: !prev[nome] }));
  };

  const updateTopico = useCallback(
    (materia: string, topico: string, fn: (prev: TopicoState) => TopicoState) => {
      const key = topicoKey(materia, topico);
      const prev = topicos[key];
      onUpdate({ ...topicos, [key]: fn(prev) });
    },
    [topicos, onUpdate]
  );

  const toggleEstudado = (materia: string, topico: string) => {
    updateTopico(materia, topico, (prev) => ({ ...prev, estudado: !prev.estudado }));
  };

  const updateCaderno = (materia: string, topico: string, grupo: Grupo, field: "acertos" | "erros", value: number) => {
    updateTopico(materia, topico, (prev) => ({
      ...prev,
      cadernos: {
        ...prev.cadernos,
        // atualizadoEm alimenta o cooldown de "reforço" da Trilha (trilha-dinamica.ts) — sem
        // isso, um grupo fraco corrigido aqui reapareceria na trilha até o próximo registro
        [grupo]: { ...prev.cadernos[grupo], [field]: value, atualizadoEm: dateKeyLocal() },
      },
    }));
  };

  const excluirTopico = (materia: string, topico: string) => {
    if (!onDeleteTopico) return;
    if (!confirm(`Excluir "${topico}" de ${materia} DEFINITIVAMENTE?\n\nDiferente de ocultar, isso apaga o progresso desse tópico (estudado, cadernos A-D) e não pode ser desfeito.`)) return;
    onDeleteTopico(materia, topico);
  };

  const marcarTodos = (materia: string, estudado: boolean) => {
    const m = materiasAtivas.find((m) => m.nome === materia);
    if (!m) return;
    const updated = { ...topicos };
    m.topicos.forEach((t) => {
      const key = topicoKey(materia, t);
      updated[key] = { ...updated[key], estudado };
    });
    onUpdate(updated);
  };

  const materiasFiltradas = materiasAtivas.map((m) => ({
    ...m,
    topicos: m.topicos.filter((t) =>
      busca === "" ||
      t.toLowerCase().includes(busca.toLowerCase()) ||
      m.nome.toLowerCase().includes(busca.toLowerCase())
    ),
  })).filter((m) => m.topicos.length > 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar tópico ou matéria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Header de colunas */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border text-xs text-muted-foreground font-medium">
        <div className="w-6" />
        <div className="flex-1">Tópico</div>
        <div className="w-20 text-center">Estudado</div>
        {(["A", "B", "C", "D"] as Grupo[]).map((g) => (
          <div key={g} className="w-28 text-center flex flex-col items-center gap-0.5">
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${GRUPO_COR[g].badge}`}>
              Grupo {g}
            </span>
            <span className="text-muted-foreground text-xs">Acertos / Erros</span>
          </div>
        ))}
        <div className="w-12 text-center">Média</div>
        <div className="w-16" />
      </div>

      {/* Matérias */}
      <div className="space-y-2">
        {materiasFiltradas.map((m) => {
          // % e contagem da matéria ignoram tópicos ocultos (excluídos) — só a lista expandida
          // abaixo mostra eles, esmaecidos, com opção de reativar
          const topicosAtivos = m.topicos.filter((t) => !topicosExcluidos.includes(topicoKey(m.nome, t)));
          const totalTopicos = topicosAtivos.length;
          const estudadoCount = topicosAtivos.filter((t) => topicos[topicoKey(m.nome, t)]?.estudado).length;
          const perc = totalTopicos > 0 ? Math.round((estudadoCount / totalTopicos) * 100) : 0;
          const isOpen = expandidos[m.nome] ?? false;

          return (
            <div
              key={m.nome}
              className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
            >
              {/* Header da matéria — div (não button) porque contém os botões "Todos"/"Limpar" quando
                  aberto; <button> dentro de <button> é HTML inválido e causa erro de hidratação */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(m.nome)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(m.nome); }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-l-4 ${m.corBorder} hover:bg-accent transition-colors cursor-pointer`}
              >
                <span className="text-muted-foreground flex-shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="font-semibold text-sm flex-1 text-left text-foreground">{m.nome}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-1.5">
                      <div
                        className={`rounded-full h-1.5 transition-all ${perc === 100 ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {estudadoCount}/{totalTopicos}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => marcarTodos(m.nome, true)}
                        className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 hover:opacity-80"
                      >
                        ✓ Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarTodos(m.nome, false)}
                        className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:opacity-80"
                      >
                        ✗ Limpar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tópicos */}
              {isOpen && (
                <div className="divide-y divide-border">
                  {m.topicos.map((t, idx) => {
                    const key = topicoKey(m.nome, t);
                    const estado = topicos[key];
                    const media = calcularMedia(estado.cadernos);
                    const percPdf = percLeituraTopico(pdfs, m.nome, t);
                    const excluido = topicosExcluidos.includes(key);
                    return (
                      <div
                        key={t}
                        className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-2 px-4 py-2.5 hover:bg-accent transition-colors ${
                          excluido ? "opacity-50" : estado.estudado ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""
                        }`}
                      >
                        {/* Número */}
                        <span className="hidden md:block text-xs text-muted-foreground w-6 flex-shrink-0 text-right">
                          {idx + 1}
                        </span>

                        {/* Nome do tópico (+ % de leitura dos PDFs da Biblioteca que o cobrem) */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-relaxed">
                            {t}
                            {excluido && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full align-middle bg-muted text-muted-foreground">
                                <EyeOff className="h-2.5 w-2.5" /> Oculto
                              </span>
                            )}
                            {percPdf !== null && (
                              <span
                                title="Leitura dos PDFs da Biblioteca que cobrem este tópico"
                                className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full align-middle ${
                                  percPdf >= 100
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    : "bg-primary/10 text-primary dark:bg-primary/20"
                                }`}
                              >
                                <BookOpen className="h-2.5 w-2.5" /> {percPdf}%
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Estudado */}
                        <div className="flex md:w-20 md:justify-center items-center gap-2">
                          <span className="md:hidden text-xs text-muted-foreground">Estudado:</span>
                          <button
                            type="button"
                            onClick={() => toggleEstudado(m.nome, t)}
                            className={`flex-shrink-0 transition-colors ${
                              estado.estudado ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                            }`}
                          >
                            {estado.estudado ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {/* Cadernos A/B/C/D */}
                        <div className="flex flex-wrap gap-2 md:gap-1">
                          {(["A", "B", "C", "D"] as Grupo[]).map((g) => {
                            const cad = estado.cadernos[g];
                            return (
                              <div key={g} className="flex items-center gap-1">
                                <span className={`text-xs ${GRUPO_COR[g].label} w-4 flex-shrink-0 text-center`}>{g}</span>
                                <CadernoInput
                                  value={cad.acertos}
                                  onChange={(v) => updateCaderno(m.nome, t, g, "acertos", v)}
                                />
                                <span className="text-muted-foreground text-xs">/</span>
                                <CadernoInput
                                  value={cad.erros}
                                  onChange={(v) => updateCaderno(m.nome, t, g, "erros", v)}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Média */}
                        <div className="md:w-12 md:text-center">
                          <span
                            className={`text-xs font-semibold ${
                              media === 0
                                ? "text-muted-foreground"
                                : media >= 70
                                ? "text-emerald-600 dark:text-emerald-400"
                                : media >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {media === 0 ? "—" : `${media}%`}
                          </span>
                        </div>

                        {/* Ocultar/reativar (reversível) + excluir de vez (definitivo) */}
                        {(onToggleTopicoExcluido || onDeleteTopico) && (
                          <div className="flex md:w-16 items-center gap-1 md:justify-center">
                            {onToggleTopicoExcluido && (
                              <button
                                type="button"
                                onClick={() => onToggleTopicoExcluido(m.nome, t)}
                                title={excluido ? "Reativar tópico" : "Ocultar tópico (reversível, sem apagar o progresso)"}
                                className={`flex-shrink-0 p-1 rounded transition-colors ${
                                  excluido
                                    ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                }`}
                              >
                                {excluido ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {onDeleteTopico && (
                              <button
                                type="button"
                                onClick={() => excluirTopico(m.nome, t)}
                                title="Excluir tópico definitivamente (apaga o progresso, não dá pra desfazer)"
                                className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {materiasFiltradas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum tópico encontrado para &quot;{busca}&quot;
        </div>
      )}
    </div>
  );
}
