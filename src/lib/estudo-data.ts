import type { LucideIcon } from "lucide-react";
import {
  Sprout, Leaf, BookOpen, BookMarked, Brain, Target, Crosshair,
  Zap, Flame, Star, Award, Trophy, Gem, Compass, Rocket,
  Sparkles, TrendingUp, Mountain, Swords, BadgeCheck, Medal,
  Diamond, Infinity as InfinityIcon, Crown,
  CalendarCheck, Dumbbell, GraduationCap, CheckCircle2,
  HelpCircle, RotateCcw, NotebookPen, ListChecks, Layers,
  Shield, ShieldCheck, Lightbulb, Sun, Sunrise, Pencil,
} from "lucide-react";

export type { LucideIcon };
export type Grupo = "A" | "B" | "C" | "D";
export type AtividadeTipo = "estudo" | "questoes" | "recall" | "caderno_erros" | "bateria" | "cartas" | "materia_concluida";
export type TipoCarta = "monstro" | "armadilha" | "tesouro" | "boss";

export interface Carta {
  id: string;
  tipo: TipoCarta;
  tipoOriginal?: TipoCarta; // tipo antes de escalar para Boss
  materia?: string;
  topico?: string;
  frente: string;
  verso: string;
  gabarito?: "verdadeiro" | "falso"; // somente para armadilha
  intervalo: number;      // dias até próxima revisão
  facilidade: number;     // SM-2 easiness factor (padrão 2.5)
  repeticoes: number;     // revisões bem-sucedidas consecutivas
  proximaRevisao: string; // YYYY-MM-DD
  criada: string;         // YYYY-MM-DD
  acertos: number;
  erros: number;
}

export interface TopicoCaderno {
  acertos: number;
  erros: number;
  // dateKeyLocal da última vez que acertos/erros mudaram — ausente em registros antigos (sempre
  // elegível a reforço, sem dado prévio pra dizer o contrário). Usado só pelo cooldown de
  // "reforço" da Trilha Dinâmica (trilha-dinamica.ts), não afeta nada mais.
  atualizadoEm?: string;
}

export type NivelImportancia = "alta" | "media" | "baixa";

// os dois "checkpoints" de revisão das questões do link, contados a partir da conclusão dos 4
// grupos A-D do tópico — ver CHECKPOINTS_REVISAO_LINK em trilha-dinamica.ts
export type ChecklistRevisaoLink = "d7" | "d30";

// resultado de UM checkpoint da revisão de questões do link (aba Questões). Só existe depois do
// primeiro registro daquele checkpoint; sem isso a revisão ainda não foi feita.
export interface RevisaoLinkTopico {
  acertos: number;
  erros: number;
  atualizadoEm: string; // dateKeyLocal do último registro — mesmo cooldown de reforço do A-D
}

export interface TopicoState {
  estudado: boolean;
  cadernos: Record<Grupo, TopicoCaderno>;
  // link do caderno de questões do tópico (ex.: TecConcursos) pra cada checkpoint de revisão da
  // Trilha — um por checkpoint, já que na prática é um caderno diferente por revisão (o de 30
  // dias costuma cobrir mais questões que o de 7). Cadastrados na aba Questões. Substituiu o
  // link único por grupo A-D (TopicoCaderno.link), que exigia cadastrar 4 vezes o mesmo link.
  linkRevisao7d?: string;
  linkRevisao30d?: string;
  // um resultado por checkpoint — independentes entre si (fazer o de 7 dias não altera o de 30)
  revisoesLink?: Partial<Record<ChecklistRevisaoLink, RevisaoLinkTopico>>;
  // link de um caderno CURTO (até ~10 questões) pra praticar logo depois de marcar o tópico como
  // estudado — reforço imediato, distinto do escalonamento A-D e dos checkpoints de 7/30 dias.
  // Cadastrado na aba Questões. Some da Trilha assim que reforcoImediatoFeito é registrado.
  linkReforcoImediato?: string;
  reforcoImediatoFeito?: RevisaoLinkTopico;
  // nível de importância do tópico pro edital (ausente = não definido) — só indicação visual no
  // Edital, não afeta cálculo de progresso/XP/Ciclo/Trilha
  importancia?: NivelImportancia;
}

