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
  { id: "primeiro_passo",    icone: Sprout,        cor: "text-emerald-600", nome: "Primeiro Passo",    condicao: "Complete sua 1ª semana de estudos" },
  { id: "primeiro_mes",      icone: CalendarCheck, cor: "text-blue-600",    nome: "Primeiro Mês",      condicao: "Complete todas as semanas de um mês" },
  { id: "maratonista",       icone: Dumbbell,      cor: "text-orange-600",  nome: "Maratonista",       condicao: "Estude 2000+ min em uma semana" },
  { id: "em_chamas",         icone: Flame,         cor: "text-red-600",     nome: "Em Chamas",         condicao: "3 dias consecutivos estudando" },
  { id: "semana_fogo",       icone: Zap,           cor: "text-orange-500",  nome: "Semana de Fogo",    condicao: "7 dias consecutivos estudando" },
  { id: "incansavel",        icone: Swords,        cor: "text-red-700",     nome: "Incansável",        condicao: "30 dias consecutivos estudando" },
  { id: "explorador",        icone: Sparkles,      cor: "text-violet-600",  nome: "Explorador",        condicao: "Estude 25 tópicos" },
  { id: "construtor",        icone: Mountain,      cor: "text-emerald-700", nome: "Construtor",        condicao: "Estude 100 tópicos" },
  { id: "meio_caminho",      icone: TrendingUp,    cor: "text-violet-600",  nome: "Meio Caminho",      condicao: "Acumule 500 XP" },
  { id: "expert",            icone: Star,          cor: "text-amber-500",   nome: "Expert",            condicao: "Acumule 1500 XP" },
  { id: "fiscal_elite",      icone: Crown,         cor: "text-amber-500",   nome: "Fiscal de Elite",   condicao: "Acumule 26100 XP — nível máximo!" },
  { id: "sniper_edital",     icone: Crosshair,     cor: "text-blue-600",    nome: "Sniper do Edital",  condicao: "Marque 10+ semanas com Meta Batida" },
  { id: "estudante_modelo",  icone: GraduationCap, cor: "text-emerald-600", nome: "Estudante Modelo",  condicao: "100+ horas totais de estudo" },
  { id: "sefaz_ready",       icone: Rocket,        cor: "text-rose-600",    nome: "SEFAZ Ready",       condicao: "200+ horas totais + 30 semanas OK" },
  { id: "primeira_vitoria",  icone: Trophy,        cor: "text-amber-600",   nome: "Primeira Vitória",  condicao: "Conclua 100% dos tópicos de 1 matéria" },
  { id: "pluridisciplinar",  icone: BookMarked,    cor: "text-blue-600",    nome: "Pluridisciplinar",  condicao: "Conclua 3 matérias completamente" },
  { id: "generalista",       icone: Compass,       cor: "text-teal-600",    nome: "Generalista",       condicao: "Conclua 5 matérias completamente" },
  { id: "dominio_total",     icone: Diamond,       cor: "text-cyan-600",    nome: "Domínio Total",     condicao: "Conclua todas as matérias do edital" },
  { id: "aprendiz",          icone: Pencil,        cor: "text-gray-600",    nome: "Aprendiz",          condicao: "Adicione o 1º erro ao Caderno de Erros" },
  { id: "revisor",           icone: BadgeCheck,    cor: "text-green-600",   nome: "Revisor",           condicao: "Revise 10 erros do Caderno" },
  { id: "praticante",        icone: HelpCircle,    cor: "text-purple-600",  nome: "Praticante",        condicao: "Faça 50 cadernos de questões" },
  { id: "atirador",          icone: Crosshair,     cor: "text-indigo-600",  nome: "Atirador",          condicao: "Faça 200 cadernos de questões" },
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

