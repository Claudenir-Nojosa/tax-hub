import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Sugestão por IA do intervalo de páginas (início/fim) de cada tópico dentro de um PDF da
// Biblioteca — pré-preenche os campos manuais do FormPdf.tsx (Fase 4), sempre com revisão humana
// antes de salvar (esta rota nunca persiste nada, só sugere).
//
// Duas passadas (validado com PDFs reais do Estratégia, 200+ páginas, 2026-08-03):
// 1) ÍNDICE — a maioria desses materiais tem um sumário logo nas primeiras páginas listando os
//    assuntos com o número exato da página (confirmado: esse número bate 1:1 com a marcação
//    "--- Página N ---" usada aqui, sem precisar de nenhuma conversão). Manda só essas primeiras
//    páginas pra IA — barato, rápido, e muito mais confiável que inferir pelo conteúdo, porque dá
//    pra calcular o fim de um tópico como "página anterior ao início do próximo assunto do
//    índice" sem precisar SER CAPAZ de enxergar esse conteúdo no contexto enviado.
// 2) CORPO — só roda pros tópicos que a passada 1 não resolveu (sem índice reconhecível, ou
//    índice que não cobre aquele tópico): varre o texto completo, truncado no teto de contexto
//    (MAX_CHARS_TEXTO), igual ao comportamento original antes dessa otimização.
// Por que isso importa: um PDF de 216 páginas só cabe ~29 páginas inteiras no teto de 90k
// caracteres — pra um tópico cujo conteúdo real vai até a página 47, a passada 2 sozinha nunca
// enxerga esse fim de verdade e tende a chutar baixo. A passada 1 não tem esse problema porque
// não depende de "ver" o conteúdo, só o índice.

export const maxDuration = 120; // PDFs grandes podem levar um tempo pra extrair + a IA analisar

// Igual ao teto de resumos/route.ts: material de estudo pode ter centenas de páginas — corta num
// teto seguro de contexto, mas SEMPRE numa fronteira de página (nunca no meio de uma), porque é a
// marcação "--- Página N ---" que a IA usa pra saber em que página cada trecho está.
const MAX_CHARS_TEXTO = 90_000;

// índices de cursos (Estratégia etc.) cabem nas primeiras páginas — generoso o suficiente pra
// nunca cortar um índice de verdade, mas pequeno o bastante pra sair bem barato
const INDICE_PAGINAS_MAX = 10;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface IntervaloSugerido {
  topico: string;
  paginaInicio: number;
  paginaFim: number;
}

function montarTextoPaginado(paginas: string[]): { texto: string; truncado: boolean } {
  let texto = "";
  let truncado = false;
  for (let i = 0; i < paginas.length; i++) {
    const bloco = `--- Página ${i + 1} ---\n${paginas[i]}\n\n`;
    if (texto.length + bloco.length > MAX_CHARS_TEXTO) {
      truncado = true;
      break;
    }
    texto += bloco;
  }
  return { texto, truncado };
}

function promptIndice(topicos: string[]): string {
  return `Você é um assistente que lê as primeiras páginas de um PDF de material de estudo (aulas de cursinho pra concurso público brasileiro) procurando um ÍNDICE/SUMÁRIO — muito comum nesse tipo de material logo após a capa, listando os assuntos do PDF com o número da página onde cada um começa (formato comum: "Nome do assunto ..... 16" ou "1) Nome do assunto 16").

Tópicos a localizar no índice (procure exatamente estes):
${topicos.map((t) => `- ${t}`).join("\n")}

O texto vem marcado com "--- Página N ---" antes do conteúdo de cada página — os números do índice já correspondem EXATAMENTE a essa marcação (mesma numeração, sem converter nada).

Os títulos do índice são a redação do PROFESSOR/autor do material, então raramente são idênticos ao nome do tópico do edital — associe por SIGNIFICADO.

Pra cada tópico que você conseguir localizar no índice:
- paginaInicio = a página que o índice indica pro assunto correspondente.
- paginaFim = a página ANTERIOR ao início do PRÓXIMO assunto de TEORIA do índice (pule entradas do tipo "Questões Comentadas", "Lista de Questões", "Gabarito" etc. ao procurar esse "próximo" — essas seções de exercício não contam como novo assunto de teoria, mas também não entram no paginaFim: se o próximo assunto de teoria só vem depois de uma seção de questões, pare o paginaFim ainda antes dela).
- CASO ESPECIAL: se um tópico pedido corresponder ao ASSUNTO GERAL do material inteiro (nome muito parecido com o título da própria aula/arquivo, cobrindo virtualmente tudo que o índice lista como teoria — comum quando cada aula do curso é 1 tópico do edital), retorne paginaInicio = a primeira página de teoria do índice e paginaFim = a página anterior à primeira seção de questões/exercícios — cobrindo TODOS os itens de teoria do índice, não só o primeiro.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "intervalos": [
    { "topico": "Nome exatamente como na lista acima", "paginaInicio": 3, "paginaFim": 9 }
  ]
}

Regras:
- Só inclua um tópico se estas páginas realmente tiverem um índice e você tiver certeza razoável da entrada correspondente — NÃO INVENTE números nem infira pelo conteúdo (essas são só as primeiras páginas, sem o resto do material). Se não houver índice aqui, ou ele não cobrir algum tópico, simplesmente omita.
- paginaFim >= paginaInicio sempre.`;
}

