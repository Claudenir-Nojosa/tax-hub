"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import type { MateriaConcurso, MateriaDef, PdfEstudo } from "@/lib/estudo-data";
import { contarPaginasPdf, salvarArquivoPdf } from "@/lib/pdf-storage";
import { novoId } from "./biblioteca-utils";
import { sugerirTopico } from "./topico-matching";

// ─── Upload em lote: vários PDFs de uma vez, um tópico sugerido por arquivo ────────────────────
//
// Pensado pro caso comum de anexar uma pasta inteira de aulas do curso de uma vez (ex.: pasta
// "Auditoria Fiscal" com um PDF por aula) — cada arquivo já se chama (ou quase) como o tópico do
// edital que cobre, então em vez de abrir "Adicionar PDF" N vezes e marcar tópico toda vez, o
// usuário escolhe a matéria uma única vez e cada arquivo já chega com o tópico pré-marcado
// (sugerirTopico, biblioteca/topico-matching.ts). A sugestão é só um ponto de partida editável —
// nunca some a possibilidade de trocar/tirar o tópico de um item antes de confirmar.

interface ItemLote {
  chave: string; // só local, pra key do React — não é o id final do PdfEstudo
  arquivo: File;
  nome: string;
  topico: string; // "" = nenhum tópico selecionado
  totalPaginas: string;
  contandoPaginas: boolean;
}

