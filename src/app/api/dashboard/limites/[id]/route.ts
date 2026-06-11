// app/api/dashboard/limites/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import db from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params; // Adicionar await aqui
    const body = await request.json();
    const { limiteMensal } = body;

    if (!limiteMensal || limiteMensal <= 0) {
      return NextResponse.json(
        { error: "Limite mensal deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Verificar se o limite existe e pertence ao usuário
    const limiteExistente = await db.limiteCategoria.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!limiteExistente) {
      return NextResponse.json(
        { error: "Limite não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar o limite
    const limiteAtualizado = await db.limiteCategoria.update({
      where: { id },
      data: {
        limiteMensal: parseFloat(limiteMensal),
      },
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(limiteAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar limite:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params; // Adicionar await aqui

    // Verificar se o limite existe e pertence ao usuário
    const limiteExistente = await db.limiteCategoria.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!limiteExistente) {
      return NextResponse.json(
        { error: "Limite não encontrado" },
        { status: 404 }
      );
    }

    // Excluir o limite
    await db.limiteCategoria.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Limite excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir limite:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
