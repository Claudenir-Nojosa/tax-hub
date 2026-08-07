import {
  calcularPagPorHora, calcularPerc, dateKeyLocal, topicoKey,
  type AtividadeCalendario, type Bloco, type ChecklistRevisaoLink, type EstudoConfigCiclo,
  type Grupo, type MetaAtividadeRef, type MetaPersistida, type NivelImportancia, type PdfEstudo,
  type TopicoState, type TrilhaDinamicaState,
} from "./estudo-data";
import {
  GRUPOS_QUESTOES, DIAS_REVISAO_MATERIA, LIMIAR_REFORCO_PERC, PAG_POR_HORA_PADRAO,
  analisarMateria, analisarReforcos, analisarReforcosImediatos, analisarRevisoesLinkMateria,
  grupoFeito, resolverCapitulos, diffDias, parseDateKey, calcularMediaMinutosPorTarefaQuestoes,
  type CapituloBlocoItem, type MateriaLike,
} from "./trilha-dinamica";

// ─── Fila de atividades da Trilha, com Metas numeradas e carry-over ─────────
// Camada NOVA em cima do motor existente (trilha-dinamica.ts), que continua intacto e alimentando
// Dashboard/Gandalf/estimativa/aviso de meta no leitor (ver docs/estudo-trilha.md). Reaproveita as
// funções de análise por matéria SEM alterá-las — só normaliza a saída delas pro shape FilaAtividade.
//
// Dois conceitos que o motor antigo não tem: (1) fila global EXAUSTIVA (todo o edital, sempre
// derivada ao vivo — garante que nenhum tópico fica de fora); (2) fronteira de "Meta N" persistida
// (só os ids atribuídos, nunca um snapshot de conteúdo/desempenho) — é o que permite carry-over de
// verdade, revertendo a decisão "sem dívida acumulada" do motor semanal antigo (só pra esse
// conceito novo de Meta; o motor semanal em si não muda).

export type FilaAtividadeTipo =
  | "teoria" | "questoes" | "reforco" | "reforco_imediato"
  | "revisao_link" | "revisao_link_faltando" | "revisao_materia" | "cartas";

export interface FilaAtividade {
  id: string;
  tipo: FilaAtividadeTipo;
  materia: string;
  topico?: string; // ausente só em "cartas"
  titulo: string;
  relevancia?: NivelImportancia;
  minutosEstimados: number;
  link?: string;
  desempenhoPerc?: number;
  concluida: boolean;
  elegivelDesde: string; // dateKey
  // só em "teoria" quando o PDF do tópico tem capítulos manuais mapeados — a UI (TabelaAtividades)
  // expande a linha numa checklist clicável de capítulo/subcapítulo, mesmo padrão que já existia
  // em CorpoBloco antes desta reforma (marcar/desmarcar direto da Trilha, sem abrir o leitor)
  pdfId?: string;
  todosCapitulos?: CapituloBlocoItem[];
}

// heurísticas de duração quando não há histórico real ainda pra tirar a média (documentadas como
// tal — não são calibradas por dado nenhum, diferente de PAG_POR_HORA_PADRAO/calcularPagPorHora)
export const MINUTOS_ESTIMADO_QUESTAO_PADRAO = 20;
export const MINUTOS_ESTIMADO_REVISAO30 = 60;
export const MINUTOS_ESTIMADO_CARTAS = 20;
export const MINUTOS_ESTIMADO_TEORIA_PADRAO = 60; // tópico sem PDF/página mapeada nenhuma

function resolverPdfDoTopico(materia: string, topico: string, pdfs: PdfEstudo[]): PdfEstudo | undefined {
  return pdfs.find((p) => p.materia === materia && (p.topicos?.includes(topico) ?? false));
}

