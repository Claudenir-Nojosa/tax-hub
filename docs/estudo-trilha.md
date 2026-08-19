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

**Camada nova em 2026-08-07 (fila de atividades + Metas com carry-over, ver seção 7)**: a UI da
Trilha (hero + 4 seções por tipo) foi substituída por um card "Meta N" + tabela de atividades +
card de próxima Meta bloqueada (`src/lib/trilha-fila.ts` + `src/components/estudo/trilha/
MetaAtualCard.tsx`/`TabelaAtividades.tsx`/`ProximaMetaCard.tsx`). O motor semanal descrito abaixo
(`computarMetaSemana`) **continua existindo, sem alteração**, e ainda alimenta o Gustavo, o card
"Progresso rumo aos 100%" e a estimativa de conclusão — só a apresentação central da aba Trilha
passou a vir da fila nova. Ver seção 7 pra detalhes; o resto deste documento descreve o motor
semanal, que é a base de tudo (a fila nova reaproveita as mesmas funções de análise, sem duplicar
regra nenhuma).

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
     consecutivos até estimar `minutosAlvo` de leitura no ritmo de páginas/hora do usuário
     (`calcularPagPorHora` sobre o calendário DESSE concurso) — sem nenhuma sessão de leitura
     registrada ainda nesse concurso (concurso novo, trilha gerada no primeiro dia), cai em
     `PAG_POR_HORA_PADRAO` (15 pág/h, estimativa honesta pra material denso de concurso) em vez de
     desistir de agrupar — sem isso, cada capítulo virava uma atividade própria já de cara, mesmo os
     de 2 páginas. O ritmo REAL sempre assume assim que existe 1 sessão com páginas registrada.
     **`minutosAlvo` (2026-08-03) é o `minutosAlvoSemana` da MATÉRIA naquela semana** (a fatia
     proporcional ao peso dela no total de `horasPorDia` do Ciclo — já calculada em
     `computarMetaSemana` antes de chamar `resolverPaginaBloco`), com piso em
     `MINUTOS_ALVO_ATIVIDADE_CAPITULO_PISO` (30min, só pra evitar uma atividade ridícula quando a
     fatia semanal da matéria é minúscula) — **não** um teto fixo de 30min pra toda matéria: se o
     usuário reservou 3h/semana pra Língua Portuguesa, a atividade de leitura agrupa capítulos até
     cobrir essas 3h de fato (dezenas de páginas, não 1), exatamente proporcional ao tempo disponível
     — sem isso, uma matéria com muitas horas reservadas ficava com atividades de leitura ridiculamente
     curtas (ex.: 1 capítulo de 1 página só) em vez de aproveitar o tempo todo da semana. Itens curtos
     somem sozinhos dentro do grupo, sem virar uma atividade pequena isolada na Trilha. O bloco ganha
     `capituloLabel` ("Capítulo 3
     de 6: Crédito Tributário" ou "Capítulos 4-5 de 6") — `CorpoBloco` (`TrilhaLinhas.tsx`) mostra
     isso no lugar do intervalo de página cru. Sem estado de "capítulo concluído" separado: o mesmo
     bookmark `paginaAtual` decide tudo, exatamente como já decidia "PDF lido" antes disso existir.
   - **Subtarefas por capítulo (2026-08-03)**: quando o bloco agrupa MAIS de um capítulo,
     `BlocoEstudoSemana.capitulos?: CapituloBlocoItem[]` carrega cada um deles (o `CapituloResolvido`
     de sempre + `indice` GLOBAL 1-based, pra numerar certo mesmo quando o bloco não começa no
     capítulo 1 — ex.: "Capítulo 4: Regras Gerais de Acentuação"). `CorpoBloco` renderiza isso como
     uma lista de subtarefas clicáveis abaixo da atividade principal — cada linha abre o leitor
     DIRETO naquele capítulo (`onIrParaBiblioteca({ pdfId, paginaInicio, paginaFim })` do próprio
     capítulo, não do bloco inteiro) e mostra check preenchido quando `cap.lido` (mesmo bookmark
     `paginaAtual`, sem estado novo). Com 1 capítulo só no bloco, a lista não aparece — o
     `capituloLabel` singular já basta.
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
   estado novo pra guardar). **Continua valendo pro motor semanal (`MetaSemana`) em si** — a
   camada de Metas da seção 7 abaixo é quem reverte isso, especificamente pro conceito de "Meta
   N" que a UI mostra hoje (decisão nova, também explícita do usuário, pra um propósito
   diferente: carry-over de ATIVIDADES discretas, não de minutos da semana).
