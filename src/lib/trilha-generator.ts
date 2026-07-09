// Gerador determinístico da Trilha de Estudos (plano guiado por metas, estilo Gurujá).
// Monta metas sequenciais que cobrem 100% do edital: cada tópico não-pulado aparece em
// exatamente 1 bloco de estudo (teoria quando aplicável + questões) + 2 revisões espaçadas
// (rev.1 na meta seguinte ≈ 7 dias, rev.2 quatro metas depois ≈ 30 dias, no ritmo de 1
// meta/semana). Sem IA aqui de propósito: geração instantânea, reprodutível e recalculável —
// a IA só escreve as `orientacao` das metas depois (rota /api/estudo/trilha/orientacoes).
//
// Regras numéricas (fechadas no plano aprovado):
//   Orçamento da meta = minutosSemana da disponibilidade; fecha quando restante < 60 min.
//   Por tópico, conforme nível EFETIVO da matéria (tópico já `estudado` no Edital ⇒ "arestas"):
//     nunca          teoria 90min  · 10 questões (30min) · rev.1 12min · rev.2 8min
//     comecei        teoria 90min  · 12 questões (36min) · rev.1 12min · rev.2 8min
//     sem_confianca  teoria 40min  · 15 questões (45min) · rev.1 12min · rev.2 8min
//     arestas        SEM teoria    · 20 questões (60min) · rev.1 12min · rev.2 8min
//   Blocos (tópicos consecutivos na ordem do edital): com teoria fecha em 3 tópicos OU ≥150min;
//   só-questões fecha em 5 tópicos OU ≥120min.
//   Intercalação: w = pesoCiclo(1|2) × fatorNivel (nunca 1.5 / comecei 1.3 / sem_confianca 1.0 /
//   arestas 0.7); round-robin por w desc, peso 2 ganha 2 turnos por rodada; máx 4 matérias/meta.
//   Revisões vencidas entram ANTES de conteúdo novo, limitadas a 35% do orçamento da meta.

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
const ORCAMENTO_MINIMO_RESTANTE = 60 // fecha a meta quando sobra menos que isso
const TETO_REVISAO = 0.35 // fração do orçamento da meta reservável a revisões vencidas
const MAX_MATERIAS_POR_META = 4

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
  venceNaMeta: number
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
}): TrilhaMeta[] {
  const { materias, config, topicos, configCiclo } = params
  const orcamento = TRILHA_DISPONIBILIDADE_CONFIG[config.disponibilidade].minutosSemana

  // filas de blocos por matéria, na ordem do edital
  const ativas = materias.filter((m) => !config.puladas.includes(m.nome) && m.topicos.length > 0)
  const filas = new Map<string, Bloco[]>()
  for (const m of ativas) {
    const nivel = config.nivelPorMateria[m.nome] ?? "nunca"
    const blocos = montarBlocosDaMateria(m, nivel, topicos)
    if (blocos.length > 0) filas.set(m.nome, blocos)
  }

  // ordem de intercalação: w = pesoCiclo × fatorNivel, desc; desempate = ordem do edital.
  // Matérias com peso 2 no ciclo ganham 2 turnos por rodada do round-robin.
  const ordem = ativas
    .filter((m) => filas.has(m.nome))
    .map((m, idx) => {
      const pesoCiclo = configCiclo.materias[m.nome]?.peso ?? 1
      const nivel = config.nivelPorMateria[m.nome] ?? "nunca"
      return { nome: m.nome, w: pesoCiclo * NIVEL_PARAMS[nivel].fator, turnos: pesoCiclo >= 2 ? 2 : 1, idx }
    })
    .sort((a, b) => b.w - a.w || a.idx - b.idx)

  const metas: TrilhaMeta[] = []
  const revisoesPendentes: RevisaoPendente[] = []
  let cursor = 0 // posição no round-robin (persistente entre metas, pra rotação justa)

  const totalBlocos = () => [...filas.values()].reduce((s, f) => s + f.length, 0)

  while (totalBlocos() > 0 || revisoesPendentes.length > 0) {
    const numero = metas.length + 1
    const atividades: TrilhaAtividade[] = []
    let restante = orcamento

    // 1) revisões vencidas primeiro (limitadas a 35% do orçamento; excedente adia sozinho)
    let orcamentoRevisao = Math.round(orcamento * TETO_REVISAO)
    const vencidas = revisoesPendentes
      .filter((r) => r.venceNaMeta <= numero)
      .sort((a, b) => a.venceNaMeta - b.venceNaMeta)
    for (const rev of vencidas) {
      if (rev.duracaoMin > orcamentoRevisao || rev.duracaoMin > restante) continue
      atividades.push({
        id: idAtividade(numero, `revisao${rev.numeroRevisao}`, rev.materia, rev.topicos[0]),
        tipo: "revisao",
        materia: rev.materia,
        topicos: rev.topicos,
        duracaoMin: rev.duracaoMin,
        numeroRevisao: rev.numeroRevisao,
        status: "nao_iniciada",
      })
      restante -= rev.duracaoMin
      orcamentoRevisao -= rev.duracaoMin
      revisoesPendentes.splice(revisoesPendentes.indexOf(rev), 1)
    }

    // 2) conteúdo novo via round-robin ponderado. A trava de variedade (máx. 4 matérias) conta
    // só matérias de CONTEÚDO NOVO — revisões são curtas (8-12min) e podem tocar mais matérias
    // sem quebrar o foco da semana.
    const materiasNaMeta = new Set<string>()
    let inseriuAlgo = true
    while (restante >= ORCAMENTO_MINIMO_RESTANTE && totalBlocos() > 0 && inseriuAlgo) {
      inseriuAlgo = false
      for (let volta = 0; volta < ordem.length; volta++) {
        const item = ordem[(cursor + volta) % ordem.length]
        const fila = filas.get(item.nome)
        if (!fila || fila.length === 0) continue

        // trava de variedade: no máx. 4 matérias distintas por meta
        if (!materiasNaMeta.has(item.nome) && materiasNaMeta.size >= MAX_MATERIAS_POR_META) continue

        // insere até `turnos` blocos consecutivos da matéria
        let inseriuDaMateria = false
        for (let t = 0; t < item.turnos && fila.length > 0; t++) {
          const bloco = fila[0]
          if (duracaoBloco(bloco) > restante) break
          fila.shift()

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
          restante -= duracaoBloco(bloco)
          materiasNaMeta.add(bloco.materia)
          inseriuDaMateria = true

          // agenda as revisões espaçadas do bloco
          revisoesPendentes.push(
            { materia: bloco.materia, topicos: bloco.topicos, numeroRevisao: 1, venceNaMeta: numero + 1, duracaoMin: REV1_MIN },
            { materia: bloco.materia, topicos: bloco.topicos, numeroRevisao: 2, venceNaMeta: numero + 4, duracaoMin: REV2_MIN }
          )
        }
        if (inseriuDaMateria) inseriuAlgo = true
        if (restante < ORCAMENTO_MINIMO_RESTANTE) break
      }
      cursor = (cursor + 1) % Math.max(1, ordem.length)
    }

    // 3) rabo da trilha: sem conteúdo novo nem revisão vencida nesta meta. Agrupa TODAS as
    // revisões do próximo vencimento numa única meta (encurta o espaçamento nominal em no
    // máximo o gap até o vencimento — aceitável no final, e evita metas de 8 minutos).
    if (atividades.length === 0 && revisoesPendentes.length > 0) {
      const menorVencimento = Math.min(...revisoesPendentes.map((r) => r.venceNaMeta))
      const grupo = revisoesPendentes.filter((r) => r.venceNaMeta === menorVencimento)
      for (const rev of grupo) {
        if (rev.duracaoMin > restante) break
        revisoesPendentes.splice(revisoesPendentes.indexOf(rev), 1)
        atividades.push({
          id: idAtividade(numero, `revisao${rev.numeroRevisao}`, rev.materia, rev.topicos[0]),
          tipo: "revisao",
          materia: rev.materia,
          topicos: rev.topicos,
          duracaoMin: rev.duracaoMin,
          numeroRevisao: rev.numeroRevisao,
          status: "nao_iniciada",
        })
        restante -= rev.duracaoMin
      }
    }

    if (atividades.length === 0) break // segurança contra loop infinito (não deve acontecer)
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
  const semanasEstimadas = metas.length // ritmo livre: 1 meta ≈ 1 semana
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
// (a UI mostra a estimativa inicial de 1 meta/semana nesse caso)
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
    const d = new Date()
    d.setDate(d.getDate() + restantes * 7)
    return { metasConcluidas: 0, ritmoMetasPorSemana: null, dataProjetada: restantes > 0 ? d : null }
  }
  const ritmo = concluidas / semanasDecorridas
  const d = new Date()
  d.setDate(d.getDate() + Math.ceil((restantes / ritmo) * 7))
  return { metasConcluidas: concluidas, ritmoMetasPorSemana: Math.round(ritmo * 10) / 10, dataProjetada: restantes > 0 ? d : null }
}

// ─── Atualização incremental (tópicos novos no concurso) ─────────────────────

// tópicos das matérias não-puladas que não aparecem em nenhuma atividade de questões da trilha
export function topicosNaoCobertos(trilha: TrilhaEstudo, materias: MateriaBase[]): string[] {
  const cobertos = new Set<string>()
  for (const meta of trilha.metas) {
    for (const a of meta.atividades) {
      if (a.tipo !== "questoes") continue
      for (const t of a.topicos) cobertos.add(topicoKey(a.materia, t))
    }
  }
  const faltando: string[] = []
  for (const m of materias) {
    if (trilha.config.puladas.includes(m.nome)) continue
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
  const faltantes = new Set(topicosNaoCobertos(trilha, materias))
  if (faltantes.size === 0) return trilha

  // recorta as matérias pros tópicos faltantes, preservando a ordem do edital
  const materiasRecortadas: MateriaBase[] = materias
    .map((m) => ({ nome: m.nome, topicos: m.topicos.filter((t) => faltantes.has(topicoKey(m.nome, t))) }))
    .filter((m) => m.topicos.length > 0)

  const novasMetas = gerarTrilha({ materias: materiasRecortadas, config: trilha.config, topicos, configCiclo })
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
