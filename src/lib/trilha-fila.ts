import {
  calcularMedia, calcularPagPorHora, calcularPagPorHoraTopico, calcularPerc, dateKeyLocal,
  defaultTopicoState, topicoKey,
  type AtividadeCalendario, type Bloco, type ChecklistRevisaoLink, type EstudoConfigCiclo,
  type Grupo, type MetaAtividadeRef, type MetaPersistida, type NivelImportancia, type PdfEstudo,
  type TopicoCaderno, type TopicoState, type TrilhaDinamicaState,
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
  | "revisao_link" | "revisao_link_faltando" | "revisao_materia" | "reforco_topico" | "cartas"
  | "simulado" | "discursiva";

// currículo LEVE de Simulados/Discursivas (só id+nome — nunca o gabarito/rubrica inteiros, que
// vivem em tabelas próprias e são grandes demais pra trafegar em toda passada da fila). Quem
// chama construirFilaGlobal busca essas listas separado (ver page.tsx) e passa aqui.
export interface SimuladoResumo { id: string; nome: string }
export interface DiscursivaResumo { id: string; tema: string }

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
// tempo REAL de uma parte de simulado (4h — mesmo espírito da prova de verdade, ver plano) —
// só informativo pro "minutosEstimados" da atividade na fila; o cronômetro de cada parte usa o
// tempoMinutos configurado NO PRÓPRIO simulado (SimuladoConcurso.partes), não esta constante
export const MINUTOS_ESTIMADO_SIMULADO = 240;
export const MINUTOS_ESTIMADO_DISCURSIVA = 60;
export const MINUTOS_ESTIMADO_TEORIA_PADRAO = 60; // tópico sem PDF/página mapeada nenhuma
// reforço por tópico — não é um bloco NOVO de questões, é só reabrir o PDF e reler o que já foi
// errado no caderno existente (ver DialogRevisaoReforco.tsx) — por isso a estimativa é curta, só o
// tempo de reler, não de responder questões novas. Escopo por TÓPICO, não mais por matéria inteira
// (pedido do usuário: reforço tem que reagir ao desempenho de CADA tópico, não escondido atrás da
// média de todos os tópicos da matéria — um tópico fraco perdido no meio de vários bons nunca
// disparava reforço nenhum antes).
export const MINUTOS_ESTIMADO_REFORCO_TOPICO = 15;
// nº mínimo de questões respondidas no tópico (soma de todos os cadernos A-D dele, mesmo parciais —
// mesmo critério de calcularMedia, a % que a aba Edital já mostra) antes de julgar o aproveitamento
// — sem isso, 2-3 questões erradas no começo já dispararia o reforço com uma amostra pequena demais
const MINIMO_QUESTOES_REFORCO_TOPICO = 10;

// Elegibilidade do reforço por tópico (amostra mínima + abaixo do limiar) — UMA função só,
// exportada, usada tanto aqui (geração do reforço em construirFilaGlobal) quanto em QuestoesTab.tsx
// (decidir se mostra o bloco de registro pra um tópico), pra nunca dessincronizar o que a UI oferece
// do que de fato entra na fila.
export function elegivelParaReforcoTopico(cadernos: Record<Grupo, TopicoCaderno>): { elegivel: boolean; perc: number } {
  const total = GRUPOS_QUESTOES.reduce((s, g) => s + cadernos[g].acertos + cadernos[g].erros, 0);
  const perc = calcularMedia(cadernos);
  return { elegivel: total >= MINIMO_QUESTOES_REFORCO_TOPICO && perc < LIMIAR_REFORCO_PERC, perc };
}

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
  simulados?: SimuladoResumo[];
  discursivaTemas?: DiscursivaResumo[];
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

    // reforço por TÓPICO — aproveitamento agregado dos cadernos A-D DESSE tópico (calcularMedia,
    // mesma média que a aba Edital já exibe pro usuário — não a média de toda a matéria) abaixo de
    // LIMIAR_REFORCO_PERC, com amostra mínima (MINIMO_QUESTOES_REFORCO_TOPICO) pra não disparar com
    // 2-3 questões erradas no começo. Pedido explícito do usuário: reforço tinha que reagir a CADA
    // tópico fraco, não a uma média de matéria que escondia tópicos ruins atrás de tópicos bons (ex.:
    // real — Direito Administrativo com vários tópicos >70% e só "Princípios da Administração" a
    // 19%, a média da matéria nunca caía o bastante pra disparar nada). Não é um bloco novo de
    // questões — é só o aviso pra reabrir o PDF do tópico e reler o que já foi errado (sem link
    // próprio: cai sempre no PDF via abrirPdfDoTopico, ver irParaQuestoesDaRevisao em TrilhaTab.tsx).
    // One-shot por tópico (mesmo espírito da revisão de matéria) — feito, não reaparece pra esse
    // tópico (trilha.reforcosTopico).
    for (const topico of m.topicos) {
      const chave = topicoKey(m.nome, topico);
      if (trilha.reforcosTopico?.[chave]) continue;
      const estado = topicos[chave];
      if (!estado) continue;
      const { elegivel, perc: percTopico } = elegivelParaReforcoTopico(estado.cadernos);
      if (!elegivel) continue;
      fila.push({
        id: `rt:${m.nome}:${topico}`,
        tipo: "reforco_topico",
        materia: m.nome,
        topico,
        titulo: `Reforço — ${topico} (${percTopico}% de aproveitamento)`,
        minutosEstimados: MINUTOS_ESTIMADO_REFORCO_TOPICO,
        desempenhoPerc: percTopico,
        concluida: false,
        elegivelDesde: hoje,
      });
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

  // simulados/discursivas — atividades globais (não por matéria), liberadas só depois que o
  // edital INTEIRO das matérias ativas está 100% (todos os tópicos com teoria + grupos A-D
  // completos, mesmo sinal que já agenda a revisão de 30 questões — trilha.conclusaoMaterias).
  // Sem matéria ativa nenhuma (ciclo vazio), nunca libera. Cada simulado/tema é one-shot na fila
  // (não reoferece depois de feito, ver trilha.simuladosFeitos/discursivasFeitas) — refazer
  // simulados/discursivas fica disponível a qualquer hora dentro das próprias abas, só não volta a
  // "pedir" pela Trilha.
  const editalCompleto = ativas.length > 0 && ativas.every((m) => !!trilha.conclusaoMaterias[m.nome]);
  if (editalCompleto) {
    for (const s of params.simulados ?? []) {
      if (trilha.simuladosFeitos?.[s.id]) continue;
      fila.push({
        id: `simulado:${s.id}`,
        tipo: "simulado",
        materia: "Simulados",
        titulo: s.nome,
        minutosEstimados: MINUTOS_ESTIMADO_SIMULADO,
        concluida: false,
        elegivelDesde: hoje,
      });
    }
    for (const d of params.discursivaTemas ?? []) {
      if ((trilha.discursivasFeitas?.[d.id] ?? []).length > 0) continue;
      fila.push({
        id: `discursiva:${d.id}`,
        tipo: "discursiva",
        materia: "Discursivas",
        titulo: d.tema,
        minutosEstimados: MINUTOS_ESTIMADO_DISCURSIVA,
        concluida: false,
        elegivelDesde: hoje,
      });
    }
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

// nº REAL de questões daquele grupo no PDF do tópico (soma de todos os blocos, ver
// gerarQuestoesGrupos/sincronizarCadernoComQuestoes em estudo-data.ts/biblioteca-utils.ts) — usado
// pra decidir se um grupo A-D está de fato TERMINADO. `cadernos[grupo].acertos+erros` sozinho não
// basta: ele conta só o que já foi MARCADO, então marcar 1 de 10 questões do grupo (acertos+erros=1
// > 0) já contava como "feito" antes desta correção — bug real reportado pelo usuário (Grupo A
// aparecia 100% concluído com 1 questão marcada, faltando as outras 9).
function totalQuestoesDoGrupo(materia: string, topico: string, grupo: Grupo, pdfs: PdfEstudo[]): number {
  const pdf = resolverPdfDoTopico(materia, topico, pdfs);
  return pdf?.questoes?.resultados.filter((r) => r.grupo === grupo).length ?? 0;
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
      const total = ref.topico ? totalQuestoesDoGrupo(ref.materia, ref.topico, grupo, pdfs) : 0;
      // só "feito" quando TODAS as questões do grupo foram marcadas (acerto ou erro) — não basta
      // ter marcado uma só (ver totalQuestoesDoGrupo)
      const feito = !!c && total > 0 && c.acertos + c.erros >= total;
      return { concluida: feito, desempenhoPerc: feito ? calcularPerc(c!.acertos, c!.erros) : undefined };
    }
    case "reforco": {
      const grupo = ref.id.split(":").pop() as Grupo;
      const c = estado?.cadernos[grupo];
      const total = ref.topico ? totalQuestoesDoGrupo(ref.materia, ref.topico, grupo, pdfs) : 0;
      const feito = !!c && total > 0 && c.acertos + c.erros >= total;
      const perc = feito ? calcularPerc(c!.acertos, c!.erros) : undefined;
      // um reforço só "conclui" quando TODAS as questões foram remarcadas E o desempenho volta pra
      // cima do limiar — refazer parcialmente, ou refazer inteiro e continuar fraco, mantém a
      // atividade pendente (volta a aparecer como reforço depois do cooldown)
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
    case "reforco_topico": {
      // sem acertos/erros pra recalcular — marcado como feito direto no clique de "ir pro PDF"
      // (ver DialogRevisaoReforco.tsx / irParaQuestoesDaRevisao em TrilhaTab.tsx)
      const registro = ref.topico ? trilha.reforcosTopico?.[topicoKey(ref.materia, ref.topico)] : undefined;
      return { concluida: !!registro };
    }
    case "cartas": {
      const data = ref.id.split(":")[1];
      return { concluida: trilha.cartasFeitasEm.includes(data) };
    }
    case "simulado": {
      const id = ref.id.split(":")[1];
      return { concluida: !!trilha.simuladosFeitos?.[id] };
    }
    case "discursiva": {
      const id = ref.id.split(":")[1];
      return { concluida: (trilha.discursivasFeitas?.[id] ?? []).length > 0 };
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
    // atividade da cadeia mesmo sem esta estar concluída (ver TabelaAtividades). Prefere o ritmo
    // DESTE tópico especificamente — a média GERAL (todas as matérias já lidas) pode divergir muito
    // de um tópico denso específico (caso real: 76min reais registrados hoje em Direito
    // Administrativo, média geral puxada por matérias mais rápidas estimava só 51min pro mesmo
    // trecho). Sem sessão registrada ainda pra esse tópico, cai pro ritmo geral de sempre.
    const ritmoDoTopico = ref.topico ? calcularPagPorHoraTopico(calendario, ref.materia, ref.topico) : null;
    const ritmoParaEsteRef = ritmoDoTopico && ritmoDoTopico > 0 ? ritmoDoTopico : ritmoAoVivo;
    const minutosFeitos = pdf && ref.paginaInicio !== undefined && limite !== undefined
      ? Math.round((Math.max(0, Math.min(pdf.paginaAtual, limite) - (ref.paginaInicio - 1)) / ritmoParaEsteRef) * 60)
      : undefined;
    // minutosEstimados também precisa respeitar o limite EFETIVO — se ele encolheu (paginaConteudoFim/
    // capítulos editados depois do ref congelado, ver paginaFimEfetiva), o número exibido não pode
    // continuar refletindo o boundary velho e oversized. Caso real: capítulo "sem fim declarado"
    // congelado com paginaFim=299 (fallback pro totalPaginas do PDF inteiro, antes de
    // paginaConteudoFim=63 ser cadastrado) mostrava 392min pra um trecho que hoje é só ~2 páginas.
    // Só recalcula quando o limite efetivo é MENOR que o congelado — no caso comum (nada mudou),
    // minutosEstimados continua o valor congelado de sempre.
    const minutosEstimados = pdf && ref.paginaInicio !== undefined && limite !== undefined && limite < ref.paginaFim!
      ? Math.max(1, Math.round(((limite - (ref.paginaInicio - 1)) / ritmoParaEsteRef) * 60))
      : ref.minutosEstimados;
    return {
      id: ref.id, tipo: ref.tipo as FilaAtividadeTipo, materia: ref.materia, topico: ref.topico,
      titulo: ref.titulo, relevancia: ref.relevancia, minutosEstimados,
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

  // "Liberada em" — pedido explícito do usuário: SEMPRE 7 dias corridos a partir de quando a Meta
  // ATUAL abriu (metaPersistida.iniciadaEm), sem projeção por throughput. A projeção por minutos
  // concluídos/dia sofria muito com pouco dado (e, depois da agregação de stats por TODAS as Metas,
  // ficou ainda pior — diasDecorridos passou a contar desde o início da TRILHA inteira, não da Meta
  // atual, fazendo o throughput real parecer artificialmente baixo e estourando a projeção pra
  // semanas à frente). Meta só avança de fato quando concluída (fechavel/finalizarMetaManualmente)
  // — esta data é só a expectativa "1 Meta = 1 semana", não uma trava.
  let liberadaEmProjetada: string | null = null;
  if (total > 0 && concluidas === total) {
    liberadaEmProjetada = hoje; // fechável agora
  } else if (total > 0) {
    const d = parseDateKey(metaPersistida.iniciadaEm);
    d.setDate(d.getDate() + 7);
    liberadaEmProjetada = dateKeyLocal(d);
  }

  return { metaAtual, proximaMeta: { numero: metaPersistida.numero + 1, liberadaEmProjetada } };
}

export interface MetaHistoricoResumo {
  numero: number;
  iniciadaEm: string;
  fechadaEm?: string;
  fechamentoManual?: boolean;
  concluidas: number;
  total: number;
  materias: {
    materia: string;
    concluidas: number;
    total: number;
    // atividade por atividade, pra UI poder expandir e mostrar o que foi feito de fato — não só
    // a contagem agregada (pedido do usuário)
    atividades: { titulo: string; tipo: FilaAtividadeTipo; concluida: boolean }[];
  }[];
}

// Pedido do usuário: mostrar, ao lado da Meta atual, o que de fato foi feito nas Metas ANTERIORES
// — a Meta 1 fica visível igual à atual (mesma hidratação ao vivo via estaAtividadeConcluida), só
// que sem `fechavel`/`liberadaEmProjetada` (não faz sentido pra Meta que já passou). Mais recente
// primeiro. Nunca inclui a Meta ATUAL — essa é o card grande de cima (MetaAtualCard).
export function computarHistoricoMetas(params: ParamsBaseFila): MetaHistoricoResumo[] {
  const { trilha, topicos, blocos, pdfs } = params;
  if (!trilha.filaMetas) return [];
  const metaAtualNumero = trilha.filaMetas.metaAtual;
  return Object.values(trilha.filaMetas.metas)
    .filter((m) => m.numero !== metaAtualNumero)
    .sort((a, b) => b.numero - a.numero)
    .map((m) => {
      const hidratadas = m.atividades.map((ref) => ({
        ref, ...estaAtividadeConcluida(ref, topicos, trilha, blocos, pdfs),
      }));
      const porMateria = new Map<string, { concluidas: number; total: number; atividades: { titulo: string; tipo: FilaAtividadeTipo; concluida: boolean }[] }>();
      for (const h of hidratadas) {
        const acumulado = porMateria.get(h.ref.materia) ?? { concluidas: 0, total: 0, atividades: [] };
        acumulado.total += 1;
        if (h.concluida) acumulado.concluidas += 1;
        acumulado.atividades.push({ titulo: h.ref.titulo, tipo: h.ref.tipo as FilaAtividadeTipo, concluida: h.concluida });
        porMateria.set(h.ref.materia, acumulado);
      }
      return {
        numero: m.numero,
        iniciadaEm: m.iniciadaEm,
        fechadaEm: m.fechadaEm,
        fechamentoManual: m.fechamentoManual,
        concluidas: hidratadas.filter((h) => h.concluida).length,
        total: m.atividades.length,
        materias: Array.from(porMateria.entries()).map(([materia, v]) => ({ materia, ...v })),
      };
    });
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
  simulados?: SimuladoResumo[];
  discursivaTemas?: DiscursivaResumo[];
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
// Reforço por tópico (tipo "reforco_topico") vai na FRENTE de tudo, até de questões normais -- não
// só à frente da teoria. Bug real reportado pelo usuário (2026-08-15): com só "não-teoria primeiro"
// (sem separar reforço das questões comuns), um tópico com reforço pendente MAS TAMBÉM questões
// normais pendentes só entregava o reforço na 2ª rodada do rodízio (ver intercalarPorCiclo) -- e o
// teto de META_ATIVIDADES_MAX (15) é atingido ainda dentro da 1ª rodada quando há muitas matérias,
// então o reforço nunca chegava a entrar em NENHUMA Meta, apesar de o usuário estar abaixo de 70%
// em vários tópicos ao mesmo tempo (só o que "por sorte" não tinha questão normal na frente aparecia).
function questoesPrimeiro(atividades: MetaAtividadeRef[]): MetaAtividadeRef[] {
  const reforcoTopico = atividades.filter((a) => a.tipo === "reforco_topico");
  const outrasQuestoes = atividades.filter((a) => a.tipo !== "teoria" && a.tipo !== "reforco_topico");
  const teoria = atividades.filter((a) => a.tipo === "teoria");
  return [...reforcoTopico, ...outrasQuestoes, ...teoria];
}

// Qual ciclo "abre a rodada" roda por Meta (numeroMeta % 3) -- bug real reportado pelo usuário
// (2026-08-15): a ordem fixa A→B→C, combinada com o teto META_ATIVIDADES_MAX (15) aplicado sobre a
// lista JÁ achatada (não por ciclo), fazia o ciclo C nunca entrar em NENHUMA Meta sempre que A
// (sozinho) já tivesse matérias suficientes pra encostar no teto -- não é hipotético, é o caso real
// do usuário: ~13 matérias configuradas em A contra só ~2-3 em C. Girar quem entra primeiro garante
// que, a cada 3 Metas, cada ciclo tenha pelo menos uma vez prioridade total antes do teto cortar --
// não elimina 100% o desbalanceamento de fundo (o usuário também pode reequilibrar as divisões A/B/C
// na aba Ciclo), mas garante que NENHUM ciclo fique starved pra sempre.
function intercalarPorCiclo(
  porMateria: Map<string, MetaAtividadeRef[]>,
  materiasPorCiclo: Record<"A" | "B" | "C", string[]>,
  numeroMeta: number
): MetaAtividadeRef[] {
  const resultado: MetaAtividadeRef[] = [];
  const ordemBase: ("A" | "B" | "C")[] = ["A", "B", "C"];
  const inicio = ((numeroMeta - 1) % ordemBase.length + ordemBase.length) % ordemBase.length;
  const ciclos = [...ordemBase.slice(inicio), ...ordemBase.slice(0, inicio)];
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

  const fila = construirFilaGlobal({
    hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos, trilha, capitulosConcluidos,
    simulados: params.simulados, discursivaTemas: params.discursivaTemas,
  });
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

  // dentro de CADA matéria, questões/reforço na frente da teoria — mesma regra de questoesPrimeiro,
  // mas aplicada AQUI (antes da seleção/rodízio), não só na reordenação de exibição no fim desta
  // função. Sem isso, um reforço (ou qualquer não-teoria) podia nunca ser selecionado: dentro da
  // própria matéria ele sempre nasce DEPOIS dos pedaços de teoria (ordem de push em
  // construirFilaGlobal), então o rodízio só chega nele depois de esgotar a teoria daquela matéria
  // — com o teto de META_ATIVIDADES_MAX (15) atingido antes disso (caso real: matéria com só 2
  // pedaços de teoria na frente já bastou pra um reforço nunca entrar em nenhuma Meta, mesmo
  // continuando um candidato válido a cada abertura seguinte). Aqui só decide QUEM ENTRA; a
  // reordenação de EXIBIÇÃO final (mais abaixo) continua necessária pra a Meta já nascer com
  // questões na frente visualmente, não só ter sido selecionada com prioridade.
  for (const [materia, lista] of porMateria) {
    porMateria.set(materia, questoesPrimeiro(lista));
  }

  // agrupa as matérias que entraram no rodízio pelo ciclo configurado (A/B/C) — matéria sem
  // divisao configurada (ou não encontrada em configCiclo.materias) cai no ciclo A por padrão
  const materiasPorCiclo: Record<"A" | "B" | "C", string[]> = { A: [], B: [], C: [] };
  for (const materia of ordem) {
    const divisao = configCiclo.materias[materia]?.divisao ?? "A";
    materiasPorCiclo[divisao].push(materia);
  }
  const numero = (trilha.filaMetas?.metaAtual ?? 0) + 1;
  const candidatos = intercalarPorCiclo(porMateria, materiasPorCiclo, numero);

  const orcamentoMinutos = Object.values(configCiclo.horasPorDia).reduce((s, v) => s + v, 0);

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
// "responder questões" (escalonamento A-D, revisões por caderno de link/matéria) mais o reforço
// RÁPIDO pós-estudo (é literalmente "logo depois de terminar a teoria", faz sentido continuar
// imediato). Pedido explícito do usuário: concluir uma atividade não deve fazer aparecer OUTRA na
// mesma Meta, a não ser que seja questões — ex.: terminar a teoria do tópico 2 libera o Grupo A do
// escalonamento do tópico 1 (que já tinha a teoria pronta) — isso aparece JÁ na Meta corrente.
// "reforco" (grupo A-D específico, esfriado) fica de FORA de propósito: mesmo desempenho fraco
// liberando o reforço no meio da Meta, ele só entra na PRÓXIMA — dá tempo do usuário revisar os
// pontos que errou (ver TrilhaTab.tsx) antes de cair pra cima dele sem aviso. "reforco_topico" NÃO
// tem essa restrição (pedido explícito do usuário): é só um aviso leve pra reler o que já errou no
// PDF, não uma atividade nova de responder questões — não precisa esperar a próxima Meta, entra
// assim que o tópico cruza o limiar, mesmo com a Meta atual já aberta.
// "teoria" fica de fora de propósito: a composição de leitura da Meta é decidida uma vez, na
// abertura (ver intercalarPorCiclo), e fica ESTÁVEL até a Meta fechar — não cresce sozinha no meio
// do caminho. "cartas" também fica de fora (não é uma atividade que "outra atividade libera").
const TIPOS_INJETAVEIS_MEIO_META = new Set<FilaAtividadeTipo>([
  "questoes", "reforco_imediato", "revisao_link", "revisao_link_faltando", "revisao_materia", "reforco_topico",
]);

// Efeito colateral explícito (chamar de um useEffect, mesmo padrão do bookkeeping de
// conclusaoMaterias que já existe em TrilhaTab.tsx) — dois casos, nessa ordem:
// 1) bootstrap da Meta 1 quando a trilha nunca passou pelo motor de fila;
// 2) injeção de atividades recém-elegíveis na Meta ABERTA (questões + reforço por tópico — ver
//    TIPOS_INJETAVEIS_MEIO_META; teoria e reforço de grupo A-D nunca entram por aqui). Só injeta o
//    que a fila já considera elegível-e-pendente e ainda não foi atribuído a NENHUMA Meta — não
//    reabre nem fecha Meta nenhuma, só CRESCE a atual.
// A promoção pra Meta N+1 NUNCA é automática, mesmo quando a atual está `fechavel` (todas as
// atividades concluídas) — pedido explícito do usuário: ele quer CLICAR pra avançar, não ser
// empurrado pra próxima Meta no instante em que a última atividade é marcada. `fechavel` só liga o
// aviso "meta entregue" (ver DashboardTab.tsx) e o botão fica disponível (ProximaMetaCard), mas quem
// de fato fecha+abre é sempre finalizarMetaManualmente, disparado pelo clique do usuário.
// Ambos os casos compartilham esta ÚNICA função (e um ÚNICO useEffect em page.tsx) de propósito —
// dois efeitos concorrentes escrevendo em `trilhaDinamica` no mesmo ciclo de render correm o risco
// de um sobrescrever o outro (cada um parte do mesmo `trilha` "velho" do fechamento de render
// atual), então bootstrap/injeção viram um SÓ cálculo atômico.
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

  // caso 0.75: auto-cura de reforco_topico que não é mais válido — recalcula a fila FRESCA e remove
  // da Meta aberta qualquer reforco_topico persistido que não apareceria mais nela hoje. Caso real
  // (herdado da versão por matéria, mesmo espírito aqui por tópico): o usuário respondeu mais
  // questões do tópico e o aproveitamento real subiu acima do limiar — o item persistido não some
  // sozinho, então essa auto-cura resolve. Nunca mexe numa já concluída (defensivo — nem entraria
  // aqui: reforcosTopico[chave] já existiria e a fila fresca nem geraria o item de novo).
  //
  // Trata também "reforco_materia" (nome LEGADO — Metas já abertas antes da migração pra reforço por
  // tópico podem ter esse tipo persistido no JSON, mesmo o TS não reconhecendo mais essa string).
  // Sem essa segunda checagem, esse item ficava PRESO PRA SEMPRE: estaAtividadeConcluida não tem
  // case pra ele (cai no default, concluida sempre false) e nunca fica "concluído" nem some sozinho
  // — inclusive sobrevivia a "Finalize ou ignore" (vira carry-over, se arrasta pra Meta seguinte).
  const filaFresca = construirFilaGlobal({
    hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs, blocos, trilha,
    capitulosConcluidos: params.capitulosConcluidos,
    simulados: params.simulados, discursivaTemas: params.discursivaTemas,
  });
  const idsValidosNaFilaFresca = new Set(filaFresca.map((a) => a.id));
  const atividadesSemReforcoInvalido = metaAberta.atividades.filter((ref) => {
    if ((ref.tipo as string) === "reforco_materia") return false;
    if (ref.tipo !== "reforco_topico") return true;
    if (idsValidosNaFilaFresca.has(ref.id)) return true;
    return estaAtividadeConcluida(ref, topicos, trilha, blocos, pdfs).concluida;
  });
  if (atividadesSemReforcoInvalido.length < metaAberta.atividades.length) {
    return {
      ...trilha,
      filaMetas: {
        ...trilha.filaMetas,
        metas: { ...trilha.filaMetas.metas, [metaAberta.numero]: { ...metaAberta, atividades: atividadesSemReforcoInvalido } },
      },
    };
  }

  // caso 2 (antigo): promoção automática pra Meta N+1 quando `fechavel` foi removida de propósito
  // — pedido explícito do usuário: ele quer CLICAR pra avançar (botão "Avançar" em
  // ProximaMetaCard.tsx, que chama finalizarMetaManualmente), não ser empurrado pra próxima Meta no
  // instante em que a última atividade é marcada. `fechavel` continua calculado e exposto (badge
  // "meta entregue" no Dashboard, botão liberado no card) — só o fechamento automático saiu daqui.

  // caso 3: Meta aberta (fechável ou não — o fechamento em si é sempre manual, ver acima) — injeta
  // o que virou elegível-e-pendente desde a última passada e ainda não está em NENHUMA Meta (passada
  // ou atual). Reaproveita filaFresca (já calculada acima, no caso 0.75) — mesmos parâmetros, sem
  // sentido recalcular de novo.
  const idsJaAtribuidos = new Set(
    Object.values(trilha.filaMetas.metas).flatMap((m) => m.atividades.map((a) => a.id))
  );
  const novos = filaFresca.filter((a) => !idsJaAtribuidos.has(a.id) && TIPOS_INJETAVEIS_MEIO_META.has(a.tipo));
  if (novos.length === 0) return undefined;

  // novos são sempre questões ou reforço por tópico (TIPOS_INJETAVEIS_MEIO_META exclui teoria e
  // reforço de grupo) — questoesPrimeiro garante que entram na FRENTE, reforço por tópico até antes
  // das outras questões, nunca atrás da teoria
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
