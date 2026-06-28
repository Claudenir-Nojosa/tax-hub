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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { empresaId, premissasOverride, usarXml } = body as {
    empresaId: string
    premissasOverride?: Record<number, typeof PREMISSAS_PADRAO[number]>
    usarXml?: boolean
  }

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
    include: { dadosXml: true },
  })

  if (!empresa) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
  }

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
    premissas: premissasOverride
      ? Object.fromEntries(
          Object.entries(premissasOverride).map(([k, v]) => [Number(k), v])
        )
      : undefined,
  }

  const premissasUsadas = premissasOverride
    ? Object.fromEntries(
        Object.entries(premissasOverride).map(([k, v]) => [Number(k), v])
      )
    : PREMISSAS_PADRAO

  // Se usarXml=true e há dados de XML importados, usa a engine XML
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empresaComXml = empresa as typeof empresa & { dadosXml?: any }
  const dadosXml = empresaComXml.dadosXml
  const shouldUseXml = usarXml && dadosXml

  let resultados
  if (shouldUseXml) {
    const xmlInput: InputSimulacaoXml = {
      dadosXml: {
        totalBaseIbsCbs:     dadosXml.totalBaseIbsCbs,
        totalVICMS:          dadosXml.totalVICMS,
        totalVPIS:           dadosXml.totalVPIS,
        totalVCOFINS:        dadosXml.totalVCOFINS,
        totalVIPI:           dadosXml.totalVIPI,
        totalVProd:          dadosXml.totalVProd,
        aliquotaICMSEfetiva: dadosXml.aliquotaICMSEfetiva,
        aliquotaIPIEfetiva:  dadosXml.aliquotaIPIEfetiva,
        percentualIPISaidas: dadosXml.percentualIPISaidas,
        mesesImportados:     dadosXml.mesesImportados,
      },
      regime:               empresa.regime as InputSimulacaoXml["regime"],
      simplesNacional:      empresa.simplesNacional,
      aliquotaICMSCompras:  empresa.aliquotaICMSCompras,
      temFCBF:              empresa.temFCBF,
      fcbfPercentual:       empresa.fcbfPercentual ?? 0,
      fcbfBaseCalculoMensal: empresa.fcbfBaseCalculo ?? 0,
      premissas: premissasOverride
        ? Object.fromEntries(Object.entries(premissasOverride).map(([k, v]) => [Number(k), v]))
        : undefined,
    }
    resultados = calcularSimulacaoXml(xmlInput)
  } else {
    resultados = calcularSimulacao(input)
  }

  // Persiste simulação
  const simulacao = await db.simulacaoReforma.create({
    data: {
      empresaId,
      premissas: premissasUsadas as object,
      resultados: resultados as unknown as object,
      usouXml: shouldUseXml ? true : false,
    },
  })

  return NextResponse.json({ simulacaoId: simulacao.id, resultados, premissas: premissasUsadas, usouXml: shouldUseXml ? true : false })
}
