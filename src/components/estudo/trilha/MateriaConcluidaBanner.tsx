"use client";

import { useEffect, useState } from "react";
import { PartyPopper, X, PlusCircle } from "lucide-react";
import { materiasConcluidasNaTrilha } from "@/lib/trilha-generator";
import type { EstudoConfigCiclo, MateriaConcurso, MateriaDef, TrilhaEstudo } from "@/lib/estudo-data";

// Banner comemorativo: quando uma matéria fica 100% concluída na Trilha (todas as atividades de
// todas as metas com status "concluida"), ela vira "só revisão" — as revisões espaçadas já
// agendadas continuam rodando normalmente, mas a trilha para de gerar teoria nova pra ela (ver
// materiasConcluidas em gerarTrilha). Este banner avisa e deixa o usuário escolher uma matéria
// do edital, ainda fora do Ciclo, pra entrar no lugar — o "ciclo mutável" pedido.

const CHAVE_DISMISS = "taxhub_trilha_banner_dismiss";

function carregarDispensadas(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE_DISMISS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function salvarDispensadas(s: Set<string>) {
  try {
    localStorage.setItem(CHAVE_DISMISS, JSON.stringify([...s]));
  } catch {
    // localStorage indisponível — o banner só volta a aparecer na próxima sessão, sem quebrar nada
  }
}

interface Props {
  trilha: TrilhaEstudo;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  configCiclo: EstudoConfigCiclo;
  onUpdateConfigCiclo: (c: EstudoConfigCiclo) => void;
}

export default function MateriaConcluidaBanner({ trilha, materiasAtivas, configCiclo, onUpdateConfigCiclo }: Props) {
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set());
  useEffect(() => setDispensadas(carregarDispensadas()), []);

  const graduadas = materiasConcluidasNaTrilha(trilha).filter((m) => !dispensadas.has(m));
  if (graduadas.length === 0) return null;

  const candidatas = materiasAtivas.filter((m) => !(configCiclo.materias[m.nome]?.incluir ?? false));

  const dispensar = (nome: string) => {
    const nova = new Set(dispensadas);
    nova.add(nome);
    setDispensadas(nova);
    salvarDispensadas(nova);
  };

  return (
    <div className="space-y-2.5">
      {graduadas.map((nome) => (
        <CardGraduada
          key={nome}
          nome={nome}
          candidatas={candidatas}
          configCiclo={configCiclo}
          onUpdateConfigCiclo={onUpdateConfigCiclo}
          onDispensar={() => dispensar(nome)}
        />
      ))}
    </div>
  );
}

function CardGraduada({
  nome, candidatas, configCiclo, onUpdateConfigCiclo, onDispensar,
}: {
  nome: string;
  candidatas: (MateriaDef | MateriaConcurso)[];
  configCiclo: EstudoConfigCiclo;
  onUpdateConfigCiclo: (c: EstudoConfigCiclo) => void;
  onDispensar: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const toggle = (materiaNome: string) => {
    setSelecionadas((prev) => {
      const nova = new Set(prev);
      if (nova.has(materiaNome)) nova.delete(materiaNome);
      else nova.add(materiaNome);
      return nova;
    });
  };

  const adicionar = () => {
    if (selecionadas.size === 0) return;
    const materias = { ...configCiclo.materias };
    for (const m of candidatas) {
      if (!selecionadas.has(m.nome)) continue;
      const def = "pesoDefault" in m ? (m as MateriaDef) : undefined;
      materias[m.nome] = {
        incluir: true,
        peso: def?.pesoDefault ?? 1,
        prioridade: def?.prioridadeDefault ?? "Baixa",
        divisao: def?.divisaoDefault ?? "A",
      };
    }
    onUpdateConfigCiclo({ ...configCiclo, materias });
    onDispensar(); // já resolveu — some o banner dessa matéria
  };

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 relative">
      <button
        type="button"
        onClick={onDispensar}
        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center text-emerald-500/60 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        title="Dispensar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2.5 pr-6">
        <PartyPopper className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Você concluiu {nome}! 🎉
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 mt-0.5">
            Ela agora entra só em revisões espaçadas — sem teoria nova.
            {candidatas.length > 0 && " Escolha uma nova matéria pra incluir no ciclo no lugar:"}
          </p>
        </div>
      </div>

      {candidatas.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {candidatas.map((m) => {
              const sel = selecionadas.has(m.nome);
              return (
                <button
                  key={m.nome}
                  type="button"
                  onClick={() => toggle(m.nome)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    sel
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400"
                  }`}
                >
                  {m.nome}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={selecionadas.size === 0}
            onClick={adicionar}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Adicionar ao Ciclo
          </button>
        </div>
      )}
    </div>
  );
}
