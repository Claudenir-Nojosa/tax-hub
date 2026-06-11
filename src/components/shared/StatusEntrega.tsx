"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function StatusEntregaObrigacao({
  obrigacaoId,
  mes,
  ano,
}: {
  obrigacaoId: string;
  mes: number;
  ano: number;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/obrigacoes-acessorias/${obrigacaoId}/status?mes=${mes}&ano=${ano}`
        );
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Erro ao buscar status:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [obrigacaoId, mes, ano]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Carregando dados...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64 text-rose-600 dark:text-rose-400">
        Não foi possível carregar os dados
      </div>
    );
  }

  // Cores customizadas para light/dark mode
  const verdeLight = "#10b981"; // emerald-500
  const verdeDark = "#34d399"; // emerald-400
  const vermelhoLight = "#ef4444"; // red-500
  const vermelhoDark = "#f87171"; // red-400

  // Dados para o gráfico de barras
  const chartData = [
    {
      name: "Entregas",
      entregues: data.totalEntregues,
      pendentes: data.totalEmpresas - data.totalEntregues,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card com estatísticas */}
        <Card className="border border-gray-200 dark:border-emerald-900 dark:bg-gray-950">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">
              Resumo de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Empresas
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {data.totalEmpresas}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900/50">
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Entregues
                  </h3>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data.totalEntregues}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-900/50">
                  <h3 className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Pendentes
                  </h3>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {data.totalEmpresas - data.totalEntregues}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Progresso ({data.porcentagemConclusao}%)
                </h3>
                <Progress
                  value={data.porcentagemConclusao}
                  className="h-2 bg-gray-200 dark:bg-gray-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de barras */}
        <Card className="border border-gray-200 dark:border-gray-800 dark:border-emerald-900 dark:bg-gray-950">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">
              Distribuição de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="[&_.recharts-wrapper]:!cursor-default [&_.recharts-tooltip-cursor]:!hidden"
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  strokeOpacity={0.2}
                />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar
                  dataKey="entregues"
                  name="Entregues"
                  fill={verdeLight}
                  className="dark:fill-emerald-400"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="pendentes"
                  name="Pendentes"
                  fill={vermelhoLight}
                  className="dark:fill-rose-400"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de detalhes */}
      <Card className="border border-gray-200 dark:border-gray-800 dark:border-emerald-900 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Detalhes por Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Empresa
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Dia Vencimento
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Status
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Data Entrega
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.empresas.map((empresa: any) => (
                <TableRow
                  key={empresa.empresaId}
                  className="border-gray-200 dark:border-gray-800"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {empresa.razaoSocial}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    Dia {empresa.diaVencimento}{" "}
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {empresa.anteciparDiaNaoUtil
                        ? "(Antecipa)"
                        : "(Posterga)"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {empresa.entregue ? (
                      <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4 mr-1" /> Entregue
                      </span>
                    ) : (
                      <span className="flex items-center text-rose-600 dark:text-rose-400">
                        <X className="h-4 w-4 mr-1" /> Pendente
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-700 dark:text-gray-300">
                    {empresa.dataEntrega
                      ? new Date(empresa.dataEntrega).toLocaleDateString(
                          "pt-BR"
                        )
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
