import type { LucideIcon } from "lucide-react";
import {
  Sprout, Leaf, BookOpen, BookMarked, Pencil, Brain, Lightbulb, Target, Crosshair,
  Zap, Flame, Star, Shield, ShieldCheck, Award, Trophy, Gem, Compass, Rocket,
  Sparkles, Sun, Sunrise, TrendingUp, Mountain, Swords, BadgeCheck, Medal,
  Diamond, Infinity as InfinityIcon, Crown,
  CalendarCheck, Dumbbell, GraduationCap, CheckCircle2,
  HelpCircle, RotateCcw, NotebookPen, ListChecks,
} from "lucide-react";

export type { LucideIcon };
export type Grupo = "A" | "B" | "C" | "D";
export type AtividadeTipo = "estudo" | "questoes" | "recall" | "caderno_erros" | "bateria" | "materia_concluida";

export interface TopicoCaderno {
  acertos: number;
  erros: number;
}

export interface TopicoState {
  estudado: boolean;
  cadernos: Record<Grupo, TopicoCaderno>;
}

export interface AtividadeCalendario {
  id: string;
  tipo: AtividadeTipo;
  descricao: string;
  duracao: number;
  grupo?: Grupo;
  materia?: string;
  topico?: string;
}

export interface ErroEntry {
  id: string;
  materia: string;
  topico: string;
  questao: string;
  revisado: boolean;
  data: string;
}

export interface ConfigMateria {
  incluir: boolean;
  peso: 1 | 2;
  prioridade: "Alta" | "Baixa";
  divisao: "A" | "B" | "C";
}

export interface EstudoConfigCiclo {
  materias: Record<string, ConfigMateria>;
  horasPorDia: {
    segunda: number;
    terca: number;
    quarta: number;
    quinta: number;
    sexta: number;
    sabado: number;
    domingo: number;
  };
}

export interface EstudoState {
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  cadernoErros: ErroEntry[];
  configCiclo: EstudoConfigCiclo;
  streak: number;
  semanasOK: number;
}

export interface MateriaDef {
  nome: string;
  codigo: number;
  topicos: string[];
  corBorder: string;
  corDot: string;
  corBg: string;
  corText: string;
  corBadge: string;
  incluirDefault: boolean;
  pesoDefault: 1 | 2;
  prioridadeDefault: "Alta" | "Baixa";
  divisaoDefault: "A" | "B" | "C";
}

export interface NivelConfig {
  titulo: string;
  icone: LucideIcon;
  cor: string;
  xpMin: number;
  xpMax: number;
}

export const NIVEL_CONFIG: Record<number, NivelConfig> = {
  1:  { titulo: "Iniciante",     icone: Sprout,       cor: "text-emerald-500", xpMin: 0,     xpMax: 79    },
  2:  { titulo: "Curioso",       icone: Leaf,         cor: "text-emerald-500", xpMin: 80,    xpMax: 199   },
  3:  { titulo: "Aplicado",      icone: BookOpen,     cor: "text-emerald-500", xpMin: 200,   xpMax: 359   },
  4:  { titulo: "Disciplinado",  icone: BookMarked,   cor: "text-emerald-500", xpMin: 360,   xpMax: 559   },
  5:  { titulo: "Persistente",   icone: Pencil,       cor: "text-emerald-500", xpMin: 560,   xpMax: 799   },
  6:  { titulo: "Focado",        icone: Brain,        cor: "text-blue-500",    xpMin: 800,   xpMax: 1079  },
  7:  { titulo: "Dedicado",      icone: Lightbulb,    cor: "text-blue-500",    xpMin: 1080,  xpMax: 1399  },
  8:  { titulo: "Comprometido",  icone: Target,       cor: "text-blue-500",    xpMin: 1400,  xpMax: 1759  },
  9:  { titulo: "Assíduo",       icone: Crosshair,    cor: "text-blue-500",    xpMin: 1760,  xpMax: 2159  },
  10: { titulo: "Experiente",    icone: Zap,          cor: "text-blue-500",    xpMin: 2160,  xpMax: 2699  },
  11: { titulo: "Habilidoso",    icone: Flame,        cor: "text-violet-500",  xpMin: 2700,  xpMax: 3299  },
  12: { titulo: "Proficiente",   icone: Star,         cor: "text-violet-500",  xpMin: 3300,  xpMax: 3959  },
  13: { titulo: "Competente",    icone: Shield,       cor: "text-violet-500",  xpMin: 3960,  xpMax: 4679  },
  14: { titulo: "Qualificado",   icone: ShieldCheck,  cor: "text-violet-500",  xpMin: 4680,  xpMax: 5459  },
  15: { titulo: "Especialista",  icone: Award,        cor: "text-violet-500",  xpMin: 5460,  xpMax: 6299  },
  16: { titulo: "Avançado",      icone: Trophy,       cor: "text-orange-500",  xpMin: 6300,  xpMax: 7199  },
  17: { titulo: "Analítico",     icone: Gem,          cor: "text-orange-500",  xpMin: 7200,  xpMax: 8159  },
  18: { titulo: "Perspicaz",     icone: Compass,      cor: "text-orange-500",  xpMin: 8160,  xpMax: 9179  },
  19: { titulo: "Sagaz",         icone: Rocket,       cor: "text-orange-500",  xpMin: 9180,  xpMax: 10259 },
  20: { titulo: "Mestre",        icone: Sparkles,     cor: "text-orange-500",  xpMin: 10260, xpMax: 11499 },
  21: { titulo: "Perito",        icone: Sun,          cor: "text-rose-500",    xpMin: 11500, xpMax: 12799 },
  22: { titulo: "Sábio",         icone: Sunrise,      cor: "text-rose-500",    xpMin: 12800, xpMax: 14159 },
  23: { titulo: "Notável",       icone: TrendingUp,   cor: "text-rose-500",    xpMin: 14160, xpMax: 15579 },
  24: { titulo: "Excepcional",   icone: Mountain,     cor: "text-rose-500",    xpMin: 15580, xpMax: 17059 },
  25: { titulo: "Elite",         icone: Swords,       cor: "text-rose-500",    xpMin: 17060, xpMax: 18699 },
  26: { titulo: "Lendário",      icone: BadgeCheck,   cor: "text-amber-500",   xpMin: 18700, xpMax: 20399 },
  27: { titulo: "Supremo",       icone: Medal,        cor: "text-amber-500",   xpMin: 20400, xpMax: 22199 },
  28: { titulo: "Implacável",    icone: Diamond,      cor: "text-amber-500",   xpMin: 22200, xpMax: 24099 },
  29: { titulo: "Invencível",    icone: InfinityIcon, cor: "text-amber-500",   xpMin: 24100, xpMax: 26099 },
  30: { titulo: "Fiscal de Elite", icone: Crown,      cor: "text-amber-500",   xpMin: 26100, xpMax: 999999},
};

