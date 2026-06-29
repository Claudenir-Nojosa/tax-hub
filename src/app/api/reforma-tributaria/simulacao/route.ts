import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import {
  calcularSimulacao,
  calcularSimulacaoXml,
  PREMISSAS_PADRAO,
  type InputSimulacao,
  type InputSimulacaoXml,
} from "@/lib/reforma-engine"
import type { EfdSaidasInput } from "@/lib/efd-parser"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { empresaId, premissasOverride, usarXml, usarEfdSaidas, efdSaidasInput, bcICMSEntradas } = body as {
    empresaId: string
    premissasOverride?: Record<number, typeof PREMISSAS_PADRAO[number]>
    usarXml?: boolean
    usarEfdSaidas?: boolean
    efdSaidasInput?: EfdSaidasInput
    bcICMSEntradas?: number
  }

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
    include: { dadosXml: true },
  })

  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

  const premissasUsadas = premissasOverride
    ? Object.fromEntries(Object.entries(premissasOverride).map(([k, v]) => [Number(k), v]))
    : PREMISSAS_PADRAO

  const premissasMap = premissasOverride
    ? Object.fromEntries(Object.entries(premissasOverride).map(([k, v]) => [Number(k), v]))
    : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empresaComXml = empresa as typeof empresa & { dadosXml?: any }
  const dadosXmlDB = empresaComXml.dadosXml
  const shouldUseXml = usarXml && dadosXmlDB
  const shouldUseEfdSaidas = usarEfdSaidas && efdSaidasInput

  let resultados
  let fonteUsada: "xml" | "efd" | "manual" = "manual"

  if (shouldUseXml) {
    fonteUsada = "xml"
    const xmlInput: InputSimulacaoXml = {
      dadosXml: {
        totalBaseIbsCbs:     dadosXmlDB.totalBaseIbsCbs,
        totalVICMS:          dadosXmlDB.totalVICMS,
        totalVPIS:           dadosXmlDB.totalVPIS,
        totalVCOFINS:        dadosXmlDB.totalVCOFINS,
        totalVIPI:           dadosXmlDB.totalVIPI,
        totalVProd:          dadosXmlDB.totalVProd,
        aliquotaICMSEfetiva: dadosXmlDB.aliquotaICMSEfetiva,
        aliquotaIPIEfetiva:  dadosXmlDB.aliquotaIPIEfetiva,
        percentualIPISaidas: dadosXmlDB.percentualIPISaidas,
        mesesImportados:     dadosXmlDB.mesesImportados,
      },
      regime:               empresa.regime as InputSimulacaoXml["regime"],
      simplesNacional:      empresa.simplesNacional,
      aliquotaICMSCompras:  empresa.aliquotaICMSCompras,
      temFCBF:              empresa.temFCBF,
      fcbfPercentual:       empresa.fcbfPercentual ?? 0,
      fcbfBaseCalculoMensal: empresa.fcbfBaseCalculo ?? 0,
      premissas: premissasMap,
      bcICMSEntradas: bcICMSEntradas ?? undefined,
    }
    resultados = calcularSimulacaoXml(xmlInput)
  } else if (shouldUseEfdSaidas) {
    // EFD saídas: reutiliza calcularSimulacaoXml com dados do C100 enviados pelo cliente
    fonteUsada = "efd"
    const efdXmlInput: InputSimulacaoXml = {
      dadosXml: {
        totalBaseIbsCbs:     efdSaidasInput.totalBaseIbsCbs,
        totalVICMS:          efdSaidasInput.totalVICMS,
        totalVPIS:           efdSaidasInput.totalVPIS,
        totalVCOFINS:        efdSaidasInput.totalVCOFINS,
        totalVIPI:           efdSaidasInput.totalVIPI,
        totalVProd:          efdSaidasInput.totalVProd,
        aliquotaICMSEfetiva: efdSaidasInput.aliquotaICMSEfetiva,
        aliquotaIPIEfetiva:  efdSaidasInput.aliquotaIPIEfetiva,
        percentualIPISaidas: efdSaidasInput.percentualIPISaidas,
        mesesImportados:     efdSaidasInput.mesesImportados,
      },
      regime:               empresa.regime as InputSimulacaoXml["regime"],
      simplesNacional:      empresa.simplesNacional,
      aliquotaICMSCompras:  empresa.aliquotaICMSCompras,
      temFCBF:              empresa.temFCBF,
      fcbfPercentual:       empresa.fcbfPercentual ?? 0,
      fcbfBaseCalculoMensal: empresa.fcbfBaseCalculo ?? 0,
      premissas: premissasMap,
      bcICMSEntradas: bcICMSEntradas ?? undefined,
    }
    resultados = calcularSimulacaoXml(efdXmlInput)
  } else {
    const input: InputSimulacao = {
      faturamento: empresa.faturamento,
      regime: empresa.regime as InputSimulacao["regime"],
      simplesNacional: empresa.simplesNacional,
      aliquotaICMS: empresa.aliquotaICMS,
      aliquotaICMSCompras: empresa.aliquotaICMSCompras,
      temIPI: empresa.temIPI,
      aliquotaIPI: empresa.aliquotaIPI ?? 0,
      percentualIPISaidas: empresa.percentualIPISaidas ?? 0,
      temFCBF: empresa.temFCBF,
      fcbfPercentual: empresa.fcbfPercentual ?? 0,
      fcbfBaseCalculoMensal: empresa.fcbfBaseCalculo ?? 0,
      bcICMSEntradas: bcICMSEntradas ?? undefined,
      premissas: premissasMap,
    }
    resultados = calcularSimulacao(input)
  }

  const simulacao = await db.simulacaoReforma.create({
    data: {
      empresaId,
      premissas: premissasUsadas as object,
      resultados: resultados as unknown as object,
      usouXml: fonteUsada === "xml",
    },
  })

  return NextResponse.json({
    simulacaoId: simulacao.id,
    resultados,
    premissas: premissasUsadas,
    usouXml: fonteUsada === "xml",
    fonteUsada,
  })
}
