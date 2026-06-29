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
  LabelList,
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
  // Filtra apenas itens visíveis (valor não-zero e não-undefined)
  const visible = payload.filter((p: { value: number }) => p.value !== 0 && p.value != null)
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm min-w-[200px]">
      <p className="font-semibold mb-2">{label}</p>
      {visible.map((p: { name: string; value: number; color: string }) => {
        const isDelta = p.name === "Δ Aumento/Economia"
        const isPositive = p.value > 0
        return (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600 dark:text-gray-400 flex-1">{p.name}:</span>
            <span
              className={`font-medium ${
                isDelta
                  ? isPositive
                    ? "text-red-500"
                    : "text-green-500"
                  : ""
              }`}
            >
              {isDelta && isPositive ? "+" : ""}
              {formatarMoeda(p.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Label personalizado no topo das barras com o delta percentual
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DeltaLabel = (props: any) => {
  const { x, y, width, value } = props
  if (value === 0 || value == null) return null
  const isPositive = value > 0
  const pct = Math.abs(value * 100).toFixed(1)
  const label = isPositive ? `+${pct}%` : `-${pct}%`
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill={isPositive ? "#ef4444" : "#10b981"}
    >
      {label}
    </text>
  )
}

export default function TransicaoChart({ resultados, temFCBF }: Props) {
  const data = resultados.map((r) => ({
    ano: String(r.ano),
    "IBS/CBS": Math.round(r.ibsCbsTotal),
    "ICMS": Math.round(r.icmsReforma),
    "IPI": Math.round(r.ipiReforma),
    "Carga Atual": Math.round(r.cargaAtualTotal),
    "Carga Reforma": Math.round(r.cargaReformaTotal),
    "Carga Líquida c/ FCBF": temFCBF ? Math.round(r.cargaLiquidaComFcbf) : undefined,
    // delta percentual sobre faturamento — para o label no topo
    _deltaPct: r.deltaPct,
    // delta absoluto — para o tooltip
    "Δ Aumento/Economia": Math.round(r.delta),
  }))

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 28, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatY} tick={{ fontSize: 11 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />

        {/* Barras empilhadas — composição da carga reforma */}
        <Bar dataKey="IBS/CBS" stackId="a" fill="#0569ff" />
        <Bar dataKey="ICMS" stackId="a" fill="#00cfec" />
        <Bar dataKey="IPI" stackId="a" fill="#6366f1">
          {/* Label de delta no topo da última barra empilhada */}
          <LabelList dataKey="_deltaPct" content={<DeltaLabel />} />
        </Bar>

        {/* Linha carga atual (baseline) */}
        <Line
          type="monotone"
          dataKey="Carga Atual"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4 }}
          strokeDasharray="6 3"
        />

        {/* Linha carga reforma total */}
        <Line
          type="monotone"
          dataKey="Carga Reforma"
          stroke="#e879f9"
          strokeWidth={2}
          dot={{ r: 4 }}
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
