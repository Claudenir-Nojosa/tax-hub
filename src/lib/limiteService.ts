// lib/limiteService.ts
import db from "./db";

export class LimiteService {
  static async atualizarGastoLimite(
    userId: string,
    categoriaId: string,
    valor: number,
    tipo: "RECEITA" | "DESPESA"
  ) {
    try {
      const hoje = new Date();
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

      // Só atualizamos limites para despesas
      if (tipo !== "DESPESA") return;

      // Verificar se existe limite para esta categoria no mês atual
      const limiteExistente = await db.limiteCategoria.findFirst({
        where: {
          userId,
          categoriaId,
          mesReferencia,
        },
      });

      if (limiteExistente) {
        // Atualizar o gasto atual
        await db.limiteCategoria.update({
          where: { id: limiteExistente.id },
          data: {
            gastoAtual: {
              increment: valor,
            },
          },
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar limite:", error);
      // Não lançamos o erro para não quebrar o fluxo principal
    }
  }

  static async atualizarTodosLimites(userId: string) {
    try {
      const hoje = new Date();
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      // Buscar todos os limites do usuário para o mês atual
      const limites = await db.limiteCategoria.findMany({
        where: {
          userId,
          mesReferencia,
        },
      });

      // Atualizar gastos para cada limite
      for (const limite of limites) {
        const gastoAtual = await db.lancamento.aggregate({
          where: {
            userId,
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
    } catch (error) {
      console.error("Erro ao atualizar todos os limites:", error);
    }
  }
}
