"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  icone?: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  className?: string; // override de largura máxima, ex. "max-w-lg"
}

// Shell de modal único do módulo Estudo — extraído do CalendarioTab (que já fazia isso certo:
// bottom-sheet no mobile, centrado no desktop). Reaproveitado por qualquer formulário do módulo
// em vez de cada aba rolar seu próprio `fixed inset-0` do zero.
export default function BottomSheetModal({
  open, onClose, titulo, icone: Icone, children, footer, className,
}: BottomSheetModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {Icone && <Icone className="h-4 w-4 text-primary" />}
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex-shrink-0 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
