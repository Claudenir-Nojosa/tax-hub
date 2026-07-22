"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronDown, Clock, FileUp, Gem, Library, Loader2, Pause, Pencil, Play, Plus, Swords, Trash2, X, Zap,
} from "lucide-react";
import {
  MATERIAS, calcularPagPorHora, dateKeyLocal,
  type AtividadeCalendario, type Carta, type MateriaConcurso, type MateriaDef, type PdfEstudo, type TipoCarta,
} from "@/lib/estudo-data";
import {
  salvarArquivoPdf, obterArquivoPdf, excluirArquivoPdf, contarPaginasPdf,
} from "@/lib/pdf-storage";
import { resolverCorMateria, fmtHoras } from "./trilha/trilha-ui";

// pdf.js só carrega quando o leitor abre (bundle pesado — não entra no load da aba)
const VisorPdf = dynamic(() => import("./biblioteca/VisorPdf"), { ssr: false });

// Biblioteca de PDFs (ex.: aulas do Estratégia): anexe o ARQUIVO e leia dentro do próprio site
// num leitor FULLSCREEN limpo (só o PDF + barra fina com "parei na pág." e cronômetro), com
// progresso "parei na pág. X", % lido e ETA calculada com o páginas/hora histórico do Timer
// (calcularPagPorHora). O cronômetro do leitor conta sozinho e, ao fechar (sessão ≥1 min), salva
// uma atividade de Estudo no calendário da matéria/tópico do PDF via onRegistrarSessao.
// O arquivo fica no SUPABASE STORAGE (privado — pdf-storage.ts), não mais no navegador: uma vez
// enviado, `PdfEstudo.arquivoEnviado` sincroniza junto com o resto do EstudoState e o PDF abre em
// qualquer dispositivo que o usuário logar, sem precisar reanexar.

interface Props {
  pdfs: PdfEstudo[];
  calendario: Record<string, AtividadeCalendario[]>;
  onChange: (pdfs: PdfEstudo[]) => void;
  materiasConcurso?: MateriaConcurso[];
  onRegistrarSessao?: (minutos: number, materia: string, topico: string | undefined, paginas: number | undefined, descricao: string) => void;
  // criar cartão: botões na barra do leitor (ao lado de "Parei aqui") abrem o formulário do tipo
  // escolhido; o usuário preenche manualmente (sem IA), já travado na matéria/tópico do PDF
  onAdicionarCartas?: (cartas: Carta[]) => void;
  // trilha dinâmica: minutos que faltam HOJE pra fechar o bloco de estudo de cada matéria — o
  // leitor avisa em tempo real quando a sessão atual cruza esse restante ("meta do dia feita!")
  metaMinutosRestantes?: Record<string, number>;
}

// mesma config visual das cartas em CartasTab.tsx, reduzida aos 3 tipos que o leitor oferece
// (sem "boss", que só existe como escalada de Monstro dentro da sessão de revisão)
const TIPO_CARTAO_CONFIG: Record<"monstro" | "armadilha" | "tesouro", { label: string; Icon: typeof Swords }> = {
  monstro: { label: "Monstro", Icon: Swords },
  armadilha: { label: "V ou F", Icon: Zap },
  tesouro: { label: "Tesouro", Icon: Gem },
};

function novaCartaManual(dados: {
  tipo: TipoCarta; materia: string; topico?: string; frente: string; verso: string; gabarito?: "verdadeiro" | "falso";
}): Carta {
  const hoje = dateKeyLocal();
  return {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: dados.tipo,
    materia: dados.materia,
    topico: dados.topico,
    frente: dados.frente.trim(),
    verso: dados.verso.trim(),
    gabarito: dados.tipo === "armadilha" ? dados.gabarito : undefined,
    intervalo: 0,
    facilidade: 2.5,
    repeticoes: 0,
    proximaRevisao: hoje,
    criada: hoje,
    acertos: 0,
    erros: 0,
  };
}

