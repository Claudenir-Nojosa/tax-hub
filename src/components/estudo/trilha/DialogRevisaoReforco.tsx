"use client";

import { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { type Carta, type Grupo, type PdfEstudo } from "@/lib/estudo-data";
import type { FilaAtividade } from "@/lib/trilha-fila";
import NovoCartaoForm from "../biblioteca/NovoCartaoForm";
import { novaCartaManual } from "../biblioteca/biblioteca-utils";

// Pedido do usuário: clicar numa atividade de reforço (desempenho abaixo do limiar) não deve ir
// direto pras questões — primeiro pede pra revisar os pontos que errou, com um atalho pra já criar
// um cartão de revisão sobre isso. Só "reforco" (por tópico/grupo) tem os NÚMEROS exatos das
// questões erradas pra listar — vêm do PdfQuestoes.resultados do PDF do tópico (mesmo caderno que
// os grupos A-D usam). "reforco_materia" (agregado, 20 questões externas — só a contagem
// acertos/erros é registrada, não questão por questão) só tem o % geral pra mostrar.
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

  const grupo = atividade.tipo === "reforco" ? (atividade.id.split(":").pop() as Grupo) : undefined;
  const pdf = atividade.topico
    ? pdfs.find((p) => p.materia === atividade.materia && p.topicos?.includes(atividade.topico!))
    : undefined;
  const questoesErradas = grupo && pdf?.questoes
    ? pdf.questoes.resultados.filter((r) => r.grupo === grupo && r.acertou === false).map((r) => r.numero)
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
