"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ArrowLeft,
  Bold,
  Check,
  Cloud,
  CloudOff,
  Download,
  Highlighter,
  ImagePlus,
  Link2,
  Loader2,
  Maximize,
  Minimize,
  MousePointer2,
  PanelRight,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import WhiteboardCanvas, {
  type WhiteboardCanvasHandle,
  type WhiteboardMode,
  type WhiteboardSelection,
} from "./WhiteboardCanvas";
import styles from "./Bizus.module.css";
import {
  BIZU_POSES,
  POSE_LABELS,
  bizuAvatarSrc,
  type Bizu,
  type BizuImage,
  type BizuMateriaOption,
} from "./types";
import {
  createConnection,
  createTextNode,
  firstWhiteboardImage,
  sanitizeRichHtml,
  syncWhiteboardTitle,
  titleFromWhiteboard,
  upsertWhiteboardImage,
  type BizuWhiteboardDocument,
  type WhiteboardNode,
} from "./whiteboard-model";

export type EditorSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface BizuEditorProps {
  bizu: Bizu;
  materias: readonly BizuMateriaOption[];
  topicosDisponiveis: readonly string[];
  saveStatus: EditorSaveStatus;
  autoSave: boolean;
  generatingImage: boolean;
  onChange: (next: Bizu) => void;
  onSave: () => void;
  onDelete?: () => void;
  onBack: () => void;
  onToggleAutoSave: (enabled: boolean) => void;
  onGenerateImage: (orientacao: string) => Promise<void>;
}