export interface ConquistaConfig {
  id: string;
  icone: LucideIcon;
  cor: string;
  nome: string;
  condicao: string;
}

export const CONQUISTAS: ConquistaConfig[] = [
  { id: "primeiro_passo", icone: Sprout,         cor: "text-emerald-600", nome: "Primeiro Passo",   condicao: "Complete sua 1ª semana de estudos" },
  { id: "primeiro_mes",   icone: CalendarCheck,  cor: "text-blue-600",    nome: "Primeiro Mês",     condicao: "Complete todas as semanas de um mês" },
  { id: "maratonista",    icone: Dumbbell,        cor: "text-orange-600",  nome: "Maratonista",      condicao: "Estude 2000+ min em uma semana" },
  { id: "em_chamas",      icone: Flame,           cor: "text-red-600",     nome: "Em Chamas",        condicao: "3 semanas consecutivas batendo meta" },
  { id: "meio_caminho",   icone: TrendingUp,      cor: "text-violet-600",  nome: "Meio Caminho",     condicao: "Acumule 500 XP" },
  { id: "expert",         icone: Star,            cor: "text-amber-500",   nome: "Expert",           condicao: "Acumule 1500 XP" },
  { id: "fiscal_elite",   icone: Crown,           cor: "text-amber-500",   nome: "Fiscal de Elite",  condicao: "Acumule 26100 XP — nível máximo!" },
  { id: "sniper_edital",  icone: Crosshair,       cor: "text-blue-600",    nome: "Sniper do Edital", condicao: "Marque 10+ semanas com Meta Batida" },
  { id: "estudante_modelo", icone: GraduationCap, cor: "text-emerald-600", nome: "Estudante Modelo", condicao: "100+ horas totais de estudo" },
  { id: "sefaz_ready",    icone: Rocket,          cor: "text-rose-600",    nome: "SEFAZ Ready",      condicao: "200+ horas totais + 30 semanas OK" },
];

