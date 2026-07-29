"use client";

import { useState } from "react";
import {
  MATERIAS, topicoKey, dateKeyLocal, defaultTopicoState,
  type TopicoState, type MateriaConcurso,
} from "@/lib/estudo-data";
import { statusRevisaoLink, DIAS_REVISAO_LINK, type StatusRevisaoLink } from "@/lib/trilha-dinamica";
import { resolverCorMateria } from "./trilha/trilha-ui";
import { ChevronDown, ChevronRight, ExternalLink, Search, Link2 } from "lucide-react";

interface Props {
  topicos: Record<string, TopicoState>;
  onUpdate: (topicos: Record<string, TopicoState>) => void;
  materiasConcurso?: MateriaConcurso[]; // se passado, usa em vez de MATERIAS hardcoded
}

// Badge de status da revisão do link — mesmo motor da Trilha (statusRevisaoLink), só pra dar
// contexto de quando o link cadastrado aqui vai virar uma tarefa de verdade.
function StatusBadge({ status }: { status: StatusRevisaoLink }) {
  switch (status.tipo) {
    case "sem_link":
      return null;
    case "aguardando_grupos":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          conclua os 4 grupos A-D no Edital
        </span>
      );
    case "aguardando_prazo":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
          revisão libera em {status.diasRestantes} dia{status.diasRestantes !== 1 ? "s" : ""}
        </span>
      );
    case "disponivel":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          revisão disponível na Trilha
        </span>
      );
    case "feita":
      return (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            status.reforco
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          {status.perc}% acerto{status.reforco ? " · reforçar" : ""}
        </span>
      );
  }
}

export default function QuestoesTab({ topicos, onUpdate, materiasConcurso }: Props) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const hoje = dateKeyLocal();

  const toggleExpand = (nome: string) => {
    setExpandidos((prev) => ({ ...prev, [nome]: !prev[nome] }));
  };

  const updateLink = (materia: string, topico: string, link: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key] ?? defaultTopicoState();
    onUpdate({ ...topicos, [key]: { ...estado, linkQuestoes: link.trim() || undefined } });
  };

  const materiasFiltradas = materiasAtivas.map((m) => ({
    ...m,
    topicos: m.topicos.filter((t) =>
      busca === "" ||
      t.toLowerCase().includes(busca.toLowerCase()) ||
      m.nome.toLowerCase().includes(busca.toLowerCase())
    ),
  })).filter((m) => busca === "" || m.topicos.length > 0);

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

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
        <Link2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Cadastre o link das questões de cada tópico (ex.: TecConcursos) — um só por tópico.
          Depois de concluir os 4 grupos A-D dele no Edital, a Trilha avisa pra fazer essas
          questões {DIAS_REVISAO_LINK} dias depois.
        </span>
      </div>

      {/* Matérias */}
      <div className="space-y-2">
        {materiasFiltradas.map((m) => {
          const cor = resolverCorMateria(m.nome, materiasAtivas);
          const aberto = expandidos[m.nome] ?? false;
          const comLink = m.topicos.filter((t) => !!topicos[topicoKey(m.nome, t)]?.linkQuestoes).length;

          return (
            <div key={m.nome} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpand(m.nome)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-l-4 ${cor.border} hover:bg-accent transition-colors`}
              >
                <span className="text-muted-foreground flex-shrink-0">
                  {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="font-semibold text-sm flex-1 text-left text-foreground">{m.nome}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {comLink}/{m.topicos.length} com link
                </span>
              </button>

              {aberto && (
                <div className="divide-y divide-border">
                  {m.topicos.map((t) => {
                    const key = topicoKey(m.nome, t);
                    const estado = topicos[key];
                    const status = statusRevisaoLink(estado, hoje);
                    return (
                      <div key={t} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-relaxed" title={t}>{t}</p>
                          {status.tipo !== "sem_link" && (
                            <div className="mt-1"><StatusBadge status={status} /></div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-72">
                          <input
                            type="text"
                            value={estado?.linkQuestoes ?? ""}
                            onChange={(e) => updateLink(m.nome, t, e.target.value)}
                            placeholder="Link das questões (ex.: TecConcursos)"
                            className="flex-1 min-w-0 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          {estado?.linkQuestoes && (
                            <a
                              href={estado.linkQuestoes}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir link"
                              className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
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
    </div>
  );
}
