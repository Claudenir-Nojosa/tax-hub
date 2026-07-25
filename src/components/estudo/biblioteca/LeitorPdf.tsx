"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2, Clock, Flag, ListChecks, Pause, Play } from "lucide-react";
import {
  gerarQuestoesGrupos, topicoKey,
  type AtividadeTipo, type Carta, type PdfEstudo, type PdfQuestoes, type TipoCarta, type TopicoState,
} from "@/lib/estudo-data";
import { fmtCrono, novaCartaManual, sincronizarCadernoComQuestoes } from "./biblioteca-utils";
import InputPaginaLeitor from "./InputPaginaLeitor";
import NovoCartaoForm, { TIPO_CARTAO_CONFIG } from "./NovoCartaoForm";
import PainelQuestoes from "./PainelQuestoes";

// pdf.js só carrega quando o leitor abre (bundle pesado — não entra no load da aba)
const VisorPdf = dynamic(() => import("./VisorPdf"), { ssr: false });

// ─── Leitor fullscreen ───────────────────────────────────────────────────────

export default function LeitorPdf({
  pdf, blob, topicos, onAtualizarPagina, onAtualizarPdf, onUpdateTopicos, onRegistrarSessao, onAdicionarCartas, minutosMetaRestantes, onFechar,
}: {
  pdf: PdfEstudo;
  blob: Blob;
  topicos: Record<string, TopicoState>;
  onAtualizarPagina: (pagina: number) => void;
  // patch genérico no registro do PDF (fim do conteúdo, questões geradas) — mesmo PDF, só outros campos
  onAtualizarPdf: (patch: Partial<PdfEstudo>) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onRegistrarSessao?: (minutos: number, tipo: AtividadeTipo, materia: string, topico: string | undefined, paginas: number | undefined, descricao: string) => void;
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

  // tópico do edital mapeado por este PDF — questões, fim de conteúdo e "concluir leitura" giram
  // em torno dele (o PDF sempre cobre no máximo um tópico na prática deste fluxo)
  const topicoAtual = pdf.topicos?.[0];
  // até onde é conteúdo (teoria) — depois disso só tem questão; sem paginaConteudoFim definida,
  // o PDF inteiro conta como conteúdo (compatível com PDFs cadastrados antes dessa feature)
  const alvoLeitura = pdf.paginaConteudoFim ?? pdf.totalPaginas;
  const chaveTopico = topicoAtual ? topicoKey(pdf.materia, topicoAtual) : null;
  const jaEstudado = chaveTopico ? topicos[chaveTopico]?.estudado === true : false;

  const definirFimConteudo = () => onAtualizarPdf({ paginaConteudoFim: paginaVisivel });

  const concluirLeitura = () => {
    if (!chaveTopico) return;
    const estado = topicos[chaveTopico];
    if (!estado) return;
    onUpdateTopicos({ ...topicos, [chaveTopico]: { ...estado, estudado: true } });
  };

  // painel de questões escalonadas (grupos A-D) do tópico do PDF — geração, marcação e "refazer"
  const [painelQuestoesAberto, setPainelQuestoesAberto] = useState(false);
  const segundosQuestoesRef = useRef(0);
  const [segundosQuestoes, setSegundosQuestoes] = useState(0);

  useEffect(() => {
    if (!painelQuestoesAberto) return;
    const interval = setInterval(() => {
      segundosQuestoesRef.current += 1;
      setSegundosQuestoes(segundosQuestoesRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [painelQuestoesAberto]);

  const gerarQuestoes = (total: number) => {
    if (!topicoAtual) return;
    const questoes: PdfQuestoes = { total, resultados: gerarQuestoesGrupos(total), criadoEm: new Date().toISOString() };
    onAtualizarPdf({ questoes });
    onUpdateTopicos(sincronizarCadernoComQuestoes(topicos, pdf.materia, topicoAtual, questoes));
  };

  const marcarQuestao = (numero: number, acertou: boolean | null) => {
    if (!pdf.questoes || !topicoAtual) return;
    const questoes: PdfQuestoes = {
      ...pdf.questoes,
      resultados: pdf.questoes.resultados.map((r) => (r.numero === numero ? { ...r, acertou } : r)),
    };
    onAtualizarPdf({ questoes });
    onUpdateTopicos(sincronizarCadernoComQuestoes(topicos, pdf.materia, topicoAtual, questoes));
  };

  const refazerQuestoes = () => {
    onAtualizarPdf({ questoes: undefined });
    // zera o caderno desse tópico também — sem isso ele ficaria mostrando contagens de uma lista
    // de questões que não existe mais
    if (chaveTopico && topicos[chaveTopico]) {
      onUpdateTopicos({
        ...topicos,
        [chaveTopico]: {
          ...topicos[chaveTopico],
          cadernos: { A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 } },
        },
      });
    }
  };

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
    const p = pdfRef.current;
    const minutos = Math.round(segundosRef.current / 60);
    if (minutos >= 1 && onRegistrarSessao) {
      const paginasLidas = p.paginaAtual - paginaInicialRef.current;
      onRegistrarSessao(
        minutos,
        "estudo",
        p.materia,
        p.topicos?.[0],
        paginasLidas > 0 ? paginasLidas : undefined,
        `Leitura: ${p.nome}`
      );
    }
    // timer de questões é separado do de leitura — conta só enquanto o painel de questões está
    // aberto, registrado como atividade própria (tipo "questoes") ao fechar o leitor
    const minutosQuestoes = Math.round(segundosQuestoesRef.current / 60);
    if (minutosQuestoes >= 1 && onRegistrarSessao) {
      onRegistrarSessao(minutosQuestoes, "questoes", p.materia, p.topicos?.[0], undefined, `Questões: ${p.nome}`);
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

        {/* fim do conteúdo — a partir daqui o PDF só tem questão, não teoria; é essa página (não
            o total) que define "terminei de ler" e o % de leitura */}
        <button
          type="button"
          onClick={definirFimConteudo}
          title={pdf.paginaConteudoFim ? `Fim do conteúdo: pág. ${pdf.paginaConteudoFim} — clique pra atualizar pra pág. ${paginaVisivel}` : `Marcar a página visível (${paginaVisivel}) como fim do conteúdo — depois disso só tem questão`}
          className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <Flag className="h-3 w-3" />
          {pdf.paginaConteudoFim ? `Fim: pág. ${pdf.paginaConteudoFim}` : "Fim do conteúdo"}
        </button>

        {/* concluir a leitura do tópico — só aparece depois que o usuário passou do fim do
            conteúdo; não é automático (bater a página não garante que o conteúdo foi assimilado) */}
        {chaveTopico && !jaEstudado && paginaVisivel >= alvoLeitura && (
          <button
            type="button"
            onClick={concluirLeitura}
            title="Marca o tópico como estudado no Edital"
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors flex-shrink-0"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span className="hidden sm:inline">Concluir leitura</span>
          </button>
        )}

        {/* questões escalonadas do tópico (grupos A-D) — botões de criar cartão continuam ao lado */}
        <button
          type="button"
          onClick={() => setPainelQuestoesAberto(true)}
          title="Questões do tópico (grupos A-D)"
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            pdf.questoes ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <ListChecks className="h-4 w-4" />
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

      {/* painel de questões escalonadas do tópico — também por cima do PDF, mesma família visual
          do NovoCartaoForm */}
      {painelQuestoesAberto && (
        <PainelQuestoes
          materia={pdf.materia}
          topico={topicoAtual}
          questoes={pdf.questoes}
          segundos={segundosQuestoes}
          onGerar={gerarQuestoes}
          onMarcar={marcarQuestao}
          onRefazer={refazerQuestoes}
          onFechar={() => setPainelQuestoesAberto(false)}
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
