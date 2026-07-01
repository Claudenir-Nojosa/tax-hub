export type TipoDocumentoPgdas = "DECLARACAO" | "EXTRATO"

export interface ValoresMercado {
  mercadoInterno: number
  mercadoExterno: number
  total: number
}

export interface TributosValores {
  irpj: number
  csll: number
  cofins: number
  pisPasep: number
  inssCpp: number
  icms: number
  ipi: number
  iss: number
  total: number
}

export interface AtividadePgdas {
  descricao: string
  receitaBrutaInformada: number
  tributos: TributosValores
  parcelas: number[]
}

export interface DebitoGeralPgdas {
  declaradoExigivelSuspenso: TributosValores // "Total do Débito Declarado (exigível + suspenso)"
  exigibilidadeSuspensa: TributosValores // "Total do Débito com Exigibilidade Suspensa"
  exigivel: TributosValores // "Total do Débito Exigível"
}

// Seções exclusivas do Extrato

export interface DasGerado {
  numero: string
  dataVencimento: string // "DD/MM/YYYY"
  dataLimiteAcolhimento: string
  tributos: TributosValores
  principal: number
  multa: number
  juros: number
  total: number
}

export interface ArrecadacaoDas {
  reconhecido: boolean // false = "Não foi reconhecido pagamento até a presente data"
  principal?: number
  multa?: number
  juros?: number
  total?: number
}

export interface DasPagoAnterior {
  reconhecido: boolean // false = "Não foram identificados DAS pagos para este PA"
  total?: number
}

export interface DadosPgdas {
  tipoDocumento: TipoDocumentoPgdas
  cnpj: string
  razaoSocial: string
  competencia: string // "YYYY-MM"
  periodoApuracaoLabel: string // texto original, p/ debug

  rbt12: ValoresMercado
  rba: ValoresMercado
  rpa: ValoresMercado

  atividades: AtividadePgdas[]
  debitoGeral: DebitoGeralPgdas

  // Só presentes quando tipoDocumento === "EXTRATO"
  dasPagoAnterior?: DasPagoAnterior // seção 5
  dasGerado?: DasGerado // seção 6
  arrecadacaoDas?: ArrecadacaoDas // seção 6.2
}

export type ParsePgdasResult =
  | { ok: true; dados: DadosPgdas }
  | { ok: false; erro: string; camposFaltantes?: string[] }
