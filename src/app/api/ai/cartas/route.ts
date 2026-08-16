import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import JSZip from "jszip";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface XMindTopicJSON {
  title?: string;
  children?: { attached?: XMindTopicJSON[] };
}

interface XMindSheetJSON {
  rootTopic?: XMindTopicJSON;
}

function flattenTopicJSON(topic: XMindTopicJSON, depth = 0): string[] {
  const title = (topic.title ?? "").trim();
  if (!title) return [];
  const indent = "  ".repeat(depth);
  const lines: string[] = [`${indent}${title}`];
  for (const child of topic.children?.attached ?? []) {
    lines.push(...flattenTopicJSON(child, depth + 1));
  }
  return lines;
}

async function extrairConteudoXMind(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // XMind 2020+ — content.json
  const jsonFile = zip.file("content.json");
  if (jsonFile) {
    const raw = await jsonFile.async("string");
    const data = JSON.parse(raw) as XMindSheetJSON[] | XMindSheetJSON;
    const sheets = Array.isArray(data) ? data : [data];
    const lines: string[] = [];
    for (const sheet of sheets) {
      if (sheet.rootTopic) lines.push(...flattenTopicJSON(sheet.rootTopic));
    }
    return lines.join("\n");
  }

  // XMind antigo — content.xml
  const xmlFile = zip.file("content.xml");
  if (xmlFile) {
    const xml = await xmlFile.async("string");
    const titles = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/g) ?? [];
    return titles
      .map((t) => t.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join("\n");
  }

  throw new Error("Formato XMind não reconhecido (esperado content.json ou content.xml)");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const conteudo = await extrairConteudoXMind(buffer);

    if (!conteudo.trim()) {
      return NextResponse.json({ error: "Não foi possível extrair conteúdo do arquivo" }, { status: 400 });
    }

    const prompt = `Você é especialista em criação de flashcards para concursos públicos brasileiros (área tributária/fiscal — SEFAZ-CE).

Analise este conteúdo extraído de um mapa mental XMind e gere flashcards para estudo com repetição espaçada.

CONTEÚDO DO MAPA MENTAL:
\`\`\`
${conteudo.slice(0, 20000)}
\`\`\`

REGRAS:
1. Gere um flashcard para CADA conceito/tópico relevante do mapa. Não existe limite máximo — cubra tudo que tiver no conteúdo. Para mapas grandes, gere 40-80 cards.
2. Use os 3 tipos de carta de forma equilibrada:
   - "monstro": pergunta dissertativa aberta (ex: "Explique a diferença entre isenção e imunidade")
   - "armadilha": afirmação para marcar Verdadeiro ou Falso — inclua o campo "gabarito": "verdadeiro" ou "falso"
   - "tesouro": UMA frase completa e autocontida na frente, com a parte que deve ficar oculta marcada entre chaves duplas {{assim}} (ex: "O prazo para lançamento é de {{cinco anos}}"). Marque só a parte essencial, nunca a frase inteira. Pode destacar outra palavra da MESMA frase em **negrito** se fizer sentido, mas isso é raro e opcional.
3. Para "monstro" e "armadilha", a frente é a pergunta/afirmação e o verso é a resposta completa. Para "tesouro", a frase com a lacuna {{}} JÁ é autossuficiente na frente — o verso fica vazio ("") a menos que valha a pena uma explicação extra curta (opcional).
4. Pode usar **negrito** (dois asteriscos) pra destacar uma palavra-chave importante em qualquer tipo de carta, se ajudar a memorização — não abuse, só quando fizer diferença real.
5. Infira a matéria e o tópico com base no conteúdo

Retorne APENAS um JSON válido com esta estrutura:
{
  "cartas": [
    {
      "tipo": "monstro" | "armadilha" | "tesouro",
      "materia": "nome da matéria (string ou null)",
      "topico": "tópico específico (string ou null)",
      "frente": "pergunta, afirmação ou texto com lacuna",
      "verso": "resposta completa e didática",
      "gabarito": "verdadeiro" | "falso" | null
    }
  ]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 16384,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você é especialista em criação de flashcards para concursos públicos. Responda SEMPRE em JSON válido conforme a estrutura solicitada.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(text) as { cartas?: Record<string, unknown>[] };

    // dia no fuso do usuário (BR), não UTC do servidor — senão cartas criadas à noite ganham a
    // data de amanhã ("en-CA" formata como YYYY-MM-DD)
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
    const cartas = (parsed.cartas ?? []).map((c, i) => ({
      id: `ai_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      tipo: c.tipo ?? "monstro",
      materia: c.materia ?? undefined,
      topico: c.topico ?? undefined,
      frente: String(c.frente ?? ""),
      verso: String(c.verso ?? ""),
      gabarito: c.gabarito ?? undefined,
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
    console.error("[api/ai/cartas] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
