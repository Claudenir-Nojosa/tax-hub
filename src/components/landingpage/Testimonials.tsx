"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

// --- Types ---
interface Testimonial {
  text: string;
  name: string;
  role: string;
}

// --- Sub-Components ---
const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        className="flex flex-col gap-4"
        animate={{
          y: [0, "-50%"],
        }}
        transition={{
          duration: props.duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, name, role }, i) => (
                <motion.div
                  key={`${index}-${i}`}
                  className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.1 + index * 0.3,
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow:
                      "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.2 },
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {text}
                    </p>
                    <motion.div
                      className="flex items-center"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <motion.p
                          className="font-semibold text-sm text-gray-900 dark:text-white"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          {name}
                        </motion.p>

                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

const TestimonialsSection = () => {
  const { t } = useTranslation("testimonials");

  const testimonials: Testimonial[] = [
    {
      text: t(
        "items.0.text",
        "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
      ),
      name: t("items.0.name", "Briana Patton"),
      role: t("items.0.role", "Operations Manager"),
    },
    {
      text: t(
        "items.1.text",
        "Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.",
      ),

      name: t("items.1.name", "Bilal Ahmed"),
      role: t("items.1.role", "IT Manager"),
    },
    {
      text: t(
        "items.2.text",
        "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.",
      ),

      name: t("items.2.name", "Saman Malik"),
      role: t("items.2.role", "Customer Support Lead"),
    },
    {
      text: t(
        "items.3.text",
        "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
      ),

      name: t("items.3.name", "Omar Raza"),
      role: t("items.3.role", "CEO"),
    },
    {
      text: t(
        "items.4.text",
        "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
      ),

      name: t("items.4.name", "Zainab Hussain"),
      role: t("items.4.role", "Project Manager"),
    },
    {
      text: t(
        "items.5.text",
        "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
      ),

      name: t("items.5.name", "Aliza Khan"),
      role: t("items.5.role", "Business Analyst"),
    },
    {
      text: t(
        "items.6.text",
        "Our business functions improved with a user-friendly design and positive customer feedback.",
      ),

      name: t("items.6.name", "Farhan Siddiqui"),
      role: t("items.6.role", "Marketing Director"),
    },
    {
      text: t(
        "items.7.text",
        "They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.",
      ),

      name: t("items.7.name", "Sana Sheikh"),
      role: t("items.7.role", "Sales Manager"),
    },
    {
      text: t(
        "items.8.text",
        "Using this ERP, our online presence and conversions significantly improved, boosting business performance.",
      ),

      name: t("items.8.name", "Hassan Ali"),
      role: t("items.8.role", "E-commerce Manager"),
    },
  ];

  const firstColumn = testimonials.slice(0, 3);
  const secondColumn = testimonials.slice(3, 6);
  const thirdColumn = testimonials.slice(6, 9);

  return (
    <section
      className="w-full relative overflow-hidden bg-background"
      id="testimonials"
    >
      {/* Background Effects */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#00cfec]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#007cca]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </motion.div>

      <div className="container mx-auto px-4 mb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto"
        >
          <motion.span
            className="inline-block px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20"
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 20px rgba(0, 124, 202, 0.2)",
            }}
          >
            {t("badge", "Depoimentos")}
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              {t("title.what", "O que nossos")}{" "}
              <motion.span
                className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent inline-block"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  backgroundSize: "200% 100%",
                }}
              >
                {t("title.highlight", "usuários dizem")}
              </motion.span>
            </h2>
          </motion.div>

          <motion.p
            className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {t(
              "description",
              "Descubra como milhares de pessoas estão transformando suas finanças com nossa plataforma.",
            )}
          </motion.p>
        </motion.div>
      </div>

      <motion.div
        className="relative h-[600px] overflow-hidden z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <div className="absolute inset-0 flex gap-4 px-4">
          <TestimonialsColumn
            testimonials={firstColumn}
            duration={30}
            className="flex-1"
          />
          <TestimonialsColumn
            testimonials={secondColumn}
            duration={35}
            className="flex-1 hidden md:block"
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            duration={40}
            className="flex-1 hidden lg:block"
          />
        </div>

        {/* Gradient overlays with animation */}
        <motion.div
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        />
      </motion.div>
    </section>
  );
};

export default function App() {
  return (
    <div className="bg-background transition-colors duration-300">
      <TestimonialsSection />
    </div>
  );
}
