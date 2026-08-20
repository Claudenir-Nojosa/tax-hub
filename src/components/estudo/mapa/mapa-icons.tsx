// Iconografia medieval feita à mão (SVG simples, formas geométricas básicas — sem lib externa,
// mesmo espírito de ProgressRing/AnelProgresso já usados no app). `fill="currentColor"` em tudo:
// a cor vem de `className`/`style` do elemento pai (text-*), pra reaproveitar as mesmas classes de
// cor por matéria que o resto do app já usa (resolverCorMateria).

export function IconeCastelo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="6" y="18" width="28" height="16" fill="currentColor" />
      <rect x="6" y="10" width="6" height="8" fill="currentColor" />
      <rect x="17" y="6" width="6" height="12" fill="currentColor" />
      <rect x="28" y="10" width="6" height="8" fill="currentColor" />
      <rect x="6" y="8" width="2" height="2" fill="currentColor" />
      <rect x="10" y="8" width="2" height="2" fill="currentColor" />
      <rect x="17" y="4" width="2" height="2" fill="currentColor" />
      <rect x="21" y="4" width="2" height="2" fill="currentColor" />
      <rect x="28" y="8" width="2" height="2" fill="currentColor" />
      <rect x="32" y="8" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconeTorre({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="7" y="8" width="10" height="14" fill="currentColor" />
      <rect x="6" y="6" width="2" height="2" fill="currentColor" />
      <rect x="11" y="6" width="2" height="2" fill="currentColor" />
      <rect x="16" y="6" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconeTenda({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 4 L20 20 H4 Z" fill="currentColor" />
      <path d="M12 4 L15 20 H9 Z" fill="#000" opacity="0.15" />
    </svg>
  );
}

export function IconeMontanha({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 24" className={className} aria-hidden="true">
      <path d="M0 24 L10 8 L16 16 L24 2 L34 18 L40 10 L48 24 Z" fill="currentColor" />
    </svg>
  );
}

export function IconeArvore({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 24" className={className} aria-hidden="true">
      <path d="M10 2 L16 12 H12 L17 20 H3 L8 12 H4 Z" fill="currentColor" />
      <rect x="8.5" y="20" width="3" height="4" fill="currentColor" />
    </svg>
  );
}

// variação de curvatura orgânica pra blob das regiões — um pool pequeno, escolhido por índice
// (determinístico, não Math.random) pra não ficar tudo com o mesmo formato de "pílula"
export const BLOB_RADIUS = [
  "63% 37% 54% 46% / 43% 47% 53% 57%",
  "48% 52% 38% 62% / 57% 44% 56% 43%",
  "55% 45% 62% 38% / 38% 58% 42% 62%",
  "40% 60% 47% 53% / 60% 38% 62% 40%",
];
