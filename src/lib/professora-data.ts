// Dados da "Professora IA" — sabatina oral por voz (aba Professora em /dashboard/estudo).
// Módulo puro compartilhado entre client e servidor (SEM secrets aqui): a rota de token importa
// o nome da professora pra montar a persona, e a UI importa pra mostrar o card antes de conectar.

// "1 IA por matéria" na prática = 1 persona por matéria: nome feminino fixo pra cada matéria do
// SEFAZ-CE. A voz é a mesma (config da rota); o que muda é o nome, a especialidade e os tópicos.
export const PROFESSORAS: Record<string, string> = {
  "Administração Pública e Governança Pública": "Vera",
  "Auditoria": "Clara",
  "Contabilidade Avançada": "Sofia",
  "Contabilidade de Custos": "Alice",
  "Contabilidade Geral": "Marina",
  "Contabilidade Pública": "Laura",
  "Direito Administrativo": "Cecília",
  "Direito Civil": "Camila",
  "Direito Constitucional": "Beatriz",
  "Direito Financeiro": "Isabela",
  "Direito Penal": "Valentina",
  "Direito Tributário": "Helena",
  "Finanças Públicas": "Luiza",
  "Fluência de Dados": "Bianca",
  "Legislação Estadual": "Renata",
  "Língua Portuguesa": "Teresa",
  "Macroeconomia": "Elisa",
  "Matemática Financeira / Estatística e Raciocínio Lógico": "Dora",
  "Microeconomia": "Olívia",
};

// fallback pra matérias de concursos customizados (fora do mapa): hash simples e determinístico
// do nome da matéria → mesma matéria sempre ganha a mesma professora
const NOMES_FALLBACK = ["Ana", "Júlia", "Carolina", "Fernanda", "Patrícia", "Gabriela"];

export function nomeProfessora(materiaNome: string): string {
  const fixo = PROFESSORAS[materiaNome];
  if (fixo) return fixo;
  let hash = 0;
  for (let i = 0; i < materiaNome.length; i++) hash = (hash * 31 + materiaNome.charCodeAt(i)) >>> 0;
  return NOMES_FALLBACK[hash % NOMES_FALLBACK.length];
}

// limite de custo: a sessão de voz encerra sozinha depois disso (timer no client — o token
// efêmero de 10min é só pro handshake, não limita a duração da conversa)
export const DURACAO_MAX_SESSAO_MIN = 15;
