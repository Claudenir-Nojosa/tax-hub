"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

// Protótipo — pedido do usuário: só UMA pergunta de exemplo, pra ver como fica a "luta" antes de
// decidir se vale construir o sistema de verdade (banco de questões real, várias rodadas, vitória/
// derrota, XP etc.). Nada disso está aqui ainda, de propósito.
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
const DANO_ACERTO = 10;
const DANO_ERRO = 8;

function BarraHP({ atual, max, cor }: { atual: number; max: number; cor: string }) {
  const pct = Math.max(0, Math.round((atual / max) * 100));
  return (
    <div className="w-28">
      <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
        <div className={`h-full ${cor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-white/70 text-center mt-0.5 font-mono">{atual}/{max}</p>
    </div>
  );
}

export default function TelaTreino({ onVoltar }: { onVoltar: () => void }) {
  const [hpNerdao, setHpNerdao] = useState(HP_NERDAO_MAX);
  const [hpHeroi, setHpHeroi] = useState(HP_HEROI_MAX);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const acertou = selecionada ? selecionada === PERGUNTA_EXEMPLO.correta : null;

  const responder = (letra: string) => {
    if (selecionada) return;
    setSelecionada(letra);
    if (letra === PERGUNTA_EXEMPLO.correta) setHpNerdao((h) => Math.max(0, h - DANO_ACERTO));
    else setHpHeroi((h) => Math.max(0, h - DANO_ERRO));
  };

  const reiniciar = () => {
    setHpNerdao(HP_NERDAO_MAX);
    setHpHeroi(HP_HEROI_MAX);
    setSelecionada(null);
  };

  return (
    <div className="rounded-2xl border border-amber-800/20 dark:border-amber-100/10 bg-gradient-to-b from-emerald-950 to-black p-5 space-y-5 max-w-lg mx-auto">
      <button type="button" onClick={onVoltar} className="text-xs font-medium text-white/60 hover:text-white transition-colors">
        ← Voltar ao acampamento
      </button>

      <div className="flex items-end justify-center gap-8">
        <div className="flex flex-col items-center gap-1.5">
          <img src="/personagens/ladino-baixo.png" alt="Você" style={{ height: 88, imageRendering: "pixelated" }} />
          <span className="text-xs text-white font-medium">Você</span>
          <BarraHP atual={hpHeroi} max={HP_HEROI_MAX} cor="bg-emerald-500" />
        </div>
        <span className="text-base font-bold text-amber-400 pb-10">VS</span>
        <div className="flex flex-col items-center gap-1.5">
          <img
            src="/personagens/nerdao.png"
            alt="Nerdão"
            style={{ height: 88, imageRendering: "pixelated" }}
            className={selecionada && acertou ? "opacity-50 grayscale transition-all duration-500" : "transition-all duration-500"}
          />
          <span className="text-xs text-white font-medium">Nerdão</span>
          <BarraHP atual={hpNerdao} max={HP_NERDAO_MAX} cor="bg-red-500" />
        </div>
      </div>

      <div className="bg-black/40 rounded-xl p-4 space-y-3">
        <p className="text-sm text-white leading-relaxed">{PERGUNTA_EXEMPLO.enunciado}</p>
        <div className="grid gap-2">
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
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors ${estilo}`}
              >
                <span className="font-mono font-semibold">{alt.letra}</span>
                <span className="flex-1">{alt.texto}</span>
                {selecionada && ehCorreta && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                {selecionada && ehSelecionada && !ehCorreta && <X className="h-4 w-4 text-red-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        {selecionada && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className={`text-xs font-medium ${acertou ? "text-emerald-400" : "text-red-400"}`}>
              {acertou ? "Acertou! Dano no Nerdão." : "Errou — você tomou dano."}
            </p>
            <button
              type="button"
              onClick={reiniciar}
              className="text-[11px] font-medium text-white/60 hover:text-white transition-colors"
            >
              Tentar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
