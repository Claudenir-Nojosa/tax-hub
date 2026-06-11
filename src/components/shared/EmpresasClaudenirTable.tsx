"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  uf: string;
  regimeTributacao: string;
  responsavel: string;
}

const columns: ColumnDef<Empresa>[] = [
  {
    accessorKey: "razaoSocial",
    header: "Razão Social",
    cell: ({ row }) => (
      <span className="dark:text-emerald-100 text-gray-800 font-medium">
        {row.getValue("razaoSocial")}
      </span>
    ),
  },
  {
    accessorKey: "cnpj",
    header: "CNPJ",
    cell: ({ row }) => {
      const cnpj = row.getValue("cnpj");
      return (
        <span className="dark:text-emerald-200 text-gray-700">
          {cnpj ? formatCNPJ(cnpj as string) : "-"}
        </span>
      );
    },
  },
  {
    accessorKey: "uf",
    header: "UF",
    cell: ({ row }) => (
      <span className="dark:text-emerald-200 text-gray-700">
        {row.getValue("uf")}
      </span>
    ),
  },
  {
    accessorKey: "regimeTributacao",
    header: "Regime",
    cell: ({ row }) => {
      const regime = row.getValue("regimeTributacao");
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-300 bg-emerald-100 text-emerald-800">
          {formatRegime(regime as string)}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <Link
          href={`/dashboard/empresas/${row.original.id}`}
          className="dark:text-emerald-300 text-emerald-600 hover:dark:text-emerald-200 hover:text-emerald-800 font-medium transition-colors"
        >
          Ver detalhes
        </Link>
      );
    },
  },
];

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatRegime(regime: string) {
  const regimes: Record<string, string> = {
    SIMPLES_NACIONAL: "Simples Nacional",
    LUCRO_PRESUMIDO: "Lucro Presumido",
    LUCRO_REAL: "Lucro Real",
  };
  return regimes[regime] || regime;
}

export function EmpresasClaudenirTable() {
  const [data, setData] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmpresasClaudenir() {
      try {
        const response = await fetch("/api/empresas?responsavel=CLAUDENIR");
        const empresas = await response.json();
        setData(empresas);
      } catch (error) {
        console.error("Erro ao buscar empresas do Claudenir:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEmpresasClaudenir();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="dark:text-emerald-600 text-emerald-600 text-center py-8 mt-10">
        Carregando empresas do Claudenir...
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden dark:border-emerald-900/30 border-gray-200 shadow-sm mt-10">
      <div className="p-4 dark:bg-emerald-700/20 bg-gray-100 border-b dark:border-emerald-500/30 border-gray-200">
        <h2 className="text-xl font-bold items-center text-center dark:text-emerald-300 text-emerald-800">Empresas do Claudenir</h2>
      </div>
      <Table className="border-collapse">
        <TableHeader className="dark:bg-emerald-950/20 bg-emerald-50/30">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="dark:border-emerald-900/30 border-gray-200"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="dark:text-emerald-100 text-emerald-600 font-medium py-3 px-4"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="dark:border-emerald-900/30 border-gray-200 dark:hover:bg-emerald-900/10 hover:bg-emerald-50/30 transition-colors"
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-3 px-4 dark:bg-gray-950 bg-white"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center dark:text-emerald-300 text-emerald-600 dark:bg-gray-950 bg-white"
              >
                Nenhuma empresa cadastrada para o Claudenir
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
