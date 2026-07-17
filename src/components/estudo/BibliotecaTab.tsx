"use client";

import { useMemo, useState } from "react";
import {
  BookOpen, CheckCircle2, ChevronDown, Clock, Library, Pencil, Plus, Trash2, X,
} from "lucide-react";
import {
  MATERIAS, calcularPagPorHora,
  type AtividadeCalendario, type MateriaConcurso, type MateriaDef, type PdfEstudo,
} from "@/lib/estudo-data";
import { resolverCorMateria, fmtHoras } from "./trilha/trilha-ui";

// Biblioteca de PDFs (ex.: aulas do Estratégia): cadastro por matéria/tópico com total de
// páginas e progresso "parei na pág. X" — % lido, barra e ETA calculada com o páginas/hora
// histórico do Timer (calcularPagPorHora). SÓ metadados: o arquivo nunca é enviado.
// Evoluções anotadas (fora do escopo v1): auto-incrementar paginaAtual ao salvar o Timer com
// matéria + páginas (ambíguo qual PDF); upload/armazenamento do arquivo em si.

interface Props {
  pdfs: PdfEstudo[];
  calendario: Record<string, AtividadeCalendario[]>;
  onChange: (pdfs: PdfEstudo[]) => void;
  materiasConcurso?: MateriaConcurso[];
}

function novoId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function fmtEta(paginasRestantes: number, pagPorHora: number | null): string | null {
  if (pagPorHora === null || pagPorHora <= 0 || paginasRestantes <= 0) return null;
  return fmtHoras(Math.round((paginasRestantes / pagPorHora) * 60));
}

