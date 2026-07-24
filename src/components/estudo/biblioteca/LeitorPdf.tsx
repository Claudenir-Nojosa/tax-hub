"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2, Clock, Pause, Play } from "lucide-react";
import type { Carta, PdfEstudo, TipoCarta } from "@/lib/estudo-data";
import { fmtCrono, novaCartaManual } from "./biblioteca-utils";
import InputPaginaLeitor from "./InputPaginaLeitor";
import NovoCartaoForm, { TIPO_CARTAO_CONFIG } from "./NovoCartaoForm";

// pdf.js só carrega quando o leitor abre (bundle pesado — não entra no load da aba)
const VisorPdf = dynamic(() => import("./VisorPdf"), { ssr: false });

// ─── Leitor fullscreen ───────────────────────────────────────────────────────

export default function LeitorPdf({
  pdf, blob, onAtualizarPagina, onRegistrarSessao, onAdicionarCartas, minutosMetaRestantes, onFechar,
}: {
  pdf: PdfEstudo;
  blob: Blob;
  onAtualizarPagina: (pagina: number) => void;
  onRegistrarSessao?: (minutos: number, materia: string, topico: string | undefined, paginas: number | undefined, descricao: string) => void;
  onAdicionarCartas?: (cartas: Carta[]) => void;
  // trilha dinâmica: minutos que faltavam (na abertura do leitor) pro bloco de hoje desta
  // matéria — quando o cronômetro da sessão cruza esse valor, avisa que a meta do dia foi batida
  minutosMetaRestantes?: number;
  onFechar: () => void;
}) {
  // cronômetro: conta sozinho desde a abertura; pausável. Ao fechar com ≥1 min, a sessão vira
  // atividade de Estudo no calendário da matéria/tópico do PDF (páginas = delta do "parei na pág.")
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const segundosRef = useRef(0);
  const paginaInicialRef = useRef(pdf.paginaAtual);
  const pdfRef = useRef(pdf);
  pdfRef.current = pdf;

  // cartão MANUAL sem grifo: botões na barra (ao lado de "Parei aqui") abrem o formulário do
  // tipo escolhido (Monstro / V ou F / Tesouro) direto, já travado na matéria/tópico do PDF —
  // sem precisar selecionar texto nem sair da página do PDF (o formulário fica por cima, o PDF
  // continua visível atrás).
  const [paginaVisivel, setPaginaVisivel] = useState(Math.max(1, pdf.paginaAtual || 1));
  const [cartaForm, setCartaForm] = useState<TipoCarta | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salvarCartaManual = (frente: string, verso: string, gabarito?: "verdadeiro" | "falso") => {
    if (!cartaForm || !onAdicionarCartas) return;
    const p = pdfRef.current;
    const carta = novaCartaManual({ tipo: cartaForm, materia: p.materia, topico: p.topicos?.[0], frente, verso, gabarito });
    onAdicionarCartas([carta]);
    setCartaForm(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(`✓ Cartão criado em ${p.materia}${p.topicos?.[0] ? ` · ${p.topicos[0]}` : ""}`);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  // aviso da trilha dinâmica: dispara UMA vez quando a sessão atual cobre o que faltava do
  // bloco de hoje desta matéria (o restante veio congelado da abertura — as sessões só entram
  // no calendário ao fechar o leitor, então o cronômetro é a única fonte "ao vivo")
  const metaAvisadaRef = useRef(false);
  const metaRestanteRef = useRef(minutosMetaRestantes);

  useEffect(() => {
    if (pausado) return;
    const interval = setInterval(() => {
      segundosRef.current += 1;
      setSegundos(segundosRef.current);
      const restante = metaRestanteRef.current;
      if (!metaAvisadaRef.current && restante !== undefined && restante > 0 && segundosRef.current >= restante * 60) {
        metaAvisadaRef.current = true;
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(`🎯 Meta de hoje de ${pdfRef.current.materia} concluída!`);
        toastTimerRef.current = setTimeout(() => setToast(null), 6000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pausado]);

  const encerrarSessao = () => {
    const minutos = Math.round(segundosRef.current / 60);
    if (minutos >= 1 && onRegistrarSessao) {
      const p = pdfRef.current;
      const paginasLidas = p.paginaAtual - paginaInicialRef.current;
      onRegistrarSessao(
        minutos,
        p.materia,
        p.topicos?.[0],
        paginasLidas > 0 ? paginasLidas : undefined,
        `Leitura: ${p.nome}`
      );
    }
    onFechar();
  };
  const encerrarRef = useRef(encerrarSessao);
  encerrarRef.current = encerrarSessao;

  // Esc fecha (registrando a sessão) + trava o scroll do body enquanto o leitor está aberto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") encerrarRef.current(); };
    document.addEventListener("keydown", onKey);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* barra fina: voltar · nome · parei na pág. · cronômetro — segue o tema do app (antes
          forçava bg-muted text-white sempre, ilegível no tema claro) */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 h-12 flex-shrink-0 bg-card text-foreground border-b border-border">
        <button
          type="button"
          onClick={encerrarSessao}
          title="Fechar o leitor (a sessão do cronômetro é salva na matéria/tópico)"
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{pdf.nome}</div>
          <div className="text-[10px] text-muted-foreground truncate">{pdf.materia}{pdf.topicos?.[0] ? ` · ${pdf.topicos[0]}` : ""}</div>
        </div>

        <button
          type="button"
          onClick={() => onAtualizarPagina(paginaVisivel)}
          title={`Marcar que você parou na página visível (${paginaVisivel})`}
          className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          pág. {paginaVisivel} · Parei aqui
        </button>

        {/* botões de criar cartão — direto na barra, sem precisar selecionar texto nem sair da
            página do PDF: clicou, abre o formulário (por cima do PDF, que continua visível) */}
        {onAdicionarCartas && (
          <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-border pl-1.5 ml-0.5">
            {(Object.entries(TIPO_CARTAO_CONFIG) as [TipoCarta, typeof TIPO_CARTAO_CONFIG.monstro][]).map(([tipo, cfg]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setCartaForm(tipo)}
                title={`Criar cartão ${cfg.label}`}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <cfg.Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}

        <label className="hidden sm:block text-[11px] text-muted-foreground flex-shrink-0">Parei na pág.</label>
        <InputPaginaLeitor
          key={`${pdf.id}:${pdf.paginaAtual}`}
          pdf={pdf}
          onCommit={onAtualizarPagina}
        />
        <span className="hidden sm:block text-[11px] text-muted-foreground flex-shrink-0">de {pdf.totalPaginas}</span>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 font-mono text-sm ${
            pausado ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
          title="Cronômetro da sessão — salvo automaticamente nesta matéria/tópico ao fechar"
        >
          <Clock className="h-3.5 w-3.5" />
          {fmtCrono(segundos)}
        </div>
        <button
          type="button"
          onClick={() => setPausado((v) => !v)}
          title={pausado ? "Retomar cronômetro" : "Pausar cronômetro"}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      </div>

      {/* o PDF em si (pdf.js com camada de texto) — ocupa TODO o resto da tela. A página inicial
          é a DO MOMENTO DA ABERTURA (ref), pra não pular o scroll a cada commit do progresso */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <VisorPdf
          blob={blob}
          paginaInicial={Math.max(1, Math.min(paginaInicialRef.current || 1, pdf.totalPaginas))}
          onPaginaVisivel={setPaginaVisivel}
        />
      </div>

      {/* formulário manual do cartão — já travado na matéria/tópico do PDF, aberto pelos botões
          da barra; fica por cima do PDF, que continua visível atrás (não navega pra outra tela) */}
      {cartaForm && (
        <NovoCartaoForm
          tipo={cartaForm}
          materia={pdf.materia}
          topico={pdf.topicos?.[0]}
          onSalvar={salvarCartaManual}
          onCancelar={() => setCartaForm(null)}
        />
      )}

      {/* toast de confirmação */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2 rounded-full text-xs shadow-xl border bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> {toast}
        </div>
      )}
    </div>
  );
}