// páginas restantes de UM tópico (não o "próximo trecho" do motor antigo, que é limitado por um
// alvo de minutos — aqui é o tópico INTEIRO, já que a fila enumera atividades discretas e quem
// decide quanto cabe numa Meta é o orçamento, não o tamanho do trecho oferecido). Recebe o PDF já
// resolvido (não busca de novo) pra poder ser reaproveitado junto com todosCapitulos sem repetir
// o find() em pdfs.
function paginasRestantesTopico(
  pdf: PdfEstudo | undefined, topico: string, capitulosConcluidos: string[]
): number | null {
  if (!pdf) return null;
  if ((pdf.capitulos?.length ?? 0) > 0) {
    const resolvidos = resolverCapitulos(pdf, capitulosConcluidos);
    const restantes = resolvidos.filter((c) => !c.lido);
    if (restantes.length === 0) return 0;
    return restantes.reduce((s, c) => s + (c.paginaFim - c.paginaInicio + 1), 0);
  }
  const intervalo = pdf.intervalosPaginas?.find((t) => t.topico === topico);
  if (!intervalo) return null;
  return Math.max(0, intervalo.paginaFim - Math.max(intervalo.paginaInicio - 1, pdf.paginaAtual));
}

function estimarMinutosTeoria(
  pdf: PdfEstudo | undefined, topico: string, pagPorHora: number | null, capitulosConcluidos: string[]
): number {
  const paginas = paginasRestantesTopico(pdf, topico, capitulosConcluidos);
  if (paginas === null || paginas <= 0) return MINUTOS_ESTIMADO_TEORIA_PADRAO;
  const ritmo = pagPorHora && pagPorHora > 0 ? pagPorHora : PAG_POR_HORA_PADRAO;
  return Math.max(1, Math.round((paginas / ritmo) * 60));
}

