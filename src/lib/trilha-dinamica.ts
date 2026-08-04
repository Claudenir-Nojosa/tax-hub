import {
  calcularPagPorHora, dateKeyLocal, topicoKey, calcularPerc,
  type AtividadeCalendario, type CapituloPdf, type ChecklistRevisaoLink, type EstudoConfigCiclo,
  type Grupo, type PdfEstudo, type TopicoState, type TrilhaDinamicaState,
} from "./estudo-data";

// forma mínima de matéria que o motor precisa — MateriaDef, MateriaConcurso e MateriaBase são
// todas estruturalmente compatíveis
export type MateriaLike = { nome: string; topicos: string[] };

// Motor da TRILHA DINÂMICA — funções puras que derivam a meta da SEMANA do estado real (nada de
// plano pré-gerado). As regras são o método pessoal do usuário, à risca:
//
// 1. ESTUDO: a semana cobre TODAS as matérias ativas ao mesmo tempo (não mais um grupo A/B/C por
//    dia). As horas da semana (soma de horasPorDia no Ciclo) são divididas PROPORCIONALMENTE ao
//    peso entre as matérias que ainda têm teoria pendente — ex.: 15h/semana, 3 matérias de peso
//    igual = 5h cada, no TÓPICO ATUAL (primeiro não estudado) de cada uma. O progresso vem do
//    calendário da semana corrente (segunda a domingo) — sessões de estudo por matéria (leitor
//    de PDF/Timer). Quando um PDF tem o intervalo de páginas do tópico mapeado
//    (PdfEstudo.intervalosPaginas), o bloco carrega pdfId/paginaInicio/paginaFim pra abrir o
//    leitor já no lugar certo.
// 2. QUESTÕES ESCALONADAS: cada tópico tem 4 grupos de questões (A-D, os cadernos do Edital).
//    Concluir o tópico i+1 LIBERA o grupo A do tópico i; concluir i+2 libera o B do i; i+3 o C;
//    i+4 o D. Quando a teoria da matéria termina, os grupos restantes (a "cauda") ficam todos
//    liberados. Grupo "feito" = caderno com acertos+erros > 0.
// 3. REFORÇO IMEDIATO: assim que um tópico é marcado como estudado, se tiver um
//    linkReforcoImediato cadastrado (caderno curto, até ~10 questões), ele aparece na trilha uma
//    única vez — pra prática ativa logo depois de estudar, sem esperar o escalonamento A-D.
// 4. MATÉRIA 100% = teoria toda + 4 grupos de todos os tópicos feitos → DIAS_REVISAO_MATERIA
//    dias depois entra a atividade "revisão da matéria: 30 questões englobando todos os
//    tópicos" (modo revisão), com link próprio (ConfigMateria.linkRevisaoMateria).
// 5. CARTAS: a cada 2 domingos (14 dias), atividade de revisar as cartas.
// 6. SEM DÍVIDA ACUMULADA: cada semana é recalculada do zero a partir do peso configurado — se
//    uma matéria não bate a meta de horas numa semana, a semana seguinte não "soma" o que faltou,
//    só reparte de novo (decisão explícita do usuário: mais simples, sem estado novo).
// 7. TEMPO PONDERADO: o tempo da semana é dividido PROPORCIONALMENTE ao peso (1 ou 2) configurado
//    por matéria no Ciclo (distribuirMinutosPorPeso).
// 8. REFORÇO A-D: um grupo "feito" com acerto abaixo de LIMIAR_REFORCO_PERC volta a aparecer na
//    trilha (seção separada de "questões liberadas") depois de REFORCO_COOLDOWN_DIAS sem
//    atualização — 0% e 100% deixam de ser tratados igual.
// 9. REVISÃO DO LINK: cada tópico tem UM link de questões (aba Questões, ex.: TecConcursos —
//    substituiu os 4 links por grupo). Quando os 4 grupos A-D do tópico ficam feitos, a revisão
//    das questões do link entra na trilha em DOIS checkpoints INDEPENDENTES (CHECKPOINTS_
//    REVISAO_LINK: 7 e 30 dias depois, cada um contado da mesma data de conclusão). Registrado o
//    resultado de um checkpoint, abaixo de LIMIAR_REFORCO_PERC volta como reforço depois de
//    REFORCO_COOLDOWN_DIAS (mesmas regras do reforço A-D) — o outro checkpoint segue seu próprio
//    prazo, sem depender do primeiro ter sido feito.

export const GRUPOS_QUESTOES: Grupo[] = ["A", "B", "C", "D"];

