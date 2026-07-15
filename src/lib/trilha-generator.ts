// Gerador determinístico da Trilha de Estudos (plano guiado por metas, estilo Gurujá/Duolingo).
// Cada META é PEQUENA e tem UM objetivo só: OU estudar um bloco de tópicos de UMA matéria
// (teoria quando aplicável + questões), OU revisar um pequeno grupo de tópicos já vencidos —
// nunca os dois nem várias matérias juntas. Isso é intencional (pedido do usuário): metas
// grandes e pesadas desmotivam; muitas metas pequenas, cada uma "conclua esta matéria/tópico",
// combinam com o visual de caminho (1 nó = 1 meta). Sem IA aqui de propósito: geração
// instantânea, reprodutível e recalculável — a IA só escreve as `orientacao` das metas de
// conteúdo novo depois (rota /api/estudo/trilha/orientacoes).
//
// Regras numéricas (fechadas no plano aprovado):
//   Por tópico, conforme nível EFETIVO da matéria (tópico já `estudado` no Edital ⇒ "arestas"):
//     nunca          teoria 90min  · 10 questões (30min) · rev.1 12min · rev.2 8min
//     comecei        teoria 90min  · 12 questões (36min) · rev.1 12min · rev.2 8min
//     sem_confianca  teoria 40min  · 15 questões (45min) · rev.1 12min · rev.2 8min
//     arestas        SEM teoria    · 20 questões (60min) · rev.1 12min · rev.2 8min
//   Blocos (tópicos consecutivos na ordem do edital, de UMA matéria): com teoria fecha em
//   3 tópicos OU ≥150min; só-questões fecha em 5 tópicos OU ≥120min. Cada bloco = 1 meta.
//   Intercalação entre matérias: escolhida bloco a bloco por round-robin ponderado suave
//   ("smooth weighted round-robin" — peso pesoCiclo(1|2) × fatorNivel, nunca 1.5 / comecei 1.3 /
//   sem_confianca 1.0 / arestas 0.7), não mais agrupada dentro de uma mesma meta.
//   Revisões vencidas viram metas próprias (até 4 por meta), separadas do conteúdo novo. O
//   vencimento não é mais contado em "número de metas" (metas não valem mais 1 semana cada,
//   já que agora são pequenas) — é contado em MINUTOS DE ESTUDO acumulados: rev.1 vence quando
//   passam `minutosSemana` da disponibilidade desde o estudo (≈7 dias no ritmo escolhido), rev.2
//   quando passam 4×minutosSemana (≈30 dias).

import {
  topicoKey,
  TRILHA_DISPONIBILIDADE_CONFIG,
  type EstudoConfigCiclo,
  type MateriaBase,
  type TopicoState,
  type TrilhaAtividade,
  type TrilhaConfig,
  type TrilhaEstudo,
  type TrilhaMeta,
  type TrilhaAtividadeStatus,
  type TrilhaDisponibilidade,
  type TrilhaNivelMateria,
} from "./estudo-data"

// ─── Parâmetros por nível ─────────────────────────────────────────────────────

const NIVEL_PARAMS: Record<
  TrilhaNivelMateria,
  { teoriaMin: number; questoes: number; fator: number }
> = {
  nunca: { teoriaMin: 90, questoes: 10, fator: 1.5 },
  comecei: { teoriaMin: 90, questoes: 12, fator: 1.3 },
  sem_confianca: { teoriaMin: 40, questoes: 15, fator: 1.0 },
  arestas: { teoriaMin: 0, questoes: 20, fator: 0.7 },
}

const MIN_POR_QUESTAO = 3
const REV1_MIN = 12
const REV2_MIN = 8
const MAX_REVISOES_POR_META = 4 // teto de revisões agrupadas numa mesma meta (mantém a meta pequena)

// ─── Estruturas internas ─────────────────────────────────────────────────────

// bloco = unidade de estudo (teoria? + questões) sobre tópicos consecutivos de uma matéria
interface Bloco {
  materia: string
  topicos: string[]
  nivel: TrilhaNivelMateria // nível efetivo do bloco (tópicos já estudados viram "arestas")
  teoriaMin: number // 0 = sem teoria
  questoes: number
  questoesMin: number
}

interface RevisaoPendente {
  materia: string
  topicos: string[]
  numeroRevisao: 1 | 2
  venceEmMinuto: number // minutos de estudo acumulados a partir dos quais a revisão pode entrar numa meta
  duracaoMin: number
}

function duracaoBloco(b: Bloco): number {
  return b.teoriaMin + b.questoesMin
}

