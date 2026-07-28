import db from "@/lib/db"
import { parsePgdasPdf } from "@/lib/pgdas/parser"
import {
  detectarComprovantePagamento,
  parseComprovantesDeTexto,
} from "@/lib/comprovante-pagamento-parser"
import { detectarDctfWeb, parseDctfWebDeTexto } from "@/lib/dctfweb-parser"
import {
  detectarFontesPagadoras,
  parseFontesPagadorasDeTexto,
} from "@/lib/fontes-pagadoras-parser"
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

// Merge de uma chave do cadastro (consultaCnpj/qsa/simplesNacional) preservando as demais — cada
// documento enviado atualiza só a sua parte.
async function salvarCadastro(projetoId: string, cnpjCliente: string, parcial: DadosCadastroEmpresa) {
  const existente = await db.cadastroEmpresa.findUnique({ where: { projetoId } })
  const dados = { ...((existente?.dados as object | null) ?? {}), ...parcial } as unknown as object
  await db.cadastroEmpresa.upsert({
    where: { projetoId },
    create: { projetoId, cnpj: cnpjCliente, dados },
    update: { dados },
  })
}

export type ResultadoProcessarPdf =
  // `avisos`: só usado pelo Comprovante de Arrecadação — um PDF pode ter VÁRIOS DARFs, alguns
  // com CNPJ que não bate com o cliente selecionado; esses viram avisos por-DARF sem impedir os
  // demais DARFs do mesmo arquivo de serem salvos (granularidade é o DARF, não o arquivo).
  | { ok: true; tipo: "PGDAS" | "COMPROVANTE" | "DCTFWEB" | "FONTES" | "CADASTRO"; detalhe: string; avisos?: string[] }
  | { ok: false; motivo: string }

