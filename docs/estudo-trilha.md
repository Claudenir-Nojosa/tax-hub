# Trilha de Estudos — Cérebro do Módulo

Este documento descreve a feature **Trilha** dentro de `/dashboard/estudo` (concurso SEFAZ-CE) —
um plano de estudos guiado por metas, com visual estilo Duolingo (caminho sinuoso de nós). Atualize
este arquivo sempre que uma regra do gerador, do filtro de matérias ativas ou do layout do
caminho mudar.

## 1. Visão geral

A Trilha divide o edital em **metas** sequenciais (`TrilhaMeta`). Regras fechadas por pedidos
explícitos do usuário, em ordem: metas pequenas (achou as antigas "absurdas de difíceis e
grandes"), sem "questoes" (praticar fica por conta do usuário fora da Trilha, registrando direto
no Edital/Caderno de Erros), sem revisão espaçada, e — forma final — **cada meta é EXATAMENTE UM
TÓPICO de UMA matéria, sem objetivo de duração**: a meta é literalmente "conclua a teoria do
tópico X". Tópicos já `estudado:true` no Edital são **excluídos por completo** — a Trilha só
cobre tópicos novos. Uma trilha típica tem **centenas de metas** (1 por tópico não estudado das
matérias no Ciclo).

**`duracaoMin` ainda existe e é preenchida por nível** (`nunca` 90min/tópico, `comecei` 60min,
`sem_confianca` 30min `teoriaRapida`, `arestas` 15min `teoriaRapida`), mas é **estimativa interna
pra projeções apenas** — `estimarResumo()`/`projetarTermino()` usam `totalMinutos ÷ minutosSemana`
da disponibilidade escolhida pra responder "cabe até a prova?" e "término ~data". A UI **nunca
mostra duração como objetivo da meta** (nem no painel da meta, nem no caminho, nem no passo 3 do
wizard, que mostra "Tópicos a estudar"/"Matérias" em vez de "Carga total"). O nível declarado
também pesa na intercalação (fator do round-robin). `TrilhaAtividadeTipo` mantém `"questoes"` e
`"revisao"` no tipo (`estudo-data.ts`), e `numeroRevisao`/`quantidadeQuestoes` continuam como
campos opcionais, só por compatibilidade com trilhas antigas já persistidas — o gerador NUNCA
mais produz nenhuma das duas, e `TrilhaAtividade.topicos` segue sendo array (sempre com 1 item
nas trilhas novas) pelo mesmo motivo.

A geração é **100% determinística** (`src/lib/trilha-generator.ts`, sem IA) — reprodutível e
recalculável a qualquer momento; a IA só escreve a `orientacao` (1-2 frases) das primeiras 120
metas (limite por request da rota) via `POST /api/estudo/trilha/orientacoes`, com graceful
degradation se falhar.

No visual (`TrilhaTab.tsx` + `src/components/estudo/trilha/*`), **1 nó do caminho = 1
`TrilhaMeta` = 1 tópico**: `TrilhaPath.tsx` desenha um caminho sinuoso (posição de cada nó e a
curva de fundo vêm da MESMA função seno — nunca desalinham, e são responsivos sem medir DOM). Cada
nó é **colorido pela cor da matéria** (`resolverCorMateria`), com efeito 3D de botão (inset shadow
no rodapé, estilo Duolingo — funciona com qualquer cor sem precisar da variante escura), e mostra
**badge da matéria + nome do tópico** logo abaixo — o caminho conta a história inteira sem abrir
nada. Estados: concluído = check, atual = estrela + ring + balão "Você está aqui" quicando
(framer-motion), futuro = cadeado cinza. O trecho já percorrido da curva é pintado de verde sólido
por cima do pontilhado. Clicar num nó não bloqueado abre `MetaPainel.tsx` (Dialog) com a frase
"Conclua a teoria de: {tópico}" e o botão de status — sem duração. O progresso do header é contado
em **tópicos concluídos** (metas 100% concluídas), não em minutos.

