import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Reescreve a fala do Gustavo (consultor de estudos) com um tom mais motivador e variado — a
// mensagem BASE já vem pronta e 100% correta de gerarMensagemGustavo (trilha-ui.ts, determinístico:
// prioridade de inatividade/atraso/tendência/próxima atividade, todos os números e nomes já
// calculados ali). A IA só troca as PALAVRAS, nunca os FATOS: não pode inventar, remover ou alterar
// nenhum número, nome de matéria/tópico ou percentual que já está no texto base — só deixa o tom
// mais caloroso/pessoal e varia a frase a cada chamada, pra não soar sempre igual.
//
// Client: useMensagemGustavoIA (trilha-ui.ts) chama isso e cacheia por conteúdo — a versão
// determinística aparece na hora (sem esperar rede) e é trocada pela reescrita quando chega; se a
// IA falhar, a mensagem determinística já visível continua valendo, sem quebrar nada.

export const maxDuration = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT = `Você é Gustavo, um consultor de estudos pessoal e caloroso que acompanha um aluno se preparando pra concurso público. Você recebe uma mensagem-base (título + corpo) já com todos os fatos certos — dados de progresso, nomes de matéria e tópico, números, percentuais.

Sua tarefa: reescrever essa mensagem com um tom mais motivador, humano e variado, como se você realmente conhecesse o aluno e estivesse torcendo por ele. Pode ser direto, engraçado, caloroso, breve — o que fizer sentido pro contexto da mensagem (uma mensagem de atraso pede outro tom que uma de "tudo em dia").

REGRAS OBRIGATÓRIAS:
- NUNCA invente, remova ou altere nenhum fato: número, percentual, nome de matéria, nome de tópico, contagem de dias — tudo que está na mensagem-base tem que continuar presente e correto na reescrita.
- NUNCA invente informação nova que não estava na mensagem-base.
- Mantenha em português do Brasil, tom pessoal (pode usar o nome do aluno se ele foi passado).
- Título curto (uma linha). Corpo com 1-2 frases, no máximo.
- Pode usar no máximo 1 emoji, só se fizer sentido — não force.
- Varie a forma de dizer a cada vez que for chamado — evite frases genéricas tipo "Sua atividade desta semana é" repetidas sempre do mesmo jeito.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{ "titulo": "...", "corpo": "..." }`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as
    | { titulo?: string; corpo?: string; nomeUsuario?: string }
    | null;
  const titulo = body?.titulo ?? "";
  const corpo = body?.corpo ?? "";
  if (!titulo.trim() || !corpo.trim()) {
    return NextResponse.json({ error: "titulo/corpo ausentes" }, { status: 400 });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            nomeUsuario: body?.nomeUsuario ?? null,
            mensagemBase: { titulo, corpo },
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};
    const tituloIA = typeof parsed.titulo === "string" ? parsed.titulo.trim() : "";
    const corpoIA = typeof parsed.corpo === "string" ? parsed.corpo.trim() : "";
    if (!tituloIA || !corpoIA) return NextResponse.json({ titulo, corpo });

    return NextResponse.json({ titulo: tituloIA, corpo: corpoIA });
  } catch (err) {
    console.error("[gustavo-mensagem] erro:", err);
    // falha da IA não é fatal — devolve a mensagem-base, o cliente já teria mostrado ela mesmo
    return NextResponse.json({ titulo, corpo });
  }
}
