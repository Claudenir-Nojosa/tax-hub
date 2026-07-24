import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "success" | "warning" | "danger" | "purple" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  neutral: "bg-muted text-muted-foreground",
};

interface StatTileProps {
  icone: LucideIcon;
  label: string;
  valor: string | number;
  sublabel?: string;
  tone?: Tone;
  className?: string;
}

// Tile de KPI reutilizável — mesma receita usada no Dashboard e no Relatórios (ícone em chip
// colorido + valor em destaque + rótulo), pra não reinventar essa forma em cada tela.
export default function StatTile({
  icone: Icone, label, valor, sublabel, tone = "primary", className = "",
}: StatTileProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 flex items-center gap-3 ${className}`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TONE_CLASSES[tone]}`}>
        <Icone className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-tight truncate">{valor}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground/70 truncate">{sublabel}</p>}
      </div>
    </div>
  );
}
