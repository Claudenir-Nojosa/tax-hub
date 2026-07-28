import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { processarArquivoEfdRecuperacaoCredito } from "@/lib/recuperacao-credito/processar-efd"

// POST — upload de 1+ arquivos fiscais em texto (.txt EFD/ECF ou .dec DCTF). Detecta
// automaticamente se cada arquivo é um EFD ICMS/IPI, EFD Contribuições (PIS/COFINS), ECF
// (IRPJ/CSLL) ou DCTF (.dec) pelo conteúdo e grava no model certo — a lógica de dispatch em si
// vive em src/lib/recuperacao-credito/processar-efd.ts (reaproveitada também pelo fluxo de
// upload via Storage, ver .../efd/processar-storage/route.ts). EFDs/DCTF: 1 arquivo = 1
// competência (mês); ECF: 1 arquivo = 1 ano-calendário. Falhas são por-arquivo: um arquivo ruim
// não impede os outros de serem salvos.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const formData = await req.formData()
  const projetoId = formData.get("projetoId") as string | null
  const files = formData.getAll("files") as File[]

  if (!projetoId) {
    return NextResponse.json({ error: "projetoId é obrigatório" }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  const projeto = await db.projetoRecuperacaoCredito.findFirst({
    where: { id: projetoId, cliente: { userId: session.user.id } },
    include: { cliente: true },
  })
  if (!projeto) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  }
  const cliente = projeto.cliente

  const salvos: { competencia: string; arquivoNome: string; tipo: "ICMS_IPI" | "CONTRIBUICOES" | "ECF" | "DCTF" | "ECD" }[] = []
  const erros: { arquivo: string; motivo: string }[] = []

  for (const file of files) {
    try {
      const resultado = await processarArquivoEfdRecuperacaoCredito(file, projeto, cliente)
      if (resultado.ok) {
        salvos.push({ competencia: resultado.competencia, arquivoNome: file.name, tipo: resultado.tipo })
      } else {
        erros.push({ arquivo: file.name, motivo: resultado.motivo })
      }
    } catch (e) {
      erros.push({ arquivo: file.name, motivo: e instanceof Error ? e.message : "Erro ao processar arquivo" })
    }
  }

  return NextResponse.json({ salvos, erros })
}
