import {
  dateKeyLocal, topicoKey, calcularPerc,
  type AtividadeCalendario, type EstudoConfigCiclo, type Grupo,
  type TopicoState, type TrilhaDinamicaState,
} from "./estudo-data";

// forma mínima de matéria que o motor precisa — MateriaDef, MateriaConcurso e MateriaBase são
// todas estruturalmente compatíveis
export type MateriaLike = { nome: string; topicos: string[] };

// Motor da TRILHA DINÂMICA — funções puras que derivam a meta do dia do estado real (nada de
// plano pré-gerado). As regras são o método pessoal do usuário, à risca:
//
// 1. ESTUDO: o dia pertence a um grupo do ciclo (A/B/C). As horas do dia (Ciclo de Estudos)
//    são divididas igualmente entre as matérias daquele grupo que ainda têm teoria pendente —
//    ex.: 3h e 3 matérias = 1h cada, no TÓPICO ATUAL (primeiro não estudado) de cada uma. O
//    progresso vem do calendário de hoje (sessões de estudo por matéria — leitor de PDF/Timer).
// 2. QUESTÕES ESCALONADAS: cada tópico tem 4 grupos de questões (A-D, os cadernos do Edital).
//    Concluir o tópico i+1 LIBERA o grupo A do tópico i; concluir i+2 libera o B do i; i+3 o C;
//    i+4 o D. Quando a teoria da matéria termina, os grupos restantes (a "cauda") ficam todos
//    liberados. Grupo "feito" = caderno com acertos+erros > 0.
// 3. MATÉRIA 100% = teoria toda + 4 grupos de todos os tópicos feitos → no DIA SEGUINTE entra a
//    atividade "revisão da matéria: 30 questões englobando todos os tópicos" (modo revisão).
// 4. CARTAS: a cada 2 domingos (14 dias), atividade de revisar as cartas.
// 5. MUTÁVEL: o grupo do ciclo só avança quando os blocos de estudo do dia foram entregues; a
//    meta de amanhã depende do que foi feito hoje.
// 6. TEMPO PONDERADO: o tempo do dia é dividido PROPORCIONALMENTE ao peso (1 ou 2) configurado
//    por matéria no Ciclo — não mais sempre igual (distribuirMinutosPorPeso).
// 7. REFORÇO: um grupo "feito" com acerto abaixo de LIMIAR_REFORCO_PERC volta a aparecer na
//    trilha (seção separada de "questões liberadas") depois de REFORCO_COOLDOWN_DIAS sem
//    atualização — 0% e 100% deixam de ser tratados igual.
// 8. REVISÃO DO LINK: cada tópico tem UM link de questões (aba Questões, ex.: TecConcursos —
//    substituiu os 4 links por grupo). Quando os 4 grupos A-D do tópico ficam feitos, a revisão
//    das questões do link entra na trilha DIAS_REVISAO_LINK dias depois. Registrado o resultado,
//    abaixo de LIMIAR_REFORCO_PERC volta como reforço depois de REFORCO_COOLDOWN_DIAS (mesmas
//    regras do reforço A-D).

export const GRUPOS_QUESTOES: Grupo[] = ["A", "B", "C", "D"];
const GRUPOS_CICLO = ["A", "B", "C"] as const;
export type GrupoCiclo = (typeof GRUPOS_CICLO)[number];

// limiar de acerto abaixo do qual um grupo "feito" é considerado fraco e pode ressurgir como
// reforço — mesmo corte que o Edital já usa pra colorir o % de acerto (PercBadge), consistente
// com o que o usuário já enxerga hoje
export const LIMIAR_REFORCO_PERC = 70;
// dias de carência antes do MESMO grupo fraco ressurgir de novo — qualquer novo registro de
// acertos/erros nesse grupo (Edital ou Trilha) reinicia a contagem via TopicoCaderno.atualizadoEm
export const REFORCO_COOLDOWN_DIAS = 3;
// dias de espera após concluir os 4 grupos A-D de um tópico até a revisão das questões do link
// (aba Questões, ex.: TecConcursos) aparecer na trilha
export const DIAS_REVISAO_LINK = 7;

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;