// ─── Montagem dos blocos por matéria ─────────────────────────────────────────

function montarBlocosDaMateria(
  materia: MateriaBase,
  nivelDeclarado: TrilhaNivelMateria,
  topicosState: Record<string, TopicoState>
): Bloco[] {
  const blocos: Bloco[] = []
  let atual: Bloco | null = null

  for (const topico of materia.topicos) {
    // nível efetivo: tópico já estudado no Edital não repete teoria (vira "arestas")
    const jaEstudado = topicosState[topicoKey(materia.nome, topico)]?.estudado === true
    const nivel: TrilhaNivelMateria = jaEstudado ? "arestas" : nivelDeclarado
    const p = NIVEL_PARAMS[nivel]

    // quebra de bloco quando o nível efetivo muda (teoria e só-questões não se misturam)
    if (atual && atual.nivel !== nivel) {
      blocos.push(atual)
      atual = null
    }
    if (!atual) {
      atual = { materia: materia.nome, topicos: [], nivel, teoriaMin: 0, questoes: 0, questoesMin: 0 }
    }

    atual.topicos.push(topico)
    atual.teoriaMin += p.teoriaMin
    atual.questoes += p.questoes
    atual.questoesMin += p.questoes * MIN_POR_QUESTAO

    const comTeoria = p.teoriaMin > 0
    const fechou = comTeoria
      ? atual.topicos.length >= 3 || duracaoBloco(atual) >= 150
      : atual.topicos.length >= 5 || atual.questoesMin >= 120
    if (fechou) {
      blocos.push(atual)
      atual = null
    }
  }
  if (atual) blocos.push(atual)
  return blocos
}

// ─── Geração das metas ───────────────────────────────────────────────────────

function idAtividade(meta: number, tipo: string, materia: string, primeiroTopico: string): string {
  return `${meta}:${tipo}:${materia}:${primeiroTopico}`
}