export const ATIVIDADE_CONFIG: Record<AtividadeTipo, { label: string; icone: LucideIcon; cor: string; corDot: string }> = {
  estudo:            { label: "Estudo de Matéria",  icone: BookOpen,      cor: "bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200",         corDot: "bg-blue-500"    },
  questoes:          { label: "Questões",            icone: HelpCircle,    cor: "bg-purple-100 text-purple-700 dark:bg-purple-400/20 dark:text-purple-200",  corDot: "bg-purple-500"  },
  recall:            { label: "Recall",              icone: RotateCcw,     cor: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",      corDot: "bg-amber-500"   },
  caderno_erros:     { label: "Caderno de Erros",    icone: NotebookPen,   cor: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200",              corDot: "bg-red-500"     },
  bateria:           { label: "Bateria de Questões", icone: ListChecks,    cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200", corDot: "bg-emerald-500" },
  materia_concluida: { label: "Matéria Concluída",   icone: CheckCircle2,  cor: "bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200",          corDot: "bg-teal-500"    },
};

export function calcularXP(
  topicos: Record<string, TopicoState>,
  calendario?: Record<string, AtividadeCalendario[]>
): number {
  let xp = 0;
  Object.values(topicos).forEach((t) => {
    if (t.estudado) xp += 10;
    (["A", "B", "C", "D"] as Grupo[]).forEach((g) => {
      if (t.cadernos[g].acertos + t.cadernos[g].erros > 0) xp += 5;
    });
  });
  if (calendario) {
    Object.values(calendario).flat().forEach((a) => {
      // +1 XP a cada 15 minutos, mínimo 1 XP por atividade
      xp += Math.max(1, Math.floor(a.duracao / 15));
    });
  }
  return xp;
}

export function calcularNivel(xp: number): number {
  for (let n = 30; n >= 1; n--) {
    if (xp >= NIVEL_CONFIG[n].xpMin) return n;
  }
  return 1;
}

export function calcularPerc(acertos: number, erros: number): number {
  const total = acertos + erros;
  if (total === 0) return 0;
  return Math.round((acertos / total) * 100);
}

export function calcularMedia(cadernos: Record<Grupo, TopicoCaderno>): number {
  const grupos = (["A", "B", "C", "D"] as Grupo[]).filter(
    (g) => cadernos[g].acertos + cadernos[g].erros > 0
  );
  if (grupos.length === 0) return 0;
  const soma = grupos.reduce((acc, g) => acc + calcularPerc(cadernos[g].acertos, cadernos[g].erros), 0);
  return Math.round(soma / grupos.length);
}

export function topicoKey(materia: string, topico: string): string {
  return `${materia}||${topico}`;
}

export function defaultTopicoState(): TopicoState {
  return {
    estudado: false,
    cadernos: {
      A: { acertos: 0, erros: 0 },
      B: { acertos: 0, erros: 0 },
      C: { acertos: 0, erros: 0 },
      D: { acertos: 0, erros: 0 },
    },
  };
}

export const MATERIAS: MateriaDef[] = [
  {
    nome: "Língua Portuguesa",
    codigo: 1,
    corBorder: "border-l-purple-500",
    corDot: "bg-purple-500",
    corBg: "bg-purple-50 dark:bg-purple-950/30",
    corText: "text-purple-700 dark:text-purple-300",
    corBadge: "bg-purple-100 text-purple-700 dark:bg-purple-400/20 dark:text-purple-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Ortografia",
      "Interpretação de Textos (Compreensão)",
      "Denotação e Conotação",
      "Tipos de Discurso (Direto, Indireto e Indireto Livre)",
      "Figuras de Linguagem",
      "Morfologia",
      "Sintaxe",
      "Sinônimos e Antônimos",
      "Pontuação",
      "Pronomes",
      "Concordância (Verbal e Nominal)",
      "Vozes (Voz Passiva e Voz Ativa)",
      "Conjugação. Reconhecimento e Emprego dos Modos e Tempos Verbais",
      "Crase",
      "Regência Nominal e Verbal",
      "Coerência. Coesão",
      "Reescrita de Frases",
    ],
  },
  {
    nome: "Matemática Financeira / Estatística e Raciocínio Lógico",
    codigo: 2,
    corBorder: "border-l-blue-500",
    corDot: "bg-blue-500",
    corBg: "bg-blue-50 dark:bg-blue-950/30",
    corText: "text-blue-700 dark:text-blue-300",
    corBadge: "bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Juros simples: Montante e juros; Taxa real e taxa efetiva; Taxas equivalentes; Capitais equivalentes",
      "Juros compostos: Montante e juros; Taxa real e taxa efetiva; Taxas equivalentes; Capitais equivalentes; Capitalização contínua",
      "Descontos: simples e composto; Desconto racional e desconto comercial",
      "Amortizações: Sistema Francês; Sistema de Amortização Constante; Sistema Misto",
      "Fluxo de caixa; Valor atual; Taxa interna de retorno",
      "Estatística Descritiva: gráficos, tabelas, medidas de posição (média, moda, mediana, quartis, mínimo e máximo) e de variabilidade (variância, desvio-padrão, amplitude)",
      "Técnicas de Contagem e Análise Combinatória: Combinações Simples, Arranjos e Permutação com e sem repetição",
      "Probabilidades: conceito, espaço amostral, axiomas e distribuições de probabilidades discretas e contínuas (Bernoulli, binomial, geométrica, uniforme, discreta, contínua, normal, Poisson, qui-quadrado, t de Student e F-Snedecor)",
      "Inferência estatística",
      "Amostragem: amostras casuais e não casuais; Processos de amostragem, incluindo estimativa pontual de parâmetros",
      "Intervalos de confiança",
      "Testes de hipóteses para médias e proporções",
      "Correlação e regressão linear simples",
      "Raciocínio Lógico: Estrutura lógica de relações arbitrárias entre pessoas, lugares, objetos ou eventos fictícios; dedução de novas informações das relações fornecidas e avaliação das condições usadas para estabelecer a estrutura daquelas relações",
      "Raciocínio Lógico: raciocínio verbal; raciocínio matemático; raciocínio sequencial; orientação espacial e temporal; formação de conceitos; discriminação de elementos",
      "Raciocínio Lógico: compreensão do processo lógico que, a partir de um conjunto de hipóteses, conduz, de forma válida, a conclusões determinadas",
    ],
  },
  {
    nome: "Administração Pública e Governança Pública",
    codigo: 3,
    corBorder: "border-l-sky-500",
    corDot: "bg-sky-500",
    corBg: "bg-sky-50 dark:bg-sky-950/30",
    corText: "text-sky-700 dark:text-sky-300",
    corBadge: "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Reformas Administrativas",
      "Gestão de suprimentos e logística na administração pública",
      "Processos participativos de gestão pública: orçamento participativo, parceria entre governo e sociedade, ouvidorias, governança interna e externa",
      "Novas formas de gestão de serviços públicos: formas de supervisão e contratualização de resultados",
      "Os controles interno e externo",
      "Responsabilização e Prestação de Contas",
      "Lei de Acesso à Informação",
      "Competências da Secretaria de Administração",
      "Governança Pública Organizacional: conceito, princípios, diretrizes e boa governança",
      "Stakeholders da Administração Pública: teoria da agência",
      "Instâncias de Governança: estratégica, tática e operacional; Modelo de Gestão do Poder Executivo do Estado do Ceará",
      "Integridade: conceitos e princípios; Programa de Integridade do Poder Executivo do Estado do Ceará",
      "Gestão de Riscos: conceito e princípios; gestão de riscos e gerenciamento de riscos; modelo de três linhas; Política de Gestão de Riscos do Poder Executivo do Estado do Ceará",
      "Responsabilidade do agente público: deveres e proibições do servidor público civil do Estado do Ceará; Código de Ética e Conduta da Administração Pública Estadual do Ceará; sanções éticas e disciplinares; sindicância; processo administrativo disciplinar e termo de ajustamento de conduta",
      "Assédio e violência no trabalho: conceitos e tipificação; Convenção nº 190/2019 da OIT; sistema de combate e prevenção ao assédio moral no Poder Executivo do Estado do Ceará",
    ],
  },
  {
    nome: "Microeconomia",
    codigo: 4,
    corBorder: "border-l-teal-500",
    corDot: "bg-teal-500",
    corBg: "bg-teal-50 dark:bg-teal-950/30",
    corText: "text-teal-700 dark:text-teal-300",
    corBadge: "bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Conceitos Básicos (Microeconomia)",
      "Demanda e Oferta",
      "Elasticidades",
      "Estruturas de Mercado",
      "Incidência Tributária — Impacto da Carga Tributária sobre a Economia",
    ],
  },
  {
    nome: "Macroeconomia",
    codigo: 5,
    corBorder: "border-l-green-500",
    corDot: "bg-green-500",
    corBg: "bg-green-50 dark:bg-green-950/30",
    corText: "text-green-700 dark:text-green-300",
    corBadge: "bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Conceitos Básicos da Macroeconomia: Objetivos e Tipos de Mercados",
      "Produto Nominal X Produto Real (Deflator do PIB)",
      "Inflação",
      "Contas Nacionais",
      "Balanço de Pagamentos",
      "Políticas de Governo ou Atuação do Estado na Economia",
      "Regimes Cambiais",
    ],
  },
  {
    nome: "Direito Constitucional",
    codigo: 6,
    corBorder: "border-l-rose-500",
    corDot: "bg-rose-500",
    corBg: "bg-rose-50 dark:bg-rose-950/30",
    corText: "text-rose-700 dark:text-rose-300",
    corBadge: "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Constituição da República Federativa do Brasil de 1988",
      "Aplicabilidade das normas constitucionais: normas de eficácia plena, contida e limitada; normas programáticas",
      "Direitos e garantias fundamentais: direitos e deveres individuais e coletivos, direitos sociais, direitos de nacionalidade, direitos políticos, partidos políticos",
      "Organização político-administrativa do Estado: Estado federal brasileiro, União, Estados, Distrito Federal, Municípios e Territórios",
      "Administração Pública: disposições gerais; servidores públicos",
      "Poder Executivo: atribuições e responsabilidades do Presidente da República",
      "Poder Legislativo: estrutura; funcionamento e atribuições; processo legislativo",
      "Processo legislativo federal: conceito, espécies normativas, modalidades, fases",
      "Processo legislativo estadual, distrital e municipal: normas constitucionais federais aplicáveis",
      "Fiscalização contábil, financeira e orçamentária; Comissões parlamentares de inquérito",
      "Poder Judiciário: disposições gerais",
      "Funções essenciais à Justiça: Ministério Público, advocacia pública",
      "Controle de constitucionalidade: conceito, histórico, sistemas, pressupostos, modalidades, órgãos competentes, sujeitos legitimados, objetos de controle, tipos de inconstitucionalidade, parâmetros de controle, formalidades, procedimentos, julgamentos, decisões, efeitos das decisões, técnicas de decisão, segurança e estabilidade das decisões",
      "Súmula vinculante",
      "Reclamação constitucional",
      "Controle não judicial de constitucionalidade: órgãos, institutos e procedimentos",
      "Controle de constitucionalidade nos estados e no Distrito Federal",
      "Ordem econômica e financeira",
      "Constituição do Estado do Ceará: Organização do Estado; Ordem Econômica e Social",
    ],
  },
  {
    nome: "Direito Administrativo",
    codigo: 7,
    corBorder: "border-l-red-500",
    corDot: "bg-red-500",
    corBg: "bg-red-50 dark:bg-red-950/30",
    corText: "text-red-700 dark:text-red-300",
    corBadge: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Estado, Governo e Administração Pública: conceitos, elementos e poderes do Estado",
      "Direito Administrativo: conceito, fontes e princípios",
      "Organização administrativa: centralização, descentralização, concentração e desconcentração",
      "Administração direta e indireta: autarquias, fundações públicas, empresas públicas e sociedades de economia mista",
      "Atos administrativos: conceito, elementos, atributos e espécies",
      "Poderes administrativos: vinculado, discricionário, hierárquico, disciplinar, regulamentar e de polícia",
      "Serviços públicos: conceito, classificação, formas de prestação e delegação",
      "Licitações e contratos administrativos (Lei 14.133/2021)",
      "Convênios e instrumentos congêneres",
      "Agentes públicos: espécies, cargos e funções",
      "Responsabilidade civil do Estado",
      "Controle da Administração Pública: administrativo, legislativo e judicial",
      "Bens públicos: classificação, uso e alienação",
      "Processo administrativo (Lei 9.784/1999)",
      "Improbidade administrativa (Lei 8.429/1992 com redação pela Lei 14.230/2021)",
      "Parcerias público-privadas e concessões",
      "Intervenção do Estado na propriedade",
      "Organização administrativa do Estado do Ceará",
      "Controle externo: Tribunal de Contas",
    ],
  },
  {
    nome: "Direito Civil",
    codigo: 8,
    corBorder: "border-l-orange-500",
    corDot: "bg-orange-500",
    corBg: "bg-orange-50 dark:bg-orange-950/30",
    corText: "text-orange-700 dark:text-orange-300",
    corBadge: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200",
    incluirDefault: false,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "A",
    topicos: [
      "Lei de Introdução às Normas do Direito Brasileiro (LINDB)",
      "Pessoas naturais: personalidade, capacidade civil e estado das pessoas",
      "Pessoas jurídicas: conceito, classificação e desconsideração da personalidade jurídica",
      "Bens: classificação jurídica",
      "Fatos, atos e negócios jurídicos: conceito, elementos, defeitos e invalidade",
      "Obrigações: conceito, espécies, modalidades e extinção",
      "Responsabilidade civil: pressupostos e modalidades",
      "Contratos em geral: formação, efeitos e extinção",
      "Contratos em espécie: compra e venda, locação, mútuo, comodato, fiança",
      "Direito das coisas: posse e propriedade",
      "Família e sucessões: conceitos gerais",
    ],
  },
  {
    nome: "Direito Penal",
    codigo: 9,
    corBorder: "border-l-amber-600",
    corDot: "bg-amber-600",
    corBg: "bg-amber-50 dark:bg-amber-950/30",
    corText: "text-amber-700 dark:text-amber-300",
    corBadge: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Princípios do Direito Penal e aplicação da lei penal",
      "Teoria geral do crime: elementos constitutivos e classificação",
      "Iter criminis: tentativa, desistência voluntária e arrependimento eficaz",
      "Culpabilidade: conceito e elementos; excludentes de ilicitude e culpabilidade",
      "Concurso de crimes e de pessoas",
      "Penas: espécies, aplicação e efeitos da condenação",
      "Crimes contra a Administração Pública: peculato, concussão, corrupção passiva e ativa, prevaricação",
      "Crimes de tráfico de influência e advocacia administrativa",
      "Crimes contra a ordem tributária (Lei 8.137/1990)",
      "Crimes de lavagem de dinheiro (Lei 9.613/1998)",
      "Lei Anticorrupção (Lei 12.846/2013)",
      "Lei de Improbidade Administrativa: aspectos penais",
      "Lei de Organização Criminosa (Lei 12.850/2013)",
      "Crimes contra o patrimônio público",
      "Crimes contra a fé pública: falsidade documental e ideológica",
      "Lei de Crimes Ambientais: aspectos penais relevantes para o fisco",
      "Crimes contra a ordem econômica e relações de consumo",
      "Processo penal: princípios, competência e ação penal",
      "Prisões cautelares e medidas assecuratórias",
      "Acordo de não persecução penal e colaboração premiada",
    ],
  },
  {
    nome: "Direito Financeiro",
    codigo: 10,
    corBorder: "border-l-yellow-500",
    corDot: "bg-yellow-500",
    corBg: "bg-yellow-50 dark:bg-yellow-950/30",
    corText: "text-yellow-700 dark:text-yellow-300",
    corBadge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-200",
    incluirDefault: false,
    pesoDefault: 1,
    prioridadeDefault: "Baixa",
    divisaoDefault: "A",
    topicos: [
      "Atividade financeira do Estado: conceito, natureza e normas",
      "Orçamento público: princípios orçamentários e espécies (PPA, LDO, LOA)",
      "Lei de Responsabilidade Fiscal (LC 101/2000): conceitos e limites",
      "Receita pública: conceito, classificação e estágios da receita",
      "Despesa pública: conceito, classificação e estágios da despesa",
      "Créditos adicionais: suplementares, especiais e extraordinários",
      "Dívida pública: ativa e passiva; interna e externa; consolidada e flutuante",
      "Fiscalização financeira e orçamentária: controle interno e externo",
    ],
  },
  {
    nome: "Contabilidade Geral",
    codigo: 11,
    corBorder: "border-l-emerald-500",
    corDot: "bg-emerald-500",
    corBg: "bg-emerald-50 dark:bg-emerald-950/30",
    corText: "text-emerald-700 dark:text-emerald-300",
    corBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "A",
    topicos: [
      "Conceito, objetivos, campo de atuação, usuários da informação contábil e características qualitativas da informação contábil",
      "Patrimônio: componentes, equação patrimonial e variações",
      "Plano de contas: conceito, estrutura e funcionamento",
      "Escrituração contábil: métodos, livros e regime de competência",
      "Balancete de verificação e apuração do resultado",
      "Balanço Patrimonial: ativo, passivo e patrimônio líquido",
      "Demonstração do Resultado do Exercício (DRE)",
      "Demonstração dos Fluxos de Caixa (DFC): método direto e indireto",
      "Demonstração das Mutações do Patrimônio Líquido (DMPL)",
      "Notas Explicativas e informações complementares",
      "Estoques: critérios de avaliação (PEPS, Média Ponderada)",
      "Ativo imobilizado: reconhecimento, mensuração e depreciação",
      "Provisões, passivos contingentes e ativos contingentes",
      "Ajuste a Valor Presente (AVP) e Ajuste a Valor Justo",
    ],
  },
  {
    nome: "Contabilidade Pública",
    codigo: 12,
    corBorder: "border-l-cyan-500",
    corDot: "bg-cyan-500",
    corBg: "bg-cyan-50 dark:bg-cyan-950/30",
    corText: "text-cyan-700 dark:text-cyan-300",
    corBadge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "A",
    topicos: [
      "Introdução à Contabilidade Aplicada ao Setor Público (CASP)",
      "Planejamento governamental: PPA, LDO e LOA",
      "Orçamento público: estrutura, classificação e execução",
      "Receita orçamentária: conceito, estágios e classificação",
      "Despesa orçamentária: conceito, estágios e classificação",
      "Créditos adicionais no setor público",
      "Restos a pagar: processados e não processados",
      "Suprimento de fundos",
      "Dívida ativa: conceito, inscrição e contabilização",
      "Balanço Orçamentário (BO)",
      "Balanço Financeiro (BF)",
      "Balanço Patrimonial do Setor Público (BP)",
      "Demonstração das Variações Patrimoniais (DVP)",
      "Demonstração dos Fluxos de Caixa do Setor Público (DFC)",
      "Normas Brasileiras de Contabilidade Aplicadas ao Setor Público (NBC TSP)",
      "MCASP — Manual de Contabilidade Aplicada ao Setor Público",
      "Variações Patrimoniais Aumentativas (VPA) e Diminutivas (VPD)",
      "Regime de competência e regime de caixa no setor público",
      "Ativo e passivo financeiro e permanente",
      "Depreciação, amortização e exaustão no setor público",
      "Reavaliação e redução ao valor recuperável no setor público",
      "Fundos especiais e entidades de previdência social",
      "Convênios, transferências voluntárias e instrumentos correlatos",
      "Prestação de contas e tomada de contas especial",
      "Controle interno na gestão pública federal",
      "Despesas com pessoal: conceitos e limites da LRF",
      "Sistema Integrado de Administração Financeira (SIAFI): estrutura e funcionalidades",
    ],
  },
  {
    nome: "Auditoria",
    codigo: 13,
    corBorder: "border-l-lime-500",
    corDot: "bg-lime-500",
    corBg: "bg-lime-50 dark:bg-lime-950/30",
    corText: "text-lime-700 dark:text-lime-300",
    corBadge: "bg-lime-100 text-lime-700 dark:bg-lime-400/20 dark:text-lime-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "A",
    topicos: [
      "Diferenças entre a Auditoria Interna e a Auditoria Independente (Externa)",
      "Perícia Contábil: conceito, tipos e laudo pericial",
      "Normas Profissionais do Auditor Independente",
      "Planejamento de Auditoria Independente",
      "Materialidade, Relevância e Risco em Auditoria Independente",
      "Evidência em Auditoria",
      "Testes e Procedimentos em Auditoria",
      "Amostragem em Auditoria",
      "Contingências e Estimativas Contábeis (Auditoria)",
      "Fraude e Erro (Auditoria)",
      "Transações com Partes Relacionadas",
      "Transações e Eventos Subsequentes",
      "Representações Formais/Carta de Responsabilidade",
      "Continuidade Normal das Atividades da Entidade",
      "Utilização do Trabalho de Outros Profissionais",
      "Documentação de Auditoria/Papéis de Trabalho",
      "Opinião do Auditor Independente/Relatórios e Pareceres de Auditoria",
      "Testes em Áreas Específicas das Demonstrações Contábeis",
      "Aspectos Gerais da Auditoria Interna",
      "Normas Técnicas do Auditor Interno (NBC TI 01 - ex NBC-T-12)",
      "Normas Profissionais do Auditor Interno (NBC PI 01)",
      "Normas Internacionais de Auditoria Interna (IIA)",
    ],
  },
  {
    nome: "Direito Tributário",
    codigo: 14,
    corBorder: "border-l-orange-600",
    corDot: "bg-orange-600",
    corBg: "bg-orange-50 dark:bg-orange-950/30",
    corText: "text-orange-700 dark:text-orange-300",
    corBadge: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "B",
    topicos: [
      "Princípios Gerais do Direito Tributário: Espécies de Tributos",
      "Competência tributária: privativa, comum e residual",
      "Limitações constitucionais ao poder de tributar: imunidades e princípios",
      "Obrigação tributária: principal e acessória; fato gerador; hipótese de incidência",
      "Sujeição ativa e passiva; responsabilidade tributária",
      "Crédito tributário: constituição, suspensão e extinção",
      "Exclusão do crédito tributário: isenção, anistia e imunidade",
      "Administração tributária: fiscalização, sigilo fiscal e dívida ativa",
      "Processo administrativo tributário",
      "Execução fiscal (Lei 6.830/1980)",
      "Imposto sobre a Renda (IRPJ e IRPF): fatos geradores e apuração",
      "Contribuição Social sobre o Lucro Líquido (CSLL)",
      "PIS e COFINS: regime cumulativo e não cumulativo",
      "Imposto sobre Produtos Industrializados (IPI): aspectos gerais",
      "ICMS: aspectos gerais, fato gerador e não cumulatividade",
      "ISS — Imposto sobre Serviços de Qualquer Natureza",
      "Simples Nacional: regime especial unificado (LC 123/2006)",
      "Lucro Presumido: apuração e particularidades",
      "Lucro Real: apuração, LALUR e LACS",
      "Contribuições previdenciárias: INSS patronal e do empregado",
      "Reforma Tributária (EC 132/2023): IBS, CBS, IS e Fundo de Desenvolvimento Regional",
      "Planejamento tributário: conceito, limites, elusão, elisão e evasão",
      "Imposto sobre Transmissão Causa Mortis e Doação (ITCMD)",
      "ITBI — Imposto sobre Transmissão de Bens Imóveis",
      "Tributação internacional: preços de transferência e tratados para evitar bitributação",
    ],
  },
  {
    nome: "Legislação Estadual",
    codigo: 15,
    corBorder: "border-l-amber-500",
    corDot: "bg-amber-500",
    corBg: "bg-amber-50 dark:bg-amber-950/30",
    corText: "text-amber-700 dark:text-amber-300",
    corBadge: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "B",
    topicos: [
      "Decreto nº 33.327/2019 — Regulamento do ICMS do Estado do Ceará (RICMS-CE)",
      "Lei nº 12.670/1996 — Lei do ICMS do Estado do Ceará",
      "Legislação do IPVA do Estado do Ceará",
      "Legislação do ITCD do Estado do Ceará",
      "Regime diferenciado de tributação e benefícios fiscais do ICMS no Ceará",
    ],
  },
  {
    nome: "Contabilidade Avançada",
    codigo: 16,
    corBorder: "border-l-indigo-500",
    corDot: "bg-indigo-500",
    corBg: "bg-indigo-50 dark:bg-indigo-950/30",
    corText: "text-indigo-700 dark:text-indigo-300",
    corBadge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "B",
    topicos: [
      "CPC 23 — Políticas Contábeis, Mudança de Estimativa e Retificação de Erro",
      "CPC 01 — Redução ao Valor Recuperável de Ativos (Impairment)",
      "CPC 04 — Ativo Intangível: reconhecimento e mensuração",
      "CPC 05 — Divulgação sobre Partes Relacionadas",
      "CPC 07 — Subvenção e Assistência Governamentais",
      "CPC 15 — Combinação de Negócios",
      "CPC 18 — Investimento em Coligada, Controlada e Empreendimento Controlado em Conjunto (MEP)",
      "CPC 27 — Ativo Imobilizado: reconhecimento, mensuração e depreciação",
      "CPC 32 — Tributos sobre o Lucro (diferenças temporárias)",
      "CPC 36 — Demonstrações Consolidadas",
      "CPC 46 — Mensuração ao Valor Justo",
      "CPC 47 — Receita de Contrato com Cliente",
      "CPC 48 — Instrumentos Financeiros",
      "CPC 06(R2) / IFRS 16 — Operações de Arrendamento Mercantil (Leasing)",
    ],
  },
  {
    nome: "Contabilidade de Custos",
    codigo: 17,
    corBorder: "border-l-violet-500",
    corDot: "bg-violet-500",
    corBg: "bg-violet-50 dark:bg-violet-950/30",
    corText: "text-violet-700 dark:text-violet-300",
    corBadge: "bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "C",
    topicos: [
      "Definições — Diferença entre Gastos, Despesas, Custos e Perdas",
      "Classificação de Custos: diretos/indiretos, fixos/variáveis",
      "Custeio por Absorção: apuração e rateio de custos",
      "Custeio Variável (Direto): margem de contribuição e análise CVL",
      "Custeio ABC — Activity Based Costing",
      "Custo-padrão: conceito, tipos e análise de variações",
    ],
  },
  {
    nome: "Fluência de Dados",
    codigo: 18,
    corBorder: "border-l-fuchsia-500",
    corDot: "bg-fuchsia-500",
    corBg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    corText: "text-fuchsia-700 dark:text-fuchsia-300",
    corBadge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/20 dark:text-fuchsia-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "C",
    topicos: [
      "Fundamentos e Princípios da Ciência de Dados",
      "Análise exploratória e estatística descritiva aplicada a dados",
      "Visualização de dados: gráficos, dashboards e storytelling",
      "Python para análise de dados (pandas, numpy, matplotlib)",
      "SQL: consultas, filtragem, agregação e joins",
      "Machine Learning: conceitos fundamentais e aplicações",
      "Business Intelligence e ferramentas de análise",
      "Big Data: conceitos, arquitetura e tecnologias",
      "Governança de dados e Lei Geral de Proteção de Dados (LGPD)",
      "ETL, pipelines de dados e integração",
      "Inteligência Artificial aplicada ao setor público",
      "Indicadores-chave de desempenho (KPIs) e métricas de gestão",
    ],
  },
  {
    nome: "Finanças Públicas",
    codigo: 19,
    corBorder: "border-l-yellow-400",
    corDot: "bg-yellow-400",
    corBg: "bg-yellow-50 dark:bg-yellow-950/30",
    corText: "text-yellow-700 dark:text-yellow-300",
    corBadge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-200",
    incluirDefault: true,
    pesoDefault: 2,
    prioridadeDefault: "Alta",
    divisaoDefault: "C",
    topicos: [
      "Bem Estar e Funções do Governo: alocativa, distributiva e estabilizadora",
      "Falhas de mercado: externalidades, bens públicos, monopólios naturais e assimetria de informação",
      "Tributação ótima: eficiência, equidade e incidência tributária",
      "Dívida pública e sustentabilidade fiscal: conceitos e indicadores",
    ],
  },
];

export function buildDefaultTopicos(): Record<string, TopicoState> {
  const topicos: Record<string, TopicoState> = {};
  MATERIAS.forEach((m) => {
    m.topicos.forEach((t) => {
      topicos[topicoKey(m.nome, t)] = defaultTopicoState();
    });
  });
  return topicos;
}

export function buildDefaultConfigCiclo(): EstudoConfigCiclo {
  const materias: Record<string, ConfigMateria> = {};
  MATERIAS.forEach((m) => {
    materias[m.nome] = {
      incluir: m.incluirDefault,
      peso: m.pesoDefault,
      prioridade: m.prioridadeDefault,
      divisao: m.divisaoDefault,
    };
  });
  return {
    materias,
    horasPorDia: {
      segunda: 180,
      terca: 180,
      quarta: 180,
      quinta: 180,
      sexta: 180,
      sabado: 300,
      domingo: 240,
    },
  };
}

export const DEFAULT_ESTUDO_STATE: EstudoState = {
  topicos: buildDefaultTopicos(),
  calendario: {},
  cadernoErros: [],
  configCiclo: buildDefaultConfigCiclo(),
  streak: 0,
  semanasOK: 0,
};
