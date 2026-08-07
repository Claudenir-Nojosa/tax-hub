import { useEffect, useState } from "react";
import {
  CORES_MATERIA, COR_MATERIA_PADRAO,
  type MateriaBase, type MateriaConcurso, type MateriaDef,
} from "@/lib/estudo-data";
import type { MetaSemana, SemanaHistorico } from "@/lib/trilha-dinamica";
import type { FilaAtividadeTipo, MetaAtual } from "@/lib/trilha-fila";

// Helpers de apresentação compartilhados entre as abas do Estudo (Trilha, Biblioteca etc.).
// STATUS_CONFIG/TIPO_CONFIG/fmtData da trilha antiga foram removidos junto com ela.

export function fmtHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// Resolve a cor de uma matéria tanto pra MateriaDef (hardcoded — corDot/corBadge já embutidos)
// quanto pra MateriaConcurso (customizado — só tem `cor: string`, uma chave que precisa passar
// pelo mapa estático CORES_MATERIA). O bug do corMateria() anterior era sempre cair no cinza
// pra concursos customizados, porque ele buscava só na lista MATERIAS hardcoded.
export function resolverCorMateria(
  nome: string,
  materiasAtivas: (MateriaDef | MateriaConcurso | MateriaBase)[]
): { dot: string; badge: string; border: string } {
  const m = materiasAtivas.find((x) => x.nome === nome);
  if (!m) return COR_MATERIA_PADRAO;
  if ("corBadge" in m && "corDot" in m && "corBorder" in m) {
    return { dot: m.corDot, badge: m.corBadge, border: m.corBorder };
  }
  if ("cor" in m) return CORES_MATERIA[m.cor] ?? COR_MATERIA_PADRAO;
  return COR_MATERIA_PADRAO;
}

// Tipo de cada item que pode aparecer no checklist da Trilha — usado tanto pra colorir o ícone
// (TrilhaTab) quanto pra gerar a mensagem "estilo Duolingo" do Dashboard (mesma classificação,
// dois lugares diferentes na tela).
export type TipoPasso = "estudo" | "reforco" | "questoes" | "reforcoImediato" | "linkQuestoes" | "revisao" | "cartas";

export const TIPO_ITEM_COR: Record<TipoPasso, string> = {
  estudo: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  reforco: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  questoes: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
  reforcoImediato: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
  linkQuestoes: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  revisao: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  cartas: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400",
};

export interface ProximaAtividade {
  tipo: TipoPasso;
  ehNova: boolean; // true = "sua atividade de hoje é" (ainda nem começou); false = "vi que você ainda não fez" (ficou parado no checklist)
  titulo: string;
  subtitulo: string;
  // só preenchido pro tipo "estudo" — quanto já foi feito nesta atividade e, quando o PDF tem
  // capítulos mapeados, em qual capítulo está — pra Gustavo falar em números/progresso reais em
  // vez de tratar como "vamos começar" algo que já está quase pronto (ex.: 2h21 de 3h, capítulo
  // 12 de 12 já lido até a penúltima página)
  progressoMin?: { feitos: number; alvo: number };
  capituloLabel?: string;
}

// Escolhe UM item pra virar a mensagem "estilo Duolingo" do Dashboard — a mesma prioridade que já
// rege a ordem visual do checklist da Trilha (bloco de estudo > reforço > questões > reforço
// rápido > revisão do link > revisão de matéria > cartas). Não recalcula nada: só lê a MetaSemana
// que a Trilha já produz.
export function proximaAtividade(meta: MetaSemana): ProximaAtividade | null {
  const bloco = meta.blocos.find((b) => !b.concluido);
  if (bloco) {
    return {
      tipo: "estudo",
      ehNova: bloco.minutosFeitosSemana === 0,
      titulo: bloco.materia,
      subtitulo: `tópico atual: ${bloco.topico}`,
      progressoMin: { feitos: bloco.minutosFeitosSemana, alvo: bloco.minutosAlvoSemana },
      capituloLabel: bloco.capituloLabel,
    };
  }
  if (meta.reforcos.length > 0) {
    const r = meta.reforcos[0];
    return { tipo: "reforco", ehNova: false, titulo: `Reforço de ${r.materia}`, subtitulo: `tópico ${r.ordemTopico} — desempenho de ${r.perc}%` };
  }
  if (meta.questoesPendentes.length > 0) {
    const q = meta.questoesPendentes[0];
    return { tipo: "questoes", ehNova: false, titulo: `Questões de ${q.materia}`, subtitulo: `tópico ${q.ordemTopico}: ${q.topico}` };
  }
  if (meta.reforcosImediatos.length > 0) {
    const r = meta.reforcosImediatos[0];
    return { tipo: "reforcoImediato", ehNova: false, titulo: `Reforço rápido de ${r.materia}`, subtitulo: `tópico ${r.ordemTopico}: ${r.topico}` };
  }
  if (meta.revisoesLink.length > 0) {
    const r = meta.revisoesLink[0];
    return { tipo: "linkQuestoes", ehNova: false, titulo: `Revisão de ${r.materia}`, subtitulo: `questões de ${r.dias} dias atrás — tópico ${r.ordemTopico}` };
  }
  if (meta.revisoes30.length > 0) {
    const r = meta.revisoes30[0];
    return { tipo: "revisao", ehNova: false, titulo: `Revisão geral de ${r.materia}`, subtitulo: "30 questões englobando todos os tópicos" };
  }
  if (meta.revisarCartas) {
    return { tipo: "cartas", ehNova: false, titulo: "Revisar as cartas", subtitulo: "revisão dos 2 domingos" };
  }
  return null;
}