8. **Reforço de tópicos fracos A-D — tentativas ilimitadas, histórico nunca sobrescrito**: um grupo
   "feito" com **menos de 70% de acerto** (`LIMIAR_REFORCO_PERC`) na sua ÚLTIMA tentativa (não mais
   o agregado do caderno) volta a aparecer na trilha depois de **3 dias** sem atualização
   (`REFORCO_COOLDOWN_DIAS`), oferecendo uma NOVA rodada. Cada rodada é um bloco de questões
   dedicado só àquele grupo (`adicionarRodadaReforco`, sem rotação A-D) — as tentativas anteriores
   nunca são tocadas, e o histórico completo (tentativa 1, 2, 3... infinitas) é derivado ao vivo de
   `PdfQuestoes.resultados` agrupado por bloco (`tentativasDoGrupo`, estudo-data.ts), sem nenhum
   campo novo persistido. Pedido explícito do usuário: ele queria "marcação real" (responder
   questões de novo, não uma confirmação sem nota), mas com o percentual de cada tentativa visível
   separadamente — nunca reescrevendo o resultado original só porque uma rodada de reforço foi
   melhor. A conclusão da atividade (`estaAtividadeConcluida`, `trilha-fila.ts`) exige só que a
   rodada-alvo tenha sido respondida por inteiro, **não** que tenha batido 70% — o limiar decide
   apenas se uma PRÓXIMA rodada será oferecida depois do cooldown, não se a atual conclui. Cada
   rodada tem seu próprio id (`` r:materia:topico:grupo:tentativa ``, não mais só
   `` r:materia:topico:grupo ``), já que a fila de Metas nunca reoferece um id já atribuído — sem
   isso, a 2ª rodada em diante nunca voltaria a aparecer. `TopicoCaderno.acertos/erros` (usado em
   Edital, Dashboard, XP, escalonamento) continua sendo o agregado de TODAS as tentativas somadas
   — não muda de significado, só a Trilha passou a olhar por tentativa isolada pra esta atividade
   específica.
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
    **Reescrita por IA (2026-08-03)**: `gerarMensagemGustavo` continua 100% determinística (nenhum
    fato sai dela sem ser calculado de verdade) — mas o TEXTO que aparece na tela agora passa por
    `/api/ai/gustavo-mensagem` (gpt-4o, temperature alta pra variar a cada chamada), que reescreve
    título+corpo com um tom mais motivador/pessoal, SEM poder inventar, remover ou alterar nenhum
    fato (número, nome de matéria/tópico, percentual — regra explícita no prompt da rota). O hook
    `useMensagemGustavoIA` (`trilha-ui.ts`) orquestra isso: mostra a versão determinística na hora
    (sem esperar rede, sem flash de loading), chama a rota em `useEffect`, e troca pela reescrita
    quando chega — falha da IA não quebra nada, só fica na versão determinística pra sempre. Cache
    em memória por conteúdo (chave = `titulo|||corpo`) evita rechamar a IA pra reescrever a MESMA
    mensagem só porque o usuário trocou de aba (Dashboard ↔ Trilha, mesmo texto-base nos dois).
    **Avatar por humor (2026-08-03)**: cada cenário de `gerarMensagemGustavo` também define um
    `humor: "feliz" | "nervoso" | "triste" | "normal"` (mesmo objeto `MensagemGustavo`, campo que
    NUNCA passa pela IA — a rota só reescreve titulo/corpo, `useMensagemGustavoIA` sempre devolve o
    `humor` fresco do `base` atual). `MensagemDoDia`/`GustavoBubble` trocaram o ícone genérico
    (Compass) por `<Image src={`/${humor}.png`} .../>` — 4 PNGs de uma coruja mascote em
    `/public` (`feliz.png`, `nervoso.png`, `triste.png`, `normal.png`), mapeados 1:1 com a
    prioridade de cenário: inatividade→triste, atraso/tendência fraca→nervoso, tudo em dia→feliz,
    fluxo normal (atividade nova ou pendente)→normal.
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
src/lib/trilha-fila.ts                       fila de atividades + Metas com carry-over (ver seção 7)
src/lib/estudo-data.ts                       TrilhaDinamicaState, TopicoPaginas, PdfEstudo.intervalosPaginas, FilaMetasState/MetaPersistida
src/components/estudo/TrilhaTab.tsx          orquestrador: Gustavo + Meta atual/próxima Meta + estimativa
src/components/estudo/trilha/MetaAtualCard.tsx    "Meta N" + barra de progresso com foguete + 4 stats
src/components/estudo/trilha/TabelaAtividades.tsx  tabela de atividades da Meta atual
src/components/estudo/trilha/ProximaMetaCard.tsx   card bloqueado + botão "finalizar/ignorar"
src/components/estudo/trilha/TrilhaLinhas.tsx  CardMateria (grade "Progresso rumo aos 100%") — os Corpo* de seção por tipo foram removidos (substituídos pela TabelaAtividades)
src/components/estudo/trilha/trilha-ui.ts    fmtHoras/resolverCorMateria/gerarMensagemGustavo (compartilhados)
src/components/estudo/QuestoesTab.tsx        cadastro dos links (7d/30d + reforço rápido por tópico + revisão de matéria + toggle "sem link, não vou cadastrar")
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

