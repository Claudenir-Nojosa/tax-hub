import {
  dateKeyLocal, defaultTopicoState, topicoKey,
  type Carta, type Grupo, type PdfEstudo, type PdfQuestoes, type TipoCarta, type TopicoPaginas, type TopicoState,
} from "@/lib/estudo-data";
import { fmtHoras } from "../trilha/trilha-ui";

const GRUPOS: Grupo[] = ["A", "B", "C", "D"];

// última página que conta pra "terminei de ler"/% de leitura — o fim do CONTEÚDO quando definido
// (páginas depois disso são só questão), senão o total do arquivo (comportamento de sempre)
export function alvoLeituraPdf(pdf: Pick<PdfEstudo, "totalPaginas" | "paginaConteudoFim">): number {
  return pdf.paginaConteudoFim ?? pdf.totalPaginas;
}

// Estica os intervalos de página pra cobrir o PDF INTEIRO, sem nenhuma lacuna — a IA (ou o
// usuário) só precisa acertar ONDE CADA TÓPICO COMEÇA (é isso que o índice do PDF informa com
// confiança); o fim de cada um é sempre "uma página antes do início do próximo", e as pontas
// (primeiro tópico e último) vão até a borda do documento. Assim, à medida que o usuário conclui
// os tópicos de um PDF pela Trilha, ele acaba lendo o PDF inteiro — não só os trechos que bateram
// exatamente com o nome de um tópico do edital (o que deixava buracos: introdução antes do
// primeiro tópico, ou assuntos do índice sem tópico correspondente, nunca entravam em nenhuma
// atividade de leitura).
export function fecharLacunasIntervalos(
  intervalos: TopicoPaginas[],
  pdf: Pick<PdfEstudo, "totalPaginas" | "paginaConteudoFim">
): TopicoPaginas[] {
  if (intervalos.length === 0) return intervalos;
  const ordenados = [...intervalos].sort((a, b) => a.paginaInicio - b.paginaInicio);
  const fimDocumento = alvoLeituraPdf(pdf);
  return ordenados.map((iv, i) => ({
    ...iv,
    paginaInicio: i === 0 ? 1 : iv.paginaInicio,
    paginaFim: i === ordenados.length - 1 ? fimDocumento : ordenados[i + 1].paginaInicio - 1,
  }));
}

export function novoId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtEta(paginasRestantes: number, pagPorHora: number | null): string | null {
  if (pagPorHora === null || pagPorHora <= 0 || paginasRestantes <= 0) return null;
  return fmtHoras(Math.round((paginasRestantes / pagPorHora) * 60));
}

export function fmtCrono(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// Recalcula acertos/erros por grupo A-D a partir do detalhe POR QUESTÃO (PdfQuestoes.resultados)
// e escreve o agregado no caderno do tópico — mesmo formato que o Edital já usa/lê
// (TopicoState.cadernos), então a Trilha/Relatórios/Edital enxergam o resultado sem saber que ele
// veio do leitor de PDF. Chamado toda vez que uma questão é marcada certa/errada.
export function sincronizarCadernoComQuestoes(
  topicos: Record<string, TopicoState>,
  materia: string,
  topico: string,
  questoes: PdfQuestoes
): Record<string, TopicoState> {
  const key = topicoKey(materia, topico);
  const estado = topicos[key] ?? defaultTopicoState();
  const agora = dateKeyLocal();
  const cadernos = { ...estado.cadernos };
  for (const g of GRUPOS) {
    const doGrupo = questoes.resultados.filter((r) => r.grupo === g);
    cadernos[g] = {
      acertos: doGrupo.filter((r) => r.acertou === true).length,
      erros: doGrupo.filter((r) => r.acertou === false).length,
      atualizadoEm: agora,
    };
  }
  return { ...topicos, [key]: { ...estado, cadernos } };
}

export function novaCartaManual(dados: {
  tipo: TipoCarta; materia: string; topico?: string; frente: string; verso: string; gabarito?: "verdadeiro" | "falso";
}): Carta {
  const hoje = dateKeyLocal();
  return {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: dados.tipo,
    materia: dados.materia,
    topico: dados.topico,
    frente: dados.frente.trim(),
    verso: dados.verso.trim(),
    gabarito: dados.tipo === "armadilha" ? dados.gabarito : undefined,
    intervalo: 0,
    facilidade: 2.5,
    repeticoes: 0,
    proximaRevisao: hoje,
    criada: hoje,
    acertos: 0,
    erros: 0,
  };
}
