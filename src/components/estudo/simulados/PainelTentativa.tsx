"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Download, History, Loader2, Play, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Alternativa } from "@/lib/estudo-data";
import {
  alinharRespostas, calcularResultadoParte, novaTentativaPartes,
  type ParteSimulado, type ParteTentativa, type RespostaTentativa, type SimuladoConcurso, type TentativaSimulado,
} from "@/lib/simulados-data";
import { obterArquivoSimulado } from "@/lib/simulados-storage";
import GabaritoInput from "./GabaritoInput";
import TimerParte from "./TimerParte";

// Fluxo de "fazer o simulado" — Fase 2 do plano. Trata partes em condição REAL de prova: baixa o
// PDF, aperta iniciar, cronômetro de parede corre (sobrevive fechar aba/trocar dispositivo — ver
// TimerParte.tsx), o usuário marca "terminei" manualmente (nunca auto-entrega) e só DEPOIS digita
// o próprio gabarito, que é cruzado com o oficial pra mostrar o resultado.

async function jsonOuErro(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}`);
  return data;
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PainelTentativa({
  concursoId, simulado, onFechar,
}: {
  concursoId: string;
  simulado: SimuladoConcurso;
  onFechar: () => void;
}) {
  const base = `/api/concurso/${concursoId}/simulados/${simulado.id}/tentativas`;

  const [tentativas, setTentativas] = useState<TentativaSimulado[] | null>(null);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [respondendoParteId, setRespondendoParteId] = useState<string | null>(null);
  const [respostasEmEdicao, setRespostasEmEdicao] = useState<RespostaTentativa[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    fetch(base)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: TentativaSimulado[]) => {
        setTentativas(data);
        const emAndamento = data.find((t) => t.status === "em_andamento");
        setSelecionadaId(emAndamento?.id ?? null);
      })
      .catch(() => toast.error("Não deu pra carregar o histórico de tentativas"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selecionada = tentativas?.find((t) => t.id === selecionadaId) ?? null;
  const concluidas = (tentativas ?? []).filter((t) => t.status === "concluida");
  const emAndamentoExistente = (tentativas ?? []).some((t) => t.status === "em_andamento");

  const iniciarTentativa = async () => {
    setOcupado(true);
    try {
      const nova = (await jsonOuErro(await fetch(base, { method: "POST" }))) as unknown as TentativaSimulado;
      setTentativas((prev) => (prev?.some((t) => t.id === nova.id) ? prev : [nova, ...(prev ?? [])]));
      setSelecionadaId(nova.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar tentativa");
    } finally {
      setOcupado(false);
    }
  };

  const abandonar = async (t: TentativaSimulado) => {
    if (!confirm("Abandonar essa tentativa? As respostas já marcadas se perdem.")) return;
    try {
      await jsonOuErro(await fetch(`${base}/${t.id}`, { method: "DELETE" }));
      setTentativas((prev) => (prev ?? []).filter((x) => x.id !== t.id));
      setSelecionadaId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abandonar tentativa");
    }
  };

  const iniciarParte = async (parte: ParteSimulado) => {
    if (!selecionada) return;
    setOcupado(true);
    try {
      const atualizada = (await jsonOuErro(
        await fetch(`${base}/${selecionada.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "iniciarParte", parteId: parte.id }),
        })
      )) as unknown as TentativaSimulado;
      setTentativas((prev) => (prev ?? []).map((t) => (t.id === atualizada.id ? atualizada : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar a parte");
    } finally {
      setOcupado(false);
    }
  };

  const abrirGabarito = (parte: ParteSimulado, tentativaParte?: ParteTentativa) => {
    setRespostasEmEdicao(alinharRespostas(parte, tentativaParte));
    setRespondendoParteId(parte.id);
  };

  const enviarGabarito = async () => {
    if (!selecionada || !respondendoParteId) return;
    setOcupado(true);
    try {
      const atualizada = (await jsonOuErro(
        await fetch(`${base}/${selecionada.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "responderParte", parteId: respondendoParteId, respostas: respostasEmEdicao }),
        })
      )) as unknown as TentativaSimulado;
      setTentativas((prev) => (prev ?? []).map((t) => (t.id === atualizada.id ? atualizada : t)));
      setRespondendoParteId(null);
      toast.success("Gabarito enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar gabarito");
    } finally {
      setOcupado(false);
    }
  };

  const baixarPdf = async () => {
    setBaixando(true);
    try {
      const blob = await obterArquivoSimulado(simulado.id);
      if (!blob) { toast.error("Arquivo não encontrado no Storage."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${simulado.nome}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar o PDF");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">{simulado.nome}</div>
            <div className="text-[11px] text-muted-foreground">{[simulado.orgao, simulado.banca, simulado.ano].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="flex items-center gap-1">
            {simulado.arquivoEnviado && (
              <button type="button" onClick={baixarPdf} disabled={baixando} title="Baixar PDF da prova" className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-60">
                {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </button>
            )}
            <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {tentativas === null ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {!selecionada && (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Cada parte roda com o tempo real da prova (
                  {simulado.partes.map((p) => `${p.nome}: ${Math.round(p.tempoMinutos / 60)}h`).join(" · ")}
                  ). O cronômetro não para se você fechar a aba — só entrega quando você mandar.
                </p>
                <button
                  type="button"
                  onClick={iniciarTentativa}
                  disabled={ocupado || emAndamentoExistente}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40"
                >
                  {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Iniciar nova tentativa
                </button>
              </div>
            )}

            {selecionada && (
              <div className="space-y-3">
                {selecionada.status === "em_andamento" && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => abandonar(selecionada)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" /> Abandonar tentativa
                    </button>
                  </div>
                )}
                {selecionada.status === "concluida" && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">Tentativa concluída em {fmtData(selecionada.concluidaEm ?? selecionada.criadoEm)}</span>
                  </div>
                )}

                {simulado.partes.map((parte) => {
                  const tp = selecionada.partes.find((p) => p.parteId === parte.id);
                  const resultado = tp?.concluidoEm ? calcularResultadoParte(parte, tp) : null;

                  return (
                    <div key={parte.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{parte.nome}</span>
                        <span className="text-[11px] text-muted-foreground">{parte.numeroQuestoes}q · {Math.round(parte.tempoMinutos / 60)}h</span>
                      </div>

                      {!tp?.iniciadoEm && (
                        <button
                          type="button"
                          onClick={() => iniciarParte(parte)}
                          disabled={ocupado || parte.numeroQuestoes === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40"
                        >
                          <Play className="h-3.5 w-3.5" /> Iniciar
                        </button>
                      )}

                      {tp?.iniciadoEm && !tp.concluidoEm && respondendoParteId !== parte.id && (
                        <div className="space-y-2">
                          <TimerParte iniciadoEm={tp.iniciadoEm} tempoMinutos={parte.tempoMinutos} />
                          <button
                            type="button"
                            onClick={() => abrirGabarito(parte, tp)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" /> Terminei — preencher gabarito
                          </button>
                        </div>
                      )}

                      {respondendoParteId === parte.id && (
                        <div className="space-y-2">
                          <GabaritoInput
                            gabarito={respostasEmEdicao.map((r) => ({ numero: r.numero, alternativaCorreta: r.alternativaMarcada }))}
                            onChange={(numero, alt: Alternativa | null) =>
                              setRespostasEmEdicao((prev) => prev.map((r) => (r.numero === numero ? { ...r, alternativaMarcada: alt } : r)))
                            }
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={enviarGabarito}
                              disabled={ocupado}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-40"
                            >
                              {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              Enviar gabarito
                            </button>
                            <button type="button" onClick={() => setRespondendoParteId(null)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {resultado && respondendoParteId !== parte.id && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs text-foreground">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{resultado.acertos}✓</span>{" "}
                            <span className="font-semibold text-red-500">{resultado.erros}✗</span>
                            {resultado.semResposta > 0 && <span className="text-muted-foreground"> · {resultado.semResposta} em branco</span>}
                            {resultado.percentual !== null && <span className="text-muted-foreground"> · {resultado.percentual}%</span>}
                            {resultado.minutosGastos !== null && <span className="text-muted-foreground"> · {resultado.minutosGastos}min gastos</span>}
                          </div>
                          <button type="button" onClick={() => abrirGabarito(parte, tp)} className="text-[11px] text-primary hover:underline">
                            Revisar respostas
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {selecionada.status === "concluida" && (
                  <button
                    type="button"
                    onClick={() => setSelecionadaId(null)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    Ver histórico / iniciar outra tentativa
                  </button>
                )}
              </div>
            )}

            {concluidas.length > 0 && (
              <div className="border-t border-border pt-3">
                <button type="button" onClick={() => setHistoricoAberto((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <History className="h-3.5 w-3.5" /> Histórico ({concluidas.length})
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${historicoAberto ? "rotate-180" : ""}`} />
                </button>
                {historicoAberto && (
                  <div className="mt-2 space-y-1.5">
                    {concluidas.map((t) => {
                      const totalAcertos = simulado.partes.reduce((s, p) => s + calcularResultadoParte(p, t.partes.find((tp) => tp.parteId === p.id)).acertos, 0);
                      const totalQuestoes = simulado.partes.reduce((s, p) => s + p.gabarito.length, 0);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelecionadaId(t.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                            selecionadaId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                          }`}
                        >
                          <span className="text-xs text-foreground">{fmtData(t.concluidaEm ?? t.criadoEm)}</span>
                          <span className="text-xs font-semibold text-foreground">{totalAcertos}/{totalQuestoes}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