export function gerarTrilha(params: {
  materias: MateriaBase[]
  config: TrilhaConfig
  topicos: Record<string, TopicoState>
  configCiclo: EstudoConfigCiclo
  // matérias "graduadas" (100% concluídas na trilha) — não recebem teoria/questões novas,
  // só continuam sendo revisadas pelas revisões espaçadas já agendadas anteriormente
  materiasConcluidas?: string[]
}): TrilhaMeta[] {
  const { materias, config, topicos, configCiclo, materiasConcluidas } = params
  const orcamento = TRILHA_DISPONIBILIDADE_CONFIG[config.disponibilidade].minutosSemana

  // filas de blocos por matéria, na ordem do edital — fonte de verdade de "matéria ativa" é o
  // Ciclo de Estudos (configCiclo.materias[].incluir), não mais TrilhaConfig.puladas (deprecated)
  const graduadas = new Set(materiasConcluidas ?? [])
  const ativas = materias.filter(
    (m) => (configCiclo.materias[m.nome]?.incluir ?? false) && !graduadas.has(m.nome) && m.topicos.length > 0
  )
  const filas = new Map<string, Bloco[]>()
  for (const m of ativas) {
    const nivel = config.nivelPorMateria[m.nome] ?? "nunca"
    const blocos = montarBlocosDaMateria(m, nivel, topicos)
    if (blocos.length > 0) filas.set(m.nome, blocos)
  }

  // rotação ponderada suave ("smooth weighted round-robin"): a cada bloco escolhido, soma o
  // peso de cada matéria ativa ao seu crédito, pega a de maior crédito e desconta o peso total
  // dela — dá exatamente a proporção certa (peso 2 aparece ~2x mais que peso 1) sem agrupar
  // vários blocos consecutivos da mesma matéria numa única meta.
  interface Rotacao { nome: string; peso: number; credito: number }
  const rotacao: Rotacao[] = ativas
    .filter((m) => filas.has(m.nome))
    .map((m) => {
      const pesoCiclo = configCiclo.materias[m.nome]?.peso ?? 1
      const nivel = config.nivelPorMateria[m.nome] ?? "nunca"
      return { nome: m.nome, peso: pesoCiclo * NIVEL_PARAMS[nivel].fator, credito: 0 }
    })

  function proximaMateriaComBloco(): string | null {
    const candidatas = rotacao.filter((r) => (filas.get(r.nome)?.length ?? 0) > 0)
    if (candidatas.length === 0) return null
    const pesoTotal = candidatas.reduce((s, r) => s + r.peso, 0)
    for (const r of candidatas) r.credito += r.peso
    candidatas.sort((a, b) => b.credito - a.credito || a.nome.localeCompare(b.nome))
    const escolhida = candidatas[0]
    escolhida.credito -= pesoTotal
    return escolhida.nome
  }

  const metas: TrilhaMeta[] = []
  const revisoesPendentes: RevisaoPendente[] = []
  let minutosDecorridos = 0 // relógio de estudo acumulado — base do vencimento das revisões

  const totalBlocos = () => [...filas.values()].reduce((s, f) => s + f.length, 0)

  while (totalBlocos() > 0 || revisoesPendentes.length > 0) {
    const numero = metas.length + 1
    let atividades: TrilhaAtividade[] = []

    // 1) meta de REVISÃO: se há revisões vencidas (relógio já passou do vencimento), a meta é
    // só isso — pequena, focada, nunca misturada com conteúdo novo
    const vencidas = revisoesPendentes
      .filter((r) => r.venceEmMinuto <= minutosDecorridos)
      .sort((a, b) => a.venceEmMinuto - b.venceEmMinuto)
      .slice(0, MAX_REVISOES_POR_META)
    if (vencidas.length > 0) {
      atividades = vencidas.map((rev) => ({
        id: idAtividade(numero, `revisao${rev.numeroRevisao}`, rev.materia, rev.topicos[0]),
        tipo: "revisao" as const,
        materia: rev.materia,
        topicos: rev.topicos,
        duracaoMin: rev.duracaoMin,
        numeroRevisao: rev.numeroRevisao,
        status: "nao_iniciada" as const,
      }))
      for (const rev of vencidas) revisoesPendentes.splice(revisoesPendentes.indexOf(rev), 1)
    } else {
      // 2) meta de CONTEÚDO: exatamente 1 bloco (poucos tópicos) de UMA matéria — "conclua esta
      // matéria/tópico", nada de empacotar várias matérias na mesma meta
      const materiaEscolhida = proximaMateriaComBloco()
      if (materiaEscolhida) {
        const fila = filas.get(materiaEscolhida)!
        const bloco = fila.shift()!
        if (bloco.teoriaMin > 0) {
          atividades.push({
            id: idAtividade(numero, "teoria", bloco.materia, bloco.topicos[0]),
            tipo: "teoria",
            materia: bloco.materia,
            topicos: bloco.topicos,
            duracaoMin: bloco.teoriaMin,
            ...(bloco.nivel === "sem_confianca" ? { teoriaRapida: true } : {}),
            status: "nao_iniciada",
          })
        }
        atividades.push({
          id: idAtividade(numero, "questoes", bloco.materia, bloco.topicos[0]),
          tipo: "questoes",
          materia: bloco.materia,
          topicos: bloco.topicos,
          duracaoMin: bloco.questoesMin,
          quantidadeQuestoes: bloco.questoes,
          status: "nao_iniciada",
        })

        // agenda as revisões espaçadas do bloco a partir do relógio de estudo NO FECHAMENTO
        // desta meta (não do índice dela — metas não valem mais 1 semana cada)
        const minutosNoFechamento = minutosDecorridos + duracaoBloco(bloco)
        revisoesPendentes.push(
          { materia: bloco.materia, topicos: bloco.topicos, numeroRevisao: 1, venceEmMinuto: minutosNoFechamento + orcamento, duracaoMin: REV1_MIN },
          { materia: bloco.materia, topicos: bloco.topicos, numeroRevisao: 2, venceEmMinuto: minutosNoFechamento + 4 * orcamento, duracaoMin: REV2_MIN }
        )
      }
    }

    // 3) rabo da trilha: nem revisão vencida nem bloco de conteúdo disponível, mas ainda há
    // revisões pendentes no futuro — força as mais próximas do vencimento (evita loop infinito
    // e evita deixar revisão pra trás só porque o relógio ainda não "virou")
    if (atividades.length === 0 && revisoesPendentes.length > 0) {
      const grupo = [...revisoesPendentes].sort((a, b) => a.venceEmMinuto - b.venceEmMinuto).slice(0, MAX_REVISOES_POR_META)
      atividades = grupo.map((rev) => ({
        id: idAtividade(numero, `revisao${rev.numeroRevisao}`, rev.materia, rev.topicos[0]),
        tipo: "revisao" as const,
        materia: rev.materia,
        topicos: rev.topicos,
        duracaoMin: rev.duracaoMin,
        numeroRevisao: rev.numeroRevisao,
        status: "nao_iniciada" as const,
      }))
      for (const rev of grupo) revisoesPendentes.splice(revisoesPendentes.indexOf(rev), 1)
    }

    if (atividades.length === 0) break // segurança contra loop infinito (não deve acontecer)
    minutosDecorridos += atividades.reduce((s, a) => s + a.duracaoMin, 0)
    metas.push({ numero, atividades })
  }

  // invariante de cobertura: todo tópico não-pulado aparece em questões + rev.1 + rev.2 (e a
  // teoria quando o nível pede). Erro aqui é bug do gerador — melhor estourar cedo que gerar
  // trilha furada.
  const faltantes = topicosSemCobertura(metas, ativas)
  if (faltantes.length > 0) {
    throw new Error(`trilha-generator: ${faltantes.length} tópico(s) sem cobertura — ex.: ${faltantes[0]}`)
  }

  return metas
}

