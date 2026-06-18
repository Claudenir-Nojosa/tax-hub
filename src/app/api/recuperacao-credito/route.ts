import { NextRequest, NextResponse } from "next/server";

// Stub — será implementado quando os tipos de arquivo forem definidos.
// Receberá multipart/form-data com os arquivos Excel e retornará ResultadoAnalise.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // TODO: processar arquivos Excel, extrair dados, enviar para IA
    // Por enquanto, retorna resultado de exemplo para validar o fluxo visual

    const resultado = {
      resumo:
        `${files.length} arquivo(s) recebido(s) para análise. A implementação completa será adicionada após a definição dos tipos de arquivo e dados esperados.`,
      totalEstimado: null as number | null,
      oportunidades: [] as {
        tipo: string;
        descricao: string;
        valorEstimado: number | null;
        prioridade: "alta" | "media" | "baixa";
        fundamentacao: string;
      }[],
      alertas: [
        "Implementação da análise de arquivos pendente — aguardando definição dos tipos de Excel.",
      ],
      proximosPassos: [
        "Definir quais arquivos serão aceitos e o que cada um representa.",
        "Implementar a leitura e extração de dados dos arquivos.",
        "Construir o prompt da IA com os dados extraídos.",
      ],
    };

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro na recuperação de crédito:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
