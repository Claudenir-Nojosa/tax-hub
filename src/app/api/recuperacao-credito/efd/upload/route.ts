import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { processarArquivosEfd } from "@/lib/efd-icms-parser"
import { detectarTipoEfd, processarArquivosEfdContribuicoes } from "@/lib/efd-contribuicoes-parser"
import { processarArquivosEcf, temBlocoPresumido } from "@/lib/ecf-parser"
import { detectarDctf, processarArquivosDctf } from "@/lib/dctf-parser"

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "")
}

// POST — upload de 1+ arquivos fiscais em texto (.txt EFD/ECF ou .dec DCTF). Detecta
// automaticamente se cada arquivo é um EFD ICMS/IPI, EFD Contribuições (PIS/COFINS), ECF
// (IRPJ/CSLL) ou DCTF (.dec) pelo conteúdo e grava no model certo. EFDs/DCTF: 1 arquivo = 1
// competência (mês); ECF: 1 arquivo = 1 ano-calendário.
// Falhas são por-arquivo: um arquivo ruim não impede os outros de serem salvos.
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

  const salvos: { competencia: string; arquivoNome: string; tipo: "ICMS_IPI" | "CONTRIBUICOES" | "ECF" | "DCTF" }[] = []
  const erros: { arquivo: string; motivo: string }[] = []

  for (const file of files) {
    const nomeLower = file.name.toLowerCase()
    if (!nomeLower.endsWith(".txt") && !nomeLower.endsWith(".dec")) {
      erros.push({ arquivo: file.name, motivo: "Apenas arquivos .txt (EFD/ECF) ou .dec (DCTF) são aceitos" })
      continue
    }

    try {
      const conteudo = await file.text()

      if (detectarDctf(conteudo)) {
        const [dados] = await processarArquivosDctf([file])
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler os débitos da DCTF (.dec)" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ da DCTF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }
        await db.declaracaoDctf.upsert({
          where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
          create: {
            projetoId: projeto.id,
            competencia: dados.competencia,
            cnpj: dados.cnpj,
            arquivoNome: file.name,
            dados: dados as unknown as object,
          },
          update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
        })
        salvos.push({ competencia: dados.competencia, arquivoNome: file.name, tipo: "DCTF" })
        continue
      }

      const tipo = detectarTipoEfd(conteudo)

      if (!tipo) {
        erros.push({ arquivo: file.name, motivo: "Não foi possível identificar o tipo do arquivo (EFD ICMS/IPI, EFD Contribuições, ECF ou DCTF)" })
        continue
      }

      if (tipo === "ECF") {
        const [dados] = await processarArquivosEcf([file])
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o registro 0000 (cabeçalho) da ECF" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ da ECF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }
        if (!temBlocoPresumido(dados)) {
          erros.push({
            arquivo: file.name,
            motivo:
              "ECF sem apuração de Lucro Presumido (bloco P) — a apuração via bloco N (Lucro Real) ainda não é suportada",
          })
          continue
        }

        await db.declaracaoEcf.upsert({
          where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.anoCalendario } },
          create: {
            projetoId: projeto.id,
            competencia: dados.anoCalendario,
            cnpj: dados.cnpj,
            arquivoNome: file.name,
            dados: dados as unknown as object,
          },
          update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
        })

        salvos.push({ competencia: dados.anoCalendario, arquivoNome: file.name, tipo: "ECF" })
      } else if (tipo === "ICMS_IPI") {
        const [dados] = await processarArquivosEfd([file])
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o registro 0000 (cabeçalho) do EFD" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ do EFD (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }

        await db.declaracaoEfdIcmsIpi.upsert({
          where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
          create: {
            projetoId: projeto.id,
            competencia: dados.competencia,
            cnpj: dados.cnpj,
            arquivoNome: file.name,
            dados: dados as unknown as object,
          },
          update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
        })

        salvos.push({ competencia: dados.competencia, arquivoNome: file.name, tipo: "ICMS_IPI" })
      } else {
        const [dados] = await processarArquivosEfdContribuicoes([file])
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o registro 0000 (cabeçalho) do EFD" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ do EFD (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }

        await db.declaracaoEfdContribuicoes.upsert({
          where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
          create: {
            projetoId: projeto.id,
            competencia: dados.competencia,
            cnpj: dados.cnpj,
            arquivoNome: file.name,
            dados: dados as unknown as object,
          },
          update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
        })

        salvos.push({ competencia: dados.competencia, arquivoNome: file.name, tipo: "CONTRIBUICOES" })
      }
    } catch (e) {
      erros.push({ arquivo: file.name, motivo: e instanceof Error ? e.message : "Erro ao processar arquivo" })
    }
  }

  return NextResponse.json({ salvos, erros })
}
