// Parser da DCTF Mensal — arquivo .dec transmitido pelo PGD DCTF, texto de largura fixa (não é
// pipe-delimited). Determinístico (sem IA). 1 arquivo = 1 competência (mês); dentro dele, N
// débitos declarados (um registro R10/R11 por código de receita). Roda no servidor.
//
// Layout confirmado contra um arquivo real (índices/anchors validados):
//   - Registro "R01" (dados gerais): pos 3-16 = CNPJ, pos 17-22 = competência AAAAMM.
//   - Registro "R11" (detalhe do débito): contém a sequência <CNPJ estab.(14)><código(4)>
//     <vencimento(8)> — usada como âncora robusta pra extrair o código de receita.
// Só os 4 códigos de tributo do Lucro Presumido aparecem numa DCTF de PJ Presumido (8109 PIS,
// 2172 COFINS, 2089 IRPJ, 2372 CSLL) — mapeados abaixo para o nome do grupo, igual à referência.
//
// GAP CONHECIDO: os campos codificados de "Dados Gerais" do registro R01 (Forma de Tributação do
// Lucro, Regime de Apuração PIS/Cofins, Critério de Variação Monetária, Balanço/Suspensão,
// Débitos SCP) NÃO são decodificados — exigem o leiaute oficial do PGD DCTF e mais de uma amostra
// pra validar os offsets com segurança. Ficam vazios no Excel (a referência os traz preenchidos
// com valores constantes de Lucro Presumido, mas não os inventamos aqui). Ver docs.

export interface DebitoDctf {
  codigo: string // "8109"
  codigoVariacao: string // "8109-02" (código de receita + variação, como no DARF)
  grupo: string // nome do grupo/tributo, ex.: "PIS/PASEP - CONTRIB. ..."
  tributo: string | null // "PIS"/"COFINS"/"IRPJ"/"CSLL"
  descricaoDarf: string // descrição do código do DARF (ex.: "PIS - FATURAMENTO")
  periodicidade: "Mensal" | "Trimestral"
  vencimento: string // "DD/MM/AAAA"
  valorDebito: number // valor do débito apurado (= principal declarado)
  valorMulta: number // multa (0 quando não há)
}

export interface DadosDctf {
  cnpj: string
  competencia: string // "YYYY-MM"
  declaracaoRetificadora: "Sim" | "Não"
  arquivoNome: string
  debitos: DebitoDctf[]
}

// código de receita (4 dígitos) -> grupo/tributo/descrição DARF, como a referência do usuário
// mostra. `descricaoDarf` só está confirmada p/ PIS/COFINS (as duas que aparecem no arquivo de
// validação); IRPJ/CSLL ficam com a descrição do DARF em branco até haver amostra confirmando.
const CODIGO_GRUPO: Record<
  string,
  { grupo: string; tributo: string; descricaoDarf: string; periodicidade: "Mensal" | "Trimestral" }
> = {
  "8109": {
    grupo: "PIS/PASEP - CONTRIB. P/PROGRAMA DE INTEGRAÇÃO SOCIAL/FORMAÇÃO PATRIM. SERV. PÚBLICO",
    tributo: "PIS",
    descricaoDarf: "PIS - FATURAMENTO",
    periodicidade: "Mensal",
  },
  "2172": {
    grupo: "COFINS - CONTRIBUIÇÃO P/ FINANCIAMENTO DA SEGURIDADE SOCIAL",
    tributo: "COFINS",
    descricaoDarf: "COFINS - CONTRIB.FINANCIAMENTO SEGURIDADE SOCIAL",
    periodicidade: "Mensal",
  },
  "2089": {
    grupo: "IRPJ - IMPOSTO SOBRE A RENDA DAS PESSOAS JURÍDICAS",
    tributo: "IRPJ",
    descricaoDarf: "",
    periodicidade: "Trimestral",
  },
  "2372": {
    grupo: "CSLL - CONTRIBUIÇÃO SOCIAL S/ LUCRO LIQUIDO",
    tributo: "CSLL",
    descricaoDarf: "",
    periodicidade: "Trimestral",
  },
}

export function detectarDctf(conteudo: string): boolean {
  return conteudo.startsWith("DCTFM")
}

function parseUmDctf(conteudo: string, arquivoNome: string): DadosDctf | null {
  const linhas = conteudo.split(/\r?\n/)

  let cnpj = ""
  let competencia = ""
  const debitos: DebitoDctf[] = []
  const vistos = new Set<string>()

  // R01 — dados gerais: CNPJ (pos 3-16) + competência AAAAMM (pos 17-22)
  const r01 = linhas.find((l) => l.startsWith("R01"))
  if (r01) {
    cnpj = r01.slice(3, 17)
    const comp = r01.slice(17, 23) // AAAAMM
    if (/^\d{6}$/.test(comp)) competencia = `${comp.slice(0, 4)}-${comp.slice(4, 6)}`
  }

  if (cnpj) {
    // R11 — detalhe. Âncora do estabelecimento: <CNPJ estab.><código(4)><vencimento(8)> +
    // espaços + <principal(14)><multa(14)>, valores em centavos. Só essa ocorrência tem espaços
    // seguidos de valor (a do CNPJ da matriz, no início, é seguida da competência, não casa). A
    // variação do código ("-02") vem do campo <código(4)><variação(2)>M do mesmo registro.
    for (const linha of linhas) {
      if (!linha.startsWith("R11")) continue
      const m = linha.match(new RegExp(`${cnpj}(\\d{4})(\\d{8})\\s+(\\d{14})(\\d{14})`))
      if (!m) continue
      const codigo = m[1]
      if (vistos.has(codigo)) continue // 1 R11 por código já basta (evita duplicar por vinculações)
      vistos.add(codigo)
      const venc = m[2]
      const valorDebito = parseInt(m[3], 10) / 100
      const valorMulta = parseInt(m[4], 10) / 100
      const variacao = linha.match(/(\d{4})(\d{2})M/)?.[2] ?? ""
      const info = CODIGO_GRUPO[codigo]
      debitos.push({
        codigo,
        codigoVariacao: variacao ? `${codigo}-${variacao}` : codigo,
        grupo: info?.grupo ?? `Código ${codigo}`,
        tributo: info?.tributo ?? null,
        descricaoDarf: info?.descricaoDarf ?? "",
        periodicidade: info?.periodicidade ?? "Mensal",
        vencimento: `${venc.slice(0, 2)}/${venc.slice(2, 4)}/${venc.slice(4, 8)}`,
        valorDebito,
        valorMulta,
      })
    }
  }

  if (!cnpj || !competencia || debitos.length === 0) return null

  return {
    cnpj,
    competencia,
    declaracaoRetificadora: /RETIF/i.test(arquivoNome) ? "Sim" : "Não",
    arquivoNome,
    debitos,
  }
}

// .dec é latin1 (SPED/PGD) — decodificar como UTF-8 corromperia acentos de eventuais textos.
export async function processarArquivosDctf(files: File[]): Promise<DadosDctf[]> {
  const resultados: DadosDctf[] = []
  for (const file of files) {
    const conteudo = new TextDecoder("latin1").decode(await file.arrayBuffer())
    const dados = parseUmDctf(conteudo, file.name)
    if (dados) resultados.push(dados)
  }
  return resultados
}
