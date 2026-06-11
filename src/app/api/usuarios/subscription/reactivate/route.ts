import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../auth";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      );
    }

    // Já está ativa
    if (subscription.status === "active") {
      return NextResponse.json(
        { error: "Assinatura já está ativa" },
        { status: 400 }
      );
    }

    // Expirada de verdade → não pode reativar
    if (new Date(subscription.fimPlano) < new Date()) {
      return NextResponse.json(
        { error: "Assinatura expirada não pode ser reativada" },
        { status: 400 }
      );
    }

    // Só reativa se foi cancelada
    if (!subscription.canceladoEm) {
      return NextResponse.json(
        { error: "Assinatura não está cancelada" },
        { status: 400 }
      );
    }

    const updatedSubscription = await db.subscription.update({
      where: { userId: session.user.id },
      data: {
        status: "active",
        canceladoEm: null,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Erro ao reativar assinatura:", error);
    return NextResponse.json(
      { error: "Erro ao reativar assinatura" },
      { status: 500 }
    );
  }
}
