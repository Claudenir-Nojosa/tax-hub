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

Analise o texto abaixo (conteúdo programático de um edital) e extraia todas as matérias (disciplinas) com seus tópicos e subtópicos.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "materias": [
    {
      "id": "nome_sem_espacos_sem_acentos",
      "nome": "Nome Exato da Matéria",
      "topicos": [
        {
          "nome": "Tópico Principal",
          "subtopicos": ["Subtópico A", "Subtópico B"]
        },
        {
          "nome": "Tópico Sem Subtópicos",
          "subtopicos": []
        }
      ]
    }
  ]
}

Regras:
- id: minúsculas, sem acentos, espaços → underscore, apenas a-z 0-9 _
- nome da matéria: exatamente como aparece no edital (com acentos)
- Tópico principal = item numerado (ex: "1. Conceitos Básicos") ou título de seção
- Subtópico = item listado dentro de um tópico principal (ex: "restrição orçamentária" dentro de "Teoria do Consumidor")
- Capitalize a primeira letra de cada palavra (ex: "Restrição Orçamentária", "Papel do Governo")
- Sem numeração nos nomes, apenas o texto
- Ignore cabeçalhos, datas, regras do concurso — foque só no conteúdo programático

TEXTO DO EDITAL:
`;

type TopicoAninhado = { nome: string; subtopicos: string[] }
type MateriaRaw = { id: string; nome: string; topicos: TopicoAninhado[] }

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

  const parsed = JSON.parse(jsonMatch[0]) as { materias?: MateriaRaw[] };
  if (!parsed.materias || !Array.isArray(parsed.materias)) throw new Error("IA não retornou matérias válidas");

  return parsed.materias.map((m, i) => {
    // Flatten: tópico principal sem espaço, subtópicos com "  " (dois espaços)
    const topicos: string[] = [];
    for (const t of (m.topicos ?? [])) {
      if (typeof t === "string") {
        topicos.push(t);
      } else {
        topicos.push(t.nome);
        for (const sub of (t.subtopicos ?? [])) {
          topicos.push("  " + sub);
        }
      }
    }
    return {
      id: m.id ?? m.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      nome: m.nome,
      cor: CORES[i % CORES.length],
      topicos,
    };
  });
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

      const uint8 = new Uint8Array(await file.arrayBuffer());
      const { extractText } = await import("unpdf");
      const { text } = await extractText(uint8, { mergePages: true });
      texto = text;
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
