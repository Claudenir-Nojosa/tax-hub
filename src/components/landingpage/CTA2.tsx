"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation"; // Adicionar useParams
import Link from "next/link";

export const CTA2 = () => {
  const { t } = useTranslation("cta2");
  const params = useParams(); // Obter parâmetros da URL
  const currentLang = (params?.lang as string) || "pt"; // Extrair linguagem

  return (
    <section className="py-32 relative overflow-hidden bg-background" id="cta">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#00cfec]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#007cca]/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="absolute -top-8 -left-8 w-20 h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl rotate-12 hidden lg:block border border-gray-200/60 dark:border-gray-800/60"
              animate={{
                rotate: [12, 24, 12],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-[#00cfec]/40" />
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full -rotate-12 hidden lg:block border border-gray-200/60 dark:border-gray-800/60"
              animate={{
                rotate: [-12, -24, -12],
                y: [0, 10, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Star className="w-12 h-12 text-[#007cca]/40" />
              </div>
            </motion.div>

            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-[32px] p-12 md:p-16 border-2 border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00cfec]/5 via-transparent to-[#007cca]/5" />

              <div className="relative z-10">
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-gray-900 dark:text-white tracking-tight">
                      {t("title.start", "Comece sua jornada")}
                      <br />
                      <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
                        {t("title.highlight", "financeira hoje")}
                      </span>
                    </h2>
                  </motion.div>

                  <motion.p
                    className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    {t("description", "Dê o primeiro passo rumo à liberdade financeira. Configure sua conta em minutos e veja a mágica acontecer.")}
                  </motion.p>
                </div>

                <motion.div
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Link href={`/${currentLang}/signup`}>
                    <motion.button
                      className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white font-bold text-base md:text-lg shadow-2xl shadow-[#00cfec]/40 overflow-hidden w-full sm:w-auto"
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {t("button", "Criar conta gratuita")}
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.div>
                      </span>

                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                        animate={{
                          x: ["-200%", "200%"],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          repeatDelay: 1.5,
                        }}
                      />
                    </motion.button>
                  </Link>
                </motion.div>

                <motion.div
                  className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-gray-200/60 dark:border-gray-800/60"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <motion.div
                    className="flex items-center gap-3"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-[#007cca] dark:text-[#00cfec]" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                        {t("features.secure.title", "100% Seguro")}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("features.secure.subtitle", "Criptografia bancária")}
                      </div>
                    </div>
                  </motion.div>

                  <div className="hidden sm:block w-px h-12 bg-gray-200/60 dark:bg-gray-800/60" />

                  <motion.div
                    className="flex items-center gap-3"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#007cca] dark:text-[#00cfec]" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                        {t("features.trial.title", "7 dias grátis")}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("features.trial.subtitle", "Sem cartão de crédito")}
                      </div>
                    </div>
                  </motion.div>

                  <div className="hidden sm:block w-px h-12 bg-gray-200/60 dark:bg-gray-800/60" />

                  <motion.div
                    className="flex items-center gap-3"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center">
                      <div className="flex -space-x-1">
                        <Star className="w-4 h-4 text-[#007cca] dark:text-[#00cfec] fill-current" />
                        <Star className="w-4 h-4 text-[#007cca] dark:text-[#00cfec] fill-current" />
                        <Star className="w-4 h-4 text-[#007cca] dark:text-[#00cfec] fill-current" />
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                        {t("features.loved.title", "Adorado")}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("features.loved.subtitle", "Por milhares de usuários")}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTA2;