// Dispatch por-arquivo de um PDF (Declaração/Extrato PGDAS, Comprovante de Arrecadação de DARF,
// DCTFWeb, Fontes Pagadoras, Cadastro CNPJ/QSA/Consulta Optantes) — mesma lógica de
// detecção-por-conteúdo/parsing/persistência que vivia direto em
// src/app/api/recuperacao-credito/pdf/upload/route.ts, extraída sem alteração de regra pra ser
// reaproveitada tanto pelo upload direto (FormData, ainda usado como fallback) quanto pelo fluxo
// de upload via Storage (processar-storage) — ver docs/recuperacao-credito.md.
export async function processarArquivoPdfRecuperacaoCredito(
  file: File,
  projeto: { id: string },
  cliente: { cnpj: string }
): Promise<ResultadoProcessarPdf> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, motivo: "Apenas arquivos PDF são aceitos" }
  }

  const uint8 = new Uint8Array(await file.arrayBuffer())
  const { extractText } = await import("unpdf")
  const { text } = await extractText(uint8, { mergePages: true })
  const textoBruto = Array.isArray(text) ? text.join(" ") : text

  if (detectarFontesPagadoras(textoBruto)) {
    const dados = parseFontesPagadorasDeTexto(textoBruto, file.name)
    if (!dados) return { ok: false, motivo: "Não foi possível ler o relatório de Fontes Pagadoras" }
    if (somenteDigitos(dados.cnpjBeneficiario) !== somenteDigitos(cliente.cnpj)) {
      return {
        ok: false,
        motivo: `CNPJ do beneficiário (${dados.cnpjBeneficiario}) não corresponde ao cliente selecionado (${cliente.cnpj})`,
      }
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
    return { ok: true, tipo: "FONTES", detalhe: dados.anoCalendario }
  }

  if (detectarDctfWeb(textoBruto)) {
    const dados = parseDctfWebDeTexto(textoBruto, file.name)
    if (!dados) return { ok: false, motivo: "Não foi possível ler o cabeçalho/débitos da DCTFWeb" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ da DCTFWeb (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    await db.declaracaoDctfWeb.upsert({
      where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
      create: { projetoId: projeto.id, competencia: dados.competencia, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
      update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    })
    return { ok: true, tipo: "DCTFWEB", detalhe: dados.periodoApuracao }
  }

  if (detectarComprovantePagamento(textoBruto)) {
    // reusa o texto já extraído acima (extrair o PDF de novo dobraria o tempo do arquivo)
    const darfs = parseComprovantesDeTexto(textoBruto, file.name)
    if (darfs.length === 0) return { ok: false, motivo: "Não foi possível extrair nenhum DARF do comprovante" }

    const avisos: string[] = []
    const validos = darfs.filter((darf) => {
      if (somenteDigitos(darf.cnpj) !== somenteDigitos(cliente.cnpj)) {
        avisos.push(`CNPJ do DARF ${darf.numeroDocumento} (${darf.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})`)
        return false
      }
      return true
    })

    // Grava em lote (1 findMany + 1 createMany + updates só dos repetidos) em vez de 1 upsert por
    // DARF — com ~50 DARFs por PDF e banco remoto, upserts sequenciais eram o gargalo do upload.
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

    return { ok: true, tipo: "COMPROVANTE", detalhe: `${validos.length} DARF(s)`, avisos: avisos.length > 0 ? avisos : undefined }
  }

  if (detectarConsultaCnpj(textoBruto)) {
    const dados = parseConsultaCnpjDeTexto(textoBruto, file.name)
    if (!dados) return { ok: false, motivo: "Não foi possível ler o Comprovante de Inscrição (Consulta CNPJ)" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ da Consulta CNPJ (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    await salvarCadastro(projeto.id, cliente.cnpj, { consultaCnpj: dados })
    return { ok: true, tipo: "CADASTRO", detalhe: `Consulta CNPJ (${dados.nomeEmpresarial})` }
  }

  if (detectarQsa(textoBruto)) {
    const dados = parseQsaDeTexto(textoBruto, file.name)
    if (!dados) return { ok: false, motivo: "Não foi possível ler o QSA (Dados Cadastrais)" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ do QSA (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    await salvarCadastro(projeto.id, cliente.cnpj, { qsa: dados })
    return { ok: true, tipo: "CADASTRO", detalhe: `QSA (${dados.socios.length} sócio(s))` }
  }

  if (textoBruto.trim().length < 50 || detectarConsultaOptantes(textoBruto)) {
    // PDF sem camada de texto (escaneado) ou com marcadores da Consulta Optantes: vai pra IA. Sem
    // validação dura de CNPJ aqui — OCR de documento escaneado pode errar um dígito, e o cliente
    // já está fixado pelo projeto selecionado.
    const uint8ParaIA = new Uint8Array(await file.arrayBuffer())
    const resultado = await extrairSimplesNacionalViaIA(uint8ParaIA, file.name)
    if (!resultado.ok) return { ok: false, motivo: resultado.erro }
    await salvarCadastro(projeto.id, cliente.cnpj, { simplesNacional: resultado.dados })
    return { ok: true, tipo: "CADASTRO", detalhe: `Simples Nacional (${resultado.dados.situacao})` }
  }

  const resultado = await parsePgdasPdf(uint8, file.name)
  if (!resultado.ok) return { ok: false, motivo: resultado.erro }

  const { dados } = resultado
  if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
    return { ok: false, motivo: `CNPJ do PDF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
  }

  await db.declaracaoPgdas.upsert({
    where: { projetoId_competencia_tipoDocumento: { projetoId: projeto.id, competencia: dados.competencia, tipoDocumento: dados.tipoDocumento } },
    create: {
      projetoId: projeto.id,
      competencia: dados.competencia,
      tipoDocumento: dados.tipoDocumento,
      cnpj: dados.cnpj,
      arquivoNome: file.name,
      dados: dados as unknown as object,
    },
    update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
  })

  return { ok: true, tipo: "PGDAS", detalhe: `${dados.competencia} (${dados.tipoDocumento})` }
}
