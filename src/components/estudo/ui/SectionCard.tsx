import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  titulo: string;
  icone?: LucideIcon;
  corIcone?: string; // ex.: "bg-primary" — barrinha vertical de destaque ao lado do título
  acao?: ReactNode; // slot no canto superior direito (ex.: filtro, botão)
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

// Wrapper padrão de seção do módulo Estudo — generaliza o SectionTitle que já existia (só) no
// Relatórios pra ser reaproveitado em qualquer aba.
export default function SectionCard({
  titulo, icone: Icone, corIcone = "bg-primary", acao, children, className, contentClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("rounded-2xl border-border p-5 sm:p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1 h-5 rounded-full flex-shrink-0 ${corIcone}`} />
          {Icone && <Icone className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <h2 className="text-sm font-bold text-foreground tracking-wide uppercase truncate">{titulo}</h2>
        </div>
        {acao}
      </div>
      <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
