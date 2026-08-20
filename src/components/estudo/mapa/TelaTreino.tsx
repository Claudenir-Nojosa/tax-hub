"use client";

import { useRef, useState } from "react";
import { Check, Coins, Sparkles, X } from "lucide-react";
import type { JogoRPGState } from "@/lib/estudo-data";

// Protótipo — pedido do usuário: só UMA pergunta de exemplo, pra ver como fica a "luta" antes de
// decidir se vale construir o sistema de verdade (banco de questões real, várias rodadas, XP etc.).
const PERGUNTA_EXEMPLO = {
  enunciado: "Qual princípio da Administração Pública veda a busca de vantagem pessoal no exercício da função?",
  alternativas: [
    { letra: "A", texto: "Moralidade" },
    { letra: "B", texto: "Impessoalidade" },
    { letra: "C", texto: "Publicidade" },
    { letra: "D", texto: "Eficiência" },
  ],
  correta: "B",
};

const HP_HEROI_MAX = 28;
const HP_NERDAO_MAX = 30;
// dano de acerto tunado pra derrubar o Nerdão de uma vez só — é um protótipo de 1 pergunta, sem
// isso a animação de vitória pedida nunca apareceria nesta demo (balanceamento de verdade fica
// pra quando isso virar o sistema real, com várias rodadas)
const DANO_ACERTO = HP_NERDAO_MAX;
const DANO_ERRO = 12;
// recompensa por derrotar o Nerdão — refazer a mesma luta ("Lutar de novo") concede de novo, sem
// limite; aceitável pra este protótipo de 1 pergunta só, mas isso muda quando entrar o banco de
// questões real (cada mob passa a exigir uma pergunta nova/não repetida pra valer recompensa)
const OURO_NERDAO = 10;
const XP_NERDAO = 15;

