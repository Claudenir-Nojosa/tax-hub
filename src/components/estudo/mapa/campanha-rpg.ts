import { inimigosDaMateria, materiasComInimigos } from "./inimigos-rpg";

// Estado de uma campanha roguelike — espelha CampanhaRPG (Prisma) 1:1. Progressão agora é POR
// MATÉRIA (mapa escolhido pelo jogador), não uma rota única cobrindo o edital inteiro (reformulação
// que substitui o design anterior de "corrida = edital inteiro" — o jogador escolhe qual mapa
// atacar a cada momento). `topicosVencidosTotal` continua sendo o histórico vitalício, cruzando
// TODAS as corridas (pra tela de Estatísticas), independente de `progressoMaterias` (só desta
// corrida).
export interface CampanhaRPGState {
  status: "em_andamento" | "morto" | "conteudo_esgotado";
  heroiHP: number;
  heroiHPMax: number;
  ouroCorrida: number;
  xpCorrida: number;
  // materia -> posição atual dentro da lista de inimigos DAQUELA matéria (0 = ainda não começou).
  // Matérias nunca visitadas simplesmente não têm chave aqui.
  progressoMaterias: Record<string, number>;
  itens: string[];
  xpPermanente: number;
  topicosVencidosTotal: string[];
}

export const HP_HEROI_CAMPANHA_MAX = 28;
export const OURO_POR_INIMIGO = 15;
export const XP_POR_INIMIGO = 20;

// Nova campanha — reseta tudo que é "da corrida" (HP/ouro/XP/progresso por matéria), preserva o que
// é permanente (itens, xp de título, histórico). Chamado tanto pro primeiro personagem (sem
// campanha anterior) quanto pra recomeçar depois de morrer.
export function novaCampanha(permanente?: Pick<CampanhaRPGState, "itens" | "xpPermanente" | "topicosVencidosTotal">): CampanhaRPGState {
  return {
    status: "em_andamento",
    heroiHP: HP_HEROI_CAMPANHA_MAX,
    heroiHPMax: HP_HEROI_CAMPANHA_MAX,
    ouroCorrida: 0,
    xpCorrida: 0,
    progressoMaterias: {},
    itens: permanente?.itens ?? [],
    xpPermanente: permanente?.xpPermanente ?? 0,
    topicosVencidosTotal: permanente?.topicosVencidosTotal ?? [],
  };
}

// Uma campanha vinda do banco pode não ter `progressoMaterias` ainda (linha criada antes desta
// reformulação, ou nunca esteve em campanha nenhuma) — fallback defensivo em vez de exigir migração
// manual (a Fase 1 anterior nunca foi ao ar pra usuários reais, então isso cobre só dados de teste).
export function normalizarCampanha(campanha: CampanhaRPGState): CampanhaRPGState {
  return { ...campanha, progressoMaterias: campanha.progressoMaterias ?? {} };
}

export function progressoDaMateria(campanha: CampanhaRPGState, materia: string): number {
  return campanha.progressoMaterias[materia] ?? 0;
}

// Todo mundo que tem inimigo pronto, em toda matéria, já foi vencido nesta corrida — usado pra
// decidir se o status vira "conteudo_esgotado" depois de uma vitória.
export function catalogoEsgotado(progressoMaterias: Record<string, number>): boolean {
  return materiasComInimigos().every((m) => (progressoMaterias[m] ?? 0) >= inimigosDaMateria(m).length);
}