// mesma ideia de proximaAtividade acima, mas lendo da Meta atual (trilha-fila.ts) em vez da
// MetaSemana — usada quando `metaAtual` está disponível (ver gerarMensagemGustavo/
// montarResumoSemanaIA) pra Gustavo falar da MESMA "próxima atividade" que a tabela da aba Trilha
// mostra no topo, eliminando a narrativa dupla (Dashboard citava pendências recalculadas da
// semana; a Trilha já falava em "Meta N"). Atividade da fila é sempre concluída/não-concluída (sem
// noção de "em andamento" com minutos parciais), por isso sempre `ehNova: true` — não existe o
// caso "vi que você ainda não fez" nem progresso parcial nesse modelo.
const TIPO_FILA_PARA_PASSO: Record<FilaAtividadeTipo, TipoPasso> = {
  teoria: "estudo",
  questoes: "questoes",
  reforco: "reforco",
  reforco_imediato: "reforcoImediato",
  revisao_link: "linkQuestoes",
  revisao_link_faltando: "linkQuestoes",
  revisao_materia: "revisao",
  cartas: "cartas",
};

export function proximaAtividadeFila(metaAtual: MetaAtual): ProximaAtividade | null {
  const a = metaAtual.atividades.find((x) => !x.concluida);
  if (!a) return null;
  return {
    tipo: TIPO_FILA_PARA_PASSO[a.tipo],
    ehNova: true,
    titulo: a.materia,
    subtitulo: a.tipo === "teoria" ? `tópico atual: ${a.titulo}` : a.titulo,
  };
}

// qual PNG do Gandalf (/public/{humor}.png) ilustra a bolha — decidido junto com o texto em
// gerarMensagemGustavo, pela mesma prioridade de cenário (nunca escolhido à parte, senão a cara
// do Gandalf poderia dessincronizar do que ele está dizendo). Mapeamento: dormindo = inatividade
// (2+ dias parado), raiva = atrasado na meta desta semana, triste = tendência fraca em várias
// semanas seguidas, feliz = tudo em dia, lendo = fluxo normal de estudo (o caso mais comum).
export type HumorGustavo = "feliz" | "dormindo" | "triste" | "raiva" | "lendo";

export interface MensagemGustavo {
  titulo: string;
  corpo: string;
  humor: HumorGustavo;
}

// nº de semanas passadas usadas pra decidir "tendência fraca" (recalibrar a meta) — precisa de
// pelo menos 2 pra não soar alarme com uma amostra de 1 semana ruim (pode ter sido pontual: viagem,
// prova, imprevisto)
const JANELA_TENDENCIA = 3;
const LIMIAR_TENDENCIA_FRACA_PERC = 50;

