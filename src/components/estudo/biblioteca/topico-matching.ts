// Sugere automaticamente qual tópico do edital um PDF cobre, a partir do NOME do arquivo — usado
// no upload em lote (FormPdfLote) pra não obrigar marcar tópico um por um quando o nome do
// arquivo já é (ou quase é) o nome do tópico, ex.: "Aula 00 - Conceitos, Objetivos. Distinção
// entre Auditoria Interna e Independente.pdf" → tópico "Conceitos, Objetivos. Distinção entre
// Auditoria Interna e Independente".
//
// Nunca "chuta" quando é ambíguo: se mais de um tópico bate igualmente bem, devolve null e o
// usuário escolhe manualmente na lista — sugestão errada silenciosa é pior que nenhuma sugestão.

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos pra comparar sem depender de digitação idêntica
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// prefixos comuns de nomenclatura de aula em PDF (aula 05 -, vídeo 3:, parte 1 –, ...)
const PREFIXO_AULA_RE = /^(aula|v[ií]deo\s*aula|v[ií]deo|parte|m[oó]dulo)\s*\d*\s*[-–—.:]\s*/i;

export function nomeSemExtensao(nomeArquivo: string): string {
  return nomeArquivo.replace(/\.pdf$/i, "").trim();
}

export function nomeSemPrefixoDeAula(nomeArquivo: string): string {
  return nomeSemExtensao(nomeArquivo).replace(PREFIXO_AULA_RE, "").trim();
}

export function sugerirTopico(nomeArquivo: string, topicosDaMateria: string[]): string | null {
  if (topicosDaMateria.length === 0) return null;
  const limpo = normalizar(nomeSemPrefixoDeAula(nomeArquivo));
  if (limpo === "") return null;

  // 1) match exato (depois de tirar o prefixo "Aula NN - " e normalizar acentos/caixa) — o caso
  // comum quando o arquivo já se chama exatamente como o tópico
  const exato = topicosDaMateria.find((t) => normalizar(t) === limpo);
  if (exato) return exato;

  // 2) contenção num sentido ou no outro (nome do tópico aparece dentro do nome do arquivo, ou
  // vice-versa) — só aceita se for o ÚNICO tópico que bate; mais de um candidato = ambíguo,
  // devolve null em vez de adivinhar qual
  const candidatos = topicosDaMateria.filter((t) => {
    const nt = normalizar(t);
    return nt.length > 0 && (limpo.includes(nt) || nt.includes(limpo));
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}
