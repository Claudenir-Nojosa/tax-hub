// lib/types.ts

export type RegimeTributacao =
  | "SIMPLES_NACIONAL"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL";

export interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string | null;
  email: string | null;
  cidade: string | null;
  uf: string;
  regimeTributacao: RegimeTributacao;
  responsavel: string;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  usuarioId: string;
}

export interface EntregaObrigacaoAcessoria {
  id: string;
  empresaObrigacaoId: string;
  mes: number;
  ano: number;
  entregue: boolean;
  dataEntrega: Date | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpresaObrigacaoAcessoria {
  id: string;
  empresaId: string;
  obrigacaoAcessoriaId: string;
  diaVencimento: number;
  anteciparDiaNaoUtil: boolean;
  observacoes: string | null;
  entregas: EntregaObrigacaoAcessoria[];
}

export interface EmpresaComObrigacao extends Empresa {
  empresaObrigacaoAcessoria: EmpresaObrigacaoAcessoria;
}

export interface Cartao {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  observacoes?: string;
  ativo: boolean;
  faturaAtual?: any;
  lancamentos?: Array<{
    id: string;
    valor: number;
    descricao: string;
    data: string;
  }>;
  _count?: {
    lancamentos: number;
  };
  totalGasto?: number;
  utilizacaoLimite?: number;
}

export interface Stripe {
  current_period_end: number;
  current_period_start: number;
  canceled_at: number | null;
}