const TEXT_COLORS = ["#241c33", "#7c3aed", "#be123c", "#047857", "#1d4ed8", "#ffffff"];
const HIGHLIGHTS = ["#fff176", "#fda4af", "#a7f3d0", "#bae6fd", "#ddd6fe", "transparent"];
const CARD_COLORS = ["#ffffff", "#fff7c7", "#ffe4e6", "#dcfce7", "#dbeafe", "#ede9fe"];
const CARD_BORDERS = ["#7c3aed", "#eab308", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7"];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export default function BizuEditor({
  bizu,
  materias,
  topicosDisponiveis,
  saveStatus,
  autoSave,
  generatingImage,
  onChange,
  onSave,
  onDelete,
  onBack,
  onToggleAutoSave,
  onGenerateImage,
}: BizuEditorProps) {
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startClientX: number; startClientY: number; startScrollLeft: number; startScrollTop: number } | null>(null);
  const [selection, setSelection] = useState<WhiteboardSelection>(null);
  const [mode, setMode] = useState<WhiteboardMode>("select");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [exporting, setExporting] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [orientacaoVisual, setOrientacaoVisual] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const [panning, setPanning] = useState(false);

  const selectedNode = useMemo(
    () =>
      selection?.kind === "node"
        ? bizu.documento.nodes.find((node) => node.id === selection.id) || null
        : null,
    [bizu.documento.nodes, selection]
  );
  const valid = Boolean(bizu.materia.trim() && bizu.titulo.trim() && bizu.documento.nodes.length);

  const saveLabel =
    saveStatus === "saving"
      ? "Salvando…"
      : saveStatus === "saved"
        ? "Tudo salvo"
        : saveStatus === "error"
          ? "Falha ao salvar"
          : saveStatus === "dirty"
            ? "Alterações pendentes"
            : "Salvo";

  function patch(fields: Partial<Bizu>) {
    onChange({ ...bizu, ...fields });
  }

  function updateDocument(documento: BizuWhiteboardDocument) {
    const derivedTitle = titleFromWhiteboard(documento);
    const firstImage = firstWhiteboardImage(documento);
    const nextImage: BizuImage | null = firstImage
      ? {
          url: firstImage,
          alt:
            documento.nodes.find((node) => node.kind === "image" && node.imageUrl === firstImage)
              ?.imageAlt || bizu.imagem?.alt || "Imagem do bizu",
          fit:
            documento.nodes.find((node) => node.kind === "image" && node.imageUrl === firstImage)
              ?.imageFit || "cover",
          origem: bizu.imagem?.url === firstImage ? bizu.imagem.origem : "anexada",
        }
      : null;
    onChange({
      ...bizu,
      titulo: derivedTitle || bizu.titulo,
      pose: documento.avatar.pose,
      documento,
      imagem: nextImage,
    });
  }

  function updateNode(nodeId: string, updater: (node: WhiteboardNode) => WhiteboardNode) {
    updateDocument({
      ...bizu.documento,
      nodes: bizu.documento.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    });
  }

  function addCard() {
    if (bizu.documento.nodes.length >= 500) {
      setMediaError("Este mapa chegou ao limite de 500 cartões.");
      return;
    }
    const count = bizu.documento.nodes.filter((node) => node.kind === "text").length;
    const x = 390 + ((count - 1) % 3) * 390;
    const y = 360 + (Math.floor((count - 1) / 3) % 3) * 220;
    const node = createTextNode(x, y);
    updateDocument({ ...bizu.documento, nodes: [...bizu.documento.nodes, node] });
    setSelection({ kind: "node", id: node.id });
    setMode("select");
  }

  function deleteSelection() {
    if (!selection) return;
    if (selection.kind === "connection") {
      updateDocument({
        ...bizu.documento,
        connections: bizu.documento.connections.filter((connection) => connection.id !== selection.id),
      });
      setSelection(null);
      return;
    }
    const remaining = bizu.documento.nodes.filter((node) => node.id !== selection.id);
    updateDocument({
      ...bizu.documento,
      nodes: remaining,
      connections: bizu.documento.connections.filter(
        (connection) => connection.from !== selection.id && connection.to !== selection.id
      ),
    });
    setSelection(null);
  }

  function connectNode(nodeId: string) {
    if (!connectFrom) {
      setConnectFrom(nodeId);
      setSelection({ kind: "node", id: nodeId });
      return;
    }
    if (connectFrom === nodeId) {
      setConnectFrom(null);
      return;
    }
    const exists = bizu.documento.connections.some(
      (connection) =>
        (connection.from === connectFrom && connection.to === nodeId) ||
        (connection.from === nodeId && connection.to === connectFrom)
    );
    if (!exists) {
      if (bizu.documento.connections.length >= 1500) {
        setMediaError("Este mapa chegou ao limite de 1.500 conexões.");
        setConnectFrom(null);
        setMode("select");
        return;
      }
      const connection = createConnection(connectFrom, nodeId);
      updateDocument({
        ...bizu.documento,
        connections: [...bizu.documento.connections, connection],
      });
      setSelection({ kind: "connection", id: connection.id });
    }
    setConnectFrom(null);
    setMode("select");
  }

  function chooseMode(next: WhiteboardMode) {
    setMode(next);
    if (next !== "connect") setConnectFrom(null);
  }

  function editableElement() {
    if (!selectedNode || selectedNode.kind !== "text") return null;
    return document.querySelector<HTMLElement>(
      '[data-node-content="' + CSS.escape(selectedNode.id) + '"]'
    );
  }

  function applyTextCommand(command: string, value?: string) {
    const element = editableElement();
    if (!element) return;
    element.focus();
    document.execCommand(command, false, value);
    updateNode(selectedNode!.id, (node) => ({
      ...node,
      html: sanitizeRichHtml(element.innerHTML),
    }));
  }

  function preserveSelection(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  async function attachImage(file?: File) {
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("image/")) {
      setMediaError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMediaError("A imagem pode ter no máximo 10 MB.");
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      if (url.length > 10 * 1024 * 1024) {
        throw new Error("Depois de preparada, a imagem excede o limite de 10 MB.");
      }
      const image: BizuImage = {
        url,
        alt: "Ilustração mnemônica de " + (bizu.titulo || "bizu"),
        fit: "cover",
        origem: "anexada",
      };
      const documento = upsertWhiteboardImage(bizu.documento, image);
      const imageNode = documento.nodes.find((node) => node.kind === "image");
      onChange({ ...bizu, imagem: image, documento });
      if (imageNode) setSelection({ kind: "node", id: imageNode.id });
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Falha ao anexar imagem.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function exportPng() {
    const element = canvasRef.current?.element;
    if (!element || exporting) return;
    setExporting(true);
    setMediaError("");
    const previousTransform = element.style.transform;
    try {
      await document.fonts?.ready;
      element.style.transform = "none";
      element.dataset.exporting = "true";
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        cacheBust: true,
        width: bizu.documento.width,
        height: bizu.documento.height,
        canvasWidth: bizu.documento.width,
        canvasHeight: bizu.documento.height,
        pixelRatio: 1,
        backgroundColor: bizu.documento.background,
        filter: (node) => {
          if (!(node instanceof Element)) return true;
          return !(
            node.classList.contains(styles.nodeDragHandle) ||
            node.classList.contains(styles.nodeResizeHandle) ||
            node.classList.contains(styles.connectModeHint) ||
            node.classList.contains(styles.connectionHitbox)
          );
        },
      });
      const link = document.createElement("a");
      link.download = (safeFileName(bizu.titulo) || "mapa-bizu") + ".png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("[Bizus] Falha ao exportar whiteboard", error);
      setMediaError("Não foi possível exportar o mapa. Tente novamente.");
    } finally {
      delete element.dataset.exporting;
      element.style.transform = previousTransform;
      setExporting(false);
    }
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selection) {
        event.preventDefault();
        deleteSelection();
      }
      if (event.key === "Escape") {
        setConnectFrom(null);
        setMode("select");
        setSelection(null);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  useEffect(() => {
    function onFullscreenChange() {
      setTelaCheia(document.fullscreenElement === editorRootRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      editorRootRef.current?.requestFullscreen();
    }
  }

  // pan pelo botão direito do mouse — arrasta o SCROLL do viewport (o "quadro" já é maior que a
  // área visível e usa overflow:auto), sem mexer no zoom/posição dos cartões. Botão direito porque
  // o esquerdo já é usado pra selecionar/arrastar cartões e o avatar.
  function beginPan(event: MouseEvent<HTMLElement>) {
    if (event.button !== 2) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    panRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    };
    setPanning(true);
  }

  useEffect(() => {
    function move(event: globalThis.MouseEvent) {
      const pan = panRef.current;
      const viewport = viewportRef.current;
      if (!pan || !viewport) return;
      viewport.scrollLeft = pan.startScrollLeft - (event.clientX - pan.startClientX);
      viewport.scrollTop = pan.startScrollTop - (event.clientY - pan.startClientY);
    }
    function end() {
      if (!panRef.current) return;
      panRef.current = null;
      setPanning(false);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
    };
  }, []);

  return (
    <div className={styles.whiteboardEditor} ref={editorRootRef} data-fullscreen={telaCheia}>
      <header className={styles.whiteboardTopbar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft />
          <span>Meus bizus</span>
        </button>
        <label className={styles.boardTitleField}>
          <span className={styles.srOnly}>Nome do bizu</span>
          <input
            value={bizu.titulo}
            maxLength={180}
            onChange={(event) => {
              const titulo = event.target.value;
              onChange({
                ...bizu,
                titulo,
                documento: syncWhiteboardTitle(bizu.documento, titulo),
              });
            }}
            placeholder="Nome do bizu"
          />
        </label>
        <div className={styles.saveStatus} data-status={saveStatus} role="status" aria-live="polite">
          {saveStatus === "saving" ? <Loader2 className={styles.spin} /> : null}
          {saveStatus === "saved" ? <Check /> : null}
          {saveStatus === "error" ? <CloudOff /> : null}
          {saveStatus === "dirty" || saveStatus === "idle" ? <Cloud /> : null}
          <span>{saveLabel}</span>
        </div>
        <label className={styles.autosaveToggle}>
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(event) => onToggleAutoSave(event.target.checked)}
          />
          <span aria-hidden="true" />
          Autosave
        </label>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onSave}
          disabled={!valid || saveStatus === "saving"}
          aria-label="Salvar bizu"
        >
          {saveStatus === "saving" ? <Loader2 className={styles.spin} /> : <Save />}
          Salvar
        </button>
        <button type="button" className={styles.primaryButton} onClick={exportPng} disabled={exporting}>
          {exporting ? <Loader2 className={styles.spin} /> : <Download />}
          Exportar mapa
        </button>
      </header>

      <div className={styles.whiteboardToolbar} aria-label="Ferramentas do mapa mental">
        <div className={styles.toolbarGroup}>
          <button type="button" data-active={mode === "select"} onClick={() => chooseMode("select")}>
            <MousePointer2 /> Selecionar
          </button>
          <button type="button" onClick={addCard}>
            <Plus /> Cartão
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload /> Imagem
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.srOnly}
            onChange={(event) => void attachImage(event.target.files?.[0])}
          />
          <button
            type="button"
            data-active={mode === "connect"}
            className={styles.connectTool}
            onClick={() => chooseMode(mode === "connect" ? "select" : "connect")}
          >
            <Link2 /> Conectar
          </button>
          <button type="button" onClick={deleteSelection} disabled={!selection} className={styles.deleteTool}>
            <Trash2 /> Excluir
          </button>
        </div>

        {selectedNode?.kind === "text" ? (
          <div className={styles.richTextToolbar} aria-label="Formatação do texto">
            <button
              type="button"
              title="Negrito"
              onMouseDown={(event) => {
                preserveSelection(event);
                applyTextCommand("bold");
              }}
            >
              <Bold />
            </button>
            <span className={styles.toolbarLabel}><Type /> Tamanho</span>
            {[
              ["P", "2"],
              ["M", "4"],
              ["G", "6"],
            ].map(([label, size]) => (
              <button
                type="button"
                className={styles.textSizeButton}
                onMouseDown={(event) => {
                  preserveSelection(event);
                  applyTextCommand("fontSize", size);
                }}
                key={size}
              >
                {label}
              </button>
            ))}
            <span className={styles.toolbarLabel}>Texto</span>
            <div className={styles.miniPalette}>
              {TEXT_COLORS.map((color) => (
                <button
                  type="button"
                  aria-label={"Cor do texto " + color}
                  style={{ backgroundColor: color }}
                  onMouseDown={(event) => {
                    preserveSelection(event);
                    applyTextCommand("foreColor", color);
                  }}
                  key={color}
                />
              ))}
            </div>
            <span className={styles.toolbarLabel}><Highlighter /> Marca-texto</span>
            <div className={styles.miniPalette}>
              {HIGHLIGHTS.map((color) => (
                <button
                  type="button"
                  aria-label={color === "transparent" ? "Remover marca-texto" : "Marca-texto " + color}
                  className={color === "transparent" ? styles.noColor : ""}
                  style={{ backgroundColor: color }}
                  onMouseDown={(event) => {
                    preserveSelection(event);
                    applyTextCommand("hiliteColor", color);
                  }}
                  key={color}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.toolbarTip}>
            {mode === "connect"
              ? "Clique em dois cartões para ligá-los."
              : "Selecione um cartão de texto para formatar."}
          </div>
        )}

        <div className={styles.zoomControls}>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value - 0.1))} aria-label="Diminuir zoom">
            <ZoomOut />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.25, value + 0.1))} aria-label="Aumentar zoom">
            <ZoomIn />
          </button>
          <button type="button" onClick={() => setInspectorOpen((value) => !value)} aria-label="Abrir ou fechar painel">
            <PanelRight />
          </button>
          <button
            type="button"
            onClick={alternarTelaCheia}
            aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
          >
            {telaCheia ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>

      <div className={styles.whiteboardWorkspace} data-inspector={inspectorOpen}>
        <main
          ref={viewportRef}
          className={styles.canvasViewport}
          data-panning={panning}
          aria-label="Área do mapa mental — clique com o botão direito e arraste para navegar"
          onMouseDown={beginPan}
          onContextMenu={(event) => event.preventDefault()}
        >
          <WhiteboardCanvas
            ref={canvasRef}
            documento={bizu.documento}
            zoom={zoom}
            mode={mode}
            selection={selection}
            connectFrom={connectFrom}
            onChange={updateDocument}
            onSelectionChange={setSelection}
            onConnectNode={connectNode}
          />
        </main>

        {inspectorOpen ? (
          <aside className={styles.whiteboardInspector}>
            <section className={styles.inspectorSection}>
              <div className={styles.inspectorHeading}>
                <div>
                  <span>ORGANIZAÇÃO</span>
                  <h2>Detalhes do bizu</h2>
                </div>
              </div>
              <label className={styles.field}>
                <span>Matéria *</span>
                <select
                  value={bizu.materia}
                  onChange={(event) => patch({ materia: event.target.value, topico: null })}
                >
                  <option value="">Selecione</option>
                  {materias.map((materia) => (
                    <option value={materia.nome} key={materia.id || materia.nome}>{materia.nome}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Tópico</span>
                <select
                  value={bizu.topico || ""}
                  onChange={(event) => patch({ topico: event.target.value || null })}
                  disabled={!bizu.materia || !topicosDisponiveis.length}
                >
                  <option value="">Todos / geral</option>
                  {topicosDisponiveis.map((topico) => <option value={topico} key={topico}>{topico}</option>)}
                </select>
              </label>
            </section>

            {selectedNode ? (
              <section className={styles.inspectorSection}>
                <div className={styles.inspectorHeading}>
                  <div>
                    <span>SELEÇÃO</span>
                    <h2>{selectedNode.kind === "image" ? "Imagem" : "Cartão"}</h2>
                  </div>
                </div>
                <label className={styles.field}>
                  <span>Largura do cartão</span>
                  <input
                    type="range"
                    min={selectedNode.kind === "image" ? 180 : 190}
                    max={Math.max(
                      selectedNode.kind === "image" ? 180 : 190,
                      bizu.documento.width - selectedNode.x
                    )}
                    value={selectedNode.width}
                    onChange={(event) =>
                      updateNode(selectedNode.id, (node) => ({
                        ...node,
                        width: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Altura do cartão</span>
                  <input
                    type="range"
                    min={selectedNode.kind === "image" ? 140 : 100}
                    max={Math.max(
                      selectedNode.kind === "image" ? 140 : 100,
                      bizu.documento.height - selectedNode.y
                    )}
                    value={selectedNode.height}
                    onChange={(event) =>
                      updateNode(selectedNode.id, (node) => ({
                        ...node,
                        height: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                {selectedNode.kind === "text" ? (
                  <>
                    <label className={styles.field}>
                      <span>Tamanho-base do texto</span>
                      <input
                        type="range"
                        min="14"
                        max="48"
                        value={selectedNode.style.fontSize}
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => ({
                            ...node,
                            style: { ...node.style, fontSize: Number(event.target.value) },
                          }))
                        }
                      />
                    </label>
                    <span className={styles.inspectorLabel}>Cor do cartão</span>
                    <div className={styles.inspectorPalette}>
                      {CARD_COLORS.map((color) => (
                        <button
                          type="button"
                          aria-label={"Fundo " + color}
                          data-active={selectedNode.style.background === color}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            updateNode(selectedNode.id, (node) => ({
                              ...node,
                              style: { ...node.style, background: color },
                            }))
                          }
                          key={color}
                        />
                      ))}
                    </div>
                    <span className={styles.inspectorLabel}>Borda</span>
                    <div className={styles.inspectorPalette}>
                      {CARD_BORDERS.map((color) => (
                        <button
                          type="button"
                          aria-label={"Borda " + color}
                          data-active={selectedNode.style.borderColor === color}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            updateNode(selectedNode.id, (node) => ({
                              ...node,
                              style: { ...node.style, borderColor: color },
                            }))
                          }
                          key={color}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <label className={styles.field}>
                      <span>Descrição acessível</span>
                      <input
                        value={selectedNode.imageAlt || ""}
                        onChange={(event) =>
                          updateNode(selectedNode.id, (node) => ({
                            ...node,
                            imageAlt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        data-active={selectedNode.imageFit !== "contain"}
                        onClick={() => updateNode(selectedNode.id, (node) => ({ ...node, imageFit: "cover" }))}
                      >
                        Preencher
                      </button>
                      <button
                        type="button"
                        data-active={selectedNode.imageFit === "contain"}
                        onClick={() => updateNode(selectedNode.id, (node) => ({ ...node, imageFit: "contain" }))}
                      >
                        Inteira
                      </button>
                    </div>
                    <label className={styles.field}>
                      <span>Legenda de texto</span>
                    </label>
                    <div className={styles.segmented} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      <button
                        type="button"
                        data-active={selectedNode.imageCaptionPosition === "top"}
                        onClick={() => updateNode(selectedNode.id, (node) => ({ ...node, imageCaptionPosition: "top" }))}
                      >
                        Em cima
                      </button>
                      <button
                        type="button"
                        data-active={(selectedNode.imageCaptionPosition || "bottom") === "bottom"}
                        onClick={() => updateNode(selectedNode.id, (node) => ({ ...node, imageCaptionPosition: "bottom" }))}
                      >
                        Em baixo
                      </button>
                      <button
                        type="button"
                        data-active={selectedNode.imageCaptionPosition === "overlay"}
                        onClick={() => updateNode(selectedNode.id, (node) => ({ ...node, imageCaptionPosition: "overlay" }))}
                      >
                        Sobre a imagem
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : null}

            <section className={styles.inspectorSection}>
              <div className={styles.inspectorHeading}>
                <div>
                  <span>IMAGEM MNEMÔNICA</span>
                  <h2>Criar com IA</h2>
                </div>
                <Sparkles />
              </div>
              <p>Descreva livremente a associação visual. Ela será inserida como um nó de imagem.</p>
              <label className={styles.field}>
                <span>Prompt livre</span>
                <textarea
                  value={orientacaoVisual}
                  onChange={(event) => setOrientacaoVisual(event.target.value)}
                  rows={6}
                  maxLength={1500}
                  placeholder="Ex.: meu avatar comprando uma casa e um carro, depois importando e exportando mercadorias, operando IOF no computador e, por fim, pronto para a guerra — uma sequência visual para memorizar as exceções da noventena."
                />
                <small>{orientacaoVisual.length}/1500</small>
              </label>
              <button
                type="button"
                className={styles.aiButton}
                onClick={() => void onGenerateImage(orientacaoVisual)}
                disabled={generatingImage || !valid || !orientacaoVisual.trim()}
              >
                {generatingImage ? <Loader2 className={styles.spin} /> : <ImagePlus />}
                {generatingImage ? "Criando imagem…" : "Gerar e inserir no mapa"}
              </button>
              {mediaError ? <p className={styles.inlineError}>{mediaError}</p> : null}
            </section>

            <section className={styles.inspectorSection}>
              <div className={styles.inspectorHeading}>
                <div>
                  <span>PERSONAGEM FIXO</span>
                  <h2>Reação do avatar</h2>
                </div>
              </div>
              <div className={styles.compactPoseGrid} role="radiogroup" aria-label="Pose do avatar">
                {BIZU_POSES.map((pose) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={bizu.documento.avatar.pose === pose}
                    data-active={bizu.documento.avatar.pose === pose}
                    onClick={() =>
                      updateDocument({
                        ...bizu.documento,
                        avatar: { ...bizu.documento.avatar, pose },
                      })
                    }
                    title={POSE_LABELS[pose]}
                    key={pose}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bizuAvatarSrc(pose)} alt="" />
                    <span>{POSE_LABELS[pose]}</span>
                  </button>
                ))}
              </div>
              <div className={styles.segmented}>
                <button
                  type="button"
                  data-active={bizu.documento.avatar.side === "left"}
                  onClick={() =>
                    updateDocument({
                      ...bizu.documento,
                      avatar: { ...bizu.documento.avatar, side: "left" },
                    })
                  }
                >
                  Esquerda
                </button>
                <button
                  type="button"
                  data-active={bizu.documento.avatar.side === "right"}
                  onClick={() =>
                    updateDocument({
                      ...bizu.documento,
                      avatar: { ...bizu.documento.avatar, side: "right" },
                    })
                  }
                >
                  Direita
                </button>
              </div>
              <label className={styles.field}>
                <span>Tamanho do avatar</span>
                <input
                  type="range"
                  min="220"
                  max="560"
                  value={bizu.documento.avatar.width}
                  onChange={(event) =>
                    updateDocument({
                      ...bizu.documento,
                      avatar: { ...bizu.documento.avatar, width: Number(event.target.value) },
                    })
                  }
                />
              </label>
            </section>

            <section className={styles.inspectorSection}>
              <div className={styles.inspectorHeading}>
                <div>
                  <span>CANVAS</span>
                  <h2>Aparência do mapa</h2>
                </div>
              </div>
              <label className={styles.field}>
                <span>Fundo</span>
                <input
                  type="color"
                  value={bizu.documento.background}
                  onChange={(event) => updateDocument({ ...bizu.documento, background: event.target.value })}
                />
              </label>
              <div className={styles.segmented}>
                {(["dots", "lines", "none"] as const).map((grid) => (
                  <button
                    type="button"
                    data-active={bizu.documento.grid === grid}
                    onClick={() => updateDocument({ ...bizu.documento, grid })}
                    key={grid}
                  >
                    {grid === "dots" ? "Pontos" : grid === "lines" ? "Linhas" : "Limpo"}
                  </button>
                ))}
              </div>
            </section>

            {onDelete ? (
              <button type="button" className={styles.deleteBizuButton} onClick={onDelete}>
                <Trash2 /> Excluir este bizu
              </button>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
