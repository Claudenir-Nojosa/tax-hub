"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  DEFAULT_ESTUDO_STATE,
  calcularXP,
  calcularNivel,
  calcularStreakDias,
  dateKeyLocal,
  topicoKey,
  filtrarTopicosExcluidos,
  NIVEL_CONFIG,
  type EstudoState,
  type TopicoState,
  type AtividadeCalendario,
  type EstudoConfigCiclo,
  type AtividadeTipo,
  type Grupo,
  type Carta,
  type TrilhaDinamicaState,
  type PdfEstudo,
  MATERIAS,
} from "@/lib/estudo-data";
import { computarMetaDia } from "@/lib/trilha-dinamica";
import { LayoutDashboard, BookOpen, RotateCcw, CalendarDays, Flame, BarChart2, Layers, RefreshCw, GitCompare, FileText, Route, Library } from "lucide-react";
import type { ConcursoData, MateriaBase, MateriaConcurso } from "@/lib/estudo-data";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import StatTile from "@/components/estudo/ui/StatTile";

const DashboardTab = dynamic(() => import("@/components/estudo/DashboardTab"), { ssr: false });
const EditalTab = dynamic(() => import("@/components/estudo/EditalTab"), { ssr: false });
const CicloTab = dynamic(() => import("@/components/estudo/CicloTab"), { ssr: false });
const CalendarioTab = dynamic(() => import("@/components/estudo/CalendarioTab"), { ssr: false });
const RelatoriosTab = dynamic(() => import("@/components/estudo/RelatoriosTab"), { ssr: false });
const CartasTab = dynamic(() => import("@/components/estudo/cartas/CartasTab"), { ssr: false });
const ResumosTab = dynamic(() => import("@/components/estudo/ResumosTab"), { ssr: false });
const TrilhaTab = dynamic(() => import("@/components/estudo/TrilhaTab"), { ssr: false });
const BibliotecaTab = dynamic(() => import("@/components/estudo/biblioteca/BibliotecaTab"), { ssr: false });
const TimerEstudo = dynamic(() => import("@/components/estudo/timer/TimerEstudo"), { ssr: false });
const CompararEditaisTab = dynamic(() => import("@/components/estudo/CompararEditaisTab"), { ssr: false });

const storageKey = (concursoId: string | null) =>
  concursoId ? `taxhub_estudo_c_${concursoId}` : "taxhub_estudo_v1";

type Tab = "dashboard" | "edital" | "biblioteca" | "ciclo" | "trilha" | "calendario" | "relatorios" | "cartas" | "resumos" | "comparar";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "edital", label: "Edital", icon: BookOpen },
  { id: "biblioteca", label: "Biblioteca", icon: Library },
  { id: "ciclo", label: "Ciclo de Estudos", icon: RotateCcw },
  { id: "trilha", label: "Trilha", icon: Route },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
  { id: "relatorios", label: "Relatórios", icon: BarChart2 },
  { id: "cartas", label: "Cartas", icon: Layers },
];

function mergeWithDefaults(parsed: Partial<EstudoState>): EstudoState {
  return {
    ...DEFAULT_ESTUDO_STATE,
    ...parsed,
    // blobs atômicos: passam inteiros ou ficam ausentes — nunca deep-mergear com default
    trilha: parsed.trilha, // legado (trilha antiga de metas pré-geradas)
    trilhaDinamica: parsed.trilhaDinamica,
    cartas: parsed.cartas ?? [],
    pdfs: parsed.pdfs ?? [],
    topicosExcluidos: parsed.topicosExcluidos ?? [],
    topicos: {
      ...DEFAULT_ESTUDO_STATE.topicos,
      ...(parsed.topicos ?? {}),
    },
    configCiclo: {
      ...DEFAULT_ESTUDO_STATE.configCiclo,
      ...(parsed.configCiclo ?? {}),
      materias: {
        ...DEFAULT_ESTUDO_STATE.configCiclo.materias,
        ...(parsed.configCiclo?.materias ?? {}),
      },
    },
  };
}

function loadFromLocalStorage(concursoId: string | null): EstudoState | null {
  try {
    const raw = localStorage.getItem(storageKey(concursoId));
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw) as Partial<EstudoState>);
  } catch {
    return null;
  }
}

