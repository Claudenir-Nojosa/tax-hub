import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../../../auth";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const params = await context.params;
    const { id: metaId, userId } = params;

    console.log(`Removendo colaborador ${userId} da meta ${metaId}`);

    // Verificar se o usuário é o dono da meta
    const meta = await db.metaPessoal.findFirst({
      where: {
        id: metaId,
        userId: session.user.id,
      },
    });

    if (!meta) {
      console.log("Meta não encontrada ou usuário não é o dono");
      return NextResponse.json(
        { error: "Meta não encontrada ou você não tem permissão" },
        { status: 404 }
      );
    }

    // Verificar se o colaborador existe
    const colaborador = await db.colaboradorMeta.findFirst({
      where: {
        metaId,
        userId,
      },
    });

    if (!colaborador) {
      console.log("Colaborador não encontrado");
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 }
      );
    }

    // Buscar o usuário para obter o email
    const usuario = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!usuario) {
      console.log("Usuário não encontrado");
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Remover colaborador
    await db.colaboradorMeta.deleteMany({
      where: {
        metaId,
        userId,
      },
    });

    // Atualizar convites para CANCELADO
    await db.conviteMeta.updateMany({
      where: {
        metaId,
        emailConvidado: usuario.email,
        status: "ACEITO",
      },
      data: {
        status: "CANCELADO",
        atualizadoEm: new Date(),
      },
    });

    // ENVIAR NOTIFICAÇÃO PARA O COLABORADOR REMOVIDO
    try {
      await fetch(
        `${process.env.NEXTAUTH_URL}/api/notificacoes/remocao-colaborador`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            metaId: metaId,
            metaTitulo: meta.titulo,
            donoNome: session.user.name,
            tipo: "META",
          }),
        }
      );
    } catch (error) {
      console.error("Erro ao enviar notificação de remoção:", error);
    }

    console.log("Colaborador removido com sucesso e convite cancelado");
    return NextResponse.json({ message: "Colaborador removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
