import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { empresaId, dadosXml } = body as {
    empresaId: string
    dadosXml: {
      periodos: string[]
      totalNFs: number
      totalItens: number
      totalVProd: number
      totalVICMS: number
      totalVPIS: number
      totalVCOFINS: number
      totalVIPI: number
      totalBaseIbsCbs: number
      aliquotaICMSEfetiva: number
      aliquotaIPIEfetiva: number
      percentualIPISaidas: number
      mesesImportados: number
      itens: unknown[]
    }
  }

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
  })
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  const saved = await db.dadosXmlReforma.upsert({
    where: { empresaId },
    create: {
      empresaId,
      periodos: dadosXml.periodos,
      totalNFs: dadosXml.totalNFs,
      totalItens: dadosXml.totalItens,
      totalVProd: dadosXml.totalVProd,
      totalVICMS: dadosXml.totalVICMS,
      totalVPIS: dadosXml.totalVPIS,
      totalVCOFINS: dadosXml.totalVCOFINS,
      totalVIPI: dadosXml.totalVIPI,
      totalBaseIbsCbs: dadosXml.totalBaseIbsCbs,
      aliquotaICMSEfetiva: dadosXml.aliquotaICMSEfetiva,
      aliquotaIPIEfetiva: dadosXml.aliquotaIPIEfetiva,
      percentualIPISaidas: dadosXml.percentualIPISaidas,
      mesesImportados: dadosXml.mesesImportados,
      itens: dadosXml.itens as object[],
    },
    update: {
      periodos: dadosXml.periodos,
      totalNFs: dadosXml.totalNFs,
      totalItens: dadosXml.totalItens,
      totalVProd: dadosXml.totalVProd,
      totalVICMS: dadosXml.totalVICMS,
      totalVPIS: dadosXml.totalVPIS,
      totalVCOFINS: dadosXml.totalVCOFINS,
      totalVIPI: dadosXml.totalVIPI,
      totalBaseIbsCbs: dadosXml.totalBaseIbsCbs,
      aliquotaICMSEfetiva: dadosXml.aliquotaICMSEfetiva,
      aliquotaIPIEfetiva: dadosXml.aliquotaIPIEfetiva,
      percentualIPISaidas: dadosXml.percentualIPISaidas,
      mesesImportados: dadosXml.mesesImportados,
      itens: dadosXml.itens as object[],
    },
  })

  return NextResponse.json({ id: saved.id })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const empresaId = searchParams.get("empresaId")
  if (!empresaId) return NextResponse.json({ error: "empresaId required" }, { status: 400 })

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
  })
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

  const dados = await db.dadosXmlReforma.findUnique({ where: { empresaId } })
  if (!dados) return NextResponse.json(null)

  return NextResponse.json(dados)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const empresaId = searchParams.get("empresaId")
  if (!empresaId) return NextResponse.json({ error: "empresaId required" }, { status: 400 })

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
  })
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

  await db.dadosXmlReforma.deleteMany({ where: { empresaId } })
  return NextResponse.json({ ok: true })
}
