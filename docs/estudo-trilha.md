# Trilha Dinâmica — Cérebro do Módulo

Aba "Trilha" em `/dashboard/estudo`. **Reescrita em 2026-07-20** (a pedido do usuário, "siga à
risca" o método pessoal dele): saiu o plano de metas pré-geradas (trilha-generator, deletado) e
entrou uma trilha **100% derivada do progresso real, recalculada a cada render** — se o usuário
não entrega o dia, a meta de amanhã espera por ele. Atualize este arquivo se as regras mudarem.

## 1. As regras (método do usuário, na ordem em que ele descreveu)

1. **Estudo por PDF**: cada matéria tem tópicos; cada tópico tem um PDF (Biblioteca). O dia
   pertence a um grupo do ciclo (A/B/C, do Ciclo de Estudos) e as horas do dia são divididas
   PROPORCIONALMENTE AO PESO (1 ou 2, configurado no Ciclo) entre as matérias do grupo — peso 2
   recebe ~2x o tempo de peso 1; com pesos iguais, cai de volta em divisão igual. Sempre no
   **tópico atual** (primeiro não estudado) de cada matéria. O tempo é monitorado pelas sessões
   de estudo do calendário (leitor de PDF/Timer, atividades tipo "estudo" da matéria, somadas por
   dia). **2026-07-24**: antes disso o tempo era sempre dividido igual — `peso` já existia e já
   era configurável no Ciclo, mas o motor nunca lia (bug real: configurar peso 2 numa matéria não
   fazia nada). `prioridade` (Alta/Baixa) continua só informativa por enquanto, não influencia o
   tempo — decisão deliberada pra não abrir uma segunda dimensão de interação com `peso` sem
   necessidade concreta.
2. **Questões escalonadas A-D**: cada tópico tem 4 grupos de questões — os cadernos A/B/C/D do
   Edital (grupo "feito" = acertos+erros > 0). Concluir o tópico k libera: grupo **A do k-1**,
   **B do k-2**, **C do k-3**, **D do k-4**. Quando a teoria da matéria acaba, a "cauda" (grupos
   cujo gatilho seria um tópico que não existe) libera toda de uma vez.
3. **Matéria 100%** = teoria completa + os 4 grupos de TODOS os tópicos feitos. **`DIAS_REVISAO_
   MATERIA` (3) dias** depois da conclusão entra a atividade "revisão da matéria: 30 questões
   englobando todos os tópicos" (30 no total, não 30 por tópico) — o "modo revisão". Link próprio
   (`ConfigMateria.linkRevisaoMateria`, cadastrado na aba Questões — é por MATÉRIA, não por
   tópico, já que a revisão engloba todos). Era "no dia seguinte" (1 dia) até 2026-07-29, quando
   o usuário corrigiu o prazo pra 3 dias.
4. **Cartas**: a cada 2 domingos (14 dias), atividade de revisar as cartas. Âncora = primeiro
   domingo após a ativação da trilha. "Feita" = marcada na trilha OU atividade tipo "cartas" no
   calendário do dia.
5. **Mutável pela entrega**: o grupo do ciclo só avança quando TODOS os blocos de estudo do dia
   foram entregues (1x por dia, guard `grupoCicloAvancadoEm`). Grupos sem nenhuma matéria com
   teoria pendente são PULADOS (`resolverGrupoEfetivo`, A→B→C→A).
6. **Reforço de tópicos fracos** (2026-07-24): um grupo "feito" com **menos de 70% de acerto**
   (`LIMIAR_REFORCO_PERC`) volta a aparecer na trilha — numa seção própria, separada de "questões
   liberadas" — depois de **3 dias** sem atualização (`REFORCO_COOLDOWN_DIAS`). Antes, "feito" era
   só `acertos+erros > 0`: 0% e 100% eram tratados igual, e um grupo nunca ressurgia. Qualquer
   novo registro de acertos/erros nesse grupo (no Edital ou na Trilha) reinicia a contagem dos 3
   dias (`TopicoCaderno.atualizadoEm`).
7. **Revisão das questões do link** (2026-07-29): substituiu os 4 links por grupo A-D (um por
   grupo, redundante) por links cadastrados na aba **Questões** (`QuestoesTab.tsx`). Quando os 4
   grupos A-D do tópico ficam feitos, a revisão das questões entra na trilha em **dois
   checkpoints INDEPENDENTES** (`CHECKPOINTS_REVISAO_LINK`: 7 e 30 dias depois, cada um contado da
   mesma data de conclusão — fazer o de 7 dias não libera nem atrasa o de 30), **cada checkpoint
   com o SEU PRÓPRIO link** (`TopicoState.linkRevisao7d`/`linkRevisao30d` — na prática costumam
   ser cadernos diferentes, o de 30 dias em geral cobrindo mais questões que o de 7). O usuário
   refaz as questões externamente (ex.: TecConcursos) e registra acertos/erros inline, igual às
   questões liberadas. Abaixo de `LIMIAR_REFORCO_PERC` (70%), aquele checkpoint específico volta
   como **reforço** depois de `REFORCO_COOLDOWN_DIAS` (3 dias) sem atualização — mesmas regras do
   reforço A-D, caminho separado (`analisarRevisoesLink`, `TopicoState.revisoesLink[checkpoint]`).
8. **Clicar na atividade abre o link direto** (2026-07-29): tanto a revisão do link (7d/30d)
   quanto a revisão de 30 questões (matéria) abrem o link cadastrado numa nova aba ao clicar na
   linha da atividade na Trilha — sem precisar expandir primeiro. Na revisão do link, o clique
   TAMBÉM expande o form de acertos/erros (pra já estar visível quando o usuário volta de fazer
   as questões); um chevron separado permite recolher sem reabrir o link. Sem link cadastrado, o
   botão da revisão de 30 fica desabilitado em vez de tentar abrir algo vazio.

## 2. Arquitetura: derivar > persistir

`src/lib/trilha-dinamica.ts` — funções puras, sem React/DOM:
- `analisarMateria(materia, topicos)` → tópico atual, questões liberadas (com motivo), grupos
  feitos, matéria concluída. TUDO derivado de `EstudoState.topicos` (estudado + cadernos A-D).
- `analisarReforcos(materia, topicos, hoje)` → grupos já feitos com acerto abaixo de
  `LIMIAR_REFORCO_PERC` e esfriados (sem `atualizadoEm`, ou `atualizadoEm` há
  `REFORCO_COOLDOWN_DIAS`+ dias) — caminho separado de `analisarMateria`, não interfere na
  liberação escalonada nem no cálculo de matéria concluída.
- `statusRevisaoLink(estado, hoje, checkpoint)` → status de UM checkpoint ("d7" ou "d30") em
  relação à revisão do link (`sem_link` / `aguardando_grupos` / `aguardando_prazo` / `disponivel`
  / `feita`) — usado tanto pelo badge informativo da aba Questões (chamado 2x, um por checkpoint)
  quanto por `analisarRevisoesLink(materia, topicos, hoje)`, que itera `CHECKPOINTS_REVISAO_LINK`
  e filtra pra só os tópicos×checkpoint com revisão `disponivel` (1ª vez) ou `feita` com reforço
  já esfriado (mesmo cooldown do reforço A-D). Os dois checkpoints são independentes — cada um
  lê só o próprio registro em `TopicoState.revisoesLink[checkpoint]`.
- `distribuirMinutosPorPeso(minutosDia, pesos)` → divisão do tempo por maiores restos (Hamilton):
  cada matéria recebe `floor(peso/pesoTotal * minutosDia)` e a sobra do arredondamento (no máximo
  `pesos.length - 1` minutos) vai 1 a 1 pras matérias com maior parte fracionária perdida — nenhum
  minuto desaparece, ao contrário de um `Math.floor` fixo.
- `computarMetaDia({hoje, trilha, configCiclo, materiasAtivas, topicos, calendario})` → a meta
  do dia inteira: blocos de estudo (alvo/feito em minutos, ponderados por peso), questões
  pendentes, reforços, revisões de 30 devidas, domingo de cartas. `MateriaLike = {nome, topicos}`
  — aceita MateriaDef, MateriaConcurso e MateriaBase.
- `criarTrilhaDinamica()` → estado inicial na ativação.

`EstudoState.trilhaDinamica` (`TrilhaDinamicaState`) guarda SÓ o que não dá pra derivar:
posição do ciclo (`grupoCiclo` + `grupoCicloAvancadoEm`), datas de conclusão de matéria
(`conclusaoMaterias` — agenda a revisão de 30 pro dia seguinte), revisões de 30 feitas,
âncora + domingos de cartas feitos. O campo antigo `trilha` (TrilhaEstudo) ficou como legado
persistido, não é mais lido por nenhuma UI.

## 3. UI (`TrilhaTab.tsx`) e bookkeeping

Painel "Meta de hoje": hero com anel de progresso (SVG puro) sobre a % dos blocos do dia + data
por extenso; um único checklist vertical ("Sua trilha de hoje", ver 3.2) que reúne blocos de
estudo, reforços (ver 3.3), questões liberadas, revisão de 30 e cartas num só fluxo conectado por
uma linha, em vez de cards soltos; questões liberadas e reforços com registro INLINE de
acertos/erros (grava direto no caderno do grupo via `onUpdateTopicos` — mesmo dado do Edital,
aparece lá também, carimbando `atualizadoEm`); progresso por matéria em grade de mini-anéis
(teoria+questões combinados num só %, badge 100%/em revisão).

Cada bloco de estudo, uma vez que bate o tempo alvo (`concluido`), troca o botão "Ler PDF" por
**"Marcar como estudado"** — fecha o elo que antes obrigava trocar pra aba Edital só pra marcar o
tópico (`topicos[key].estudado = true`, mesmo caminho de escrita do `EditalTab.toggleEstudado`).
É sempre um "set true" explícito, nunca automático nem um toggle — bater o tempo não garante que o
conteúdo foi de fato terminado, e desmarcar por engano continua sendo ação do Edital.

Dois `useEffect` de bookkeeping (com guards contra loop):
1. matéria recém-100% → grava `conclusaoMaterias[nome] = hoje` (uma vez);
2. blocos do dia todos entregues → `grupoCiclo = seguinte(efetivo)` + `grupoCicloAvancadoEm =
   hoje` (nunca 2x no mesmo dia).

O banner "amanhã segue pro grupo X" mostra o grupo EFETIVO de amanhã (resolve o skip de grupos
vazios — com todas as matérias na divisão A, amanhã volta pro A, não pro B literal).

### 3.3 Reforço de tópicos fracos (2026-07-24)

Um grupo "feito" (`acertos+erros > 0`) com **acerto < 70%** (`LIMIAR_REFORCO_PERC`,
`trilha-dinamica.ts`) some da lista de "questões liberadas" mas passa a ser candidato a
**reforço** — reaparece na trilha, numa seção própria (ícone de alerta, vermelho, distinta
visualmente de "liberada" pra não confundir "novo" com "revisar de novo"), depois de
`REFORCO_COOLDOWN_DIAS` (3) dias sem atualização. `TopicoCaderno` ganhou um campo opcional
`atualizadoEm?: string` (dateKey), carimbado toda vez que acertos/erros são salvos (Edital ou
Trilha) — ausente em registros antigos, o que os deixa elegíveis a reforço imediatamente (sem
dado prévio pra dizer o contrário). Sem migração de banco: `EstudoProgresso`/`ConcursoProgresso`
guardam `dados Json`, um campo TS opcional não pede nada além do próprio código.

A linha de reforço vem com os campos de acertos/erros PRÉ-PREENCHIDOS com o valor atual (o
usuário está corrigindo um resultado existente, não começando do zero) e um badge com o % atual.
Registrar de novo sobrescreve o caderno do grupo inteiro (mesmo caminho de escrita de
"questões liberadas") — não é um histórico de tentativas, é o mesmo contador cumulativo de
sempre, só que agora com timestamp.

## 4. Aviso de meta no leitor de PDF

`page.tsx` calcula `metaMinutosRestantes: Record<materia, minutos>` (alvo − feito de hoje, por
bloco) e passa por `BibliotecaTab` → `LeitorPdf` (`minutosMetaRestantes` da matéria do PDF,
congelado na abertura — as sessões só entram no calendário ao FECHAR o leitor, então o
cronômetro da sessão é a única fonte "ao vivo"). Quando `segundos >= restante*60`, toast
"🎯 Meta de hoje de {matéria} concluída!" (uma vez por sessão).

`DashboardTab`: o CardTrilha virou o resumo da meta de hoje (blocos feitos, pendências,
matérias 100%) — computa `computarMetaDia` na hora.

### 3.1 Redesign do card (2026-07-20)

`CardTrilha` foi redesenhado no estilo "Meta atual" (referência visual de um concorrente): eyebrow
uppercase + badge "Grupo X" + data de início: barra de progresso mais grossa com um marcador
circular na posição atual (`left: {perc}%`); linha de stats "N matérias · N atividades"; e uma
fileira de tiras finas coloridas na base do card, uma por bloco do dia, usando a COR REAL da
matéria (`resolverCorMateria` — mesma paleta do Edital) quando concluído, cinza quando pendente.
`resolverCorMateria` (`trilha-ui.ts`) teve o tipo do parâmetro alargado pra aceitar `MateriaBase`
também (antes só `MateriaDef | MateriaConcurso`), já que o `DashboardTab` trabalha com o tipo
mais genérico.

**LIÇÃO — `EstudoConfigCiclo.horasPorDia` guarda MINUTOS, apesar do nome**: `CicloTab.tsx`
(`updateHoras`) grava `horas * 60` e divide por 60 só na exibição. A 1ª versão deste motor
multiplicava por 60 de novo (`horasDia * 60`) achando que o campo vinha em horas — bug real
reportado pelo usuário (dia de "180h/5400min" pra uma config de 3h). O campo do `MetaDia` chama-se
`minutosDia`, não `horasDia`, exatamente pra isso não se repetir.

### 3.2 Redesign do painel: checklist único em timeline (2026-07-20)

`TrilhaTab.tsx` foi reescrito visualmente a pedido do usuário ("mais bonito e intuitivo"). Trocou-
se a pilha de cards desconectados (header + banner cartas + banners revisão30 + card blocos + card
questões + card progresso) por:

- **Hero com anel de progresso** (`AnelProgresso`, SVG puro sem lib): `stroke-dashoffset` sobre a
  circunferência, mostra a % dos blocos do dia entregues (não uma métrica composta — combina com o
  que já governa o avanço do ciclo, pra não inventar um número que diverge do que de fato destrava
  o grupo seguinte).
- **Checklist vertical único** ("Sua trilha de hoje"): cada item do dia (bloco de estudo, resumo de
  questões liberadas, revisão de 30 pendente, cartas se for domingo) vira uma linha com círculo de
  status (check verde se concluído) conectada por uma linha fina ao próximo item — modelo
  "stepper", lê como uma lista de tarefas em vez de painéis paralelos sem hierarquia.
- **Grade de mini-anéis por matéria**: cada card tem um anel pequeno com o % combinado (teoria +
  questões, pesos iguais — `(topicosEstudados + gruposFeitos) / (totalTopicos * 5)`), troféu no
  lugar do % quando 100%.
- Tela de ativação (`Intro`) ganhou os mesmos ícones em badge circular colorido, mantendo a
  estrutura (regras + aviso de ciclo vazio + CTA).

**Cores por TIPO de item são fixas** (`TIPO_ITEM`: estudo=sky, questões=violet, revisão=amber,
cartas=fuchsia) e **cores por grupo de questão também** (`GRUPO_COR`: A=blue, B=emerald, C=violet,
D=amber, igual ao Edital) — nenhuma delas é montada por interpolação de string. O Tailwind JIT só
enxerga classes literais no código-fonte; `` `bg-${cor}-500` `` não é detectado e renderiza sem
estilo. Isso já valia pro `resolverCorMateria` (usado pra bolinha de cor de cada matéria, não pro
anel) — o anel usa `stroke-emerald-500`/`stroke-amber-500` fixos (não a cor da matéria) por esse
mesmo motivo, com a identidade da matéria ficando só na bolinha ao lado do nome.

## 5. Arquivos

```
src/lib/trilha-dinamica.ts            motor puro (análise por matéria + meta do dia)
src/lib/estudo-data.ts                 TrilhaDinamicaState (+ TrilhaEstudo legado deprecated)
src/components/estudo/TrilhaTab.tsx    painel Meta de Hoje + ativação + bookkeeping
src/components/estudo/QuestoesTab.tsx  cadastro dos links de questões (7d/30d por tópico + revisão de matéria)
src/components/estudo/DashboardTab.tsx CardTrilha (resumo da meta de hoje)
src/components/estudo/BibliotecaTab.tsx metaMinutosRestantes → aviso no LeitorPdf
src/components/estudo/trilha/trilha-ui.ts  fmtHoras/resolverCorMateria (compartilhados)
```
Deletados na reescrita: `trilha-generator.ts`, `scripts/validar-trilha.ts`, `TrilhaPath.tsx`,
`MetaPainel.tsx`, `MateriaConcluidaBanner.tsx`, rota `/api/estudo/trilha/orientacoes`.

## 6. Verificação

- `npx tsc --noEmit`.
- Motor: script sintético (padrão do antigo validar-trilha) cobrindo: liberação escalonada
  (1/2/4 tópicos), cauda no fim da teoria, matéria 100%, blocos 3h→3×60min, soma de sessões do
  calendário, grupo efetivo pulando grupo vazio, revisão de 30 a partir de DIAS_REVISAO_MATERIA
  dias (não antes; some depois de feita), domingos de cartas (+0/+7/+14, marcação e atividade
  "cartas").
- Motor (2026-07-24): `distribuirMinutosPorPeso` — pesos iguais = split igual; peso 2:1 pega ~2x;
  soma sempre bate com `minutosDia` mesmo com resto (ex.: 100min/3 matérias). `analisarReforcos`
  — grupo com < 70% aparece; ≥ 70% não; `atualizadoEm` recente (< 3 dias) suprime; ausente ou
  antigo libera.
- Motor (2026-07-29): `statusRevisaoLink`/`analisarRevisoesLink` — sem link cadastrado nunca
  aparece; 4 grupos A-D incompletos fica em `aguardando_grupos`; completos e dentro do prazo do
  checkpoint fica em `aguardando_prazo` com contagem regressiva; passado o prazo e sem registro
  vira `disponivel` (entra na trilha); registrado ≥ 70% fecha (`feita`, sem reforço); registrado <
  70% volta como reforço só depois de 3 dias sem atualização, igual ao reforço A-D. Os checkpoints
  de 7 e 30 dias são independentes: registrar o de 7 dias não muda o status do de 30 (cada um lê
  só o próprio `revisoesLink[checkpoint]`).
- Motor (2026-07-29, links por checkpoint): cada checkpoint lê seu PRÓPRIO link
  (`linkDoCheckpoint` — `linkRevisao7d` pro "d7", `linkRevisao30d` pro "d30"); revisão de 30
  passou de 1 pra `DIAS_REVISAO_MATERIA` (3) dias; `Revisao30.link` vem de
  `configCiclo.materias[materia].linkRevisaoMateria`, ausente quando a matéria não tem link
  cadastrado (UI desabilita o botão de abrir em vez de tentar `window.open(undefined)`).
- UI: rota descartável `/signup/preview-trilha` — ativar, conferir blocos/questões/progresso,
  simular 3 sessões de 60min → 3/3 "dia entregue" + ciclo avança (1x), registrar questões
  inline → some da lista e progresso atualiza.
