import { motion } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  PiggyBank,
  CreditCard,
  BarChart3,
  Shield,
  Sparkles,
  ChevronRight,
  CircleDollarSign,
  BanknoteIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getFallback } from "@/lib/i18nFallback";

const floatingIcons = [
  {
    Icon: TrendingUp,
    className: "top-20 left-[10%] float-animation",
    delay: 0,
    glow: true,
  },
  {
    Icon: PiggyBank,
    className: "top-32 right-[15%] float-animation-delayed",
    delay: 0.2,
    glow: true,
  },
  {
    Icon: CreditCard,
    className: "bottom-40 left-[20%] float-animation-slow",
    delay: 0.4,
    glow: true,
  },
  {
    Icon: BarChart3,
    className: "bottom-32 right-[10%] float-animation",
    delay: 0.6,
    glow: true,
  },
  {
    Icon: BanknoteIcon,
    className: "top-48 left-[5%] float-animation-delayed",
    delay: 0.3,
    glow: true,
  },
  {
    Icon: CircleDollarSign,
    className: "top-24 right-[5%] float-animation-slow",
    delay: 0.5,
    glow: true,
  },
];

// Array de moedas animadas
const animatedCoins = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: Math.random() * 20 + 10,
  left: Math.random() * 100,
  delay: Math.random() * 5,
  duration: Math.random() * 10 + 10,
}));

