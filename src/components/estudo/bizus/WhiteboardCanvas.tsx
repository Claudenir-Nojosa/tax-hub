"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link2, Move, Scaling } from "lucide-react";
import styles from "./Bizus.module.css";
import { bizuAvatarSrc } from "./types";
import {
  sanitizeRichHtml,
  type BizuWhiteboardDocument,
  type WhiteboardNode,
} from "./whiteboard-model";

export type WhiteboardMode = "select" | "connect";
export type WhiteboardSelection =
  | { kind: "node"; id: string }
  | { kind: "connection"; id: string }
  | null;

export interface WhiteboardCanvasHandle {
  element: HTMLDivElement | null;
}

interface WhiteboardCanvasProps {
  documento: BizuWhiteboardDocument;
  zoom: number;
  mode: WhiteboardMode;
  selection: WhiteboardSelection;
  connectFrom: string | null;
  onChange: (documento: BizuWhiteboardDocument) => void;
  onSelectionChange: (selection: WhiteboardSelection) => void;
  onConnectNode: (nodeId: string) => void;
}

type Interaction =
  | {
      type: "drag";
      nodeId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      nodeId: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    }
  | {
      type: "avatar-drag";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    };

// mesma proporção usada no CSS (aspect-ratio: 3 / 2) — precisa ser recalculada aqui pra saber os
// limites do arraste livre do avatar (não tem campo de altura salvo, só largura)
function avatarHeightFromWidth(width: number) {
  return width * (2 / 3);
}

function center(node: WhiteboardNode) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function connectionPath(from: WhiteboardNode, to: WhiteboardNode) {
  const start = center(from);
  const end = center(to);
  const distance = Math.max(90, Math.abs(end.x - start.x) * 0.48);
  const direction = end.x >= start.x ? 1 : -1;
  return [
    "M",
    start.x,
    start.y,
    "C",
    start.x + distance * direction,
    start.y,
    end.x - distance * direction,
    end.y,
    end.x,
    end.y,
  ].join(" ");
}

interface RichTextNodeProps {
  nodeId: string;
  html: string;
  fontSize: number;
  editable: boolean;
  label: string;
  onSelect: () => void;
  onHtmlChange: (html: string) => void;
}

function RichTextNode({
  nodeId,
  html,
  fontSize,
  editable,
  label,
  onSelect,
  onHtmlChange,
}: RichTextNodeProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const safeHtml = sanitizeRichHtml(html);

  // Reapplying `dangerouslySetInnerHTML` on every input moves the caret to the
  // beginning. Preserve the live editable DOM while it has focus, and only
  // synchronize changes that came from outside the contenteditable element.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || document.activeElement === element) return;
    if (element.innerHTML !== safeHtml) element.innerHTML = safeHtml;
  }, [safeHtml]);

  return (
    <div
      ref={elementRef}
      className={styles.nodeRichText}
      data-node-content={nodeId}
      contentEditable={editable}
      role="textbox"
      aria-label={label}
      aria-multiline="true"
      suppressContentEditableWarning
      spellCheck
      style={{ fontSize }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onInput={(event) => onHtmlChange(event.currentTarget.innerHTML)}
      onPaste={(event) => {
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      }}
    />
  );
}

