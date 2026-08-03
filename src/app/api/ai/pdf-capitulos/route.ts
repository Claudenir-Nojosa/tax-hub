import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Sugestão por IA da lista de CAPÍTULOS do PDF, direto do índice — usada pelo botão "Sugerir com
// IA" do PainelCapitulos.tsx (dentro do leitor). Bem mais simples que a antiga rota
// pdf-topicos-paginas: não tenta casar capítulo com tópico do edital nem adivinhar onde cada um
// TERMINA (isso já é derivado automaticamente em trilha-dinamica.ts a partir do início do
// próximo) — só extrai, do índice, nome + página de início de cada capítulo de TEORIA, pulando
// introdução/apresentação do curso e as seções de exercício no final. Nunca aplica sozinho: o
// resultado só pré-preenche o painel, sempre com revisão humana antes de qualquer coisa ser salva.

export const maxDuration = 60;

const MAX_CHARS_INDICE = 20_000;
const PAGINAS_INDICE_MAX = 10;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CapituloSugerido {
  nome: string;
  paginaInicio: number;
}

const PROMPT = `Você é um assistente que lê o ÍNDICE/SUMÁRIO de um PDF de material de estudo (aula de cursinho pra concurso público brasileiro), normalmente nas primeiras páginas, listando os assuntos com o número da página onde cada um começa (formato comum: "Nome do assunto ..... 16" ou "1) Nome do assunto 16").

Extraia TODOS os capítulos de TEORIA do índice, na ordem em que aparecem, com o número EXATO de página que o índice indica pra cada um.

IGNORE (não inclua na lista):
- Capítulo introdutório / apresentação do curso ou do professor (ex.: "Apresentação", "Apresentação do Curso", "Sobre o curso", "Como estudar").
- Qualquer seção de exercícios: "Questões Comentadas", "Lista de Questões", "Gabarito", e afins.

O texto vem marcado com "--- Página N ---" antes do conteúdo de cada página — os números do índice já correspondem EXATAMENTE a essa marcação, mesma numeração, sem converter nada.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "capitulos": [
    { "nome": "Nome exatamente como está no índice", "paginaInicio": 4 }
  ]
}

Regras:
- Só inclua um capítulo se você tiver certeza razoável olhando o índice — não invente nem infira pelo conteúdo.
- Se não houver um índice reconhecível nas páginas enviadas, retorne { "capitulos": [] }.`;

// POST multipart: file (PDF) — sugere nome/paginaInicio de cada capítulo, lendo só o índice
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  try {
    const uint8 = new Uint8Array(await file.arrayBuffer());
    const { extractText } = await import("unpdf");
    const { text: paginas } = await extractText(uint8, { mergePages: false });

    let texto = "";
    for (let i = 0; i < Math.min(paginas.length, PAGINAS_INDICE_MAX); i++) {
      const bloco = `--- Página ${i + 1} ---\n${paginas[i]}\n\n`;
      if (texto.length + bloco.length > MAX_CHARS_INDICE) break;
      texto += bloco;
    }
    if (texto.trim().length < 50) {
      return NextResponse.json(
        { error: "Não achei texto legível nas primeiras páginas (PDF escaneado, ou sem índice logo no início)" },
        { status: 400 }
      );
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: texto },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as { capitulos?: unknown }) : {};
    if (!Array.isArray(parsed.capitulos)) return NextResponse.json({ capitulos: [] });

    const capitulos: CapituloSugerido[] = [];
    for (const item of parsed.capitulos) {
      if (typeof item !== "object" || item === null) continue;
      const { nome, paginaInicio } = item as Record<string, unknown>;
      if (typeof nome !== "string" || nome.trim() === "") continue;
      if (typeof paginaInicio !== "number" || !Number.isFinite(paginaInicio) || paginaInicio < 1) continue;
      capitulos.push({ nome: nome.trim(), paginaInicio: Math.round(paginaInicio) });
    }
    return NextResponse.json({ capitulos });
  } catch (err) {
    console.error("[pdf-capitulos] erro:", err);
    return NextResponse.json({ error: "Erro ao processar o PDF com IA" }, { status: 500 });
  }
}
