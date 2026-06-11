import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    console.log("API Usuários/Me - Sessão:", session?.user?.id);

    if (!session?.user?.id) {
      console.log("API Usuários/Me - Não autorizado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca APENAS o usuário atual
    const usuario = await db.user.findUnique({
      where: {
        id: session.user.id, // ← BUSCA O USUÁRIO ATUAL
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true, // ← INCLUI O USERNAME
        image: true,
        subscriptionStatus: true,
        onboardingCompleto: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) {
      console.log("API Usuários/Me - Usuário não encontrado");
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    console.log("API Usuários/Me - Usuário encontrado:", {
      id: usuario.id,
      name: usuario.name,
      username: usuario.username
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Erro ao buscar usuário atual:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}