import Stripe from "stripe";

// Use a versão mais recente da API do Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Função para criar produtos e preços no Stripe (executar apenas uma vez)
export async function setupStripeProducts() {
  try {
    console.log("Iniciando configuração de produtos no Stripe...");

    // 1. Criar produto Básico (gratuito)
    console.log("Criando produto Básico...");
    const basicProduct = await stripe.products.create({
      name: "Plano Básico",
      description: "Plano gratuito para iniciantes",
      metadata: {
        plan_type: "free",
        free_tier: "true",
      },
    });

    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 0, // Gratuito
      currency: "brl",
      recurring: { interval: "month" },
      metadata: {
        plan_type: "free",
        period: "monthly",
        currency: "brl",
      },
    });

    console.log("✅ Produto Básico criado:", basicProduct.id);

    // 2. Criar produto Pro
    console.log("Criando produto Pro...");
    const proProduct = await stripe.products.create({
      name: "Plano Pro",
      description: "Para quem leva finanças a sério",
      metadata: {
        plan_type: "pro",
      },
    });

    // Preço mensal BRL
    const proMonthlyPriceBRL = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1990,
      currency: "brl",
      recurring: { interval: "month" },
      metadata: {
        plan_type: "pro",
        plan_name: "pro",
        period: "monthly",
        currency: "brl",
        monthly_price: "19.90",
      },
    });

    // Preço anual BRL
    const proYearlyPriceBRL = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 19900, // R$ 199,00 em centavos (16,58 * 12)
      currency: "brl",
      recurring: { interval: "year" },
      metadata: {
        plan_type: "pro",
        plan_name: "pro",
        period: "yearly",
        currency: "brl",
        monthly_equivalent: "16.58",
        savings: "17%",
      },
    });

    // Preço mensal USD
    const proMonthlyPriceUSD = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 500, // $5.00 em centavos
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        plan_type: "pro",
          plan_name: 'pro',
        period: "monthly",
        currency: "usd",
        monthly_price: "5.00",
      },
    });

    // Preço anual USD
    const proYearlyPriceUSD = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 4800, // $48,00 em centavos (4.00 * 12)
      currency: "usd",
      recurring: { interval: "year" },
      metadata: {
        plan_type: "pro",
          plan_name: 'pro',
        period: "yearly",
        currency: "usd",
        monthly_equivalent: "4.00",
        savings: "17%",
      },
    });

    console.log("✅ Produto Pro criado:", proProduct.id);

    // 3. Criar produto Família
    console.log("Criando produto Família...");
    const familyProduct = await stripe.products.create({
      name: "Plano Família",
      description: "Ideal para famílias que querem controlar tudo junto",
      metadata: {
        plan_type: "family",
        max_members: "5",
      },
    });

    // Preço mensal BRL
    const familyMonthlyPriceBRL = await stripe.prices.create({
      product: familyProduct.id,
      unit_amount: 4990, // R$ 49,90 em centavos
      currency: "brl",
      recurring: { interval: "month" },
      metadata: {
        plan_type: "family",
          plan_name: 'family',
        period: "monthly",
        currency: "brl",
        monthly_price: "49.90",
      },
    });

    // Preço anual BRL
    const familyYearlyPriceBRL = await stripe.prices.create({
      product: familyProduct.id,
      unit_amount: 49896, // R$ 498,96 em centavos (41,58 * 12)
      currency: "brl",
      recurring: { interval: "year" },
      metadata: {
        plan_type: "family",
              plan_name: 'family',
        period: "yearly",
        currency: "brl",
        monthly_equivalent: "41.58",
        savings: "17%",
      },
    });

    // Preço mensal USD
    const familyMonthlyPriceUSD = await stripe.prices.create({
      product: familyProduct.id,
      unit_amount: 1300, // $13.00 em centavos
      currency: "usd",
      recurring: { interval: "month" },
      metadata: {
        plan_type: "family",
              plan_name: 'family',
        period: "monthly",
        currency: "usd",
        monthly_price: "13.00",
      },
    });

    // Preço anual USD
    const familyYearlyPriceUSD = await stripe.prices.create({
      product: familyProduct.id,
      unit_amount: 13200, // $132,00 em centavos (11.00 * 12)
      currency: "usd",
      recurring: { interval: "year" },
      metadata: {
        plan_type: "family",
              plan_name: 'family',
        period: "yearly",
        currency: "usd",
        monthly_equivalent: "11.00",
        savings: "17%",
      },
    });

    console.log("✅ Produto Família criado:", familyProduct.id);

    // Exibir resultados
    console.log("\n=== 📋 IDs para colocar no .env ===\n");

    console.log("=== IDs BRL (Recomendados) ===");
    console.log("STRIPE_BASIC_PRICE_ID=", basicPrice.id);
    console.log("STRIPE_PRO_MONTHLY_PRICE_ID=", proMonthlyPriceBRL.id);
    console.log("STRIPE_PRO_YEARLY_PRICE_ID=", proYearlyPriceBRL.id);
    console.log("STRIPE_FAMILY_MONTHLY_PRICE_ID=", familyMonthlyPriceBRL.id);
    console.log("STRIPE_FAMILY_YEARLY_PRICE_ID=", familyYearlyPriceBRL.id);

    console.log("\n=== IDs USD (Alternativos) ===");
    console.log("STRIPE_PRO_MONTHLY_USD_PRICE_ID=", proMonthlyPriceUSD.id);
    console.log("STRIPE_PRO_YEARLY_USD_PRICE_ID=", proYearlyPriceUSD.id);
    console.log(
      "STRIPE_FAMILY_MONTHLY_USD_PRICE_ID=",
      familyMonthlyPriceUSD.id,
    );
    console.log("STRIPE_FAMILY_YEARLY_USD_PRICE_ID=", familyYearlyPriceUSD.id);

    console.log("\n=== 🚀 Configuração concluída! ===");
    console.log("Copie os IDs acima para seu arquivo .env");

    return {
      basicPriceId: basicPrice.id,
      proPrices: {
        brl: { monthly: proMonthlyPriceBRL.id, yearly: proYearlyPriceBRL.id },
        usd: { monthly: proMonthlyPriceUSD.id, yearly: proYearlyPriceUSD.id },
      },
      familyPrices: {
        brl: {
          monthly: familyMonthlyPriceBRL.id,
          yearly: familyYearlyPriceBRL.id,
        },
        usd: {
          monthly: familyMonthlyPriceUSD.id,
          yearly: familyYearlyPriceUSD.id,
        },
      },
    };
  } catch (error) {
    console.error("❌ Erro ao configurar produtos Stripe:", error);
    throw error;
  }
}

