"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, History, Loader2, Send, ThumbsDown, ThumbsUp, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { contarPalavras, type DiscursivaResposta, type DiscursivaTema, type FeedbackDiscursiva } from "@/lib/discursivas-data";

// Fluxo de responder um tema de discursiva — Fase 3 do plano. Escreve → envia pra correção da IA
// (/api/ai/discursiva-corrigir) → o resultado (nota + feedback) já vem salvo (a rota de
// respostas persiste tudo de uma vez) → mostra o histórico com a evolução da nota nesse tema.

async function jsonOuErro(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}`);
  return data;
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function corNota(nota: number): string {
  return nota >= 7 ? "text-emerald-600 dark:text-emerald-400" : nota >= 5 ? "text-amber-600 dark:text-amber-400" : "text-red-500";
}

function CardResultado({ nota, feedback }: { nota: number; feedback: FeedbackDiscursiva }) {
  return (
    <div className="space-y-3">
      <div className="text-center py-3 rounded-xl bg-muted/30 border border-border">
        <div className={`text-4xl font-bold tabular-nums ${corNota(nota)}`}>{nota.toFixed(1)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">nota (0-10)</div>
      </div>
      {feedback.justificativa && <p className="text-xs text-muted-foreground italic">{feedback.justificativa}</p>}
      {feedback.pontosFortes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            <ThumbsUp className="h-3.5 w-3.5" /> Pontos fortes
          </div>
          <ul className="space-y-1 pl-1">
            {feedback.pontosFortes.map((p, i) => <li key={i} className="text-xs text-foreground flex gap-1.5"><span className="text-emerald-500">•</span>{p}</li>)}
          </ul>
        </div>
      )}
      {feedback.pontosFracos.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 mb-1">
            <ThumbsDown className="h-3.5 w-3.5" /> Pontos a melhorar
          </div>
          <ul className="space-y-1 pl-1">
            {feedback.pontosFracos.map((p, i) => <li key={i} className="text-xs text-foreground flex gap-1.5"><span className="text-red-500">•</span>{p}</li>)}
          </ul>
        </div>
      )}
      {feedback.sugestoes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Sugestões
          </div>
          <ul className="space-y-1 pl-1">
            {feedback.sugestoes.map((p, i) => <li key={i} className="text-xs text-foreground flex gap-1.5"><span className="text-primary">•</span>{p}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PainelResposta({
  concursoId, tema, onFechar, onRespostaSalva,
}: {
  concursoId: string;
  tema: DiscursivaTema;
  onFechar: () => void;
  onRespostaSalva: (resposta: DiscursivaResposta) => void;
}) {
  const base = `/api/concurso/${concursoId}/discursivas/${tema.id}/respostas`;

  const [respostas, setRespostas] = useState<DiscursivaResposta[] | null>(null);
  const [texto, setTexto] = useState("");
  const [corrigindo, setCorrigindo] = useState(false);
  const [resultadoAtual, setResultadoAtual] = useState<DiscursivaResposta | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const inicioRef = useRef<number>(Date.now());

  useEffect(() => {
    fetch(base)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: DiscursivaResposta[]) => setRespostas(data))
      .catch(() => toast.error("Não deu pra carregar o histórico de respostas"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviarParaCorrecao = async () => {
    if (texto.trim() === "" || corrigindo) return;
    setCorrigindo(true);
    try {
      const correcao = (await jsonOuErro(
        await fetch("/api/ai/discursiva-corrigir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tema: tema.tema, orientacoes: tema.orientacoes, pontosChave: tema.pontosChave, texto }),
        })
      )) as unknown as { nota: number; feedback: FeedbackDiscursiva };

      const minutosGastos = Math.max(1, Math.round((Date.now() - inicioRef.current) / 60000));
      const salva = (await jsonOuErro(
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto, notaIA: correcao.nota, feedbackIA: correcao.feedback, minutosGastos }),
        })
      )) as unknown as DiscursivaResposta;

      setRespostas((prev) => [salva, ...(prev ?? [])]);
      setResultadoAtual(salva);
      onRespostaSalva(salva);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao corrigir com a IA");
    } finally {
      setCorrigindo(false);
    }
  };

  const novaResposta = () => {
    setResultadoAtual(null);
    setTexto("");
    inicioRef.current = Date.now();
  };

  const palavras = contarPalavras(texto);

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{tema.tema}</div>
            <div className="text-[11px] text-muted-foreground">{tema.materia ?? "Tema geral"}</div>
          </div>
          <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {tema.orientacoes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">{tema.orientacoes}</p>}

        {resultadoAtual?.notaIA !== undefined && resultadoAtual?.notaIA !== null && resultadoAtual.feedbackIA ? (
          <div className="space-y-3">
            <CardResultado nota={resultadoAtual.notaIA} feedback={resultadoAtual.feedbackIA} />
            <button
              type="button"
              onClick={novaResposta}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              Escrever outra resposta
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva sua resposta aqui — igual você faria na prova"
              rows={12}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">{palavras} palavra{palavras !== 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={enviarParaCorrecao}
                disabled={texto.trim() === "" || corrigindo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-wait"
              >
                {corrigindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {corrigindo ? "Corrigindo…" : "Enviar para correção"}
              </button>
            </div>
          </div>
        )}

        {respostas !== null && respostas.length > 0 && (
          <div className="border-t border-border pt-3">
            <button type="button" onClick={() => setHistoricoAberto((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <History className="h-3.5 w-3.5" /> Histórico ({respostas.length})
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${historicoAberto ? "rotate-180" : ""}`} />
            </button>
            {historicoAberto && (
              <div className="mt-2 space-y-1.5">
                {respostas.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setResultadoAtual(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                      resultadoAtual?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    }`}
                  >
                    <span className="text-xs text-foreground">{fmtData(r.criadoEm)}</span>
                    <span className={`text-xs font-semibold ${r.notaIA !== null ? corNota(r.notaIA) : "text-muted-foreground"}`}>
                      {r.notaIA !== null ? r.notaIA.toFixed(1) : "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
