"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, GraduationCap, Loader2, Mic, MicOff, PhoneOff, Sparkles, Volume2,
} from "lucide-react";
import {
  MATERIAS, topicoKey,
  type MateriaConcurso, type MateriaDef, type TopicoState,
} from "@/lib/estudo-data";
import { nomeProfessora, DURACAO_MAX_SESSAO_MIN } from "@/lib/professora-data";
import { resolverCorMateria } from "./trilha/trilha-ui";
import { useProfessoraRealtime } from "./professora/useProfessoraRealtime";

// Aba "Professora": sabatina ORAL com uma professora IA especialista por matéria (voz feminina,
// OpenAI Realtime via WebRTC — ver useProfessoraRealtime pro fluxo de conexão). Sessão puramente
// de treino: NADA é salvo no progresso. Tela A = escolher a matéria (cada uma tem sua professora
// com nome próprio); Tela B = a conversa ao vivo com transcrição.

interface Props {
  topicos: Record<string, TopicoState>;
  materiasConcurso?: MateriaConcurso[];
  concursoNome?: string;
}

export default function ProfessoraTab({ topicos, materiasConcurso, concursoNome }: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);
  const materia = materiasAtivas.find((m) => m.nome === materiaSelecionada) ?? null;

  return materia ? (
    <Sessao
      materia={materia}
      materiasAtivas={materiasAtivas}
      topicos={topicos}
      concursoNome={concursoNome}
      onVoltar={() => setMateriaSelecionada(null)}
    />
  ) : (
    <SelecaoMateria
      materiasAtivas={materiasAtivas}
      topicos={topicos}
      onSelecionar={setMateriaSelecionada}
    />
  );
}

// ─── Tela A: escolha da matéria/professora ───────────────────────────────────

function SelecaoMateria({
  materiasAtivas, topicos, onSelecionar,
}: {
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  topicos: Record<string, TopicoState>;
  onSelecionar: (nome: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-6 w-6" />
          <div>
            <div className="text-lg font-bold">Professora particular</div>
            <div className="text-xs text-violet-100">
              Escolha a matéria e converse por voz: ela pergunta, você responde falando — ela corrige quando
              você erra e comemora quando acerta. Sessão de treino: nada é salvo no seu progresso.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {materiasAtivas.map((m) => {
          const cor = resolverCorMateria(m.nome, materiasAtivas);
          const estudados = m.topicos.filter((t) => topicos[topicoKey(m.nome, t)]?.estudado).length;
          return (
            <button
              key={m.nome}
              type="button"
              onClick={() => onSelecionar(m.nome)}
              className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-9 h-9 rounded-full ${cor.dot} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {nomeProfessora(m.nome)[0]}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Profª {nomeProfessora(m.nome)}
                  </div>
                  <div className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block max-w-full truncate ${cor.badge}`}>
                    {m.nome}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500">
                {estudados}/{m.topicos.length} tópicos estudados · {m.topicos.length} no edital
              </div>
              <div className="mt-2 text-[11px] font-medium text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Mic className="h-3 w-3" /> Iniciar sabatina →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tela B: sessão de voz ───────────────────────────────────────────────────

function Sessao({
  materia, materiasAtivas, topicos, concursoNome, onVoltar,
}: {
  materia: MateriaDef | MateriaConcurso;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  topicos: Record<string, TopicoState>;
  concursoNome?: string;
  onVoltar: () => void;
}) {
  const {
    status, falando, ouvindo, mutado, erro, mensagens, segundosRestantes,
    audioRef, iniciar, encerrar, alternarMute,
  } = useProfessoraRealtime();

  const cor = resolverCorMateria(materia.nome, materiasAtivas);
  const nome = nomeProfessora(materia.nome);
  const fimRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  const topicosEstudados = useMemo(
    () => materia.topicos.filter((t) => topicos[topicoKey(materia.nome, t)]?.estudado),
    [materia, topicos]
  );

  const handleIniciar = () => {
    iniciar({
      materiaNome: materia.nome,
      topicos: materia.topicos,
      concursoNome,
      topicosEstudados,
    });
  };

  const emSessao = status === "pedindo_mic" || status === "conectando" || status === "ativa";
  const mmss = segundosRestantes !== null
    ? `${Math.floor(segundosRestantes / 60)}:${String(segundosRestantes % 60).padStart(2, "0")}`
    : null;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* header da sessão */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { encerrar(); onVoltar(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Voltar pra escolha de matéria"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative">
              <span className={`w-11 h-11 rounded-full ${cor.dot} text-white flex items-center justify-center font-bold`}>
                {nome[0]}
              </span>
              {status === "ativa" && (
                <motion.span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                    falando ? "bg-blue-500" : ouvindo ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  animate={falando || ouvindo ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Profª {nome}</div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cor.badge}`}>{materia.nome}</span>
                <span className="text-[11px] text-gray-400">
                  {status === "ociosa" && "pronta pra começar"}
                  {status === "pedindo_mic" && "aguardando microfone…"}
                  {status === "conectando" && "conectando…"}
                  {status === "ativa" && (falando ? "falando…" : ouvindo ? "ouvindo você…" : "esperando você falar")}
                  {status === "encerrada" && "sessão encerrada"}
                  {status === "erro" && "erro na sessão"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {emSessao && mmss && (
              <span
                className={`text-xs font-mono px-2 py-1 rounded-md ${
                  segundosRestantes! <= 60
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
                title={`A sessão encerra sozinha em ${DURACAO_MAX_SESSAO_MIN} min (limite de custo)`}
              >
                {mmss}
              </span>
            )}
            {status === "ativa" && (
              <button
                type="button"
                onClick={alternarMute}
                title={mutado ? "Reativar microfone" : "Silenciar microfone"}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                  mutado
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {mutado ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {emSessao ? (
              <button
                type="button"
                onClick={encerrar}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
              >
                <PhoneOff className="h-3.5 w-3.5" /> Encerrar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleIniciar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
              >
                <Mic className="h-3.5 w-3.5" /> {status === "encerrada" || status === "erro" ? "Nova sessão" : "Iniciar sabatina"}
              </button>
            )}
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {erro}
        </div>
      )}

      {/* transcrição ao vivo */}
      {status === "ociosa" && !erro ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <Volume2 className="h-8 w-8 mx-auto mb-3 text-violet-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
            A Profª {nome} vai fazer perguntas de {materia.nome} em voz alta.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            Responda falando normalmente — ela corrige o que faltar e comemora seus acertos.
            {topicosEstudados.length > 0 && ` Ela vai priorizar os ${topicosEstudados.length} tópicos que você já estudou.`}{" "}
            Use fones de ouvido pra ela não ouvir a si mesma. A sessão dura no máximo {DURACAO_MAX_SESSAO_MIN} minutos.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(status === "pedindo_mic" || status === "conectando") && mensagens.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === "pedindo_mic" ? "Aguardando permissão do microfone…" : "Conectando com a professora…"}
            </div>
          )}
          {mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.autor === "usuario" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.autor === "usuario"
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md"
                } ${m.parcial ? "opacity-70" : ""}`}
              >
                {m.autor === "professora" && (
                  <div className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 mb-0.5 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Profª {nome}
                  </div>
                )}
                {m.texto}
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>
      )}

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-600">
        Sessão de treino — nada é salvo no seu progresso.
      </p>

      {/* áudio remoto da professora (invisível — só o som) */}
      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
}
