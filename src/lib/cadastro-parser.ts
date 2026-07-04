// Parser dos documentos cadastrais que alimentam a aba "Menu" do Excel de Recuperação de
// Crédito: Comprovante de Inscrição e Situação Cadastral (Consulta CNPJ da RFB) e Dados
// Cadastrais/QSA (portal "Minhas Dívidas e Pendências" da RFB). Ambos são PDFs com camada de
// texto — extração via unpdf + regex, sem IA (mesmo padrão dos demais parsers, ver
// docs/recuperacao-credito.md §13). A Consulta Optantes do Simples Nacional costuma chegar
// escaneada (sem camada de texto) e por isso tem extrator próprio via IA em
// src/lib/cadastro-simples-ia.ts.

export interface CnaeInfo {
  codigo: string
  descricao: string
}

export interface ConsultaCnpjDados {
  cnpj: string
  matrizFilial: string
  dataAbertura: string
  nomeEmpresarial: string
  nomeFantasia: string
  porte: string
  cnaePrincipal: CnaeInfo | null
  cnaesSecundarios: CnaeInfo[]
  naturezaJuridica: string
  municipio: string
  uf: string
  situacaoCadastral: string
  dataSituacaoCadastral: string
  arquivoNome: string
}

export interface SocioQsa {
  cpf: string
  nome: string
  situacaoCadastral: string
  qualificacao: string
  capitalSocial: string
  capitalVotante: string
}

export interface QsaDados {
  cnpj: string
  nome: string
  responsavel: { cpf: string; nome: string; qualificacao: string } | null
  socios: SocioQsa[]
  arquivoNome: string
}

// Dados do Simples Nacional extraídos via IA (Consulta Optantes) — o shape fica aqui junto dos
// demais pra UI/Excel importarem de um lugar só sem puxar código server-only.
export interface SimplesNacionalDados {
  cnpj: string | null
  nomeEmpresarial: string | null
  situacao: string // ex.: "Optante pelo Simples Nacional" | "Não optante"
  optanteDesde: string | null // DD/MM/AAAA
  periodosAnteriores: { inicio: string; fim: string; detalhe?: string }[]
  simei: string | null // situação no SIMEI, quando o documento traz
  extraidoPorIA: true
  arquivoNome: string
}

// Payload único persistido em CadastroEmpresa.dados — cada documento enviado preenche a sua
// chave; os demais ficam como estavam (merge no upload).
export interface DadosCadastroEmpresa {
  consultaCnpj?: ConsultaCnpjDados
  qsa?: QsaDados
  simplesNacional?: SimplesNacionalDados
}

export function detectarConsultaCnpj(texto: string): boolean {
  return /COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL/i.test(texto)
}

export function detectarQsa(texto: string): boolean {
  return /Quadro de Sócios e Administradores/i.test(texto)
}

// Consulta Optantes com camada de texto (quando não vem escaneada) — só pra rotear pro
// extrator de IA; a extração em si nunca é por regex porque não temos amostra textual validada.
export function detectarConsultaOptantes(texto: string): boolean {
  return /Consulta Optantes|Optante pelo Simples Nacional|Opção pelo Simples Nacional/i.test(texto)
}

const RE_CNAE = /(\d{2}\.\d{2}-\d-\d{2})\s+-\s+/g

function extrairCnaes(trecho: string): CnaeInfo[] {
  const cnaes: CnaeInfo[] = []
  const posicoes: { codigo: string; fimMatch: number; inicioMatch: number }[] = []
  RE_CNAE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_CNAE.exec(trecho)) !== null) {
    posicoes.push({ codigo: m[1], fimMatch: m.index + m[0].length, inicioMatch: m.index })
  }
  for (let i = 0; i < posicoes.length; i++) {
    const fim = i + 1 < posicoes.length ? posicoes[i + 1].inicioMatch : trecho.length
    cnaes.push({
      codigo: posicoes[i].codigo,
      descricao: limparGlifos(trecho.slice(posicoes[i].fimMatch, fim)),
    })
  }
  return cnaes
}

function capturar(texto: string, re: RegExp): string {
  const m = texto.match(re)
  return m ? limparGlifos(m[1]) : ""
}

// PDFs da RFB usam ícones em caracteres de área de uso privado (U+E000–U+F8FF) e bullets de
// status ("● Ativa", U+25CF) que vazam pro texto extraído — remove antes de gravar.
function limparGlifos(v: string): string {
  return v.replace(/[-●]/g, "").trim()
}

