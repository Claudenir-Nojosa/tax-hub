"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Users,
  Plus,
  Calendar,
  CreditCard,
  Tag,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
} from "lucide-react";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: "RECEITA" | "DESPESA";
  data: Date;
  createdAt: Date;
  categoria: {
    nome: string;
    cor: string;
    icone?: string;
  };
  metodoPagamento: string;
  observacoes?: string;
  pago: boolean;
  tipoParcelamento?: string;
  parcelasTotal?: number;
  parcelaAtual?: number;
  recorrente: boolean;
  cartao?: {
    nome: string;
    bandeira: string;
  };
  LancamentoCompartilhado?: Array<{
    valorCompartilhado: number;
    status: string;
    usuarioAlvo: {
      name: string;
      email: string;
    };
  }>;
}

interface DashboardTableProps {
  mes?: string;
  ano?: string;
  refreshTrigger?: number;
}

const LIMITE_LANCAMENTOS = 10;

export default function DashboardTable({
  mes,
  ano,
  refreshTrigger,
}: DashboardTableProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation("dashboardTable");
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] =
    useState<Lancamento | null>(null);

  const getLocalizedPath = (path: string) => {
    return `/${i18n.language}${path}`;
  };

  useEffect(() => {
    carregarUltimosLancamentos();
  }, [mes, ano, refreshTrigger]);

  const carregarUltimosLancamentos = async () => {
    try {
      setCarregando(true);

      const params = new URLSearchParams();
      if (mes) params.append("mes", mes);
      if (ano) params.append("ano", ano);

      const response = await fetch(`/api/lancamentos?${params}`);
      if (!response.ok) throw new Error(t("erros.erroCarregar"));

      const data = await response.json();

      const ordenado = data.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const lancamentosLimitados = ordenado.slice(0, LIMITE_LANCAMENTOS);
      setLancamentos(lancamentosLimitados);
    } catch (error) {
      console.error(t("erros.erroCarregar"), error);
    } finally {
      setCarregando(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    const currency = i18n.language === "pt" ? "BRL" : "USD";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(valor);
  };

  const formatarData = (data: Date) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    return new Date(data).toLocaleDateString(locale);
  };

  const formatarDataHora = (data: Date) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    return new Date(data).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLancamentoClick = (lancamento: Lancamento) => {
    setLancamentoSelecionado(lancamento);
    setDialogAberto(true);
  };

  const temCompartilhamento = (lancamento: Lancamento) => {
    return (
      lancamento.LancamentoCompartilhado &&
      lancamento.LancamentoCompartilhado.length > 0
    );
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-gray-900 dark:text-white text-lg font-semibold">
              {t("titulo")}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
              {t("subtitulo", { limit: LIMITE_LANCAMENTOS })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(getLocalizedPath("/dashboard/lancamentos"))
              }
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              {t("botoes.verTodos")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
                      <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-gray-800" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20 bg-gray-200 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {t("mensagens.nenhumLancamento")}
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/lancamentos/novo")}
                className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("botoes.adicionarPrimeiro")}
              </Button>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto">
              <div className="md:min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="md:table-cell hidden">
                        {t("tabela.colunas.descricao")}
                      </TableHead>
                      <TableHead className="md:table-cell hidden">
                        {t("tabela.colunas.categoria")}
                      </TableHead>
                      <TableHead className="md:table-cell hidden">
                        {t("tabela.colunas.data")}
                      </TableHead>
                      <TableHead className="md:table-cell hidden text-right">
                        {t("tabela.colunas.valor")}
                      </TableHead>

                      {/* Mobile */}
                      <TableHead className="md:hidden">
                        {t("tabela.colunas.descricao")}
                      </TableHead>
                      <TableHead className="md:hidden text-right">
                        {t("tabela.colunas.valor")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentos.map((lancamento) => (
                      <TableRow
                        key={lancamento.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleLancamentoClick(lancamento)}
                      >
                        {/* DESKTOP */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {lancamento.descricao}
                            {temCompartilhamento(lancamento) && (
                              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: lancamento.categoria.cor,
                              color: lancamento.categoria.cor,
                            }}
                          >
                            {lancamento.categoria.nome}
                          </Badge>
                        </TableCell>

                        <TableCell className="hidden md:table-cell">
                          {formatarData(lancamento.data)}
                        </TableCell>

                        <TableCell className="hidden md:table-cell text-right">
                          <span
                            className={
                              lancamento.tipo === "RECEITA"
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-red-600 dark:text-red-400 font-semibold"
                            }
                          >
                            {formatarMoeda(lancamento.valor)}
                          </span>
                        </TableCell>

                        {/* MOBILE */}
                        <TableCell className="md:hidden px-3 py-3 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-semibold"
                                style={{ color: lancamento.categoria.cor }}
                              >
                                {lancamento.categoria.nome}
                              </span>
                              {temCompartilhamento(lancamento) && (
                                <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>

                            <p className="font-medium text-sm break-words whitespace-normal">
                              {lancamento.descricao}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lancamento.metodoPagamento}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="md:hidden px-3 py-3 text-right align-top">
                          <div className="space-y-1">
                            <p
                              className={`font-semibold ${
                                lancamento.tipo === "RECEITA"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatarMoeda(lancamento.valor)}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatarData(lancamento.data)}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {lancamentoSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {lancamentoSelecionado.tipo === "RECEITA" ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  {lancamentoSelecionado.descricao}
                </DialogTitle>
                <DialogDescription>
                  {t("dialog.descricao")} {/* Nova tradução */}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="space-y-6 mt-4">
                  {/* Valor Principal */}
                  <div className="text-center py-4 border-b dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {t("dialog.secoes.valor")} {/* Nova tradução */}
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        lancamentoSelecionado.tipo === "RECEITA"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatarMoeda(lancamentoSelecionado.valor)}
                    </p>
                    <Badge
                      variant={
                        lancamentoSelecionado.tipo === "RECEITA"
                          ? "default"
                          : "destructive"
                      }
                      className="mt-2"
                    >
                      {lancamentoSelecionado.tipo === "RECEITA"
                        ? t("dialog.tipos.receita") // Nova tradução
                        : t("dialog.tipos.despesa")}{" "}
                    
                    </Badge>
                  </div>

                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categoria */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                        <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t("dialog.secoes.categoria")} {/* Nova tradução */}
                        </p>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: lancamentoSelecionado.categoria.cor,
                            color: lancamentoSelecionado.categoria.cor,
                          }}
                        >
                          {lancamentoSelecionado.categoria.nome}
                        </Badge>
                      </div>
                    </div>

                    {/* Data */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t("dialog.secoes.dataLancamento")}{" "}
                          {/* Nova tradução */}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatarData(lancamentoSelecionado.data)}
                        </p>
                      </div>
                    </div>

                    {/* Método de Pagamento */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                        <CreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t("dialog.secoes.metodoPagamento")}{" "}
                        
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {lancamentoSelecionado.metodoPagamento}
                        </p>
                        {lancamentoSelecionado.cartao && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("dialog.cartao", {
                            
                              nome: lancamentoSelecionado.cartao.nome,
                              bandeira: lancamentoSelecionado.cartao.bandeira,
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status de Pagamento */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t("dialog.secoes.status")} {/* Nova tradução */}
                        </p>
                        <Badge
                          variant={
                            lancamentoSelecionado.pago ? "default" : "secondary"
                          }
                        >
                          {lancamentoSelecionado.pago
                            ? t("dialog.status.pago") // Nova tradução
                            : t("dialog.status.pendente")}{" "}
                       
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Parcelamento */}
                  {lancamentoSelecionado.tipoParcelamento && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        {t("dialog.parcelamento.titulo")} {/* Nova tradução */}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        {t("dialog.parcelamento.parcela", {
                         
                          atual: lancamentoSelecionado.parcelaAtual,
                          total: lancamentoSelecionado.parcelasTotal,
                        })}
                      </p>
                    </div>
                  )}

                  {/* Recorrente */}
                  {lancamentoSelecionado.recorrente && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                        {t("dialog.recorrente")} {/* Nova tradução */}
                      </p>
                    </div>
                  )}

                  {/* Observações */}
                  {lancamentoSelecionado.observacoes && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {t("dialog.secoes.observacoes")} {/* Nova tradução */}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {lancamentoSelecionado.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Data de Criação */}
                  <div className="pt-4 border-t dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t("dialog.secoes.dataCriacao")}{" "}
                      {formatarDataHora(lancamentoSelecionado.createdAt)}{" "}
                      {/* Nova tradução */}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
