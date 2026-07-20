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
  type ErroEntry,
  type EstudoConfigCiclo,
  type AtividadeTipo,
  type Grupo,
  type Carta,
  type TrilhaDinamicaState,
  type PdfEstudo,
  type MapaMental,
  MATERIAS,
} from "@/lib/estudo-data";
import { computarMetaDia } from "@/lib/trilha-dinamica";
import { LayoutDashboard, BookOpen, RotateCcw, CalendarDays, NotebookPen, Flame, BarChart2, Layers, RefreshCw, GitCompare, FileText, Route, GraduationCap, Library, Brain } from "lucide-react";
import type { ConcursoData, MateriaBase, MateriaConcurso } from "@/lib/estudo-data";
import Link from "next/link";

const DashboardTab = dynamic(() => import("@/components/estudo/DashboardTab"), { ssr: false });
const EditalTab = dynamic(() => import("@/components/estudo/EditalTab"), { ssr: false });
const CicloTab = dynamic(() => import("@/components/estudo/CicloTab"), { ssr: false });
const CalendarioTab = dynamic(() => import("@/components/estudo/CalendarioTab"), { ssr: false });
const CadernoErrosTab = dynamic(() => import("@/components/estudo/CadernoErrosTab"), { ssr: false });
const RelatoriosTab = dynamic(() => import("@/components/estudo/RelatoriosTab"), { ssr: false });
const CartasTab = dynamic(() => import("@/components/estudo/CartasTab"), { ssr: false });
const ResumosTab = dynamic(() => import("@/components/estudo/ResumosTab"), { ssr: false });
const TrilhaTab = dynamic(() => import("@/components/estudo/TrilhaTab"), { ssr: false });
// ssr:false é essencial aqui: o componente usa WebRTC/getUserMedia (APIs só de browser)
const ProfessoraTab = dynamic(() => import("@/components/estudo/ProfessoraTab"), { ssr: false });
const BibliotecaTab = dynamic(() => import("@/components/estudo/BibliotecaTab"), { ssr: false });
const MapasMentaisTab = dynamic(() => import("@/components/estudo/MapasMentaisTab"), { ssr: false });
const TimerEstudo = dynamic(() => import("@/components/estudo/TimerEstudo"), { ssr: false });
const CompararEditaisTab = dynamic(() => import("@/components/estudo/CompararEditaisTab"), { ssr: false });

const storageKey = (concursoId: string | null) =>
  concursoId ? `taxhub_estudo_c_${concursoId}` : "taxhub_estudo_v1";

type Tab = "dashboard" | "edital" | "biblioteca" | "mapas" | "ciclo" | "trilha" | "calendario" | "caderno" | "relatorios" | "cartas" | "resumos" | "professora" | "comparar";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "edital", label: "Edital", icon: BookOpen },
  { id: "biblioteca", label: "Biblioteca", icon: Library },
  { id: "mapas", label: "Mapas Mentais", icon: Brain },
  { id: "ciclo", label: "Ciclo de Estudos", icon: RotateCcw },
  { id: "trilha", label: "Trilha", icon: Route },
  { id: "calendario", label: "Calendário", icon: CalendarDays },
  { id: "caderno", label: "Caderno de Erros", icon: NotebookPen },
  { id: "relatorios", label: "Relatórios", icon: BarChart2 },
  { id: "cartas", label: "Cartas", icon: Layers },
  { id: "resumos", label: "Resumos", icon: FileText },
  { id: "professora", label: "Professora", icon: GraduationCap },
  { id: "comparar", label: "Comparar Editais", icon: GitCompare },
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
    mapasMentais: parsed.mapasMentais ?? [],
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

  const updateCadernoErros = useCallback((cadernoErros: ErroEntry[]) => {
    setState((prev) => ({ ...prev, cadernoErros }));
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

  const updateMapasMentais = useCallback((mapasMentais: MapaMental[]) => {
    setState((prev) => ({ ...prev, mapasMentais }));
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
        <div className="text-gray-400 dark:text-gray-500 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              {concursoAtivo?.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={concursoAtivo.foto} alt={concursoAtivo.nome} className="max-w-[40px] max-h-[40px] w-auto h-auto object-contain rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/icons/sefazce.png" alt="concurso" className="max-w-[40px] max-h-[40px] w-auto h-auto object-contain rounded-lg" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {concursoAtivo?.nome ?? "Estudo SEFAZ-CE 2026"}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {concursoAtivo?.orgao ?? "Acompanhe sua preparação para o concurso"}
                </p>
                <Link href="/dashboard/estudo/concursos" className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-0.5">
                  <RefreshCw className="h-3 w-3" /> Trocar
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5">
              <nivelConfig.icone className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Nível {nivel} · {nivelConfig.titulo}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{xp} XP</div>
              </div>
            </div>
            <div className="text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-center gap-1 text-lg font-bold text-amber-600 dark:text-amber-400"><Flame className="h-5 w-5 text-orange-500" />{calcularStreakDias(state.calendario)}</div>
              <div className="text-xs text-amber-500 dark:text-amber-400">dias</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 mt-4 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
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
      <TimerEstudo onSalvar={handleTimerSalvar} />

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

          {activeTab === "mapas" && (
            <MapasMentaisTab
              mapas={state.mapasMentais}
              onChange={updateMapasMentais}
              materiasConcurso={materiasFiltradas}
            />
          )}

          {activeTab === "ciclo" && (
            <CicloTab
              config={state.configCiclo}
              onChange={updateConfigCiclo}
              materiasConcurso={materiasFiltradas}
            />
          )}

          {activeTab === "professora" && (
            <ProfessoraTab
              topicos={state.topicos}
              materiasConcurso={materiasFiltradas}
              concursoNome={concursoAtivo?.nome}
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
            />
          )}

          {activeTab === "caderno" && (
            <CadernoErrosTab
              erros={state.cadernoErros}
              topicos={state.topicos}
              onUpdate={updateCadernoErros}
            />
          )}

          {activeTab === "relatorios" && (
            <RelatoriosTab state={state} materiasConcurso={materiasFiltradas} />
          )}

          {activeTab === "cartas" && (
            <CartasTab cartas={state.cartas} onChange={updateCartas} cadernoErros={state.cadernoErros} />
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
