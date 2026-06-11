// app/dashboard/components/MetasCard.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Trophy, Calendar, ArrowRight } from "lucide-react";
import { MetaPessoal } from "../../../types/dashboard";
import { motion } from "framer-motion";

interface MetasCardProps {
  metas: MetaPessoal[];
  carregando: boolean;
}

export default function MetasCard({ metas, carregando }: MetasCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation("metasCard");

  const getLocalizedPath = (path: string) => {
    return `/${i18n.language}${path}`;
  };

  const formatarMoeda = (valor: number) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    const currency = i18n.language === "pt" ? "BRL" : "USD"; // ✅ Dinâmico
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(valor);
  };

  const formatarData = (data: Date) => {
    const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
    return new Date(data).toLocaleDateString(locale);
  };

  const calcularProgresso = (meta: MetaPessoal) => {
    return (meta.valorAtual / meta.valorAlvo) * 100;
  };

  const obterStatusMeta = (progresso: number, dataAlvo: Date) => {
    const hoje = new Date();
    const dataAlvoDate = new Date(dataAlvo);

    if (progresso >= 100) return "concluida";
    if (dataAlvoDate < hoje) return "atrasada";
    if (progresso >= 75) return "proxima";
    return "emAndamento";
  };

  const obterTextoStatus = (status: string) => {
    return t(`status.${status}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow w-full overflow-hidden">
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 gap-3 px-4 sm:px-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <motion.div
                className="p-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex-shrink-0"
                whileHover={{ rotate: 15 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <CardTitle className="dark:text-white text-lg lg:text-xl">
                {t("titulo")}
              </CardTitle>
            </div>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
              {t("subtitulo")}
            </CardDescription>
          </div>

          {/* Botão responsivo para todas as resoluções */}
          <div className="w-full lg:w-auto mt-2 lg:mt-0">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(getLocalizedPath("/dashboard/metas"))
                }
                className="
                  w-full lg:w-auto 
                  min-h-9 lg:h-9
                  px-4
                  border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-300 
                  hover:bg-gray-50 dark:hover:bg-gray-700 
                  hover:text-gray-900 dark:hover:text-white 
                  hover:border-gray-400 dark:hover:border-gray-500
                  transition-all
                  flex items-center justify-center
                  gap-2
                  whitespace-nowrap
                "
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {t("botoes.novaMeta")}
                </span>
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {carregando ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <motion.div
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        repeatType: "reverse",
                      }}
                    >
                      <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-800" />
                    </motion.div>
                    <Skeleton className="h-5 w-16 bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full bg-gray-200 dark:bg-gray-800" />
                    <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-gray-800" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : metas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-6"
            >
              <motion.div
                animate={{
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className="mx-auto w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3"
              >
                <Trophy className="h-7 w-7 text-gray-400 dark:text-gray-600" />
              </motion.div>
              <p className="text-gray-600 dark:text-gray-400 mb-3 px-2">
                {t("mensagens.nenhumaMeta")}
              </p>
              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(getLocalizedPath("/dashboard/metas"))
                    }
                    className="
                      border-gray-300 dark:border-gray-600 
                      text-gray-700 dark:text-gray-300 
                      hover:bg-gray-50 dark:hover:bg-gray-700
                      w-full max-w-xs
                      px-4
                    "
                  >
                    {t("botoes.criarPrimeira")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {metas.slice(0, 3).map((meta, index) => {
                const progresso = calcularProgresso(meta);
                const status = obterStatusMeta(progresso, meta.dataAlvo);

                return (
                  <motion.div
                    key={meta.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{
                      y: -3,
                      borderColor: "rgb(209 213 219 / 0.5)",
                    }}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer bg-gray-50/50 dark:bg-gray-800/50"
                    onClick={() =>
                      router.push(getLocalizedPath("/dashboard/metas/"))
                    }
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <motion.div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: meta.cor }}
                          whileHover={{ scale: 1.5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        />
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {meta.titulo}
                        </h4>
                      </div>
                      <div className="md:self-start md:flex-shrink-0">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Badge
                            variant={
                              status === "concluida"
                                ? "default"
                                : status === "atrasada"
                                  ? "destructive"
                                  : "outline"
                            }
                            className={`
                              text-xs font-medium w-full md:w-auto text-center md:text-left
                              ${
                                status === "concluida"
                                  ? "bg-emerald-100 dark:bg-green-900/50 text-emerald-700 dark:text-green-300 border-emerald-200 dark:border-green-700"
                                  : status === "atrasada"
                                    ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
                                    : status === "proxima"
                                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                              }
                            `}
                          >
                            {obterTextoStatus(status)}
                          </Badge>
                        </motion.div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between text-sm gap-1">
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {formatarMoeda(meta.valorAtual)} /{" "}
                          {formatarMoeda(meta.valorAlvo)}
                        </span>
                        <motion.span
                          className="font-semibold text-gray-900 dark:text-white sm:text-right min-w-[40px]"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                        >
                          {progresso.toFixed(0)}%
                        </motion.span>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-1.5 rounded-full transition-all duration-300"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progresso, 100)}%` }}
                          transition={{
                            duration: 0.8,
                            delay: index * 0.1 + 0.1,
                            ease: "easeOut",
                          }}
                          style={{
                            backgroundColor: meta.cor,
                          }}
                        />
                      </div>

                      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between text-xs gap-1">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 min-w-0">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {formatarData(meta.dataAlvo)}
                          </span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium truncate">
                          {meta.categoria}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {metas.length > 3 && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="
                      w-full 
                      text-gray-600 dark:text-gray-400 
                      hover:text-gray-900 dark:hover:text-white 
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      h-9
                      flex items-center justify-center
                    "
                    onClick={() =>
                      router.push(getLocalizedPath("/dashboard/metas"))
                    }
                  >
                    <span className="text-sm">{t("botoes.verTodas")}</span>
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