// ─── Análise por matéria (tudo derivado de topicos/cadernos) ────────────────

export interface QuestaoLiberada {
  id: string; // estável: `q:${materia}:${topico}:${grupo}`
  materia: string;
  topico: string;
  ordemTopico: number; // 1-based no edital
  grupo: Grupo;
  motivo: string; // ex.: "liberada ao concluir o tópico 5"
}

export interface AnaliseMateria {
  materia: string;
  totalTopicos: number;
  topicosEstudados: number;
  topicoAtual: string | null; // primeiro não estudado; null = teoria concluída
  teoriaConcluida: boolean;
  questoesLiberadas: QuestaoLiberada[]; // liberadas E ainda não feitas, na ordem de liberação
  gruposFeitos: number; // total de grupos já feitos (progresso 0..totalTopicos*4)
  materiaConcluida: boolean; // teoria + todos os grupos
}

export function grupoFeito(estado: TopicoState | undefined, grupo: Grupo): boolean {
  const c = estado?.cadernos[grupo];
  return !!c && c.acertos + c.erros > 0;
}

export function analisarMateria(
  materia: MateriaLike,
  topicos: Record<string, TopicoState>
): AnaliseMateria {
  const nomes = materia.topicos;
  const estados = nomes.map((t) => topicos[topicoKey(materia.nome, t)]);
  const estudados = estados.map((e) => !!e?.estudado);
  const totalEstudados = estudados.filter(Boolean).length;
  const teoriaConcluida = totalEstudados === nomes.length && nomes.length > 0;
  const idxAtual = estudados.findIndex((e) => !e);

  const liberadas: QuestaoLiberada[] = [];
  let gruposFeitos = 0;
  let todosGruposFeitos = true;
  for (let i = 0; i < nomes.length; i++) {
    if (!estudados[i]) { todosGruposFeitos = false; continue; }
    for (let gi = 0; gi < GRUPOS_QUESTOES.length; gi++) {
      const grupo = GRUPOS_QUESTOES[gi];
      const feito = grupoFeito(estados[i], grupo);
      if (feito) { gruposFeitos++; continue; }
      todosGruposFeitos = false;
      // grupo gi (0-based; A=0..D=3) do tópico i libera quando o tópico i+gi+1 é estudado; se
      // esse tópico não existe (fim do edital), libera quando a teoria da matéria termina (cauda)
      const idxGatilho = i + gi + 1;
      const liberado = idxGatilho < nomes.length ? estudados[idxGatilho] : teoriaConcluida;
      if (liberado) {
        liberadas.push({
          id: `q:${materia.nome}:${nomes[i]}:${grupo}`,
          materia: materia.nome,
          topico: nomes[i],
          ordemTopico: i + 1,
          grupo,
          motivo: idxGatilho < nomes.length
            ? `liberada ao concluir o tópico ${idxGatilho + 1}`
            : "liberada ao concluir a teoria da matéria",
        });
      }
    }
  }
  // ordena pela "onda": grupos mais antigos primeiro (A do mais recente vem antes do D do antigo
  // na fala do usuário — "A do tópico 3, B do tópico 2, C do tópico 1" — ou seja, pela ordem
  // decrescente de tópico dentro da mesma onda; equivalente a ordenar por (ordemTopico + grupo))
  liberadas.sort((a, b) => {
    const ondaA = a.ordemTopico + GRUPOS_QUESTOES.indexOf(a.grupo);
    const ondaB = b.ordemTopico + GRUPOS_QUESTOES.indexOf(b.grupo);
    return ondaA - ondaB || b.ordemTopico - a.ordemTopico;
  });

  return {
    materia: materia.nome,
    totalTopicos: nomes.length,
    topicosEstudados: totalEstudados,
    topicoAtual: idxAtual === -1 ? null : nomes[idxAtual],
    teoriaConcluida,
    questoesLiberadas: liberadas,
    gruposFeitos,
    materiaConcluida: teoriaConcluida && todosGruposFeitos,
  };
}