export default function EstudoPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const primeiroNome = session?.user?.name?.split(" ")[0];
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<EstudoState>(DEFAULT_ESTUDO_STATE);
  const [loaded, setLoaded] = useState(false);
  const [concursoAtivo, setConcursoAtivo] = useState<(ConcursoData & { id: string }) | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Migra e carrega concurso (por ID da URL ou principal)
  useEffect(() => {
    const concursoIdParam = searchParams.get("concursoId");
    (async () => {
      try {
        await fetch("/api/estudo/migrar", { method: "POST" });
        const res = await fetch("/api/concurso");
        if (res.ok) {
          const lista = await res.json() as (ConcursoData & { id: string })[];
          // Se veio ?concursoId=xxx, usa esse; senão usa o principal
          const alvo = concursoIdParam
            ? (lista.find(c => c.id === concursoIdParam) ?? lista.find(c => c.isPrincipal) ?? lista[0])
            : (lista.find(c => c.isPrincipal) ?? lista[0]);
          if (alvo) {
            setConcursoAtivo(alvo);
            const progressoRes = await fetch(`/api/concurso/${alvo.id}/progresso`);
            if (progressoRes.ok) {
              const dados = await progressoRes.json();
              setState(dados ? mergeWithDefaults(dados as Partial<EstudoState>) : DEFAULT_ESTUDO_STATE);
            } else {
              setState(DEFAULT_ESTUDO_STATE);
            }
            setLoaded(true);
            return;
          }
        }
      } catch {
        // silent
      }
      setState(loadFromLocalStorage(null) ?? DEFAULT_ESTUDO_STATE);
      setLoaded(true);
    })();
  }, [searchParams]);

  // Persiste: localStorage imediato + banco com debounce de 2s
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey(concursoAtivo?.id ?? null), JSON.stringify(state));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const url = concursoAtivo
          ? `/api/concurso/${concursoAtivo.id}/progresso`
          : "/api/estudo";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error("[estudo] Falha ao salvar no banco:", res.status, body);
        }
      } catch (err) {
        console.error("[estudo] Erro de rede ao salvar:", err);
      }
    }, 2000);
  }, [state, loaded, concursoAtivo]);

  const updateTopicos = useCallback((topicos: Record<string, TopicoState>) => {
    setState((prev) => ({ ...prev, topicos }));
  }, []);

  const updateCalendario = useCallback((calendario: Record<string, AtividadeCalendario[]>) => {
    setState((prev) => ({ ...prev, calendario }));
  }, []);

  const updateCartas = useCallback((cartas: Carta[]) => {
    setState((prev) => ({ ...prev, cartas }));
  }, []);

  const updateConfigCiclo = useCallback((configCiclo: EstudoConfigCiclo) => {
    setState((prev) => ({ ...prev, configCiclo }));
  }, []);

  const updateTrilhaDinamica = useCallback((trilhaDinamica: TrilhaDinamicaState | undefined) => {
    setState((prev) => ({ ...prev, trilhaDinamica }));
  }, []);

  const updatePdfs = useCallback((pdfs: PdfEstudo[]) => {
    setState((prev) => ({ ...prev, pdfs }));
  }, []);

  // excluir/reativar um tópico no Edital — reversível: só some da lista/cálculos, o progresso
  // (estudado, cadernos A-D) já registrado em `topicos` fica intacto e volta se reativado
  const toggleTopicoExcluido = useCallback((materia: string, topico: string) => {
    const key = topicoKey(materia, topico);
    setState((prev) => ({
      ...prev,
      topicosExcluidos: prev.topicosExcluidos.includes(key)
        ? prev.topicosExcluidos.filter((k) => k !== key)
        : [...prev.topicosExcluidos, key],
    }));
  }, []);

  // excluir um tópico DE VERDADE — remove da lista de tópicos da matéria (concurso.materias no
  // banco, via PUT), diferente de toggleTopicoExcluido (que só oculta). Também limpa o progresso
  // (estudado/cadernos) e a marca de oculto desse tópico, já que ele deixa de existir. Otimista:
  // atualiza a UI na hora, PUT em paralelo; se falhar, avisa e reverte.
  const deleteTopico = useCallback((materia: string, topico: string) => {
    if (!concursoAtivo) return;
    const materiasAtualizadas = (concursoAtivo.materias as MateriaConcurso[]).map((m) =>
      m.nome === materia ? { ...m, topicos: m.topicos.filter((t) => t !== topico) } : m
    );
    const anterior = concursoAtivo.materias;
    setConcursoAtivo((prev) => (prev ? { ...prev, materias: materiasAtualizadas } : prev));
    const key = topicoKey(materia, topico);
    setState((prev) => {
      const { [key]: _removido, ...topicosRestantes } = prev.topicos;
      return {
        ...prev,
        topicos: topicosRestantes,
        topicosExcluidos: prev.topicosExcluidos.filter((k) => k !== key),
      };
    });
    fetch(`/api/concurso/${concursoAtivo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materias: materiasAtualizadas }),
    }).then((res) => {
      if (!res.ok) throw new Error();
    }).catch(() => {
      toast.error("Não deu pra excluir o tópico — tente de novo");
      setConcursoAtivo((prev) => (prev ? { ...prev, materias: anterior } : prev));
    });
  }, [concursoAtivo]);

  // cartas geradas pelo grifo no leitor de PDF — prepend no baralho (mesma ordem do CartasTab)
  const adicionarCartas = useCallback((novas: Carta[]) => {
    setState((prev) => ({ ...prev, cartas: [...novas, ...prev.cartas] }));
  }, []);

  const handleTimerSalvar = useCallback(
    (duracao: number, tipo: AtividadeTipo, descricao: string, grupo?: Grupo, materia?: string, topico?: string, paginas?: number) => {
      const today = dateKeyLocal();
      const nova: AtividadeCalendario = {
        id: Date.now().toString(),
        tipo,
        descricao,
        duracao,
        ...(grupo ? { grupo } : {}),
        ...(materia ? { materia } : {}),
        ...(topico ? { topico } : {}),
        ...(paginas && paginas > 0 ? { paginas } : {}),
      };
      setState((prev) => ({
        ...prev,
        calendario: {
          ...prev.calendario,
          [today]: [...(prev.calendario[today] ?? []), nova],
        },
      }));
    },
    []
  );

  const handleSemanasOKChange = useCallback((delta: number) => {
    setState((prev) => ({
      ...prev,
      semanasOK: Math.max(0, prev.semanasOK + delta),
      streak: delta > 0 ? prev.streak + 1 : Math.max(0, prev.streak - 1),
    }));
  }, []);

  const xp = calcularXP(state.topicos, state.calendario, state.cartas);
  const nivel = calcularNivel(xp);
  const nivelConfig = NIVEL_CONFIG[nivel];

  // matérias com os tópicos EXCLUÍDOS já removidos — fonte única passada pra toda aba EXCETO o
  // Edital (que precisa da lista completa, incluindo excluídos, pra poder reativá-los). undefined
  // quando o concurso ainda não carregou — cada aba já tem seu próprio fallback pra MATERIAS
  // nesse caso transitório (na prática concursoAtivo.materias está sempre populado).
  const materiasFiltradas = useMemo(() => {
    const materias = concursoAtivo?.materias as MateriaConcurso[] | undefined;
    if (!materias) return undefined;
    return filtrarTopicosExcluidos(materias, state.topicosExcluidos);
  }, [concursoAtivo?.materias, state.topicosExcluidos]);

  // minutos que faltam pra fechar o bloco de estudo de HOJE de cada matéria (trilha dinâmica) —
  // o leitor de PDF usa isso pra avisar "meta do dia concluída" no meio da sessão
  const metaMinutosRestantes = (() => {
    const t = state.trilhaDinamica;
    if (!t?.ativa) return undefined;
    const meta = computarMetaDia({
      trilha: t, configCiclo: state.configCiclo, materiasAtivas: materiasFiltradas ?? MATERIAS,
      topicos: state.topicos, calendario: state.calendario,
    });
    const rec: Record<string, number> = {};
    for (const b of meta.blocos) rec[b.materia] = Math.max(0, b.minutosAlvo - b.minutosFeitos);
    return rec;
  })();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 md:px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-muted p-1.5 flex items-center justify-center overflow-hidden">
              {concursoAtivo?.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={concursoAtivo.foto} alt={concursoAtivo.nome} className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/icons/sefazce.png" alt="concurso" className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg" />
              )}
            </div>
            <div className="min-w-0">
              {primeiroNome && (
                <p className="text-sm text-muted-foreground">Oi, {primeiroNome}</p>
              )}
              <h1 className="text-lg font-bold text-foreground truncate">
                {concursoAtivo?.nome ?? "Estudo SEFAZ-CE 2026"}
              </h1>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {concursoAtivo?.orgao ?? "Acompanhe sua preparação para o concurso"}
                </p>
                <Link href="/dashboard/estudo/concursos" className="text-xs text-primary hover:text-primary flex items-center gap-0.5 flex-shrink-0">
                  <RefreshCw className="h-3 w-3" /> Trocar
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <StatTile
              icone={nivelConfig.icone}
              valor={`Nível ${nivel}`}
              label={`${nivelConfig.titulo} · ${xp} XP`}
              className="min-w-[168px]"
            />
            <StatTile
              icone={Flame}
              valor={calcularStreakDias(state.calendario)}
              label="dias seguidos"
              tone="warning"
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-5 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timer flutuante */}
      <TimerEstudo onSalvar={handleTimerSalvar} materiasConcurso={materiasFiltradas} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          {activeTab === "dashboard" && (
            <DashboardTab
              state={state}
              materiasConcurso={materiasFiltradas}
              onIrParaTrilha={() => setActiveTab("trilha")}
            />
          )}

          {/* Edital recebe a lista COMPLETA (com tópicos excluídos inclusos) — é a única aba
              onde dá pra ver e reativar o que foi ocultado */}
          {activeTab === "edital" && (
            <EditalTab
              topicos={state.topicos}
              onUpdate={updateTopicos}
              materiasConcurso={concursoAtivo?.materias as MateriaConcurso[] | undefined}
              pdfs={state.pdfs}
              topicosExcluidos={state.topicosExcluidos}
              onToggleTopicoExcluido={toggleTopicoExcluido}
              onDeleteTopico={concursoAtivo ? deleteTopico : undefined}
            />
          )}

          {activeTab === "biblioteca" && (
            <BibliotecaTab
              pdfs={state.pdfs}
              calendario={state.calendario}
              onChange={updatePdfs}
              materiasConcurso={materiasFiltradas}
              // cronômetro do leitor: a sessão de leitura vira atividade de Estudo no calendário
              // da matéria/tópico do PDF (mesmo fluxo do TimerEstudo — alimenta streak e pág/h)
              onRegistrarSessao={(minutos, materia, topico, paginas, descricao) =>
                handleTimerSalvar(minutos, "estudo", descricao, undefined, materia, topico, paginas)
              }
              onAdicionarCartas={adicionarCartas}
              metaMinutosRestantes={metaMinutosRestantes}
            />
          )}

          {activeTab === "ciclo" && (
            <CicloTab
              config={state.configCiclo}
              onChange={updateConfigCiclo}
              materiasConcurso={materiasFiltradas}
            />
          )}

          {activeTab === "trilha" && (
            <TrilhaTab
              trilha={state.trilhaDinamica}
              topicos={state.topicos}
              configCiclo={state.configCiclo}
              calendario={state.calendario}
              materiasConcurso={materiasFiltradas}
              onUpdateTrilha={updateTrilhaDinamica}
              onUpdateTopicos={updateTopicos}
              onIrParaCiclo={() => setActiveTab("ciclo")}
              onIrParaBiblioteca={() => setActiveTab("biblioteca")}
              onIrParaCartas={() => setActiveTab("cartas")}
            />
          )}

          {activeTab === "calendario" && (
            <CalendarioTab
              calendario={state.calendario}
              onUpdate={updateCalendario}
              onSemanasOKChange={handleSemanasOKChange}
              streak={state.streak}
              semanasOK={state.semanasOK}
              materiasConcurso={materiasFiltradas}
            />
          )}

          {activeTab === "relatorios" && (
            <RelatoriosTab state={state} materiasConcurso={materiasFiltradas} dataProva={concursoAtivo?.dataProva} />
          )}

          {activeTab === "cartas" && (
            <CartasTab cartas={state.cartas} onChange={updateCartas} materiasConcurso={materiasFiltradas} />
          )}

          {activeTab === "resumos" && (
            <ResumosTab materiasConcurso={materiasFiltradas} />
          )}

          {activeTab === "comparar" && <CompararEditaisTab />}
        </div>
      </div>
    </div>
  );
}
