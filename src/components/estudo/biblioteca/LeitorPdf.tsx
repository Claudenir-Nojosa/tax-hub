"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Clock, ClipboardList, Eye, EyeOff, Flag,
  Highlighter, Layers, ListChecks, NotebookText, Pause, Pencil, Play,
} from "lucide-react";
import {
  adicionarBlocoQuestoes, dateKeyLocal, gerarQuestoesGrupos, topicoKey,
  type Alternativa, type AnotacaoPdf, type AtividadeTipo, type Carta, type CapituloPdf, type PdfEstudo, type PdfQuestoes, type TipoCarta, type TopicoState,
} from "@/lib/estudo-data";
import { resolverCapitulos } from "@/lib/trilha-dinamica";
import { fmtHoras } from "../trilha/trilha-ui";
import { fmtCrono, novaCartaManual, sincronizarCadernoComQuestoes } from "./biblioteca-utils";
import PainelAnotacoes from "./PainelAnotacoes";

// progresso de horas da matéria do PDF — "atividade" é o trecho do tamanho de hoje (não reseta
// ao virar o dia, só quando a semana vira), "semana" é o alvo cheio da matéria; mesma dupla que
// já aparece na Trilha (CorpoBloco: "Nesta atividade" + "na semana"), agora também dentro do
// leitor, ao vivo (soma o cronômetro da sessão em cima do baseline vindo da abertura)
export interface MetaEstudoMateria {
  atividadeFeitos: number;
  atividadeAlvo: number;
  semanaFeitos: number;
  semanaAlvo: number;
}
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
  onAdicionarCartas, minutosMetaRestantes, metaEstudo, paginaAbertura, paginaFimAlvo, onFechar, capitulosConcluidos,
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
  // progresso de horas (atividade + semana) da matéria do PDF — barra ao vivo dentro do leitor;
  // ausente = trilha não ativa ou matéria fora da cadeia da semana (sem meta pra mostrar)
  metaEstudo?: MetaEstudoMateria;
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
  //
  // Quando o bookmark real (pdf.paginaAtual) já está DENTRO do intervalo pedido
  // (paginaAbertura..paginaFimAlvo), o usuário só está CONTINUANDO a leitura de onde parou — o
  // trecho da Trilha pode começar antes de onde ele já chegou (ex.: "Continuar a Leitura" abre no
  // 1º capítulo ainda não concluído, mas ele já leu página 7 de um capítulo que vai até a 67) —
  // nesse caso abre no bookmark, não no início do trecho. Só abre EXATAMENTE em paginaAbertura
  // quando é uma revisita de verdade a um trecho antigo (bookmark já passou do paginaFimAlvo desse
  // trecho específico — ex.: clicar num capítulo já concluído há tempo pra reler).
  const dentroDoIntervaloAtual =
    paginaAbertura !== undefined && paginaFimAlvo !== undefined &&
    pdf.paginaAtual >= paginaAbertura && pdf.paginaAtual <= paginaFimAlvo;
  const paginaInicialRef = useRef(dentroDoIntervaloAtual ? pdf.paginaAtual : paginaAbertura ?? pdf.paginaAtual);
  const paginaAtualNaAberturaRef = useRef(pdf.paginaAtual);
  // maior página já VISTA nesta sessão (não confundir com paginaAtualNaAberturaRef, que é fixa —
  // essa avança conforme a leitura acontece) — é o que faz o "Parei aqui" avançar sozinho, sem
  // recuar se o usuário rolar pra trás pra reler algo. Começa em pdf.paginaAtual (o bookmark real,
  // não paginaInicialRef — numa revisita a um capítulo antigo, abrir mais atrás não deve "resetar"
  // o quanto já foi lido de verdade).
  const maiorPaginaVistaRef = useRef(pdf.paginaAtual);
  const visorRef = useRef<VisorPdfHandle>(null);
  const pdfRef = useRef(pdf);
  pdfRef.current = pdf;

  // commitarPagina: mesmo canal usado pelo auto-avanço, por "Parei aqui" e pelo campo "Parei na
  // pág." — numa sessão de deep link (revisita a um tópico anterior), nunca deixa o bookmark de
  // retomada recuar pra trás do que já tinha sido alcançado antes dessa sessão (regra explícita: o
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
      const todos = resolvidosCapitulos.map((c) => c.paginaFim).sort((a, b) => a - b);
      // a atividade da Trilha pode agrupar VÁRIOS capítulos numa tarefa só (ex.: "Capítulos 1-4
      // de X", quando são curtos e juntos batem a duração alvo — ver proximoBlocoCapitulos em
      // trilha-dinamica.ts) — os fins de capítulo DENTRO desse trecho não são um "limite" de
      // verdade, só o fim do trecho pedido (paginaFimAlvo, que é exatamente o paginaFim do
      // último capítulo do grupo) e o que vier depois. Sem isso, ler os 4 capítulos de uma
      // atividade só disparava 4 avisos seguidos em vez de 1 só ao terminar tudo que foi pedido.
      return paginaFimAlvo !== undefined ? todos.filter((lim) => lim >= paginaFimAlvo) : todos;
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

  // painel de questões escalonadas (grupos A-D) do tópico do PDF — geração, marcação e "refazer"
  const [painelQuestoesAberto, setPainelQuestoesAberto] = useState(false);
  // painel de capítulos (PainelCapitulos.tsx) e de anotações — todos dockam no mesmo lugar (ao
  // lado do PDF em telas grandes), então são mutuamente exclusivos: abrir um fecha os outros
  const [capitulosAberto, setCapitulosAberto] = useState(false);
  const [anotacoesAberto, setAnotacoesAberto] = useState(false);
  const segundosQuestoesRef = useRef(0);
  const [segundosQuestoes, setSegundosQuestoes] = useState(0);

  // qual dos dois cronômetros está contando agora — alternado pelo botão na barra (só um conta
  // por vez; "pausado" pausa o que estiver ativo no momento)
  const [modoTimer, setModoTimer] = useState<"leitura" | "questoes">("leitura");
  // modo foco: borra as informações do cabeçalho (título/matéria/tópico + barras de progresso),
  // deixando só o PDF nítido — passar o mouse por cima revela de novo temporariamente
  const [modoFoco, setModoFoco] = useState(false);
  // pomodoro: troca só a EXIBIÇÃO do cronômetro ativo pra uma contagem regressiva de 25min,
  // vermelha, com tomate — o acumulado real de estudo (segundos/segundosQuestoes, usado pro
  // registro da sessão) continua contando por baixo sem nenhuma mudança, é só o mostrador que
  // vira "quanto falta pro ciclo" em vez de "quanto já passou"
  const [modoPomodoro, setModoPomodoro] = useState(false);
  // marca-texto: enquanto ativo, selecionar um trecho do PDF abre o formulário de salvar como
  // anotação — fica ligado até o usuário desativar (não é "um clique, uma marcação")
  const [marcandoTexto, setMarcandoTexto] = useState(false);
  const [formAnotacao, setFormAnotacao] = useState<{ trecho: string; pagina: number } | null>(null);
  const [notaAnotacao, setNotaAnotacao] = useState("");

  // barras de progresso de horas (atividade do dia + semana) — soma o cronômetro AO VIVO
  // (segundos, já tickando a cada 1s) em cima do baseline vindo da abertura do leitor, igual ao
  // toast de "meta batida" logo abaixo faz com metaRestanteRef. O baseline precisa ser CONGELADO no
  // momento em que o leitor abriu, não recalculado a cada render: `metaEstudo` vem de
  // computarMetaAtual, que deriva minutosFeitos de pdf.paginaAtual — e paginaAtual AVANÇA sozinho
  // conforme o usuário rola (commitarPagina), na MESMA sessão. Sem congelar, cada segundo que passa
  // conta a leitura ATUAL duas vezes: uma pela estimativa de páginas (que já capturou o avanço) e
  // de novo pelo cronômetro somado em cima — bug real reportado: 5min lidos de verdade, barra
  // mostrando 8min.
  const metaBaselineRef = useRef<{ atividadeFeitos: number; atividadeAlvo: number; semanaFeitos: number; semanaAlvo: number } | null>(null);
  if (metaEstudo && metaBaselineRef.current === null) {
    metaBaselineRef.current = { ...metaEstudo };
  }
  const metaBaseline = metaBaselineRef.current;
  const minutosSessaoLeitura = Math.floor(segundos / 60);
  const metaAoVivo = metaBaseline && {
    atividadeFeitos: Math.min(metaBaseline.atividadeAlvo, metaBaseline.atividadeFeitos + minutosSessaoLeitura),
    atividadeAlvo: metaBaseline.atividadeAlvo,
    semanaFeitos: Math.min(metaBaseline.semanaAlvo, metaBaseline.semanaFeitos + minutosSessaoLeitura),
    semanaAlvo: metaBaseline.semanaAlvo,
  };

  // pomodoro: DERIVADO do acumulado real (segundos/segundosQuestoes, qual estiver ativo agora),
  // nunca um contador à parte — vira uma contagem regressiva de ciclos de 25min sem duplicar
  // nenhum estado nem arriscar dessincronizar do tempo de verdade que vai pro registro da sessão
  const POMODORO_DURACAO_SEG = 25 * 60;
  const segundosAtivos = modoTimer === "leitura" ? segundos : segundosQuestoes;
  const cicloPomodoroAtual = Math.floor(segundosAtivos / POMODORO_DURACAO_SEG);
  const segundosRestantesPomodoro = POMODORO_DURACAO_SEG - (segundosAtivos % POMODORO_DURACAO_SEG);
  // começa já sincronizado no ciclo ATUAL (não em 0) — ligar o modo pomodoro depois de já ter
  // estudado um tempo não deve disparar um toast de "concluído" retroativo na hora
  const ultimoCicloPomodoroRef = useRef(cicloPomodoroAtual);
  useEffect(() => {
    if (!modoPomodoro) {
      ultimoCicloPomodoroRef.current = cicloPomodoroAtual;
      return;
    }
    if (cicloPomodoroAtual > ultimoCicloPomodoroRef.current) {
      ultimoCicloPomodoroRef.current = cicloPomodoroAtual;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast("🍅 Pomodoro concluído! Hora de uma pausa.");
      toastTimerRef.current = setTimeout(() => setToast(null), 6000);
    }
  }, [cicloPomodoroAtual, modoPomodoro]);

  // marca-texto: enquanto ativo, captura a seleção de texto do PDF (window.getSelection — a
  // TextLayer do VisorPdf já deixa o texto selecionável de verdade) e abre o formulário de salvar
  // como anotação. Fica ligado até o usuário clicar de novo pra desativar.
  useEffect(() => {
    if (!marcandoTexto) return;
    const onMouseUp = () => {
      const texto = window.getSelection()?.toString().trim();
      if (!texto) return;
      setFormAnotacao({ trecho: texto.slice(0, 2000), pagina: paginaVisivel });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [marcandoTexto, paginaVisivel]);

  const salvarAnotacao = () => {
    if (!formAnotacao) return;
    const nova: AnotacaoPdf = {
      id: `anot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pagina: formAnotacao.pagina,
      trecho: formAnotacao.trecho,
      nota: notaAnotacao.trim() || undefined,
      criadoEm: new Date().toISOString(),
    };
    onAtualizarPdf({ anotacoes: [...(pdf.anotacoes ?? []), nova] });
    window.getSelection()?.removeAllRanges();
    setFormAnotacao(null);
    setNotaAnotacao("");
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast("✓ Anotação salva");
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const excluirAnotacao = (id: string) => {
    onAtualizarPdf({ anotacoes: (pdf.anotacoes ?? []).filter((a) => a.id !== id) });
  };

  const definirFimConteudo = () => onAtualizarPdf({ paginaConteudoFim: paginaVisivel });

  // digitar o número da página direto, sem precisar rolar até lá — além de mais rápido, evita
  // rolar/arrastar a barra até o fim só pra configurar isso, que era exatamente o que fazia o
  // sistema de leitura confundir "naveguei até aqui pra configurar" com "li até aqui de verdade"
  const [editandoFimConteudo, setEditandoFimConteudo] = useState(false);
  const comitarFimConteudoManual = (valor: string) => {
    const n = parseInt(valor);
    if (Number.isFinite(n) && n >= 1) onAtualizarPdf({ paginaConteudoFim: Math.min(n, pdf.totalPaginas) });
    setEditandoFimConteudo(false);
  };

  const concluirLeitura = () => {
    if (!chaveTopico) return;
    const estado = topicos[chaveTopico];
    if (!estado) return;
    // sem estudadoEm, a revisão do link (7/30 dias) trata "sem data" como "já pode revisar" e
    // aparece na Trilha na hora, em vez de esperar o prazo — precisa gravar a data de conclusão
    onUpdateTopicos({ ...topicos, [chaveTopico]: { ...estado, estudado: true, estudadoEm: estado.estudadoEm ?? dateKeyLocal() } });
  };

  useEffect(() => {
    if (pausado || modoTimer !== "questoes") return;
    const interval = setInterval(() => {
      segundosQuestoesRef.current += 1;
      setSegundosQuestoes(segundosQuestoesRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [pausado, modoTimer]);

  const gerarQuestoes = (blocos: number[]) => {
    if (!topicoAtual) return;
    const total = blocos.reduce((s, n) => s + n, 0);
    const questoes: PdfQuestoes = { total, resultados: gerarQuestoesGrupos(blocos), criadoEm: new Date().toISOString() };
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

  const adicionarBloco = (tamanho: number) => {
    if (!pdf.questoes || !topicoAtual) return;
    const questoes = adicionarBlocoQuestoes(pdf.questoes, tamanho);
    onAtualizarPdf({ questoes });
    onUpdateTopicos(sincronizarCadernoComQuestoes(topicos, pdf.materia, topicoAtual, questoes));
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
  const handlePaginaVisivel = (pagina: number, viaSalto: boolean) => {
    setPaginaVisivel(pagina);
    // "Parei aqui" automático — só avança quando a página visível é MAIOR que a maior já vista
    // nesta sessão (rolar pra trás pra reler não move o bookmark pra trás; o botão manual "Parei
    // aqui" continua existindo pra forçar um commit exato quando quiser). viaSalto exclui PULOS
    // programáticos (botão "Voltar à página X", campo "ir para página") — chegar numa página assim
    // não é "ter lido até aqui"; sem essa checagem, pular pro fim do PDF só pra configurar o "Fim
    // do conteúdo" (ver definirFimConteudo) marcava o trecho inteiro como lido e disparava
    // "Marcar como estudado" sozinho, mesmo sem o usuário ter lido nada no meio do caminho.
    if (!viaSalto && pagina > maiorPaginaVistaRef.current) {
      maiorPaginaVistaRef.current = pagina;
      commitarPagina(pagina);
    }
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
        setToast(`🎯 Tempo estimado desta atividade de ${pdfRef.current.materia} concluído!`);
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
    // consome a entrada extra empurrada no histórico ao abrir (ver useEffect do popstate) — sem
    // isso sobraria um "voltar" fantasma que não faz nada da próxima vez que o usuário navegar
    fechandoDeliberadamenteRef.current = true;
    window.history.back();
    onFechar();
  };
  // NENHUMA forma de sair do leitor fecha direto — Esc, seta de voltar do header, botão/gesto de
  // voltar do navegador: todas só abrem esta confirmação. Fechar de fato exige clique em "Sair"
  // (2º Esc cancela a confirmação em vez de confirmar a saída, mesma convenção do resto do app
  // pra diálogos bloqueantes). É só depois de confirmado que o tempo estudado é registrado.
  const [confirmSair, setConfirmSair] = useState(false);
  // fechamento DELIBERADO (usuário confirmou "Sair") — o popstate dessa saída não deve reabrir a
  // confirmação de novo (ver useEffect do histórico abaixo)
  const fechandoDeliberadamenteRef = useRef(false);

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

  // botão/gesto de VOLTAR do navegador: empurra uma entrada extra no histórico ao abrir, pra
  // interceptar o "voltar" (que dispara popstate consumindo essa entrada) e reabrir a
  // confirmação em vez de deixar a navegação acontecer de verdade — sem isso, o navegador sairia
  // da página inteira do Estudo e o tempo da sessão se perdia sem nunca chamar encerrarSessao.
  // Fechamento deliberado (confirmado no popup) também passa por history.back() pra consumir essa
  // entrada extra, senão sobraria um "voltar" fantasma que não faz nada da próxima vez.
  useEffect(() => {
    window.history.pushState({ estudoLeitorAberto: true }, "");
    const onPopState = () => {
      if (fechandoDeliberadamenteRef.current) return;
      window.history.pushState({ estudoLeitorAberto: true }, "");
      setConfirmSair(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // fechar a aba, atualizar ou digitar outra URL: o navegador mostra o próprio aviso nativo (não
  // dá pra customizar o texto por restrição de segurança de todo browser moderno) — sem isso,
  // essas saídas não passavam por NENHUMA confirmação nem registravam o tempo estudado
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
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
          onClick={() => setConfirmSair(true)}
          title="Sair do leitor (pede confirmação antes de registrar o tempo estudado)"
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {/* título/matéria/tópico — "informação" que o modo foco borra; passar o mouse revela de
            novo temporariamente. O "parei na pág." já mostra a página atual do lado direito da
            barra, então não duplica esse número aqui. */}
        <div
          className={`min-w-0 flex-1 transition-[filter,opacity] duration-200 ${modoFoco ? "blur-sm opacity-50 hover:blur-none hover:opacity-100" : ""}`}
        >
          <div className="text-sm font-medium truncate">{pdf.nome}</div>
          <div className="text-[10px] text-muted-foreground truncate">{pdf.materia}{pdf.topicos?.[0] ? ` · ${pdf.topicos[0]}` : ""}</div>
        </div>

        {/* modo foco — borra as informações do cabeçalho (título/matéria/progresso), só o PDF
            fica sempre nítido; passar o mouse por cima do que foi borrado revela de novo */}
        <button
          type="button"
          onClick={() => setModoFoco((v) => !v)}
          title={modoFoco ? "Desativar modo foco" : "Modo foco — borra as informações do cabeçalho, só o PDF fica nítido"}
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            modoFoco ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {modoFoco ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>

        {/* fim do conteúdo — a partir daqui o PDF só tem questão, não teoria; é essa página (não
            o total) que define "terminei de ler" e o % de leitura. Além do botão (marca a página
            visível agora), dá pra digitar o número direto — evita ter que rolar/arrastar até lá só
            pra configurar isso. */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {editandoFimConteudo ? (
            <input
              type="number"
              autoFocus
              min={1}
              max={pdf.totalPaginas}
              defaultValue={pdf.paginaConteudoFim ?? paginaVisivel}
              onBlur={(e) => comitarFimConteudoManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditandoFimConteudo(false);
              }}
              className="w-16 text-[11px] border border-border rounded-md px-1.5 py-1 bg-muted text-foreground focus:outline-none focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={definirFimConteudo}
              title={pdf.paginaConteudoFim ? `Fim do conteúdo: pág. ${pdf.paginaConteudoFim} — clique pra atualizar pra pág. ${paginaVisivel}` : `Marcar a página visível (${paginaVisivel}) como fim do conteúdo — depois disso só tem questão`}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              <Flag className="h-3 w-3" />
              {pdf.paginaConteudoFim ? `Fim: pág. ${pdf.paginaConteudoFim}` : "Fim do conteúdo"}
            </button>
          )}
          {!editandoFimConteudo && (
            <button
              type="button"
              onClick={() => setEditandoFimConteudo(true)}
              title="Digitar o número da página do fim do conteúdo manualmente"
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

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
            definidos; dockado no mesmo lugar dos painéis de Questões/Anotações, então fecha os
            outros ao abrir */}
        <button
          type="button"
          onClick={() => { setCapitulosAberto((v) => !v); setPainelQuestoesAberto(false); setAnotacoesAberto(false); }}
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
          onClick={() => { setPainelQuestoesAberto((v) => !v); setCapitulosAberto(false); setAnotacoesAberto(false); }}
          title="Questões do tópico (grupos A-D) — clique de novo pra fechar"
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            pdf.questoes ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <ListChecks className="h-4 w-4" />
        </button>

        {/* marca-texto: fica ligado até clicar de novo — enquanto ativo, qualquer seleção de
            texto no PDF (a TextLayer já é selecionável) abre o formulário de salvar como anotação */}
        <button
          type="button"
          onClick={() => setMarcandoTexto((v) => !v)}
          title={marcandoTexto ? "Marca texto ativo — selecione um trecho do PDF (clique de novo pra desativar)" : "Marca texto — selecione um trecho do PDF pra salvar como anotação"}
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            marcandoTexto ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Highlighter className="h-4 w-4" />
        </button>

        {/* caixa de anotações — todos os trechos marcados neste PDF */}
        <button
          type="button"
          onClick={() => { setAnotacoesAberto((v) => !v); setCapitulosAberto(false); setPainelQuestoesAberto(false); }}
          title="Anotações deste PDF — clique de novo pra fechar"
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            (pdf.anotacoes?.length ?? 0) > 0 ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <NotebookText className="h-4 w-4" />
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
            {/* pomodoro: só troca a EXIBIÇÃO (regressiva, vermelha, tomate) — o acumulado real
                continua contando por baixo sem mudar nada no registro da sessão */}
            <button
              type="button"
              onClick={() => setModoPomodoro((v) => !v)}
              title={modoPomodoro ? "Voltar pro cronômetro normal (contagem crescente)" : "Modo pomodoro — contagem regressiva de 25min"}
              className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors text-sm leading-none ${
                modoPomodoro ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground grayscale opacity-60 hover:opacity-100"
              }`}
            >
              🍅
            </button>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm ${
              pausado
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : modoPomodoro
                ? "bg-red-500/15 text-red-700 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
            title={
              modoPomodoro
                ? `Pomodoro (25min) — falta ${fmtCrono(segundosRestantesPomodoro)} pro fim do ciclo. O tempo total de estudo continua sendo salvo normalmente.`
                : `Cronômetro de ${modoTimer === "leitura" ? "leitura" : "questões"} — salvo automaticamente nesta matéria/tópico ao fechar`
            }
          >
            {modoPomodoro ? <span className="text-sm leading-none">🍅</span> : <Clock className="h-3.5 w-3.5" />}
            {fmtCrono(modoPomodoro ? segundosRestantesPomodoro : segundosAtivos)}
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

      {/* horas lidas x meta — a atividade de teoria (chunk) desta Meta que bate com o PDF/trecho
          aberto, e a fatia dessa matéria dentro da Meta atual inteira, ao vivo (soma o cronômetro
          em cima do baseline). Ausente quando a trilha não está ativa ou o PDF não corresponde a
          nenhuma atividade de teoria da Meta atual (ver BibliotecaTab.tsx). */}
      {metaAoVivo && (
        <div
          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-6 px-2 sm:px-4 py-1.5 flex-shrink-0 bg-card/60 border-b border-border transition-[filter,opacity] duration-200 ${modoFoco ? "blur-sm opacity-50 hover:blur-none hover:opacity-100" : ""}`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground flex-shrink-0 w-20">Esta atividade</span>
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${metaAoVivo.atividadeFeitos >= metaAoVivo.atividadeAlvo ? "bg-emerald-500" : "bg-primary/60"}`}
                style={{ width: `${metaAoVivo.atividadeAlvo > 0 ? Math.min(100, Math.round((metaAoVivo.atividadeFeitos / metaAoVivo.atividadeAlvo) * 100)) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 whitespace-nowrap">
              {fmtHoras(metaAoVivo.atividadeFeitos)}/{fmtHoras(metaAoVivo.atividadeAlvo)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground flex-shrink-0 w-20">Nesta Meta</span>
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${metaAoVivo.semanaFeitos >= metaAoVivo.semanaAlvo ? "bg-emerald-500" : "bg-primary/60"}`}
                style={{ width: `${metaAoVivo.semanaAlvo > 0 ? Math.min(100, Math.round((metaAoVivo.semanaFeitos / metaAoVivo.semanaAlvo) * 100)) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 whitespace-nowrap">
              {fmtHoras(metaAoVivo.semanaFeitos)}/{fmtHoras(metaAoVivo.semanaAlvo)}
            </span>
          </div>
        </div>
      )}

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
            onAdicionarBloco={adicionarBloco}
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

        {anotacoesAberto && (
          <PainelAnotacoes
            anotacoes={pdf.anotacoes ?? []}
            onIrParaPagina={(pagina) => visorRef.current?.scrollParaPagina(pagina)}
            onExcluir={excluirAnotacao}
            onFechar={() => setAnotacoesAberto(false)}
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

      {/* formulário de salvar anotação — abre sozinho ao selecionar texto com o marca-texto
          ativo; nota é opcional, o trecho selecionado já vem pré-preenchido (só leitura) */}
      {formAnotacao && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4"
          onClick={() => { setFormAnotacao(null); setNotaAnotacao(""); }}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Highlighter className="h-4 w-4 text-amber-500" /> Salvar anotação — pág. {formAnotacao.pagina}
            </div>
            <blockquote className="text-xs text-foreground border-l-2 border-amber-400 pl-2 italic max-h-32 overflow-y-auto">
              &quot;{formAnotacao.trecho}&quot;
            </blockquote>
            <textarea
              value={notaAnotacao}
              onChange={(e) => setNotaAnotacao(e.target.value)}
              placeholder="Nota (opcional)"
              rows={2}
              autoFocus
              className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setFormAnotacao(null); setNotaAnotacao(""); }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarAnotacao}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
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
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" /> Fim desta atividade da Trilha
            </div>
            <p className="text-xs text-muted-foreground">
              Esta atividade da Trilha cobre até a página {limiteAvisado} — você já está na página {paginaVisivel}. Sem
              problema continuar: as páginas seguintes contam pra próxima atividade deste tópico.
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
                Continuar lendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirmação de saída — único jeito de sair de verdade do leitor (Esc, seta de voltar do
          header, botão/gesto de voltar do navegador todos abrem isto em vez de fechar direto).
          Mesmo padrão bloqueante do aviso de fim de página; clicar fora ou "Cancelar" só fecha o
          card, sem sair — o tempo estudado só é registrado depois de confirmado aqui. */}
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
