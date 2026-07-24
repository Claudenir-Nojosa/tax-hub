"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ChevronRight, CheckCircle2, Flame, Layers, Plus, Star,
} from "lucide-react";
import { type Carta, type MateriaConcurso, type TipoCarta } from "@/lib/estudo-data";
import { CARTA_CONFIG, hoje } from "./carta-config";
import CartaVisual from "./CartaVisual";
import SessaoRevisao from "./SessaoRevisao";
import FormCriarCarta from "./FormCriarCarta";
import BaralhoItem from "./BaralhoItem";
import ImportReviewScreen from "./ImportReviewScreen";
import StatTile from "../ui/StatTile";

// ── CartasTab principal ───────────────────────────────────────────────────────
export default function CartasTab({
  cartas,
  onChange,
  materiasConcurso,
}: {
  cartas: Carta[];
  onChange: (cartas: Carta[]) => void;
  materiasConcurso?: MateriaConcurso[];
}) {
  const [view, setView] = useState<"home" | "criar" | "revisar" | "importar">("home");
  const [baralhoAtivo, setBaralhoAtivo] = useState<string | null>(null);
  const [cartasParaRevisarAtual, setCartasParaRevisarAtual] = useState<Carta[]>([]);
  const [criarComMateria, setCriarComMateria] = useState<string | undefined>(undefined);
  const [cartaEditando, setCartaEditando] = useState<Carta | null>(null);
  const [sugestoesImport, setSugestoesImport] = useState<Carta[]>([]);
  const [selecionadasImport, setSelecionadasImport] = useState<Set<string>>(new Set());

  const hj = hoje();
  const paraHoje = useMemo(() => cartas.filter((c) => c.proximaRevisao <= hj), [cartas, hj]);
  const xpCartas = cartas.reduce((sum, c) => sum + c.acertos * 2, 0);

  const baralhos = useMemo(() => {
    const map = new Map<string, Carta[]>();
    for (const carta of cartas) {
      const key = carta.materia ?? "__geral__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(carta);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "__geral__") return 1;
        if (b === "__geral__") return -1;
        return a.localeCompare(b, "pt-BR");
      })
      .map(([nome, bc]) => ({
        nome,
        cartas: bc,
        displayName: nome === "__geral__" ? "Geral (sem matéria)" : nome,
      }));
  }, [cartas]);

  const cartasBaralho = useMemo(() => {
    if (!baralhoAtivo) return cartas;
    return cartas.filter((c) => (c.materia ?? "__geral__") === baralhoAtivo);
  }, [cartas, baralhoAtivo]);

  const paraHojeBaralho = useMemo(
    () => cartasBaralho.filter((c) => c.proximaRevisao <= hj),
    [cartasBaralho, hj]
  );

  function iniciarRevisao(lista: Carta[]) {
    setCartasParaRevisarAtual(lista);
    setView("revisar");
  }

  function salvarImport() {
    const novas = sugestoesImport.filter((c) => selecionadasImport.has(c.id));
    onChange([...novas, ...cartas]);
    setSugestoesImport([]);
    setSelecionadasImport(new Set());
    setView("home");
  }

  function handleSalvarCarta(carta: Carta) {
    onChange([carta, ...cartas]);
    // NÃO volta pra home: o FormCriarCarta fica aberto com matéria/tópico/tipo mantidos, pra
    // criar várias cartas em sequência sem re-selecionar tudo (sair = seta ou "Concluir e voltar")
  }

  function handleSalvarEdicao(cartaAtualizada: Carta) {
    onChange(cartas.map((c) => c.id === cartaAtualizada.id ? cartaAtualizada : c));
    setCartaEditando(null);
    setView("home");
  }

  function abrirEdicao(carta: Carta) {
    setCartaEditando(carta);
    setView("criar");
  }

  function handleConcluirRevisao(atualizadas: Carta[]) {
    const map = new Map(atualizadas.map((c) => [c.id, c]));
    onChange(cartas.map((c) => map.get(c.id) ?? c));
    setView("home");
  }

  function handleExcluir(id: string) {
    if (!confirm("Excluir esta carta?")) return;
    onChange(cartas.filter((c) => c.id !== id));
  }

  // ── View: criar ──
  if (view === "criar") {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 min-h-[500px]">
        <FormCriarCarta
          onSalvar={cartaEditando ? handleSalvarEdicao : handleSalvarCarta}
          onCancelar={() => { setCartaEditando(null); setView("home"); }}
          materiaDefault={criarComMateria}
          cartaParaEditar={cartaEditando ?? undefined}
          materiasConcurso={materiasConcurso}
        />
      </div>
    );
  }

  // ── View: revisar ──
  if (view === "revisar") {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 min-h-[500px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("home")} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Sessão de Revisão</h2>
          <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
            {cartasParaRevisarAtual.length} cartas
          </span>
        </div>
        <SessaoRevisao cartasParaRevisar={cartasParaRevisarAtual} onConcluir={handleConcluirRevisao} />
      </div>
    );
  }

  // ── View: importar (review IA suggestions) ──
  if (view === "importar") {
    return (
      <ImportReviewScreen
        sugestoes={sugestoesImport}
        selecionadas={selecionadasImport}
        onToggle={(id) =>
          setSelecionadasImport((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onToggleAll={(selecionar) =>
          setSelecionadasImport(selecionar ? new Set(sugestoesImport.map((c) => c.id)) : new Set())
        }
        onSalvar={salvarImport}
        onCancelar={() => setView("home")}
      />
    );
  }

  // ── View: home ──────────────────────────────────────────────────────────────
  const baralhoAtivoDisplay = baralhoAtivo === "__geral__" ? "Geral (sem matéria)" : baralhoAtivo;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {baralhoAtivo && (
            <button onClick={() => setBaralhoAtivo(null)} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-base font-bold text-foreground">
            {baralhoAtivo ? baralhoAtivoDisplay : "Meus Baralhos"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCriarComMateria(baralhoAtivo && baralhoAtivo !== "__geral__" ? baralhoAtivo : undefined);
              setView("criar");
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Nova Carta
          </button>
        </div>
      </div>

      {/* ── Lista de Baralhos ── */}
      {!baralhoAtivo && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icone={Layers} tone="primary" valor={cartas.length} label="Total de Cartas" />
            <StatTile icone={Flame} tone="warning" valor={paraHoje.length} label="Para Hoje" />
            <StatTile icone={Star} tone="warning" valor={`${xpCartas} XP`} label="XP de Cartas" />
            <StatTile icone={CheckCircle2} tone="success" valor={cartas.reduce((s, c) => s + c.acertos, 0)} label="Acertos Totais" />
          </div>

          {/* CTA revisar tudo */}
          {paraHoje.length > 0 && (
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-5 flex items-center justify-between shadow-xl shadow-orange-500/20">
              <div>
                <div className="text-white font-bold text-base flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  {paraHoje.length} carta{paraHoje.length !== 1 ? "s" : ""} para revisar hoje!
                </div>
                <div className="text-orange-100 text-sm mt-0.5">Não perca o intervalo ideal da revisão espaçada</div>
              </div>
              <button
                onClick={() => iniciarRevisao(paraHoje)}
                className="bg-white text-orange-600 font-bold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2 flex-shrink-0 shadow-md"
              >
                Revisar Tudo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Baralhos */}
          {cartas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-14 w-14 text-foreground dark:text-foreground mb-3" />
              <p className="text-muted-foreground text-sm font-medium mb-1">Nenhum baralho criado ainda.</p>
              <p className="text-muted-foreground dark:text-muted-foreground text-xs mb-6">Crie cartas para começar a revisão espaçada inteligente.</p>
              <button
                onClick={() => { setCriarComMateria(undefined); setView("criar"); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md"
              >
                <Plus className="h-4 w-4" /> Criar primeira carta
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {baralhos.length} baralho{baralhos.length !== 1 ? "s" : ""}
              </p>
              {baralhos.map(({ nome, cartas: bc, displayName }) => (
                <BaralhoItem
                  key={nome}
                  displayName={displayName}
                  cartas={bc}
                  onEntrar={() => setBaralhoAtivo(nome)}
                  onRevisar={() => iniciarRevisao(bc.filter((c) => c.proximaRevisao <= hj))}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Detalhe do Baralho ── */}
      {baralhoAtivo && (
        <>
          {paraHojeBaralho.length > 0 && (
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-orange-500/20">
              <div className="text-white font-bold flex items-center gap-2">
                <Flame className="h-4 w-4" />
                {paraHojeBaralho.length} carta{paraHojeBaralho.length !== 1 ? "s" : ""} para revisar
              </div>
              <button
                onClick={() => iniciarRevisao(paraHojeBaralho)}
                className="bg-white text-orange-600 font-bold px-4 py-2 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2 shadow-md text-sm"
              >
                Revisar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {cartasBaralho.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["monstro", "armadilha", "tesouro", "boss"] as TipoCarta[]).map((t) => {
                const cfg = CARTA_CONFIG[t];
                const Icon = cfg.icone;
                const count = cartasBaralho.filter((c) => c.tipo === t).length;
                return (
                  <div key={t} className={`rounded-xl border-2 ${cfg.borda} bg-gradient-to-b ${cfg.cor} p-3 flex items-center gap-3 shadow-lg ${cfg.sombra}`}>
                    <div className={`w-8 h-8 rounded-lg ${cfg.badge} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-[10px] text-white/60">{cfg.nome}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cartasBaralho.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-14 w-14 text-foreground dark:text-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma carta neste baralho ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cartasBaralho.map((carta) => (
                <CartaVisual key={carta.id} carta={carta} onExcluir={handleExcluir} onEditar={abrirEdicao} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
