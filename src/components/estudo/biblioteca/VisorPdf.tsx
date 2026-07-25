"use client";

// Polyfill: `Promise.withResolvers` (ES2024) só chegou no Safari 17.4 (mar/2024); pdfjs-dist v6
// usa isso internamente em quase toda troca de mensagem (sendWithPromise, cache de fonte, stream
// de chunks — 27 usos no bundle principal). Sem isso, iOS/Safari mais antigo (e navegadores
// in-app com WebKit desatualizado) quebram com "undefined is not a function" ao abrir QUALQUER
// PDF — reproduz exatamente o bug relatado (funciona no desktop com Chrome/Firefox atualizado,
// quebra só no celular). Precisa ficar ANTES do import de "pdfjs-dist" porque `Promise` é
// compartilhado globalmente no processo — e precisa ser repetido no worker (thread separada, com
// seu próprio global `Promise`), ver pdf-worker-entry.ts.
if (typeof window !== "undefined" && !("withResolvers" in Promise)) {
  // @ts-expect-error -- polyfill de API ES2024 ausente em runtimes mais antigos
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

// pdfjs-dist não reexporta TextItem/TextContent no barrel principal — tipo mínimo local com só
// os campos usados por ordenarPorLeitura() (str/transform/height vêm do TextItem real da lib)
interface ItemTextoPdf {
  str: string;
  transform: number[];
  height: number;
}

// Visor de PDF próprio (pdf.js) — substitui o viewer nativo do navegador porque o plugin nativo
// não dá o mesmo controle de zoom/virtualização que a leitura de PDFs de 100+ páginas precisa.
// Cada página vira canvas + uma CAMADA DE TEXTO transparente selecionável (TextLayer): a criação
// de cartão hoje é por botões na barra do leitor (não depende de seleção), mas o texto continua
// selecionável/copiável pro usuário — ordenarPorLeitura() garante que a seleção siga a ordem
// visual de leitura, não a ordem interna do PDF.
// Páginas são VIRTUALIZADAS por CÁLCULO DE SCROLL (janela de ±1200px em volta da viewport): só
// as próximas são renderizadas — PDFs do Estratégia têm 100+ páginas e renderizar tudo travaria
// a aba. (Não usar IntersectionObserver aqui: em abas sem foco/ocultas o compositor pode nunca
// disparar os callbacks — scroll+offsetTop é determinístico em qualquer ambiente.)

// workerPort (Worker real empacotado pelo webpack) em vez de workerSrc: se o workerSrc falhar,
// o pdf.js cai num fallback global (globalThis.pdfjsWorker) que o unpdf — usado pra contar
// páginas no cadastro — registra com OUTRA versão do pdfjs, dando "API version X does not match
// Worker version Y". Com workerPort não existe fallback: é sempre o worker desta versão.
// Aponta pro wrapper (pdf-worker-entry.ts) em vez do arquivo do pdfjs-dist direto: o wrapper
// aplica o MESMO polyfill de Promise.withResolvers antes de importar o worker de verdade — essa
// thread tem seu próprio global `Promise`, então o polyfill lá em cima não alcança aqui.
// SEM `{ type: "module" }`: reportado pelo usuário que, mesmo com o polyfill acima, em iPhone
// (Chrome iOS — que roda sobre o MESMO motor WebKit do Safari, por exigência da Apple) o
// getDocument() nunca respondia (timeout de 30s, sem erro nenhum) — sintoma de "module worker"
// (`{type:"module"}`) quebrado nesse motor, um bug antigo e conhecido do WebKit com imports
// estáticos dentro de worker de módulo. Worker CLÁSSICO (sem `type`) resolve isso: o webpack já
// empacota o wrapper + o import do pdfjs-dist num chunk único de qualquer jeito — o `type` só
// controla como o NAVEGADOR interpreta o arquivo final, não como o webpack empacota — então tirar
// o `type` não muda nada no desktop e evita depender de suporte a módulo ES em worker no iOS.
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL("./pdf-worker-entry.ts", import.meta.url)
  );
}