function topicosSemCobertura(metas: TrilhaMeta[], materias: MateriaBase[]): string[] {
  const cobertos = { questoes: new Set<string>(), rev1: new Set<string>(), rev2: new Set<string>() }
  for (const meta of metas) {
    for (const a of meta.atividades) {
      for (const t of a.topicos) {
        const k = topicoKey(a.materia, t)
        if (a.tipo === "questoes") cobertos.questoes.add(k)
        if (a.tipo === "revisao" && a.numeroRevisao === 1) cobertos.rev1.add(k)
        if (a.tipo === "revisao" && a.numeroRevisao === 2) cobertos.rev2.add(k)
      }
    }
  }
  const faltando: string[] = []
  for (const m of materias) {
    for (const t of m.topicos) {
      const k = topicoKey(m.nome, t)
      if (!cobertos.questoes.has(k) || !cobertos.rev1.has(k) || !cobertos.rev2.has(k)) faltando.push(k)
    }
  }
  return faltando
}

// ─── Resumo / projeções ──────────────────────────────────────────────────────

export function estimarResumo(
  metas: TrilhaMeta[],
  disponibilidade: TrilhaDisponibilidade,
  dataProva?: string
): {
  totalMetas: number
  totalMinutos: number
  semanasEstimadas: number
  dataProjetada: Date
  diasAteProva?: number
  cabeAteProva?: boolean
} {
  const totalMinutos = metas.reduce((s, m) => s + m.atividades.reduce((a, x) => a + x.duracaoMin, 0), 0)
  // metas agora são pequenas (1 bloco ou poucas revisões) — não valem mais 1 semana cada. As
  // semanas vêm do tempo total dividido pelo orçamento semanal da disponibilidade escolhida.
  const orcamentoSemanal = TRILHA_DISPONIBILIDADE_CONFIG[disponibilidade].minutosSemana
  const semanasEstimadas = Math.max(1, Math.ceil(totalMinutos / orcamentoSemanal))
  const dataProjetada = new Date()
  dataProjetada.setDate(dataProjetada.getDate() + semanasEstimadas * 7)

  const resultado = { totalMetas: metas.length, totalMinutos, semanasEstimadas, dataProjetada }
  if (!dataProva) return resultado
  const prova = new Date(dataProva)
  if (Number.isNaN(prova.getTime())) return resultado
  const diasAteProva = Math.round((prova.getTime() - Date.now()) / 86_400_000)
  return { ...resultado, diasAteProva, cabeAteProva: dataProjetada.getTime() <= prova.getTime() }
}

// ritmo real: metas concluídas ÷ semanas desde a criação; null enquanto não há meta concluída
// (a UI mostra a estimativa inicial baseada no tempo total ÷ disponibilidade nesse caso — ver
// estimarResumo — já que metas pequenas não valem mais 1 semana cada)
export function projetarTermino(trilha: TrilhaEstudo): {
  metasConcluidas: number
  ritmoMetasPorSemana: number | null
  dataProjetada: Date | null
} {
  const concluidas = trilha.metas.filter((m) => m.concluidaEm).length
  const restantes = trilha.metas.length - concluidas
  const semanasDecorridas = Math.max(
    1 / 7,
    (Date.now() - new Date(trilha.criadaEm).getTime()) / (7 * 86_400_000)
  )
  if (concluidas === 0) {
    // sem dado real de ritmo ainda: estima pelas semanas totais da trilha (tempo ÷ disponibilidade)
    const totalMinutos = trilha.metas.reduce((s, m) => s + m.atividades.reduce((a, x) => a + x.duracaoMin, 0), 0)
    const orcamentoSemanal = TRILHA_DISPONIBILIDADE_CONFIG[trilha.config.disponibilidade].minutosSemana
    const semanasEstimadas = Math.max(1, Math.ceil(totalMinutos / orcamentoSemanal))
    const d = new Date()
    d.setDate(d.getDate() + semanasEstimadas * 7)
    return { metasConcluidas: 0, ritmoMetasPorSemana: null, dataProjetada: restantes > 0 ? d : null }
  }
  const ritmo = concluidas / semanasDecorridas
  const d = new Date()
  d.setDate(d.getDate() + Math.ceil((restantes / ritmo) * 7))
  return { metasConcluidas: concluidas, ritmoMetasPorSemana: Math.round(ritmo * 10) / 10, dataProjetada: restantes > 0 ? d : null }
}

