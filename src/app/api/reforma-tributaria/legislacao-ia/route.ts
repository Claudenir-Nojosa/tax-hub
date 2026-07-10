import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../auth"
import { buscarTrechosRelevantes, extrairTermosCnae } from "@/lib/reforma-legislacao-busca"

// Passo 3 do wizard de Reforma Tributária: busca, nas 3 legislações da reforma (LC 214/2025,
// Decreto CBS, Resolução CGIBS), trechos que tragam tratamento específico para o(s) CNAE(s) da
// empresa (alíquota reduzida, crédito presumido, regime diferenciado etc). A IA só INTERPRETA os
// trechos encontrados por busca de termos — nunca lê os ~900k caracteres de cada legislação
// inteira (estouraria contexto e custaria caro). O resultado é só uma sugestão pro usuário
// confirmar/complementar na tela — nada disso é escrito direto na aba "Legislações" do Excel.

export const maxDuration = 60

interface CnaeInput {
  codigo: string
  descricao: string
}

interface AchadoLegislacao {
  fonte: string
  artigoOuTrecho: string
  resumo: string
}

function limparRespostaJson(texto: string): string {
  return texto.replace(/```json|```/g, "").trim()
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
  }

  const body = await req.json()
  const cnaePrincipal = body.cnaePrincipal as CnaeInput | undefined
  const cnaesSecundarios = (body.cnaesSecundarios as CnaeInput[] | undefined) ?? []

  if (!cnaePrincipal?.descricao) {
    return NextResponse.json({ error: "cnaePrincipal é obrigatório" }, { status: 400 })
  }

  const todosCnaes = [cnaePrincipal, ...cnaesSecundarios].filter((c) => c.descricao)
  const termos = Array.from(new Set(todosCnaes.flatMap((c) => extrairTermosCnae(c.descricao))))

  if (termos.length === 0) {
    return NextResponse.json({
      encontrado: false,
      resumo: "Não foi possível extrair termos de busca da descrição do CNAE — revise manualmente as legislações.",
      achados: [] as AchadoLegislacao[],
    })
  }

  const trechos = buscarTrechosRelevantes(termos)
  if (trechos.length === 0) {
    return NextResponse.json({
      encontrado: false,
      resumo: "Nenhum trecho específico para essa atividade foi encontrado nas 3 legislações — não há indício de tratamento diferenciado (alíquota reduzida, crédito presumido, regime específico) para este CNAE.",
      achados: [] as AchadoLegislacao[],
    })
  }

  const contexto = trechos
    .map((t, i) => `[Trecho ${i + 1} — ${t.fonte}, termo "${t.termo}"]\n${t.trecho}`)
    .join("\n\n---\n\n")
    .slice(0, 60_000)

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })

  const prompt = `Você é um especialista em Reforma Tributária brasileira (EC 132/2023, LC 214/2025, IBS/CBS).

Empresa com CNAE principal "${cnaePrincipal.codigo} - ${cnaePrincipal.descricao}"${
    cnaesSecundarios.length > 0
      ? ` e CNAEs secundários: ${cnaesSecundarios.map((c) => `${c.codigo} - ${c.descricao}`).join("; ")}`
      : ""
  }.

Abaixo estão trechos das legislações da reforma tributária, encontrados por busca de palavras-chave relacionadas à atividade da empresa. Analise SOMENTE esses trechos (não invente conteúdo fora deles) e identifique se há tratamento tributário ESPECÍFICO para essa atividade: alíquota reduzida, isenção, crédito presumido, regime diferenciado, split payment específico, etc.

Trechos:
${contexto}

Responda SOMENTE com um JSON válido, sem markdown, no formato exato:
{"encontrado": boolean, "resumo": "resumo em 1-2 frases do que foi encontrado (ou de que nada específico foi encontrado)", "achados": [{"fonte": "nome da lei/decreto/resolução", "artigoOuTrecho": "identificação do artigo se citado no texto, ou 'trecho sem numeração explícita'", "resumo": "o que esse trecho diz sobre o tratamento tributário da atividade"}]}

Se os trechos não trouxerem nada realmente específico para essa atividade (mesmo tendo batido na busca por palavra), responda encontrado: false e achados: [].`

  let respostaTexto = ""
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    })
    respostaTexto = completion.choices[0]?.message?.content ?? ""
  } catch (e) {
    return NextResponse.json(
      { error: `Erro da IA ao analisar legislação: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }

  try {
    const json = JSON.parse(limparRespostaJson(respostaTexto))
    return NextResponse.json({
      encontrado: Boolean(json.encontrado),
      resumo: String(json.resumo ?? ""),
      achados: Array.isArray(json.achados) ? (json.achados as AchadoLegislacao[]) : [],
    })
  } catch {
    return NextResponse.json(
      { error: "A IA retornou uma resposta em formato inesperado — tente novamente" },
      { status: 502 }
    )
  }
}