function promptCorpo(topicos: string[]): string {
  return `Você é um assistente que localiza, dentro do texto de um PDF de material de estudo (aulas de cursinho pra concurso público brasileiro), em que página cada tópico do edital começa e termina.

Tópicos a localizar (procure exatamente estes, cada um pode aparecer ou não no PDF):
${topicos.map((t) => `- ${t}`).join("\n")}

O texto vem marcado com "--- Página N ---" antes do conteúdo de cada página. Use essas marcações pra determinar paginaInicio (onde o tópico começa a ser explicado) e paginaFim (última página onde o tópico ainda é o assunto principal, antes do próximo tópico ou de uma seção de exercícios).

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "intervalos": [
    { "topico": "Nome exatamente como na lista acima", "paginaInicio": 3, "paginaFim": 9 }
  ]
}

Regras:
- Só inclua um tópico se você tiver confiança razoável de onde ele está — se não encontrar, simplesmente omita (não invente números).
- paginaFim >= paginaInicio sempre.
- Se dois tópicos da lista forem consecutivos no material, o fim de um costuma ser a página anterior ao início do próximo — mas não force isso se o conteúdo não bater.`;
}

async function chamarESugerir(promptTexto: string, corpoTexto: string, topicosValidos: string[]): Promise<IntervaloSugerido[]> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptTexto },
      { role: "user", content: corpoTexto },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as { intervalos?: unknown };
  if (!Array.isArray(parsed.intervalos)) return [];

  const topicosSet = new Set(topicosValidos);
  const resultado: IntervaloSugerido[] = [];
  for (const item of parsed.intervalos) {
    if (typeof item !== "object" || item === null) continue;
    const { topico, paginaInicio, paginaFim } = item as Record<string, unknown>;
    if (typeof topico !== "string" || !topicosSet.has(topico)) continue;
    if (typeof paginaInicio !== "number" || typeof paginaFim !== "number") continue;
    if (!Number.isFinite(paginaInicio) || !Number.isFinite(paginaFim)) continue;
    if (paginaInicio < 1 || paginaFim < paginaInicio) continue;
    resultado.push({ topico, paginaInicio: Math.round(paginaInicio), paginaFim: Math.round(paginaFim) });
  }
  return resultado;
}

// POST multipart: file (PDF) + topicos (JSON string[]) — sugere paginaInicio/paginaFim por tópico
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const topicosRaw = (formData.get("topicos") as string) ?? "[]";

  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  let topicos: string[];
  try {
    const parsed = JSON.parse(topicosRaw);
    if (!Array.isArray(parsed) || parsed.some((t) => typeof t !== "string")) throw new Error();
    topicos = parsed as string[];
  } catch {
    return NextResponse.json({ error: "Lista de tópicos inválida" }, { status: 400 });
  }
  if (topicos.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um tópico pra sugerir páginas" }, { status: 400 });
  }

  try {
    const uint8 = new Uint8Array(await file.arrayBuffer());
    const { extractText } = await import("unpdf");
    const { text: paginas } = await extractText(uint8, { mergePages: false });

    const textoBruto = paginas.join("").trim();
    if (textoBruto.length < 200) {
      return NextResponse.json(
        { error: "O PDF não tem camada de texto legível (provavelmente escaneado) — não dá pra sugerir páginas" },
        { status: 400 }
      );
    }

    // passo 1: índice (barato, só as primeiras páginas)
    const textoIndice = montarTextoPaginado(paginas.slice(0, INDICE_PAGINAS_MAX)).texto;
    const viaIndice = await chamarESugerir(promptIndice(topicos), textoIndice, topicos);

    // passo 2: corpo inteiro, só pros tópicos que o índice não resolveu
    const resolvidos = new Set(viaIndice.map((r) => r.topico));
    const restantes = topicos.filter((t) => !resolvidos.has(t));
    let truncado = false;
    let viaCorpo: IntervaloSugerido[] = [];
    if (restantes.length > 0) {
      const corpo = montarTextoPaginado(paginas);
      truncado = corpo.truncado;
      viaCorpo = await chamarESugerir(promptCorpo(restantes), corpo.texto, restantes);
    }

    return NextResponse.json({ intervalos: [...viaIndice, ...viaCorpo], truncado, totalPaginas: paginas.length });
  } catch (err) {
    console.error("[pdf-topicos-paginas] erro:", err);
    return NextResponse.json({ error: "Erro ao processar o PDF com IA" }, { status: 500 });
  }
}
