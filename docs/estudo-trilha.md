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
   - **Capítulos manuais (2026-08-03, substitui a sugestão por IA na prática — o usuário achou a
     versão índice-por-tópico ruim)**: `PdfEstudo.capitulos?: CapituloPdf[]` — nome + página de
     início + `paginaFim?` OPCIONAL + `subcapitulos?` (mesmo shape, um nível só). Dois jeitos de
     cadastrar: rápido em `FormPdf.tsx` (só início — o fim fica ausente, DERIVADO depois: a página
     anterior ao início do próximo capítulo, o do último vai até `paginaConteudoFim`/`totalPaginas`)
     ou, de dentro do leitor (`PainelCapitulos.tsx`, botão "Capítulos" na barra do `LeitorPdf.tsx`,
     dockado ao lado do PDF como o painel de Questões), com início E FIM explícitos — cada campo
     tem um botão "usar página atual" pra preencher com a página que está vendo, sem digitar; avisa
     (sem travar) quando o fim declarado passa de `paginaConteudoFim`. TODOS os capítulos de um PDF
     pertencem ao MESMO tópico (o de `topicos`) — sem campo de tópico por capítulo, porque um PDF
     cobre um tópico só, na prática (mesma convenção de `topicos?.[0]` já usada no resto da
     Biblioteca). `resolverCapitulos` (`trilha-dinamica.ts`) primeiro ACHATA capítulos+subcapítulos
     numa lista única, na ordem de leitura (um capítulo COM subcapítulos vira um item por
     subcapítulo — mais granular, é isso que a Trilha sequencia; sem subcapítulos, o capítulo
     inteiro é o item), depois resolve o `paginaFim` de cada item (o declarado, ou derivado do
     próximo item quando ausente). Quando o PDF resolvido pro tópico atual tem `capitulos`,
     `resolverPaginaBloco` usa `proximoBlocoCapitulos` em vez do `intervalosPaginas` inteiro: acha
     o primeiro item ainda não lido (`paginaAtual` do PDF, que só avança) e agrupa os PRÓXIMOS itens
     consecutivos até estimar `MINUTOS_ALVO_ATIVIDADE_CAPITULO` (30min) de leitura no ritmo de
     páginas/hora do usuário (`calcularPagPorHora` sobre o calendário DESSE concurso) — sem
     nenhuma sessão de leitura registrada ainda nesse concurso (concurso novo, trilha gerada no
     primeiro dia), cai em `PAG_POR_HORA_PADRAO` (15 pág/h, estimativa honesta pra material denso
     de concurso) em vez de desistir de agrupar — sem isso, cada capítulo virava uma atividade
     própria já de cara, mesmo os de 2 páginas. O ritmo REAL sempre assume assim que existe 1
     sessão com páginas registrada; itens curtos somem sozinhos dentro do grupo, sem virar uma
     atividade ridiculamente pequena na Trilha. O bloco ganha `capituloLabel` ("Capítulo 3
     de 6: Crédito Tributário" ou "Capítulos 4-5 de 6") — `CorpoBloco` (`TrilhaLinhas.tsx`) mostra
     isso no lugar do intervalo de página cru. Sem estado de "capítulo concluído" separado: o mesmo
     bookmark `paginaAtual` decide tudo, exatamente como já decidia "PDF lido" antes disso existir.
     PDFs sem `capitulos` continuam no comportamento de `intervalosPaginas` de sempre — nada
     migrado automaticamente, os dois convivem.
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
12. **Gustavo cobra a evolução** (2026-08-03, mesmo dia da reformulação semanal, a pedido do
    usuário — "quero que o Gustavo acompanhe minha rotina, ajuste meu planejamento quando eu
    atraso e me cobre minha evolução"). Sinais novos, cada um checado em `computarMetaSemana`
    (por semana) ou `analisarHistoricoSemanas` (por várias semanas), com a PRIORIDADE decidida em
    `gerarMensagemGustavo` — a primeira condição verdadeira "ganha" a mensagem da vez:
    1. **Inatividade** (`diasSemAtividade`, `estudo-data.ts`): 2+ dias corridos sem nenhuma
       atividade no calendário → "Cadê você? 👀". Capado nos dias desde `trilha.iniciadaEm`
       (`diffDias`) pra uma trilha recém-ativada não aparecer como "abandonada" antes mesmo de
       começar.
    2. **Atraso NESTA semana** (`MetaSemana.atrasado`/`ritmoNecessarioMinDia`): comparado o
       realizado com o proporcional esperado até hoje (`minutosSemana * diasDecorridos/7`), só
       dispara a partir do 2º dia da semana e exigindo estar bem abaixo (60%) do esperado — evita
       cobrar na segunda de manhã ou por uma variação normal do dia a dia. A mensagem recalcula o
       ritmo necessário nos dias que restam (`ritmoNecessarioMinDia`) SEM mexer em nada salvo —
       é só orientação em tempo real.
    3. **Tendência fraca em várias semanas** (`SemanaHistorico`, `analisarHistoricoSemanas`):
       últimas `JANELA_TENDENCIA` (3) semanas COMPLETAS todas abaixo de `LIMIAR_TENDENCIA_FRACA_
       PERC` (50%) → sugestão de reduzir as horas semanais no Ciclo. É só sugestão — o usuário
       aprova manualmente no Ciclo de Estudos, nada muda sozinho. Exige pelo menos 2 semanas de
       histórico (não soa alarme com uma amostra de 1 semana ruim, que pode ter sido pontual).
    4. **Fluxo normal** (item 11 acima) ganha uma nota comparativa opcional quando a semana
       passada teve um resultado bem diferente (±20 pontos) do que está dando essa semana — ex.:
       "(semana passada: 45%)".

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
- `analisarHistoricoSemanas({hoje, trilha, configCiclo, calendario, maxSemanas?})` → últimas
  semanas COMPLETAS (não inclui a atual), mais recente primeiro, cada uma com `percCumprido`
  (0-100). A META de cada semana passada usa a config ATUAL do Ciclo (mesma simplificação do
  resto do motor — não existe snapshot histórico de `configCiclo` em lugar nenhum do app); só o
  REALIZADO é histórico de verdade, vindo do `calendario`. Ver regra 12.
- `MetaSemana.percCumpridoSemana`/`ritmoNecessarioMinDia`/`atrasado` (computados dentro de
  `computarMetaSemana`) → ver regra 12.
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
- Gustavo cobrando evolução (regra 12): testado ao vivo o caminho "trilha recém-ativada, dia 1 da
  semana, sem histórico" (mensagem normal de sempre, sem "Cadê você" nem "atrasado" — confirma o
  capping de `diasSemAtividade` contra `trilha.iniciadaEm` e o guard `diasDecorridos >= 2`
  funcionando). Os 3 caminhos que dependem de dados que só existem depois de dias/semanas de uso
  real (inatividade 2+ dias, atraso mid-semana, tendência fraca em 3 semanas) NÃO foram exercidos
  ao vivo — não dá pra simular "3 semanas atrás" numa conta de teste sem estado histórico de
  verdade; validados por `tsc` limpo + leitura de código (a lógica de prioridade em
  `gerarMensagemGustavo` é determinística e coberta por raciocínio manual dos 3 cenários).
