// app/api/metas/[id]/contribuir/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../../auth";
import db from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const {
      valor,
      lancarComoDespesa = true,
      categoriaId,
    } = await request.json();

    if (!valor || valor <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Buscar a meta
    const meta = await db.metaPessoal.findFirst({
      where: {
        id: id,
        OR: [
          { userId: session.user.id },
          { ColaboradorMeta: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!meta) {
      return NextResponse.json(
        { error: "Meta não encontrada" },
        { status: 404 }
      );
    }

    let lancamento = null;

    // Criar lançamento de despesa se solicitado
    if (lancarComoDespesa) {
      // SEMPRE usar a categoria "Metas" para contribuições de metas
      let categoriaMetas = await db.categoria.findFirst({
        where: {
          userId: session.user.id,
          nome: "Metas",
          tipo: "DESPESA",
        },
      });

      // Se não existe, criar a categoria "Metas"
      if (!categoriaMetas) {
        categoriaMetas = await db.categoria.create({
          data: {
            nome: "Metas",
            tipo: "DESPESA",
            cor: "#8B5CF6",
            icone: "Target", 
            userId: session.user.id,
          },
        });
      }

      // Criar lançamento de despesa na categoria "Metas"
      lancamento = await db.lancamento.create({
        data: {
          descricao: `Contribuição para meta: ${meta.titulo}`,
          valor: parseFloat(valor),
          tipo: "DESPESA",
          metodoPagamento: "PIX",
          data: new Date(),
          categoriaId: categoriaMetas.id, // ✅ Sempre categoria "Metas"
          userId: session.user.id,
          pago: true,
          observacoes: `Contribuição para meta "${meta.titulo}"`,
        },
      });
    }

    // Atualizar valor da meta
    const novoValorAtual = meta.valorAtual + parseFloat(valor);
    const metaAtualizada = await db.metaPessoal.update({
      where: { id: id },
      data: { valorAtual: novoValorAtual },
    });

    // Registrar contribuição (se for colaborador)
    if (meta.userId !== session.user.id) {
      await db.contribuicaoMeta.create({
        data: {
          metaId: id,
          userId: session.user.id,
          valor: parseFloat(valor),
          descricao: `Contribuição para a meta "${meta.titulo}"`,
        },
      });
    }

    return NextResponse.json({
      meta: metaAtualizada,
      lancamento: lancamento,
    });
  } catch (error) {
    console.error("Erro ao contribuir para meta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
