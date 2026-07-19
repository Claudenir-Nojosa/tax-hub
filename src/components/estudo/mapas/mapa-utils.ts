import type { NoMapaMental } from "@/lib/estudo-data";

// Helpers puros (sem React) do editor de Mapas Mentais: CRUD imutável da árvore, layout
// bidirecional estilo Xmind (raiz central, ramos esquerda/direita) e compressão de imagem.
// Nada aqui depende de DOM além de comprimirImagem (canvas), que só roda no client.

export const PALETA_RAMOS = [
  "#f97316", // laranja
  "#ec4899", // rosa
  "#8b5cf6", // violeta
  "#3b82f6", // azul
  "#10b981", // esmeralda
  "#eab308", // amarelo
  "#ef4444", // vermelho
  "#14b8a6", // teal
];
export const COR_RAIZ = "#475569"; // slate — cor neutra do nó raiz (não é um "ramo")

export function criarNo(texto = "Novo tópico"): NoMapaMental {
  return {
    id: `no_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    texto,
    filhos: [],
  };
}

export function criarMapaVazio(): NoMapaMental {
  return criarNo("Tema central");
}

export function encontrarNo(raiz: NoMapaMental, id: string): NoMapaMental | null {
  if (raiz.id === id) return raiz;
  for (const f of raiz.filhos) {
    const achado = encontrarNo(f, id);
    if (achado) return achado;
  }
  return null;
}

export function encontrarPai(raiz: NoMapaMental, filhoId: string): NoMapaMental | null {
  for (const f of raiz.filhos) {
    if (f.id === filhoId) return raiz;
    const achado = encontrarPai(f, filhoId);
    if (achado) return achado;
  }
  return null;
}

// clona a árvore aplicando `transformar` em cada nó que bater com `id` — o resto é
// referencialmente reconstruído (imutabilidade rasa o bastante pro React perceber a mudança)
function mapearArvore(raiz: NoMapaMental, id: string, transformar: (no: NoMapaMental) => NoMapaMental): NoMapaMental {
  if (raiz.id === id) return transformar(raiz);
  if (raiz.filhos.length === 0) return raiz;
  return { ...raiz, filhos: raiz.filhos.map((f) => mapearArvore(f, id, transformar)) };
}

export function atualizarNo(raiz: NoMapaMental, id: string, patch: Partial<NoMapaMental>): NoMapaMental {
  return mapearArvore(raiz, id, (no) => ({ ...no, ...patch }));
}

export function adicionarFilho(raiz: NoMapaMental, paiId: string, novoNo: NoMapaMental): NoMapaMental {
  return mapearArvore(raiz, paiId, (no) => ({ ...no, colapsado: false, filhos: [...no.filhos, novoNo] }));
}

// adiciona irmão logo depois de `depoisDeId`, dentro dos filhos de `paiId`
export function adicionarIrmao(raiz: NoMapaMental, paiId: string, depoisDeId: string, novoNo: NoMapaMental): NoMapaMental {
  return mapearArvore(raiz, paiId, (no) => {
    const idx = no.filhos.findIndex((f) => f.id === depoisDeId);
    const filhos = idx === -1 ? [...no.filhos, novoNo] : [...no.filhos.slice(0, idx + 1), novoNo, ...no.filhos.slice(idx + 1)];
    return { ...no, filhos };
  });
}

// remove um nó (e sua subárvore) de onde estiver; nunca remove a raiz (o chamador deve checar)
export function removerNo(raiz: NoMapaMental, id: string): NoMapaMental {
  return {
    ...raiz,
    filhos: raiz.filhos.filter((f) => f.id !== id).map((f) => removerNo(f, id)),
  };
}

// --- Layout bidirecional (estilo "Mind Map" do Xmind: raiz central, ramos pra esquerda e pra
// direita, balanceados por número de folhas) ---

export interface NoPosicionado {
  no: NoMapaMental;
  x: number; // centro horizontal da caixa — renderização usa left = x - largura/2
  y: number; // centro vertical da caixa — renderização usa top = y - altura/2
  largura: number;
  altura: number;
  lado: "raiz" | "esquerda" | "direita";
  corRamo: string;
  profundidade: number;
}

export interface Conexao {
  d: string; // path SVG (bezier cúbica)
  cor: string;
}

export interface LayoutMapa {
  nos: NoPosicionado[];
  conexoes: Conexao[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const NIVEL_ESPACAMENTO_X = 260;
const GAP_VERTICAL = 22;

function estimarLargura(no: NoMapaMental, profundidade: number): number {
  const base = profundidade === 0 ? 200 : 170;
  return Math.min(base + 60, Math.max(base - 60, no.texto.length * 7.2 + 40));
}

function estimarAltura(no: NoMapaMental): number {
  return no.imagem ? 100 : 46;
}

// conta quantas "folhas visuais" a subárvore tem (nó colapsado ou sem filhos = 1 folha) — usado
// só pra balancear esquerda/direita, não pro posicionamento em si
function contarFolhas(no: NoMapaMental): number {
  if (no.colapsado || no.filhos.length === 0) return 1;
  return no.filhos.reduce((s, f) => s + contarFolhas(f), 0);
}

export function calcularLayout(raiz: NoMapaMental): LayoutMapa {
  const nos: NoPosicionado[] = [];
  const conexoesBrutas: { filhoId: string; paiId: string; cor: string; lado: "esquerda" | "direita" }[] = [];

  const filhosRaiz = raiz.colapsado ? [] : raiz.filhos;
  const comPeso = filhosRaiz.map((f) => ({ no: f, peso: contarFolhas(f) })).sort((a, b) => b.peso - a.peso);
  const esquerda: NoMapaMental[] = [];
  const direita: NoMapaMental[] = [];
  let pesoEsq = 0;
  let pesoDir = 0;
  comPeso.forEach(({ no, peso }, i) => {
    // primeiro nó sempre vai pra direita (leitura natural), resto balanceia por peso acumulado
    if (i === 0 || pesoDir <= pesoEsq) {
      direita.push(no);
      pesoDir += peso;
    } else {
      esquerda.push(no);
      pesoEsq += peso;
    }
  });

  const raizLargura = estimarLargura(raiz, 0);
  const raizAltura = estimarAltura(raiz);

  function layoutLado(filhos: NoMapaMental[], lado: "esquerda" | "direita"): { ys: number[]; centro: number } {
    const cursor = { y: 0 };
    const ys: number[] = [];
    filhos.forEach((f, idx) => {
      const cor = PALETA_RAMOS[(pontoDePartida(lado) + idx) % PALETA_RAMOS.length];
      const y = posicionarGalho(f, 1, lado, cor, cursor, nos, conexoesBrutas);
      ys.push(y);
    });
    const centro = ys.length > 0 ? ys.reduce((s, v) => s + v, 0) / ys.length : 0;
    return { ys, centro };
  }
  function pontoDePartida(lado: "esquerda" | "direita") {
    return lado === "direita" ? 0 : direita.length;
  }

  const resDireita = layoutLado(direita, "direita");
  const resEsquerda = layoutLado(esquerda, "esquerda");

  // recentraliza cada lado pra que a "média" dos filhos de 1º nível fique alinhada com y=0 (raiz)
  for (const n of nos) {
    if (n.lado === "direita") n.y -= resDireita.centro;
    else if (n.lado === "esquerda") n.y -= resEsquerda.centro;
  }

  nos.push({ no: raiz, x: 0, y: 0, largura: raizLargura, altura: raizAltura, lado: "raiz", corRamo: COR_RAIZ, profundidade: 0 });

  // conexões: agora que todo mundo tem y final, monta os paths (raiz -> filhos de 1º nível e
  // demais níveis usam o y já registrado em `nos`)
  const conexoes: Conexao[] = [];
  const porId = new Map(nos.map((n) => [n.no.id, n]));
  for (const c of conexoesBrutas) {
    const pai = porId.get(c.paiId);
    const filho = porId.get(c.filhoId);
    if (!pai || !filho) continue;
    const sinal = c.lado === "esquerda" ? -1 : 1;
    const x1 = pai.x + sinal * (pai.largura / 2);
    const x2 = filho.x - sinal * (filho.largura / 2);
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cx2 = x2 - (x2 - x1) * 0.5;
    conexoes.push({ d: `M ${x1},${pai.y} C ${cx1},${pai.y} ${cx2},${filho.y} ${x2},${filho.y}`, cor: c.cor });
  }
  // raiz -> filhos de 1º nível (não estão em conexoesBrutas porque a raiz não passa por posicionarGalho)
  for (const f of filhosRaiz) {
    const filho = porId.get(f.id);
    if (!filho) continue;
    const lado = filho.lado === "esquerda" ? -1 : 1;
    const x1 = lado * (raizLargura / 2);
    const x2 = filho.x - lado * (filho.largura / 2);
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cx2 = x2 - (x2 - x1) * 0.5;
    conexoes.push({ d: `M ${x1},0 C ${cx1},0 ${cx2},${filho.y} ${x2},${filho.y}`, cor: filho.corRamo });
  }

  const xs = nos.map((n) => n.x);
  const ys = nos.map((n) => n.y);
  return {
    nos,
    conexoes,
    minX: Math.min(...xs) - 140,
    maxX: Math.max(...xs) + 140,
    minY: Math.min(...ys) - 60,
    maxY: Math.max(...ys) + 60,
  };
}

// posiciona uma subárvore (nó `no` e seus descendentes) para um lado, empurrando o cursor
// vertical; registra em `saida` e guarda as conexões pai->filho em `conexoesBrutas` (o y do pai
// só é conhecido com certeza depois que a recursão volta, então o path final é montado em
// calcularLayout usando o mapa `porId`)
function posicionarGalho(
  no: NoMapaMental,
  profundidade: number,
  lado: "esquerda" | "direita",
  corRamo: string,
  cursor: { y: number },
  saida: NoPosicionado[],
  conexoesBrutas: { filhoId: string; paiId: string; cor: string; lado: "esquerda" | "direita" }[]
): number {
  const largura = estimarLargura(no, profundidade);
  const altura = estimarAltura(no);
  const semFilhosVisiveis = no.colapsado || no.filhos.length === 0;

  let y: number;
  if (semFilhosVisiveis) {
    y = cursor.y + altura / 2;
    cursor.y += altura + GAP_VERTICAL;
  } else {
    const ys = no.filhos.map((f) => {
      const yFilho = posicionarGalho(f, profundidade + 1, lado, corRamo, cursor, saida, conexoesBrutas);
      conexoesBrutas.push({ filhoId: f.id, paiId: no.id, cor: corRamo, lado });
      return yFilho;
    });
    y = ys.reduce((s, v) => s + v, 0) / ys.length;
  }

  const x = profundidade * NIVEL_ESPACAMENTO_X * (lado === "esquerda" ? -1 : 1);
  saida.push({ no, x, y, largura, altura, lado, corRamo, profundidade });
  return y;
}

export function contarNos(no: NoMapaMental): number {
  return 1 + no.filhos.reduce((s, f) => s + contarNos(f), 0);
}

// clona a árvore inteira com ids novos (usado ao duplicar um mapa) — evita dois mapas com nós de
// mesmo id, mesmo que isso hoje não cause bug (encontrarNo/etc. sempre operam numa única árvore
// por vez), é o tipo de coisa que morde depois se alguma feature futura cruzar mapas
export function clonarComNovosIds(no: NoMapaMental): NoMapaMental {
  return { ...no, id: `no_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, filhos: no.filhos.map(clonarComNovosIds) };
}

// comprime uma imagem no client (canvas) antes de embutir como data URL no nó — evita blobs
// gigantes no EstudoState (mapas mentais tendem a ter várias imagens pequenas)
export async function comprimirImagem(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const MAX_LARGURA = 480;
  const escala = Math.min(1, MAX_LARGURA / bitmap.width);
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  return canvas.toDataURL("image/jpeg", 0.75);
}