function novoId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function fmtEta(paginasRestantes: number, pagPorHora: number | null): string | null {
  if (pagPorHora === null || pagPorHora <= 0 || paginasRestantes <= 0) return null;
  return fmtHoras(Math.round((paginasRestantes / pagPorHora) * 60));
}

export default function BibliotecaTab({ pdfs, calendario, onChange, materiasConcurso, onRegistrarSessao, onAdicionarCartas, metaMinutosRestantes }: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<PdfEstudo | null>(null);
  const [lendo, setLendo] = useState<PdfEstudo | null>(null);
  const [blobLeitura, setBlobLeitura] = useState<Blob | null>(null);
  // upload em andamento (linha mostra spinner) e leitor abrindo (baixando o PDF do Storage)
  const [enviandoIds, setEnviandoIds] = useState<Set<string>>(new Set());
  const [carregandoLeitor, setCarregandoLeitor] = useState<string | null>(null);

  const pagPorHora = useMemo(() => calcularPagPorHora(calendario), [calendario]);

  const totalPaginas = pdfs.reduce((s, p) => s + p.totalPaginas, 0);
  const paginasLidas = pdfs.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
  const percGeral = totalPaginas > 0 ? Math.round((paginasLidas / totalPaginas) * 100) : 0;
  const etaTotal = fmtEta(totalPaginas - paginasLidas, pagPorHora);

  // grupos por matéria, na ordem do edital (matérias fora da lista ativa vão pro fim)
  const grupos = useMemo(() => {
    const porMateria = new Map<string, PdfEstudo[]>();
    for (const p of pdfs) {
      const lista = porMateria.get(p.materia) ?? [];
      lista.push(p);
      porMateria.set(p.materia, lista);
    }
    const ordem = materiasAtivas.map((m) => m.nome);
    return [...porMateria.entries()]
      .sort((a, b) => {
        const ia = ordem.indexOf(a[0]);
        const ib = ordem.indexOf(b[0]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a[0].localeCompare(b[0]);
      })
      .map(([materia, lista]) => ({
        materia,
        // não concluídos primeiro; dentro de cada bloco, mexidos mais recentemente primeiro
        lista: [...lista].sort((a, b) => {
          const ca = a.paginaAtual >= a.totalPaginas ? 1 : 0;
          const cb = b.paginaAtual >= b.totalPaginas ? 1 : 0;
          if (ca !== cb) return ca - cb;
          return (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm);
        }),
      }));
  }, [pdfs, materiasAtivas]);

  const salvarPdf = async (pdf: PdfEstudo, arquivo?: File) => {
    let registro = pdf;
    if (arquivo) {
      try {
        await salvarArquivoPdf(pdf.id, arquivo);
        registro = { ...pdf, arquivoEnviado: true };
      } catch (e) {
        alert(`Não consegui enviar o arquivo pro Storage — o PDF foi cadastrado só com os dados. ${e instanceof Error ? e.message : ""}`.trim());
      }
    }
    if (editando) {
      onChange(pdfs.map((p) => (p.id === registro.id ? registro : p)));
      setEditando(null);
      setFormAberto(false);
    } else {
      onChange([registro, ...pdfs]);
      // form fica aberto com a matéria mantida (mesma lição das Cartas) — só fecha no X
    }
  };

  // anexar/reanexar arquivo numa entrada já existente (ex.: cadastrada de outro dispositivo, sem
  // o arquivo ainda enviado)
  const anexarEm = async (pdf: PdfEstudo, arquivo: File) => {
    setEnviandoIds((prev) => new Set(prev).add(pdf.id));
    try {
      await salvarArquivoPdf(pdf.id, arquivo);
      // se o total de páginas detectado divergir do cadastrado, corrige pelo arquivo real
      const paginas = await contarPaginasPdf(arquivo);
      onChange(
        pdfs.map((p) =>
          p.id === pdf.id
            ? {
                ...p,
                arquivoEnviado: true,
                ...(paginas !== null && paginas !== p.totalPaginas
                  ? { totalPaginas: paginas, paginaAtual: Math.min(p.paginaAtual, paginas) }
                  : {}),
                atualizadoEm: new Date().toISOString(),
              }
            : p
        )
      );
    } catch (e) {
      alert(`Não consegui enviar o arquivo pro Storage. ${e instanceof Error ? e.message : ""}`.trim());
    } finally {
      setEnviandoIds((prev) => {
        const nova = new Set(prev);
        nova.delete(pdf.id);
        return nova;
      });
    }
  };

  const abrirLeitor = async (pdf: PdfEstudo) => {
    setCarregandoLeitor(pdf.id);
    try {
      const blob = await obterArquivoPdf(pdf.id);
      if (!blob) {
        alert('Arquivo não encontrado no Storage — use "Anexar" pra reenviar o PDF.');
        onChange(pdfs.map((p) => (p.id === pdf.id ? { ...p, arquivoEnviado: false } : p)));
        return;
      }
      setBlobLeitura(blob);
      setLendo(pdf);
    } catch (e) {
      alert(`Não consegui abrir o PDF. ${e instanceof Error ? e.message : "Tente de novo."}`);
    } finally {
      setCarregandoLeitor(null);
    }
  };

  const fecharLeitor = () => {
    setBlobLeitura(null);
    setLendo(null);
  };

  const atualizarPagina = (id: string, pagina: number) => {
    onChange(
      pdfs.map((p) =>
        p.id === id
          ? { ...p, paginaAtual: Math.max(0, Math.min(pagina, p.totalPaginas)), atualizadoEm: new Date().toISOString() }
          : p
      )
    );
  };

  const excluir = (p: PdfEstudo) => {
    if (!confirm(`Excluir "${p.nome}" da biblioteca? O arquivo no Storage e o progresso de leitura somem.`)) return;
    onChange(pdfs.filter((x) => x.id !== p.id));
    if (p.arquivoEnviado) excluirArquivoPdf(p.id).catch(() => { /* best-effort — fica um objeto órfão, inofensivo */ });
  };

  return (
    <div className="space-y-4">
      {/* header com totais + ETA */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Library className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Biblioteca de PDFs</div>
              <div className="text-xs text-emerald-100">
                {pdfs.length === 0
                  ? "Anexe seus PDFs (Estratégia etc.), leia aqui dentro em qualquer dispositivo e acompanhe até onde chegou."
                  : `${pdfs.length} PDF${pdfs.length !== 1 ? "s" : ""} · ${paginasLidas.toLocaleString("pt-BR")}/${totalPaginas.toLocaleString("pt-BR")} páginas lidas` +
                    (etaTotal
                      ? ` · faltam ~${etaTotal} de leitura no seu ritmo de ${Math.round(pagPorHora!)} pág/h`
                      : pagPorHora === null
                      ? " · registre sessões com páginas no Timer pra estimar o tempo restante"
                      : "")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditando(null); setFormAberto((v) => !v); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            {formAberto && !editando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formAberto && !editando ? "Fechar" : "Adicionar PDF"}
          </button>
        </div>
        {pdfs.length > 0 && (
          <div className="mt-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-full h-2.5">
              <div className="bg-white rounded-full h-2.5 transition-all duration-500" style={{ width: `${percGeral}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-emerald-100">
              <span>leitura geral</span>
              <span>{percGeral}%</span>
            </div>
          </div>
        )}
      </div>

      {(formAberto || editando) && (
        <FormPdf
          key={editando?.id ?? "novo"}
          materiasAtivas={materiasAtivas}
          pdfParaEditar={editando ?? undefined}
          onSalvar={salvarPdf}
          onFechar={() => { setEditando(null); setFormAberto(false); }}
        />
      )}

      {pdfs.length === 0 && !formAberto ? (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="text-sm text-foreground font-medium mb-1">Nenhum PDF na biblioteca ainda.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Anexe as aulas em PDF que você estuda: elas ficam salvas na sua conta (Supabase
            Storage privado), você lê aqui dentro do site em qualquer dispositivo e a biblioteca
            acompanha o % lido e quanto tempo de leitura falta.
          </p>
          <button
            type="button"
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar primeiro PDF
          </button>
        </div>
      ) : (
        grupos.map(({ materia, lista }) => {
          const cor = resolverCorMateria(materia, materiasAtivas);
          const tot = lista.reduce((s, p) => s + p.totalPaginas, 0);
          const lidas = lista.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
          const perc = tot > 0 ? Math.round((lidas / tot) * 100) : 0;
          return (
            <div key={materia} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border dark:border-border bg-muted/50">
                <span className={`w-2.5 h-2.5 rounded-full ${cor.dot}`} />
                <span className="text-sm font-semibold text-foreground dark:text-foreground flex-1">{materia}</span>
                <span className="text-[11px] text-muted-foreground">
                  {lista.length} PDF{lista.length !== 1 ? "s" : ""} · {perc}% lido
                </span>
              </div>
              <div className="divide-y divide-border dark:divide-border">
                {lista.map((p) => (
                  <PdfRow
                    key={p.id}
                    pdf={p}
                    temArquivo={p.arquivoEnviado === true}
                    enviando={enviandoIds.has(p.id)}
                    carregando={carregandoLeitor === p.id}
                    pagPorHora={pagPorHora}
                    onLer={() => abrirLeitor(p)}
                    onAnexar={(arq) => anexarEm(p, arq)}
                    onAtualizarPagina={(pag) => atualizarPagina(p.id, pag)}
                    onConcluir={() => atualizarPagina(p.id, p.totalPaginas)}
                    onEditar={() => { setEditando(p); setFormAberto(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    onExcluir={() => excluir(p)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* leitor FULLSCREEN limpo: só o PDF (pdf.js) + barra fina no topo com "parei na pág.",
          botões de criar cartão e o cronômetro da sessão */}
      {lendo && blobLeitura && (
        <LeitorPdf
          pdf={pdfs.find((p) => p.id === lendo.id) ?? lendo}
          blob={blobLeitura}
          onAtualizarPagina={(pag) => atualizarPagina(lendo.id, pag)}
          onRegistrarSessao={onRegistrarSessao}
          onAdicionarCartas={onAdicionarCartas}
          minutosMetaRestantes={metaMinutosRestantes?.[lendo.materia]}
          onFechar={fecharLeitor}
        />
      )}
    </div>
  );
}

// ─── Leitor fullscreen ───────────────────────────────────────────────────────

function fmtCrono(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function LeitorPdf({
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
      {/* barra fina: voltar · nome · parei na pág. · cronômetro */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 h-12 flex-shrink-0 bg-muted text-white">
        <button
          type="button"
          onClick={encerrarSessao}
          title="Fechar o leitor (a sessão do cronômetro é salva na matéria/tópico)"
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
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
          className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white/5 text-muted-foreground hover:bg-white/15 transition-colors flex-shrink-0"
        >
          pág. {paginaVisivel} · Parei aqui
        </button>

        {/* botões de criar cartão — direto na barra, sem precisar selecionar texto nem sair da
            página do PDF: clicou, abre o formulário (por cima do PDF, que continua visível) */}
        {onAdicionarCartas && (
          <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-white/10 pl-1.5 ml-0.5">
            {(Object.entries(TIPO_CARTAO_CONFIG) as [TipoCarta, typeof TIPO_CARTAO_CONFIG.monstro][]).map(([tipo, cfg]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setCartaForm(tipo)}
                title={`Criar cartão ${cfg.label}`}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
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
            pausado ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
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
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2 rounded-full text-xs shadow-xl border bg-emerald-950 border-emerald-700 text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> {toast}
        </div>
      )}
    </div>
  );
}

// ─── Formulário manual do cartão (sem IA, sem grifo — preenchido do zero) ────

function NovoCartaoForm({
  tipo, materia, topico, onSalvar, onCancelar,
}: {
  tipo: TipoCarta;
  materia: string;
  topico?: string;
  onSalvar: (frente: string, verso: string, gabarito?: "verdadeiro" | "falso") => void;
  onCancelar: () => void;
}) {
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [gabarito, setGabarito] = useState<"verdadeiro" | "falso">("verdadeiro");

  const cfg = TIPO_CARTAO_CONFIG[tipo as "monstro" | "armadilha" | "tesouro"];
  const frenteLabel = tipo === "monstro" ? "Pergunta" : tipo === "armadilha" ? "Afirmação (Verdadeiro ou Falso?)" : "Texto com lacuna (use ___ pra indicar)";
  const versoLabel = tipo === "monstro" ? "Resposta" : tipo === "armadilha" ? "Explicação" : "Texto completo";
  const podeSalvar = frente.trim() !== "" && verso.trim() !== "";

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onCancelar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-muted border border-border rounded-2xl w-full max-w-lg p-4 space-y-3 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <cfg.Icon className="h-4 w-4 text-primary" /> Novo cartão {cfg.label}
          </div>
          <button type="button" onClick={onCancelar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
          {materia}{topico ? ` · ${topico}` : ""}
        </div>

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">{frenteLabel}</label>
          <textarea
            value={frente}
            onChange={(e) => setFrente(e.target.value)}
            rows={3}
            autoFocus={tipo === "monstro"}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {tipo === "armadilha" && (
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Gabarito</label>
            <div className="flex gap-2">
              {(["verdadeiro", "falso"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGabarito(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                    gabarito === g
                      ? g === "verdadeiro"
                        ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                        : "border-red-500 bg-red-950/40 text-red-300"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {g === "verdadeiro" ? "✓ Verdadeiro" : "✗ Falso"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">{versoLabel}</label>
          <textarea
            value={verso}
            onChange={(e) => setVerso(e.target.value)}
            rows={4}
            autoFocus={tipo === "armadilha"}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSalvar(frente, verso, gabarito)}
            disabled={!podeSalvar}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Criar cartão
          </button>
          <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 text-xs font-medium transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// input de página do leitor — separado pra ter estado local sem re-render do iframe a cada tecla
function InputPaginaLeitor({ pdf, onCommit }: { pdf: PdfEstudo; onCommit: (pag: number) => void }) {
  const [valor, setValor] = useState(String(pdf.paginaAtual));
  const commit = () => {
    const n = parseInt(valor);
    if (!Number.isFinite(n)) { setValor(String(pdf.paginaAtual)); return; }
    const clamp = Math.max(0, Math.min(n, pdf.totalPaginas));
    setValor(String(clamp));
    if (clamp !== pdf.paginaAtual) onCommit(clamp);
  };
  return (
    <input
      type="number"
      min={0}
      max={pdf.totalPaginas}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-16 text-xs border border-border rounded-md px-1.5 py-1 bg-muted text-foreground focus:outline-none focus:border-primary flex-shrink-0"
    />
  );
}

// ─── Linha de PDF ────────────────────────────────────────────────────────────

function PdfRow({
  pdf, temArquivo, enviando, carregando, pagPorHora, onLer, onAnexar, onAtualizarPagina, onConcluir, onEditar, onExcluir,
}: {
  pdf: PdfEstudo;
  temArquivo: boolean;
  enviando: boolean;
  carregando: boolean;
  pagPorHora: number | null;
  onLer: () => void;
  onAnexar: (arquivo: File) => void;
  onAtualizarPagina: (pagina: number) => void;
  onConcluir: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [paginaInput, setPaginaInput] = useState(String(pdf.paginaAtual));
  const anexoRef = useRef<HTMLInputElement>(null);
  const perc = pdf.totalPaginas > 0 ? Math.round((Math.min(pdf.paginaAtual, pdf.totalPaginas) / pdf.totalPaginas) * 100) : 0;
  const concluido = pdf.paginaAtual >= pdf.totalPaginas;
  const eta = fmtEta(pdf.totalPaginas - pdf.paginaAtual, pagPorHora);

  const commitPagina = () => {
    const n = parseInt(paginaInput);
    if (!Number.isFinite(n)) { setPaginaInput(String(pdf.paginaAtual)); return; }
    const clamp = Math.max(0, Math.min(n, pdf.totalPaginas));
    setPaginaInput(String(clamp));
    if (clamp !== pdf.paginaAtual) onAtualizarPagina(clamp);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-foreground dark:text-foreground">{pdf.nome}</span>
            {concluido && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> concluído
              </span>
            )}
          </div>
          {(pdf.topicos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pdf.topicos!.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground max-w-[240px] truncate" title={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {temArquivo ? (
            <button
              type="button"
              onClick={onLer}
              disabled={carregando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
              {carregando ? "Abrindo…" : "Ler PDF"}
            </button>
          ) : (
            <>
              <input
                ref={anexoRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAnexar(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => anexoRef.current?.click()}
                disabled={enviando}
                title="O arquivo ainda não foi enviado — anexe o PDF pra ler aqui dentro (fica salvo na nuvem)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                {enviando ? "Enviando…" : "Anexar"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onEditar}
            title="Editar PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onExcluir}
            title="Excluir PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div className="flex-1">
          <div className="relative bg-muted dark:bg-muted rounded-full h-2 overflow-hidden">
            {concluido ? (
              <div className="absolute inset-0 bg-emerald-500 rounded-full" />
            ) : (
              <>
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-lime-300 via-lime-500 to-green-600 rounded-full" />
                <div
                  className="absolute inset-y-0 right-0 bg-muted dark:bg-muted transition-all duration-500"
                  style={{ width: `${100 - perc}%` }}
                />
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap w-24 text-right">
          {Math.min(pdf.paginaAtual, pdf.totalPaginas)}/{pdf.totalPaginas} pág · {perc}%
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <label className="text-[11px] text-muted-foreground">Parei na pág.</label>
        <input
          type="number"
          min={0}
          max={pdf.totalPaginas}
          value={paginaInput}
          onChange={(e) => setPaginaInput(e.target.value)}
          onBlur={commitPagina}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-20 text-xs border border-border dark:border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:border-primary"
        />
        {!concluido && (
          <button
            type="button"
            onClick={onConcluir}
            className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            Concluí a leitura
          </button>
        )}
        {eta && !concluido && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" /> ~{eta} restantes
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Form de cadastro/edição ─────────────────────────────────────────────────

function FormPdf({
  materiasAtivas, pdfParaEditar, onSalvar, onFechar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  pdfParaEditar?: PdfEstudo;
  onSalvar: (pdf: PdfEstudo, arquivo?: File) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(pdfParaEditar?.nome ?? "");
  const [materia, setMateria] = useState(pdfParaEditar?.materia ?? materiasAtivas[0]?.nome ?? "");
  const [topicosSel, setTopicosSel] = useState<Set<string>>(new Set(pdfParaEditar?.topicos ?? []));
  const [totalPaginas, setTotalPaginas] = useState(pdfParaEditar ? String(pdfParaEditar.totalPaginas) : "");
  const [paginasDetectadas, setPaginasDetectadas] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mostrarTopicos, setMostrarTopicos] = useState((pdfParaEditar?.topicos?.length ?? 0) > 0);
  const [salvasAgora, setSalvasAgora] = useState(0);
  const [flash, setFlash] = useState(false);
  const [enviando, setEnviando] = useState(false);
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

  const salvar = async () => {
    if (!podeSalvar || enviando) return;
    setEnviando(true);
    try {
      const topicos = [...topicosSel].filter((t) => topicosDaMateria.includes(t));
      if (pdfParaEditar) {
        await onSalvar(
          {
            ...pdfParaEditar,
            nome: nome.trim(),
            materia,
            topicos: topicos.length > 0 ? topicos : undefined,
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
            totalPaginas: paginasNum,
            paginaAtual: 0,
            criadoEm: new Date().toISOString(),
          },
          arquivo ?? undefined
        );
        // matéria fica mantida pro próximo PDF (cadastro em sequência); limpa o resto
        setNome("");
        setTotalPaginas("");
        setTopicosSel(new Set());
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
