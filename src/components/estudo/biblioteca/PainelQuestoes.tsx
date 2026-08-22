"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, LayoutGrid, List, ListChecks, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { calcularPerc, GRUPO_BADGE, GRUPO_LABEL, tentativasDoGrupo, type Alternativa, type Grupo, type PdfQuestoes, type QuestaoResultado } from "@/lib/estudo-data";
import { LIMIAR_REFORCO_PERC } from "@/lib/trilha-dinamica";

const GRUPOS: Grupo[] = ["A", "B", "C", "D"];
const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D", "E"];

// linha do Gabarito (número + chips A-E + acerto/erro) — reaproveitada pelas duas visões (lista
// numerada e por grupo), só muda o agrupamento em volta dela. Os botões de acerto/erro escrevem no
// MESMO r.acertou que os chips numerados lá em cima (onMarcar é o mesmo callback) — marcar aqui já
// atualiza sozinho os contadores "X✓ Y✗" dos cards por grupo, sem precisar rolar a tela.
function LinhaGabarito({
  r, onMarcarAlternativa, onMarcar,
}: {
  r: QuestaoResultado;
  onMarcarAlternativa: (bloco: number, numero: number, alternativa: Alternativa | null) => void;
  onMarcar: (bloco: number, numero: number, acertou: boolean | null) => void;
}) {
  const bloco = r.bloco ?? 1;
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5">
      <span className="text-[11px] font-mono text-muted-foreground w-6 flex-shrink-0 text-right">{r.numero}.</span>
      <div className="flex gap-1">
        {ALTERNATIVAS.map((alt) => (
          <button
            key={alt}
            type="button"
            title={`Marcar alternativa ${alt} na questão ${r.numero}`}
            onClick={() => onMarcarAlternativa(bloco, r.numero, r.alternativa === alt ? null : alt)}
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
      <div className="flex gap-1 ml-auto flex-shrink-0 pl-1.5 border-l border-border">
        <button
          type="button"
          title={`Marcar questão ${r.numero} como certa`}
          onClick={() => onMarcar(bloco, r.numero, r.acertou === true ? null : true)}
          className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
            r.acertou === true
              ? "bg-emerald-500 text-white"
              : "border border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={`Marcar questão ${r.numero} como errada`}
          onClick={() => onMarcar(bloco, r.numero, r.acertou === false ? null : false)}
          className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
            r.acertou === false
              ? "bg-red-500 text-white"
              : "border border-border text-muted-foreground hover:border-red-500/50 hover:text-red-500"
          }`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

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
  onAdicionarBloco,
  onAdicionarRodadaReforco,
  onRemoverBloco,
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
  // identidade de uma questão é (bloco, numero) — numero sozinho reinicia em 1 a cada bloco
  onMarcar: (bloco: number, numero: number, acertou: boolean | null) => void;
  onMarcarAlternativa: (bloco: number, numero: number, alternativa: Alternativa | null) => void;
  // acrescenta mais um bloco à lista já gerada (sem apagar os blocos/respostas já existentes) —
  // pro caso de perceber depois que faltava um caderno de questões pro tópico
  onAdicionarBloco: (tamanho: number) => void;
  // nova rodada de reforço pra UM grupo específico — refaz EXATAMENTE as questões que o usuário
  // errou na última tentativa: numerosErrados são os `numero` ORIGINAIS delas (não uma contagem —
  // a rodada nova continua chamando "questão 13" de 13, nunca renumera 1,2,3...). A tentativa
  // anterior fica intocada, com seu percentual próprio preservado (ver
  // adicionarRodadaReforco/tentativasDoGrupo em estudo-data.ts)
  onAdicionarRodadaReforco: (grupo: Grupo, numerosErrados: number[]) => void;
  // apaga um bloco inteiro (todas as questões dele, respondidas ou não) — pra quando o usuário
  // criou um bloco por engano/duplicado
  onRemoverBloco: (bloco: number) => void;
  onRefazer: () => void;
  onFechar: () => void;
}) {
  const [blocosStr, setBlocosStr] = useState<string[]>([""]);
  const [gabaritoAberto, setGabaritoAberto] = useState(true);
  const [novoBlocoAberto, setNovoBlocoAberto] = useState(false);
  const [novoBlocoStr, setNovoBlocoStr] = useState("");
  // "lista" = numeração corrida de sempre; "grupos" = mesma separação A-D usada no painel acima,
  // útil pra conferir o gabarito só do grupo que o usuário está respondendo agora
  const [visaoGabarito, setVisaoGabarito] = useState<"lista" | "grupos">("lista");

  const blocosNum = blocosStr.map((s) => parseInt(s));
  const podeGerar = blocosNum.length > 0 && blocosNum.every((n) => Number.isFinite(n) && n >= 4 && n <= 200);

  const novoBlocoNum = parseInt(novoBlocoStr);
  const podeAdicionarBloco = Number.isFinite(novoBlocoNum) && novoBlocoNum >= 4 && novoBlocoNum <= 200;
  const confirmarNovoBloco = () => {
    if (!podeAdicionarBloco) return;
    onAdicionarBloco(novoBlocoNum);
    setNovoBlocoStr("");
    setNovoBlocoAberto(false);
  };

  const confirmarRemoverBloco = (bloco: number, totalQuestoesBloco: number) => {
    if (confirm(`Remover o Bloco ${bloco} (${totalQuestoesBloco} questões)? Os resultados já marcados nele se perdem.`)) {
      onRemoverBloco(bloco);
    }
  };

  // dentro de cada grupo A-D, subagrupa por BLOCO (só pra mostrar de onde vem cada questão quando
  // há mais de um bloco — com um bloco só, todo mundo cai em "bloco 1" e o rótulo nem aparece).
  // podeReforcar: a ÚLTIMA tentativa desse grupo (ver tentativasDoGrupo) já foi respondida por
  // inteiro e ficou abaixo do limiar — oferece refazer exatamente as questões erradas dela
  // (numerosErrados guarda o `numero` ORIGINAL de cada uma, não uma contagem — a rodada nova
  // precisa continuar chamando "questão 13" de 13, não renumerar 1,2,3..., senão o usuário não
  // sabe qual questão do caderno externo precisa refazer).
  const porGrupo = GRUPOS.map((g) => {
    const itensDoGrupo = questoes?.resultados.filter((r) => r.grupo === g) ?? [];
    const porBloco = new Map<number, typeof itensDoGrupo>();
    for (const r of itensDoGrupo) {
      const b = r.bloco ?? 1;
      porBloco.set(b, [...(porBloco.get(b) ?? []), r]);
    }
    const tentativas = tentativasDoGrupo(questoes, g);
    const ultimaTentativa = tentativas[tentativas.length - 1];
    const numerosErrados = ultimaTentativa?.itens.filter((r) => r.acertou === false).map((r) => r.numero) ?? [];
    const podeReforcar = !!ultimaTentativa && ultimaTentativa.pendentes === 0 && ultimaTentativa.perc < LIMIAR_REFORCO_PERC && numerosErrados.length > 0;
    return { grupo: g, porBloco: [...porBloco.entries()].sort(([a], [b]) => a - b), podeReforcar, numerosErrados };
  });
  // lista de blocos (número + quantas questões) só pra gerenciar (excluir) — independente do
  // agrupamento por grupo A-D acima, que fatia cada bloco em 4 pedaços
  const mapaBlocos = (questoes?.resultados ?? []).reduce((mapa, r) => {
    const b = r.bloco ?? 1;
    mapa.set(b, (mapa.get(b) ?? 0) + 1);
    return mapa;
  }, new Map<number, number>());
  const blocosGerais = [...mapaBlocos.entries()].sort(([a], [b]) => a - b);
  const totalBlocos = blocosGerais.length;
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
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {materia} · {topico} · {questoes.total} questões
                  {totalBlocos > 1 ? ` · ${totalBlocos} blocos` : ""}
                </p>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setNovoBlocoAberto((v) => !v)}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Adicionar bloco
                  </button>
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
              </div>
              {novoBlocoAberto && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={4}
                    max={200}
                    value={novoBlocoStr}
                    onChange={(e) => setNovoBlocoStr(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmarNovoBloco()}
                    placeholder="Ex.: 20"
                    autoFocus
                    className="w-28 text-sm border border-border rounded-lg px-3 py-2 bg-muted text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={confirmarNovoBloco}
                    disabled={!podeAdicionarBloco}
                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNovoBlocoAberto(false); setNovoBlocoStr(""); }}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                    title="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {totalBlocos > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {blocosGerais.map(([bloco, qtd]) => (
                    <div key={bloco} className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-muted text-[11px] text-muted-foreground">
                      <span>Bloco {bloco} · {qtd}</span>
                      <button
                        type="button"
                        onClick={() => confirmarRemoverBloco(bloco, qtd)}
                        title={`Remover Bloco ${bloco}`}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/15 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {porGrupo.map(({ grupo, porBloco, podeReforcar, numerosErrados }) => {
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
                      {porBloco.map(([numeroBloco, itens]) => {
                        const respondida = itens.every((r) => r.acertou !== null);
                        const percBloco = calcularPerc(itens.filter((r) => r.acertou === true).length, itens.filter((r) => r.acertou === false).length);
                        return (
                          <div key={numeroBloco}>
                            {totalBlocos > 1 && (
                              <p className="text-[10px] text-muted-foreground mb-1">
                                Bloco {numeroBloco}{respondida ? ` · ${percBloco}%` : ""}
                              </p>
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
                                      onMarcar(r.bloco ?? 1, r.numero, proximo);
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
                    {podeReforcar && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => onAdicionarRodadaReforco(grupo, numerosErrados)}
                          className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                          title={`Questões: ${numerosErrados.join(", ")}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          {numerosErrados.length === 1
                            ? `Refazer a questão ${numerosErrados[0]}`
                            : `Refazer as questões ${numerosErrados.join(", ")}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setGabaritoAberto((v) => !v)}
                  className="flex items-center gap-1.5 text-left min-w-0"
                >
                  <span className="text-xs font-semibold text-foreground truncate">
                    Gabarito <span className="font-normal text-muted-foreground">· {marcadasGabarito}/{questoes.total} marcadas</span>
                  </span>
                  {gabaritoAberto ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {gabaritoAberto && (
                  <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setVisaoGabarito("lista")}
                      title="Lista numerada"
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        visaoGabarito === "lista" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisaoGabarito("grupos")}
                      title="Separado por grupo A-D"
                      className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                        visaoGabarito === "grupos" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {gabaritoAberto && (
                visaoGabarito === "lista" ? (
                  <div className="space-y-3">
                    {blocosGerais.map(([bloco]) => {
                      const itens = questoes.resultados.filter((r) => (r.bloco ?? 1) === bloco);
                      return (
                        <div key={bloco}>
                          {totalBlocos > 1 && <p className="text-[10px] text-muted-foreground mb-1">Bloco {bloco}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
                            {itens.map((r) => (
                              <LinhaGabarito key={`${bloco}-${r.numero}`} r={r} onMarcarAlternativa={onMarcarAlternativa} onMarcar={onMarcar} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {porGrupo.map(({ grupo, porBloco }) => {
                      const itens = porBloco.flatMap(([, its]) => its);
                      if (itens.length === 0) return null;
                      return (
                        <div key={grupo}>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${GRUPO_BADGE[grupo]}`}>
                            {GRUPO_LABEL[grupo]}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 mt-1.5">
                            {itens.map((r) => (
                              <LinhaGabarito key={`${r.bloco ?? 1}-${r.numero}`} r={r} onMarcarAlternativa={onMarcarAlternativa} onMarcar={onMarcar} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
