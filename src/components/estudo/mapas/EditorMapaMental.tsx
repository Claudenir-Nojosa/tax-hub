"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bold, Italic, ImagePlus, Plus, Trash2, X, ZoomIn, ZoomOut, Minus,
  CornerDownRight, GitBranch,
} from "lucide-react";
import type { MapaMental, MateriaConcurso, MateriaDef, NoMapaMental } from "@/lib/estudo-data";
import {
  calcularLayout, criarNo, encontrarNo, encontrarPai,
  adicionarFilho, adicionarIrmao, removerNo, atualizarNo, comprimirImagem,
  PALETA_RAMOS, type NoPosicionado,
} from "./mapa-utils";

// Editor fullscreen do mapa mental: canvas com pan/zoom (arrastar fundo, roda do mouse ou botões
// +/-), nós posicionados por calcularLayout() (raiz central, ramos esquerda/direita — ver
// mapa-utils.ts), e um painel lateral pro nó selecionado (texto, negrito/itálico, cores de
// texto/fundo/borda, imagem, adicionar filho/irmão, excluir, colapsar). Atalhos: Tab = novo
// filho, Enter = novo irmão, Delete/Backspace = excluir — só quando o foco NÃO está num
// input/textarea (senão atrapalharia digitar texto normalmente).

