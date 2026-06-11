// app/api/dashboard/limites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes") || (new Date().getMonth() + 1).toString();
    const ano = searchParams.get("ano") || new Date().getFullYear().toString();

    const mesReferencia = `${ano}-${mes.padStart(2, '0')}`;

    const limites = await db.limiteCategoria.findMany({
      where: {
        userId: session.user.id,
        mesReferencia
      },
      include: {
        categoria: true
      },
      orderBy: {
        limiteMensal: 'desc'
      }
    });

    return NextResponse.json(limites);
  } catch (error) {
    console.error("Erro ao buscar limites:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { categoriaId, limiteMensal } = body;

    if (!categoriaId || !limiteMensal) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    if (limiteMensal <= 0) {
      return NextResponse.json(
        { error: "Limite mensal deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Verificar se a categoria existe e pertence ao usuário
    const categoria = await db.categoria.findFirst({
      where: {
        id: categoriaId,
        userId: session.user.id,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    const hoje = new Date();
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    // Usar a função helper para calcular gasto atual
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const gastoAtual = await db.lancamento.aggregate({
      where: {
        userId: session.user.id,
        categoriaId: categoriaId,
        tipo: "DESPESA",
        data: {
          gte: primeiroDiaMes,
          lte: ultimoDiaMes,
        },
      },
      _sum: {
        valor: true,
      },
    });

    const limite = await db.limiteCategoria.upsert({
      where: {
        categoriaId_mesReferencia_userId: {
          categoriaId,
          mesReferencia,
          userId: session.user.id,
        },
      },
      update: {
        limiteMensal: parseFloat(limiteMensal),
        gastoAtual: gastoAtual._sum.valor || 0,
      },
      create: {
        categoriaId,
        limiteMensal: parseFloat(limiteMensal),
        gastoAtual: gastoAtual._sum.valor || 0,
        mesReferencia,
        userId: session.user.id,
      },
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(limite, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar limite:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
