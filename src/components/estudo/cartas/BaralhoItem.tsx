import { BookOpen, ChevronRight } from "lucide-react";
import type { Carta } from "@/lib/estudo-data";
import { hoje } from "./carta-config";

export default function BaralhoItem({
  displayName,
  cartas,
  onEntrar,
  onRevisar,
}: {
  displayName: string;
  cartas: Carta[];
  onEntrar: () => void;
  onRevisar: () => void;
}) {
  const hj = hoje();
  const dueCount = cartas.filter((c) => c.proximaRevisao <= hj).length;
  const acertos = cartas.reduce((s, c) => s + c.acertos, 0);
  const total = cartas.reduce((s, c) => s + c.acertos + c.erros, 0);
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : null;

  const monstro = cartas.filter((c) => c.tipo === "monstro").length;
  const armadilha = cartas.filter((c) => c.tipo === "armadilha").length;
  const tesouro = cartas.filter((c) => c.tipo === "tesouro").length;
  const boss = cartas.filter((c) => c.tipo === "boss").length;

  return (
    <div
      onClick={onEntrar}
      className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3.5 cursor-pointer hover:border-primary hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <BookOpen className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{cartas.length} carta{cartas.length !== 1 ? "s" : ""}</span>
          {monstro > 0 && <span className="text-[10px] bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary px-1.5 py-0.5 rounded-full font-medium">{monstro}M</span>}
          {armadilha > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">{armadilha}A</span>}
          {tesouro > 0 && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">{tesouro}T</span>}
          {boss > 0 && <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">{boss}B</span>}
          {taxa !== null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              taxa >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
              taxa >= 50 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
              "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}>{taxa}%</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {dueCount > 0 && (
          <>
            <span className="hidden sm:inline text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-full">
              {dueCount} hoje
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRevisar(); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              Revisar
            </button>
          </>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
