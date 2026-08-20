"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Maximize, Minimize, Sparkles, Volume2, VolumeX } from "lucide-react";
import { MATERIAS, type JogoRPGState, type MateriaConcurso, type TopicoState } from "@/lib/estudo-data";
import Acampamento from "./Acampamento";
import MapaMundo from "./MapaMundo";
import MapaRegiao from "./MapaRegiao";
import TelaTreino from "./TelaTreino";

type Tela = "acampamento" | "mundo" | "treino";

// Fase 1 do RPG medieval de estudos: mapa + acampamento andável + protótipo de luta, sem sistema
// de questões real/motor de jogo ainda — pedido explícito do usuário ("faça o mapa, depois eu
// decido o resto"). Entrada é o Acampamento (campo de descanso/hub, personagem andável com as
// setas) — daí dá pra ir pro Mapa do Mundo (cada matéria é uma região; cada tópico dela é uma
// cidade) ou entrar no campo de treino (protótipo de luta contra o Nerdão). 100% derivado do
// progresso real (TopicoState.estudado) e da mesma ordem de desbloqueio que a Trilha já usa —
// nenhum estado novo é persistido nesta fase.
//
// Tela cheia e música ficam AQUI (não dentro de Acampamento/TelaTreino) de propósito: são os dois
// componentes que trocam de lugar um do outro quando o usuário entra/sai do treino, e se cada um
// fosse dono do próprio <audio>/fullscreen, trocar de tela desmontaria os dois — cortando o som e
// derrubando a tela cheia no meio da troca (bug reportado pelo usuário). Aqui embaixo, o wrapper
// nunca desmonta entre acampamento e treino, só quando volta pro mapa do mundo.
export default function MapaTab({
  materiasConcurso,
  topicos,
  jogoRPG,
  onUpdateJogoRPG,
  concursoId,
}: {
  materiasConcurso?: MateriaConcurso[];
  topicos: Record<string, TopicoState>;
  jogoRPG: JogoRPGState;
  onUpdateJogoRPG: (jogo: JogoRPGState) => void;
  concursoId?: string;
}) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [tela, setTela] = useState<Tela>("acampamento");
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string | null>(null);

  const [telaCheia, setTelaCheia] = useState(false);
  const [tocandoMusica, setTocandoMusica] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // navegador bloqueia autoplay com som sem gesto do usuário — por isso começa pausado, e o
  // botão de música é o próprio gesto que libera o play
  const alternarMusica = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocandoMusica) audio.pause();
    else audio.play().catch(() => {});
    setTocandoMusica((v) => !v);
  };

  const materia = regiaoSelecionada ? materiasAtivas.find((m) => m.nome === regiaoSelecionada) : undefined;

  if (tela === "acampamento" || tela === "treino") {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black ${
          telaCheia ? "w-screen h-screen flex items-center justify-center" : "rounded-2xl border border-amber-800/20 dark:border-amber-100/10"
        }`}
      >
        <audio ref={audioRef} src="/sons/acampamento.mp3" loop preload="none" />
        {tela === "acampamento" ? (
          <Acampamento
            telaCheia={telaCheia}
            onIrParaMapa={() => setTela("mundo")}
            onEntrarTreino={() => setTela("treino")}
          />
        ) : (
          <TelaTreino
            telaCheia={telaCheia}
            jogoRPG={jogoRPG}
            onUpdateJogoRPG={onUpdateJogoRPG}
            concursoId={concursoId}
            onVoltar={() => setTela("acampamento")}
          />
        )}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5">
          <span className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-300">
            <Coins className="h-3.5 w-3.5" /> {jogoRPG.gold}
          </span>
          <span className="flex items-center gap-1 text-xs font-mono font-semibold text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> {jogoRPG.xp} XP
          </span>
        </div>
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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
        </div>
      </div>
    );
  }

  if (materia) {
    return (
      <MapaRegiao
        materia={materia}
        materias={materiasAtivas}
        topicos={topicos}
        onVoltar={() => setRegiaoSelecionada(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setTela("acampamento")}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Voltar ao acampamento
      </button>
      <MapaMundo
        materias={materiasAtivas}
        topicos={topicos}
        onSelecionarRegiao={setRegiaoSelecionada}
      />
    </div>
  );
}