// Enumeração EXAUSTIVA do edital inteiro em unidades discretas — mesmo espírito do loop já
// existente em estimativaConclusaoTrilha (trilha-dinamica.ts), que já soma tarefas pendentes
// tópico a tópico sem pular nada. Só devolve o que está ELEGÍVEL E PENDENTE agora (mesma lógica de
// liberação escalonada de sempre, reempacotada) — teoria e questões A-D cobrem 100% dos tópicos de
// qualquer matéria ativa; a única lacuna real (tópicos sem Bloco/link de revisão) vira o item
// acionável "revisao_link_faltando" em vez de desaparecer silenciosamente.
export function construirFilaGlobal(params: {
  hoje?: string;
  materiasAtivas: MateriaLike[];
  configCiclo: EstudoConfigCiclo;
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
  blocos: Record<string, Bloco>;
  trilha: TrilhaDinamicaState;
  capitulosConcluidos?: string[];
}): FilaAtividade[] {
  const hoje = params.hoje ?? dateKeyLocal();
  const { materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos, trilha } = params;
  const capitulosConcluidos = params.capitulosConcluidos ?? [];
  const ativas = materiasAtivas.filter((m) => configCiclo.materias[m.nome]?.incluir);
  const pagPorHora = calcularPagPorHora(calendario);

  // média de minutos por tarefa de questões (mesma conta que estimativaConclusaoTrilha já faz) —
  // conta tarefas concluídas GLOBALMENTE antes de montar a fila
  let tarefasConcluidasGlobal = 0;
  for (const m of ativas) {
    for (const topico of m.topicos) {
      const estado = topicos[topicoKey(m.nome, topico)];
      for (const grupo of GRUPOS_QUESTOES) if (grupoFeito(estado, grupo)) tarefasConcluidasGlobal++;
    }
  }
  const mediaMinutosQuestao =
    calcularMediaMinutosPorTarefaQuestoes(calendario, tarefasConcluidasGlobal) ?? MINUTOS_ESTIMADO_QUESTAO_PADRAO;

  const fila: FilaAtividade[] = [];

  for (const m of ativas) {
    const analise = analisarMateria(m, topicos);
    const blocosDaMateria = Object.values(blocos).filter((b) => b.materia === m.nome);
    const topicosCobertosPorBloco = new Set(blocosDaMateria.flatMap((b) => b.topicos));

    // teoria — um item por tópico ainda não estudado. Quando o PDF do tópico tem capítulos
    // manuais mapeados, anexa todosCapitulos (histórico completo, lidos + pendentes — mesma lista
    // que CorpoBloco já mostrava antes desta reforma) pra TabelaAtividades expandir a linha numa
    // checklist clicável, sem precisar abrir o leitor pra marcar um capítulo já lido.
    for (const topico of m.topicos) {
      const estado = topicos[topicoKey(m.nome, topico)];
      if (estado?.estudado) continue;
      const pdf = resolverPdfDoTopico(m.nome, topico, pdfs);
      const todosCapitulos = pdf && (pdf.capitulos?.length ?? 0) > 0
        ? resolverCapitulos(pdf, capitulosConcluidos).map((c, i) => ({ ...c, indice: i + 1 }))
        : undefined;
      fila.push({
        id: `t:${m.nome}:${topico}`,
        tipo: "teoria",
        materia: m.nome,
        topico,
        titulo: topico,
        relevancia: estado?.importancia,
        minutosEstimados: estimarMinutosTeoria(pdf, topico, pagPorHora, capitulosConcluidos),
        concluida: false,
        elegivelDesde: trilha.iniciadaEm,
        pdfId: pdf?.id,
        todosCapitulos,
      });
    }

    // questões liberadas (grupos A-D, escalonamento de sempre via analisarMateria)
    for (const q of analise.questoesLiberadas) {
      fila.push({
        id: q.id,
        tipo: "questoes",
        materia: m.nome,
        topico: q.topico,
        titulo: `Grupo ${q.grupo} — ${q.topico}`,
        relevancia: topicos[topicoKey(m.nome, q.topico)]?.importancia,
        minutosEstimados: mediaMinutosQuestao,
        concluida: false,
        elegivelDesde: hoje,
      });
    }

    // reforço A-D (desempenho fraco, já esfriado)
    for (const r of analisarReforcos(m, topicos, hoje)) {
      fila.push({
        id: r.id,
        tipo: "reforco",
        materia: m.nome,
        topico: r.topico,
        titulo: `Reforço Grupo ${r.grupo} — ${r.topico}`,
        relevancia: topicos[topicoKey(m.nome, r.topico)]?.importancia,
        minutosEstimados: mediaMinutosQuestao,
        desempenhoPerc: r.perc,
        concluida: false,
        elegivelDesde: hoje,
      });
    }

    // reforço rápido pós-estudo
    for (const ri of analisarReforcosImediatos(m, topicos)) {
      fila.push({
        id: ri.id,
        tipo: "reforco_imediato",
        materia: m.nome,
        topico: ri.topico,
        titulo: `Reforço rápido — ${ri.topico}`,
        relevancia: topicos[topicoKey(m.nome, ri.topico)]?.importancia,
        minutosEstimados: mediaMinutosQuestao,
        link: ri.link,
        concluida: false,
        elegivelDesde: hoje,
      });
    }

    // revisão de link — Blocos + tópicos soltos com link próprio
    for (const rl of analisarRevisoesLinkMateria(m, topicos, blocos, hoje)) {
      fila.push({
        id: rl.id,
        tipo: "revisao_link",
        materia: m.nome,
        topico: rl.topico,
        titulo: `Revisão ${rl.dias}d — ${rl.topico}`,
        relevancia: topicos[topicoKey(m.nome, rl.topico)]?.importancia,
        minutosEstimados: mediaMinutosQuestao,
        link: rl.link,
        concluida: false,
        elegivelDesde: hoje,
      });
    }

    // tópicos SEM Bloco e SEM link próprio, mas com os 4 grupos completos — garantia de cobertura:
    // vira um item acionável em vez de desaparecer silenciosamente (ver "Opção A" no plano)
    for (const topico of m.topicos) {
      if (topicosCobertosPorBloco.has(topico)) continue;
      const estado = topicos[topicoKey(m.nome, topico)];
      if (!estado || estado.revisaoLinkDispensada) continue;
      if (estado.linkRevisao7d || estado.linkRevisao30d) continue;
      if (!GRUPOS_QUESTOES.every((g) => grupoFeito(estado, g))) continue;
      fila.push({
        id: `rlf:${m.nome}:${topico}`,
        tipo: "revisao_link_faltando",
        materia: m.nome,
        topico,
        titulo: `Cadastre o link de revisão — falta cobertura (${topico})`,
        relevancia: estado.importancia,
        minutosEstimados: 5,
        concluida: false,
        elegivelDesde: hoje,
      });
    }

    // revisão de matéria (30 questões), DIAS_REVISAO_MATERIA dias após a matéria bater 100%
    const dataConclusao = trilha.conclusaoMaterias[m.nome];
    if (dataConclusao && diffDias(dataConclusao, hoje) >= DIAS_REVISAO_MATERIA) {
      const feitas = trilha.revisoes30Feitas[m.nome] ?? [];
      if (feitas.length === 0) {
        fila.push({
          id: `r30:${m.nome}`,
          tipo: "revisao_materia",
          materia: m.nome,
          titulo: `Revisão de matéria — ${m.nome}`,
          minutosEstimados: MINUTOS_ESTIMADO_REVISAO30,
          link: configCiclo.materias[m.nome]?.linkRevisaoMateria,
          concluida: false,
          elegivelDesde: dataConclusao,
        });
      }
    }
  }

  // cartas — atividade global (não por matéria), mesma regra de sempre: domingos a cada 14 dias
  // da âncora
  const dif = diffDias(trilha.ancoraCartas, hoje);
  const ehDomingoCartas = parseDateKey(hoje).getDay() === 0 && dif >= 0 && dif % 14 === 0;
  const cartasFeitaHoje =
    trilha.cartasFeitasEm.includes(hoje) || (calendario[hoje] ?? []).some((a) => a.tipo === "cartas");
  if (ehDomingoCartas && !cartasFeitaHoje) {
    fila.push({
      id: `cartas:${hoje}`,
      tipo: "cartas",
      materia: "Cartas",
      titulo: "Revisão das cartas",
      minutosEstimados: MINUTOS_ESTIMADO_CARTAS,
      concluida: false,
      elegivelDesde: hoje,
    });
  }

  return fila;
}

