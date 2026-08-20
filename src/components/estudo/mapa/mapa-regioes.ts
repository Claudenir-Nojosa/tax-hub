// Posições (% da imagem, 0-100) de cada cidade no mapa "O Continente do Conhecimento"
// (public/mapa/continente-conhecimento.png, 1536x1024) — mapeadas manualmente pelo usuário a
// partir da versão rotulada da arte, cidade por cidade. Nomes EXATOS do concurso real (conferidos
// direto no banco) — alguns têm espaço duplo de propósito ("Legislação Tributária  Estadual" etc.,
// mesma pegadinha já documentada na memória do projeto) — preservar exatamente, senão o pino nunca
// casa com a matéria e some do mapa em silêncio.
export interface PosicaoRegiao {
  materia: string;
  x: number;
  y: number;
}

export const REGIOES_CONTINENTE: PosicaoRegiao[] = [
  { materia: "Língua Portuguesa", x: 11.4, y: 9.3 },
  { materia: "Direito Administrativo", x: 27.3, y: 10.7 },
  { materia: "Direito Constitucional", x: 45.6, y: 11.7 },
  { materia: "Direito Tributário", x: 61.5, y: 10.7 },
  { materia: "Reforma Tributária", x: 77.1, y: 14.6 },
  { materia: "Auditoria Fiscal", x: 91.1, y: 9.8 },
  { materia: "Raciocínio Lógico Matemático", x: 11.4, y: 32.2 },
  { materia: "Estatística", x: 27.3, y: 34.7 },
  { materia: "Direito Civil", x: 43.0, y: 33.7 },
  { materia: "Direito Penal", x: 58.6, y: 33.7 },
  { materia: "Contabilidade de Custos", x: 76.5, y: 35.2 },
  { materia: "Legislação Tributária  Estadual", x: 91.1, y: 34.7 },
  { materia: "Legislação Tributária  Municipal", x: 13.0, y: 55.2 },
  { materia: "Economia e Finanças  Públicas", x: 29.3, y: 56.2 },
  { materia: "Direito Empresarial", x: 46.6, y: 56.6 },
  { materia: "Direito Financeiro (AFO)", x: 62.5, y: 55.2 },
  { materia: "Contabilidade Pública", x: 81.1, y: 56.6 },
  { materia: "Tecnologia da  Informação", x: 21.5, y: 71.8 },
  { materia: "Fluência de Dados", x: 41.0, y: 71.8 },
  { materia: "Contabilidade Geral e Avançada", x: 61.2, y: 72.8 },
  { materia: "Matemática Financeira", x: 79.8, y: 71.8 },
];
