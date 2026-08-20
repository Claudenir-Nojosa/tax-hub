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
// Tela cheia + música são controladas por MapaTab (que não desmonta ao entrar no treino) — este
// componente só recebe `telaCheia` pra ajustar o próprio tamanho, sem ficar dono desse estado.
export default function Acampamento({
  telaCheia,
  onIrParaMapa,
  onEntrarTreino,
}: {
  telaCheia: boolean;
  onIrParaMapa?: () => void;
  onEntrarTreino?: () => void;
}) {
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
    <div
      className="relative mx-auto"
      style={
        telaCheia
          ? { aspectRatio: "1562 / 1007", height: "100vh", maxWidth: "100vw" }
          : { aspectRatio: "1562 / 1007", width: "100%", maxWidth: 900 }
      }
    >
      <img
        src="/cenarios/acampamento.png"
        alt="Acampamento — campo de descanso"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        style={{ imageRendering: "pixelated" }}
      />
      {onEntrarTreino && (
        <button
          type="button"
          onClick={onEntrarTreino}
          title="Campo de treinamento"
          className="absolute rounded-lg ring-0 hover:ring-2 hover:ring-amber-400/70 transition-all"
          style={{ left: "5.76%", top: "41.2%", width: "19.85%", height: "24.8%" }}
        />
      )}
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
          className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/75 text-white text-xs font-medium border border-white/15 transition-colors"
        >
          Ir para o mapa do mundo →
        </button>
      )}
      <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
        Use as setas do teclado pra andar pelo acampamento
      </p>
    </div>
  );
}
