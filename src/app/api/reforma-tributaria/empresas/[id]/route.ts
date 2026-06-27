import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"

async function getEmpresaOrFail(id: string, userId: string) {
  const empresa = await db.empresaReforma.findFirst({
    where: { id, userId },
  })
  return empresa
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const empresa = await db.empresaReforma.findFirst({
    where: { id, userId: session.user.id },
    include: {
      simulacoes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  return NextResponse.json(empresa)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getEmpresaOrFail(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  const body = await req.json()
  const empresa = await db.empresaReforma.update({
    where: { id },
    data: {
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia,
      regime: body.regime,
      simplesNacional: body.simplesNacional,
      uf: body.uf,
      municipio: body.municipio,
      cnaePrincipal: body.cnaePrincipal,
      faturamento: body.faturamento,
      aliquotaICMS: body.aliquotaICMS,
      aliquotaICMSCompras: body.aliquotaICMSCompras,
      temIPI: body.temIPI,
      aliquotaIPI: body.aliquotaIPI,
      percentualIPISaidas: body.percentualIPISaidas,
      temFCBF: body.temFCBF,
      fcbfPercentual: body.fcbfPercentual,
      fcbfBaseCalculo: body.fcbfBaseCalculo,
    },
  })

  return NextResponse.json(empresa)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getEmpresaOrFail(id, session.user.id)
  if (!existing) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  await db.empresaReforma.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
