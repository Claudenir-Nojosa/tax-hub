"use client";

import { useState } from "react";
import {
  MATERIAS, topicoKey, dateKeyLocal, defaultTopicoState,
  type TopicoState, type MateriaConcurso, type ChecklistRevisaoLink, type EstudoConfigCiclo,
} from "@/lib/estudo-data";
import { statusRevisaoLink, CHECKPOINTS_REVISAO_LINK, DIAS_REVISAO_MATERIA, type StatusRevisaoLink } from "@/lib/trilha-dinamica";
import { resolverCorMateria } from "./trilha/trilha-ui";
import { ChevronDown, ChevronRight, ExternalLink, Search, Link2, Trophy } from "lucide-react";

interface Props {
  topicos: Record<string, TopicoState>;
  onUpdate: (topicos: Record<string, TopicoState>) => void;
  configCiclo: EstudoConfigCiclo;
  onUpdateConfigCiclo: (config: EstudoConfigCiclo) => void;
  materiasConcurso?: MateriaConcurso[]; // se passado, usa em vez de MATERIAS hardcoded
}

// Badge de status de UM checkpoint da revisão do link — mesmo motor da Trilha
// (statusRevisaoLink), só pra dar contexto de quando o link cadastrado aqui vira tarefa de
// verdade. `label` prefixa o texto (ex.: "7d") pra distinguir os dois checkpoints lado a lado.
function StatusBadge({ label, status }: { label?: string; status: StatusRevisaoLink }) {
  const prefixo = label ? `${label}: ` : "";
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
          {prefixo}libera em {status.diasRestantes} dia{status.diasRestantes !== 1 ? "s" : ""}
        </span>
      );
    case "disponivel":
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          {prefixo}disponível na Trilha
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
          {prefixo}{status.perc}%{status.reforco ? " · reforçar" : ""}
        </span>
      );
  }
}

// Input de link com botão de abrir — reaproveitado pros 3 tipos de link (7d/30d por tópico e o
// da revisão de matéria).
function LinkInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir link"
          className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export default function QuestoesTab({ topicos, onUpdate, configCiclo, onUpdateConfigCiclo, materiasConcurso }: Props) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const hoje = dateKeyLocal();

  const toggleExpand = (nome: string) => {
    setExpandidos((prev) => ({ ...prev, [nome]: !prev[nome] }));
  };

  const updateLinkTopico = (materia: string, topico: string, checkpoint: ChecklistRevisaoLink, link: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key] ?? defaultTopicoState();
    const campo = checkpoint === "d7" ? "linkRevisao7d" : "linkRevisao30d";
    onUpdate({ ...topicos, [key]: { ...estado, [campo]: link.trim() || undefined } });
  };

  const updateLinkMateria = (materia: string, link: string) => {
    const cfg = configCiclo.materias[materia] ?? { incluir: true, peso: 1 as const, prioridade: "Baixa" as const, divisao: "A" as const };
    onUpdateConfigCiclo({
      ...configCiclo,
      materias: { ...configCiclo.materias, [materia]: { ...cfg, linkRevisaoMateria: link.trim() || undefined } },
    });
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
          Cadastre o link do caderno de questões de cada tópico (ex.: TecConcursos) — um pra
          revisão de {CHECKPOINTS_REVISAO_LINK[0].dias} dias e outro pra de {CHECKPOINTS_REVISAO_LINK[1].dias} dias, contados a
          partir de quando os 4 grupos A-D dele ficam completos no Edital. Cada matéria também
          tem um link próprio pra revisão de 30 questões, que libera {DIAS_REVISAO_MATERIA} dias
          depois dela bater 100%. Clicando na atividade na Trilha, o link abre direto.
        </span>
      </div>

      {/* Matérias */}
      <div className="space-y-2">
        {materiasFiltradas.map((m) => {
          const cor = resolverCorMateria(m.nome, materiasAtivas);
          const aberto = expandidos[m.nome] ?? false;
          const comLink = m.topicos.filter((t) => {
            const estado = topicos[topicoKey(m.nome, t)];
            return !!estado?.linkRevisao7d || !!estado?.linkRevisao30d;
          }).length;

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
                  {/* link da revisão de 30 questões — é por MATÉRIA, não por tópico */}
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 bg-amber-50/50 dark:bg-amber-950/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /> Revisão da matéria (30 questões)
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Libera {DIAS_REVISAO_MATERIA} dias depois da matéria bater 100%
                      </p>
                    </div>
                    <div className="w-full sm:w-80 flex-shrink-0">
                      <LinkInput
                        value={configCiclo.materias[m.nome]?.linkRevisaoMateria ?? ""}
                        onChange={(v) => updateLinkMateria(m.nome, v)}
                        placeholder="Link da revisão de 30 questões"
                      />
                    </div>
                  </div>

                  {m.topicos.map((t) => {
                    const key = topicoKey(m.nome, t);
                    const estado = topicos[key];
                    const status7 = statusRevisaoLink(estado, hoje, "d7");
                    const status30 = statusRevisaoLink(estado, hoje, "d30");
                    return (
                      <div key={t} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-relaxed" title={t}>{t}</p>
                          {(status7.tipo !== "sem_link" || status30.tipo !== "sem_link") && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {status7.tipo === "aguardando_grupos" || status30.tipo === "aguardando_grupos" ? (
                                <StatusBadge status={{ tipo: "aguardando_grupos" }} />
                              ) : (
                                <>
                                  <StatusBadge label="7d" status={status7} />
                                  <StatusBadge label="30d" status={status30} />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0 w-full sm:w-80">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">7d</span>
                            <LinkInput
                              value={estado?.linkRevisao7d ?? ""}
                              onChange={(v) => updateLinkTopico(m.nome, t, "d7", v)}
                              placeholder="Link da revisão de 7 dias"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">30d</span>
                            <LinkInput
                              value={estado?.linkRevisao30d ?? ""}
                              onChange={(v) => updateLinkTopico(m.nome, t, "d30", v)}
                              placeholder="Link da revisão de 30 dias"
                            />
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
    </div>
  );
}
