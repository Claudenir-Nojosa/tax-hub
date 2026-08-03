"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import type { CapituloPdf, MateriaConcurso, MateriaDef, PdfEstudo } from "@/lib/estudo-data";
import { obterArquivoPdf } from "@/lib/pdf-storage";
import { extrairTextoIndice } from "./biblioteca-utils";

// Sugestão de CAPÍTULOS por IA em LOTE, pra vários PDFs de uma vez — mesma rota
// /api/ai/pdf-capitulos usada no botão "Sugerir com IA" do PainelCapitulos.tsx (dentro do
// leitor, onde o resultado saiu 100% correto), só que rodada sequencialmente pra cada PDF com
// tópico marcado que ainda não tem nenhum capítulo. Nunca aplica sozinho: sempre passa por uma
// tela de revisão (editável, com checkbox por linha) antes de qualquer coisa ser gravada — mesma
// filosofia do fluxo de um PDF só. O fim de cada capítulo continua sempre derivado
// automaticamente (a página anterior ao início do próximo) — não pedimos fim aqui, mesma regra
// que já funcionou no leitor.

interface Props {
  pdfs: PdfEstudo[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  // quando informado, restringe a sugestão em lote aos PDFs dessa matéria só — mesmo fluxo,
  // mesmo componente, só muda o filtro inicial (botão "Sugerir com IA" no cabeçalho de cada
  // matéria na Biblioteca, ao lado do "Sugerir capítulos (IA)" geral que continua cobrindo tudo)
  materiaFiltro?: string;
  onAplicar: (patches: { id: string; capitulos: CapituloPdf[] }[]) => void;
  onFechar: () => void;
}

interface LinhaRevisao {
  key: string; // `${pdfId}::${index}` — nome pode se repetir entre PDFs diferentes, então não serve de chave sozinho
  pdfId: string;
  pdfNome: string;
  materia: string;
  nome: string;
  inicio: string;
  incluir: boolean;
}

type StatusPdf = "processando" | "feito" | "erro";

export default function SugestaoLoteModal({ pdfs, materiaFiltro, onAplicar, onFechar }: Props) {
  // só entram PDFs com tópico marcado que AINDA não têm nenhum capítulo — não reprocessa (nem
  // arrisca sobrescrever) o que já foi cadastrado/revisado antes. Com materiaFiltro, restringe
  // ANTES disso aos PDFs daquela matéria só.
  const [alvos] = useState(() =>
    pdfs
      .filter((p) => !materiaFiltro || p.materia === materiaFiltro)
      .filter((p) => (p.topicos?.length ?? 0) > 0 && (p.capitulos?.length ?? 0) === 0)
  );

  const [fase, setFase] = useState<"resumo" | "processando" | "revisao">("resumo");
  const [status, setStatus] = useState<Record<string, StatusPdf>>({});
  const [concluidos, setConcluidos] = useState(0);
  // mensagem REAL do erro por PDF (nunca um texto genérico chutado) — timeout, rate limit da IA,
  // arquivo ausente no Storage etc.
  const [erros, setErros] = useState<Record<string, string>>({});
  // PDFs processados com sucesso mas onde a IA não achou nenhum índice reconhecível — não é erro
  // (a chamada funcionou), só não sobrou capítulo pra sugerir; precisa de cadastro manual
  const [semIndice, setSemIndice] = useState<string[]>([]);
  const [mostrarDetalheErros, setMostrarDetalheErros] = useState(false);
  const [linhas, setLinhas] = useState<LinhaRevisao[]>([]);

  const iniciar = async () => {
    if (alvos.length === 0) return;
    setFase("processando");
    const todasLinhas: LinhaRevisao[] = [];
    const novosErros: Record<string, string> = {};
    const novosSemIndice: string[] = [];
    for (const pdf of alvos) {
      setStatus((s) => ({ ...s, [pdf.id]: "processando" }));
      try {
        const blob = pdf.arquivoEnviado ? await obterArquivoPdf(pdf.id) : null;
        if (!blob) throw new Error("arquivo não encontrado no Storage");

        // extração roda no NAVEGADOR — mandar o PDF inteiro pra rota estoura o limite de body de
        // uma function do Vercel (~4,5MB, deu 413 real num PDF de 138 páginas)
        const texto = await extrairTextoIndice(blob);
        if (texto.trim().length < 50) throw new Error("sem texto legível nas primeiras páginas (PDF escaneado?)");

        const res = await fetch("/api/ai/pdf-capitulos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          capitulos?: { nome: string; paginaInicio: number }[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);

        if (!data.capitulos || data.capitulos.length === 0) {
          novosSemIndice.push(pdf.id);
        } else {
          for (const c of data.capitulos) {
            todasLinhas.push({
              key: `${pdf.id}::${todasLinhas.length}`,
              pdfId: pdf.id,
              pdfNome: pdf.nome,
              materia: pdf.materia,
              nome: c.nome,
              inicio: String(c.paginaInicio),
              incluir: true,
            });
          }
        }
        setStatus((s) => ({ ...s, [pdf.id]: "feito" }));
      } catch (e) {
        novosErros[pdf.id] = e instanceof Error ? e.message : "erro desconhecido";
        setStatus((s) => ({ ...s, [pdf.id]: "erro" }));
      }
      setConcluidos((n) => n + 1);
    }
    // ordena por matéria/PDF, preservando a ordem de página dentro do PDF (já vem assim da IA)
    todasLinhas.sort((a, b) => a.materia.localeCompare(b.materia) || a.pdfNome.localeCompare(b.pdfNome));
    setErros(novosErros);
    setSemIndice(novosSemIndice);
    setLinhas(todasLinhas);
    setFase("revisao");
  };

  const atualizarLinha = (key: string, patch: Partial<LinhaRevisao>) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const selecionadas = linhas.filter((l) => {
    const inicio = parseInt(l.inicio);
    return l.incluir && l.nome.trim() !== "" && Number.isFinite(inicio) && inicio >= 1;
  });

  const aplicar = () => {
    if (selecionadas.length === 0) { onFechar(); return; }
    const porPdf = new Map<string, CapituloPdf[]>();
    for (const l of selecionadas) {
      const arr = porPdf.get(l.pdfId) ?? [];
      arr.push({ nome: l.nome.trim(), paginaInicio: parseInt(l.inicio) });
      porPdf.set(l.pdfId, arr);
    }
    onAplicar([...porPdf.entries()].map(([id, capitulos]) => ({ id, capitulos })));
    onFechar();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          {materiaFiltro ? `Sugerir capítulos — ${materiaFiltro}` : "Sugerir capítulos para todos os PDFs"}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {fase === "resumo" && (
        alvos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {materiaFiltro
              ? `Todos os PDFs de ${materiaFiltro} com tópico marcado já têm capítulos cadastrados — nada pra sugerir.`
              : "Todos os PDFs com tópico marcado já têm capítulos cadastrados — nada pra sugerir."}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {alvos.length} PDF{alvos.length !== 1 ? "s" : ""} com tópico marcado e ainda sem
              nenhum capítulo serão analisados (a IA lê só o índice de cada material — mesma
              sugestão que já funciona dentro do leitor). PDFs sem tópico marcado, ou que já têm
              capítulo cadastrado, são pulados. Pode demorar alguns minutos com muitos PDFs — nada
              é salvo até você revisar e confirmar no final.
            </p>
            <button
              type="button"
              onClick={iniciar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Iniciar análise de {alvos.length} PDF{alvos.length !== 1 ? "s" : ""}
            </button>
          </>
        )
      )}

      {fase === "processando" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
            <span className="text-xs text-foreground">
              Analisando {Math.min(concluidos + 1, alvos.length)} de {alvos.length}…
            </span>
          </div>
          <div className="bg-muted dark:bg-muted rounded-full h-2 mb-3">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${(concluidos / alvos.length) * 100}%` }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 -mr-1">
            {alvos.map((pdf) => (
              <div key={pdf.id} className="flex items-center gap-2 text-xs">
                {status[pdf.id] === "processando" && <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />}
                {status[pdf.id] === "feito" && <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                {status[pdf.id] === "erro" && <X className="h-3 w-3 text-red-500 flex-shrink-0" />}
                {!status[pdf.id] && <span className="h-3 w-3 flex-shrink-0" />}
                <span className="truncate text-muted-foreground" title={pdf.nome}>{pdf.nome}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {fase === "revisao" && (
        <>
          <div className="text-xs text-foreground mb-1">
            {linhas.length} capítulo{linhas.length !== 1 ? "s" : ""} sugerido{linhas.length !== 1 ? "s" : ""} — confira e desmarque o que não fizer sentido antes de aplicar. O fim de cada um é sempre calculado sozinho (a página anterior ao início do próximo).
          </div>
          {Object.keys(erros).length > 0 && (() => {
            const n = Object.keys(erros).length;
            return (
              <div className="mb-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMostrarDetalheErros((v) => !v)}
                  className="text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-2"
                >
                  {n} PDF{n !== 1 ? "s" : ""} não {n !== 1 ? "puderam" : "pôde"} ser analisado{n !== 1 ? "s" : ""} — {mostrarDetalheErros ? "ocultar" : "ver"} motivo de cada um
                </button>
                {mostrarDetalheErros && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto space-y-0.5 rounded-md bg-muted dark:bg-muted p-2">
                    {Object.entries(erros).map(([pdfId, msg]) => {
                      const nome = alvos.find((p) => p.id === pdfId)?.nome ?? pdfId;
                      return (
                        <div key={pdfId} className="flex gap-1.5 text-muted-foreground">
                          <span className="text-foreground truncate max-w-[45%]" title={nome}>{nome}</span>
                          <span className="flex-shrink-0">— {msg}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          {semIndice.length > 0 && (
            <div className="mb-3 text-[11px] text-amber-600 dark:text-amber-400">
              {semIndice.length} PDF{semIndice.length !== 1 ? "s" : ""} sem índice reconhecível pela IA (precisa cadastrar os capítulos na mão, dentro do leitor):
              <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5 rounded-md bg-muted dark:bg-muted p-2 text-muted-foreground">
                {semIndice.map((pdfId) => {
                  const nome = alvos.find((a) => a.id === pdfId)?.nome ?? pdfId;
                  return <div key={pdfId} className="truncate" title={nome}>{nome}</div>;
                })}
              </div>
            </div>
          )}
          {linhas.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">A IA não conseguiu identificar capítulos em nenhum dos PDFs analisados.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-1.5 mb-3 mt-2 pr-1 -mr-1">
                {linhas.map((l) => (
                  <div key={l.key} className="flex items-center gap-2 rounded-lg border border-border dark:border-border px-2.5 py-1.5">
                    <input
                      type="checkbox"
                      checked={l.incluir}
                      onChange={(e) => atualizarLinha(l.key, { incluir: e.target.checked })}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={l.nome}
                        onChange={(e) => atualizarLinha(l.key, { nome: e.target.value })}
                        className="w-full text-xs text-foreground bg-transparent focus:outline-none truncate"
                      />
                      <div className="text-[10px] text-muted-foreground truncate">{l.materia} · {l.pdfNome}</div>
                    </div>
                    <label className="text-[10px] text-muted-foreground flex-shrink-0">pág.</label>
                    <input
                      type="number"
                      min={1}
                      value={l.inicio}
                      onChange={(e) => atualizarLinha(l.key, { inicio: e.target.value })}
                      className="w-14 text-xs border border-border rounded-md px-1.5 py-1 bg-card text-foreground focus:outline-none focus:border-primary flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={aplicar}
                disabled={selecionadas.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
              >
                <Check className="h-3.5 w-3.5" /> Aplicar {selecionadas.length} capítulo{selecionadas.length !== 1 ? "s" : ""}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
