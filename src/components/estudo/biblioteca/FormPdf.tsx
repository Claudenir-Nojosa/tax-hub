"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileUp, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { CapituloPdf, MateriaConcurso, MateriaDef, PdfEstudo, TopicoPaginas } from "@/lib/estudo-data";
import { contarPaginasPdf, obterArquivoPdf } from "@/lib/pdf-storage";
import { fecharLacunasIntervalos, novoId } from "./biblioteca-utils";

// intervalo em edição por tópico — strings (inputs controlados); só vira TopicoPaginas de
// verdade no salvar, e só pros tópicos com início E fim preenchidos (parcial não quebra nada,
// só não entra no mapeamento -- "Ler PDF" cai no comportamento genérico pra esse tópico)
type IntervalosEmEdicao = Record<string, { inicio: string; fim: string }>;

function intervalosIniciais(pdf?: PdfEstudo): IntervalosEmEdicao {
  const mapa: IntervalosEmEdicao = {};
  for (const ip of pdf?.intervalosPaginas ?? []) {
    mapa[ip.topico] = { inicio: String(ip.paginaInicio), fim: String(ip.paginaFim) };
  }
  return mapa;
}

// capítulo em edição — string controlada pra página início, igual ao padrão dos intervalos acima
type CapituloEmEdicao = { nome: string; paginaInicio: string };

function capitulosIniciais(pdf?: PdfEstudo): CapituloEmEdicao[] {
  return (pdf?.capitulos ?? []).map((c) => ({ nome: c.nome, paginaInicio: String(c.paginaInicio) }));
}

// página final de CADA capítulo, na ORDEM DE ÍNDICE do array `linhas` (não a ordem por página) —
// só pra pré-visualização no form: a página anterior ao início do próximo capítulo (por número de
// página, não por posição na lista), e o último vai até o fim do conteúdo/total. null quando a
// página de início daquela linha ainda não é um número válido.
function previewFimCapitulos(linhas: CapituloEmEdicao[], totalPaginas: number, paginaConteudoFim?: number): (number | null)[] {
  const validos = linhas
    .map((l, i) => ({ i, inicio: parseInt(l.paginaInicio) }))
    .filter((x) => Number.isFinite(x.inicio) && x.inicio >= 1)
    .sort((a, b) => a.inicio - b.inicio);
  const fimDocumento = paginaConteudoFim ?? totalPaginas;
  const porIndice = new Map<number, number>();
  validos.forEach((v, pos) => {
    porIndice.set(v.i, pos === validos.length - 1 ? fimDocumento : validos[pos + 1].inicio - 1);
  });
  return linhas.map((_, i) => porIndice.get(i) ?? null);
}

// ─── Form de cadastro/edição ─────────────────────────────────────────────────

