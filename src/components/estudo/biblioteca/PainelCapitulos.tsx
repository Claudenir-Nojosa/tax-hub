"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Layers, Plus, Target, Trash2, X } from "lucide-react";
import type { CapituloPdf, SubcapituloPdf } from "@/lib/estudo-data";

// Painel de capítulos — aberto de dentro do leitor (botão "Capítulos" na barra), dockado ao lado
// do PDF em telas grandes (mesmo tratamento do PainelQuestoes.tsx). Ao contrário do cadastro
// manual em FormPdf.tsx (só início — o fim é sempre derivado), aqui o usuário pode informar início
// E fim de cada capítulo/subcapítulo DE OLHO no PDF de verdade — "usar pág. atual" preenche o
// campo com a página que está vendo agora, sem precisar digitar. Persiste a cada mudança (mesmo
// padrão instantâneo do resto do leitor, ex.: "fim do conteúdo") — sem botão "salvar" à parte.

interface LinhaSub {
  nome: string;
  paginaInicio: string;
  paginaFim: string;
}
interface LinhaCap extends LinhaSub {
  subcapitulos: LinhaSub[];
  aberto: boolean;
}

function paraLinhas(capitulos: CapituloPdf[]): LinhaCap[] {
  return capitulos.map((c) => ({
    nome: c.nome,
    paginaInicio: String(c.paginaInicio),
    paginaFim: c.paginaFim !== undefined ? String(c.paginaFim) : "",
    subcapitulos: (c.subcapitulos ?? []).map((s) => ({
      nome: s.nome,
      paginaInicio: String(s.paginaInicio),
      paginaFim: s.paginaFim !== undefined ? String(s.paginaFim) : "",
    })),
    aberto: (c.subcapitulos?.length ?? 0) > 0,
  }));
}

// só entram linhas com nome E início válidos — capítulo/subcapítulo incompleto simplesmente não
// persiste ainda, sem travar o resto (mesma filosofia do FormPdf.tsx)
function paraCapitulosPdf(linhas: LinhaCap[]): CapituloPdf[] {
  const resultado: CapituloPdf[] = [];
  for (const l of linhas) {
    const nome = l.nome.trim();
    const inicio = parseInt(l.paginaInicio);
    if (nome === "" || !Number.isFinite(inicio) || inicio < 1) continue;
    const fim = parseInt(l.paginaFim);
    const subcapitulos: SubcapituloPdf[] = [];
    for (const s of l.subcapitulos) {
      const snome = s.nome.trim();
      const sinicio = parseInt(s.paginaInicio);
      if (snome === "" || !Number.isFinite(sinicio) || sinicio < 1) continue;
      const sfim = parseInt(s.paginaFim);
      subcapitulos.push({ nome: snome, paginaInicio: sinicio, paginaFim: Number.isFinite(sfim) ? sfim : undefined });
    }
    resultado.push({
      nome,
      paginaInicio: inicio,
      paginaFim: Number.isFinite(fim) ? fim : undefined,
      subcapitulos: subcapitulos.length > 0 ? subcapitulos : undefined,
    });
  }
  return resultado;
}

