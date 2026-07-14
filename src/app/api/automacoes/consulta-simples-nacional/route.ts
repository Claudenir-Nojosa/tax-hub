import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"

// Consulta em lote se cada CNPJ é optante do Simples Nacional — mesma fonte de dados da
// consulta unitária em src/app/api/reforma-tributaria/cnpj/[cnpj]/route.ts (BrasilAPI, com
// fallback ReceitaWS), duplicada aqui de propósito: essa rota processa lote com concorrência
// controlada e erro por item, o que muda o formato de entrada/saída o suficiente pra não valer
// a pena forçar reuso e arriscar regressão na rota em produção da Reforma Tributária.

// No Vercel a função serverless tem limite PADRÃO de 10s — com 20 CNPJs por lote + retries com
// backoff, qualquer lentidão da BrasilAPI estourava o limite, o Vercel matava a requisição e o
// wizard marcava TODOS os fornecedores do lote como "não classificados". 60s dá folga real.
export const maxDuration = 60

const MAX_CNPJS_POR_REQUISICAO = 50
const CONCORRENCIA = 3 // chamadas simultâneas às APIs externas por requisição — BrasilAPI e
// principalmente a ReceitaWS (fallback, rate limit público bem restritivo) toleram mal rajadas
// grandes; 5 em paralelo já causava falsos "CNPJ não encontrado" em CNPJs que existem (validado
// manualmente: o mesmo CNPJ consultado direto via curl respondia 200 nas duas APIs).