// Gustavo é o "consultor de estudos" da Trilha — a mesma mensagem (gerada aqui uma vez só) aparece
// tanto na bolha do Dashboard quanto no topo da aba Trilha, pra nunca dessincronizar o que ele diz
// nos dois lugares. Cumprimenta pelo primeiro nome quando disponível (session.user.name), sem
// quebrar o texto quando ausente.
//
// Prioridade das mensagens (a primeira condição verdadeira "ganha"):
// 1. Inatividade (2+ dias sem nenhuma atividade) — o sinal mais urgente de acompanhamento.
// 2. Atraso NESTA semana (`meta.atrasado`, calculado em computarMetaSemana) — Gustavo recalcula o
//    ritmo necessário pros dias que restam pra ainda fechar a meta (sem mexer em nada salvo).
// 3. Tendência fraca em várias semanas seguidas — sugestão de recalibrar as horas no Ciclo (é só
//    sugestão: o usuário aprova, nada muda sozinho).
// 4. Fluxo normal (próxima atividade pendente), com uma nota comparativa opcional quando a semana
//    passada teve um resultado bem diferente do que está dando essa semana. Quando `metaAtual` é
//    passada (Meta da fila, trilha-fila.ts), a "próxima atividade" vem dela em vez da MetaSemana —
//    é a mesma que aparece no topo da tabela da aba Trilha, eliminando a narrativa dupla. Os sinais
//    de atraso/tendência acima continuam sempre vindo da MetaSemana (são sobre RITMO
//    semanal/calendário, não sobre qual atividade fazer agora — não fazem parte dessa
//    inconsistência). `metaAtual` null é o fallback (ex.: bootstrap da Meta 1 ainda não rodou).
export function gerarMensagemGustavo(
  meta: MetaSemana,
  metaAtual: MetaAtual | null,
  opts: { nomeUsuario?: string; streakDias: number; diasSemAtividade?: number; historico?: SemanaHistorico[] }
): MensagemGustavo {
  const { nomeUsuario, streakDias, diasSemAtividade = 0, historico = [] } = opts;
  const saudacao = nomeUsuario ? `Olá, ${nomeUsuario}! ` : "";

  if (diasSemAtividade >= 2) {
    return {
      titulo: `${saudacao}Cadê você? 👀`,
      corpo: `Já fazem ${diasSemAtividade} dias sem nenhuma atividade registrada. Bora retomar hoje?`,
      humor: "dormindo",
    };
  }

  if (meta.atrasado && meta.ritmoNecessarioMinDia !== null) {
    return {
      titulo: `${saudacao}Você está atrasado na meta desta semana`,
      corpo: `Só ${meta.percCumpridoSemana}% feito até agora — nos dias que restam, dá uns ${fmtHoras(meta.ritmoNecessarioMinDia)}/dia pra recuperar.`,
      humor: "raiva",
    };
  }

  const ultimasSemanas = historico.slice(0, JANELA_TENDENCIA);
  const tendenciaFraca = ultimasSemanas.length >= 2 && ultimasSemanas.every((s) => s.percCumprido < LIMIAR_TENDENCIA_FRACA_PERC);
  if (tendenciaFraca) {
    const media = Math.round(ultimasSemanas.reduce((s, w) => s + w.percCumprido, 0) / ultimasSemanas.length);
    return {
      titulo: `${saudacao}Vamos ajustar o ritmo?`,
      corpo: `Nas últimas ${ultimasSemanas.length} semanas você fechou em média ${media}% da meta — talvez valha reduzir as horas semanais no Ciclo pra ficar mais sustentável.`,
      humor: "triste",
    };
  }

  // nota comparativa opcional (só quando a diferença é notável — evita ruído toda vez) pro fluxo
  // normal abaixo, que já tem seu próprio corpo de mensagem
  const notaComparativa = (() => {
    const anterior = historico[0]?.percCumprido;
    if (anterior === undefined || Math.abs(meta.percCumpridoSemana - anterior) < 20) return "";
    return ` (semana passada: ${anterior}%)`;
  })();

  const proxima = metaAtual ? proximaAtividadeFila(metaAtual) : proximaAtividade(meta);
  if (!proxima) {
    return {
      titulo: `${saudacao}Tudo em dia por aqui! 🎉`,
      corpo: (streakDias > 0
        ? `Você já está há ${streakDias} dia${streakDias !== 1 ? "s" : ""} sem parar — continue assim pra manter a sequência.`
        : "Nada pendente no checklist desta semana.") + notaComparativa,
      humor: "feliz",
    };
  }
  if (proxima.ehNova) {
    return {
      titulo: `${saudacao}Sua atividade desta semana é:`,
      corpo: `${proxima.titulo} — ${proxima.subtitulo}${notaComparativa}`,
      humor: "lendo",
    };
  }
  // estudo já em andamento (não é "vamos começar" — já tem minutos/capítulos feitos nesta
  // atividade) — fala em progresso real (feitos/alvo + em qual capítulo está) em vez da mesma
  // frase de "atividade nova" usada pra quem ainda não tocou em nada
  if (proxima.tipo === "estudo" && proxima.progressoMin) {
    const { feitos, alvo } = proxima.progressoMin;
    const onde = proxima.capituloLabel ?? proxima.subtitulo;
    return {
      titulo: `${saudacao}Continue em ${proxima.titulo}`,
      corpo: `Já fez ${fmtHoras(feitos)} de ${fmtHoras(alvo)} nesta atividade — ${onde}${notaComparativa}`,
      humor: "lendo",
    };
  }
  return {
    titulo: `${saudacao}Vi que você ainda não fez:`,
    corpo: `${proxima.titulo} · ${proxima.subtitulo}${notaComparativa}`,
    humor: "lendo",
  };
}

