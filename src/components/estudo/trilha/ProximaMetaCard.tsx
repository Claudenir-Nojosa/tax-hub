"use client";

import { Lock } from "lucide-react";
import type { ProximaMetaPreview } from "@/lib/trilha-fila";
import SectionCard from "../ui/SectionCard";

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Card lateral bloqueado (print do Guruja) — "Liberada em: DD/MM" é uma PROJEÇÃO honesta (mesmo
// espírito de estimativaConclusaoTrilha.dataPrevista, via throughput real desde que a Meta atual
// abriu), não uma trava de calendário fixa; sem nenhuma atividade concluída ainda, mostra "sem
// estimativa ainda" em vez de inventar uma data. O botão fecha a Meta atual (pendências, se houver,
// viram carry-over automático — nunca são deletadas) e abre a próxima na mesma chamada — SEMPRE por
// clique explícito do usuário, nunca sozinho (pedido dele: concluir a última atividade não deve
// empurrar pra próxima Meta sem avisar — ver avancarFilaMetasSeNecessario em trilha-fila.ts).
export default function ProximaMetaCard({
  proximaMeta, onFinalizarOuIgnorar, finalizando, metaFechavel,
}: {
  proximaMeta: ProximaMetaPreview;
  onFinalizarOuIgnorar: () => void;
  finalizando?: boolean;
  metaFechavel?: boolean;
}) {
  return (
    <SectionCard titulo="Próxima meta" icone={Lock} corIcone="bg-muted-foreground">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Meta {proximaMeta.numero}</div>
          <div className="text-xs text-muted-foreground">
            {proximaMeta.liberadaEmProjetada
              ? `Liberada em: ${fmtDataCurta(proximaMeta.liberadaEmProjetada)}`
              : "Sem estimativa ainda"}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onFinalizarOuIgnorar}
        disabled={finalizando}
        className={
          metaFechavel
            ? "w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            : "w-full px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        {finalizando
          ? "Avançando…"
          : metaFechavel
            ? "Meta concluída — avançar para a próxima"
            : "Finalize ou ignore as atividades da meta atual"}
      </button>
    </SectionCard>
  );
}
