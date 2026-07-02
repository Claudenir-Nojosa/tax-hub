import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { parsePgdasPdf } from "@/lib/pgdas/parser"
import { detectarComprovantePagamento, parseComprovantesDeTexto } from "@/lib/comprovante-pagamento-parser"
import { detectarDctfWeb, parseDctfWebDeTexto } from "@/lib/dctfweb-parser"

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "")
}

// POST — upload de 1+ PDFs (Declaração/Extrato PGDAS ou Comprovante de Arrecadação de DARF),
// detecta o tipo de cada arquivo pelo conteúdo (mesmo padrão do endpoint unificado de EFD — ver
// src/app/api/recuperacao-credito/efd/upload/route.ts) e persiste no model certo. Falhas são
// por-arquivo: um PDF ruim não impede os outros de serem salvos.
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

  const salvos: { arquivoNome: string; tipo: "PGDAS" | "COMPROVANTE" | "DCTFWEB"; detalhe: string }[] = []
  const erros: { arquivo: string; motivo: string }[] = []

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      erros.push({ arquivo: file.name, motivo: "Apenas arquivos PDF são aceitos" })
      continue
    }

    try {
      const uint8 = new Uint8Array(await file.arrayBuffer())
      const { extractText } = await import("unpdf")
      const { text } = await extractText(uint8, { mergePages: true })
      const textoBruto = Array.isArray(text) ? text.join(" ") : text

      if (detectarDctfWeb(textoBruto)) {
        const dados = parseDctfWebDeTexto(textoBruto, file.name)
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o cabeçalho/débitos da DCTFWeb" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ da DCTFWeb (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }

        await db.declaracaoDctfWeb.upsert({
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

        salvos.push({ arquivoNome: file.name, tipo: "DCTFWEB", detalhe: dados.periodoApuracao })
      } else if (detectarComprovantePagamento(textoBruto)) {
        // reusa o texto já extraído acima (extrair o PDF de novo dobraria o tempo do arquivo)
        const darfs = parseComprovantesDeTexto(textoBruto, file.name)
        if (darfs.length === 0) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível extrair nenhum DARF do comprovante" })
          continue
        }

        const validos = darfs.filter((darf) => {
          if (somenteDigitos(darf.cnpj) !== somenteDigitos(cliente.cnpj)) {
            erros.push({
              arquivo: file.name,
              motivo: `CNPJ do DARF ${darf.numeroDocumento} (${darf.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
            })
            return false
          }
          return true
        })

        // Grava em lote (1 findMany + 1 createMany + updates só dos repetidos) em vez de 1 upsert
        // por DARF — com ~50 DARFs por PDF e banco remoto, upserts sequenciais eram o gargalo do
        // upload inteiro.
        const numeros = validos.map((d) => d.numeroDocumento)
        const existentes = await db.declaracaoComprovantePagamento.findMany({
          where: { projetoId: projeto.id, numeroDocumento: { in: numeros } },
          select: { numeroDocumento: true },
        })
        const setExistentes = new Set(existentes.map((e) => e.numeroDocumento))

        const novos = validos.filter((d) => !setExistentes.has(d.numeroDocumento))
        const repetidos = validos.filter((d) => setExistentes.has(d.numeroDocumento))

        if (novos.length > 0) {
          await db.declaracaoComprovantePagamento.createMany({
            data: novos.map((darf) => ({
              projetoId: projeto.id,
              numeroDocumento: darf.numeroDocumento,
              cnpj: darf.cnpj,
              arquivoNome: file.name,
              dados: darf as unknown as object,
            })),
          })
        }
        if (repetidos.length > 0) {
          await db.$transaction(
            repetidos.map((darf) =>
              db.declaracaoComprovantePagamento.update({
                where: { projetoId_numeroDocumento: { projetoId: projeto.id, numeroDocumento: darf.numeroDocumento } },
                data: { cnpj: darf.cnpj, arquivoNome: file.name, dados: darf as unknown as object },
              })
            )
          )
        }

        salvos.push({ arquivoNome: file.name, tipo: "COMPROVANTE", detalhe: `${validos.length} DARF(s)` })
      } else {
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
            projetoId_competencia_tipoDocumento: {
              projetoId: projeto.id,
              competencia: dados.competencia,
              tipoDocumento: dados.tipoDocumento,
            },
          },
          create: {
            projetoId: projeto.id,
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

        salvos.push({ arquivoNome: file.name, tipo: "PGDAS", detalhe: `${dados.competencia} (${dados.tipoDocumento})` })
      }
    } catch (e) {
      erros.push({ arquivo: file.name, motivo: e instanceof Error ? e.message : "Erro ao processar arquivo" })
    }
  }

  return NextResponse.json({ salvos, erros })
}
