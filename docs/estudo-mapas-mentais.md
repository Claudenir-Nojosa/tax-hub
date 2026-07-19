# Mapas Mentais — Cérebro do Módulo

Aba "Mapas Mentais" em `/dashboard/estudo`: editor de mapas mentais estilo Xmind (nó central,
ramos coloridos, texto formatável, imagens), cada mapa vinculado a uma matéria/tópico do edital.
Atualize este arquivo sempre que o layout, o editor ou o formato de dados mudarem.

## 1. Modelo de dados

`NoMapaMental` (`src/lib/estudo-data.ts`) é uma árvore recursiva:

```ts
interface NoMapaMental {
  id: string;
  texto: string;
  negrito?: boolean;
  italico?: boolean;
  cor?: string;       // cor do texto (hex) — undefined = cor padrão do ramo
  corFundo?: string;  // hex — undefined = cor do ramo (translúcida)
  corBorda?: string;  // hex — undefined = cor do ramo
  semBorda?: boolean;
  imagem?: string;    // data URL já comprimida (ver seção 4)
  colapsado?: boolean;
  filhos: NoMapaMental[];
}
```

`MapaMental` = `{ id, titulo, materia, topico?, raiz: NoMapaMental, criadoEm, atualizadoEm? }`.
`EstudoState.mapasMentais: MapaMental[]` — persiste no mesmo blob JSON de sempre (localStorage +
debounce 2s pro banco), sem rota de API nova.

**Decisão deliberada**: nada aqui usa Supabase Storage. Diferente da Biblioteca de PDFs (que
precisou de Storage por causa do limite de body do Vercel em arquivos grandes), imagens de mapa
mental são pequenas e comprimidas no client (seção 4) — embutir como base64 direto no JSON evita
reabrir toda a complexidade de bucket/RLS/signed URL só pra thumbnails.

## 2. Layout: árvore bidirecional estilo Xmind

`src/components/estudo/mapas/mapa-utils.ts` — `calcularLayout(raiz)` calcula a posição de cada
nó e o path SVG de cada conector, sem nenhuma dependência de DOM (puro, testável).

- **Raiz no centro** (x=0, y=0); filhos de 1º nível são divididos entre **esquerda e direita**
  por um heurístico de balanceamento (ordena por nº de folhas da subárvore, distribui
  alternando pro lado com menor peso acumulado — 1º item sempre vai pra direita).
- Dentro de cada lado, cada subárvore é posicionada recursivamente por
  `posicionarGalho()`: nó-folha (ou colapsado) ocupa um "slot" vertical (`altura + GAP_VERTICAL`
  px, cursor avança); nó com filhos fica na média do `y` dos filhos. Profundidade determina `x`
  (`profundidade * NIVEL_ESPACAMENTO_X * sinal`).
- Depois de posicionar os dois lados independentemente (cada um com seu próprio cursor
  começando em 0), cada lado é recentralizado (`y -= média dos filhos de 1º nível daquele
  lado`) pra que a raiz fique visualmente entre os dois ramos.
- **Cor do ramo**: cada filho de 1º nível recebe uma cor de `PALETA_RAMOS` (cicla por índice);
  todos os descendentes herdam a mesma cor (repassada recursivamente), a menos que o nó tenha
  `cor`/`corFundo`/`corBorda` explícitos.
- **Conectores**: bezier cúbica horizontal (`M x1,y1 C cx1,y1 cx2,y2 x2,y2`), pontos de controle
  na metade do caminho — visual em "S" suave igual Xmind.
- **Tamanho de nó é heurístico** (não medição real do DOM): `estimarLargura()` por tamanho do
  texto, `estimarAltura()` fixo (maior se tem imagem). Simplificação deliberada pra v1 — textos
  muito longos podem crescer além do estimado (a caixa tem `minHeight`, não altura fixa), com
  risco pequeno de sobreposição visual com o vizinho; refinar com medição real via ref+reflow se
  virar problema recorrente.

## 3. Editor (`EditorMapaMental.tsx`) — canvas fullscreen

Fullscreen (`fixed inset-0`) igual ao leitor da Biblioteca. Canvas com pan (arrastar o fundo) e
zoom (roda do mouse ou botões, sempre centrado no cursor/centro da viewport — recalcula `pan`
proporcionalmente ao `zoom` novo). Coordenadas do "mundo" (a saída de `calcularLayout`) são
plotadas num canvas grande fixo (6000×4000px) com origem em (3000,2000) — `left/top` de cada nó
e o `<g transform="translate(...)">` da SVG usam esse offset. Canvas fixo (em vez de redimensionar
conforme a árvore cresce) evita que editar o mapa mude o ponto de referência do pan/zoom atual.

- **Seleção**: clicar num nó abre um painel lateral fixo (texto, negrito/itálico, cor de
  texto/fundo/borda — paletas de swatch, sem color-picker livre —, imagem, adicionar
  filho/irmão, excluir, e o botão de colapsar embutido no próprio nó). Clicar no fundo vazio do
  canvas desseleciona.