function formatarCnpj(cnpjLimpo: string): string {
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

function vazio(cnpj: string, erro: string): ResultadoConsultaCnpj {
  return {
    cnpj,
    cnpjFormatado: formatarCnpj(cnpj),
    razaoSocial: null,
    nomeFantasia: null,
    simplesNacional: null,
    dataOpcaoSimples: null,
    dataExclusaoSimples: null,
    mei: null,
    situacaoCadastral: null,
    uf: null,
    municipio: null,
    porte: null,
    erro,
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Busca com retry: tenta até 3 vezes (1 original + 2 retries) com backoff crescente pra
// QUALQUER falha que não seja um 404 confirmado — BrasilAPI e ReceitaWS têm hiccups transitórios
// sob concorrência (rate limit momentâneo, timeout) que não significam "CNPJ não existe". Um
// CNPJ real (confirmado via curl direto) já apareceu como "não encontrado" na ferramenta por
// causa disso — daí a insistência antes de desistir.
async function fetchComRetry(url: string, userAgent: string): Promise<Response | null> {
  const DELAYS_MS = [400, 1200]
  let ultimaResposta: Response | null = null
  for (let tentativa = 0; tentativa <= DELAYS_MS.length; tentativa++) {
    try {
      // timeout por chamada: uma API externa pendurada não pode consumir o orçamento inteiro da
      // função (o AbortSignal derruba em 8s e cai pro retry/fallback)
      const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(8000) })
      // 404 = CNPJ bem formado mas não encontrado; 400 = dígito verificador inválido (BrasilAPI
      // valida o checksum do CNPJ) — os dois são falhas DEFINITIVAS, retry não muda o resultado
      if (res.ok || res.status === 404 || res.status === 400) return res
      ultimaResposta = res
    } catch {
      // erro de rede — cai pro retry abaixo (ultimaResposta permanece null nessa tentativa)
    }
    if (tentativa < DELAYS_MS.length) await sleep(DELAYS_MS[tentativa])
  }
  return ultimaResposta
}

async function consultarUm(cnpjLimpo: string): Promise<ResultadoConsultaCnpj> {
  try {
    const res = await fetchComRetry(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      "TaxHub/1.0 (taxhubapp.vercel.app)"
    )

    if (res?.status === 404) {
      return vazio(cnpjLimpo, "CNPJ não encontrado na Receita Federal")
    }
    if (res?.status === 400) {
      return vazio(cnpjLimpo, "CNPJ inválido (dígito verificador não confere)")
    }

    if (res?.ok) {
      const data = await res.json()
      // BrasilAPI manda `opcao_pelo_simples`/`opcao_pelo_mei` como null quando a empresa NUNCA
      // foi optante (não é "erro" nem "desconhecido" — validado com CNPJ real de empresa Lucro
      // Presumido, que veio com null). Só `true` significa optante hoje; `false` ou `null`
      // (nunca optou, ou optou e foi excluída) significam "não optante" pra fins desta consulta.
      return {
        cnpj: cnpjLimpo,
        cnpjFormatado: formatarCnpj(cnpjLimpo),
        razaoSocial: data.razao_social ?? null,
        nomeFantasia: data.nome_fantasia || null,
        simplesNacional: Boolean(data.opcao_pelo_simples),
        dataOpcaoSimples: data.data_opcao_pelo_simples ?? null,
        dataExclusaoSimples: data.data_exclusao_do_simples ?? null,
        mei: Boolean(data.opcao_pelo_mei),
        situacaoCadastral: data.descricao_situacao_cadastral ?? null,
        uf: data.uf ?? null,
        municipio: data.municipio ?? null,
        porte: data.porte ?? null,
        erro: null,
      }
    }

    // BrasilAPI indisponível mesmo após retries (aconteceu na prática: HTTP 500 em TODOS os
    // CNPJs por horas): 2º da cadeia é a OpenCNPJ — gratuita, sem rate limit agressivo, com os
    // mesmos dados de Simples/MEI. A ReceitaWS fica por último porque o plano público permite
    // só ~3 consultas/minuto (inviável pra lote de fornecedores; serve de resgate pontual).
    const open = await fetchComRetry(`https://api.opencnpj.org/${cnpjLimpo}`, "TaxHub/1.0")
    if (open?.status === 404) {
      return vazio(cnpjLimpo, "CNPJ não encontrado na Receita Federal")
    }
    if (open?.ok) {
      const oc = await open.json()
      // opcao_simples: "S" = optante hoje; "N" = optou e foi excluída (vem com data_opcao/
      // data_exclusao); "" = NUNCA constou no cadastro do Simples — mesma semântica do `null`
      // da BrasilAPI, ou seja, não optante (validado com CNPJs de regime conhecido: Pharmaplus
      // e L Cardoso = "N" com datas; Brenntag/Quantiq — grandes, nunca Simples — = "")
      return {
        cnpj: cnpjLimpo,
        cnpjFormatado: formatarCnpj(cnpjLimpo),
        razaoSocial: oc.razao_social ?? null,
        nomeFantasia: oc.nome_fantasia || null,
        simplesNacional: oc.opcao_simples === "S",
        dataOpcaoSimples: oc.data_opcao_simples && oc.data_opcao_simples !== "0000-00-00" ? oc.data_opcao_simples : null,
        dataExclusaoSimples: oc.data_exclusao_simples && oc.data_exclusao_simples !== "0000-00-00" ? oc.data_exclusao_simples : null,
        mei: oc.opcao_mei === "S",
        situacaoCadastral: oc.situacao_cadastral ?? null,
        uf: oc.uf ?? null,
        municipio: oc.municipio ?? null,
        porte: oc.porte_empresa ?? null,
        erro: null,
      }
    }

    const fallback = await fetchComRetry(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, "TaxHub/1.0")
    if (!fallback || !fallback.ok) {
      return vazio(cnpjLimpo, "Não foi possível consultar agora — tente novamente em instantes")
    }
    const fb = await fallback.json()
    if (fb.status === "ERROR") {
      // ReceitaWS usa esse status tanto pra CNPJ inexistente quanto pra rate limit
      // ("REQUEST_LIMIT_EXCEEDED") — só a 1ª é "não encontrado" de fato.
      const rateLimited = /limit/i.test(fb.message ?? "")
      return vazio(cnpjLimpo, rateLimited ? "Limite de consultas atingido — tente novamente em instantes" : (fb.message ?? "CNPJ não encontrado"))
    }

    return {
      cnpj: cnpjLimpo,
      cnpjFormatado: formatarCnpj(cnpjLimpo),
      razaoSocial: fb.nome ?? null,
      nomeFantasia: fb.fantasia || null,
      // a ReceitaWS mudou o shape: "simples"/"simei" hoje são OBJETOS {optante: boolean}
      // (o formato antigo era a string "Sim"/"Não" — aceita os dois)
      simplesNacional: normalizarOptante(fb.simples),
      dataOpcaoSimples: fb.simples?.data_opcao ?? fb.data_opcao_pelo_simples ?? null,
      dataExclusaoSimples: fb.simples?.data_exclusao ?? null,
      mei: normalizarOptante(fb.simei ?? fb.mei),
      situacaoCadastral: fb.situacao ?? null,
      uf: fb.uf ?? null,
      municipio: fb.municipio ?? null,
      porte: fb.porte ?? null,
      erro: null,
    }
  } catch (e) {
    return vazio(cnpjLimpo, e instanceof Error ? e.message : "Erro ao consultar CNPJ")
  }
}

// ReceitaWS: campo de optante veio historicamente como string "Sim"/"Não" e hoje vem como
// objeto {optante: boolean} — normaliza os dois formatos (null = sem informação)
function normalizarOptante(valor: unknown): boolean | null {
  if (valor && typeof valor === "object" && "optante" in valor) return Boolean((valor as { optante?: boolean }).optante)
  if (valor === "Sim") return true
  if (valor === "Não") return false
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { cnpjs } = body as { cnpjs?: string[] }

  if (!cnpjs || !Array.isArray(cnpjs) || cnpjs.length === 0) {
    return NextResponse.json({ error: "cnpjs é obrigatório" }, { status: 400 })
  }
  if (cnpjs.length > MAX_CNPJS_POR_REQUISICAO) {
    return NextResponse.json({ error: `Máximo de ${MAX_CNPJS_POR_REQUISICAO} CNPJs por lote` }, { status: 400 })
  }

  const resultados: ResultadoConsultaCnpj[] = new Array(cnpjs.length)

  // concorrência controlada: processa em grupos de CONCORRENCIA chamadas simultâneas às APIs
  // externas, evitando tanto uma rajada grande quanto processar um por um (lento). Pequena
  // pausa entre ondas pra não bombardear a ReceitaWS (fallback com rate limit restrito) em
  // listas maiores.
  for (let i = 0; i < cnpjs.length; i += CONCORRENCIA) {
    const grupo = cnpjs.slice(i, i + CONCORRENCIA)
    const resolvidos = await Promise.all(
      grupo.map((cnpjBruto) => {
        const cnpjLimpo = cnpjBruto.replace(/\D/g, "")
        if (cnpjLimpo.length !== 14) {
          return Promise.resolve(vazio(cnpjLimpo || cnpjBruto, "CNPJ inválido (deve ter 14 dígitos)"))
        }
        return consultarUm(cnpjLimpo)
      })
    )
    resolvidos.forEach((r, idx) => (resultados[i + idx] = r))
    if (i + CONCORRENCIA < cnpjs.length) await sleep(200)
  }

  return NextResponse.json({ resultados })
}
