// components/Index.tsx
"use client";

import { CTA } from "./CTA";
import { Features } from "./Features";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Navbar } from "./NavBar";
import { Suspense, useMemo } from "react";
import Testimonials from "./Testimonials";
import { TechCarousel } from "./TechCarousel";
import { LaunchMethods } from "./LaunchMethods";
import { SharedExpenses } from "./SharedExpenses";
import { MetaVerified } from "./MetaVerified";
import { ProductivityGains } from "./ProductivityGains";
import { Pricing } from "./Pricing";
import CTA2 from "./CTA2";
import Security from "./Security";
import { FAQ } from "./FAQ";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation"; // Adicione esta importação

// Componente de loading para sections
const SectionSkeleton = () => (
  <div className="min-h-screen animate-pulse">
    <div className="h-16 bg-gray-200 dark:bg-gray-800"></div>
    <div className="container mx-auto px-4 py-20">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
    </div>
</div>
);

const Index = () => {
  const { t } = useTranslation(["pricing", "pricingPlans"]);
  const params = useParams(); // Obter parâmetros da URL
  const currentLang = (params?.lang as string) || "pt"; // Extrair linguagem ou usar "pt" como padrão

  // Função para garantir que features seja sempre um array de strings
  const getFeaturesArray = (features: any): string[] => {
    if (Array.isArray(features)) {
      return features;
    }
    // Se for um objeto, converte para array
    if (typeof features === 'object' && features !== null) {
      return Object.values(features) as string[];
    }
    // Se for string, converte para array
    if (typeof features === 'string') {
      return [features];
    }
    return [];
  };

  // Defina seus planos de preços usando useMemo para performance
const plans = useMemo(() => [
  {
    name: t("pricingPlans:plans.basic.name", "Básico"),
    price: "0",
    yearlyPrice: "0",
    priceReal: "0",
    yearlyPriceReal: "0",
    period: t("pricingPlans:plans.basic.period", "mês"),
    features: getFeaturesArray(t("pricingPlans:plans.basic.features", { 
      returnObjects: true, 
      defaultValue: [
        "Até 50 lançamentos por mês",
        "3 mensagens WhatsApp AI por mês",
        "Criação de até 10 categorias",
        "Criação de até 2 metas pessoais",
        "Análise básica de gastos",
        "Suporte por email"
      ]
    })),
    description: t("pricingPlans:plans.basic.description", "Perfeito para começar a controlar suas finanças"),
    buttonText: t("pricingPlans:plans.basic.buttonText", "Começar Grátis"),
    href: `/${currentLang}/signup`,
    isPopular: false
  },
  {
    name: t("pricingPlans:plans.pro.name", "Pro"),
    price: "5.00",
    yearlyPrice: "4.00",
    priceReal: "19.90",     
    yearlyPriceReal: "16.58", 
    period: t("pricingPlans:plans.pro.period", "mês"),
    features: getFeaturesArray(t("pricingPlans:plans.pro.features", { 
      returnObjects: true,
      defaultValue: [
        "Lançamentos ilimitados",
        "WhatsApp AI ilimitado",
        "Categorias ilimitadas",
        "Metas ilimitadas",
        "Limites por categoria",
        "Até 3 despesas compartilhadas",
        "Relatórios avançados",
        "Suporte prioritário"
      ]
    })),
    description: t("pricingPlans:plans.pro.description", "Para quem leva finanças a sério"),
    buttonText: t("pricingPlans:plans.pro.buttonText", "Seja PRO"),
    href: `/${currentLang}/signup?plan=pro`,
    isPopular: true,
    badge: "Mais Popular"
  },
  {
    name: t("pricingPlans:plans.family.name", "Família"),
    price: "13.00",
    yearlyPrice: "11.00", 
    priceReal: "49.90",     
    yearlyPriceReal: "41.58",
    period: t("pricingPlans:plans.family.period", "mês"),
    features: getFeaturesArray(t("pricingPlans:plans.family.features", { 
      returnObjects: true,
      defaultValue: [
        "Tudo do plano Pro",
        "Até 5 membros da família",
        "Despesas compartilhadas ilimitadas",
        "Metas familiares colaborativas",
        "Suporte 24/7 com BiCla (IA assistente financeiro)"
      ]
    })),
    description: t("pricingPlans:plans.family.description", "Ideal para famílias que querem controlar tudo junto"),
    buttonText: t("pricingPlans:plans.family.buttonText", "Começar Teste Grátis"),
    href: `/${currentLang}/signup?plan=family`,
    isPopular: false
  }
], [t, currentLang]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 overflow-x-hidden">
      <Navbar />

      <Suspense fallback={<SectionSkeleton />}>
        <Hero />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <TechCarousel />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <Features />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <LaunchMethods />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <SharedExpenses />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CTA />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <MetaVerified />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ProductivityGains />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <Security />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <Testimonials />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <Pricing plans={plans} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CTA2 />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FAQ />
      </Suspense>

      <Footer />
    </div>
  );
};

export default Index;