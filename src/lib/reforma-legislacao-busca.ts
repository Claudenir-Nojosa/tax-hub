// Busca de trechos relevantes nas 3 legislações da Reforma Tributária (LC 214/2025, Decreto
// CBS, Resolução CGIBS) por CNAE. Os textos completos (~900k caracteres cada) são grandes demais
// para mandar inteiros pra IA — em vez disso, buscamos janelas de contexto ao redor de termos
// derivados da descrição do CNAE (ex: "medicamento", "farmacêutica") e mandamos só os trechos
// relevantes pro gpt-4o interpretar. Mesmo princípio de truncagem de src/app/api/estudo/resumos.

import fs from "fs"
import path from "path"

export interface FonteLegislacao {
  id: string
  nome: string
  arquivo: string
}

export const FONTES_LEGISLACAO: FonteLegislacao[] = [
  { id: "lc214", nome: "Lei Complementar nº 214/2025", arquivo: "lc-214-2025.txt" },
  { id: "decreto-cbs", nome: "Decreto nº 12.955/2026 (Regulamento CBS)", arquivo: "decreto-cbs-12955-2026.txt" },
  { id: "resolucao-cgibs", nome: "Resolução CGIBS nº 6/2026", arquivo: "resolucao-cgibs-6-2026.txt" },
]

const DIR_LEGISLACOES = path.join(process.cwd(), "src", "data", "reforma-legislacoes")

// cache em memória — os arquivos não mudam em runtime, evita reler ~2.7MB de texto a cada request
const cacheTextos = new Map<string, string>()

function carregarTexto(fonte: FonteLegislacao): string {
  const cached = cacheTextos.get(fonte.id)
  if (cached) return cached
  const texto = fs.readFileSync(path.join(DIR_LEGISLACOES, fonte.arquivo), "utf-8")
  cacheTextos.set(fonte.id, texto)
  return texto
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "ou", "a", "o", "as", "os", "para", "com", "em", "por",
  "atividades", "atividade", "outras", "outros", "não", "especificadas", "especificados",
  "comercio", "comércio", "varejista", "atacadista", "geral", "geraes",
])

// Extrai termos "de conteúdo" de uma descrição de CNAE (ex: "Comércio varejista de produtos
// farmacêuticos, sem manipulação de fórmulas" → ["produtos", "farmacêuticos", "manipulação",
// "fórmulas"]) — descarta stopwords e palavras curtas demais pra não gerar ruído na busca.
export function extrairTermosCnae(descricao: string): string[] {
  return Array.from(
    new Set(
      descricao
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // remove acentos pra casar variações
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 5 && !STOPWORDS.has(t))
    )
  )
}

export interface TrechoEncontrado {
  fonte: string
  termo: string
  trecho: string
}

const JANELA_CONTEXTO = 900 // caracteres antes/depois do termo encontrado
const MAX_TRECHOS_POR_FONTE = 6

// Busca janelas de contexto ao redor de cada termo, por fonte. Sobreposições próximas são
// mescladas pra não duplicar o mesmo artigo várias vezes.
function buscarNaFonte(texto: string, termos: string[]): TrechoEncontrado[] {
  const textoNormalizado = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  const janelas: { inicio: number; fim: number; termo: string }[] = []

  for (const termo of termos) {
    let idx = textoNormalizado.indexOf(termo)
    let ocorrencias = 0
    while (idx !== -1 && ocorrencias < 3) {
      janelas.push({
        inicio: Math.max(0, idx - JANELA_CONTEXTO),
        fim: Math.min(texto.length, idx + termo.length + JANELA_CONTEXTO),
        termo,
      })
      ocorrencias++
      idx = textoNormalizado.indexOf(termo, idx + termo.length)
    }
  }
  if (janelas.length === 0) return []

  janelas.sort((a, b) => a.inicio - b.inicio)
  const mescladas: typeof janelas = []
  for (const j of janelas) {
    const ultima = mescladas[mescladas.length - 1]
    if (ultima && j.inicio <= ultima.fim) {
      ultima.fim = Math.max(ultima.fim, j.fim)
    } else {
      mescladas.push({ ...j })
    }
  }

  return mescladas.slice(0, MAX_TRECHOS_POR_FONTE).map((j) => ({
    fonte: "",
    termo: j.termo,
    trecho: texto.slice(j.inicio, j.fim).trim(),
  }))
}

// Busca trechos relevantes nas 3 legislações pra um conjunto de termos de CNAE. Retorna vazio
// se nada bater — o chamador decide como comunicar "nada específico encontrado" ao usuário.
export function buscarTrechosRelevantes(termos: string[]): TrechoEncontrado[] {
  if (termos.length === 0) return []
  const resultado: TrechoEncontrado[] = []
  for (const fonte of FONTES_LEGISLACAO) {
    const texto = carregarTexto(fonte)
    const encontrados = buscarNaFonte(texto, termos)
    for (const e of encontrados) resultado.push({ ...e, fonte: fonte.nome })
  }
  return resultado
}
