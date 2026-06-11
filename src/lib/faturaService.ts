import db from "./db";

interface CartaoComFaturasELancamentos {
  id: string;
  nome: string;
  bandeira: string;
  limite: number | null;
  diaFechamento: number | null;
  diaVencimento: number | null;
  cor: string;
  observacoes: string | null;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
  Fatura: Array<{
    id: string;
    mesReferencia: string;
    status: string;
    valorTotal: number;
    valorPago: number;
  }>;
  lancamentos: Array<{
    id: string;
    valor: number;
    pago: boolean;
    Fatura: {
      status: string;
    } | null;
  }>;
}

export class FaturaService {
  // 🔥 CORREÇÃO: Obter fatura correta baseada no dia de fechamento
  static async obterFaturaParaLancamento(lancamentoId: string) {
    const lancamento = await db.lancamento.findUnique({
      where: { id: lancamentoId },
      include: { cartao: true },
    });

    if (!lancamento || !lancamento.cartaoId || !lancamento.cartao) {
      throw new Error("Lançamento ou cartão não encontrado");
    }

    // 🔥 CALCULAR MES REFERENCIA CORRETO baseado no dia de fechamento
    const mesReferencia = this.calcularMesReferencia(
      lancamento.data,
      lancamento.cartao.diaFechamento
    );

    // Calcular datas de fechamento e vencimento
    const dataFechamento = this.calcularDataFechamento(
      lancamento.cartao.diaFechamento,
      mesReferencia
    );
    const dataVencimento = this.calcularDataVencimento(
      lancamento.cartao.diaVencimento,
      mesReferencia
    );

    return await db.fatura.upsert({
      where: {
        cartaoId_mesReferencia: {
          cartaoId: lancamento.cartaoId,
          mesReferencia,
        },
      },
      create: {
        cartaoId: lancamento.cartaoId,
        mesReferencia,
        dataFechamento,
        dataVencimento,
        status: "ABERTA",
      },
      update: {},
    });
  }
  // NO FaturaService - CORRIJA A FUNÇÃO calcularMesReferencia:

  static calcularMesReferencia(
    dataLancamento: Date,
    diaFechamento: number | null
  ): string {
    if (!diaFechamento) diaFechamento = 1;

    // Extrair do formato ISO string para evitar problemas de timezone
    const dataISO = dataLancamento.toISOString(); // "2025-11-04T03:00:00.000Z"
    const dataPart = dataISO.substring(0, 10); // "2025-11-04"
    const [anoStr, mesStr, diaStr] = dataPart.split("-");

    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const dia = parseInt(diaStr);

    console.log(
      `📅 Lançamento: ${dia}/${mes}/${ano}, Fechamento: ${diaFechamento}`
    );

    if (dia > diaFechamento) {
      let proximoMes = mes + 1;
      let proximoAno = ano;

      if (proximoMes > 12) {
        proximoMes = 1;
        proximoAno = ano + 1;
      }

      const resultado = `${proximoAno}-${String(proximoMes).padStart(2, "0")}`;
      console.log(`➡️ Vai para PRÓXIMA fatura: ${resultado}`);
      return resultado;
    } else {
      const resultado = `${ano}-${String(mes).padStart(2, "0")}`;
      console.log(`⬅️ Fica na fatura ATUAL: ${resultado}`);
      return resultado;
    }
  }

  // 🔥 ATUALIZAR: Método adicionarLancamentoAFatura para usar a nova função
  static async adicionarLancamentoAFatura(lancamentoId: string) {
    const lancamento = await db.lancamento.findUnique({
      where: { id: lancamentoId },
      include: { cartao: true },
    });

    if (
      !lancamento ||
      !lancamento.cartaoId ||
      lancamento.metodoPagamento !== "CREDITO"
    ) {
      return;
    }

    // 🔥 USAR A NOVA FUNÇÃO que considera o dia de fechamento
    const fatura = await this.obterFaturaParaLancamento(lancamentoId);

    await db.lancamento.update({
      where: { id: lancamentoId },
      data: { faturaId: fatura.id },
    });

    // Atualizar valor total da fatura
    await this.atualizarValorFatura(fatura.id);

    console.log(
      `✅ Lançamento ${lancamentoId} adicionado à fatura ${fatura.mesReferencia}`
    );
  }

  // Obter fatura do mês atual para um cartão (para outros usos)
  static async obterFaturaAtual(cartaoId: string) {
    const cartao = await db.cartao.findUnique({
      where: { id: cartaoId },
    });

    if (!cartao) {
      throw new Error("Cartão não encontrado");
    }

    const hoje = new Date();
    const mesReferencia = hoje.toISOString().slice(0, 7); // YYYY-MM

    // Calcular datas de fechamento e vencimento
    const dataFechamento = this.calcularDataFechamento(
      cartao.diaFechamento,
      mesReferencia
    );
    const dataVencimento = this.calcularDataVencimento(
      cartao.diaVencimento,
      mesReferencia
    );

    return await db.fatura.upsert({
      where: {
        cartaoId_mesReferencia: {
          cartaoId,
          mesReferencia,
        },
      },
      create: {
        cartaoId,
        mesReferencia,
        dataFechamento,
        dataVencimento,
        status: "ABERTA",
      },
      update: {},
    });
  }