// PDFs com caixas de texto (ex.: "Leis Bizuradas" do Estratégia — o artigo em caixa, o comentário
// fora dela) costumam ter o conteúdo gravado no PDF numa ordem DIFERENTE da ordem visual (a caixa
// pode ter sido desenhada antes/depois do parágrafo ao redor no fluxo interno do arquivo).
// getTextContent() devolve os itens nessa ordem "de gravação", e a seleção nativa do navegador
// segue ORDEM NO DOM — se os spans da TextLayer forem inseridos na ordem que o PDF entrega,
// arrastar uma seleção visualmente contínua vira um "salpicado" (pega texto de caixas/parágrafos
// distantes que caem no meio do intervalo do DOM). Corrige-se reordenando os itens por POSIÇÃO
// VISUAL (linhas de cima pra baixo, dentro de cada linha da esquerda pra direita) antes de montar
// a TextLayer — o item.transform é [a,b,c,d,x,y] em espaço PDF, onde y CRESCE PRA CIMA.
function ordenarPorLeitura<T>(items: T[]): T[] {
  const textos = items as unknown as (ItemTextoPdf | { type: string })[];
  // se algum item for conteúdo marcado (sem transform — ex. abre/fecha tag estrutural), não
  // reordena: mexer na intercalação desses marcadores pode quebrar a estrutura que a TextLayer
  // espera. Na prática a maioria dos PDFs simples não tem conteúdo marcado.
  if (textos.some((it) => !("transform" in it))) return items;
  const comPos = textos as ItemTextoPdf[];

  const alturaMedia = comPos.reduce((s, it) => s + (it.height || 0), 0) / (comPos.length || 1);
  const limiar = Math.max(alturaMedia * 0.5, 1);

  const ordenadoPorY = [...comPos].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);

  const linhas: ItemTextoPdf[][] = [];
  let refY: number | null = null;
  for (const item of ordenadoPorY) {
    const y = item.transform[5];
    const ultima = linhas[linhas.length - 1];
    if (ultima && refY !== null && Math.abs(refY - y) <= limiar) {
      ultima.push(item);
    } else {
      linhas.push([item]);
    }
    refY = y;
  }
  return linhas.flatMap((linha) => [...linha].sort((a, b) => a.transform[4] - b.transform[4])) as unknown as T[];
}

