# Trilha Dinâmica — Cérebro do Módulo

Aba "Trilha" em `/dashboard/estudo`. **Reformulada por completo em 2026-08-03** (a pedido do
usuário): saiu o modelo DIÁRIO (dia pertence a um grupo do Ciclo A/B/C, ciclo avança quando os
blocos do dia são entregues) e entrou um modelo **SEMANAL** — a semana inteira cobre TODAS as
matérias ativas ao mesmo tempo, sem rotação de grupo. Ganhou também: leitura guiada por página
(deep link pro leitor de PDF + aviso de "passou do conteúdo"), reforço rápido pós-estudo (além do
escalonamento A-D), estimativa de conclusão da trilha inteira, e "Gustavo" — o consultor de
estudos que fala com o usuário pelo nome, no Dashboard e no topo da Trilha. Continua **100%
derivada do progresso real, recalculada a cada render** — nenhum plano pré-gerado. Atualize este
arquivo se as regras mudarem.

## 1. As regras (método do usuário, na ordem em que ele descreveu)

1. **A semana cobre TODAS as matérias ativas de uma vez** (não mais um grupo A/B/C por dia). O
   total de minutos da semana (soma de `horasPorDia` no Ciclo — 7 dias) é dividido PROPORCIONAL-
   MENTE AO PESO (1 ou 2, configurado no Ciclo) entre as matérias com teoria pendente, sempre no
   **tópico atual** (primeiro não estudado) de cada uma. Consequência: o campo `divisao`
   (A/B/C) do Ciclo ficou **deprecated** — a coluna e a seção "Ciclo Ativo" sumiram da tela, o
   dado continua no tipo só pra não quebrar registros antigos. O tempo é monitorado pelas sessões
   de estudo do calendário (leitor de PDF/Timer, atividades tipo "estudo" da matéria, somadas nos
   7 dias da semana ISO — segunda a domingo — que contém "hoje").
