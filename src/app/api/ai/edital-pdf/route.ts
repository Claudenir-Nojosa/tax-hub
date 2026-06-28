import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "../../../../../auth";
import type { MateriaConcurso } from "@/lib/estudo-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Analise o PDF do edital e extraia TODAS as matérias (disciplinas) e seus tópicos/conteúdos programáticos.

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
- id: minúsculas, sem acentos, espaços → underscore, apenas a-z 0-9 _
- nome: exatamente como aparece no edital
- topicos: cada item do conteúdo programático individualmente
- Ignore datas, inscrições, taxas, regras do concurso. Foque só no conteúdo programático.`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    // Extrai JSON mesmo que venha com texto ao redor
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "IA não retornou JSON válido" }, { status: 422 });

    const parsed = JSON.parse(jsonMatch[0]) as { materias?: { id: string; nome: string; topicos: string[] }[] };

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
