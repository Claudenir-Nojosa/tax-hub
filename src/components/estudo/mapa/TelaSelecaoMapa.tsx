"use client";

import { motion } from "framer-motion";
import { Lock, Swords } from "lucide-react";
import { CORES_MATERIA, type MateriaConcurso } from "@/lib/estudo-data";
import { progressoDaMateria, type CampanhaRPGState } from "./campanha-rpg";
import { inimigosDaMateria, materiasComInimigos } from "./inimigos-rpg";

const listaVariants = {
  oculto: {},
  visivel: { transition: { staggerChildren: 0.05 } },
} as const;
const cardVariants = {
  oculto: { opacity: 0, y: 14, scale: 0.96 },
  visivel: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

// Cada mapa = uma matéria do concurso. Só as que já têm inimigo desenhado (materiasComInimigos)
// ficam clicáveis — o resto aparece com selo "Em breve", lacuna de conteúdo real, não escondida.
export default function TelaSelecaoMapa({
  materiasConcurso,
  campanha,
  onSelecionarMateria,
  onVoltarMenu,
}: {
  materiasConcurso: MateriaConcurso[];
  campanha: CampanhaRPGState;
  onSelecionarMateria: (materia: string) => void;
  onVoltarMenu: () => void;
}) {
  const jogaveis = new Set(materiasComInimigos());

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-amber-800/30 bg-gradient-to-b from-black via-zinc-950 to-black p-6 space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onVoltarMenu} className="text-xs font-medium text-white/60 hover:text-white transition-colors">
          ← Menu
        </button>
        <h2 className="text-lg font-bold text-amber-300 tracking-wide">Escolha seu mapa</h2>
        <div className="w-12" />
      </div>

      <motion.div
        variants={listaVariants}
        initial="oculto"
        animate="visivel"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      >
        {materiasConcurso.map((materia) => {
          const desbloqueado = jogaveis.has(materia.nome);
          const total = desbloqueado ? inimigosDaMateria(materia.nome).length : 0;
          const vencidos = desbloqueado ? progressoDaMateria(campanha, materia.nome) : 0;
          const completo = desbloqueado && vencidos >= total;
          const corDot = CORES_MATERIA[materia.cor]?.dot ?? "bg-amber-500";

          return (
            <motion.button
              key={materia.id}
              type="button"
              variants={cardVariants}
              whileHover={desbloqueado ? { scale: 1.03, y: -2 } : undefined}
              whileTap={desbloqueado ? { scale: 0.98 } : undefined}
              disabled={!desbloqueado}
              onClick={() => desbloqueado && onSelecionarMateria(materia.nome)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                desbloqueado
                  ? completo
                    ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15 cursor-pointer"
                    : "border-amber-500/40 bg-white/5 hover:bg-white/10 cursor-pointer shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]"
                  : "border-white/10 bg-white/[0.02] cursor-not-allowed opacity-60"
              }`}
            >
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${desbloqueado ? "bg-amber-500/20" : "bg-white/5"}`}>
                {desbloqueado ? (
                  <span className={`h-2.5 w-2.5 rounded-full ${corDot}`} />
                ) : (
                  <Lock className="h-4 w-4 text-white/30" />
                )}
              </div>
              <span className={`text-xs font-semibold leading-tight ${desbloqueado ? "text-white" : "text-white/40"}`}>
                {materia.nome}
              </span>
              {desbloqueado ? (
                <span className={`text-[10px] font-mono ${completo ? "text-emerald-400" : "text-amber-400/80"}`}>
                  {completo ? (
                    <span className="flex items-center gap-1"><Swords className="h-3 w-3" /> Conquistado</span>
                  ) : (
                    `${vencidos}/${total} vencidos`
                  )}
                </span>
              ) : (
                <span className="text-[10px] text-white/30">Em breve</span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