// resumo ESTRUTURADO e 100% factual da semana — é isso que vai pra IA analisar de verdade (não
// mais só reescrever uma frase pronta). Cada matéria carrega progresso real (minutos feitos/alvo,
// tópico e capítulo atuais, se já concluiu a semana ou ainda está bloqueada na fila), mais os
// agregados que já regem a prioridade das mensagens determinísticas (atraso, tendência, pendências
// de questão/reforço/revisão/cartas). A IA pode escolher livremente O QUE destacar, mas todo
// número/nome que ela citar tem que vir exatamente daqui — ver prompt em /api/ai/gustavo-mensagem.
export interface ResumoSemanaIA {
  nomeUsuario?: string;
  streakDias: number;
  diasSemAtividade: number;
  percCumpridoSemanaTotal: number;
  atrasado: boolean;
  ritmoNecessarioMinDia: number | null;
  semanaPassadaPerc?: number;
  materias: {
    nome: string;
    topicoAtual: string;
    capituloAtual?: string;
    minutosFeitos: number;
    minutosAlvoSemana: number;
    percConcluidoSemana: number;
    concluido: boolean;
    bloqueado: boolean;
  }[];
  reforcosPendentes: number;
  questoesPendentes: number;
  reforcosImediatosPendentes: number;
  revisoesLinkPendentes: number;
  revisoes30Pendentes: number;
  revisarCartasHoje: boolean;
}

// quando `metaAtual` está disponível, materias[]/pendências vêm dela (mesmos números que a tabela
// da aba Trilha mostra) — só atrasado/ritmoNecessarioMinDia/percCumpridoSemanaTotal continuam da
// MetaSemana (sinais de ritmo, ver comentário em gerarMensagemGustavo). `metaAtual` null usa o
// fallback antigo (bootstrap ainda não rodou).
export function montarResumoSemanaIA(
  meta: MetaSemana,
  metaAtual: MetaAtual | null,
  opts: { nomeUsuario?: string; streakDias: number; diasSemAtividade?: number; historico?: SemanaHistorico[] }
): ResumoSemanaIA {
  const pendentesPorTipo = (tipo: FilaAtividadeTipo) =>
    metaAtual ? metaAtual.atividades.filter((a) => a.tipo === tipo && !a.concluida).length : 0;

  const materias = metaAtual
    ? Array.from(new Set(metaAtual.atividades.map((a) => a.materia))).map((nome) => {
        const doMateria = metaAtual.atividades.filter((a) => a.materia === nome);
        const feitas = doMateria.filter((a) => a.concluida).length;
        const proximaTeoria = doMateria.find((a) => a.tipo === "teoria" && !a.concluida);
        return {
          nome,
          topicoAtual: proximaTeoria?.topico ?? doMateria[0]?.topico ?? doMateria[0]?.titulo ?? "",
          capituloAtual: undefined,
          minutosFeitos: doMateria.filter((a) => a.concluida).reduce((s, a) => s + a.minutosEstimados, 0),
          minutosAlvoSemana: doMateria.reduce((s, a) => s + a.minutosEstimados, 0),
          percConcluidoSemana: doMateria.length > 0 ? Math.round((feitas / doMateria.length) * 100) : 0,
          concluido: feitas === doMateria.length,
          bloqueado: false,
        };
      })
    : meta.blocos.map((b) => ({
        nome: b.materia,
        topicoAtual: b.topico,
        capituloAtual: b.capituloLabel,
        minutosFeitos: b.minutosFeitosSemana,
        minutosAlvoSemana: b.minutosAlvoSemana,
        percConcluidoSemana: b.minutosAlvoSemana > 0 ? Math.round((b.minutosFeitosSemana / b.minutosAlvoSemana) * 100) : 0,
        concluido: b.concluido,
        bloqueado: b.bloqueado,
      }));

  return {
    nomeUsuario: opts.nomeUsuario,
    streakDias: opts.streakDias,
    diasSemAtividade: opts.diasSemAtividade ?? 0,
    percCumpridoSemanaTotal: meta.percCumpridoSemana,
    atrasado: meta.atrasado,
    ritmoNecessarioMinDia: meta.ritmoNecessarioMinDia,
    semanaPassadaPerc: opts.historico?.[0]?.percCumprido,
    materias,
    reforcosPendentes: metaAtual ? pendentesPorTipo("reforco") : meta.reforcos.length,
    questoesPendentes: metaAtual ? pendentesPorTipo("questoes") : meta.questoesPendentes.length,
    reforcosImediatosPendentes: metaAtual ? pendentesPorTipo("reforco_imediato") : meta.reforcosImediatos.length,
    revisoesLinkPendentes: metaAtual
      ? pendentesPorTipo("revisao_link") + pendentesPorTipo("revisao_link_faltando")
      : meta.revisoesLink.length,
    revisoes30Pendentes: metaAtual ? pendentesPorTipo("revisao_materia") : meta.revisoes30.length,
    revisarCartasHoje: metaAtual ? pendentesPorTipo("cartas") > 0 : meta.revisarCartas,
  };
}

