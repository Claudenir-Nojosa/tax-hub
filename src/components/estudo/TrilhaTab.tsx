"use client";

import { useEffect, useMemo } from "react";
import {
  BookOpen, CalendarClock, Check, Clock, Compass, ExternalLink, Flame, Layers, ListChecks,
  Route, Settings2, Sparkles, Target, Trash2, Trophy, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MATERIAS, calcularStreakDias, dateKeyLocal, diasSemAtividade, topicoKey,
  type AtividadeCalendario, type EstudoConfigCiclo, type Grupo, type MateriaConcurso,
  type MateriaDef, type PdfEstudo, type TopicoState, type TrilhaDinamicaState,
} from "@/lib/estudo-data";
import {
  analisarHistoricoSemanas, computarMetaSemana, criarTrilhaDinamica, diffDias,
  estimativaConclusaoTrilha, type EstimativaConclusao, type MetaSemana, type QuestaoLiberada,
  type ReforcoGrupo, type ReforcoImediatoPendente, type RevisaoLinkPendente, type SemanaHistorico,
} from "@/lib/trilha-dinamica";
import { fmtHoras, gerarMensagemGustavo } from "./trilha/trilha-ui";
import {
  CardMateria, CorpoBloco, CorpoCartas, CorpoQuestoes, CorpoReforcos, CorpoReforcosImediatos,
  CorpoRevisao30, CorpoRevisoesLink, type AberturaPdfSolicitada,
} from "./trilha/TrilhaLinhas";
import ProgressRing from "./ui/ProgressRing";
import EstudoHero from "./ui/EstudoHero";
import SectionCard from "./ui/SectionCard";

// Trilha DINÂMICA — nada de plano pré-gerado: a meta da SEMANA é derivada na hora do estado real
// (tópicos estudados, cadernos A-D, sessões do calendário) pelas regras do método do usuário
// (src/lib/trilha-dinamica.ts). Este componente só apresenta a meta e grava o bookkeeping mínimo
// (datas de conclusão de matéria, revisões feitas) — cada semana é recalculada do zero, sem
// dívida acumulada entre semanas (decisão do usuário).
//
// Visual: hero da semana + bolha do Gustavo (consultor de estudos) + seções por TIPO de
// atividade (Conteúdo / Questões / Reforço rápido / Revisão), cada uma em seu próprio card —
// mais fácil de escanear que uma lista única intercalada. A primeira seção com algo pendente
// (na mesma ordem de prioridade usada pela fala do Gustavo) ganha um destaque "Comece aqui".

interface Props {
  trilha?: TrilhaDinamicaState;
  topicos: Record<string, TopicoState>;
  configCiclo: EstudoConfigCiclo;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
  materiasConcurso?: MateriaConcurso[];
  nomeUsuario?: string;
  onUpdateTrilha: (trilha: TrilhaDinamicaState | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onIrParaCiclo?: () => void;
  onIrParaBiblioteca?: (abertura?: AberturaPdfSolicitada) => void;
  onIrParaCartas?: () => void;
}

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fmtDataLonga(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// card de estimativa de conclusão de TODA a trilha (não só a semana) — sem dado suficiente em
// algum dos dois eixos (leitura, questões), mostra "ainda calculando" em vez de um número inventado
function CardEstimativa({ estimativa }: { estimativa: EstimativaConclusao }) {
  const aindaCalculando = estimativa.semanasRestantes === null || estimativa.dataPrevista === null;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-bold text-foreground dark:text-foreground">Estimativa de conclusão da trilha</span>
      </div>
      {aindaCalculando ? (
        <p className="text-xs text-muted-foreground">
          Ainda calculando — registre mais páginas lidas (Timer/leitor de PDF) e tarefas de questões concluídas pra essa previsão aparecer.
        </p>
      ) : (
        <>
          <p className="text-sm text-foreground">
            No ritmo atual, previsão de concluir toda a trilha em{" "}
            <strong>{fmtDataLonga(estimativa.dataPrevista!)}</strong> (~{Math.max(1, Math.ceil(estimativa.semanasRestantes!))} semana{Math.max(1, Math.ceil(estimativa.semanasRestantes!)) !== 1 ? "s" : ""}).
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{estimativa.paginasRestantes} pág{estimativa.paginasRestantes !== 1 ? "s" : ""}. de teoria restantes · {fmtHoras(Math.round(estimativa.horasLeituraRestante! * 60))} de leitura</span>
            <span>{estimativa.tarefasQuestoesRestantes} tarefa{estimativa.tarefasQuestoesRestantes !== 1 ? "s" : ""} de questões restantes · {fmtHoras(Math.round(estimativa.horasQuestoesRestante! * 60))}</span>
          </div>
        </>
      )}
    </div>
  );
}

// bolha de fala do Gustavo — mesmo padrão visual da que já existe no Dashboard, aqui ancorada no
// topo da própria Trilha; texto vem de gerarMensagemGustavo (fonte única, mesma fala nos 2 lugares)
function GustavoBubble({
  meta, nomeUsuario, streakDias, diasInativo, historico,
}: {
  meta: MetaSemana;
  nomeUsuario?: string;
  streakDias: number;
  diasInativo: number;
  historico: SemanaHistorico[];
}) {
  const { titulo, corpo } = gerarMensagemGustavo(meta, { nomeUsuario, streakDias, diasSemAtividade: diasInativo, historico });
  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
        <Compass className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="text-sm font-bold text-foreground dark:text-foreground">{titulo}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{corpo}</div>
      </div>
    </div>
  );
}

