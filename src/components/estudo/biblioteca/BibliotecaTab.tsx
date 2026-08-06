"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FileStack, Library, Plus, Sparkles, X } from "lucide-react";
import {
  MATERIAS, calcularPagPorHora,
  type AtividadeCalendario, type AtividadeTipo, type CapituloPdf, type Carta, type MateriaConcurso, type MateriaDef,
  type PdfEstudo, type TopicoState,
} from "@/lib/estudo-data";
import {
  salvarArquivoPdf, obterArquivoPdf, excluirArquivoPdf, contarPaginasPdf,
} from "@/lib/pdf-storage";
import { resolverCorMateria } from "../trilha/trilha-ui";
import type { AberturaPdfSolicitada } from "../trilha/TrilhaLinhas";
import EstudoHero from "../ui/EstudoHero";
import { alvoLeituraPdf, fmtEta } from "./biblioteca-utils";
import FormPdf from "./FormPdf";
import FormPdfLote from "./FormPdfLote";
import SugestaoLoteModal from "./SugestaoLoteModal";
import PdfRow from "./PdfRow";
import LeitorPdf, { type MetaEstudoMateria } from "./LeitorPdf";

// Biblioteca de PDFs (ex.: aulas do Estratégia): anexe o ARQUIVO e leia dentro do próprio site
// num leitor FULLSCREEN limpo (só o PDF + barra fina com "parei na pág." e cronômetro), com
// progresso "parei na pág. X", % lido e ETA calculada com o páginas/hora histórico do Timer
// (calcularPagPorHora). O cronômetro do leitor conta sozinho e, ao fechar (sessão ≥1 min), salva
// uma atividade de Estudo no calendário da matéria/tópico do PDF via onRegistrarSessao.
// O arquivo fica no SUPABASE STORAGE (privado — pdf-storage.ts), não mais no navegador: uma vez
// enviado, `PdfEstudo.arquivoEnviado` sincroniza junto com o resto do EstudoState e o PDF abre em
// qualquer dispositivo que o usuário logar, sem precisar reanexar.

// Sub-agrupa os PDFs de uma matéria pelo tópico PRIMÁRIO (pdf.topicos?.[0] — na prática um PDF
// cobre no máximo um tópico, mesma convenção já usada em LeitorPdf.tsx) — deixa óbvio quando um
// tópico já tem mais de um PDF (empilhados juntos) e dá onde pendurar o botão "+" de anexar mais
// um. PDFs sem tópico marcado caem no grupo "Sem tópico", sempre por último.
function agruparPorTopico(
  lista: PdfEstudo[],
  topicosDaMateria: string[]
): { topico: string | null; itens: PdfEstudo[] }[] {
  const porTopico = new Map<string | null, PdfEstudo[]>();
  for (const p of lista) {
    const t = p.topicos?.[0] ?? null;
    const arr = porTopico.get(t) ?? [];
    arr.push(p);
    porTopico.set(t, arr);
  }
  return [...porTopico.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const ia = topicosDaMateria.indexOf(a);
    const ib = topicosDaMateria.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  }).map(([topico, itens]) => ({ topico, itens }));
}

// sentinela do escopo "todas as matérias" da sugestão em lote — precisa ser truthy (uma matéria
// de verdade nunca se chama isso) pra diferenciar de null (modal fechada) nos checks `&&`
const ESCOPO_TODAS = "__todas__";

