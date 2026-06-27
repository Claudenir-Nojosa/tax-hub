"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { ResultadoAno } from "@/lib/reforma-engine"
import { formatarMoeda } from "@/lib/reforma-engine"

interface Props {
  resultados: ResultadoAno[]
  temFCBF: boolean
}

const formatY = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
          <span className="font-medium">{formatarMoeda(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TransicaoChart({ resultados, temFCBF }: Props) {
  const data = resultados.map((r) => ({
    ano: String(r.ano),
    "IBS/CBS": Math.round(r.ibsCbsTotal),
    "ICMS": Math.round(r.icmsReforma),
    "IPI": Math.round(r.ipiReforma),
    "Crédito Compras": -Math.round(r.creditoCompras),
    "Carga Atual": Math.round(r.cargaAtualTotal),
    "Carga Líquida c/ FCBF": temFCBF ? Math.round(r.cargaLiquidaComFcbf) : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatY} tick={{ fontSize: 11 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="IBS/CBS" stackId="a" fill="#0569ff" />
        <Bar dataKey="ICMS" stackId="a" fill="#00cfec" />
        <Bar dataKey="IPI" stackId="a" fill="#6366f1" />
        <Line
          type="monotone"
          dataKey="Carga Atual"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4 }}
          strokeDasharray="6 3"
        />
        {temFCBF && (
          <Line
            type="monotone"
            dataKey="Carga Líquida c/ FCBF"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
