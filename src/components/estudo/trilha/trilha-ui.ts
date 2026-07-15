import { BookOpen, HelpCircle, RotateCcw } from "lucide-react";
import {
  CORES_MATERIA, COR_MATERIA_PADRAO,
  type MateriaConcurso, type MateriaDef,
  type TrilhaAtividadeStatus, type TrilhaAtividadeTipo,
} from "@/lib/estudo-data";

// Helpers de apresentação compartilhados entre TrilhaPath, MetaPainel e MateriaConcluidaBanner —
// extraídos de TrilhaTab.tsx pra não duplicar em 3 arquivos.

export const STATUS_CONFIG: Record<TrilhaAtividadeStatus, { label: string; classe: string }> = {
  nao_iniciada: { label: "Não iniciada", classe: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600" },
  iniciada: { label: "Iniciada", classe: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
  falta_acabar: { label: "Falta acabar", classe: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
  concluida: { label: "Concluída", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
};

export const TIPO_CONFIG: Record<TrilhaAtividadeTipo, { label: string; Icon: typeof BookOpen; cor: string }> = {
  teoria: { label: "Teoria", Icon: BookOpen, cor: "text-blue-500" },
  questoes: { label: "Questões", Icon: HelpCircle, cor: "text-violet-500" },
  revisao: { label: "Revisão", Icon: RotateCcw, cor: "text-emerald-500" },
};

export function fmtHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function fmtData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// Resolve a cor de uma matéria tanto pra MateriaDef (hardcoded — corDot/corBadge já embutidos)
// quanto pra MateriaConcurso (customizado — só tem `cor: string`, uma chave que precisa passar
// pelo mapa estático CORES_MATERIA). O bug do corMateria() anterior era sempre cair no cinza
// pra concursos customizados, porque ele buscava só na lista MATERIAS hardcoded.
export function resolverCorMateria(
  nome: string,
  materiasAtivas: (MateriaDef | MateriaConcurso)[]
): { dot: string; badge: string } {
  const m = materiasAtivas.find((x) => x.nome === nome);
  if (!m) return COR_MATERIA_PADRAO;
  if ("corBadge" in m && "corDot" in m) return { dot: m.corDot, badge: m.corBadge };
  if ("cor" in m) return CORES_MATERIA[m.cor] ?? COR_MATERIA_PADRAO;
  return COR_MATERIA_PADRAO;
}
