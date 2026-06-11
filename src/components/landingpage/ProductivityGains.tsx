"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const AnimatedCounter = ({
  target,
  inView,
}: {
  target: number;
  inView: boolean;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (inView) {
      const duration = 1500;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [target, inView]);

  return <span>{count}</span>;
};

export const ProductivityGains = () => {
  const { t } = useTranslation("productivityGains");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const methods = [
    {
      name: t("methods.tax-hub.name", "tax-hub"),
      icon: Zap,
      productivity: 93,
      description: t(
        "methods.tax-hub.description",
        "Rápido, automático e inteligente",
      ),
      color: "from-[#00cfec] to-[#007cca]",
      bgColor: "bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10",
      featured: true,
    },
    {
      name: t("methods.spreadsheet.name", "Planilha Manual"),
      icon: FileSpreadsheet,
      productivity: 45,
      description: t(
        "methods.spreadsheet.description",
        "Requer tempo para abrir, lançar e salvar",
      ),
      color: "from-blue-400 to-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      name: t("methods.paper.name", "Controle no Papel"),
      icon: FileText,
      productivity: 23,
      description: t(
        "methods.paper.description",
        "Lento, sujeito a erros e difícil de analisar",
      ),
      color: "from-gray-400 to-gray-500",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#00cfec]/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20"
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t("badge", "Ganho de Produtividade")}</span>
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            {t("title.save", "Economize")}{" "}
            <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
              {t("title.highlight", "Tempo e Energia")}
            </span>
          </h2>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {t(
              "description",
              "Compare o tempo gasto com métodos tradicionais e veja como o tax-hub transforma sua rotina financeira",
            )}
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {methods.map((method, index) => (
            <motion.div
              key={method.name}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`relative rounded-3xl p-6 md:p-8 transition-all duration-500 ${
                method.featured
                  ? "ring-2 ring-[#00cfec] shadow-2xl shadow-[#00cfec]/20 scale-105 z-10"
                  : "border border-gray-200/60 dark:border-gray-800/60"
              } ${method.bgColor}`}
            >
              {method.featured && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white text-xs font-bold flex items-center gap-2 shadow-lg"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4" />
                  {t("recommended", "Recomendado")}
                </motion.div>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 md:w-1/4">
                  <motion.div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      method.featured
                        ? "bg-gradient-to-br from-[#00cfec] to-[#007cca] shadow-lg shadow-[#00cfec]/30"
                        : "bg-gray-200 dark:bg-gray-800"
                    }`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <method.icon
                      className={`w-7 h-7 ${method.featured ? "text-white" : "text-gray-600 dark:text-gray-400"}`}
                    />
                  </motion.div>
                  <div>
                    <h3
                      className={`font-bold text-lg ${method.featured ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {method.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                      {method.description}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-8 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${method.color} relative`}
                        initial={{ width: 0 }}
                        animate={
                          isInView
                            ? { width: `${method.productivity}%` }
                            : { width: 0 }
                        }
                        transition={{
                          duration: 1.2,
                          delay: 0.3 + index * 0.2,
                          ease: "easeOut",
                        }}
                      >
                        {method.featured && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={{
                              x: ["-100%", "200%"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 1,
                            }}
                          />
                        )}
                      </motion.div>
                    </div>

                    <div
                      className={`w-20 text-right ${method.featured ? "text-[#007cca] dark:text-[#00cfec]" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      <motion.span
                        className={`text-2xl md:text-3xl font-bold`}
                        initial={{ scale: 0.5 }}
                        animate={isInView ? { scale: 1 } : { scale: 0.5 }}
                        transition={{ delay: 1 + index * 0.2 }}
                      >
                        <AnimatedCounter
                          target={method.productivity}
                          inView={isInView}
                        />
                        %
                      </motion.span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 md:hidden">
                    {method.description}
                  </p>
                </div>
              </div>

              {method.featured && (
                <motion.div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(0, 207, 236, 0.1)",
                      "0 0 40px rgba(0, 207, 236, 0.2)",
                      "0 0 20px rgba(0, 207, 236, 0.1)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 border border-[#00cfec]/20">
            <Clock className="w-6 h-6 text-[#007cca] dark:text-[#00cfec]" />
            <p className="text-gray-900 dark:text-white text-sm md:text-base">
              <span className="font-bold text-[#007cca] dark:text-[#00cfec]">
                {t("footer.highlight", "Economize até 4 horas por semana")}
              </span>{" "}
              {t("footer.text", "automatizando seu controle financeiro")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