export interface ReforcoGrupo {
  id: string; // estável: `r:${materia}:${topico}:${grupo}`
  materia: string;
  topico: string;
  ordemTopico: number; // 1-based no edital
  grupo: Grupo;
  acertos: number;
  erros: number;
  perc: number; // % de acerto atual (calcularPerc)
}

// grupos "feitos" (acertos+erros > 0) com desempenho fraco (< LIMIAR_REFORCO_PERC) que já
// esfriaram (sem atualizadoEm, ou atualizadoEm há REFORCO_COOLDOWN_DIAS ou mais) — candidatos a
// reaparecer na trilha como reforço. Grupos ainda não feitos ficam de fora (isso é "pendente",
// não "fraco" — já aparecem em questoesLiberadas via analisarMateria).
export function analisarReforcos(
  materia: MateriaLike,
  topicos: Record<string, TopicoState>,
  hoje: string
): ReforcoGrupo[] {
  const nomes = materia.topicos;
  const reforcos: ReforcoGrupo[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const estado = topicos[topicoKey(materia.nome, nomes[i])];
    if (!estado?.estudado) continue;
    for (const grupo of GRUPOS_QUESTOES) {
      const c = estado.cadernos[grupo];
      if (!c || c.acertos + c.erros === 0) continue; // não feito — pendente, não fraco
      const perc = calcularPerc(c.acertos, c.erros);
      if (perc >= LIMIAR_REFORCO_PERC) continue;
      if (c.atualizadoEm && diffDias(c.atualizadoEm, hoje) < REFORCO_COOLDOWN_DIAS) continue;
      reforcos.push({
        id: `r:${materia.nome}:${nomes[i]}:${grupo}`,
        materia: materia.nome,
        topico: nomes[i],
        ordemTopico: i + 1,
        grupo,
        acertos: c.acertos,
        erros: c.erros,
        perc,
      });
    }
  }
  return reforcos;
}

// ─── Revisão das questões do link (aba Questões) ────────────────────────────

export type StatusRevisaoLink =
  | { tipo: "sem_link" }
  | { tipo: "aguardando_grupos" } // link cadastrado, mas os 4 grupos A-D ainda não estão feitos
  | { tipo: "aguardando_prazo"; diasRestantes: number } // 4 grupos feitos, ainda dentro dos DIAS_REVISAO_LINK
  | { tipo: "disponivel" } // prazo passou, revisão ainda não registrada
  | { tipo: "feita"; perc: number; reforco: boolean }; // já registrada — reforco = abaixo do limiar

// status individual de um tópico — usado tanto pra decidir o que aparece na Trilha
// (analisarRevisoesLink) quanto pro badge informativo da aba Questões
export function statusRevisaoLink(estado: TopicoState | undefined, hoje: string): StatusRevisaoLink {
  if (!estado?.linkQuestoes) return { tipo: "sem_link" };
  const todosFeitos = GRUPOS_QUESTOES.every((g) => grupoFeito(estado, g));
  if (!todosFeitos) return { tipo: "aguardando_grupos" };

  // data de conclusão = a mais recente entre os atualizadoEm dos 4 grupos; se algum grupo feito
  // não tem atualizadoEm (registro antigo, de antes desse campo existir), considera já elegível
  // na hora — mesma filosofia do reforço A-D (ausência de data não bloqueia, libera de cara)
  const datas = GRUPOS_QUESTOES.map((g) => estado.cadernos[g].atualizadoEm).filter((d): d is string => !!d);
  const dataConclusao = datas.length === 4 ? datas.sort()[datas.length - 1] : "1970-01-01";
  const diasDesde = diffDias(dataConclusao, hoje);

  if (!estado.revisaoLink) {
    if (diasDesde < DIAS_REVISAO_LINK) return { tipo: "aguardando_prazo", diasRestantes: DIAS_REVISAO_LINK - diasDesde };
    return { tipo: "disponivel" };
  }
  const perc = calcularPerc(estado.revisaoLink.acertos, estado.revisaoLink.erros);
  return { tipo: "feita", perc, reforco: perc < LIMIAR_REFORCO_PERC };
}

