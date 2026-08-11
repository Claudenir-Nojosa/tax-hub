import {
  calcularPagPorHora, calcularPerc, dateKeyLocal, defaultTopicoState, topicoKey,
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
  | "revisao_link" | "revisao_link_faltando" | "revisao_materia" | "reforco_materia" | "cartas";

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
  // só em "teoria" fatiada (pdfId+paginaInicio/paginaFim presentes) — minutos já lidos DESTE
  // pedaço, derivados da posição real do PDF (pdf.paginaAtual) no ritmo de leitura AO VIVO do
  // usuário (não o ritmo congelado no momento em que o pedaço foi criado) — por isso pode passar
  // de `minutosEstimados` (o usuário lendo mais devagar do que a estimativa original previu não é
  // um bug, é sinal real: ver TabelaAtividades, que mostra "feito/estimado" e libera a próxima
  // atividade da cadeia quando feito >= estimado, mesmo sem a atividade estar concluída).
  minutosFeitos?: number;
}

// heurísticas de duração quando não há histórico real ainda pra tirar a média (documentadas como
// tal — não são calibradas por dado nenhum, diferente de PAG_POR_HORA_PADRAO/calcularPagPorHora).
// MINUTOS_ESTIMADO_QUESTAO_PADRAO mudou pra trilha-dinamica.ts (importado acima) — reaproveitado
// também por estimativaConclusaoTrilha lá.
export const MINUTOS_ESTIMADO_REVISAO30 = 60;
export const MINUTOS_ESTIMADO_CARTAS = 20;
export const MINUTOS_ESTIMADO_TEORIA_PADRAO = 60; // tópico sem PDF/página mapeada nenhuma
// reforço geral de matéria — 20 questões a ~2min cada (mesma taxa de MINUTOS_ESTIMADO_QUESTAO_PADRAO)
export const MINUTOS_ESTIMADO_REFORCO_MATERIA = 40;
export const QUESTOES_REFORCO_MATERIA = 20;
// nº mínimo de questões respondidas na matéria (soma de todos os cadernos A-D de todos os tópicos)
// antes de julgar o aproveitamento agregado — sem isso, 2-3 questões erradas no começo já dispararia
// o reforço com uma amostra pequena demais pra significar algo
const MINIMO_QUESTOES_REFORCO_MATERIA = 20;

// teto/piso de QUANTIDADE de atividades por Meta — cada Meta representa ~1 semana de trabalho
// (calendário-fixo: Meta 1 = semana 1, Meta 2 = semana 2, mas só ABRE quando a anterior fecha, ver
// avancarFilaMetasSeNecessario). orcamentoMinutos sozinho não é teto suficiente: no dia 1 (nada
// lido ainda), praticamente TODO tópico de TODA matéria tem sua 1ª atividade elegível ao mesmo
// tempo, e pedaços de teoria já lidos-quase-todo (carry-over refatiado) podem ter só alguns minutos
// cada — sem um teto de contagem, a Meta engolia a fila inteira (caso real: 281 atividades numa
// Meta só) antes de bater o orçamento de minutos. META_ATIVIDADES_MIN garante ATÉ 15 mesmo que o
// orçamento configurado seja folgado; META_ATIVIDADES_MAX é o teto duro, nunca ultrapassado.
const META_ATIVIDADES_MIN = 10;
const META_ATIVIDADES_MAX = 15;

