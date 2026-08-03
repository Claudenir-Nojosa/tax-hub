"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import type { MateriaConcurso, MateriaDef, PdfEstudo, TopicoPaginas } from "@/lib/estudo-data";
import { obterArquivoPdf } from "@/lib/pdf-storage";

// Sugestão de intervalo de páginas por IA em LOTE, pra todos os PDFs da Biblioteca de uma vez —
// mesma rota /api/ai/pdf-topicos-paginas usada no "Sugerir com IA" do FormPdf.tsx (Fase 5), só
// que rodada sequencialmente pra cada PDF com tópico marcado ainda sem intervalo salvo. Nunca
// aplica sozinho: sempre passa por uma tela de revisão (editável, com checkbox por linha) antes
// de qualquer coisa ser gravada — mesma filosofia do fluxo de um PDF só.

interface Props {
  pdfs: PdfEstudo[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onAplicar: (patches: { id: string; intervalos: TopicoPaginas[] }[]) => void;
  onFechar: () => void;
}

interface LinhaRevisao {
  key: string; // `${pdfId}::${topico}`
  pdfId: string;
  pdfNome: string;
  materia: string;
  topico: string;
  inicio: string;
  fim: string;
  incluir: boolean;
}

type StatusPdf = "processando" | "feito" | "erro";

export default function SugestaoLoteModal({ pdfs, onAplicar, onFechar }: Props) {
  // só entram PDFs com pelo menos 1 tópico marcado que AINDA não tem intervalo salvo — não
  // reprocessa (nem arrisca sobrescrever) o que já foi revisado e confirmado antes
  const [alvos] = useState(() =>
    pdfs.filter((p) => (p.topicos ?? []).some((t) => !p.intervalosPaginas?.some((ip) => ip.topico === t)))
  );

  const [fase, setFase] = useState<"resumo" | "processando" | "revisao">("resumo");
  const [status, setStatus] = useState<Record<string, StatusPdf>>({});
  const [concluidos, setConcluidos] = useState(0);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [linhas, setLinhas] = useState<LinhaRevisao[]>([]);

  const iniciar = async () => {
    if (alvos.length === 0) return;
    setFase("processando");
    const todasLinhas: LinhaRevisao[] = [];
    const novosErros: Record<string, string> = {};
    for (const pdf of alvos) {
      setStatus((s) => ({ ...s, [pdf.id]: "processando" }));
      const topicosAlvo = (pdf.topicos ?? []).filter((t) => !pdf.intervalosPaginas?.some((ip) => ip.topico === t));
      try {
        const blob = pdf.arquivoEnviado ? await obterArquivoPdf(pdf.id) : null;
        if (!blob) throw new Error("arquivo não encontrado no Storage");

        const form = new FormData();
        form.append("file", blob, `${pdf.nome}.pdf`);
        form.append("topicos", JSON.stringify(topicosAlvo));

        const res = await fetch("/api/ai/pdf-topicos-paginas", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as {
          intervalos?: { topico: string; paginaInicio: number; paginaFim: number }[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);

        for (const it of data.intervalos ?? []) {
          todasLinhas.push({
            key: `${pdf.id}::${it.topico}`,
            pdfId: pdf.id,
            pdfNome: pdf.nome,
            materia: pdf.materia,
            topico: it.topico,
            inicio: String(it.paginaInicio),
            fim: String(it.paginaFim),
            incluir: true,
          });
        }
        setStatus((s) => ({ ...s, [pdf.id]: "feito" }));
      } catch (e) {
        novosErros[pdf.id] = e instanceof Error ? e.message : "erro desconhecido";
        setStatus((s) => ({ ...s, [pdf.id]: "erro" }));
      }
      setConcluidos((n) => n + 1);
    }
    // ordena por matéria/PDF/tópico só pra ficar fácil de escanear na revisão
    todasLinhas.sort((a, b) => a.materia.localeCompare(b.materia) || a.pdfNome.localeCompare(b.pdfNome) || a.topico.localeCompare(b.topico));
    setErros(novosErros);
    setLinhas(todasLinhas);
    setFase("revisao");
  };

  const atualizarLinha = (key: string, patch: Partial<LinhaRevisao>) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const selecionadas = linhas.filter((l) => {
    const inicio = parseInt(l.inicio);
    const fim = parseInt(l.fim);
    return l.incluir && Number.isFinite(inicio) && Number.isFinite(fim) && inicio >= 1 && fim >= inicio;
  });

  const aplicar = () => {
    if (selecionadas.length === 0) { onFechar(); return; }
    const porPdf = new Map<string, TopicoPaginas[]>();
    for (const l of selecionadas) {
      const arr = porPdf.get(l.pdfId) ?? [];
      arr.push({ topico: l.topico, paginaInicio: parseInt(l.inicio), paginaFim: parseInt(l.fim) });
      porPdf.set(l.pdfId, arr);
    }
    onAplicar([...porPdf.entries()].map(([id, intervalos]) => ({ id, intervalos })));
    onFechar();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> Sugerir páginas para todos os PDFs
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {fase === "resumo" && (
        alvos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Todos os PDFs com tópico marcado já têm intervalo de páginas salvo — nada pra sugerir.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {alvos.length} PDF{alvos.length !== 1 ? "s" : ""} com tópico sem intervalo de páginas
              ainda serão analisados (a IA prioriza o índice de cada material — bem mais rápido e
              preciso que ler o PDF inteiro). PDFs sem tópico marcado, ou já totalmente mapeados,
              são pulados. Pode demorar alguns minutos com muitos PDFs — nada é salvo até você
              revisar e confirmar no final.
            </p>
            <button
              type="button"
              onClick={iniciar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Iniciar análise de {alvos.length} PDF{alvos.length !== 1 ? "s" : ""}
            </button>
          </>
        )
      )}

      {fase === "processando" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
            <span className="text-xs text-foreground">
              Analisando {Math.min(concluidos + 1, alvos.length)} de {alvos.length}…
            </span>
          </div>
          <div className="bg-muted dark:bg-muted rounded-full h-2 mb-3">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(concluidos / alvos.length) * 100}%` }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 -mr-1">
            {alvos.map((pdf) => (
              <div key={pdf.id} className="flex items-center gap-2 text-xs">
                {status[pdf.id] === "processando" && <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />}
                {status[pdf.id] === "feito" && <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                {status[pdf.id] === "erro" && <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                {!status[pdf.id] && <span className="h-3 w-3 flex-shrink-0" />}
                <span className="truncate text-muted-foreground" title={pdf.nome}>{pdf.nome}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {fase === "revisao" && (
        <>
          <div className="text-xs text-foreground mb-1">
            {linhas.length} intervalo{linhas.length !== 1 ? "s" : ""} sugerido{linhas.length !== 1 ? "s" : ""} — confira e desmarque o que não fizer sentido antes de aplicar.
          </div>
          {Object.keys(erros).length > 0 && (() => {
            const n = Object.keys(erros).length;
            return (
              <div className="mb-3 text-[11px] text-amber-600 dark:text-amber-400">
                {n} PDF{n !== 1 ? "s" : ""} não {n !== 1 ? "puderam" : "pôde"} ser analisado{n !== 1 ? "s" : ""} (arquivo ausente ou sem texto legível) — confira manualmente depois.
              </div>
            );
          })()}
          {linhas.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">A IA não conseguiu identificar páginas em nenhum dos PDFs analisados.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-1.5 mb-3 mt-2 pr-1 -mr-1">
                {linhas.map((l) => (
                  <div key={l.key} className="flex items-center gap-2 rounded-lg border border-border dark:border-border px-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={l.incluir}
                      onChange={(e) => atualizarLinha(l.key, { incluir: e.target.checked })}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground truncate" title={l.topico}>{l.topico}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{l.materia} · {l.pdfNome}</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={l.inicio}
                      onChange={(e) => atualizarLinha(l.key, { inicio: e.target.value })}
                      className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary flex-shrink-0"
                    />
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">até</span>
                    <input
                      type="number"
                      min={1}
                      value={l.fim}
                      onChange={(e) => atualizarLinha(l.key, { fim: e.target.value })}
                      className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={aplicar}
                disabled={selecionadas.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
              >
                <Check className="h-3.5 w-3.5" /> Aplicar {selecionadas.length} intervalo{selecionadas.length !== 1 ? "s" : ""}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
