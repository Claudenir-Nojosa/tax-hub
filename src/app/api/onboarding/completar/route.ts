// app/api/onboarding/completar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { respostas, dataCompletado, username } = await request.json();
    console.log("📥 Dados recebidos na API:", {
      userId: session.user.id,
      usernameRecebido: username,
      temUsernameNoBody: !!username,
      respostasComUsername: respostas?.escolher_username,
    });
    // Verificar se o username já existe
    if (username) {
      const existingUser = await db.user.findFirst({
        where: {
          username: username.toLowerCase(),
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Este nome de usuário já está em uso" },
          { status: 400 },
        );
      }
    }

    // Atualizar usuário com onboarding completo
    const usuarioAtualizado = await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleto: true,
        onboardingData: new Date(dataCompletado),
        onboardingRespostas: respostas,
        username: username?.toLowerCase() || null,
      },
    });

    return NextResponse.json({
      sucesso: true,
      atualizado: true,
      usuario: {
        id: usuarioAtualizado.id,
        onboardingCompleto: usuarioAtualizado.onboardingCompleto,
        username: usuarioAtualizado.username,
      },
    });
  } catch (error) {
    console.error("Erro ao completar onboarding:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
