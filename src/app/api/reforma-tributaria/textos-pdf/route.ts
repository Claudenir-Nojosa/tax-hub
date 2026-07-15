import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "../../../../../auth"

// Redige automaticamente os dois textos do PDF executivo da Reforma Tributária (Legislações
// aplicáveis + Considerações finais) com persona de especialista. O usuário revisa/edita no
// editor rico do ExportarPdfDialog antes de salvar e gerar o PDF — a IA só PREENCHE o rascunho.
// Regra fixa (pedido do usuário): as Legislações SEMPRE abrem com o art. 128 do ADCT (EC
// 132/2023) — a redução gradual de ICMS/ISS vale para TODAS as empresas.

export const maxDuration = 60

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
  const {
    razaoSocial = "",
    cnaePrincipal = "",
    cnaePrincipalCodigo = "",
    cnaesSecundarios = [],
    regime = "",
    uf = "",
    reducao60 = false,
    achadosPasso3 = [],
    estatisticas = {},
  } = body as {
    razaoSocial?: string
    cnaePrincipal?: string
    cnaePrincipalCodigo?: string
    cnaesSecundarios?: { codigo: string; descricao: string }[]
    regime?: string
    uf?: string
    reducao60?: boolean
    achadosPasso3?: { fonte: string; artigoOuTrecho: string; resumo: string }[]
    estatisticas?: {
      totalFornecedores?: number
      pctFornecedoresRegimeRegular?: number // 0..1
      total2026?: number
      total2033?: number
      impacto2033Pct?: number // 0..1 (variação vs 2026)
      creditoTotal2033?: number
    }
  }

  const fmtRS = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  const fatos: string[] = []
  if (typeof estatisticas.totalFornecedores === "number" && estatisticas.totalFornecedores > 0) {
    fatos.push(`A empresa tem ${estatisticas.totalFornecedores} fornecedores únicos nas entradas analisadas (EFD ICMS/IPI).`)
  }
  if (typeof estatisticas.pctFornecedoresRegimeRegular === "number") {
    fatos.push(`${Math.round(estatisticas.pctFornecedoresRegimeRegular * 100)}% dos fornecedores estão no Regime Regular (geram crédito integral de IBS/CBS); o restante é do Simples Nacional ou não classificado (crédito vedado/limitado — art. 47, § 9º).`)
  }
  if (typeof estatisticas.total2026 === "number" && typeof estatisticas.total2033 === "number") {
    fatos.push(`Carga total de tributos indiretos projetada no estudo: ${fmtRS(estatisticas.total2026)} em 2026 e ${fmtRS(estatisticas.total2033)} em 2033.`)
  }
  if (typeof estatisticas.impacto2033Pct === "number") {
    fatos.push(`Variação da carga em 2033 vs 2026: ${(estatisticas.impacto2033Pct * 100).toFixed(1).replace(".", ",")}%.`)
  }
  if (typeof estatisticas.creditoTotal2033 === "number" && estatisticas.creditoTotal2033 > 0) {
    fatos.push(`Créditos de IBS/CBS projetados em 2033: ${fmtRS(estatisticas.creditoTotal2033)}.`)
  }

  const prompt = `Você é um pós-doutor em Reforma Tributária brasileira, pós-graduado em Direito Tributário e especialista tributário com longa prática consultiva. Escreve em português, com rigor técnico e didatismo — explica a mecânica prática dos dispositivos, não apenas os cita.

Redija DUAS seções de um relatório executivo sobre os impactos da Reforma Tributária (EC 132/2023 e LC 214/2025) para a empresa abaixo.

EMPRESA
- Razão social: ${razaoSocial}
- CNAE principal: ${cnaePrincipalCodigo} — ${cnaePrincipal}
${cnaesSecundarios.length > 0 ? `- CNAEs secundários: ${cnaesSecundarios.map((c) => `${c.codigo} — ${c.descricao}`).join("; ")}` : ""}
- Regime tributário atual: ${regime}${uf ? ` | UF: ${uf}` : ""}
- Redução de 60% nas alíquotas de IBS/CBS dos débitos (LC 214/2025, art. 133) aplicada no estudo: ${reducao60 ? "SIM" : "NÃO"}

${achadosPasso3.length > 0 ? `ACHADOS DE LEGISLAÇÃO ESPECÍFICOS DA ATIVIDADE (busca prévia nas legislações da reforma):\n${achadosPasso3.map((a) => `- ${a.fonte} (${a.artigoOuTrecho}): ${a.resumo}`).join("\n")}\n` : ""}
${fatos.length > 0 ? `NÚMEROS REAIS DO ESTUDO (use-os nas Considerações finais):\n${fatos.map((f) => `- ${f}`).join("\n")}\n` : ""}
SEÇÃO 1 — "Legislações aplicáveis":
- OBRIGATÓRIO começar pelo art. 128 do ADCT (incluído pela EC 132/2023): a redução gradual das alíquotas de ICMS e ISS na transição — o contribuinte paga 9/10 (90%) da alíquota em 2029, 8/10 (80%) em 2030, 7/10 (70%) em 2031 e 6/10 (60%) em 2032, com extinção em 2033; e o § 1º, que estende a mesma redução proporcional aos benefícios fiscais de ICMS/ISS. Esse dispositivo vale para TODAS as empresas e deve sempre abrir a seção. Explique a mecânica da "rampa" e o porquê dela (convivência dos dois sistemas enquanto o IBS cresce na proporção inversa).
- Depois, os dispositivos da LC 214/2025 relevantes para ESTA atividade: a não cumulatividade plena e o crédito do IBS/CBS (art. 47), incluindo o § 9º (crédito limitado nas aquisições do Simples Nacional) e o § 10 (a saída com alíquota reduzida NÃO obriga estorno proporcional do crédito da entrada, salvo previsão expressa — contraste com a lógica do ICMS atual). ${reducao60 ? "Inclua obrigatoriamente o art. 133 da LC 214/2025 (redução de 60% de IBS/CBS para medicamentos registrados na Anvisa ou produzidos por farmácia de manipulação), com a ressalva de que não se aplica aos medicamentos de alíquota zero do art. 146." : "Inclua os dispositivos aplicáveis ao setor conforme os achados acima (se houver)."}
- 3 a 4 blocos, cada um com um título em negrito (dispositivo + tema) seguido de 2-3 parágrafos explicativos.

SEÇÃO 2 — "Considerações finais":
- Explicar O PORQUÊ dos valores dos tributos no estudo: como a carga da empresa se comporta antes e depois da reforma, dado o setor dela.
- Estruture como: (1) o problema estrutural do sistema atual para essa atividade (cumulatividade, fronteira ICMS×ISS, créditos travados, PIS/COFINS); (2) o que muda com IBS/CBS (não cumulatividade plena, crédito financeiro amplo nas compras de fornecedores do Regime Regular; crédito vedado nas compras do Simples Nacional); (3) o efeito combinado no estudo — use os NÚMEROS REAIS fornecidos acima quando existirem (percentual de fornecedores por regime, totais e variação 2026→2033) para explicar o resultado do quadro comparativo${reducao60 ? ", incluindo o efeito do débito reduzido em 60% com crédito integral e sem estorno (art. 47, § 10)" : ""}.
- Tom consultivo e conclusivo: o leitor é o cliente da consultoria.

FORMATO DA RESPOSTA — SOMENTE um JSON válido, sem markdown:
{"legislacoes": "<html>", "consideracoes": "<html>"}
Onde <html> usa APENAS estas tags: <div> (parágrafo), <b>, <i>, <u>, <ul>, <li>, <br>. Títulos de bloco = <div><b>Título</b></div>. Sem estilos inline, sem outras tags, sem caracteres de escape desnecessários.`

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })
  let respostaTexto = ""
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    })
    respostaTexto = completion.choices[0]?.message?.content ?? ""
  } catch (e) {
    return NextResponse.json(
      { error: `Erro da IA ao redigir os textos: ${e instanceof Error ? e.message.slice(0, 200) : "desconhecido"}` },
      { status: 502 }
    )
  }

  try {
    const json = JSON.parse(limparRespostaJson(respostaTexto))
    const legislacoes = String(json.legislacoes ?? "")
    const consideracoes = String(json.consideracoes ?? "")
    if (!legislacoes || !consideracoes) throw new Error("campos vazios")
    return NextResponse.json({ legislacoes, consideracoes })
  } catch {
    return NextResponse.json(
      { error: "A IA retornou uma resposta em formato inesperado — tente novamente" },
      { status: 502 }
    )
  }
}
