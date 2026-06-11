import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../../auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const params = await context.params;
    const metaId = params.id;

    // Verificar se o usuário tem acesso à meta (dono ou colaborador)
    const meta = await db.metaPessoal.findFirst({
      where: {
        id: metaId,
        OR: [
          { userId: session.user.id },
          { ColaboradorMeta: { some: { userId: session.user.id } } },
        ],
      },
      include: {
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
      },
    });

    if (!meta) {
      return NextResponse.json(
        { error: "Meta não encontrada ou você não tem acesso" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      colaboradores: meta.ColaboradorMeta,
      convites: meta.ConviteMeta,
    });
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const params = await context.params;
    const metaId = params.id;
    const body = await request.json();
    const { emailConvidado, permissao = "LEITURA" } = body;

    if (!emailConvidado) {
      return NextResponse.json(
        { error: "Email do convidado é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o usuário é o dono da meta
    const meta = await db.metaPessoal.findFirst({
      where: {
        id: metaId,
        userId: session.user.id,
      },
    });

    if (!meta) {
      return NextResponse.json(
        { error: "Meta não encontrada ou você não tem permissão" },
        { status: 404 }
      );
    }

    // Verificar se o convidado já existe como usuário
    const usuarioConvidado = await db.user.findUnique({
      where: { email: emailConvidado },
    });

    if (!usuarioConvidado) {
      return NextResponse.json(
        { error: "Usuário não encontrado no sistema" },
        { status: 404 }
      );
    }

    // Verificar se o usuário está tentando convidar a si mesmo
    if (usuarioConvidado.id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode convidar a si mesmo" },
        { status: 400 }
      );
    }

    // Verificar se já é colaborador
    const jaColaborador = await db.colaboradorMeta.findFirst({
      where: {
        metaId,
        userId: usuarioConvidado.id,
      },
    });

    if (jaColaborador) {
      return NextResponse.json(
        { error: "Usuário já é colaborador desta meta" },
        { status: 400 }
      );
    }

    // Verificar se já existe convite PENDENTE
    const convitePendente = await db.conviteMeta.findFirst({
      where: {
        metaId,
        emailConvidado,
        status: "PENDENTE",
      },
    });

    if (convitePendente) {
      return NextResponse.json(
        { error: "Já existe um convite pendente para este email" },
        { status: 400 }
      );
    }

    // Se existe um convite antigo, vamos atualizá-lo
    const conviteExistente = await db.conviteMeta.findFirst({
      where: {
        metaId,
        emailConvidado,
        status: { in: ["ACEITO", "RECUSADO", "EXPIRADO", "CANCELADO"] },
      },
    });

    // Criar token único
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);

    if (conviteExistente) {
      // Atualizar convite existente
      const convite = await db.conviteMeta.update({
        where: { id: conviteExistente.id },
        data: {
          token,
          status: "PENDENTE",
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          atualizadoEm: new Date(),
        },
      });

      console.log(`Convite de meta reativado: ${token} para ${emailConvidado}`);
      return NextResponse.json(convite, { status: 200 });
    } else {
      // Criar novo convite
      const convite = await db.conviteMeta.create({
        data: {
          metaId,
          emailConvidado,
          token,
          status: "PENDENTE",
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          usuarioCriadorId: session.user.id,
        },
      });

      console.log(`Convite de meta criado: ${token} para ${emailConvidado}`);
      return NextResponse.json(convite, { status: 201 });
    }
  } catch (error: any) {
    console.error("Erro ao convidar colaborador:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um convite para este email" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
