import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { parsePgdasPdf } from "@/lib/pgdas/parser"

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "")
}

// POST — upload de 1+ PDFs (Declaração/Extrato PGDAS), auto-detectados e persistidos por mês.
// Falhas são por-arquivo: um PDF ruim não impede os outros de serem salvos.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const formData = await req.formData()
  const clienteId = formData.get("clienteId") as string | null
  const files = formData.getAll("files") as File[]

  if (!clienteId) {
    return NextResponse.json({ error: "clienteId é obrigatório" }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  const cliente = await db.clienteRecuperacaoCredito.findFirst({
    where: { id: clienteId, userId: session.user.id },
  })
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  }

  const salvos: { competencia: string; tipoDocumento: string; arquivoNome: string }[] = []
  const erros: { arquivo: string; motivo: string }[] = []

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      erros.push({ arquivo: file.name, motivo: "Apenas arquivos PDF são aceitos" })
      continue
    }

    try {
      const uint8 = new Uint8Array(await file.arrayBuffer())
      const resultado = await parsePgdasPdf(uint8, file.name)

      if (!resultado.ok) {
        erros.push({ arquivo: file.name, motivo: resultado.erro })
        continue
      }

      const { dados } = resultado
      if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
        erros.push({
          arquivo: file.name,
          motivo: `CNPJ do PDF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
        })
        continue
      }

      await db.declaracaoPgdas.upsert({
        where: {
          clienteId_competencia_tipoDocumento: {
            clienteId: cliente.id,
            competencia: dados.competencia,
            tipoDocumento: dados.tipoDocumento,
          },
        },
        create: {
          clienteId: cliente.id,
          competencia: dados.competencia,
          tipoDocumento: dados.tipoDocumento,
          cnpj: dados.cnpj,
          arquivoNome: file.name,
          dados: dados as unknown as object,
        },
        update: {
          cnpj: dados.cnpj,
          arquivoNome: file.name,
          dados: dados as unknown as object,
        },
      })

      salvos.push({ competencia: dados.competencia, tipoDocumento: dados.tipoDocumento, arquivoNome: file.name })
    } catch (e) {
      erros.push({ arquivo: file.name, motivo: e instanceof Error ? e.message : "Erro ao processar arquivo" })
    }
  }

  return NextResponse.json({ salvos, erros })
}