## 7. Fila de atividades + Metas com carry-over (2026-08-07)

Camada nova em `src/lib/trilha-fila.ts`, em cima do motor semanal (que continua intacto — ver
seções 1-6). Motivação do usuário: quer uma UI parecida com a de um concorrente ("Guruja") — card
"Meta N" com barra de progresso, 4 stats, tabela de atividades, e um card "Próxima meta" bloqueado
— dimensionada por ATIVIDADES DISCRETAS (não minutos brutos) e com **carry-over de verdade**: uma
atividade que libera mas não coube na Meta atual tem que aparecer na Meta seguinte, não pode sumir
(reverte a regra 7 **só** pro conceito de Meta — o motor semanal em si continua "sem dívida
acumulada").

### 7.1 Dois conceitos novos

1. **Fila global de atividades** (`construirFilaGlobal`) — enumeração EXAUSTIVA do edital inteiro
   (teoria por tópico, os 4 grupos A-D, reforço, reforço rápido, revisão de link, revisão de
   matéria, cartas), sempre derivada ao vivo (mesmo espírito "deriva > persiste" das seções
   1-6) — reaproveita `analisarMateria`/`analisarReforcos`/`analisarReforcosImediatos`/
   `analisarRevisoesLinkMateria` **sem alterá-las**, só normaliza a saída pro shape
   `FilaAtividade`. Só devolve o que está elegível-e-pendente agora (mesma liberação escalonada
   de sempre — nada de novo sendo inventado).
2. **Fronteira de Meta persistida** (`TrilhaDinamicaState.filaMetas`, tipos `FilaMetasState`/
   `MetaPersistida`/`MetaAtividadeRef` em `estudo-data.ts`) — só os IDS das atividades atribuídas
   a cada Meta N (mais um snapshot dos campos DESCRITIVOS: título, tipo, tempo estimado — que não
   mudam depois de criados). "Concluída" e "desempenho %" NUNCA vêm desse snapshot — são sempre
   recalculados ao vivo (`estaAtividadeConcluida`), pra a tabela sempre refletir o registro mais
   recente do caderno. Campo 100% aditivo no blob `Json` já existente — zero migração de banco,
   zero coluna nova (a rota `api/concurso/[id]/progresso` já faz passthrough puro de
   `trilhaDinamica`); trilha ativada antes desta reforma carrega `filaMetas: undefined` e recebe
   bootstrap preguiçoso na próxima leitura.

### 7.2 Cobertura garantida (os 56 tópicos sem link de revisão)

Medido no banco real do concurso "Curso Regular para Área Fiscal": 394 tópicos, 171 Blocos de
questões, **56 tópicos sem NENHUMA cobertura de revisão de link** (nem Bloco, nem
`linkRevisao7d`/`30d` próprio) — hoje isso era invisível, `analisarRevisoesLink` simplesmente não
gerava nada pra eles. Teoria e questões A-D já cobrem 100% dos tópicos (nenhuma mudança precisou
disso); a lacuna real era só a revisão do link. Resolvido com um tipo de atividade novo:

- Tópico com os 4 grupos A-D completos, sem Bloco e sem link próprio → item
  `revisao_link_faltando` na fila (`titulo: "Cadastre o link de revisão — falta cobertura"`, ponto
  âmbar na tabela, sem link de verdade).
- Some sozinho assim que um link é cadastrado (vira `revisao_link` de verdade automaticamente).
- Ou o usuário marca `TopicoState.revisaoLinkDispensada = true` (toggle em `QuestoesTab.tsx`, só
  aparece pra tópico sem Bloco e sem link) — "sem link, não vou cadastrar", pra não ficar pendente
  pra sempre num tópico que genuinamente nunca vai ter caderno próprio. Campo curricular
  (compartilhado entre os acessores do concurso, mesma categoria de `linkRevisao7d`/`importancia`
  no split de `estudo-data.ts`).

### 7.3 Dimensionamento por atividade

- **Teoria**: páginas restantes do tópico (via `PdfEstudo.intervalosPaginas` ou `capitulos`,
  descontando o que já foi lido) ÷ `calcularPagPorHora` (ritmo real do usuário, prioridade sempre)
  — sem nenhuma sessão registrada ainda, cai em `PAG_POR_HORA_PADRAO` (trocado de 15 → 30 nesta
  reforma, decisão do usuário — só vale no dia 1, o ritmo real assume assim que existe 1 sessão).
- **Questões (A-D, reforço, revisão de link, reforço imediato)**: `calcularMediaMinutosPorTarefaQuestoes`
  (extraída de dentro de `estimativaConclusaoTrilha`, mesma conta, sem mudar comportamento dela) —
  fallback `MINUTOS_ESTIMADO_QUESTAO_PADRAO` (20min) sem nenhuma tarefa concluída ainda.
- **Revisão de matéria / cartas**: sem duração real capturada hoje (o botão "Concluí"/"Marquei" só
  grava a data) — constantes fixas `MINUTOS_ESTIMADO_REVISAO30` (60min) e `MINUTOS_ESTIMADO_CARTAS`
  (20min), heurística grosseira documentada como tal.
- **Orçamento da Meta**: soma de `configCiclo.horasPorDia` (mesma soma que `computarMetaSemana` já
  usa pra `minutosSemana`) — só heurística de TAMANHO DE LOTE, não é mais um relógio de calendário
  (ver 7.4).

### 7.4 Carry-over mecânico

"Meta N" é desacoplada de "semana-calendário": um lote de trabalho dimensionado pelo orçamento
semanal, que fecha por CONCLUSÃO TOTAL ou por AÇÃO MANUAL — nunca por o calendário virar semana.
Algoritmo de abertura da Meta N+1 (`abrirProximaMeta`, interno, compartilhado pelas duas funções
exportadas abaixo): `[...pendências da Meta que fechou (carry-over, sempre primeiro), ...fila
global filtrando ids já atribuídos em qualquer Meta anterior]`, acumulado em ordem de prioridade
(teoria > questões/reforço > reforço rápido > revisão link > revisão matéria > cartas) até bater o
orçamento — sempre inclui pelo menos 1 atividade (nunca abre Meta vazia com trabalho pendente).

- `avancarFilaMetasSeNecessario` — chamada de um `useEffect` em `page.tsx` (nível compartilhado,
  não só dentro da aba Trilha — ver 7.7), mesmo padrão do bookkeeping de `conclusaoMaterias`:
  bootstrap da Meta 1 quando `filaMetas` é `undefined`, promoção automática pra Meta N+1 quando a
  atual está `fechavel` (`concluidas === total`). NÃO promove sozinho com pendência — pra isso é o
  botão manual.
- `finalizarMetaManualmente` — botão "Finalize ou ignore as atividades da meta atual" no
  `ProximaMetaCard`: fecha a Meta aberta MESMO com pendências (`fechamentoManual: true`), que
  viram carry-over automático na próxima (nunca deletadas).
- `computarMetaAtual` — hidrata a Meta aberta com estado ao vivo (concluída/desempenho recalculados
  por `estaAtividadeConcluida`, que faz parse do sufixo do id estável pra achar grupo/checkpoint,
  sem re-varrer a fila inteira) e calcula os 4 stats + a projeção de "Liberada em: DD/MM" da
  próxima Meta (throughput real desde que a Meta atual abriu — mesmo espírito honesto de
  `estimativaConclusaoTrilha.dataPrevista`; sem nenhuma atividade concluída ainda, "sem estimativa
  ainda" em vez de data inventada).

### 7.5 UI

`MetaAtualCard` (barra horizontal com ícone `Rocket` posicionado em `left: {perc}%`, pedido
explícito do usuário — diferente do `ProgressRing` circular usado no resto do módulo) +
`TabelaAtividades` (status dot verde/cinza/âmbar, Disciplina, Tipo — "Teoria"/"Questões" + tag de
subtipo, Título, Relevância em estrelas via `TopicoState.importancia`, Tempo estimado, Desempenho
% — **sem coluna "Código"**, decisão explícita do usuário, específica do Guruja) + `ProximaMetaCard`
(cadeado, projeção, botão de finalizar/ignorar). `TrilhaTab.tsx` trocou o miolo (hero semanal + 4
`SectionCard` por tipo) por esses 3 componentes; a grade "Progresso rumo aos 100%" e
`CardEstimativa` continuam exatamente como estavam, lendo `computarMetaSemana`/
`estimativaConclusaoTrilha` sem mudança (`GustavoBubble` passou a ler `metaAtual` também — ver
7.7). A checklist de subcapítulos clicáveis voltou: `FilaAtividade.pdfId`/`todosCapitulos`
(preenchido por `construirFilaGlobal` via `resolverCapitulos`, mesma função de sempre) fazem
`TabelaAtividades` expandir a linha de teoria numa lista clicável de capítulo/subcapítulo — mesmo
padrão visual que `CorpoBloco` tinha antes desta reforma (bolinha verde/cinza, capítulo já lido
pela leitura real trava o toggle manual), só que agora dentro da tabela nova em vez de um card por
tipo.

### 7.6 Verificação

- `npx tsc --noEmit` limpo em cada arquivo novo/alterado.
- Teste sintético (`tsx`, script temporário rodado de dentro de `src/lib/` pra resolver os imports
  relativos, apagado depois) cobrindo: fila global inclui teoria de todo tópico ativo (garantia de
  cobertura), bootstrap cria a Meta 1, hidratação reflete `estudado`/cadernos ao vivo, fechamento
  manual com pendência gera carry-over correto na Meta seguinte, item `revisao_link_faltando`
  aparece e some ao cadastrar link ou marcar `revisaoLinkDispensada` — 12/12 verificações passando.
- Smoke test ao vivo no navegador (preview local, sessão com dado real — writes falham com 401 por
  causa do problema de auth local já documentado, mas a leitura/render é real): cliquei "Ativar
  trilha dinâmica" numa trilha nunca ativada antes e confirmei o bootstrap end-to-end — "Meta 1"
  com as 24 atividades de teoria certas (só teoria nesse primeiro momento, nenhum grupo A-D
  liberado ainda — sequenciamento correto), os 4 stats zerados corretamente, "Próxima Meta 2 — Sem
  estimativa ainda", tabela com Disciplina/Tipo/Título/Relevância/Tempo corretos, sem nenhum erro
  de React/console além dos 401 já esperados.

### 7.7 Dashboard/Gandalf migrados pra Meta atual (eliminando a narrativa dupla)

A "fase futura opcional" citada no plano original foi feita: `DashboardTab.tsx` (bolha do Gustavo
+ `CardTrilha`) e a bolha da própria Trilha passaram a ler `computarMetaAtual` em vez de só
`computarMetaSemana` pra tudo que é sobre "o que fazer agora"/pendências — antes o Dashboard citava
contagens recalculadas da semana (`meta.questoesPendentes.length` etc.) enquanto a Trilha já falava
em "Meta N: X de Y", dois números plausíveis mas potencialmente dessincronizados. Agora os dois
lugares mostram exatamente os mesmos números (verificado ao vivo: "Meta 1", "0✓ de 24" e a mesma
frase do Gustavo nos dois).

**O que migrou, o que não migrou:**
- `gerarMensagemGustavo`/`montarResumoSemanaIA`/`useMensagemGustavoIA` (`trilha-ui.ts`) ganharam um
  novo parâmetro `metaAtual: MetaAtual | null`. A "próxima atividade" (função nova
  `proximaAtividadeFila`) e as contagens de pendência (`materias[]`, `reforcosPendentes` etc. do
  `ResumoSemanaIA`) vêm dele quando disponível. Os sinais de **atraso/tendência fraca** (`meta.
  atrasado`, `ritmoNecessarioMinDia`, a janela de 3 semanas) continuam vindo da `MetaSemana` — são
  sobre RITMO semanal/calendário, um conceito genuinamente diferente de "qual atividade fazer
  agora", então não fazem parte da inconsistência que motivou a migração.
- `DashboardTab.tsx`'s `CardTrilha` foi redesenhado pra mostrar "Meta N"/barra com marcador/chips
  por matéria a partir de `metaAtual.atividades` (agrupadas por matéria, segmento proporcional ao nº
  de atividades, preenchido quando todas as da matéria estão concluídas) em vez de `meta.blocos`
  semanal. "X matérias 100% (em revisão)" agora vem direto de `Object.keys(trilha.
  conclusaoMaterias).length`, sem precisar de `computarMetaSemana` pra esse dado.
- `avancarFilaMetasSeNecessario` (bootstrap/promoção de Meta) saiu do `useEffect` só dentro de
  `TrilhaTab.tsx` e foi pra `page.tsx` (nível compartilhado, junto dos outros `update*` de
  `EstudoState`) — sem isso, o Dashboard mostraria "Preparando sua trilha…" pra sempre em quem
  nunca abriu a aba Trilha, já que só ela criava a Meta 1.
- **NÃO migrado, deliberadamente**: `metaMinutosRestantes`/`metasEstudo` (`page.tsx` → toast +
  barras de progresso dentro do `LeitorPdf`) continuam lendo `computarMetaSemana`. Esses dois
  medem ritmo contínuo em MINUTOS (quanto já leu hoje/nesta semana pro alvo da matéria) — um sinal
  vivo, atualizado a cada página virada. O modelo de Meta/fila é proposital e estruturalmente
  binário (atividade concluída ou não, sem "em andamento"): forçar esse encaixe faria o leitor
  perder a granularidade que o torna útil, sem ganhar nada em troca (esse par nunca fez parte da
  reclamação de "narrativa dupla" — não é uma duplicata de "próxima atividade"/pendências, é uma
  métrica diferente). `computarMetaSemana` segue plenamente em uso — não foi "aposentada".

### 7.8 Fatiamento de teoria + intercalação por matéria (2026-08-07, mesmo dia)

Bug reportado pelo usuário: a Meta 1 real dele virou 10 atividades seguidas de "Língua Portuguesa"
(68-219min CADA), nenhuma outra matéria aparecendo. Causa: `construirFilaGlobal` montava a fila
MATÉRIA POR MATÉRIA (todos os tópicos pendentes de A, depois todos os de B, ...) e
`abrirProximaMeta` só consumia essa fila em ordem crua até bater o orçamento — com uma matéria tendo
muita teoria pendente, ela sozinha já esgotava o orçamento da Meta antes de a fila chegar em
qualquer outra. Pedido do usuário, com exemplo próprio ("ajuste" o exemplo, não uma especificação
literal): várias matérias na mesma Meta, um tópico grande podendo aparecer em MAIS DE UMA atividade
dentro da mesma Meta (ex.: "PDF X capítulos 1-3" cedo, "PDF X capítulos 4-6" mais tarde).

**Fatiamento** (`gerarChunksTeoria`, nova, em `trilha-fila.ts`): tópicos cuja leitura restante
passa de `MAX_MINUTOS_ATIVIDADE_TEORIA` (60min) viram VÁRIAS atividades de teoria em vez de uma só
— com capítulos manuais mapeados, agrupa capítulos/subcapítulos consecutivos ainda não lidos até
~60min (mesmo critério de `proximoBlocoCapitulos`, só que gera TODOS os pedaços de uma vez, não só
o próximo); sem capítulos, fatia o intervalo de página mapeado (`intervalosPaginas`) em pedaços de
~60min de páginas. Cada pedaço vira um `FilaAtividade` com id estável pelo intervalo de página
(`t:${materia}:${topico}:${inicio}-${fim}`) e carrega `pdfId`/`paginaInicio`/`paginaFim` — isso é o
que permite **"concluída" ser julgada pela posição REAL de leitura** (`pdf.paginaAtual >=
paginaFim`) em vez do tópico inteiro, e a checklist de capítulos (`todosCapitulos`) mostrar só os
capítulos DESSE pedaço. Tópico sem PDF/página mapeada, ou já lido por completo mas ainda sem
"Marcar como estudado", cai no fallback de sempre (1 atividade, `MINUTOS_ESTIMADO_TEORIA_PADRAO`,
concluída = `TopicoState.estudado`) — preserva o comportamento anterior pra esse caso.

`MetaAtividadeRef` (`estudo-data.ts`) ganhou os mesmos 3 campos (`pdfId`/`paginaInicio`/
`paginaFim`) pra persistir o intervalo de cada pedaço atribuído a uma Meta. `estaAtividadeConcluida`
e a hidratação em `computarMetaAtual` passaram a receber `pdfs`/`capitulosConcluidos` (novos campos
em `ParamsBaseFila`) — sem essas duas listas não dá pra olhar `pdf.paginaAtual` nem re-derivar a
checklist de capítulos ao vivo. **Atividades de teoria já persistidas ANTES desta mudança** (sem
`pdfId`/`paginaFim`) continuam funcionando exatamente como antes — o `if (ref.pdfId && ref.paginaFim
!== undefined)` cai no fallback por `estudado` automaticamente, nenhuma migração de dado necessária.

**Intercalação** (`intercalarPorMateria`, nova, em `abrirProximaMeta`): antes de acumular
atividades até bater o orçamento, agrupa os candidatos por matéria e intercala ROUND-ROBIN (1ª da
matéria A, 1ª da B, 1ª da C, ..., volta pra 2ª da A, 2ª da B, ...) preservando a ordem de
prioridade DENTRO de cada matéria (teoria antes de questões/reforço etc., já garantida pela ordem
em que `construirFilaGlobal` monta a fila). Combinado com o fatiamento acima, uma Meta agora cobre
várias matérias com atividades de tamanho parecido, e um tópico grande tem seus pedaços espalhados
ao longo da Meta em vez de empilhados no início.

**Importante — não é retroativo**: uma Meta JÁ ABERTA antes desta mudança mantém seus refs
originais (sem fatiamento/intercalação) até fechar — carry-over só reaproveita o que já estava
atribuído, nunca reprocessa pela fila nova. Só a PRÓXIMA Meta (aberta depois deste deploy, seja por
conclusão total ou pelo botão "Finalize ou ignore") nasce já fatiada e intercalada.

Verificação: `tsc --noEmit` limpo. Teste sintético (`tsx`, mesmo padrão de sempre — script temporário
em `src/lib/`, apagado depois) com 3 matérias fictícias (uma com 200 páginas mapeadas @ 30pág/h,
uma com 30 páginas, uma sem PDF nenhum): confirmou 7 chunks de ~60min pro tópico de 200 páginas,
1 chunk só pro de 30, fallback de 1 atividade sem `pdfId` pro sem-PDF, as 3 primeiras atividades da
Meta cobrindo as 3 matérias distintas (intercalado, não "A, A, A, ..."), e o chunk marcando
`concluida: true` quando `pdf.paginaAtual` alcança seu `paginaFim` — 9/9 passando. Smoke test ao
vivo confirmou que a Meta 1 já existente (criada antes desta mudança, refs sem `pdfId`) continua
renderizando sem regressão, com o fallback de sempre.

**Adendo (mesmo dia, poucas horas depois)**: usuário reportou que MESMO com o fatiamento no ar, a
Meta continuava só "Língua Portuguesa" — diagnóstico direto no banco (script `.mjs` read-only,
`.env` local, apagado depois) confirmou que a Meta em produção era a Nº 3, com as 10 atividades
IDÊNTICAS (mesmos minutos: 171/111/137/169/68/219/131/139/160min) desde a Meta 1 original — ou seja,
o usuário clicou "Finalize ou ignore" mais de uma vez, e o carry-over (que só REEMPACOTA a
atividade como já estava, ver `paraRef`) vinha arrastando os refs antigos (sem `pdfId`/`paginaFim`,
persistidos antes desta correção) sem nunca passar pelo fatiamento. Dois ajustes:

1. `refatiarCarryOverAntigo` (nova) — todo carry-over de teoria SEM `pdfId` é refatiado na hora de
   abrir a próxima Meta, como se fosse candidato novo (mesmo `gerarChunksTeoria`, com
   `origemCarryOver: true` preservado). Sem PDF resolvível, mantém como estava.
2. **Intercalação passou a incluir o carry-over**, não só os candidatos novos — antes, mesmo com o
   carry-over já fatiado em pedaços de 60min, ele entrava como um PREFIXO fixo antes do rodízio
   (`[...carryOver, ...intercalarPorMateria(candidatosNovos)]`), então uma matéria com muito
   carry-over pendente ainda dominava o início da Meta inteira. Agora `intercalarPorMateria` recebe
   um pool ÚNICO por matéria (carry-over primeiro dentro da PRÓPRIA matéria, candidatos novos
   depois) e intercala TUDO junto — outras matérias entram no rodízio desde a 1ª rodada,
   carry-over ou não.

Teste sintético reproduzindo o cenário exato (Meta 1 com 2 refs antigos monolíticos de 200min,
"Finalize ou ignore" pra Meta 2, com uma 2ª matéria pendente): confirmou refatiamento em pedaços de
~60min, Matéria B aparecendo já na 2ª posição (intercalado, não só no fim), e um 2º teste confirmou
que o bootstrap fresco (sem carry-over nenhum, caminho de "desativar e ativar a trilha") continua
intercalando as 3 matérias desde a 1ª atividade — 6/6 passando nos dois testes.

**Ação necessária do usuário**: não é retroativo pra Metas JÁ ABERTAS (mesma ressalva de sempre) —
clicar em "Finalize ou ignore as atividades da meta atual" mais uma vez agora refatia e intercala
de vez o carry-over que ficou preso desde antes desta correção.
