// app/api/usuarios/subscription/limite-categorias/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../auth";

const LIMITE_CATEGORIAS_FREE = 1;
const LIMITE_CATEGORIAS_PRO = 100;
const LIMITE_CATEGORIAS_FAMILY = 500;

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

    // Contar categorias
    const categoriasCount = await db.categoria.count({
      where: { userId: session.user.id },
    });

    // Determinar limite baseado no plano
    let limite;
    let plano = "free";

    if (subscription?.status === "active") {
      plano = subscription.plano;
      switch (subscription.plano) {
        case "pro":
          limite = LIMITE_CATEGORIAS_PRO;
          break;
        case "family":
          limite = LIMITE_CATEGORIAS_FAMILY;
          break;
        default:
          limite = LIMITE_CATEGORIAS_FREE;
      }
    } else {
      limite = LIMITE_CATEGORIAS_FREE;
    }

    const atingido = categoriasCount >= limite;

    return NextResponse.json({
      plano,
      limiteCategorias: limite,
      categoriasUsadas: categoriasCount,
      categoriasRestantes: limite - categoriasCount,
      atingido,
      porcentagem: Math.min((categoriasCount / limite) * 100, 100),
    });
  } catch (error) {
    console.error("Erro ao verificar limite de categorias:", error);
    return NextResponse.json(
      { error: "Erro ao verificar limite" },
      { status: 500 },
    );
  }
}