// limiar de acerto abaixo do qual um grupo "feito" é considerado fraco e pode ressurgir como
// reforço — mesmo corte que o Edital já usa pra colorir o % de acerto (PercBadge), consistente
// com o que o usuário já enxerga hoje
export const LIMIAR_REFORCO_PERC = 70;
// dias de carência antes do MESMO grupo fraco ressurgir de novo — qualquer novo registro de
// acertos/erros nesse grupo (Edital ou Trilha) reinicia a contagem via TopicoCaderno.atualizadoEm
export const REFORCO_COOLDOWN_DIAS = 3;
// checkpoints de revisão das questões do link (aba Questões, ex.: TecConcursos) — independentes
// entre si, cada um contado a partir da conclusão dos 4 grupos A-D do tópico
export const CHECKPOINTS_REVISAO_LINK: { id: ChecklistRevisaoLink; dias: number }[] = [
  { id: "d7", dias: 7 },
  { id: "d30", dias: 30 },
];
// dias de espera após a matéria bater 100% até a revisão de 30 questões liberar (2026-07-29:
// era "no dia seguinte" (1 dia), corrigido a pedido do usuário)
export const DIAS_REVISAO_MATERIA = 3;

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
  | { tipo: "aguardando_prazo"; diasRestantes: number } // 4 grupos feitos, ainda dentro do prazo do checkpoint
  | { tipo: "disponivel" } // prazo passou, esse checkpoint ainda não foi registrado
  | { tipo: "feita"; perc: number; reforco: boolean }; // já registrada — reforco = abaixo do limiar

// cada checkpoint tem seu PRÓPRIO link (na prática, cadernos diferentes — o de 30 dias costuma
// cobrir mais questões que o de 7)
export function linkDoCheckpoint(estado: TopicoState | undefined, checkpoint: ChecklistRevisaoLink): string | undefined {
  return checkpoint === "d7" ? estado?.linkRevisao7d : estado?.linkRevisao30d;
}

// status de UM checkpoint (7 ou 30 dias) de um tópico — usado tanto pra decidir o que aparece na
// Trilha (analisarRevisoesLink) quanto pro badge informativo da aba Questões. Os dois checkpoints
// são independentes: cada um com seu próprio link e seu próprio registro em revisoesLink[checkpoint].
export function statusRevisaoLink(
  estado: TopicoState | undefined,
  hoje: string,
  checkpoint: ChecklistRevisaoLink = "d7"
): StatusRevisaoLink {
  if (!estado || !linkDoCheckpoint(estado, checkpoint)) return { tipo: "sem_link" };
  const todosFeitos = GRUPOS_QUESTOES.every((g) => grupoFeito(estado, g));
  if (!todosFeitos) return { tipo: "aguardando_grupos" };

  // data de conclusão = a mais recente entre os atualizadoEm dos 4 grupos; se algum grupo feito
  // não tem atualizadoEm (registro antigo, de antes desse campo existir), considera já elegível
  // na hora — mesma filosofia do reforço A-D (ausência de data não bloqueia, libera de cara)
  const datas = GRUPOS_QUESTOES.map((g) => estado.cadernos[g].atualizadoEm).filter((d): d is string => !!d);
  const dataConclusao = datas.length === 4 ? datas.sort()[datas.length - 1] : "1970-01-01";
  const diasDesde = diffDias(dataConclusao, hoje);
  const diasAlvo = CHECKPOINTS_REVISAO_LINK.find((c) => c.id === checkpoint)!.dias;

  const registro = estado.revisoesLink?.[checkpoint];
  if (!registro) {
    if (diasDesde < diasAlvo) return { tipo: "aguardando_prazo", diasRestantes: diasAlvo - diasDesde };
    return { tipo: "disponivel" };
  }
  const perc = calcularPerc(registro.acertos, registro.erros);
  return { tipo: "feita", perc, reforco: perc < LIMIAR_REFORCO_PERC };
}

export interface RevisaoLinkPendente {
  id: string; // estável: `rl:${materia}:${topico}:${checkpoint}`
  materia: string;
  topico: string;
  ordemTopico: number;
  link: string;
  checkpoint: ChecklistRevisaoLink;
  dias: number; // 7 ou 30 — pro rótulo na UI
  reforco: boolean; // true = corrigindo um resultado fraco anterior, não a 1ª tentativa
  acertosAtual?: number; // pré-preenche o form quando é reforço
  errosAtual?: number;
}

// tópicos com revisão do link disponível (1ª vez) ou pedindo reforço (< LIMIAR_REFORCO_PERC e
// já esfriado, mesmo cooldown do reforço A-D), pros DOIS checkpoints (7 e 30 dias) — igual a
// analisarReforcos, caminho separado que não interfere na liberação escalonada nem no cálculo de
// matéria concluída
export function analisarRevisoesLink(
  materia: MateriaLike,
  topicos: Record<string, TopicoState>,
  hoje: string
): RevisaoLinkPendente[] {
  const nomes = materia.topicos;
  const pendentes: RevisaoLinkPendente[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const estado = topicos[topicoKey(materia.nome, nomes[i])];
    for (const cp of CHECKPOINTS_REVISAO_LINK) {
      const status = statusRevisaoLink(estado, hoje, cp.id);
      if (status.tipo === "disponivel") {
        pendentes.push({
          id: `rl:${materia.nome}:${nomes[i]}:${cp.id}`, materia: materia.nome, topico: nomes[i], ordemTopico: i + 1,
          link: linkDoCheckpoint(estado, cp.id)!, checkpoint: cp.id, dias: cp.dias, reforco: false,
        });
      } else if (status.tipo === "feita" && status.reforco) {
        const registro = estado!.revisoesLink![cp.id]!;
        if (diffDias(registro.atualizadoEm, hoje) >= REFORCO_COOLDOWN_DIAS) {
          pendentes.push({
            id: `rl:${materia.nome}:${nomes[i]}:${cp.id}`, materia: materia.nome, topico: nomes[i], ordemTopico: i + 1,
            link: linkDoCheckpoint(estado, cp.id)!, checkpoint: cp.id, dias: cp.dias, reforco: true,
            acertosAtual: registro.acertos, errosAtual: registro.erros,
          });
        }
      }
    }
  }
  return pendentes;
}

