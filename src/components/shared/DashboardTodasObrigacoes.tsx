"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

export function DashboardTodasObrigacoes({
  mes,
  ano,
}: {
  mes: number;
  ano: number;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/obrigacoes-acessorias/consolidado?mes=${mes}&ano=${ano}`
        );
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Erro ao buscar dados consolidados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [mes, ano]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="border border-gray-200 dark:border-gray-800"
            >
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-rose-600 dark:text-rose-400">
        <X className="h-12 w-12" />
        <p>Não foi possível carregar os dados consolidados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((item) => (
          <Card
            key={item.obrigacaoId}
            className="border border-gray-200 dark:border-gray-800"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {item.obrigacaoNome}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold">{item.totalEntregues}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {item.totalEmpresas - item.totalEntregues}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full"
                  style={{
                    width: `${Math.round((item.totalEntregues / item.totalEmpresas) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-right text-muted-foreground">
                {Math.round((item.totalEntregues / item.totalEmpresas) * 100)}%
                concluído
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela Detalhada */}
      <Card className="border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle>Detalhes por Obrigação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Obrigação</TableHead>
                  <TableHead className="text-right">Total Empresas</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Pendentes</TableHead>
                  <TableHead className="text-right">% Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.obrigacaoId}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {item.obrigacaoNome}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalEmpresas}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {item.totalEntregues}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 dark:text-rose-400">
                      {item.totalEmpresas - item.totalEntregues}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(
                        (item.totalEntregues / item.totalEmpresas) * 100
                      )}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