- **Atalhos**: Tab = novo filho do selecionado, Enter = novo irmão (ignorado se raiz
  selecionada), Delete/Backspace = excluir (raiz é protegida, nunca some). Todos os 3 checam
  `document.activeElement` e são **ignorados se o foco estiver num input/textarea** — senão
  atrapalhariam digitar texto normalmente no painel.
- **Estado local + propagação por efeito**: o editor mantém `mapaLocal` como state próprio
  (fonte de verdade enquanto edita) e só chama o `onChange` do pai dentro de um `useEffect`
  disparado por mudanças em `mapaLocal` — **nunca dentro do updater do `setMapaLocal`**. Chamar
  o `onChange` (que atualiza o componente pai) de dentro de um updater de `setState` é o
  anti-padrão "Cannot update a component while rendering a different component" que o React
  acusa em dev. O efeito também deliberadamente **não** inclui `onChange` nas deps — o
  `onChange` recebido do `MapasMentaisTab` é uma arrow function recriada a cada render do pai, e
  incluí-la causaria um loop (efeito dispara → `onChange` → setState no pai → pai re-renderiza →
  nova função `onChange` → efeito dispara de novo, infinitamente).
- **LIÇÃO — pointerup vaza pro fundo do canvas**: o botão de colapsar/expandir embutido em cada
  nó chamava `e.stopPropagation()` no `onClick`, mas isso não impede um evento **pointerup**
  separado de borbulhar até o container do canvas (são dois tipos de evento distintos —
  `stopPropagation` num não afeta o outro). O handler `onPointerUpCanvas` desselecionava sempre
  que `!moveuRef.current` (ou seja, qualquer clique-sem-arrastar), inclusive quando o clique foi
  num botão DENTRO de um nó — resultado: clicar em "Colapsar" fechava o painel lateral junto.
  Corrigido checando `(e.target as HTMLElement).closest("[data-no-id]")` também no
  `onPointerUpCanvas`, pulando o deselect se o pointerup terminou dentro de um nó. Qualquer novo
  controle interativo dentro de `NoView` deve ter esse cuidado em mente.

## 4. Imagem: comprimida no client, sem upload

`comprimirImagem(arquivo)` em `mapa-utils.ts`: `createImageBitmap()` → redimensiona pra no
máximo 480px de largura (mantendo proporção) → desenha num `<canvas>` → `toDataURL("image/jpeg",
0.75)`. Um PNG de 800×600 vira ~3-4KB em base64. Resultado embutido direto em
`NoMapaMental.imagem` — sem rede, sem bucket.

## 5. Lista (`MapasMentaisTab.tsx`)

Agrupada por matéria (mesmo padrão de `BibliotecaTab`/`CartasTab`: `resolverCorMateria`,
ordenado pela ordem do edital). Cada card mostra uma **miniatura real** do mapa: a própria saída
de `calcularLayout()` renderizada como `<svg viewBox="...">` com `<rect>`/`<path>` (sem texto,
só formas e cores) — reaproveita 100% o cálculo do editor, sem lógica de preview separada.
Ações: editar (abre `EditorMapaMental`), duplicar (`clonarComNovosIds()` — gera ids novos pra
não colidir com o mapa original), excluir (`confirm()`).

`novoMapa()` cria um `MapaMental` com `raiz: criarMapaVazio()` (1 nó "Tema central") e abre o
editor direto — sem formulário de criação intermediário; título/matéria/tópico são editados na
própria barra do editor.

## 6. Arquivos

```
src/lib/estudo-data.ts                          NoMapaMental, MapaMental, EstudoState.mapasMentais
src/components/estudo/mapas/mapa-utils.ts        árvore imutável (CRUD), calcularLayout, comprimirImagem, paleta
src/components/estudo/mapas/EditorMapaMental.tsx editor fullscreen: canvas pan/zoom, painel, atalhos
src/components/estudo/MapasMentaisTab.tsx        lista agrupada por matéria + miniaturas SVG
```

## 7. Verificação

- `npx tsc --noEmit`.
- Rota descartável `/signup/preview-mapas` (padrão do projeto): criar mapa → adicionar
  filhos/irmãos (botão e teclado) → negrito/itálico → cor de texto/fundo/borda → anexar imagem →
  colapsar/expandir (conferir que o painel permanece aberto) → excluir nó não-raiz → confirmar
  que a raiz não pode ser excluída → voltar pra lista → conferir miniatura, contagem de nós e
  pluralização → duplicar → excluir mapa.
- Testes automatizados de interação (clique/teclado) via `javascript_tool` devem sempre aguardar
  o próximo tick antes de reconferir o DOM (`setTimeout` curto) — checar o DOM na mesma chamada
  síncrona que disparou o evento vai ler o estado ANTES do React re-renderizar e parece um bug
  que não existe.
