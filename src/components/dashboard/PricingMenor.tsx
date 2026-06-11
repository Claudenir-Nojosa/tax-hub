"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  priceReal: string;
  yearlyPriceReal: string;
  period: string;
  features: string[] | any;
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function PricingMenor({ plans, title, description }: PricingProps) {
  const { t } = useTranslation("pricing");
  const [isMonthly, setIsMonthly] = useState(true);
  const [currency, setCurrency] = useState<"USD" | "BRL">("USD");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const titleText = title || t("title", "Simple, Transparent Pricing");
  const descriptionText =
    description ||
    t(
      "description",
      "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
    );

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#00cfec", "#007cca", "#0099d4", "#00b3e6"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  const getPrice = (plan: PricingPlan) => {
    if (currency === "USD") {
      return isMonthly ? Number(plan.price) : Number(plan.yearlyPrice);
    } else {
      return isMonthly ? Number(plan.priceReal) : Number(plan.yearlyPriceReal);
    }
  };

  const formatCurrency = (value: number) => {
    if (currency === "USD") {
      return `$${value}`;
    } else {
      return `R$ ${value}`;
    }
  };

  const fractionDigits = currency === "BRL" ? 2 : 0;

  // 🔥 FUNÇÃO CORRIGIDA: Gera URL de checkout com client_reference_id
  const getCheckoutUrl = (plan: PricingPlan) => {
    const planName = plan.name.toLowerCase();
    const isMonthlyPeriod = isMonthly;
    
    // 1. Se for plano free
    if (planName.includes("free") || planName.includes("free") || 
        planName.includes("grátis") || planName.includes("gratis")) {
      return process.env.NEXT_PUBLIC_STRIPE_BASIC_CHECKOUT_URL || "/dashboard";
    }
    
    let baseUrl = "";
    
    // 2. Mapear para a URL correta baseada no plano, moeda e periodicidade
    if (planName.includes("pro")) {
      if (currency === "BRL") {
        baseUrl = isMonthlyPeriod
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_BRL_MONTHLY_CHECKOUT_URL!
          : process.env.NEXT_PUBLIC_STRIPE_PRO_BRL_YEARLY_CHECKOUT_URL!;
      } else {
        baseUrl = isMonthlyPeriod
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_USD_MONTHLY_CHECKOUT_URL!
          : process.env.NEXT_PUBLIC_STRIPE_PRO_USD_YEARLY_CHECKOUT_URL!;
      }
    } 
    else if (planName.includes("family") || planName.includes("familia") || planName.includes("família")) {
      if (currency === "BRL") {
        baseUrl = isMonthlyPeriod
          ? process.env.NEXT_PUBLIC_STRIPE_FAMILY_BRL_MONTHLY_CHECKOUT_URL!
          : process.env.NEXT_PUBLIC_STRIPE_FAMILY_BRL_YEARLY_CHECKOUT_URL!;
      } else {
        baseUrl = isMonthlyPeriod
          ? process.env.NEXT_PUBLIC_STRIPE_FAMILY_USD_MONTHLY_CHECKOUT_URL!
          : process.env.NEXT_PUBLIC_STRIPE_FAMILY_USD_YEARLY_CHECKOUT_URL!;
      }
    }
    
    // 3. Se não encontrou URL, usar href original
    if (!baseUrl) return plan.href;
    
    // 4. 🔥 AQUI VINCULAMOS O USUÁRIO: adicionar client_reference_id
    if (session?.user?.id) {
      try {
        const url = new URL(baseUrl);
        
        // 🔥 PARÂMETRO MAIS IMPORTANTE: Stripe vai devolver isso no webhook
        url.searchParams.append('client_reference_id', session.user.id);
        
        // 🔥 Pré-preenche email (opcional, mas bom para UX)
        if (session.user.email) {
          url.searchParams.append('prefilled_email', session.user.email);
        }
        
        return url.toString();
      } catch (error) {
        console.error('Error creating URL:', error);
        // Fallback: URL sem parâmetros
        return baseUrl;
      }
    }
    
    // 5. Se não estiver logado, redireciona para login
    return `/auth/login?callbackUrl=${encodeURIComponent('/pricing')}`;
  };

  // 🔥 Handler simplificado para clique no botão
  const handlePlanClick = (plan: PricingPlan, e: React.MouseEvent) => {
    e.preventDefault();
    const planName = plan.name.toLowerCase();
    
    // Se for plano free, redirecionar normalmente
    if (planName.includes("free") || planName.includes("free") || 
        planName.includes("grátis") || planName.includes("gratis")) {
      router.push(plan.href || "/dashboard");
      return;
    }
    
    // Para planos pagos
    setIsLoading(plan.name);
    
    try {
      const checkoutUrl = getCheckoutUrl(plan);
      
      console.log('Checkout URL gerada:', checkoutUrl); // Para debug
      
      if (checkoutUrl.startsWith('http')) {
        // Abrir checkout em nova aba
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      } else if (checkoutUrl.startsWith('/auth/login')) {
        // Redirecionar para login
        router.push(checkoutUrl);
      } else {
        // Redirecionar localmente
        router.push(checkoutUrl);
      }
    } catch (error) {
      console.error('Error handling plan click:', error);
    } finally {
      setTimeout(() => setIsLoading(null), 1000);
    }
  };

  // Função para verificar se a feature precisa do gradiente especial
  const hasGradientFeature = (feature: string) => {
    const gradientFeatures = [
      "WhatsApp AI ilimitado",
      "WhatsApp AI unlimited",
      "Acesso Ilimitado a BiCla",
      "Unlimited Access to BiCla",
      "Suporte 24/7 com BiCla",
      "24/7 Support with BiCla",
    ];
    return gradientFeatures.some((gf) =>
      feature.toLowerCase().includes(
        gf
          .toLowerCase()
          .replace(/\(.*?\)/g, "")
          .trim(),
      ),
    );
  };

  return (
    <div className="w-full flex justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96">
          <div className="absolute top-0 left-1 w-96 h-96 bg-[#00cfec]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1 w-96 h-96 bg-[#007cca]/10 rounded-full blur-3xl" />
        </div>
      </div>

      <div className="container max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 mb-12"
        ></motion.div>

        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="flex items-center gap-4 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setCurrency("USD")}
              className={cn(
                "px-6 py-2 rounded-md font-semibold transition-all duration-200 text-sm",
                currency === "USD"
                  ? "bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              )}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency("BRL")}
              className={cn(
                "px-6 py-2 rounded-md font-semibold transition-all duration-200 text-sm",
                currency === "BRL"
                  ? "bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              )}
            >
              BRL (R$)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-medium text-sm",
                isMonthly && "text-gray-900 dark:text-white",
                !isMonthly && "text-gray-600 dark:text-gray-400",
              )}
            >
              {t("monthly", "Mensal")}
            </span>
            <Label>
              <Switch
                ref={switchRef as any}
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </Label>
            <span
              className={cn(
                "font-medium text-sm",
                !isMonthly && "text-gray-900 dark:text-white",
                isMonthly && "text-gray-600 dark:text-gray-400",
              )}
            >
              {t("yearly", "Anual")}
            </span>
            <span className="text-[#007cca] dark:text-[#00cfec] font-semibold text-sm">
              ({t("savePercentage", "Economize 17%")})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const planName = plan.name.toLowerCase();
            const isFreePlan =
              planName.includes("free") ||
              planName.includes("grátis") ||
              planName.includes("gratis");

            return (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 1 }}
                whileInView={
                  isDesktop
                    ? {
                        y: plan.isPopular ? -20 : 0,
                        opacity: 1,
                        x: index === 2 ? -30 : index === 0 ? 30 : 0,
                        scale: index === 0 || index === 2 ? 0.94 : 1.0,
                      }
                    : {}
                }
                viewport={{ once: true }}
                transition={{
                  duration: 1.6,
                  type: "spring",
                  stiffness: 100,
                  damping: 30,
                  delay: 0.4,
                  opacity: { duration: 0.5 },
                }}
                className={cn(
                  `rounded-2xl border-[1px] p-6 bg-white dark:bg-gray-900 text-center lg:flex lg:flex-col lg:justify-center relative`,
                  plan.isPopular
                    ? "border-[#00cfec] border-2 ring-2 ring-[#00cfec]/20"
                    : "border-gray-200 dark:border-gray-800",
                  "flex flex-col",
                  !plan.isPopular && "mt-5",
                  index === 0 || index === 2
                    ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                    : "z-10",
                  index === 0 && "origin-right",
                  index === 2 && "origin-left",
                )}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00cfec] to-[#007cca] py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                    <Star className="text-white h-4 w-4 fill-current" />
                    <span className="text-white ml-1 font-sans font-semibold text-xs">
                      {t("popularBadge", "Popular")}
                    </span>
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {plan.name}
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-x-2">
                    <span className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                      <NumberFlow
                        value={getPrice(plan)}
                        format={{
                          style: "currency",
                          currency: currency,
                          minimumFractionDigits: fractionDigits,
                          maximumFractionDigits: fractionDigits,
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                        transformTiming={{
                          duration: 500,
                          easing: "ease-out",
                        }}
                        willChange
                        className="font-variant-numeric: tabular-nums"
                      />
                    </span>
                    {plan.period !== "Next 3 months" && (
                      <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600 dark:text-gray-400">
                        / {plan.period}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                    {isMonthly
                      ? t("chargedMonthly", "cobrado mensalmente")
                      : t("chargedYearly", "cobrado anualmente")}
                  </p>

                  <ul className="mt-5 gap-2 flex flex-col">
                    {plan.features.map((feature: any, idx: any) => {
                      const hasGradient = hasGradientFeature(feature);
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#007cca] dark:text-[#00cfec] mt-1 flex-shrink-0" />
                          <span
                            className={cn(
                              "text-left text-sm",
                              hasGradient
                                ? "bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent font-semibold"
                                : "text-gray-900 dark:text-white",
                            )}
                          >
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <hr className="w-full my-4 border-gray-200 dark:border-gray-800" />

                  <button
                    onClick={(e) => handlePlanClick(plan, e)}
                    disabled={isLoading === plan.name}
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                      }),
                      "group relative w-full gap-2 overflow-hidden text-base font-semibold tracking-tight",
                      "transform-gpu ring-offset-current transition-all duration-300 ease-out",
                      plan.isPopular
                        ? "bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:opacity-90 border-0"
                        : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 hover:border-[#00cfec] hover:text-[#007cca] dark:hover:text-[#00cfec]",
                      isLoading === plan.name &&
                        "opacity-70 cursor-not-allowed",
                    )}
                  >
                    {isLoading === plan.name ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processando...
                      </span>
                    ) : (
                      plan.buttonText
                    )}
                  </button>
                  <p className="mt-6 text-xs leading-5 text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}