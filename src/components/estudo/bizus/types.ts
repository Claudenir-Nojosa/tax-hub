import type { BizuWhiteboardDocument } from "./whiteboard-model";

export const BIZU_POSES = [
  "apontando",
  "explicando",
  "espantado",
  "comemorando",
  "pensando",
  "alerta",
] as const;

export type BizuAvatarPose = (typeof BIZU_POSES)[number];
export type BizuTheme = "sunset" | "oceano" | "arcade" | "noite";
export type BizuLayout = "avatar-esquerda" | "avatar-direita" | "avatar-base";
export type BizuBlockTone = "destaque" | "atencao" | "negativo" | "positivo";

export interface BizuTextBlock {
  id: string;
  rotulo: string;
  texto: string;
  tom: BizuBlockTone;
}

export interface BizuImage {
  url: string;
  alt: string;
  fit: "cover" | "contain";
  origem?: "anexada" | "gerada" | "url";
}

export interface Bizu {
  id: string;
  concursoId?: string | null;
  materia: string;
  topico?: string | null;
  titulo: string;
  chamada: string;
  blocos: BizuTextBlock[];
  pose: BizuAvatarPose;
  tema: BizuTheme;
  layout: BizuLayout;
  corDestaque: string;
  imagem?: BizuImage | null;
  documento: BizuWhiteboardDocument;
  createdAt?: string;
  updatedAt?: string;
}

export interface BizuMateriaOption {
  id?: string;
  nome: string;
  topicos: readonly string[];
  cor?: string;
}

export type BizuTopicosState = Readonly<Record<string, unknown>>;

export interface BizusTabProps {
  concursoId?: string;
  materias?: readonly BizuMateriaOption[];
  topicos?: BizuTopicosState;
}

export interface BizuListResponse {
  items: Bizu[];
  total?: number;
}

export const POSE_LABELS: Record<BizuAvatarPose, string> = {
  apontando: "Apontando",
  explicando: "Explicando",
  espantado: "Espantado",
  comemorando: "Comemorando",
  pensando: "Pensando",
  alerta: "Alerta",
};

export const THEME_LABELS: Record<BizuTheme, string> = {
  sunset: "Pôr do sol",
  oceano: "Oceano",
  arcade: "Papel colorido",
  noite: "Noite tropical",
};

export const LAYOUT_LABELS: Record<BizuLayout, string> = {
  "avatar-esquerda": "Avatar à esquerda",
  "avatar-direita": "Avatar à direita",
  "avatar-base": "Avatar na base",
};

export function bizuAvatarSrc(pose: BizuAvatarPose) {
  return `/bizus/avatar/${pose}.png`;
}

export function novoBizu(concursoId?: string, materia = "", topico = ""): Bizu {
  const now = Date.now();
  const titleId = "no-titulo-" + now;
  const noteId = "no-nota-" + now;
  return {
    id: `rascunho-${Date.now()}`,
    concursoId: concursoId ?? null,
    materia,
    topico: topico || null,
    titulo: "O que não entra nesta regra?",
    chamada: "Transforme a exceção em uma cena que você nunca mais esquece.",
    blocos: [
      {
        id: `bloco-${Date.now()}-1`,
        rotulo: "NÃO É",
        texto: "Escreva aqui o primeiro ponto essencial do seu bizu.",
        tom: "negativo",
      },
      {
        id: `bloco-${Date.now()}-2`,
        rotulo: "LEMBRE",
        texto: "Use poucas palavras, contraste e uma associação visual forte.",
        tom: "destaque",
      },
    ],
    pose: "apontando",
    tema: "sunset",
    layout: "avatar-esquerda",
    corDestaque: "#ffdd57",
    imagem: null,
    documento: {
      version: 2,
      width: 1600,
      height: 1000,
      background: "#f8f6ef",
      grid: "dots",
      viewport: { x: 0, y: 0, zoom: 0.72 },
      avatar: {
        pose: "apontando",
        side: "left",
        width: 340,
        x: 20,
        y: 763,
      },
      nodes: [
        {
          id: titleId,
          kind: "text",
          role: "title",
          x: 410,
          y: 70,
          width: 720,
          height: 130,
          html: "<b>O que não entra nesta regra?</b>",
          style: {
            background: "#3b1b62",
            borderColor: "#ffdd57",
            color: "#ffffff",
            fontSize: 38,
          },
        },
        {
          id: noteId,
          kind: "text",
          role: "note",
          x: 500,
          y: 350,
          width: 460,
          height: 190,
          html: "<b>NÃO É</b><br>Escreva aqui o primeiro ponto essencial do seu bizu.",
          style: {
            background: "#ffe4e6",
            borderColor: "#f43f5e",
            color: "#241c33",
            fontSize: 22,
          },
        },
      ],
      connections: [
        {
          id: "conexao-" + now,
          from: titleId,
          to: noteId,
          color: "#7c3aed",
          width: 4,
        },
      ],
    },
  };
}

export function isRascunho(id: string) {
  return id.startsWith("rascunho-");
}
