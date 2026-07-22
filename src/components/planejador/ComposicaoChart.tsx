"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Imposto {
  nome: string;
  valor: number;
  aliquota: number;
  baseCalculo: number;
}

interface Props {
  impostos: Imposto[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: Imposto }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = data.payload.valor;
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <p className="font-semibold text-foreground mb-1">
          {data.name}
        </p>
        <p className="text-sm text-muted-foreground">
          Valor:{" "}
          <span className="font-bold text-foreground">
            {formatCurrency(total)}
          </span>
        </p>
        {data.payload.aliquota > 0 && (
          <p className="text-sm text-muted-foreground">
            Alíquota:{" "}
            <span className="font-bold">{data.payload.aliquota.toFixed(2)}%</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ComposicaoChart({ impostos }: Props) {
  const data = impostos.filter((i) => i.valor > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="nome"
          cx="50%"
          cy="50%"
          outerRadius={110}
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
