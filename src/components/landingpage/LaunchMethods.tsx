"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MessageSquare, Edit3, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export const LaunchMethods = () => {
  const { t } = useTranslation("launchMethods");
  const [activeMethod, setActiveMethod] = useState<string | null>(null);

  const launchMethods = [
    {
      id: "audio",
      title: t("methods.audio.title"),
      icon: Mic,
      description: t("methods.audio.description"),
      features: t("methods.audio.features", { returnObjects: true }),
      image:
        "https://images.pexels.com/photos/5592279/pexels-photo-5592279.jpeg",
      gradient: "from-blue-600 to-cyan-700",
    },
    {
      id: "message",
      title: t("methods.message.title"),
      icon: MessageSquare,
      description: t("methods.message.description"),
      features: t("methods.message.features", { returnObjects: true }),
      image:
        "https://images.pexels.com/photos/5588373/pexels-photo-5588373.jpeg",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      id: "normal",
      title: t("methods.normal.title"),
      icon: Edit3,
      description: t("methods.normal.description"),
      features: t("methods.normal.features", { returnObjects: true }),
      image:
        "https://images.pexels.com/photos/5926395/pexels-photo-5926395.jpeg",
      gradient: "from-blue-400 to-cyan-500",
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#00cfec]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#007cca]/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {launchMethods.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              <motion.div
                className={`relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                  activeMethod === method.id
                    ? "ring-2 ring-[#00cfec] shadow-2xl shadow-[#00cfec]/20"
                    : "hover:shadow-xl"
                }`}
                onClick={() =>
                  setActiveMethod(activeMethod === method.id ? null : method.id)
                }
                whileHover={{ scale: activeMethod === method.id ? 1 : 1.02 }}
                layout
              >
                <div
                  className={`relative p-6 md:p-8 bg-gradient-to-br ${method.gradient} text-white`}
                >
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    animate={{
                      backgroundPosition: ["0% 0%", "100% 100%"],
                    }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.15"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    }}
                  />

                  <div className="relative z-10">
                    <motion.div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 md:mb-6"
                      whileHover={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <method.icon className="w-7 h-7 md:w-8 md:h-8" />
                    </motion.div>

                    <h3 className="text-lg md:text-xl font-bold mb-2">
                      {method.title}
                    </h3>

                    <motion.div
                      className="flex items-center gap-2 text-white/80"
                      animate={{
                        y: activeMethod === method.id ? 0 : [0, 2, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: activeMethod === method.id ? 0 : Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <span className="text-xs md:text-sm">
                        {t("clickToSeeMore")}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-300 ${
                          activeMethod === method.id ? "rotate-180" : ""
                        }`}
                      />
                    </motion.div>
                  </div>
                </div>

                <AnimatePresence>
                  {activeMethod === method.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden bg-white dark:bg-gray-900"
                    >
                      <div className="p-5 md:p-6">
                        <motion.p
                          className="text-gray-600 dark:text-gray-400 mb-5 md:mb-6 text-sm md:text-base leading-relaxed"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          {method.description}
                        </motion.p>

                        <motion.div
                          className="flex flex-wrap gap-2 mb-5 md:mb-6"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {Array.isArray(method.features) &&
                            method.features.map((feature, i) => (
                              <motion.span
                                key={`${method.id}-feature-${i}`}
                                className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium border border-[#00cfec]/20"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                              >
                                {feature}
                              </motion.span>
                            ))}
                        </motion.div>

                        <motion.div
                          className="rounded-2xl overflow-hidden"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <img
                            src={method.image}
                            alt={method.title}
                            className="w-full h-40 md:h-48 object-cover"
                            loading="lazy"
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
