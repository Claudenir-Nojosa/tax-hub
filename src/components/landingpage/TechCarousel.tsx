"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Image from "next/image";

const technologies = [
  {
    name: "Claude AI",
    iconLight: "/icons/Claude_Logo_0.svg",
    iconDark: "/icons/Claude_Logo_1.svg",
    color: "from-orange-400/80 to-amber-500/80",
  },
  {
    name: "Meta API",
    iconLight: "/icons/meta.svg",
    iconDark: "/icons/meta.svg",
    color: "from-blue-500/80 to-blue-400/80",
  },
  {
    name: "Next.js",
    iconLight: "/icons/Next.js_Logo_0.svg",
    iconDark: "/icons/next-white.png",
    color:
      "from-gray-800/80 to-gray-600/80 dark:from-gray-300/80 dark:to-gray-400/80",
  },
  {
    name: "Prisma",
    iconLight: "/icons/Prisma-IndigoLogo.png",
    iconDark: "/icons/Prisma_Prisma-LightLogo_0.svg",
    color: "from-indigo-500/80 to-purple-500/80",
  },
  {
    name: "OpenAI",
    iconLight: "/icons/OpenAI_Logo_1.svg",
    iconDark: "/icons/OpenAI_Logo_0.svg",
    color: "from-emerald-400/80 to-teal-400/80",
  },
  {
    name: "Auth.js",
    iconLight: "/icons/authjs.png",
    iconDark: "/icons/authjs.png",
    color: "from-violet-500/80 to-purple-500/80",
    isPNG: true,
  },
  {
    name: "Supabase",
    iconLight: "/icons/supabase-logo-wordmark--light.svg",
    iconDark: "/icons/supabase-logo-wordmark--dark.svg",
    color: "from-green-400/80 to-emerald-400/80",
  },
  {
    name: "Stripe",
    iconLight: "/icons/stripe-4.svg",
    iconDark: "/icons/stripe-4.svg",
    color: "from-blue-500/80 to-indigo-500/80",
  },
];

interface TechCardProps {
  tech: (typeof technologies)[0];
  index: number;
}

const TechCard = ({ tech, index }: TechCardProps) => (
  <motion.div
    className="flex-shrink-0 mx-4"
    whileHover={{ scale: 1.05, y: -3 }}
    transition={{
      type: "spring",
      stiffness: 300,
      damping: 15,
      duration: 0.3,
    }}
  >
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${tech.color} opacity-0 group-hover:opacity-15 rounded-xl blur-lg transition-opacity duration-500`}
      />

      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl px-6 py-5 flex flex-col items-center gap-3 border border-gray-200/60 dark:border-gray-800/60 hover:border-gray-300/80 dark:hover:border-gray-700/80 transition-all duration-300 group-hover:shadow-md group-hover:shadow-gray-400/20 dark:group-hover:shadow-gray-900/30 min-w-[120px]">
        <motion.div
          className="relative"
          animate={{
            rotate: [0, 1, -0.5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: index * 0.4,
            ease: "easeInOut",
          }}
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
            {/* Light mode image */}
            <Image
              src={tech.iconLight}
              alt={`Logo ${tech.name}`}
              width={48} // Tamanho fixo
              height={48} // Tamanho fixo
              className="object-contain dark:hidden"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallbackSpan = document.createElement("span");
                fallbackSpan.className = "text-2xl";
                fallbackSpan.textContent = getFallbackEmoji(tech.name);
                target.parentElement!.appendChild(fallbackSpan);
              }}
            />

            {/* Dark mode image */}
            <Image
              src={tech.iconDark}
              alt={`Logo ${tech.name}`}
                        width={48} // Tamanho fixo
              height={48} // Tamanho fixo
              className="object-contain hidden dark:block"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallbackSpan = document.createElement("span");
                fallbackSpan.className = "text-2xl";
                fallbackSpan.textContent = getFallbackEmoji(tech.name);
                target.parentElement!.appendChild(fallbackSpan);
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  </motion.div>
);

const getFallbackEmoji = (techName: string) => {
  const emojiMap: Record<string, string> = {
    "Claude AI": "🤖",
    "Meta API": "📱",
    "Next.js": "▲",
    Prisma: "◇",
    OpenAI: "🧠",
    "Auth.js": "🔐",
    Supabase: "⚡",
    Stripe: "💳",
  };
  return emojiMap[techName] || "⚙️";
};

export const TechCarousel = () => {
  const { t } = useTranslation("tech");

  return (
    <section className="overflow-hidden relative bg-background">
      <div className="container mx-auto px-4 mb-10 md:mb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
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

          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>
      </div>

      {/* Single Line Carousel */}
      <div className="relative z-10">
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-r from-gray-100/30 via-gray-100/20 to-transparent dark:from-gray-950/30 dark:via-gray-950/20 dark:to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-l from-gray-100/30 via-gray-100/20 to-transparent dark:from-gray-950/30 dark:via-gray-950/20 dark:to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex"
          animate={{ x: [0, -1920] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 90,
              ease: "linear",
            },
          }}
        >
          {[
            ...technologies,
            ...technologies,
            ...technologies,
            ...technologies,
          ].map((tech, index) => (
            <TechCard
              key={`carousel-${tech.name}-${index}`}
              tech={tech}
              index={index % technologies.length}
            />
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="text-center mt-10 md:mt-12"
      >
        <p className="text-xs text-gray-500 dark:text-gray-500 max-w-md mx-auto leading-relaxed">
          {t("footer")}
        </p>
      </motion.div>
    </section>
  );
};