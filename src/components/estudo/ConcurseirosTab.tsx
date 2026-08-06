"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, BookOpen, Loader2, Heart, X, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SectionCard from "./ui/SectionCard";
import EmptyState from "./ui/EmptyState";
import ProgressRing from "./ui/ProgressRing";

// Pré-Aprovados: todo mundo com acesso ao concurso ativo (você + quem foi convidado) — currículo
// é comum, mas cada card aqui mostra o PRÓPRIO progresso de cada pessoa (% do edital, último
// estudo), buscado à parte via /api/concurso/[id]/concurseiros (única rota que expõe progresso de
// outra pessoa, restrita a quem também tem acesso a este mesmo concurso). "Mandar Incentivo"
// manda uma mensagem direta pro colega, que aparece no sino de notificações dele.

interface Concurseiro {
  userId: string;
  name: string | null;
  image: string | null;
  isPrincipal: boolean;
  topicosEstudados: number;
  totalTopicos: number;
  percEdital: number;
  ultimoPdf: { nome: string; materia: string; atualizadoEm?: string } | null;
}

function fmtData(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function iniciais(nome: string | null): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

function ModalIncentivo({
  destinatario, onFechar,
}: {
  destinatario: Concurseiro;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinatarioId: destinatario.userId, texto: texto.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Erro ao mandar incentivo");
        return;
      }
      toast.success(`Incentivo enviado pra ${destinatario.name ?? "seu colega"}!`);
      onFechar();
    } catch {
      toast.error("Erro de rede ao mandar incentivo");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Heart className="h-4 w-4 text-rose-500" /> Mandar incentivo pra {destinatario.name ?? "seu colega"}
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Bora, você consegue! Vi que já leu bastante essa semana 💪"
          maxLength={500}
          rows={4}
          autoFocus
          className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:border-primary"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onFechar}>Cancelar</Button>
          <Button size="sm" disabled={!texto.trim() || enviando} onClick={enviar} className="bg-primary hover:bg-primary/90 text-white">
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            {!enviando && "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConcurseirosTab({ concursoId }: { concursoId: string }) {
  const { data: session } = useSession();
  const [concurseiros, setConcurseiros] = useState<Concurseiro[] | null>(null);
  const [erro, setErro] = useState(false);
  const [incentivoPara, setIncentivoPara] = useState<Concurseiro | null>(null);

  useEffect(() => {
    if (!concursoId) return;
    setConcurseiros(null);
    setErro(false);
    fetch(`/api/concurso/${concursoId}/concurseiros`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setConcurseiros(data))
      .catch(() => setErro(true));
  }, [concursoId]);

  if (!concursoId) {
    return (
      <EmptyState
        icone={Users}
        titulo="Nenhum concurso ativo"
        descricao="Escolha um concurso em 'Meus Concursos' pra ver quem mais estuda com você."
      />
    );
  }

  if (erro) {
    return (
      <EmptyState icone={Users} titulo="Não deu pra carregar" descricao="Tente recarregar a página." />
    );
  }

  if (!concurseiros) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SectionCard titulo="Pré-Aprovados" icone={Users}>
      {concurseiros.length <= 1 ? (
        <EmptyState
          icone={Users}
          titulo="Só você por aqui, por enquanto"
          descricao="Compartilhe este concurso em 'Meus Concursos' pra estudar junto com alguém — currículo em comum, progresso de cada um separado."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {concurseiros.map((c) => {
            const voce = c.userId === session?.user?.id;
            const dataUltimoPdf = fmtData(c.ultimoPdf?.atualizadoEm);
            return (
              <div key={c.userId} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.image ?? undefined} alt={c.name ?? "Pré-Aprovado"} />
                    <AvatarFallback className="text-xs font-semibold">{iniciais(c.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{c.name ?? "Sem nome"}</span>
                      {voce && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">você</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {c.topicosEstudados}/{c.totalTopicos} tópicos estudados
                    </span>
                  </div>
                  <ProgressRing perc={c.percEdital} size={44} espessura={4} corStroke="stroke-primary" corTrilho="stroke-border">
                    <span className="text-[10px] font-bold text-foreground">{c.percEdital}%</span>
                  </ProgressRing>
                </div>
                <div className="border-t border-border pt-2.5 flex items-start gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  {c.ultimoPdf ? (
                    <div className="min-w-0">
                      <div className="text-[11px] text-foreground truncate">
                        <span className="text-muted-foreground">Último Estudo: </span>
                        <span title={c.ultimoPdf.nome}>{c.ultimoPdf.nome}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {c.ultimoPdf.materia}{dataUltimoPdf ? ` · ${dataUltimoPdf}` : ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Ainda não leu nenhum PDF</span>
                  )}
                </div>
                {!voce && (
                  <button
                    type="button"
                    onClick={() => setIncentivoPara(c)}
                    className="flex items-center justify-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Heart className="h-3 w-3" /> Mandar Incentivo
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {incentivoPara && <ModalIncentivo destinatario={incentivoPara} onFechar={() => setIncentivoPara(null)} />}
    </SectionCard>
  );
}
