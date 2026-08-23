import {
  BIZU_POSES,
  type BizuAvatarPose,
  type BizuBlockTone,
  type BizuImage,
  type BizuTextBlock,
} from "./types";

export const WHITEBOARD_VERSION = 2 as const;
export const WHITEBOARD_MEDIA_TOKEN = "__BIZU_MEDIA__";

export type WhiteboardNodeKind = "text" | "image";
export type WhiteboardNodeRole = "title" | "note" | "image";
export type ImageCaptionPosition = "top" | "overlay" | "bottom";

export interface WhiteboardNodeStyle {
  background: string;
  borderColor: string;
  color: string;
  fontSize: number;
}

export interface WhiteboardNode {
  id: string;
  kind: WhiteboardNodeKind;
  role: WhiteboardNodeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  html: string;
  imageUrl?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  imageCaptionPosition?: ImageCaptionPosition;
  style: WhiteboardNodeStyle;
}

export interface WhiteboardConnection {
  id: string;
  from: string;
  to: string;
  color: string;
  width: number;
}

export interface BizuWhiteboardDocument {
  version: typeof WHITEBOARD_VERSION;
  width: number;
  height: number;
  background: string;
  grid: "dots" | "lines" | "none";
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  avatar: {
    pose: BizuAvatarPose;
    side: "left" | "right";
    width: number;
    x: number;
    y: number;
  };
  nodes: WhiteboardNode[];
  connections: WhiteboardConnection[];
}

export interface LegacyBizuContent {
  titulo: string;
  chamada?: string;
  blocos?: readonly BizuTextBlock[];
  imagem?: BizuImage | null;
  pose?: BizuAvatarPose;
  corDestaque?: string;
}

const NODE_BACKGROUNDS: Record<BizuBlockTone, string> = {
  destaque: "#fff7c7",
  atencao: "#ffedd5",
  negativo: "#ffe4e6",
  positivo: "#dcfce7",
};

