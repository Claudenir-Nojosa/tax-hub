// components/ConviteColaboradorDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ConviteColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartaoId: string;
  onConviteEnviado: () => void;
}

export function ConviteColaboradorDialog({
  open,
  onOpenChange,
  cartaoId,
  onConviteEnviado,
}: ConviteColaboradorDialogProps) {
  const [emailConvidado, setEmailConvidado] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleConvidarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailConvidado.trim()) {
      toast.error("Digite um email válido");
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailConvidado)) {
      toast.error("Digite um email válido");
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch(`/api/cartoes/${cartaoId}/colaboradores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailConvidado: emailConvidado.trim() }),
      });

      if (response.ok) {
        toast.success("Convite enviado com sucesso!");
        setEmailConvidado("");
        onOpenChange(false);
        onConviteEnviado();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar convite");
      }
    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      toast.error(error.message || "Erro ao enviar convite");
    } finally {
      setEnviando(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Quando fechar, limpa o email
      setEmailConvidado("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Convidar Colaborador</DialogTitle>
          <DialogDescription className="text-gray-400">
            Envie um convite para alguém acessar este cartão
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConvidarColaborador} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email do Colaborador
            </Label>
            <Input
              id="email"
              type="email"
              value={emailConvidado}
              onChange={(e) => setEmailConvidado(e.target.value)}
              placeholder="colaborador@email.com"
              className="bg-gray-800 border-gray-700 text-white"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando}
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              {enviando ? "Enviando..." : "Enviar Convite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}