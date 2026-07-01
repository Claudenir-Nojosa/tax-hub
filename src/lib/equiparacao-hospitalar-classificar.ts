import type { NotaFiscalServico } from "./nfse-parser"

export type ClassificacaoOportunidade = "Sim" | "Não" | "Meio" | "Dúvida"

export type NotaClassificada = NotaFiscalServico & { oportunidade: ClassificacaoOportunidade }

// A conta OpenAI usada tem um limite baixo de tokens/minuto pro gpt-4o (30.000 TPM observado em
// teste) — lotes maiores reduzem quantas vezes o prompt-base (~1.100 tokens) é repetido, e um
// paralelismo mais conservador evita estourar o limite (a API já faz retry com backoff, mas é
// melhor evitar o 429 na maioria das vezes do que depender só do retry).
const TAMANHO_LOTE = 60
const LOTES_EM_PARALELO = 2

async function classificarLote(
  itens: { id: number; descricao: string }[]
): Promise<Map<number, ClassificacaoOportunidade>> {
  const resultado = new Map<number, ClassificacaoOportunidade>()
  try {
    const res = await fetch("/api/automacoes/equiparacao-hospitalar/classificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erro ao classificar lote")

    for (const c of data.classificacoes as { id: number; classificacao: ClassificacaoOportunidade }[]) {
      resultado.set(c.id, c.classificacao)
    }
  } catch {
    // Falha no lote inteiro (rede, IA fora do ar, etc.) — marca como "Dúvida" pra revisão manual
    // em vez de derrubar a importação inteira.
    for (const item of itens) resultado.set(item.id, "Dúvida")
  }
  return resultado
}

// Classifica todas as notas em lotes, com alguns lotes em paralelo (acelera importações
// grandes), chamando onProgress conforme cada lote termina.
export async function classificarNotas(
  notas: NotaFiscalServico[],
  onProgress?: (atual: number, total: number) => void
): Promise<NotaClassificada[]> {
  const classificacoes = new Map<number, ClassificacaoOportunidade>()

  const inicios: number[] = []
  for (let inicio = 0; inicio < notas.length; inicio += TAMANHO_LOTE) inicios.push(inicio)

  let concluidos = 0
  for (let i = 0; i < inicios.length; i += LOTES_EM_PARALELO) {
    const grupo = inicios.slice(i, i + LOTES_EM_PARALELO)
    await Promise.all(
      grupo.map(async (inicio) => {
        const lote = notas.slice(inicio, inicio + TAMANHO_LOTE)
        const itens = lote.map((n, idx) => ({ id: inicio + idx, descricao: n.descricaoServico }))
        const resultadoLote = await classificarLote(itens)
        for (const [id, classificacao] of resultadoLote) classificacoes.set(id, classificacao)
        concluidos += lote.length
        onProgress?.(Math.min(concluidos, notas.length), notas.length)
      })
    )
  }

  return notas.map((nota, i) => ({
    ...nota,
    oportunidade: classificacoes.get(i) ?? "Dúvida",
  }))
}