const NODE_BORDERS: Record<BizuBlockTone, string> = {
  destaque: "#eab308",
  atencao: "#f97316",
  negativo: "#f43f5e",
  positivo: "#22c55e",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function id(prefix: string) {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + "-" + random;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

export function sanitizeRichHtml(value: string) {
  const withoutDangerousBlocks = value
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)[^>]*\/?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const allowed = new Set([
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "mark",
    "br",
    "div",
    "p",
    "ul",
    "ol",
    "li",
    "span",
    "font",
  ]);

  return withoutDangerousBlocks
    .replace(/<\/?([a-z][a-z0-9-]*)(?:\s[^>]*)?>/gi, (whole, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowed.has(tag)) return "";
      if (whole.startsWith("</")) return tag === "br" ? "" : "</" + tag + ">";
      if (tag === "br") return "<br>";
      if (tag === "font") {
        const color = whole.match(/\bcolor\s*=\s*["']?(#[0-9a-f]{3,8}|rgb\([0-9,\s.]+\))["']?/i)?.[1];
        const size = whole.match(/\bsize\s*=\s*["']?([1-7])["']?/i)?.[1];
        return "<font" + (color ? ' color="' + color + '"' : "") + (size ? ' size="' + size + '"' : "") + ">";
      }
      if (tag === "span") {
        const rawStyle = whole.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
        const declarations = (rawStyle?.[1] || rawStyle?.[2] || "")
          .split(";")
          .flatMap((declaration) => {
            const [rawProperty, ...rawValue] = declaration.split(":");
            const property = rawProperty?.trim().toLowerCase();
            const cssValue = rawValue.join(":").trim();
            if (!property || !cssValue) return [];
            if (!["background-color", "color", "font-size", "font-weight", "text-decoration"].includes(property)) {
              return [];
            }
            if (!/^(#[0-9a-f]{3,8}|rgba?\([0-9,\s.]+\)|[0-9.]+(?:px|em|rem|%)|bold|normal|underline|line-through)$/i.test(cssValue)) {
              return [];
            }
            return [property + ": " + cssValue];
          });
        return declarations.length ? '<span style="' + declarations.join("; ") + '">' : "<span>";
      }
      return "<" + tag + ">";
    })
    .slice(0, 30_000);
}

export function htmlToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createTextNode(
  x: number,
  y: number,
  options: Partial<WhiteboardNode> = {}
): WhiteboardNode {
  return {
    id: options.id || id("no"),
    kind: "text",
    role: options.role || "note",
    x,
    y,
    width: options.width ?? 350,
    height: options.height ?? 180,
    html: sanitizeRichHtml(options.html || "<b>Novo cartão</b><br>Digite seu bizu aqui."),
    style: {
      background: options.style?.background || "#ffffff",
      borderColor: options.style?.borderColor || "#7c3aed",
      color: options.style?.color || "#241c33",
      fontSize: options.style?.fontSize || 22,
    },
  };
}

export function createImageNode(
  image: BizuImage,
  x = 1080,
  y = 170
): WhiteboardNode {
  return {
    id: id("imagem"),
    kind: "image",
    role: "image",
    x,
    y,
    width: 390,
    height: 390,
    html: "",
    imageUrl: image.url,
    imageAlt: image.alt,
    imageFit: image.fit,
    imageCaptionPosition: "bottom",
    style: {
      background: "#241c33",
      borderColor: "#d6d3d1",
      color: "#ffffff",
      fontSize: 18,
    },
  };
}

export function createConnection(from: string, to: string): WhiteboardConnection {
  return {
    id: id("conexao"),
    from,
    to,
    color: "#7c3aed",
    width: 4,
  };
}

export function createLegacyWhiteboard(legacy: LegacyBizuContent): BizuWhiteboardDocument {
  const title = createTextNode(410, 70, {
    role: "title",
    width: 720,
    height: 130,
    html: "<b>" + escapeHtml(legacy.titulo || "Meu bizu") + "</b>",
    style: {
      background: "#3b1b62",
      borderColor: legacy.corDestaque || "#facc15",
      color: "#ffffff",
      fontSize: 38,
    },
  });
  const nodes: WhiteboardNode[] = [title];
  const connections: WhiteboardConnection[] = [];

  if (legacy.chamada?.trim()) {
    const intro = createTextNode(485, 240, {
      width: 570,
      height: 120,
      html: escapeHtml(legacy.chamada),
      style: {
        background: "#ede9fe",
        borderColor: "#8b5cf6",
        color: "#2e1065",
        fontSize: 22,
      },
    });
    nodes.push(intro);
    connections.push(createConnection(title.id, intro.id));
  }

  (legacy.blocos || []).forEach((block, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const node = createTextNode(390 + col * 410, 420 + row * 220, {
      width: 360,
      height: 175,
      html:
        (block.rotulo ? "<b>" + escapeHtml(block.rotulo) + "</b><br>" : "") +
        escapeHtml(block.texto),
      style: {
        background: NODE_BACKGROUNDS[block.tom] || "#ffffff",
        borderColor: NODE_BORDERS[block.tom] || "#7c3aed",
        color: "#241c33",
        fontSize: 21,
      },
    });
    nodes.push(node);
    connections.push(createConnection(title.id, node.id));
  });

  if (!legacy.blocos?.length) {
    const first = createTextNode(500, 420, {
      width: 460,
      height: 190,
      html: "<b>Escreva o primeiro bizu</b><br>Use poucas palavras e uma associação forte.",
    });
    nodes.push(first);
    connections.push(createConnection(title.id, first.id));
  }

  if (legacy.imagem?.url) {
    const image = createImageNode(legacy.imagem);
    nodes.push(image);
    connections.push(createConnection(title.id, image.id));
  }

  return {
    version: WHITEBOARD_VERSION,
    width: 1600,
    height: 1000,
    background: "#f8f6ef",
    grid: "dots",
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.72,
    },
    avatar: {
      pose: legacy.pose && BIZU_POSES.includes(legacy.pose) ? legacy.pose : "apontando",
      side: "left",
      width: 340,
      x: 20,
      y: 763,
    },
    nodes,
    connections,
  };
}

function normalizeNode(raw: unknown, index: number, mediaUrl?: string): WhiteboardNode | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind === "image" ? "image" : "text";
  const style = isRecord(raw.style) ? raw.style : {};
  const imageUrl = text(raw.imageUrl);
  return {
    id: text(raw.id, "no-importado-" + index),
    kind,
    role: raw.role === "title" ? "title" : kind === "image" ? "image" : "note",
    x: numberInRange(raw.x, 400 + index * 30, 0, 4000),
    y: numberInRange(raw.y, 100 + index * 30, 0, 3000),
    width: numberInRange(raw.width, kind === "image" ? 390 : 350, 160, 1200),
    height: numberInRange(raw.height, kind === "image" ? 330 : 180, 90, 900),
    html: sanitizeRichHtml(text(raw.html)),
    imageUrl: kind === "image"
      ? imageUrl === WHITEBOARD_MEDIA_TOKEN
        ? mediaUrl
        : imageUrl
      : undefined,
    imageAlt: kind === "image" ? text(raw.imageAlt, "Imagem do bizu") : undefined,
    imageFit: raw.imageFit === "contain" ? "contain" : "cover",
    imageCaptionPosition:
      kind === "image" && (raw.imageCaptionPosition === "top" || raw.imageCaptionPosition === "overlay")
        ? raw.imageCaptionPosition
        : kind === "image"
          ? "bottom"
          : undefined,
    style: {
      background: text(style.background, "#ffffff"),
      borderColor: text(style.borderColor, "#7c3aed"),
      color: text(style.color, "#241c33"),
      fontSize: numberInRange(style.fontSize, 22, 12, 64),
    },
  };
}

export function normalizeWhiteboard(
  raw: unknown,
  legacy: LegacyBizuContent,
  mediaUrl?: string
): BizuWhiteboardDocument {
  if (!isRecord(raw)) return createLegacyWhiteboard(legacy);
  const candidate = isRecord(raw.documento) ? raw.documento : raw;
  if (candidate.version !== WHITEBOARD_VERSION || !Array.isArray(candidate.nodes)) {
    return createLegacyWhiteboard(legacy);
  }

  const documentWidth = numberInRange(candidate.width, 1600, 1000, 4000);
  const documentHeight = numberInRange(candidate.height, 1000, 700, 3000);
  const normalizedNodes = candidate.nodes
    .slice(0, 500)
    .map((node, index) => normalizeNode(node, index, mediaUrl))
    .filter((node): node is WhiteboardNode => Boolean(node))
    .map((node) => {
      const width = Math.min(node.width, documentWidth);
      const height = Math.min(node.height, documentHeight);
      return {
        ...node,
        width,
        height,
        x: Math.min(node.x, documentWidth - width),
        y: Math.min(node.y, documentHeight - height),
      };
    });
  const seenNodeIds = new Set<string>();
  let nodes = normalizedNodes.map((node, index) => {
    const baseId = node.id.trim() || "no-importado-" + index;
    let uniqueId = baseId;
    let suffix = 2;
    while (seenNodeIds.has(uniqueId)) {
      uniqueId = baseId + "-" + suffix;
      suffix += 1;
    }
    seenNodeIds.add(uniqueId);
    return uniqueId === node.id ? node : { ...node, id: uniqueId };
  });
  if (!nodes.length) return createLegacyWhiteboard(legacy);

  // The root media field is the canonical home for large image payloads. Some
  // older documents have that field but no image node, so hydrate one instead
  // of leaving the saved image invisible in the whiteboard.
  if (
    mediaUrl &&
    nodes.length < 500 &&
    !nodes.some((node) => node.kind === "image" && node.imageUrl)
  ) {
    nodes = [
      ...nodes,
      createImageNode({
        url: mediaUrl,
        alt: legacy.imagem?.alt || "Imagem do bizu",
        fit: legacy.imagem?.fit || "cover",
        origem: legacy.imagem?.origem,
      }),
    ];
  }
  const ids = new Set(nodes.map((node) => node.id));
  const rawConnections = Array.isArray(candidate.connections) ? candidate.connections : [];
  const seenConnectionIds = new Set<string>();
  const connections = rawConnections.slice(0, 1500).flatMap((rawConnection, index) => {
    if (!isRecord(rawConnection)) return [];
    const from = text(rawConnection.from).trim();
    const to = text(rawConnection.to).trim();
    if (!ids.has(from) || !ids.has(to) || from === to) return [];
    const baseId = text(rawConnection.id).trim() || "conexao-importada-" + index;
    let uniqueId = baseId;
    let suffix = 2;
    while (seenConnectionIds.has(uniqueId)) {
      uniqueId = baseId + "-" + suffix;
      suffix += 1;
    }
    seenConnectionIds.add(uniqueId);
    return [{
      id: uniqueId,
      from,
      to,
      color: text(rawConnection.color, "#7c3aed"),
      width: numberInRange(rawConnection.width, 4, 1, 12),
    }];
  });
  const avatar = isRecord(candidate.avatar) ? candidate.avatar : {};
  const pose = text(avatar.pose) as BizuAvatarPose;
  const avatarSide = avatar.side === "right" ? "right" : "left";
  const avatarWidth = numberInRange(avatar.width, 340, 220, 560);
  const avatarHeight = avatarWidth * (2 / 3);
  const avatarDefaultX = avatarSide === "right" ? documentWidth - avatarWidth - 20 : 20;
  const avatarDefaultY = documentHeight - avatarHeight - 10;
  const viewport = isRecord(candidate.viewport) ? candidate.viewport : {};

  return {
    version: WHITEBOARD_VERSION,
    width: documentWidth,
    height: documentHeight,
    background: text(candidate.background, "#f8f6ef"),
    grid: candidate.grid === "none" || candidate.grid === "lines" ? candidate.grid : "dots",
    viewport: {
      x: numberInRange(viewport.x, 0, 0, documentWidth),
      y: numberInRange(viewport.y, 0, 0, documentHeight),
      zoom: numberInRange(viewport.zoom, 0.72, 0.35, 1.25),
    },
    avatar: {
      pose: BIZU_POSES.includes(pose) ? pose : legacy.pose || "apontando",
      side: avatarSide,
      width: avatarWidth,
      x: numberInRange(avatar.x, avatarDefaultX, 0, documentWidth - avatarWidth),
      y: numberInRange(avatar.y, avatarDefaultY, 0, documentHeight - avatarHeight),
    },
    nodes,
    connections,
  };
}

export function whiteboardForStorage(
  documento: BizuWhiteboardDocument,
  canonicalMediaUrl?: string | null
) {
  let mediaCaptured = false;
  const validNodeIds = new Set(documento.nodes.slice(0, 500).map((node) => node.id));
  return {
    ...documento,
    nodes: documento.nodes.slice(0, 500).map((node) => {
      const sanitizedNode = { ...node, html: sanitizeRichHtml(node.html) };
      if (node.kind === "text") return sanitizedNode;
      if (
        !canonicalMediaUrl ||
        node.imageUrl !== canonicalMediaUrl ||
        mediaCaptured
      ) {
        return sanitizedNode;
      }
      mediaCaptured = true;
      return { ...sanitizedNode, imageUrl: WHITEBOARD_MEDIA_TOKEN };
    }),
    connections: documento.connections
      .filter(
        (connection) =>
          connection.from !== connection.to &&
          validNodeIds.has(connection.from) &&
          validNodeIds.has(connection.to)
      )
      .slice(0, 1500),
  };
}

export function firstWhiteboardImage(documento: BizuWhiteboardDocument) {
  return documento.nodes.find((node) => node.kind === "image" && node.imageUrl)?.imageUrl;
}

export function upsertWhiteboardImage(
  documento: BizuWhiteboardDocument,
  image: BizuImage
): BizuWhiteboardDocument {
  const existing = documento.nodes.find((node) => node.kind === "image");
  if (!existing) {
    return { ...documento, nodes: [...documento.nodes, createImageNode(image)] };
  }
  return {
    ...documento,
    nodes: documento.nodes.map((node) =>
      node.id === existing.id
        ? {
            ...node,
            imageUrl: image.url,
            imageAlt: image.alt,
            imageFit: image.fit,
          }
        : node
    ),
  };
}

export function whiteboardPlainText(documento: BizuWhiteboardDocument) {
  return documento.nodes
    .filter((node) => node.kind === "text")
    .map((node) => htmlToPlainText(node.html))
    .filter(Boolean)
    .join("\n\n");
}

export function titleFromWhiteboard(documento: BizuWhiteboardDocument) {
  const title = documento.nodes.find((node) => node.role === "title" && node.kind === "text");
  return title ? htmlToPlainText(title.html).slice(0, 180) : "";
}

export function syncWhiteboardTitle(
  documento: BizuWhiteboardDocument,
  title: string
): BizuWhiteboardDocument {
  const titleNode = documento.nodes.find((node) => node.role === "title" && node.kind === "text");
  if (!titleNode) {
    return {
      ...documento,
      nodes: [
        createTextNode(410, 70, {
          role: "title",
          width: 720,
          height: 130,
          html: "<b>" + escapeHtml(title) + "</b>",
          style: {
            background: "#3b1b62",
            borderColor: "#facc15",
            color: "#ffffff",
            fontSize: 38,
          },
        }),
        ...documento.nodes,
      ],
    };
  }
  return {
    ...documento,
    nodes: documento.nodes.map((node) =>
      node.id === titleNode.id
        ? { ...node, html: "<b>" + escapeHtml(title) + "</b>" }
        : node
    ),
  };
}