export default function BibliotecaTab({ pdfs, calendario, onChange, materiasConcurso }: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<PdfEstudo | null>(null);

  const pagPorHora = useMemo(() => calcularPagPorHora(calendario), [calendario]);

  const totalPaginas = pdfs.reduce((s, p) => s + p.totalPaginas, 0);
  const paginasLidas = pdfs.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
  const percGeral = totalPaginas > 0 ? Math.round((paginasLidas / totalPaginas) * 100) : 0;
  const etaTotal = fmtEta(totalPaginas - paginasLidas, pagPorHora);

  // grupos por matéria, na ordem do edital (matérias fora da lista ativa vão pro fim)
  const grupos = useMemo(() => {
    const porMateria = new Map<string, PdfEstudo[]>();
    for (const p of pdfs) {
      const lista = porMateria.get(p.materia) ?? [];
      lista.push(p);
      porMateria.set(p.materia, lista);
    }
    const ordem = materiasAtivas.map((m) => m.nome);
    return [...porMateria.entries()]
      .sort((a, b) => {
        const ia = ordem.indexOf(a[0]);
        const ib = ordem.indexOf(b[0]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a[0].localeCompare(b[0]);
      })
      .map(([materia, lista]) => ({
        materia,
        // não concluídos primeiro; dentro de cada bloco, mexidos mais recentemente primeiro
        lista: [...lista].sort((a, b) => {
          const ca = a.paginaAtual >= a.totalPaginas ? 1 : 0;
          const cb = b.paginaAtual >= b.totalPaginas ? 1 : 0;
          if (ca !== cb) return ca - cb;
          return (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm);
        }),
      }));
  }, [pdfs, materiasAtivas]);

  const salvarPdf = (pdf: PdfEstudo) => {
    if (editando) {
      onChange(pdfs.map((p) => (p.id === pdf.id ? pdf : p)));
      setEditando(null);
      setFormAberto(false);
    } else {
      onChange([pdf, ...pdfs]);
      // form fica aberto com a matéria mantida (mesma lição das Cartas) — só fecha no X
    }
  };

  const atualizarPagina = (id: string, pagina: number) => {
    onChange(
      pdfs.map((p) =>
        p.id === id
          ? { ...p, paginaAtual: Math.max(0, Math.min(pagina, p.totalPaginas)), atualizadoEm: new Date().toISOString() }
          : p
      )
    );
  };

  const excluir = (p: PdfEstudo) => {
    if (!confirm(`Excluir "${p.nome}" da biblioteca? O progresso de leitura dele some.`)) return;
    onChange(pdfs.filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-4">
      {/* header com totais + ETA */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Library className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Biblioteca de PDFs</div>
              <div className="text-xs text-sky-100">
                {pdfs.length === 0
                  ? "Cadastre seus PDFs (Estratégia etc.) e acompanhe até onde leu em cada um."
                  : `${pdfs.length} PDF${pdfs.length !== 1 ? "s" : ""} · ${paginasLidas.toLocaleString("pt-BR")}/${totalPaginas.toLocaleString("pt-BR")} páginas lidas` +
                    (etaTotal
                      ? ` · faltam ~${etaTotal} de leitura no seu ritmo de ${Math.round(pagPorHora!)} pág/h`
                      : pagPorHora === null
                      ? " · registre sessões com páginas no Timer pra estimar o tempo restante"
                      : "")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditando(null); setFormAberto((v) => !v); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            {formAberto && !editando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formAberto && !editando ? "Fechar" : "Cadastrar PDF"}
          </button>
        </div>
        {pdfs.length > 0 && (
          <div className="mt-3">
            <div className="bg-sky-900/40 rounded-full h-2.5">
              <div className="bg-white rounded-full h-2.5 transition-all duration-500" style={{ width: `${percGeral}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-sky-100">
              <span>leitura geral</span>
              <span>{percGeral}%</span>
            </div>
          </div>
        )}
      </div>

      {(formAberto || editando) && (
        <FormPdf
          key={editando?.id ?? "novo"}
          materiasAtivas={materiasAtivas}
          pdfParaEditar={editando ?? undefined}
          onSalvar={salvarPdf}
          onFechar={() => { setEditando(null); setFormAberto(false); }}
        />
      )}

      {pdfs.length === 0 && !formAberto ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-3 text-sky-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhum PDF cadastrado ainda.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto mb-4">
            Cadastre as aulas em PDF que você estuda (nome, matéria e total de páginas) e marque até
            onde leu — a biblioteca mostra o % de cada uma e estima quanto tempo de leitura falta.
          </p>
          <button
            type="button"
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro PDF
          </button>
        </div>
      ) : (
        grupos.map(({ materia, lista }) => {
          const cor = resolverCorMateria(materia, materiasAtivas);
          const tot = lista.reduce((s, p) => s + p.totalPaginas, 0);
          const lidas = lista.reduce((s, p) => s + Math.min(p.paginaAtual, p.totalPaginas), 0);
          const perc = tot > 0 ? Math.round((lidas / tot) * 100) : 0;
          return (
            <div key={materia} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <span className={`w-2.5 h-2.5 rounded-full ${cor.dot}`} />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">{materia}</span>
                <span className="text-[11px] text-gray-400">
                  {lista.length} PDF{lista.length !== 1 ? "s" : ""} · {perc}% lido
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {lista.map((p) => (
                  <PdfRow
                    key={p.id}
                    pdf={p}
                    pagPorHora={pagPorHora}
                    onAtualizarPagina={(pag) => atualizarPagina(p.id, pag)}
                    onConcluir={() => atualizarPagina(p.id, p.totalPaginas)}
                    onEditar={() => { setEditando(p); setFormAberto(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    onExcluir={() => excluir(p)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Linha de PDF ────────────────────────────────────────────────────────────

function PdfRow({
  pdf, pagPorHora, onAtualizarPagina, onConcluir, onEditar, onExcluir,
}: {
  pdf: PdfEstudo;
  pagPorHora: number | null;
  onAtualizarPagina: (pagina: number) => void;
  onConcluir: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const [paginaInput, setPaginaInput] = useState(String(pdf.paginaAtual));
  const perc = pdf.totalPaginas > 0 ? Math.round((Math.min(pdf.paginaAtual, pdf.totalPaginas) / pdf.totalPaginas) * 100) : 0;
  const concluido = pdf.paginaAtual >= pdf.totalPaginas;
  const eta = fmtEta(pdf.totalPaginas - pdf.paginaAtual, pagPorHora);

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
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{pdf.nome}</span>
            {concluido && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> concluído
              </span>
            )}
          </div>
          {(pdf.topicos?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pdf.topicos!.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 max-w-[240px] truncate" title={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEditar}
            title="Editar PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onExcluir}
            title="Excluir PDF"
            className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all duration-500 ${concluido ? "bg-emerald-500" : "bg-sky-500"}`}
              style={{ width: `${perc}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap w-24 text-right">
          {Math.min(pdf.paginaAtual, pdf.totalPaginas)}/{pdf.totalPaginas} pág · {perc}%
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <label className="text-[11px] text-gray-400">Parei na pág.</label>
        <input
          type="number"
          min={0}
          max={pdf.totalPaginas}
          value={paginaInput}
          onChange={(e) => setPaginaInput(e.target.value)}
          onBlur={commitPagina}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-20 text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-sky-500"
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
          <span className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" /> ~{eta} restantes
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Form de cadastro/edição ─────────────────────────────────────────────────

function FormPdf({
  materiasAtivas, pdfParaEditar, onSalvar, onFechar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  pdfParaEditar?: PdfEstudo;
  onSalvar: (pdf: PdfEstudo) => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(pdfParaEditar?.nome ?? "");
  const [materia, setMateria] = useState(pdfParaEditar?.materia ?? materiasAtivas[0]?.nome ?? "");
  const [topicosSel, setTopicosSel] = useState<Set<string>>(new Set(pdfParaEditar?.topicos ?? []));
  const [totalPaginas, setTotalPaginas] = useState(pdfParaEditar ? String(pdfParaEditar.totalPaginas) : "");
  const [mostrarTopicos, setMostrarTopicos] = useState((pdfParaEditar?.topicos?.length ?? 0) > 0);
  const [salvasAgora, setSalvasAgora] = useState(0);
  const [flash, setFlash] = useState(false);

  const topicosDaMateria = materiasAtivas.find((m) => m.nome === materia)?.topicos ?? [];
  const paginasNum = parseInt(totalPaginas);
  const podeSalvar = nome.trim() !== "" && materia !== "" && Number.isFinite(paginasNum) && paginasNum >= 1;

  const salvar = () => {
    if (!podeSalvar) return;
    const topicos = [...topicosSel].filter((t) => topicosDaMateria.includes(t));
    if (pdfParaEditar) {
      onSalvar({
        ...pdfParaEditar,
        nome: nome.trim(),
        materia,
        topicos: topicos.length > 0 ? topicos : undefined,
        totalPaginas: paginasNum,
        paginaAtual: Math.min(pdfParaEditar.paginaAtual, paginasNum),
        atualizadoEm: new Date().toISOString(),
      });
    } else {
      onSalvar({
        id: novoId(),
        nome: nome.trim(),
        materia,
        topicos: topicos.length > 0 ? topicos : undefined,
        totalPaginas: paginasNum,
        paginaAtual: 0,
        criadoEm: new Date().toISOString(),
      });
      // matéria fica mantida pro próximo PDF (cadastro em sequência); limpa o resto
      setNome("");
      setTotalPaginas("");
      setTopicosSel(new Set());
      setSalvasAgora((n) => n + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 1800);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {pdfParaEditar ? "Editar PDF" : "Cadastrar PDF"}
        </h3>
        <button
          type="button"
          onClick={onFechar}
          className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_110px] gap-3 mb-3">
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Nome do PDF</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Aula 05 — ICMS: fato gerador"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Matéria</label>
          <select
            value={materia}
            onChange={(e) => { setMateria(e.target.value); setTopicosSel(new Set()); }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            {materiasAtivas.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Total de págs.</label>
          <input
            type="number"
            min={1}
            value={totalPaginas}
            onChange={(e) => setTotalPaginas(e.target.value)}
            placeholder="120"
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {topicosDaMateria.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setMostrarTopicos((v) => !v)}
            className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mostrarTopicos ? "rotate-180" : ""}`} />
            Tópicos do edital cobertos (opcional{topicosSel.size > 0 ? ` — ${topicosSel.size} marcado(s)` : ""})
          </button>
          {mostrarTopicos && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
              {topicosDaMateria.map((t) => {
                const sel = topicosSel.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTopicosSel((prev) => {
                        const nova = new Set(prev);
                        if (nova.has(t)) nova.delete(t);
                        else nova.add(t);
                        return nova;
                      })
                    }
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      sel ? "bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded border flex-shrink-0 ${sel ? "bg-sky-600 border-sky-600" : "border-gray-300 dark:border-gray-600"}`} />
                    <span className="leading-snug">{t}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={!podeSalvar}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pdfParaEditar ? "Salvar alterações" : salvasAgora > 0 ? "Cadastrar outro PDF" : "Cadastrar PDF"}
        </button>
        {!pdfParaEditar && (flash || salvasAgora > 0) && (
          <span className={`text-xs transition-opacity ${flash ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 opacity-70"}`}>
            {flash ? "✓ PDF adicionado! Matéria mantida pro próximo." : `${salvasAgora} PDF${salvasAgora !== 1 ? "s" : ""} cadastrado${salvasAgora !== 1 ? "s" : ""} agora.`}
          </span>
        )}
      </div>
    </div>
  );
}
