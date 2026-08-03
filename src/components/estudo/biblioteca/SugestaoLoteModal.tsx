"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import type { MateriaConcurso, MateriaDef, PdfEstudo, TopicoPaginas } from "@/lib/estudo-data";
import { obterArquivoPdf } from "@/lib/pdf-storage";
import { fecharLacunasIntervalos } from "./biblioteca-utils";

// Sugestão de intervalo de páginas por IA em LOTE, pra todos os PDFs da Biblioteca de uma vez —
// mesma rota /api/ai/pdf-topicos-paginas usada no "Sugerir com IA" do FormPdf.tsx (Fase 5), só
// que rodada sequencialmente pra cada PDF com tópico marcado ainda sem intervalo salvo. Nunca
// aplica sozinho: sempre passa por uma tela de revisão (editável, com checkbox por linha) antes
// de qualquer coisa ser gravada — mesma filosofia do fluxo de um PDF só.

interface Props {
  pdfs: PdfEstudo[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  // quando informado, restringe a sugestão em lote aos PDFs dessa matéria só — mesmo fluxo,
  // mesmo componente, só muda o filtro inicial (botão "Sugerir com IA" no cabeçalho de cada
  // matéria na Biblioteca, ao lado do "Sugerir páginas (IA)" geral que continua cobrindo tudo)
  materiaFiltro?: string;
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

export default function SugestaoLoteModal({ pdfs, materiaFiltro, onAplicar, onFechar }: Props) {
  // só entram PDFs com pelo menos 1 tópico marcado que AINDA não tem intervalo salvo — não
  // reprocessa (nem arrisca sobrescrever) o que já foi revisado e confirmado antes. Com
  // materiaFiltro, restringe ANTES disso aos PDFs daquela matéria só.
  const [alvos] = useState(() =>
    pdfs
      .filter((p) => !materiaFiltro || p.materia === materiaFiltro)
      .filter((p) => (p.topicos ?? []).some((t) => !p.intervalosPaginas?.some((ip) => ip.topico === t)))
  );

  const [fase, setFase] = useState<"resumo" | "processando" | "revisao">("resumo");
  const [status, setStatus] = useState<Record<string, StatusPdf>>({});
  const [concluidos, setConcluidos] = useState(0);
  // mensagem REAL do erro por PDF (antes só existia um texto genérico fixo na tela, que
  // chutava "arquivo ausente ou sem texto legível" sem checar qual dos dois — ou se era outra
  // causa (timeout, rate limit da IA etc.) — de verdade aconteceu
  const [erros, setErros] = useState<Record<string, string>>({});
  // PDFs onde a IA achou MENOS intervalos do que tópicos foram pedidos — cobertura parcial,
  // silenciosa até agora (o PDF só aparecia na lista de "sucesso" com menos linhas, sem
  // nenhum aviso de que sobrou tópico sem sugestão)
  const [parciais, setParciais] = useState<Record<string, { encontrados: number; esperados: number }>>({});
  const [mostrarDetalheErros, setMostrarDetalheErros] = useState(false);
  const [linhas, setLinhas] = useState<LinhaRevisao[]>([]);

  const iniciar = async () => {
    if (alvos.length === 0) return;
    setFase("processando");
    const todasLinhas: LinhaRevisao[] = [];
    const novosErros: Record<string, string> = {};
    const novosParciais: Record<string, { encontrados: number; esperados: number }> = {};
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

        const encontrados = data.intervalos?.length ?? 0;
        if (encontrados < topicosAlvo.length) {
          novosParciais[pdf.id] = { encontrados, esperados: topicosAlvo.length };
        }

        // funde com o que já tava salvo e fecha as lacunas — cobre o PDF inteiro (pág. 1 até o
        // fim do conteúdo), não só os trechos que a IA achou pra cada tópico isoladamente. Só
        // entra na revisão quem é novo OU cujo valor mudou por causa do fechamento de lacuna —
        // não reabre pra revisão o que já tava salvo e não mudou nada.
        const jaSalvos = pdf.intervalosPaginas ?? [];
        const novosDaIA: TopicoPaginas[] = (data.intervalos ?? []).map((it) => ({
          topico: it.topico,
          paginaInicio: it.paginaInicio,
          paginaFim: it.paginaFim,
        }));
        const completos = [...jaSalvos.filter((s) => !novosDaIA.some((n) => n.topico === s.topico)), ...novosDaIA];
        for (const f of fecharLacunasIntervalos(completos, pdf)) {
          const salvoAntes = jaSalvos.find((s) => s.topico === f.topico);
          const mudou = !salvoAntes || salvoAntes.paginaInicio !== f.paginaInicio || salvoAntes.paginaFim !== f.paginaFim;
          if (!mudou) continue;
          todasLinhas.push({
            key: `${pdf.id}::${f.topico}`,
            pdfId: pdf.id,
            pdfNome: pdf.nome,
            materia: pdf.materia,
            topico: f.topico,
            inicio: String(f.paginaInicio),
            fim: String(f.paginaFim),
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
    setParciais(novosParciais);
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
          <Sparkles className="h-4 w-4 text-primary" />
          {materiaFiltro ? `Sugerir páginas — ${materiaFiltro}` : "Sugerir páginas para todos os PDFs"}
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
            {materiaFiltro
              ? `Todos os PDFs de ${materiaFiltro} com tópico marcado já têm intervalo de páginas salvo — nada pra sugerir.`
              : "Todos os PDFs com tópico marcado já têm intervalo de páginas salvo — nada pra sugerir."}
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
              <div className="mb-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMostrarDetalheErros((v) => !v)}
                  className="text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-2"
                >
                  {n} PDF{n !== 1 ? "s" : ""} não {n !== 1 ? "puderam" : "pôde"} ser analisado{n !== 1 ? "s" : ""} — {mostrarDetalheErros ? "ocultar" : "ver"} motivo de cada um
                </button>
                {mostrarDetalheErros && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto space-y-0.5 rounded-md bg-muted dark:bg-muted p-2">
                    {Object.entries(erros).map(([pdfId, msg]) => {
                      const nome = alvos.find((p) => p.id === pdfId)?.nome ?? pdfId;
                      return (
                        <div key={pdfId} className="flex gap-1.5 text-muted-foreground">
                          <span className="text-foreground truncate max-w-[45%]" title={nome}>{nome}</span>
                          <span className="flex-shrink-0">— {msg}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          {Object.keys(parciais).length > 0 && (
            <div className="mb-3 text-[11px] text-amber-600 dark:text-amber-400">
              {Object.keys(parciais).length} PDF{Object.keys(parciais).length !== 1 ? "s" : ""} tiveram só PARTE dos tópicos mapeados (a IA não achou marcação própria pra alguns — o fechamento de lacuna grudou essas páginas no tópico vizinho, então o PDF continua coberto por inteiro, só sem um intervalo específico pra cada tópico; separe manualmente se isso importar):
              <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5 rounded-md bg-muted dark:bg-muted p-2 text-muted-foreground">
                {Object.entries(parciais).map(([pdfId, p]) => {
                  const nome = alvos.find((a) => a.id === pdfId)?.nome ?? pdfId;
                  return (
                    <div key={pdfId} className="truncate" title={nome}>
                      {nome} — {p.encontrados} de {p.esperados} tópico{p.esperados !== 1 ? "s" : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