export default function PainelCapitulos({
  capitulos, paginaVisivel, totalPaginas, paginaConteudoFim, onAtualizar, onFechar,
}: {
  capitulos: CapituloPdf[];
  paginaVisivel: number;
  totalPaginas: number;
  paginaConteudoFim?: number;
  onAtualizar: (capitulos: CapituloPdf[]) => void;
  onFechar: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaCap[]>(() => paraLinhas(capitulos));
  const fimDocumento = paginaConteudoFim ?? totalPaginas;

  // ações estruturais (adicionar/remover/usar página atual) persistem NA HORA; edição de texto
  // (nome/página digitada) só persiste no blur (mesmo padrão de InputPaginaLeitor.tsx) — evita
  // gravar número incompleto a cada tecla
  const persistir = (novasLinhas: LinhaCap[]) => {
    setLinhas(novasLinhas);
    onAtualizar(paraCapitulosPdf(novasLinhas));
  };
  const commitCap = () => onAtualizar(paraCapitulosPdf(linhas));

  const atualizarCap = (i: number, patch: Partial<LinhaCap>) =>
    setLinhas((prev) => prev.map((l, li) => (li === i ? { ...l, ...patch } : l)));
  const usarPaginaAtualCap = (i: number, campo: "paginaInicio" | "paginaFim") =>
    persistir(linhas.map((l, li) => (li === i ? { ...l, [campo]: String(paginaVisivel) } : l)));
  const adicionarCap = () =>
    persistir([...linhas, { nome: "", paginaInicio: String(paginaVisivel), paginaFim: "", subcapitulos: [], aberto: false }]);
  const removerCap = (i: number) => persistir(linhas.filter((_, li) => li !== i));

  const atualizarSub = (i: number, si: number, patch: Partial<LinhaSub>) =>
    setLinhas((prev) =>
      prev.map((l, li) => (li === i ? { ...l, subcapitulos: l.subcapitulos.map((s, ssi) => (ssi === si ? { ...s, ...patch } : s)) } : l))
    );
  const usarPaginaAtualSub = (i: number, si: number, campo: "paginaInicio" | "paginaFim") =>
    persistir(
      linhas.map((l, li) =>
        li === i ? { ...l, subcapitulos: l.subcapitulos.map((s, ssi) => (ssi === si ? { ...s, [campo]: String(paginaVisivel) } : s)) } : l
      )
    );
  const adicionarSub = (i: number) =>
    persistir(
      linhas.map((l, li) =>
        li === i ? { ...l, aberto: true, subcapitulos: [...l.subcapitulos, { nome: "", paginaInicio: String(paginaVisivel), paginaFim: "" }] } : l
      )
    );
  const removerSub = (i: number, si: number) =>
    persistir(linhas.map((l, li) => (li === i ? { ...l, subcapitulos: l.subcapitulos.filter((_, ssi) => ssi !== si) } : l)));

  return (
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
            <Layers className="h-4 w-4 text-primary" /> Capítulos
          </div>
          <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Divida a leitura em capítulos (e, se quiser, subcapítulos) — a Trilha manda um de cada
          vez, na ordem, juntando os curtos até render uma atividade de duração razoável. Navegue
          até a página certa no PDF e clique no alvo pra preencher com a página atual ({paginaVisivel}),
          sem digitar.
          {paginaConteudoFim && ` A partir da página ${paginaConteudoFim} é só questão — capítulos não deveriam passar disso.`}
        </p>

        {linhas.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum capítulo ainda.</p>
        ) : (
          <div className="space-y-2">
            {linhas.map((l, i) => {
              const fimNum = parseInt(l.paginaFim);
              const passouDoConteudo = Number.isFinite(fimNum) && fimNum > fimDocumento;
              return (
                <div key={i} className="rounded-lg border border-border dark:border-border p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => atualizarCap(i, { aberto: !l.aberto })}
                      className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      type="text"
                      value={l.nome}
                      onChange={(e) => atualizarCap(i, { nome: e.target.value })}
                      onBlur={commitCap}
                      placeholder={`Capítulo ${i + 1}`}
                      className="flex-1 min-w-0 text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => removerCap(i)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 pl-6 flex-wrap">
                    <label className="text-[10px] text-muted-foreground">início</label>
                    <input
                      type="number" min={1} value={l.paginaInicio}
                      onChange={(e) => atualizarCap(i, { paginaInicio: e.target.value })}
                      onBlur={commitCap}
                      className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => usarPaginaAtualCap(i, "paginaInicio")} title={`Usar página atual (${paginaVisivel})`} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Target className="h-3 w-3" />
                    </button>
                    <label className="text-[10px] text-muted-foreground">fim</label>
                    <input
                      type="number" min={1} value={l.paginaFim}
                      onChange={(e) => atualizarCap(i, { paginaFim: e.target.value })}
                      onBlur={commitCap}
                      placeholder="auto"
                      className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => usarPaginaAtualCap(i, "paginaFim")} title={`Usar página atual (${paginaVisivel})`} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Target className="h-3 w-3" />
                    </button>
                  </div>
                  {passouDoConteudo && (
                    <div className="pl-6 text-[10px] text-amber-600 dark:text-amber-400">
                      ⚠ passa do fim do conteúdo (pág. {fimDocumento})
                    </div>
                  )}

                  {l.aberto && (
                    <div className="pl-6 ml-2 space-y-1.5 border-l-2 border-border">
                      {l.subcapitulos.map((s, si) => (
                        <div key={si} className="flex items-center gap-1 flex-wrap pl-2">
                          <input
                            type="text" value={s.nome}
                            onChange={(e) => atualizarSub(i, si, { nome: e.target.value })}
                            onBlur={commitCap}
                            placeholder={`Subcapítulo ${si + 1}`}
                            className="flex-1 min-w-[90px] text-[11px] border border-border rounded-md px-1.5 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                          <input
                            type="number" min={1} value={s.paginaInicio}
                            onChange={(e) => atualizarSub(i, si, { paginaInicio: e.target.value })}
                            onBlur={commitCap}
                            className="w-12 text-[11px] border border-border rounded-md px-1 py-1 bg-card text-foreground focus:outline-none focus:border-primary"
                          />
                          <button type="button" onClick={() => usarPaginaAtualSub(i, si, "paginaInicio")} title={`Usar página atual (${paginaVisivel})`} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0">
                            <Target className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-[10px] text-muted-foreground">até</span>
                          <input
                            type="number" min={1} value={s.paginaFim}
                            onChange={(e) => atualizarSub(i, si, { paginaFim: e.target.value })}
                            onBlur={commitCap}
                            placeholder="auto"
                            className="w-12 text-[11px] border border-border rounded-md px-1 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                          <button type="button" onClick={() => usarPaginaAtualSub(i, si, "paginaFim")} title={`Usar página atual (${paginaVisivel})`} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0">
                            <Target className="h-2.5 w-2.5" />
                          </button>
                          <button type="button" onClick={() => removerSub(i, si)} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => adicionarSub(i)} className="flex items-center gap-1 pl-2 text-[10px] font-medium text-primary hover:underline">
                        <Plus className="h-2.5 w-2.5" /> Subcapítulo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={adicionarCap}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar capítulo
        </button>
      </div>
    </div>
  );
}
