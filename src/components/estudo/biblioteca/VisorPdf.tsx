"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

// Visor de PDF próprio (pdf.js) — substitui o viewer nativo do navegador porque o plugin nativo
// NÃO expõe a seleção de texto pro site (impossível "grifar → criar cartão" com iframe). Aqui
// cada página vira canvas + uma CAMADA DE TEXTO transparente selecionável (TextLayer), então o
// LeitorPdf consegue ler window.getSelection() e oferecer o botão de criar cartão.
// Páginas são VIRTUALIZADAS por CÁLCULO DE SCROLL (janela de ±1200px em volta da viewport): só
// as próximas são renderizadas — PDFs do Estratégia têm 100+ páginas e renderizar tudo travaria
// a aba. (Não usar IntersectionObserver aqui: em abas sem foco/ocultas o compositor pode nunca
// disparar os callbacks — scroll+offsetTop é determinístico em qualquer ambiente.)

// workerPort (Worker real empacotado pelo webpack) em vez de workerSrc: se o workerSrc falhar,
// o pdf.js cai num fallback global (globalThis.pdfjsWorker) que o unpdf — usado pra contar
// páginas no cadastro — registra com OUTRA versão do pdfjs, dando "API version X does not match
// Worker version Y". Com workerPort não existe fallback: é sempre o worker desta versão.
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" }
  );
}

// CSS mínimo da TextLayer (extraído do pdf_viewer.css oficial): spans transparentes posicionados
// por cima do canvas; a seleção fica visível pelo ::selection. --scale-factor é obrigatório no v4+.
const CSS_TEXT_LAYER = `
.pdfTextLayer { position: absolute; inset: 0; overflow: hidden; line-height: 1; text-size-adjust: none; forced-color-adjust: none; transform-origin: 0 0; caret-color: CanvasText; }
.pdfTextLayer span, .pdfTextLayer br { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
.pdfTextLayer ::selection, .pdfTextLayer span::selection { background: rgba(56, 189, 248, 0.45); color: transparent; }
`;

interface Props {
  blob: Blob;
  paginaInicial: number;
  onPaginaVisivel?: (pagina: number) => void;
}

