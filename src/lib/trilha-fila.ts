import {
  calcularPagPorHora, calcularPerc, dateKeyLocal, topicoKey,
  type AtividadeCalendario, type Bloco, type ChecklistRevisaoLink, type EstudoConfigCiclo,
  type Grupo, type MetaAtividadeRef, type MetaPersistida, type NivelImportancia, type PdfEstudo,
  type TopicoState, type TrilhaDinamicaState,
} from "./estudo-data";
import {
  GRUPOS_QUESTOES, DIAS_REVISAO_MATERIA, LIMIAR_REFORCO_PERC, PAG_POR_HORA_PADRAO,
  MINUTOS_ESTIMADO_QUESTAO_PADRAO,
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
  // só em "teoria" quando o tópico tem PDF/página mapeada — id do PDF + o intervalo de página
  // DESTE pedaço específico (ver gerarChunksTeoria) pra: (a) "concluída" ser julgada pela posição
  // real de leitura (pdf.paginaAtual >= paginaFim), não pelo tópico inteiro; (b) a UI
  // (TabelaAtividades) expandir a linha numa checklist clicável de capítulo/subcapítulo quando o
  // PDF tem capítulos manuais mapeados, mesmo padrão que já existia em CorpoBloco antes desta
  // reforma (marcar/desmarcar direto da Trilha, sem abrir o leitor). Ausente = tópico sem PDF/
  // página mapeada nenhuma, ou já lido por completo mas ainda sem "Marcar como estudado" — cai no
  // fallback de sempre (1 atividade só, concluída = TopicoState.estudado).
  pdfId?: string;
  paginaInicio?: number;
  paginaFim?: number;
  todosCapitulos?: CapituloBlocoItem[];
}

// heurísticas de duração quando não há histórico real ainda pra tirar a média (documentadas como
// tal — não são calibradas por dado nenhum, diferente de PAG_POR_HORA_PADRAO/calcularPagPorHora).
// MINUTOS_ESTIMADO_QUESTAO_PADRAO mudou pra trilha-dinamica.ts (importado acima) — reaproveitado
// também por estimativaConclusaoTrilha lá.
export const MINUTOS_ESTIMADO_REVISAO30 = 60;
export const MINUTOS_ESTIMADO_CARTAS = 20;
export const MINUTOS_ESTIMADO_TEORIA_PADRAO = 60; // tópico sem PDF/página mapeada nenhuma

function resolverPdfDoTopico(materia: string, topico: string, pdfs: PdfEstudo[]): PdfEstudo | undefined {
  return pdfs.find((p) => p.materia === materia && (p.topicos?.includes(topico) ?? false));
}

// tamanho-alvo de UMA atividade de leitura — tópicos maiores que isso são fatiados em VÁRIAS
// atividades sequenciais (um pedaço de páginas/capítulos cada), pra a Meta poder intercalar com
// atividades de OUTRAS matérias em vez de exigir ler um tópico inteiro (às vezes 100+min) de uma
// vez só antes de tocar em qualquer outra coisa — mesmo espírito do "trecho do tamanho do dia" que
// o motor semanal antigo já fazia (resolverPaginaBloco/proximoBlocoCapitulos em
// trilha-dinamica.ts), só que aqui cada pedaço vira uma atividade PERSISTÍVEL própria (com id
// estável pelo intervalo de página), não um trecho recalculado do zero a cada render.
const MAX_MINUTOS_ATIVIDADE_TEORIA = 60;

interface ChunkTeoria {
  paginaInicio: number;
  paginaFim: number;
  titulo: string;
  minutosEstimados: number;
  todosCapitulos?: CapituloBlocoItem[]; // só os capítulos DESTE pedaço, pra checklist expansível
}