// ─── Metas: fronteira persistida + carry-over ───────────────────────────────

function paraRef(a: FilaAtividade, origemCarryOver: boolean): MetaAtividadeRef {
  return {
    id: a.id, tipo: a.tipo, materia: a.materia, topico: a.topico, titulo: a.titulo,
    relevancia: a.relevancia, minutosEstimados: a.minutosEstimados, link: a.link, origemCarryOver,
  };
}

// "concluída" e "desempenho %" de uma atividade JÁ ATRIBUÍDA a uma Meta, sempre recalculados ao
// vivo (nunca lidos de um snapshot congelado) — usa os mesmos ids estáveis que os analisadores do
// motor antigo já geram (q:/r:/ri:/rl: — ver trilha-dinamica.ts) pra extrair grupo/checkpoint do
// sufixo do id sem precisar re-varrer a fila inteira.
function estaAtividadeConcluida(
  ref: MetaAtividadeRef,
  topicos: Record<string, TopicoState>,
  trilha: TrilhaDinamicaState,
  blocos: Record<string, Bloco>
): { concluida: boolean; desempenhoPerc?: number } {
  const estado = ref.topico ? topicos[topicoKey(ref.materia, ref.topico)] : undefined;
  switch (ref.tipo as FilaAtividadeTipo) {
    case "teoria":
      return { concluida: !!estado?.estudado };
    case "questoes": {
      const grupo = ref.id.split(":").pop() as Grupo;
      const c = estado?.cadernos[grupo];
      const feito = !!c && c.acertos + c.erros > 0;
      return { concluida: feito, desempenhoPerc: feito ? calcularPerc(c!.acertos, c!.erros) : undefined };
    }
    case "reforco": {
      const grupo = ref.id.split(":").pop() as Grupo;
      const c = estado?.cadernos[grupo];
      const feito = !!c && c.acertos + c.erros > 0;
      const perc = feito ? calcularPerc(c!.acertos, c!.erros) : undefined;
      // um reforço só "conclui" quando o desempenho volta pra cima do limiar — refazer e continuar
      // fraco mantém a atividade pendente (vai voltar a aparecer como reforço depois do cooldown)
      return { concluida: perc !== undefined && perc >= LIMIAR_REFORCO_PERC, desempenhoPerc: perc };
    }
    case "reforco_imediato":
      return { concluida: !!estado?.reforcoImediatoFeito };
    case "revisao_link": {
      const partes = ref.id.split(":");
      const checkpoint = partes[partes.length - 1] as ChecklistRevisaoLink;
      if (partes[1] === "bloco") {
        const bloco = blocos[partes[2]];
        const registro = bloco?.revisoesLink?.[checkpoint];
        return { concluida: !!registro, desempenhoPerc: registro ? calcularPerc(registro.acertos, registro.erros) : undefined };
      }
      const registro = estado?.revisoesLink?.[checkpoint];
      return { concluida: !!registro, desempenhoPerc: registro ? calcularPerc(registro.acertos, registro.erros) : undefined };
    }
    case "revisao_link_faltando":
      return { concluida: !!(estado?.linkRevisao7d || estado?.linkRevisao30d || estado?.revisaoLinkDispensada) };
    case "revisao_materia":
      return { concluida: (trilha.revisoes30Feitas[ref.materia] ?? []).length > 0 };
    case "cartas": {
      const data = ref.id.split(":")[1];
      return { concluida: trilha.cartasFeitasEm.includes(data) };
    }
    default:
      return { concluida: false };
  }
}

