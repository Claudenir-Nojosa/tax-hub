import {
  dateKeyLocal, topicoKey,
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

export const GRUPOS_QUESTOES: Grupo[] = ["A", "B", "C", "D"];
const GRUPOS_CICLO = ["A", "B", "C"] as const;
export type GrupoCiclo = (typeof GRUPOS_CICLO)[number];

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

  // blocos de estudo: matérias do grupo do dia com teoria pendente, tempo dividido igualmente
  const materiasBloco = materiasDoGrupo(grupoEfetivo, configCiclo, materiasAtivas)
    .map((m) => analises.find((a) => a.materia === m.nome) ?? analisarMateria(m, topicos))
    .filter((a) => a.topicoAtual !== null);
  const minutosPorBloco = materiasBloco.length > 0 && minutosDia > 0
    ? Math.floor(minutosDia / materiasBloco.length)
    : 0;
  const blocos: BlocoEstudo[] = minutosDia > 0
    ? materiasBloco.map((a) => {
        const feitos = minutosEstudoHoje(calendario, hoje, a.materia);
        return {
          materia: a.materia,
          topico: a.topicoAtual as string,
          minutosAlvo: minutosPorBloco,
          minutosFeitos: feitos,
          concluido: feitos >= minutosPorBloco,
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
