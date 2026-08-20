"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Heart, X } from "lucide-react";
import type { InimigoRPG } from "./inimigos-rpg";

interface QuestaoRPG {
  id: string;
  banca: string;
  orgao?: string;
  materia: string;
  topico: string;
  enunciado: string;
  alternativas: Record<string, string>;
  correta: string;
}

const HP_INIMIGO_MAX = 100;
const DANO_POR_ACERTO = 10; // 10 acertos derrubam qualquer inimigo, pedido explícito do usuário

function escolherAleatoria(lista: QuestaoRPG[]): QuestaoRPG | null {
  if (lista.length === 0) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}

function BarraHP({ atual, max, cor }: { atual: number; max: number; cor: string }) {
  const pct = Math.max(0, Math.round((atual / max) * 100));
  return (
    <div className="h-2 rounded-full bg-black/60 overflow-hidden border border-white/10 flex-1">
      <div className={`h-full ${cor} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Combate de campanha — diferente do TelaTreino (Nerdão, treino livre): inimigo sempre 100 HP,
// exatamente 10 acertos derrubam, erro tira o ATK real do inimigo (cada um bate diferente), e tem
// uma fase de diálogo antes da 1ª pergunta. HP do herói é o que já vinha da corrida (carrega entre
// lutas) — não reseta ao entrar aqui.
export default function TelaCombateCampanha({
  telaCheia,
  inimigo,
  heroiHPMax,
  heroiHPInicial,
  concursoId,
  onVitoria,
  onDerrota,
}: {
  telaCheia: boolean;
  inimigo: InimigoRPG;
  heroiHPMax: number;
  heroiHPInicial: number;
  concursoId?: string;
  onVitoria: (hpFinalHeroi: number, ouroGanho: number, xpGanho: number) => void;
  onDerrota: () => void;
}) {
  const [fase, setFase] = useState<"dialogo" | "combate" | "vitoria" | "derrota">("dialogo");
  const [banco, setBanco] = useState<QuestaoRPG[]>([]);
  const [pergunta, setPergunta] = useState<QuestaoRPG | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [hpInimigo, setHpInimigo] = useState(HP_INIMIGO_MAX);
  const [hpHeroi, setHpHeroi] = useState(heroiHPInicial);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [animacao, setAnimacao] = useState<"dano-inimigo" | "dano-heroi" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!concursoId) {
      setErro("Nenhum concurso ativo.");
      setCarregando(false);
      return;
    }
    fetch(`/api/concurso/${concursoId}/questoes-rpg`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((qs: QuestaoRPG[]) => {
        const doTopico = qs.filter((q) => q.materia === inimigo.materia && q.topico === inimigo.topico);
        setBanco(doTopico);
        setPergunta(escolherAleatoria(doTopico));
        setCarregando(false);
      })
      .catch(() => {
        setErro("Não consegui carregar as questões.");
        setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o inimigo/concurso muda
  }, [concursoId, inimigo.materia, inimigo.topico]);

  const responder = (letra: string) => {
    if (!pergunta || selecionada || fase !== "combate") return;
    setSelecionada(letra);
    const certo = letra === pergunta.correta;

    if (certo) {
      setAnimacao("dano-inimigo");
      const novoHpInimigo = Math.max(0, hpInimigo - DANO_POR_ACERTO);
      setHpInimigo(novoHpInimigo);
      clearTimeout(timeoutRef.current);
      if (novoHpInimigo <= 0) {
        timeoutRef.current = setTimeout(() => setFase("vitoria"), 700);
      } else {
        timeoutRef.current = setTimeout(() => {
          setAnimacao(null);
          setSelecionada(null);
          setPergunta(escolherAleatoria(banco));
        }, 500);
      }
    } else {
      setAnimacao("dano-heroi");
      const novoHpHeroi = Math.max(0, hpHeroi - inimigo.atk);
      setHpHeroi(novoHpHeroi);
      clearTimeout(timeoutRef.current);
      if (novoHpHeroi <= 0) {
        timeoutRef.current = setTimeout(() => setFase("derrota"), 700);
      } else {
        timeoutRef.current = setTimeout(() => {
          setAnimacao(null);
          setSelecionada(null);
          setPergunta(escolherAleatoria(banco));
        }, 500);
      }
    }
  };

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-2xl border border-amber-900/40"
      style={
        telaCheia
          ? { aspectRatio: "1402 / 1122", height: "100vh", maxWidth: "100vw" }
          : { aspectRatio: "1402 / 1122", width: "100%", maxWidth: 900 }
      }
    >
      <style>{`
        @keyframes combate-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-9px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
        @keyframes combate-flash { 0%,100% { filter: brightness(1); } 25% { filter: brightness(2.8); } }
        .combate-shake { animation: combate-shake 0.4s ease-in-out; }
        .combate-flash { animation: combate-flash 0.35s ease-in-out; }
      `}</style>

      <img
        src="/cenarios/direito-tributario.png"
        alt="Salão do Direito Tributário"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85 pointer-events-none" />

      {fase === "dialogo" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
          <img src={inimigo.sprite} alt={inimigo.nome} style={{ height: telaCheia ? 200 : 140, imageRendering: "pixelated" }} />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-300">{inimigo.nome}</p>
            <p className="text-[11px] text-white/50 uppercase tracking-wide">{inimigo.classe} · {inimigo.topico}</p>
          </div>
          <div className="bg-black/70 border border-white/15 rounded-xl px-5 py-4 max-w-md space-y-2">
            {inimigo.dialogo.map((linha, i) => (
              <p key={i} className={telaCheia ? "text-base text-white/90" : "text-sm text-white/90"}>{linha}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFase("combate")}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Enfrentar
          </button>
        </div>
      )}

      {fase === "vitoria" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
          <img src={inimigo.sprite} alt={inimigo.nome} className="opacity-40 grayscale" style={{ height: telaCheia ? 180 : 130, imageRendering: "pixelated" }} />
          <div className="bg-black/70 border border-emerald-500/40 rounded-xl px-6 py-5 text-center space-y-2">
            <p className="text-lg font-bold text-emerald-400">Vitória!</p>
            <p className="text-sm text-white/80">Você derrotou {inimigo.nome}.</p>
            <p className="text-xs text-white/50 font-mono">+15 ouro · +20 XP</p>
          </div>
          <button
            type="button"
            onClick={() => onVitoria(hpHeroi, 15, 20)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Continuar
          </button>
        </div>
      )}

      {fase === "derrota" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
          <div className="bg-black/70 border border-red-500/40 rounded-xl px-6 py-5 text-center space-y-2 max-w-sm">
            <p className="text-lg font-bold text-red-400">Você caiu em batalha...</p>
            <p className="text-sm text-white/80">{inimigo.nome} foi forte demais desta vez.</p>
            <p className="text-xs text-white/50">
              A corrida termina aqui — ouro e XP da corrida se perdem, mas itens e seu progresso
              permanente ficam guardados.
            </p>
          </div>
          <button
            type="button"
            onClick={onDerrota}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/15"
          >
            Voltar ao menu
          </button>
        </div>
      )}

      {fase === "combate" && (
        <>
          {(carregando || erro || !pergunta) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/70 border border-white/15 rounded-xl px-5 py-4 text-center max-w-xs">
                <p className="text-sm text-white/85">
                  {carregando ? "Carregando..." : erro ?? `Ainda não tem questões importadas pra "${inimigo.topico}".`}
                </p>
              </div>
            </div>
          )}

          {!carregando && pergunta && (
            <>
              <div className="absolute left-1/2 top-[16%] -translate-x-1/2 flex flex-col items-center gap-1">
                <img
                  src={inimigo.sprite}
                  alt={inimigo.nome}
                  className={animacao === "dano-inimigo" ? "combate-shake combate-flash" : ""}
                  style={{ height: telaCheia ? 170 : 120, imageRendering: "pixelated" }}
                />
                <p className="text-xs font-semibold text-amber-300">{inimigo.nome}</p>
              </div>

              <div className="absolute left-1/2 top-[44%] -translate-x-1/2">
                <img
                  src="/personagens/ladino-cima.png"
                  alt="Você"
                  className={animacao === "dano-heroi" ? "combate-shake combate-flash" : ""}
                  style={{ height: telaCheia ? 110 : 76, imageRendering: "pixelated" }}
                />
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-amber-900/40 p-3 space-y-2.5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <BarraHP atual={hpHeroi} max={heroiHPMax} cor="bg-emerald-500" />
                    <span className="text-[10px] text-white/50 font-mono w-10 text-right flex-shrink-0">{hpHeroi}/{heroiHPMax}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[11px] text-white/70 flex-shrink-0">{inimigo.nome.split(" ")[0]}</span>
                    <BarraHP atual={hpInimigo} max={HP_INIMIGO_MAX} cor="bg-red-500" />
                    <span className="text-[10px] text-white/50 font-mono w-10 text-right flex-shrink-0">{hpInimigo}/{HP_INIMIGO_MAX}</span>
                  </div>
                </div>

                <p className={`${telaCheia ? "text-sm" : "text-[11px]"} text-amber-300/80 font-mono uppercase tracking-wide`}>
                  {pergunta.banca}{pergunta.orgao ? ` · ${pergunta.orgao}` : ""} · {pergunta.topico}
                </p>
                <p className={`${telaCheia ? "text-lg max-h-40" : "text-base max-h-28"} text-white leading-snug overflow-y-auto pr-1`}>
                  {pergunta.enunciado}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(pergunta.alternativas).map(([letra, texto]) => {
                    const ehCorreta = letra === pergunta.correta;
                    const ehSelecionada = letra === selecionada;
                    let estilo = "border-white/15 text-white/85 hover:border-white/35 hover:bg-white/5";
                    if (selecionada) {
                      if (ehCorreta) estilo = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
                      else if (ehSelecionada) estilo = "border-red-500 bg-red-500/15 text-red-300";
                      else estilo = "border-white/10 text-white/40";
                    }
                    return (
                      <button
                        key={letra}
                        type="button"
                        disabled={!!selecionada}
                        onClick={() => responder(letra)}
                        className={`flex items-start gap-2 text-left px-3 py-2 rounded-lg border ${telaCheia ? "text-base" : "text-sm"} transition-colors ${estilo}`}
                      >
                        <span className="font-mono font-semibold flex-shrink-0">{letra}</span>
                        <span className="flex-1">{texto}</span>
                        {selecionada && ehCorreta && <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                        {selecionada && ehSelecionada && !ehCorreta && <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
