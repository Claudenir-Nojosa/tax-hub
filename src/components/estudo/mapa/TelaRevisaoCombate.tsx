"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import type { QuestaoErrada } from "./TelaCombateCampanha";

interface DicaResposta {
  dicas: { index: number; dica: string }[];
}

// Revisão de fim de combate — só as questões ERRADAS daquela luta (≥1, quem chama já garante).
// Busca uma dica de IA em LOTE (uma chamada só pra todas as erradas dessa luta) comparando a
// alternativa marcada com a correta. Não bloqueia o resto do jogo: "Continuar" segue mesmo se a
// IA falhar (mostra as alternativas certa/errada de qualquer forma, só a dica fica ausente).
export default function TelaRevisaoCombate({
  erradas,
  onContinuar,
}: {
  erradas: QuestaoErrada[];
  onContinuar: () => void;
}) {
  const [dicas, setDicas] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch("/api/ai/rpg-bizu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: erradas.map((e) => ({
          enunciado: e.enunciado,
          alternativas: e.alternativas,
          materia: e.materia,
          topico: e.topico,
          marcada: e.marcada,
          correta: e.correta,
        })),
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: DicaResposta) => {
        const mapa: Record<number, string> = {};
        for (const d of data.dicas ?? []) mapa[d.index] = d.dica;
        setDicas(mapa);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem, uma luta = uma revisão
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-amber-800/30 bg-gradient-to-b from-black via-zinc-950 to-black p-6 space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="text-center space-y-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-red-400/70">Revisão de combate</p>
        <h2 className="text-lg font-bold text-white">
          {erradas.length === 1 ? "1 questão pra revisar" : `${erradas.length} questões pra revisar`}
        </h2>
      </div>

      <div className="space-y-3">
        {erradas.map((e, i) => (
          <motion.div
            key={`${e.questaoRPGId}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2.5"
          >
            <p className="text-[10px] font-mono uppercase tracking-wide text-white/40">{e.materia} · {e.topico}</p>
            <p className="text-sm text-white/90">{e.enunciado}</p>
            <div className="space-y-1">
              {Object.entries(e.alternativas).map(([letra, texto]) => {
                const ehCorreta = letra === e.correta;
                const ehMarcada = letra === e.marcada;
                if (!ehCorreta && !ehMarcada) return null;
                return (
                  <div
                    key={letra}
                    className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                      ehCorreta ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {ehCorreta ? <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> : <X className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                    <span>
                      <span className="font-mono font-semibold">{letra})</span> {texto}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90">
                {carregando ? "Gerando dica..." : erro ? "Não consegui gerar a dica agora." : dicas[i] ?? "Sem dica pra essa questão."}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinuar}
        className="w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
      >
        Continuar
      </button>
    </div>
  );
}
