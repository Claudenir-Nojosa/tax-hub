import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import db from "@/lib/db"
import { calcularSimulacao, PREMISSAS_PADRAO, type InputSimulacao } from "@/lib/reforma-engine"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { empresaId, premissasOverride } = body as {
    empresaId: string
    premissasOverride?: Record<number, typeof PREMISSAS_PADRAO[number]>
  }

  const empresa = await db.empresaReforma.findFirst({
    where: { id: empresaId, userId: session.user.id },
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

  const resultados = calcularSimulacao(input)

  // Persiste simulação
  const simulacao = await db.simulacaoReforma.create({
    data: {
      empresaId,
      premissas: premissasUsadas as object,
      resultados: resultados as unknown as object,
    },
  })

  return NextResponse.json({ simulacaoId: simulacao.id, resultados, premissas: premissasUsadas })
}
