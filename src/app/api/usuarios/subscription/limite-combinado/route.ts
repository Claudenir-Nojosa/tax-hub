// app/api/usuarios/subscription/limite-combinado/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "../../../../../../auth";

// Limites para plano free
const LIMITE_LANCAMENTOS_FREE = 1;
const LIMITE_CATEGORIAS_FREE = 10;
const LIMITE_METAS_FREE = 2;

// Limites para planos premium
const LIMITE_LANCAMENTOS_PRO = 50000000000;
const LIMITE_CATEGORIAS_PRO = 10000000000;
const LIMITE_METAS_PRO = 10000000000000;
const LIMITE_LANCAMENTOS_FAMILY = 100000000000000000;
const LIMITE_CATEGORIAS_FAMILY = 500000000000000;
const LIMITE_METAS_FAMILY = 10000000000000000000;

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });

    try {
      // Contar lançamentos, categorias e metas
      const lancamentosCount = await db.lancamento.count({
        where: { userId: session.user.id },
      });

      const categoriasCount = await db.categoria.count({
        where: { userId: session.user.id },
      });

      const metasCount = await db.metaPessoal.count({
        where: { userId: session.user.id },
      });

      // Determinar plano e limites
      let plano = "free";
      let limiteLancamentos = LIMITE_LANCAMENTOS_FREE;
      let limiteCategorias = LIMITE_CATEGORIAS_FREE;
      let limiteMetas = LIMITE_METAS_FREE;

      if (subscription?.status === "active") {
        plano = subscription.plano;
        if (plano === "pro") {
          limiteLancamentos = LIMITE_LANCAMENTOS_PRO;
          limiteCategorias = LIMITE_CATEGORIAS_PRO;
          limiteMetas = LIMITE_METAS_PRO;
        } else if (plano === "family") {
          limiteLancamentos = LIMITE_LANCAMENTOS_FAMILY;
          limiteCategorias = LIMITE_CATEGORIAS_FAMILY;
          limiteMetas = LIMITE_METAS_FAMILY;
        }
      }

      // Calcular percentuais individuais
      const percentualLancamentos =
        limiteLancamentos > 0
          ? Math.min((lancamentosCount / limiteLancamentos) * 100, 100)
          : 0;

      const percentualCategorias =
        limiteCategorias > 0
          ? Math.min((categoriasCount / limiteCategorias) * 100, 100)
          : 0;

      const percentualMetas =
        limiteMetas > 0 ? Math.min((metasCount / limiteMetas) * 100, 100) : 0;

      // NOVA LÓGICA: Somar todos os usos e todos os limites
      const totalUsado = lancamentosCount + categoriasCount + metasCount;
      const totalLimite = limiteLancamentos + limiteCategorias + limiteMetas;
      
      // Calcular percentual combinado baseado no total
      const percentualCombinado = 
        totalLimite > 0 
          ? Math.min((totalUsado / totalLimite) * 100, 100)
          : 0;

      // Verificar se algum dos limites foi atingido
      const lancamentosAtingido = lancamentosCount >= limiteLancamentos;
      const categoriasAtingido = categoriasCount >= limiteCategorias;
      const metasAtingido = metasCount >= limiteMetas;
      const atingido =
        lancamentosAtingido || categoriasAtingido || metasAtingido;

      // Determinar qual limite está mais crítico
      let limiteCritico = "";
      const percentuais = [
        {
          tipo: "lançamentos",
          valor: percentualLancamentos,
          atingido: lancamentosAtingido,
        },
        {
          tipo: "categorias",
          valor: percentualCategorias,
          atingido: categoriasAtingido,
        },
        {
          tipo: "metas",
          valor: percentualMetas,
          atingido: metasAtingido,
        },
      ];

      percentuais.sort((a, b) => b.valor - a.valor);

      const atingidos = percentuais.filter((p) => p.atingido);
      if (atingidos.length > 0) {
        limiteCritico = atingidos[0].tipo;
      } else {
        limiteCritico = percentuais[0].tipo;
      }

      const responseData = {
        plano,

        // Limites individuais
        limiteLancamentos,
        usadoLancamentos: lancamentosCount,
        percentualLancamentos,
        lancamentosAtingido,

        limiteCategorias,
        usadoCategorias: categoriasCount,
        percentualCategorias,
        categoriasAtingido,

        limiteMetas,
        usadoMetas: metasCount,
        percentualMetas,
        metasAtingido,

        // Dados combinados
        percentualCombinado,
        atingido,
        limiteCritico,

        // Estatísticas gerais
        totalUsado,
        totalLimite,
        usadoTotal: totalUsado,
        maisProximoDoLimite: percentuais[0].tipo,
      };

      return NextResponse.json(responseData);
    } catch (dbError) {
      console.error("❌ Erro ao consultar banco de dados:", dbError);
      return NextResponse.json(
        { error: "Erro ao consultar banco de dados", details: String(dbError) },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ Erro geral ao verificar limite combinado:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: String(error) },
      { status: 500 },
    );
  }
}