export default function FormPdf({
  materiasAtivas, pdfParaEditar, presetMateria, presetTopico, onSalvar, onFechar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  pdfParaEditar?: PdfEstudo;
  // pré-preenche matéria/tópico ao abrir pra um PDF NOVO (ex.: botão "+" num tópico que já tem
  // PDF, na Biblioteca) — ignorado em modo de edição (pdfParaEditar manda).
  presetMateria?: string;
  presetTopico?: string;
  onSalvar: (pdf: PdfEstudo, arquivo?: File) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(pdfParaEditar?.nome ?? "");
  const [materia, setMateria] = useState(pdfParaEditar?.materia ?? presetMateria ?? materiasAtivas[0]?.nome ?? "");
  const [topicosSel, setTopicosSel] = useState<Set<string>>(
    new Set(pdfParaEditar?.topicos ?? (presetTopico ? [presetTopico] : []))
  );
  const [totalPaginas, setTotalPaginas] = useState(pdfParaEditar ? String(pdfParaEditar.totalPaginas) : "");
  const [paginasDetectadas, setPaginasDetectadas] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mostrarTopicos, setMostrarTopicos] = useState((pdfParaEditar?.topicos?.length ?? 0) > 0 || !!presetTopico);
  const [intervalos, setIntervalos] = useState<IntervalosEmEdicao>(intervalosIniciais(pdfParaEditar));
  const [capitulos, setCapitulos] = useState<CapituloEmEdicao[]>(capitulosIniciais(pdfParaEditar));
  const [salvasAgora, setSalvasAgora] = useState(0);
  const [flash, setFlash] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const topicosDaMateria = materiasAtivas.find((m) => m.nome === materia)?.topicos ?? [];
  const paginasNum = parseInt(totalPaginas);
  const podeSalvar = nome.trim() !== "" && materia !== "" && Number.isFinite(paginasNum) && paginasNum >= 1;

  const handleArquivo = async (f: File) => {
    setArquivo(f);
    if (nome.trim() === "") setNome(f.name.replace(/\.pdf$/i, ""));
    // conta as páginas do arquivo real — se conseguir, o campo vira automático
    const paginas = await contarPaginasPdf(f);
    if (paginas !== null) {
      setTotalPaginas(String(paginas));
      setPaginasDetectadas(true);
    }
  };

  // só entram no mapeamento os tópicos com início E fim preenchidos e válidos (fim >= início) —
  // um tópico selecionado sem intervalo simplesmente fica de fora, sem travar o salvamento
  const construirIntervalosPaginas = (topicosSelecionados: string[]): TopicoPaginas[] | undefined => {
    const resultado: TopicoPaginas[] = [];
    for (const t of topicosSelecionados) {
      const par = intervalos[t];
      if (!par) continue;
      const inicio = parseInt(par.inicio);
      const fim = parseInt(par.fim);
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio < 1 || fim < inicio) continue;
      resultado.push({ topico: t, paginaInicio: inicio, paginaFim: fim });
    }
    return resultado.length > 0 ? resultado : undefined;
  };

  // só entram capítulos com nome E página de início válidos — um capítulo incompleto some sozinho
  // do que é salvo, sem travar o resto (mesma filosofia dos intervalos por tópico acima)
  const construirCapitulos = (): CapituloPdf[] | undefined => {
    const resultado = capitulos
      .map((c) => ({ nome: c.nome.trim(), paginaInicio: parseInt(c.paginaInicio) }))
      .filter((c) => c.nome !== "" && Number.isFinite(c.paginaInicio) && c.paginaInicio >= 1);
    return resultado.length > 0 ? resultado : undefined;
  };

  // pede pra IA sugerir início/fim por tópico e PRÉ-PREENCHE os campos manuais da seção acima —
  // nunca salva sozinha, o usuário revisa (e pode corrigir) antes de clicar em "Adicionar/Salvar"
  const sugerirComIA = async () => {
    if (sugerindo) return;
    const topicosAlvo = [...topicosSel].filter((t) => topicosDaMateria.includes(t));
    if (topicosAlvo.length === 0) return;

    setSugerindo(true);
    setErroSugestao(null);
    try {
      // PDF novo ainda não enviado: usa o arquivo local escolhido. PDF em edição sem arquivo novo
      // anexado: baixa o já hospedado no Storage (mesmo helper que o leitor usa).
      const blob: Blob | File | null = arquivo ?? (pdfParaEditar?.arquivoEnviado ? await obterArquivoPdf(pdfParaEditar.id) : null);
      if (!blob) {
        setErroSugestao("Anexe o arquivo PDF primeiro pra IA conseguir ler o conteúdo");
        return;
      }

      const form = new FormData();
      form.append("file", blob, arquivo?.name ?? `${pdfParaEditar?.nome ?? "documento"}.pdf`);
      form.append("topicos", JSON.stringify(topicosAlvo));

      const res = await fetch("/api/ai/pdf-topicos-paginas", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        intervalos?: { topico: string; paginaInicio: number; paginaFim: number }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);

      if (!data.intervalos || data.intervalos.length === 0) {
        setErroSugestao("A IA não conseguiu identificar as páginas desses tópicos nesse PDF");
        return;
      }
      setIntervalos((prev) => {
        const novo = { ...prev };
        for (const it of data.intervalos!) {
          novo[it.topico] = { inicio: String(it.paginaInicio), fim: String(it.paginaFim) };
        }
        // estica os intervalos pra cobrir o PDF inteiro (sem lacuna entre um tópico e o
        // próximo, começando na pág. 1 e indo até o fim do conteúdo) — usa todos os tópicos
        // deste PDF que já têm início/fim válidos, não só os que a IA acabou de sugerir agora
        if (Number.isFinite(paginasNum)) {
          const completos: TopicoPaginas[] = topicosAlvo
            .map((t) => {
              const par = novo[t];
              const inicio = par ? parseInt(par.inicio) : NaN;
              const fim = par ? parseInt(par.fim) : NaN;
              return Number.isFinite(inicio) && Number.isFinite(fim) ? { topico: t, paginaInicio: inicio, paginaFim: fim } : null;
            })
            .filter((x): x is TopicoPaginas => x !== null);
          for (const f of fecharLacunasIntervalos(completos, { totalPaginas: paginasNum, paginaConteudoFim: pdfParaEditar?.paginaConteudoFim })) {
            novo[f.topico] = { inicio: String(f.paginaInicio), fim: String(f.paginaFim) };
          }
        }
        return novo;
      });
    } catch (e) {
      setErroSugestao(e instanceof Error ? e.message : "Erro ao sugerir com IA");
    } finally {
      setSugerindo(false);
    }
  };

  const salvar = async () => {
    if (!podeSalvar || enviando) return;
    setEnviando(true);
    try {
      const topicos = [...topicosSel].filter((t) => topicosDaMateria.includes(t));
      const intervalosPaginas = construirIntervalosPaginas(topicos);
      const capitulosPdf = construirCapitulos();
      if (pdfParaEditar) {
        await onSalvar(
          {
            ...pdfParaEditar,
            nome: nome.trim(),
            materia,
            topicos: topicos.length > 0 ? topicos : undefined,
            intervalosPaginas,
            capitulos: capitulosPdf,
            totalPaginas: paginasNum,
            paginaAtual: Math.min(pdfParaEditar.paginaAtual, paginasNum),
            atualizadoEm: new Date().toISOString(),
          },
          arquivo ?? undefined
        );
      } else {
        await onSalvar(
          {
            id: novoId(),
            nome: nome.trim(),
            materia,
            topicos: topicos.length > 0 ? topicos : undefined,
            intervalosPaginas,
            capitulos: capitulosPdf,
            totalPaginas: paginasNum,
            paginaAtual: 0,
            criadoEm: new Date().toISOString(),
          },
          arquivo ?? undefined
        );
        // matéria fica mantida pro próximo PDF (cadastro em sequência); limpa o resto — o tópico
        // preset (veio de um botão "+" num tópico específico) também fica marcado, pra dar pra
        // anexar vários PDFs seguidos no mesmo tópico sem remarcar toda vez
        setNome("");
        setTotalPaginas("");
        setTopicosSel(new Set(presetTopico ? [presetTopico] : []));
        setIntervalos({});
        setCapitulos([]);
        setArquivo(null);
        setPaginasDetectadas(false);
        setSalvasAgora((n) => n + 1);
        setFlash(true);
        setTimeout(() => setFlash(false), 1800);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {pdfParaEditar ? "Editar PDF" : "Adicionar PDF"}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* anexo do arquivo — o coração do fluxo: nome e total de páginas saem dele sozinhos */}
      <input
        ref={arquivoRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleArquivo(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => arquivoRef.current?.click()}
        className={`w-full mb-3 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-colors ${
          arquivo
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
            : "border-primary/30 hover:border-primary bg-primary/5"
        }`}
      >
        <FileUp className={`h-5 w-5 mx-auto mb-1 ${arquivo ? "text-emerald-500" : "text-primary/60"}`} />
        <div className="text-xs font-medium text-foreground">
          {arquivo
            ? `✓ ${arquivo.name} (${(arquivo.size / 1024 / 1024).toFixed(1)} MB)`
            : pdfParaEditar
            ? "Anexar/substituir o arquivo PDF (opcional)"
            : "Clique pra escolher o arquivo PDF"}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {arquivo ? "Clique pra trocar" : "O arquivo vai pra sua biblioteca na nuvem — você lê aqui dentro, em qualquer dispositivo"}
        </div>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_110px] gap-3 mb-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Nome do PDF</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Aula 05 — ICMS: fato gerador"
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Matéria</label>
          <select
            value={materia}
            onChange={(e) => { setMateria(e.target.value); setTopicosSel(new Set()); }}
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:border-primary"
          >
            {materiasAtivas.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Total de págs.{paginasDetectadas && <span className="text-emerald-500"> ✓ auto</span>}
          </label>
          <input
            type="number"
            min={1}
            value={totalPaginas}
            onChange={(e) => { setTotalPaginas(e.target.value); setPaginasDetectadas(false); }}
            placeholder="120"
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {topicosDaMateria.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setMostrarTopicos((v) => !v)}
            className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 hover:text-foreground dark:hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mostrarTopicos ? "rotate-180" : ""}`} />
            Tópicos do edital cobertos (opcional{topicosSel.size > 0 ? ` — ${topicosSel.size} marcado(s)` : ""})
          </button>
          {mostrarTopicos && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-border dark:border-border divide-y divide-border/50">
              {topicosDaMateria.map((t) => {
                const sel = topicosSel.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTopicosSel((prev) => {
                        const nova = new Set(prev);
                        if (nova.has(t)) nova.delete(t);
                        else nova.add(t);
                        return nova;
                      })
                    }
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      sel ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent dark:hover:bg-muted/40"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded border flex-shrink-0 ${sel ? "bg-primary border-primary" : "border-input"}`} />
                    <span className="leading-snug">{t}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {topicosSel.size > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="text-[11px] font-medium text-muted-foreground">
              Intervalo de páginas por tópico (opcional) — a Trilha abre o leitor já na página certa e avisa quando você passa da página final
            </div>
            <button
              type="button"
              onClick={sugerirComIA}
              disabled={sugerindo}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-wait"
              title="Pede pra IA ler o PDF e sugerir as páginas de cada tópico marcado (você revisa antes de salvar)"
            >
              {sugerindo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {sugerindo ? "Analisando…" : "Sugerir com IA"}
            </button>
          </div>
          {erroSugestao && <div className="text-[10px] text-red-500 dark:text-red-400 mb-1.5">{erroSugestao}</div>}
          <div className="space-y-1.5">
            {[...topicosSel].filter((t) => topicosDaMateria.includes(t)).map((t) => {
              const par = intervalos[t] ?? { inicio: "", fim: "" };
              return (
                <div key={t} className="flex items-center gap-2 rounded-lg border border-border dark:border-border px-2.5 py-1.5">
                  <span className="flex-1 min-w-0 text-xs text-foreground truncate" title={t}>{t}</span>
                  <label className="text-[10px] text-muted-foreground flex-shrink-0">pág.</label>
                  <input
                    type="number"
                    min={1}
                    value={par.inicio}
                    onChange={(e) => setIntervalos((prev) => ({ ...prev, [t]: { inicio: e.target.value, fim: prev[t]?.fim ?? "" } }))}
                    placeholder="início"
                    className="w-16 text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">até</span>
                  <input
                    type="number"
                    min={1}
                    value={par.fim}
                    onChange={(e) => setIntervalos((prev) => ({ ...prev, [t]: { inicio: prev[t]?.inicio ?? "", fim: e.target.value } }))}
                    placeholder="fim"
                    className="w-16 text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topicosSel.size > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
            Capítulos (opcional) — divida a leitura em pedaços: a Trilha manda um capítulo (ou um
            grupinho de capítulos curtos, se forem rápidos) de cada vez, na ordem, em vez do
            tópico inteiro de uma só tacada. Só o nome e a página de início; o fim de cada um é
            sempre a página anterior ao início do próximo.
          </div>
          {capitulos.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {(() => {
                const fins = previewFimCapitulos(capitulos, paginasNum, pdfParaEditar?.paginaConteudoFim);
                return capitulos.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border dark:border-border px-2.5 py-1.5">
                    <input
                      type="text"
                      value={c.nome}
                      onChange={(e) => setCapitulos((prev) => prev.map((x, xi) => (xi === i ? { ...x, nome: e.target.value } : x)))}
                      placeholder={`Capítulo ${i + 1}`}
                      className="flex-1 min-w-0 text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <label className="text-[10px] text-muted-foreground flex-shrink-0">pág.</label>
                    <input
                      type="number"
                      min={1}
                      value={c.paginaInicio}
                      onChange={(e) => setCapitulos((prev) => prev.map((x, xi) => (xi === i ? { ...x, paginaInicio: e.target.value } : x)))}
                      placeholder="início"
                      className="w-16 text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 w-16">
                      até {fins[i] ?? "?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCapitulos((prev) => prev.filter((_, xi) => xi !== i))}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ));
              })()}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCapitulos((prev) => [...prev, { nome: "", paginaInicio: "" }])}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="h-3 w-3" /> Adicionar capítulo
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={!podeSalvar || enviando}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-wait"
        >
          {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enviando
            ? "Enviando…"
            : pdfParaEditar
            ? "Salvar alterações"
            : salvasAgora > 0
            ? "Adicionar outro PDF"
            : "Adicionar PDF"}
        </button>
        {!pdfParaEditar && !enviando && (flash || salvasAgora > 0) && (
          <span className={`text-xs transition-opacity ${flash ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground opacity-70"}`}>
            {flash ? "✓ PDF adicionado! Matéria mantida pro próximo." : `${salvasAgora} PDF${salvasAgora !== 1 ? "s" : ""} adicionado${salvasAgora !== 1 ? "s" : ""} agora.`}
          </span>
        )}
      </div>
    </div>
  );
}
