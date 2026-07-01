import type { DadosPgdas, ParsePgdasResult } from "./types"
import { extrairCompetencia, normalizarTexto } from "./text-utils"
import { detectarTipoDocumento } from "./detect"
import { extrairAtividades, extrairCabecalho, extrairDebitoGeral, extrairValoresMercado } from "./parser-comum"
import { extrairArrecadacaoDas, extrairDasGerado, extrairDasPagoAnterior } from "./parser-extrato"

export async function parsePgdasPdf(uint8: Uint8Array, nomeArquivo: string): Promise<ParsePgdasResult> {
  const { extractText } = await import("unpdf")
  const { text } = await extractText(uint8, { mergePages: true })
  const textoBruto = Array.isArray(text) ? text.join(" ") : text
  const texto = normalizarTexto(textoBruto)

  const tipoDocumento = detectarTipoDocumento(texto)
  if (!tipoDocumento) {
    return { ok: false, erro: `Não foi possível identificar o tipo do documento (Declaração ou Extrato) em "${nomeArquivo}".` }
  }

  const { cnpj, razaoSocial } = extrairCabecalho(texto)
  const competencia = extrairCompetencia(texto)
  const periodoApuracaoLabel = texto.match(/Per[íi]odo de Apura[çc][ãa]o[^.]*?(?=\s{2,}|\.|CNPJ|1\))/i)?.[0] ?? ""

  const rpa = extrairValoresMercado(texto, /Receita Bruta do PA \(RPA\) - Compet[êe]ncia\s*/i)
  const rbt12 = extrairValoresMercado(texto, /Receita bruta acumulada nos doze meses anteriores ao PA \(RBT12\)\s*/i)
  const rba = extrairValoresMercado(texto, /Receita bruta acumulada no ano-calend[áa]rio corrente \(RBA\)\s*/i)

  const atividades = extrairAtividades(texto)
  const debitoGeral = extrairDebitoGeral(texto)

  const camposFaltantes: string[] = []
  if (!cnpj) camposFaltantes.push("CNPJ")
  if (!razaoSocial) camposFaltantes.push("Nome empresarial")
  if (!competencia) camposFaltantes.push("Período de apuração")
  if (!rbt12) camposFaltantes.push("RBT12")
  if (atividades.length === 0) camposFaltantes.push("Atividades/Receita bruta por atividade")

  if (camposFaltantes.length > 0) {
    return {
      ok: false,
      erro: `Não foi possível extrair todos os campos obrigatórios de "${nomeArquivo}".`,
      camposFaltantes,
    }
  }

  const dados: DadosPgdas = {
    tipoDocumento,
    cnpj,
    razaoSocial,
    competencia: competencia!,
    periodoApuracaoLabel,
    rbt12: rbt12!,
    rba: rba ?? { mercadoInterno: 0, mercadoExterno: 0, total: 0 },
    rpa: rpa ?? { mercadoInterno: 0, mercadoExterno: 0, total: 0 },
    atividades,
    debitoGeral,
  }

  if (tipoDocumento === "EXTRATO") {
    dados.dasPagoAnterior = extrairDasPagoAnterior(texto)
    dados.dasGerado = extrairDasGerado(texto)
    dados.arrecadacaoDas = extrairArrecadacaoDas(texto)
  }

  return { ok: true, dados }
}
