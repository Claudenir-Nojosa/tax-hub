"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, MapPin } from "lucide-react";
import type { MateriaConcurso, MateriaDef, TrilhaMeta } from "@/lib/estudo-data";
import { resolverCorMateria } from "./trilha-ui";

// Caminho sinuoso estilo Duolingo: 1 nó = 1 TrilhaMeta. Posição de cada nó (e a curva de fundo)
// vêm da MESMA função seno — nó e linha nunca desalinham porque não dependem de medição de DOM,
// só da fórmula matemática, o que também deixa tudo responsivo de graça (o SVG escala com
// preserveAspectRatio="none" e os nós usam `left` em %).

const ROW_HEIGHT = 124; // px entre nós
const AMPLITUDE = 30; // % de amplitude horizontal (a partir do centro, 50%)
const FREQ = (2 * Math.PI) / 5; // 1 ciclo completo do S a cada 5 nós
const PAD_TOP = 70;
const PAD_BOTTOM = 40;

function xDoIndice(i: number): number {
  return 50 + AMPLITUDE * Math.sin(i * FREQ);
}

interface Props {
  metas: TrilhaMeta[];
  idxAtual: number;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onSelectMeta: (numero: number) => void;
}

export default function TrilhaPath({ metas, idxAtual, materiasAtivas, onSelectMeta }: Props) {
  const atualRef = useRef<HTMLButtonElement>(null);
  const jaRolou = useRef(false);

  useEffect(() => {
    if (jaRolou.current) return;
    jaRolou.current = true;
    atualRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const altura = metas.length * ROW_HEIGHT + PAD_TOP + PAD_BOTTOM;

  // curva de fundo: amostra a mesma função seno usada nos nós, em passos finos de y (px)
  const pathD = useMemo(() => {
    const passo = 6;
    let d = "";
    for (let y = PAD_TOP; y <= altura - PAD_BOTTOM; y += passo) {
      const i = (y - PAD_TOP) / ROW_HEIGHT;
      const x = xDoIndice(i);
      d += d === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [altura]);

  return (
    <div className="relative mx-auto max-w-md" style={{ height: altura }}>
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox={`0 0 100 ${altura}`}
        preserveAspectRatio="none"
        width="100%"
        height={altura}
      >
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
          className="text-gray-300 dark:text-gray-700"
        />
      </svg>

      {metas.map((meta, i) => {
        const top = i * ROW_HEIGHT + PAD_TOP;
        const left = xDoIndice(i);
        const estado: "concluida" | "atual" | "futura" = i < idxAtual ? "concluida" : i === idxAtual ? "atual" : "futura";
        const materiaDominante = meta.atividades[0]?.materia;
        const cor = materiaDominante ? resolverCorMateria(materiaDominante, materiasAtivas) : undefined;
        const bloqueado = estado === "futura";
        const feitas = meta.atividades.filter((a) => a.status === "concluida").length;

        return (
          <motion.div
            key={meta.numero}
            className="absolute -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{ top, left: `${left}%` }}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.025, 0.6), type: "spring", stiffness: 260, damping: 20 }}
          >
            {estado === "atual" && (
              <span className="absolute -top-7 whitespace-nowrap text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> Você está aqui
              </span>
            )}
            <button
              ref={estado === "atual" ? atualRef : undefined}
              type="button"
              disabled={bloqueado}
              onClick={() => onSelectMeta(meta.numero)}
              title={`Meta ${meta.numero} — ${meta.atividades.length} atividades`}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-base shadow-md transition-transform disabled:cursor-not-allowed ${
                estado === "concluida"
                  ? "bg-emerald-500 text-white hover:scale-105"
                  : estado === "atual"
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-300 dark:ring-emerald-800 animate-pulse hover:scale-105"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              }`}
            >
              {estado === "concluida" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : estado === "futura" ? (
                <Lock className="h-5 w-5" />
              ) : (
                meta.numero
              )}
              {estado === "atual" && feitas > 0 && (
                <span className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-emerald-300 dark:border-emerald-700">
                  {feitas}
                </span>
              )}
            </button>
            {cor && estado !== "futura" && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cor.badge} max-w-[100px] truncate`}>
                {materiaDominante!.length > 16 ? materiaDominante!.slice(0, 16) + "…" : materiaDominante}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
