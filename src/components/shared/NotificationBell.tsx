"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Sino de notificações — hoje só "Incentivos" (mensagens da aba Pré-Aprovados do Estudo), mas
// genérico o bastante pra qualquer outro tipo de notificação futura sem precisar refazer a UI.
// Sem infra de tempo real (websocket/push): poll periódico enquanto o dashboard está aberto, mais
// simples e suficiente pra esse volume (uso entre poucas pessoas, não é um chat).

interface Mensagem {
  id: string;
  texto: string;
  lida: boolean;
  criadoEm: string;
  remetente: { id: string; name: string | null; image: string | null };
}

const INTERVALO_POLL_MS = 60_000;

function fmtRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function iniciais(nome: string | null): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  const carregar = () => {
    fetch("/api/mensagens")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Mensagem[]) => setMensagens(data))
      .catch(() => { /* silencioso — sino não é crítico, não vale poluir com erro visível */ });
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    carregar();
    const id = setInterval(carregar, INTERVALO_POLL_MS);
    return () => clearInterval(id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!aberto) return;
    const onClickFora = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [aberto]);

  const naoLidas = mensagens.filter((m) => !m.lida).length;

  const handleAbrir = () => {
    setAberto((v) => !v);
    if (!aberto && naoLidas > 0) {
      setMensagens((prev) => prev.map((m) => ({ ...m, lida: true })));
      fetch("/api/mensagens/marcar-lidas", { method: "POST" }).catch(() => {
        // se falhar, o poll seguinte revalida do servidor e o badge volta a aparecer
      });
    }
  };

  if (!session?.user?.id) return null;

  return (
    <div className="relative" ref={painelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAbrir}
        title="Notificações"
        className="relative text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </Button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-foreground">
            Notificações
          </div>
          <div className="max-h-96 overflow-y-auto">
            {mensagens.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhuma notificação por aqui ainda.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {mensagens.map((m) => (
                  <li key={m.id} className="px-4 py-3 flex items-start gap-2.5">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={m.remetente.image ?? undefined} alt={m.remetente.name ?? "Usuário"} />
                      <AvatarFallback className="text-[10px] font-semibold">{iniciais(m.remetente.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Heart className="h-3 w-3 text-rose-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{m.remetente.name ?? "Alguém"}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtRelativo(m.criadoEm)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{m.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
