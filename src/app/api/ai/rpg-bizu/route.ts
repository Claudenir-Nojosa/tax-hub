import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Gera um "bizu" (dica curta) por questão errada de UMA luta do RPG (aba Mapa) — comparando a
// alternativa que o usuário marcou com a correta, pra ele entender o erro e não repetir. Mesmo
// esqueleto de /api/ai/discursiva-corrigir (gpt-4o, response_format json_object, extrai JSON por
// regex antes do parse), mas em LOTE (uma chamada por luta, não uma por questão) — resposta
// embrulhada num campo nomeado, mesmo padrão de /api/ai/cartas ("cartas": [...]).

export const maxDuration = 60;

const MAX_ITENS = 12; // uma luta tem no máximo ~10 perguntas; folga pequena, sem motivo pra mais

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um professor de cursinho para concurso público brasileiro, dando "bizus" rápidos e diretos depois de uma questão errada.

Pra cada questão da lista, compare a alternativa que o candidato marcou com a alternativa correta e explique OBJETIVAMENTE por que ele errou e o que fixar pra não repetir — 1 a 3 frases, tom direto de bizu (não é uma correção formal de prova, é uma dica rápida pra gravar). Cite o conceito certo quando fizer diferença, não só "você errou porque marcou X".

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "dicas": [
    { "index": 0, "dica": "..." },
    { "index": 1, "dica": "..." }
  ]
}
Um item por questão da lista, na mesma ordem/index recebido — não pule nenhum.`;

interface ItemBizu {
  enunciado?: string;
  alternativas?: Record<string, string>;
  materia?: string;
  topico?: string;
  marcada?: string;
  correta?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { itens?: ItemBizu[] } | null;
  const itens = (body?.itens ?? []).slice(0, MAX_ITENS);
  if (itens.length === 0) return NextResponse.json({ error: "itens vazio" }, { status: 400 });

  const listaPrompt = itens
    .map((it, i) => {
      const alts = Object.entries(it.alternativas ?? {})
        .map(([letra, texto]) => `${letra}) ${texto}`)
        .join("\n");
      return [
        `QUESTÃO ${i} (${it.materia ?? "?"} · ${it.topico ?? "?"}):`,
        it.enunciado ?? "",
        alts,
        `Candidato marcou: ${it.marcada ?? "?"} · Correta: ${it.correta ?? "?"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: listaPrompt.slice(0, 16000) },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as { dicas?: { index?: number; dica?: string }[] }) : {};

    const dicas = (parsed.dicas ?? [])
      .filter((d) => typeof d.index === "number" && typeof d.dica === "string")
      .map((d) => ({ index: d.index as number, dica: (d.dica as string).trim() }));

    return NextResponse.json({ dicas });
  } catch (err) {
    console.error("[rpg-bizu] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar dicas com a IA" }, { status: 502 });
  }
}