export interface RevisaoLinkPendente {
  id: string; // estável: `rl:${materia}:${topico}`
  materia: string;
  topico: string;
  ordemTopico: number;
  link: string;
  reforco: boolean; // true = corrigindo um resultado fraco anterior, não a 1ª tentativa
  acertosAtual?: number; // pré-preenche o form quando é reforço
  errosAtual?: number;
}

// tópicos com revisão do link disponível (1ª vez) ou pedindo reforço (< LIMIAR_REFORCO_PERC e
// já esfriado, mesmo cooldown do reforço A-D) — igual a analisarReforcos, caminho separado que
// não interfere na liberação escalonada nem no cálculo de matéria concluída
export function analisarRevisoesLink(
  materia: MateriaLike,
  topicos: Record<string, TopicoState>,
  hoje: string
): RevisaoLinkPendente[] {
  const nomes = materia.topicos;
  const pendentes: RevisaoLinkPendente[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const estado = topicos[topicoKey(materia.nome, nomes[i])];
    const status = statusRevisaoLink(estado, hoje);
    if (status.tipo === "disponivel") {
      pendentes.push({
        id: `rl:${materia.nome}:${nomes[i]}`, materia: materia.nome, topico: nomes[i], ordemTopico: i + 1,
        link: estado!.linkQuestoes!, reforco: false,
      });
    } else if (status.tipo === "feita" && status.reforco) {
      const atualizadoEm = estado!.revisaoLink!.atualizadoEm;
      if (diffDias(atualizadoEm, hoje) >= REFORCO_COOLDOWN_DIAS) {
        pendentes.push({
          id: `rl:${materia.nome}:${nomes[i]}`, materia: materia.nome, topico: nomes[i], ordemTopico: i + 1,
          link: estado!.linkQuestoes!, reforco: true,
          acertosAtual: estado!.revisaoLink!.acertos, errosAtual: estado!.revisaoLink!.erros,
        });
      }
    }
  }
  return pendentes;
}

// ─── Meta do dia ─────────────────────────────────────────────────────────────

export interface BlocoEstudo {
  materia: string;
  topico: string; // tópico atual da matéria
  minutosAlvo: number;
  minutosFeitos: number; // sessões de "estudo" de HOJE dessa matéria (leitor de PDF/Timer)
  concluido: boolean;
}

export interface Revisao30 {
  materia: string;
  concluidaEm: string; // dateKey da conclusão da matéria
}

export interface MetaDia {
  data: string; // dateKey
  grupoCiclo: GrupoCiclo; // grupo EFETIVO do dia (pula grupos sem teoria pendente)
  minutosDia: number; // total de minutos de estudo configurados pra hoje no Ciclo
  blocos: BlocoEstudo[];
  blocosConcluidos: boolean; // todos os blocos entregues (false se não há blocos)
  questoesPendentes: QuestaoLiberada[]; // todas as matérias ativas
  reforcos: ReforcoGrupo[]; // grupos já feitos mas com desempenho fraco, esfriados (distinto de questoesPendentes)
  revisoesLink: RevisaoLinkPendente[]; // revisão das questões do link, 7 dias após os 4 grupos A-D
  revisoes30: Revisao30[]; // devidas hoje (matéria concluída ontem ou antes, revisão ainda não feita)
  revisarCartas: boolean; // hoje é domingo de cartas e ainda não marcada
  proximoDomingoCartas: string; // dateKey do próximo domingo de cartas (informativo)
  analises: AnaliseMateria[]; // por matéria ativa (pra UI de progresso)
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDias(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86400000);
}

export function proximoDomingo(aPartirDe: string): string {
  const d = parseDateKey(aPartirDe);
  const falta = (7 - d.getDay()) % 7; // 0 se já é domingo
  d.setDate(d.getDate() + falta);
  return dateKeyLocal(d);
}

