"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle, Circle, X, BookOpen, Filter, NotebookPen, PartyPopper } from "lucide-react";
import { MATERIAS, type ErroEntry, type TopicoState } from "@/lib/estudo-data";

interface Props {
  erros: ErroEntry[];
  topicos: Record<string, TopicoState>;
  onUpdate: (erros: ErroEntry[]) => void;
}

const INITIAL_FORM = {
  materia: "",
  topico: "",
  questao: "",
};

export default function CadernoErrosTab({ erros, topicos, onUpdate }: Props) {
  const [filtroMateria, setFiltroMateria] = useState("");
  const [filtroRevisado, setFiltroRevisado] = useState<"todos" | "pendentes" | "revisados">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [erroForm, setErroForm] = useState("");

  const materiaOptions = MATERIAS.map((m) => m.nome);
  const topicoOptions = form.materia
    ? MATERIAS.find((m) => m.nome === form.materia)?.topicos ?? []
    : [];

  const toggleRevisado = (id: string) => {
    onUpdate(erros.map((e) => (e.id === id ? { ...e, revisado: !e.revisado } : e)));
  };

  const deleteErro = (id: string) => {
    onUpdate(erros.filter((e) => e.id !== id));
  };

  const addErro = () => {
    if (!form.materia || !form.questao.trim()) {
      setErroForm("Matéria e questão são obrigatórios.");
      return;
    }
    const novo: ErroEntry = {
      id: Date.now().toString(),
      materia: form.materia,
      topico: form.topico,
      questao: form.questao.trim(),
      revisado: false,
      data: new Date().toISOString().split("T")[0],
    };
    onUpdate([...erros, novo]);
    setForm(INITIAL_FORM);
    setErroForm("");
    setModalOpen(false);
  };

  const errosFiltrados = erros
    .filter((e) => filtroMateria === "" || e.materia === filtroMateria)
    .filter((e) => {
      if (filtroRevisado === "pendentes") return !e.revisado;
      if (filtroRevisado === "revisados") return e.revisado;
      return true;
    })
    .sort((a, b) => b.data.localeCompare(a.data));

  const pendentes = erros.filter((e) => !e.revisado).length;
  const revisados = erros.filter((e) => e.revisado).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{pendentes}</div>
            <div className="text-xs text-red-500 dark:text-red-400">Pendentes</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2.5 text-center">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{revisados}</div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400">Revisados</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-center">
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{erros.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setForm(INITIAL_FORM); setErroForm(""); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Registrar Erro
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <select
          value={filtroMateria}
          onChange={(e) => setFiltroMateria(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as matérias</option>
          {materiaOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {(["todos", "pendentes", "revisados"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltroRevisado(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                filtroRevisado === v
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de erros */}
      {errosFiltrados.length === 0 ? (
        <div className="text-center py-16">
          {erros.length === 0 ? (
            <>
              <PartyPopper className="h-10 w-10 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum erro registrado ainda. Ótimo trabalho!</p>
            </>
          ) : (
            <>
              <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum erro encontrado com os filtros atuais.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {errosFiltrados.map((erro) => {
            const materia = MATERIAS.find((m) => m.nome === erro.materia);
            return (
              <div
                key={erro.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all ${
                  erro.revisado
                    ? "border-emerald-200 dark:border-emerald-800 opacity-75"
                    : "border-red-200 dark:border-red-800"
                }`}
              >
                <div className={`flex items-start gap-3 p-4 border-l-4 ${materia?.corBorder ?? "border-l-gray-400"}`}>
                  <button
                    type="button"
                    onClick={() => toggleRevisado(erro.id)}
                    className={`flex-shrink-0 mt-0.5 transition-colors ${
                      erro.revisado ? "text-emerald-500" : "text-gray-300 dark:text-gray-600 hover:text-emerald-400"
                    }`}
                    title={erro.revisado ? "Marcar como pendente" : "Marcar como revisado"}
                  >
                    {erro.revisado ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {materia && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${materia.corBadge}`}>
                          {erro.materia}
                        </span>
                      )}
                      {erro.topico && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {erro.topico}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{erro.data}</span>
                    </div>

                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                      {erro.questao}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteErro(erro.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal adicionar erro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-blue-500" />
                Registrar Erro
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Matéria *</label>
                  <select
                    value={form.materia}
                    onChange={(e) => setForm({ ...form, materia: e.target.value, topico: "" })}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {materiaOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tópico</label>
                  <select
                    value={form.topico}
                    onChange={(e) => setForm({ ...form, topico: e.target.value })}
                    disabled={!form.materia}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecione...</option>
                    {topicoOptions.map((t) => <option key={t} value={t}>{t.length > 50 ? t.slice(0, 50) + "..." : t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">O que errei *</label>
                <textarea
                  value={form.questao}
                  onChange={(e) => setForm({ ...form, questao: e.target.value })}
                  placeholder="Descreva o que você errou..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {erroForm && (
                <p className="text-xs text-red-500 dark:text-red-400">{erroForm}</p>
              )}
            </div>

            <div className="px-5 pb-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addErro}
                className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