function BarraHP({ atual, max, cor }: { atual: number; max: number; cor: string }) {
  const pct = Math.max(0, Math.round((atual / max) * 100));
  return (
    <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-white/10 flex-1">
      <div className={`h-full ${cor} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TelaTreino({
  telaCheia,
  jogoRPG,
  onUpdateJogoRPG,
  onVoltar,
}: {
  telaCheia: boolean;
  jogoRPG: JogoRPGState;
  onUpdateJogoRPG: (jogo: JogoRPGState) => void;
  onVoltar: () => void;
}) {
  const [hpNerdao, setHpNerdao] = useState(HP_NERDAO_MAX);
  const [hpHeroi, setHpHeroi] = useState(HP_HEROI_MAX);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [animacao, setAnimacao] = useState<"dano-nerdao" | "dano-heroi" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const vitoria = hpNerdao <= 0;

  const responder = (letra: string) => {
    if (selecionada) return;
    setSelecionada(letra);
    const certo = letra === PERGUNTA_EXEMPLO.correta;
    setAnimacao(certo ? "dano-nerdao" : "dano-heroi");
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnimacao(null), 450);
    if (certo) {
      setHpNerdao((h) => Math.max(0, h - DANO_ACERTO));
      onUpdateJogoRPG({ gold: jogoRPG.gold + OURO_NERDAO, xp: jogoRPG.xp + XP_NERDAO });
    } else {
      setHpHeroi((h) => Math.max(0, h - DANO_ERRO));
    }
  };

  const reiniciar = () => {
    setHpNerdao(HP_NERDAO_MAX);
    setHpHeroi(HP_HEROI_MAX);
    setSelecionada(null);
    setAnimacao(null);
  };

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-2xl border border-amber-900/40"
      style={
        telaCheia
          ? { aspectRatio: "1402 / 1122", height: "100vh", maxWidth: "100vw" }
          : { aspectRatio: "1402 / 1122", width: "100%", maxWidth: 900 }
      }
    >
      <style>{`
        @keyframes treino-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-9px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
        @keyframes treino-flash { 0%,100% { filter: brightness(1); } 25% { filter: brightness(2.8); } }
        @keyframes treino-cair { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(28px) rotate(88deg); opacity: 0; } }
        @keyframes treino-banner { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .treino-shake { animation: treino-shake 0.4s ease-in-out; }
        .treino-flash { animation: treino-flash 0.35s ease-in-out; }
        .treino-cair { animation: treino-cair 0.7s ease-in forwards; }
        .treino-banner { animation: treino-banner 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      <img
        src="/cenarios/campo-de-treino.png"
        alt="Campo de treinamento"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      <button
        type="button"
        onClick={onVoltar}
        className="absolute top-3 left-3 text-xs font-medium text-white/80 hover:text-white bg-black/50 hover:bg-black/65 px-2.5 py-1.5 rounded-md transition-colors"
      >
        ← Voltar
      </button>

      {/* Nerdão — topo, grande, de frente pro jogador */}
      <div className="absolute left-1/2 top-[18%] -translate-x-1/2">
        <img
          src="/personagens/nerdao.png"
          alt="Nerdão"
          className={`${animacao === "dano-nerdao" ? "treino-shake treino-flash" : ""} ${vitoria ? "treino-cair" : ""}`}
          style={{ height: telaCheia ? 190 : 130, imageRendering: "pixelated" }}
        />
      </div>

      {/* Ladino — mais perto, de costas, encarando o inimigo */}
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2">
        <img
          src="/personagens/ladino-cima.png"
          alt="Você"
          className={animacao === "dano-heroi" ? "treino-shake treino-flash" : ""}
          style={{ height: telaCheia ? 120 : 82, imageRendering: "pixelated" }}
        />
      </div>

      {vitoria && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-8%" }}>
          <div className="treino-banner bg-black/75 border-2 border-amber-400 rounded-xl px-8 py-3.5 flex flex-col items-center gap-1.5">
            <p className="text-2xl font-bold text-amber-300 tracking-wide text-center">Vitória!</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-mono font-semibold text-amber-300">
                <Coins className="h-4 w-4" /> +{OURO_NERDAO}
              </span>
              <span className="flex items-center gap-1 text-sm font-mono font-semibold text-violet-300">
                <Sparkles className="h-4 w-4" /> +{XP_NERDAO} XP
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-amber-900/40 p-3 space-y-2.5">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] text-white/70 w-12 flex-shrink-0">Você</span>
            <BarraHP atual={hpHeroi} max={HP_HEROI_MAX} cor="bg-emerald-500" />
            <span className="text-[10px] text-white/50 font-mono w-10 text-right flex-shrink-0">{hpHeroi}/{HP_HEROI_MAX}</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] text-white/70 w-12 flex-shrink-0">Nerdão</span>
            <BarraHP atual={hpNerdao} max={HP_NERDAO_MAX} cor="bg-red-500" />
            <span className="text-[10px] text-white/50 font-mono w-10 text-right flex-shrink-0">{hpNerdao}/{HP_NERDAO_MAX}</span>
          </div>
        </div>

        {!vitoria && (
          <>
            <p className="text-sm text-white leading-snug">{PERGUNTA_EXEMPLO.enunciado}</p>
            <div className="grid grid-cols-2 gap-2">
              {PERGUNTA_EXEMPLO.alternativas.map((alt) => {
                const ehCorreta = alt.letra === PERGUNTA_EXEMPLO.correta;
                const ehSelecionada = alt.letra === selecionada;
                let estilo = "border-white/15 text-white/85 hover:border-white/35 hover:bg-white/5";
                if (selecionada) {
                  if (ehCorreta) estilo = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
                  else if (ehSelecionada) estilo = "border-red-500 bg-red-500/15 text-red-300";
                  else estilo = "border-white/10 text-white/40";
                }
                return (
                  <button
                    key={alt.letra}
                    type="button"
                    disabled={!!selecionada}
                    onClick={() => responder(alt.letra)}
                    className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-xs transition-colors ${estilo}`}
                  >
                    <span className="font-mono font-semibold">{alt.letra}</span>
                    <span className="flex-1">{alt.texto}</span>
                    {selecionada && ehCorreta && <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                    {selecionada && ehSelecionada && !ehCorreta && <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            {selecionada && (
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-xs text-red-400 font-medium">Errou — você tomou dano.</p>
                <button type="button" onClick={reiniciar} className="text-[11px] font-medium text-white/60 hover:text-white transition-colors">
                  Tentar de novo
                </button>
              </div>
            )}
          </>
        )}
        {vitoria && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-400 font-medium">Você derrotou o Nerdão!</p>
            <button type="button" onClick={reiniciar} className="text-[11px] font-medium text-white/60 hover:text-white transition-colors">
              Lutar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
