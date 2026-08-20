"use client";

import { useEffect, useRef, useState } from "react";

type Direcao = "baixo" | "cima" | "esquerda" | "direita";

const SPRITES: Record<Direcao, string> = {
  baixo: "/personagens/ladino-baixo.png",
  cima: "/personagens/ladino-cima.png",
  esquerda: "/personagens/ladino-esquerda.png",
  direita: "/personagens/ladino-direita.png",
};

// cenário 1562x1007 — velocidade em % da ALTURA, convertida pra % da largura na hora de mover no
// eixo X (senão andar na horizontal fica mais rápido que na vertical, já que 1% de largura e 1%
// de altura não valem o mesmo tanto de pixel num retângulo não-quadrado)
const RAZAO_CENARIO = 1562 / 1007;
const VELOCIDADE_Y = 0.55;
const VELOCIDADE_X = VELOCIDADE_Y / RAZAO_CENARIO;
const TECLAS_MOVIMENTO = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

// Acampamento — campo de descanso (hub), personagem andável com as setas do teclado sobre a cena
// fornecida pelo usuário (public/cenarios/acampamento.png). Só movimento por enquanto: os limites
// (4-96% / 8-94%) mantêm o personagem dentro do quadro, mas NÃO há colisão real com fogueira/
// barracas/poço ainda — é uma simplificação deliberada da primeira versão, não um bug.
export default function Acampamento({ onIrParaMapa }: { onIrParaMapa?: () => void }) {
  const [pos, setPos] = useState({ x: 50, y: 58 });
  const [direcao, setDirecao] = useState<Direcao>("baixo");
  const teclas = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (TECLAS_MOVIMENTO.has(e.key)) {
        teclas.current.add(e.key);
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      teclas.current.delete(e.key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let frame: number;
    const loop = () => {
      const t = teclas.current;
      if (t.size > 0) {
        setPos((p) => {
          let { x, y } = p;
          if (t.has("ArrowUp")) y -= VELOCIDADE_Y;
          if (t.has("ArrowDown")) y += VELOCIDADE_Y;
          if (t.has("ArrowLeft")) x -= VELOCIDADE_X;
          if (t.has("ArrowRight")) x += VELOCIDADE_X;
          x = Math.min(96, Math.max(4, x));
          y = Math.min(94, Math.max(8, y));
          return { x, y };
        });
        if (t.has("ArrowLeft")) setDirecao("esquerda");
        else if (t.has("ArrowRight")) setDirecao("direita");
        else if (t.has("ArrowUp")) setDirecao("cima");
        else if (t.has("ArrowDown")) setDirecao("baixo");
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-800/20 dark:border-amber-100/10 bg-black">
      <div className="relative w-full mx-auto" style={{ aspectRatio: "1562 / 1007", maxWidth: 900 }}>
        <img
          src="/cenarios/acampamento.png"
          alt="Acampamento — campo de descanso"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          style={{ imageRendering: "pixelated" }}
        />
        <img
          src={SPRITES[direcao]}
          alt="Ladino"
          className="absolute pointer-events-none"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: "translate(-50%, -95%)",
            height: 64,
            width: "auto",
            imageRendering: "pixelated",
          }}
        />
        {onIrParaMapa && (
          <button
            type="button"
            onClick={onIrParaMapa}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/75 text-white text-xs font-medium border border-white/15 transition-colors"
          >
            Ir para o mapa do mundo →
          </button>
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground py-2">Use as setas do teclado pra andar pelo acampamento</p>
    </div>
  );
}
