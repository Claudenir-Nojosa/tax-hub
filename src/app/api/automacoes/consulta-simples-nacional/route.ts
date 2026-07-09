import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"

// Consulta em lote se cada CNPJ é optante do Simples Nacional — mesma fonte de dados da
// consulta unitária em src/app/api/reforma-tributaria/cnpj/[cnpj]/route.ts (BrasilAPI, com
// fallback ReceitaWS), duplicada aqui de propósito: essa rota processa lote com concorrência
// controlada e erro por item, o que muda o formato de entrada/saída o suficiente pra não valer
// a pena forçar reuso e arriscar regressão na rota em produção da Reforma Tributária.

const MAX_CNPJS_POR_REQUISICAO = 50
const CONCORRENCIA = 5 // chamadas simultâneas às APIs externas por requisição

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

async function consultarUm(cnpjLimpo: string): Promise<ResultadoConsultaCnpj> {
  try {
    let res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: { "User-Agent": "TaxHub/1.0 (taxhubapp.vercel.app)" },
    })

    // backoff simples: um retry após pausa curta em caso de rate limit
    if (res.status === 429) {
      await sleep(700)
      res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
        headers: { "User-Agent": "TaxHub/1.0 (taxhubapp.vercel.app)" },
      })
    }

    if (res.status === 404) {
      return vazio(cnpjLimpo, "CNPJ não encontrado na Receita Federal")
    }

    if (res.ok) {
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

    // BrasilAPI indisponível/erro: fallback ReceitaWS (mesmo par de fontes da consulta unitária)
    const fallback = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
      headers: { "User-Agent": "TaxHub/1.0" },
    })
    if (!fallback.ok) return vazio(cnpjLimpo, "CNPJ não encontrado")
    const fb = await fallback.json()
    if (fb.status === "ERROR") return vazio(cnpjLimpo, fb.message ?? "CNPJ não encontrado")

    return {
      cnpj: cnpjLimpo,
      cnpjFormatado: formatarCnpj(cnpjLimpo),
      razaoSocial: fb.nome ?? null,
      nomeFantasia: fb.fantasia || null,
      simplesNacional: fb.simples === "Sim" ? true : fb.simples === "Não" ? false : null,
      dataOpcaoSimples: fb.data_opcao_pelo_simples ?? null,
      dataExclusaoSimples: null,
      mei: fb.mei === "Sim" ? true : fb.mei === "Não" ? false : null,
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
  // externas, evitando tanto uma rajada grande quanto processar um por um (lento).
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
  }

  return NextResponse.json({ resultados })
}
