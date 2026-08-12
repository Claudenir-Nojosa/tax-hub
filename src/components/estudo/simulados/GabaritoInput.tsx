"use client";

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import type { Alternativa } from "@/lib/estudo-data";
import type { ItemGabarito } from "@/lib/simulados-data";

const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D", "E"];

// Grid de gabarito reaproveitável: cadastro do gabarito OFICIAL (FormSimulado, Fase 1) e, mais pra
// frente, marcação do gabarito DO USUÁRIO numa tentativa (Fase 2) — mesmo componente, só muda o
// que o pai faz com onChange. Traz atalho de colar uma sequência de letras (ex. "ABCDA BCDAE...")
// pra preencher tudo de uma vez, sem precisar clicar questão por questão.
export default function GabaritoInput({
  gabarito, onChange,
}: {
  gabarito: ItemGabarito[];
  onChange: (numero: number, alternativa: Alternativa | null) => void;
}) {
  const [colar, setColar] = useState("");
  const [mostrarColar, setMostrarColar] = useState(false);

  const aplicarColagem = () => {
    const letras = colar.toUpperCase().replace(/[^A-E]/g, "");
    if (letras.length === 0) return;
    for (let i = 0; i < letras.length && i < gabarito.length; i++) {
      const alt = letras[i] as Alternativa;
      onChange(gabarito[i].numero, alt);
    }
    setColar("");
    setMostrarColar(false);
  };

  if (gabarito.length === 0) {
    return <p className="text-xs text-muted-foreground">Defina o número de questões pra digitar o gabarito.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {gabarito.filter((g) => g.alternativaCorreta).length}/{gabarito.length} preenchidas
        </span>
        <button
          type="button"
          onClick={() => setMostrarColar((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <ClipboardPaste className="h-3 w-3" /> Colar sequência
        </button>
      </div>
      {mostrarColar && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={colar}
            onChange={(e) => setColar(e.target.value)}
            placeholder="Ex.: ABCDABCDAE..."
            autoFocus
            className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
          />
          <button
            type="button"
            onClick={aplicarColagem}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {gabarito.map((g) => (
          <div key={g.numero} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5">
            <span className="text-[11px] font-mono text-muted-foreground w-6 flex-shrink-0 text-right">{g.numero}.</span>
            <div className="flex gap-1">
              {ALTERNATIVAS.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  title={`Questão ${g.numero} — alternativa ${alt}`}
                  onClick={() => onChange(g.numero, g.alternativaCorreta === alt ? null : alt)}
                  className={`h-6 w-6 rounded-md text-[10px] font-semibold flex items-center justify-center transition-colors ${
                    g.alternativaCorreta === alt
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {alt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
