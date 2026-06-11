// app/lib/dashboardService.ts
import db from "@/lib/db";

export async function getDashboardData() {
  const response = await fetch('/api/dashboard');
  
  if (!response.ok) {
    throw new Error('Falha ao carregar dados do dashboard');
  }
  
  return await response.json();
}

export type ObrigacaoAcessoria = {
  id: string;
  nome: string;
  // Adicione outros campos conforme seu modelo no banco de dados
};

export async function getObrigacoesAcessorias(): Promise<ObrigacaoAcessoria[]> {
  const response = await fetch('/api/obrigacoes-acessorias');
  if (!response.ok) {
    throw new Error('Falha ao carregar obrigações');
  }
  return response.json();
}