"use client";

import { useEffect, useState } from "react";
import { FileStack, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ParteSimulado, SimuladoConcurso } from "@/lib/simulados-data";
import { salvarArquivoSimulado, obterArquivoSimulado } from "@/lib/simulados-storage";
import EstudoHero from "../ui/EstudoHero";
import EmptyState from "../ui/EmptyState";
import FormSimulado from "./FormSimulado";
import SimuladoRow from "./SimuladoRow";
import PainelTentativa from "./PainelTentativa";

// Currículo de Simulados (Fase 1 do plano "Simulados + Discursiva"): cadastro do PDF da prova real
// + gabarito oficial por parte. Self-fetching (como ConcurseirosTab) porque SimuladoConcurso vive
// em tabela própria, fora do blob EstudoState que o resto da página carrega.

async function jsonOuErro(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Erro ${res.status}`);
  return data;
}

export default function SimuladosTab({ concursoId }: { concursoId: string }) {
  const [simulados, setSimulados] = useState<SimuladoConcurso[] | null>(null);
  const [erro, setErro] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<SimuladoConcurso | null>(null);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [fazendo, setFazendo] = useState<SimuladoConcurso | null>(null);

  useEffect(() => {
    if (!concursoId) return;
    setSimulados(null);
    setErro(false);
    fetch(`/api/concurso/${concursoId}/simulados`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setSimulados(data))
      .catch(() => setErro(true));
  }, [concursoId]);

  const salvar = async (
    dados: { id: string; nome: string; orgao?: string; banca?: string; ano?: number; partes: ParteSimulado[] },
    arquivo?: File
  ) => {
    try {
      if (editando) {
        const atualizado = (await jsonOuErro(
          await fetch(`/api/concurso/${concursoId}/simulados/${dados.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: dados.nome, orgao: dados.orgao ?? null, banca: dados.banca ?? null, ano: dados.ano ?? null, partes: dados.partes }),
          })
        )) as unknown as SimuladoConcurso;
        let final = atualizado;
        if (arquivo) {
          await salvarArquivoSimulado(dados.id, arquivo, concursoId);
          final = (await jsonOuErro(
            await fetch(`/api/concurso/${concursoId}/simulados/${dados.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ arquivoEnviado: true }),
            })
          )) as unknown as SimuladoConcurso;
        }
        setSimulados((prev) => (prev ?? []).map((s) => (s.id === final.id ? final : s)));
        setEditando(null);
        setFormAberto(false);
        toast.success("Simulado atualizado.");
      } else {
        let criado = (await jsonOuErro(
          await fetch(`/api/concurso/${concursoId}/simulados`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
          })
        )) as unknown as SimuladoConcurso;
        if (arquivo) {
          try {
            await salvarArquivoSimulado(criado.id, arquivo, concursoId);
            criado = (await jsonOuErro(
              await fetch(`/api/concurso/${concursoId}/simulados/${criado.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ arquivoEnviado: true }),
              })
            )) as unknown as SimuladoConcurso;
          } catch (e) {
            toast.error(`Simulado criado, mas não consegui enviar o PDF. ${e instanceof Error ? e.message : ""}`.trim());
          }
        }
        setSimulados((prev) => [criado, ...(prev ?? [])]);
        setFormAberto(false);
        toast.success("Simulado adicionado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar simulado");
    }
  };

  const excluir = async (s: SimuladoConcurso) => {
    if (!confirm(`Excluir "${s.nome}"? O PDF e o gabarito cadastrados somem.`)) return;
    const anterior = simulados ?? [];
    setSimulados(anterior.filter((x) => x.id !== s.id));
    try {
      await jsonOuErro(await fetch(`/api/concurso/${concursoId}/simulados/${s.id}`, { method: "DELETE" }));
    } catch (e) {
      setSimulados(anterior);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir simulado");
    }
  };

  const baixar = async (s: SimuladoConcurso) => {
    setBaixandoId(s.id);
    try {
      const blob = await obterArquivoSimulado(s.id);
      if (!blob) { toast.error("Arquivo não encontrado no Storage."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.nome}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar o PDF");
    } finally {
      setBaixandoId(null);
    }
  };

  if (!concursoId) {
    return <EmptyState icone={FileStack} titulo="Nenhum concurso ativo" descricao="Escolha um concurso em 'Meus Concursos' pra cadastrar simulados." />;
  }

  if (erro) {
    return <EmptyState icone={FileStack} titulo="Não deu pra carregar" descricao="Tente recarregar a página." />;
  }

  if (!simulados) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EstudoHero>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileStack className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Simulados</div>
              <div className="text-xs text-emerald-100">
                {simulados.length === 0
                  ? "Cadastre provas antigas em PDF com o gabarito oficial pra treinar em condição real de prova."
                  : `${simulados.length} simulado${simulados.length !== 1 ? "s" : ""} cadastrado${simulados.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditando(null); setFormAberto((v) => !v); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            {formAberto && !editando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formAberto && !editando ? "Fechar" : "Novo simulado"}
          </button>
        </div>
      </EstudoHero>

      {(formAberto || editando) && (
        <FormSimulado
          key={editando?.id ?? "novo"}
          simuladoParaEditar={editando ?? undefined}
          onSalvar={salvar}
          onFechar={() => { setEditando(null); setFormAberto(false); }}
        />
      )}

      {simulados.length === 0 && !formAberto ? (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center">
          <FileStack className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="text-sm text-foreground font-medium mb-1">Nenhum simulado cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
            Anexe o PDF de uma prova antiga (baixada do TecConcursos ou de outra fonte) e digite o
            gabarito oficial — depois de cobrir o edital inteiro, a Trilha vai liberar esses
            simulados como treino cronometrado, em condição real de prova.
          </p>
          <button
            type="button"
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar primeiro simulado
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          {simulados.map((s) => (
            <SimuladoRow
              key={s.id}
              simulado={s}
              baixando={baixandoId === s.id}
              onBaixar={() => baixar(s)}
              onEditar={() => { setFormAberto(false); setEditando(s); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onExcluir={() => excluir(s)}
              onFazerSimulado={() => setFazendo(s)}
            />
          ))}
        </div>
      )}

      {fazendo && (
        <PainelTentativa concursoId={concursoId} simulado={fazendo} onFechar={() => setFazendo(null)} />
      )}
    </div>
  );
}
