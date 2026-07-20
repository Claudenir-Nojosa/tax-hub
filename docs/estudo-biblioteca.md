# Biblioteca de PDFs — Cérebro do Módulo

Aba "Biblioteca" em `/dashboard/estudo`: anexar os PDFs que o usuário estuda (ex.: aulas do
Estratégia Concursos), ler dentro do próprio site, acompanhar progresso e criar cartões de
estudo grifando trechos. Atualize este arquivo sempre que o fluxo de storage, o leitor ou o
grifo→cartão mudarem.

## 1. Onde o arquivo mora: Supabase Storage (privado)

O binário do PDF **nunca** passa pela function do Vercel — o limite de body é ~4,5MB e PDFs do
Estratégia passam disso fácil. Upload e download são **navegador↔Supabase diretos**, via URLs
assinadas mintadas por uma rota autenticada:

```
Anexar:  POST /api/estudo/biblioteca/{id}/arquivo  → {path, token} (autenticado)
              → client Supabase (anon key) faz uploadToSignedUrl() DIRETO pro Storage
Ler:     GET  /api/estudo/biblioteca/{id}/arquivo  → {url assinada, 5 min}
              → fetch(url).blob() no client
Excluir: DELETE /api/estudo/biblioteca/{id}/arquivo
```

- **Bucket**: `biblioteca-pdfs`, `public: false` — nunca público (são materiais pagos do
  usuário). Auto-criado no primeiro upload se ainda não existir (`garantirBucket()` na rota,
  idempotente — ignora erro "already exists").
- **Path**: sempre `${userId}/${id}.pdf`, derivado da **sessão** (NextAuth), nunca do payload do
  client — um `id` adivinhado não dá acesso ao arquivo de outro usuário.
- **Verdade de "tem arquivo"**: campo `PdfEstudo.arquivoEnviado: boolean`, sincronizado junto com
  o resto do `EstudoState` (mesmo blob atômico dos outros módulos) — funciona em qualquer
  dispositivo que o usuário logar, sem checagem por-dispositivo. Antes disso (v1/v2) o arquivo
  vivia no IndexedDB do navegador (`listarIdsComArquivo`, removido) — cada aparelho precisava
  reanexar.
- **Client admin é LAZY** na rota (`clienteAdmin()` dentro de cada handler, não um `export const`
  eager como `src/lib/supabase-admin.ts`): sem as env vars, `createClient(undefined, undefined)`
  explode na hora do IMPORT se for eager, e o guard de "Storage não configurado" nunca chega a
  rodar — o Next devolve um 500 genérico em HTML em vez do JSON esperado. Faça o mesmo em
  qualquer rota nova que precise do Storage.
- **Env vars necessárias** (Vercel + local se for testar): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client de upload no browser — seguro expor, quem autoriza é o
  token assinado, não a chave), `SUPABASE_SERVICE_ROLE_KEY` (só server-side, nas rotas).

## 2. Leitor de PDF próprio (pdf.js)

`src/components/estudo/biblioteca/VisorPdf.tsx` — **não** usa o viewer nativo do navegador
(iframe): não dá o mesmo controle de zoom/virtualização que PDFs de 100+ páginas precisam. Cada
página vira `canvas` + uma camada de texto transparente selecionável (`TextLayer` do pdf.js) —
seleção útil pra ler/copiar, mas a criação de cartão hoje é por botões na barra (seção 4), não
depende dela.

- **Virtualização por CÁLCULO DE SCROLL** (janela ±1200px), não `IntersectionObserver` — em abas
  ocultas/sem foco o compositor pode nunca disparar esses callbacks nem `requestAnimationFrame`;
  `scroll` + `offsetTop` é determinístico em qualquer ambiente.
- **Worker via `workerPort`** (não `workerSrc`): se o `workerSrc` falhar, o pdf.js cai num
  fallback global (`globalThis.pdfjsWorker`) que o `unpdf` — usado pra contar páginas no cadastro
  — registra com OUTRA versão do pdfjs, dando `"API version X does not match Worker version Y"`.
  Com `workerPort` não existe fallback.
- **Ordem de leitura da seleção**: PDFs com caixas de texto (ex.: "Leis Bizuradas" — artigo em
  caixa, comentário fora) gravam o conteúdo numa ordem diferente da ordem visual. A seleção do
  navegador segue ORDEM NO DOM, não posição na tela — sem correção, arrastar uma seleção
  visualmente contínua "salpica" (pega texto de blocos distantes). `ordenarPorLeitura()` reordena
  os itens de `getTextContent()` por posição visual (linhas de cima pra baixo, esquerda→direita
  dentro da linha) ANTES de montar a `TextLayer`.
- **Zoom próprio** (a UI é nossa) e detecção de "página visível" pelo scroll (informa a barra do
  leitor via `onPaginaVisivel`).
- **CSS da TextLayer tem que ser o do v6, não um "mínimo"**: no pdfjs-dist v6 o JS não define
  mais font-size/transform inline nos spans — ele injeta variáveis por span (`--font-height`,
  `--scale-x`, `--rotate`) e é o CSS oficial que as converte em `font-size: calc(...)` e
  `transform: ...`, a partir do `--scale-factor` (= `viewport.scale`) que o app põe no container.
  Um CSS reduzido (só position/color/white-space, padrão da v4) deixa os spans com fonte herdada
  e sem scaleX → a caixa invisível fica de tamanho errado e a SELEÇÃO aparece
  deslocada/maior/menor que o texto do canvas (bug reportado pelo usuário em 2026-07-19).
