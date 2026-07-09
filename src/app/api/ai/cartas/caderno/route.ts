import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 15;

interface ErroPayload {
  id: string;
  materia: string;
  topico: string;
  questao: string;
}

function buildPrompt(lote: ErroPayload[]): string {
  const conteudo = lote
    .map(
      (e, i) =>
        `[${i + 1}] erroId="${e.id}"\nMatéria: ${e.materia} | Tópico: ${e.topico}\nQuestão/Anotação: ${e.questao}`
    )
    .join("\n\n---\n\n");

  return `Você é especialista em criação de flashcards para concursos públicos brasileiros (área tributária/fiscal — SEFAZ-CE).

O estudante registrou os seguintes erros no Caderno de Erros. Para cada erro, crie 1 a 3 flashcards que ajudem a fixar exatamente o conceito que causou o erro.

ERROS DO CADERNO:
${conteudo}

REGRAS:
1. Para cada erro listado, gere 1-3 flashcards do tipo mais adequado ao conteúdo
2. Use os 3 tipos equilibradamente:
   - "monstro": pergunta dissertativa aberta
   - "armadilha": afirmação Verdadeiro ou Falso — inclua "gabarito": "verdadeiro" ou "falso"
   - "tesouro": complete a lacuna com ___
3. O campo "erroId" deve conter EXATAMENTE o valor do erroId fornecido entre aspas — não altere
4. Use a matéria e o tópico já fornecidos no erro
5. A frente deve focar no ponto exato que o estudante errou
6. O verso deve ser a resposta correta e didática

Retorne APENAS um JSON válido:
{
  "cartas": [
    {
      "erroId": "id exato do erro de origem",
      "tipo": "monstro" | "armadilha" | "tesouro",
      "materia": "matéria do erro",
      "topico": "tópico do erro",
      "frente": "pergunta, afirmação ou lacuna",
      "verso": "resposta completa",
      "gabarito": "verdadeiro" | "falso" | null
    }
  ]
}`;
}

async function processarLote(lote: ErroPayload[]): Promise<Record<string, unknown>[]> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 8192,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Você é especialista em criação de flashcards para concursos públicos. Responda SEMPRE em JSON válido conforme a estrutura solicitada. O campo erroId deve copiar EXATAMENTE o id fornecido.",
      },
      { role: "user", content: buildPrompt(lote) },
    ],
  });

  const text = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(text) as { cartas?: Record<string, unknown>[] };
  return parsed.cartas ?? [];
}

export async function POST(request: NextRequest) {
  try {
    const { erros } = (await request.json()) as { erros: ErroPayload[] };

    if (!erros || erros.length === 0) {
      return NextResponse.json({ error: "Nenhum erro enviado" }, { status: 400 });
    }

    // Divide em lotes de BATCH_SIZE para não exceder max_tokens
    const lotes: ErroPayload[][] = [];
    for (let i = 0; i < erros.length; i += BATCH_SIZE) {
      lotes.push(erros.slice(i, i + BATCH_SIZE));
    }

    const resultados = await Promise.all(lotes.map(processarLote));
    const todasCartas = resultados.flat();

    // dia no fuso do usuário (BR), não UTC do servidor — senão cartas criadas à noite ganham a
    // data de amanhã ("en-CA" formata como YYYY-MM-DD)
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
    const cartas = todasCartas.map((c, i) => ({
      id: `caderno_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      tipo: c.tipo ?? "monstro",
      materia: c.materia ?? undefined,
      topico: c.topico ?? undefined,
      frente: String(c.frente ?? ""),
      verso: String(c.verso ?? ""),
      gabarito: c.gabarito ?? undefined,
      erroId: String(c.erroId ?? ""),
      intervalo: 0,
      facilidade: 2.5,
      repeticoes: 0,
      proximaRevisao: today,
      criada: today,
      acertos: 0,
      erros: 0,
    }));

    return NextResponse.json({ cartas });
  } catch (error) {
    console.error("[api/ai/cartas/caderno] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
