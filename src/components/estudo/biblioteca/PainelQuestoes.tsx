"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock, ListChecks, RotateCcw, X } from "lucide-react";
import { GRUPO_BADGE, GRUPO_LABEL, type Alternativa, type Grupo, type PdfQuestoes } from "@/lib/estudo-data";
import { fmtCrono } from "./biblioteca-utils";

const GRUPOS: Grupo[] = ["A", "B", "C", "D"];
const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D", "E"];

// Painel de questões escalonadas do tópico — por cima do PDF (o leitor continua visível atrás),
// mesmo tratamento de overlay do NovoCartaoForm. Antes de gerar, só pede o total; depois de
// gerado, mostra os 4 grupos com um chip tocável por questão (ciclo: pendente → certo → errado)
// e, abaixo, o Gabarito: qual alternativa (A-E) o usuário marcou em cada questão — independente
// de certo/errado, é só o registro de qual opção ele indicou.
export default function PainelQuestoes({
  materia,
  topico,
  questoes,
  segundos,
  onGerar,
  onMarcar,
  onMarcarAlternativa,
  onRefazer,
  onFechar,
}: {
  materia: string;
  topico?: string;
  questoes?: PdfQuestoes;
  segundos: number;
  onGerar: (total: number) => void;
  onMarcar: (numero: number, acertou: boolean | null) => void;
  onMarcarAlternativa: (numero: number, alternativa: Alternativa | null) => void;
  onRefazer: () => void;
  onFechar: () => void;
}) {
  const [totalStr, setTotalStr] = useState("");
  const [gabaritoAberto, setGabaritoAberto] = useState(true);

  const totalNum = parseInt(totalStr);
  const podeGerar = Number.isFinite(totalNum) && totalNum >= 4 && totalNum <= 200;

  const porGrupo = GRUPOS.map((g) => ({
    grupo: g,
    itens: questoes?.resultados.filter((r) => r.grupo === g) ?? [],
  }));
  const marcadasGabarito = questoes?.resultados.filter((r) => r.alternativa).length ?? 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-4 space-y-3 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" /> Questões
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono" title="Tempo nesta sessão de questões">
              <Clock className="h-3.5 w-3.5" /> {fmtCrono(segundos)}
            </span>
            <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!topico ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Este PDF não tem um tópico do edital associado — edite o PDF e escolha um tópico pra usar Questões aqui.
          </p>
        ) : !questoes ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {materia} · {topico}
            </p>
            <p className="text-xs text-muted-foreground">
              Quantas questões tem a lista escalonada desse tópico? Elas são divididas em rodízio
              nos grupos A, B, C e D (ex.: 20 questões → 5 em cada grupo).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={4}
                max={200}
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                placeholder="Ex.: 20"
                className="w-28 text-sm border border-border rounded-lg px-3 py-2 bg-muted text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => podeGerar && onGerar(totalNum)}
                disabled={!podeGerar}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold transition-colors"
              >
                Gerar grupos A-D
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {materia} · {topico} · {questoes.total} questões
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Refazer a distribuição das questões? Os resultados já marcados desse tópico se perdem.")) onRefazer();
                }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Refazer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {porGrupo.map(({ grupo, itens }) => {
                const acertos = itens.filter((r) => r.acertou === true).length;
                const erros = itens.filter((r) => r.acertou === false).length;
                const pendentes = itens.length - acertos - erros;
                return (
                  <div key={grupo} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${GRUPO_BADGE[grupo]}`}>{GRUPO_LABEL[grupo]}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {acertos}✓ {erros}✗{pendentes > 0 ? ` · ${pendentes} pend.` : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {itens.map((r) => {
                        const cor =
                          r.acertou === true
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : r.acertou === false
                            ? "bg-red-500 text-white border-red-500"
                            : "border-border text-muted-foreground hover:border-primary/50";
                        return (
                          <button
                            key={r.numero}
                            type="button"
                            title={`Questão ${r.numero} — clique pra alternar certo/errado/pendente`}
                            onClick={() => {
                              const proximo = r.acertou === null ? true : r.acertou === true ? false : null;
                              onMarcar(r.numero, proximo);
                            }}
                            className={`h-7 w-7 rounded-md border text-[11px] font-semibold flex items-center justify-center transition-colors ${cor}`}
                          >
                            {r.acertou === true ? <Check className="h-3.5 w-3.5" /> : r.acertou === false ? <X className="h-3.5 w-3.5" /> : r.numero}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setGabaritoAberto((v) => !v)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="text-xs font-semibold text-foreground">
                  Gabarito <span className="font-normal text-muted-foreground">· {marcadasGabarito}/{questoes.total} marcadas</span>
                </span>
                {gabaritoAberto ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {gabaritoAberto && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {questoes.resultados.map((r) => (
                    <div key={r.numero} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground w-6 flex-shrink-0 text-right">{r.numero}.</span>
                      <div className="flex gap-1">
                        {ALTERNATIVAS.map((alt) => (
                          <button
                            key={alt}
                            type="button"
                            title={`Marcar alternativa ${alt} na questão ${r.numero}`}
                            onClick={() => onMarcarAlternativa(r.numero, r.alternativa === alt ? null : alt)}
                            className={`h-6 w-6 rounded-md text-[10px] font-semibold flex items-center justify-center transition-colors ${
                              r.alternativa === alt
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
