import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Carta } from "@/lib/estudo-data";
import { CARTA_CONFIG } from "./carta-config";
import TextoCarta from "./carta-texto";

export default function ImportReviewScreen({
  sugestoes,
  selecionadas,
  onToggle,
  onToggleAll,
  onSalvar,
  onCancelar,
}: {
  sugestoes: Carta[];
  selecionadas: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (selecionar: boolean) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const countSel = selecionadas.size;
  const todasSelecionadas = countSel === sugestoes.length;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 min-h-[500px] flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <button onClick={onCancelar} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Cartas Geradas pela IA</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sugestoes.length} sugestão{sugestoes.length !== 1 ? "ões" : ""} · Selecione as que deseja salvar
          </p>
        </div>
        <button
          onClick={() => onToggleAll(!todasSelecionadas)}
          className="text-xs text-primary hover:underline font-medium flex-shrink-0"
        >
          {todasSelecionadas ? "Desmarcar todas" : "Marcar todas"}
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
        {sugestoes.map((carta) => {
          const cfg = CARTA_CONFIG[carta.tipo];
          const Icon = cfg.icone;
          const sel = selecionadas.has(carta.id);
          return (
            <div
              key={carta.id}
              onClick={() => onToggle(carta.id)}
              className={`flex gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                sel
                  ? `${cfg.borda} bg-gradient-to-r ${cfg.cor} shadow-lg`
                  : "border-border bg-muted/50 hover:border-primary/40 dark:hover:border-primary/40"
              }`}
            >
              <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                sel ? "border-white bg-white/20" : "border-input"
              }`}>
                {sel && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`inline-flex items-center gap-1 ${cfg.badge} rounded-full px-2 py-0.5 mb-1.5`}>
                  <Icon className="h-2.5 w-2.5 text-white" />
                  <span className="text-[9px] font-bold text-white tracking-wider">{cfg.texto}</span>
                </div>
                <p className={`text-sm font-medium leading-snug mb-1 ${sel ? "text-white" : "text-foreground dark:text-foreground"}`}>
                  <TextoCarta texto={carta.frente} />
                </p>
                {carta.tipo === "armadilha" && carta.gabarito && (
                  <p className={`text-xs font-bold mb-1 ${carta.gabarito === "verdadeiro" ? "text-emerald-400" : "text-red-400"}`}>
                    {carta.gabarito === "verdadeiro" ? "✓ VERDADEIRO" : "✗ FALSO"}
                  </p>
                )}
                <p className={`text-xs leading-relaxed line-clamp-2 ${sel ? "text-white/70" : "text-muted-foreground"}`}>
                  <TextoCarta texto={carta.verso} />
                </p>
                {carta.materia && (
                  <p className={`text-[10px] mt-1.5 font-medium ${sel ? "text-white/50" : "text-muted-foreground"}`}>
                    {carta.materia}{carta.topico ? ` · ${carta.topico}` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <button
          onClick={onSalvar}
          disabled={countSel === 0}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground py-3 rounded-xl font-bold text-sm transition-all"
        >
          Salvar {countSel} carta{countSel !== 1 ? "s" : ""} selecionada{countSel !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
