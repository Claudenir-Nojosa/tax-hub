"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface Regime {
  regime: string;
  label: string;
  cargaPercentual: number;
  totalAnual: number;
  elegivel: boolean;
}

interface Props {
  comparativo: Regime[];
  regimeRecomendado: string;
  regimeAtual: string;
}

const COLORS: Record<string, string> = {
  simples: "#3b82f6",
  lucro_presumido: "#10b981",
  lucro_real: "#f59e0b",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Regime }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xl">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">
          {label}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Carga tributária:{" "}
          <span className="font-bold text-gray-900 dark:text-white">
            {data.cargaPercentual.toFixed(1)}%
          </span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total anual:{" "}
          <span className="font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.totalAnual)}
          </span>
        </p>
        {!data.elegivel && (
          <p className="text-xs text-red-500 mt-1">* Empresa não elegível</p>
        )}
      </div>
    );
  }
  return null;
};

export default function ComparativoChart({
  comparativo,
  regimeRecomendado,
  regimeAtual,
}: Props) {
  const data = comparativo.map((r) => ({
    ...r,
    name: r.label,
    value: r.totalAnual,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          margin={{ top: 24, right: 24, left: 16, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="opacity-10"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 13, fill: "currentColor" }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: "currentColor" }}
            className="text-gray-500 dark:text-gray-500"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.regime}
                fill={COLORS[entry.regime] || "#6b7280"}
                opacity={entry.elegivel ? 1 : 0.4}
                stroke={
                  entry.regime === regimeRecomendado ? "#fff" : "transparent"
                }
                strokeWidth={entry.regime === regimeRecomendado ? 2 : 0}
              />
            ))}
            <LabelList
              dataKey="cargaPercentual"
              position="top"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              style={{ fontSize: 12, fontWeight: 600, fill: "currentColor" }}
              className="text-gray-700 dark:text-gray-300"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {comparativo.map((r) => (
          <div key={r.regime} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: COLORS[r.regime] || "#6b7280",
                opacity: r.elegivel ? 1 : 0.4,
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {r.label}
              {r.regime === regimeRecomendado && (
                <span className="ml-1 text-green-600 dark:text-green-400 font-semibold">
                  ★ Recomendado
                </span>
              )}
              {r.regime === regimeAtual && r.regime !== regimeRecomendado && (
                <span className="ml-1 text-gray-400">(atual)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
