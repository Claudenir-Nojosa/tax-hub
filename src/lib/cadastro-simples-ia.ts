// Extrator da Consulta Optantes do Simples Nacional via IA (server-only). Diferente dos demais
// documentos da Recuperação de Crédito, a Consulta Optantes costuma chegar ESCANEADA (imagem,
// sem camada de texto), então regex/unpdf não funcionam — o PDF inteiro vai como arquivo pra
// OpenAI (mesma conta usada nas outras features de IA do app), que lê a imagem e devolve JSON
// estruturado. Ver docs/recuperacao-credito.md §13 (IA vs determinístico): IA aqui é exceção
// justificada, e o dado fica marcado com extraidoPorIA: true pra auditoria.

import OpenAI from "openai"
import type { SimplesNacionalDados } from "./cadastro-parser"

const MODELO = "gpt-4o"

const PROMPT = `Você está lendo um PDF da "Consulta Optantes" do Simples Nacional (Receita Federal do Brasil). Extraia EXATAMENTE o que está escrito no documento e responda SOMENTE com um JSON válido, sem markdown, no formato:

{
  "ehConsultaOptantes": true ou false (false se o documento não for uma Consulta Optantes do Simples Nacional),
  "cnpj": "CNPJ consultado, como aparece no documento" ou null,
  "nomeEmpresarial": "nome empresarial" ou null,
  "situacao": "situação ATUAL no Simples Nacional exatamente como escrita (ex.: 'Optante pelo Simples Nacional', 'NÃO optante pelo Simples Nacional')",
  "optanteDesde": "DD/MM/AAAA da opção vigente, se o documento disser que é optante desde alguma data" ou null,
  "periodosAnteriores": [
    {"inicio": "DD/MM/AAAA", "fim": "DD/MM/AAAA", "detalhe": "texto adicional da linha, se houver (ex.: motivo de exclusão)"}
  ],
  "simei": "situação no SIMEI exatamente como escrita, se o documento trouxer" ou null
}

Regras:
- "periodosAnteriores" são as linhas da tabela "Opções pelo Simples Nacional em Períodos Anteriores" (ou seção equivalente). Se a tabela disser "Não Existem Opções em Períodos Anteriores" ou não existir, retorne [].
- Se um período anterior ainda estiver aberto (sem data fim), use "" no campo "fim".
- Não invente valores: campo ilegível ou ausente = null (ou [] para listas).`

interface RespostaIA {
  ehConsultaOptantes: boolean
  cnpj: string | null
  nomeEmpresarial: string | null
  situacao: string | null
  optanteDesde: string | null
  periodosAnteriores: { inicio: string; fim: string; detalhe?: string }[] | null
  simei: string | null
}

export async function extrairSimplesNacionalViaIA(
  pdf: Uint8Array,
  arquivoNome: string
): Promise<{ ok: true; dados: SimplesNacionalDados } | { ok: false; erro: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, erro: "OPENAI_API_KEY não configurada — necessária para ler a Consulta Optantes (PDF escaneado)" }
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 })

  let textoResposta = ""
  try {
    const completion = await client.chat.completions.create({
      model: MODELO,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: arquivoNome,
                file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    })
    textoResposta = completion.choices[0]?.message?.content ?? ""
  } catch (e) {
    return {
      ok: false,
      erro: `Erro da IA ao ler a Consulta Optantes: ${e instanceof Error ? e.message.slice(0, 300) : "desconhecido"}`,
    }
  }

  let json: RespostaIA
  try {
    // tolera resposta embrulhada em cerca de código apesar da instrução
    const semCerca = textoResposta.replace(/```json|```/g, "").trim()
    json = JSON.parse(semCerca)
  } catch {
    return { ok: false, erro: "A IA não retornou JSON válido ao ler a Consulta Optantes" }
  }

  if (!json.ehConsultaOptantes) {
    return { ok: false, erro: "PDF sem camada de texto que não parece ser uma Consulta Optantes do Simples Nacional" }
  }
  if (!json.situacao) {
    return { ok: false, erro: "A IA não conseguiu identificar a situação no Simples Nacional" }
  }

  return {
    ok: true,
    dados: {
      cnpj: json.cnpj,
      nomeEmpresarial: json.nomeEmpresarial,
      situacao: json.situacao,
      optanteDesde: json.optanteDesde,
      periodosAnteriores: json.periodosAnteriores ?? [],
      simei: json.simei,
      extraidoPorIA: true,
      arquivoNome,
    },
  }
}
