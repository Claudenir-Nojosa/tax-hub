import db from "./db";

export async function getUserSubscription(userId: string) {
  const subscription = await db.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return { plano: "free", status: "expired", isActive: false };
  }

  // Verificar se expirou
  const now = new Date();
  const isExpired = subscription.fimPlano < now;

  if (isExpired && subscription.status === "active") {
    // Atualizar para expirado
    await db.subscription.update({
      where: { userId },
      data: { status: "expired" },
    });

    await db.user.update({
      where: { id: userId },
      data: { subscriptionStatus: "free" },
    });

    return { plano: "free", status: "expired", isActive: false };
  }

  return {
    plano: subscription.plano,
    status: subscription.status,
    isActive: subscription.status === "active" && !isExpired,
    fimPlano: subscription.fimPlano,
  };
}
