"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { formatCNPJ, formatRegime } from "@/lib/utils";

import { EmpresaComObrigacao } from "../../../types/types";

 // deploy
interface EmpresasObrigacaoTableProps {
  empresas: EmpresaComObrigacao[];
  obrigacaoNome: string;
}

const meses = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function EmpresasObrigacaoTable({
  empresas,
  obrigacaoNome,
}: EmpresasObrigacaoTableProps) {
  const [competencia, setCompetencia] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Calcular estatísticas
  const calcularEstatisticas = () => {
    const totalEmpresas = empresas.length;
    const entregues = empresas.filter((empresa) => {
      const entrega = empresa.empresaObrigacaoAcessoria.entregas.find(
        (e) => e.mes === competencia.mes && e.ano === competencia.ano
      );
      return entrega?.entregue;
    }).length;

    const faltantes = totalEmpresas - entregues;
    const percentual =
      totalEmpresas > 0 ? Math.round((entregues / totalEmpresas) * 100) : 0;

    return { totalEmpresas, entregues, faltantes, percentual };
  };

  const estatisticas = calcularEstatisticas();

  const handleAnoChange = (increment: number) => {
    setCompetencia((prev) => ({
      ...prev,
      ano: prev.ano + increment,
    }));
  };

  const handleMesChange = (mes: number) => {
    setCompetencia((prev) => ({
      ...prev,
      mes,
    }));
  };

  const toggleEntrega = async (
    empresaObrigacaoId: string,
    entregue: boolean
  ) => {
    setLoading((prev) => ({ ...prev, [empresaObrigacaoId]: true }));

    try {
      const response = await fetch("/api/entregas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresaObrigacaoId,
          mes: competencia.mes,
          ano: competencia.ano,
          entregue: !entregue,
        }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar entrega");
 // teste
      window.location.reload();
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading((prev) => ({ ...prev, [empresaObrigacaoId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{obrigacaoNome}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresas.length} empresas vinculadas
          </p>
        </div>

        <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnoChange(-1)}
              className="px-3"
            >
              &lt;
            </Button>
            <span className="font-medium w-16 text-center">
              {competencia.ano}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnoChange(1)}
              className="px-3"
            >
              &gt;
            </Button>
          </div>

          <div className="grid grid-cols-6 gap-1">
            {meses.map((mes, index) => (
              <Button
                key={index}
                variant={competencia.mes === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => handleMesChange(index + 1)}
                className="h-8 w-12 p-0 text-xs"
              >
                {mes}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Adicionando o bloco de estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Empresas
          </h3>
          <p className="text-2xl font-bold">{estatisticas.totalEmpresas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Entregues
          </h3>
          <p className="text-2xl font-bold text-green-500">
            {estatisticas.entregues}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Faltantes
          </h3>
          <p className="text-2xl font-bold text-red-500">
            {estatisticas.faltantes}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Conclusão
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full"
                style={{ width: `${estatisticas.percentual}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium">
              {estatisticas.percentual}%
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead className="text-center w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => {
              const entrega = empresa.empresaObrigacaoAcessoria.entregas.find(
                (e) => e.mes === competencia.mes && e.ano === competencia.ano
              );

              return (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">
                    {empresa.razaoSocial}
                  </TableCell>
                  <TableCell>{formatCNPJ(empresa.cnpj)}</TableCell>
                  <TableCell>{empresa.uf}</TableCell>
                  <TableCell>
                    {formatRegime(empresa.regimeTributacao)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() =>
                        toggleEntrega(
                          empresa.empresaObrigacaoAcessoria.id,
                          entrega?.entregue || false
                        )
                      }
                      disabled={loading[empresa.empresaObrigacaoAcessoria.id]}
                      className="inline-flex items-center justify-center"
                    >
                      <div
                        className={`inline-flex items-center justify-center rounded-full h-6 w-6 ${
                          entrega?.entregue
                            ? "bg-green-500 text-white"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {entrega?.entregue ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
