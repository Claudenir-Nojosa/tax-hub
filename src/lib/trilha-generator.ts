// Gerador determinístico da Trilha de Estudos (plano guiado por metas, estilo Gurujá/Duolingo).
// Cada META é PEQUENA e tem UM objetivo só: estudar um bloco de tópicos NOVOS (ainda não
// estudados) de UMA matéria. Só isso — SEM tarefas de "questões" e SEM revisão espaçada (pedido
// explícito do usuário: a Trilha é só pra tópicos novos; tópicos já marcados `estudado:true` no
// Edital ficam de fora da trilha por completo, e não há mais rev.1/rev.2 agendadas — praticar
// questões e revisar fica a cargo do próprio usuário fora da Trilha). Metas grandes e pesadas
// desmotivam; muitas metas pequenas, cada uma "conclua esta matéria/tópico", combinam com o
// visual de caminho (1 nó = 1 meta = 1 bloco de teoria de 1 matéria). Sem IA aqui de propósito:
// geração instantânea, reprodutível e recalculável — a IA só escreve as `orientacao` das metas
// depois (rota /api/estudo/trilha/orientacoes).
//
// Regras numéricas (fechadas no plano aprovado):
//   Por tópico, conforme nível declarado da matéria (tópico já `estudado` no Edital ⇒ EXCLUÍDO,
//   não entra em bloco nenhum — não é "tópico novo"):
//     nunca          teoria 90min (primeira leitura completa)
//     comecei        teoria 60min (já começou, foca no que falta)
//     sem_confianca  teoria 30min, rápida (já terminou, só reforça)
//     arestas        teoria 15min, rápida (só bate o olho de novo)
//   Blocos (tópicos consecutivos e ainda-não-estudados, na ordem do edital, de UMA matéria):
//   fecha em 3 tópicos OU ≥150min de teoria acumulada. Cada bloco = 1 meta = 1 atividade.
//   Intercalação entre matérias: escolhida bloco a bloco por round-robin ponderado suave
//   ("smooth weighted round-robin" — peso pesoCiclo(1|2) × fatorNivel, nunca 1.5 / comecei 1.3 /
//   sem_confianca 1.0 / arestas 0.7).

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
  { teoriaMin: number; teoriaRapida: boolean; fator: number }
> = {
  nunca: { teoriaMin: 90, teoriaRapida: false, fator: 1.5 },
  comecei: { teoriaMin: 60, teoriaRapida: false, fator: 1.3 },
  sem_confianca: { teoriaMin: 30, teoriaRapida: true, fator: 1.0 },
  arestas: { teoriaMin: 15, teoriaRapida: true, fator: 0.7 },
}

// ─── Estruturas internas ─────────────────────────────────────────────────────

// bloco = unidade de estudo (teoria) sobre tópicos consecutivos AINDA NÃO ESTUDADOS de uma matéria
interface Bloco {
  materia: string
  topicos: string[]
  teoriaMin: number
  teoriaRapida: boolean
}

// ─── Montagem dos blocos por matéria ─────────────────────────────────────────

// tópicos já marcados `estudado:true` no Edital são PULADOS (não entram em bloco nenhum) — a
// Trilha só estuda o que ainda não foi estudado. O nível declarado (nunca/comecei/sem_confianca/
// arestas) vale igual pra todos os tópicos restantes da matéria — não muda mais por tópico.
function montarBlocosDaMateria(
  materia: MateriaBase,
  nivelDeclarado: TrilhaNivelMateria,
  topicosState: Record<string, TopicoState>
): Bloco[] {
  const p = NIVEL_PARAMS[nivelDeclarado]
  const blocos: Bloco[] = []
  let atual: Bloco | null = null

  for (const topico of materia.topicos) {
    const jaEstudado = topicosState[topicoKey(materia.nome, topico)]?.estudado === true
    if (jaEstudado) continue // já estudado — não é "tópico novo", fica fora da trilha

    if (!atual) {
      atual = { materia: materia.nome, topicos: [], teoriaMin: 0, teoriaRapida: p.teoriaRapida }
    }
    atual.topicos.push(topico)
    atual.teoriaMin += p.teoriaMin

    if (atual.topicos.length >= 3 || atual.teoriaMin >= 150) {
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
  // matérias "graduadas" (100% concluídas na trilha) — não recebem teoria nova numa regeneração
  materiasConcluidas?: string[]
}): TrilhaMeta[] {
  const { materias, config, topicos, configCiclo, materiasConcluidas } = params

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

  // cada meta = exatamente 1 bloco (1 atividade de teoria, 1 matéria) — sem revisão, sem
  // questões, sem "rabo": quando as filas esvaziam, a trilha acaba
  const metas: TrilhaMeta[] = []
  const totalBlocos = () => [...filas.values()].reduce((s, f) => s + f.length, 0)

  while (totalBlocos() > 0) {
    const numero = metas.length + 1
    const materiaEscolhida = proximaMateriaComBloco()
    if (!materiaEscolhida) break
    const fila = filas.get(materiaEscolhida)!
    const bloco = fila.shift()!
    const atividade: TrilhaAtividade = {
      id: idAtividade(numero, "teoria", bloco.materia, bloco.topicos[0]),
      tipo: "teoria",
      materia: bloco.materia,
      topicos: bloco.topicos,
      duracaoMin: bloco.teoriaMin,
      ...(bloco.teoriaRapida ? { teoriaRapida: true } : {}),
      status: "nao_iniciada",
    }
    metas.push({ numero, atividades: [atividade] })
  }

  // invariante de cobertura: todo tópico ainda-não-estudado das matérias ativas aparece em
  // exatamente 1 atividade de teoria. Erro aqui é bug do gerador — melhor estourar cedo que
  // gerar trilha furada.
  const faltantes = topicosSemCobertura(metas, ativas, topicos)
  if (faltantes.length > 0) {
    throw new Error(`trilha-generator: ${faltantes.length} tópico(s) sem cobertura — ex.: ${faltantes[0]}`)
  }

  return metas
}

// só cobra cobertura de tópicos que NÃO estão marcados estudado:true no Edital — esses ficam
// intencionalmente fora da trilha (não são "tópicos novos")
function topicosSemCobertura(metas: TrilhaMeta[], materias: MateriaBase[], topicosState: Record<string, TopicoState>): string[] {
  const cobertos = new Set<string>()
  for (const meta of metas) {
    for (const a of meta.atividades) {
      for (const t of a.topicos) cobertos.add(topicoKey(a.materia, t))
    }
  }
  const faltando: string[] = []
  for (const m of materias) {
    for (const t of m.topicos) {
      const k = topicoKey(m.nome, t)
      if (topicosState[k]?.estudado === true) continue
      if (!cobertos.has(k)) faltando.push(k)
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

// tópicos das matérias ativas no Ciclo (menos as já graduadas, e menos os já marcados
// estudado:true no Edital — esses ficam intencionalmente fora da trilha) que não aparecem em
// nenhuma atividade de teoria da trilha
export function topicosNaoCobertos(
  trilha: TrilhaEstudo,
  materias: MateriaBase[],
  configCiclo: EstudoConfigCiclo,
  topicosState: Record<string, TopicoState>
): string[] {
  const cobertos = new Set<string>()
  for (const meta of trilha.metas) {
    for (const a of meta.atividades) {
      if (a.tipo !== "teoria") continue
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
      if (topicosState[k]?.estudado === true) continue
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
  const faltantes = new Set(topicosNaoCobertos(trilha, materias, configCiclo, topicos))
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
