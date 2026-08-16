"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Star, Trophy, XCircle } from "lucide-react";
import { calcularProximaRevisao, type Carta } from "@/lib/estudo-data";
import { CARTA_CONFIG } from "./carta-config";
import TextoCarta, { temLacuna } from "./carta-texto";

export default function SessaoRevisao({
  cartasParaRevisar,
  onConcluir,
}: {
  cartasParaRevisar: Carta[];
  onConcluir: (atualizadas: Carta[]) => void;
}) {
  const fila = useMemo(
    () => [...cartasParaRevisar].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [resultado, setResultado] = useState<Carta[]>([]);
  const [xpGanho, setXpGanho] = useState(0);
  const [xpFlash, setXpFlash] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const carta = fila[idx];

  function avaliar(qualidade: 0 | 1 | 2 | 3 | 4 | 5) {
    let atualizada = calcularProximaRevisao(carta, qualidade);
    // Escalação: 3+ erros acumulados → Boss (salva tipo original)
    if (atualizada.erros >= 3 && atualizada.tipo !== "boss") {
      atualizada = { ...atualizada, tipoOriginal: atualizada.tipo, tipo: "boss" };
    }
    // Regressão: Boss com 3 acertos consecutivos → volta ao tipo original
    if (atualizada.tipo === "boss" && atualizada.repeticoes >= 3 && atualizada.tipoOriginal) {
      atualizada = { ...atualizada, tipo: atualizada.tipoOriginal, tipoOriginal: undefined, erros: 0 };
    }
    const novoResultado = [...resultado, atualizada];
    const xpExtra = qualidade >= 3 ? 2 : 0;
    const novoXP = xpGanho + xpExtra;
    if (xpExtra > 0) {
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 900);
    }
    if (idx + 1 >= fila.length) {
      setResultado(novoResultado);
      setXpGanho(novoXP);
      setConcluido(true);
    } else {
      setResultado(novoResultado);
      setXpGanho(novoXP);
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  if (concluido) {
    const acertos = resultado.filter((_, i) => fila[i] && resultado[i].acertos > fila[i].acertos).length;
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <Trophy className="h-20 w-20 text-amber-400 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-1">Sessão concluída!</h2>
        <p className="text-muted-foreground mb-4">
          {fila.length} carta{fila.length !== 1 ? "s" : ""} revisada{fila.length !== 1 ? "s" : ""}
        </p>
        <div className="text-4xl font-bold text-amber-500 mb-2">+{xpGanho} XP ⚡</div>
        <p className="text-sm text-muted-foreground mb-8">
          {acertos} acerto{acertos !== 1 ? "s" : ""} · {fila.length - acertos} erro{fila.length - acertos !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => onConcluir(resultado)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-semibold transition-all"
        >
          Ver Baralhos
        </button>
      </div>
    );
  }

  const cfg = CARTA_CONFIG[carta.tipo];
  const Icon = cfg.icone;
  // Tesouro autorado no formato novo (frase com {{lacuna}} marcada na própria frente) vira um
  // cloze de verdade — mesma frase, lacuna revelada no lugar ao virar, sem recap de "Pergunta"
  // separado (seria redundante mostrar a mesma frase duas vezes). Tesouro antigo (sem {{}}, frente
  // com "___" literal e verso como texto solto) cai no fallback genérico de sempre — nunca quebra
  // carta já existente.
  const clozeAtivo = carta.tipo === "tesouro" && temLacuna(carta.frente);

  return (
    <div className="flex flex-col items-center px-2">
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-medium">{idx + 1} / {fila.length} cartas</span>
          <span className="text-amber-500 font-bold">+{xpGanho} XP</span>
        </div>
        <div className="bg-muted dark:bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${(idx / fila.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={`relative w-full max-w-lg rounded-2xl border-2 ${cfg.borda} bg-gradient-to-b ${cfg.cor} shadow-2xl ${cfg.glow} p-6 mb-6 min-h-[320px] flex flex-col overflow-hidden`}>
        {xpFlash && (
          <div className="absolute top-3 right-4 text-amber-400 font-bold text-xl pointer-events-none animate-bounce">
            +2 XP ⚡
          </div>
        )}

        {/* Badge */}
        <div className={`inline-flex items-center gap-1.5 ${cfg.badge} rounded-full px-3 py-1 mb-4 w-fit`}>
          <Icon className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-bold text-white tracking-wider">{cfg.texto}</span>
        </div>

        {/* Imagem da carta */}
        <div className="flex items-center justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cfg.imagem}
            alt={cfg.nome}
            className="h-28 w-28 object-contain drop-shadow-2xl"
          />
        </div>

        {!flipped ? (
          <div className="flex flex-col flex-1">
            <TextoCarta
              texto={carta.frente}
              revelarLacunas={false}
              className="text-lg text-white font-medium leading-relaxed flex-1"
            />
            {carta.materia && (
              <p className="text-xs text-white/40 mt-3">{carta.materia}{carta.topico ? ` · ${carta.topico}` : ""}</p>
            )}
            <button
              onClick={() => setFlipped(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-semibold transition-all"
            >
              <Eye className="h-4 w-4" />
              Ver Resposta
            </button>
          </div>
        ) : clozeAtivo ? (
          <div className="flex flex-col flex-1">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Frase completa</p>
            <TextoCarta
              texto={carta.frente}
              revelarLacunas
              className="text-base text-white font-medium leading-relaxed"
            />
            {carta.verso.trim() && (
              <div className="border-t border-white/15 mt-4 pt-4">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Explicação</p>
                <TextoCarta texto={carta.verso} revelarLacunas className="text-sm text-white/80 leading-relaxed" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="mb-4">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Pergunta</p>
              <TextoCarta texto={carta.frente} revelarLacunas className="text-sm text-white/60 leading-relaxed" />
            </div>
            <div className="border-t border-white/15 pt-4 flex-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Resposta</p>
              {carta.tipo === "armadilha" && carta.gabarito && (
                <p className={`text-sm font-bold mb-2 ${carta.gabarito === "verdadeiro" ? "text-emerald-400" : "text-red-400"}`}>
                  {carta.gabarito === "verdadeiro" ? "✓ VERDADEIRO" : "✗ FALSO"}
                </p>
              )}
              <TextoCarta texto={carta.verso} revelarLacunas className="text-base text-white font-medium leading-relaxed" />
            </div>
          </div>
        )}
      </div>

      {flipped && (
        <div className="grid grid-cols-4 gap-2 w-full max-w-lg">
          {(
            [
              { label: "Errei",   q: 0 as const, cor: "bg-red-600 hover:bg-red-500",         Icon: XCircle },
              { label: "Difícil", q: 2 as const, cor: "bg-orange-500 hover:bg-orange-400",   Icon: AlertTriangle },
              { label: "Lembrei", q: 4 as const, cor: "bg-primary hover:bg-primary",       Icon: CheckCircle2 },
              { label: "Fácil",   q: 5 as const, cor: "bg-emerald-600 hover:bg-emerald-500", Icon: Star },
            ] as const
          ).map(({ label, q, cor, Icon: BtnIcon }) => (
            <button
              key={label}
              onClick={() => avaliar(q)}
              className={`${cor} text-white py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1 transition-all active:scale-95 shadow-md`}
            >
              <BtnIcon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
