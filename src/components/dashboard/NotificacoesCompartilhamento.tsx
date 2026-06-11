// components/dashboard/NotificacoesSino.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Bell,
  Check,
  X,
  Clock,
  User,
  Calendar,
  Tag,
  CreditCard,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Target,
} from "lucide-react";

interface LancamentoCompartilhado {
  id: string;
  valorCompartilhado: number;
  status: string;
  createdAt: string;
  lancamento: {
    id: string;
    descricao: string;
    data: string;
    tipo: string;
    categoria: {
      nome: string;
      cor: string;
    };
  };
  usuarioCriador: {
    name: string;
    email: string;
    image?: string;
  };
}

interface ConviteCartao {
  id: string;
  emailConvidado: string;
  status: string;
  expiraEm: string;
  criadoEm: string;
  cartao: {
    id: string;
    nome: string;
    bandeira: string;
    cor: string;
  };
  usuarioCriador: {
    name: string;
    email: string;
    image?: string;
  };
}

interface ConviteMeta {
  id: string;
  emailConvidado: string;
  status: string;
  expiraEm: string;
  criadoEm: string;
  meta: {
    id: string;
    titulo: string;
    categoria: string;
    cor: string;
    icone: string;
  };
  usuarioCriador: {
    name: string;
    email: string;
    image?: string;
  };
}

