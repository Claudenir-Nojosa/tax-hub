"use client";

import { motion } from "framer-motion";
import { CircleUserRound, Download, HandCoins, Link, ListPlus, Sparkles, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const HowItWorks = () => {
  const { t } = useTranslation("howItWorks");

  const steps = [
    {
      icon: CircleUserRound,
      title: t("steps.createAccount.title", "Crie sua conta"),
      description: t("steps.createAccount.description", "Cadastre-se em segundos com seu email ou google."),
    },
    {
      icon: ListPlus,
      title: t("steps.connectAccounts.title", "Crie categorias"),
      description: t("steps.connectAccounts.description", "Informe se é receita ou despesa, customize a cor e ícone."),
    },
    {
      icon: HandCoins,
      title: t("steps.receiveInsights.title", "Faça os lançamentos"),
      description: t("steps.receiveInsights.description", "Realize os lançamentos das receitas ou despesas, seja por áudio, mensagem, ou manual na plataforma."),
    },
    {
      icon: TrendingUp,
      title: t("steps.reachGoals.title", "Alcance suas metas"),
      description: t("steps.reachGoals.description", "Acompanhe sua movimentação e nunca mais perca o seu controle financeiro."),
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 relative overflow-hidden bg-background"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#007cca]/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.span
            className="inline-block px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20"
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {t("badge", "Como Funciona")}
          </motion.span>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            {t("title.simple", "Simples como")}{" "}
            <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
              {t("title.highlight", "1, 2, 3, 4")}
            </span>
          </h2>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {t("description", "Comece a transformar suas finanças em poucos minutos com nosso processo simplificado.")}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00cfec]/20 to-transparent hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative inline-flex mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-[#00cfec] to-[#007cca] flex items-center justify-center shadow-lg shadow-[#00cfec]/30">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-[#00cfec] flex items-center justify-center text-sm font-bold text-[#007cca] dark:text-[#00cfec]">
                    {index + 1}
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};