"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";

function fmt(segundos: number): string {
  const s = Math.max(0, segundos);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Cronômetro de PAREDE — recalcula "quanto falta" a partir de `iniciadoEm` (timestamp gravado no
// SERVIDOR quando a parte começou) a cada tick, nunca acumula um contador em memória. Fechar a
// aba, dar F5 ou abrir em outro dispositivo não perde nem ganha tempo: a verdade é sempre
// deadline = iniciadoEm + tempoMinutos, comparado contra o relógio de agora. Nunca auto-entrega —
// só avisa (faltam 15min / estourou) e deixa o usuário decidir quando clicar em "Terminei".
export default function TimerParte({ iniciadoEm, tempoMinutos }: { iniciadoEm: string; tempoMinutos: number }) {
  const deadline = new Date(iniciadoEm).getTime() + tempoMinutos * 60_000;
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const restanteSegundos = Math.floor((deadline - agora) / 1000);
  const estourou = restanteSegundos <= 0;
  const avisoFinal = !estourou && restanteSegundos <= 15 * 60;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
        estourou
          ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
          : avisoFinal
          ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
          : "border-border bg-muted/30"
      }`}
    >
      {estourou || avisoFinal ? (
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${estourou ? "text-red-500" : "text-amber-500"}`} />
      ) : (
        <Clock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      )}
      <div>
        <div
          className={`font-mono text-2xl font-bold tabular-nums ${
            estourou ? "text-red-600 dark:text-red-400" : avisoFinal ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          }`}
        >
          {estourou ? fmt(-restanteSegundos) : fmt(restanteSegundos)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {estourou ? "Tempo estourado — termine quando puder, o registro é só informativo" : "restante · a prova continua rodando mesmo se você fechar a aba"}
        </div>
      </div>
    </div>
  );
}
