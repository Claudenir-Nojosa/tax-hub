import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params
  const cnpjLimpo = cnpj.replace(/\D/g, "")

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      {
        headers: { "User-Agent": "TaxHub/1.0 (taxhubapp.vercel.app)" },
        next: { revalidate: 86400 },
      }
    )

    if (res.status === 404) {
      return NextResponse.json(
        { error: "CNPJ não encontrado na Receita Federal" },
        { status: 404 }
      )
    }

    if (!res.ok) {
      // BrasilAPI fora (aconteceu na prática: HTTP 500 geral por horas). 2º da cadeia:
      // OpenCNPJ — gratuita, sem rate limit agressivo, traz CNAEs principal e secundários.
      const open = await fetch(`https://api.opencnpj.org/${cnpjLimpo}`, {
        headers: { "User-Agent": "TaxHub/1.0" },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null)
      if (open?.status === 404) {
        return NextResponse.json({ error: "CNPJ não encontrado na Receita Federal" }, { status: 404 })
      }
      if (open?.ok) {
        const oc = await open.json()
        const cnaes = Array.isArray(oc.cnaes) ? (oc.cnaes as { codigo?: string; descricao?: string; is_principal?: boolean }[]) : []
        const principal = cnaes.find((c) => c.is_principal)
        return NextResponse.json({
          cnpj: cnpjLimpo,
          razaoSocial: oc.razao_social,
          nomeFantasia: oc.nome_fantasia || null,
          // "" = nunca constou no cadastro do Simples (mesma semântica do null da BrasilAPI)
          simplesNacional: oc.opcao_simples === "S",
          mei: oc.opcao_mei === "S",
          uf: oc.uf,
          municipio: oc.municipio,
          cnaePrincipal: principal?.descricao || null,
          cnaeCode: principal?.codigo ?? oc.cnae_principal ?? null,
          cnaesSecundarios: cnaes
            .filter((c) => !c.is_principal)
            .map((c) => ({ codigo: c.codigo ?? "", descricao: c.descricao ?? "" })),
          situacaoCadastral: oc.situacao_cadastral,
          naturezaJuridica: oc.natureza_juridica,
          capitalSocial: null,
          porte: oc.porte_empresa,
        })
      }

      // 3º da cadeia: ReceitaWS (plano público limita ~3 consultas/minuto — só resgate pontual)
      const fallback = await fetch(
        `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
        { headers: { "User-Agent": "TaxHub/1.0" }, signal: AbortSignal.timeout(8000) }
      ).catch(() => null)
      if (!fallback || !fallback.ok) {
        return NextResponse.json(
          { error: "CNPJ não encontrado. Tente novamente." },
          { status: 404 }
        )
      }
      const fb = await fallback.json()
      // "simples" veio historicamente como string "Sim"/"Não"; hoje é objeto {optante: boolean}
      const optante = (v: unknown) =>
        v && typeof v === "object" && "optante" in v ? Boolean((v as { optante?: boolean }).optante) : v === "Sim"
      return NextResponse.json({
        cnpj: cnpjLimpo,
        razaoSocial: fb.nome,
        nomeFantasia: fb.fantasia || null,
        simplesNacional: optante(fb.simples),
        mei: optante(fb.simei ?? fb.mei),
        uf: fb.uf,
        municipio: fb.municipio,
        cnaePrincipal: fb.atividade_principal?.[0]?.text || null,
        cnaeCode: fb.atividade_principal?.[0]?.code || null,
        // ReceitaWS expõe atividades_secundarias com o mesmo shape {code, text} da principal
        cnaesSecundarios: Array.isArray(fb.atividades_secundarias)
          ? fb.atividades_secundarias.map((a: { code?: string; text?: string }) => ({
              codigo: a.code ?? "",
              descricao: a.text ?? "",
            }))
          : [],
        situacaoCadastral: fb.situacao,
        naturezaJuridica: fb.natureza_juridica,
        capitalSocial: null,
        porte: fb.porte,
      })
    }

    const data = await res.json()

    return NextResponse.json({
      cnpj: data.cnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || null,
      simplesNacional: data.opcao_pelo_simples ?? false,
      mei: data.opcao_pelo_mei ?? false,
      uf: data.uf,
      municipio: data.municipio,
      cnaePrincipal: data.cnae_fiscal_descricao || null,
      cnaeCode: data.cnae_fiscal ? String(data.cnae_fiscal) : null,
      // BrasilAPI já retorna isso; só não era repassado antes — necessário pro Passo 3
      // do wizard (busca de legislação relevante por CNAE, inclusive secundários)
      cnaesSecundarios: Array.isArray(data.cnaes_secundarios)
        ? data.cnaes_secundarios.map((a: { codigo?: number | string; descricao?: string }) => ({
            codigo: a.codigo != null ? String(a.codigo) : "",
            descricao: a.descricao ?? "",
          }))
        : [],
      situacaoCadastral: data.descricao_situacao_cadastral,
      naturezaJuridica: data.descricao_natureza_juridica,
      capitalSocial: data.capital_social,
      porte: data.porte,
    })
  } catch {
    return NextResponse.json(
      { error: "Erro ao consultar CNPJ. Tente novamente." },
      { status: 500 }
    )
  }
}
