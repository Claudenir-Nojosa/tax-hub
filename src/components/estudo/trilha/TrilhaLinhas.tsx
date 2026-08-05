"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, Circle, Clock, ExternalLink, Lock, Trophy } from "lucide-react";
import {
  GRUPO_LABEL, GRUPO_BADGE, type MateriaConcurso, type MateriaDef,
} from "@/lib/estudo-data";
import {
  type AnaliseMateria, type BlocoEstudoSemana, type QuestaoLiberada,
  type ReforcoGrupo, type ReforcoImediatoPendente, type Revisao30, type RevisaoLinkPendente,
} from "@/lib/trilha-dinamica";
import { resolverCorMateria, fmtHoras } from "./trilha-ui";
import ProgressRing from "../ui/ProgressRing";

// Linhas/corpos usados dentro das seções da Trilha (TrilhaTab.tsx) — extraído pra cá pra manter
// TrilhaTab focado na orquestração (hero, seções, bolha do Gustavo). Nenhuma lógica mudou aqui,
// só o arquivo em que vivem.

function fmtDataCurta(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// pedido de abertura de um PDF específico numa página específica — só existe quando o bloco tem
// um PdfEstudo com o intervalo do tópico mapeado (ver resolverPaginaBloco em trilha-dinamica.ts);
// sem isso, "Ler PDF" cai no comportamento genérico (troca de aba, sem deep link)
export interface AberturaPdfSolicitada {
  pdfId: string;
  paginaInicio?: number;
  paginaFim?: number;
}

// ─── Conteúdo: bloco de leitura de uma matéria ───────────────────────────────

export function CorpoBloco({
  b, materiasAtivas, onIrParaBiblioteca, onMarcarEstudado, onToggleCapitulo,
}: {
  b: BlocoEstudoSemana;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onIrParaBiblioteca?: (abertura?: AberturaPdfSolicitada) => void;
  onMarcarEstudado: () => void;
  onToggleCapitulo?: (pdfId: string, paginaInicio: number) => void;
}) {
  const cor = resolverCorMateria(b.materia, materiasAtivas);
  const perc = Math.min(100, Math.round((b.minutosFeitosSemana / Math.max(1, b.minutosAlvoSemana)) * 100));
  const abrirLeitor = () => {
    if (!onIrParaBiblioteca) return;
    onIrParaBiblioteca(
      b.pdfId ? { pdfId: b.pdfId, paginaInicio: b.paginaInicio, paginaFim: b.paginaFim } : undefined
    );
  };
  const abrirCapitulo = (cap: { paginaInicio: number; paginaFim: number }) => {
    if (!onIrParaBiblioteca || !b.pdfId) return;
    onIrParaBiblioteca({ pdfId: b.pdfId, paginaInicio: cap.paginaInicio, paginaFim: cap.paginaFim });
  };
  // subtarefas só fazem sentido quando o bloco agrupa MAIS de um capítulo — com 1 só, o
  // capituloLabel acima já mostra tudo que precisa
  const mostrarSubtarefas = (b.capitulos?.length ?? 0) > 1;

  // bloqueado = ainda não é a vez dessa matéria na cadeia da semana (ver computarMetaSemana em
  // trilha-dinamica.ts) — mostra só um preview, sem botão nem subtarefas clicáveis, até a
  // atividade anterior da cadeia ser concluída (não é mais só "hoje": fica assim até concluir,
  // mesmo que leve mais de um dia)
  if (b.bloqueado) {
    return (
      <div className="flex items-center gap-3 opacity-50">
        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cor.dot}`} />
            <span className="text-sm font-semibold text-foreground truncate">{b.materia}</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={b.capituloLabel ?? b.topico}>
            {b.capituloLabel ?? `tópico atual: ${b.topico}`} — libera ao concluir a atividade anterior
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cor.dot}`} />
            <span className="text-sm font-semibold text-foreground dark:text-foreground truncate">{b.materia}</span>
            {b.concluidaAtividade && !b.concluido && (
              <span
                className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 flex-shrink-0"
                title="Tempo desta atividade já batido — libera a próxima matéria da cadeia. Não significa que a leitura terminou."
              >
                <Clock className="h-3 w-3" /> tempo batido
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={b.topico}>
            tópico atual: {b.topico}
            {b.paginaInicio && b.paginaFim && !b.capituloLabel && ` (págs. ${b.paginaInicio}–${b.paginaFim})`}
          </div>
          {b.capituloLabel && (
            <div className="text-[11px] text-primary truncate mt-0.5" title={b.capituloLabel}>
              {b.capituloLabel}
              {b.paginaInicio && b.paginaFim && ` (págs. ${b.paginaInicio}–${b.paginaFim})`}
            </div>
          )}
          {/* alvo desta ATIVIDADE (trecho do tamanho de um dia), não o da semana inteira — sem
              isso o número ao lado da barra (semanal) parecia "desproporcional" comparado a um
              trecho de poucas páginas (ex.: "23min/1h20" ao lado de só 9 páginas — o 1h20 era da
              semana toda) */}
          <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            Nesta atividade: {fmtHoras(b.minutosFeitosSemana)} de {fmtHoras(b.minutosAlvoAtividade)}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-muted dark:bg-muted rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${b.concluido ? "bg-emerald-500" : "bg-primary/50"}`} style={{ width: `${perc}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{fmtHoras(b.minutosFeitosSemana)}/{fmtHoras(b.minutosAlvoSemana)} na semana</span>
          </div>
        </div>
        {/* continua visível mesmo com concluidaAtividade=true — esse flag só libera a PRÓXIMA
            matéria da cadeia (ver badge "tempo batido" acima), não significa que a leitura desta
            acabou; quem manda aqui é só `concluido` (meta da semana), que troca pro botão de
            "Marcar como estudado" logo abaixo */}
        {!b.concluido && onIrParaBiblioteca && (
          <button type="button" onClick={abrirLeitor} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-medium flex items-center gap-1">
            {b.minutosFeitosSemana > 0 ? "Continuar a Leitura" : "Ler PDF"} <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {b.concluido && (
          <button type="button" onClick={onMarcarEstudado} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1">
            <Check className="h-3 w-3" /> Marcar como estudado
          </button>
        )}
      </div>
      {mostrarSubtarefas && (
        <div className="pl-3.5 ml-0.5 border-l-2 border-muted dark:border-muted space-y-0.5">
          {b.capitulos!.map((cap) => (
            <div key={cap.indice} className="w-full flex items-center gap-1.5 rounded px-1 py-0.5 -ml-1 hover:bg-muted/60 dark:hover:bg-muted/40">
              {/* bolinha: check/desmarca manualmente, independente de abrir o leitor */}
              <button
                type="button"
                onClick={() => b.pdfId && onToggleCapitulo?.(b.pdfId, cap.paginaInicio)}
                disabled={!onToggleCapitulo || !b.pdfId}
                title={cap.lido ? "Desmarcar capítulo" : "Marcar capítulo como concluído"}
                className="flex-shrink-0 disabled:cursor-default"
              >
                {cap.lido ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                )}
              </button>
              <button
                type="button"
                onClick={() => abrirCapitulo(cap)}
                disabled={!onIrParaBiblioteca || !b.pdfId}
                className="flex-1 min-w-0 text-left disabled:hover:bg-transparent"
              >
                <span
                  className={`text-[11px] truncate block ${cap.lido ? "text-muted-foreground line-through" : "text-foreground dark:text-foreground"}`}
                  title={cap.nome}
                >
                  Capítulo {cap.indice}: {cap.nome}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Questões: grupos A-D liberados + reforços fracos ────────────────────────

export function CorpoReforcos({
  reforcos, materiasAtivas, onRegistrar,
}: {
  reforcos: ReforcoGrupo[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoGrupo, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {reforcos.length} grupo{reforcos.length !== 1 ? "s" : ""} pra reforçar
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        Desempenho abaixo de {"70%"} — refaça e atualize o resultado.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {reforcos.map((r) => (
          <LinhaReforco key={r.id} r={r} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

export function CorpoQuestoes({
  questoes, materiasAtivas, onRegistrar,
}: {
  questoes: QuestaoLiberada[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (q: QuestaoLiberada, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {questoes.length} questõe{questoes.length !== 1 ? "s" : ""} liberada{questoes.length !== 1 ? "s" : ""}
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">Escalonadas pelos tópicos concluídos — sem prazo, ficam acumuladas até você registrar.</div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {questoes.map((q) => (
          <LinhaQuestao key={q.id} q={q} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

// ─── Reforço rápido: link curto pós-estudo, uma vez por tópico ──────────────

export function CorpoReforcosImediatos({
  reforcos, materiasAtivas, onRegistrar,
}: {
  reforcos: ReforcoImediatoPendente[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoImediatoPendente, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {reforcos.length} tópico{reforcos.length !== 1 ? "s" : ""} recém-estudado{reforcos.length !== 1 ? "s" : ""} com reforço pendente
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        Caderno curto (até 10 questões) pra praticar na hora — some assim que você registra o resultado.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {reforcos.map((r) => (
          <LinhaReforcoImediato key={r.id} r={r} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

function LinhaReforcoImediato({
  r, materiasAtivas, onRegistrar,
}: {
  r: ReforcoImediatoPendente;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoImediatoPendente, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const cor = resolverCorMateria(r.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  const abrirEExpandir = () => {
    window.open(r.link, "_blank", "noopener,noreferrer");
    setAberto(true);
  };

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <div className="w-full flex items-center gap-2.5">
        <button type="button" onClick={abrirEExpandir} title="Abrir questões" className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-foreground">{r.materia}</span>
            <span className="text-xs text-muted-foreground"> · tópico {r.ordemTopico}: </span>
            <span className="text-xs text-muted-foreground" title={r.topico}>{r.topico.length > 50 ? r.topico.slice(0, 50) + "…" : r.topico}</span>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
        <button type="button" onClick={() => setAberto((v) => !v)} title="Registrar resultado" className="flex-shrink-0 p-1 -m-1">
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
      </div>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1 flex-wrap">
          <a
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink className="h-3 w-3" /> Abrir questões
          </a>
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(r, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Revisão: checkpoints do link (7/30d), revisão de matéria concluída, cartas ──

export function CorpoRevisoesLink({
  revisoes, materiasAtivas, onRegistrar,
}: {
  revisoes: RevisaoLinkPendente[];
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: RevisaoLinkPendente, acertos: number, erros: number) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground dark:text-foreground">
        {revisoes.length} revisão{revisoes.length !== 1 ? "ões" : ""} de questões do link
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">
        7 e 30 dias após concluir os 4 grupos A-D do tópico — refaça as questões do link cadastrado na aba Questões.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1 -mr-1">
        {revisoes.map((r) => (
          <LinhaRevisaoLink key={r.id} r={r} materiasAtivas={materiasAtivas} onRegistrar={onRegistrar} />
        ))}
      </div>
    </div>
  );
}

function LinhaRevisaoLink({
  r, materiasAtivas, onRegistrar,
}: {
  r: RevisaoLinkPendente;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: RevisaoLinkPendente, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState(r.reforco ? String(r.acertosAtual ?? "") : "");
  const [erros, setErros] = useState(r.reforco ? String(r.errosAtual ?? "") : "");
  const cor = resolverCorMateria(r.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  // clicar na atividade vai direto pro link (nova aba) E revela o form de registro — assim
  // quando o usuário volta de fazer as questões, os campos já estão à mostra pra preencher
  const abrirEExpandir = () => {
    window.open(r.link, "_blank", "noopener,noreferrer");
    setAberto(true);
  };

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <div className="w-full flex items-center gap-2.5">
        <button type="button" onClick={abrirEExpandir} title="Abrir questões" className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-foreground">{r.materia}</span>
            <span className="text-xs text-muted-foreground"> · tópico {r.ordemTopico}: </span>
            <span className="text-xs text-muted-foreground" title={r.topico}>{r.topico.length > 50 ? r.topico.slice(0, 50) + "…" : r.topico}</span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">{r.dias}d</span>
          {r.reforco && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex-shrink-0">reforço</span>}
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
        <button type="button" onClick={() => setAberto((v) => !v)} title="Registrar resultado" className="flex-shrink-0 p-1 -m-1">
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        </button>
      </div>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1 flex-wrap">
          <a
            href={r.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink className="h-3 w-3" /> Abrir questões
          </a>
          {r.reforco && <span className="text-[10px] text-muted-foreground">{r.acertosAtual} acerto{r.acertosAtual !== 1 ? "s" : ""} / {r.errosAtual} erro{r.errosAtual !== 1 ? "s" : ""} — refaça e atualize</span>}
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(r, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

export function CorpoRevisao30({ r, onMarcar }: { r: Revisao30; onMarcar: () => void }) {
  return (
    <div className="flex items-center gap-3">
      {/* clicar na atividade vai direto pro link (nova aba) — sem link cadastrado (aba
          Questões), o botão fica desabilitado em vez de quebrar */}
      <button
        type="button"
        onClick={() => r.link && window.open(r.link, "_blank", "noopener,noreferrer")}
        disabled={!r.link}
        title={r.link ? "Abrir questões" : "Cadastre o link na aba Questões"}
        className="flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <div className="text-sm font-semibold text-foreground dark:text-foreground flex items-center gap-1.5">
          {r.materia} — revisão da matéria
          {r.link && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-muted-foreground">
          100% concluída em {fmtDataCurta(r.concluidaEm)} — <b>30 questões englobando todos os tópicos</b> (não 30 por tópico).
        </div>
      </button>
      <button type="button" onClick={onMarcar} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium">
        Concluí
      </button>
    </div>
  );
}

export function CorpoCartas({
  onIrParaCartas, onMarcar,
}: {
  onIrParaCartas?: () => void;
  onMarcar: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground dark:text-foreground">Revisar as cartas</div>
        <div className="text-[11px] text-muted-foreground">A cada 2 domingos (14 dias)</div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {onIrParaCartas && (
          <button type="button" onClick={onIrParaCartas} className="px-2.5 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-medium flex items-center gap-1">
            Ir <ArrowRight className="h-3 w-3" />
          </button>
        )}
        <button type="button" onClick={onMarcar} className="px-2.5 py-1.5 rounded-lg border border-fuchsia-300 dark:border-fuchsia-700 text-fuchsia-600 dark:text-fuchsia-300 text-[11px] font-medium">
          Marquei
        </button>
      </div>
    </div>
  );
}

// ─── Card de progresso por matéria (mini anel) ─────────────────────────────────

export function CardMateria({
  a, materiasAtivas, emRevisao,
}: {
  a: AnaliseMateria;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  emRevisao: boolean;
}) {
  const cor = resolverCorMateria(a.materia, materiasAtivas);
  const totalUnidades = a.totalTopicos * 5; // teoria (x1) + questões (4 grupos)
  const feitas = a.topicosEstudados + a.gruposFeitos;
  const perc = totalUnidades > 0 ? Math.round((feitas / totalUnidades) * 100) : 0;
  return (
    <div className="rounded-xl border border-border dark:border-border p-3 flex flex-col items-center text-center gap-1.5">
      <ProgressRing
        perc={perc}
        size={56}
        espessura={5}
        corStroke={a.materiaConcluida ? "stroke-amber-500" : "stroke-emerald-500"}
        corTrilho="stroke-border"
      >
        {a.materiaConcluida ? <Trophy className="h-4 w-4 text-amber-500" /> : <span className="text-xs font-bold text-foreground dark:text-foreground">{perc}%</span>}
      </ProgressRing>
      <span className="w-full flex items-center justify-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <span className="text-[11px] font-medium text-foreground truncate" title={a.materia}>{a.materia}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">
        {a.materiaConcluida ? (emRevisao ? "em revisão" : "100% concluída") : `teoria ${a.topicosEstudados}/${a.totalTopicos} · questões ${a.gruposFeitos}/${a.totalTopicos * 4}`}
      </span>
    </div>
  );
}

// ─── Linha de questão liberada (registro inline de acertos/erros) ────────────

function LinhaQuestao({
  q, materiasAtivas, onRegistrar,
}: {
  q: QuestaoLiberada;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (q: QuestaoLiberada, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState("");
  const [erros, setErros] = useState("");
  const cor = resolverCorMateria(q.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 text-left">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${GRUPO_BADGE[q.grupo]}`}>{GRUPO_LABEL[q.grupo]}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">{q.materia}</span>
          <span className="text-xs text-muted-foreground"> · tópico {q.ordemTopico}: </span>
          <span className="text-xs text-muted-foreground" title={q.topico}>{q.topico.length > 50 ? q.topico.slice(0, 50) + "…" : q.topico}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-[10px] text-muted-foreground flex-1">{q.motivo}</span>
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(q, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Linha de grupo pra reforçar — igual à de questão liberada, mas com os inputs pré-preenchidos
// (o usuário está corrigindo um resultado existente, não começando do zero) e um badge de % ────

function LinhaReforco({
  r, materiasAtivas, onRegistrar,
}: {
  r: ReforcoGrupo;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onRegistrar: (r: ReforcoGrupo, acertos: number, erros: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [acertos, setAcertos] = useState(String(r.acertos));
  const [erros, setErros] = useState(String(r.erros));
  const cor = resolverCorMateria(r.materia, materiasAtivas);
  const podeSalvar = acertos !== "" && erros !== "" && Number(acertos) + Number(erros) > 0;

  return (
    <div className="rounded-lg hover:bg-accent dark:hover:bg-muted/40 px-2 py-1.5 -mx-2 transition-colors">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2.5 text-left">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${GRUPO_BADGE[r.grupo]}`}>{GRUPO_LABEL[r.grupo]}</span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.dot}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground">{r.materia}</span>
          <span className="text-xs text-muted-foreground"> · tópico {r.ordemTopico}: </span>
          <span className="text-xs text-muted-foreground" title={r.topico}>{r.topico.length > 50 ? r.topico.slice(0, 50) + "…" : r.topico}</span>
        </div>
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 flex-shrink-0">{r.perc}%</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex items-center gap-2 pl-1">
          <span className="text-[10px] text-muted-foreground flex-1">{r.acertos} acerto{r.acertos !== 1 ? "s" : ""} / {r.erros} erro{r.erros !== 1 ? "s" : ""} — refaça e atualize</span>
          <label className="text-[11px] text-muted-foreground">Acertos</label>
          <input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <label className="text-[11px] text-muted-foreground">Erros</label>
          <input type="number" min={0} value={erros} onChange={(e) => setErros(e.target.value)} className="w-16 bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground dark:text-foreground outline-none focus:border-emerald-400" />
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={() => onRegistrar(r, Number(acertos), Number(erros))}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
