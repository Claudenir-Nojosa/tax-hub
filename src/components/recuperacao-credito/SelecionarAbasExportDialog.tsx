"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { IncluirAbas } from "@/lib/recuperacao-credito-excel";

// Diálogo "quais abas exportar" — só chamado quando há 2+ tipos de declaração no projeto (com
// 1 só tipo não faz sentido perguntar, a página exporta direto). Todas as abas vêm marcadas por
// padrão (mantém o comportamento de sempre, "baixar tudo"). O Checklist não aparece na lista
// porque sempre entra no arquivo, independente da seleção — ver docs/recuperacao-credito.md
// seção 11.
export interface OpcaoAbaExport {
  key: keyof IncluirAbas;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opcoes: OpcaoAbaExport[];
  onConfirmar: (incluir: IncluirAbas) => void;
}

export default function SelecionarAbasExportDialog({ open, onOpenChange, opcoes, onConfirmar }: Props) {
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) setMarcadas(Object.fromEntries(opcoes.map((o) => [o.key, true])));
  }, [open, opcoes]);

  const todasMarcadas = opcoes.every((o) => marcadas[o.key]);

  const alternarTodas = () => {
    setMarcadas(Object.fromEntries(opcoes.map((o) => [o.key, !todasMarcadas])));
  };

  const confirmar = () => {
    const incluir: IncluirAbas = {};
    for (const o of opcoes) incluir[o.key] = !!marcadas[o.key];
    onConfirmar(incluir);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quais abas exportar?</DialogTitle>
          <DialogDescription>
            Escolha o que entra no Excel. A aba Checklist é sempre incluída.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            type="button"
            onClick={alternarTodas}
            className="text-xs font-medium text-primary hover:underline"
          >
            {todasMarcadas ? "Desmarcar todas" : "Selecionar todas"}
          </button>

          <div className="space-y-2">
            {opcoes.map((o) => (
              <div key={o.key} className="flex items-center gap-2">
                <Checkbox
                  id={`aba-${o.key}`}
                  checked={!!marcadas[o.key]}
                  onCheckedChange={(v) => setMarcadas((prev) => ({ ...prev, [o.key]: v === true }))}
                />
                <Label htmlFor={`aba-${o.key}`} className="text-sm font-normal cursor-pointer">
                  {o.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={confirmar} disabled={opcoes.every((o) => !marcadas[o.key])}>
            Baixar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
