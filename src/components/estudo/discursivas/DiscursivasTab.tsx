"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { MateriaConcurso, MateriaDef } from "@/lib/estudo-data";
import { MATERIAS } from "@/lib/estudo-data";
import type { DiscursivaResposta, DiscursivaTema } from "@/lib/discursivas-data";
import EstudoHero from "../ui/EstudoHero";
import EmptyState from "../ui/EmptyState";
import FormDiscursiva from "./FormDiscursiva";
import TemaRow from "./TemaRow";
import PainelResposta from "./PainelResposta";

// Currículo de Discursivas (Fase 3 do plano "Simulados + Discursiva"): CRUD de temas + fluxo de
// responder/corrigir com IA. Self-fetching (como SimuladosTab/ConcurseirosTab) porque
// DiscursivaTema/DiscursivaResposta vivem em tabelas próprias, fora do blob EstudoState.

async function jsonOuErro(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}`);
  return data;
}

export default function DiscursivasTab({ concursoId, materiasConcurso }: { concursoId: string; materiasConcurso?: MateriaConcurso[] }) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [temas, setTemas] = useState<DiscursivaTema[] | null>(null);
  const [erro, setErro] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<DiscursivaTema | null>(null);
  const [respondendo, setRespondendo] = useState<DiscursivaTema | null>(null);
  // última nota + total de respostas por tema — carregado lazy quando a lista de temas chega,
  // só pra mostrar o badge de "última nota" sem precisar abrir o painel de cada um
  const [resumoPorTema, setResumoPorTema] = useState<Record<string, { ultimaNota: number | null; total: number }>>({});

  useEffect(() => {
    if (!concursoId) return;
    setTemas(null);
    setErro(false);
    fetch(`/api/concurso/${concursoId}/discursivas`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: DiscursivaTema[]) => setTemas(data))
      .catch(() => setErro(true));
  }, [concursoId]);

  useEffect(() => {
    if (!temas || temas.length === 0) return;
    let cancelado = false;
    Promise.all(
      temas.map((t) =>
        fetch(`/api/concurso/${concursoId}/discursivas/${t.id}/respostas`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data: DiscursivaResposta[]) => [t.id, { ultimaNota: data[0]?.notaIA ?? null, total: data.length }] as const)
          .catch(() => [t.id, { ultimaNota: null, total: 0 }] as const)
      )
    ).then((entries) => { if (!cancelado) setResumoPorTema(Object.fromEntries(entries)); });
    return () => { cancelado = true; };
  }, [temas, concursoId]);

  const salvar = async (dados: { id: string; materia?: string; tema: string; orientacoes?: string; pontosChave?: string[] }) => {
    try {
      if (editando) {
        const atualizado = (await jsonOuErro(
          await fetch(`/api/concurso/${concursoId}/discursivas/${dados.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ materia: dados.materia ?? null, tema: dados.tema, orientacoes: dados.orientacoes ?? null, pontosChave: dados.pontosChave ?? null }),
          })
        )) as unknown as DiscursivaTema;
        setTemas((prev) => (prev ?? []).map((t) => (t.id === atualizado.id ? atualizado : t)));
        setEditando(null);
        setFormAberto(false);
        toast.success("Tema atualizado.");
      } else {
        const criado = (await jsonOuErro(
          await fetch(`/api/concurso/${concursoId}/discursivas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
          })
        )) as unknown as DiscursivaTema;
        setTemas((prev) => [criado, ...(prev ?? [])]);
        setFormAberto(false);
        toast.success("Tema adicionado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar tema");
    }
  };

  const excluir = async (t: DiscursivaTema) => {
    if (!confirm(`Excluir "${t.tema}"? As respostas já corrigidas desse tema somem.`)) return;
    const anterior = temas ?? [];
    setTemas(anterior.filter((x) => x.id !== t.id));
    try {
      await jsonOuErro(await fetch(`/api/concurso/${concursoId}/discursivas/${t.id}`, { method: "DELETE" }));
    } catch (e) {
      setTemas(anterior);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir tema");
    }
  };

  if (!concursoId) {
    return <EmptyState icone={NotebookPen} titulo="Nenhum concurso ativo" descricao="Escolha um concurso em 'Meus Concursos' pra cadastrar temas de discursiva." />;
  }
  if (erro) {
    return <EmptyState icone={NotebookPen} titulo="Não deu pra carregar" descricao="Tente recarregar a página." />;
  }
  if (!temas) {
    return <div className="flex items-center justify-center py-16"><span className="text-muted-foreground text-xs">Carregando…</span></div>;
  }

  return (
    <div className="space-y-4">
      <EstudoHero>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <NotebookPen className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Discursivas</div>
              <div className="text-xs text-emerald-100">
                {temas.length === 0
                  ? "Cadastre temas e treine redação discursiva com correção por IA."
                  : `${temas.length} tema${temas.length !== 1 ? "s" : ""} cadastrado${temas.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditando(null); setFormAberto((v) => !v); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            {formAberto && !editando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formAberto && !editando ? "Fechar" : "Novo tema"}
          </button>
        </div>
      </EstudoHero>

      {(formAberto || editando) && (
        <FormDiscursiva
          key={editando?.id ?? "novo"}
          materiasAtivas={materiasAtivas}
          temaParaEditar={editando ?? undefined}
          onSalvar={salvar}
          onFechar={() => { setEditando(null); setFormAberto(false); }}
        />
      )}

      {temas.length === 0 && !formAberto ? (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center">
          <NotebookPen className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="text-sm text-foreground font-medium mb-1">Nenhum tema cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Cadastre um tema (com orientações e pontos-chave, se quiser), escreva sua resposta como
            na prova e a IA corrige na hora — nota de 0 a 10, pontos fortes/fracos e sugestões.
          </p>
          <button
            type="button"
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar primeiro tema
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {temas.map((t) => (
            <TemaRow
              key={t.id}
              tema={t}
              ultimaNota={resumoPorTema[t.id]?.ultimaNota ?? null}
              totalRespostas={resumoPorTema[t.id]?.total ?? 0}
              onResponder={() => setRespondendo(t)}
              onEditar={() => { setFormAberto(false); setEditando(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onExcluir={() => excluir(t)}
            />
          ))}
        </div>
      )}

      {respondendo && (
        <PainelResposta
          concursoId={concursoId}
          tema={respondendo}
          onFechar={() => setRespondendo(null)}
          onRespostaSalva={(resposta) =>
            setResumoPorTema((prev) => ({
              ...prev,
              [respondendo.id]: { ultimaNota: resposta.notaIA, total: (prev[respondendo.id]?.total ?? 0) + 1 },
            }))
          }
        />
      )}
    </div>
  );
}
