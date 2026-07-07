// Parser da DCTFWeb — "Relatório da Declaração Completa" (PDF gerado pelo portal da RFB), texto
// extraído via unpdf, determinístico (regex, sem IA). 1 PDF = 1 período de apuração (mês); dentro
// dele, N débitos declarados (um por código de receita). Roda no servidor, dentro do endpoint
// unificado de upload de PDF (mesmo do PGDAS/Comprovante).
//
// Espelha a planilha de referência do usuário: o relatório NÃO traz uma coluna de valor por
// código na visão final — o que interessa é QUAIS débitos foram declarados (código + descrição +
// período do débito). Mesmo assim guardamos débitoApurado/saldoAPagar no JSON (existem no PDF)
// caso sejam úteis depois; o Excel só não os exibe, pra ficar igual à referência.

import { labelTributo } from "./comprovante-pagamento-parser"

export interface DebitoDctfWeb {
  codigoReceita: string // "1082-01"
  descricao: string // "CP SEGURADOS - EMPREGADOS/AVULSO"
  tributo: string | null // "PIS"/"COFINS"/"IRPJ"/"CSLL" (só p/ os 4 códigos principais) ou null
  periodoApuracaoDebito: string // "01/2025" ou "1º Trimestre/2025"
  debitoApurado: number
  // texto cru dos créditos vinculados quando existem (ex.: "Pagamento: 5.772,23") — aparece
  // entre o Débito Apurado e o Saldo a Pagar em débitos parcialmente quitados/compensados
  creditosVinculados?: string
  saldoAPagar: number
}

export interface DadosDctfWeb {
  nomeContribuinte: string
  cnpj: string
  periodoApuracao: string // "MM/YYYY" como impresso
  competencia: string // "YYYY-MM" (chave de ordenação/persistência)
  numeroRecibo: string
  dataHoraTransmissao: string // "DD/MM/AAAA HH:MM:SS"
  identificacaoApuracao: string // "30453562296 / ESOCIAL ... / MIT ... / REINF ..."
  arquivoNome: string
  debitos: DebitoDctfWeb[]
}

function parseNumeroBR(raw: string | undefined): number {
  if (!raw) return 0
  const v = parseFloat(raw.trim().replace(/\./g, "").replace(",", "."))
  return Number.isFinite(v) ? v : 0
}

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "")
}

// Âncora exclusiva do relatório de DCTFWeb (distingue de PGDAS e Comprovante no mesmo upload).
export function detectarDctfWeb(texto: string): boolean {
  return /RELAT[ÓO]RIO DA DECLARA[ÇC][ÃA]O COMPLETA\s*-\s*DCTFWeb/i.test(texto)
}

function grupoTag(texto: string, regex: RegExp): string {
  return texto.match(regex)?.[1]?.trim() ?? ""
}

export function parseDctfWebDeTexto(textoBruto: string, arquivoNome: string): DadosDctfWeb | null {
  const texto = textoBruto.replace(/\s+/g, " ").trim()
  if (!detectarDctfWeb(texto)) return null

  const nomeContribuinte = grupoTag(texto, /Nome do Contribuinte (.+?) CNPJ/i)
  const cnpj = somenteDigitos(grupoTag(texto, /CNPJ ([\d./-]+) Per[íi]odo apura[çc][ãa]o/i))
  const periodoApuracao = grupoTag(texto, /Per[íi]odo apura[çc][ãa]o (\d{2}\/\d{4})/i)
  const numeroRecibo = grupoTag(texto, /N[úu]mero do Recibo (\d+)/i)
  const dataHoraTransmissao = grupoTag(texto, /Data\/Hora da Transmiss[ãa]o (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/i)
  // uppercased pra bater com a referência do usuário (o PDF traz "eSocial"/"Reinf")
  const identificacaoApuracao = grupoTag(texto, /Identifica[çc][ãa]o da Apura[çc][ãa]o de D[ée]bitos (.+?) Dados Iniciais/i).toUpperCase()

  let competencia = ""
  const mp = periodoApuracao.match(/^(\d{2})\/(\d{4})$/)
  if (mp) competencia = `${mp[2]}-${mp[1]}`

  // Cada débito começa com "Débito Apurado e Crédito Vinculado"
  const blocos = texto.split(/D[ée]bito Apurado e Cr[ée]dito Vinculado/i).slice(1)
  const debitos: DebitoDctfWeb[] = []
  // Entre "Débito Apurado" e "Saldo a Pagar" pode existir um bloco "Créditos ..." (ex.:
  // "Créditos Pagamento: 5.772,23" nos IRPJ/CSLL trimestrais pagos por quota) — sem o grupo
  // opcional, esses débitos eram silenciosamente pulados (bug real: 1º tri/2025 da CORE).
  const RE =
    /C[óo]digo da Receita (\S+) Descri[çc][ãa]o (.+?) Per[íi]odo Apura[çc][ãa]o D[ée]bito (.+?) D[ée]bito Apurado ([\d.,]+)(?: Cr[ée]ditos (.+?))? Saldo a Pagar ([\d.,]+)/i
  for (const bloco of blocos) {
    const m = bloco.match(RE)
    if (!m) continue
    const codigoReceita = m[1].trim()
    const prefixo = codigoReceita.split("-")[0]
    debitos.push({
      codigoReceita,
      descricao: m[2].trim(),
      tributo: labelTributo(prefixo),
      periodoApuracaoDebito: m[3].trim(),
      debitoApurado: parseNumeroBR(m[4]),
      ...(m[5] ? { creditosVinculados: m[5].trim() } : {}),
      saldoAPagar: parseNumeroBR(m[6]),
    })
  }

  if (!cnpj || !competencia || debitos.length === 0) return null

  return {
    nomeContribuinte,
    cnpj,
    periodoApuracao,
    competencia,
    numeroRecibo,
    dataHoraTransmissao,
    identificacaoApuracao,
    arquivoNome,
    debitos,
  }
}

export async function processarArquivosDctfWeb(files: File[]): Promise<DadosDctfWeb[]> {
  const { extractText } = await import("unpdf")
  const resultados: DadosDctfWeb[] = []
  for (const file of files) {
    const uint8 = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(uint8, { mergePages: true })
    const textoBruto = Array.isArray(text) ? text.join(" ") : text
    const dados = parseDctfWebDeTexto(textoBruto, file.name)
    if (dados) resultados.push(dados)
  }
  return resultados
}