export const Hero = () => {
  const { t } = useTranslation("hero");
  const params = useParams();
  const currentLang = (params?.lang as string) || "pt";

  // Função para obter tradução com fallback
  const getTranslation = (key: string) => {
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    switch (key) {
      case "offer":
        return getFallback(
          currentLang,
          "2 meses gratuitos no plano anual",
          "2 Months Free — Annually",
        );
      case "title.line1":
        return getFallback(
          currentLang,
          "Controle suas finanças pelo",
          "Control your finances through",
        );
      case "title.whatsapp":
        return getFallback(currentLang, "WhatsApp", "WhatsApp");
      case "title.line2":
        return getFallback(
          currentLang,
          "com IA inteligente",
          "with intelligent AI",
        );
      case "subtitle":
        return getFallback(
          currentLang,
          "O tax-hub é seu assistente financeiro que transforma mensagens do WhatsApp em controle financeiro completo. Lançamentos automáticos, limites por categoria, metas compartilhadas e análises de IA para você economizar de verdade.",
          "tax-hub is your financial assistant that transforms WhatsApp messages into complete financial control. Automatic entries, category limits, shared goals, and AI analysis so you can really save money.",
        );
      case "buttons.startFree":
        return getFallback(
          currentLang,
          "Começar Gratuitamente",
          "Start for Free",
        );
      case "buttons.howItWorks":
        return getFallback(
          currentLang,
          "Ver como Funciona",
          "See How It Works",
        );
      case "trust.dataProtected":
        return getFallback(currentLang, "Dados Protegidos", "Data Protected");
      case "trust.aiAdvanced":
        return getFallback(currentLang, "IA Avançada", "Advanced AI");
      case "trust.averageSavings":
        return getFallback(
          currentLang,
          "+30% Economia Média",
          "+30% Average Savings",
        );
      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    offer: getTranslation("offer"),
    title: {
      line1: getTranslation("title.line1"),
      whatsapp: getTranslation("title.whatsapp"),
      line2: getTranslation("title.line2"),
    },
    subtitle: getTranslation("subtitle"),
    buttons: {
      startFree: getTranslation("buttons.startFree"),
      howItWorks: getTranslation("buttons.howItWorks"),
    },
    trust: {
      dataProtected: getTranslation("trust.dataProtected"),
      aiAdvanced: getTranslation("trust.aiAdvanced"),
      averageSavings: getTranslation("trust.averageSavings"),
    },
  };

  const [isHoveringOffer, setIsHoveringOffer] = useState(false);
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);
  const [isHoveringSecondary, setIsHoveringSecondary] = useState(false);
  const coinFallDistance =
    typeof window !== "undefined" ? window.innerHeight + 100 : 1200;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden bg-background">
        {/* Gradientes de fundo mais sutis */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 dark:bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/5 dark:to-accent/5 rounded-full blur-3xl" />

        {/* Moedas animadas com melhor visibilidade */}
        {animatedCoins.map((coin) => (
          <motion.div
            key={coin.id}
            className="absolute"
            style={{
              left: `${coin.left}%`,
              top: "-5%",
              width: coin.size,
              height: coin.size,
            }}
            animate={{
              y: [0, coinFallDistance],
              rotate: 360,
            }}
            transition={{
              duration: coin.duration,
              delay: coin.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <CircleDollarSign className="w-full h-full text-accent/30 dark:text-accent/25" />
          </motion.div>
        ))}
      </div>

      {/* Floating Icons com piscar mais devagar */}
      {floatingIcons.map(({ Icon, className, delay, glow }, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: [0, 3, -3, 0],
          }}
          transition={{
            delay: 0.3 + delay,
            duration: 0.8,
            rotate: {
              delay: 1 + delay,
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse",
            },
          }}
          className={`absolute hidden lg:block ${className}`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${glow ? "glow-effect" : ""} 
            bg-gradient-to-br from-white/80 to-blue-50/80 dark:from-secondary/80 dark:to-primary/80 
            border border-sky-100/50 dark:border-accent/25 shadow-lg shadow-sky-100/30 dark:shadow-sky-500/10`}
          >
            <div className="relative w-12 h-12 rounded-xl bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow-sm shadow-sky-100/20 dark:shadow-gray-800/30">
              <Icon className="w-6 h-6 text-sky-500/90 dark:text-accent/80" />
              {glow && (
                <div className="absolute inset-0 rounded-xl border border-sky-200/30 dark:border-accent/20 animate-pulse-slow" />
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 text-center pt-16 md:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge com oferta especial - com seta azul no hover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-50/80 to-blue-50/80 dark:from-primary/10 dark:to-secondary/10 border border-sky-200/60 dark:border-accent/25 mb-6 md:mb-8 group cursor-pointer hover:shadow-sm hover:shadow-blue-500/10 dark:hover:shadow-accent/10 transition-all duration-300"
            onMouseEnter={() => setIsHoveringOffer(true)}
            onMouseLeave={() => setIsHoveringOffer(false)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-sky-700 dark:text-sky-200">
              {translations.offer}
            </span>
            <motion.div
              animate={{ x: isHoveringOffer ? 3 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-colors duration-200 ${isHoveringOffer ? "text-[#007cca] dark:text-[#00cfec]" : "text-sky-600/80 dark:text-accent/70"}`}
              />
            </motion.div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-3xl md:text-5xl lg:text-5xl font-bold leading-tight mb-6 md:mb-8"
          >
            <span className="block text-gray-900 dark:text-white">
              {translations.title.line1}
            </span>
            <span className="relative inline-block mt-3 md:mt-4">
              <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
                {translations.title.whatsapp}
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-[#00cfec]/60 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
            <span className="block text-2xl md:text-4xl lg:text-5xl font-semibold mt-6 md:mt-8 text-gray-900 dark:text-white">
              {translations.title.line2}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-base md:text-lg text-gray-800/90 dark:text-gray-300/90 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-2"
          >
            {translations.subtitle}
          </motion.p>

          {/* CTA Buttons - Ajustes finos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8 md:mb-0"
          >
            {/* Botão Start Free com Link */}
            <Link href={`/${currentLang}/signup`}>
              <Button
                size="lg"
                className="px-6 md:px-8 py-5 text-lg font-medium bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:shadow-md hover:shadow-[#00cfec]/25 dark:hover:shadow-[#00cfec]/15 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] rounded-xl border border-[#00cfec]/40 w-full sm:w-auto"
                onMouseEnter={() => setIsHoveringCTA(true)}
                onMouseLeave={() => setIsHoveringCTA(false)}
              >
                <span className="relative z-10">
                  {translations.buttons.startFree}
                </span>
                <motion.div
                  animate={{ x: isHoveringCTA ? 3 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 ml-2"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              className="px-6 md:px-8 py-5 text-lg font-medium border border-gray-300/80 dark:border-gray-700/80 hover:border-[#007cca]/40 dark:hover:border-[#00cfec]/40 text-gray-800 dark:text-gray-200 hover:text-[#007cca] dark:hover:text-[#00cfec] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] rounded-xl bg-white/70 dark:bg-gray-900/30 backdrop-blur-sm w-full sm:w-auto"
              onMouseEnter={() => setIsHoveringSecondary(true)}
              onMouseLeave={() => setIsHoveringSecondary(false)}
              onClick={() => {
                // Scroll suave para a seção HowItWorks
                const howItWorksSection =
                  document.getElementById("how-it-works");
                if (howItWorksSection) {
                  howItWorksSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <motion.div
                animate={{ y: isHoveringSecondary ? [0, 1.5, 0] : 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                }}
                className="mr-2"
              >
                <ChevronRight className="w-4 h-4 rotate-90 text-gray-600 dark:text-gray-400 group-hover:text-[#007cca] dark:group-hover:text-[#00cfec] transition-colors duration-200" />
              </motion.div>
              {translations.buttons.howItWorks}
            </Button>
          </motion.div>

          {/* Trust Indicators - Ajustes finos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-12 md:mt-20 flex flex-wrap justify-center items-center gap-4 md:gap-5"
          >
            <motion.span
              className="justify-center gap-3 text-center px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-2 md:mb-3 border border-[#00cfec]/20 flex align-middle items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full flex bg-gradient-to-br from-[#00cfec] to-[#007cca] items-center justify-center shadow-sm">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              {translations.trust.dataProtected}
            </motion.span>

            <motion.span
              className="justify-center gap-3 text-center px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-2 md:mb-3 border border-[#00cfec]/20 flex align-middle items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00cfec] to-[#007cca] flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              {translations.trust.aiAdvanced}
            </motion.span>

            <motion.span
              className="justify-center gap-3 text-center px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-2 md:mb-3 border border-[#00cfec]/20 flex align-middle items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#09acc1] to-[#007cca] flex items-center justify-center shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              {translations.trust.averageSavings}
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      {/* CSS para animações */}
      <style jsx global>{`
        .glow-effect {
          box-shadow:
            0 0 20px rgba(56, 189, 248, 0.15),
            0 0 40px rgba(56, 189, 248, 0.08),
            0 0 60px rgba(56, 189, 248, 0.04);
        }

        .float-animation {
          animation: float 8s ease-in-out infinite;
        }

        .float-animation-delayed {
          animation: float 9s ease-in-out infinite 0.5s;
        }

        .float-animation-slow {
          animation: float 10s ease-in-out infinite 1s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(2deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.7;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};
