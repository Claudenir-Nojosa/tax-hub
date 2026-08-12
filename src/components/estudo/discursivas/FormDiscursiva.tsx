"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { MateriaConcurso, MateriaDef } from "@/lib/estudo-data";
import { novoIdDiscursiva, type DiscursivaTema } from "@/lib/discursivas-data";

export default function FormDiscursiva({
  materiasAtivas, temaParaEditar, onSalvar, onFechar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  temaParaEditar?: DiscursivaTema;
  onSalvar: (dados: { id: string; materia?: string; tema: string; orientacoes?: string; pontosChave?: string[] }) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [materia, setMateria] = useState(temaParaEditar?.materia ?? "");
  const [tema, setTema] = useState(temaParaEditar?.tema ?? "");
  const [orientacoes, setOrientacoes] = useState(temaParaEditar?.orientacoes ?? "");
  const [pontosChave, setPontosChave] = useState<string[]>(temaParaEditar?.pontosChave ?? []);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = tema.trim() !== "";

  const salvar = async () => {
    if (!podeSalvar || enviando) return;
    setEnviando(true);
    try {
      await onSalvar({
        id: temaParaEditar?.id ?? novoIdDiscursiva(),
        materia: materia.trim() || undefined,
        tema: tema.trim(),
        orientacoes: orientacoes.trim() || undefined,
        pontosChave: pontosChave.map((p) => p.trim()).filter(Boolean),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{temaParaEditar ? "Editar tema" : "Novo tema de discursiva"}</h3>
        <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 mb-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Matéria (opcional)</label>
          <select
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">— Tema geral —</option>
            {materiasAtivas.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Tema</label>
          <input
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ex.: Disserte sobre os limites constitucionais ao poder de tributar"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Orientações da questão (opcional)</label>
        <textarea
          value={orientacoes}
          onChange={(e) => setOrientacoes(e.target.value)}
          placeholder="Ex.: Aborde ao menos 3 princípios, com exemplos práticos. Máximo 30 linhas."
          rows={3}
          className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y"
        />
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
          Pontos-chave esperados na resposta (opcional) — ajuda a IA a corrigir com mais precisão
        </label>
        <div className="space-y-1.5 mb-1.5">
          {pontosChave.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={p}
                onChange={(e) => setPontosChave((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))}
                placeholder={`Ponto-chave ${i + 1}`}
                className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setPontosChave((prev) => prev.filter((_, xi) => xi !== i))}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPontosChave((prev) => [...prev, ""])}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="h-3 w-3" /> Adicionar ponto-chave
        </button>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={!podeSalvar || enviando}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-wait"
      >
        {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {enviando ? "Salvando…" : temaParaEditar ? "Salvar alterações" : "Adicionar tema"}
      </button>
    </div>
  );
}