export default function NotificacoesSino() {
  const { t, i18n } = useTranslation("notificacoes");

  const [compartilhamentosPendentes, setCompartilhamentosPendentes] = useState<
    LancamentoCompartilhado[]
  >([]);
  const [convitesPendentes, setConvitesPendentes] = useState<ConviteCartao[]>(
    [],
  );
  const [convitesMetasPendentes, setConvitesMetasPendentes] = useState<
    ConviteMeta[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [processandoTodos, setProcessandoTodos] = useState(false);
  const [processandoAceitarTodos, setProcessandoAceitarTodos] = useState(false);
  const [processandoRecusarTodos, setProcessandoRecusarTodos] = useState(false);
  const [aceitandoConvites, setAceitandoConvites] = useState<Set<string>>(
    new Set(),
  );
  const [recusandoConvites, setRecusandoConvites] = useState<Set<string>>(
    new Set(),
  );
  const [aceitandoCompartilhamentos, setAceitandoCompartilhamentos] = useState<
    Set<string>
  >(new Set());
  const [recusandoCompartilhamentos, setRecusandoCompartilhamentos] = useState<
    Set<string>
  >(new Set());
  const [aceitandoConvitesMetas, setAceitandoConvitesMetas] = useState<
    Set<string>
  >(new Set());
  const [recusandoConvitesMetas, setRecusandoConvitesMetas] = useState<
    Set<string>
  >(new Set());

  const carregarNotificacoes = async () => {
    try {
      setCarregando(true);

      const [
        compartilhamentosResponse,
        convitesResponse,
        convitesMetasResponse,
      ] = await Promise.all([
        fetch("/api/lancamentos/compartilhados?status=PENDENTE"),
        fetch("/api/convites/pendentes"),
        fetch("/api/convites-metas/pendentes"),
      ]);

      if (compartilhamentosResponse.ok) {
        const compartilhamentosData = await compartilhamentosResponse.json();
        setCompartilhamentosPendentes(compartilhamentosData);
      }

      if (convitesResponse.ok) {
        const convitesData = await convitesResponse.json();
        setConvitesPendentes(convitesData);
      }

      if (convitesMetasResponse.ok) {
        const convitesMetasData = await convitesMetasResponse.json();
        setConvitesMetasPendentes(convitesMetasData);
      }
    } catch (error) {
      console.error(t("mensagens.erroCarregar"), error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();

    const interval = setInterval(() => {
      if (!sheetAberto) {
        carregarNotificacoes();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sheetAberto]);

  const handleAceitarCompartilhamento = async (
    compartilhamentoId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setAceitandoCompartilhamentos((prev) =>
      new Set(prev).add(compartilhamentoId),
    );

    try {
      const response = await fetch("/api/lancamentos/compartilhados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lancamentoCompartilhadoId: compartilhamentoId,
          status: "ACEITO",
        }),
      });

      if (response.ok) {
        toast.success(t("mensagens.lancamentoAceito"));
        setCompartilhamentosPendentes((prev) =>
          prev.filter((item) => item.id !== compartilhamentoId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroAceitarLancamento"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setAceitandoCompartilhamentos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(compartilhamentoId);
        return newSet;
      });
    }
  };

  const handleRecusarCompartilhamento = async (
    compartilhamentoId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setRecusandoCompartilhamentos((prev) =>
      new Set(prev).add(compartilhamentoId),
    );

    try {
      const response = await fetch("/api/lancamentos/compartilhados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lancamentoCompartilhadoId: compartilhamentoId,
          status: "RECUSADO",
        }),
      });

      if (response.ok) {
        toast.success(t("mensagens.lancamentoRecusado"));
        setCompartilhamentosPendentes((prev) =>
          prev.filter((item) => item.id !== compartilhamentoId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroRecusarLancamento"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setRecusandoCompartilhamentos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(compartilhamentoId);
        return newSet;
      });
    }
  };

  const handleAceitarConvite = async (
    conviteId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setAceitandoConvites((prev) => new Set(prev).add(conviteId));

    try {
      const response = await fetch(`/api/convites/${conviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "ACEITAR",
        }),
      });

      if (response.ok) {
        toast.success(t("mensagens.conviteAceito"));
        setConvitesPendentes((prev) =>
          prev.filter((item) => item.id !== conviteId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroAceitarConvite"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setAceitandoConvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conviteId);
        return newSet;
      });
    }
  };

  const handleRecusarConvite = async (
    conviteId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setRecusandoConvites((prev) => new Set(prev).add(conviteId));

    try {
      const response = await fetch(`/api/convites/${conviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "RECUSAR",
        }),
      });

      if (response.ok) {
        toast.success(t("mensagens.conviteRecusado"));
        setConvitesPendentes((prev) =>
          prev.filter((item) => item.id !== conviteId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroRecusarConvite"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setRecusandoConvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conviteId);
        return newSet;
      });
    }
  };

  const handleAceitarConviteMeta = async (
    conviteId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setAceitandoConvitesMetas((prev) => new Set(prev).add(conviteId));

    try {
      const response = await fetch(`/api/convites-metas/${conviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "ACEITAR" }),
      });

      if (response.ok) {
        toast.success(t("mensagens.conviteMetaAceito"));
        setConvitesMetasPendentes((prev) =>
          prev.filter((item) => item.id !== conviteId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroAceitarConvite"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setAceitandoConvitesMetas((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conviteId);
        return newSet;
      });
    }
  };

  const handleRecusarConviteMeta = async (
    conviteId: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();

    setRecusandoConvitesMetas((prev) => new Set(prev).add(conviteId));

    try {
      const response = await fetch(`/api/convites-metas/${conviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "RECUSAR" }),
      });

      if (response.ok) {
        toast.success(t("mensagens.conviteMetaRecusado"));
        setConvitesMetasPendentes((prev) =>
          prev.filter((item) => item.id !== conviteId),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || t("mensagens.erroRecusarConvite"));
      }
    } catch (error) {
      console.error(t("mensagens.erro"), error);
      toast.error(t("mensagens.erroProcessar"));
    } finally {
      setRecusandoConvitesMetas((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conviteId);
        return newSet;
      });
    }
  };

  const handleAceitarTodos = async () => {
    if (processandoAceitarTodos) return;

    setProcessandoAceitarTodos(true);
    try {
      const promisesConvites = convitesPendentes.map((convite) =>
        fetch(`/api/convites/${convite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "ACEITAR" }),
        }),
      );

      const promisesCompartilhamentos = compartilhamentosPendentes.map(
        (compartilhamento) =>
          fetch("/api/lancamentos/compartilhados", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lancamentoCompartilhadoId: compartilhamento.id,
              status: "ACEITO",
            }),
          }),
      );

      const promisesConvitesMetas = convitesMetasPendentes.map((convite) =>
        fetch(`/api/convites-metas/${convite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "ACEITAR" }),
        }),
      );

      const todasPromises = [
        ...promisesConvites,
        ...promisesCompartilhamentos,
        ...promisesConvitesMetas,
      ];

      const resultados = await Promise.allSettled(todasPromises);

      const sucessos = resultados.filter(
        (result) => result.status === "fulfilled" && result.value.ok,
      ).length;
      const erros = resultados.length - sucessos;

      if (erros === 0) {
        toast.success(
          t("mensagens.todasNotificacoesAceitas", {
            count: todasPromises.length,
          }),
        );
      } else {
        toast.success(t("mensagens.notificacoesComErro", { sucessos, erros }));
      }

      setConvitesPendentes([]);
      setCompartilhamentosPendentes([]);
      setConvitesMetasPendentes([]);
    } catch (error) {
      console.error(t("mensagens.erroAceitarTodas"), error);
      toast.error(t("mensagens.erroProcessarTodas"));
    } finally {
      setProcessandoAceitarTodos(false);
    }
  };

  const handleRecusarTodos = async () => {
    if (processandoRecusarTodos) return;

    setProcessandoRecusarTodos(true);
    try {
      const promisesConvites = convitesPendentes.map((convite) =>
        fetch(`/api/convites/${convite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "RECUSAR" }),
        }),
      );

      const promisesCompartilhamentos = compartilhamentosPendentes.map(
        (compartilhamento) =>
          fetch("/api/lancamentos/compartilhados", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lancamentoCompartilhadoId: compartilhamento.id,
              status: "RECUSADO",
            }),
          }),
      );

      const promisesConvitesMetas = convitesMetasPendentes.map((convite) =>
        fetch(`/api/convites-metas/${convite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "RECUSAR" }),
        }),
      );

      const todasPromises = [
        ...promisesConvites,
        ...promisesCompartilhamentos,
        ...promisesConvitesMetas,
      ];

      const resultados = await Promise.allSettled(todasPromises);

      const sucessos = resultados.filter(
        (result) => result.status === "fulfilled" && result.value.ok,
      ).length;
      const erros = resultados.length - sucessos;

      if (erros === 0) {
        toast.success(
          t("mensagens.todasNotificacoesRecusadas", {
            count: todasPromises.length,
          }),
        );
      } else {
        toast.success(
          t("mensagens.notificacoesRecusadasComErro", { sucessos, erros }),
        );
      }

      setConvitesPendentes([]);
      setCompartilhamentosPendentes([]);
      setConvitesMetasPendentes([]);
    } catch (error) {
      console.error(t("mensagens.erroRecusarTodas"), error);
      toast.error(t("mensagens.erroProcessarTodas"));
    } finally {
      setProcessandoRecusarTodos(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    return new Date(dataString).toLocaleDateString(locale);
  };

  const formatarTempo = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffSegundos = Math.floor(diffMs / 1000);
    const diffMinutos = Math.floor(diffSegundos / 60);
    const diffHoras = Math.floor(diffMinutos / 60);
    const diffDias = Math.floor(diffHoras / 24);
    const diffSemanas = Math.floor(diffDias / 7);
    const diffMeses = Math.floor(diffDias / 30);

    if (diffMinutos < 1) return t("tempo.agora");
    if (diffMinutos < 60) {
      return diffMinutos === 1
        ? t("tempo.minuto", { count: diffMinutos })
        : t("tempo.minutos", { count: diffMinutos });
    }
    if (diffHoras < 24) {
      return diffHoras === 1
        ? t("tempo.hora", { count: diffHoras })
        : t("tempo.horas", { count: diffHoras });
    }
    if (diffDias < 7) {
      return diffDias === 1
        ? t("tempo.dia", { count: diffDias })
        : t("tempo.dias", { count: diffDias });
    }
    if (diffSemanas < 4) {
      return diffSemanas === 1
        ? t("tempo.semana", { count: diffSemanas })
        : t("tempo.semanas", { count: diffSemanas });
    }
    return diffMeses === 1
      ? t("tempo.mes", { count: diffMeses })
      : t("tempo.meses", { count: diffMeses });
  };

  const totalNotificacoes =
    compartilhamentosPendentes.length +
    convitesPendentes.length +
    convitesMetasPendentes.length;
  return (
    <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
        >
          <Bell className="h-5 w-5" />
          {totalNotificacoes > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0">
              {totalNotificacoes}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <SheetHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <SheetTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("titulos.notificacoes")}
            {totalNotificacoes > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700"
              >
                {totalNotificacoes}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="py-4">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="h-8 w-8 mb-2 animate-spin" />
              <p className="text-sm">{t("estados.carregando")}</p>
            </div>
          ) : totalNotificacoes === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Bell className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">{t("mensagens.nenhumaNotificacao")}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("mensagens.semSolicitacoes")}
              </p>
            </div>
          ) : (
            <>
              {/* BOTÕES ACEITAR/RECUSAR TODOS */}
              <div className="flex gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAceitarTodos();
                  }}
                  disabled={processandoAceitarTodos || processandoRecusarTodos}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                  size="sm"
                >
                  {processandoAceitarTodos ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {processandoAceitarTodos
                    ? t("botoes.processando")
                    : t("botoes.aceitarTodos")}
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecusarTodos();
                  }}
                  disabled={processandoAceitarTodos || processandoRecusarTodos}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                  size="sm"
                >
                  {processandoRecusarTodos ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {processandoRecusarTodos
                    ? t("botoes.processando")
                    : t("botoes.recusarTodos")}
                </Button>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                {/* Convites de Cartão */}
                {convitesPendentes.map((convite) => {
                  const aceitando = aceitandoConvites.has(convite.id);
                  const recusando = recusandoConvites.has(convite.id);

                  return (
                    <div
                      key={convite.id}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                      {/* Header - Usuário e Tempo */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {convite.usuarioCriador.image ? (
                            <img
                              src={convite.usuarioCriador.image}
                              alt={convite.usuarioCriador.name}
                              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {convite.usuarioCriador.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatarTempo(convite.criadoEm)}
                        </span>
                      </div>

                      {/* Detalhes do Convite */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {t("tipos.conviteCartao")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-6">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: convite.cartao.cor }}
                          />
                          <p className="text-sm text-gray-900 dark:text-white">
                            {convite.cartao.nome}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                          >
                            {convite.cartao.bandeira}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 ml-6 text-xs text-gray-500 dark:text-gray-400">
                          <Users className="h-3 w-3" />
                          <span>{t("tipos.acessoLeitura")}</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t("labels.expiraEm")}{" "}
                          {formatarData(convite.expiraEm)}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => handleAceitarConvite(convite.id, e)}
                            disabled={aceitando || recusando}
                            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {aceitando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleRecusarConvite(convite.id, e)}
                            disabled={aceitando || recusando}
                            className="h-8 px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                          >
                            {recusando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Convites de Metas */}
                {convitesMetasPendentes.map((convite) => {
                  const aceitando = aceitandoConvitesMetas.has(convite.id);
                  const recusando = recusandoConvitesMetas.has(convite.id);

                  return (
                    <div
                      key={convite.id}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                      {/* Header - Usuário e Tempo */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {convite.usuarioCriador.image ? (
                            <img
                              src={convite.usuarioCriador.image}
                              alt={convite.usuarioCriador.name}
                              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {convite.usuarioCriador.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatarTempo(convite.criadoEm)}
                        </span>
                      </div>

                      {/* Detalhes do Convite */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {t("tipos.conviteMeta")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-6">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: convite.meta.cor }}
                          />
                          <p className="text-sm text-gray-900 dark:text-white">
                            {convite.meta.titulo}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                          >
                            {convite.meta.categoria}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 ml-6 text-xs text-gray-500 dark:text-gray-400">
                          <Users className="h-3 w-3" />
                          <span>{t("tipos.acessoLeitura")}</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t("labels.expiraEm")}{" "}
                          {formatarData(convite.expiraEm)}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) =>
                              handleAceitarConviteMeta(convite.id, e)
                            }
                            disabled={aceitando || recusando}
                            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {aceitando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) =>
                              handleRecusarConviteMeta(convite.id, e)
                            }
                            disabled={aceitando || recusando}
                            className="h-8 px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                          >
                            {recusando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Lançamentos Compartilhados */}
                {compartilhamentosPendentes.map((compartilhamento) => {
                  const aceitando = aceitandoCompartilhamentos.has(
                    compartilhamento.id,
                  );
                  const recusando = recusandoCompartilhamentos.has(
                    compartilhamento.id,
                  );

                  return (
                    <div
                      key={compartilhamento.id}
                      className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                      {/* Header - Usuário e Tempo */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {compartilhamento.usuarioCriador.image ? (
                            <img
                              src={compartilhamento.usuarioCriador.image}
                              alt={compartilhamento.usuarioCriador.name}
                              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {compartilhamento.usuarioCriador.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatarTempo(compartilhamento.createdAt)}
                        </span>
                      </div>

                      {/* Detalhes do Lançamento */}
                      <div className="space-y-2 mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {compartilhamento.lancamento.descricao}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>
                              {compartilhamento.lancamento.categoria.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatarData(compartilhamento.lancamento.data)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Valor e Ações */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                            {formatarMoeda(compartilhamento.valorCompartilhado)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {compartilhamento.lancamento.tipo === "DESPESA"
                              ? t("tipos.despesa")
                              : t("tipos.receita")}{" "}
                            {t("tipos.compartilhada")}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) =>
                              handleAceitarCompartilhamento(
                                compartilhamento.id,
                                e,
                              )
                            }
                            disabled={aceitando || recusando}
                            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {aceitando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) =>
                              handleRecusarCompartilhamento(
                                compartilhamento.id,
                                e,
                              )
                            }
                            disabled={aceitando || recusando}
                            className="h-8 px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                          >
                            {recusando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
