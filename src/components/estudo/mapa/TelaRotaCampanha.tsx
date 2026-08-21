"use client";

import { motion } from "framer-motion";
import { Coins, Heart, Lock, Map, Sparkles } from "lucide-react";
import { progressoDaMateria, type CampanhaRPGState } from "./campanha-rpg";
import { inimigosDaMateria } from "./inimigos-rpg";

// Caminho do mapa de UMA matéria — mesmo padrão visual sequencial de MapaRegiao.tsx (conquistado/
// atual/trancado), com o inimigo no lugar da cidade. `materia` escopa tudo: a lista de inimigos e a
// posição vêm só dessa matéria (campanha.progressoMaterias[materia]), reformulação que substitui a
// rota única do edital inteiro por mapas escolhidos pelo jogador.
export default function TelaRotaCampanha({
  materia,
  campanha,
  onEntrarCombate,
  onTrocarMapa,
  onVoltarMenu,
}: {
  materia: string;
  campanha: CampanhaRPGState;
  onEntrarCombate: () => void;
  onTrocarMapa: () => void;
  onVoltarMenu: () => void;
}) {
  const inimigos = inimigosDaMateria(materia);
  const posicaoAtual = progressoDaMateria(campanha, materia);
  const semMaisConteudo = posicaoAtual >= inimigos.length;

  return (
    <div className="rounded-2xl border border-amber-800/20 dark:border-amber-100/10 bg-gradient-to-b from-black via-zinc-950 to-black p-5 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onVoltarMenu} className="text-xs font-medium text-white/60 hover:text-white transition-colors">
            ← Menu
          </button>
          <button type="button" onClick={onTrocarMapa} className="flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white transition-colors">
            <Map className="h-3 w-3" /> Trocar de mapa
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400"><Heart className="h-3.5 w-3.5" /> {campanha.heroiHP}/{campanha.heroiHPMax}</span>
          <span className="flex items-center gap-1 text-amber-300"><Coins className="h-3.5 w-3.5" /> {campanha.ouroCorrida}</span>
          <span className="flex items-center gap-1 text-violet-300"><Sparkles className="h-3.5 w-3.5" /> {campanha.xpCorrida}</span>
        </div>
      </div>

      <h2 className="text-center text-sm font-bold text-amber-300 tracking-wide">{materia}</h2>

      {semMaisConteudo ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-white font-semibold">Você derrotou todos os inimigos deste mapa!</p>
          <p className="text-xs text-white/50 max-w-xs mx-auto">
            Mais tópicos chegam conforme novos inimigos forem desenhados. Escolha outro mapa enquanto
            isso.
          </p>
          <button
            type="button"
            onClick={onTrocarMapa}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
          >
            Trocar de mapa
          </button>
        </div>
      ) : (
        <div className="relative max-w-md mx-auto">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-amber-800/40" />
          <div className="space-y-3">
            {inimigos.map((inimigo, i) => {
              const status = i < posicaoAtual ? "vencido" : i === posicaoAtual ? "atual" : "trancado";
              return (
                <motion.div
                  key={`${inimigo.materia}:${inimigo.topico}`}
                  className="relative pl-11"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <div
                    className={`absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      status === "trancado" ? "bg-white/5" : "bg-amber-500/20 border border-amber-500/40"
                    }`}
                  >
                    {status === "trancado" ? (
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
                    <span className="text-sm font-medium">{inimigo.nome}</span>
                    <span className="block text-[11px] text-white/40">{inimigo.topico}</span>
                    {status === "atual" && <span className="text-[10px] font-semibold text-amber-400">clique para lutar</span>}
                    {status === "vencido" && <span className="text-[10px] font-semibold text-emerald-400">vencido</span>}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
