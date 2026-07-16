"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star } from "lucide-react";
import type { MateriaConcurso, MateriaDef, TrilhaMeta } from "@/lib/estudo-data";
import { resolverCorMateria } from "./trilha-ui";

// Caminho sinuoso estilo Duolingo: 1 nó = 1 TrilhaMeta = 1 TÓPICO de 1 matéria. Posição de cada
// nó (e a curva de fundo) vêm da MESMA função seno — nó e linha nunca desalinham porque não
// dependem de medição de DOM, só da fórmula matemática, o que também deixa tudo responsivo de
// graça (o SVG escala com preserveAspectRatio="none" e os nós usam `left` em %).
//
// Visual: nó colorido pela COR DA MATÉRIA (resolverCorMateria — mesmo dot do Edital/Ciclo), com
// "profundidade" 3D via inset shadow no rodapé (efeito botão do Duolingo — funciona com qualquer
// cor de fundo, sem precisar da variante escura de cada Tailwind color). Abaixo de cada nó, o
// NOME DO TÓPICO — a meta é literalmente "conclua a teoria deste tópico", então o caminho já
// conta a história inteira sem precisar abrir o painel.

const ROW_HEIGHT = 152; // px entre nós (espaço pro rótulo do tópico)
const AMPLITUDE = 28; // % de amplitude horizontal (a partir do centro, 50%)
const FREQ = (2 * Math.PI) / 5; // 1 ciclo completo do S a cada 5 nós
const PAD_TOP = 84;
const PAD_BOTTOM = 56;

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

  // trecho já percorrido da curva (até o nó atual) — pintado de verde sólido por cima do
  // pontilhado cinza, pra dar sensação de progresso no próprio caminho
  const pathPercorrido = useMemo(() => {
    if (idxAtual <= 0) return "";
    const passo = 6;
    const yFim = idxAtual * ROW_HEIGHT + PAD_TOP;
    let d = "";
    for (let y = PAD_TOP; y <= yFim; y += passo) {
      const i = (y - PAD_TOP) / ROW_HEIGHT;
      const x = xDoIndice(i);
      d += d === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [idxAtual]);

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
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="1 6"
          vectorEffect="non-scaling-stroke"
          className="text-gray-300 dark:text-gray-700"
        />
        {pathPercorrido && (
          <path
            d={pathPercorrido}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="text-emerald-400/70 dark:text-emerald-600/60"
          />
        )}
      </svg>

      {metas.map((meta, i) => {
        const top = i * ROW_HEIGHT + PAD_TOP;
        const left = xDoIndice(i);
        const estado: "concluida" | "atual" | "futura" = i < idxAtual ? "concluida" : i === idxAtual ? "atual" : "futura";
        const atividade = meta.atividades[0];
        const materia = atividade?.materia;
        const cor = materia ? resolverCorMateria(materia, materiasAtivas) : undefined;
        const bloqueado = estado === "futura";
        // metas novas têm sempre 1 tópico; trilhas antigas persistidas podem ter mais — junta
        const topico = meta.atividades.flatMap((a) => a.topicos).join(" · ");

        return (
          <motion.div
            key={meta.numero}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ top, left: `${left}%` }}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.5), type: "spring", stiffness: 260, damping: 20 }}
          >
            {estado === "atual" && (
              <motion.span
                className="absolute -top-9 z-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300 bg-white dark:bg-gray-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl px-2.5 py-1 shadow-sm"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                Você está aqui
                <span className="absolute left-1/2 -bottom-[7px] -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-gray-900 border-b-2 border-r-2 border-emerald-300 dark:border-emerald-700" />
              </motion.span>
            )}

            <button
              ref={estado === "atual" ? atualRef : undefined}
              type="button"
              disabled={bloqueado}
              onClick={() => onSelectMeta(meta.numero)}
              title={`Meta ${meta.numero} — ${topico}`}
              className={`relative w-[68px] h-[64px] rounded-[28px] flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                bloqueado
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 shadow-[inset_0_-5px_0_rgba(0,0,0,0.12)] dark:shadow-[inset_0_-5px_0_rgba(0,0,0,0.35)]"
                  : `${cor?.dot ?? "bg-emerald-500"} text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.22)] hover:brightness-105 active:shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)] active:translate-y-[3px]`
              } ${estado === "atual" ? "ring-4 ring-offset-2 ring-emerald-300 dark:ring-emerald-700 dark:ring-offset-gray-950" : ""}`}
            >
              {estado === "concluida" ? (
                <Check className="h-7 w-7" strokeWidth={3.5} />
              ) : estado === "futura" ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Star className="h-7 w-7 fill-current" />
              )}
            </button>

            <div className="mt-2 flex flex-col items-center gap-1 w-[150px]">
              {cor && (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${bloqueado ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500" : cor.badge} max-w-full truncate`}>
                  {materia}
                </span>
              )}
              <span
                className={`text-[10px] leading-tight text-center line-clamp-2 ${
                  bloqueado ? "text-gray-400 dark:text-gray-600" : "text-gray-600 dark:text-gray-300 font-medium"
                }`}
                title={topico}
              >
                {topico}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
