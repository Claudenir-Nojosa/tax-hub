"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Trash2, Eye, Loader2, PlusCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "../ui/table";

interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  uf: string;
  regimeTributacao: string;
  responsavel: string;
  createdAt: string;
}

export function EmpresasTable() {
  const router = useRouter();
  const [data, setData] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Funções de formatação
  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  };

  const formatRegime = (regime: string) => {
    const regimes: Record<string, { label: string; color: string }> = {
      SIMPLES_NACIONAL: {
        label: "Simples",
        color: "bg-green-100 text-green-800",
      },
      LUCRO_PRESUMIDO: {
        label: "Presumido",
        color: "bg-blue-100 text-blue-800",
      },
      LUCRO_REAL: {
        label: "Lucro Real",
        color: "bg-purple-100 text-purple-800",
      },
    };
    return (
      regimes[regime] || { label: regime, color: "bg-gray-100 text-gray-800" }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Buscar dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/empresas");
        if (!response.ok) throw new Error("Erro ao buscar empresas");
        const result = await response.json();
        setData(result);
      } catch (error) {
        toast.error("Falha ao carregar empresas");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Colunas da tabela
  const columns = useMemo<ColumnDef<Empresa>[]>(
    () => [
      {
        accessorKey: "razaoSocial",
        header: "Razão Social",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.razaoSocial}</span>
            {row.original.nomeFantasia && (
              <span className="text-sm text-muted-foreground">
                {row.original.nomeFantasia}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "cnpj",
        header: "CNPJ",
        cell: ({ row }) => {
          const cnpj = row.getValue("cnpj") as string;
          const [copied, setCopied] = useState(false);

          const handleCopy = () => {
            navigator.clipboard
              .writeText(cnpj.replace(/\D/g, ""))
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                toast.success("CNPJ copiado!");
              })
              .catch(() => {
                toast.error("Falha ao copiar CNPJ");
              });
          };

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer" onClick={handleCopy}>
                    <Badge variant="outline" className="font-mono">
                      {formatCNPJ(cnpj)}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copiado!" : "Clique para copiar"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "uf",
        header: "UF",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-bold">
            {row.getValue("uf")}
          </Badge>
        ),
      },
      {
        accessorKey: "regimeTributacao",
        header: "Regime",
        cell: ({ row }) => {
          const regime = formatRegime(row.getValue("regimeTributacao"));
          return <Badge className={regime.color}>{regime.label}</Badge>;
        },
      },
      {
        accessorKey: "responsavel",
        header: "Responsável",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue("responsavel")}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        router.push(`/dashboard/empresas/${row.original.id}`)
                      }
                    >
                      <Eye className="h-4 w-4 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingId(row.original.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Excluir empresa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [router]
  );

  // Filtrar dados
  const filteredData = useMemo(() => {
    return data.filter(
      (empresa) =>
        empresa.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (empresa.nomeFantasia &&
          empresa.nomeFantasia
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        empresa.cnpj.includes(searchTerm)
    );
  }, [data, searchTerm]);

  // Tabela
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Função de deletar
  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/empresas/${deletingId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao deletar empresa");

      setData((prev) => prev.filter((e) => e.id !== deletingId));
      toast.success("Empresa removida com sucesso");
    } catch (error) {
      toast.error("Não foi possível deletar a empresa");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Input
            placeholder="Buscar empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3 top-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader
              className="
  bg-gradient-to-r from-blue-50 to-purple-50
  dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700
"
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold">
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
                    className="dark:hover:bg-gray-900 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center"
                  >
                    {searchTerm ? (
                      <div className="space-y-2">
                        <p>Nenhuma empresa encontrada para "{searchTerm}"</p>
                        <Button
                          variant="ghost"
                          onClick={() => setSearchTerm("")}
                        >
                          Limpar busca
                        </Button>
                      </div>
                    ) : (
                      <p>Nenhuma empresa cadastrada</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta empresa? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
