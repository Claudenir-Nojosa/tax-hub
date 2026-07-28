"use client";

import { useState, useCallback } from "react";
import {
  MATERIAS,
  calcularPerc,
  calcularMedia,
  topicoKey,
  dateKeyLocal,
  defaultTopicoState,
  GRUPO_BADGE,
  GRUPO_TEXT,
  type TopicoState,
  type Grupo,
  type MateriaConcurso,
  type PdfEstudo,
} from "@/lib/estudo-data";
import { resolverCorMateria } from "./trilha/trilha-ui";
import { alvoLeituraPdf } from "./biblioteca/biblioteca-utils";
import { ChevronDown, ChevronRight, Search, CheckSquare, Square, BookOpen, EyeOff, RotateCcw, Trash2, Link2, Plus, ArrowUp, ArrowDown } from "lucide-react";

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
  // cria um tópico novo na matéria (concurso.materias) — sem prop, o campo de adicionar some
  // (mesmo caso de sem concurso ativo)
  onAddTopico?: (materia: string, topico: string) => void;
  // troca a posição do tópico com o vizinho acima/abaixo (concurso.materias) — sem prop, as
  // setas de reordenar somem
  onMoveTopico?: (materia: string, topico: string, direcao: "up" | "down") => void;
  // cria uma matéria nova (concurso.materias) — sem prop, o campo de adicionar matéria some
  // (mesmo caso de sem concurso ativo)
  onAddMateria?: (nome: string) => void;
}

// % de leitura dos PDFs da Biblioteca que cobrem este tópico (média ponderada pelo total de
// páginas de cada PDF); null quando nenhum PDF cobre o tópico — aí o chip nem renderiza
function percLeituraTopico(pdfs: PdfEstudo[], materia: string, topico: string): number | null {
  const cobrem = pdfs.filter((p) => p.materia === materia && p.topicos?.includes(topico));
  if (cobrem.length === 0) return null;
  const total = cobrem.reduce((s, p) => s + alvoLeituraPdf(p), 0);
  if (total === 0) return null;
  const lidas = cobrem.reduce((s, p) => s + Math.min(p.paginaAtual, alvoLeituraPdf(p)), 0);
  return Math.round((lidas / total) * 100);
}