export interface MetaAtual {
  numero: number;
  iniciadaEm: string;
  orcamentoMinutos: number;
  atividades: FilaAtividade[]; // hidratadas — concluida/desempenhoPerc sempre ao vivo
  concluidas: number;
  total: number;
  desempenhoPerc: number | null; // agregado das atividades de questão/revisão CONCLUÍDAS na Meta
  horasEstudadas: number; // horas logadas no calendário desde iniciadaEm até hoje
  questoesResolvidas: number; // soma de acertos+erros das atividades de questão concluídas na Meta
  mediaHorasDiaria: number;
  fechavel: boolean; // concluidas === total (e total > 0)
}

export interface ProximaMetaPreview {
  numero: number;
  liberadaEmProjetada: string | null; // null = sem estimativa ainda (nenhuma atividade concluída)
}

interface ParamsBaseFila {
  hoje?: string;
  trilha: TrilhaDinamicaState;
  configCiclo: EstudoConfigCiclo;
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  blocos: Record<string, Bloco>;
}

// Hidrata a Meta atualmente aberta (se existir) com o estado ao vivo de cada atividade atribuída,
// calcula os 4 stats do card ("Meta N") e projeta quando a próxima deve liberar. Não grava nada —
// puro. undefined quando a trilha ainda não passou pelo motor de fila (ver
// avancarFilaMetasSeNecessario pro bootstrap).
export function computarMetaAtual(
  params: ParamsBaseFila
): { metaAtual: MetaAtual; proximaMeta: ProximaMetaPreview } | undefined {
  const hoje = params.hoje ?? dateKeyLocal();
  const { trilha, topicos, calendario, blocos } = params;
  if (!trilha.filaMetas) return undefined;
  const metaPersistida = trilha.filaMetas.metas[trilha.filaMetas.metaAtual];
  if (!metaPersistida) return undefined;

  const atividades: FilaAtividade[] = metaPersistida.atividades.map((ref) => {
    const { concluida, desempenhoPerc } = estaAtividadeConcluida(ref, topicos, trilha, blocos);
    return {
      id: ref.id, tipo: ref.tipo as FilaAtividadeTipo, materia: ref.materia, topico: ref.topico,
      titulo: ref.titulo, relevancia: ref.relevancia, minutosEstimados: ref.minutosEstimados,
      link: ref.link, desempenhoPerc, concluida, elegivelDesde: metaPersistida.iniciadaEm,
    };
  });

  const concluidas = atividades.filter((a) => a.concluida).length;
  const total = atividades.length;

  const desempenhos = atividades.filter((a) => a.concluida && a.desempenhoPerc !== undefined).map((a) => a.desempenhoPerc!);
  const desempenhoPerc = desempenhos.length > 0 ? Math.round(desempenhos.reduce((s, v) => s + v, 0) / desempenhos.length) : null;

  const horasEstudadas = Object.entries(calendario)
    .filter(([data]) => data >= metaPersistida.iniciadaEm && data <= hoje)
    .flatMap(([, ativs]) => ativs)
    .reduce((s, a) => s + a.duracao, 0) / 60;

  const questoesResolvidas = atividades
    .filter((a) => a.concluida && (a.tipo === "questoes" || a.tipo === "reforco"))
    .reduce((s, a) => {
      const grupo = a.id.split(":").pop() as Grupo;
      const estado = a.topico ? topicos[topicoKey(a.materia, a.topico)] : undefined;
      const c = estado?.cadernos[grupo];
      return s + (c ? c.acertos + c.erros : 0);
    }, 0);

  const diasDecorridos = Math.max(1, diffDias(metaPersistida.iniciadaEm, hoje) + 1);
  const mediaHorasDiaria = horasEstudadas / diasDecorridos;

  const metaAtual: MetaAtual = {
    numero: metaPersistida.numero, iniciadaEm: metaPersistida.iniciadaEm,
    orcamentoMinutos: metaPersistida.orcamentoMinutos, atividades,
    concluidas, total, desempenhoPerc, horasEstudadas, questoesResolvidas, mediaHorasDiaria,
    fechavel: total > 0 && concluidas === total,
  };

  // projeção honesta (mesmo espírito de estimativaConclusaoTrilha.dataPrevista) via throughput
  // real — nenhuma atividade concluída ainda = sem base pra projetar, não inventa uma data
  let liberadaEmProjetada: string | null = null;
  if (concluidas > 0 && concluidas < total) {
    const atividadesPorDia = concluidas / diasDecorridos;
    const diasRestantes = Math.ceil((total - concluidas) / atividadesPorDia);
    const d = parseDateKey(hoje);
    d.setDate(d.getDate() + diasRestantes);
    liberadaEmProjetada = dateKeyLocal(d);
  } else if (total > 0 && concluidas === total) {
    liberadaEmProjetada = hoje; // fechável agora
  }

  return { metaAtual, proximaMeta: { numero: metaPersistida.numero + 1, liberadaEmProjetada } };
}

