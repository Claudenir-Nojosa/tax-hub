"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { UserCircle2, Loader2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Perfil do usuário: nome e foto. A foto é só uma URL (sem upload de arquivo/Storage de
// propósito — mais simples, não depende de nenhuma infra nova). Já existia um link pra cá na
// Sidebar (avatar/nome no topo), só faltava a página.

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "U";
}

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/user/perfil")
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: { name: string | null; image: string | null }) => {
        setNome(data.name ?? "");
        setFoto(data.image ?? "");
      })
      .catch(() => toast.error("Não deu pra carregar seu perfil"))
      .finally(() => setCarregando(false));
  }, []);

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error("Nome não pode ficar vazio");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/user/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome.trim(), image: foto.trim() || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Erro ao salvar perfil");
        return;
      }
      await update();
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro de rede ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-1">
        <UserCircle2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Altere seu nome e sua foto.</p>

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0">
              <AvatarImage src={foto.trim() || undefined} alt={nome || "Você"} className="object-cover" />
              <AvatarFallback className="text-lg font-semibold">{iniciais(nome || session?.user?.name || "U")}</AvatarFallback>
            </Avatar>
            <div className="text-xs text-muted-foreground">
              A foto é só uma URL — cole o link de uma imagem já hospedada em algum lugar (ex.: Google Fotos, Imgur, LinkedIn).
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="perfil-nome">Nome</Label>
            <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="perfil-foto">URL da foto</Label>
            <Input id="perfil-foto" value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <div className="text-sm text-muted-foreground px-3 py-2 rounded-md bg-muted">{session?.user?.email}</div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={salvar} disabled={salvando} className="bg-primary hover:bg-primary/90 text-white">
              {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
