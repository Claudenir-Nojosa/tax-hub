"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Upload, Loader2, Trash2, ChevronDown, Sparkles, BookOpen, X } from "lucide-react";
import { MATERIAS, type MateriaBase } from "@/lib/estudo-data";

interface Resumo {
  id: string;
  materia: string;
  topico: string;
  titulo: string;
  arquivoNome: string;
  conteudo: string;
  createdAt: string;
}

interface Props {
  materiasConcurso?: MateriaBase[];
}

// ─── Renderizador markdown leve (headers, bold, itálico, listas) ─────────────
// Deliberadamente sem dependência nova: o output da IA usa um subconjunto pequeno de markdown.
function inline(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  // **negrito** e *itálico*
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const bruto = m[0];
    if (bruto.startsWith("**")) {
      partes.push(<strong key={key++} className="font-semibold text-gray-900 dark:text-white">{bruto.slice(2, -2)}</strong>);
    } else {
      partes.push(<em key={key++} className="text-gray-600 dark:text-gray-300">{bruto.slice(1, -1)}</em>);
    }
    ultimo = m.index + bruto.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

function MarkdownLeve({ conteudo }: { conteudo: string }) {
  const linhas = conteudo.split(/\r?\n/);
  const blocos: React.ReactNode[] = [];
  let key = 0;
  for (const linha of linhas) {
    const t = linha.trim();
    if (!t) continue;
    if (t.startsWith("### ")) {
      blocos.push(<h4 key={key++} className="text-sm font-bold text-gray-900 dark:text-white mt-4 mb-1.5">{inline(t.slice(4))}</h4>);
    } else if (t.startsWith("## ")) {
      blocos.push(
        <h3 key={key++} className="text-base font-bold text-gray-900 dark:text-white mt-5 mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">
          {inline(t.slice(3))}
        </h3>
      );
    } else if (t.startsWith("# ")) {
      blocos.push(<h3 key={key++} className="text-base font-bold text-gray-900 dark:text-white mt-5 mb-2">{inline(t.slice(2))}</h3>);
    } else if (/^[-*•] /.test(t)) {
      blocos.push(
        <div key={key++} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-1 mb-1">
          <span className="text-blue-400 flex-shrink-0">•</span>
          <span>{inline(t.slice(2))}</span>
        </div>
      );
    } else if (/^\d+[.)] /.test(t)) {
      const num = t.match(/^(\d+)[.)] /)![1];
      blocos.push(
        <div key={key++} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-1 mb-1">
          <span className="text-blue-400 flex-shrink-0 font-semibold">{num}.</span>
          <span>{inline(t.replace(/^\d+[.)] /, ""))}</span>
        </div>
      );
    } else if (t.startsWith("> ")) {
      blocos.push(
        <p key={key++} className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-blue-300 pl-3 my-1.5 italic">{inline(t.slice(2))}</p>
      );
    } else {
      blocos.push(<p key={key++} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-1.5">{inline(t)}</p>);
    }
  }
  return <div>{blocos}</div>;
}

export default function ResumosTab({ materiasConcurso }: Props) {
  const MATERIAS_ATIVAS: MateriaBase[] = materiasConcurso ?? MATERIAS;

  const [resumos, setResumos] = useState<Resumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null); // id do resumo expandido

  // form
  const [materia, setMateria] = useState("");
  const [topico, setTopico] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/estudo/resumos");
      if (res.ok) setResumos(await res.json());
    } catch {
      // silent
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleGerar = async () => {
    if (!arquivo || !materia) return;
    setGerando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("file", arquivo, arquivo.name);
      form.append("materia", materia);
      if (topico) form.append("topico", topico);
      const res = await fetch("/api/estudo/resumos", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar resumo");
      setResumos((prev) => [data as Resumo, ...prev]);
      setAberto((data as Resumo).id);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar resumo");
    } finally {
      setGerando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await fetch(`/api/estudo/resumos?id=${id}`, { method: "DELETE" });
      setResumos((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silent
    }
  };

  const topicoOptions = materia ? MATERIAS_ATIVAS.find((m) => m.nome === materia)?.topicos ?? [] : [];

  // agrupa por matéria mantendo a ordem das matérias do concurso
  const materiasComResumo = MATERIAS_ATIVAS.map((m) => m.nome).filter((nome) => resumos.some((r) => r.materia === nome));
  const foraDaLista = [...new Set(resumos.map((r) => r.materia))].filter((m) => !materiasComResumo.includes(m));

  return (
    <div className="space-y-6">
      {/* Gerador */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          Gerar resumo com IA
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Suba um PDF do material: a IA extrai o que mais cai em prova, as pegadinhas clássicas e explica os conceitos
          com analogias do cotidiano. O resumo fica salvo na matéria/tópico escolhidos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <select
            value={materia}
            onChange={(e) => { setMateria(e.target.value); setTopico(""); }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Matéria *</option>
            {MATERIAS_ATIVAS.map((m) => (
              <option key={m.nome} value={m.nome}>{m.nome}</option>
            ))}
          </select>
          <select
            value={topico}
            onChange={(e) => setTopico(e.target.value)}
            disabled={!materia}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            <option value="">Tópico (opcional)</option>
            {topicoOptions.map((t) => (
              <option key={t} value={t}>{t.length > 70 ? t.slice(0, 70) + "…" : t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed text-sm transition-colors ${
              arquivo
                ? "border-violet-300 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-violet-300"
            }`}
          >
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{arquivo ? arquivo.name : "Escolher PDF do material"}</span>
            {arquivo && (
              <X
                className="h-4 w-4 flex-shrink-0 hover:text-red-500"
                onClick={(e) => { e.stopPropagation(); setArquivo(null); if (inputRef.current) inputRef.current.value = ""; }}
              />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={handleGerar}
            disabled={!arquivo || !materia || gerando}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Resumindo…</> : <><Sparkles className="h-4 w-4" /> Gerar resumo</>}
          </button>
        </div>
        {gerando && (
          <p className="mt-2 text-xs text-violet-500 dark:text-violet-400 text-center">
            Lendo o PDF e destilando o que importa — pode levar até 1 minuto…
          </p>
        )}
        {erro && <p className="mt-2 text-xs text-red-500 text-center">{erro}</p>}
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : resumos.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum resumo ainda — suba o primeiro PDF acima.
        </div>
      ) : (
        [...materiasComResumo, ...foraDaLista].map((nomeMateria) => (
          <div key={nomeMateria}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {nomeMateria}
              <span className="text-xs font-normal text-gray-400">
                · {resumos.filter((r) => r.materia === nomeMateria).length} resumo(s)
              </span>
            </h3>
            <div className="space-y-2">
              {resumos
                .filter((r) => r.materia === nomeMateria)
                .map((r) => {
                  const expandido = aberto === r.id;
                  return (
                    <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setAberto(expandido ? null : r.id)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0 group"
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300 ${expandido ? "" : "-rotate-90"}`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.titulo}</div>
                            <div className="text-xs text-gray-400 truncate">
                              {r.topico ? `${r.topico} · ` : ""}
                              {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(r.id)}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                          title="Excluir resumo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {expandido && (
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <MarkdownLeve conteudo={r.conteudo} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
