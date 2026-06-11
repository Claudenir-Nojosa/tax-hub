// app/api/dashboard/resumo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import db from "@/lib/db";

function calcularMesReferenciaLancamento(
  lancamento: any
): { ano: number; mes: number } {
  const data = new Date(lancamento.data);
  let ano = data.getFullYear();
  let mes = data.getMonth() + 1;

  // ✅ Para CRÉDITO, só avança mês se a compra for após o fechamento
  if (lancamento.metodoPagamento === "CREDITO" && lancamento.cartao) {
    const diaLancamento = data.getDate();
    const diaFechamento = lancamento.cartao.diaFechamento || 1;

    if (diaLancamento > diaFechamento) {
      mes += 1;
      if (mes > 12) {
        mes = 1;
        ano += 1;
      }
    }
  }

  return { ano, mes };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes =
      searchParams.get("mes") || (new Date().getMonth() + 1).toString();
    const ano = searchParams.get("ano") || new Date().getFullYear().toString();

    const mesNum = Number(mes);
    const anoNum = Number(ano);

    console.log("\n=== INÍCIO DEBUG RESUMO ===");
    console.log("Buscando para:", { mes: mesNum, ano: anoNum, userId: session.user.id });

    // ✅ Buscar TODOS os lançamentos do usuário (incluindo compartilhamentos)
    const todosLancamentos = await db.lancamento.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        cartao: {
          select: {
            diaFechamento: true,
            diaVencimento: true,
          },
        },
        LancamentoCompartilhado: true, // ✅ Incluir compartilhamentos
      },
    });

    console.log("Total de lançamentos do usuário:", todosLancamentos.length);

    // ✅ Filtrar usando calcularMesReferenciaLancamento
    const lancamentosFiltrados = todosLancamentos.filter((lancamento) => {
      const { ano, mes } = calcularMesReferenciaLancamento(lancamento);
      return ano === anoNum && mes === mesNum;
    });

    console.log("Lançamentos filtrados:", lancamentosFiltrados.length);

    // ✅ Função auxiliar para verificar se é compartilhado
    const isCompartilhado = (lancamento: any): boolean => {
      // Critério 1: Observações contêm "Compartilhado por:"
      const temObservacaoCompartilhada = 
        lancamento.observacoes && 
        lancamento.observacoes.includes("Compartilhado por:");
      
      // Critério 2: Tem relacionamento LancamentoCompartilhado
      const temRelacionamentoCompartilhado = 
        lancamento.LancamentoCompartilhado && 
        lancamento.LancamentoCompartilhado.length > 0;
      
      return temObservacaoCompartilhada || temRelacionamentoCompartilhado;
    };

    // ✅ Separar RECEITAS
    const receitas = lancamentosFiltrados.filter((l) => l.tipo === "RECEITA");
    const valorReceita = receitas.reduce((sum, l) => sum + l.valor, 0);

    console.log("\n--- RECEITAS ---");
    console.log("Quantidade:", receitas.length);
    console.log("Total:", valorReceita);
    receitas.forEach(r => {
      console.log(`  • ${r.descricao}: R$ ${r.valor}`);
    });

    // ✅ Separar DESPESAS INDIVIDUAIS (NÃO compartilhadas)
    const despesasIndividuais = lancamentosFiltrados.filter(
      (l) => l.tipo === "DESPESA" && !isCompartilhado(l)
    );
    const valorDespesaIndividual = despesasIndividuais.reduce(
      (sum, l) => sum + l.valor, 
      0
    );

    console.log("\n--- DESPESAS INDIVIDUAIS ---");
    console.log("Quantidade:", despesasIndividuais.length);
    console.log("Total:", valorDespesaIndividual);
    despesasIndividuais.forEach(d => {
      console.log(`  • ${d.descricao}: R$ ${d.valor}`);
    });

    // ✅ Separar DESPESAS COMPARTILHADAS
    const despesasCompartilhadas = lancamentosFiltrados.filter(
      (l) => l.tipo === "DESPESA" && isCompartilhado(l)
    );
    const valorCompartilhado = despesasCompartilhadas.reduce(
      (sum, l) => sum + l.valor, 
      0
    );

    console.log("\n--- DESPESAS COMPARTILHADAS ---");
    console.log("Quantidade:", despesasCompartilhadas.length);
    console.log("Total:", valorCompartilhado);
    despesasCompartilhadas.forEach(d => {
      console.log(`  • ${d.descricao}: R$ ${d.valor}`);
      console.log(`    - Observações: ${d.observacoes || 'N/A'}`);
      console.log(`    - Compartilhamentos: ${d.LancamentoCompartilhado?.length || 0}`);
    });

    // ✅ Calcular totais
    const totalDespesas = valorDespesaIndividual + valorCompartilhado;

    console.log("\n--- RESUMO FINAL ---");
    console.log("Receitas:", valorReceita);
    console.log("Despesas Individuais:", valorDespesaIndividual);
    console.log("Despesas Compartilhadas:", valorCompartilhado);
    console.log("Total Despesas:", totalDespesas);
    console.log("Saldo:", valorReceita - totalDespesas);
    console.log("=== FIM DEBUG RESUMO ===\n");

    const resumo = {
      receita: valorReceita,
      despesa: totalDespesas,
      despesasCompartilhadas: valorCompartilhado,
      saldo: valorReceita - totalDespesas,
      limites: 0,
    };

    return NextResponse.json(resumo);
  } catch (error) {
    console.error("Erro ao calcular resumo:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