// ─── Reforço imediato (link curto, pós-estudo) ──────────────────────────────

export interface ReforcoImediatoPendente {
  id: string; // estável: `ri:${materia}:${topico}`
  materia: string;
  topico: string;
  ordemTopico: number; // 1-based no edital
  link: string;
}

// tópicos recém-estudados com um link de reforço curto cadastrado (aba Questões) e ainda não
// registrado — aparece UMA vez, sem cooldown/reaparecimento (distinto do reforço A-D, que é sobre
// desempenho fraco recorrente; aqui é só "pratique logo depois de estudar")
export function analisarReforcosImediatos(
  materia: MateriaLike,
  topicos: Record<string, TopicoState>
): ReforcoImediatoPendente[] {
  const nomes = materia.topicos;
  const pendentes: ReforcoImediatoPendente[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const estado = topicos[topicoKey(materia.nome, nomes[i])];
    if (!estado?.estudado || !estado.linkReforcoImediato || estado.reforcoImediatoFeito) continue;
    pendentes.push({
      id: `ri:${materia.nome}:${nomes[i]}`,
      materia: materia.nome,
      topico: nomes[i],
      ordemTopico: i + 1,
      link: estado.linkReforcoImediato,
    });
  }
  return pendentes;
}

// ─── Meta da SEMANA ──────────────────────────────────────────────────────────

export interface BlocoEstudoSemana {
  materia: string;
  topico: string; // tópico atual da matéria, recalculado ao vivo (primeiro não-estudado) — se o
                   // usuário termina mais de um tópico na mesma semana, a próxima leitura desse
                   // mesmo bloco já mostra o tópico seguinte, sem replanejar nada
  minutosAlvoSemana: number;
  minutosFeitosSemana: number; // sessões de "estudo" da SEMANA corrente dessa matéria
  concluido: boolean;
  // resolvido via PdfEstudo.intervalosPaginas (ou capitulos, quando definidos — ver
  // resolverPaginaBloco) quando existe um PDF da matéria com o intervalo do tópico mapeado;
  // ausente = "Ler PDF" cai no comportamento genérico (sem página/aviso)
  pdfId?: string;
  paginaInicio?: number;
  paginaFim?: number;
  // só presente quando o PDF tem capítulos manuais — "Capítulo 2 de 6: Crédito Tributário" etc.,
  // pra Trilha mostrar EM QUAL capítulo a atividade de leitura está, não só o tópico inteiro
  capituloLabel?: string;
  // capítulos/subcapítulos individuais que compõem esse bloco (só quando capituloLabel existe) —
  // a UI lista cada um como subtarefa clicável ("Ler capítulo N"), abrindo o leitor direto naquele
  // trecho; cada item já sabe se foi lido (via pdf.paginaAtual, o mesmo bookmark de sempre)
  capitulos?: CapituloBlocoItem[];
}

export interface Revisao30 {
  materia: string;
  concluidaEm: string; // dateKey da conclusão da matéria
  link?: string; // ConfigMateria.linkRevisaoMateria — clicar na atividade abre direto
}

export interface MetaSemana {
  inicioSemana: string; // dateKey da segunda-feira
  fimSemana: string; // dateKey do domingo
  minutosSemana: number; // total de minutos de estudo configurados pra semana no Ciclo
  blocos: BlocoEstudoSemana[];
  blocosConcluidos: boolean; // todos os blocos entregues (false se não há blocos)
  questoesPendentes: QuestaoLiberada[]; // todas as matérias ativas
  reforcos: ReforcoGrupo[]; // grupos já feitos mas com desempenho fraco, esfriados
  reforcosImediatos: ReforcoImediatoPendente[]; // links curtos pós-estudo, ainda não feitos
  revisoesLink: RevisaoLinkPendente[]; // revisão das questões do link, 7/30 dias após os 4 grupos A-D
  revisoes30: Revisao30[]; // devidas (matéria concluída há DIAS_REVISAO_MATERIA+ dias, revisão ainda não feita)
  revisarCartas: boolean; // hoje é domingo de cartas e ainda não marcada
  proximoDomingoCartas: string; // dateKey do próximo domingo de cartas (informativo)
  analises: AnaliseMateria[]; // por matéria ativa (pra UI de progresso)
  percCumpridoSemana: number; // 0-100, minutos feitos / minutos alvo da semana (capado em 100)
  ritmoNecessarioMinDia: number | null; // minutos/dia nos dias que restam pra fechar a semana; null se não houver o que fechar
  atrasado: boolean; // ritmo até hoje significativamente abaixo do proporcional esperado (ver computarMetaSemana)
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function diffDias(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86400000);
}

export function proximoDomingo(aPartirDe: string): string {
  const d = parseDateKey(aPartirDe);
  const falta = (7 - d.getDay()) % 7; // 0 se já é domingo
  d.setDate(d.getDate() + falta);
  return dateKeyLocal(d);
}