export function grupoCicloSeguinte(g: GrupoCiclo): GrupoCiclo {
  return GRUPOS_CICLO[(GRUPOS_CICLO.indexOf(g) + 1) % 3];
}

function materiasDoGrupo(
  grupo: GrupoCiclo,
  configCiclo: EstudoConfigCiclo,
  materiasAtivas: MateriaLike[]
): MateriaLike[] {
  return materiasAtivas.filter((m) => {
    const cfg = configCiclo.materias[m.nome];
    return cfg?.incluir && cfg.divisao === grupo;
  });
}

// grupo efetivo do dia: começa no grupo salvo e pula (A→B→C→A) grupos que não têm NENHUMA
// matéria com teoria pendente — um grupo 100% teorizado não rende bloco de estudo
export function resolverGrupoEfetivo(
  grupoSalvo: GrupoCiclo,
  configCiclo: EstudoConfigCiclo,
  materiasAtivas: MateriaLike[],
  topicos: Record<string, TopicoState>
): GrupoCiclo {
  let g = grupoSalvo;
  for (let i = 0; i < 3; i++) {
    const comTeoria = materiasDoGrupo(g, configCiclo, materiasAtivas).some(
      (m) => analisarMateria(m, topicos).topicoAtual !== null
    );
    if (comTeoria) return g;
    g = grupoCicloSeguinte(g);
  }
  return grupoSalvo; // nenhuma teoria pendente em nenhum grupo — tanto faz
}

// distribui minutosDia proporcionalmente aos pesos (maiores restos / Hamilton): cada matéria
// recebe floor(peso/pesoTotal * minutosDia) e os minutos que sobram do arredondamento (no
// máximo pesos.length - 1) vão 1 a 1 pras matérias com maior parte fracionária perdida — nenhum
// minuto desaparece, ao contrário de um Math.floor(minutosDia/n) fixo pra todo mundo.
export function distribuirMinutosPorPeso(minutosDia: number, pesos: number[]): number[] {
  const pesoTotal = pesos.reduce((s, p) => s + p, 0);
  if (pesoTotal <= 0 || minutosDia <= 0) return pesos.map(() => 0);
  const brutos = pesos.map((p) => (p / pesoTotal) * minutosDia);
  const bases = brutos.map((v) => Math.floor(v));
  const sobra = minutosDia - bases.reduce((s, v) => s + v, 0);
  const porResto = brutos
    .map((v, i) => ({ i, resto: v - bases[i] }))
    .sort((a, b) => b.resto - a.resto);
  for (let k = 0; k < sobra; k++) bases[porResto[k].i]++;
  return bases;
}

export function minutosEstudoHoje(
  calendario: Record<string, AtividadeCalendario[]>,
  hoje: string,
  materia: string
): number {
  return (calendario[hoje] ?? [])
    .filter((a) => a.tipo === "estudo" && a.materia === materia)
    .reduce((s, a) => s + a.duracao, 0);
}