interface ParamsAbrirMeta {
  hoje?: string;
  trilha: TrilhaDinamicaState;
  configCiclo: EstudoConfigCiclo;
  materiasAtivas: MateriaLike[];
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  pdfs: PdfEstudo[];
  blocos: Record<string, Bloco>;
  capitulosConcluidos?: string[];
}

// Algoritmo de abertura da Meta N+1, compartilhado entre avancarFilaMetasSeNecessario (fechamento
// por conclusão) e finalizarMetaManualmente (fechamento manual) — só muda o que entra em
// `carryOver`. Sempre inclui pelo menos 1 atividade quando há trabalho pendente (nunca abre uma
// Meta vazia), mesmo que ela sozinha estoure o orçamento.
function abrirProximaMeta(params: ParamsAbrirMeta & { carryOver: MetaAtividadeRef[] }): TrilhaDinamicaState {
  const hoje = params.hoje ?? dateKeyLocal();
  const { trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, blocos, carryOver, capitulosConcluidos } = params;

  const fila = construirFilaGlobal({ hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos, trilha, capitulosConcluidos });
  const idsJaAtribuidos = new Set(
    Object.values(trilha.filaMetas?.metas ?? {}).flatMap((m) => m.atividades.map((a) => a.id))
  );
  const candidatosNovos = fila.filter((a) => !idsJaAtribuidos.has(a.id));

  const orcamentoMinutos = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);
  const numero = (trilha.filaMetas?.metaAtual ?? 0) + 1;

  const atividades: MetaAtividadeRef[] = [...carryOver];
  let somaMinutos = carryOver.reduce((s, ref) => s + ref.minutosEstimados, 0);
  for (const a of candidatosNovos) {
    if (atividades.length > 0 && somaMinutos >= orcamentoMinutos) break;
    atividades.push(paraRef(a, false));
    somaMinutos += a.minutosEstimados;
  }

  const novaMeta: MetaPersistida = { numero, iniciadaEm: hoje, orcamentoMinutos, atividades };
  const metasAnteriores = trilha.filaMetas?.metas ?? {};
  return { ...trilha, filaMetas: { metaAtual: numero, metas: { ...metasAnteriores, [numero]: novaMeta } } };
}

