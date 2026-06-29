import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";
import type { MateriaConcurso } from "@/lib/estudo-data";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CORES = [
  "sky","blue","emerald","violet","rose","amber","teal","indigo",
  "pink","cyan","lime","orange","purple","red","green","yellow",
];

const PROMPT_BASE = `Você é um especialista em análise de editais de concursos públicos brasileiros.

Analise o texto abaixo (conteúdo programático de um edital) e extraia todas as matérias (disciplinas) com seus respectivos tópicos.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "materias": [
    {
      "id": "nome_sem_espacos_sem_acentos",
      "nome": "Nome Exato da Matéria",
      "topicos": ["Tópico 1", "Tópico 2", "..."]
    }
  ]
}

Regras:
- id: minúsculas, sem acentos, espaços → underscore, apenas a-z 0-9 _
- nome: exatamente como aparece no edital (com acentos)
- topicos: cada item/subtema individualmente, sem numeração
- Ignore cabeçalhos, datas, regras do concurso — foque só no conteúdo programático
- Agrupe subtópicos numerados (ex: "1.1", "1.2") dentro da matéria correspondente

TEXTO DO EDITAL:
`;

async function extrairMaterias(texto: string): Promise<MateriaConcurso[]> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16384,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: PROMPT_BASE + texto }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("IA não retornou JSON válido");

  const parsed = JSON.parse(jsonMatch[0]) as { materias?: { id: string; nome: string; topicos: string[] }[] };
  if (!parsed.materias || !Array.isArray(parsed.materias)) throw new Error("IA não retornou matérias válidas");

  return parsed.materias.map((m, i) => ({
    id: m.id ?? m.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    nome: m.nome,
    cor: CORES[i % CORES.length],
    topicos: Array.isArray(m.topicos) ? m.topicos : [],
  }));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";

    let texto: string;

    if (contentType.includes("multipart/form-data")) {
      // Upload de PDF
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      texto = parsed.text;
    } else {
      // Texto colado
      const body = await req.json() as { texto?: string };
      if (!body.texto?.trim()) return NextResponse.json({ error: "Texto do edital não enviado" }, { status: 400 });
      texto = body.texto;
    }

    if (!texto?.trim()) return NextResponse.json({ error: "Não foi possível extrair texto do edital" }, { status: 400 });

    const materias = await extrairMaterias(texto);
    return NextResponse.json({ materias });
  } catch (err) {
    console.error("[edital-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao processar edital com IA" }, { status: 500 });
  }
}