// ─── Atualização incremental (tópicos novos no concurso) ─────────────────────

// matéria "graduada": todas as atividades de todas as metas dessa matéria estão concluídas —
// calculado sempre em runtime (não persistido), pra nunca dessincronizar de uma reversão de
// status (proximoStatus cicla de volta a "nao_iniciada")
export function materiasConcluidasNaTrilha(trilha: TrilhaEstudo): string[] {
  const porMateria = new Map<string, { total: number; concluidas: number }>()
  for (const meta of trilha.metas) {
    for (const a of meta.atividades) {
      const acc = porMateria.get(a.materia) ?? { total: 0, concluidas: 0 }
      acc.total++
      if (a.status === "concluida") acc.concluidas++
      porMateria.set(a.materia, acc)
    }
  }
  return [...porMateria.entries()].filter(([, v]) => v.total > 0 && v.total === v.concluidas).map(([nome]) => nome)
}

// tópicos das matérias ativas no Ciclo (menos as já graduadas) que não aparecem em nenhuma
// atividade de questões da trilha
export function topicosNaoCobertos(
  trilha: TrilhaEstudo,
  materias: MateriaBase[],
  configCiclo: EstudoConfigCiclo
): string[] {
  const cobertos = new Set<string>()
  for (const meta of trilha.metas) {
    for (const a of meta.atividades) {
      if (a.tipo !== "questoes") continue
      for (const t of a.topicos) cobertos.add(topicoKey(a.materia, t))
    }
  }
  const graduadas = new Set(materiasConcluidasNaTrilha(trilha))
  const faltando: string[] = []
  for (const m of materias) {
    if (!(configCiclo.materias[m.nome]?.incluir ?? false)) continue
    if (graduadas.has(m.nome)) continue
    for (const t of m.topicos) {
      const k = topicoKey(m.nome, t)
      if (!cobertos.has(k)) faltando.push(k)
    }
  }
  return faltando
}

// Anexa metas novas cobrindo só o conteúdo faltante (edital atualizado); metas existentes
// ficam intactas e a numeração continua de onde parou.
export function atualizarTrilha(
  trilha: TrilhaEstudo,
  materias: MateriaBase[],
  topicos: Record<string, TopicoState>,
  configCiclo: EstudoConfigCiclo
): TrilhaEstudo {
  const faltantes = new Set(topicosNaoCobertos(trilha, materias, configCiclo))
  if (faltantes.size === 0) return trilha

  // recorta as matérias pros tópicos faltantes, preservando a ordem do edital
  const materiasRecortadas: MateriaBase[] = materias
    .map((m) => ({ nome: m.nome, topicos: m.topicos.filter((t) => faltantes.has(topicoKey(m.nome, t))) }))
    .filter((m) => m.topicos.length > 0)

  const materiasConcluidas = materiasConcluidasNaTrilha(trilha)
  const novasMetas = gerarTrilha({ materias: materiasRecortadas, config: trilha.config, topicos, configCiclo, materiasConcluidas })
  const offset = trilha.metas.length
  const renumeradas = novasMetas.map((meta) => ({
    ...meta,
    numero: meta.numero + offset,
    atividades: meta.atividades.map((a) => ({
      ...a,
      id: a.id.replace(/^\d+:/, `${meta.numero + offset}:`),
    })),
  }))

  return { ...trilha, metas: [...trilha.metas, ...renumeradas], versao: trilha.versao + 1 }
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

const CICLO_STATUS: TrilhaAtividadeStatus[] = ["nao_iniciada", "iniciada", "falta_acabar", "concluida"]

export function proximoStatus(s: TrilhaAtividadeStatus): TrilhaAtividadeStatus {
  return CICLO_STATUS[(CICLO_STATUS.indexOf(s) + 1) % CICLO_STATUS.length]
}

// primeira meta com atividade pendente; se tudo concluído, aponta pra última
export function metaAtualIndex(metas: TrilhaMeta[]): number {
  const idx = metas.findIndex((m) => m.atividades.some((a) => a.status !== "concluida"))
  return idx === -1 ? metas.length - 1 : idx
}