// Efeito colateral explícito (chamar de um useEffect, mesmo padrão do bookkeeping de
// conclusaoMaterias que já existe em TrilhaTab.tsx) — bootstrap da Meta 1 quando a trilha nunca
// passou pelo motor de fila, e promoção automática pra Meta N+1 quando a atual está `fechavel`
// (todas as atividades concluídas). NÃO promove sozinho enquanto sobrar pendência — pra isso é o
// botão manual (finalizarMetaManualmente). undefined = nada a fazer.
export function avancarFilaMetasSeNecessario(params: ParamsAbrirMeta): TrilhaDinamicaState | undefined {
  const hoje = params.hoje ?? dateKeyLocal();
  const { trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs, blocos } = params;

  if (!trilha.filaMetas) {
    return abrirProximaMeta({ ...params, hoje, carryOver: [] });
  }

  const metaAberta = trilha.filaMetas.metas[trilha.filaMetas.metaAtual];
  if (!metaAberta || metaAberta.fechadaEm) return undefined;

  const resultado = computarMetaAtual({ hoje, trilha, configCiclo, topicos, calendario, blocos });
  if (!resultado || !resultado.metaAtual.fechavel) return undefined;

  const trilhaComMetaFechada: TrilhaDinamicaState = {
    ...trilha,
    filaMetas: {
      ...trilha.filaMetas,
      metas: { ...trilha.filaMetas.metas, [metaAberta.numero]: { ...metaAberta, fechadaEm: hoje } },
    },
  };
  // fechada por conclusão total (fechavel) — nada pendente, carryOver vazio
  return abrirProximaMeta({ ...params, trilha: trilhaComMetaFechada, hoje, carryOver: [] });
}

// Botão "Finalize ou ignore as atividades da meta atual" — fecha a Meta aberta MESMO com
// pendências (fechamentoManual: true) e já abre a próxima na mesma chamada, pra UI responder no
// clique sem esperar o próximo useEffect. Pendências viram carry-over automático — nunca são
// deletadas, só deixam de bloquear o avanço.
export function finalizarMetaManualmente(params: ParamsAbrirMeta): TrilhaDinamicaState {
  const hoje = params.hoje ?? dateKeyLocal();
  const { trilha, configCiclo, topicos, calendario, blocos } = params;

  if (!trilha.filaMetas) {
    return abrirProximaMeta({ ...params, hoje, carryOver: [] });
  }

  const metaAberta = trilha.filaMetas.metas[trilha.filaMetas.metaAtual];
  const resultado = computarMetaAtual({ hoje, trilha, configCiclo, topicos, calendario, blocos });
  const carryOver: MetaAtividadeRef[] = (resultado?.metaAtual.atividades ?? [])
    .filter((a) => !a.concluida)
    .map((a) => paraRef(a, true));

  const trilhaComMetaFechada: TrilhaDinamicaState = metaAberta
    ? {
        ...trilha,
        filaMetas: {
          ...trilha.filaMetas,
          metas: {
            ...trilha.filaMetas.metas,
            [metaAberta.numero]: { ...metaAberta, fechadaEm: hoje, fechamentoManual: true },
          },
        },
      }
    : trilha;

  return abrirProximaMeta({ ...params, trilha: trilhaComMetaFechada, hoje, carryOver });
}
