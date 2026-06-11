"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  FileCheck,
  Server,
  Key,
  ShieldCheck,
  Fingerprint,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const Security = () => {
  const { t } = useTranslation("security");

  const securityFeatures = [
    {
      icon: Lock,
      title: t("features.encryption.title", "Criptografia de ponta"),
      description: t(
        "features.encryption.description",
        "Todos os dados são protegidos com criptografia AES-256, o mesmo padrão usado por bancos e instituições governamentais.",
      ),
    },
    {
      icon: Eye,
      title: t("features.control.title", "Você controla tudo"),
      description: t(
        "features.control.description",
        "Seus dados são exclusivamente seus. Você decide o que compartilhar e pode deletar tudo a qualquer momento.",
      ),
    },
    {
      icon: FileCheck,
      title: t("features.compliance.title", "Conformidade total"),
      description: t(
        "features.compliance.description",
        "Seguimos rigorosamente a LGPD e normas do Banco Central. Auditados constantemente por terceiros independentes.",
      ),
    },
    {
      icon: Server,
      title: t("features.infrastructure.title", "Infraestrutura segura"),
      description: t(
        "features.infrastructure.description",
        "Servidores em cloud tier 1 com redundância geográfica, backups automáticos e monitoramento 24/7.",
      ),
    },
  ];

  const certifications = [
    { icon: ShieldCheck, label: "PCI DSS" },
    { icon: Lock, label: "ISO 27001" },
    { icon: Fingerprint, label: "LGPD" },
    { icon: Key, label: "SOC 2" },
  ];

  const protectionItems = [
    t("protection.monitoring", "Monitoramento de atividades suspeitas"),
    t("protection.noPasswords", "Nunca armazenamos senhas bancárias"),
  ];

  return (
    <section
      className="py-24 relative overflow-hidden bg-background"
      id="security"
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mb-6 border border-[#00cfec]/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Shield className="w-10 h-10 text-[#007cca] dark:text-[#00cfec]" />
            </motion.div>

            <motion.span
              className="inline-block px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {t("badge", "Segurança e Privacidade")}
            </motion.span>

            <h2 className="text-2xl md:text-3xl font-bold mb-3 leading-tight text-gray-900 dark:text-white tracking-tight">
              {t("title.yourData", "Seus dados estão")}{" "}
              <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
                {t("title.highlight", "100% protegidos")}
              </span>
            </h2>

            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {t(
                "description",
                "Segurança de nível bancário para você gerenciar suas finanças com total tranquilidade. Sua privacidade é nossa prioridade.",
              )}
            </p>
          </motion.div>
        </div>

        <motion.div
          className="max-w-6xl mx-auto mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-200/60 dark:border-gray-800/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#00cfec]/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="relative w-full aspect-square max-w-md mx-auto">
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="w-48 h-48 rounded-full bg-gradient-to-r from-[#00cfec] to-[#007cca] flex items-center justify-center shadow-2xl shadow-[#00cfec]/40">
                        <Shield className="w-24 h-24 text-white" />
                      </div>
                    </motion.div>

                    {[Lock, Key, Eye, FileCheck].map((Icon, index) => {
                      const angle = (index * 360) / 4;
                      return (
                        <motion.div
                          key={index}
                          className="absolute top-1/2 left-1/2"
                          style={{
                            transformOrigin: "0 0",
                          }}
                          animate={{
                            rotate: [angle, angle + 360],
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <motion.div
                            className="w-16 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-gray-200/60 dark:border-gray-800/60 shadow-lg"
                            style={{
                              transform: `translate(-50%, -50%) translateX(140px)`,
                            }}
                            animate={{
                              rotate: [0, -360],
                            }}
                            transition={{
                              duration: 20,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            whileHover={{ scale: 1.2 }}
                          >
                            <Icon className="w-7 h-7 text-[#007cca] dark:text-[#00cfec]" />
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {t(
                      "layeredProtection.title",
                      "Proteção em todas as camadas",
                    )}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                    {t(
                      "layeredProtection.description",
                      "Implementamos múltiplas camadas de segurança para garantir que suas informações financeiras estejam sempre protegidas. Do momento em que você faz login até cada transação processada, tudo é criptografado e monitorado.",
                    )}
                  </p>
                  <div className="space-y-3">
                    {protectionItems.map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00cfec] to-[#007cca] flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium text-sm">
                          {item}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-16">
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/60 dark:border-gray-800/60 hover:border-[#00cfec]/30 transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className="flex items-start gap-4">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 flex items-center justify-center flex-shrink-0 border border-[#00cfec]/20"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <feature.icon className="w-7 h-7 text-[#007cca] dark:text-[#00cfec]" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
              {t("certifications.title", "Certificações e Conformidades")}
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.1, y: -5 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center border border-gray-200/60 dark:border-gray-800/60">
                  <cert.icon className="w-8 h-8 text-[#007cca] dark:text-[#00cfec]" />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {cert.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Security;
