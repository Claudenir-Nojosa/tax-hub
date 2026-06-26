"use client";

import { useState, useMemo, useRef } from "react";
import {
  Swords, Zap, Gem, Plus, Star, ChevronRight, ArrowLeft,
  Layers, Flame, CheckCircle2, Trophy, Eye,
  XCircle, AlertTriangle, BookOpen, Upload, Loader2,
} from "lucide-react";
import {
  type Carta, type TipoCarta, MATERIAS, calcularProximaRevisao,
} from "@/lib/estudo-data";

// ── Configuração visual por tipo ──────────────────────────────────────────────
const CARTA_CONFIG = {
  monstro: {
    nome: "Monstro",
    texto: "CARTA MONSTRO",
    descricao: "Pergunta dissertativa aberta para testar compreensão profunda",
    icone: Swords,
    cor: "from-blue-900 to-indigo-950",
    borda: "border-blue-500",
    sombra: "shadow-blue-500/20",
    badge: "bg-blue-600",
    glow: "shadow-blue-500/40",
  },
  armadilha: {
    nome: "Armadilha",
    texto: "CARTA ARMADILHA",
    descricao: "Afirmação Verdadeiro ou Falso para testar precisão conceitual",
    icone: Zap,
    cor: "from-red-900 to-rose-950",
    borda: "border-red-500",
    sombra: "shadow-red-500/20",
    badge: "bg-red-600",
    glow: "shadow-red-500/40",
  },
  tesouro: {
    nome: "Tesouro",
    texto: "CARTA TESOURO",
    descricao: "Complete a lacuna — preencha o trecho que falta",
    icone: Gem,
    cor: "from-amber-900 to-yellow-950",
    borda: "border-amber-400",
    sombra: "shadow-amber-400/20",
    badge: "bg-amber-500",
    glow: "shadow-amber-400/40",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

function novaCarta(dados: Partial<Carta>): Carta {
  const d = hoje();
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    tipo: "monstro",
    frente: "",
    verso: "",
    intervalo: 0,
    facilidade: 2.5,
    repeticoes: 0,
    proximaRevisao: d,
    criada: d,
    acertos: 0,
    erros: 0,
    ...dados,
  };
}

function labelDue(carta: Carta): { texto: string; urgente: boolean } {
  const hj = hoje();
  if (carta.proximaRevisao <= hj) return { texto: "Revisar agora!", urgente: true };
  const diff = Math.round(
    (new Date(carta.proximaRevisao + "T12:00:00").getTime() - new Date(hj + "T12:00:00").getTime()) / 86400000
  );
  return { texto: `Em ${diff}d`, urgente: false };
}

// ── CartaVisual ───────────────────────────────────────────────────────────────
function CartaVisual({ carta, onExcluir }: { carta: Carta; onExcluir: (id: string) => void }) {
  const cfg = CARTA_CONFIG[carta.tipo];
  const Icon = cfg.icone;
  const due = labelDue(carta);
  const taxa = carta.acertos + carta.erros > 0
    ? Math.round((carta.acertos / (carta.acertos + carta.erros)) * 100)
    : null;

  return (
    <div className={`relative rounded-2xl border-2 ${cfg.borda} bg-gradient-to-b ${cfg.cor} shadow-xl ${cfg.sombra} p-4 flex flex-col gap-3 group`}>
      <button
        onClick={() => onExcluir(carta.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 text-xs font-bold px-1"
        title="Excluir carta"
      >
        ✕
      </button>
      <div className={`inline-flex items-center gap-1 ${cfg.badge} rounded-full px-2 py-0.5 w-fit`}>
        <Icon className="h-3 w-3 text-white" />
        <span className="text-[10px] font-bold text-white tracking-wider">{cfg.texto}</span>
      </div>
      <p className="text-sm text-white/90 leading-snug line-clamp-3 flex-1">{carta.frente}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 truncate max-w-[55%]">{carta.materia ?? "Geral"}</span>
        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${due.urgente ? "text-amber-400" : "text-white/40"}`}>
          {due.urgente && <Flame className="h-2.5 w-2.5" />}
          {due.texto}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-white/30 border-t border-white/10 pt-2">
        <span>✓ {carta.acertos}</span>
        <span>✗ {carta.erros}</span>
        {taxa !== null && <span className={taxa >= 70 ? "text-emerald-400" : taxa >= 50 ? "text-amber-400" : "text-red-400"}>{taxa}%</span>}
        <span className="ml-auto">#{carta.repeticoes} rev.</span>
      </div>
    </div>
  );
}

// ── SessaoRevisao ─────────────────────────────────────────────────────────────
function SessaoRevisao({
  cartasParaRevisar,
  onConcluir,
}: {
  cartasParaRevisar: Carta[];
  onConcluir: (atualizadas: Carta[]) => void;
}) {
  const fila = useMemo(
    () => [...cartasParaRevisar].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [resultado, setResultado] = useState<Carta[]>([]);
  const [xpGanho, setXpGanho] = useState(0);
  const [xpFlash, setXpFlash] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const carta = fila[idx];

  function avaliar(qualidade: 0 | 1 | 2 | 3 | 4 | 5) {
    const atualizada = calcularProximaRevisao(carta, qualidade);
    const novoResultado = [...resultado, atualizada];
    const xpExtra = qualidade >= 3 ? 2 : 0;
    const novoXP = xpGanho + xpExtra;
    if (xpExtra > 0) {
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 900);
    }
    if (idx + 1 >= fila.length) {
      setResultado(novoResultado);
      setXpGanho(novoXP);
      setConcluido(true);
    } else {
      setResultado(novoResultado);
      setXpGanho(novoXP);
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  if (concluido) {
    const acertos = resultado.filter((_, i) => fila[i] && resultado[i].acertos > fila[i].acertos).length;
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <Trophy className="h-20 w-20 text-amber-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sessão concluída!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {fila.length} carta{fila.length !== 1 ? "s" : ""} revisada{fila.length !== 1 ? "s" : ""}
        </p>
        <div className="text-4xl font-bold text-amber-500 mb-2">+{xpGanho} XP ⚡</div>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          {acertos} acerto{acertos !== 1 ? "s" : ""} · {fila.length - acertos} erro{fila.length - acertos !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => onConcluir(resultado)}
          className="bg-[#007cca] hover:bg-[#006bb0] text-white px-8 py-3 rounded-xl font-semibold transition-all"
        >
          Ver Baralhos
        </button>
      </div>
    );
  }

  const cfg = CARTA_CONFIG[carta.tipo];
  const Icon = cfg.icone;

  return (
    <div className="flex flex-col items-center px-2">
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="font-medium">{idx + 1} / {fila.length} cartas</span>
          <span className="text-amber-500 font-bold">+{xpGanho} XP</span>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-[#007cca] rounded-full h-2 transition-all duration-500"
            style={{ width: `${(idx / fila.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={`relative w-full max-w-lg rounded-2xl border-2 ${cfg.borda} bg-gradient-to-b ${cfg.cor} shadow-2xl ${cfg.glow} p-6 mb-6 min-h-[280px] flex flex-col`}>
        {xpFlash && (
          <div className="absolute top-3 right-4 text-amber-400 font-bold text-xl pointer-events-none animate-bounce">
            +2 XP ⚡
          </div>
        )}
        <div className={`inline-flex items-center gap-1.5 ${cfg.badge} rounded-full px-3 py-1 mb-4 w-fit`}>
          <Icon className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-bold text-white tracking-wider">{cfg.texto}</span>
        </div>

        {!flipped ? (
          <div className="flex flex-col flex-1">
            <p className="text-lg text-white font-medium leading-relaxed flex-1">{carta.frente}</p>
            {carta.materia && (
              <p className="text-xs text-white/40 mt-3">{carta.materia}{carta.topico ? ` · ${carta.topico}` : ""}</p>
            )}
            <button
              onClick={() => setFlipped(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-semibold transition-all"
            >
              <Eye className="h-4 w-4" />
              Ver Resposta
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="mb-4">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Pergunta</p>
              <p className="text-sm text-white/60 leading-relaxed">{carta.frente}</p>
            </div>
            <div className="border-t border-white/15 pt-4 flex-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Resposta</p>
              {carta.tipo === "armadilha" && carta.gabarito && (
                <p className={`text-sm font-bold mb-2 ${carta.gabarito === "verdadeiro" ? "text-emerald-400" : "text-red-400"}`}>
                  {carta.gabarito === "verdadeiro" ? "✓ VERDADEIRO" : "✗ FALSO"}
                </p>
              )}
              <p className="text-base text-white font-medium leading-relaxed">{carta.verso}</p>
            </div>
          </div>
        )}
      </div>

      {flipped && (
        <div className="grid grid-cols-4 gap-2 w-full max-w-lg">
          {(
            [
              { label: "Errei",   q: 0 as const, cor: "bg-red-600 hover:bg-red-500",         Icon: XCircle },
              { label: "Difícil", q: 2 as const, cor: "bg-orange-500 hover:bg-orange-400",   Icon: AlertTriangle },
              { label: "Lembrei", q: 4 as const, cor: "bg-blue-600 hover:bg-blue-500",       Icon: CheckCircle2 },
              { label: "Fácil",   q: 5 as const, cor: "bg-emerald-600 hover:bg-emerald-500", Icon: Star },
            ] as const
          ).map(({ label, q, cor, Icon: BtnIcon }) => (
            <button
              key={label}
              onClick={() => avaliar(q)}
              className={`${cor} text-white py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1 transition-all active:scale-95 shadow-md`}
            >
              <BtnIcon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FormCriarCarta ────────────────────────────────────────────────────────────
function FormCriarCarta({
  onSalvar,
  onCancelar,
  materiaDefault,
}: {
  onSalvar: (carta: Carta) => void;
  onCancelar: () => void;
  materiaDefault?: string;
}) {
  const [tipo, setTipo] = useState<TipoCarta>("monstro");
  const [materia, setMateria] = useState(materiaDefault ?? "");
  const [topico, setTopico] = useState("");
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [gabarito, setGabarito] = useState<"verdadeiro" | "falso">("verdadeiro");

  const topicosDisponiveis = useMemo(
    () => MATERIAS.find((m) => m.nome === materia)?.topicos ?? [],
    [materia]
  );

  const podesSalvar = frente.trim().length > 0 && verso.trim().length > 0;

  function salvar() {
    if (!podesSalvar) return;
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
  }

  const frenteLabel =
    tipo === "monstro" ? "Pergunta dissertativa" :
    tipo === "armadilha" ? "Afirmação (Verdadeiro ou Falso?)" :
    "Texto com lacuna (use ___ para indicar a lacuna)";

  const versoLabel =
    tipo === "monstro" ? "Resposta / Gabarito" :
    tipo === "armadilha" ? "Explicação da resposta" :
    "Texto completo (preenche a lacuna)";

  const frentePlaceholder =
    tipo === "monstro" ? "Ex: Explique a diferença entre isenção e imunidade tributária." :
    tipo === "armadilha" ? "Ex: A isenção impede o aproveitamento do crédito de ICMS." :
    "Ex: O lançamento por homologação ocorre quando ___.";

  const versoPlaceholder =
    tipo === "monstro" ? "Ex: A isenção é a dispensa legal do pagamento do tributo devido, enquanto a imunidade é uma vedação constitucional..." :
    tipo === "armadilha" ? "Ex: A afirmação é FALSA. O STF firmou que a isenção não gera direito ao crédito de ICMS porque..." :
    "Ex: O lançamento por homologação ocorre quando a legislação atribui ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade administrativa.";

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Carta</h2>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-3">Tipo de Carta</label>
        <div className="grid grid-cols-3 gap-3">
          {(["monstro", "armadilha", "tesouro"] as TipoCarta[]).map((t) => {
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
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Icon className={`h-6 w-6 ${sel ? "text-white" : "text-gray-400 dark:text-gray-500"}`} />
                <span className={`text-xs font-bold ${sel ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>{cfg.nome}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{CARTA_CONFIG[tipo].descricao}</p>
      </div>

      <div className={`grid gap-3 mb-4 ${topicosDisponiveis.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">Matéria</label>
          <select
            value={materia}
            onChange={(e) => { setMateria(e.target.value); setTopico(""); }}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#007cca]"
          >
            <option value="">Geral (sem matéria)</option>
            {MATERIAS.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
          </select>
        </div>
        {topicosDisponiveis.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">Tópico</label>
            <select
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#007cca]"
            >
              <option value="">Todos os tópicos</option>
              {topicosDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">{frenteLabel}</label>
        <textarea
          value={frente}
          onChange={(e) => setFrente(e.target.value)}
          rows={3}
          placeholder={frentePlaceholder}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#007cca] resize-none"
        />
      </div>

      {tipo === "armadilha" && (
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Gabarito</label>
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
                    : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                }`}
              >
                {g === "verdadeiro" ? "✓ Verdadeiro" : "✗ Falso"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">{versoLabel}</label>
        <textarea
          value={verso}
          onChange={(e) => setVerso(e.target.value)}
          rows={4}
          placeholder={versoPlaceholder}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#007cca] resize-none"
        />
      </div>

      <button
        onClick={salvar}
        disabled={!podesSalvar}
        className="w-full bg-[#007cca] hover:bg-[#006bb0] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all"
      >
        Criar Carta
      </button>
    </div>
  );
}

// ── BaralhoItem ───────────────────────────────────────────────────────────────
function BaralhoItem({
  displayName,
  cartas,
  onEntrar,
  onRevisar,
}: {
  displayName: string;
  cartas: Carta[];
  onEntrar: () => void;
  onRevisar: () => void;
}) {
  const hj = hoje();
  const dueCount = cartas.filter((c) => c.proximaRevisao <= hj).length;
  const acertos = cartas.reduce((s, c) => s + c.acertos, 0);
  const total = cartas.reduce((s, c) => s + c.acertos + c.erros, 0);
  const taxa = total > 0 ? Math.round((acertos / total) * 100) : null;

  const monstro = cartas.filter((c) => c.tipo === "monstro").length;
  const armadilha = cartas.filter((c) => c.tipo === "armadilha").length;
  const tesouro = cartas.filter((c) => c.tipo === "tesouro").length;

  return (
    <div
      onClick={onEntrar}
      className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 cursor-pointer hover:border-[#007cca] hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <BookOpen className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{cartas.length} carta{cartas.length !== 1 ? "s" : ""}</span>
          {monstro > 0 && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">{monstro}M</span>}
          {armadilha > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">{armadilha}A</span>}
          {tesouro > 0 && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">{tesouro}T</span>}
          {taxa !== null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              taxa >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
              taxa >= 50 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
              "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}>{taxa}%</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {dueCount > 0 && (
          <>
            <span className="hidden sm:inline text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-full">
              {dueCount} hoje
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRevisar(); }}
              className="bg-[#007cca] hover:bg-[#006bb0] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              Revisar
            </button>
          </>
        )}
        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-[#007cca] transition-colors" />
      </div>
    </div>
  );
}

// ── ImportReviewScreen ────────────────────────────────────────────────────────
function ImportReviewScreen({
  sugestoes,
  selecionadas,
  onToggle,
  onToggleAll,
  onSalvar,
  onCancelar,
}: {
  sugestoes: Carta[];
  selecionadas: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (selecionar: boolean) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const countSel = selecionadas.size;
  const todasSelecionadas = countSel === sugestoes.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 min-h-[500px] flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cartas Geradas pela IA</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {sugestoes.length} sugestão{sugestoes.length !== 1 ? "ões" : ""} · Selecione as que deseja salvar
          </p>
        </div>
        <button
          onClick={() => onToggleAll(!todasSelecionadas)}
          className="text-xs text-[#007cca] hover:underline font-medium flex-shrink-0"
        >
          {todasSelecionadas ? "Desmarcar todas" : "Marcar todas"}
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
        {sugestoes.map((carta) => {
          const cfg = CARTA_CONFIG[carta.tipo];
          const Icon = cfg.icone;
          const sel = selecionadas.has(carta.id);
          return (
            <div
              key={carta.id}
              onClick={() => onToggle(carta.id)}
              className={`flex gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                sel
                  ? `${cfg.borda} bg-gradient-to-r ${cfg.cor} shadow-lg`
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                sel ? "border-white bg-white/20" : "border-gray-300 dark:border-gray-600"
              }`}>
                {sel && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`inline-flex items-center gap-1 ${cfg.badge} rounded-full px-2 py-0.5 mb-1.5`}>
                  <Icon className="h-2.5 w-2.5 text-white" />
                  <span className="text-[9px] font-bold text-white tracking-wider">{cfg.texto}</span>
                </div>
                <p className={`text-sm font-medium leading-snug mb-1 ${sel ? "text-white" : "text-gray-800 dark:text-gray-200"}`}>
                  {carta.frente}
                </p>
                {carta.tipo === "armadilha" && carta.gabarito && (
                  <p className={`text-xs font-bold mb-1 ${carta.gabarito === "verdadeiro" ? "text-emerald-400" : "text-red-400"}`}>
                    {carta.gabarito === "verdadeiro" ? "✓ VERDADEIRO" : "✗ FALSO"}
                  </p>
                )}
                <p className={`text-xs leading-relaxed line-clamp-2 ${sel ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                  {carta.verso}
                </p>
                {carta.materia && (
                  <p className={`text-[10px] mt-1.5 font-medium ${sel ? "text-white/50" : "text-gray-400 dark:text-gray-500"}`}>
                    {carta.materia}{carta.topico ? ` · ${carta.topico}` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onSalvar}
          disabled={countSel === 0}
          className="w-full bg-[#007cca] hover:bg-[#006bb0] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all"
        >
          Salvar {countSel} carta{countSel !== 1 ? "s" : ""} selecionada{countSel !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

// ── CartasTab principal ───────────────────────────────────────────────────────
export default function CartasTab({
  cartas,
  onChange,
}: {
  cartas: Carta[];
  onChange: (cartas: Carta[]) => void;
}) {
  const [view, setView] = useState<"home" | "criar" | "revisar" | "importar">("home");
  const [baralhoAtivo, setBaralhoAtivo] = useState<string | null>(null);
  const [cartasParaRevisarAtual, setCartasParaRevisarAtual] = useState<Carta[]>([]);
  const [criarComMateria, setCriarComMateria] = useState<string | undefined>(undefined);
  const [importLoading, setImportLoading] = useState(false);
  const [sugestoesImport, setSugestoesImport] = useState<Carta[]>([]);
  const [selecionadasImport, setSelecionadasImport] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleXMindImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/cartas", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Erro ao processar arquivo");
      }
      const { cartas: sugestoes } = await res.json() as { cartas: Carta[] };
      setSugestoesImport(sugestoes);
      setSelecionadasImport(new Set(sugestoes.map((c) => c.id)));
      setView("importar");
    } catch (err) {
      alert("Erro ao importar XMind: " + (err instanceof Error ? err.message : "Tente novamente"));
    } finally {
      setImportLoading(false);
    }
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
    setView("home");
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 min-h-[500px]">
        <FormCriarCarta
          onSalvar={handleSalvarCarta}
          onCancelar={() => setView("home")}
          materiaDefault={criarComMateria}
        />
      </div>
    );
  }

  // ── View: revisar ──
  if (view === "revisar") {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 min-h-[500px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("home")} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sessão de Revisão</h2>
          <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
            {cartasParaRevisarAtual.length} cartas
          </span>
        </div>
        <SessaoRevisao cartasParaRevisar={cartasParaRevisarAtual} onConcluir={handleConcluirRevisao} />
      </div>
    );
  }

  // ── View: importar ──
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

  // ── View: home ────────────────────────────────────────────────────────────
  const baralhoAtivoDisplay = baralhoAtivo === "__geral__" ? "Geral (sem matéria)" : baralhoAtivo;

  return (
    <div className="space-y-5">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xmind"
        className="hidden"
        onChange={handleXMindImport}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {baralhoAtivo && (
            <button
              onClick={() => setBaralhoAtivo(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {baralhoAtivo ? baralhoAtivoDisplay : "Meus Baralhos"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCriarComMateria(baralhoAtivo && baralhoAtivo !== "__geral__" ? baralhoAtivo : undefined);
              setView("criar");
            }}
            className="flex items-center gap-2 bg-[#007cca] hover:bg-[#006bb0] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
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
            {[
              { label: "Total de Cartas", value: cartas.length, Icon: Layers, cor: "text-[#007cca]", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Para Hoje", value: paraHoje.length, Icon: Flame, cor: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
              { label: "XP de Cartas", value: `${xpCartas} XP`, Icon: Star, cor: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
              { label: "Acertos Totais", value: cartas.reduce((s, c) => s + c.acertos, 0), Icon: CheckCircle2, cor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg mx-auto mb-2 ${s.bg}`}>
                  <s.Icon className={`h-5 w-5 ${s.cor}`} />
                </div>
                <div className={`text-xl font-bold ${s.cor}`}>{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
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
              <Layers className="h-14 w-14 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium mb-1">Nenhum baralho criado ainda.</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mb-6">Crie cartas para começar a revisão espaçada inteligente.</p>
              <button
                onClick={() => { setCriarComMateria(undefined); setView("criar"); }}
                className="flex items-center gap-2 bg-[#007cca] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md"
              >
                <Plus className="h-4 w-4" /> Criar primeira carta
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
          {/* CTA revisar este baralho */}
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

          {/* Tipos no baralho */}
          {cartasBaralho.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {(["monstro", "armadilha", "tesouro"] as TipoCarta[]).map((t) => {
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

          {/* Grid de cartas */}
          {cartasBaralho.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-14 w-14 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma carta neste baralho ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cartasBaralho.map((carta) => (
                <CartaVisual key={carta.id} carta={carta} onExcluir={handleExcluir} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
