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

// Busca janelas de contexto ao redor de cada termo, por fonte. Sobreposições próximas são
// mescladas pra não duplicar o mesmo artigo várias vezes. `jaCobertas` evita que uma busca
// secundária repita uma região já trazida pela busca principal.
function buscarNaFonte(
  texto: string,
  termos: string[],
  cap: number,
  jaCobertas: { inicio: number; fim: number }[] = []
): { inicio: number; fim: number; termo: string; trecho: string }[] {
  const textoNormalizado = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  const janelas: { inicio: number; fim: number; termo: string }[] = []

  for (const termo of termos) {
    let idx = textoNormalizado.indexOf(termo)
    let ocorrencias = 0
    while (idx !== -1 && ocorrencias < 3) {
      const inicio = Math.max(0, idx - JANELA_CONTEXTO)
      const fim = Math.min(texto.length, idx + termo.length + JANELA_CONTEXTO)
      if (!jaCobertas.some((c) => inicio <= c.fim && fim >= c.inicio)) {
        janelas.push({ inicio, fim, termo })
      }
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

  return mescladas.slice(0, cap).map((j) => ({ ...j, trecho: texto.slice(j.inicio, j.fim).trim() }))
}

// Busca trechos relevantes nas 3 legislações — termos do CNAE PRINCIPAL têm prioridade e um
// orçamento generoso; termos dos CNAEs secundários só preenchem o restante, sem competir posição
// a posição com os principais (bug corrigido: antes, um único corte por posição no documento
// deixava CNAEs secundários genéricos — "produtos alimentícios", "cosméticos" etc — engolirem o
// espaço de trechos específicos do CNAE principal que apareciam mais adiante no texto, mesmo eles
// sendo o que realmente importa). Retorna vazio só se NENHUM termo bater — o chamador decide como
// comunicar "nada específico encontrado" ao usuário.
export function buscarTrechosRelevantes(termosPrincipais: string[], termosSecundarios: string[] = []): TrechoEncontrado[] {
  const CAP_PRINCIPAL = 10
  const CAP_SECUNDARIO = 4
  if (termosPrincipais.length === 0 && termosSecundarios.length === 0) return []

  const resultado: TrechoEncontrado[] = []
  for (const fonte of FONTES_LEGISLACAO) {
    const texto = carregarTexto(fonte)
    const principais = buscarNaFonte(texto, termosPrincipais, CAP_PRINCIPAL)
    const secundarios = buscarNaFonte(texto, termosSecundarios, CAP_SECUNDARIO, principais)
    for (const e of [...principais, ...secundarios]) {
      resultado.push({ fonte: fonte.nome, termo: e.termo, trecho: e.trecho })
    }
  }
  return resultado
}
