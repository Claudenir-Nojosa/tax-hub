"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarClock, Clock, ExternalLink, Layers, ListChecks,
  Route, Settings2, Sparkles, Target, Trash2, Trophy, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MATERIAS, calcularStreakDias, dateKeyLocal, diasSemAtividade,
  type AtividadeCalendario, type Bloco, type Carta, type EstudoConfigCiclo, type MateriaConcurso,
  type MateriaDef, type PdfEstudo, type TopicoState, type TrilhaDinamicaState,
} from "@/lib/estudo-data";
import {
  analisarHistoricoSemanas, computarMetaSemana, criarTrilhaDinamica, diffDias,
  estimativaConclusaoTrilha, type EstimativaConclusao, type MetaSemana, type SemanaHistorico,
} from "@/lib/trilha-dinamica";
import {
  computarMetaAtual, finalizarMetaManualmente, type FilaAtividade, type MetaAtual,
} from "@/lib/trilha-fila";
import { fmtHoras, gerarMensagemGustavo, useMensagemGustavoIA } from "./trilha/trilha-ui";
import {
  CardMateria, type AberturaPdfSolicitada,
} from "./trilha/TrilhaLinhas";
import MetaAtualCard from "./trilha/MetaAtualCard";
import TabelaAtividades from "./trilha/TabelaAtividades";
import ProximaMetaCard from "./trilha/ProximaMetaCard";
import DialogRevisaoReforco from "./trilha/DialogRevisaoReforco";
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
  blocos: Record<string, Bloco>;
  onUpdateBlocos: (blocos: Record<string, Bloco>) => void;
  capitulosConcluidos: string[];
  onToggleCapitulo: (pdfId: string, paginaInicio: number) => void;
  onUpdateTrilha: (trilha: TrilhaDinamicaState | undefined) => void;
  onUpdateTopicos: (topicos: Record<string, TopicoState>) => void;
  onIrParaCiclo?: () => void;
  onIrParaBiblioteca?: (abertura?: AberturaPdfSolicitada) => void;
  onIrParaCartas?: () => void;
  onAdicionarCartas?: (cartas: Carta[]) => void;
}

