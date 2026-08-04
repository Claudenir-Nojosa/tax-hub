"use client";

import { Settings2, Clock } from "lucide-react";
import { MATERIAS, type EstudoConfigCiclo, type ConfigMateria, type MateriaBase } from "@/lib/estudo-data";
import SectionCard from "./ui/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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

  // horasPorDia guarda minutos totais — setHoras/setMinutos recombinam preservando a outra
  // metade do valor atual (mudar só os minutos não pode zerar as horas já digitadas, e vice-versa)
  const updateMinutosDia = (dia: keyof EstudoConfigCiclo["horasPorDia"], minutos: number) => {
    onChange({
      ...config,
      horasPorDia: { ...config.horasPorDia, [dia]: Math.max(0, minutos) },
    });
  };
  const setHoras = (dia: keyof EstudoConfigCiclo["horasPorDia"], horas: number) => {
    const m = config.horasPorDia[dia] % 60;
    updateMinutosDia(dia, Math.max(0, Math.min(23, horas)) * 60 + m);
  };
  const setMinutos = (dia: keyof EstudoConfigCiclo["horasPorDia"], minutos: number) => {
    const h = Math.floor(config.horasPorDia[dia] / 60);
    updateMinutosDia(dia, h * 60 + Math.max(0, Math.min(59, minutos)));
  };

  const totalMin = Object.values(config.horasPorDia).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Configuração de matérias */}
      <SectionCard
        titulo="Configuração das Matérias"
        icone={Settings2}
        contentClassName="-mx-5 sm:-mx-6 -mb-5 sm:-mb-6"
      >
        <p className="text-xs text-muted-foreground px-5 sm:px-6 pb-3 -mt-2">
          Defina quais matérias incluir no ciclo de estudos. O Grupo decide a ORDEM da cadeia na
          Trilha — todas as matérias aparecem, mas bloqueadas: primeiro as do grupo A, depois B,
          depois C, uma atividade de cada vez, liberando a próxima conforme você conclui.
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 sm:pl-6">Matéria</TableHead>
              <TableHead className="text-center">Incluir</TableHead>
              <TableHead className="text-center">Peso</TableHead>
              <TableHead className="text-center">Prioridade</TableHead>
              <TableHead className="text-center pr-5 sm:pr-6">Grupo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATERIAS_ATIVAS.map((m) => {
              const cfg = config.materias[m.nome];
              return (
                <TableRow key={m.nome} className={cfg?.incluir ? "" : "opacity-60"}>
                  <TableCell className="pl-5 sm:pl-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${"corDot" in m ? (m as {corDot:string}).corDot : "bg-primary"}`} />
                      <span className="text-xs text-foreground">{m.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!!cfg?.incluir}
                      onCheckedChange={(v) => updateMateria(m.nome, "incluir", v)}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <select
                      value={cfg?.peso ?? 1}
                      onChange={(e) => updateMateria(m.nome, "peso", Number(e.target.value) as 1 | 2)}
                      className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value={1}>1 — Baixo</option>
                      <option value={2}>2 — Alto</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-center">
                    <select
                      value={cfg?.prioridade ?? "Baixa"}
                      onChange={(e) => updateMateria(m.nome, "prioridade", e.target.value)}
                      className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="Alta">Alta</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-center pr-5 sm:pr-6">
                    <select
                      value={cfg?.divisao ?? "A"}
                      onChange={(e) => updateMateria(m.nome, "divisao", e.target.value)}
                      className="text-xs border border-border rounded bg-card text-foreground px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Horas por dia */}
      <SectionCard
        titulo="Horas de Estudo por Dia"
        icone={Clock}
        acao={<span className="text-xs text-muted-foreground">Total semanal: {minutosParaHoras(totalMin)}</span>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {DIAS.map(({ key, label }) => {
            const totalDia = config.horasPorDia[key];
            const horas = Math.floor(totalDia / 60);
            const minutos = totalDia % 60;
            return (
              <div key={key} className="text-center">
                <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={horas}
                    onChange={(e) => setHoras(key, parseInt(e.target.value) || 0)}
                    title="Horas"
                    className="w-11 text-center text-sm font-semibold border border-border rounded-lg bg-card text-foreground py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-[10px] text-muted-foreground">h</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={minutos}
                    onChange={(e) => setMinutos(key, parseInt(e.target.value) || 0)}
                    title="Minutos"
                    className="w-11 text-center text-sm font-semibold border border-border rounded-lg bg-card text-foreground py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-[10px] text-muted-foreground">min</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{minutosParaHoras(totalDia)}</span>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