2. **Leitura guiada por página**: cada `PdfEstudo` pode ter `intervalosPaginas` — um mapeamento
   tópico → página início/fim. Quando o tópico atual de um bloco tem um PDF com esse mapeamento,
   "Ler PDF" abre o leitor JÁ na página de início e mostra um overlay bloqueante ("Voltar à página
   X" / "Continuar mesmo assim") se o usuário rolar além da página final indicada. Mapeamento
   manual (`FormPdf.tsx`) ou sugerido por IA (`/api/ai/pdf-topicos-paginas` — extrai o texto por
   página com `unpdf`, pede pro `gpt-4o` localizar os tópicos, sempre com revisão humana antes de
   salvar). Sem mapeamento pro tópico, "Ler PDF" cai no comportamento antigo (abre onde parou,
   sem aviso).
3. **Questões escalonadas A-D**: cada tópico tem 4 grupos de questões — os cadernos A/B/C/D do
   Edital (grupo "feito" = acertos+erros > 0). Concluir o tópico k libera: grupo **A do k-1**,
   **B do k-2**, **C do k-3**, **D do k-4**. Quando a teoria da matéria acaba, a "cauda" (grupos
   cujo gatilho seria um tópico que não existe) libera toda de uma vez. Regra inalterada pela
   reformulação semanal — é agnóstica de cadência, sempre foi.
4. **Reforço rápido (novo)**: assim que um tópico é marcado como estudado, se tiver um link de
   caderno CURTO cadastrado (`TopicoState.linkReforcoImediato`, aba Questões, até ~10 questões
   pelo pedido do usuário), ele aparece na trilha **uma única vez** — sem cooldown/reaparecimento,
   é "pratique agora", distinto do reforço A-D (que é sobre desempenho fraco recorrente). Some da
   trilha assim que `reforcoImediatoFeito` é registrado.
5. **Matéria 100%** = teoria completa + os 4 grupos de TODOS os tópicos feitos. `DIAS_REVISAO_
   MATERIA` (3) dias depois da conclusão entra a atividade "revisão da matéria: 30 questões
   englobando todos os tópicos" — link próprio (`ConfigMateria.linkRevisaoMateria`).
6. **Cartas**: a cada 2 domingos (14 dias), atividade de revisar as cartas. Âncora = primeiro
   domingo após a ativação da trilha.
7. **Sem dívida acumulada entre semanas**: cada `MetaSemana` é recalculada do zero a partir do
   peso configurado — se uma matéria não bate a meta de horas numa semana, a semana seguinte só
   reparte de novo, sem "carregar" o que faltou (decisão explícita do usuário: mais simples, sem
   estado novo pra guardar).
8. **Reforço de tópicos fracos A-D**: um grupo "feito" com **menos de 70% de acerto**
   (`LIMIAR_REFORCO_PERC`) volta a aparecer na trilha depois de **3 dias** sem atualização
   (`REFORCO_COOLDOWN_DIAS`). Qualquer novo registro de acertos/erros nesse grupo reinicia a
   contagem (`TopicoCaderno.atualizadoEm`).
9. **Revisão das questões do link**: cada tópico tem até 2 links de caderno cadastrados na aba
   Questões (`linkRevisao7d`/`linkRevisao30d`, distintos do reforço rápido do item 4). Quando os
   4 grupos A-D do tópico ficam feitos, a revisão entra na trilha em **dois checkpoints
   INDEPENDENTES** (7 e 30 dias, cada um contado da mesma data de conclusão). Abaixo de 70%,
   aquele checkpoint específico volta como reforço depois de 3 dias sem atualização.
10. **Estimativa de conclusão da trilha inteira** (novo, `estimativaConclusaoTrilha`): soma
    páginas de teoria restantes em todos os PDFs das matérias ativas (dividido pela velocidade
    real de leitura, `calcularPagPorHora`) com o tempo estimado das tarefas de questões que ainda
    faltam (grupos A-D + checkpoints 7/30d + reforços imediatos, só quem tem link/PDF cadastrado
    — a revisão de 30 questões de matéria concluída fica de fora de propósito, é rara), dividido
    pelo ritmo semanal do Ciclo. Sem dado suficiente em algum dos dois eixos, mostra "ainda
    calculando" em vez de inventar um número.
11. **Gustavo**: bolha de mensagem (Dashboard + topo da Trilha, mesma função geradora dos dois —
    `gerarMensagemGustavo` em `trilha-ui.ts`) que cumprimenta pelo primeiro nome
    (`session.user.name`) e aponta a próxima atividade pendente, na mesma ordem de prioridade que
    define qual seção ganha o destaque "Comece aqui": conteúdo > questões/reforços A-D > reforço
    rápido > revisão (link 7/30d, revisão de matéria, cartas).

## 2. Arquitetura: derivar > persistir

`src/lib/trilha-dinamica.ts` — funções puras, sem React/DOM. As funções de análise por matéria
(`analisarMateria`, `analisarReforcos`, `statusRevisaoLink`/`analisarRevisoesLink`,
`analisarReforcosImediatos`) e `distribuirMinutosPorPeso` são **agnósticas de cadência** — não
sabem se é dia ou semana, reaproveitadas sem alteração desde o modelo diário:

- `analisarMateria(materia, topicos)` → tópico atual, questões liberadas (com motivo), grupos
  feitos, matéria concluída. TUDO derivado de `EstudoState.topicos` (estudado + cadernos A-D).
- `analisarReforcos(materia, topicos, hoje)` → grupos A-D fracos e esfriados.
- `analisarReforcosImediatos(materia, topicos)` → tópicos com `estudado && linkReforcoImediato &&
  !reforcoImediatoFeito` — sem cooldown, é "faça uma vez".
- `statusRevisaoLink`/`analisarRevisoesLink` → checkpoints 7/30d do link de revisão.
- `distribuirMinutosPorPeso(minutosSemana, pesos)` → divisão do tempo por maiores restos
  (Hamilton): cada matéria recebe `floor(peso/pesoTotal * minutosSemana)` e a sobra do
  arredondamento vai 1 a 1 pras matérias com maior parte fracionária perdida.
- `semanaAtual(hoje)` → `{inicio, fim}` (segunda a domingo que contém `hoje`).
- `minutosEstudoNaSemana(calendario, inicio, fim, materia)` → soma `duracao` de sessões tipo
  "estudo" da matéria nos 7 dias da semana.
- `computarMetaSemana({hoje, trilha, configCiclo, materiasAtivas, topicos, calendario, pdfs})` →
  **orquestrador central**, substitui o antigo `computarMetaDia` por completo: blocos de leitura
  (alvo/feito em minutos, ponderados por peso, com `pdfId/paginaInicio/paginaFim` resolvidos via
  `PdfEstudo.intervalosPaginas` quando existe mapeamento — se mais de um PDF cobrir o mesmo tópico
  com intervalo definido, vence o primeiro em `pdfs` = o mapeamento mais recente), questões
  pendentes, reforços A-D, reforços imediatos, revisões de link, revisões de 30, domingo de
  cartas. `MateriaLike = {nome, topicos}` — aceita `MateriaDef`, `MateriaConcurso`, `MateriaBase`.
- `estimativaConclusaoTrilha({hoje, materiasAtivas, configCiclo, topicos, calendario, pdfs})` →
  ver regra 10.
- `criarTrilhaDinamica()` → estado inicial na ativação (não seta mais `grupoCiclo`).

**Removidos no corte pra semanal** (sem atalho de compatibilidade, mesmo padrão de outras trocas
de modelo neste módulo): `computarMetaDia`, `MetaDia`, `BlocoEstudo`, `resolverGrupoEfetivo`,
`materiasDoGrupo`, `grupoCicloSeguinte`, `GrupoCiclo`, `GRUPOS_CICLO`, `minutosEstudoHoje`,
`DIAS_SEMANA`.

`EstudoState.trilhaDinamica` (`TrilhaDinamicaState`) guarda SÓ o que não dá pra derivar: datas de
conclusão de matéria (`conclusaoMaterias`), revisões de 30 feitas, âncora + domingos de cartas
feitos. `grupoCiclo`/`grupoCicloAvancadoEm` ficaram **deprecated** (campo opcional, não lido pelo
motor novo — só não apagado do tipo pra não quebrar trilhas já ativas com dado antigo salvo).

## 3. UI (`TrilhaTab.tsx` + `trilha/TrilhaLinhas.tsx`) e bookkeeping

`TrilhaTab.tsx` é o orquestrador: bolha do Gustavo no topo → hero semanal ("Semana de DD/MM a
DD/MM", anel de progresso sobre a % de blocos entregues, streak) → seções por TIPO de atividade,
cada uma em seu próprio `SectionCard` (Conteúdo / Questões / Reforço rápido / Revisão) — só a
primeira seção com algo pendente (mesma ordem de prioridade da fala do Gustavo) ganha o anel de
destaque + badge "Comece aqui" → grade "Progresso rumo aos 100%" por matéria → card de estimativa
de conclusão. Os componentes de linha/corpo de cada seção (`CorpoBloco`, `CorpoReforcos`,
`CorpoQuestoes`, `CorpoReforcosImediatos`, `CorpoRevisoesLink`, `CorpoRevisao30`, `CorpoCartas`,
`CardMateria`) vivem em `src/components/estudo/trilha/TrilhaLinhas.tsx` — extraídos de
`TrilhaTab.tsx` pra esse não virar um arquivo gigante de novo.

Cada bloco de estudo, uma vez que bate o tempo alvo (`concluido`), troca o botão "Ler PDF" por
**"Marcar como estudado"** (`topicos[key].estudado = true`, mesmo caminho de escrita do
`EditalTab.toggleEstudado`) — sempre um "set true" explícito, nunca automático.

Bookkeeping via `useEffect` (guard contra loop): matéria recém-100% → grava
`conclusaoMaterias[nome] = hoje` (uma vez). Não existe mais "avançar o ciclo" pra persistir —
cada `MetaSemana` é recalculada do zero a cada render (regra 7).

### 3.1 Leitura guiada por página (deep link + overlay)

Fluxo: `CorpoBloco.onIrParaBiblioteca(abertura?)` → `TrilhaTab` repassa pro `page.tsx`
(`onIrParaBiblioteca={(abertura) => { setAberturaPdf(abertura); setActiveTab("biblioteca"); }}`)
→ `BibliotecaTab` recebe `aberturaSolicitada`/`onAberturaConsumida`, um `useEffect` aciona o
`abrirLeitor` já existente com `paginaAbertura`/`paginaFimAlvo` → `LeitorPdf` desacopla o ponto de
abertura de `pdf.paginaAtual` (`paginaInicialRef = paginaAbertura ?? pdf.paginaAtual`) e mostra um
overlay bloqueante (`fixed inset-0 z-[110]`, mesmo padrão do `NovoCartaoForm.tsx`) quando
`paginaVisivel > paginaFimAlvo`, uma vez por sessão. `VisorPdf` virou `forwardRef` com
`scrollParaPagina(pagina)` imperativo, pro botão "Voltar à página X" do overlay funcionar.

**Regra do bookmark que só avança**: `pdf.paginaAtual` serve pra duas coisas — retomar leitura E
calcular páginas lidas da sessão. Se o usuário abre um PDF num tópico ANTERIOR (deep link pra uma
página menor que a já registrada), "Parei aqui" não pode reescrever `paginaAtual` pra trás, senão
bagunça o bookmark de "por onde retomar". `commitarPagina()` bloqueia esse regresso; um
`paginaAtualNaAberturaRef` separado (sempre o bookmark real no momento da abertura, desacoplado do
alvo do deep link) garante que o cálculo de páginas-lidas-na-sessão não fique errado.

### 3.2 Reforço rápido (`QuestoesTab.tsx` + `LinhaReforcoImediato`)

Terceiro campo de link por tópico na aba Questões (ícone `Zap`, ao lado dos de 7d/30d), grava
`TopicoState.linkReforcoImediato`. `LinhaReforcoImediato` (`TrilhaLinhas.tsx`) mira o padrão de
`LinhaRevisaoLink`: clicar abre o link numa nova aba E expande o form de acertos/erros; salvar
grava `reforcoImediatoFeito` (mesmo shape `RevisaoLinkTopico` reaproveitado, não duplicado) e o
item some da seção.

## 4. Aviso de meta no leitor de PDF

`page.tsx` calcula `metaMinutosRestantes: Record<materia, minutos>` a partir de
`computarMetaSemana` (`b.minutosAlvoSemana - b.minutosFeitosSemana` por bloco) e passa por
`BibliotecaTab` → `LeitorPdf`. Como a meta agora é semanal (não mais diária), o toast "🎯 Meta
batida" dispara bem mais raro que no modelo antigo — esperado, é a mesma lógica só que numa janela
maior.

`DashboardTab`: `CardTrilha` mostra o resumo da SEMANA (blocos feitos, período "DD/MM–DD/MM",
pendências); `MensagemDoDia` foi rebatizada como a bolha do Gustavo, chamando
`gerarMensagemGustavo` (a mesma função usada no topo da Trilha).

## 5. Arquivos

```
src/lib/trilha-dinamica.ts                  motor puro (análise por matéria + meta da SEMANA + estimativa)
src/lib/estudo-data.ts                       TrilhaDinamicaState, TopicoPaginas, PdfEstudo.intervalosPaginas
src/components/estudo/TrilhaTab.tsx          orquestrador: Gustavo + hero semanal + seções + estimativa
src/components/estudo/trilha/TrilhaLinhas.tsx  linhas/corpos de cada seção (extraído do TrilhaTab)
src/components/estudo/trilha/trilha-ui.ts    fmtHoras/resolverCorMateria/gerarMensagemGustavo (compartilhados)
src/components/estudo/QuestoesTab.tsx        cadastro dos links (7d/30d + reforço rápido por tópico + revisão de matéria)
src/components/estudo/DashboardTab.tsx       CardTrilha (resumo da semana) + bolha do Gustavo
src/components/estudo/biblioteca/FormPdf.tsx  intervalo de páginas por tópico (manual + "Sugerir com IA")
src/components/estudo/biblioteca/BibliotecaTab.tsx  aberturaSolicitada → deep link pro LeitorPdf
src/components/estudo/biblioteca/LeitorPdf.tsx  paginaAbertura/paginaFimAlvo, overlay de fim de conteúdo, bookmark só-avança
src/components/estudo/biblioteca/VisorPdf.tsx  forwardRef + scrollParaPagina (controle imperativo)
src/app/api/ai/pdf-topicos-paginas/route.ts  sugestão de intervalo de páginas por IA (unpdf + gpt-4o)
```

## 6. Verificação

- `npx tsc --noEmit` a cada fase.
- Sem suíte automatizada neste módulo — verificação funcional real no navegador via preview local
  (ativar uma trilha numa conta de teste vazia): blocos com metas semanais plausíveis (não mais
  "3h" e sim algo como "15h" pra semana toda), "Divisão" sumida do Ciclo, seções por tipo com o
  destaque "Comece aqui" na primeira pendente, bolha do Gustavo no Dashboard e na Trilha, card de
  estimativa em ambos os estados ("ainda calculando" / com dado real), reforço rápido some da
  seção ao registrar resultado, `FormPdf` com o intervalo de páginas + botão "Sugerir com IA"
  (guarda: sem arquivo anexado, erro explícito em vez de chamar a rota).
- Fluxo do leitor guiado (mapear um intervalo manualmente, clicar "Ler PDF" no bloco, abrir na
  página certa, overlay ao passar da página final, bookmark não regride numa revisita) depende de
  um PDF de verdade anexado — não testável numa conta de dev vazia; validado por leitura de código
  + `tsc` limpo em todo o fluxo (`TrilhaLinhas` → `page.tsx` → `BibliotecaTab` → `LeitorPdf` →
  `VisorPdf`).