export interface AtividadeCalendario {
  id: string;
  tipo: AtividadeTipo;
  descricao: string;
  duracao: number;
  grupo?: Grupo;
  materia?: string;
  topico?: string;
  paginas?: number; // páginas lidas na sessão — alimenta o KPI "páginas por hora"
}

export interface ConfigMateria {
  incluir: boolean;
  peso: 1 | 2;
  prioridade: "Alta" | "Baixa";
  divisao: "A" | "B" | "C";
  // link do caderno de questões (ex.: TecConcursos) pra revisão de 30 questões da matéria
  // inteira, que libera DIAS_REVISAO_MATERIA dias depois dela bater 100% — é por matéria, não
  // por tópico, já que a revisão engloba todos os tópicos dela. Cadastrado na aba Questões.
  linkRevisaoMateria?: string;
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

// --- Trilha de estudos (plano guiado por metas, estilo Gurujá) ---
// Gerada por src/lib/trilha-generator.ts (algoritmo determinístico); a IA só escreve a
// `orientacao` de cada meta depois (graceful degradation: sem IA a trilha funciona igual).

export type TrilhaDisponibilidade = "easy" | "normal" | "hard" | "hardcore";
export type TrilhaNivelMateria = "nunca" | "comecei" | "sem_confianca" | "arestas";
export type TrilhaAtividadeTipo = "teoria" | "questoes" | "revisao";
export type TrilhaAtividadeStatus = "nao_iniciada" | "iniciada" | "falta_acabar" | "concluida";

export interface TrilhaAtividade {
  id: string; // determinístico: `${meta}:${tipo}:${materia}:${primeiroTopico}` — estável em regeração
  tipo: TrilhaAtividadeTipo;
  materia: string; // nome (mesma chave usada em topicoKey)
  topicos: string[]; // bloco de tópicos cobertos pela atividade
  duracaoMin: number;
  quantidadeQuestoes?: number; // só tipo "questoes"
  numeroRevisao?: 1 | 2; // só tipo "revisao" (1 = ~7 dias, 2 = ~30 dias no ritmo de 1 meta/semana)
  teoriaRapida?: boolean; // teoria de nível "sem_confianca" (rótulo "revisão rápida" na UI)
  status: TrilhaAtividadeStatus;
}

export interface TrilhaMeta {
  numero: number; // 1-based, sequencial
  atividades: TrilhaAtividade[];
  orientacao?: string; // 1-2 frases da IA
  concluidaEm?: string; // ISO datetime — alimenta o cálculo de ritmo real
}

export interface TrilhaConfig {
  disponibilidade: TrilhaDisponibilidade;
  nivelPorMateria: Record<string, TrilhaNivelMateria>; // chave = nome da matéria
  /** @deprecated fonte de verdade de "matéria ativa" agora é EstudoConfigCiclo.materias[].incluir
   * (Ciclo de Estudos). Mantido opcional só pra não quebrar trilhas antigas persistidas — não é
   * mais lido pelo gerador nem escrito pelo wizard (ver docs/estudo-trilha.md). */
  puladas?: string[];
}

export interface TrilhaEstudo {
  config: TrilhaConfig;
  metas: TrilhaMeta[];
  criadaEm: string; // ISO
  versao: number; // incrementa em regeneração/atualização
}

// Fonte única (wizard + gerador). minutosSemana = ponto médio da faixa.
export const TRILHA_DISPONIBILIDADE_CONFIG: Record<
  TrilhaDisponibilidade,
  { label: string; faixa: string; minutosSemana: number }
> = {
  easy: { label: "Easy", faixa: "21 a 28 horas semanais", minutosSemana: 1470 },
  normal: { label: "Normal", faixa: "28 a 35 horas semanais", minutosSemana: 1890 },
  hard: { label: "Hard", faixa: "35 a 42 horas semanais", minutosSemana: 2310 },
  hardcore: { label: "Hardcore", faixa: "+ 42 horas semanais", minutosSemana: 2700 },
};

export const TRILHA_NIVEL_CONFIG: Record<TrilhaNivelMateria, { label: string; curto: string }> = {
  nunca: { label: "Nunca estudei", curto: "Nunca estudei" },
  comecei: { label: "Comecei teoria, mas não terminei", curto: "Comecei teoria" },
  sem_confianca: { label: "Terminei teoria, mas não tenho confiança", curto: "Sem confiança" },
  arestas: { label: "Só falta aparar as arestas", curto: "Aparar arestas" },
};

// --- Trilha DINÂMICA (método pessoal do usuário — regras em docs/estudo-trilha.md) ---
// Quase tudo é DERIVADO na hora (src/lib/trilha-dinamica.ts) do estado que já existe: tópicos
// estudados, cadernos A-D (grupo "feito" = acertos+erros > 0) e sessões do calendário. Este
// estado guarda só o que não dá pra derivar:
export interface TrilhaDinamicaState {
  ativa: boolean;
  iniciadaEm: string; // dateKey
  /** @deprecated modelo diário por grupo A/B/C substituído pela meta semanal (computarMetaSemana
   * em trilha-dinamica.ts, cobre todas as matérias ativas de uma vez). Mantido opcional só pra não
   * quebrar trilhas antigas persistidas — não é mais lido pelo motor. */
  grupoCiclo?: "A" | "B" | "C";
  /** @deprecated ver grupoCiclo acima */
  grupoCicloAvancadoEm?: string;
  // matéria 100% (todos os tópicos estudados + 4 grupos de questões de cada tópico feitos):
  // a data de conclusão agenda a revisão de 30 questões pro DIA SEGUINTE
  conclusaoMaterias: Record<string, string>; // nome -> dateKey da conclusão
  revisoes30Feitas: Record<string, string[]>; // nome -> dateKeys das revisões de 30 questões feitas
  // revisão das cartas a cada 2 domingos, ancorada no 1º domingo após a ativação
  ancoraCartas: string; // dateKey (um domingo)
  cartasFeitasEm: string[]; // dateKeys dos domingos em que a revisão foi feita
}

export interface EstudoState {
  topicos: Record<string, TopicoState>;
  calendario: Record<string, AtividadeCalendario[]>;
  cartas: Carta[];
  configCiclo: EstudoConfigCiclo;
  streak: number;
  semanasOK: number;
  /** @deprecated trilha antiga de metas pré-geradas — substituída pela trilhaDinamica; mantido
   * só pra não descartar dados persistidos de estados antigos */
  trilha?: TrilhaEstudo;
  trilhaDinamica?: TrilhaDinamicaState; // ausente = usuário ainda não ativou (aba mostra intro)
  pdfs: PdfEstudo[];
  // tópicos ocultos do Edital (topicoKey) — "excluir" é reversível: some da lista, do Ciclo, da
  // Trilha e de todos os cálculos (% do edital, tópico atual etc.), mas o progresso já registrado
  // (estudado, cadernos A-D) fica guardado em `topicos` e volta do jeito que estava se reativado
  topicosExcluidos: string[];
}

// --- Biblioteca de PDFs ---

// PDF de estudo (ex.: aulas do Estratégia) — SÓ metadados + progresso de leitura; o arquivo em
// si nunca é enviado (continua no leitor do usuário — sem custo de storage, sem copyright).
export type Alternativa = "A" | "B" | "C" | "D" | "E";

// Resultado de UMA questão da lista escalonada gerada a partir do PDF — grupo A-D é derivado da
// posição na lista (ver gerarQuestoesGrupos), não escolhido à mão. acertou null = ainda não
// respondida (distinto de false = respondida e errada). alternativa = a letra que o usuário
// marcou no gabarito (independente de acertou/errou — é só o registro de qual opção ele indicou).
export interface QuestaoResultado {
  numero: number; // 1-based, posição na lista de questões do tópico
  grupo: Grupo;
  acertou: boolean | null;
  alternativa?: Alternativa;
}

// Lista de questões de um tópico, mapeada a partir do PDF aberto no leitor (páginas depois de
// PdfEstudo.paginaConteudoFim). O agregado (quantos certos/errados por grupo) é sincronizado pra
// TopicoState.cadernos via sincronizarCadernoComQuestoes (biblioteca-utils.ts) — esta lista é a
// fonte do detalhe POR QUESTÃO; o caderno do Edital guarda só o agregado, como sempre guardou.
export interface PdfQuestoes {
  total: number;
  resultados: QuestaoResultado[];
  criadoEm: string;
}

const ORDEM_GRUPOS_QUESTOES: Grupo[] = ["A", "B", "C", "D"];

// Distribui N questões em grupos A-D por rodízio: questão 1→A, 2→B, 3→C, 4→D, 5→A... (ex.: 20
// questões → A:1,5,9,13,17 · B:2,6,10,14,18 · C:3,7,11,15,19 · D:4,8,12,16,20).
export function gerarQuestoesGrupos(total: number): QuestaoResultado[] {
  const resultados: QuestaoResultado[] = [];
  for (let n = 1; n <= total; n++) {
    resultados.push({ numero: n, grupo: ORDEM_GRUPOS_QUESTOES[(n - 1) % 4], acertou: null });
  }
  return resultados;
}

// intervalo de páginas de UM tópico dentro de um PdfEstudo específico — permite abrir o leitor já
// na página certa e avisar quando o usuário passa da página final indicada (ver TrilhaTab "Ler
// PDF" e LeitorPdf paginaAbertura/paginaFimAlvo). Preenchido manualmente ou sugerido por IA
// (/api/ai/pdf-topicos-paginas), sempre com revisão humana antes de salvar.
export interface TopicoPaginas {
  topico: string;
  paginaInicio: number;
  paginaFim: number;
}

// divisão manual do PDF em capítulos (só nome + página de início — o fim é sempre derivado: a
// página anterior ao início do próximo capítulo, e o do último vai até paginaConteudoFim/
// totalPaginas). TODOS os capítulos de um PdfEstudo pertencem ao MESMO tópico — o(s) de
// `topicos` — não tem campo de tópico por capítulo porque, na prática, um PDF cobre um tópico só
// (mesma convenção de `topicos?.[0]` já usada em LeitorPdf/BibliotecaTab). A Trilha usa isso pra
// sequenciar a leitura capítulo a capítulo (ver proximoBlocoCapitulos em trilha-dinamica.ts), em
// vez de sempre oferecer o tópico inteiro de uma vez — capítulos curtos são agrupados até renderem
// uma atividade de duração razoável.
export interface CapituloPdf {
  nome: string;
  paginaInicio: number;
}

export interface PdfEstudo {
  id: string;
  nome: string; // ex.: "Aula 05 — ICMS: fato gerador"
  materia: string;
  topicos?: string[]; // tópicos do edital cobertos (opcional, multi)
  totalPaginas: number;
  paginaAtual: number; // 0..totalPaginas — "parei na página X" (= páginas lidas)
  // última página de CONTEÚDO (teoria) — páginas depois disso são só questões do tópico. Quando
  // ausente, o PDF inteiro conta como conteúdo (comportamento antigo, compatível com PDFs já
  // cadastrados). É esse valor (não totalPaginas) que define "terminei de ler" e o % de leitura.
  paginaConteudoFim?: number;
  // mapeamento de página por tópico coberto — subconjunto de `topicos` (nem todo tópico precisa
  // estar mapeado); ausente/tópico não mapeado = sem intervalo conhecido, "Ler PDF" cai no
  // comportamento genérico (abre no início, sem aviso de fim de conteúdo). Quando `capitulos`
  // está preenchido, ele manda na Trilha em vez disso — `intervalosPaginas` fica como estava,
  // sem migração, pros PDFs que ainda não foram divididos em capítulo.
  intervalosPaginas?: TopicoPaginas[];
  capitulos?: CapituloPdf[];
  questoes?: PdfQuestoes;
  criadoEm: string;
  atualizadoEm?: string;
  // true = o arquivo está salvo no Supabase Storage (pdf-storage.ts), disponível em qualquer
  // dispositivo logado — verdade sincronizada via EstudoState, não precisa checar por-dispositivo
  arquivoEnviado?: boolean;
}

// média histórica de páginas/hora das sessões do calendário que registraram páginas (campo
// `paginas` do TimerEstudo/CalendarioTab); null sem dados — compartilhado entre o KPI do
// Dashboard e o ETA da Biblioteca de PDFs
export function calcularPagPorHora(calendario: Record<string, AtividadeCalendario[]>): number | null {
  const sessoes = Object.values(calendario).flat().filter((a) => (a.paginas ?? 0) > 0);
  const totalPaginas = sessoes.reduce((s, a) => s + (a.paginas ?? 0), 0);
  const minutos = sessoes.reduce((s, a) => s + a.duracao, 0);
  return minutos > 0 ? totalPaginas / (minutos / 60) : null;
}

// --- Tipos de Concurso ---

export interface MateriaConcurso {
  id: string;
  nome: string;
  cor: string;        // tailwind color key (ex: "sky", "blue", "emerald")
  topicos: string[];
  peso?: number;      // % no edital
}

export interface ConcursoData {
  id: string;
  nome: string;
  orgao?: string;
  foto?: string;
  dataProva?: string; // ISO date
  isPrincipal: boolean;
  materias: MateriaConcurso[];
}

export type MateriaBase = { nome: string; topicos: string[] };

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

// Mapa estático de cor por "chave de cor" (o valor solto em MateriaConcurso.cor, escolhido no
// seletor de cores do ConcursoModal — mesmas 16 chaves de CORES_DISPONIVEIS lá). Tailwind não
// suporta classes montadas em runtime (`bg-${cor}-500` é purgado no build), então cada variante
// tem que estar escrita literalmente aqui — mesmo padrão do COR_BORDER de EditalTab.tsx,
// promovido pra cá pra ser reaproveitado também pela Trilha (resolverCorMateria em trilha-ui.ts).
export const CORES_MATERIA: Record<string, { dot: string; badge: string; border: string }> = {
  sky:     { dot: "bg-sky-500",     badge: "bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200",         border: "border-l-sky-500" },
  blue:    { dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-400/20 dark:text-blue-200",       border: "border-l-blue-500" },
  emerald: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200", border: "border-l-emerald-500" },
  violet:  { dot: "bg-violet-500",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200",   border: "border-l-violet-500" },
  rose:    { dot: "bg-rose-500",    badge: "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-200",       border: "border-l-rose-500" },
  amber:   { dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",     border: "border-l-amber-500" },
  teal:    { dot: "bg-teal-500",    badge: "bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200",       border: "border-l-teal-500" },
  indigo:  { dot: "bg-indigo-500",  badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200",   border: "border-l-indigo-500" },
  pink:    { dot: "bg-pink-500",    badge: "bg-pink-100 text-pink-700 dark:bg-pink-400/20 dark:text-pink-200",       border: "border-l-pink-500" },
  cyan:    { dot: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-200",       border: "border-l-cyan-500" },
  lime:    { dot: "bg-lime-500",    badge: "bg-lime-100 text-lime-700 dark:bg-lime-400/20 dark:text-lime-200",       border: "border-l-lime-500" },
  orange:  { dot: "bg-orange-500",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200",   border: "border-l-orange-500" },
  purple:  { dot: "bg-purple-500",  badge: "bg-purple-100 text-purple-700 dark:bg-purple-400/20 dark:text-purple-200",   border: "border-l-purple-500" },
  red:     { dot: "bg-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200",         border: "border-l-red-500" },
  green:   { dot: "bg-green-500",   badge: "bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-200",     border: "border-l-green-500" },
  yellow:  { dot: "bg-yellow-500",  badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/20 dark:text-yellow-200",   border: "border-l-yellow-500" },
};
export const COR_MATERIA_PADRAO = { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground", border: "border-l-border" };

// Cores do grupo de questões A-D (cadernos de erro) — fonte única. Antes duplicado em 4 lugares
// (EditalTab, CalendarioTab, TimerEstudo, TrilhaTab), cada um com um subconjunto ligeiramente
// diferente; consolidado aqui seguindo o mesmo padrão de CORES_MATERIA acima.
export const GRUPO_LABEL: Record<Grupo, string> = { A: "Grupo A", B: "Grupo B", C: "Grupo C", D: "Grupo D" };
// pill sólido (ex.: seletor de grupo selecionado no Timer/Calendário)
export const GRUPO_PILL: Record<Grupo, string> = {
  A: "bg-primary text-white",
  B: "bg-emerald-500 text-white",
  C: "bg-violet-500 text-white",
  D: "bg-amber-500 text-white",
};
// contorno (ex.: seletor de grupo não-selecionado no Timer/Calendário)
export const GRUPO_OUTLINE: Record<Grupo, string> = {
  A: "border-primary text-primary dark:text-primary",
  B: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  C: "border-violet-400 text-violet-600 dark:text-violet-400",
  D: "border-amber-400 text-amber-600 dark:text-amber-400",
};
// badge suave (ex.: rótulo "Grupo A" no Edital/Trilha)
export const GRUPO_BADGE: Record<Grupo, string> = {
  A: "bg-primary/10 text-primary dark:bg-primary/60 dark:text-primary",
  B: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  C: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  D: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
};
// só a cor de texto (ex.: a letra "A"/"B"/"C"/"D" isolada, sem fundo)
export const GRUPO_TEXT: Record<Grupo, string> = {
  A: "text-primary dark:text-primary font-bold",
  B: "text-emerald-600 dark:text-emerald-400 font-bold",
  C: "text-violet-600 dark:text-violet-400 font-bold",
  D: "text-amber-600 dark:text-amber-400 font-bold",
};

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
  { id: "praticante",        icone: HelpCircle,    cor: "text-purple-600",  nome: "Praticante",        condicao: "Faça 50 questões" },
  { id: "atirador",          icone: Crosshair,     cor: "text-indigo-600",  nome: "Atirador",          condicao: "Faça 200 questões" },
  { id: "primeiro_baralho",  icone: Layers,        cor: "text-violet-600",  nome: "Primeiro Baralho",  condicao: "Crie 10 cartas" },
  { id: "colecionador",      icone: Gem,           cor: "text-amber-600",   nome: "Colecionador",      condicao: "Crie 50 cartas" },
  { id: "mestre_cartas",     icone: Star,          cor: "text-yellow-500",  nome: "Mestre das Cartas", condicao: "100 acertos em revisões de cartas" },
  { id: "boss_derrotado",    icone: Swords,        cor: "text-red-600",     nome: "Boss Derrotado",    condicao: "Derrote uma carta Boss (3 acertos consecutivos)" },
  { id: "invicto",           icone: Shield,        cor: "text-cyan-600",    nome: "Invicto",           condicao: "20 revisões de cartas sem errar" },
];

export const ATIVIDADE_CONFIG: Record<AtividadeTipo, { label: string; icone: LucideIcon; cor: string; corDot: string }> = {
  estudo:            { label: "Estudo de Matéria",  icone: BookOpen,      cor: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",         corDot: "bg-primary"    },
  questoes:          { label: "Questões",            icone: HelpCircle,    cor: "bg-purple-100 text-purple-700 dark:bg-purple-400/20 dark:text-purple-200",  corDot: "bg-purple-500"  },
  recall:            { label: "Recall",              icone: RotateCcw,     cor: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",      corDot: "bg-amber-500"   },
  caderno_erros:     { label: "Caderno de Erros",    icone: NotebookPen,   cor: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200",              corDot: "bg-red-500"     },
  bateria:           { label: "Bateria de Questões", icone: ListChecks,    cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200", corDot: "bg-emerald-500" },
  cartas:            { label: "Revisão de Cartas",   icone: Layers,        cor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200",     corDot: "bg-indigo-500"  },
  materia_concluida: { label: "Matéria Concluída",   icone: CheckCircle2,  cor: "bg-teal-100 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200",          corDot: "bg-teal-500"    },
};

export function calcularXP(
  topicos: Record<string, TopicoState>,
  calendario?: Record<string, AtividadeCalendario[]>,
  cartas: Carta[] = []
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
      xp += Math.max(1, Math.floor(a.duracao / 15));
    });
  }
  xp += cartas.reduce((sum, c) => sum + c.acertos * 2, 0);
  return xp;
}

// Adiciona variação aleatória ao intervalo (igual ao Anki) para evitar que
// cartas revisadas no mesmo dia voltem todas juntas.
function fuzzIntervalo(intervalo: number): number {
  if (intervalo <= 1) return intervalo;
  if (intervalo <= 7) {
    const delta = Math.floor(Math.random() * 3) - 1; // -1, 0 ou +1
    return Math.max(2, intervalo + delta);
  }
  const delta = Math.round((Math.random() * 0.1 - 0.05) * intervalo); // ±5%
  return Math.max(2, intervalo + delta);
}

export function calcularProximaRevisao(carta: Carta, qualidade: 0 | 1 | 2 | 3 | 4 | 5): Carta {
  let { intervalo, facilidade, repeticoes, acertos, erros } = carta;
  if (qualidade < 3) {
    repeticoes = 0;
    intervalo = 1;
    erros += 1;
  } else {
    if (repeticoes === 0) intervalo = 1;
    else if (repeticoes === 1) intervalo = 6;
    else intervalo = Math.round(intervalo * facilidade);
    repeticoes += 1;
    acertos += 1;
  }
  facilidade = Math.max(1.3, facilidade + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02)));
  const intervaloFuzzed = fuzzIntervalo(intervalo);
  const next = new Date();
  next.setDate(next.getDate() + intervaloFuzzed);
  return {
    ...carta,
    intervalo,
    facilidade: Math.round(facilidade * 100) / 100,
    repeticoes,
    acertos,
    erros,
    proximaRevisao: dateKeyLocal(next),
  };
}

// Converte MATERIAS hardcoded → MateriaConcurso[] (matérias default SEFAZ). Morava em
// src/app/api/concurso/route.ts, mas route handlers do Next não podem ter exports extras —
// quebrava o typecheck dos tipos gerados em .next.
export function materiasDefaultSefaz(): MateriaConcurso[] {
  const CORES = [
    "sky","blue","emerald","violet","rose","amber","teal","indigo",
    "pink","cyan","lime","orange","purple","red","green","yellow","fuchsia","slate","zinc",
  ];
  return MATERIAS.map((m, i) => ({
    id: m.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    nome: m.nome,
    cor: CORES[i % CORES.length],
    topicos: m.topicos,
  }));
}

// Chave de dia "YYYY-MM-DD" no FUSO LOCAL do usuário. NUNCA usar toISOString() pra isso: ISO é
// UTC, e no Brasil (UTC-3) a partir das 21h o dia já "virava" — atividade salva às 21h de 08/07
// caía no dia 09/07 (bug real reportado).
export function dateKeyLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// dias corridos desde a última atividade registrada (qualquer tipo, mesmo critério do streak) —
// 0 = tem atividade hoje, N = a última foi há N dias. Teto de 90 dias: além disso a distinção
// deixa de importar pro aviso de inatividade do Gustavo, e evita um loop sem limite numa conta
// muito antiga sem uso recente.
export function diasSemAtividade(calendario: Record<string, AtividadeCalendario[]>, hoje: Date = new Date()): number {
  const TETO_DIAS = 90;
  const dia = new Date(hoje);
  dia.setHours(0, 0, 0, 0);
  for (let n = 0; n <= TETO_DIAS; n++) {
    const key = dateKeyLocal(dia);
    if (calendario[key] && calendario[key].length > 0) return n;
    dia.setDate(dia.getDate() - 1);
  }
  return TETO_DIAS;
}

export function calcularStreakDias(calendario: Record<string, AtividadeCalendario[]>): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(hoje);

  const todayKey = dateKeyLocal(dia);
  if (!calendario[todayKey] || calendario[todayKey].length === 0) {
    dia.setDate(dia.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = dateKeyLocal(dia);
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

// Remove tópicos ocultos de uma lista de matérias — usado por TODA aba exceto o Edital (que
// precisa ver os tópicos ocultos pra poder reativá-los). Genérico: funciona com MateriaConcurso,
// MateriaDef e MateriaBase (todas têm `nome`/`topicos`). Nunca remove a matéria em si, mesmo que
// fique com 0 tópicos — evita quebrar referências por nome (Ciclo, cor por matéria etc.).
export function filtrarTopicosExcluidos<T extends { nome: string; topicos: string[] }>(
  materias: T[],
  topicosExcluidos: string[]
): T[] {
  if (topicosExcluidos.length === 0) return materias;
  const excluidos = new Set(topicosExcluidos);
  return materias.map((m) => ({
    ...m,
    topicos: m.topicos.filter((t) => !excluidos.has(topicoKey(m.nome, t))),
  }));
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

// Seed do Ciclo: por padrão usa a lista hardcoded MATERIAS (SEFAZ-CE), mas aceita as matérias
// REAIS de um concurso customizado — sem isso, todo concurso herdava peso/prioridade/divisão
// fixos das 24 matérias do SEFAZ-CE (mesmo quando o concurso tinha matérias com outros nomes),
// fazendo o Ciclo "parecer" igual entre concursos diferentes em vez de único por concurso.
const DIVISOES_ROTATIVAS: ("A" | "B" | "C")[] = ["A", "B", "C"];

export function buildDefaultConfigCiclo(
  materiasConcurso?: (MateriaDef | MateriaConcurso | MateriaBase)[]
): EstudoConfigCiclo {
  const fonte = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const materias: Record<string, ConfigMateria> = {};
  fonte.forEach((m, i) => {
    if ("incluirDefault" in m) {
      materias[m.nome] = {
        incluir: m.incluirDefault,
        peso: m.pesoDefault,
        prioridade: m.prioridadeDefault,
        divisao: m.divisaoDefault,
      };
    } else {
      // matéria customizada (sem defaults pré-definidos): inclui por padrão, peso/prioridade
      // neutros, divisão em rodízio A/B/C pra distribuir o ciclo automaticamente
      materias[m.nome] = {
        incluir: true,
        peso: 1,
        prioridade: "Baixa",
        divisao: DIVISOES_ROTATIVAS[i % 3],
      };
    }
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
  cartas: [],
  configCiclo: buildDefaultConfigCiclo(),
  streak: 0,
  semanasOK: 0,
  pdfs: [],
  topicosExcluidos: [],
};
