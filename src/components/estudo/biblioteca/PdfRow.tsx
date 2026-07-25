"use client";

import { useRef, useState } from "react";
import { BookOpen, CheckCircle2, Clock, FileUp, Loader2, Pencil, Trash2 } from "lucide-react";
import type { PdfEstudo } from "@/lib/estudo-data";
import { alvoLeituraPdf, fmtEta } from "./biblioteca-utils";

// ─── Linha de PDF ────────────────────────────────────────────────────────────

export default function PdfRow({
  pdf, temArquivo, enviando, carregando, pagPorHora, onLer, onAnexar, onAtualizarPagina, onConcluir, onEditar, onExcluir,
}: {
  pdf: PdfEstudo;
  temArquivo: boolean;
  enviando: boolean;
  carregando: boolean;
  pagPorHora: number | null;
  onLer: () => void;
  onAnexar: (arquivo: File) => void;
  onAtualizarPagina: (pagina: number) => void;
  onConcluir: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [paginaInput, setPaginaInput] = useState(String(pdf.paginaAtual));
  const anexoRef = useRef<HTMLInputElement>(null);
  const alvo = alvoLeituraPdf(pdf);
  const perc = alvo > 0 ? Math.round((Math.min(pdf.paginaAtual, alvo) / alvo) * 100) : 0;
  const concluido = pdf.paginaAtual >= alvo;
  const eta = fmtEta(alvo - pdf.paginaAtual, pagPorHora);

  const commitPagina = () => {
    const n = parseInt(paginaInput);
    if (!Number.isFinite(n)) { setPaginaInput(String(pdf.paginaAtual)); return; }
    const clamp = Math.max(0, Math.min(n, pdf.totalPaginas));
    setPaginaInput(String(clamp));
    if (clamp !== pdf.paginaAtual) onAtualizarPagina(clamp);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-foreground dark:text-foreground">{pdf.nome}</span>
            {concluido && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> concluído
              </span>
            )}
          </div>
          {(pdf.topicos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pdf.topicos!.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground max-w-[240px] truncate" title={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {temArquivo ? (
            <button
              type="button"
              onClick={onLer}
              disabled={carregando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
              {carregando ? "Abrindo…" : "Ler PDF"}
            </button>
          ) : (
            <>
              <input
                ref={anexoRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAnexar(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => anexoRef.current?.click()}
                disabled={enviando}
                title="O arquivo ainda não foi enviado — anexe o PDF pra ler aqui dentro (fica salvo na nuvem)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                {enviando ? "Enviando…" : "Anexar"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onEditar}
            title="Editar PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onExcluir}
            title="Excluir PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div className="flex-1">
          <div className="relative bg-muted dark:bg-muted rounded-full h-2 overflow-hidden">
            {concluido ? (
              <div className="absolute inset-0 bg-emerald-500 rounded-full" />
            ) : (
              <>
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-teal-600 rounded-full" />
                <div
                  className="absolute inset-y-0 right-0 bg-muted dark:bg-muted transition-all duration-500"
                  style={{ width: `${100 - perc}%` }}
                />
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap w-24 text-right">
          {Math.min(pdf.paginaAtual, alvo)}/{alvo} pág · {perc}%
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <label className="text-[11px] text-muted-foreground">Parei na pág.</label>
        <input
          type="number"
          min={0}
          max={pdf.totalPaginas}
          value={paginaInput}
          onChange={(e) => setPaginaInput(e.target.value)}
          onBlur={commitPagina}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-20 text-xs border border-border dark:border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:border-primary"
        />
        {!concluido && (
          <button
            type="button"
            onClick={onConcluir}
            className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            Concluí a leitura
          </button>
        )}
        {eta && !concluido && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" /> ~{eta} restantes
          </span>
        )}
      </div>
    </div>
  );
}
