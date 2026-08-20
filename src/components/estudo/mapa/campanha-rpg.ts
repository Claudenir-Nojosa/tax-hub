import { INIMIGOS_RPG } from "./inimigos-rpg";

// Estado de uma campanha roguelike — espelha CampanhaRPG (Prisma) 1:1. `rota`/`posicaoAtual`
// descrevem sozinhos o progresso DESTA corrida (tudo com índice < posicaoAtual já foi vencido
// nesta corrida) — não precisa cruzar com topicosVencidosTotal pra desenhar o caminho, esse campo
// é só o histórico vitalício (pra tela de estatísticas).
export interface RotaItem {
  materia: string;
  topico: string;
}

export interface CampanhaRPGState {
  status: "em_andamento" | "morto" | "conteudo_esgotado";
  heroiHP: number;
  heroiHPMax: number;
  ouroCorrida: number;
  xpCorrida: number;
  rota: RotaItem[];
  posicaoAtual: number;
  itens: string[];
  xpPermanente: number;
  topicosVencidosTotal: string[];
}

export const HP_HEROI_CAMPANHA_MAX = 28;
export const OURO_POR_INIMIGO = 15;
export const XP_POR_INIMIGO = 20;

// Rota = todo mundo que já tem inimigo desenhado, na ordem em que foram cadastrados (hoje só os
// 10 de Direito Tributário) — cresce sozinha conforme mais inimigos entram em INIMIGOS_RPG, sem
// precisar mexer aqui. "Corrida = edital inteiro" (decisão do usuário) na prática quer dizer "todo
// conteúdo jogável disponível", não literalmente as ~246 tópicos reais do edital — isso é uma
// limitação de conteúdo (faltam inimigos), não uma escolha de design.
function gerarRota(): RotaItem[] {
  return INIMIGOS_RPG.map((i) => ({ materia: i.materia, topico: i.topico }));
}

// Nova campanha — reseta tudo que é "da corrida", preserva o que é permanente (itens, xp de
// título, histórico). Chamado tanto pro primeiro personagem (sem campanha anterior) quanto pra
// recomeçar depois de morrer.
export function novaCampanha(permanente?: Pick<CampanhaRPGState, "itens" | "xpPermanente" | "topicosVencidosTotal">): CampanhaRPGState {
  return {
    status: "em_andamento",
    heroiHP: HP_HEROI_CAMPANHA_MAX,
    heroiHPMax: HP_HEROI_CAMPANHA_MAX,
    ouroCorrida: 0,
    xpCorrida: 0,
    rota: gerarRota(),
    posicaoAtual: 0,
    itens: permanente?.itens ?? [],
    xpPermanente: permanente?.xpPermanente ?? 0,
    topicosVencidosTotal: permanente?.topicosVencidosTotal ?? [],
  };
}
