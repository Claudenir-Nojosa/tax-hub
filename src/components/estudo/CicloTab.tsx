"use client";

import { Settings2, Clock, RotateCcw } from "lucide-react";
import { MATERIAS, type EstudoConfigCiclo, type ConfigMateria, type MateriaBase } from "@/lib/estudo-data";

interface Props {
  config: EstudoConfigCiclo;
  onChange: (config: EstudoConfigCiclo) => void;
  materiasConcurso?: MateriaBase[];
}

const DIAS = [
  { key: "segunda" as const, label: "Segunda" },
  { key: "terca" as const, label: "Terça" },
  { key: "quarta" as const, label: "Quarta" },
  { key: "quinta" as const, label: "Quinta" },
  { key: "sexta" as const, label: "Sexta" },
  { key: "sabado" as const, label: "Sábado" },
  { key: "domingo" as const, label: "Domingo" },
];

function minutosParaHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h${m}min` : `${h}h`) : `${m}min`;
}

export default function CicloTab({ config, onChange, materiasConcurso }: Props) {
  const MATERIAS_ATIVAS: MateriaBase[] = materiasConcurso ?? MATERIAS;
  const updateMateria = (nome: string, field: keyof ConfigMateria, value: unknown) => {
    onChange({
      ...config,
      materias: {
        ...config.materias,
        [nome]: { ...config.materias[nome], [field]: value },
      },
    });
  };

  const updateHoras = (dia: keyof EstudoConfigCiclo["horasPorDia"], horas: number) => {
    onChange({
      ...config,
      horasPorDia: { ...config.horasPorDia, [dia]: horas * 60 },
    });
  };

  const totalMin = Object.values(config.horasPorDia).reduce((a, b) => a + b, 0);

  const materiasAtivas = MATERIAS_ATIVAS.filter((m) => config.materias[m.nome]?.incluir);
  const divisoes = {
    A: materiasAtivas.filter((m) => config.materias[m.nome]?.divisao === "A"),
    B: materiasAtivas.filter((m) => config.materias[m.nome]?.divisao === "B"),
    C: materiasAtivas.filter((m) => config.materias[m.nome]?.divisao === "C"),
  };

  return (
    <div className="space-y-6">
      {/* Configuração de matérias */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Configuração das Matérias
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Defina quais matérias incluir no ciclo de estudos</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Matéria</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Incluir</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Peso</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Prioridade</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Divisão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MATERIAS_ATIVAS.map((m) => {
                const cfg = config.materias[m.nome];
                return (
                  <tr key={m.nome} className={`hover:bg-accent transition-colors ${cfg?.incluir ? "" : "opacity-60"}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${"corDot" in m ? (m as {corDot:string}).corDot : "bg-primary"}`} />
                        <span className="text-xs text-foreground">{m.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => updateMateria(m.nome, "incluir", !cfg?.incluir)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          cfg?.incluir ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            cfg?.incluir ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={cfg?.peso ?? 1}
                        onChange={(e) => updateMateria(m.nome, "peso", Number(e.target.value) as 1 | 2)}
                        className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value={1}>1 — Baixo</option>
                        <option value={2}>2 — Alto</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={cfg?.prioridade ?? "Baixa"}
                        onChange={(e) => updateMateria(m.nome, "prioridade", e.target.value)}
                        className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Baixa">Baixa</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={cfg?.divisao ?? "A"}
                        onChange={(e) => updateMateria(m.nome, "divisao", e.target.value as "A" | "B" | "C")}
                        disabled={!cfg?.incluir}
                        className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Horas por dia */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Horas de Estudo por Dia
          </h3>
          <span className="text-xs text-muted-foreground">Total semanal: {minutosParaHoras(totalMin)}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {DIAS.map(({ key, label }) => {
            const horas = Math.round(config.horasPorDia[key] / 60);
            return (
              <div key={key} className="text-center">
                <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={horas}
                  onChange={(e) => updateHoras(key, Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                  className="w-full text-center text-sm font-semibold border border-border rounded-lg bg-card text-foreground py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground mt-1 block">{horas}h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ciclo ativo */}
      {materiasAtivas.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Ciclo Ativo — Divisão das Matérias
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["A", "B", "C"] as const).map((div) => (
              <div key={div} className="rounded-lg border border-border p-3">
                <div className="text-sm font-semibold text-foreground mb-2">
                  Divisão {div}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">({divisoes[div].length} matérias)</span>
                </div>
                <div className="space-y-1">
                  {divisoes[div].length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhuma matéria</p>
                  ) : (
                    divisoes[div].map((m) => (
                      <div key={m.nome} className="text-xs px-2 py-1 rounded bg-muted text-foreground">
                        {m.nome}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
