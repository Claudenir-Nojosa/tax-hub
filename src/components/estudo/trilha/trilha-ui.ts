import {
  CORES_MATERIA, COR_MATERIA_PADRAO,
  type MateriaBase, type MateriaConcurso, type MateriaDef,
} from "@/lib/estudo-data";
import type { MetaSemana } from "@/lib/trilha-dinamica";

// Helpers de apresentação compartilhados entre as abas do Estudo (Trilha, Biblioteca etc.).
// STATUS_CONFIG/TIPO_CONFIG/fmtData da trilha antiga foram removidos junto com ela.

export function fmtHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// Resolve a cor de uma matéria tanto pra MateriaDef (hardcoded — corDot/corBadge já embutidos)
// quanto pra MateriaConcurso (customizado — só tem `cor: string`, uma chave que precisa passar
// pelo mapa estático CORES_MATERIA). O bug do corMateria() anterior era sempre cair no cinza
// pra concursos customizados, porque ele buscava só na lista MATERIAS hardcoded.
export function resolverCorMateria(
  nome: string,
  materiasAtivas: (MateriaDef | MateriaConcurso | MateriaBase)[]
): { dot: string; badge: string; border: string } {
  const m = materiasAtivas.find((x) => x.nome === nome);
  if (!m) return COR_MATERIA_PADRAO;
  if ("corBadge" in m && "corDot" in m && "corBorder" in m) {
    return { dot: m.corDot, badge: m.corBadge, border: m.corBorder };
  }
  if ("cor" in m) return CORES_MATERIA[m.cor] ?? COR_MATERIA_PADRAO;
  return COR_MATERIA_PADRAO;
}

// Tipo de cada item que pode aparecer no checklist da Trilha — usado tanto pra colorir o ícone
// (TrilhaTab) quanto pra gerar a mensagem "estilo Duolingo" do Dashboard (mesma classificação,
// dois lugares diferentes na tela).
export type TipoPasso = "estudo" | "reforco" | "questoes" | "reforcoImediato" | "linkQuestoes" | "revisao" | "cartas";

export const TIPO_ITEM_COR: Record<TipoPasso, string> = {
  estudo: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  reforco: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  questoes: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400",
  reforcoImediato: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
  linkQuestoes: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  revisao: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  cartas: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400",
};

export interface ProximaAtividade {
  tipo: TipoPasso;
  ehNova: boolean; // true = "sua atividade de hoje é" (ainda nem começou); false = "vi que você ainda não fez" (ficou parado no checklist)
  titulo: string;
  subtitulo: string;
}

// Escolhe UM item pra virar a mensagem "estilo Duolingo" do Dashboard — a mesma prioridade que já
// rege a ordem visual do checklist da Trilha (bloco de estudo > reforço > questões > reforço
// rápido > revisão do link > revisão de matéria > cartas). Não recalcula nada: só lê a MetaSemana
// que a Trilha já produz.
export function proximaAtividade(meta: MetaSemana): ProximaAtividade | null {
  const bloco = meta.blocos.find((b) => !b.concluido);
  if (bloco) {
    return { tipo: "estudo", ehNova: true, titulo: bloco.materia, subtitulo: `tópico atual: ${bloco.topico}` };
  }
  if (meta.reforcos.length > 0) {
    const r = meta.reforcos[0];
    return { tipo: "reforco", ehNova: false, titulo: `Reforço de ${r.materia}`, subtitulo: `tópico ${r.ordemTopico} — desempenho de ${r.perc}%` };
  }
  if (meta.questoesPendentes.length > 0) {
    const q = meta.questoesPendentes[0];
    return { tipo: "questoes", ehNova: false, titulo: `Questões de ${q.materia}`, subtitulo: `tópico ${q.ordemTopico}: ${q.topico}` };
  }
  if (meta.reforcosImediatos.length > 0) {
    const r = meta.reforcosImediatos[0];
    return { tipo: "reforcoImediato", ehNova: false, titulo: `Reforço rápido de ${r.materia}`, subtitulo: `tópico ${r.ordemTopico}: ${r.topico}` };
  }
  if (meta.revisoesLink.length > 0) {
    const r = meta.revisoesLink[0];
    return { tipo: "linkQuestoes", ehNova: false, titulo: `Revisão de ${r.materia}`, subtitulo: `questões de ${r.dias} dias atrás — tópico ${r.ordemTopico}` };
  }
  if (meta.revisoes30.length > 0) {
    const r = meta.revisoes30[0];
    return { tipo: "revisao", ehNova: false, titulo: `Revisão geral de ${r.materia}`, subtitulo: "30 questões englobando todos os tópicos" };
  }
  if (meta.revisarCartas) {
    return { tipo: "cartas", ehNova: false, titulo: "Revisar as cartas", subtitulo: "revisão dos 2 domingos" };
  }
  return null;
}

export interface MensagemGustavo {
  titulo: string;
  corpo: string;
}

// Gustavo é o "consultor de estudos" da Trilha — a mesma mensagem (gerada aqui uma vez só) aparece
// tanto na bolha do Dashboard quanto no topo da aba Trilha, pra nunca dessincronizar o que ele diz
// nos dois lugares. Cumprimenta pelo primeiro nome quando disponível (session.user.name), sem
// quebrar o texto quando ausente.
export function gerarMensagemGustavo(
  meta: MetaSemana,
  opts: { nomeUsuario?: string; streakDias: number }
): MensagemGustavo {
  const { nomeUsuario, streakDias } = opts;
  const saudacao = nomeUsuario ? `Olá, ${nomeUsuario}! ` : "";
  const proxima = proximaAtividade(meta);

  if (!proxima) {
    return {
      titulo: `${saudacao}Tudo em dia por aqui! 🎉`,
      corpo: streakDias > 0
        ? `Você já está há ${streakDias} dia${streakDias !== 1 ? "s" : ""} sem parar — continue assim pra manter a sequência.`
        : "Nada pendente no checklist desta semana.",
    };
  }
  if (proxima.ehNova) {
    return {
      titulo: `${saudacao}Sua atividade desta semana é:`,
      corpo: `${proxima.titulo} — ${proxima.subtitulo}`,
    };
  }
  return {
    titulo: `${saudacao}Vi que você ainda não fez:`,
    corpo: `${proxima.titulo} · ${proxima.subtitulo}`,
  };
}
