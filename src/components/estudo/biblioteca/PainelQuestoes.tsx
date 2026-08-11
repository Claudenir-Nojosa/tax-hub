"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, ListChecks, Plus, RotateCcw, X } from "lucide-react";
import { GRUPO_BADGE, GRUPO_LABEL, type Alternativa, type Grupo, type PdfQuestoes } from "@/lib/estudo-data";

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
  onGerar,
  onMarcar,
  onMarcarAlternativa,
  onRefazer,
  onFechar,
}: {
  materia: string;
  topico?: string;
  questoes?: PdfQuestoes;
  // um item por bloco de questões do PDF — a maioria dos tópicos tem 1 bloco só, mas alguns PDFs
  // têm vários cadernos separados dentro do mesmo tópico (ex.: 23+25+30 questões); cada bloco
  // reinicia o rodízio A-D do zero (ver gerarQuestoesGrupos em estudo-data.ts)
  onGerar: (blocos: number[]) => void;
  onMarcar: (numero: number, acertou: boolean | null) => void;
  onMarcarAlternativa: (numero: number, alternativa: Alternativa | null) => void;
  onRefazer: () => void;
  onFechar: () => void;
}) {
  const [blocosStr, setBlocosStr] = useState<string[]>([""]);
  const [gabaritoAberto, setGabaritoAberto] = useState(true);

  const blocosNum = blocosStr.map((s) => parseInt(s));
  const podeGerar = blocosNum.length > 0 && blocosNum.every((n) => Number.isFinite(n) && n >= 4 && n <= 200);

  // dentro de cada grupo A-D, subagrupa por BLOCO (só pra mostrar de onde vem cada questão quando
  // há mais de um bloco — com um bloco só, todo mundo cai em "bloco 1" e o rótulo nem aparece)
  const porGrupo = GRUPOS.map((g) => {
    const itensDoGrupo = questoes?.resultados.filter((r) => r.grupo === g) ?? [];
    const porBloco = new Map<number, typeof itensDoGrupo>();
    for (const r of itensDoGrupo) {
      const b = r.bloco ?? 1;
      porBloco.set(b, [...(porBloco.get(b) ?? []), r]);
    }
    return { grupo: g, porBloco: [...porBloco.entries()].sort(([a], [b]) => a - b) };
  });
  const totalBlocos = new Set(questoes?.resultados.map((r) => r.bloco ?? 1)).size;
  const marcadasGabarito = questoes?.resultados.filter((r) => r.alternativa).length ?? 0;

  return (
    // telas grandes (lg+): dock fixo ao lado do PDF, os dois visíveis ao mesmo tempo — a única
    // razão de ainda ser overlay (fixed inset-0, com fundo escurecido) é a tela pequena, onde não
    // cabe PDF + painel lado a lado
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4 lg:static lg:inset-auto lg:z-auto lg:flex lg:items-stretch lg:justify-start lg:bg-transparent lg:p-0 lg:w-[440px] lg:flex-shrink-0 lg:h-full"
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-4 space-y-3 max-h-[85vh] overflow-y-auto lg:rounded-none lg:border-0 lg:border-l lg:max-w-none lg:max-h-none lg:h-full lg:w-full"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" /> Questões
          </div>
          <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
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
              Quantas questões tem a lista escalonada desse tópico? Cada bloco é dividido em
              rodízio nos grupos A, B, C e D por conta própria (ex.: bloco de 20 questões → 5 em
              cada grupo). Se o PDF tiver mais de um caderno de questões separado pro mesmo
              tópico, adicione um bloco pra cada um — não some tudo num total só.
            </p>
            <div className="space-y-2">
              {blocosStr.map((valor, i) => (
                <div key={i} className="flex items-center gap-2">
                  {blocosStr.length > 1 && (
                    <span className="text-[11px] text-muted-foreground w-14 flex-shrink-0">Bloco {i + 1}</span>
                  )}
                  <input
                    type="number"
                    min={4}
                    max={200}
                    value={valor}
                    onChange={(e) => setBlocosStr((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder="Ex.: 20"
                    className="w-28 text-sm border border-border rounded-lg px-3 py-2 bg-muted text-foreground focus:outline-none focus:border-primary"
                  />
                  {blocosStr.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBlocosStr((prev) => prev.filter((_, j) => j !== i))}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                      title="Remover bloco"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBlocosStr((prev) => [...prev, ""])}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Adicionar bloco
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => podeGerar && onGerar(blocosNum)}
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
                {totalBlocos > 1 ? ` · ${totalBlocos} blocos` : ""}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {porGrupo.map(({ grupo, porBloco }) => {
                const todosItens = porBloco.flatMap(([, itens]) => itens);
                const acertos = todosItens.filter((r) => r.acertou === true).length;
                const erros = todosItens.filter((r) => r.acertou === false).length;
                const pendentes = todosItens.length - acertos - erros;
                return (
                  <div key={grupo} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${GRUPO_BADGE[grupo]}`}>{GRUPO_LABEL[grupo]}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {acertos}✓ {erros}✗{pendentes > 0 ? ` · ${pendentes} pend.` : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {porBloco.map(([numeroBloco, itens]) => (
                        <div key={numeroBloco}>
                          {totalBlocos > 1 && (
                            <p className="text-[10px] text-muted-foreground mb-1">Bloco {numeroBloco}</p>
                          )}
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
                      ))}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
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
