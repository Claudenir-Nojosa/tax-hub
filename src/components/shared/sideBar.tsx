// components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  ChartNoAxesColumnIncreasing,
  Goal,
  WandSparkles,
  HandCoins,
  LogOut,
  X,
  CreditCard,
  ReceiptCent,
  Coins,
  Target,
  PhoneIncoming,
  ChevronDown,
  ChevronUp,
  Headphones,
  User,
  Settings,
  Crown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { usePathname, useParams, useRouter } from "next/navigation";
import { logoutAction } from "@/app/(auth)/(logout)/logoutAction";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { getFallback } from "@/lib/i18nFallback";
import LogoutButtonSimple from "./LogoutButton";

interface SidebarProps {
  onClose?: () => void;
}

interface LimiteInfo {
  plano: string;
  limiteLancamentos: number;
  usadoLancamentos: number;
  percentualLancamentos: number;
  lancamentosAtingido: boolean;
  limiteCategorias: number;
  usadoCategorias: number;
  percentualCategorias: number;
  categoriasAtingido: boolean;
  limiteMetas: number;
  usadoMetas: number;
  percentualMetas: number;
  metasAtingido: boolean;
  percentualCombinado: number;
  atingido: boolean;
  limiteCritico: string;
  maisProximoDoLimite: string;
  totalUsado: number;
  totalLimite: number;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);
  const [limiteCollapsed, setLimiteCollapsed] = useState(true);
  const { data: session } = useSession();
  const { t, i18n } = useTranslation("sidebar");
  const pathname = usePathname();
  const params = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const locale = pathname.split("/")[1];
  const currentLang = (params?.lang as string) || i18n.language || "pt";
  const router = useRouter();
  const [limiteInfo, setLimiteInfo] = useState<LimiteInfo | null>(null);
  const [loadingLimite, setLoadingLimite] = useState(false);

  // Funções de tradução com fallback
  const getTranslation = (key: string) => {
    // Primeiro tenta usar o i18n
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    // Fallback manual baseado nas chaves que você tem nos arquivos JSON
    switch (key) {
      // Menu
      case "menu.paginaInicial":
        return getFallback(currentLang, "Início", "Home");
      case "menu.lancamentos":
        return getFallback(currentLang, "Lançamentos", "Transactions");
      case "menu.limites":
        return getFallback(currentLang, "Limites", "Limits");
      case "menu.relatorios":
        return getFallback(currentLang, "Relatórios", "Reports");
      case "menu.cartoes":
        return getFallback(currentLang, "Cartões", "Cards");
      case "menu.categorias":
        return getFallback(currentLang, "Categorias", "Categories");
      case "menu.metas":
        return getFallback(currentLang, "Metas", "Goals");
      case "menu.vincularTelefone":
        return getFallback(currentLang, "Vincular Telefone", "Link Phone");
      case "menu.bicla":
        return getFallback(currentLang, "Bicla", "Bicla");
      case "menu.suporte":
        return getFallback(currentLang, "Suporte", "Support");

      // Usuário
      case "usuario.sair":
        return getFallback(currentLang, "Sair", "Sign Out");
      case "usuario.usuarioPadrao":
        return getFallback(currentLang, "Usuário", "User");

      // Tooltips de limites
      case "limites.limiteFree":
        return getFallback(currentLang, "Limites Free", "Free Limits");
      case "limites.limiteAtingido":
        return getFallback(currentLang, "Limite Atingido!", "Limit Reached!");
      case "limites.lancamentosLabel":
        return getFallback(currentLang, "Lançamentos:", "Transactions:");
      case "limites.categoriasLabel":
        return getFallback(currentLang, "Categorias:", "Categories:");
      case "limites.metasLabel":
        return getFallback(currentLang, "Metas:", "Goals:");
      case "limites.fazerUpgrade":
        return getFallback(currentLang, "Fazer Upgrade", "Upgrade");
      case "limites.upgrade":
        return getFallback(currentLang, "Upgrade", "Upgrade");
      case "usuario.saindo":
        return getFallback(currentLang, "Saindo...", "Signing out...");
      case "usuario.erroLogout":
        return getFallback(currentLang, "Erro ao sair", "Error signing out");
      default:
        return key;
    }
  };

  // Traduções específicas
  const translations = {
    paginaInicial: getTranslation("menu.paginaInicial"),
    lancamentos: getTranslation("menu.lancamentos"),
    limites: getTranslation("menu.limites"),
    relatorios: getTranslation("menu.relatorios"),
    cartoes: getTranslation("menu.cartoes"),
    categorias: getTranslation("menu.categorias"),
    metas: getTranslation("menu.metas"),
    vincularTelefone: getTranslation("menu.vincularTelefone"),
    bicla: getTranslation("menu.bicla"),
    suporte: getTranslation("menu.suporte"),
    usuarioPadrao: getTranslation("usuario.usuarioPadrao"),
    limiteFree: getTranslation("limites.limiteFree"),
    limiteAtingido: getTranslation("limites.limiteAtingido"),
    lancamentosLabel: getTranslation("limites.lancamentosLabel"),
    categoriasLabel: getTranslation("limites.categoriasLabel"),
    metasLabel: getTranslation("limites.metasLabel"),
    fazerUpgrade: getTranslation("limites.fazerUpgrade"),
    upgrade: getTranslation("limites.upgrade"),
    sair: getTranslation("usuario.sair"),
    saindo: getTranslation("usuario.saindo"),
    erroLogout: getTranslation("usuario.erroLogout"),
  };

  const fetchLimiteInfo = async () => {
    try {
      setLoadingLimite(true);
      const response = await fetch(
        "/api/usuarios/subscription/limite-combinado",
      );
      if (response.ok) {
        const data = await response.json();
        setLimiteInfo(data);
      }
    } catch (error) {
      console.error("Erro ao buscar limite:", error);
    } finally {
      setLoadingLimite(false);
    }
  };

  useEffect(() => {
    fetchLimiteInfo();
  }, []);

  const handleLogout = async () => {
    await logoutAction(locale);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarState");
    if (savedState) {
      const { isCollapsed: savedCollapsed } = JSON.parse(savedState);
      setIsCollapsed(savedCollapsed);
    } else {
      setIsCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (isCollapsed !== null) {
      const stateToSave = {
        isCollapsed,
        openSubmenus: { lancamentos: false },
      };
      localStorage.setItem("sidebarState", JSON.stringify(stateToSave));
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return translations.usuarioPadrao.charAt(0);
    const nameParts = name.split(" ");
    return nameParts
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const isActiveRoute = (route: string) => {
    const pathWithoutLang = pathname.replace(/^\/(pt|en)/, "");
    const routeWithoutLang = route.replace(/^\/(pt|en)/, "");
    return pathWithoutLang === routeWithoutLang;
  };

  const createLink = (path: string) => {
    if (path.startsWith(`/${currentLang}/`)) {
      return path;
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `/${currentLang}${cleanPath}`;
  };
  // Skeleton para o círculo percentual
  const SkeletonCirculoPercentual = ({
    isCollapsed,
  }: {
    isCollapsed: boolean;
  }) => (
    <div
      className={`
      relative flex items-center justify-center
      ${isCollapsed ? "mx-auto my-3" : "ml-3 my-3"}
      ${isCollapsed ? "h-12 w-12" : "h-14 w-14"}
    `}
    >
      <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
    </div>
  );

  // Skeleton para a versão expandida
  const SkeletonLimiteExpandido = () => (
    <div className="mt-4 p-3 rounded-lg dark:bg-transparent">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12">
          <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-16 animate-pulse ml-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-10 animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-10 animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CirculoPercentual = () => {
    if (loadingLimite) {
      return <SkeletonCirculoPercentual isCollapsed={true} />;
    }

    if (!limiteInfo || loadingLimite || limiteInfo.plano !== "free") {
      return null;
    }

    const { percentualCombinado, atingido, limiteCritico } = limiteInfo;

    // Cores baseadas no percentual
    let corProgresso = "#3b82f6"; // azul
    let corFundo = "bg-blue-50/50";
    let corBorda = "border-blue-200";
    let corTexto = "text-blue-700";

    if (atingido) {
      corProgresso = "#ef4444"; // vermelho
      corFundo = "bg-red-50/50";
      corBorda = "border-red-200";
      corTexto = "text-red-600";
    } else if (percentualCombinado >= 80) {
      corProgresso = "#f59e0b"; // amarelo
      corFundo = "bg-yellow-50/50";
      corBorda = "border-yellow-200";
      corTexto = "text-yellow-700";
    } else if (percentualCombinado >= 50) {
      corProgresso = "#3b82f6"; // azul
      corFundo = "bg-blue-50/50";
      corBorda = "border-blue-200";
      corTexto = "text-blue-700";
    }

    // Cores para dark mode
    const corFundoDark = atingido
      ? "dark:bg-red-950/20"
      : percentualCombinado >= 80
        ? "dark:bg-yellow-950/20"
        : "dark:bg-blue-950/20";

    const corBordaDark = atingido
      ? "dark:border-red-500/50"
      : percentualCombinado >= 80
        ? "dark:border-yellow-500/50"
        : "dark:border-blue-500/50";

    const corTextoDark = atingido
      ? "dark:text-red-400"
      : percentualCombinado >= 80
        ? "dark:text-yellow-400"
        : "dark:text-blue-400";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`
              relative flex items-center justify-center
              ${isCollapsed ? "mx-auto my-3" : "ml-3 my-3"}
              cursor-pointer
              rounded-full border-2
              transition-all duration-300 hover:scale-105
              ${isCollapsed ? "h-12 w-12" : "h-14 w-14"}
              ${corFundo} ${corBorda} ${corTexto}
              ${corFundoDark} ${corBordaDark} ${corTextoDark}
            `}
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile && onClose) {
                  onClose();
                }
                router.push(`/${currentLang}/dashboard/perfil`);
              }}
            >
              {/* Círculo de progresso */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeOpacity="0.15"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke={corProgresso}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${percentualCombinado * 2.83} 283`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>

              {/* Percentual no centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`
                  font-bold
                  ${isCollapsed ? "text-xs" : "text-sm"}
                  ${atingido ? "animate-pulse" : ""}
                `}
                >
                  {Math.round(percentualCombinado)}%
                </span>
              </div>

              {/* Indicador de limite atingido */}
              {atingido && (
                <div className="absolute -top-1 -right-1">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                  <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </TooltipTrigger>

          <TooltipContent
            side="right"
            className="max-w-xs p-0 shadow-xl border-0 bg-white dark:bg-gray-900"
          >
            <div className="p-4 space-y-4">
              {/* Header com melhor espaçamento */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {atingido
                        ? translations.limiteAtingido
                        : translations.limiteFree}
                    </h4>
                    {limiteCritico && !atingido && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Crítico: {limiteCritico}
                      </p>
                    )}
                  </div>
                  {atingido && (
                    <Button
                      size="sm"
                      className="
                      text-xs h-7 px-3 flex-shrink-0
                      bg-gradient-to-r from-red-500 to-red-600
                      hover:from-red-600 hover:to-red-700
                      text-white border-0
                      dark:from-red-600 dark:to-red-700
                      dark:hover:from-red-700 dark:hover:to-red-800
                    "
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMobile && onClose) {
                          onClose();
                        }
                        router.push(`/${currentLang}/dashboard/perfil`);
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      {translations.fazerUpgrade}
                    </Button>
                  )}
                </div>

                {/* Barra de progresso total */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Uso Total
                    </span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {limiteInfo.totalUsado}/{limiteInfo.totalLimite}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`
                      h-full rounded-full transition-all duration-500
                      ${
                        atingido
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : percentualCombinado >= 80
                            ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                            : "bg-gradient-to-r from-blue-500 to-blue-600"
                      }
                    `}
                      style={{
                        width: `${Math.min(percentualCombinado, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800" />

              {/* Detalhes individuais */}
              <div className="space-y-3">
                {/* Lançamentos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {translations.lancamentosLabel}
                    </span>
                    <span
                      className={`
                    text-xs font-semibold
                    ${
                      limiteInfo.lancamentosAtingido
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }
                  `}
                    >
                      {limiteInfo.usadoLancamentos}/
                      {limiteInfo.limiteLancamentos}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`
                      h-full rounded-full transition-all duration-500
                      ${
                        limiteInfo.lancamentosAtingido
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }
                    `}
                      style={{
                        width: `${Math.min(limiteInfo.percentualLancamentos, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Categorias */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {translations.categoriasLabel}
                    </span>
                    <span
                      className={`
                    text-xs font-semibold
                    ${
                      limiteInfo.categoriasAtingido
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }
                  `}
                    >
                      {limiteInfo.usadoCategorias}/{limiteInfo.limiteCategorias}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`
                      h-full rounded-full transition-all duration-500
                      ${
                        limiteInfo.categoriasAtingido
                          ? "bg-red-500"
                          : "bg-green-500"
                      }
                    `}
                      style={{
                        width: `${Math.min(limiteInfo.percentualCategorias, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {translations.metasLabel}
                    </span>
                    <span
                      className={`
                    text-xs font-semibold
                    ${
                      limiteInfo.metasAtingido
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }
                  `}
                    >
                      {limiteInfo.usadoMetas}/{limiteInfo.limiteMetas}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`
                      h-full rounded-full transition-all duration-500
                      ${
                        limiteInfo.metasAtingido
                          ? "bg-red-500"
                          : "bg-purple-500"
                      }
                    `}
                      style={{
                        width: `${Math.min(limiteInfo.percentualMetas, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              {!atingido && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-800" />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="
                      text-xs h-7 px-3
                      border-gray-300 dark:border-gray-600
                      hover:bg-gray-50 dark:hover:bg-gray-800
                      text-gray-700 dark:text-gray-300
                    "
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMobile && onClose) {
                          onClose();
                        }
                        router.push(`/${currentLang}/dashboard/perfil`);
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1.5" />
                      {translations.upgrade}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Versão expandida
  const LimiteExpandido = () => {
    if (loadingLimite) {
      return <SkeletonLimiteExpandido />;
    }

    if (!limiteInfo || loadingLimite || limiteInfo.plano !== "free") {
      return null;
    }

    const {
      percentualCombinado,
      atingido,
      limiteCritico,
      usadoLancamentos,
      limiteLancamentos,
      usadoCategorias,
      limiteCategorias,
      usadoMetas,
      limiteMetas,
      totalUsado,
      totalLimite,
    } = limiteInfo;

    // Cores baseadas no estado
    let corProgresso = "#3b82f6";
    let corTexto = "text-blue-600 dark:text-blue-400";
    let corFundo = "hover:bg-blue-50/50 dark:hover:bg-blue-950/20";
    let corBorda = "border-blue-100 dark:border-gray-900/70";

    if (atingido) {
      corProgresso = "#ef4444";
      corTexto = "text-red-600 dark:text-red-400";
      corFundo = "hover:bg-red-50/50 dark:hover:bg-red-950/20";
      corBorda = "border-red-100 dark:border-red-900/30";
    } else if (percentualCombinado >= 80) {
      corProgresso = "#f59e0b";
      corTexto = "text-yellow-600 dark:text-yellow-400";
      corFundo = "hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20";
      corBorda = "border-yellow-100 dark:border-yellow-900/30";
    }

    return (
      <div className={`w-full ${isMobile ? "mt-4" : ""}`}>
        {/* Header colapsável no mobile */}
        {isMobile && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setLimiteCollapsed(!limiteCollapsed);
            }}
            className={`flex w-full items-center justify-between rounded-xl border ${corBorda} bg-white/50 dark:bg-gray-800/30 p-3 transition-all ${corFundo}`}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 flex-shrink-0">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeOpacity="0.1"
                    className="text-gray-300 dark:text-gray-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke={corProgresso}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${percentualCombinado * 2.76} 276`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-[10px] font-bold ${corTexto}`}>
                    {Math.round(percentualCombinado)}%
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${corTexto}`}>
                  {translations.limiteFree}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {totalUsado} de {totalLimite} itens
                </p>
              </div>
            </div>
            {limiteCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}

        {/* Conteúdo - sempre visível no desktop, colapsável no mobile */}
        {(!isMobile || !limiteCollapsed) && (
          <div
            className={`
            ${isMobile ? "mt-2" : "mt-4"} p-4 rounded-xl cursor-pointer transition-all duration-200
            bg-white/50 dark:bg-gray-800/30
            border ${corBorda}
            ${corFundo}
            shadow-sm hover:shadow-md
          `}
            onClick={() => router.push(`/${currentLang}/dashboard/perfil`)}
          >
            <div className="space-y-4">
              {/* Header com círculo - só mostra no desktop */}
              {!isMobile && (
                <>
                  <div className="flex items-center gap-3">
                    {/* Círculo de progresso */}
                    <div className="relative h-14 w-14 flex-shrink-0">
                      <svg className="h-full w-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeOpacity="0.1"
                          className="text-gray-300 dark:text-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="transparent"
                          stroke={corProgresso}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${percentualCombinado * 2.76} 276`}
                          strokeDashoffset="0"
                          transform="rotate(-90 50 50)"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${corTexto}`}>
                          {Math.round(percentualCombinado)}%
                        </span>
                      </div>
                    </div>

                    {/* Título e info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold block">
                        {translations.limiteFree}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {totalUsado} de {totalLimite} itens usados
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700/50" />
                </>
              )}

              {/* Estatísticas detalhadas */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {translations.lancamentosLabel}
                  </span>
                  <span
                    className={`font-semibold ${
                      usadoLancamentos >= limiteLancamentos
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {usadoLancamentos}/{limiteLancamentos}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {translations.categoriasLabel}
                  </span>
                  <span
                    className={`font-semibold ${
                      usadoCategorias >= limiteCategorias
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {usadoCategorias}/{limiteCategorias}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {translations.metasLabel}
                  </span>
                  <span
                    className={`font-semibold ${
                      usadoMetas >= limiteMetas
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {usadoMetas}/{limiteMetas}
                  </span>
                </div>
              </div>

              {/* Botão de upgrade (sempre visível no final) */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/50">
                <Button
                  size="sm"
                  className={`
                  w-full text-xs h-8
                  ${
                    atingido
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 dark:from-blue-600 dark:to-cyan-600 dark:hover:from-blue-700 dark:hover:to-cyan-700 text-white"
                  }
                  border-0 font-medium
                `}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMobile && onClose) {
                      onClose();
                    }
                    router.push(`/${currentLang}/dashboard/perfil`);
                  }}
                >
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  {atingido ? translations.fazerUpgrade : translations.upgrade}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed === null) {
    return <div className="w-20 lg:w-64"></div>;
  }

  return (
    <div
      className={`
        flex flex-col h-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 
        border-r border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-none
        ${isCollapsed ? "w-20" : "w-64"} 
        transition-all duration-300
      `}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <Image
              src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/tax-hub-Logo.png?raw=true"
              alt="tax-hub Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              tax-hub
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          <li>
            <Link
              href={createLink("/dashboard")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <Home className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.paginaInicial}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/lancamentos")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  pathname.includes("/lancamentos")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <HandCoins className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.lancamentos}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/limites")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/limites")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <Target className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.limites}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/relatorios")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/relatorios")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <ChartNoAxesColumnIncreasing className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.relatorios}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/cartoes")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/cartoes")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <CreditCard className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.cartoes}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/categorias")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/categorias")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <ReceiptCent className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.categorias}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/metas")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/metas")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <Goal className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.metas}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/vincular-telefone")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/vincular-telefone")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <PhoneIncoming className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.vincularTelefone}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/bicla")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/bicla")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <WandSparkles className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.bicla}
                </span>
              )}
            </Link>
          </li>

          <li>
            <Link
              href={createLink("/dashboard/suporte")}
              className={`
                flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                text-gray-700 dark:text-gray-300 transition-all duration-200
                ${isCollapsed ? "justify-center p-4" : "p-4"}
                ${
                  isActiveRoute("/dashboard/suporte")
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700"
                    : ""
                }
              `}
              onClick={handleLinkClick}
            >
              <Headphones className="h-5 w-5" />
              {!isCollapsed && (
                <span className="ml-4 text-sm font-medium">
                  {translations.suporte}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      <div className="px-4 pb-2">
        {!isCollapsed && <LimiteExpandido />}
        {isCollapsed && <CirculoPercentual />}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="space-y-3">
          <Link
            href={createLink(`/${currentLang}/dashboard/perfil`)}
            className={`
    flex items-center rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800 
    transition-all duration-200 cursor-pointer
    ${isCollapsed ? "justify-center" : ""}
  `}
            onClick={handleLinkClick}
          >
            <div className="relative h-8 w-8 flex-shrink-0">
              <Avatar className="h-full w-full">
                <AvatarImage
                  src={session?.user?.image || ""}
                  alt={session?.user?.name || translations.usuarioPadrao}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            {!isCollapsed && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {session?.user?.email}
                </p>
              </div>
            )}
          </Link>

          <LogoutButtonSimple
            locale={locale}
            isCollapsed={isCollapsed}
            translations={{
              sair: translations.sair,
              saindo: translations.saindo,
              erroLogout: translations.erroLogout,
            }}
          />
        </div>
      </div>
    </div>
  );
}