// pill "Comece aqui" — marca a primeira seção (na ordem de prioridade) que tem algo pendente
function BadgeComeceAqui() {
  return (
    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
      Comece aqui
    </span>
  );
}

const anelDestaque = "ring-2 ring-emerald-400 dark:ring-emerald-500";

export default function TrilhaTab({
  trilha, topicos, configCiclo, calendario, pdfs, materiasConcurso, nomeUsuario,
  onUpdateTrilha, onUpdateTopicos, onIrParaCiclo, onIrParaBiblioteca, onIrParaCartas,
}: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const hoje = dateKeyLocal();

  const temMateriasNoCiclo = materiasAtivas.some((m) => configCiclo.materias[m.nome]?.incluir);
  const streakDias = calcularStreakDias(calendario);

  const meta: MetaSemana | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return computarMetaSemana({ hoje, trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs });
  }, [trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, hoje]);

  // estimativa sobre a trilha INTEIRA (não só a semana) — independente de `meta`, calculada
  // sempre que a trilha está ativa, pra alimentar o card no fim da página
  const estimativa: EstimativaConclusao | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return estimativaConclusaoTrilha({ hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs });
  }, [trilha, hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs]);

  // registra a DATA de conclusão de matérias recém-100% (agenda a revisão de 30 questões pra
  // DIAS_REVISAO_MATERIA dias depois) — sem carry-over de semana: cada MetaSemana é recalculada
  // do zero a cada render, não existe mais "avançar o ciclo" pra persistir (decisão do usuário:
  // se uma matéria não bate a meta de horas numa semana, a semana seguinte só reparte de novo).
  useEffect(() => {
    if (!trilha?.ativa || !meta) return;
    const novas = meta.analises.filter((a) => a.materiaConcluida && !trilha.conclusaoMaterias[a.materia]);
    if (novas.length === 0) return;
    const conclusaoMaterias = { ...trilha.conclusaoMaterias };
    for (const a of novas) conclusaoMaterias[a.materia] = hoje;
    onUpdateTrilha({ ...trilha, conclusaoMaterias });
  }, [trilha, meta, hoje, onUpdateTrilha]);

  if (!trilha?.ativa || !meta) {
    return (
      <Intro
        temMateriasNoCiclo={temMateriasNoCiclo}
        onAtivar={() => onUpdateTrilha(criarTrilhaDinamica())}
        onIrParaCiclo={onIrParaCiclo}
      />
    );
  }

  // caminho único de escrita de caderno (questão liberada OU reforço) — carimba atualizadoEm,
  // que é o que alimenta o cooldown de reforço (ver analisarReforcos em trilha-dinamica.ts)
  const registrarCaderno = (materia: string, topico: string, grupo: Grupo, acertos: number, erros: number) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: { ...estado, cadernos: { ...estado.cadernos, [grupo]: { acertos, erros, atualizadoEm: dateKeyLocal() } } },
    });
  };
  const registrarQuestoes = (q: QuestaoLiberada, acertos: number, erros: number) =>
    registrarCaderno(q.materia, q.topico, q.grupo, acertos, erros);
  const registrarReforco = (r: ReforcoGrupo, acertos: number, erros: number) =>
    registrarCaderno(r.materia, r.topico, r.grupo, acertos, erros);

  // registro da revisão das questões do link (1ª vez ou correção de reforço) — grava em
  // revisoesLink[checkpoint], não em cadernos (é um resultado do tópico inteiro, não de um grupo
  // A-D); os checkpoints de 7 e 30 dias são independentes, cada um com seu próprio registro
  const registrarRevisaoLink = (r: RevisaoLinkPendente, acertos: number, erros: number) => {
    const key = topicoKey(r.materia, r.topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: {
        ...estado,
        revisoesLink: { ...estado.revisoesLink, [r.checkpoint]: { acertos, erros, atualizadoEm: dateKeyLocal() } },
      },
    });
  };

  // registro do reforço rápido (link curto pós-estudo) — grava reforcoImediatoFeito, o que faz o
  // tópico sumir de analisarReforcosImediatos (é "faça uma vez", sem cooldown/reaparecimento)
  const registrarReforcoImediato = (r: ReforcoImediatoPendente, acertos: number, erros: number) => {
    const key = topicoKey(r.materia, r.topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({
      ...topicos,
      [key]: { ...estado, reforcoImediatoFeito: { acertos, erros, atualizadoEm: dateKeyLocal() } },
    });
  };

  // marca o tópico atual de um bloco como estudado direto da Trilha, sem precisar trocar pra
  // aba Edital — só avança (não desmarca); corrigir um engano continua sendo ação do Edital
  const marcarTopicoEstudado = (materia: string, topico: string) => {
    const key = topicoKey(materia, topico);
    const estado = topicos[key];
    if (!estado) return;
    onUpdateTopicos({ ...topicos, [key]: { ...estado, estudado: true } });
  };

  const marcarRevisao30 = (materia: string) => {
    onUpdateTrilha({
      ...trilha,
      revisoes30Feitas: {
        ...trilha.revisoes30Feitas,
        [materia]: [...(trilha.revisoes30Feitas[materia] ?? []), hoje],
      },
    });
  };

  const marcarCartasFeitas = () => {
    onUpdateTrilha({ ...trilha, cartasFeitasEm: [...trilha.cartasFeitasEm, hoje] });
  };

  const desativar = () => {
    if (!confirm("Desativar a trilha dinâmica? O progresso do edital e dos cadernos não é perdido — só o acompanhamento diário some.")) return;
    onUpdateTrilha(undefined);
  };

  const historico = analisarHistoricoSemanas({ hoje, trilha, configCiclo, calendario });
  // capado nos dias desde a ativação — sem isso, uma trilha recém-ativada sem nenhum histórico de
  // calendário mostraria "90 dias sem atividade" (teto do diasSemAtividade), como se o usuário
  // tivesse abandonado algo que nem começou
  const diasInativo = Math.min(diasSemAtividade(calendario), Math.max(0, diffDias(trilha.iniciadaEm, hoje)));

  const blocosFeitos = meta.blocos.filter((b) => b.concluido).length;
  const percBlocos = meta.blocos.length > 0 ? Math.round((blocosFeitos / meta.blocos.length) * 100) : 0;
  const materiasEmRevisao = meta.analises.filter(
    (a) => a.materiaConcluida && (trilha.revisoes30Feitas[a.materia] ?? []).length > 0
  );
  const pendencias = meta.questoesPendentes.length + meta.reforcos.length + meta.reforcosImediatos.length
    + meta.revisoesLink.length + meta.revisoes30.length + (meta.revisarCartas ? 1 : 0);

  const temSecaoConteudo = meta.blocos.length > 0;
  const temSecaoQuestoes = meta.reforcos.length > 0 || meta.questoesPendentes.length > 0;
  const temSecaoReforcoImediato = meta.reforcosImediatos.length > 0;
  const temSecaoRevisao = meta.revisoesLink.length > 0 || meta.revisoes30.length > 0 || meta.revisarCartas;
  const semNadaPendente = !temSecaoConteudo && !temSecaoQuestoes && !temSecaoReforcoImediato && !temSecaoRevisao;

  // primeira seção com algo pendente, na mesma ordem de prioridade da fala do Gustavo
  // (estudo > reforço/questões > reforço rápido > revisão) — só ela ganha o destaque visual
  const primeiraSecao: "conteudo" | "questoes" | "reforcoImediato" | "revisao" | null = (() => {
    if (meta.blocos.some((b) => !b.concluido)) return "conteudo";
    if (meta.reforcos.length > 0 || meta.questoesPendentes.length > 0) return "questoes";
    if (meta.reforcosImediatos.length > 0) return "reforcoImediato";
    if (meta.revisoesLink.length > 0 || meta.revisoes30.length > 0 || meta.revisarCartas) return "revisao";
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* bolha do Gustavo */}
      <GustavoBubble meta={meta} nomeUsuario={nomeUsuario} streakDias={streakDias} diasInativo={diasInativo} historico={historico} />

      {/* hero da semana */}
      <EstudoHero
        acaoCanto={
          <button
            type="button"
            onClick={desativar}
            title="Desativar trilha"
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/15 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      >
        <div className="flex items-center gap-4 sm:gap-5">
          <ProgressRing perc={meta.blocos.length > 0 ? percBlocos : 0} size={80} espessura={7}>
            <div className="text-center leading-none">
              <div className="text-lg font-bold">{meta.blocos.length > 0 ? `${percBlocos}%` : "—"}</div>
              <div className="text-[9px] text-emerald-100 uppercase tracking-wide mt-0.5">semana</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold mb-0.5">
              Semana de {fmtDataCurta(meta.inicioSemana)} a {fmtDataCurta(meta.fimSemana)}
            </div>
            <div className="text-lg sm:text-xl font-bold leading-snug">
              {meta.blocosConcluidos
                ? "Meta da semana entregue! 🎉"
                : meta.blocos.length > 0
                  ? `${blocosFeitos}/${meta.blocos.length} blocos da semana`
                  : "Semana livre de blocos"}
            </div>
            <div className="text-xs text-emerald-100 mt-1">
              {meta.minutosSemana > 0 ? `${fmtHoras(meta.minutosSemana)} de estudo essa semana` : "Sem horas configuradas pra essa semana"}
              {pendencias > 0 && ` · ${pendencias} pendência${pendencias !== 1 ? "s" : ""} no checklist`}
            </div>
          </div>
          {streakDias > 0 && (
            <div className="hidden sm:flex flex-col items-center flex-shrink-0 pl-4 border-l border-white/20">
              <div className="flex items-center gap-1 text-2xl font-bold">
                <Flame className="h-6 w-6 text-orange-300" />
                {streakDias}
              </div>
              <div className="text-[10px] text-emerald-100 uppercase tracking-wide">
                dia{streakDias !== 1 ? "s" : ""} seguidos
              </div>
            </div>
          )}
        </div>
        {!meta.revisarCartas && (
          <div className="mt-3 text-[11px] text-emerald-100/90 flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3 flex-shrink-0" />
            Próxima revisão das cartas: domingo {fmtDataCurta(meta.proximoDomingoCartas)}
          </div>
        )}
      </EstudoHero>

      {/* seções por tipo de atividade */}
      {semNadaPendente ? (
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-sm font-semibold text-foreground">Tudo em dia por aqui! 🎉</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Nada pendente no checklist agora — volte mais tarde ou aproveite pra descansar.
            </div>
          </div>
        </div>
      ) : (
        <>
          {temSecaoConteudo && (
            <SectionCard
              titulo="Conteúdo"
              icone={BookOpen}
              corIcone="bg-primary"
              className={primeiraSecao === "conteudo" ? anelDestaque : undefined}
              acao={primeiraSecao === "conteudo" ? <BadgeComeceAqui /> : undefined}
            >
              <div className="space-y-3">
                {meta.blocos.map((b) => (
                  <CorpoBloco
                    key={b.materia}
                    b={b}
                    materiasAtivas={materiasAtivas}
                    onIrParaBiblioteca={onIrParaBiblioteca}
                    onMarcarEstudado={() => marcarTopicoEstudado(b.materia, b.topico)}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {temSecaoQuestoes && (
            <SectionCard
              titulo="Questões"
              icone={ListChecks}
              corIcone="bg-teal-500"
              className={primeiraSecao === "questoes" ? anelDestaque : undefined}
              acao={primeiraSecao === "questoes" ? <BadgeComeceAqui /> : undefined}
            >
              <div className="space-y-4">
                {meta.reforcos.length > 0 && (
                  <CorpoReforcos reforcos={meta.reforcos} materiasAtivas={materiasAtivas} onRegistrar={registrarReforco} />
                )}
                {meta.questoesPendentes.length > 0 && (
                  <CorpoQuestoes questoes={meta.questoesPendentes} materiasAtivas={materiasAtivas} onRegistrar={registrarQuestoes} />
                )}
              </div>
            </SectionCard>
          )}

          {temSecaoReforcoImediato && (
            <SectionCard
              titulo="Reforço rápido"
              icone={Zap}
              corIcone="bg-orange-500"
              className={primeiraSecao === "reforcoImediato" ? anelDestaque : undefined}
              acao={primeiraSecao === "reforcoImediato" ? <BadgeComeceAqui /> : undefined}
            >
              <CorpoReforcosImediatos reforcos={meta.reforcosImediatos} materiasAtivas={materiasAtivas} onRegistrar={registrarReforcoImediato} />
            </SectionCard>
          )}

          {temSecaoRevisao && (
            <SectionCard
              titulo="Revisão"
              icone={Trophy}
              corIcone="bg-amber-500"
              className={primeiraSecao === "revisao" ? anelDestaque : undefined}
              acao={primeiraSecao === "revisao" ? <BadgeComeceAqui /> : undefined}
            >
              <div className="space-y-4">
                {meta.revisoesLink.length > 0 && (
                  <CorpoRevisoesLink revisoes={meta.revisoesLink} materiasAtivas={materiasAtivas} onRegistrar={registrarRevisaoLink} />
                )}
                {meta.revisoes30.map((r) => (
                  <CorpoRevisao30 key={r.materia} r={r} onMarcar={() => marcarRevisao30(r.materia)} />
                ))}
                {meta.revisarCartas && (
                  <CorpoCartas onIrParaCartas={onIrParaCartas} onMarcar={marcarCartasFeitas} />
                )}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* progresso por matéria */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-bold text-foreground dark:text-foreground">Progresso rumo aos 100%</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {meta.analises.map((a) => (
            <CardMateria key={a.materia} a={a} materiasAtivas={materiasAtivas} emRevisao={materiasEmRevisao.some((m) => m.materia === a.materia)} />
          ))}
        </div>
      </div>

      {estimativa && <CardEstimativa estimativa={estimativa} />}
    </div>
  );
}

// ─── Tela de ativação ─────────────────────────────────────────────────────────

function Intro({
  temMateriasNoCiclo, onAtivar, onIrParaCiclo,
}: {
  temMateriasNoCiclo: boolean;
  onAtivar: () => void;
  onIrParaCiclo?: () => void;
}) {
  const regras: { icone: LucideIcon; cor: string; texto: string }[] = [
    { icone: Clock, cor: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary", texto: "A semana cobre todas as matérias ativas de uma vez. As horas semanais (Ciclo de Estudos) são divididas proporcionalmente ao peso de cada matéria com teoria pendente, no tópico atual de cada uma. O tempo é monitorado pelo leitor de PDF." },
    { icone: ListChecks, cor: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400", texto: "Concluir um tópico libera questões dos anteriores: grupo A do último, B do penúltimo, C do antepenúltimo, D do anterior a esse — até fechar os 4 grupos de todos os tópicos." },
    { icone: Zap, cor: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400", texto: "Reforço rápido: cadastre um link de questões curto (até 10) pra um tópico e ele aparece assim que você marca esse tópico como estudado — prática ativa, sem esperar o escalonamento A-D." },
    { icone: ExternalLink, cor: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400", texto: "Cadastrado o link de questões do tópico (aba Questões), 7 e 30 dias após concluir os 4 grupos A-D a trilha pede pra refazer essas questões em cada checkpoint — abaixo de 70% volta como reforço." },
    { icone: Trophy, cor: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400", texto: "Matéria 100% (teoria + todos os grupos) entra em modo revisão: 3 dias depois, 30 questões englobando todos os tópicos dela, pelo link cadastrado na aba Questões." },
    { icone: Layers, cor: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400", texto: "A cada 2 domingos, revisão das cartas." },
    { icone: Sparkles, cor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400", texto: "Sem dívida acumulada: cada semana é recalculada do zero com base no peso configurado — se você não bate a meta de uma semana, a semana seguinte só reparte de novo, sem carregar o que faltou." },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <EstudoHero className="p-6 sm:p-7">
        <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
          <Route className="h-6 w-6" />
        </div>
        <div className="text-xl font-bold mb-1">Trilha dinâmica</div>
        <p className="text-sm text-emerald-100">
          Sua meta semanal calculada automaticamente do seu progresso real — sem plano fixo, ela se adapta ao que você entrega.
        </p>
      </EstudoHero>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border dark:divide-border">
        {regras.map((r, i) => (
          <div key={i} className="px-4 py-3.5 flex gap-3 items-start">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.cor}`}>
              <r.icone className="h-4 w-4" />
            </div>
            <p className="text-xs text-foreground pt-1.5">{r.texto}</p>
          </div>
        ))}
      </div>
      {!temMateriasNoCiclo && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="flex-1">Nenhuma matéria incluída no Ciclo de Estudos — configure o ciclo primeiro (peso e horas por dia).</span>
          {onIrParaCiclo && (
            <button type="button" onClick={onIrParaCiclo} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium whitespace-nowrap">Ir pro Ciclo</button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onAtivar}
        disabled={!temMateriasNoCiclo}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="h-4 w-4" /> Ativar trilha dinâmica
      </button>
    </div>
  );
}
