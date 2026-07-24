"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MATERIAS, type Carta, type MateriaConcurso, type TipoCarta } from "@/lib/estudo-data";
import { CARTA_CONFIG, novaCarta } from "./carta-config";

export default function FormCriarCarta({
  onSalvar,
  onCancelar,
  materiaDefault,
  cartaParaEditar,
  materiasConcurso,
}: {
  onSalvar: (carta: Carta) => void;
  onCancelar: () => void;
  materiaDefault?: string;
  cartaParaEditar?: Carta;
  materiasConcurso?: MateriaConcurso[];
}) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [tipo, setTipo] = useState<TipoCarta>(cartaParaEditar?.tipo ?? "monstro");
  const [materia, setMateria] = useState(cartaParaEditar?.materia ?? materiaDefault ?? "");
  const [topico, setTopico] = useState(cartaParaEditar?.topico ?? "");
  const [frente, setFrente] = useState(cartaParaEditar?.frente ?? "");
  const [verso, setVerso] = useState(cartaParaEditar?.verso ?? "");
  const [gabarito, setGabarito] = useState<"verdadeiro" | "falso">(cartaParaEditar?.gabarito ?? "verdadeiro");
  // criação em sequência: o form NÃO fecha ao criar — matéria/tópico/tipo ficam mantidos pra
  // próxima carta (pedido do usuário: antes resetava tudo e ele re-selecionava a cada carta)
  const [salvasAgora, setSalvasAgora] = useState(0);
  const [flashSalva, setFlashSalva] = useState(false);

  const topicosDisponiveis = useMemo(
    () => materiasAtivas.find((m) => m.nome === materia)?.topicos ?? [],
    [materia, materiasAtivas]
  );

  const podesSalvar = frente.trim().length > 0 && verso.trim().length > 0;

  function salvar() {
    if (!podesSalvar) return;
    if (cartaParaEditar) {
      onSalvar({
        ...cartaParaEditar,
        tipo,
        materia: materia || undefined,
        topico: topico || undefined,
        frente: frente.trim(),
        verso: verso.trim(),
        gabarito: tipo === "armadilha" ? gabarito : undefined,
      });
    } else {
      onSalvar(
        novaCarta({
          tipo,
          materia: materia || undefined,
          topico: topico || undefined,
          frente: frente.trim(),
          verso: verso.trim(),
          gabarito: tipo === "armadilha" ? gabarito : undefined,
        })
      );
      // limpa só o conteúdo da carta — matéria, tópico e tipo ficam pra próxima
      setFrente("");
      setVerso("");
      setGabarito("verdadeiro");
      setSalvasAgora((n) => n + 1);
      setFlashSalva(true);
      setTimeout(() => setFlashSalva(false), 1800);
    }
  }

  const frenteLabel =
    tipo === "monstro" ? "Pergunta dissertativa" :
    tipo === "armadilha" ? "Afirmação (Verdadeiro ou Falso?)" :
    tipo === "boss" ? "Questão desafiadora (múltiplos conceitos)" :
    "Texto com lacuna (use ___ para indicar a lacuna)";

  const versoLabel =
    tipo === "monstro" ? "Resposta / Gabarito" :
    tipo === "armadilha" ? "Explicação da resposta" :
    tipo === "boss" ? "Resolução completa e fundamentação" :
    "Texto completo (preenche a lacuna)";

  const frentePlaceholder =
    tipo === "monstro" ? "Ex: Explique a diferença entre isenção e imunidade tributária." :
    tipo === "armadilha" ? "Ex: A isenção impede o aproveitamento do crédito de ICMS." :
    tipo === "boss" ? "Ex: Analise o tratamento do ICMS diferencial de alíquota nas operações interestaduais com base na EC 87/2015 e a responsabilidade do destinatário." :
    "Ex: O lançamento por homologação ocorre quando ___.";

  const versoPlaceholder =
    tipo === "monstro" ? "Ex: A isenção é a dispensa legal do pagamento do tributo devido, enquanto a imunidade é uma vedação constitucional..." :
    tipo === "armadilha" ? "Ex: A afirmação é FALSA. O STF firmou que a isenção não gera direito ao crédito de ICMS porque..." :
    tipo === "boss" ? "Ex: A EC 87/2015 estendeu o DIFAL para operações com consumidor final não contribuinte, criando responsabilidade compartilhada entre estados..." :
    "Ex: O lançamento por homologação ocorre quando a legislação atribui ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade administrativa.";

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancelar} className="text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          {cartaParaEditar ? "Editar Carta" : "Nova Carta"}
        </h2>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Tipo de Carta</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["monstro", "armadilha", "tesouro", "boss"] as TipoCarta[]).map((t) => {
            const cfg = CARTA_CONFIG[t];
            const Icon = cfg.icone;
            const sel = tipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                  sel
                    ? `${cfg.borda} bg-gradient-to-b ${cfg.cor} shadow-lg ${cfg.sombra}`
                    : "border-border bg-muted/50 hover:border-primary/40 dark:hover:border-primary/40"
                }`}
              >
                <Icon className={`h-6 w-6 ${sel ? "text-white" : "text-muted-foreground"}`} />
                <span className={`text-xs font-bold ${sel ? "text-white" : "text-muted-foreground"}`}>{cfg.nome}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{CARTA_CONFIG[tipo].descricao}</p>
      </div>

      <div className={`grid gap-3 mb-4 ${topicosDisponiveis.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Matéria</label>
          <select
            value={materia}
            onChange={(e) => { setMateria(e.target.value); setTopico(""); }}
            className="w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">Geral (sem matéria)</option>
            {materiasAtivas.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        {topicosDisponiveis.length > 0 && (
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Tópico</label>
            <select
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              className="w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">Todos os tópicos</option>
              {topicosDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{frenteLabel}</label>
        <textarea
          value={frente}
          onChange={(e) => setFrente(e.target.value)}
          rows={3}
          placeholder={frentePlaceholder}
          className="w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2.5 placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
        />
      </div>

      {tipo === "armadilha" && (
        <div className="mb-4">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Gabarito</label>
          <div className="flex gap-3">
            {(["verdadeiro", "falso"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGabarito(g)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  gabarito === g
                    ? g === "verdadeiro"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                      : "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                    : "border-border text-muted-foreground"
                }`}
              >
                {g === "verdadeiro" ? "✓ Verdadeiro" : "✗ Falso"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">{versoLabel}</label>
        <textarea
          value={verso}
          onChange={(e) => setVerso(e.target.value)}
          rows={4}
          placeholder={versoPlaceholder}
          className="w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2.5 placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <button
        onClick={salvar}
        disabled={!podesSalvar}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground py-3 rounded-xl font-bold text-sm transition-all"
      >
        {cartaParaEditar ? "Salvar Alterações" : salvasAgora > 0 ? "Criar Outra Carta" : "Criar Carta"}
      </button>

      {!cartaParaEditar && (flashSalva || salvasAgora > 0) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`text-xs transition-opacity ${flashSalva ? "text-emerald-600 dark:text-emerald-400 opacity-100" : "text-muted-foreground opacity-70"}`}>
            {flashSalva
              ? "✓ Carta criada! Matéria e tópico mantidos pra próxima."
              : `${salvasAgora} carta${salvasAgora !== 1 ? "s" : ""} criada${salvasAgora !== 1 ? "s" : ""} nesta sessão.`}
          </span>
          <button
            type="button"
            onClick={onCancelar}
            className="text-xs font-medium text-muted-foreground hover:text-foreground dark:hover:text-foreground underline underline-offset-2 transition-colors flex-shrink-0"
          >
            Concluir e voltar
          </button>
        </div>
      )}
    </div>
  );
}
