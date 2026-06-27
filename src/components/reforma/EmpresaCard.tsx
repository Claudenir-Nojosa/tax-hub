"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Trash2, TrendingDown, TrendingUp } from "lucide-react"
import { formatarMoeda } from "@/lib/reforma-engine"

type Empresa = {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  regime: string
  simplesNacional: boolean
  uf: string
  faturamento: number
  simulacoes: { createdAt: string; resultados: unknown }[]
}

interface Props {
  empresa: Empresa
  onDelete: (id: string) => void
}

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_I:        "Simples I",
  SIMPLES_II:       "Simples II",
  SIMPLES_III:      "Simples III",
  LUCRO_PRESUMIDO:  "Lucro Presumido",
  LUCRO_REAL:       "Lucro Real",
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export default function EmpresaCard({ empresa, onDelete }: Props) {
  const ultimaSimulacao = empresa.simulacoes[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultados = ultimaSimulacao?.resultados as any[]
  const delta2033 = resultados?.find((r: { ano: number }) => r.ano === 2033)?.delta

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm leading-tight">{empresa.razaoSocial}</p>
            {empresa.nomeFantasia && (
              <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-red-500 h-7 w-7 shrink-0"
          onClick={() => onDelete(empresa.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">{formatCNPJ(empresa.cnpj)}</Badge>
        <Badge variant="outline" className="text-xs">{empresa.uf}</Badge>
        <Badge
          variant={empresa.simplesNacional ? "default" : "outline"}
          className="text-xs"
        >
          {REGIME_LABELS[empresa.regime] ?? empresa.regime}
        </Badge>
      </div>

      <div className="text-sm">
        <p className="text-gray-500 text-xs">Faturamento anual</p>
        <p className="font-medium">{formatarMoeda(empresa.faturamento)}</p>
      </div>

      {delta2033 !== undefined && (
        <div className="text-sm">
          <p className="text-gray-500 text-xs">Delta em 2033 vs. hoje</p>
          <p className={`font-medium flex items-center gap-1 ${delta2033 < 0 ? "text-green-600" : "text-red-600"}`}>
            {delta2033 < 0
              ? <><TrendingDown className="h-4 w-4" /> Economia de {formatarMoeda(Math.abs(delta2033))}</>
              : <><TrendingUp className="h-4 w-4" /> Custo adicional de {formatarMoeda(delta2033)}</>
            }
          </p>
        </div>
      )}

      <Link href={`/dashboard/reforma-tributaria/${empresa.id}`} className="mt-auto">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
          {ultimaSimulacao ? "Ver / Atualizar Simulação" : "Iniciar Simulação"}
        </Button>
      </Link>
    </div>
  )
}
