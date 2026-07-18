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
(iframe): o nativo não expõe seleção de texto pro site, e sem isso não dá pra grifar. Cada
página vira `canvas` + uma camada de texto transparente selecionável (`TextLayer` do pdf.js).

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

## 3. Leitor fullscreen + cronômetro

`LeitorPdf` (dentro de `BibliotecaTab.tsx`): tela cheia limpa (`fixed inset-0`), só o PDF + barra
fina no topo (voltar, "parei na pág. X de N", cronômetro com pausa). O cronômetro conta sozinho
desde a abertura; ao fechar (Esc ou seta ←) com **≥1 minuto**, a sessão vira uma atividade de
Estudo no calendário da **matéria/tópico do PDF** via `onRegistrarSessao` (reusa
`handleTimerSalvar` de `page.tsx` — mesmo fluxo do TimerEstudo, alimenta streak/KPIs/pág-por-hora
sem código novo de persistência). Páginas da sessão = delta do "parei na pág." entre abrir e
fechar.

## 4. Grifo → cartão MANUAL (sem IA)

Selecionar um trecho no leitor abre uma barrinha perguntando o **tipo** (Monstro / V-ou-F /
Tesouro — sem IA, pedido explícito do usuário após reverter uma primeira versão que usava
gpt-4o). Escolhido o tipo, abre um formulário já travado na matéria/tópico do PDF com o trecho
grifado **pré-preenchido no campo certo**:
- Monstro → vira o **verso** (resposta); usuário escreve a pergunta.
- V-ou-F → vira o **frente** (afirmação); usuário escreve a explicação + escolhe o gabarito.
- Tesouro → vira os dois; usuário edita o frente pra inserir o `___`.

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
src/components/estudo/BibliotecaTab.tsx                     lista + form + LeitorPdf fullscreen + grifo→cartão manual
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
  grifar um trecho → criar um cartão de cada tipo → excluir o PDF e confirmar que o objeto some
  do bucket (best-effort, não bloqueia a exclusão do metadado).
