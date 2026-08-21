"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Backpack, BarChart3, Compass, Map, Swords } from "lucide-react";
import type { CampanhaRPGState } from "./campanha-rpg";

// Tela de entrada do RPG — menu de verdade, mesmo padrão de jogo (Nova Campanha/Continuar/Mapa/
// Itens/Estatísticas). `campanha` vem de MapaTab (pode ser null se o usuário nunca começou uma).
// "Nova campanha"/"Continuar" levam pra Seleção de Mapa (decidido por quem chama) — o menu não
// precisa saber disso, só dispara a intenção.
export default function TelaMenu({
  campanha,
  onNovaCampanha,
  onContinuar,
  onIrParaMapa,
  onVerEstatisticas,
}: {
  campanha: CampanhaRPGState | null;
  onNovaCampanha: () => void;
  onContinuar: () => void;
  onIrParaMapa: () => void;
  onVerEstatisticas: () => void;
}) {
  const [itensAbertos, setItensAbertos] = useState(false);
  const emAndamento = campanha?.status === "em_andamento";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative w-full max-w-md mx-auto rounded-2xl border-2 border-amber-600/30 bg-gradient-to-b from-black via-zinc-950 to-black p-8 space-y-6 shadow-[inset_0_1px_0_rgba(251,191,36,0.12),0_0_40px_rgba(0,0,0,0.5)]"
    >
      <div className="text-center space-y-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-amber-400/70">Curso Regular · Área Fiscal</p>
        <h2 className="text-2xl font-bold text-white tracking-wide">O Continente do Conhecimento</h2>
      </div>

      {!itensAbertos ? (
        <div className="space-y-2.5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNovaCampanha}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            <Swords className="h-4 w-4" /> {emAndamento ? "Recomeçar campanha" : "Nova campanha"}
          </motion.button>
          {emAndamento && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onContinuar}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/15"
            >
              <Compass className="h-4 w-4" /> Continuar campanha
            </motion.button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onIrParaMapa}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 font-medium text-sm transition-colors border border-white/10"
          >
            <Map className="h-4 w-4" /> Ir para o mapa (modo livre)
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onVerEstatisticas}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 font-medium text-sm transition-colors border border-white/10"
          >
            <BarChart3 className="h-4 w-4" /> Estatísticas
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setItensAbertos(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 font-medium text-sm transition-colors border border-white/10"
          >
            <Backpack className="h-4 w-4" /> Itens
          </motion.button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <p className="text-[11px] text-white/50 uppercase tracking-wide">Tópicos vencidos</p>
              <p className="text-xl font-bold text-white font-mono">{campanha?.topicosVencidosTotal.length ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
              <p className="text-[11px] text-white/50 uppercase tracking-wide">XP permanente</p>
              <p className="text-xl font-bold text-white font-mono">{campanha?.xpPermanente ?? 0}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1.5">Itens</p>
            {campanha && campanha.itens.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {campanha.itens.map((item) => (
                  <span key={item} className="text-xs bg-white/10 border border-white/15 text-white/85 px-2 py-1 rounded-md">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">Nenhum item ainda — chegam numa próxima fase.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setItensAbertos(false)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors border border-white/10"
          >
            ← Voltar
          </button>
        </div>
      )}
    </motion.div>
  );
}
