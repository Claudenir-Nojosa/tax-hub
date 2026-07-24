import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EstudoHeroProps {
  children: ReactNode;
  acaoCanto?: ReactNode; // botão flutuante no canto superior direito (ex.: "desativar trilha")
  className?: string;
}

// Shell do hero em gradiente — receita única reaproveitada por Dashboard/Trilha/Biblioteca, que
// antes cada um copiava à mão. A composição interna (título, subtítulo, anel, streak, barra de
// progresso) continua livre via children, porque ela genuinamente difere entre as três telas —
// só o container (gradiente/raio/sombra/padding) era duplicado de verdade.
export default function EstudoHero({ children, acaoCanto, className }: EstudoHeroProps) {
  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg",
        className
      )}
    >
      {acaoCanto && <div className="absolute top-3 right-3">{acaoCanto}</div>}
      {children}
    </div>
  );
}
