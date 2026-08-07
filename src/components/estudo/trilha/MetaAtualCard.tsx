"use client";

import type { ReactNode } from "react";
import { Rocket, Target, Clock, ListChecks, TrendingUp, CalendarClock } from "lucide-react";
import type { MetaAtual } from "@/lib/trilha-fila";
import { fmtHoras } from "./trilha-ui";
import EstudoHero from "../ui/EstudoHero";
import StatTile from "../ui/StatTile";

// Header da Trilha nova — substitui o hero semanal antigo (anel de % de horas). Mostra "Meta N",
// uma barra de progresso HORIZONTAL com um foguete andando conforme concluidas/total sobe (pedido
// explícito do usuário, do print do Guruja — não é o ProgressRing circular usado em outras telas
// do módulo, que representa outra coisa: % de tempo da semana, não % de atividades da Meta), e os
// 4 stats da Meta atual.
export default function MetaAtualCard({ meta, acaoCanto }: { meta: MetaAtual; acaoCanto?: ReactNode }) {
  const perc = meta.total > 0 ? Math.round((meta.concluidas / meta.total) * 100) : 0;

  return (
    <EstudoHero acaoCanto={acaoCanto}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold">Meta atual</div>
      </div>
      <div className="text-lg sm:text-xl font-bold leading-snug mb-3">Meta {meta.numero}</div>

      <div className="relative pt-2 pb-1">
        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${perc}%` }}
          />
        </div>
        <div
          className="absolute top-0 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
          style={{ left: `${perc}%` }}
        >
          <Rocket className="h-5 w-5 text-white rotate-90 drop-shadow" />
        </div>
      </div>
      <div className="text-xs text-emerald-100 mt-1">
        {meta.concluidas}✓ de {meta.total} atividade{meta.total !== 1 ? "s" : ""}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <StatTile
          icone={Target}
          label="Desempenho atingido"
          valor={meta.desempenhoPerc !== null ? `${meta.desempenhoPerc}%` : "—"}
          tone="success"
        />
        <StatTile icone={Clock} label="Horas estudadas" valor={fmtHoras(Math.round(meta.horasEstudadas * 60))} tone="primary" />
        <StatTile icone={ListChecks} label="Questões resolvidas" valor={meta.questoesResolvidas} tone="purple" />
        <StatTile
          icone={TrendingUp}
          label="Média horas/dia"
          valor={fmtHoras(Math.round(meta.mediaHorasDiaria * 60))}
          tone="warning"
        />
      </div>
    </EstudoHero>
  );
}

// ícone reaproveitado no ProximaMetaCard pra manter os dois consistentes
export const IconeMeta = CalendarClock;
