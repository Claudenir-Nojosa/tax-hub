"use client";

import { useState } from "react";
import { ChevronDown, FileUp, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Alternativa } from "@/lib/estudo-data";
import { alinharGabarito, novaParteSimulado, novoIdSimulado, type ParteSimulado, type SimuladoConcurso } from "@/lib/simulados-data";
import GabaritoInput from "./GabaritoInput";

// Cadastro/edição de um simulado curricular: metadados + gabarito oficial por parte. O PDF é POR
// PARTE (não um arquivo único do simulado inteiro) — casos reais têm um PDF pra Conhecimentos
// Gerais e outro totalmente separado pra Conhecimentos Específicos, então cada parte tem seu
// próprio dropzone (dentro da seção expandida dela, junto do gabarito).
export default function FormSimulado({
  simuladoParaEditar, onSalvar, onFechar,
}: {
  simuladoParaEditar?: SimuladoConcurso;
  onSalvar: (
    dados: { id: string; nome: string; orgao?: string; banca?: string; ano?: number; partes: ParteSimulado[] },
    arquivosPorParte: Record<string, File>
  ) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(simuladoParaEditar?.nome ?? "");
  const [orgao, setOrgao] = useState(simuladoParaEditar?.orgao ?? "");
  const [banca, setBanca] = useState(simuladoParaEditar?.banca ?? "");
  const [ano, setAno] = useState(simuladoParaEditar?.ano ? String(simuladoParaEditar.ano) : "");
  const [partes, setPartes] = useState<ParteSimulado[]>(
    simuladoParaEditar?.partes && simuladoParaEditar.partes.length > 0
      ? simuladoParaEditar.partes
      : [novaParteSimulado("Conhecimentos Gerais"), novaParteSimulado("Conhecimentos Específicos")]
  );
  const [parteAberta, setParteAberta] = useState<string | null>(partes[0]?.id ?? null);
  const [arquivosPorParte, setArquivosPorParte] = useState<Record<string, File>>({});
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() !== "";

  const atualizarParte = (parteId: string, patch: Partial<ParteSimulado>) => {
    setPartes((prev) =>
      prev.map((p) => {
        if (p.id !== parteId) return p;
        const atualizada = { ...p, ...patch };
        return patch.numeroQuestoes !== undefined ? { ...atualizada, gabarito: alinharGabarito(atualizada) } : atualizada;
      })
    );
  };

  const marcarGabarito = (parteId: string, numero: number, alternativa: Alternativa | null) => {
    setPartes((prev) =>
      prev.map((p) =>
        p.id === parteId
          ? { ...p, gabarito: p.gabarito.map((g) => (g.numero === numero ? { ...g, alternativaCorreta: alternativa } : g)) }
          : p
      )
    );
  };

  const salvar = async () => {
    if (!podeSalvar || enviando) return;
    setEnviando(true);
    try {
      const anoNum = parseInt(ano);
      await onSalvar(
        {
          id: simuladoParaEditar?.id ?? novoIdSimulado(),
          nome: nome.trim(),
          orgao: orgao.trim() || undefined,
          banca: banca.trim() || undefined,
          ano: Number.isFinite(anoNum) ? anoNum : undefined,
          partes,
        },
        arquivosPorParte
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {simuladoParaEditar ? "Editar simulado" : "Novo simulado"}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_90px] gap-3 mb-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: SEFAZ-CE 2021 — Auditor Fiscal"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Órgão</label>
          <input
            type="text"
            value={orgao}
            onChange={(e) => setOrgao(e.target.value)}
            placeholder="Ex.: SEFAZ-CE"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Banca</label>
          <input
            type="text"
            value={banca}
            onChange={(e) => setBanca(e.target.value)}
            placeholder="Ex.: FGV"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Ano</label>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder="2026"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Partes da prova (ex.: conhecimentos gerais / específicos) — cada uma com o próprio PDF</span>
          <button
            type="button"
            onClick={() => {
              const nova = novaParteSimulado(`Parte ${partes.length + 1}`);
              setPartes((prev) => [...prev, nova]);
              setParteAberta(nova.id);
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Adicionar parte
          </button>
        </div>
        {partes.map((parte) => {
          const aberta = parteAberta === parte.id;
          const arquivo = arquivosPorParte[parte.id];
          return (
            <div key={parte.id} className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setParteAberta(aberta ? null : parte.id)}
                  className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
                >
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${aberta ? "rotate-180" : ""}`} />
                  <input
                    type="text"
                    value={parte.nome}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => atualizarParte(parte.id, { nome: e.target.value })}
                    className="flex-1 min-w-0 text-xs font-medium bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-primary"
                  />
                </button>
                {(arquivo || parte.arquivoEnviado) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex-shrink-0">
                    PDF ✓
                  </span>
                )}
                <label className="text-[10px] text-muted-foreground flex-shrink-0">Questões</label>
                <input
                  type="number"
                  min={0}
                  value={parte.numeroQuestoes}
                  onChange={(e) => atualizarParte(parte.id, { numeroQuestoes: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary flex-shrink-0"
                />
                <label className="text-[10px] text-muted-foreground flex-shrink-0">Min.</label>
                <input
                  type="number"
                  min={0}
                  value={parte.tempoMinutos}
                  onChange={(e) => atualizarParte(parte.id, { tempoMinutos: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-16 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary flex-shrink-0"
                />
                {partes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPartes((prev) => prev.filter((p) => p.id !== parte.id));
                      setArquivosPorParte((prev) => { const n = { ...prev }; delete n[parte.id]; return n; });
                      if (parteAberta === parte.id) setParteAberta(null);
                    }}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {aberta && (
                <div className="p-3 space-y-3">
                  <label className={`block w-full rounded-xl border-2 border-dashed px-4 py-3 text-center transition-colors cursor-pointer ${
                    arquivo || parte.arquivoEnviado
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-primary/30 hover:border-primary bg-primary/5"
                  }`}>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setArquivosPorParte((prev) => ({ ...prev, [parte.id]: f }));
                        e.target.value = "";
                      }}
                    />
                    <FileUp className={`h-4 w-4 mx-auto mb-1 ${arquivo ? "text-emerald-500" : "text-primary/60"}`} />
                    <div className="text-xs font-medium text-foreground">
                      {arquivo
                        ? `✓ ${arquivo.name} (${(arquivo.size / 1024 / 1024).toFixed(1)} MB)`
                        : parte.arquivoEnviado
                        ? "Anexar/substituir o PDF desta parte (opcional)"
                        : `Clique pra anexar o PDF de "${parte.nome || "esta parte"}"`}
                    </div>
                  </label>
                  <GabaritoInput gabarito={parte.gabarito} onChange={(numero, alt) => marcarGabarito(parte.id, numero, alt)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={!podeSalvar || enviando}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-wait"
      >
        {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {enviando ? "Salvando…" : simuladoParaEditar ? "Salvar alterações" : "Adicionar simulado"}
      </button>
    </div>
  );
}
