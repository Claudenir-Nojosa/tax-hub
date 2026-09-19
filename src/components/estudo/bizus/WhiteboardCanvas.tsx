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

// grade de alinhamento — arrastar/criar cartão sempre cai num múltiplo disso, pra não ficar
// "sujo" (cartões quase-mas-não-exatamente alinhados). Mesmo valor usado pelo ponto de criação
// de cartão novo em BizuEditor.tsx (addCard) — os dois precisam bater pro resultado ser
// consistente entre criar e arrastar.
export const GRADE_ALINHAMENTO = 20;

export function alinharNaGrade(valor: number): number {
  return Math.round(valor / GRADE_ALINHAMENTO) * GRADE_ALINHAMENTO;
}

interface Ponto {
  x: number;
  y: number;
}

interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

function retanguloDoNo(node: WhiteboardNode, margem = 16): Retangulo {
  return { x: node.x - margem, y: node.y - margem, width: node.width + margem * 2, height: node.height + margem * 2 };
}

// ponto na BORDA do cartão mais próximo do alvo (não o centro) — a linha sai/entra rente à
// borda, resultado mais "reto"/objetivo do que sair sempre do meio do cartão
function pontoNaBorda(node: WhiteboardNode, alvo: Ponto): Ponto {
  const c = center(node);
  const dx = alvo.x - c.x;
  const dy = alvo.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const escalaX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const escalaY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const escala = Math.min(escalaX, escalaY);
  return { x: c.x + dx * escala, y: c.y + dy * escala };
}

function cross(o: Ponto, a: Ponto, b: Ponto): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentosSeCruzam(p1: Ponto, p2: Ponto, p3: Ponto, p4: Ponto): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// se o SEGMENTO de reta p1-p2 cruza (ou está contido em) o retângulo — usado pra saber se a
// conexão precisa desviar de algum outro cartão no caminho
function segmentoCruzaRetangulo(p1: Ponto, p2: Ponto, rect: Retangulo): boolean {
  const esquerda = rect.x;
  const direita = rect.x + rect.width;
  const topo = rect.y;
  const base = rect.y + rect.height;
  if (Math.max(p1.x, p2.x) < esquerda || Math.min(p1.x, p2.x) > direita) return false;
  if (Math.max(p1.y, p2.y) < topo || Math.min(p1.y, p2.y) > base) return false;
  const lados: [Ponto, Ponto][] = [
    [{ x: esquerda, y: topo }, { x: direita, y: topo }],
    [{ x: direita, y: topo }, { x: direita, y: base }],
    [{ x: direita, y: base }, { x: esquerda, y: base }],
    [{ x: esquerda, y: base }, { x: esquerda, y: topo }],
  ];
  if (lados.some(([a, b]) => segmentosSeCruzam(p1, p2, a, b))) return true;
  const dentro = (p: Ponto) => p.x >= esquerda && p.x <= direita && p.y >= topo && p.y <= base;
  return dentro(p1) && dentro(p2);
}

// caminho reto entre `from` e `to`, desviando de qualquer OUTRO cartão que esteja no meio do
// caminho — sem curva (só segmentos retos): quando um segmento cruza um cartão, insere um ponto
// de desvio pela lateral mais curta (acima/abaixo se o trecho for mais horizontal, do lado se for
// mais vertical) e repete a checagem, até no máximo 6 desvios (evita loop infinito em layouts
// muito apertados — nesse caso fica com o desvio parcial já encontrado, não trava).
function rotearConexao(from: WhiteboardNode, to: WhiteboardNode, todosOsNos: WhiteboardNode[]): Ponto[] {
  let pontos: Ponto[] = [pontoNaBorda(from, center(to)), pontoNaBorda(to, center(from))];
  const obstaculos = todosOsNos.filter((n) => n.id !== from.id && n.id !== to.id).map((n) => retanguloDoNo(n));
  if (obstaculos.length === 0) return pontos;

  for (let iteracao = 0; iteracao < 6; iteracao++) {
    let ajustou = false;
    for (let i = 0; i < pontos.length - 1; i++) {
      const a = pontos[i];
      const b = pontos[i + 1];
      const obstaculo = obstaculos.find((rect) => segmentoCruzaRetangulo(a, b, rect));
      if (!obstaculo) continue;
      const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
      const margemDesvio = 18;
      let desvio: Ponto;
      if (horizontal) {
        const meioY = (a.y + b.y) / 2;
        const distAcima = Math.abs(meioY - obstaculo.y);
        const distAbaixo = Math.abs(meioY - (obstaculo.y + obstaculo.height));
        const y = distAcima <= distAbaixo ? obstaculo.y - margemDesvio : obstaculo.y + obstaculo.height + margemDesvio;
        const centroObstaculoX = obstaculo.x + obstaculo.width / 2;
        const dentroDoIntervalo = centroObstaculoX >= Math.min(a.x, b.x) && centroObstaculoX <= Math.max(a.x, b.x);
        desvio = { x: dentroDoIntervalo ? centroObstaculoX : (a.x + b.x) / 2, y };
      } else {
        const meioX = (a.x + b.x) / 2;
        const distEsquerda = Math.abs(meioX - obstaculo.x);
        const distDireita = Math.abs(meioX - (obstaculo.x + obstaculo.width));
        const x = distEsquerda <= distDireita ? obstaculo.x - margemDesvio : obstaculo.x + obstaculo.width + margemDesvio;
        const centroObstaculoY = obstaculo.y + obstaculo.height / 2;
        const dentroDoIntervalo = centroObstaculoY >= Math.min(a.y, b.y) && centroObstaculoY <= Math.max(a.y, b.y);
        desvio = { x, y: dentroDoIntervalo ? centroObstaculoY : (a.y + b.y) / 2 };
      }
      pontos = [...pontos.slice(0, i + 1), desvio, ...pontos.slice(i + 1)];
      ajustou = true;
      break;
    }
    if (!ajustou) break;
  }
  return pontos;
}

function connectionPath(from: WhiteboardNode, to: WhiteboardNode, todosOsNos: WhiteboardNode[]) {
  const pontos = rotearConexao(from, to, todosOsNos);
  return pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
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
            avatar: { ...current.avatar, x: alinharNaGrade(x), y: alinharNaGrade(y) },
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
              item.id === node.id ? { ...item, x: alinharNaGrade(x), y: alinharNaGrade(y) } : item
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
              const path = connectionPath(from, to, documento.nodes);
              return (
                <g key={connection.id}>
                  <path
                    className={styles.connectionHitbox}
                    d={path}
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
                    d={path}
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
                  ? { x: -GRADE_ALINHAMENTO, y: 0 }
                  : event.key === "ArrowRight"
                    ? { x: GRADE_ALINHAMENTO, y: 0 }
                    : event.key === "ArrowUp"
                      ? { x: 0, y: -GRADE_ALINHAMENTO }
                      : event.key === "ArrowDown"
                        ? { x: 0, y: GRADE_ALINHAMENTO }
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
                      ? { x: -GRADE_ALINHAMENTO, y: 0 }
                      : event.key === "ArrowRight"
                        ? { x: GRADE_ALINHAMENTO, y: 0 }
                        : event.key === "ArrowUp"
                          ? { x: 0, y: -GRADE_ALINHAMENTO }
                          : event.key === "ArrowDown"
                            ? { x: 0, y: GRADE_ALINHAMENTO }
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
