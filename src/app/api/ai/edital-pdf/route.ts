import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";
import type { MateriaConcurso } from "@/lib/estudo-data";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CORES = [
  "sky","blue","emerald","violet","rose","amber","teal","indigo",
  "pink","cyan","lime","orange","purple","red","green","yellow",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const prompt = `Você é um assistente especializado em análise de editais de concursos públicos brasileiros.

Analise o PDF do edital a seguir e extraia todas as matérias (disciplinas) e seus tópicos/conteúdos programáticos.

Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto adicional:
{
  "materias": [
    {
      "id": "nome_da_materia_sem_espacos",
      "nome": "Nome Exato da Matéria",
      "topicos": ["Tópico 1", "Tópico 2", "..."]
    }
  ]
}

Regras:
- id deve ser em minúsculas, sem acentos, espaços substituídos por underscore
- nome deve ser o nome oficial da matéria como aparece no edital
- topicos deve listar cada tópico/conteúdo individualmente
- Ignore informações sobre datas, inscrições, taxas, etc. Foque apenas no conteúdo programático.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { materias?: { id: string; nome: string; topicos: string[] }[] };

    if (!parsed.materias || !Array.isArray(parsed.materias)) {
      return NextResponse.json({ error: "IA não retornou matérias válidas" }, { status: 422 });
    }

    const materias: MateriaConcurso[] = parsed.materias.map((m, i) => ({
      id: m.id ?? m.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      nome: m.nome,
      cor: CORES[i % CORES.length],
      topicos: Array.isArray(m.topicos) ? m.topicos : [],
    }));

    return NextResponse.json({ materias });
  } catch (err) {
    console.error("[edital-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao processar PDF com IA" }, { status: 500 });
  }
}
