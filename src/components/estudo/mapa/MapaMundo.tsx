"use client";

import { useState } from "react";
import Image from "next/image";
import { analisarMateria } from "@/lib/trilha-dinamica";
import type { MateriaConcurso, MateriaDef, TopicoState } from "@/lib/estudo-data";
import { REGIOES_CONTINENTE } from "./mapa-regioes";

// Mapa do mundo — "O Continente do Conhecimento" (public/mapa/continente-conhecimento.png), arte
// real com as 21 cidades já desenhadas. A camada interativa é só os PINOS por cima: posição fixa
// (mapa-regioes.ts, mapeado à mão pelo usuário), progresso ao vivo (analisarMateria), sem nenhum
// ícone/forma nova desenhada — a cidade em si já é a arte. Regiões sem posição mapeada (matéria
// nova que a arte ainda não cobre) ou sem correspondência na arte (nome não bate) ficam de fora em
// silêncio — não quebram o mapa, só não aparecem.
export default function MapaMundo({
  materias,
  topicos,
  onSelecionarRegiao,
}: {
  materias: (MateriaConcurso | MateriaDef)[];
  topicos: Record<string, TopicoState>;
  onSelecionarRegiao: (nomeMateria: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-800/20 dark:border-amber-100/10">
      <div className="relative w-full" style={{ aspectRatio: "1536 / 1024" }}>
        <Image
          src="/mapa/continente-conhecimento.png"
          alt="Mapa do Continente do Conhecimento — cada cidade é uma matéria do edital"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 960px"
          className="object-cover select-none pointer-events-none"
        />

        {REGIOES_CONTINENTE.map((r) => {
          const m = materias.find((x) => x.nome === r.materia);
          if (!m) return null;
          const analise = analisarMateria(m, topicos);
          const perc = analise.totalTopicos > 0 ? Math.round((analise.topicosEstudados / analise.totalTopicos) * 100) : 0;
          const status = perc === 100 ? "conquistada" : perc > 0 ? "em_progresso" : "intocada";
          const aberto = hover === r.materia;
          return (
            <button
              key={r.materia}
              type="button"
              onClick={() => onSelecionarRegiao(r.materia)}
              onMouseEnter={() => setHover(r.materia)}
              onMouseLeave={() => setHover((v) => (v === r.materia ? null : v))}
              onFocus={() => setHover(r.materia)}
              onBlur={() => setHover((v) => (v === r.materia ? null : v))}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110 focus:scale-110 outline-none"
              style={{ left: `${r.x}%`, top: `${r.y}%`, width: "9%", aspectRatio: "1 / 1" }}
              title={r.materia}
            >
              <span
                className={`absolute inset-0 rounded-full ring-2 transition-all ${
                  status === "conquistada"
                    ? "ring-amber-400/90 shadow-[0_0_16px_2px_rgba(251,191,36,0.55)]"
                    : status === "em_progresso"
                    ? "ring-emerald-400/80"
                    : "ring-white/25 grayscale-[60%] brightness-[0.65]"
                } ${aberto ? "ring-[3px]" : ""}`}
              />
              <span className="absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-black/75 text-white text-[10px] font-mono font-semibold flex items-center justify-center border border-white/20">
                {perc}%
              </span>
              {aberto && (
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap rounded-md bg-black/80 text-white text-[11px] font-medium px-2 py-1 pointer-events-none">
                  {r.materia}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
