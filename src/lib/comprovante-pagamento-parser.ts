// Parser de "Comprovante de Arrecadação" (comprovante de pagamento de DARF, emitido pela Receita
// Federal), PDF de texto — roda no servidor, mesmo padrão determinístico (regex, sem IA) dos
// outros parsers deste módulo, já que o formato é fixo/oficial do governo.
//
// Diferença estrutural importante em relação ao PGDAS/EFD: um único PDF pode conter DEZENAS de
// DARFs de competências diferentes (o arquivo de amostra validado tinha 50 DARFs cobrindo de
// 2022 a 2025, um por página ou espalhados por várias páginas quando a lista de códigos de um
// DARF não cabe numa página só). Por isso `parseComprovantePagamento` devolve um ARRAY de DARFs
// por arquivo, e a persistência (ver Prisma) dedupliza por Número do Documento, não por
// competência.

function parseNumeroBR(raw: string | undefined | null): number {
  if (!raw || raw === "-") return 0
  const limpo = raw.trim().replace(/\./g, "").replace(",", ".")
  const v = parseFloat(limpo)
  return Number.isFinite(v) ? v : 0
}

export interface CodigoReceitaLinha {
  codigo: string // código de receita de 4 dígitos (ex.: "2089")
  descricao: string // descrição do código tal como impressa no PDF (não é a nomenclatura oficial
  // completa da RFB — ver GAP no final deste arquivo)
  principal: number
  multa: number
  juros: number
  total: number
  // Referência (subclassificação de 2 dígitos + descrição) só existe quando o PDF imprime
  // explicitamente essa informação na própria linha do código — ver GAP.
  refCodigo: string | null
  refDescricao: string | null
}

export interface DadosComprovantePagamento {
  numeroDocumento: string // chave natural do DARF — usada pra deduplicar reimportação
  cnpj: string
  razaoSocial: string
  periodoApuracao: string // "DD/MM/AAAA", como impresso no PDF
  dataVencimento: string // "DD/MM/AAAA"
  dataArrecadacao: string // "DD/MM/AAAA" — data em que o DARF foi efetivamente pago
  banco: string // "033 - BANCO SANTANDER MERIDIONAL S/A" ou "Documento pago via PIX"
  valorRestituido: number
  codigos: CodigoReceitaLinha[]
  arquivoNome: string
}

// Código de receita -> tributo (rótulo curto). Mapa validado contra um arquivo de referência real
// (Relatório de Pagamentos.xlsx do usuário): só estes 4 códigos recebem um rótulo de "Tributo"
// nessa planilha — os demais (multas, TJLP de parcelamento, INSS/CP, etc.) ficam sem rótulo.
const CODIGO_TRIBUTO: Record<string, string> = {
  "2089": "IRPJ",
  "2372": "CSLL",
  "8109": "PIS",
  "2172": "COFINS",
}

export function labelTributo(codigo: string): string | null {
  return CODIGO_TRIBUTO[codigo] ?? null
}

// Distingue um PDF de Comprovante de Arrecadação de um PDF de PGDAS-D (ambos podem ser
// carregados na mesma zona de upload, já que os dois são .pdf) — âncora exclusiva confirmada no
// texto real extraído via unpdf.
export function detectarComprovantePagamento(texto: string): boolean {
  return /consta nos sistemas da Receita Federal registro de arrecadação de DARF/i.test(texto)
}

const NUM = String.raw`(?:-|\d{1,3}(?:\.\d{3})*,\d{2})`
// código de receita (4 dígitos) + descrição + valores, com referência inline ("NN - descrição")
const CODIGO_COM_REFERENCIA_RE = new RegExp(
  `^(.*?)\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s+(\\d{2})\\s*-\\s*(.*)$`
)
// mesma coisa, mas sem referência inline (a linha termina logo após os 4 valores — ex.: código
// 2203 "Multa Omissão/Incorreção/Falta/Atraso na Entrega..." não traz uma referência impressa)
const CODIGO_SEM_REFERENCIA_RE = new RegExp(`^(.*?)\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s*$`)
// início de uma nova linha de código dentro do bloco: 4 dígitos seguidos de uma letra (a
// descrição nunca começa com dígito, isso evita confundir com números de valores monetários)
const CODIGO_START_RE = /(\d{4})\s+(?=[A-ZÀ-Úa-zà-ú])/g

// O número que identifica o pagamento tem 17 dígitos nos comprovantes recentes ("Número do
// Documento"), mas comprovantes antigos (validado com DARFs de 2021 do mesmo cliente) usam um
// "Número do Pagamento" de 10 dígitos — por isso o range \d{8,17} em vez de comprimento fixo.
const HEADER_RE =
  /^([\d./-]{18})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{8,17})\s+CNPJ Período Apuração/

const BANCO_RE =
  /Banco Data de Arrecadação Agência Estabelecimento Valor Reservado\/Restituído Referência (\d{2}\/\d{2}\/\d{4})(.*?)([\d.,]+|-)\s*(?:Data de Vencimento|$)/