const ORIGIN_X = 3000;
const ORIGIN_Y = 2000;
const PALETA_CORES = ["#ffffff", "#111827", "#ef4444", "#f97316", "#eab308", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function corComAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

interface Props {
  mapa: MapaMental;
  materiasAtivas: (MateriaDef | MateriaConcurso)[];
  onChange: (mapa: MapaMental) => void;
  onFechar: () => void;
}

export default function EditorMapaMental({ mapa, materiasAtivas, onChange, onFechar }: Props) {
  const [mapaLocal, setMapaLocal] = useState<MapaMental>(mapa);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(mapa.raiz.id);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const arrastoRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const moveuRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputImagemRef = useRef<HTMLInputElement>(null);

  const layout = useMemo(() => calcularLayout(mapaLocal.raiz), [mapaLocal.raiz]);
  const noSelecionado: NoMapaMental | null = selecionadoId ? encontrarNo(mapaLocal.raiz, selecionadoId) : null;
  const ehRaiz = selecionadoId === mapaLocal.raiz.id;
  const posSelecionado: NoPosicionado | undefined = useMemo(
    () => layout.nos.find((n) => n.no.id === selecionadoId),
    [layout.nos, selecionadoId]
  );

  const topicosDaMateria = materiasAtivas.find((m) => m.nome === mapaLocal.materia)?.topicos ?? [];

  // centraliza a raiz na primeira renderização (usa o tamanho real do viewport)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    setPan({ x: rect.width / 2 - ORIGIN_X, y: rect.height / 2 - ORIGIN_Y });
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [selecionadoId]);

  // propaga mudanças pro pai num efeito (não durante o updater do setMapaLocal — chamar o
  // onChange do pai de dentro de um updater de setState é o anti-padrão "setState durante o
  // render de outro componente", que o React acusa em dev). Deps só em [mapaLocal] de propósito:
  // o `onChange` do MapasMentaisTab é uma arrow function recriada a cada render do pai, e se
  // entrasse nas deps criaria um loop (efeito dispara -> onChange -> setState no pai -> pai
  // re-renderiza -> novo onChange -> efeito dispara de novo).
  const montandoRef = useRef(true);
  useEffect(() => {
    if (montandoRef.current) { montandoRef.current = false; return; }
    onChange(mapaLocal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaLocal]);

  const salvarCampo = useCallback((patch: Partial<MapaMental>) => {
    setMapaLocal((prev) => ({ ...prev, ...patch, atualizadoEm: new Date().toISOString() }));
  }, []);

  const mutarRaiz = useCallback((fn: (raiz: NoMapaMental) => NoMapaMental) => {
    setMapaLocal((prev) => ({ ...prev, raiz: fn(prev.raiz), atualizadoEm: new Date().toISOString() }));
  }, []);

  const atualizarSelecionado = useCallback(
    (patch: Partial<NoMapaMental>) => {
      if (!selecionadoId) return;
      mutarRaiz((raiz) => atualizarNo(raiz, selecionadoId, patch));
    },
    [selecionadoId, mutarRaiz]
  );

  const adicionarFilhoAoSelecionado = useCallback(() => {
    if (!selecionadoId) return;
    const novo = criarNo();
    mutarRaiz((raiz) => adicionarFilho(raiz, selecionadoId, novo));
    setSelecionadoId(novo.id);
  }, [selecionadoId, mutarRaiz]);

  const adicionarIrmaoAoSelecionado = useCallback(() => {
    if (!selecionadoId || ehRaiz) return;
    const pai = encontrarPai(mapaLocal.raiz, selecionadoId);
    if (!pai) return;
    const novo = criarNo();
    mutarRaiz((raiz) => adicionarIrmao(raiz, pai.id, selecionadoId, novo));
    setSelecionadoId(novo.id);
  }, [selecionadoId, ehRaiz, mapaLocal.raiz, mutarRaiz]);

  const excluirSelecionado = useCallback(() => {
    if (!selecionadoId || ehRaiz) return;
    if (!confirm("Excluir este nó e todos os seus filhos?")) return;
    const pai = encontrarPai(mapaLocal.raiz, selecionadoId);
    mutarRaiz((raiz) => removerNo(raiz, selecionadoId));
    setSelecionadoId(pai?.id ?? mapaLocal.raiz.id);
  }, [selecionadoId, ehRaiz, mapaLocal.raiz, mutarRaiz]);

  const toggleColapso = useCallback(
    (id: string) => {
      const no = encontrarNo(mapaLocal.raiz, id);
      if (!no) return;
      mutarRaiz((raiz) => atualizarNo(raiz, id, { colapsado: !no.colapsado }));
    },
    [mapaLocal.raiz, mutarRaiz]
  );

  // atalhos de teclado — ignora quando o foco está num campo de texto (senão Enter/Tab/Delete
  // quebrariam a digitação normal no textarea do painel)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const alvo = document.activeElement;
      const digitando = alvo instanceof HTMLElement && (alvo.tagName === "TEXTAREA" || alvo.tagName === "INPUT");
      if (e.key === "Escape") {
        if (digitando) (alvo as HTMLElement).blur();
        else setSelecionadoId(null);
        return;
      }
      if (digitando) return;
      if (e.key === "Tab") { e.preventDefault(); adicionarFilhoAoSelecionado(); }
      else if (e.key === "Enter") { e.preventDefault(); adicionarIrmaoAoSelecionado(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); excluirSelecionado(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [adicionarFilhoAoSelecionado, adicionarIrmaoAoSelecionado, excluirSelecionado]);

  const zoomEm = useCallback((cursorX: number, cursorY: number, fator: number) => {
    setZoom((z) => {
      const novo = Math.min(2.5, Math.max(0.3, z * fator));
      const razao = novo / z;
      setPan((p) => ({ x: cursorX - razao * (cursorX - p.x), y: cursorY - razao * (cursorY - p.y) }));
      return novo;
    });
  }, []);

  const zoomBotao = (fator: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    zoomEm(rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0, fator);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomEm(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-id]")) return;
    moveuRef.current = false;
    arrastoRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMoveCanvas = (e: React.PointerEvent) => {
    if (!arrastoRef.current) return;
    const dx = e.clientX - arrastoRef.current.x;
    const dy = e.clientY - arrastoRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moveuRef.current = true;
    setPan({ x: arrastoRef.current.panX + dx, y: arrastoRef.current.panY + dy });
  };
  const onPointerUpCanvas = (e: React.PointerEvent) => {
    const soltouNumNo = (e.target as HTMLElement).closest("[data-no-id]");
    arrastoRef.current = null;
    // sem esse guard, soltar o clique num botão DENTRO do nó (ex.: colapsar) também desseleciona
    // — pointerup borbulha até aqui independente do que o onClick do botão fizer (stopPropagation
    // no clique não impede a propagação do pointerup, que é um evento diferente)
    if (!moveuRef.current && !soltouNumNo) setSelecionadoId(null);
  };

  const onImagemSelecionada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    try {
      const dataUrl = await comprimirImagem(arquivo);
      atualizarSelecionado({ imagem: dataUrl });
    } catch (err) {
      alert(`Não consegui processar a imagem. ${err instanceof Error ? err.message : ""}`.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col select-none">
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-2 sm:px-4 h-12 flex-shrink-0 bg-gray-900 text-white border-b border-white/10">
        <button type="button" onClick={onFechar} className="p-1.5 rounded-md hover:bg-white/10 flex-shrink-0" title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={mapaLocal.titulo}
          onChange={(e) => salvarCampo({ titulo: e.target.value })}
          placeholder="Título do mapa"
          className="bg-transparent font-semibold text-sm sm:text-base outline-none border-b border-transparent focus:border-white/30 min-w-0 w-32 sm:w-56"
        />
        <select
          value={mapaLocal.materia}
          onChange={(e) => salvarCampo({ materia: e.target.value, topico: undefined })}
          className="bg-white/10 border border-white/10 text-xs rounded-md px-2 py-1.5 outline-none max-w-[9rem] sm:max-w-none"
        >
          {materiasAtivas.map((m) => <option key={m.nome} value={m.nome} className="text-black">{m.nome}</option>)}
        </select>
        {topicosDaMateria.length > 0 && (
          <select
            value={mapaLocal.topico ?? ""}
            onChange={(e) => salvarCampo({ topico: e.target.value || undefined })}
            className="hidden sm:block bg-white/10 border border-white/10 text-xs rounded-md px-2 py-1.5 outline-none max-w-[10rem]"
          >
            <option value="" className="text-black">Sem tópico</option>
            {topicosDaMateria.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 flex-shrink-0">
          <GitBranch className="h-3 w-3" /> Tab: filho · Enter: irmão · Del: excluir
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-950" style={{ backgroundImage: "radial-gradient(circle, #ffffff14 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDownCanvas}
          onPointerMove={onPointerMoveCanvas}
          onPointerUp={onPointerUpCanvas}
          onWheel={onWheel}
        >
          <div
            className="absolute top-0 left-0"
            style={{ width: 6000, height: 4000, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          >
            <svg width={6000} height={4000} className="absolute inset-0 pointer-events-none overflow-visible">
              <g transform={`translate(${ORIGIN_X}, ${ORIGIN_Y})`}>
                {layout.conexoes.map((c, i) => (
                  <path key={i} d={c.d} stroke={c.cor} strokeWidth={2.5} fill="none" opacity={0.85} />
                ))}
              </g>
            </svg>
            {layout.nos.map((pos) => (
              <NoView
                key={pos.no.id}
                pos={pos}
                selecionado={pos.no.id === selecionadoId}
                onSelecionar={() => setSelecionadoId(pos.no.id)}
                onToggleColapso={() => toggleColapso(pos.no.id)}
              />
            ))}
          </div>
        </div>

        {/* Zoom flutuante */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-gray-900/90 border border-white/10 rounded-lg p-1 text-white">
          <button type="button" onClick={() => zoomBotao(1 / 1.2)} className="p-1.5 rounded hover:bg-white/10" title="Diminuir zoom"><ZoomOut className="h-3.5 w-3.5" /></button>
          <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomBotao(1.2)} className="p-1.5 rounded hover:bg-white/10" title="Aumentar zoom"><ZoomIn className="h-3.5 w-3.5" /></button>
        </div>

        {/* Painel do nó selecionado */}
        {noSelecionado && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-72 bg-gray-900/95 backdrop-blur border-l border-white/10 text-white overflow-y-auto p-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{ehRaiz ? "Tema central" : "Nó"}</span>
              <button type="button" onClick={() => setSelecionadoId(null)} className="p-1 rounded hover:bg-white/10 sm:hidden"><X className="h-4 w-4" /></button>
            </div>

            <div>
              <textarea
                ref={textareaRef}
                value={noSelecionado.texto}
                onChange={(e) => atualizarSelecionado({ texto: e.target.value })}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-white/30 resize-none"
                placeholder="Texto do nó"
              />
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => atualizarSelecionado({ negrito: !noSelecionado.negrito })}
                  className={`p-1.5 rounded-md border ${noSelecionado.negrito ? "bg-white/20 border-white/30" : "border-white/10 hover:bg-white/10"}`}
                  title="Negrito"
                ><Bold className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  onClick={() => atualizarSelecionado({ italico: !noSelecionado.italico })}
                  className={`p-1.5 rounded-md border ${noSelecionado.italico ? "bg-white/20 border-white/30" : "border-white/10 hover:bg-white/10"}`}
                  title="Itálico"
                ><Italic className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <SeletorCor
              label="Cor do texto"
              valor={noSelecionado.cor}
              onEscolher={(cor) => atualizarSelecionado({ cor })}
            />
            <SeletorCor
              label="Cor de fundo"
              valor={noSelecionado.corFundo}
              onEscolher={(cor) => atualizarSelecionado({ corFundo: cor })}
            />
            <SeletorCor
              label="Cor da borda"
              valor={noSelecionado.semBorda ? "sem-borda" : noSelecionado.corBorda}
              onEscolher={(cor) => atualizarSelecionado(cor === "sem-borda" ? { semBorda: true, corBorda: undefined } : { corBorda: cor, semBorda: false })}
              opcaoExtra={{ valor: "sem-borda", label: "Sem borda" }}
            />

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Imagem</span>
              {noSelecionado.imagem ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={noSelecionado.imagem} alt="" className="w-full h-20 object-cover rounded-lg border border-white/10" />
                  <button
                    type="button"
                    onClick={() => atualizarSelecionado({ imagem: undefined })}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-md hover:bg-black/90"
                    title="Remover imagem"
                  ><Trash2 className="h-3 w-3" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputImagemRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 border border-dashed border-white/20 rounded-lg py-2.5 text-xs text-gray-400 hover:border-white/40 hover:text-white transition-colors"
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Anexar imagem
                </button>
              )}
              <input ref={inputImagemRef} type="file" accept="image/*" onChange={onImagemSelecionada} className="hidden" />
            </div>

            <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-1.5">
              <button type="button" onClick={adicionarFilhoAoSelecionado} className="w-full flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
                <Plus className="h-3.5 w-3.5" /> Adicionar filho <span className="ml-auto text-gray-500">Tab</span>
              </button>
              {!ehRaiz && (
                <button type="button" onClick={adicionarIrmaoAoSelecionado} className="w-full flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
                  <CornerDownRight className="h-3.5 w-3.5" /> Adicionar irmão <span className="ml-auto text-gray-500">Enter</span>
                </button>
              )}
              {!ehRaiz && (
                <button type="button" onClick={excluirSelecionado} className="w-full flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg bg-red-950/50 hover:bg-red-950 text-red-300 border border-red-900">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir nó <span className="ml-auto text-red-400/60">Del</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeletorCor({
  label, valor, onEscolher, opcaoExtra,
}: {
  label: string;
  valor: string | undefined;
  onEscolher: (cor: string) => void;
  opcaoExtra?: { valor: string; label: string };
}) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          type="button"
          onClick={() => onEscolher("")}
          title="Padrão (cor do ramo)"
          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center bg-gray-700 ${!valor ? "border-white" : "border-white/20"}`}
        >
          <Minus className="h-3 w-3 text-gray-300" />
        </button>
        {PALETA_CORES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onEscolher(c)}
            title={c}
            style={{ background: c }}
            className={`h-6 w-6 rounded-full border-2 ${valor === c ? "border-white" : "border-white/20"}`}
          />
        ))}
        {opcaoExtra && (
          <button
            type="button"
            onClick={() => onEscolher(opcaoExtra.valor)}
            title={opcaoExtra.label}
            className={`h-6 w-6 rounded-full border-2 border-dashed flex items-center justify-center ${valor === opcaoExtra.valor ? "border-white" : "border-white/30"}`}
          >
            <X className="h-3 w-3 text-gray-300" />
          </button>
        )}
      </div>
    </div>
  );
}

function NoView({
  pos, selecionado, onSelecionar, onToggleColapso,
}: {
  pos: NoPosicionado;
  selecionado: boolean;
  onSelecionar: () => void;
  onToggleColapso: () => void;
}) {
  const { no, lado } = pos;
  const corFundo = no.corFundo || (lado === "raiz" ? pos.corRamo : corComAlpha(pos.corRamo, "26"));
  const corBorda = no.semBorda ? "transparent" : (no.corBorda || pos.corRamo);
  const corTexto = no.cor || (lado === "raiz" ? "#ffffff" : "#e5e7eb");
  const temFilhos = no.filhos.length > 0;

  return (
    <div
      data-no-id={no.id}
      onClick={(e) => { e.stopPropagation(); onSelecionar(); }}
      style={{
        position: "absolute",
        left: ORIGIN_X + pos.x - pos.largura / 2,
        top: ORIGIN_Y + pos.y - pos.altura / 2,
        width: pos.largura,
        minHeight: pos.altura,
        background: corFundo,
        borderColor: corBorda,
        color: corTexto,
      }}
      className={`rounded-xl border-2 shadow-md cursor-pointer transition-shadow overflow-hidden ${selecionado ? "ring-2 ring-white shadow-xl" : "hover:shadow-lg"}`}
    >
      {no.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={no.imagem} alt="" className="w-full h-14 object-cover" />
      )}
      <div className={`px-3 py-2 text-sm leading-snug break-words ${no.negrito ? "font-bold" : "font-medium"} ${no.italico ? "italic" : ""}`}>
        {no.texto || "…"}
      </div>
      {temFilhos && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleColapso(); }}
          title={no.colapsado ? "Expandir" : "Colapsar"}
          className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-800 border border-white/30 text-white flex items-center justify-center hover:bg-gray-700"
        >
          <Plus className={`h-3 w-3 transition-transform ${no.colapsado ? "" : "rotate-45"}`} />
        </button>
      )}
    </div>
  );
}
