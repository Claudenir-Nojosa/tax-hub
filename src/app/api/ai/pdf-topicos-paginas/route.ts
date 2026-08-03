import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Sugestão por IA do intervalo de páginas (início/fim) de cada tópico dentro de um PDF da
// Biblioteca — pré-preenche os campos manuais do FormPdf.tsx (Fase 4), sempre com revisão humana
// antes de salvar (esta rota nunca persiste nada, só sugere).

export const maxDuration = 120; // PDFs grandes podem levar um tempo pra extrair + a IA analisar

// Igual ao teto de resumos/route.ts: material de estudo pode ter centenas de páginas — corta num
// teto seguro de contexto, mas SEMPRE numa fronteira de página (nunca no meio de uma), porque é a
// marcação "--- Página N ---" que a IA usa pra saber em que página cada trecho está.
const MAX_CHARS_TEXTO = 90_000;

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

function promptSistema(topicos: string[]): string {
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
- Se dois tópicos da lista forem consecutivos no material, o fim de um costuma ser a página anterior ao início do próximo — mas não force isso se o conteúdo não bater.
- Ignore sumário/índice do PDF ao decidir as páginas — use onde o CONTEÚDO de fato está.`;
}

async function sugerirIntervalos(texto: string, topicos: string[]): Promise<IntervaloSugerido[]> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: promptSistema(topicos) },
      { role: "user", content: texto },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("IA não retornou JSON válido");

  const parsed = JSON.parse(jsonMatch[0]) as { intervalos?: unknown };
  if (!Array.isArray(parsed.intervalos)) return [];

  const topicosValidos = new Set(topicos);
  const resultado: IntervaloSugerido[] = [];
  for (const item of parsed.intervalos) {
    if (typeof item !== "object" || item === null) continue;
    const { topico, paginaInicio, paginaFim } = item as Record<string, unknown>;
    if (typeof topico !== "string" || !topicosValidos.has(topico)) continue;
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

    const { texto, truncado } = montarTextoPaginado(paginas);
    const intervalos = await sugerirIntervalos(texto, topicos);

    return NextResponse.json({ intervalos, truncado, totalPaginas: paginas.length });
  } catch (err) {
    console.error("[pdf-topicos-paginas] erro:", err);
    return NextResponse.json({ error: "Erro ao processar o PDF com IA" }, { status: 500 });
  }
}
