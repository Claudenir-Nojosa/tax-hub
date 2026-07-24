import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}

// Estado vazio padrão — receita da galeria de Recuperação de Crédito (borda tracejada + ícone
// apagado + CTA), generalizada pra qualquer lista/gráfico sem dado no módulo Estudo.
export default function EmptyState({ icone: Icone, titulo, descricao, acao, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 border-2 border-dashed border-border rounded-2xl", className)}>
      <Icone className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">{titulo}</p>
      {descricao && <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">{descricao}</p>}
      {acao}
    </div>
  );
}