- **`page.render({ canvas })` só com `canvas`** (API atual do v6): `canvasContext` é compat
  retroativa e a doc exige `canvas: null` quando usado — nunca passar os dois juntos.
- A TextLayer é montada ANTES do desenho do canvas (independentes): texto selecionável mais
  cedo, e a TextLayer não depende de `requestAnimationFrame` (o render do canvas usa rAF
  internamente, que pode nunca disparar em abas ocultas — relevante pros testes automatizados).

## 3. Leitor fullscreen + cronômetro

`LeitorPdf` (dentro de `BibliotecaTab.tsx`): tela cheia limpa (`fixed inset-0`), só o PDF + barra
fina no topo (voltar, "parei na pág. X de N", cronômetro com pausa). O cronômetro conta sozinho
desde a abertura; ao fechar (Esc ou seta ←) com **≥1 minuto**, a sessão vira uma atividade de
Estudo no calendário da **matéria/tópico do PDF** via `onRegistrarSessao` (reusa
`handleTimerSalvar` de `page.tsx` — mesmo fluxo do TimerEstudo, alimenta streak/KPIs/pág-por-hora
sem código novo de persistência). Páginas da sessão = delta do "parei na pág." entre abrir e
fechar.

## 4. Criar cartão MANUAL (sem IA, sem grifo)

Três botões na barra do leitor, logo ao lado de "Parei aqui" (Monstro / V-ou-F / Tesouro — sem
IA, pedido explícito do usuário). Clicar num deles abre, por cima do PDF (que continua visível
atrás), um formulário já travado na matéria/tópico do PDF, com os campos **vazios** — o usuário
preenche do zero, sem precisar selecionar texto nem sair da página do PDF.

Versão anterior (task #110/#111) disparava o formulário ao SELECIONAR um trecho no leitor, com
o trecho pré-preenchendo o campo certo por tipo; o usuário achou a seleção "salpicada"/pouco
confiável em certos PDFs (mesmo após a correção de `ordenarPorLeitura()`) e pediu pra trocar por
botões diretos na barra (task #114) — mais previsível, sem depender de onde o texto cai no
layout do PDF. A TextLayer/seleção de texto continua existindo em `VisorPdf.tsx` (útil pra
ler/copiar), só não dispara mais a criação de cartão.

`novaCartaManual()` monta o `Carta` localmente (mesmos defaults de repetição espaçada do
`CartasTab`), sem nenhuma chamada de rede.

## 5. Progresso, ETA e integração com o Edital/Dashboard

- `PdfEstudo.paginaAtual`/`totalPaginas` → % lido, badge "concluído".
- `calcularPagPorHora(calendario)` (helper compartilhado, `estudo-data.ts`) — só sessões que
  registraram páginas entram na conta — dá o ritmo histórico (pág/h), usado tanto no KPI do
  Dashboard quanto no ETA da Biblioteca ("faltam ~Xh no seu ritmo de Y pág/h").
- **Contagem automática de páginas**: ao anexar, `contarPaginasPdf()` (em `pdf-storage.ts`) lê o
  arquivo no próprio navegador via `unpdf` (mesma lib usada no servidor em `/api/ai/edital-pdf`)
  — preenche "Total de págs." sozinho, campo vira manual só se a detecção falhar.
- `EditalTab.tsx`: chip 📖 % ao lado do tópico quando algum PDF o cobre (média ponderada por
  páginas; prop `pdfs?` opcional — nada renderiza sem PDFs).
- `DashboardTab.tsx`: KPI "Leitura PDFs" (% geral), só aparece com PDFs cadastrados.

## 6. Arquivos

```
src/lib/estudo-data.ts                                    PdfEstudo (+ arquivoEnviado), calcularPagPorHora
src/lib/pdf-storage.ts                                     salvarArquivoPdf/obterArquivoPdf/excluirArquivoPdf/contarPaginasPdf
src/app/api/estudo/biblioteca/[id]/arquivo/route.ts         URLs assinadas (POST/GET/DELETE), client admin lazy
src/components/estudo/BibliotecaTab.tsx                     lista + form + LeitorPdf fullscreen + botões de criar cartão manual
src/components/estudo/biblioteca/VisorPdf.tsx                pdf.js: canvas+TextLayer, virtualização por scroll, ordenarPorLeitura
src/components/estudo/EditalTab.tsx                          chip 📖 % por tópico (prop pdfs opcional)
src/components/estudo/DashboardTab.tsx                       KPI "Leitura PDFs"
```

## 7. Verificação

- `npx tsc --noEmit`.
- Sem credenciais reais do Storage num ambiente: validar o **degrade gracioso** — sem sessão ou
  sem env vars, as rotas devolvem JSON claro (401 "Não autorizado" / 500 "Storage não
  configurado"), o metadado do PDF é salvo mesmo se o upload falhar, e a linha mostra "Anexar"
  (não "Ler PDF") quando `arquivoEnviado` não é `true`.
- Com credenciais reais: cadastrar um PDF com arquivo → confirmar "Ler PDF" aparece → abrir →
  clicar cada um dos 3 botões de cartão na barra → criar um cartão de cada tipo sem sair da
  página do PDF → excluir o PDF e confirmar que o objeto some do bucket (best-effort, não
  bloqueia a exclusão do metadado).
