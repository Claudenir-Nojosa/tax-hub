import { Fragment } from "react";

// Marcação leve usada no texto das cartas (frente/verso) — sem lib de markdown no projeto (ver
// nota em carta-config.ts sobre a identidade visual própria do módulo). Duas marcas:
// **texto** -> destaque vermelho (o autor escolhe manualmente o que quer realçar);
// {{texto}} -> lacuna do tipo "tesouro" (só essa marca é escondida/revelada; **destaque** dentro
// dela some ou aparece junto, nunca escondida por si só — não faz sentido esconder uma palavra que
// o autor pediu pra destacar).
export function temLacuna(texto: string): boolean {
  return /\{\{[^}]*\}\}/.test(texto);
}

function renderizarDestaque(trecho: string, prefixoKey: string) {
  return trecho.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => {
    const m = parte.match(/^\*\*([^*]+)\*\*$/);
    if (!m) return parte;
    return (
      <span key={`${prefixoKey}-d${i}`} className="text-red-500 dark:text-red-400 font-bold">
        {m[1]}
      </span>
    );
  });
}

// `revelarLacunas`: false esconde o conteúdo de {{...}} atrás de um traço (frente da carta
// Tesouro, antes de virar); true mostra o conteúdo em destaque, no MESMO lugar da frase — é o que
// faz o Tesouro funcionar igual ao cloze do Anki (mesma frase, lacuna revelada in-place), em vez
// de frente e verso como dois textos desconectados.
export default function TextoCarta({
  texto, revelarLacunas = true, className,
}: {
  texto: string;
  revelarLacunas?: boolean;
  className?: string;
}) {
  const partes = texto.split(/(\{\{[^}]*\}\})/g);
  return (
    <span className={`whitespace-pre-wrap ${className ?? ""}`}>
      {partes.map((parte, i) => {
        const m = parte.match(/^\{\{([^}]*)\}\}$/);
        if (!m) return <Fragment key={`p${i}`}>{renderizarDestaque(parte, `p${i}`)}</Fragment>;
        if (revelarLacunas) {
          return (
            <span key={`l${i}`} className="bg-primary/20 text-primary font-bold px-1 rounded">
              {renderizarDestaque(m[1], `l${i}`)}
            </span>
          );
        }
        return (
          <span
            key={`l${i}`}
            className="inline-block border-b-2 border-dashed border-current opacity-50 mx-0.5 px-5 align-baseline"
          >
            &nbsp;
          </span>
        );
      })}
    </span>
  );
}
