"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Shield, MessageCircle, Verified } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

export const MetaVerified = () => {
  const { t } = useTranslation("metaVerified");

  const features = [
    { icon: Shield, text: t("features.encrypted", "Dados Criptografados") },
    { icon: CheckCircle2, text: t("features.officialApi", "API Oficial") },
    {
      text: t("features.whatsappBusiness", "WhatsApp Business"),
      iconComponent: (
        <div className="w-6 h-6 relative">
          <Image
            src="/icons/hats.png"
            alt={t("features.whatsappBusiness", "WhatsApp Business")}
            width={20}
            height={20}
            className="w-full h-full"
          />
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 relative overflow-hidden">
      {/* Animated Background Pattern */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating Verification Badges */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + i * 20}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <Verified className="w-8 h-8 text-white" />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
          {/* Meta Logo & Verification */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <motion.div
              className="w-40 h-40 rounded-full bg-white backdrop-blur-xl flex items-center justify-center border-4 border-white/30 shadow-xl"
              animate={{
                boxShadow: [
                  "0 0 30px rgba(255,255,255,0.5)",
                  "0 0 60px rgba(255,255,255,0.7)",
                  "0 0 30px rgba(255,255,255,0.5)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {/* Container para logo com padding */}
              <div className="w-28 h-28 p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Image
                  src="/icons/meta.svg"
                  alt="Meta"
                  width={80}
                  height={80}
                  className="text-white filter brightness-0 invert"
                />
              </div>
            </motion.div>

            {/* Verified Badge */}
            <motion.div
              className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle2 className="w-10 h-10 text-blue-500" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center lg:text-left max-w-xl"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-6"
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="w-4 h-4" />
              <span>{t("badge", "Parceiro Oficial")}</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("title.meta", "Meta")}{" "}
              <span className="relative inline-block">
                {t("title.verified", "Verified")}
                <motion.span
                  className="absolute -top-1 -right-8"
                  animate={{ rotate: [0, 15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Verified className="w-8 h-8 text-cyan-300" />
                </motion.span>
              </span>
            </h2>

            <p className="text-white/90 text-lg mb-8">
              {t(
                "description",
                "O tax-hub é um parceiro oficial da Meta, garantindo a máxima segurança e confiabilidade na integração com o WhatsApp. Seus dados financeiros estão protegidos pelos mais altos padrões de segurança.",
              )}
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {features.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white"
                >
                  {item.iconComponent || <item.icon className="w-4 h-4" />}
                  <span className="text-sm font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