// fatia o que falta ler de UM tópico em pedaços de ~MAX_MINUTOS_ATIVIDADE_TEORIA cada, na ordem de
// leitura, começando de onde a página atual do PDF já parou (nunca reoferece o que já foi lido).
// Com capítulos manuais mapeados, agrupa capítulos/subcapítulos CONSECUTIVOS ainda não lidos (masmo
// critério de proximoBlocoCapitulos) — cada pedaço carrega os capítulos que o compõem, pra
// TabelaAtividades expandir a checklist. Sem capítulos, cai no intervalo de página mapeado pro
// tópico (intervalosPaginas) e fatia por PÁGINA pura. [] = nada mapeado, ou já lido por completo
// (o tópico continua na fila via o fallback de 1 atividade só, ver construirFilaGlobal).
function gerarChunksTeoria(
  pdf: PdfEstudo, topico: string, pagPorHora: number | null, capitulosConcluidos: string[]
): ChunkTeoria[] {
  const ritmo = pagPorHora && pagPorHora > 0 ? pagPorHora : PAG_POR_HORA_PADRAO;

  if ((pdf.capitulos?.length ?? 0) > 0) {
    const resolvidos = resolverCapitulos(pdf, capitulosConcluidos);
    const chunks: ChunkTeoria[] = [];
    let i = 0;
    while (i < resolvidos.length) {
      if (resolvidos[i].lido) { i++; continue; }
      const grupo: CapituloBlocoItem[] = [];
      let minutosAcumulados = 0;
      while (i < resolvidos.length && !resolvidos[i].lido) {
        const c = resolvidos[i];
        grupo.push({ ...c, indice: i + 1 });
        minutosAcumulados += ((c.paginaFim - c.paginaInicio + 1) / ritmo) * 60;
        i++;
        if (minutosAcumulados >= MAX_MINUTOS_ATIVIDADE_TEORIA) break;
      }
      const primeiro = grupo[0];
      const ultimo = grupo[grupo.length - 1];
      chunks.push({
        paginaInicio: primeiro.paginaInicio,
        paginaFim: ultimo.paginaFim,
        titulo: grupo.length > 1
          ? `${topico} — Capítulos ${primeiro.indice}-${ultimo.indice} de ${resolvidos.length}`
          : `${topico} — Capítulo ${primeiro.indice} de ${resolvidos.length}: ${primeiro.nome}`,
        minutosEstimados: Math.max(1, Math.round(minutosAcumulados)),
        todosCapitulos: grupo,
      });
    }
    return chunks;
  }

  const intervalo = pdf.intervalosPaginas?.find((t) => t.topico === topico);
  if (!intervalo) return [];
  const inicioReal = Math.max(intervalo.paginaInicio, pdf.paginaAtual + 1);
  if (inicioReal > intervalo.paginaFim) return [];
  const paginasPorChunk = Math.max(1, Math.round((MAX_MINUTOS_ATIVIDADE_TEORIA / 60) * ritmo));
  const totalPartes = Math.ceil((intervalo.paginaFim - inicioReal + 1) / paginasPorChunk);
  const chunks: ChunkTeoria[] = [];
  let inicio = inicioReal;
  let parte = 1;
  while (inicio <= intervalo.paginaFim) {
    const fim = Math.min(intervalo.paginaFim, inicio + paginasPorChunk - 1);
    chunks.push({
      paginaInicio: inicio,
      paginaFim: fim,
      titulo: totalPartes > 1 ? `${topico} — parte ${parte} de ${totalPartes}` : topico,
      minutosEstimados: Math.max(1, Math.round(((fim - inicio + 1) / ritmo) * 60)),
    });
    inicio = fim + 1;
    parte++;
  }
  return chunks;
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

    // teoria — tópicos grandes viram VÁRIOS itens (um por pedaço de ~60min de leitura, ver
    // gerarChunksTeoria), pra a Meta poder intercalar com outras matérias em vez de exigir ler um
    // tópico inteiro de uma vez. Cada pedaço carrega pdfId+paginaInicio/paginaFim (concluída =
    // posição real de leitura) e, quando o PDF tem capítulos manuais mapeados, os capítulos DESSE
    // pedaço (TabelaAtividades expande a linha numa checklist clicável). Sem PDF/página mapeada, ou
    // já lido por completo mas ainda sem "Marcar como estudado", cai no fallback de sempre: 1
    // atividade só, concluída = TopicoState.estudado.
    for (const topico of m.topicos) {
      const estado = topicos[topicoKey(m.nome, topico)];
      if (estado?.estudado) continue;
      const pdf = resolverPdfDoTopico(m.nome, topico, pdfs);
      const chunks = pdf ? gerarChunksTeoria(pdf, topico, pagPorHora, capitulosConcluidos) : [];
      if (chunks.length > 0) {
        for (const chunk of chunks) {
          fila.push({
            id: `t:${m.nome}:${topico}:${chunk.paginaInicio}-${chunk.paginaFim}`,
            tipo: "teoria",
            materia: m.nome,
            topico,
            titulo: chunk.titulo,
            relevancia: estado?.importancia,
            minutosEstimados: chunk.minutosEstimados,
            concluida: false,
            elegivelDesde: trilha.iniciadaEm,
            pdfId: pdf!.id,
            paginaInicio: chunk.paginaInicio,
            paginaFim: chunk.paginaFim,
            todosCapitulos: chunk.todosCapitulos,
          });
        }
        continue;
      }
      fila.push({
        id: `t:${m.nome}:${topico}`,
        tipo: "teoria",
        materia: m.nome,
        topico,
        titulo: topico,
        relevancia: estado?.importancia,
        minutosEstimados: MINUTOS_ESTIMADO_TEORIA_PADRAO,
        concluida: false,
        elegivelDesde: trilha.iniciadaEm,
        pdfId: pdf?.id,
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
    pdfId: a.pdfId, paginaInicio: a.paginaInicio, paginaFim: a.paginaFim,
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
  blocos: Record<string, Bloco>,
  pdfs: PdfEstudo[]
): { concluida: boolean; desempenhoPerc?: number } {
  const estado = ref.topico ? topicos[topicoKey(ref.materia, ref.topico)] : undefined;
  switch (ref.tipo as FilaAtividadeTipo) {
    case "teoria": {
      // atividade fatiada (pdfId+paginaFim) — concluída pela posição REAL de leitura desse pedaço,
      // não pelo tópico inteiro (ver gerarChunksTeoria). Sem essas duas, cai no fallback de sempre:
      // atividades antigas persistidas antes desta mudança, ou tópico sem PDF/página mapeada.
      if (ref.pdfId && ref.paginaFim !== undefined) {
        const pdf = pdfs.find((p) => p.id === ref.pdfId);
        if (pdf) return { concluida: pdf.paginaAtual >= ref.paginaFim };
      }
      return { concluida: !!estado?.estudado };
    }
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
  pdfs: PdfEstudo[];
  capitulosConcluidos?: string[];
}

// Hidrata a Meta atualmente aberta (se existir) com o estado ao vivo de cada atividade atribuída,
// calcula os 4 stats do card ("Meta N") e projeta quando a próxima deve liberar. Não grava nada —
// puro. undefined quando a trilha ainda não passou pelo motor de fila (ver
// avancarFilaMetasSeNecessario pro bootstrap).
export function computarMetaAtual(
  params: ParamsBaseFila
): { metaAtual: MetaAtual; proximaMeta: ProximaMetaPreview } | undefined {
  const hoje = params.hoje ?? dateKeyLocal();
  const { trilha, topicos, calendario, blocos, pdfs } = params;
  const capitulosConcluidos = params.capitulosConcluidos ?? [];
  if (!trilha.filaMetas) return undefined;
  const metaPersistida = trilha.filaMetas.metas[trilha.filaMetas.metaAtual];
  if (!metaPersistida) return undefined;

  const atividades: FilaAtividade[] = metaPersistida.atividades.map((ref) => {
    const { concluida, desempenhoPerc } = estaAtividadeConcluida(ref, topicos, trilha, blocos, pdfs);
    // recalcula a checklist de capítulos AO VIVO (nunca persistida) — só os capítulos dentro do
    // intervalo de página deste pedaço específico, filtrando o PDF inteiro pelos mesmos limites
    // gravados no ref (ver gerarChunksTeoria/paraRef)
    const pdf = ref.pdfId ? pdfs.find((p) => p.id === ref.pdfId) : undefined;
    const todosCapitulos = pdf && ref.paginaInicio !== undefined && ref.paginaFim !== undefined && (pdf.capitulos?.length ?? 0) > 0
      ? resolverCapitulos(pdf, capitulosConcluidos)
          .map((c, i) => ({ ...c, indice: i + 1 }))
          .filter((c) => c.paginaInicio >= ref.paginaInicio! && c.paginaFim <= ref.paginaFim!)
      : undefined;
    return {
      id: ref.id, tipo: ref.tipo as FilaAtividadeTipo, materia: ref.materia, topico: ref.topico,
      titulo: ref.titulo, relevancia: ref.relevancia, minutosEstimados: ref.minutosEstimados,
      link: ref.link, desempenhoPerc, concluida, elegivelDesde: metaPersistida.iniciadaEm,
      pdfId: ref.pdfId, paginaInicio: ref.paginaInicio, paginaFim: ref.paginaFim, todosCapitulos,
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

// Intercala refs por MATÉRIA (round-robin) — recebe já misturado carry-over + candidatos novos
// (ver abrirProximaMeta), com carry-over sempre na FRENTE da fila da PRÓPRIA matéria (prioridade
// preservada dentro dela), mas SEM travar a Meta inteira: outras matérias entram no rodízio desde
// a 1ª rodada. Sem isso, um carry-over grande (10+ pedaços de uma matéria só que nunca foi
// concluída) viraria de novo um bloco monolítico no início da Meta antes de qualquer outra matéria
// aparecer — foi exatamente o bug reportado: mesmo já fatiado, a Meta ficava "Língua Portuguesa,
// Língua Portuguesa, ..., só no final Matéria B" porque o carry-over era um prefixo fixo separado
// do rodízio. Resultado agora: atividade 1 da matéria A, 1 da B, 1 da C, ..., volta pra 2ª da A,
// 2ª da B — cobrindo várias matérias desde o início da Meta, carry-over ou não.
function intercalarPorMateria(porMateria: Map<string, MetaAtividadeRef[]>, ordem: string[]): MetaAtividadeRef[] {
  const resultado: MetaAtividadeRef[] = [];
  let restante = true;
  while (restante) {
    restante = false;
    for (const materia of ordem) {
      const lista = porMateria.get(materia)!;
      const proxima = lista.shift();
      if (proxima) {
        resultado.push(proxima);
        restante = true;
      }
    }
  }
  return resultado;
}

// Carry-over normalmente só REEMPACOTA a atividade como ela já estava (ver paraRef) — correto pra
// questões/reforço/revisão (ids estáveis, sem "fatiar" possível), mas ERRADO pra teoria: uma
// atividade de teoria "antiga" (persistida antes do fatiamento existir — sem pdfId/paginaFim, ver
// gerarChunksTeoria) ficaria carregando o MESMO bloco monolítico de Meta em Meta pra sempre, já que
// carry-over nunca reprocessa pela fila (bug real reportado pelo usuário: 10 atividades de Língua
// Portuguesa de 60-200min cada, arrastando IDÊNTICAS da Meta 1 até a Meta 3, porque cada
// "Finalize ou ignore" só reempacotava o que já estava lá). Aqui, todo carry-over de teoria SEM
// pdfId é refatiado NA HORA, como se fosse candidato novo — se o tópico tiver PDF/página mapeada
// resolvível agora, vira os chunks atuais (`origemCarryOver: true` preservado); senão (sem PDF
// nenhum, ou já 100% lido mas sem "Marcar como estudado") mantém como estava, sem mudança.
function refatiarCarryOverAntigo(
  carryOver: MetaAtividadeRef[], pdfs: PdfEstudo[], pagPorHora: number | null, capitulosConcluidos: string[]
): { atividades: MetaAtividadeRef[]; topicosRefatiados: Set<string> } {
  const atividades: MetaAtividadeRef[] = [];
  const topicosRefatiados = new Set<string>();
  for (const ref of carryOver) {
    if (ref.tipo !== "teoria" || ref.pdfId !== undefined || !ref.topico) {
      atividades.push(ref);
      continue;
    }
    const pdf = resolverPdfDoTopico(ref.materia, ref.topico, pdfs);
    const chunks = pdf ? gerarChunksTeoria(pdf, ref.topico, pagPorHora, capitulosConcluidos) : [];
    if (chunks.length === 0) {
      atividades.push(ref); // sem PDF resolvível ainda — mantém como estava
      continue;
    }
    topicosRefatiados.add(`${ref.materia}::${ref.topico}`);
    for (const chunk of chunks) {
      atividades.push({
        id: `t:${ref.materia}:${ref.topico}:${chunk.paginaInicio}-${chunk.paginaFim}`,
        tipo: "teoria", materia: ref.materia, topico: ref.topico, titulo: chunk.titulo,
        relevancia: ref.relevancia, minutosEstimados: chunk.minutosEstimados, origemCarryOver: true,
        pdfId: pdf!.id, paginaInicio: chunk.paginaInicio, paginaFim: chunk.paginaFim,
      });
    }
  }
  return { atividades, topicosRefatiados };
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
  const pagPorHora = calcularPagPorHora(calendario);
  const { atividades: carryOverProcessado, topicosRefatiados } = refatiarCarryOverAntigo(carryOver, pdfs, pagPorHora, capitulosConcluidos ?? []);
  // exclui da fila "nova" os tópicos que acabaram de ser refatiados a partir do carry-over — senão
  // os mesmos chunks apareceriam DUAS vezes (uma via carry-over refatiado, outra via candidato novo)
  const candidatosNovos = fila.filter(
    (a) => !idsJaAtribuidos.has(a.id) && !(a.topico && topicosRefatiados.has(`${a.materia}::${a.topico}`))
  );

  // pool por matéria pro rodízio: carry-over primeiro (prioridade dentro da própria matéria), só
  // depois os candidatos novos — mas TODAS as matérias entram no rodízio junto (ver
  // intercalarPorMateria), carry-over não bloqueia mais o resto da Meta
  const porMateria = new Map<string, MetaAtividadeRef[]>();
  const ordem: string[] = [];
  const addNaMateria = (materia: string, ref: MetaAtividadeRef) => {
    if (!porMateria.has(materia)) { porMateria.set(materia, []); ordem.push(materia); }
    porMateria.get(materia)!.push(ref);
  };
  for (const ref of carryOverProcessado) addNaMateria(ref.materia, ref);
  for (const a of candidatosNovos) addNaMateria(a.materia, paraRef(a, false));

  const candidatos = intercalarPorMateria(porMateria, ordem);

  const orcamentoMinutos = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);
  const numero = (trilha.filaMetas?.metaAtual ?? 0) + 1;

  const atividades: MetaAtividadeRef[] = [];
  let somaMinutos = 0;
  for (const ref of candidatos) {
    if (atividades.length > 0 && somaMinutos >= orcamentoMinutos) break;
    atividades.push(ref);
    somaMinutos += ref.minutosEstimados;
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

  const resultado = computarMetaAtual({
    hoje, trilha, configCiclo, topicos, calendario, blocos, pdfs, capitulosConcluidos: params.capitulosConcluidos,
  });
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
  const { trilha, configCiclo, topicos, calendario, blocos, pdfs } = params;

  if (!trilha.filaMetas) {
    return abrirProximaMeta({ ...params, hoje, carryOver: [] });
  }

  const metaAberta = trilha.filaMetas.metas[trilha.filaMetas.metaAtual];
  const resultado = computarMetaAtual({
    hoje, trilha, configCiclo, topicos, calendario, blocos, pdfs, capitulosConcluidos: params.capitulosConcluidos,
  });
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
