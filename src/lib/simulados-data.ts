import type { Alternativa } from "./estudo-data"

// Currículo de Simulados (prova real em PDF + gabarito oficial) — compartilhado por concurso,
// tabela própria (SimuladoConcurso no schema.prisma), fora do blob EstudoState de propósito
// (mesmo motivo que já tirou PdfConcurso/ResumoEstudo de lá: baixo volume de escrita, não precisa
// viajar em todo autosave). Ver plano em .claude/plans (Simulados + Discursiva) pro desenho geral.

export type ItemGabarito = { numero: number; alternativaCorreta: Alternativa | null }

export type ParteSimulado = {
  id: string
  nome: string
  numeroQuestoes: number
  tempoMinutos: number
  gabarito: ItemGabarito[]
}

export type SimuladoConcurso = {
  id: string
  nome: string
  orgao?: string
  banca?: string
  ano?: number
  storagePath: string
  arquivoEnviado: boolean
  partes: ParteSimulado[]
  criadoEm: string
  updatedAt: string
}

export function novoIdSimulado(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function novaParteSimulado(nome: string): ParteSimulado {
  return { id: `parte_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, nome, numeroQuestoes: 0, tempoMinutos: 240, gabarito: [] }
}

// gabarito alinhado ao numeroQuestoes atual da parte — cresce/encolhe preservando o que já tinha
// marcado, pra editar "número de questões" sem perder o gabarito já digitado
export function alinharGabarito(parte: ParteSimulado): ItemGabarito[] {
  const porNumero = new Map(parte.gabarito.map((g) => [g.numero, g.alternativaCorreta]))
  const resultado: ItemGabarito[] = []
  for (let n = 1; n <= parte.numeroQuestoes; n++) {
    resultado.push({ numero: n, alternativaCorreta: porNumero.get(n) ?? null })
  }
  return resultado
}

// ─── Tentativas (Fase 2 — fazer a prova) ──────────────────────────────────────
// Cronômetro de PAREDE: iniciadoEm é gravado no servidor assim que o usuário aperta "Iniciar" —
// o countdown (TimerParte.tsx) sempre recalcula "quanto falta" a partir desse timestamp fixo, não
// de um contador em memória — sobrevive a refresh/fechar aba/trocar de dispositivo sem drift.

export type RespostaTentativa = { numero: number; alternativaMarcada: Alternativa | null }

export type ParteTentativa = {
  parteId: string
  iniciadoEm?: string
  concluidoEm?: string
  respostas: RespostaTentativa[]
}

export type TentativaSimulado = {
  id: string
  simuladoId: string
  status: "em_andamento" | "concluida"
  partes: ParteTentativa[]
  criadoEm: string
  concluidaEm?: string
}

export function novaTentativaPartes(simulado: SimuladoConcurso): ParteTentativa[] {
  return simulado.partes.map((p) => ({ parteId: p.id, respostas: [] }))
}

// respostas alinhadas ao numeroQuestoes atual da parte, preservando o que já tinha marcado —
// mesma ideia de alinharGabarito, usada pra semear a edição do gabarito DO USUÁRIO numa tentativa
export function alinharRespostas(parte: ParteSimulado, tentativaParte?: ParteTentativa): RespostaTentativa[] {
  const porNumero = new Map((tentativaParte?.respostas ?? []).map((r) => [r.numero, r.alternativaMarcada]))
  const resultado: RespostaTentativa[] = []
  for (let n = 1; n <= parte.numeroQuestoes; n++) {
    resultado.push({ numero: n, alternativaMarcada: porNumero.get(n) ?? null })
  }
  return resultado
}

export type ResultadoParte = {
  acertos: number
  erros: number
  semResposta: number
  total: number
  percentual: number | null
  minutosGastos: number | null
}

export function calcularResultadoParte(parte: ParteSimulado, tentativaParte?: ParteTentativa): ResultadoParte {
  const respostasPorNumero = new Map((tentativaParte?.respostas ?? []).map((r) => [r.numero, r.alternativaMarcada]))
  let acertos = 0, erros = 0, semResposta = 0
  for (const item of parte.gabarito) {
    const marcada = respostasPorNumero.get(item.numero) ?? null
    if (!marcada) semResposta++
    else if (item.alternativaCorreta && marcada === item.alternativaCorreta) acertos++
    else erros++
  }
  const total = parte.gabarito.length
  const minutosGastos =
    tentativaParte?.iniciadoEm && tentativaParte?.concluidoEm
      ? Math.round((new Date(tentativaParte.concluidoEm).getTime() - new Date(tentativaParte.iniciadoEm).getTime()) / 60000)
      : null
  return { acertos, erros, semResposta, total, percentual: total > 0 ? Math.round((acertos / total) * 100) : null, minutosGastos }
}