export default function FormPdfLote({
  materiasAtivas, presetMateria, onSalvarLote, onFechar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  presetMateria?: string;
  // recebe TODOS os registros prontos de uma vez (upload já feito) -- nunca chama isso uma vez
  // por arquivo: se a tela pai atualizasse o estado a cada chamada, cada `onChange` fecharia
  // sobre a MESMA lista antiga de PDFs capturada no início do lote (closure obsoleta), e só a
  // última chamada da sequência "venceria" -- os demais arquivos sumiriam da biblioteca apesar
  // do upload ter funcionado. Uma chamada só, com o lote inteiro, evita esse risco de vez.
  onSalvarLote: (registros: PdfEstudo[]) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [materia, setMateria] = useState(presetMateria ?? materiasAtivas[0]?.nome ?? "");
  const [itens, setItens] = useState<ItemLote[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [concluidos, setConcluidos] = useState(0);

  const topicosDaMateria = materiasAtivas.find((m) => m.nome === materia)?.topicos ?? [];
  const contandoAlgum = itens.some((i) => i.contandoPaginas);
  const podeSalvar = itens.length > 0 && !contandoAlgum && itens.every((i) => {
    const n = parseInt(i.totalPaginas);
    return i.nome.trim() !== "" && Number.isFinite(n) && n >= 1;
  });

  const adicionarArquivos = (arquivos: FileList) => {
    const novosItens: ItemLote[] = Array.from(arquivos)
      .filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name))
      .map((arquivo) => ({
        chave: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        arquivo,
        nome: arquivo.name.replace(/\.pdf$/i, ""),
        topico: sugerirTopico(arquivo.name, topicosDaMateria) ?? "",
        totalPaginas: "",
        contandoPaginas: true,
      }));
    setItens((prev) => [...prev, ...novosItens]);
    // conta páginas de cada arquivo em paralelo — cada um atualiza só a própria linha ao terminar
    for (const item of novosItens) {
      contarPaginasPdf(item.arquivo).then((paginas) => {
        setItens((prev) =>
          prev.map((i) =>
            i.chave === item.chave
              ? { ...i, totalPaginas: paginas !== null ? String(paginas) : i.totalPaginas, contandoPaginas: false }
              : i
          )
        );
      });
    }
  };

  const atualizarItem = (chave: string, patch: Partial<ItemLote>) => {
    setItens((prev) => prev.map((i) => (i.chave === chave ? { ...i, ...patch } : i)));
  };

  const removerItem = (chave: string) => {
    setItens((prev) => prev.filter((i) => i.chave !== chave));
  };

  const enviarTudo = async () => {
    if (!podeSalvar || enviando) return;
    setEnviando(true);
    setConcluidos(0);
    try {
      const registros: PdfEstudo[] = [];
      for (const item of itens) {
        const pdf: PdfEstudo = {
          id: novoId(),
          nome: item.nome.trim(),
          materia,
          topicos: item.topico ? [item.topico] : undefined,
          totalPaginas: parseInt(item.totalPaginas),
          paginaAtual: 0,
          criadoEm: new Date().toISOString(),
        };
        try {
          await salvarArquivoPdf(pdf.id, item.arquivo);
          registros.push({ ...pdf, arquivoEnviado: true });
        } catch {
          // segue sem o arquivo -- mesma política do FormPdf single (cadastra os dados, o
          // usuário reanexa depois pelo botão "Anexar" na linha do PDF)
          registros.push(pdf);
        }
        setConcluidos((n) => n + 1);
      }
      await onSalvarLote(registros);
      onFechar();
    } finally {
      setEnviando(false);
    }
  };

  const semTopicoCount = itens.filter((i) => i.topico === "").length;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Adicionar vários PDFs</h3>
        <button
          type="button"
          onClick={onFechar}
          disabled={enviando}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-accent transition-colors disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">Matéria (vale pra todos os arquivos)</label>
        <select
          value={materia}
          onChange={(e) => {
            const novaMateria = e.target.value;
            setMateria(novaMateria);
            const topicosNovaMateria = materiasAtivas.find((m) => m.nome === novaMateria)?.topicos ?? [];
            // reavalia a sugestão de tópico de cada item já na lista pra nova matéria
            setItens((prev) =>
              prev.map((i) => ({ ...i, topico: sugerirTopico(i.arquivo.name, topicosNovaMateria) ?? "" }))
            );
          }}
          disabled={enviando}
          className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
        >
          {materiasAtivas.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
        </select>
      </div>

      <label
        className={`flex flex-col items-center justify-center w-full mb-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
          enviando ? "opacity-50 cursor-not-allowed" : "border-primary/30 hover:border-primary bg-primary/5"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={enviando}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <FileUp className="h-5 w-5 mb-1 text-primary/60" />
        <div className="text-xs font-medium text-foreground">
          {itens.length > 0 ? `${itens.length} arquivo${itens.length !== 1 ? "s" : ""} selecionado${itens.length !== 1 ? "s" : ""} — clique pra adicionar mais` : "Clique e selecione vários PDFs de uma vez"}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          O tópico é sugerido automaticamente pelo nome do arquivo — confira antes de enviar
        </div>
      </label>

      {itens.length > 0 && (
        <>
          {semTopicoCount > 0 && (
            <div className="mb-2 text-[11px] text-amber-600 dark:text-amber-400">
              {semTopicoCount} arquivo{semTopicoCount !== 1 ? "s" : ""} sem tópico detectado — selecione manualmente (opcional, mas ajuda a organizar a biblioteca).
            </div>
          )}
          <div className="mb-3 max-h-80 overflow-y-auto rounded-lg border border-border dark:border-border divide-y divide-border/50">
            {itens.map((item) => (
              <div key={item.chave} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => removerItem(item.chave)}
                  disabled={enviando}
                  className="h-6 w-6 flex-shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title="Remover da lista"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  value={item.nome}
                  onChange={(e) => atualizarItem(item.chave, { nome: e.target.value })}
                  disabled={enviando}
                  className="flex-1 min-w-0 text-xs border border-border dark:border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                />
                <select
                  value={item.topico}
                  onChange={(e) => atualizarItem(item.chave, { topico: e.target.value })}
                  disabled={enviando}
                  className={`w-[220px] flex-shrink-0 text-xs border rounded-lg px-2 py-1.5 bg-card focus:outline-none focus:border-primary disabled:opacity-60 ${
                    item.topico ? "border-emerald-300 dark:border-emerald-700 text-foreground" : "border-border dark:border-border text-muted-foreground"
                  }`}
                >
                  <option value="">— nenhum tópico —</option>
                  {topicosDaMateria.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="w-16 flex-shrink-0 text-right text-xs text-muted-foreground">
                  {item.contandoPaginas ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline-block" />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={item.totalPaginas}
                      onChange={(e) => atualizarItem(item.chave, { totalPaginas: e.target.value })}
                      disabled={enviando}
                      placeholder="págs."
                      className="w-16 text-xs border border-border dark:border-border rounded-lg px-1.5 py-1.5 bg-card text-foreground text-right focus:outline-none focus:border-primary disabled:opacity-60"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enviarTudo}
          disabled={!podeSalvar || enviando}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-wait"
        >
          {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enviando
            ? `Enviando ${Math.min(concluidos + 1, itens.length)} de ${itens.length}...`
            : `Adicionar ${itens.length > 0 ? itens.length : ""} PDF${itens.length !== 1 ? "s" : ""}`.trim()}
        </button>
        {enviando && (
          <span className="text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 inline-block mr-1 text-emerald-500" />
            {concluidos} de {itens.length} enviados
          </span>
        )}
      </div>
    </div>
  );
}
