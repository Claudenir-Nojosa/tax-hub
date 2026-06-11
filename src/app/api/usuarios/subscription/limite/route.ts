import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../auth";

// 🔴 LIMITES conforme sua configuração
const LIMITE_FREE = 2;
const LIMITE_PRO = 5000; // Apenas para referência, mas não bloqueia
const LIMITE_FAMILY = 10000; // Apenas para referência, mas não bloqueia

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar assinatura
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    // Contar lançamentos
    const lancamentosCount = await db.lancamento.count({
      where: { userId: session.user.id },
    });

    // Determinar plano atual
    let plano = "free";
    let limite = LIMITE_FREE;
    let temLimite = true; // FREE tem limite

    if (subscription?.status === "active") {
      plano = subscription.plano;

      if (plano === "pro") {
        limite = LIMITE_PRO;
        temLimite = false; // Pro NÃO tem limite de bloqueio
      } else if (plano === "family") {
        limite = LIMITE_FAMILY;
        temLimite = false; // Family NÃO tem limite de bloqueio
      }
    }

    // Para planos sem limite (pro/family), mostrar apenas informação
    const atingido = temLimite ? lancamentosCount >= limite : false;
    const porcentagem = temLimite
      ? Math.min((lancamentosCount / limite) * 100, 100)
      : 0;

    return NextResponse.json({
      plano,
      limite,
      usado: lancamentosCount,
      disponivel: temLimite ? limite - lancamentosCount : null,
      atingido,
      porcentagem,
      temLimite, // Indica se este plano tem limite de bloqueio
      proximoLimite: plano === "free" ? LIMITE_PRO : null, // De free para pro
    });
  } catch (error) {
    console.error("Erro ao verificar limite:", error);
    return NextResponse.json(
      { error: "Erro ao verificar limite" },
      { status: 500 },
    );
  }
}