// Exportada além do wrapper de File[] porque a rota de upload já extraiu o texto do PDF uma vez
// pra detectar o tipo (PGDAS vs Comprovante) — reusar o texto evita extrair o mesmo PDF duas
// vezes, que era o gargalo de tempo do upload.
export function parseComprovantesDeTexto(textoBruto: string, arquivoNome: string): DadosComprovantePagamento[] {
  const texto = textoBruto.replace(/\s+/g, " ").trim()

  // cada página do PDF começa com "Data de Vencimento" (rótulo impresso antes do bloco de
  // valores) — um DARF cujo bloco de códigos não coube numa página só aparece em 2+ páginas
  // consecutivas com o MESMO Número do Documento, por isso agrupamos por esse número.
  const paginas = texto.split("Data de Vencimento").slice(1).map((p) => p.trim())
  const porDocumento = new Map<string, DadosComprovantePagamento>()

  for (const pagina of paginas) {
    const h = pagina.match(HEADER_RE)
    if (!h) continue
    const [, cnpj, razaoSocial, periodoApuracao, dataVencimento, numeroDocumento] = h

    let darf = porDocumento.get(numeroDocumento)
    if (!darf) {
      darf = {
        numeroDocumento,
        cnpj,
        razaoSocial,
        periodoApuracao,
        dataVencimento,
        dataArrecadacao: "",
        banco: "",
        valorRestituido: 0,
        codigos: [],
        arquivoNome,
      }
      porDocumento.set(numeroDocumento, darf)
    }

    const corpoMatch = pagina.match(/Comprovante de Arrecadação (.*?) Comprovante emitido/)
    if (corpoMatch) {
      let corpo = corpoMatch[1]
      corpo = corpo.replace(
        /^Código Descrição TotalJurosMultaPrincipal Composição do Documento de Arrecadação\s*/,
        ""
      )
      corpo = corpo.replace(/\s*Totais\s+(?:-|[\d.,]+)\s+(?:-|[\d.,]+)\s+(?:-|[\d.,]+)\s+(?:-|[\d.,]+)\s*$/, "")
      corpo = corpo.trim()

      if (corpo) {
        const posicoes: { codigo: string; start: number; contentStart: number }[] = []
        CODIGO_START_RE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = CODIGO_START_RE.exec(corpo))) {
          posicoes.push({ codigo: m[1], start: m.index, contentStart: m.index + m[0].length })
        }

        for (let i = 0; i < posicoes.length; i++) {
          const inicio = posicoes[i].contentStart
          const fim = i + 1 < posicoes.length ? posicoes[i + 1].start : corpo.length
          const segmento = corpo.slice(inicio, fim).trim()

          const comRef = segmento.match(CODIGO_COM_REFERENCIA_RE)
          if (comRef) {
            const [, descricao, principal, multa, juros, total, refCodigo, refDescricao] = comRef
            darf.codigos.push({
              codigo: posicoes[i].codigo,
              descricao: descricao.trim(),
              principal: parseNumeroBR(principal),
              multa: parseNumeroBR(multa),
              juros: parseNumeroBR(juros),
              total: parseNumeroBR(total),
              refCodigo,
              refDescricao: refDescricao.trim(),
            })
            continue
          }

          const semRef = segmento.match(CODIGO_SEM_REFERENCIA_RE)
          if (semRef) {
            const [, descricao, principal, multa, juros, total] = semRef
            darf.codigos.push({
              codigo: posicoes[i].codigo,
              descricao: descricao.trim(),
              principal: parseNumeroBR(principal),
              multa: parseNumeroBR(multa),
              juros: parseNumeroBR(juros),
              total: parseNumeroBR(total),
              refCodigo: null,
              refDescricao: null,
            })
          }
        }
      }
    }

    const bancoMatch = pagina.match(BANCO_RE)
    if (bancoMatch) {
      darf.dataArrecadacao = bancoMatch[1]
      const meio = bancoMatch[2].trim()
      darf.valorRestituido = parseNumeroBR(bancoMatch[3])
      // remove agência+estabelecimento do final — comprovantes recentes têm os dois números;
      // os antigos (2021) só imprimem um, daí o {1,2}
      darf.banco = /Documento pago via PIX/.test(meio)
        ? "Documento pago via PIX"
        : meio.replace(/(?:\s+\d+){1,2}\s*$/, "").trim()
    }
  }

  return [...porDocumento.values()]
}

export async function processarArquivosComprovantePagamento(files: File[]): Promise<DadosComprovantePagamento[]> {
  const { extractText } = await import("unpdf")
  const resultados: DadosComprovantePagamento[] = []
  for (const file of files) {
    const uint8 = new Uint8Array(await file.arrayBuffer())
    const { text } = await extractText(uint8, { mergePages: true })
    const textoBruto = Array.isArray(text) ? text.join(" ") : text
    resultados.push(...parseComprovantesDeTexto(textoBruto, file.name))
  }
  return resultados
}

// GAP CONHECIDO: "Descrição Principal" usa aqui o texto de descrição impresso junto ao próprio
// código de receita no PDF (campo `descricao`), não a nomenclatura oficial completa da tabela de
// Códigos de Receita da RFB — um exemplo de referência do usuário mostrava descrições mais
// completas/abreviadas de forma diferente (ex. "COFINS - CONTRIB.FINANCIAMENTO SEGURIDADE
// SOCIAL"), que não vêm do PDF e parecem ter sido preenchidas manualmente a partir de uma tabela
// externa da RFB. Não reproduzido aqui pra não inventar dado que não está na fonte.
//
// GAP CONHECIDO: quando uma linha de código não traz uma referência (ex.: código 2203, "Multa
// Omissão/Incorreção/Falta/Atraso na Entrega..."), `refCodigo`/`refDescricao` ficam `null` e o
// código exportado no Excel fica só o de 4 dígitos, sem o sufixo "-NN". O mesmo exemplo de
// referência trazia esse código já enriquecido como "2203-03" E duplicado em duas linhas com o
// mesmo valor (provavelmente categorização manual da equipe, não algo extraído do PDF) — o
// parser aqui gera só 1 linha por ocorrência real no PDF, por ser mais fiel à fonte.
