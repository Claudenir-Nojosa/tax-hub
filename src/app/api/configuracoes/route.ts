import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../auth";

// GET - Buscar configurações do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar configurações existentes ou criar padrão
    let configuracoes = await db.configuracoesUsuario.findUnique({
      where: { userId: session.user.id },
    });

    // Se não existir, cria configurações padrão
    if (!configuracoes) {
      configuracoes = await db.configuracoesUsuario.create({
        data: {
          userId: session.user.id,
          idioma: "pt-BR",
        },
      });
    }

    return NextResponse.json({ configuracoes });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar configurações do usuário
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validar campos permitidos (apenas os 3 que você quer)
    const camposPermitidos = ["idioma", "genero", "pronome"];

    const dadosAtualizacao: any = {};

    // Filtrar apenas campos permitidos
    Object.keys(body).forEach((key) => {
      if (camposPermitidos.includes(key)) {
        dadosAtualizacao[key] = body[key];
      }
    });

    // Verificar se configurações existem
    const configExistente = await db.configuracoesUsuario.findUnique({
      where: { userId: session.user.id },
    });

    let configuracoes;

    if (configExistente) {
      // Atualizar configurações existentes
      configuracoes = await db.configuracoesUsuario.update({
        where: { userId: session.user.id },
        data: dadosAtualizacao,
      });
    } else {
      // Criar novas configurações com valores padrão + atualizações
      configuracoes = await db.configuracoesUsuario.create({
        data: {
          userId: session.user.id,
          idioma: "pt-BR",
          ...dadosAtualizacao,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
      configuracoes,
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}