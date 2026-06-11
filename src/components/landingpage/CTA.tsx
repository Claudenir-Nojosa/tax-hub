"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useParams } from "next/navigation"; // Adicionar useParams

export const CTA = () => {
  const { t } = useTranslation("cta");
  const params = useParams(); // Obter parâmetros da URL
  const currentLang = (params?.lang as string) || "pt"; // Extrair linguagem

  return (
    <section className="py-24 relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#00cfec]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#007cca]/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 rounded-3xl opacity-50 blur-2xl scale-110" />

          <div className="relative glass rounded-3xl p-8 md:p-16 overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-8 right-8"
            >
              <Sparkles className="w-8 h-8 text-[#00cfec]/30" />
            </motion.div>
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-8 left-8"
            >
              <Sparkles className="w-6 h-6 text-[#007cca]/30" />
            </motion.div>

            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              {t("badge", "Comece grátis, sem cartão de crédito")}
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              {t("title.start", "Pronto para")}{" "}
              <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
                {t("title.highlight", "transformar suas finanças")}
              </span>
              ?
            </h2>

            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed mb-10 max-w-2xl mx-auto">
              {t(
                "description",
                "Junte-se a milhares de brasileiros que já estão economizando mais e construindo um futuro financeiro mais seguro com o tax-hub.",
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${currentLang}/signup`}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white px-8 py-6 text-lg font-semibold hover:opacity-90 transition-all group shadow-lg shadow-[#00cfec]/30"
                >
                  {t("buttons.createAccount", "Criar Conta Grátis")}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
