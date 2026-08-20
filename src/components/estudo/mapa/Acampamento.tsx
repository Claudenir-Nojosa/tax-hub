"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Volume2, VolumeX } from "lucide-react";

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
  const [telaCheia, setTelaCheia] = useState(false);
  const [tocandoMusica, setTocandoMusica] = useState(false);
  const teclas = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // navegador bloqueia autoplay com som sem gesto do usuário — por isso começa pausado, e o
  // botão de música é o próprio gesto que libera o play
  const alternarMusica = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocandoMusica) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setTocandoMusica((v) => !v);
  };

  useEffect(() => {
    const onFullscreenChange = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

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
      ref={containerRef}
      className={`overflow-hidden border border-amber-800/20 dark:border-amber-100/10 bg-black ${
        telaCheia ? "w-screen h-screen flex items-center justify-center" : "rounded-2xl"
      }`}
    >
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
        <audio ref={audioRef} src="/sons/acampamento.mp3" loop preload="none" />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={alternarMusica}
            title={tocandoMusica ? "Pausar música" : "Tocar música"}
            className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/75 text-white flex items-center justify-center border border-white/15 transition-colors"
          >
            {tocandoMusica ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={alternarTelaCheia}
            title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/75 text-white flex items-center justify-center border border-white/15 transition-colors"
          >
            {telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          {onIrParaMapa && (
            <button
              type="button"
              onClick={onIrParaMapa}
              className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/75 text-white text-xs font-medium border border-white/15 transition-colors"
            >
              Ir para o mapa do mundo →
            </button>
          )}
        </div>
      </div>
      {!telaCheia && (
        <p className="text-center text-[11px] text-muted-foreground py-2">Use as setas do teclado pra andar pelo acampamento</p>
      )}
    </div>
  );
}