export function parseConsultaCnpjDeTexto(texto: string, arquivoNome: string): ConsultaCnpjDados | null {
  const cnpjMatch = texto.match(/NÚMERO DE INSCRIÇÃO\s+([\d./-]+)\s+(MATRIZ|FILIAL)/i)
  if (!cnpjMatch) return null

  const principalTrecho = capturarTrecho(
    texto,
    /CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL/i,
    /CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS/i
  )
  const secundariasTrecho = capturarTrecho(
    texto,
    /CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS/i,
    /CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA/i
  )

  const principais = extrairCnaes(principalTrecho)

  return {
    cnpj: cnpjMatch[1],
    matrizFilial: cnpjMatch[2].toUpperCase(),
    dataAbertura: capturar(texto, /DATA DE ABERTURA\s+(\d{2}\/\d{2}\/\d{4})/i),
    nomeEmpresarial: capturar(texto, /NOME EMPRESARIAL\s+(.+?)\s+TÍTULO DO ESTABELECIMENTO/i),
    nomeFantasia: limparAsteriscos(capturar(texto, /\(NOME DE FANTASIA\)\s+(.+?)\s+PORTE/i)),
    porte: capturar(texto, /PORTE\s+(\S+)\s+CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL/i),
    cnaePrincipal: principais.length > 0 ? principais[0] : null,
    cnaesSecundarios: extrairCnaes(secundariasTrecho),
    naturezaJuridica: capturar(texto, /NATUREZA JURÍDICA\s+(.+?)\s+LOGRADOURO/i),
    municipio: capturar(texto, /MUNICÍPIO\s+(.+?)\s+UF\s+[A-Z]{2}\s/i),
    uf: capturar(texto, /\sUF\s+([A-Z]{2})\s/),
    situacaoCadastral: capturar(texto, /SITUAÇÃO CADASTRAL\s+(ATIVA|BAIXADA|SUSPENSA|INAPTA|NULA)/i),
    dataSituacaoCadastral: capturar(texto, /DATA DA SITUAÇÃO CADASTRAL\s+(\d{2}\/\d{2}\/\d{4})/i),
    arquivoNome,
  }
}

function capturarTrecho(texto: string, inicio: RegExp, fim: RegExp): string {
  const mi = texto.match(inicio)
  if (!mi || mi.index === undefined) return ""
  const resto = texto.slice(mi.index + mi[0].length)
  const mf = resto.match(fim)
  return mf && mf.index !== undefined ? resto.slice(0, mf.index) : resto
}

function limparAsteriscos(v: string): string {
  return /^\*+$/.test(v) ? "" : v
}

export function parseQsaDeTexto(texto: string, arquivoNome: string): QsaDados | null {
  const cnpj = capturar(texto, /CNPJ matriz\s+([\d./-]+)/i)
  if (!cnpj) return null

  const nome = capturar(texto, /Nome\s+(.+?)\s+CNPJ matriz/i)

  const respMatch = texto.match(
    /Responsável perante o CNPJ\s+([\d.-]+)\s+-\s+(.+?)\s+Situação cadastral do responsável\s+\S+\s+Qualificação do responsável\s+(.+?)(?=\s{2}|\s+Quadro de Sócios)/i
  )

  // O texto do QSA vem com lixo de rodapé de página no meio (data/URL/nº da página), inclusive
  // entre o CPF e o Nome de um sócio quando a tabela quebra de página — daí o [\s\S]*? entre eles.
  const socios: SocioQsa[] = []
  const trechoQsa = texto.slice(texto.search(/Quadro de Sócios e Administradores/i))
  const reSocio =
    /CPF\s+(\d{3}\.\d{3}\.\d{3}-\d{2})[\s\S]*?Nome\s+(.+?)\s+Situação cadastral\s+(\S+)\s+Qualificação\s+(.+?)\s+Capital social\s+([\d.,]+\s*%)\s+Capital votante\s+([\d.,]+\s*%)/g
  let m: RegExpExecArray | null
  while ((m = reSocio.exec(trechoQsa)) !== null) {
    socios.push({
      cpf: m[1],
      nome: limparGlifos(m[2]),
      situacaoCadastral: m[3],
      qualificacao: limparGlifos(m[4]),
      capitalSocial: m[5].replace(/\s+/g, ""),
      capitalVotante: m[6].replace(/\s+/g, ""),
    })
  }

  return {
    cnpj,
    nome,
    responsavel: respMatch
      ? { cpf: respMatch[1], nome: limparGlifos(respMatch[2]), qualificacao: limparGlifos(respMatch[3]) }
      : null,
    socios,
    arquivoNome,
  }
}