export function calcularStreakDias(calendario: Record<string, AtividadeCalendario[]>): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(hoje);

  const todayKey = dia.toISOString().split("T")[0];
  if (!calendario[todayKey] || calendario[todayKey].length === 0) {
    dia.setDate(dia.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = dia.toISOString().split("T")[0];
    if (calendario[key] && calendario[key].length > 0) {
      streak++;
      dia.setDate(dia.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
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
    nome: "Administração Pública e Governança Pública",
    codigo: 1,
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
    nome: "Auditoria",
    codigo: 2,
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
      "Amostragem em Auditoria",
      "Aspectos Gerais da Auditoria Interna",
      "Contingências e Estimativas Contábeis (Auditoria)",
      "Continuidade Normal das Atividades da Entidade",
      "Diferenças entre a Auditoria Interna e a Auditoria Independente",
      "Documentação de Auditoria/Papéis de Trabalho",
      "Evidência em Auditoria",
      "Fraude e Erro (Auditoria)",
      "Materialidade, Relevância e Risco em Auditoria Independente",
      "Normas Internacionais de Auditoria Interna (IIA)",
      "Normas Profissionais do Auditor Independente",
      "Normas Técnicas do Auditor Interno (NBC TI 01 - ex NBC-T-12)",
      "Opinião do Auditor Independente/Relatórios e Pareceres de Auditoria",
      "Perícia Contábil",
      "Planejamento de Auditoria Independente",
      "Testes em Áreas Específicas das Demonstrações Contábeis",
      "Testes e Procedimentos em Auditoria",
      "Transações com Partes Relacionadas",
      "Transações e Eventos Subsequentes",
      "Utilização do Trabalho de Outros Profissionais",
    ],
  },
  {
    nome: "Contabilidade Avançada",
    codigo: 3,
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
      "CPC 23 Políticas Contábeis, Mudança de Estimativa e Retificação de Erro",
      "CPC 46 Mensuração a Valor Justo",
      "CPC 12 Ajuste a Valor Presente",
      "CPC 48 Instrumentos financeiros",
      "CPC 28 Propriedade para Investimento",
      "CPC 06 Operações de arrendamento",
      "CPC 18 Investimentos Avaliados pelo Custo ou MEP",
      "CPC 07 Subvenção e Assistência governamentais",
      "CPC 02 Efeitos de Mudanças/Taxas de Câmbio/Investimentos no Exterior e Conversão de Demonstrações",
      "Balanço Patrimonial",
      "DVA",
      "DFC (estrutura e classificação)",
      "DMPL",
      "DRE",
      "DRA",
    ],
  },
  {
    nome: "Contabilidade de Custos",
    codigo: 4,
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
      "Definições - Diferença entre Gastos, Despesas, Custos e Perdas",
      "Classificação de Custos",
      "Custeio por Absorção",
      "Custeio Direto/Variável",
      "Custeio Baseado em Atividades (ABC)",
      "Equivalente de Produção: Produção por ordem, produção contínua e produção conjunta: apuração do custo da produção acabada, dos produtos em elaboração e dos produtos vendidos",
      "Custo padrão",
      "Ponto de Equilíbrio",
      "Margem de Contribuição",
    ],
  },
  {
    nome: "Contabilidade Geral",
    codigo: 5,
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
      "Ativo",
      "Atos e Fatos Contábeis",
      "Balancete de Verificação",
      "Conceito, Objeto, Finalidade",
      "Erros de Escrituração",
      "Escrituração",
      "Estoques e Operação com Mercadorias",
      "Estrutura Conceitual Básica da Contabilidade (CPC 00)",
      "Passivo",
      "Patrimônio Líquido",
      "Plano de Contas",
      "Princípios Contábeis",
      "Provisões, Passivos e Ativos Contingentes",
      "Teoria das Contas",
    ],
  },
  {
    nome: "Contabilidade Pública",
    codigo: 6,
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
      "Introdução à Administração Financeira e Orçamentária",
      "Introdução à Contabilidade Aplicada ao Setor Público",
      "Manual de Contabilidade Aplicada ao Setor Público (11ª edição): Procedimentos Contábeis Específicos",
      "Manual de Contabilidade Aplicada ao Setor Público (11ª edição): Plano de Contas Aplicado ao Setor Público",
      "Manual de Contabilidade Aplicada ao Setor Público (11ª edição): Demonstrações Contábeis Aplicadas ao Setor Público",
      "Aspectos Patrimoniais da Contabilidade Pública",
      "Escrituração Contábil Pública",
      "NBC TSP 01",
      "NBC TSP 02",
      "NBC TSP 03",
      "NBC TSP 04",
      "NBC TSP 05",
      "NBC TSP 06",
      "NBC TSP 07",
      "NBC TSP 08",
      "NBC TSP 09 e 10",
      "NBC TSP 11",
      "NBC TSP 12",
      "NBC TSP 13",
      "NBC TSP 14",
      "NBC TSP 18",
      "NBC TSP 21",
      "NBC TSP 23",
      "NBC TSP 25",
      "NBC TSP 30, 31 e 33",
      "NBC TSP 34",
      "Decreto nº 10.540/2020",
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
    nome: "Direito Constitucional",
    codigo: 9,
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
      "Instrumentos Orçamentários na CF 88: PPA, LDO, LOA",
      "Princípios Orçamentários",
      "Ciclo Orçamentário",
      "Créditos Adicionais",
      "Lei de Responsabilidade Fiscal - LRF",
      "Lei nº 4.320/1964: Restos a pagar",
      "Lei nº 4.320/1964: Despesas de Exercícios Anteriores (DEA)",
      "Lei nº 4.320/1964: Fundos Especiais de Despesa",
    ],
  },
  {
    nome: "Direito Penal",
    codigo: 11,
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
    nome: "Direito Tributário",
    codigo: 12,
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
      "Princípios Gerais - Espécies de Tributos",
      "Limitações do Poder de Tributar: Princípios Tributários e Imunidades Tributárias",
      "Competência Tributária",
      "Repartição das Receitas Tributárias",
      "Impostos Municipais",
      "Impostos Federais",
      "Impostos Estaduais",
      "Normas Gerais de Direito Tributário: Legislação Tributária (leis, tratados, decretos, normas complementares); vigência; aplicação; interpretação e integração",
      "Obrigação Tributária: disposições gerais; fato gerador; sujeito ativo; sujeito passivo (solidariedade, capacidade tributária, domicílio tributário)",
      "Responsabilidade Tributária: disposição geral; responsabilidade dos sucessores; responsabilidade de terceiros; responsabilidade por infrações",
      "Crédito Tributário: disposições gerais; constituição (lançamento e modalidades); suspensão da exigibilidade; moratória",
      "Extinção do Crédito Tributário: modalidades; pagamento; pagamento indevido; demais modalidades",
      "Exclusão do Crédito Tributário: disposições gerais; isenção; anistia",
      "Garantias e Privilégios do Crédito Tributário: disposições gerais; preferências",
      "Administração Tributária: fiscalização; Dívida Ativa; Certidões Negativas; disposições finais e transitórias",
      "Legislação Tributária Nacional: LC nº 24/1975 (convênios ICMS isenções)",
      "LC nº 87/1996",
      "LC Federal nº 105/2001 (sigilo operações financeiras)",
      "LC nº 116/2003 (ISSQN e conflito ICMS)",
      "LC nº 123/2006 (Simples Nacional)",
      "Resolução CGSN nº 140/2018",
      "LC nº 160/2017 (remissão créditos tributários)",
      "LC nº 192/2022 (ICMS monofásico combustíveis)",
      "Emenda Constitucional nº 132/2023",
      "Lei Complementar nº 214/2025: IBS (Imposto sobre Bens e Serviços) e Comitê Gestor do IBS; CBS (Contribuição sobre Bens e Serviços)",
      "Lei Complementar nº 227/2026 (administração e gestão do IBS), inclusive dispositivos com vigência nos anos seguintes",
    ],
  },
  {
    nome: "Finanças Públicas",
    codigo: 13,
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
      "Bem Estar e Funções do Governo",
      "Falhas de mercado",
      "Política fiscal",
      "Financiamento dos Gastos Públicos",
      "Dívida Pública, NFSP e Tipos de Déficit Público no Brasil",
    ],
  },
  {
    nome: "Fluência de Dados",
    codigo: 14,
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
      "Big Data",
      "Data Warehouse e Data Mart",
      "Business Intelligence e Analytics",
      "Banco de dados: Modelo Relacional",
      "Bancos de Dados não Relacionais (NoSQL)",
      "Linguagem SQL",
      "Análise de Cluster (Agrupamento)",
      "Data Mining",
      "Inteligência Artificial",
      "Governança e Qualidade de Dados",
      "Lei nº 13.709/2018 - LGPD",
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
      "Decreto nº 33.327/2019 — ICMS do Ceará",
      "Lei nº 15.812/2015 — ITCMD do Ceará",
      "Lei nº 12.023/1992 — IPVA do Ceará",
      "Lei Complementar nº 37/2003 — FECOP",
      "Lei Estadual nº 18.665/2023 - ICMS (CE)",
    ],
  },
  {
    nome: "Língua Portuguesa",
    codigo: 16,
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
    nome: "Macroeconomia",
    codigo: 17,
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
    nome: "Matemática Financeira / Estatística e Raciocínio Lógico",
    codigo: 18,
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
    nome: "Microeconomia",
    codigo: 19,
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
