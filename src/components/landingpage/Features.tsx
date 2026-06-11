"use client";

import { motion } from "framer-motion";
import { 
  Brain, 
  Target, 
  Bell, 
  PieChart, 
  Lock, 
  Zap 
} from "lucide-react";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export const Features = () => {
  const { t } = useTranslation("features");

  const features = [
    {
      icon: Brain,
      title: t("features.financialAI.title"),
      description: t("features.financialAI.description"),
    },
    {
      icon: Target,
      title: t("features.personalGoals.title"),
      description: t("features.personalGoals.description"),
    },
    {
      icon: Bell,
      title: t("features.smartAlerts.title"),
      description: t("features.smartAlerts.description"),
    },
    {
      icon: PieChart,
      title: t("features.visualReports.title"),
      description: t("features.visualReports.description"),
    },
    {
      icon: Lock,
      title: t("features.totalSecurity.title"),
      description: t("features.totalSecurity.description"),
    },
    {
      icon: Zap,
      title: t("features.automation.title"),
      description: t("features.automation.description"),
    },
  ];

  return (
    <section id="features" className="py-20 md:py-24 relative overflow-hidden bg-background">
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
            {t("badge")}
          </motion.span>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            {t("title.part1")}{" "}
            <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
              {t("title.part2")}
            </span>
          </h2>

          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={`${feature.title}-${index}`}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00cfec]/80 to-[#007cca]/80 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="relative p-8 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 group-hover:border-[#00cfec]/20 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-[#00cfec] to-[#007cca] flex items-center justify-center mb-6 shadow-lg shadow-[#00cfec]/20 group-hover:shadow-[#00cfec]/40 transition-all">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white group-hover:text-[#007cca] dark:group-hover:text-[#00cfec] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};