export default function VisorPdf({ blob, paginaInicial, onPaginaVisivel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }[]>([]);
  const [scale, setScale] = useState<number | null>(null); // null até calcular o "ajustar à largura"
  const [erro, setErro] = useState<string | null>(null);
  // janela de páginas renderizadas (números inclusivos) — recalculada a cada scroll
  const [janela, setJanela] = useState<{ ini: number; fim: number }>({ ini: 1, fim: 2 });
  const jaRolouRef = useRef(false);
  const paginaVisivelRef = useRef(0);
  const janelaRef = useRef(janela);
  janelaRef.current = janela;

  // carrega o documento + dimensões (escala 1) de todas as páginas (só metadados — leve)
  useEffect(() => {
    let cancelado = false;
    let docLocal: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const buf = await blob.arrayBuffer();
        const d = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelado) { d.loadingTask.destroy(); return; }
        docLocal = d;
        const dd: { w: number; h: number }[] = [];
        for (let i = 1; i <= d.numPages; i++) {
          const page = await d.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          dd.push({ w: vp.width, h: vp.height });
        }
        if (cancelado) return;
        setDoc(d);
        setDims(dd);
        // ajustar à largura do container (com folga pras margens)
        const larguraDisponivel = (containerRef.current?.clientWidth ?? 900) - 48;
        setScale(Math.min(2.5, Math.max(0.5, larguraDisponivel / (dd[0]?.w ?? 612))));
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Erro ao abrir o PDF");
      }
    })();
    return () => {
      cancelado = true;
      docLocal?.loadingTask.destroy().catch(() => { /* já destruído */ });
    };
  }, [blob]);

  // recalcula (a) a janela de páginas renderizadas — as que cruzam a viewport ±1200px — e (b) a
  // página "visível" (a que cruza o meio da tela, mostrada na barra do leitor)
  const recalcular = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const topo = c.scrollTop - 1200;
    const fundo = c.scrollTop + c.clientHeight + 1200;
    const meio = c.scrollTop + c.clientHeight * 0.4;
    const wrappers = c.querySelectorAll<HTMLElement>("[data-pagina]");
    let ini = 0, fim = 0, atual = 1;
    for (const w of wrappers) {
      const n = Number(w.dataset.pagina);
      if (w.offsetTop + w.clientHeight >= topo && w.offsetTop <= fundo) {
        if (ini === 0) ini = n;
        fim = n;
      }
      if (w.offsetTop <= meio) atual = n;
    }
    if (ini !== 0 && (ini !== janelaRef.current.ini || fim !== janelaRef.current.fim)) {
      setJanela({ ini, fim });
    }
    if (atual !== paginaVisivelRef.current) {
      paginaVisivelRef.current = atual;
      onPaginaVisivel?.(atual);
    }
  }, [onPaginaVisivel]);

  // rola até a página onde o usuário parou — uma vez, quando o layout fica pronto — e dispara o
  // primeiro cálculo da janela (também re-executa quando o zoom muda, pois as alturas mudam)
  useEffect(() => {
    if (!doc || scale === null) return;
    // setTimeout(0) em vez de requestAnimationFrame: em abas ocultas/sem foco o compositor pode
    // nunca produzir frames (rAF nunca dispara) — timeout roda sempre, e o layout já está pronto
    const t = setTimeout(() => {
      if (!jaRolouRef.current) {
        jaRolouRef.current = true;
        if (paginaInicial > 1) {
          const alvo = containerRef.current?.querySelector<HTMLElement>(`[data-pagina="${Math.min(paginaInicial, doc.numPages)}"]`);
          if (alvo && containerRef.current) containerRef.current.scrollTop = alvo.offsetTop - 8;
        }
      }
      recalcular();
    }, 0);
    return () => clearTimeout(t);
  }, [doc, scale, paginaInicial, recalcular]);

  if (erro) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-red-400 px-6 text-center">
        Não consegui renderizar este PDF ({erro}). Tente reanexar o arquivo.
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={recalcular} className="flex-1 overflow-auto bg-gray-800 relative">
      <style>{CSS_TEXT_LAYER}</style>
      {!doc || scale === null ? (
        <div className="h-full flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Abrindo PDF…
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 py-4 px-3">
            {dims.map((d, i) => (
              <PaginaPdf
                key={i}
                doc={doc}
                numero={i + 1}
                largura={d.w}
                altura={d.h}
                scale={scale}
                ativo={i + 1 >= janela.ini && i + 1 <= janela.fim}
              />
            ))}
          </div>
          {/* zoom flutuante — o viewer é nosso, então o zoom também é */}
          <div className="sticky bottom-4 float-right mr-4 -mt-14 flex items-center gap-0.5 bg-gray-900/90 border border-gray-700 rounded-lg p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, Math.round(((s ?? 1) - 0.15) * 100) / 100))}
              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Diminuir zoom"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-gray-300 w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, Math.round(((s ?? 1) + 0.15) * 100) / 100))}
              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Aumentar zoom"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Página individual (virtualizada) ────────────────────────────────────────

function PaginaPdf({
  doc, numero, largura, altura, scale, ativo,
}: {
  doc: PDFDocumentProxy;
  numero: number;
  largura: number;
  altura: number;
  scale: number;
  ativo: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null = null;
    (async () => {
      try {
        const page = await doc.getPage(numero);
        if (cancelado || !canvasRef.current || !textRef.current) return;
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.promise;
        if (cancelado || !textRef.current) return;
        // camada de texto selecionável por cima do canvas — getTextContent() completo em vez do
        // stream: o streaming pode depender de agendamento de frame (quebra em aba oculta)
        const textContent = await page.getTextContent();
        if (cancelado || !textRef.current) return;
        const textDiv = textRef.current;
        textDiv.replaceChildren();
        textDiv.style.setProperty("--scale-factor", String(scale));
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport,
        });
        await textLayer.render();
      } catch (e) {
        // RenderingCancelledException ao trocar zoom/scroll rápido é esperado; o resto é bug real
        if (!(e instanceof Error && e.name === "RenderingCancelledException")) {
          console.error(`VisorPdf: falha ao renderizar página ${numero}:`, e);
        }
      }
    })();
    return () => {
      cancelado = true;
      renderTask?.cancel();
    };
  }, [ativo, scale, doc, numero]);

  return (
    <div
      data-pagina={numero}
      className="relative bg-white shadow-lg"
      style={{ width: largura * scale, height: altura * scale }}
    >
      {ativo && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0" />
          <div ref={textRef} className="pdfTextLayer" />
        </>
      )}
    </div>
  );
}
