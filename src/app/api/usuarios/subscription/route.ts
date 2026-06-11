// app/api/usuarios/subscription/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../auth";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Erro ao buscar subscription:", error);
    return NextResponse.json(
      { error: "Erro ao buscar assinatura" },
      { status: 500 }
    );
  }
}