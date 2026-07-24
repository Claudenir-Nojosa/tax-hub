import {
  CORES_MATERIA, COR_MATERIA_PADRAO,
  type MateriaBase, type MateriaConcurso, type MateriaDef,
} from "@/lib/estudo-data";

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