function CadernoInput({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
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
      className={
        compact
          ? "w-10 text-center text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring py-0.5 px-0.5"
          : "h-9 w-9 text-center text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      }
    />
  );
}

// Ícone de link das questões de um grupo (ex.: TecConcursos) — clique abre direto se já tiver
// link cadastrado; sem link, ou com botão direito, abre o prompt de cadastro/edição.
function LinkGrupoButton({ link, onEditar }: { link?: string; onEditar: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (link) window.open(link, "_blank", "noopener,noreferrer");
        else onEditar();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onEditar();
      }}
      title={link ? `Abrir questões: ${link}\n(botão direito pra editar/remover)` : "Cadastrar link das questões (ex.: TecConcursos)"}
      className={`flex-shrink-0 transition-colors ${link ? "text-primary hover:text-primary/70" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
    >
      <Link2 className="h-3 w-3" />
    </button>
  );
}

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

export default function EditalTab({ topicos, onUpdate, materiasConcurso, pdfs = [], topicosExcluidos = [], onToggleTopicoExcluido, onDeleteTopico, onAddTopico, onMoveTopico, onAddMateria }: Props) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  // texto do campo "Adicionar tópico" de cada matéria, indexado pelo nome dela
  const [novoTopico, setNovoTopico] = useState<Record<string, string>>({});
  const [novaMateria, setNovaMateria] = useState("");

  const toggleExpand = (nome: string) => {
    setExpandidos((prev) => ({ ...prev, [nome]: !prev[nome] }));
  };

  const updateTopico = useCallback(
    (materia: string, topico: string, fn: (prev: TopicoState) => TopicoState) => {
      const key = topicoKey(materia, topico);
      // tópico recém-criado (concurso/matéria novos) ainda não tem entrada em `topicos` — sem o
      // fallback, mexer nele pela primeira vez quebrava com "Cannot read properties of undefined"
      const prev = topicos[key] ?? defaultTopicoState();
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

  // link externo por grupo (ex.: lista de questões no TecConcursos) — clique no ícone abre
  // direto se já tiver link; botão direito sempre abre este prompt pra cadastrar/editar/remover
  // (deixar em branco remove).
  const editarLinkCaderno = (materia: string, topico: string, grupo: Grupo, atual?: string) => {
    const novo = prompt(`Link das questões do Grupo ${grupo} (ex.: TecConcursos)`, atual ?? "");
    if (novo === null) return; // cancelado
    updateTopico(materia, topico, (prev) => ({
      ...prev,
      cadernos: { ...prev.cadernos, [grupo]: { ...prev.cadernos[grupo], link: novo.trim() || undefined } },
    }));
  };

  const adicionarMateria = () => {
    const texto = novaMateria.trim();
    if (!texto || !onAddMateria) return;
    onAddMateria(texto);
    setNovaMateria("");
    // já abre a matéria recém-criada — sem isso, o usuário adiciona a matéria e não vê onde
    // ela foi parar até clicar pra expandir manualmente
    setExpandidos((prev) => ({ ...prev, [texto]: true }));
  };

  const adicionarTopico = (materia: string) => {
    const texto = novoTopico[materia]?.trim();
    if (!texto || !onAddTopico) return;
    onAddTopico(materia, texto);
    setNovoTopico((prev) => ({ ...prev, [materia]: "" }));
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
      updated[key] = { ...(updated[key] ?? defaultTopicoState()), estudado };
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
  })).filter((m) => busca === "" || m.topicos.length > 0);
  // ^ sem busca, mostra a matéria mesmo com 0 tópicos (matéria recém-criada via "Adicionar
  // matéria", que nasce sem tópico nenhum) — senão ela some da lista e o usuário não acha onde
  // adicionar o primeiro tópico dela. Com busca ativa, mantém o comportamento de só mostrar
  // quem bateu o filtro.

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
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${GRUPO_BADGE[g]}`}>
              Grupo {g}
            </span>
            <span className="text-muted-foreground text-xs">Acertos / Erros</span>
          </div>
        ))}
        <div className="w-12 text-center">Média</div>
        <div className="w-28" />
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
          const corMateria = resolverCorMateria(m.nome, materiasAtivas);

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
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-l-4 ${corMateria.border} hover:bg-accent transition-colors cursor-pointer`}
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

              {/* Adicionar tópico — só aparece com concurso ativo (onAddTopico vem de lá) */}
              {isOpen && onAddTopico && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
                  <input
                    type="text"
                    value={novoTopico[m.nome] ?? ""}
                    onChange={(e) => setNovoTopico((prev) => ({ ...prev, [m.nome]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && adicionarTopico(m.nome)}
                    placeholder="Adicionar tópico..."
                    className="flex-1 text-xs border border-border rounded-lg px-3 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => adicionarTopico(m.nome)}
                    title="Adicionar tópico"
                    className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Tópicos */}
              {isOpen && (
                <div className="divide-y divide-border">
                  {m.topicos.map((t, idx) => {
                    const key = topicoKey(m.nome, t);
                    // tópico recém-criado (concurso/matéria novos) ainda não tem entrada aqui —
                    // sem o fallback, expandir a matéria quebrava com "Cannot read properties of
                    // undefined" na hora
                    const estado = topicos[key] ?? defaultTopicoState();
                    const media = calcularMedia(estado.cadernos);
                    const percPdf = percLeituraTopico(pdfs, m.nome, t);
                    const excluido = topicosExcluidos.includes(key);
                    const rowBg = excluido ? "opacity-50" : estado.estudado ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "";

                    const nomeETopico = (
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
                    );

                    const acoes = (onToggleTopicoExcluido || onDeleteTopico || onMoveTopico) && (
                      <>
                        {onMoveTopico && (
                          <>
                            <button
                              type="button"
                              onClick={() => onMoveTopico(m.nome, t, "up")}
                              disabled={idx === 0}
                              title="Mover pra cima"
                              className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveTopico(m.nome, t, "down")}
                              disabled={idx === m.topicos.length - 1}
                              title="Mover pra baixo"
                              className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
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
                      </>
                    );

                    const mediaBadge = (
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
                    );

                    return (
                      <div key={t} className={`transition-colors ${rowBg}`}>
                        {/* ── Linha única (≥sm): igual à densidade original, só reskinada ── */}
                        <div className="hidden sm:flex sm:items-center gap-2 px-4 py-2.5 hover:bg-accent">
                          <span className="text-xs text-muted-foreground w-6 flex-shrink-0 text-right">{idx + 1}</span>
                          <div className="flex-1 min-w-0">{nomeETopico}</div>
                          <div className="flex w-20 justify-center items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleEstudado(m.nome, t)}
                              className={`flex-shrink-0 transition-colors ${
                                estado.estudado ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                              }`}
                            >
                              {estado.estudado ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(["A", "B", "C", "D"] as Grupo[]).map((g) => {
                              const cad = estado.cadernos[g];
                              return (
                                <div key={g} className="flex items-center gap-1">
                                  <span className={`text-xs ${GRUPO_TEXT[g]} w-4 flex-shrink-0 text-center`}>{g}</span>
                                  <LinkGrupoButton link={cad.link} onEditar={() => editarLinkCaderno(m.nome, t, g, cad.link)} />
                                  <CadernoInput compact value={cad.acertos} onChange={(v) => updateCaderno(m.nome, t, g, "acertos", v)} />
                                  <span className="text-muted-foreground text-xs">/</span>
                                  <CadernoInput compact value={cad.erros} onChange={(v) => updateCaderno(m.nome, t, g, "erros", v)} />
                                </div>
                              );
                            })}
                          </div>
                          <div className="w-12 text-center">{mediaBadge}</div>
                          {acoes && <div className="flex w-28 items-center gap-0.5 justify-center">{acoes}</div>}
                        </div>

                        {/* ── Cartão em duas camadas (<sm) — toques maiores, sem cramming ── */}
                        <div className="sm:hidden px-4 py-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">{nomeETopico}</div>
                            {acoes && <div className="flex items-center gap-0.5 flex-shrink-0">{acoes}</div>}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleEstudado(m.nome, t)}
                              className={`min-h-9 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium transition-colors flex-shrink-0 ${
                                estado.estudado
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {estado.estudado ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              Estudado
                            </button>
                            <span className="text-xs text-muted-foreground">Média {mediaBadge}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {(["A", "B", "C", "D"] as Grupo[]).map((g) => {
                              const cad = estado.cadernos[g];
                              return (
                                <div key={g} className="flex items-center gap-1.5">
                                  <span className={`text-xs ${GRUPO_TEXT[g]} w-3.5 flex-shrink-0 text-center`}>{g}</span>
                                  <LinkGrupoButton link={cad.link} onEditar={() => editarLinkCaderno(m.nome, t, g, cad.link)} />
                                  <CadernoInput value={cad.acertos} onChange={(v) => updateCaderno(m.nome, t, g, "acertos", v)} />
                                  <span className="text-muted-foreground text-xs">/</span>
                                  <CadernoInput value={cad.erros} onChange={(v) => updateCaderno(m.nome, t, g, "erros", v)} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
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

      {/* Adicionar matéria — fica fora da lista filtrada, sempre visível independente da busca */}
      {onAddMateria && (
        <div className="flex items-center gap-2 bg-card rounded-xl border border-dashed border-border p-3">
          <input
            type="text"
            value={novaMateria}
            onChange={(e) => setNovaMateria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionarMateria()}
            placeholder="Nome da nova matéria..."
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={adicionarMateria}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar matéria
          </button>
        </div>
      )}
    </div>
  );
}