O ritmo REAL pós-primeira-conclusão (`ritmoMetasPorSemana`, em `projetarTermino()`) é medido em
"metas concluídas por semana" — combina com o visual: dá pra dizer literalmente "você está
completando ~15 metas por semana".

## 2. Ciclo de Estudos é a fonte de verdade das matérias ativas

**Regra central**: a Trilha só gera conteúdo (teoria) para matérias com
`configCiclo.materias[nome].incluir === true` (editado em `CicloTab.tsx`). Não existe mais uma
lista própria de "matérias puladas" da Trilha — `TrilhaConfig.puladas` é `@deprecated` (opcional,
mantido só pra não quebrar trilhas antigas persistidas; não é mais lido pelo gerador nem escrito
pelo wizard). Isso significa que **editar o Ciclo depois de gerar a trilha tem efeito**: o botão
"Atualizar trilha (N)" no header reage a mudanças feitas na aba Ciclo, comparando contra o Ciclo
**atual**, não contra o estado congelado no momento da criação.

## 3. Ciclo mutável: matéria "graduada" + banner de substituição

Quando **todas as atividades de todas as metas** de uma matéria ficam `status === "concluida"`,
ela é considerada **graduada** — calculado em runtime por
`materiasConcluidasNaTrilha(trilha): string[]` (nunca persistido, pra não dessincronizar de uma
reversão de status via `proximoStatus`, que cicla de volta a `nao_iniciada`).

Efeitos de uma matéria graduada:
- `gerarTrilha({..., materiasConcluidas})` para de incluí-la em `ativas` — nenhuma atividade nova
  é gerada pra ela numa regeneração (Refazer) ou atualização incremental. Como a Trilha não tem
  revisão, uma matéria graduada simplesmente some da trilha regerada.
- `topicosNaoCobertos`/`atualizarTrilha` também ignoram os tópicos dela — não voltam a aparecer
  como "faltantes" só porque a matéria terminou.
- `MateriaConcluidaBanner.tsx` (renderizado no topo da Trilha ativa) mostra um card comemorativo
  por matéria graduada, com a lista de matérias do edital **ainda fora do Ciclo** — ao clicar
  "Adicionar ao Ciclo" com uma ou mais selecionadas, `onUpdateConfigCiclo` marca
  `incluir: true` pra elas (usando os defaults de `MateriaDef` quando existem, senão
  `{peso:1, prioridade:"Baixa", divisao:"A"}`). Isso normalmente dispara o "Atualizar trilha (N)"
  do header, já que a matéria nova entrou no Ciclo mas ainda não tem cobertura na trilha atual —
  fechando o ciclo "concluí uma matéria → entra outra no lugar" pedido pelo usuário.
- O dismiss do banner (botão X, sem adicionar substituta) é por matéria, salvo em
  `localStorage["taxhub_trilha_banner_dismiss"]` — não vai pro banco (evita risco de schema no
  blob atômico `EstudoState.trilha`).
