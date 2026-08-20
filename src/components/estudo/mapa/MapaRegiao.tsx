"use client";

import { useState } from "react";
import { Lock, Check } from "lucide-react";
import type { MateriaConcurso, MateriaDef, TopicoState } from "@/lib/estudo-data";
import { topicoKey } from "@/lib/estudo-data";
import { analisarMateria } from "@/lib/trilha-dinamica";
import { resolverCorMateria } from "../trilha/trilha-ui";
import { IconeCastelo, IconeTenda, IconeTorre } from "./mapa-icons";

type StatusCidade = "conquistada" | "atual" | "trancada";

// Mapa da região — os tópicos de UMA matéria como cidades num caminho, na ordem do edital, com o
// mesmo desbloqueio sequencial que a Trilha já usa: só o próximo tópico não estudado (topicoAtual)
// fica acessível, os de depois ficam trancados. Clicar numa cidade acessível expande um painel
// simples (nome + status) — sem link pra PDF/batalha ainda, de propósito (fase só de mapa).
export default function MapaRegiao({
  materia,
  materias,
  topicos,
  onVoltar,
}: {
  materia: MateriaConcurso | MateriaDef;
  materias: (MateriaConcurso | MateriaDef)[];
  topicos: Record<string, TopicoState>;
  onVoltar: () => void;
}) {
  const [cidadeAberta, setCidadeAberta] = useState<string | null>(null);
  const analise = analisarMateria(materia, topicos);
  const cor = resolverCorMateria(materia.nome, materias);

  return (
    <div className="rounded-2xl border border-amber-800/20 dark:border-amber-100/10 bg-amber-50/60 dark:bg-amber-950/10 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={onVoltar}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao mapa do mundo
        </button>
        <span className="text-[11px] font-mono text-muted-foreground">
          {analise.topicosEstudados}/{analise.totalTopicos} conquistadas
        </span>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-6">{materia.nome}</h3>

      <div className="relative max-w-md mx-auto">
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-amber-800/25 dark:border-amber-100/15" />
        <div className="space-y-3">
          {materia.topicos.map((topico) => {
            const estado = topicos[topicoKey(materia.nome, topico)];
            const status: StatusCidade = estado?.estudado
              ? "conquistada"
              : topico === analise.topicoAtual
              ? "atual"
              : "trancada";
            const acessivel = status !== "trancada";
            const aberta = cidadeAberta === topico;
            return (
              <div key={topico} className="relative pl-11">
                <div
                  className={`absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === "trancada" ? "bg-muted" : cor.dot
                  }`}
                >
                  {status === "conquistada" && <IconeCastelo className="h-5 w-5 text-white" />}
                  {status === "atual" && <IconeTorre className="h-5 w-5 text-white" />}
                  {status === "trancada" && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                {status === "conquistada" && (
                  <div className="absolute left-7 top-7 h-4 w-4 rounded-full bg-emerald-500 border-2 border-amber-50 dark:border-amber-950 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  disabled={!acessivel}
                  onClick={() => setCidadeAberta(aberta ? null : topico)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    status === "trancada"
                      ? "border-border/60 text-muted-foreground/60 cursor-default"
                      : "border-border hover:border-primary/40 hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <span className="text-sm">{topico}</span>
                  {status === "atual" && (
                    <span className="ml-2 text-[10px] font-semibold text-primary align-middle">você está aqui</span>
                  )}
                </button>
                {aberta && acessivel && (
                  <div className="mt-1.5 ml-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <IconeTenda className="h-3.5 w-3.5 flex-shrink-0" />
                    {status === "conquistada" ? "Cidade conquistada — tópico já estudado." : "Cidade acessível — próximo tópico a estudar."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
