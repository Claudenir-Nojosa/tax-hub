import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Se tiver username na query, busca por username
    if (username) {
      const usuario = await db.user.findUnique({
        where: {
          username: username.toLowerCase(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true,
        },
      });

      if (!usuario) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }

      if (usuario.id === session.user.id) {
        return NextResponse.json(
          { error: "Você não pode compartilhar com você mesmo" },
          { status: 400 }
        );
      }

      return NextResponse.json(usuario);
    }

    // Busca usuários recentes (com quem já compartilhou)
    const usuariosRecentes = await db.user.findMany({
      where: {
        OR: [
          {
            lancamentosCompartilhadosRecebidos: {
              some: {
                lancamento: {
                  userId: session.user.id,
                },
              },
            },
          },
          {
            lancamentosCompartilhadosCriados: {
              some: {
                lancamento: {
                  userId: session.user.id,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
      },
      distinct: ["id"],
      take: 10,
    });

    return NextResponse.json(usuariosRecentes);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}