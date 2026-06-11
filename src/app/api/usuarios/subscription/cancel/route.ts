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

    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "Assinatura já está cancelada ou expirada" },
        { status: 400 }
      );
    }

    const updatedSubscription = await db.subscription.update({
      where: { userId: session.user.id },
      data: {
        status: "canceled",
        canceladoEm: new Date(),
        // IMPORTANTE:
        // fimPlano permanece o mesmo para permitir acesso até o final do período
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar assinatura" },
      { status: 500 }
    );
  }
}
