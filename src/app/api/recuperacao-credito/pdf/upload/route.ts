import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import db from "@/lib/db";
import { processarArquivoPdfRecuperacaoCredito } from "@/lib/recuperacao-credito/processar-pdf";

// POST — upload de 1+ PDFs (Declaração/Extrato PGDAS, Comprovante de Arrecadação de DARF,
// DCTFWeb, Fontes Pagadoras, Cadastro CNPJ/QSA/Consulta Optantes). Detecta o tipo de cada arquivo
// pelo conteúdo e persiste no model certo — a lógica de dispatch em si vive em
// src/lib/recuperacao-credito/processar-pdf.ts (reaproveitada também pelo fluxo de upload via
// Storage, ver .../pdf/processar-storage/route.ts). Falhas são por-arquivo: um PDF ruim não
// impede os outros de serem salvos.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const projetoId = formData.get("projetoId") as string | null;
  const files = formData.getAll("files") as File[];

  if (!projetoId) {
    return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const projeto = await db.projetoRecuperacaoCredito.findFirst({
    where: { id: projetoId, cliente: { userId: session.user.id } },
    include: { cliente: true },
  });
  if (!projeto) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }
  const cliente = projeto.cliente;

  const salvos: {
    arquivoNome: string;
    tipo: "PGDAS" | "COMPROVANTE" | "DCTFWEB" | "FONTES" | "CADASTRO";
    detalhe: string;
  }[] = [];
  const erros: { arquivo: string; motivo: string }[] = [];

  for (const file of files) {
    try {
      const resultado = await processarArquivoPdfRecuperacaoCredito(file, projeto, cliente);
      if (resultado.ok) {
        salvos.push({ arquivoNome: file.name, tipo: resultado.tipo, detalhe: resultado.detalhe });
        for (const aviso of resultado.avisos ?? []) erros.push({ arquivo: file.name, motivo: aviso });
      } else {
        erros.push({ arquivo: file.name, motivo: resultado.motivo });
      }
    } catch (e) {
      erros.push({
        arquivo: file.name,
        motivo: e instanceof Error ? e.message : "Erro ao processar arquivo",
      });
    }
  }

  return NextResponse.json({ salvos, erros });
}