  // Calcular data de fechamento
  static calcularDataFechamento(
    diaFechamento: number | null,
    mesReferencia: string
  ) {
    if (!diaFechamento) diaFechamento = 1;

    const [ano, mes] = mesReferencia.split("-").map(Number);
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();
    const dia = Math.min(diaFechamento, ultimoDiaMes);

    return new Date(ano, mes - 1, dia);
  }

static calcularDataVencimento(
  diaVencimento: number | null,
  mesReferencia: string
) {
  if (!diaVencimento) diaVencimento = 10;

  const [ano, mes] = mesReferencia.split("-").map(Number);
  
  // 🔥 Vencimento no MESMO mês da referência
  const mesVencimento = mes;
  const anoVencimento = ano;

  const ultimoDiaMes = new Date(anoVencimento, mesVencimento, 0).getDate();
  const dia = Math.min(diaVencimento, ultimoDiaMes);

  return new Date(anoVencimento, mesVencimento - 1, dia);
}

  // Atualizar valor total da fatura
// Atualizar valor total da fatura
static async atualizarValorFatura(faturaId: string) {
  const lancamentos = await db.lancamento.findMany({
    where: {
      faturaId,
      pago: false,
    },
  });

  // 🔥 CORREÇÃO: Considerar RECEITAS como negativas e DESPESAS como positivas
  const valorTotal = lancamentos.reduce((sum, lanc) => {
    if (lanc.tipo === "RECEITA") {
      return sum - lanc.valor; // Receitas diminuem o total da fatura
    } else {
      return sum + lanc.valor; // Despesas aumentam o total da fatura
    }
  }, 0);

  await db.fatura.update({
    where: { id: faturaId },
    data: { valorTotal },
  });

  console.log(`💰 Fatura ${faturaId} atualizada: ${valorTotal}`);
}

  // Fechar fatura do mês anterior e criar nova
  static async fecharFaturasVencidas() {
    const hoje = new Date();
    const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesReferenciaPassado = mesPassado.toISOString().slice(0, 7);

    const faturasAbertas = await db.fatura.findMany({
      where: {
        mesReferencia: mesReferenciaPassado,
        status: "ABERTA",
      },
      include: {
        cartao: true,
      },
    });

    for (const fatura of faturasAbertas) {
      await db.fatura.update({
        where: { id: fatura.id },
        data: {
          status: "FECHADA",
          dataFechamento: new Date(),
        },
      });

      // Criar fatura do próximo mês
      const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const proximoMesReferencia = proximoMes.toISOString().slice(0, 7);

      await this.obterFaturaAtual(fatura.cartaoId);
    }
  }

  // Pagar fatura
  static async pagarFatura(
    faturaId: string,
    valor: number,
    metodo: string,
    userId: string
  ) {
    const fatura = await db.fatura.findUnique({
      where: { id: faturaId },
      include: { lancamentos: true },
    });

    if (!fatura) {
      throw new Error("Fatura não encontrada");
    }

    // Criar registro de pagamento
    await db.pagamentoFatura.create({
      data: {
        faturaId,
        valor,
        metodo,
        userId,
        observacoes: `Pagamento da fatura ${fatura.mesReferencia}`,
      },
    });

    // Atualizar valor pago
    const novoValorPago = fatura.valorPago + valor;
    const status = novoValorPago >= fatura.valorTotal ? "PAGA" : "FECHADA";

    await db.fatura.update({
      where: { id: faturaId },
      data: {
        valorPago: novoValorPago,
        status,
      },
    });

    // Se a fatura foi totalmente paga, marcar lançamentos como pagos
    if (status === "PAGA") {
      await db.lancamento.updateMany({
        where: { faturaId },
        data: { pago: true },
      });
    }

    return fatura;
  }

  // Obter resumo do cartão
  static async obterResumoCartao(cartaoId: string) {
    const cartao = await db.cartao.findUnique({
      where: { id: cartaoId },
      include: {
        Fatura: {
          where: {
            status: { in: ["ABERTA", "FECHADA"] },
          },
          orderBy: { mesReferencia: "desc" },
          take: 1,
        },
        lancamentos: {
          where: {
            pago: false,
            Fatura: {
              status: { in: ["ABERTA", "FECHADA"] },
            },
          },
          include: {
            Fatura: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!cartao) {
      throw new Error("Cartão não encontrado");
    }

    const faturaAtual = cartao.Fatura[0];
    const totalGasto = cartao.lancamentos.reduce(
      (sum: number, lanc: any) => sum + lanc.valor,
      0
    );
    const limiteDisponivel = (cartao.limite || 0) - totalGasto;
    const utilizacaoLimite = (totalGasto / (cartao.limite || 1)) * 100;

    return {
      cartao,
      faturaAtual,
      totalGasto,
      limiteDisponivel,
      utilizacaoLimite: Math.min(utilizacaoLimite, 100),
    };
  }
}