// exportado pra page.tsx (bookkeeping de "Marcar como estudado" automático — ver
// avancarEstudoAutomaticoSeNecessario) reaproveitar sem duplicar a lógica de resolução de PDF
export function resolverPdfDoTopico(materia: string, topico: string, pdfs: PdfEstudo[]): PdfEstudo | undefined {
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
// exportado (além do uso interno em construirFilaGlobal) pra page.tsx conseguir checar "sobrou
// alguma coisa pra ler desse tópico?" (chunks.length === 0) sem duplicar a lógica de resolução de
// capítulo/página — ver avancarEstudoAutomaticoSeNecessario
export function gerarChunksTeoria(
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
        // páginas que REALMENTE faltam desse capítulo — não o span inteiro dele. Só o PRIMEIRO
        // capítulo não lido de todos pode estar pela metade (pdf.paginaAtual é um ponteiro único
        // e linear); os de depois nunca foram tocados, então a conta já reduz sozinha pro span
        // inteiro deles. Sem isso, um capítulo de 42 páginas com só 5 restantes (usuário já leu
        // as outras 37) estimava 84min em vez dos ~10min reais.
        const paginasRestantesDoCapitulo = c.paginaFim - Math.max(c.paginaInicio - 1, pdf.paginaAtual);
        minutosAcumulados += (paginasRestantesDoCapitulo / ritmo) * 60;
        i++;
        if (minutosAcumulados >= MAX_MINUTOS_ATIVIDADE_TEORIA) break;
      }
      const primeiro = grupo[0];
      const ultimo = grupo[grupo.length - 1];
      chunks.push({
        // Math.max: se o 1º capítulo do pedaço está pela metade, abre exatamente de onde parou —
        // não no início nominal dele (senão o clique levaria pra trás, pra página já lida)
        paginaInicio: Math.max(primeiro.paginaInicio, pdf.paginaAtual + 1),
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

    // reforço geral de matéria — aproveitamento agregado (todos os cadernos A-D de todos os
    // tópicos) abaixo de LIMIAR_REFORCO_PERC, com amostra mínima (MINIMO_QUESTOES_REFORCO_MATERIA)
    // pra não disparar com 2-3 questões erradas no começo. One-shot por matéria (mesmo espírito de
    // revisão de matéria) — feito o bloco de 20 questões (registrado na aba Questões, ver
    // trilha.reforcosMateria), não reaparece pra essa matéria.
    if (!trilha.reforcosMateria?.[m.nome]) {
      let acertosMateria = 0;
      let totalMateria = 0;
      for (const topico of m.topicos) {
        const estado = topicos[topicoKey(m.nome, topico)];
        if (!estado) continue;
        for (const grupo of GRUPOS_QUESTOES) {
          const c = estado.cadernos[grupo];
          acertosMateria += c.acertos;
          totalMateria += c.acertos + c.erros;
        }
      }
      if (totalMateria >= MINIMO_QUESTOES_REFORCO_MATERIA) {
        const percMateria = calcularPerc(acertosMateria, totalMateria - acertosMateria);
        if (percMateria < LIMIAR_REFORCO_PERC) {
          fila.push({
            id: `rm:${m.nome}`,
            tipo: "reforco_materia",
            materia: m.nome,
            titulo: `Reforço geral — ${m.nome} (${percMateria}% de aproveitamento, ${QUESTOES_REFORCO_MATERIA} questões)`,
            minutosEstimados: MINUTOS_ESTIMADO_REFORCO_MATERIA,
            link: configCiclo.materias[m.nome]?.linkRevisaoMateria,
            desempenhoPerc: percMateria,
            concluida: false,
            elegivelDesde: hoje,
          });
        }
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
// `ref.paginaFim` é um snapshot CONGELADO no momento em que o pedaço de teoria foi montado (ver
// gerarChunksTeoria) — se o usuário editou paginaConteudoFim/capítulos DEPOIS (cadastro de
// currículo é contínuo, normal editar um PDF que já está em uma Meta), o boundary congelado pode
// sobrar além do conteúdo real (ex.: sem paginaConteudoFim definido ainda na hora da montagem, o
// fallback foi pdf.totalPaginas — que inclui as páginas de QUESTÕES do PDF, não só a teoria). Sem
// isso, a atividade fica presa pra sempre mesmo com o usuário tendo lido 100% da teoria de fato
// (caso real: precisava chegar na pág. 164 — fim do PDF inteiro — quando o conteúdo de teoria
// termina na 63). Nunca exige ler além do que EXISTE HOJE como conteúdo daquele tópico.
function paginaFimEfetiva(ref: { paginaFim?: number }, pdf: Pick<PdfEstudo, "paginaConteudoFim" | "totalPaginas">): number | undefined {
  if (ref.paginaFim === undefined) return undefined;
  return Math.min(ref.paginaFim, pdf.paginaConteudoFim ?? pdf.totalPaginas);
}

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
        const limite = pdf ? paginaFimEfetiva(ref, pdf) : undefined;
        if (pdf && limite !== undefined) return { concluida: pdf.paginaAtual >= limite };
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
    case "reforco_materia": {
      const registro = trilha.reforcosMateria?.[ref.materia];
      return { concluida: !!registro, desempenhoPerc: registro ? calcularPerc(registro.acertos, registro.erros) : undefined };
    }
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

  const pagPorHoraAoVivo = calcularPagPorHora(calendario);
  const ritmoAoVivo = pagPorHoraAoVivo && pagPorHoraAoVivo > 0 ? pagPorHoraAoVivo : PAG_POR_HORA_PADRAO;

  const atividades: FilaAtividade[] = metaPersistida.atividades.map((ref) => {
    const { concluida, desempenhoPerc } = estaAtividadeConcluida(ref, topicos, trilha, blocos, pdfs);
    // recalcula a checklist de capítulos AO VIVO (nunca persistida) — só os capítulos dentro do
    // intervalo de página deste pedaço específico, filtrando o PDF inteiro pelos mesmos limites
    // gravados no ref (ver gerarChunksTeoria/paraRef)
    const pdf = ref.pdfId ? pdfs.find((p) => p.id === ref.pdfId) : undefined;
    // limite EFETIVO (nunca além do conteúdo real hoje — ver paginaFimEfetiva) — o ref.paginaFim
    // congelado pode ter sobrado de antes de paginaConteudoFim/capítulos serem editados
    const limite = pdf ? paginaFimEfetiva(ref, pdf) : undefined;
    const todosCapitulos = pdf && ref.paginaInicio !== undefined && limite !== undefined && (pdf.capitulos?.length ?? 0) > 0
      ? resolverCapitulos(pdf, capitulosConcluidos)
          .map((c, i) => ({ ...c, indice: i + 1 }))
          .filter((c) => c.paginaInicio >= ref.paginaInicio! && c.paginaFim <= limite)
      : undefined;
    // minutos já lidos DESTE pedaço, no ritmo AO VIVO (não o congelado em minutosEstimados na
    // criação) — pode passar de minutosEstimados se o usuário estiver lendo mais devagar do que a
    // estimativa original previu, e é exatamente esse sinal que a UI usa pra liberar a próxima
    // atividade da cadeia mesmo sem esta estar concluída (ver TabelaAtividades)
    const minutosFeitos = pdf && ref.paginaInicio !== undefined && limite !== undefined
      ? Math.round((Math.max(0, Math.min(pdf.paginaAtual, limite) - (ref.paginaInicio - 1)) / ritmoAoVivo) * 60)
      : undefined;
    return {
      id: ref.id, tipo: ref.tipo as FilaAtividadeTipo, materia: ref.materia, topico: ref.topico,
      titulo: ref.titulo, relevancia: ref.relevancia, minutosEstimados: ref.minutosEstimados,
      link: ref.link, desempenhoPerc, concluida, elegivelDesde: metaPersistida.iniciadaEm,
      pdfId: ref.pdfId, paginaInicio: ref.paginaInicio, paginaFim: ref.paginaFim, todosCapitulos,
      minutosFeitos,
    };
  });

  // concluidas/total ficam escopados só na Meta ATUAL (é o que a barra "X✓ de Y" e `fechavel`
  // precisam) — os 4 stats abaixo (Desempenho/Horas/Questões/Média), por pedido do usuário, somam
  // TODAS as Metas já abertas até agora, não só a corrente (senão zeravam toda vez que uma Meta
  // nova abria, mesmo com dezenas de atividades concluídas nas Metas anteriores).
  const concluidas = atividades.filter((a) => a.concluida).length;
  const total = atividades.length;

  const concluidasTodasMetas = Object.values(trilha.filaMetas.metas)
    .flatMap((m) => m.atividades)
    .map((ref) => ({ ref, ...estaAtividadeConcluida(ref, topicos, trilha, blocos, pdfs) }))
    .filter((a) => a.concluida);

  const desempenhos = concluidasTodasMetas.filter((a) => a.desempenhoPerc !== undefined).map((a) => a.desempenhoPerc!);
  const desempenhoPerc = desempenhos.length > 0 ? Math.round(desempenhos.reduce((s, v) => s + v, 0) / desempenhos.length) : null;

  const horasEstudadas = Object.entries(calendario)
    .filter(([data]) => data >= trilha.iniciadaEm && data <= hoje)
    .flatMap(([, ativs]) => ativs)
    .reduce((s, a) => s + a.duracao, 0) / 60;

  const questoesResolvidas = concluidasTodasMetas
    .filter((a) => a.ref.tipo === "questoes" || a.ref.tipo === "reforco")
    .reduce((s, a) => {
      const grupo = a.ref.id.split(":").pop() as Grupo;
      const estado = a.ref.topico ? topicos[topicoKey(a.ref.materia, a.ref.topico)] : undefined;
      const c = estado?.cadernos[grupo];
      return s + (c ? c.acertos + c.erros : 0);
    }, 0);

  const diasDecorridos = Math.max(1, diffDias(trilha.iniciadaEm, hoje) + 1);
  const mediaHorasDiaria = horasEstudadas / diasDecorridos;

  const metaAtual: MetaAtual = {
    numero: metaPersistida.numero, iniciadaEm: metaPersistida.iniciadaEm,
    orcamentoMinutos: metaPersistida.orcamentoMinutos, atividades,
    concluidas, total, desempenhoPerc, horasEstudadas, questoesResolvidas, mediaHorasDiaria,
    fechavel: total > 0 && concluidas === total,
  };

  // projeção honesta (mesmo espírito de estimativaConclusaoTrilha.dataPrevista) — combina duas
  // fontes e usa a MAIS OTIMISTA (menos dias) das duas, nunca a pior sozinha:
  // 1) throughput REAL em MINUTOS (não contagem de atividades — 1 atividade de 90min concluída
  //    não é o mesmo ritmo que 1 de 15min);
  // 2) o ritmo CONFIGURADO no Ciclo (orcamentoMinutos ÷ 7 — a Meta inteira já é dimensionada pra
  //    caber numa semana desse orçamento, ver abrirProximaMeta). Usar só a fonte 1 sozinha (como
  //    era antes) sofre MUITO com pouco dado: 1 atividade pequena concluída no dia 1 projetava
  //    ritmo de "1 atividade/dia" e estourava a data pra 2 semanas à frente mesmo numa Meta
  //    dimensionada pra 1 semana — bug real reportado pelo usuário (Meta aberta dia 07/08 projetando
  //    21/08). A fonte 2 funciona como teto: nunca deixa a projeção estourar além do que o próprio
  //    orçamento semanal já preveria, mesmo com pouquíssimo dado real ainda.
  let liberadaEmProjetada: string | null = null;
  if (concluidas > 0 && concluidas < total) {
    const minutosConcluidos = atividades.filter((a) => a.concluida).reduce((s, a) => s + a.minutosEstimados, 0);
    const minutosRestantes = atividades.filter((a) => !a.concluida).reduce((s, a) => s + a.minutosEstimados, 0);
    const minutosPorDiaReal = minutosConcluidos / diasDecorridos;
    const diasRestantesReal = minutosPorDiaReal > 0 ? Math.ceil(minutosRestantes / minutosPorDiaReal) : Infinity;

    const minutosPorDiaConfigurado = metaPersistida.orcamentoMinutos / 7;
    const diasRestantesConfigurado = minutosPorDiaConfigurado > 0 ? Math.ceil(minutosRestantes / minutosPorDiaConfigurado) : Infinity;

    const diasRestantes = Math.max(1, Math.min(diasRestantesReal, diasRestantesConfigurado));
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
// Rodízio em DOIS NÍVEIS — pedido explícito do usuário ("dia 1 = matérias do ciclo A, dia 2 =
// ciclo B, dia 3 = ciclo C, volta pro A"): primeiro agrupa as matérias pelo `divisao` (A/B/C) já
// configurado no Ciclo, e só dentro de cada ciclo intercala por matéria (round-robin de sempre).
// Um "dia" sai naturalmente da cadeia bloqueada da UI (TabelaAtividades só libera uma atividade
// de cada vez, em ordem) — completar TODAS as matérias de um ciclo (1 atividade cada) equivale a
// "fechar o dia", antes de a cadeia liberar a primeira atividade do próximo ciclo. Sem estourar
// pra 3 blocos GIGANTES (todo o ciclo A inteiro, depois todo o B): cada ciclo cede só 1 atividade
// por matéria por volta, então a sequência sai A1,A2,A3, B1,B2, C1, A1',A2',A3', B1',B2', C1', ...
// Reordenação ESTÁVEL (nunca muda a ordem relativa DENTRO de cada grupo) pra deixar todas as
// atividades de "questões" (tudo que não é teoria — grupos A-D, reforço, reforço rápido, revisão
// de link/matéria) sempre na FRENTE da fila da Meta, com a teoria (a leitura ciclo A/B/C) depois.
// Pedido explícito do usuário: questões nunca ficam presas atrás da cadeia de teoria — nem as que
// acabaram de ser injetadas no meio da Meta (ver TIPOS_INJETAVEIS_MEIO_META), nem as que já
// nasceram junto com a Meta. Aplicada em TODO write de `atividades` (abertura, injeção, auto-cura)
// pra manter o invariante sempre válido, e também usada como auto-cura pra Metas persistidas antes
// dessa regra existir (ver "caso 0.5" em avancarFilaMetasSeNecessario).
function questoesPrimeiro(atividades: MetaAtividadeRef[]): MetaAtividadeRef[] {
  const questoes = atividades.filter((a) => a.tipo !== "teoria");
  const teoria = atividades.filter((a) => a.tipo === "teoria");
  return [...questoes, ...teoria];
}

function intercalarPorCiclo(
  porMateria: Map<string, MetaAtividadeRef[]>, materiasPorCiclo: Record<"A" | "B" | "C", string[]>
): MetaAtividadeRef[] {
  const resultado: MetaAtividadeRef[] = [];
  const ciclos: ("A" | "B" | "C")[] = ["A", "B", "C"];
  let restante = true;
  while (restante) {
    restante = false;
    for (const ciclo of ciclos) {
      for (const materia of materiasPorCiclo[ciclo]) {
        const lista = porMateria.get(materia);
        const proxima = lista?.shift();
        if (proxima) {
          resultado.push(proxima);
          restante = true;
        }
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
  // intercalarPorCiclo), carry-over não bloqueia mais o resto da Meta
  const porMateria = new Map<string, MetaAtividadeRef[]>();
  const ordem: string[] = [];
  const addNaMateria = (materia: string, ref: MetaAtividadeRef) => {
    if (!porMateria.has(materia)) { porMateria.set(materia, []); ordem.push(materia); }
    porMateria.get(materia)!.push(ref);
  };
  for (const ref of carryOverProcessado) addNaMateria(ref.materia, ref);
  for (const a of candidatosNovos) addNaMateria(a.materia, paraRef(a, false));

  // agrupa as matérias que entraram no rodízio pelo ciclo configurado (A/B/C) — matéria sem
  // divisao configurada (ou não encontrada em configCiclo.materias) cai no ciclo A por padrão
  const materiasPorCiclo: Record<"A" | "B" | "C", string[]> = { A: [], B: [], C: [] };
  for (const materia of ordem) {
    const divisao = configCiclo.materias[materia]?.divisao ?? "A";
    materiasPorCiclo[divisao].push(materia);
  }
  const candidatos = intercalarPorCiclo(porMateria, materiasPorCiclo);

  const orcamentoMinutos = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);
  const numero = (trilha.filaMetas?.metaAtual ?? 0) + 1;

  const atividadesSelecionadas: MetaAtividadeRef[] = [];
  let somaMinutos = 0;
  for (const ref of candidatos) {
    if (atividadesSelecionadas.length >= META_ATIVIDADES_MAX) break;
    if (atividadesSelecionadas.length >= META_ATIVIDADES_MIN && somaMinutos >= orcamentoMinutos) break;
    atividadesSelecionadas.push(ref);
    somaMinutos += ref.minutosEstimados;
  }
  // seleção (quais entram, respeitando ciclo+orçamento) fica como está — só a EXIBIÇÃO é reordenada
  // pra questões virem primeiro (ver questoesPrimeiro)
  const atividades = questoesPrimeiro(atividadesSelecionadas);

  const novaMeta: MetaPersistida = { numero, iniciadaEm: hoje, orcamentoMinutos, atividades };
  const metasAnteriores = trilha.filaMetas?.metas ?? {};
  return { ...trilha, filaMetas: { metaAtual: numero, metas: { ...metasAnteriores, [numero]: novaMeta } } };
}

// tipos que podem ser injetados NO MEIO de uma Meta já aberta (ver caso 3 abaixo) — só o que é
// "responder questões" (escalonamento A-D, reforço, revisões por caderno de link/matéria). Pedido
// explícito do usuário: concluir uma atividade não deve fazer aparecer OUTRA na mesma Meta, a não
// ser que seja questões — ex.: terminar a teoria do tópico 2 libera o Grupo A do escalonamento do
// tópico 1 (que já tinha a teoria pronta) — isso aparece JÁ na Meta corrente. "teoria" fica de fora
// de propósito: a composição de leitura da Meta é decidida uma vez, na abertura (ver
// intercalarPorCiclo), e fica ESTÁVEL até a Meta fechar — não cresce sozinha no meio do caminho.
// "cartas" também fica de fora (não é uma atividade que "outra atividade libera").
const TIPOS_INJETAVEIS_MEIO_META = new Set<FilaAtividadeTipo>([
  "questoes", "reforco", "reforco_imediato", "revisao_link", "revisao_link_faltando",
  "revisao_materia", "reforco_materia",
]);

// Efeito colateral explícito (chamar de um useEffect, mesmo padrão do bookkeeping de
// conclusaoMaterias que já existe em TrilhaTab.tsx) — três casos, nessa ordem:
// 1) bootstrap da Meta 1 quando a trilha nunca passou pelo motor de fila;
// 2) promoção pra Meta N+1 quando a atual está `fechavel` (todas as atividades concluídas) — NÃO
//    promove sozinho enquanto sobrar pendência, pra isso é o botão manual (finalizarMetaManualmente);
// 3) injeção de atividades de QUESTÕES recém-elegíveis na Meta ABERTA (ver TIPOS_INJETAVEIS_MEIO_META
//    — teoria nunca entra por aqui). Só injeta o que a fila já considera elegível-e-pendente e ainda
//    não foi atribuído a NENHUMA Meta — não reabre nem fecha Meta nenhuma, só CRESCE a atual.
// Todos os três casos compartilham esta ÚNICA função (e um ÚNICO useEffect em page.tsx) de propósito
// — dois efeitos concorrentes escrevendo em `trilhaDinamica` no mesmo ciclo de render correm o
// risco de um sobrescrever o outro (cada um parte do mesmo `trilha` "velho" do fechamento de
// render atual), então bootstrap/fechamento/injeção viram um SÓ cálculo atômico.
// undefined = nada a fazer.
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
  if (!resultado) return undefined;

  // caso 0: auto-cura de Metas que ficaram gigantes ANTES do teto de META_ATIVIDADES_MAX existir
  // (caso real: Meta com 281 atividades). Mantém TODAS as já concluídas (nunca perde progresso
  // real) + completa o resto até o teto respeitando a ordem original (prioridade/carry-over já
  // embutida); o excedente pendente simplesmente deixa de estar atribuído a esta Meta e volta a
  // ser candidato normal pra próxima Meta (mesmo caminho de "novos" abaixo, só que futuramente).
  if (metaAberta.atividades.length > META_ATIVIDADES_MAX) {
    const concluidaPorId = new Map(resultado.metaAtual.atividades.map((a) => [a.id, a.concluida]));
    const concluidas = metaAberta.atividades.filter((ref) => concluidaPorId.get(ref.id));
    const pendentes = metaAberta.atividades.filter((ref) => !concluidaPorId.get(ref.id));
    const vagas = Math.max(0, META_ATIVIDADES_MAX - concluidas.length);
    const atividadesAparadas = questoesPrimeiro([...concluidas, ...pendentes.slice(0, vagas)]);
    // se já concluiu SOZINHO mais do que o teto (ex.: 20 concluídas dentro da Meta de 281), não dá
    // pra aparar mais nada — todo pendente já foi removido e só sobram as concluídas, que nunca
    // são cortadas. Sem essa guarda, isso devolvia um objeto NOVO (mesmo conteúdo, referência
    // diferente) toda vez que o efeito rodava — setState -> re-render -> efeito de novo -> objeto
    // novo de novo -> loop infinito (bug real em produção: React error #185, "too many re-renders").
    // Só atualiza quando a aparação de fato reduz a quantidade.
    if (atividadesAparadas.length >= metaAberta.atividades.length) return undefined;
    return {
      ...trilha,
      filaMetas: {
        ...trilha.filaMetas,
        metas: { ...trilha.filaMetas.metas, [metaAberta.numero]: { ...metaAberta, atividades: atividadesAparadas } },
      },
    };
  }

  // caso 0.5: auto-cura de ORDEM — Metas persistidas antes de "questões sempre na frente" existir
  // podem ter questões no meio/fim da lista, atrás de teoria ainda pendente na cadeia bloqueada.
  // questoesPrimeiro é IDEMPOTENTE (aplicar de novo no resultado já correto devolve o mesmo array,
  // item por item) — por isso dá pra comparar id a id e só gravar quando a ordem MUDA de verdade,
  // convergindo em no máximo 1 chamada e nunca reentrando em loop (mesma cautela do caso 0 acima).
  const ordemCorrigida = questoesPrimeiro(metaAberta.atividades);
  const ordemMudou = ordemCorrigida.some((a, i) => a.id !== metaAberta.atividades[i].id);
  if (ordemMudou) {
    return {
      ...trilha,
      filaMetas: {
        ...trilha.filaMetas,
        metas: { ...trilha.filaMetas.metas, [metaAberta.numero]: { ...metaAberta, atividades: ordemCorrigida } },
      },
    };
  }

  if (resultado.metaAtual.fechavel) {
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

  // caso 3: Meta aberta, ainda não fechável — injeta o que virou elegível-e-pendente desde a
  // última passada e ainda não está em NENHUMA Meta (passada ou atual)
  const fila = construirFilaGlobal({
    hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos, trilha,
    capitulosConcluidos: params.capitulosConcluidos,
  });
  const idsJaAtribuidos = new Set(
    Object.values(trilha.filaMetas.metas).flatMap((m) => m.atividades.map((a) => a.id))
  );
  const novos = fila.filter((a) => !idsJaAtribuidos.has(a.id) && TIPOS_INJETAVEIS_MEIO_META.has(a.tipo));
  if (novos.length === 0) return undefined;

  // novos são sempre tipo questões (TIPOS_INJETAVEIS_MEIO_META exclui teoria) — questoesPrimeiro
  // garante que entram na FRENTE, junto das outras questões já na Meta, nunca atrás da teoria
  const metaComInjecao: MetaPersistida = {
    ...metaAberta,
    atividades: questoesPrimeiro([...metaAberta.atividades, ...novos.map((a) => paraRef(a, false))]),
  };
  return {
    ...trilha,
    filaMetas: { ...trilha.filaMetas, metas: { ...trilha.filaMetas.metas, [metaAberta.numero]: metaComInjecao } },
  };
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

// Efeito colateral explícito (mesmo padrão de avancarFilaMetasSeNecessario) — o fatiamento de
// teoria (gerarChunksTeoria) julga cada PEDAÇO como concluído pela posição real de leitura
// (pdf.paginaAtual), mas isso nunca marcava TopicoState.estudado sozinho: o usuário lia o último
// pedaço de um tópico inteiro pela Trilha, via a linha ficar verde na tabela, mas o Edital
// continuava mostrando como não estudado — porque "Marcar como estudado" sempre foi um clique
// manual à parte (LeitorPdf.tsx concluirLeitura), pensado pra quando NADA na Trilha sabia que a
// leitura tinha, de fato, terminado. Agora que gerarChunksTeoria sabe exatamente disso (fila vazia
// = nada sobrou pra ler), fecha esse buraco: quando um tópico tem PDF mapeado (capítulos OU
// intervalosPaginas — sem isso não dá pra saber se "acabou", então nunca mexe) e não sobra nenhum
// chunk pendente, marca estudado automaticamente. undefined = nada mudou.
export function avancarEstudoAutomaticoSeNecessario(params: {
  materiasAtivas: MateriaLike[];
  configCiclo: EstudoConfigCiclo;
  topicos: Record<string, TopicoState>;
  pdfs: PdfEstudo[];
  calendario: Record<string, AtividadeCalendario[]>;
  capitulosConcluidos?: string[];
  hoje?: string;
}): Record<string, TopicoState> | undefined {
  const { materiasAtivas, configCiclo, topicos, pdfs, calendario } = params;
  const capitulosConcluidos = params.capitulosConcluidos ?? [];
  const hoje = params.hoje ?? dateKeyLocal();
  const pagPorHora = calcularPagPorHora(calendario);
  const ativas = materiasAtivas.filter((m) => configCiclo.materias[m.nome]?.incluir);

  let mudou = false;
  const novosTopicos = { ...topicos };
  for (const m of ativas) {
    for (const topico of m.topicos) {
      const key = topicoKey(m.nome, topico);
      const estado = novosTopicos[key];
      if (estado?.estudado) continue;
      const pdf = resolverPdfDoTopico(m.nome, topico, pdfs);
      if (!pdf) continue;
      const temMapeamento = (pdf.capitulos?.length ?? 0) > 0 || (pdf.intervalosPaginas?.some((t) => t.topico === topico) ?? false);
      if (!temMapeamento) continue; // sem mapeamento não dá pra saber se "acabou" — nunca mexe
      if (gerarChunksTeoria(pdf, topico, pagPorHora, capitulosConcluidos).length > 0) continue;
      novosTopicos[key] = {
        ...(estado ?? defaultTopicoState()),
        estudado: true,
        estudadoEm: estado?.estudadoEm ?? hoje,
      };
      mudou = true;
    }
  }
  return mudou ? novosTopicos : undefined;
}
