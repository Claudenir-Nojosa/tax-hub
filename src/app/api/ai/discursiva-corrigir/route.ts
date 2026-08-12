import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Corrige uma resposta discursiva (prova de concurso público, SEFAZ-CE) como um examinador de
// banca faria: nota 0-10 (aceita decimal, ex.: 7.5 — escala real de discursiva brasileira) +
// feedback estruturado. Só corrige o texto que o client manda — quem persiste o resultado é
// /api/concurso/[id]/discursivas/[temaId]/respostas (POST), não esta rota.

export const maxDuration = 60;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um examinador experiente de bancas de concurso público brasileiras (perfil FGV/Cebraspe/FCC), corrigindo uma resposta discursiva de um candidato se preparando para Auditor Fiscal (SEFAZ-CE).

Avalie com o rigor e os critérios reais de uma banca: domínio técnico do conteúdo, estrutura/coesão textual, uso correto de terminologia jurídica/técnica, completude em relação ao que foi pedido, e clareza. Seja honesto e específico — elogios genéricos ou notas infladas não ajudam o candidato a evoluir.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{
  "nota": 0-10 (pode ter uma casa decimal, ex.: 7.5),
  "pontosFortes": ["..."],
  "pontosFracos": ["..."],
  "sugestoes": ["..."],
  "justificativa": "1-2 frases explicando a nota dada"
}`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as
    | { tema?: string; orientacoes?: string; pontosChave?: string[]; texto?: string }
    | null;
  const tema = body?.tema?.trim();
  const texto = body?.texto?.trim();
  if (!tema || !texto) return NextResponse.json({ error: "tema e texto são obrigatórios" }, { status: 400 });

  const partesPrompt = [
    `TEMA: ${tema}`,
    body?.orientacoes?.trim() ? `ORIENTAÇÕES DA QUESTÃO: ${body.orientacoes.trim()}` : null,
    body?.pontosChave && body.pontosChave.length > 0 ? `PONTOS-CHAVE ESPERADOS NA RESPOSTA:\n${body.pontosChave.map((p) => `- ${p}`).join("\n")}` : null,
    `RESPOSTA DO CANDIDATO:\n${texto.slice(0, 12000)}`,
  ].filter(Boolean);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: partesPrompt.join("\n\n") },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};

    const nota = typeof parsed.nota === "number" ? Math.max(0, Math.min(10, parsed.nota)) : null;
    const pontosFortes = Array.isArray(parsed.pontosFortes) ? parsed.pontosFortes.map(String) : [];
    const pontosFracos = Array.isArray(parsed.pontosFracos) ? parsed.pontosFracos.map(String) : [];
    const sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes.map(String) : [];
    const justificativa = typeof parsed.justificativa === "string" ? parsed.justificativa.trim() : "";

    if (nota === null) return NextResponse.json({ error: "resposta vazia da IA" }, { status: 502 });

    return NextResponse.json({ nota, feedback: { pontosFortes, pontosFracos, sugestoes, justificativa } });
  } catch (err) {
    console.error("[discursiva-corrigir] erro:", err);
    return NextResponse.json({ error: "Erro ao corrigir com a IA" }, { status: 502 });
  }
}
