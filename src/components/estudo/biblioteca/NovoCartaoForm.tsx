"use client";

import { useState } from "react";
import { Gem, Swords, X, Zap } from "lucide-react";
import type { TipoCarta } from "@/lib/estudo-data";
import { temLacuna } from "../cartas/carta-texto";
import TextareaFormatavel from "../cartas/TextareaFormatavel";

// mesma config visual das cartas em CartasTab.tsx, reduzida aos 3 tipos que o leitor oferece
// (sem "boss", que só existe como escalada de Monstro dentro da sessão de revisão)
export const TIPO_CARTAO_CONFIG: Record<"monstro" | "armadilha" | "tesouro", { label: string; Icon: typeof Swords }> = {
  monstro: { label: "Monstro", Icon: Swords },
  armadilha: { label: "V ou F", Icon: Zap },
  tesouro: { label: "Tesouro", Icon: Gem },
};

// ─── Formulário manual do cartão (sem IA, sem grifo — preenchido do zero) ────

export default function NovoCartaoForm({
  tipo, materia, topico, onSalvar, onCancelar,
}: {
  tipo: TipoCarta;
  materia: string;
  topico?: string;
  onSalvar: (frente: string, verso: string, gabarito?: "verdadeiro" | "falso") => void;
  onCancelar: () => void;
}) {
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [gabarito, setGabarito] = useState<"verdadeiro" | "falso">("verdadeiro");

  const cfg = TIPO_CARTAO_CONFIG[tipo as "monstro" | "armadilha" | "tesouro"];
  const frenteLabel = tipo === "monstro" ? "Pergunta" : tipo === "armadilha" ? "Afirmação (Verdadeiro ou Falso?)" : "Frase completa (selecione a parte que falta e clique em \"Lacuna\")";
  const versoLabel = tipo === "monstro" ? "Resposta" : tipo === "armadilha" ? "Explicação" : "Explicação adicional (opcional)";
  // Tesouro com lacuna marcada em {{...}} não exige verso (vira só explicação opcional) — os
  // outros tipos, e Tesouro sem lacuna (formato antigo), continuam exigindo os dois.
  const podeSalvar = frente.trim() !== "" && (tipo === "tesouro" ? (temLacuna(frente) || verso.trim() !== "") : verso.trim() !== "");

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onCancelar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <cfg.Icon className="h-4 w-4 text-primary" /> Novo cartão {cfg.label}
          </div>
          <button type="button" onClick={onCancelar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
          {materia}{topico ? ` · ${topico}` : ""}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">{frenteLabel}</label>
          <TextareaFormatavel
            value={frente}
            onChange={setFrente}
            rows={8}
            autoFocus={tipo === "monstro"}
            permitirLacuna={tipo === "tesouro"}
            className="w-full text-base leading-relaxed border border-border rounded-lg px-3.5 py-3 bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y min-h-[180px]"
          />
        </div>

        {tipo === "armadilha" && (
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Gabarito</label>
            <div className="flex gap-2">
              {(["verdadeiro", "falso"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGabarito(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                    gabarito === g
                      ? g === "verdadeiro"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {g === "verdadeiro" ? "✓ Verdadeiro" : "✗ Falso"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">{versoLabel}</label>
          <TextareaFormatavel
            value={verso}
            onChange={setVerso}
            rows={10}
            autoFocus={tipo === "armadilha"}
            className="w-full text-base leading-relaxed border border-border rounded-lg px-3.5 py-3 bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y min-h-[220px]"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSalvar(frente, verso, gabarito)}
            disabled={!podeSalvar}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Criar cartão
          </button>
          <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