// CSS da TextLayer portado do pdf_viewer.css OFICIAL do pdfjs-dist v6 (.textLayer). No v6 o JS
// NÃO define mais font-size/transform inline em cada span: ele injeta variáveis CSS por span
// (--font-height, --scale-x, --rotate) e espera que o CSS as transforme em font-size/transform —
// o app fornece --scale-factor (= viewport.scale) e o resto deriva via --total-scale-factor.
// LIÇÃO: uma versão "mínima" deste CSS (só position/color/white-space, padrão da v4) deixa os
// spans com fonte herdada e sem scaleX → a caixa invisível de cada texto fica de tamanho errado
// e a SELEÇÃO aparece deslocada/maior/menor que o texto desenhado no canvas.
const CSS_TEXT_LAYER = `
.pdfTextLayer {
  --user-unit: 1;
  --total-scale-factor: calc(var(--scale-factor) * var(--user-unit));
  --scale-round-x: 1px;
  --scale-round-y: 1px;
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
  color-scheme: only light;
  position: absolute;
  text-align: initial;
  inset: 0;
  overflow: clip;
  opacity: 1;
  line-height: 1;
  letter-spacing: normal;
  word-spacing: normal;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  caret-color: CanvasText;
  z-index: 0;
}
.pdfTextLayer span, .pdfTextLayer br {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  user-select: text;
}
.pdfTextLayer > :not(.markedContent),
.pdfTextLayer .markedContent span:not(.markedContent) {
  z-index: 1;
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}
.pdfTextLayer .markedContent { display: contents; }
.pdfTextLayer ::selection { background: rgba(56, 189, 248, 0.45); color: transparent; }
.pdfTextLayer br::selection { background: transparent; }
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
  // segundos decorridos abrindo o documento — só pra mostrar na tela de loading e no erro de
  // timeout; ajuda a diferenciar "travou de vez" de "só está MUITO lento nesse aparelho/arquivo"
  const [segundosAbrindo, setSegundosAbrindo] = useState(0);
  // janela de páginas renderizadas (números inclusivos) — recalculada a cada scroll
  const [janela, setJanela] = useState<{ ini: number; fim: number }>({ ini: 1, fim: 2 });
  // true assim que o usuário rola manualmente (roda/toque) ou navega por seta — a partir daí
  // paramos de "puxar" o scroll de volta pra paginaInicial (ver efeito abaixo)
  const interagiuRef = useRef(false);
  const paginaVisivelRef = useRef(0);
  const janelaRef = useRef(janela);
  janelaRef.current = janela;
  // página + fração de scroll dentro dela, capturada ANTES de um clique de zoom — sem isso, mudar
  // o zoom reflui a altura de todas as páginas mas o scrollTop (um valor em pixel absoluto) fica
  // parado, então o mesmo pixel passa a apontar pra outra página ("sair da página" ao dar zoom,
  // reportado pelo usuário)
  const ancoraZoomRef = useRef<{ pagina: number; fracao: number } | null>(null);

  // acha a página que contém o topo da viewport agora, e a que fração da altura DELA o scroll
  // está — usado só pra restaurar a posição relativa depois que o zoom muda a altura das páginas
  const capturarAncora = useCallback((): { pagina: number; fracao: number } | null => {
    const c = containerRef.current;
    if (!c) return null;
    const wrappers = c.querySelectorAll<HTMLElement>("[data-pagina]");
    for (const w of wrappers) {
      const topo = w.offsetTop;
      const altura = w.clientHeight;
      if (altura <= 0) continue;
      if (c.scrollTop < topo + altura) {
        return { pagina: Number(w.dataset.pagina), fracao: Math.max(0, (c.scrollTop - topo) / altura) };
      }
    }
    return null;
  }, []);

  // carrega o documento — só a página 1 bloqueia o "Abrindo PDF...", as demais entram em
  // background (ver comentário abaixo)
  useEffect(() => {
    let cancelado = false;
    let taskLocal: ReturnType<typeof pdfjs.getDocument> | null = null;
    const inicio = Date.now();
    const tickerId = setInterval(() => {
      if (!cancelado) setSegundosAbrindo(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    (async () => {
      try {
        const buf = await blob.arrayBuffer();
        const task = pdfjs.getDocument({ data: new Uint8Array(buf) });
        taskLocal = task;
        // watchdog: em navegadores onde o worker trava sem lançar erro (ex.: alguma API interna
        // indisponível), o "Abrindo PDF..." giraria pra sempre — com timeout vira um erro
        // acionável em vez de spinner infinito (relatado pelo usuário no celular). 2min (não 30s
        // como antes) — depois do usuário bater no timeout mesmo já com worker clássico, é
        // preciso separar "travou de vez" de "só está bem mais lento nesse aparelho/arquivo do
        // que qualquer coisa testada até aqui" antes de investigar mais a fundo.
        let timeoutId: ReturnType<typeof setTimeout>;
        const d = await Promise.race([
          task.promise.finally(() => clearTimeout(timeoutId)),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              const s = Math.floor((Date.now() - inicio) / 1000);
              reject(new Error(`Tempo esgotado ao abrir o PDF depois de ${s}s — atualize a página ou tente outro navegador`));
            }, 120000);
          }),
        ]);
        if (cancelado) return;

        // só a página 1 define a dimensão inicial — as demais usam a MESMA estimativa (quase
        // sempre certa: PDFs de curso têm todas as páginas do mesmo tamanho) e são corrigidas em
        // segundo plano. Sem isso, um PDF de 100+ páginas (comum no Estratégia) esperava dezenas
        // de getPage() sequenciais (1 round-trip pro worker cada) antes de mostrar qualquer
        // coisa — em celular isso é bem mais lento que no desktop e parecia travado ("girando
        // sem parar"), mesmo sem nenhum erro de verdade.
        const page1 = await d.getPage(1);
        if (cancelado) return;
        const vp1 = page1.getViewport({ scale: 1 });
        const dimPadrao = { w: vp1.width, h: vp1.height };
        setDoc(d);
        setDims(new Array(d.numPages).fill(dimPadrao));
        // zoom inicial sempre 160% (pedido do usuário — antes era "ajustar à largura", que dava
        // um zoom inicial imprevisível dependendo do tamanho da janela/PDF)
        setScale(1.6);

        // corrige em segundo plano só as páginas cuja dimensão real divergir da estimativa
        for (let i = 2; i <= d.numPages; i++) {
          if (cancelado) return;
          const page = await d.getPage(i);
          if (cancelado) return;
          const vp = page.getViewport({ scale: 1 });
          if (vp.width !== dimPadrao.w || vp.height !== dimPadrao.h) {
            const dim = { w: vp.width, h: vp.height };
            setDims((prev) => prev.map((p, idx) => (idx === i - 1 ? dim : p)));
          }
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Erro ao abrir o PDF");
      } finally {
        clearInterval(tickerId);
      }
    })();
    return () => {
      cancelado = true;
      clearInterval(tickerId);
      taskLocal?.destroy().catch(() => { /* já destruído */ });
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

  // detecta interação manual (roda do mouse / toque) pra parar de "puxar" o scroll de volta pra
  // paginaInicial — sem isso, o usuário nunca conseguiria se afastar da página inicial enquanto
  // dims ainda estiver sendo corrigido em segundo plano (ver efeito abaixo)
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const marcar = () => { interagiuRef.current = true; };
    c.addEventListener("wheel", marcar, { passive: true });
    c.addEventListener("touchstart", marcar, { passive: true });
    return () => {
      c.removeEventListener("wheel", marcar);
      c.removeEventListener("touchstart", marcar);
    };
  }, []);

  // rola até a página onde o usuário parou — e continua reaplicando essa posição sempre que dims
  // mudar em segundo plano (correção de altura de páginas anteriores à alvo — ver loop "corrige em
  // segundo plano" acima) até o usuário mexer no scroll de verdade. Sem isso, corrigir a altura de
  // QUALQUER página antes da alvo desloca o layout de tudo abaixo dela e o scrollTop (um pixel
  // fixo) passa a apontar pra outra página — relatado pelo usuário: abrir na pág. 153 e cair na
  // 154. Também RESTAURA a âncora de zoom (página + fração) sempre que o zoom muda, pelo mesmo
  // motivo (alturas mudam, scrollTop fixo desalinha).
  useEffect(() => {
    if (!doc || scale === null) return;
    // setTimeout(0) em vez de requestAnimationFrame: em abas ocultas/sem foco o compositor pode
    // nunca produzir frames (rAF nunca dispara) — timeout roda sempre, e o layout já está pronto
    const t = setTimeout(() => {
      if (ancoraZoomRef.current) {
        const { pagina, fracao } = ancoraZoomRef.current;
        ancoraZoomRef.current = null;
        const alvo = containerRef.current?.querySelector<HTMLElement>(`[data-pagina="${pagina}"]`);
        if (alvo && containerRef.current) containerRef.current.scrollTop = alvo.offsetTop + fracao * alvo.clientHeight;
      } else if (!interagiuRef.current && paginaInicial > 1) {
        const alvo = containerRef.current?.querySelector<HTMLElement>(`[data-pagina="${Math.min(paginaInicial, doc.numPages)}"]`);
        if (alvo && containerRef.current) containerRef.current.scrollTop = alvo.offsetTop - 8;
      }
      recalcular();
    }, 0);
    return () => clearTimeout(t);
  }, [doc, scale, dims, paginaInicial, recalcular]);

  // seta direita/esquerda navega pra próxima/anterior página — a partir da página "visível"
  // atual (mesma referência que já move o indicador "pág. X" da barra), rolando até o topo dela.
  // Ignorado enquanto o usuário digita em input/textarea/select (ex.: campo "parei na página" ou
  // o formulário de criar cartão) pra não roubar as setas de quem só está navegando texto/número.
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const alvoEl = e.target as HTMLElement | null;
      if (alvoEl && /^(INPUT|TEXTAREA|SELECT)$/.test(alvoEl.tagName)) return;
      const c = containerRef.current;
      if (!c) return;
      const atual = paginaVisivelRef.current || 1;
      const proxima = e.key === "ArrowRight" ? Math.min(doc.numPages, atual + 1) : Math.max(1, atual - 1);
      if (proxima === atual) return;
      const alvo = c.querySelector<HTMLElement>(`[data-pagina="${proxima}"]`);
      if (!alvo) return;
      e.preventDefault();
      interagiuRef.current = true;
      c.scrollTo({ top: alvo.offsetTop - 8, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc]);

  if (erro) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-red-400 px-6 text-center">
        Não consegui renderizar este PDF ({erro}). Tente reanexar o arquivo.
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={recalcular} className="flex-1 overflow-auto bg-muted relative">
      <style>{CSS_TEXT_LAYER}</style>
      {!doc || scale === null ? (
        <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Abrindo PDF{segundosAbrindo > 0 ? ` (${segundosAbrindo}s)` : "…"}
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
          <div className="sticky bottom-4 float-right mr-4 -mt-14 flex items-center gap-0.5 bg-muted/90 border border-border rounded-lg p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                ancoraZoomRef.current = capturarAncora();
                setScale((s) => Math.max(0.5, Math.round(((s ?? 1) - 0.15) * 100) / 100));
              }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              title="Diminuir zoom"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => {
                ancoraZoomRef.current = capturarAncora();
                setScale((s) => Math.min(3, Math.round(((s ?? 1) + 0.15) * 100) / 100));
              }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
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

        // 1) camada de texto selecionável — montada ANTES do canvas: não depende dele, deixa o
        // texto selecionável mais cedo e não usa requestAnimationFrame (o canvas usa — ver
        // abaixo). getTextContent() completo em vez do stream: o streaming pode depender de
        // agendamento de frame (quebra em aba oculta).
        const textContent = await page.getTextContent();
        if (cancelado || !textRef.current) return;
        // reordena por posição visual ANTES de montar a TextLayer (ver comentário da função) —
        // sem isso, arrastar uma seleção em PDFs com caixas de texto vira um "salpicado"
        const textContentOrdenado = { ...textContent, items: ordenarPorLeitura(textContent.items) };
        const textDiv = textRef.current;
        textDiv.replaceChildren();
        // contrato do v6: o app fornece --scale-factor = viewport.scale; o CSS_TEXT_LAYER deriva
        // --total-scale-factor e calcula font-size/transform de cada span a partir das variáveis
        // (--font-height/--scale-x/--rotate) que o TextLayer injeta por span
        textDiv.style.setProperty("--scale-factor", String(viewport.scale));
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContentOrdenado,
          container: textDiv,
          viewport,
        });
        await textLayer.render();

        // 2) desenho da página no canvas — só `canvas` (API atual do v6), nunca junto com
        // `canvasContext` (a doc diz que canvasContext é só compat retroativa e exige
        // canvas: null quando usado; passar os dois deixa o RenderTask num estado ambíguo)
        if (cancelado || !canvasRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.promise;
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
