// app/api/dashboard/metas/[id]/route.ts
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

    const { id } = await params;
    const body = await request.json();
    const {
      titulo,
      descricao,
      valorAlvo,
      valorAtual,
      dataAlvo,
      categoria,
      cor,
      icone,
      imagemUrl,
    } = body;

    // Verificar se o usuário é o dono OU um colaborador da meta
    const metaExistente = await db.metaPessoal.findFirst({
      where: {
        id: id,
        OR: [
          { userId: session.user.id }, // Dono da meta
          {
            ColaboradorMeta: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        ColaboradorMeta: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!metaExistente) {
      return NextResponse.json(
        { error: "Meta não encontrada ou você não tem permissão" },
        { status: 404 }
      );
    }

    // Verificar se o usuário é colaborador (não é o dono)
    const isColaborador = metaExistente.userId !== session.user.id;

    // Preparar dados para atualização
    const updateData: any = {};

    // Se estiver atualizando apenas o valorAtual (do botão +)
    if (valorAtual !== undefined && Object.keys(body).length === 1) {
      // Colaboradores só podem adicionar valor, não reduzir
      if (isColaborador) {
        const diferenca = parseFloat(valorAtual) - metaExistente.valorAtual;

        // Colaborador só pode adicionar valor positivo
        if (diferenca <= 0) {
          return NextResponse.json(
            { error: "Colaboradores só podem adicionar valor à meta" },
            { status: 400 }
          );
        }

        // Registrar a contribuição do colaborador
        await db.contribuicaoMeta.create({
          data: {
            metaId: id,
            userId: session.user.id,
            valor: diferenca,
            descricao: `Contribuição para a meta "${metaExistente.titulo}"`,
          },
        });
      }

      updateData.valorAtual = parseFloat(valorAtual);
    } else {
      // Se estiver fazendo uma edição completa

      // Apenas o dono pode editar os detalhes da meta
      if (isColaborador) {
        return NextResponse.json(
          { error: "Apenas o dono da meta pode editar seus detalhes" },
          { status: 403 }
        );
      }

      // Validar campos obrigatórios
      if (!titulo || !valorAlvo || !dataAlvo || !categoria) {
        return NextResponse.json(
          { error: "Campos obrigatórios faltando" },
          { status: 400 }
        );
      }

      updateData.titulo = titulo;
      updateData.descricao = descricao || "";
      updateData.valorAlvo = parseFloat(valorAlvo);
      updateData.valorAtual = parseFloat(valorAtual) || 0;
      updateData.dataAlvo = new Date(dataAlvo);
      updateData.categoria = categoria;
      updateData.cor = cor || "#3B82F6";
      updateData.icone = icone || "🏠";
      updateData.imagemUrl = imagemUrl || null;
    }

    const meta = await db.metaPessoal.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json(meta);
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const meta = await db.metaPessoal.findFirst({
      where: {
        id: id,
        OR: [
          { userId: session.user.id },
          { ColaboradorMeta: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ColaboradorMeta: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        ConviteMeta: {
          where: {
            status: "PENDENTE",
          },
        },
        ContribuicaoMeta: {
          // 👈 AGORA ESTE INCLUDE FUNCIONARÁ
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            dataContribuicao: "desc",
          },
        },
      },
    });

    if (!meta) {
      return NextResponse.json(
        { error: "Meta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(meta);
  } catch (error) {
    console.error("Erro ao buscar meta:", error);
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

    const { id } = await params;

    // Verificar se a meta pertence ao usuário
    const metaExistente = await db.metaPessoal.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!metaExistente) {
      return NextResponse.json(
        { error: "Meta não encontrada" },
        { status: 404 }
      );
    }

    await db.metaPessoal.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Meta excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir meta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