// semana ISO (segunda a domingo) que contém `hoje` — fonte única de "qual semana é essa" pro
// motor inteiro (janela de minutosEstudoNaSemana e cabeçalho da MetaSemana)
export function semanaAtual(hoje: string = dateKeyLocal()): { inicio: string; fim: string } {
  const d = parseDateKey(hoje);
  const diaSemana = d.getDay(); // 0=domingo..6=sábado
  const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const inicio = new Date(d);
  inicio.setDate(inicio.getDate() + diffSegunda);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 6);
  return { inicio: dateKeyLocal(inicio), fim: dateKeyLocal(fim) };
}

// distribui minutosSemana proporcionalmente aos pesos (maiores restos / Hamilton): cada matéria
// recebe floor(peso/pesoTotal * minutosSemana) e os minutos que sobram do arredondamento (no
// máximo pesos.length - 1) vão 1 a 1 pras matérias com maior parte fracionária perdida — nenhum
// minuto desaparece, ao contrário de um Math.floor(minutosSemana/n) fixo pra todo mundo.
export function distribuirMinutosPorPeso(minutosSemana: number, pesos: number[]): number[] {
  const pesoTotal = pesos.reduce((s, p) => s + p, 0);
  if (pesoTotal <= 0 || minutosSemana <= 0) return pesos.map(() => 0);
  const brutos = pesos.map((p) => (p / pesoTotal) * minutosSemana);
  const bases = brutos.map((v) => Math.floor(v));
  const sobra = minutosSemana - bases.reduce((s, v) => s + v, 0);
  const porResto = brutos
    .map((v, i) => ({ i, resto: v - bases[i] }))
    .sort((a, b) => b.resto - a.resto);
  for (let k = 0; k < sobra; k++) bases[porResto[k].i]++;
  return bases;
}

