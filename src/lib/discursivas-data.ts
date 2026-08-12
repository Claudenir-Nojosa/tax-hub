// Currículo de Discursivas (temas + rubrica opcional) e respostas do usuário — tabelas próprias
// (DiscursivaTema/DiscursivaResposta no schema.prisma), fora do blob EstudoState, mesmo motivo de
// SimuladoConcurso/SimuladoTentativa (ver src/lib/simulados-data.ts).

export type DiscursivaTema = {
  id: string
  materia?: string
  tema: string
  orientacoes?: string
  pontosChave?: string[]
  criadoEm: string
  updatedAt: string
}

export type FeedbackDiscursiva = {
  pontosFortes: string[]
  pontosFracos: string[]
  sugestoes: string[]
  justificativa: string
}

export type DiscursivaResposta = {
  id: string
  temaId: string
  texto: string
  notaIA: number | null
  feedbackIA: FeedbackDiscursiva | null
  minutosGastos?: number
  criadoEm: string
}

export function novoIdDiscursiva(): string {
  return `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function contarPalavras(texto: string): number {
  const t = texto.trim()
  return t === "" ? 0 : t.split(/\s+/).length
}