// cache em memória (nível de módulo) — evita rechamar a IA pra re-analisar a MESMA semana quando
// o usuário troca de aba (Dashboard <-> Trilha, mesmo resumo nos dois) ou o componente remonta;
// limpa sozinho ao recarregar a página, é só uma economia de chamadas. Só guarda titulo/corpo — o
// `humor` NUNCA passa pela IA, vem sempre direto do `base` atual (ver useMensagemGustavoIA).
const cacheMensagemGustavoIA = new Map<string, { titulo: string; corpo: string }>();

// placeholder mostrado enquanto a análise da IA ainda não chegou — NÃO é a mensagem determinística
// (pedido explícito do usuário: a versão de gerarMensagemGustavo estava aparecendo por uns
// segundos e depois trocando pela da IA, um "flash" perceptível; agora só aparece texto quando é
// a versão final, de um jeito ou de outro)
const CARREGANDO: { titulo: string; corpo: string } = { titulo: "·····", corpo: "·····" };

// pega a mensagem DETERMINÍSTICA de gerarMensagemGustavo (calculada na hora, sem depender de
// rede) só como FALLBACK — mostrada se a chamada da IA falhar, nunca enquanto ela ainda está em
// andamento (nesse meio tempo mostra CARREGANDO, sem "flash" de um texto sendo trocado pelo
// outro). Manda um resumo ESTRUTURADO da semana pra /api/ai/gustavo-mensagem analisar de verdade
// e escrever titulo+corpo do zero, grounded nesses fatos (nunca inventa número/nome que não
// esteja no resumo — ver prompt da rota). `humor` (qual PNG mostrar) não passa pela IA, é sempre
// o de `base`, fresco a cada render, pra nunca dessincronizar da cara do personagem com o que ele
// está de fato dizendo agora.
export function useMensagemGustavoIA(
  base: MensagemGustavo,
  meta: MetaSemana | null,
  metaAtual: MetaAtual | null,
  opts: { nomeUsuario?: string; streakDias: number; diasSemAtividade?: number; historico?: SemanaHistorico[] }
): MensagemGustavo {
  const resumo = meta ? montarResumoSemanaIA(meta, metaAtual, opts) : null;
  const chave = resumo ? JSON.stringify(resumo) : `${base.titulo}|||${base.corpo}`;
  const [texto, setTexto] = useState<{ titulo: string; corpo: string }>(
    () => cacheMensagemGustavoIA.get(chave) ?? CARREGANDO
  );

  useEffect(() => {
    if (!resumo) {
      setTexto({ titulo: base.titulo, corpo: base.corpo });
      return;
    }
    const cacheada = cacheMensagemGustavoIA.get(chave);
    if (cacheada) {
      setTexto(cacheada);
      return;
    }
    setTexto(CARREGANDO);
    let cancelado = false;
    fetch("/api/ai/gustavo-mensagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumo }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ titulo?: string; corpo?: string }>) : null))
      .then((data) => {
        if (cancelado) return;
        if (!data?.titulo || !data?.corpo) {
          // IA falhou (ou respondeu vazio) — só agora cai pra determinística, nunca antes disso
          setTexto({ titulo: base.titulo, corpo: base.corpo });
          return;
        }
        const reescrita = { titulo: data.titulo, corpo: data.corpo };
        cacheMensagemGustavoIA.set(chave, reescrita);
        setTexto(reescrita);
      })
      .catch(() => {
        if (!cancelado) setTexto({ titulo: base.titulo, corpo: base.corpo });
      });
    return () => {
      cancelado = true;
    };
    // `chave` já resume todo o conteúdo de `resumo`/`base` (objetos novos a cada render) — usar
    // eles direto nas deps faria o efeito rodar de novo a cada render, mesmo com o MESMO conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { titulo: texto.titulo, corpo: texto.corpo, humor: base.humor };
}