// soma os minutos de "estudo" em todos os dias do intervalo [inicio, fim] (equivalente semanal do
// antigo minutosEstudoHoje) — janela pequena (7 dias), sem preocupação de performance. Sem
// `materia`, soma de TODAS as matérias (usado pelo histórico de semanas passadas).
export function minutosEstudoNaSemana(
  calendario: Record<string, AtividadeCalendario[]>,
  inicio: string,
  fim: string,
  materia?: string
): number {
  let total = 0;
  const cursor = parseDateKey(inicio);
  const fimData = parseDateKey(fim);
  while (cursor.getTime() <= fimData.getTime()) {
    const key = dateKeyLocal(cursor);
    total += (calendario[key] ?? [])
      .filter((a) => a.tipo === "estudo" && (materia === undefined || a.materia === materia))
      .reduce((s, a) => s + a.duracao, 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export interface CapituloResolvido {
  nome: string; // já combinado com o nome do capítulo-pai quando é um subcapítulo ("Cap — Sub")
  paginaInicio: number;
  paginaFim: number;
  lido: boolean;
}

// achata capítulos + subcapítulos numa lista única, na ordem de leitura: um capítulo COM
// subcapítulos vira um item por subcapítulo (mais granular — é isso que a Trilha vai sequenciar);
// um capítulo SEM subcapítulos entra ele mesmo. Cada item guarda o paginaFim DECLARADO (se o
// usuário informou, ver PainelCapitulos.tsx/FormPdf.tsx) — undefined quando só o início foi
// preenchido, pra resolverCapitulos derivar depois.
function achatarCapitulos(capitulos: CapituloPdf[]): { nome: string; paginaInicio: number; paginaFimDeclarado?: number }[] {
  const achatados: { nome: string; paginaInicio: number; paginaFimDeclarado?: number }[] = [];
  const ordenados = [...capitulos].sort((a, b) => a.paginaInicio - b.paginaInicio);
  for (const cap of ordenados) {
    if (cap.subcapitulos && cap.subcapitulos.length > 0) {
      const subs = [...cap.subcapitulos].sort((a, b) => a.paginaInicio - b.paginaInicio);
      for (const sub of subs) {
        achatados.push({ nome: `${cap.nome} — ${sub.nome}`, paginaInicio: sub.paginaInicio, paginaFimDeclarado: sub.paginaFim });
      }
    } else {
      achatados.push({ nome: cap.nome, paginaInicio: cap.paginaInicio, paginaFimDeclarado: cap.paginaFim });
    }
  }
  return achatados;
}

// dá o paginaFim de cada capítulo/subcapítulo (o declarado pelo usuário — ver achatarCapitulos —
// ou, se ausente, a página anterior ao início do próximo item; o último vai até o fim do
// conteúdo) e se já foi lido — sem estado de "concluído" separado: o bookmark `paginaAtual` (que
// só avança, nunca recua — ver LeitorPdf) já basta, do mesmo jeito que decide se o PDF inteiro
// foi lido.
export function resolverCapitulos(
  pdf: Pick<PdfEstudo, "capitulos" | "paginaAtual" | "totalPaginas" | "paginaConteudoFim">
): CapituloResolvido[] {
  const achatados = achatarCapitulos(pdf.capitulos ?? []);
  if (achatados.length === 0) return [];
  const fimDocumento = pdf.paginaConteudoFim ?? pdf.totalPaginas;
  return achatados.map((c, i) => {
    const paginaFim = c.paginaFimDeclarado ?? (i === achatados.length - 1 ? fimDocumento : achatados[i + 1].paginaInicio - 1);
    return { nome: c.nome, paginaInicio: c.paginaInicio, paginaFim, lido: pdf.paginaAtual >= paginaFim };
  });
}

// agrupa capítulos curtos até render uma atividade de leitura de duração razoável — sem isso, um
// capítulo de 2 páginas viraria uma atividade separada na Trilha, ridiculamente pequena. É só o
// PISO: o alvo de verdade é o minutosAlvo da SEMANA daquela matéria (ver computarMetaSemana), pra
// a atividade de leitura cobrir de fato as horas que o usuário reservou pra ela — não adianta
// bater 30min de agrupamento se a matéria tem 3h/semana reservadas.
const MINUTOS_ALVO_ATIVIDADE_CAPITULO_PISO = 30;

// ritmo-placeholder usado SÓ quando calcularPagPorHora ainda não tem nenhuma sessão de leitura
// registrada NESSE concurso (concurso novo, ou trilha gerada antes de qualquer sessão) — sem
// isso, agrupar capítulos por duração ficava impossível justo no primeiro dia, e cada capítulo
// (por menor que fosse) virava uma atividade separada. É só uma estimativa média honesta pra
// material de concurso denso — o ritmo REAL sempre assume a partir da primeira sessão com
// páginas registrada (calcularPagPorHora nunca deixa de priorizar dado real quando existe).
const PAG_POR_HORA_PADRAO = 15;

// um item da lista de subtarefas de um bloco agrupado — o CapituloResolvido de sempre, mais o
// índice GLOBAL (1-based, entre TODOS os capítulos do PDF) pra UI numerar certo mesmo quando o
// bloco não começa no capítulo 1 (ex.: "Capítulo 4: Regras Gerais de Acentuação")
export interface CapituloBlocoItem extends CapituloResolvido {
  indice: number;
}

export interface BlocoCapitulos {
  paginaInicio: number;
  paginaFim: number;
  // capítulos/subcapítulos resolvidos que compõem essa atividade, na ordem de leitura — 1 item =
  // capítulo único; 2+ = vários agrupados pra bater o minutosAlvo da semana. Cada um já traz seu
  // próprio paginaInicio/paginaFim/lido (ver resolverCapitulos), pra a UI listar como subtarefas
  // clicáveis (abrir o leitor direto naquele capítulo) em vez de só um rótulo agregado.
  capitulos: CapituloBlocoItem[];
  primeiroIndice: number; // 1-based, pra UI mostrar "Capítulo 3 de 6" / "Capítulos 3-4 de 6"
  ultimoIndice: number;
  total: number;
}

// próximo trecho de leitura dentro dos capítulos do PDF: a partir do primeiro ainda não lido,
// junta capítulos CONSECUTIVOS até estimar `minutosAlvo` de leitura no ritmo de páginas/hora do
// usuário (calcularPagPorHora) — sem sessão registrada AINDA nesse concurso, usa
// PAG_POR_HORA_PADRAO em vez de desistir de agrupar (senão cada capítulo, por menor que fosse,
// virava uma atividade própria já no primeiro dia). `minutosAlvo` é o minutosAlvoSemana da
// matéria (quantas horas por semana o usuário reservou pra ela no Ciclo) — nunca abaixo do piso
// MINUTOS_ALVO_ATIVIDADE_CAPITULO_PISO, pra não gerar uma atividade ridiculamente curta quando a
// matéria tem pouquíssimo tempo reservado. undefined quando o PDF não tem capítulos manuais, ou
// todos já foram lidos.
export function proximoBlocoCapitulos(
  pdf: Pick<PdfEstudo, "capitulos" | "paginaAtual" | "totalPaginas" | "paginaConteudoFim">,
  pagPorHora: number | null,
  minutosAlvo: number
): BlocoCapitulos | undefined {
  const resolvidos = resolverCapitulos(pdf);
  if (resolvidos.length === 0) return undefined;
  const primeiroIdx = resolvidos.findIndex((c) => !c.lido);
  if (primeiroIdx === -1) return undefined;

  const alvo = Math.max(minutosAlvo, MINUTOS_ALVO_ATIVIDADE_CAPITULO_PISO);
  const ritmo = pagPorHora && pagPorHora > 0 ? pagPorHora : PAG_POR_HORA_PADRAO;
  const capitulos: CapituloBlocoItem[] = [];
  let minutosAcumulados = 0;
  let ultimoIdx = primeiroIdx;
  for (let i = primeiroIdx; i < resolvidos.length; i++) {
    const c = resolvidos[i];
    capitulos.push({ ...c, indice: i + 1 });
    ultimoIdx = i;
    const paginas = c.paginaFim - c.paginaInicio + 1;
    minutosAcumulados += (paginas / ritmo) * 60;
    if (minutosAcumulados >= alvo) break;
  }
  return {
    paginaInicio: resolvidos[primeiroIdx].paginaInicio,
    paginaFim: resolvidos[ultimoIdx].paginaFim,
    capitulos,
    primeiroIndice: primeiroIdx + 1,
    ultimoIndice: ultimoIdx + 1,
    total: resolvidos.length,
  };
}

function rotuloBlocoCapitulos(bloco: BlocoCapitulos): string {
  return bloco.capitulos.length > 1
    ? `Capítulos ${bloco.primeiroIndice}-${bloco.ultimoIndice} de ${bloco.total}`
    : `Capítulo ${bloco.primeiroIndice} de ${bloco.total}: ${bloco.capitulos[0].nome}`;
}

// acha o PDF da matéria que cobre o tópico — se tiver capítulos manuais definidos, usa o PRÓXIMO
// trecho de leitura (sequencial, capítulo a capítulo); senão cai no intervalo de página mapeado
// pro tópico inteiro (intervalosPaginas), comportamento de sempre. Se mais de um PDF cobrir o
// mesmo tópico, vence o primeiro em ordem de `pdfs` (a lista já vem mais-recente-primeiro de
// EstudoState.pdfs, então isso é "o mapeamento mais recente vence").
function resolverPaginaBloco(
  materia: string,
  topico: string,
  pdfs: PdfEstudo[],
  pagPorHora: number | null,
  minutosAlvo: number
): { pdfId: string; paginaInicio: number; paginaFim: number; capituloLabel?: string; capitulos?: CapituloBlocoItem[] } | undefined {
  for (const pdf of pdfs) {
    if (pdf.materia !== materia) continue;
    if (pdf.topicos?.includes(topico) && (pdf.capitulos?.length ?? 0) > 0) {
      const bloco = proximoBlocoCapitulos(pdf, pagPorHora, minutosAlvo);
      if (bloco) {
        return {
          pdfId: pdf.id,
          paginaInicio: bloco.paginaInicio,
          paginaFim: bloco.paginaFim,
          capituloLabel: rotuloBlocoCapitulos(bloco),
          capitulos: bloco.capitulos,
        };
      }
    }
    const intervalo = pdf.intervalosPaginas?.find((ip) => ip.topico === topico);
    if (intervalo) return { pdfId: pdf.id, paginaInicio: intervalo.paginaInicio, paginaFim: intervalo.paginaFim };
  }
  return undefined;
}

export function computarMetaSemana(params: {
  hoje?: string;
  trilha: TrilhaDinamicaState;
  configCiclo: EstudoConfigCiclo;
  materiasAtivas: MateriaLike[];
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
}): MetaSemana {
  const { trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs } = params;
  const hoje = params.hoje ?? dateKeyLocal();
  const { inicio: inicioSemana, fim: fimSemana } = semanaAtual(hoje);

  // ATENÇÃO à unidade: apesar do NOME, `configCiclo.horasPorDia` guarda MINUTOS — o CicloTab
  // grava `horas * 60` (updateHoras) e divide por 60 pra exibir. "Total semanal" é literalmente
  // essa soma, já exibida no Ciclo — usar o mesmo cálculo aqui garante que os dois nunca divergem.
  const minutosSemana = Object.values(configCiclo.horasPorDia).reduce((s, m) => s + m, 0);

  const ativas = materiasAtivas.filter((m) => configCiclo.materias[m.nome]?.incluir);
  const analises = ativas.map((m) => analisarMateria(m, topicos));
  const pagPorHora = calcularPagPorHora(calendario);

  // blocos de leitura: TODAS as matérias ativas com teoria pendente (não mais um grupo por dia),
  // tempo semanal dividido PROPORCIONALMENTE ao peso configurado no Ciclo
  const materiasBloco = analises.filter((a) => a.topicoAtual !== null);
  const pesosBloco = materiasBloco.map((a) => configCiclo.materias[a.materia]?.peso ?? 1);
  const minutosPorMateria = distribuirMinutosPorPeso(minutosSemana, pesosBloco);
  const blocos: BlocoEstudoSemana[] = minutosSemana > 0
    ? materiasBloco.map((a, i) => {
        const feitos = minutosEstudoNaSemana(calendario, inicioSemana, fimSemana, a.materia);
        const minutosAlvo = minutosPorMateria[i];
        const topico = a.topicoAtual as string;
        const range = resolverPaginaBloco(a.materia, topico, pdfs, pagPorHora, minutosAlvo);
        return {
          materia: a.materia,
          topico,
          minutosAlvoSemana: minutosAlvo,
          minutosFeitosSemana: feitos,
          concluido: feitos >= minutosAlvo,
          pdfId: range?.pdfId,
          paginaInicio: range?.paginaInicio,
          paginaFim: range?.paginaFim,
          capitulos: range?.capitulos,
          capituloLabel: range?.capituloLabel,
        };
      })
    : [];

  // revisões de 30 questões: idêntico ao modelo anterior — já é baseado em diferença de datas,
  // não em dia-da-semana/grupo, então não muda com a virada pra meta semanal
  const revisoes30: Revisao30[] = Object.entries(trilha.conclusaoMaterias)
    .filter(([nome, dataConclusao]) => {
      if (diffDias(dataConclusao, hoje) < DIAS_REVISAO_MATERIA) return false;
      const feitas = trilha.revisoes30Feitas[nome] ?? [];
      return feitas.length === 0; // pendente até a primeira revisão
    })
    .map(([materia, concluidaEm]) => ({
      materia, concluidaEm,
      link: configCiclo.materias[materia]?.linkRevisaoMateria,
    }));

  // cartas: domingos a cada 14 dias da âncora; "feita" via marcação ou atividade tipo "cartas" —
  // idêntico ao modelo anterior
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

  // acompanhamento de ritmo (Gustavo "cobra a evolução"): quanto já foi feito essa semana vs o
  // que seria proporcionalmente esperado até HOJE, e quantos minutos/dia faltam nos dias restantes
  // (hoje incluso) pra fechar a meta — mesmo se a semana ainda não estiver "atrasada" oficialmente
  const blocosConcluidos = blocos.length > 0 && blocos.every((b) => b.concluido);
  const totalMinutosFeitos = blocos.reduce((s, b) => s + b.minutosFeitosSemana, 0);
  const percCumpridoSemana = minutosSemana > 0 ? Math.min(100, Math.round((totalMinutosFeitos / minutosSemana) * 100)) : 0;
  const diasDecorridos = Math.min(7, diffDias(inicioSemana, hoje) + 1); // 1..7
  const diasRestantes = 7 - diasDecorridos + 1; // hoje incluso, 7..1
  const ritmoNecessarioMinDia = minutosSemana > 0 && diasRestantes > 0 && !blocosConcluidos
    ? Math.max(0, Math.ceil((minutosSemana - totalMinutosFeitos) / diasRestantes))
    : null;
  // só considera "atrasado" a partir do 2º dia da semana (não cobra na segunda de manhã) e exige
  // estar bem abaixo (60%) do proporcional esperado até hoje — evita soar o alarme por variação
  // normal do dia a dia
  const minutosEsperadosAteHoje = minutosSemana * (diasDecorridos / 7);
  const atrasado = minutosSemana > 0 && diasDecorridos >= 2 && !blocosConcluidos
    && totalMinutosFeitos < minutosEsperadosAteHoje * 0.6;

  return {
    inicioSemana,
    fimSemana,
    minutosSemana,
    blocos,
    blocosConcluidos,
    questoesPendentes: analises.flatMap((a) => a.questoesLiberadas),
    reforcos: ativas.flatMap((m) => analisarReforcos(m, topicos, hoje)),
    reforcosImediatos: ativas.flatMap((m) => analisarReforcosImediatos(m, topicos)),
    revisoesLink: ativas.flatMap((m) => analisarRevisoesLink(m, topicos, hoje)),
    revisoes30,
    revisarCartas: ehDomingoCartas && !cartasFeitaHoje,
    proximoDomingoCartas: proximoDom,
    analises,
    percCumpridoSemana,
    ritmoNecessarioMinDia,
    atrasado,
  };
}

// ─── Histórico de semanas passadas (comparação + tendência) ────────────────

export interface SemanaHistorico {
  inicioSemana: string; // dateKey da segunda
  fimSemana: string; // dateKey do domingo
  minutosMeta: number;
  minutosFeitos: number;
  percCumprido: number; // 0-100, capado
}

// Últimas semanas COMPLETAS (não inclui a atual), mais recente primeiro — usado pelo Gustavo pra
// comparar ("semana passada: X%") e detectar tendência fraca (gerarMensagemGustavo em trilha-ui.ts
// decide os limiares). A META de cada semana passada usa a config ATUAL do Ciclo — mesma
// simplificação já adotada no resto do motor (não existe snapshot histórico de configCiclo em
// lugar nenhum do app); só o REALIZADO é histórico de verdade, vindo direto do calendário.
export function analisarHistoricoSemanas(params: {
  hoje?: string;
  trilha: TrilhaDinamicaState;
  configCiclo: EstudoConfigCiclo;
  calendario: Record<string, AtividadeCalendario[]>;
  maxSemanas?: number;
}): SemanaHistorico[] {
  const { trilha, configCiclo, calendario } = params;
  const hoje = params.hoje ?? dateKeyLocal();
  const maxSemanas = params.maxSemanas ?? 8;
  const minutosMeta = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);

  const resultado: SemanaHistorico[] = [];
  const cursor = parseDateKey(semanaAtual(hoje).inicio);
  for (let i = 0; i < maxSemanas; i++) {
    cursor.setDate(cursor.getDate() - 7);
    const inicioSemana = dateKeyLocal(cursor);
    if (inicioSemana < trilha.iniciadaEm) break;
    const fimData = new Date(cursor);
    fimData.setDate(fimData.getDate() + 6);
    const fimSemana = dateKeyLocal(fimData);
    const minutosFeitos = minutosEstudoNaSemana(calendario, inicioSemana, fimSemana);
    resultado.push({
      inicioSemana,
      fimSemana,
      minutosMeta,
      minutosFeitos,
      percCumprido: minutosMeta > 0 ? Math.min(100, Math.round((minutosFeitos / minutosMeta) * 100)) : 0,
    });
  }
  return resultado;
}

// ─── Estimativa de conclusão da trilha inteira ──────────────────────────────

// última página que conta como "conteúdo" do PDF — mesma regra de alvoLeituraPdf em
// biblioteca-utils.ts, reescrita aqui pra não puxar um import de componente pra dentro do motor
function alvoLeituraPdf(pdf: Pick<PdfEstudo, "totalPaginas" | "paginaConteudoFim">): number {
  return pdf.paginaConteudoFim ?? pdf.totalPaginas;
}

export interface EstimativaConclusao {
  paginasRestantes: number;
  horasLeituraRestante: number | null; // null = ainda sem páginas/hora suficiente pra estimar
  tarefasQuestoesRestantes: number;
  horasQuestoesRestante: number | null; // null = ainda sem tarefa de questões concluída pra tirar a média
  semanasRestantes: number | null; // null = falta dado em algum dos dois eixos, ou sem horas/semana configuradas
  dataPrevista: string | null; // dateKey
}

// Estimativa de quando a trilha INTEIRA termina (não só a semana corrente) — soma páginas de
// teoria que faltam ler em todos os PDFs das matérias ativas (dividido pela velocidade real de
// leitura, calcularPagPorHora) com o tempo estimado das tarefas de questões que ainda faltam
// (grupos A-D, checkpoints 7/30d do link e reforços imediatos — só os que têm link cadastrado;
// revisão de 30 questões de matéria concluída fica de fora de propósito, é rara e só acontece uma
// vez por matéria), tudo dividido pelo ritmo semanal configurado no Ciclo. Sem dado suficiente em
// algum dos dois eixos = "ainda calculando" em vez de inventar um número (mesmo espírito do
// fmtEta em biblioteca-utils.ts).
export function estimativaConclusaoTrilha(params: {
  hoje?: string;
  materiasAtivas: MateriaLike[];
  configCiclo: EstudoConfigCiclo;
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
}): EstimativaConclusao {
  const { materiasAtivas, configCiclo, topicos, calendario, pdfs } = params;
  const hoje = params.hoje ?? dateKeyLocal();
  const ativas = materiasAtivas.filter((m) => configCiclo.materias[m.nome]?.incluir);
  const nomesAtivos = new Set(ativas.map((m) => m.nome));

  // leitura: páginas de teoria que faltam em TODOS os PDFs das matérias ativas
  const paginasRestantes = pdfs
    .filter((p) => nomesAtivos.has(p.materia))
    .reduce((s, p) => s + Math.max(0, alvoLeituraPdf(p) - p.paginaAtual), 0);
  const pagPorHora = calcularPagPorHora(calendario);
  const horasLeituraRestante = pagPorHora !== null && pagPorHora > 0 ? paginasRestantes / pagPorHora : null;

  // questões: minutos totais já gastos em sessões tipo "questoes" / total de tarefas concluídas
  // (grupos A-D + checkpoints 7/30d + reforços imediatos, só contando quem tem link cadastrado
  // pros dois últimos — sem link, aquele checkpoint nunca vira tarefa de verdade), aplicado às
  // tarefas do mesmo tipo que ainda faltam
  let tarefasConcluidas = 0;
  let tarefasPendentes = 0;
  for (const m of ativas) {
    for (const topico of m.topicos) {
      const estado = topicos[topicoKey(m.nome, topico)];
      for (const grupo of GRUPOS_QUESTOES) {
        if (grupoFeito(estado, grupo)) tarefasConcluidas++;
        else tarefasPendentes++;
      }
      if (estado?.linkRevisao7d) {
        if (estado.revisoesLink?.d7) tarefasConcluidas++;
        else tarefasPendentes++;
      }
      if (estado?.linkRevisao30d) {
        if (estado.revisoesLink?.d30) tarefasConcluidas++;
        else tarefasPendentes++;
      }
      if (estado?.linkReforcoImediato) {
        if (estado.reforcoImediatoFeito) tarefasConcluidas++;
        else tarefasPendentes++;
      }
    }
  }

  const minutosQuestoesTotal = Object.values(calendario)
    .flat()
    .filter((a) => a.tipo === "questoes")
    .reduce((s, a) => s + a.duracao, 0);
  const mediaMinutosPorTarefa = tarefasConcluidas > 0 ? minutosQuestoesTotal / tarefasConcluidas : null;
  const horasQuestoesRestante = mediaMinutosPorTarefa !== null ? (mediaMinutosPorTarefa * tarefasPendentes) / 60 : null;

  const minutosSemana = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);
  const semanasRestantes =
    horasLeituraRestante !== null && horasQuestoesRestante !== null && minutosSemana > 0
      ? (horasLeituraRestante + horasQuestoesRestante) / (minutosSemana / 60)
      : null;

  let dataPrevista: string | null = null;
  if (semanasRestantes !== null) {
    const d = parseDateKey(hoje);
    d.setDate(d.getDate() + Math.ceil(semanasRestantes * 7));
    dataPrevista = dateKeyLocal(d);
  }

  return {
    paginasRestantes,
    horasLeituraRestante,
    tarefasQuestoesRestantes: tarefasPendentes,
    horasQuestoesRestante,
    semanasRestantes,
    dataPrevista,
  };
}

// estado inicial ao ativar a trilha
export function criarTrilhaDinamica(hoje: string = dateKeyLocal()): TrilhaDinamicaState {
  return {
    ativa: true,
    iniciadaEm: hoje,
    conclusaoMaterias: {},
    revisoes30Feitas: {},
    ancoraCartas: proximoDomingo(hoje),
    cartasFeitasEm: [],
  };
}
