// Parser do relatório "Fontes Pagadoras" (DIRF, portal e-CAC da RFB) — PDF de texto via unpdf,
// determinístico (regex, sem IA). 1 PDF = 1 ano-calendário; dentro, N fontes pagadoras, cada uma
// com 1+ linhas por código de receita (1708 = IRRF, 5952 = CSLL/COFINS/PIS). Roda no servidor,
// dentro do endpoint unificado de upload de PDF.

export interface CodigoRetencaoFonte {
  codigo: string // "1708" | "5952"
  grupoTributo: string // "IRRF" | "CSLL/COFINS/PIS"
  descricaoDarf: string
  rendimento: number
  imposto: number
}

export interface FontePagadora {
  cnpj: string // só dígitos
  nome: string
  dataDirf: string // "DD/MM/AAAA" (data do processamento)
  rendimentoTributavel: number // total da fonte
  impostoRetido: number // total da fonte
  codigos: CodigoRetencaoFonte[]
}

export interface DadosFontesPagadoras {
  anoCalendario: string // "YYYY"
  cnpjBeneficiario: string
  nomeBeneficiario: string
  arquivoNome: string
  fontes: FontePagadora[]
}

function parseNumeroBR(raw: string | undefined): number {
  if (!raw) return 0
  const v = parseFloat(raw.trim().replace(/\./g, "").replace(",", "."))
  return Number.isFinite(v) ? v : 0
}

function somenteDigitos(v: string): string {
  return v.replace(/\D/g, "")
}

// código de receita -> grupo + descrição do DARF, exatamente como a planilha de referência do
// usuário mostra (todos os códigos vistos nos PDFs de 2021-2025).
const CODIGO_INFO: Record<string, { grupo: string; descricaoDarf: string }> = {
  "1708": { grupo: "IRRF", descricaoDarf: "IRRF - REMUNERAÇÃO DE SERVIÇOS PRESTADOS POR PESSOA JURÍDICA" },
  "3426": { grupo: "IRRF", descricaoDarf: "IRRF - APLICAÇÕES FINANCEIRAS DE RENDA FIXA - PJ" },
  "5952": { grupo: "CSLL/COFINS/PIS", descricaoDarf: "RETENÇÃO CONTRIBUIÇÕES PAGT DE PJ A PJ DIR PRIV - CSLL/COFINS/PIS" },
  "5960": { grupo: "COFINS", descricaoDarf: "COFINS - RETENÇÃO PGTO.S DE PJ A PJ DIREITO PRIVADO" },
  "5979": { grupo: "PIS", descricaoDarf: "PIS - RETENÇÃO PGTO.S DE PJ A PJ DIREITO PRIVADO" },
  "5987": { grupo: "CSLL", descricaoDarf: "CSLL - RETENÇÃO PGTO.S DE PJ A PJ DIREITO PRIVADO" },
  "6256": { grupo: "IRRF", descricaoDarf: "IRPJ - PGTO. EFETUADO POR ÓRGÃO PÚBLICO" },
}

// Âncora exclusiva do relatório de Fontes Pagadoras (distingue dos demais PDFs no upload).
export function detectarFontesPagadoras(texto: string): boolean {
  return /Rela[çc][ãa]o de rendimentos e reten[çc][õo]es informados por fontes pagadoras/i.test(texto)
}

const CNPJ_CPF = String.raw`(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})`
const NUM = String.raw`[\d.,]+`

export function parseFontesPagadorasDeTexto(textoBruto: string, arquivoNome: string): DadosFontesPagadoras | null {
  let texto = textoBruto.replace(/\s+/g, " ").trim()
  if (!detectarFontesPagadoras(texto)) return null

  // Cabeçalho do beneficiário e ano
  const cabecalho = texto.match(/Benefici[áa]rio:\s*([\d./-]+)\s*-\s*(.+?)\s+Fontes Pagadoras/i)
  const cnpjBeneficiario = somenteDigitos(cabecalho?.[1] ?? "")
  const nomeBeneficiario = (cabecalho?.[2] ?? "").trim()
  const anoCalendario = texto.match(/ano-calend[áa]rio\s+(\d{4})/i)?.[1] ?? ""

  // Remove o boilerplate/rodapé que a RFB intercala nas quebras de página
  texto = texto
    .replace(/\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}\s*Sistema Dirf.*?ano=\d{4}\s*\d\/\d/gi, " ")
    .replace(/As informa[çc][õo]es apresentadas n[ãa]o substituem.*?Data e hora de Bras[íi]lia\)/gi, " ")

  // Corta o cabeçalho (inclui o CNPJ do beneficiário) — só a partir daqui vêm as fontes, evitando
  // que o CNPJ do beneficiário seja confundido com a 1ª fonte.
  const partes = texto.split(/Nome Empresarial\/Nome do Processamento Tribut[áa]vel Retido/i)
  if (partes.length > 1) texto = partes.slice(1).join(" ")

  // Cada fonte: <CNPJ/CPF> <Nome> <Data> <Rend Tributável> <Imposto Retido> "Código Rendimento
  // Tributo Retido" <código rend imposto>+
  const fonteRe = new RegExp(
    `(${CNPJ_CPF})\\s+(.+?)\\s+(\\d{2}\\/\\d{2}\\/\\d{4})\\s+(${NUM})\\s+(${NUM})\\s+C[óo]digo Rendimento Tributo Retido\\s+((?:\\d{4}\\s+${NUM}\\s+${NUM}\\s*)+)`,
    "gi"
  )
  const fontes: FontePagadora[] = []
  let m: RegExpExecArray | null
  while ((m = fonteRe.exec(texto))) {
    const codigosBlock = m[6]
    const codigos: CodigoRetencaoFonte[] = []
    const codRe = new RegExp(`(\\d{4})\\s+(${NUM})\\s+(${NUM})`, "g")
    let c: RegExpExecArray | null
    while ((c = codRe.exec(codigosBlock))) {
      const codigo = c[1]
      const info = CODIGO_INFO[codigo]
      codigos.push({
        codigo,
        grupoTributo: info?.grupo ?? "",
        descricaoDarf: info?.descricaoDarf ?? "",
        rendimento: parseNumeroBR(c[2]),
        imposto: parseNumeroBR(c[3]),
      })
    }
    fontes.push({
      cnpj: somenteDigitos(m[1]),
      nome: m[2].trim(),
      dataDirf: m[3],
      rendimentoTributavel: parseNumeroBR(m[4]),
      impostoRetido: parseNumeroBR(m[5]),
      codigos,
    })
  }

  if (!cnpjBeneficiario || !anoCalendario || fontes.length === 0) return null

  return { anoCalendario, cnpjBeneficiario, nomeBeneficiario, arquivoNome, fontes }
}

export async function processarArquivosFontesPagadoras(files: File[]): Promise<DadosFontesPagadoras[]> {
  const { extractText } = await import("unpdf")
  const resultados: DadosFontesPagadoras[] = []
  for (const file of files) {
    const uint8 = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(uint8, { mergePages: true })
    const textoBruto = Array.isArray(text) ? text.join(" ") : text
    const dados = parseFontesPagadorasDeTexto(textoBruto, file.name)
    if (dados) resultados.push(dados)
  }
  return resultados
}
