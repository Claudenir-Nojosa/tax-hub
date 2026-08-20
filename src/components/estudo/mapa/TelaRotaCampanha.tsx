"use client";

import { Coins, Heart, Lock, Sparkles } from "lucide-react";
import type { CampanhaRPGState } from "./campanha-rpg";
import { inimigoDoTopico } from "./inimigos-rpg";

// Caminho da corrida atual — mesmo padrão visual sequencial de MapaRegiao.tsx (conquistado/atual/
// trancado), com o inimigo no lugar da cidade. Tudo com índice < posicaoAtual já foi vencido
// NESTA corrida (não precisa checar nada além da própria `rota`/`posicaoAtual`).
export default function TelaRotaCampanha({
  campanha,
  onEntrarCombate,
  onVoltarMenu,
}: {
  campanha: CampanhaRPGState;
  onEntrarCombate: () => void;
  onVoltarMenu: () => void;
}) {
  const semMaisConteudo = campanha.posicaoAtual >= campanha.rota.length;

  return (
    <div className="rounded-2xl border border-amber-800/20 dark:border-amber-100/10 bg-gradient-to-b from-black via-zinc-950 to-black p-5 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onVoltarMenu} className="text-xs font-medium text-white/60 hover:text-white transition-colors">
          ← Menu
        </button>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400"><Heart className="h-3.5 w-3.5" /> {campanha.heroiHP}/{campanha.heroiHPMax}</span>
          <span className="flex items-center gap-1 text-amber-300"><Coins className="h-3.5 w-3.5" /> {campanha.ouroCorrida}</span>
          <span className="flex items-center gap-1 text-violet-300"><Sparkles className="h-3.5 w-3.5" /> {campanha.xpCorrida}</span>
        </div>
      </div>

      {semMaisConteudo ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-white font-semibold">Você derrotou todos os inimigos disponíveis até agora!</p>
          <p className="text-xs text-white/50 max-w-xs mx-auto">
            Mais matérias e o chefão final (a prova, 80 questões) chegam conforme novos inimigos forem
            desenhados. Volte em breve.
          </p>
        </div>
      ) : (
        <div className="relative max-w-md mx-auto">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-amber-800/40" />
          <div className="space-y-3">
            {campanha.rota.map((item, i) => {
              const inimigo = inimigoDoTopico(item.materia, item.topico);
              const status = i < campanha.posicaoAtual ? "vencido" : i === campanha.posicaoAtual ? "atual" : "trancado";
              return (
                <div key={`${item.materia}:${item.topico}`} className="relative pl-11">
                  <div
                    className={`absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      status === "trancado" ? "bg-white/5" : "bg-amber-500/20 border border-amber-500/40"
                    }`}
                  >
                    {status === "trancado" || !inimigo ? (
                      <Lock className="h-4 w-4 text-white/30" />
                    ) : (
                      <img src={inimigo.sprite} alt={inimigo.nome} className="h-9 w-9 object-contain" style={{ imageRendering: "pixelated" }} />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={status !== "atual"}
                    onClick={status === "atual" ? onEntrarCombate : undefined}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      status === "trancado"
                        ? "border-white/10 text-white/30 cursor-default"
                        : status === "vencido"
                        ? "border-emerald-500/30 text-white/60"
                        : "border-amber-500/50 hover:bg-amber-500/10 text-white cursor-pointer"
                    }`}
                  >
                    <span className="text-sm font-medium">{inimigo?.nome ?? item.topico}</span>
                    <span className="block text-[11px] text-white/40">{item.topico}</span>
                    {status === "atual" && <span className="text-[10px] font-semibold text-amber-400">clique para lutar</span>}
                    {status === "vencido" && <span className="text-[10px] font-semibold text-emerald-400">vencido</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
