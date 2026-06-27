import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const empresas = await db.empresaReforma.findMany({
    where: { userId: session.user.id },
    include: {
      simulacoes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(empresas)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()

  const empresa = await db.empresaReforma.upsert({
    where: {
      userId_cnpj: {
        userId: session.user.id,
        cnpj: body.cnpj,
      },
    },
    create: {
      userId: session.user.id,
      cnpj: body.cnpj,
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia,
      regime: body.regime,
      simplesNacional: body.simplesNacional ?? false,
      uf: body.uf,
      municipio: body.municipio,
      cnaePrincipal: body.cnaePrincipal,
      faturamento: body.faturamento,
      aliquotaICMS: body.aliquotaICMS,
      aliquotaICMSCompras: body.aliquotaICMSCompras ?? 0,
      temIPI: body.temIPI ?? false,
      aliquotaIPI: body.aliquotaIPI,
      percentualIPISaidas: body.percentualIPISaidas,
      temFCBF: body.temFCBF ?? false,
      fcbfPercentual: body.fcbfPercentual,
      fcbfBaseCalculo: body.fcbfBaseCalculo,
    },
    update: {
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia,
      regime: body.regime,
      simplesNacional: body.simplesNacional ?? false,
      uf: body.uf,
      municipio: body.municipio,
      cnaePrincipal: body.cnaePrincipal,
      faturamento: body.faturamento,
      aliquotaICMS: body.aliquotaICMS,
      aliquotaICMSCompras: body.aliquotaICMSCompras ?? 0,
      temIPI: body.temIPI ?? false,
      aliquotaIPI: body.aliquotaIPI,
      percentualIPISaidas: body.percentualIPISaidas,
      temFCBF: body.temFCBF ?? false,
      fcbfPercentual: body.fcbfPercentual,
      fcbfBaseCalculo: body.fcbfBaseCalculo,
    },
  })

  return NextResponse.json(empresa)
}