function fmtDataLonga(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// card de estimativa de conclusão de TODA a trilha (não só a semana) — SEMPRE calcula um número,
// mesmo no dia 1 sem nenhum dado real: usa os padrões honestos do motor (30 pág/hora de leitura,
// 20min por tarefa de questões — ver PAG_POR_HORA_PADRAO/MINUTOS_ESTIMADO_QUESTAO_PADRAO em
// trilha-dinamica.ts) até o usuário ter sessões/tarefas reais suficientes, e troca sozinho pro
// ritmo real assim que existir (sem re-render manual — o próprio `estimativa` já vem recalculado).
// Só fica sem previsão nenhuma se o Ciclo não tiver NENHUMA hora configurada (não é falta de uso,
// é falta de config — mensagem e CTA diferentes da versão antiga "ainda calculando").
function CardEstimativa({ estimativa, onIrParaCiclo }: { estimativa: EstimativaConclusao; onIrParaCiclo?: () => void }) {
  const semCicloConfigurado = estimativa.semanasRestantes === null || estimativa.dataPrevista === null;
  const usaAlgumPadrao = estimativa.leituraUsaPadrao || estimativa.questoesUsaPadrao;
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-bold text-foreground dark:text-foreground">Estimativa de conclusão da trilha</span>
      </div>
      {semCicloConfigurado ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex-1">Configure horas por dia no Ciclo de Estudos pra essa previsão aparecer.</span>
          {onIrParaCiclo && (
            <button type="button" onClick={onIrParaCiclo} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium whitespace-nowrap">Ir pro Ciclo</button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground">
            No ritmo atual, previsão de concluir toda a trilha em{" "}
            <strong>{fmtDataLonga(estimativa.dataPrevista!)}</strong> — ~{estimativa.metasRestantes} meta{estimativa.metasRestantes !== 1 ? "s" : ""} restante{estimativa.metasRestantes !== 1 ? "s" : ""}, cada uma com orçamento de ~{fmtHoras(estimativa.minutosPorMeta!)}.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{estimativa.paginasRestantes} pág{estimativa.paginasRestantes !== 1 ? "s" : ""}. de teoria restantes · {fmtHoras(Math.round(estimativa.horasLeituraRestante * 60))} de leitura</span>
            <span>{estimativa.tarefasQuestoesRestantes} tarefa{estimativa.tarefasQuestoesRestantes !== 1 ? "s" : ""} de questões restantes · {fmtHoras(Math.round(estimativa.horasQuestoesRestante * 60))}</span>
          </div>
          {usaAlgumPadrao && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">
              {estimativa.leituraUsaPadrao && estimativa.questoesUsaPadrao
                ? "Baseado em médias padrão (30 pág/hora de leitura, 20min por tarefa de questões) — passa a usar seu ritmo real assim que você registrar páginas lidas e concluir tarefas de questões."
                : estimativa.leituraUsaPadrao
                  ? "Leitura baseada numa média padrão (30 pág/hora) — passa a usar seu ritmo real assim que você registrar páginas lidas (Timer/leitor de PDF)."
                  : "Questões baseadas numa média padrão (20min por tarefa) — passa a usar sua média real assim que você concluir alguma tarefa de questões."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// bolha de fala do Gustavo — mesmo padrão visual da que já existe no Dashboard, aqui ancorada no
// topo da própria Trilha; texto vem de gerarMensagemGustavo (fonte única, mesma fala nos 2 lugares)
function GustavoBubble({
  meta, metaAtual, nomeUsuario, streakDias, diasInativo, historico,
}: {
  meta: MetaSemana;
  metaAtual: MetaAtual | null;
  nomeUsuario?: string;
  streakDias: number;
  diasInativo: number;
  historico: SemanaHistorico[];
}) {
  const opts = { nomeUsuario, streakDias, diasSemAtividade: diasInativo, historico };
  const mensagemBase = gerarMensagemGustavo(meta, metaAtual, opts);
  const { titulo, corpo, humor } = useMensagemGustavoIA(mensagemBase, meta, metaAtual, opts);
  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
      <Image src={`/${humor}.png`} alt="Gandalf" width={112} height={112} className="flex-shrink-0 object-contain" />
      <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="text-sm font-bold text-foreground dark:text-foreground">{titulo}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{corpo}</div>
      </div>
    </div>
  );
}

export default function TrilhaTab({
  trilha, topicos, configCiclo, calendario, pdfs, materiasConcurso, nomeUsuario,
  blocos, onUpdateBlocos, capitulosConcluidos, onToggleCapitulo,
  onUpdateTrilha, onUpdateTopicos, onIrParaCiclo, onIrParaBiblioteca, onIrParaCartas,
  onAdicionarCartas,
}: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const hoje = dateKeyLocal();

  const temMateriasNoCiclo = materiasAtivas.some((m) => configCiclo.materias[m.nome]?.incluir);
  const streakDias = calcularStreakDias(calendario);

  const meta: MetaSemana | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return computarMetaSemana({ hoje, trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, blocos, capitulosConcluidos });
  }, [trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, hoje, blocos, capitulosConcluidos]);

  // estimativa sobre a trilha INTEIRA (não só a semana) — independente de `meta`, calculada
  // sempre que a trilha está ativa, pra alimentar o card no fim da página
  const estimativa: EstimativaConclusao | null = useMemo(() => {
    if (!trilha?.ativa) return null;
    return estimativaConclusaoTrilha({ hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos });
  }, [trilha, hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos]);

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

  // Fila de Metas (trilha-fila.ts) — camada nova em cima do motor semanal acima, que continua
  // intacto (Gustavo, estimativa e o card "Progresso rumo aos 100%" seguem lendo `meta`/
  // `estimativa` sem mudança). Bootstrap/promoção automática de Meta agora rodam em nível
  // compartilhado (page.tsx), não só aqui — assim o Dashboard também enxerga `computarMetaAtual`
  // mesmo sem o usuário nunca ter aberto esta aba. Aqui só CALCULA (puro) pra exibir.
  const metaAtualResult = useMemo(() => {
    if (!trilha?.ativa) return undefined;
    return computarMetaAtual({ hoje, trilha, configCiclo, topicos, calendario, blocos, pdfs, capitulosConcluidos });
  }, [trilha, hoje, configCiclo, topicos, calendario, blocos, pdfs, capitulosConcluidos]);

  const [finalizandoMeta, setFinalizandoMeta] = useState(false);
  // reforço (por tópico ou geral da matéria) clicado — abre o diálogo de revisão antes de ir pras
  // questões (ver DialogRevisaoReforco), pedido do usuário
  const [atividadeRevisao, setAtividadeRevisao] = useState<FilaAtividade | null>(null);

  if (!trilha?.ativa || !meta) {
    return (
      <Intro
        temMateriasNoCiclo={temMateriasNoCiclo}
        onAtivar={() => onUpdateTrilha(criarTrilhaDinamica())}
        onIrParaCiclo={onIrParaCiclo}
      />
    );
  }

  const desativar = () => {
    if (!confirm("Desativar a trilha dinâmica? O progresso do edital e dos cadernos não é perdido — só o acompanhamento diário some.")) return;
    onUpdateTrilha(undefined);
  };

  // botão "Finalize ou ignore as atividades da meta atual" — fecha a Meta aberta mesmo com
  // pendências (elas viram carry-over automático na próxima, nunca são deletadas)
  const finalizarMeta = () => {
    setFinalizandoMeta(true);
    try {
      const novaTrilha = finalizarMetaManualmente({
        hoje, trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, blocos, capitulosConcluidos,
      });
      onUpdateTrilha(novaTrilha);
    } finally {
      setFinalizandoMeta(false);
    }
  };

  const abrirPdfDoTopico = (materia: string, topico: string) => {
    const pdf = pdfs.find((p) => p.materia === materia && p.topicos?.includes(topico));
    onIrParaBiblioteca?.(pdf ? { pdfId: pdf.id } : undefined);
  };

  // clique numa linha da tabela de atividades — cada tipo tem um destino diferente: link externo
  // (questões/revisão), o PDF certo (teoria) ou a aba Cartas
  const abrirAtividade = (a: FilaAtividade) => {
    // reforço (por tópico ou geral da matéria) sempre passa pelo diálogo de revisão primeiro —
    // mesmo quando tem link cadastrado, "Ir pras questões" dentro do diálogo decide o destino
    if (a.tipo === "reforco" || a.tipo === "reforco_materia") {
      setAtividadeRevisao(a);
      return;
    }
    if (a.link) {
      window.open(a.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.tipo === "teoria" && a.topico) {
      // atividade fatiada (a.pdfId/paginaInicio/paginaFim, ver gerarChunksTeoria em trilha-fila.ts)
      // abre já no trecho DESTE pedaço, não no início do tópico inteiro
      if (a.pdfId) {
        onIrParaBiblioteca?.({ pdfId: a.pdfId, paginaInicio: a.paginaInicio, paginaFim: a.paginaFim });
        return;
      }
      abrirPdfDoTopico(a.materia, a.topico);
      return;
    }
    if (a.tipo === "cartas") {
      onIrParaCartas?.();
      return;
    }
    // questões (grupos A-D, reforço rápido) sem link externo cadastrado — abre o PDF do próprio
    // tópico, que é de onde se responde as questões escalonadas (ver PainelQuestoes.tsx, aberto de
    // dentro do leitor). Pedido do usuário: clicar já leva pro PDF certo, sem precisar procurar na
    // Biblioteca.
    if ((a.tipo === "questoes" || a.tipo === "reforco_imediato") && a.topico) {
      abrirPdfDoTopico(a.materia, a.topico);
    }
  };

  // "Ir pras questões" dentro do diálogo de revisão de reforço — mesmo destino que o clique direto
  // teria (link cadastrado, senão o PDF do tópico)
  const irParaQuestoesDaRevisao = () => {
    const a = atividadeRevisao;
    setAtividadeRevisao(null);
    if (!a) return;
    if (a.link) {
      window.open(a.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (a.topico) abrirPdfDoTopico(a.materia, a.topico);
  };

  const historico = analisarHistoricoSemanas({ hoje, trilha, configCiclo, calendario });
  // capado nos dias desde a ativação — sem isso, uma trilha recém-ativada sem nenhum histórico de
  // calendário mostraria "90 dias sem atividade" (teto do diasSemAtividade), como se o usuário
  // tivesse abandonado algo que nem começou
  const diasInativo = Math.min(diasSemAtividade(calendario), Math.max(0, diffDias(trilha.iniciadaEm, hoje)));

  const materiasEmRevisao = meta.analises.filter(
    (a) => a.materiaConcluida && (trilha.revisoes30Feitas[a.materia] ?? []).length > 0
  );

  return (
    <div className="space-y-4">
      {/* bolha do Gustavo */}
      <GustavoBubble
        meta={meta}
        metaAtual={metaAtualResult?.metaAtual ?? null}
        nomeUsuario={nomeUsuario}
        streakDias={streakDias}
        diasInativo={diasInativo}
        historico={historico}
      />

      {/* Meta atual + próxima meta (fila de atividades, trilha-fila.ts) — substitui o hero semanal
          antigo e as 4 seções por tipo. `meta`/`estimativa` (motor semanal de sempre) continuam
          alimentando o Gustavo e o card "Progresso rumo aos 100%" logo abaixo, sem mudança. */}
      {!metaAtualResult ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
          Preparando sua trilha…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            <MetaAtualCard
              meta={metaAtualResult.metaAtual}
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
            />
            <SectionCard titulo="Atividades da meta" icone={ListChecks} corIcone="bg-primary">
              <TabelaAtividades
                atividades={metaAtualResult.metaAtual.atividades}
                materiasAtivas={materiasAtivas}
                onAbrirLink={abrirAtividade}
                onAbrirCapitulo={(pdfId, paginaInicio, paginaFim) => onIrParaBiblioteca?.({ pdfId, paginaInicio, paginaFim })}
                onToggleCapitulo={onToggleCapitulo}
              />
            </SectionCard>
          </div>
          <ProximaMetaCard
            proximaMeta={metaAtualResult.proximaMeta}
            onFinalizarOuIgnorar={finalizarMeta}
            finalizando={finalizandoMeta}
          />
        </div>
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

      {estimativa && <CardEstimativa estimativa={estimativa} onIrParaCiclo={onIrParaCiclo} />}

      {atividadeRevisao && (
        <DialogRevisaoReforco
          atividade={atividadeRevisao}
          pdfs={pdfs}
          onFechar={() => setAtividadeRevisao(null)}
          onIrParaQuestoes={irParaQuestoesDaRevisao}
          onAdicionarCartas={(cartas) => onAdicionarCartas?.(cartas)}
        />
      )}
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
    { icone: Clock, cor: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary", texto: "As matérias ativas são divididas em 3 grupos (A/B/C, configurável no Ciclo), que decidem a ORDEM de uma cadeia com TODAS as atividades da semana: primeiro as do grupo A, depois B, depois C. Só a primeira atividade fica desbloqueada — concluir libera a próxima, mesmo que seja de outro grupo e no mesmo dia, se você tiver tempo/vontade. Cada trecho é do tamanho de um dia (dividido proporcionalmente ao peso entre as matérias do mesmo grupo). A meta da semana de cada matéria continua sendo a fração do total semanal entre todas as matérias ativas. O tempo é monitorado pelo leitor de PDF." },
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
