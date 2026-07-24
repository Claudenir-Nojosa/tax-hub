import { Gem, Swords, Trophy, Zap } from "lucide-react";
import { dateKeyLocal, type Carta } from "@/lib/estudo-data";

// Identidade visual "jogo de cartas" — mantida de propósito como contraste gamificado com o
// resto do módulo (clínico/corporativo). Não uniformizar com os outros tons do design system.
export const CARTA_CONFIG = {
  monstro: {
    nome: "Monstro",
    texto: "CARTA MONSTRO",
    descricao: "Pergunta dissertativa aberta para testar compreensão profunda",
    icone: Swords,
    cor: "from-primary to-emerald-950",
    borda: "border-primary",
    sombra: "shadow-primary/20",
    badge: "bg-primary",
    glow: "shadow-primary/40",
    imagem: "/icons/monstro 1.png",
  },
  armadilha: {
    nome: "Armadilha",
    texto: "CARTA ARMADILHA",
    descricao: "Afirmação Verdadeiro ou Falso para testar precisão conceitual",
    icone: Zap,
    cor: "from-red-900 to-rose-950",
    borda: "border-red-500",
    sombra: "shadow-red-500/20",
    badge: "bg-red-600",
    glow: "shadow-red-500/40",
    imagem: "/icons/armadilha.png",
  },
  tesouro: {
    nome: "Tesouro",
    texto: "CARTA TESOURO",
    descricao: "Complete a lacuna — preencha o trecho que falta",
    icone: Gem,
    cor: "from-amber-900 to-yellow-950",
    borda: "border-amber-400",
    sombra: "shadow-amber-400/20",
    badge: "bg-amber-500",
    glow: "shadow-amber-400/40",
    imagem: "/icons/tesouro.png",
  },
  boss: {
    nome: "Boss",
    texto: "CARTA BOSS",
    descricao: "Questão desafiadora com múltiplos conceitos envolvidos",
    icone: Trophy,
    cor: "from-purple-900 to-violet-950",
    borda: "border-purple-500",
    sombra: "shadow-purple-500/20",
    badge: "bg-purple-700",
    glow: "shadow-purple-500/40",
    imagem: "/icons/monstro boss.png",
  },
} as const;

export function hoje(): string {
  return dateKeyLocal();
}

export function novaCarta(dados: Partial<Carta>): Carta {
  const d = hoje();
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    tipo: "monstro",
    frente: "",
    verso: "",
    intervalo: 0,
    facilidade: 2.5,
    repeticoes: 0,
    proximaRevisao: d,
    criada: d,
    acertos: 0,
    erros: 0,
    ...dados,
  };
}

export function labelDue(carta: Carta): { texto: string; urgente: boolean } {
  const hj = hoje();
  if (carta.proximaRevisao <= hj) return { texto: "Revisar agora!", urgente: true };
  const diff = Math.round(
    (new Date(carta.proximaRevisao + "T12:00:00").getTime() - new Date(hj + "T12:00:00").getTime()) / 86400000
  );
  return { texto: `Em ${diff}d`, urgente: false };
}
