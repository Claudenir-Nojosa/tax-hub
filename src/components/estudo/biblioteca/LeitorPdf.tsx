"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Clock, ClipboardList, Flag, Layers, ListChecks, Pause, Play } from "lucide-react";
import {
  gerarQuestoesGrupos, topicoKey,
  type Alternativa, type AtividadeTipo, type Carta, type CapituloPdf, type PdfEstudo, type PdfQuestoes, type TipoCarta, type TopicoState,
} from "@/lib/estudo-data";
import { resolverCapitulos } from "@/lib/trilha-dinamica";
import { fmtCrono, novaCartaManual, sincronizarCadernoComQuestoes } from "./biblioteca-utils";
import InputPaginaLeitor from "./InputPaginaLeitor";
import NovoCartaoForm, { TIPO_CARTAO_CONFIG } from "./NovoCartaoForm";
import PainelCapitulos from "./PainelCapitulos";
import PainelQuestoes from "./PainelQuestoes";
import type { VisorPdfHandle } from "./VisorPdf";

// pdf.js só carrega quando o leitor abre (bundle pesado — não entra no load da aba)
const VisorPdf = dynamic(() => import("./VisorPdf"), { ssr: false });

// ─── Leitor fullscreen ───────────────────────────────────────────────────────

export default function LeitorPdf({
  pdf, blob, topicos, onAtualizarPagina, onAtualizarPdf, onUpdateTopicos, onRegistrarSessao,
  onAdicionarCartas, minutosMetaRestantes, paginaAbertura, paginaFimAlvo, onFechar, capitulosConcluidos,
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
  // deep link vindo da Trilha (bloco com PDF+intervalo mapeado pro tópico): abre já nessa página
  // em vez de pdf.paginaAtual, e avisa quando o usuário passa de paginaFimAlvo. Ausente = abertura
  // genérica (comportamento de sempre).
  paginaAbertura?: number;
  paginaFimAlvo?: number;
  onFechar: () => void;
  // capítulos marcados como lidos manualmente (checkbox da Trilha) — sem isso o leitor não sabe
  // que um capítulo já foi concluído sem ser lido agora, e o aviso de fim de capítulo dispara
  // retroativo pra ele assim que a leitura abre depois desse ponto
  capitulosConcluidos?: string[];
}) {
  // cronômetro: conta sozinho desde a abertura; pausável. Ao fechar com ≥1 min, a sessão vira
  // atividade de Estudo no calendário da matéria/tópico do PDF (páginas = delta do "parei na pág.")
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const segundosRef = useRef(0);
  // abertura por deep link pode mandar pra uma página ANTERIOR à já lida (revisitar um tópico
  // passado) — paginaInicialRef só serve pra "onde abrir o visor". paginaAtualNaAberturaRef é o
  // bookmark de retomada DE VERDADE no momento da abertura, sempre igual a pdf.paginaAtual (não
  // ao ponto de abertura do deep link) — usado como baseline de "páginas lidas" na sessão (ver
  // encerrarSessao), pra uma revisita a um tópico anterior não inflar esse número artificialmente
  const paginaInicialRef = useRef(paginaAbertura ?? pdf.paginaAtual);
  const paginaAtualNaAberturaRef = useRef(pdf.paginaAtual);
  const visorRef = useRef<VisorPdfHandle>(null);
  const pdfRef = useRef(pdf);
  pdfRef.current = pdf;

  // commitarPagina: mesmo canal usado por "Parei aqui" e pelo campo "Parei na pág." — numa
  // sessão de deep link (revisita a um tópico anterior), nunca deixa o bookmark de retomada
  // recuar pra trás do que já tinha sido alcançado antes dessa sessão (regra explícita: o
  // bookmark é sempre o ponto mais avançado já lido, revisitar conteúdo antigo não desfaz isso)
  const commitarPagina = (pagina: number) => {
    if (paginaAbertura !== undefined && pagina < paginaAtualNaAberturaRef.current) return;
    onAtualizarPagina(pagina);
  };

  // aviso de "passou do conteúdo indicado" — dispara uma vez por LIMITE cruzado (não só a
  // primeira vez da sessão): quando o PDF tem capítulos manuais, cada fim de capítulo é um limite
  // próprio, senão sobra só o paginaFimAlvo único vindo do deep link da Trilha (comportamento de
  // sempre pra PDF sem capítulos). Sem isso, ler o 2º capítulo em seguida do 1º não avisava mais
  // nada — só a fronteira do clique original (o 1º) era observada.
  const resolvidosCapitulos = useMemo(() => {
    if (!pdf.capitulos || pdf.capitulos.length === 0) return [];
    return resolverCapitulos(pdf, capitulosConcluidos ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.capitulos, pdf.id, pdf.paginaConteudoFim, pdf.totalPaginas, pdf.paginaAtual, capitulosConcluidos]);
  const limitesCapitulos = useMemo(() => {
    if (resolvidosCapitulos.length > 0) {
      return resolvidosCapitulos.map((c) => c.paginaFim).sort((a, b) => a - b);
    }
    return paginaFimAlvo !== undefined ? [paginaFimAlvo] : [];
  }, [resolvidosCapitulos, paginaFimAlvo]);
  const [avisoFimPagina, setAvisoFimPagina] = useState(false);
  const [limiteAvisado, setLimiteAvisado] = useState<number | undefined>(undefined);
  // maior limite já avisado nessa sessão — só avança, então recruzar o mesmo limite (voltar e
  // ler de novo) não reabre o aviso, mas o PRÓXIMO limite ainda cruza normalmente. Começa já
  // pulando os limites de capítulos que JÁ estavam concluídos antes desta sessão (lidos de
  // verdade ou marcados manualmente via checkbox da Trilha) — sem isso, abrir o leitor depois de
  // ter marcado alguns capítulos como feitos disparava o aviso retroativo pra eles assim que a
  // página visível já estivesse à frente (ex.: deep link abrindo direto no capítulo seguinte).
  const ultimoLimiteAvisadoRef = useRef(
    resolvidosCapitulos.filter((c) => c.lido).reduce((max, c) => Math.max(max, c.paginaFim), 0)
  );

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
  // painel de capítulos (PainelCapitulos.tsx) — os dois painéis dockam no mesmo lugar (ao lado do
  // PDF em telas grandes), então são mutuamente exclusivos: abrir um fecha o outro
  const [capitulosAberto, setCapitulosAberto] = useState(false);
  const segundosQuestoesRef = useRef(0);
  const [segundosQuestoes, setSegundosQuestoes] = useState(0);

  // qual dos dois cronômetros está contando agora — alternado pelo botão na barra (só um conta
  // por vez; "pausado" pausa o que estiver ativo no momento)
  const [modoTimer, setModoTimer] = useState<"leitura" | "questoes">("leitura");

  useEffect(() => {
    if (pausado || modoTimer !== "questoes") return;
    const interval = setInterval(() => {
      segundosQuestoesRef.current += 1;
      setSegundosQuestoes(segundosQuestoesRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [pausado, modoTimer]);

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

  // gabarito: só registra qual alternativa o usuário marcou — não mexe no caderno (isso é feito
  // por marcarQuestao/acertou), então não passa por sincronizarCadernoComQuestoes
  const marcarAlternativa = (numero: number, alternativa: Alternativa | null) => {
    if (!pdf.questoes) return;
    const questoes: PdfQuestoes = {
      ...pdf.questoes,
      resultados: pdf.questoes.resultados.map((r) => (r.numero === numero ? { ...r, alternativa: alternativa ?? undefined } : r)),
    };
    onAtualizarPdf({ questoes });
  };

  const refazerQuestoes = () => {
    onAtualizarPdf({ questoes: undefined });
    // zera acertos/erros do caderno desse tópico também — sem isso ele ficaria mostrando
    // contagens de uma lista de questões que não existe mais.
    if (chaveTopico && topicos[chaveTopico]) {
      const cad = topicos[chaveTopico].cadernos;
      onUpdateTopicos({
        ...topicos,
        [chaveTopico]: {
          ...topicos[chaveTopico],
          cadernos: {
            A: { ...cad.A, acertos: 0, erros: 0 },
            B: { ...cad.B, acertos: 0, erros: 0 },
            C: { ...cad.C, acertos: 0, erros: 0 },
            D: { ...cad.D, acertos: 0, erros: 0 },
          },
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

  // dispara o aviso de "passou do conteúdo indicado" a cada NOVO limite cruzado (fim de capítulo,
  // ou o paginaFimAlvo único quando não há capítulos) — "Continuar mesmo assim" só fecha o card,
  // não impede o PRÓXIMO limite de avisar quando for cruzado também
  const handlePaginaVisivel = (pagina: number) => {
    setPaginaVisivel(pagina);
    const proximoLimite = limitesCapitulos.find((lim) => lim > ultimoLimiteAvisadoRef.current);
    if (proximoLimite !== undefined && pagina > proximoLimite) {
      ultimoLimiteAvisadoRef.current = proximoLimite;
      setLimiteAvisado(proximoLimite);
      setAvisoFimPagina(true);
    }
  };

  // aviso da trilha dinâmica: dispara UMA vez quando a sessão atual cobre o que faltava do
  // bloco de hoje desta matéria (o restante veio congelado da abertura — as sessões só entram
  // no calendário ao fechar o leitor, então o cronômetro é a única fonte "ao vivo")
  const metaAvisadaRef = useRef(false);
  const metaRestanteRef = useRef(minutosMetaRestantes);

  useEffect(() => {
    if (pausado || modoTimer !== "leitura") return;
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
  }, [pausado, modoTimer]);

  const encerrarSessao = () => {
    const p = pdfRef.current;
    // limiar em SEGUNDOS brutos, não em minutos arredondados: Math.round já arredonda pra cima a
    // partir de 30s, então checar minutos>=1 deixava passar sessão de 30-59s como "1 minuto"
    if (segundosRef.current >= 60 && onRegistrarSessao) {
      const minutos = Math.round(segundosRef.current / 60);
      const paginasLidas = p.paginaAtual - paginaAtualNaAberturaRef.current;
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
    if (segundosQuestoesRef.current >= 60 && onRegistrarSessao) {
      const minutosQuestoes = Math.round(segundosQuestoesRef.current / 60);
      onRegistrarSessao(minutosQuestoes, "questoes", p.materia, p.topicos?.[0], undefined, `Questões: ${p.nome}`);
    }
    onFechar();
  };
  // Esc é fácil de apertar sem querer (hábito de fechar outra coisa) — em vez de fechar direto,
  // só ABRE a confirmação; fechar de fato exige clique em "Sair" (2º Esc cancela a confirmação em
  // vez de confirmar a saída, mesma convenção do resto do app pra diálogos bloqueantes). O botão
  // de voltar no header continua fechando direto (clique já é uma ação deliberada).
  const [confirmSair, setConfirmSair] = useState(false);

  // trava o scroll do body enquanto o leitor está aberto + Esc abre/fecha a confirmação de saída
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setConfirmSair((atual) => !atual);
    };
    document.addEventListener("keydown", onKey);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  // portado direto pro <body> — algum ancestral do shell do dashboard (sidebar/scroll container)
  // quebrava o containing-block do position:fixed do leitor, deixando uma tira do topo da página
  // por baixo (o hero verde da Biblioteca) visível acima da barra do leitor; portar pro body
  // garante que o fixed inset-0 é sempre relativo à viewport de verdade, igual ao color picker
  // do ConcursoModal.tsx
  return createPortal(
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
          onClick={() => commitarPagina(paginaVisivel)}
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

        {/* capítulos (opcional, com subcapítulos) — a Trilha sequencia a leitura por eles quando
            definidos; dockado no mesmo lugar do painel de Questões, então fecha um ao abrir o outro */}
        <button
          type="button"
          onClick={() => { setCapitulosAberto((v) => !v); setPainelQuestoesAberto(false); }}
          title="Capítulos do PDF — divida a leitura pra Trilha sequenciar, clique de novo pra fechar"
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            (pdf.capitulos?.length ?? 0) > 0 ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Layers className="h-4 w-4" />
        </button>

        {/* questões escalonadas do tópico (grupos A-D) — botões de criar cartão continuam ao lado */}
        <button
          type="button"
          onClick={() => { setPainelQuestoesAberto((v) => !v); setCapitulosAberto(false); }}
          title="Questões do tópico (grupos A-D) — clique de novo pra fechar"
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
          onCommit={commitarPagina}
        />
        <span className="hidden sm:block text-[11px] text-muted-foreground flex-shrink-0">de {pdf.totalPaginas}</span>

        {/* alterna qual cronômetro está contando agora — só um conta por vez; "pausado" pausa o
            que estiver ativo no momento */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setModoTimer("leitura")}
              title="Cronômetro de leitura"
              className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                modoTimer === "leitura" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setModoTimer("questoes")}
              title="Cronômetro de questões"
              className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                modoTimer === "questoes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className="h-3 w-3" />
            </button>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm ${
              pausado ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
            title={`Cronômetro de ${modoTimer === "leitura" ? "leitura" : "questões"} — salvo automaticamente nesta matéria/tópico ao fechar`}
          >
            <Clock className="h-3.5 w-3.5" />
            {fmtCrono(modoTimer === "leitura" ? segundos : segundosQuestoes)}
          </div>
          <button
            type="button"
            onClick={() => setPausado((v) => !v)}
            title={pausado ? "Retomar cronômetro" : "Pausar cronômetro"}
            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* o PDF em si (pdf.js com camada de texto) — ocupa TODO o resto da tela, com o painel de
          questões dockado ao lado em telas grandes (lg+) quando aberto (ver PainelQuestoes.tsx —
          em telas menores ele continua como overlay por cima, sem espaço pros dois lado a lado).
          A página inicial é a DO MOMENTO DA ABERTURA (ref), pra não pular o scroll a cada commit
          do progresso */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 min-w-0 flex flex-col">
          <VisorPdf
            ref={visorRef}
            blob={blob}
            paginaInicial={Math.max(1, Math.min(paginaInicialRef.current || 1, pdf.totalPaginas))}
            onPaginaVisivel={handlePaginaVisivel}
          />
        </div>

        {painelQuestoesAberto && (
          <PainelQuestoes
            materia={pdf.materia}
            topico={topicoAtual}
            questoes={pdf.questoes}
            onGerar={gerarQuestoes}
            onMarcar={marcarQuestao}
            onMarcarAlternativa={marcarAlternativa}
            onRefazer={refazerQuestoes}
            onFechar={() => setPainelQuestoesAberto(false)}
          />
        )}

        {capitulosAberto && (
          <PainelCapitulos
            capitulos={pdf.capitulos ?? []}
            paginaVisivel={paginaVisivel}
            totalPaginas={pdf.totalPaginas}
            paginaConteudoFim={pdf.paginaConteudoFim}
            blob={blob}
            onAtualizar={(capitulos: CapituloPdf[]) => onAtualizarPdf({ capitulos: capitulos.length > 0 ? capitulos : undefined })}
            onFechar={() => setCapitulosAberto(false)}
          />
        )}
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

      {/* aviso de fim de conteúdo indicado (atividade da Trilha com página final mapeada) —
          bloqueante (mesmo padrão do NovoCartaoForm), com opção de voltar pra página alvo ou
          seguir lendo mesmo assim; não impede scroll nenhum, só avisa */}
      {avisoFimPagina && limiteAvisado !== undefined && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4"
          onClick={() => setAvisoFimPagina(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Você passou do conteúdo indicado
            </div>
            <p className="text-xs text-muted-foreground">
              A atividade da Trilha pedia leitura até a página {limiteAvisado} — você já está na página {paginaVisivel}.
            </p>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  visorRef.current?.scrollParaPagina(limiteAvisado);
                  setAvisoFimPagina(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Voltar à página {limiteAvisado}
              </button>
              <button
                type="button"
                onClick={() => setAvisoFimPagina(false)}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
              >
                Continuar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de saída (Esc) — mesmo padrão bloqueante do aviso de fim de página; clicar
          fora ou "Cancelar" só fecha o card, sem sair. O botão de voltar do header não passa por
          aqui (clique já é deliberado) — só o Esc, fácil de apertar sem querer. */}
      {confirmSair && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4"
          onClick={() => setConfirmSair(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Sair da leitura?
            </div>
            <p className="text-xs text-muted-foreground">
              A sessão até agora é salva normalmente — é só pra confirmar, já que o Esc é fácil de apertar sem querer.
            </p>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setConfirmSair(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={encerrarSessao}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toast de confirmação */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2 rounded-full text-xs shadow-xl border bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> {toast}
        </div>
      )}
    </div>,
    document.body
  );
}
