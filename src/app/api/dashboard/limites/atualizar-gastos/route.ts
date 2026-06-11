// app/api/dashboard/limites/atualizar-gastos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const hoje = new Date();
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Buscar todos os limites do usuário para o mês atual
    const limites = await db.limiteCategoria.findMany({
      where: {
        userId: session.user.id,
        mesReferencia,
      },
    });

    // Atualizar gastos para cada limite
    for (const limite of limites) {
      const gastoAtual = await db.lancamento.aggregate({
        where: {
          userId: session.user.id,
          categoriaId: limite.categoriaId,
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

      await db.limiteCategoria.update({
        where: { id: limite.id },
        data: {
          gastoAtual: gastoAtual._sum.valor || 0,
        },
      });
    }

    return NextResponse.json({ message: "Gastos atualizados com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar gastos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