// Função auxiliar para buscar preço baseado em parâmetros
export async function getPriceId(params: {
  plan: "free" | "pro" | "family";
  period: "monthly" | "yearly";
  currency: "BRL" | "USD";
}): Promise<string | null> {
  const { plan, period, currency } = params;

  // Mapeamento de variáveis de ambiente
  const priceMap: Record<string, Record<string, Record<string, string>>> = {
    free: {
      BRL: {
        monthly: process.env.STRIPE_BASIC_PRICE_ID!,
        yearly: process.env.STRIPE_BASIC_PRICE_ID!,
      },
      USD: {
        monthly: process.env.STRIPE_BASIC_PRICE_ID!,
        yearly: process.env.STRIPE_BASIC_PRICE_ID!,
      },
    },
    pro: {
      BRL: {
        monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
        yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
      },
      USD: {
        monthly: process.env.STRIPE_PRO_MONTHLY_USD_PRICE_ID!,
        yearly: process.env.STRIPE_PRO_YEARLY_USD_PRICE_ID!,
      },
    },
    family: {
      BRL: {
        monthly: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID!,
        yearly: process.env.STRIPE_FAMILY_YEARLY_PRICE_ID!,
      },
      USD: {
        monthly: process.env.STRIPE_FAMILY_MONTHLY_USD_PRICE_ID!,
        yearly: process.env.STRIPE_FAMILY_YEARLY_USD_PRICE_ID!,
      },
    },
  };

  const priceId = priceMap[plan]?.[currency]?.[period];

  if (!priceId) {
    console.error(`Preço não encontrado para: ${plan}, ${period}, ${currency}`);
    return null;
  }

  return priceId;
}