interface Props {
  // concurso ativo — necessário pro upload no Storage saber em qual pasta compartilhada
  // (${concursoId}/${pdfId}.pdf) salvar (ver salvarArquivoPdf em pdf-storage.ts)
  concursoId: string;
  pdfs: PdfEstudo[];
  calendario: Record<string, AtividadeCalendario[]>;
  onChange: (pdfs: PdfEstudo[]) => void;
  materiasConcurso?: MateriaConcurso[];
  // tópicos do edital — o leitor lê/escreve aqui pra sincronizar cadernos A-D das questões
  // escalonadas e marcar "concluir leitura do tópico"
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onRegistrarSessao?: (minutos: number, tipo: AtividadeTipo, materia: string, topico: string | undefined, paginas: number | undefined, descricao: string) => void;
  // criar cartão: botões na barra do leitor (ao lado de "Parei aqui") abrem o formulário do tipo
  // escolhido; o usuário preenche manualmente (sem IA), já travado na matéria/tópico do PDF
  onAdicionarCartas?: (cartas: Carta[]) => void;
  // trilha dinâmica: minutos que faltam HOJE pra fechar o bloco de estudo de cada matéria — o
  // leitor avisa em tempo real quando a sessão atual cruza esse restante ("meta do dia feita!")
  metaMinutosRestantes?: Record<string, number>;
  // progresso de horas por matéria (atividade do dia + semana) — o leitor mostra 2 barras ao vivo
  metasEstudo?: Record<string, MetaEstudoMateria>;
  // pedido de abertura vindo de fora (botão "Ler PDF" da Trilha, com página mapeada pro tópico) —
  // consumido uma vez (abre o leitor + onAberturaConsumida) e não de novo até um pedido novo
  aberturaSolicitada?: AberturaPdfSolicitada | null;
  onAberturaConsumida?: () => void;
  // capítulos marcados como lidos manualmente (checkbox da Trilha, chaveCapitulo em
  // trilha-dinamica.ts) — o leitor precisa saber disso pro aviso de "passou do conteúdo
  // indicado" não disparar retroativo pra capítulos que já foram concluídos sem ler de novo
  capitulosConcluidos?: string[];
}

