import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../../auth";

// Gera a fala do "Gandalf" (consultor de estudos) ANALISANDO um resumo estruturado e 100%
// factual da semana do aluno (progresso por matéria, atraso, streak, dias sem atividade,
// pendências de questão/reforço/revisão/cartas — ver montarResumoSemanaIA em trilha-ui.ts). A IA
// tem liberdade pra escolher O QUE destacar (não precisa citar tudo — só o mais relevante pro
// momento), mas todo número/nome que ela usar tem que vir exatamente do resumo: ela não deve
// inventar fatos novos nem recalcular nada por conta própria.
//
// Client: useMensagemGustavoIA (trilha-ui.ts) chama isso e cacheia por conteúdo do resumo — a
// versão determinística de gerarMensagemGustavo aparece na hora (sem esperar rede) e é trocada
// pela análise da IA quando chega; se a IA falhar, a determinística já visível continua valendo.

export const maxDuration = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT = `Você é Gandalf, um consultor de estudos pessoal e caloroso que acompanha um aluno se preparando pra concurso público.

Você recebe um RESUMO ESTRUTURADO E FACTUAL da semana atual do aluno: progresso por matéria (minutos feitos/alvo, % concluído, tópico e capítulo em que está agora, se já fechou a meta da semana ou ainda está bloqueada na fila), % geral da semana, se está atrasado e quantos minutos/dia precisa pros dias que restam, sequência de dias estudando sem parar, dias sem nenhuma atividade, quantas questões/reforços/revisões/cartas estão pendentes, e o resultado da semana passada (se disponível).

Sua tarefa: ANALISAR esse resumo de verdade — não é pra só reescrever uma frase pronta — e escrever uma mensagem curta, pessoal e motivadora que reflita com precisão o que os dados mostram: o que está indo bem, o que precisa de atenção, e o que fazer a seguir. Você escolhe livremente o que destacar (não precisa mencionar tudo — foque no mais relevante/urgente pro momento), mas cada número, percentual, nome de matéria/tópico/capítulo ou contagem de dias que você citar TEM que vir exatamente do resumo, sem arredondar diferente nem calcular nada novo.

REGRAS OBRIGATÓRIAS:
- NUNCA invente nenhum fato que não esteja no resumo.
- Se citar um número, ele tem que estar EXATAMENTE como está no resumo.
- Se "diasSemAtividade" for 2 ou mais, ou "atrasado" for true, isso é o sinal mais urgente e deve aparecer com destaque na mensagem.
- Nunca trate uma matéria com "minutosFeitos" > 0 como se fosse nova/"vamos começar" — se já tem progresso, fale em continuar, e pode citar o "capituloAtual" quando ele existir.
- Se tudo estiver bem (sem atraso, sem inatividade), celebre com algo ESPECÍFICO tirado do resumo (ex.: uma matéria perto de fechar a semana, um streak bom, comparação com a semana passada).
- Português do Brasil, tom pessoal (use "nomeUsuario" se vier preenchido).
- Título curto (uma linha, no máximo 1 emoji). Corpo com 1-3 frases, direto.
- Varie a forma de dizer a cada chamada — evite frases genéricas repetidas sempre do mesmo jeito.

Retorne APENAS um JSON válido, sem texto adicional, no formato:
{ "titulo": "...", "corpo": "..." }`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { resumo?: Record<string, unknown> } | null;
  const resumo = body?.resumo;
  if (!resumo || typeof resumo !== "object") {
    return NextResponse.json({ error: "resumo ausente" }, { status: 400 });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify(resumo) },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};
    const titulo = typeof parsed.titulo === "string" ? parsed.titulo.trim() : "";
    const corpo = typeof parsed.corpo === "string" ? parsed.corpo.trim() : "";
    if (!titulo || !corpo) return NextResponse.json({ error: "resposta vazia da IA" }, { status: 502 });

    return NextResponse.json({ titulo, corpo });
  } catch (err) {
    console.error("[gustavo-mensagem] erro:", err);
    // falha da IA não é fatal — o client já mostrava a versão determinística e continua nela
    return NextResponse.json({ error: "erro na IA" }, { status: 502 });
  }
}