const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, WhiteboardCanvasProps>(
  function WhiteboardCanvas(
    {
      documento,
      zoom,
      mode,
      selection,
      connectFrom,
      onChange,
      onSelectionChange,
      onConnectNode,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const documentRef = useRef(documento);
    const onChangeRef = useRef(onChange);
    const interactionRef = useRef<Interaction | null>(null);
    documentRef.current = documento;
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({ element: canvasRef.current }), []);

    useEffect(() => {
      function move(event: PointerEvent) {
        const interaction = interactionRef.current;
        if (!interaction) return;
        const current = documentRef.current;

        if (interaction.type === "avatar-drag") {
          const avatarHeight = avatarHeightFromWidth(current.avatar.width);
          const x = Math.min(
            current.width - current.avatar.width,
            Math.max(0, interaction.startX + (event.clientX - interaction.startClientX) / zoom)
          );
          const y = Math.min(
            current.height - avatarHeight,
            Math.max(0, interaction.startY + (event.clientY - interaction.startClientY) / zoom)
          );
          onChangeRef.current({
            ...current,
            avatar: { ...current.avatar, x: Math.round(x), y: Math.round(y) },
          });
          return;
        }

        const node = current.nodes.find((item) => item.id === interaction.nodeId);
        if (!node) return;

        if (interaction.type === "drag") {
          const x = Math.min(
            current.width - node.width,
            Math.max(0, interaction.startX + (event.clientX - interaction.startClientX) / zoom)
          );
          const y = Math.min(
            current.height - node.height,
            Math.max(0, interaction.startY + (event.clientY - interaction.startClientY) / zoom)
          );
          onChangeRef.current({
            ...current,
            nodes: current.nodes.map((item) =>
              item.id === node.id ? { ...item, x: Math.round(x), y: Math.round(y) } : item
            ),
          });
          return;
        }

        const minWidth = node.kind === "image" ? 180 : 190;
        const minHeight = node.kind === "image" ? 140 : 100;
        const width = Math.min(
          current.width - node.x,
          Math.max(minWidth, interaction.startWidth + (event.clientX - interaction.startClientX) / zoom)
        );
        const height = Math.min(
          current.height - node.y,
          Math.max(minHeight, interaction.startHeight + (event.clientY - interaction.startClientY) / zoom)
        );
        onChangeRef.current({
          ...current,
          nodes: current.nodes.map((item) =>
            item.id === node.id
              ? { ...item, width: Math.round(width), height: Math.round(height) }
              : item
          ),
        });
      }

      function end() {
        interactionRef.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      return () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      };
    }, [zoom]);

    function beginDrag(event: ReactPointerEvent, node: WhiteboardNode) {
      event.preventDefault();
      event.stopPropagation();
      if (mode === "connect") {
        onConnectNode(node.id);
        return;
      }
      onSelectionChange({ kind: "node", id: node.id });
      interactionRef.current = {
        type: "drag",
        nodeId: node.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: node.x,
        startY: node.y,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }

    function beginAvatarDrag(event: ReactPointerEvent) {
      event.preventDefault();
      event.stopPropagation();
      const current = documentRef.current;
      interactionRef.current = {
        type: "avatar-drag",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: current.avatar.x,
        startY: current.avatar.y,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }

    function beginResize(event: ReactPointerEvent, node: WhiteboardNode) {
      event.preventDefault();
      event.stopPropagation();
      onSelectionChange({ kind: "node", id: node.id });
      interactionRef.current = {
        type: "resize",
        nodeId: node.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWidth: node.width,
        startHeight: node.height,
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "nwse-resize";
    }

    function selectNode(event: ReactPointerEvent, node: WhiteboardNode) {
      event.stopPropagation();
      if (mode === "connect") {
        event.preventDefault();
        onConnectNode(node.id);
      } else {
        onSelectionChange({ kind: "node", id: node.id });
      }
    }

    function updateNodeHtml(nodeId: string, html: string) {
      const current = documentRef.current;
      onChangeRef.current({
        ...current,
        nodes: current.nodes.map((node) =>
          node.id === nodeId ? { ...node, html: sanitizeRichHtml(html) } : node
        ),
      });
    }

    return (
      <div
        className={styles.whiteboardScale}
        style={{
          width: documento.width * zoom,
          height: documento.height * zoom,
        }}
      >
        <div
          ref={canvasRef}
          className={styles.whiteboardCanvas}
          data-grid={documento.grid}
          style={{
            width: documento.width,
            height: documento.height,
            backgroundColor: documento.background,
            transform: "scale(" + zoom + ")",
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onSelectionChange(null);
          }}
        >
          <svg
            className={styles.whiteboardConnections}
            width={documento.width}
            height={documento.height}
            viewBox={"0 0 " + documento.width + " " + documento.height}
            aria-label="Conexões entre os cartões"
          >
            {documento.connections.map((connection) => {
              const from = documento.nodes.find((node) => node.id === connection.from);
              const to = documento.nodes.find((node) => node.id === connection.to);
              if (!from || !to) return null;
              const selected = selection?.kind === "connection" && selection.id === connection.id;
              return (
                <g key={connection.id}>
                  <path
                    className={styles.connectionHitbox}
                    d={connectionPath(from, to)}
                    fill="none"
                    stroke="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label="Selecionar conexão entre cartões"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onSelectionChange({ kind: "connection", id: connection.id });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onSelectionChange({ kind: "connection", id: connection.id });
                    }}
                  />
                  <path
                    className={styles.connectionLine}
                    data-selected={selected}
                    d={connectionPath(from, to)}
                    fill="none"
                    stroke={selected ? "#ec4899" : connection.color}
                    strokeWidth={selected ? connection.width + 2 : connection.width}
                  />
                </g>
              );
            })}
          </svg>

          <div
            className={styles.whiteboardAvatar}
            data-side={documento.avatar.side}
            style={{ width: documento.avatar.width, left: documento.avatar.x, top: documento.avatar.y }}
            role="button"
            tabIndex={0}
            aria-label={"Seu avatar em pose " + documento.avatar.pose + " — arraste para mover"}
            onPointerDown={beginAvatarDrag}
            onKeyDown={(event) => {
              const delta =
                event.key === "ArrowLeft"
                  ? { x: -10, y: 0 }
                  : event.key === "ArrowRight"
                    ? { x: 10, y: 0 }
                    : event.key === "ArrowUp"
                      ? { x: 0, y: -10 }
                      : event.key === "ArrowDown"
                        ? { x: 0, y: 10 }
                        : null;
              if (!delta) return;
              event.preventDefault();
              const avatarHeight = avatarHeightFromWidth(documento.avatar.width);
              onChange({
                ...documento,
                avatar: {
                  ...documento.avatar,
                  x: Math.max(0, Math.min(documento.width - documento.avatar.width, documento.avatar.x + delta.x)),
                  y: Math.max(0, Math.min(documento.height - avatarHeight, documento.avatar.y + delta.y)),
                },
              });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bizuAvatarSrc(documento.avatar.pose)}
              alt={"Seu personagem em pose " + documento.avatar.pose}
              draggable={false}
            />
          </div>

          {documento.nodes.map((node) => {
            const selected = selection?.kind === "node" && selection.id === node.id;
            const isConnectOrigin = connectFrom === node.id;
            return (
              <article
                key={node.id}
                className={styles.whiteboardNode}
                data-kind={node.kind}
                data-role={node.role}
                data-selected={selected}
                data-connect-origin={isConnectOrigin}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  color: node.style.color,
                  backgroundColor: node.style.background,
                  borderColor: node.style.borderColor,
                }}
                tabIndex={0}
                aria-label={
                  node.kind === "image"
                    ? node.imageAlt || "Imagem do bizu"
                    : "Cartão de texto do mapa"
                }
                onPointerDown={(event) => selectNode(event, node)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (mode === "connect" && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onConnectNode(node.id);
                    return;
                  }
                  if (mode !== "select") return;
                  const delta =
                    event.key === "ArrowLeft"
                      ? { x: -10, y: 0 }
                      : event.key === "ArrowRight"
                        ? { x: 10, y: 0 }
                        : event.key === "ArrowUp"
                          ? { x: 0, y: -10 }
                          : event.key === "ArrowDown"
                            ? { x: 0, y: 10 }
                            : null;
                  if (!delta) return;
                  event.preventDefault();
                  onChange({
                    ...documento,
                    nodes: documento.nodes.map((item) =>
                      item.id === node.id
                        ? {
                            ...item,
                            x: Math.max(0, Math.min(documento.width - item.width, item.x + delta.x)),
                            y: Math.max(0, Math.min(documento.height - item.height, item.y + delta.y)),
                          }
                        : item
                    ),
                  });
                }}
              >
                <button
                  type="button"
                  className={styles.nodeDragHandle}
                  aria-label={"Mover " + (node.kind === "image" ? "imagem" : "cartão")}
                  title={mode === "connect" ? "Selecionar para conectar" : "Arrastar cartão"}
                  onPointerDown={(event) => beginDrag(event, node)}
                >
                  {mode === "connect" ? <Link2 /> : <Move />}
                  <span>{node.role === "title" ? "TÍTULO" : node.kind === "image" ? "IMAGEM" : "CARTÃO"}</span>
                </button>

                {node.kind === "image" ? (
                  (() => {
                    const position = node.imageCaptionPosition || "bottom";
                    const caption = (
                      <div className={styles.nodeImageCaption}>
                        <RichTextNode
                          nodeId={node.id}
                          html={node.html}
                          fontSize={14}
                          editable={mode === "select"}
                          label="Legenda da imagem"
                          onSelect={() => onSelectionChange({ kind: "node", id: node.id })}
                          onHtmlChange={(html) => updateNodeHtml(node.id, html)}
                        />
                      </div>
                    );
                    return (
                      <div className={styles.nodeImageArea}>
                        {position === "top" ? caption : null}
                        <div className={styles.nodeImageFrame}>
                          {node.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className={styles.nodeImage}
                              src={node.imageUrl}
                              alt={node.imageAlt || "Imagem do bizu"}
                              style={{ objectFit: node.imageFit || "cover" }}
                              draggable={false}
                            />
                          ) : (
                            <div className={styles.nodeImageMissing}>Imagem indisponível</div>
                          )}
                          {position === "overlay" ? caption : null}
                        </div>
                        {position === "bottom" ? caption : null}
                      </div>
                    );
                  })()
                ) : (
                  <RichTextNode
                    nodeId={node.id}
                    html={node.html}
                    fontSize={node.style.fontSize}
                    editable={mode === "select"}
                    label={node.role === "title" ? "Título do mapa" : "Texto do cartão"}
                    onSelect={() => onSelectionChange({ kind: "node", id: node.id })}
                    onHtmlChange={(html) => updateNodeHtml(node.id, html)}
                  />
                )}

                {selected && mode === "select" ? (
                  <button
                    type="button"
                    className={styles.nodeResizeHandle}
                    aria-label="Redimensionar cartão"
                    title="Arraste para redimensionar"
                    onPointerDown={(event) => beginResize(event, node)}
                  >
                    <Scaling />
                  </button>
                ) : null}
              </article>
            );
          })}

          {mode === "connect" ? (
            <div className={styles.connectModeHint} role="status">
              <Link2 />
              {connectFrom
                ? "Agora escolha o cartão de destino"
                : "Escolha o primeiro cartão da conexão"}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

export default WhiteboardCanvas;
