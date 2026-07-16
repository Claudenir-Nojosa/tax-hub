"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  topicoKey,
  type Grupo, type TopicoState, type TrilhaAtividade, type TrilhaMeta,
} from "@/lib/estudo-data";
import { STATUS_CONFIG, TIPO_CONFIG } from "./trilha-ui";

// Painel de UMA meta (1 nó do TrilhaPath = 1 tópico). SEM objetivo de duração (pedido do
// usuário: a meta é só "conclua a teoria do tópico X" — duracaoMin existe no dado, mas é
// estimativa interna pra projeções, nunca exibida aqui). Mantém os mesmos efeitos colaterais:
// status cycling e "Registrar resultado" gravam direto no caderno de tópicos do Edital, via
// callbacks recebidos do componente pai (TrilhaTab), que é quem detém a lógica de negócio
// (marcar tópico como estudado ao concluir teoria etc).

interface Props {
  meta: TrilhaMeta | null;
  estado: "concluida" | "atual" | "futura";
  aberto: boolean;
  onClose: () => void;
  onStatusClick: (atividadeId: string) => void;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
}

export default function MetaPainel({ meta, estado, aberto, onClose, onStatusClick, topicos, onUpdateTopicos }: Props) {
  if (!meta) return null;
  const somenteLeitura = estado === "concluida";
  const materias = [...new Set(meta.atividades.map((a) => a.materia))];

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {estado === "concluida" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            Meta {meta.numero}
          </DialogTitle>
          <DialogDescription>{materias.join(" · ")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {meta.orientacao && (
            <div className="flex gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-3 py-2">
              <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">{meta.orientacao}</p>
            </div>
          )}
          {meta.atividades.map((a) => (
            <AtividadeRow
              key={a.id}
              atividade={a}
              somenteLeitura={somenteLeitura}
              onStatusClick={() => onStatusClick(a.id)}
              topicos={topicos}
              onUpdateTopicos={onUpdateTopicos}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Linha de atividade ──────────────────────────────────────────────────────

function AtividadeRow({
  atividade, somenteLeitura, onStatusClick, topicos, onUpdateTopicos,
}: {
  atividade: TrilhaAtividade;
  somenteLeitura: boolean;
  onStatusClick: () => void;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
}) {
  const [formAberto, setFormAberto] = useState(false);
  const cfg = TIPO_CONFIG[atividade.tipo];
  const st = STATUS_CONFIG[atividade.status];

  // teoria (o único tipo gerado hoje) vira a frase-objetivo da meta; "questoes"/"revisao" só
  // existem em trilhas antigas persistidas — mantidos por compatibilidade de renderização
  const rotulo =
    atividade.tipo === "teoria"
      ? "Conclua a teoria de:"
      : atividade.tipo === "questoes"
      ? `${atividade.quantidadeQuestoes} questões`
      : `Revisão ${atividade.numeroRevisao === 1 ? "(1ª — ±7 dias)" : "(2ª — ±30 dias)"}`;

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <cfg.Icon className={`h-4 w-4 flex-shrink-0 ${cfg.cor}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-400">
            {rotulo}
            {atividade.tipo !== "teoria" && <span className="font-normal"> · {atividade.materia}</span>}
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug" title={atividade.topicos.join(" · ")}>
            {atividade.topicos.join(" · ")}
          </div>
        </div>
        {atividade.tipo === "questoes" && !somenteLeitura && (
          <button
            type="button"
            onClick={() => setFormAberto((v) => !v)}
            className="text-[11px] px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors flex-shrink-0"
          >
            Registrar resultado
          </button>
        )}
        <button
          type="button"
          disabled={somenteLeitura}
          onClick={onStatusClick}
          title="Clique pra avançar o status"
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${st.classe} ${
            somenteLeitura ? "cursor-default" : "hover:scale-105"
          }`}
        >
          {st.label}
        </button>
      </div>
      {formAberto && (
        <RegistrarResultado
          atividade={atividade}
          topicos={topicos}
          onUpdateTopicos={onUpdateTopicos}
          onFechar={() => setFormAberto(false)}
        />
      )}
    </div>
  );
}

// mini-form: soma acertos/erros no caderno (A-D) do tópico escolhido — mesmo shape do Edital,
// então a média/XP existentes reagem sozinhos. Registrar NÃO muda o status (fica manual).
function RegistrarResultado({
  atividade, topicos, onUpdateTopicos, onFechar,
}: {
  atividade: TrilhaAtividade;
  topicos: Record<string, TopicoState>;
  onUpdateTopicos: (t: Record<string, TopicoState>) => void;
  onFechar: () => void;
}) {
  const [topico, setTopico] = useState(atividade.topicos[0] ?? "");
  const [grupo, setGrupo] = useState<Grupo>("A");
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");

  const salvar = () => {
    const a = parseInt(acertos) || 0;
    const e = parseInt(erros) || 0;
    if (a + e === 0 || !topico) return;
    const k = topicoKey(atividade.materia, topico);
    const atual = topicos[k] ?? {
      estudado: false,
      cadernos: { A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 } },
    };
    onUpdateTopicos({
      ...topicos,
      [k]: {
        ...atual,
        cadernos: {
          ...atual.cadernos,
          [grupo]: { acertos: atual.cadernos[grupo].acertos + a, erros: atual.cadernos[grupo].erros + e },
        },
      },
    });
    onFechar();
  };

  return (
    <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[10px] text-gray-400 mb-0.5">Tópico</label>
        <select
          value={topico}
          onChange={(e) => setTopico(e.target.value)}
          className="w-full text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {atividade.topicos.map((t) => (
            <option key={t} value={t}>{t.length > 60 ? t.slice(0, 60) + "…" : t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Grupo</label>
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as Grupo)}
          className="text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          {(["A", "B", "C", "D"] as Grupo[]).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Acertos</label>
        <input
          type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)}
          className="w-16 text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-400 mb-0.5">Erros</label>
        <input
          type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)}
          className="w-16 text-[11px] border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        />
      </div>
      <button
        type="button"
        onClick={salvar}
        className="text-[11px] px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
      >
        Salvar no caderno
      </button>
    </div>
  );
}
