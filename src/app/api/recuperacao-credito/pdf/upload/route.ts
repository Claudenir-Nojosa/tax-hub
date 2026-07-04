import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import { parsePgdasPdf } from "@/lib/pgdas/parser"
import { detectarComprovantePagamento, parseComprovantesDeTexto } from "@/lib/comprovante-pagamento-parser"
import { detectarDctfWeb, parseDctfWebDeTexto } from "@/lib/dctfweb-parser"
import { detectarFontesPagadoras, parseFontesPagadorasDeTexto } from "@/lib/fontes-pagadoras-parser"
import {
  detectarConsultaCnpj,
  detectarConsultaOptantes,
  detectarQsa,
  parseConsultaCnpjDeTexto,
  parseQsaDeTexto,
  type DadosCadastroEmpresa,
} from "@/lib/cadastro-parser"
import { extrairSimplesNacionalViaIA } from "@/lib/cadastro-simples-ia"

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "")
}

// Merge de uma chave do cadastro (consultaCnpj/qsa/simplesNacional) preservando as demais —
// cada documento enviado atualiza só a sua parte.
async function salvarCadastro(
  projetoId: string,
  cnpjCliente: string,
  parcial: DadosCadastroEmpresa
) {
  const existente = await db.cadastroEmpresa.findUnique({ where: { projetoId } })
  const dados = { ...((existente?.dados as object | null) ?? {}), ...parcial } as unknown as object
  await db.cadastroEmpresa.upsert({
    where: { projetoId },
    create: { projetoId, cnpj: cnpjCliente, dados },
    update: { dados },
  })
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

  const salvos: {
    arquivoNome: string
    tipo: "PGDAS" | "COMPROVANTE" | "DCTFWEB" | "FONTES" | "CADASTRO"
    detalhe: string
  }[] = []
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

      if (detectarFontesPagadoras(textoBruto)) {
        const dados = parseFontesPagadorasDeTexto(textoBruto, file.name)
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o relatório de Fontes Pagadoras" })
          continue
        }
        if (somenteDigitos(dados.cnpjBeneficiario) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ do beneficiário (${dados.cnpjBeneficiario}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }
        await db.declaracaoFontesPagadoras.upsert({
          where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.anoCalendario } },
          create: {
            projetoId: projeto.id,
            competencia: dados.anoCalendario,
            cnpj: dados.cnpjBeneficiario,
            arquivoNome: file.name,
            dados: dados as unknown as object,
          },
          update: { cnpj: dados.cnpjBeneficiario, arquivoNome: file.name, dados: dados as unknown as object },
        })
        salvos.push({ arquivoNome: file.name, tipo: "FONTES", detalhe: dados.anoCalendario })
      } else if (detectarDctfWeb(textoBruto)) {
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
      } else if (detectarConsultaCnpj(textoBruto)) {
        const dados = parseConsultaCnpjDeTexto(textoBruto, file.name)
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o Comprovante de Inscrição (Consulta CNPJ)" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ da Consulta CNPJ (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }
        await salvarCadastro(projeto.id, cliente.cnpj, { consultaCnpj: dados })
        salvos.push({ arquivoNome: file.name, tipo: "CADASTRO", detalhe: `Consulta CNPJ (${dados.nomeEmpresarial})` })
      } else if (detectarQsa(textoBruto)) {
        const dados = parseQsaDeTexto(textoBruto, file.name)
        if (!dados) {
          erros.push({ arquivo: file.name, motivo: "Não foi possível ler o QSA (Dados Cadastrais)" })
          continue
        }
        if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
          erros.push({
            arquivo: file.name,
            motivo: `CNPJ do QSA (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
          })
          continue
        }
        await salvarCadastro(projeto.id, cliente.cnpj, { qsa: dados })
        salvos.push({ arquivoNome: file.name, tipo: "CADASTRO", detalhe: `QSA (${dados.socios.length} sócio(s))` })
      } else if (textoBruto.trim().length < 50 || detectarConsultaOptantes(textoBruto)) {
        // PDF sem camada de texto (escaneado) ou com marcadores da Consulta Optantes: vai pra IA.
        // Sem validação dura de CNPJ aqui — OCR de documento escaneado pode errar um dígito, e o
        // cliente já está fixado pelo projeto selecionado.
        const resultado = await extrairSimplesNacionalViaIA(uint8, file.name)
        if (!resultado.ok) {
          erros.push({ arquivo: file.name, motivo: resultado.erro })
          continue
        }
        await salvarCadastro(projeto.id, cliente.cnpj, { simplesNacional: resultado.dados })
        salvos.push({ arquivoNome: file.name, tipo: "CADASTRO", detalhe: `Simples Nacional (${resultado.dados.situacao})` })
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
