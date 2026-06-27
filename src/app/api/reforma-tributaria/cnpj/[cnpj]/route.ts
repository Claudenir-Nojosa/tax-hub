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
      // Fallback: tenta receitaws.me
      const fallback = await fetch(
        `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
        { headers: { "User-Agent": "TaxHub/1.0" } }
      )
      if (!fallback.ok) {
        return NextResponse.json(
          { error: "CNPJ não encontrado. Tente novamente." },
          { status: 404 }
        )
      }
      const fb = await fallback.json()
      return NextResponse.json({
        cnpj: cnpjLimpo,
        razaoSocial: fb.nome,
        nomeFantasia: fb.fantasia || null,
        simplesNacional: fb.simples === "Sim",
        mei: fb.mei === "Sim",
        uf: fb.uf,
        municipio: fb.municipio,
        cnaePrincipal: fb.atividade_principal?.[0]?.text || null,
        cnaeCode: fb.atividade_principal?.[0]?.code || null,
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