export default function BibliotecaTab({
  concursoId, pdfs, calendario, onChange, materiasConcurso, topicos, onUpdateTopicos, onRegistrarSessao,
  onAdicionarCartas, metaMinutosRestantes, metasEstudo, aberturaSolicitada, onAberturaConsumida, capitulosConcluidos,
}: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [formAberto, setFormAberto] = useState(false);
  const [formLoteAberto, setFormLoteAberto] = useState(false);
  // escopo da sugestão em lote: null = fechada, ESCOPO_TODAS = todas as matérias (botão do
  // cabeçalho), ou o nome de uma matéria (botão "Sugerir com IA" no cabeçalho daquela seção)
  const [sugestaoLoteEscopo, setSugestaoLoteEscopo] = useState<string | null>(null);
  const [editando, setEditando] = useState<PdfEstudo | null>(null);
  const [lendo, setLendo] = useState<PdfEstudo | null>(null);
  const [blobLeitura, setBlobLeitura] = useState<Blob | null>(null);
  // upload em andamento (linha mostra spinner) e leitor abrindo (baixando o PDF do Storage)
  const [enviandoIds, setEnviandoIds] = useState<Set<string>>(new Set());
  const [carregandoLeitor, setCarregandoLeitor] = useState<string | null>(null);
  // cada matéria vira uma seção colapsável (default fechada) — com muitos PDFs a página inteira
  // expandida forçava scroll enorme; só abre a matéria que o usuário quer ver
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  // preenche matéria/tópico ao abrir o form pra um PDF NOVO a partir do botão "+" de um tópico
  // que já tem PDF (ver agruparPorTopico) — permite anexar mais de um PDF ao mesmo tópico sem
  // precisar remarcar tudo de novo
  const [presetNovoPdf, setPresetNovoPdf] = useState<{ materia: string; topico?: string } | null>(null);

  const pagPorHora = useMemo(() => calcularPagPorHora(calendario), [calendario]);

  // "página alvo" de cada PDF = fim do conteúdo (se definido) — depois disso é só questão, não
  // conta pra saber se a LEITURA terminou nem pro % geral
  const totalPaginas = pdfs.reduce((s, p) => s + alvoLeituraPdf(p), 0);
  const paginasLidas = pdfs.reduce((s, p) => s + Math.min(p.paginaAtual, alvoLeituraPdf(p)), 0);
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
          const ca = a.paginaAtual >= alvoLeituraPdf(a) ? 1 : 0;
          const cb = b.paginaAtual >= alvoLeituraPdf(b) ? 1 : 0;
          if (ca !== cb) return ca - cb;
          return (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm);
        }),
      }));
  }, [pdfs, materiasAtivas]);

  const salvarPdf = async (pdf: PdfEstudo, arquivo?: File) => {
    let registro = pdf;
    if (arquivo) {
      try {
        await salvarArquivoPdf(pdf.id, arquivo, concursoId);
        registro = { ...pdf, arquivoEnviado: true };
      } catch (e) {
        alert(`Não consegui enviar o arquivo pro Storage — o PDF foi cadastrado só com os dados. ${e instanceof Error ? e.message : ""}`.trim());
      }
    }
    // expande a matéria do PDF salvo — sem isso, adicionar/editar um PDF numa matéria colapsada
    // some da vista até o usuário abrir a seção manualmente
    setExpandidos((prev) => ({ ...prev, [registro.materia]: true }));
    if (editando) {
      onChange(pdfs.map((p) => (p.id === registro.id ? registro : p)));
      setEditando(null);
      setFormAberto(false);
    } else {
      onChange([registro, ...pdfs]);
      // form fica aberto com a matéria (e o tópico preset, se veio de um) mantidos — só fecha no X
    }
  };

  // upload em lote (FormPdfLote): recebe o lote INTEIRO já com upload feito, e faz UM ÚNICO
  // onChange/setExpandidos com tudo -- nunca um onChange por arquivo (ver comentário na prop
  // onSalvarLote do FormPdfLote sobre o risco de closure obsoleta numa sequência de chamadas)
  const salvarPdfsEmLote = (registros: PdfEstudo[]) => {
    if (registros.length === 0) return;
    setExpandidos((prev) => {
      const novo = { ...prev };
      for (const r of registros) novo[r.materia] = true;
      return novo;
    });
    onChange([...registros, ...pdfs]);
  };

  // sugestão de CAPÍTULOS por IA em lote (SugestaoLoteModal): já vem revisado/confirmado pelo
  // usuário — só aplica em cima dos PDFs existentes, um único onChange (mesmo motivo do
  // salvarPdfsEmLote acima: nunca um onChange por item). O modal só entra PDF que ainda não tem
  // NENHUM capítulo (ver alvos em SugestaoLoteModal.tsx), então é sempre uma atribuição direta —
  // nunca precisa mesclar com capítulos já existentes.
  const aplicarSugestoesEmLote = (patches: { id: string; capitulos: CapituloPdf[] }[]) => {
    if (patches.length === 0) return;
    // expande a(s) matéria(s) afetadas — sem isso, aplicar sugestão numa matéria colapsada some
    // com o resultado da vista até o usuário abrir a seção manualmente
    setExpandidos((prev) => {
      const novo = { ...prev };
      for (const patch of patches) {
        const materia = pdfs.find((p) => p.id === patch.id)?.materia;
        if (materia) novo[materia] = true;
      }
      return novo;
    });
    onChange(
      pdfs.map((p) => {
        const patch = patches.find((x) => x.id === p.id);
        if (!patch) return p;
        return { ...p, capitulos: patch.capitulos, atualizadoEm: new Date().toISOString() };
      })
    );
  };

  // anexar/reanexar arquivo numa entrada já existente (ex.: cadastrada de outro dispositivo, sem
  // o arquivo ainda enviado)
  const anexarEm = async (pdf: PdfEstudo, arquivo: File) => {
    setEnviandoIds((prev) => new Set(prev).add(pdf.id));
    try {
      await salvarArquivoPdf(pdf.id, arquivo, concursoId);
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

  // abertura vinda de um deep link (Trilha "Ler PDF", com página mapeada pro tópico) — guardada
  // à parte de `lendo`/`blobLeitura` porque só ela carrega paginaInicio/paginaFim; abertura
  // genérica (clique na própria Biblioteca) passa undefined e o leitor abre do jeito de sempre
  const [aberturaAtual, setAberturaAtual] = useState<AberturaPdfSolicitada | null>(null);

  const abrirLeitor = async (pdf: PdfEstudo, abertura?: AberturaPdfSolicitada) => {
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
      setAberturaAtual(abertura ?? null);
    } catch (e) {
      alert(`Não consegui abrir o PDF. ${e instanceof Error ? e.message : "Tente de novo."}`);
    } finally {
      setCarregandoLeitor(null);
    }
  };

  // consome um pedido de abertura externo uma vez só — assim que dispara, avisa o pai
  // (onAberturaConsumida) pra ele zerar o pedido e essa mesma abertura não repetir de novo
  useEffect(() => {
    if (!aberturaSolicitada) return;
    const pdf = pdfs.find((p) => p.id === aberturaSolicitada.pdfId);
    if (pdf) abrirLeitor(pdf, aberturaSolicitada);
    onAberturaConsumida?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberturaSolicitada]);

  const fecharLeitor = () => {
    setBlobLeitura(null);
    setLendo(null);
    setAberturaAtual(null);
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

  // patch genérico num PDF (fim do conteúdo, questões geradas) — mesma ideia de atualizarPagina,
  // mas pra qualquer campo em vez de só paginaAtual
  const atualizarPdf = (id: string, patch: Partial<PdfEstudo>) => {
    onChange(pdfs.map((p) => (p.id === id ? { ...p, ...patch, atualizadoEm: new Date().toISOString() } : p)));
  };

  const excluir = (p: PdfEstudo) => {
    if (!confirm(`Excluir "${p.nome}" da biblioteca? O arquivo no Storage e o progresso de leitura somem.`)) return;
    onChange(pdfs.filter((x) => x.id !== p.id));
    if (p.arquivoEnviado) excluirArquivoPdf(p.id).catch(() => { /* best-effort — fica um objeto órfão, inofensivo */ });
  };

  return (
    <div className="space-y-4">
      {/* header com totais + ETA */}
      <EstudoHero>
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
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setEditando(null); setPresetNovoPdf(null); setFormAberto((v) => !v); setFormLoteAberto(false); setSugestaoLoteEscopo(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
            >
              {formAberto && !editando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {formAberto && !editando ? "Fechar" : "Adicionar PDF"}
            </button>
            <button
              type="button"
              onClick={() => { setEditando(null); setFormAberto(false); setFormLoteAberto((v) => !v); setSugestaoLoteEscopo(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
              title="Anexar vários PDFs de uma vez e linkar por tópico pelo nome do arquivo"
            >
              {formLoteAberto ? <X className="h-3.5 w-3.5" /> : <FileStack className="h-3.5 w-3.5" />}
              {formLoteAberto ? "Fechar" : "Vários PDFs"}
            </button>
            {pdfs.length > 0 && (
              <button
                type="button"
                onClick={() => { setEditando(null); setFormAberto(false); setFormLoteAberto(false); setSugestaoLoteEscopo((v) => (v === ESCOPO_TODAS ? null : ESCOPO_TODAS)); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                title="Roda a sugestão de capítulos por IA em todos os PDFs que ainda não têm nenhum capítulo, com revisão antes de aplicar"
              >
                {sugestaoLoteEscopo === ESCOPO_TODAS ? <X className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {sugestaoLoteEscopo === ESCOPO_TODAS ? "Fechar" : "Sugerir capítulos (IA)"}
              </button>
            )}
          </div>
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
      </EstudoHero>

      {(formAberto || editando) && (
        <FormPdf
          key={editando?.id ?? `novo-${presetNovoPdf?.materia ?? ""}-${presetNovoPdf?.topico ?? ""}`}
          materiasAtivas={materiasAtivas}
          pdfParaEditar={editando ?? undefined}
          presetMateria={presetNovoPdf?.materia}
          presetTopico={presetNovoPdf?.topico}
          onSalvar={salvarPdf}
          onFechar={() => { setEditando(null); setFormAberto(false); setPresetNovoPdf(null); }}
        />
      )}

      {formLoteAberto && (
        <FormPdfLote
          concursoId={concursoId}
          materiasAtivas={materiasAtivas}
          onSalvarLote={salvarPdfsEmLote}
          onFechar={() => setFormLoteAberto(false)}
        />
      )}

      {sugestaoLoteEscopo && (
        <SugestaoLoteModal
          pdfs={pdfs}
          materiasAtivas={materiasAtivas}
          materiaFiltro={sugestaoLoteEscopo === ESCOPO_TODAS ? undefined : sugestaoLoteEscopo}
          onAplicar={aplicarSugestoesEmLote}
          onFechar={() => setSugestaoLoteEscopo(null)}
        />
      )}

      {pdfs.length === 0 && !formAberto && !formLoteAberto ? (
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
          const tot = lista.reduce((s, p) => s + alvoLeituraPdf(p), 0);
          const lidas = lista.reduce((s, p) => s + Math.min(p.paginaAtual, alvoLeituraPdf(p)), 0);
          const perc = tot > 0 ? Math.round((lidas / tot) * 100) : 0;
          const aberto = expandidos[materia] ?? false;
          const topicosDaMateria = materiasAtivas.find((m) => m.nome === materia)?.topicos ?? [];
          const porTopico = agruparPorTopico(lista, topicosDaMateria);
          // só vale a pena mostrar sub-cabeçalho de tópico quando há tópico de verdade pra
          // agrupar — matérias sem nenhum PDF marcado com tópico continuam como lista simples
          const comSubcabecalhos = !(porTopico.length === 1 && porTopico[0].topico === null);

          const abrirNovoPdf = (topico?: string) => {
            setEditando(null);
            setPresetNovoPdf({ materia, topico });
            setFormAberto(true);
          };

          return (
            <div key={materia} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="w-full flex items-center gap-1 pl-4 pr-2 py-2 border-b border-border dark:border-border bg-muted/50">
                <button
                  type="button"
                  onClick={() => setExpandidos((prev) => ({ ...prev, [materia]: !aberto }))}
                  className="flex-1 min-w-0 flex items-center gap-2 py-0.5 text-left"
                >
                  {aberto ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`w-2.5 h-2.5 rounded-full ${cor.dot} flex-shrink-0`} />
                  <span className="text-sm font-semibold text-foreground dark:text-foreground truncate">{materia}</span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {lista.length} PDF{lista.length !== 1 ? "s" : ""} · {perc}% lido
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEditando(null); setFormAberto(false); setFormLoteAberto(false); setSugestaoLoteEscopo((v) => (v === materia ? null : materia)); }}
                  title={`Sugerir capítulos por IA só nos PDFs de ${materia}`}
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                >
                  {sugestaoLoteEscopo === materia ? <X className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                </button>
              </div>
              {aberto && (
                <div className="divide-y divide-border dark:divide-border">
                  {porTopico.map(({ topico, itens }) => (
                    <div key={topico ?? "__sem_topico__"}>
                      {comSubcabecalhos && (
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20">
                          <span className="text-[11px] text-muted-foreground flex-1 truncate" title={topico ?? undefined}>
                            {topico ?? "Sem tópico"}
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirNovoPdf(topico ?? undefined)}
                            title={topico ? `Anexar outro PDF em "${topico}"` : "Anexar outro PDF nessa matéria"}
                            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="divide-y divide-border dark:divide-border">
                        {itens.map((p) => (
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
                            onConcluir={() => atualizarPagina(p.id, alvoLeituraPdf(p))}
                            onEditar={() => { setEditando(p); setPresetNovoPdf(null); setFormAberto(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            onExcluir={() => excluir(p)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          topicos={topicos}
          onAtualizarPagina={(pag) => atualizarPagina(lendo.id, pag)}
          onAtualizarPdf={(patch) => atualizarPdf(lendo.id, patch)}
          onUpdateTopicos={onUpdateTopicos}
          onRegistrarSessao={onRegistrarSessao}
          onAdicionarCartas={onAdicionarCartas}
          minutosMetaRestantes={metaMinutosRestantes?.[lendo.materia]}
          metaEstudo={metasEstudo?.[lendo.materia]}
          paginaAbertura={aberturaAtual?.paginaInicio}
          paginaFimAlvo={aberturaAtual?.paginaFim}
          onFechar={fecharLeitor}
          capitulosConcluidos={capitulosConcluidos}
        />
      )}
    </div>
  );
}