export function computarMetaDia(params: {
  hoje?: string;
  trilha: TrilhaDinamicaState;
  configCiclo: EstudoConfigCiclo;
  materiasAtivas: MateriaLike[];
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
}): MetaDia {
  const { trilha, configCiclo, materiasAtivas, topicos, calendario } = params;
  const hoje = params.hoje ?? dateKeyLocal();
  const diaSemana = DIAS_SEMANA[parseDateKey(hoje).getDay()];
  // ATENÇÃO à unidade: apesar do NOME, `configCiclo.horasPorDia` guarda MINUTOS — o CicloTab
  // grava `horas * 60` (updateHoras) e divide por 60 pra exibir. Multiplicar por 60 aqui de novo
  // foi um bug real (meta de "180h/5400min" num dia de 3h, reportado pelo usuário).
  const minutosDia = configCiclo.horasPorDia[diaSemana] ?? 0;

  const grupoEfetivo = resolverGrupoEfetivo(trilha.grupoCiclo, configCiclo, materiasAtivas, topicos);

  // matérias ativas no ciclo (qualquer grupo) — questões/revisões aparecem independente do dia
  const ativas = materiasAtivas.filter((m) => configCiclo.materias[m.nome]?.incluir);
  const analises = ativas.map((m) => analisarMateria(m, topicos));

  // blocos de estudo: matérias do grupo do dia com teoria pendente, tempo dividido
  // PROPORCIONALMENTE ao peso configurado no Ciclo (peso 2 = ~2x o tempo de peso 1) — antes era
  // sempre dividido igual, ignorando o peso que o usuário já configura
  const materiasBloco = materiasDoGrupo(grupoEfetivo, configCiclo, materiasAtivas)
    .map((m) => analises.find((a) => a.materia === m.nome) ?? analisarMateria(m, topicos))
    .filter((a) => a.topicoAtual !== null);
  const pesosBloco = materiasBloco.map((a) => configCiclo.materias[a.materia]?.peso ?? 1);
  const minutosPorMateria = distribuirMinutosPorPeso(minutosDia, pesosBloco);
  const blocos: BlocoEstudo[] = minutosDia > 0
    ? materiasBloco.map((a, i) => {
        const feitos = minutosEstudoHoje(calendario, hoje, a.materia);
        const minutosAlvo = minutosPorMateria[i];
        return {
          materia: a.materia,
          topico: a.topicoAtual as string,
          minutosAlvo,
          minutosFeitos: feitos,
          concluido: feitos >= minutosAlvo,
        };
      })
    : [];

  // revisões de 30 questões: devidas A PARTIR DO DIA SEGUINTE à conclusão, até serem feitas
  const revisoes30: Revisao30[] = Object.entries(trilha.conclusaoMaterias)
    .filter(([nome, dataConclusao]) => {
      if (diffDias(dataConclusao, hoje) < 1) return false; // só no dia posterior em diante
      const feitas = trilha.revisoes30Feitas[nome] ?? [];
      return feitas.length === 0; // pendente até a primeira revisão
    })
    .map(([materia, concluidaEm]) => ({ materia, concluidaEm }));

  // cartas: domingos a cada 14 dias da âncora; "feita" via marcação ou atividade tipo "cartas"
  const dif = diffDias(trilha.ancoraCartas, hoje);
  const ehDomingoCartas = parseDateKey(hoje).getDay() === 0 && dif >= 0 && dif % 14 === 0;
  const cartasFeitaHoje =
    trilha.cartasFeitasEm.includes(hoje) ||
    (calendario[hoje] ?? []).some((a) => a.tipo === "cartas");
  const proximoDom = ehDomingoCartas && !cartasFeitaHoje
    ? hoje
    : (() => {
        const base = parseDateKey(trilha.ancoraCartas);
        const saltos = Math.max(0, Math.floor(dif / 14) + 1);
        base.setDate(base.getDate() + saltos * 14);
        return dateKeyLocal(base);
      })();

  return {
    data: hoje,
    grupoCiclo: grupoEfetivo,
    minutosDia,
    blocos,
    blocosConcluidos: blocos.length > 0 && blocos.every((b) => b.concluido),
    questoesPendentes: analises.flatMap((a) => a.questoesLiberadas),
    reforcos: ativas.flatMap((m) => analisarReforcos(m, topicos, hoje)),
    revisoesLink: ativas.flatMap((m) => analisarRevisoesLink(m, topicos, hoje)),
    revisoes30,
    revisarCartas: ehDomingoCartas && !cartasFeitaHoje,
    proximoDomingoCartas: proximoDom,
    analises,
  };
}

// estado inicial ao ativar a trilha
export function criarTrilhaDinamica(hoje: string = dateKeyLocal()): TrilhaDinamicaState {
  return {
    ativa: true,
    iniciadaEm: hoje,
    grupoCiclo: "A",
    conclusaoMaterias: {},
    revisoes30Feitas: {},
    ancoraCartas: proximoDomingo(hoje),
    cartasFeitasEm: [],
  };
}
