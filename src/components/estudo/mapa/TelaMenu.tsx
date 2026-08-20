"use client";

import { useState } from "react";
import { Backpack, Compass, Map, Swords } from "lucide-react";
import type { CampanhaRPGState } from "./campanha-rpg";

// Tela de entrada do RPG — menu de verdade, mesmo padrão de jogo (Nova Campanha/Continuar/Mapa/
// Estatísticas). `campanha` vem de MapaTab (pode ser null se o usuário nunca começou uma).
export default function TelaMenu({
  campanha,
  onNovaCampanha,
  onContinuar,
  onIrParaMapa,
}: {
  campanha: CampanhaRPGState | null;
  onNovaCampanha: () => void;
  onContinuar: () => void;
  onIrParaMapa: () => void;
}) {
  const [estatisticasAbertas, setEstatisticasAbertas] = useState(false);
  const emAndamento = campanha?.status === "em_andamento";

  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl border border-amber-800/20 dark:border-amber-100/10 bg-gradient-to-b from-black via-zinc-950 to-black p-8 space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-amber-400/70">Curso Regular · Área Fiscal</p>
        <h2 className="text-2xl font-bold text-white tracking-wide">O Continente do Conhecimento</h2>
      </div>

      {!estatisticasAbertas ? (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onNovaCampanha}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            <Swords className="h-4 w-4" /> {emAndamento ? "Recomeçar campanha" : "Nova campanha"}
          </button>
          {emAndamento && (
            <button
              type="button"
              onClick={onContinuar}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/15"
            >
              <Compass className="h-4 w-4" /> Continuar campanha
            </button>
          )}
          <button
            type="button"
            onClick={onIrParaMapa}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 font-medium text-sm transition-colors border border-white/10"
          >
            <Map className="h-4 w-4" /> Ir para o mapa (modo livre)
          </button>
          <button
            type="button"
            onClick={() => setEstatisticasAbertas(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/85 font-medium text-sm transition-colors border border-white/10"
          >
            <Backpack className="h-4 w-4" /> Itens e estatísticas
          </button>
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
            onClick={() => setEstatisticasAbertas(false)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors border border-white/10"
          >
            ← Voltar
          </button>
        </div>
      )}
    </div>
  );
}
