"use client";

import { useState } from "react";
import { BookOpen, RotateCcw, X } from "lucide-react";
import { tentativasDoGrupo, type Carta, type Grupo, type PdfEstudo } from "@/lib/estudo-data";
import type { FilaAtividade } from "@/lib/trilha-fila";
import NovoCartaoForm from "../biblioteca/NovoCartaoForm";
import { novaCartaManual } from "../biblioteca/biblioteca-utils";

// Pedido do usuário: clicar numa atividade de reforço (desempenho abaixo do limiar) não deve ir
// direto pras questões — primeiro pede pra revisar os pontos que errou, com um atalho pra já criar
// um cartão de revisão sobre isso. Só "reforco" (grupo A-D específico) tem os NÚMEROS exatos das
// questões erradas pra listar — vêm do PdfQuestoes.resultados do PDF do tópico (mesmo caderno que
// os grupos A-D usam).
//
// "reforco_topico" (agregado dos 4 cadernos do tópico) é INTENCIONALMENTE mais simples — pedido
// explícito do usuário: "vai falar pra ele acessar o pdf e revisar as questões que ele errou, apenas
// isso" — não é uma atividade nova de responder questões, então nada de cartão/lista de números
// aqui, só o aviso + um botão direto pro PDF. Ver DialogReforcoTopicoSimples abaixo.
export default function DialogRevisaoReforco({
  atividade, pdfs, onFechar, onIrParaQuestoes, onAdicionarCartas,
}: {
  atividade: FilaAtividade;
  pdfs: PdfEstudo[];
  onFechar: () => void;
  onIrParaQuestoes: () => void;
  onAdicionarCartas: (cartas: Carta[]) => void;
}) {
  const [criandoCartao, setCriandoCartao] = useState(false);

  if (atividade.tipo === "reforco_topico") {
    return <DialogReforcoTopicoSimples atividade={atividade} onFechar={onFechar} onIrParaQuestoes={onIrParaQuestoes} />;
  }

  // id: r:materia:topico:grupo:tentativa — os 2 últimos segmentos (grupo mudou de posição desde
  // que cada RODADA de reforço passou a ter seu próprio id, ver analisarReforcos em
  // trilha-dinamica.ts)
  const partesId = atividade.tipo === "reforco" ? atividade.id.split(":") : [];
  const grupo = atividade.tipo === "reforco" ? (partesId[partesId.length - 2] as Grupo) : undefined;
  const pdf = atividade.topico
    ? pdfs.find((p) => p.materia === atividade.materia && p.topicos?.includes(atividade.topico!))
    : undefined;
  const tentativas = grupo ? tentativasDoGrupo(pdf?.questoes, grupo) : [];
  // tentativa que MOTIVOU esta oferta de reforço — a mais recente já respondida (a nova, alvo
  // desta oferta, ainda não existe: só é criada quando o usuário inicia a rodada)
  const ultimaTentativa = tentativas[tentativas.length - 1];
  const questoesErradas = ultimaTentativa
    ? ultimaTentativa.itens.filter((r) => r.acertou === false).map((r) => r.numero)
    : [];

  if (criandoCartao) {
    return (
      <NovoCartaoForm
        tipo="monstro"
        materia={atividade.materia}
        topico={atividade.topico}
        onSalvar={(frente, verso) => {
          onAdicionarCartas([novaCartaManual({ tipo: "monstro", materia: atividade.materia, topico: atividade.topico, frente, verso })]);
          onFechar();
        }}
        onCancelar={() => setCriandoCartao(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg p-4 space-y-3 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RotateCcw className="h-4 w-4 text-amber-500" /> Hora de revisar
          </div>
          <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {atividade.materia}{atividade.topico ? ` · ${atividade.topico}` : ""}
        </p>

        <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
          {atividade.desempenhoPerc !== undefined
            ? `Aproveitamento ${atividade.desempenhoPerc}%${grupo ? ` — Grupo ${grupo}` : ""} — abaixo do esperado`
            : "Desempenho abaixo do esperado nesse trecho"}
        </div>

        {tentativas.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Histórico:</span>
            {tentativas.map((t) => (
              <span key={t.numero} className="font-mono">
                tentativa {t.numero}: {t.perc}%{t.numero < tentativas.length ? " ·" : ""}
              </span>
            ))}
          </div>
        )}

        {questoesErradas.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Questões que você errou:</p>
            <div className="flex flex-wrap gap-1.5">
              {questoesErradas.map((n) => (
                <span
                  key={n}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Antes de refazer, vale revisar esses pontos — crie um cartão pra guardar o que errou, ou já vá direto pras questões.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setCriandoCartao(true)}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            Criar cartão de revisão
          </button>
          <button
            type="button"
            onClick={onIrParaQuestoes}
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors"
          >
            Ir pras questões
          </button>
        </div>
      </div>
    </div>
  );
}

// Reforço por tópico — versão mínima pedida pelo usuário: só o aviso + um botão pro PDF, sem
// cartão nem lista de questões (não há números de questão pra listar aqui, é um agregado dos 4
// cadernos). `onIrParaQuestoes` (mesma função do dialog completo) marca o reforço como feito e
// abre o PDF do tópico — ver irParaQuestoesDaRevisao em TrilhaTab.tsx.
function DialogReforcoTopicoSimples({
  atividade, onFechar, onIrParaQuestoes,
}: {
  atividade: FilaAtividade;
  onFechar: () => void;
  onIrParaQuestoes: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-md p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RotateCcw className="h-4 w-4 text-amber-500" /> Hora de revisar
          </div>
          <button type="button" onClick={onFechar} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {atividade.materia}{atividade.topico ? ` · ${atividade.topico}` : ""}
        </p>

        <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
          {atividade.desempenhoPerc !== undefined
            ? `Aproveitamento ${atividade.desempenhoPerc}% nesse tópico — abaixo do esperado`
            : "Aproveitamento abaixo do esperado nesse tópico"}
        </div>

        <p className="text-xs text-muted-foreground">
          Reabra o PDF e revise as questões que você errou nesse tópico.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={onIrParaQuestoes}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" /> Ir para o PDF
          </button>
        </div>
      </div>
    </div>
  );
}
