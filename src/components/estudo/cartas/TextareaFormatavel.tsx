"use client";

import { useRef } from "react";
import TextoCarta, { temLacuna } from "./carta-texto";

// Pedido do usuário: dá pra digitar com espaços/parágrafos e ver isso de fato preservado no card
// pronto, e dá pra marcar palavras em vermelho manualmente. Como frente/verso são <textarea> comuns
// (sem editor rico), a marcação é textual (**vermelho**, {{lacuna}} — ver carta-texto.tsx) e esses
// botões só envolvem a SELEÇÃO atual do textarea com os marcadores, sem exigir digitar na mão.
export default function TextareaFormatavel({
  value, onChange, rows, placeholder, className, autoFocus, permitirLacuna, dicaLacuna,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
  className: string;
  autoFocus?: boolean;
  permitirLacuna?: boolean; // tipo "tesouro" — mostra o botão de marcar lacuna nesse campo
  dicaLacuna?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function envolverSelecao(abre: string, fecha: string) {
    const el = ref.current;
    if (!el) return;
    const inicio = el.selectionStart;
    const fim = el.selectionEnd;
    if (inicio === fim) return; // nada selecionado — não insere marcador vazio
    const novoValor = value.slice(0, inicio) + abre + value.slice(inicio, fim) + fecha + value.slice(fim);
    onChange(novoValor);
    // devolve o foco e reseleciona o trecho (agora com os marcadores) depois do re-render
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio, fim + abre.length + fecha.length);
    });
  }

  const comLacuna = !!permitirLacuna && temLacuna(value);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => envolverSelecao("**", "**")}
          title="Selecione um trecho no texto e clique pra destacar em vermelho"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border border-border text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" /> Destacar
        </button>
        {permitirLacuna && (
          <button
            type="button"
            onClick={() => envolverSelecao("{{", "}}")}
            title="Selecione o trecho que deve ficar oculto e clique"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border border-border text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" /> Lacuna
          </button>
        )}
        <span className="text-[10px] text-muted-foreground">selecione o texto acima antes de clicar</span>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={className}
      />

      {permitirLacuna && !comLacuna && value.trim() && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
          {dicaLacuna ?? "Marque pelo menos um trecho como lacuna (botão \"Lacuna\" acima) pra virar carta Tesouro."}
        </p>
      )}

      {value.trim() && (
        <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 space-y-2">
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              {comLacuna ? "Prévia — antes de virar a carta" : "Prévia"}
            </p>
            <TextoCarta texto={value} revelarLacunas={false} className="text-xs text-foreground" />
          </div>
          {comLacuna && (
            <div className="border-t border-border pt-2">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Prévia — depois de virar</p>
              <TextoCarta texto={value} revelarLacunas className="text-xs text-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
