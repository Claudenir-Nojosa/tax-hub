import type { ReactNode } from "react";

interface ProgressRingProps {
  perc: number;
  size?: number;
  espessura?: number;
  corStroke?: string;
  corTrilho?: string;
  children?: ReactNode;
}

// Anel de progresso em SVG puro — movido do TrilhaTab (era local, `AnelProgresso`) sem nenhuma
// mudança visual, pra ser reaproveitado no hero do Dashboard também. Não tem equivalente circular
// no shadcn (Progress é só linear), então continua sendo o componente certo aqui.
export default function ProgressRing({
  perc, size = 84, espessura = 8, corStroke = "stroke-white", corTrilho = "stroke-white/25", children,
}: ProgressRingProps) {
  const raio = (size - espessura) / 2;
  const circ = 2 * Math.PI * raio;
  const clamped = Math.min(100, Math.max(0, perc));
  const offset = circ * (1 - clamped / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={raio} strokeWidth={espessura} fill="none" className={corTrilho} />
        <circle
          cx={size / 2} cy={size / 2} r={raio} strokeWidth={espessura} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className={`${corStroke} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