- `DashboardTab.tsx` (`CardTrilha`) mostra só um indicador leve ("X concluída — escolha a próxima
  no Ciclo"); o fluxo completo com o picker mora só na aba Trilha.

## 4. Wizard (3 passos)

1. **Disponibilidade** — inalterado.
2. **Conhecimentos** — lista **só** as matérias elegíveis: `incluir=true` no Ciclo **e** ainda não
   graduadas (se estiver refazendo uma trilha existente). Sem coluna "Pular". Uma faixa fixa,
   visível nos 3 passos, mostra "Matérias no Ciclo: N incluída(s)" com um atalho "Editar Ciclo →"
   (`onIrParaCiclo`, navega pra aba Ciclo). Se zero matérias elegíveis, aviso bloqueante impede
   avançar.
3. **Conclusão** — preview síncrono (`gerarTrilha` em memória) inalterado, só passa a receber
   `materiasConcluidas` também.

## 5. Resolução de cor por matéria

`MateriaDef` (as 19 matérias hardcoded do SEFAZ-CE, fallback quando o usuário não tem concurso
próprio) já embute `corDot`/`corBadge`. `MateriaConcurso` (concurso customizado do usuário, via
`ConcursoModal.tsx`) só tem `cor: string` — uma chave livre (`sky`, `blue`, `emerald`... as mesmas
16 de `CORES_DISPONIVEIS` no modal). `resolverCorMateria()` (`trilha/trilha-ui.ts`) resolve os
dois casos via o mapa estático `CORES_MATERIA` (`src/lib/estudo-data.ts` — Tailwind não suporta
classes montadas em runtime, cada variante tem que estar escrita literalmente). Esse mapa foi
promovido de `EditalTab.tsx` (`COR_BORDER`) pra ser compartilhado; o bug antigo do `corMateria()`
da Trilha (sempre caía em cinza pra concursos customizados, porque só buscava na lista hardcoded
`MATERIAS`) foi corrigido junto.

## 6. Arquivos

```
src/lib/estudo-data.ts                                   tipos da Trilha + CORES_MATERIA (mapa de cor compartilhado)
src/lib/trilha-generator.ts                               gerador determinístico (regras numéricas no comentário de topo)
src/app/api/estudo/trilha/orientacoes/route.ts             IA — só as `orientacao` das metas, resumo compacto
src/components/estudo/TrilhaTab.tsx                        orquestração: Wizard ↔ Trilha ativa
src/components/estudo/trilha/trilha-ui.ts                  STATUS_CONFIG, TIPO_CONFIG, fmtHoras/fmtData, resolverCorMateria
src/components/estudo/trilha/TrilhaPath.tsx                 caminho sinuoso (1 nó = 1 TrilhaMeta)
src/components/estudo/trilha/MetaPainel.tsx                 Dialog com as atividades de uma meta (AtividadeRow/RegistrarResultado)
src/components/estudo/trilha/MateriaConcluidaBanner.tsx    banner de matéria graduada + picker de substituta
src/components/estudo/DashboardTab.tsx                      CardTrilha: indicador leve de matéria(s) graduada(s)
scripts/validar-trilha.ts                                   smoke-test determinístico (rodar: npx tsx scripts/validar-trilha.ts)
```

## 7. Persistência

`TrilhaEstudo` inteiro vive em `EstudoState.trilha`, salvo como parte do blob `Json` de
`ConcursoProgresso.dados` (upsert em `POST /api/concurso/{id}/progresso`, sem validação de schema
no servidor). **"Blob atômico"**: ao fazer merge com defaults no client (`mergeWithDefaults` em
`page.tsx`), a trilha nunca é deep-merged — passa inteira ou fica ausente. Nada na task de
reformulação do visual mudou isso; `materiasConcluidasNaTrilha`/graduação são cálculo puro, não
persistido.

## 8. Verificação

`npx tsx scripts/validar-trilha.ts` — 8 cenários determinísticos: geração básica (nunca/arestas,
1 meta = exatamente 1 tópico de 1 matéria, total de metas = total de tópicos ativos), matérias
fora do Ciclo e tópicos pré-estudados excluídos por completo, `atualizarTrilha` cobrindo tópicos
novos, Ciclo como fonte de verdade (cenário 5),
matéria graduada sem conteúdo novo (cenário 6), `topicosNaoCobertos` ignorando matéria graduada
(cenário 7), nenhum cenário gera atividade tipo `"questoes"` ou `"revisao"` (cenário 8). Validação
visual: sem test runner no projeto — testar manualmente
navegando `/dashboard/estudo` → aba Trilha (wizard sem coluna "Pular" e com a faixa do Ciclo;
caminho com nós bloqueados/atual/concluídos; abrir o painel de uma meta e ciclar status; forçar
uma matéria 100% concluída e conferir o banner + fluxo "Adicionar ao Ciclo" disparando "Atualizar
trilha").
