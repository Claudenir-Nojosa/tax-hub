"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

interface RespostaResumo {
  materia: string;
  topico: string;
  acertou: boolean;
}

interface AgregadoMateria {
  materia: string;
  acertos: number;
  erros: number;
  taxaAcerto: number;
}

interface AgregadoTopico extends AgregadoMateria {
  topico: string;
}

// mesma ideia de calcPontosFracos em RelatoriosTab.tsx — soma acertos/erros, deriva taxa, ordena —
// só que a fonte aqui é RespostaRPG (por tentativa), não TopicoState.cadernos
function agregarPorMateria(respostas: RespostaResumo[]): AgregadoMateria[] {
  const mapa = new Map<string, { acertos: number; erros: number }>();
  for (const r of respostas) {
    const cur = mapa.get(r.materia) ?? { acertos: 0, erros: 0 };
    if (r.acertou) cur.acertos++;
    else cur.erros++;
    mapa.set(r.materia, cur);
  }
  return [...mapa.entries()]
    .map(([materia, { acertos, erros }]) => ({ materia, acertos, erros, taxaAcerto: Math.round((acertos / (acertos + erros)) * 100) }))
    .sort((a, b) => b.taxaAcerto - a.taxaAcerto);
}

function agregarPorTopico(respostas: RespostaResumo[]): AgregadoTopico[] {
  const mapa = new Map<string, { materia: string; topico: string; acertos: number; erros: number }>();
  for (const r of respostas) {
    const chave = `${r.materia}||${r.topico}`;
    const cur = mapa.get(chave) ?? { materia: r.materia, topico: r.topico, acertos: 0, erros: 0 };
    if (r.acertou) cur.acertos++;
    else cur.erros++;
    mapa.set(chave, cur);
  }
  return [...mapa.values()]
    .map((v) => ({ ...v, taxaAcerto: Math.round((v.acertos / (v.acertos + v.erros)) * 100) }))
    .sort((a, b) => a.taxaAcerto - b.taxaAcerto);
}

function corTaxa(taxa: number): string {
  return taxa >= 70 ? "text-emerald-400" : taxa >= 40 ? "text-amber-400" : "text-red-400";
}
function corBarra(taxa: number): string {
  return taxa >= 70 ? "bg-emerald-500" : taxa >= 40 ? "bg-amber-500" : "bg-red-500";
}

// Estatísticas do RPG — matéria/tópico com mais/menos acerto, derivadas de RespostaRPG (histórico
// de tentativas persistido em cada combate). Volume baixo hoje (poucos inimigos), então agrega no
// cliente depois de buscar tudo — mesma simplicidade de RelatoriosTab, sem groupBy no servidor.
export default function TelaEstatisticasRPG({
  concursoId,
  onVoltarMenu,
}: {
  concursoId?: string;
  onVoltarMenu: () => void;
}) {
  const [respostas, setRespostas] = useState<RespostaResumo[] | null>(null);

  useEffect(() => {
    if (!concursoId) {
      setRespostas([]);
      return;
    }
    fetch(`/api/concurso/${concursoId}/respostas-rpg`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRespostas)
      .catch(() => setRespostas([]));
  }, [concursoId]);

  const porMateria = useMemo(() => (respostas ? agregarPorMateria(respostas) : []), [respostas]);
  const porTopico = useMemo(() => (respostas ? agregarPorTopico(respostas) : []), [respostas]);
  const totalRespostas = respostas?.length ?? 0;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-amber-800/30 bg-gradient-to-b from-black via-zinc-950 to-black p-6 space-y-5 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onVoltarMenu} className="text-xs font-medium text-white/60 hover:text-white transition-colors">
          ← Menu
        </button>
        <h2 className="text-lg font-bold text-amber-300">Estatísticas</h2>
        <div className="w-12" />
      </div>

      {respostas === null ? (
        <p className="text-center text-xs text-white/40 py-10">Carregando...</p>
      ) : totalRespostas === 0 ? (
        <p className="text-center text-xs text-white/40 py-10 max-w-xs mx-auto">
          Nenhuma luta respondida ainda — as estatísticas aparecem depois da primeira batalha.
        </p>
      ) : (
        <>
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Acerto por matéria
            </p>
            <div className="space-y-2.5">
              {porMateria.map((m, i) => (
                <motion.div
                  key={m.materia}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/85">{m.materia}</span>
                    <span className="font-mono text-white/50">
                      {m.acertos}✓ {m.erros}✗ · <span className={corTaxa(m.taxaAcerto)}>{m.taxaAcerto}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-full ${corBarra(m.taxaAcerto)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${m.taxaAcerto}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" /> Fraquezas por tópico
            </p>
            <div className="space-y-1.5">
              {porTopico.slice(0, 10).map((t, i) => (
                <motion.div
                  key={`${t.materia}::${t.topico}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="text-white/85 truncate">{t.topico}</p>
                    <p className="text-[10px] text-white/40">{t.materia}</p>
                  </div>
                  <span className={`font-mono font-semibold flex-shrink-0 ml-2 ${corTaxa(t.taxaAcerto)}`}>{t.taxaAcerto}%</span>
                </motion.div>
              ))}
              {porTopico.length > 10 && (
                <p className="text-[10px] text-white/30 text-center pt-1">+{porTopico.length - 10} tópicos a mais</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
