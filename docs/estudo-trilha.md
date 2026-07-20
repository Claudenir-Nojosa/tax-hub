# Trilha Dinâmica — Cérebro do Módulo

Aba "Trilha" em `/dashboard/estudo`. **Reescrita em 2026-07-20** (a pedido do usuário, "siga à
risca" o método pessoal dele): saiu o plano de metas pré-geradas (trilha-generator, deletado) e
entrou uma trilha **100% derivada do progresso real, recalculada a cada render** — se o usuário
não entrega o dia, a meta de amanhã espera por ele. Atualize este arquivo se as regras mudarem.

## 1. As regras (método do usuário, na ordem em que ele descreveu)

1. **Estudo por PDF**: cada matéria tem tópicos; cada tópico tem um PDF (Biblioteca). O dia
   pertence a um grupo do ciclo (A/B/C, do Ciclo de Estudos) e as horas do dia são divididas
   IGUALMENTE entre as matérias do grupo — ex.: 3h e 3 matérias = 1h cada, no **tópico atual**
   (primeiro não estudado) de cada matéria. O tempo é monitorado pelas sessões de estudo do
   calendário (leitor de PDF/Timer, atividades tipo "estudo" da matéria, somadas por dia).
2. **Questões escalonadas A-D**: cada tópico tem 4 grupos de questões — os cadernos A/B/C/D do
   Edital (grupo "feito" = acertos+erros > 0). Concluir o tópico k libera: grupo **A do k-1**,
   **B do k-2**, **C do k-3**, **D do k-4**. Quando a teoria da matéria acaba, a "cauda" (grupos
   cujo gatilho seria um tópico que não existe) libera toda de uma vez.
3. **Matéria 100%** = teoria completa + os 4 grupos de TODOS os tópicos feitos. No **dia
   seguinte** à conclusão entra a atividade "revisão da matéria: 30 questões englobando todos os
   tópicos" (30 no total, não 30 por tópico) — o "modo revisão".
4. **Cartas**: a cada 2 domingos (14 dias), atividade de revisar as cartas. Âncora = primeiro
   domingo após a ativação da trilha. "Feita" = marcada na trilha OU atividade tipo "cartas" no
   calendário do dia.
5. **Mutável pela entrega**: o grupo do ciclo só avança quando TODOS os blocos de estudo do dia
   foram entregues (1x por dia, guard `grupoCicloAvancadoEm`). Grupos sem nenhuma matéria com
   teoria pendente são PULADOS (`resolverGrupoEfetivo`, A→B→C→A).

## 2. Arquitetura: derivar > persistir

`src/lib/trilha-dinamica.ts` — funções puras, sem React/DOM:
- `analisarMateria(materia, topicos)` → tópico atual, questões liberadas (com motivo), grupos
  feitos, matéria concluída. TUDO derivado de `EstudoState.topicos` (estudado + cadernos A-D).
- `computarMetaDia({hoje, trilha, configCiclo, materiasAtivas, topicos, calendario})` → a meta
  do dia inteira: blocos de estudo (alvo/feito em minutos), questões pendentes, revisões de 30
  devidas, domingo de cartas. `MateriaLike = {nome, topicos}` — aceita MateriaDef,
  MateriaConcurso e MateriaBase.
- `criarTrilhaDinamica()` → estado inicial na ativação.

`EstudoState.trilhaDinamica` (`TrilhaDinamicaState`) guarda SÓ o que não dá pra derivar:
posição do ciclo (`grupoCiclo` + `grupoCicloAvancadoEm`), datas de conclusão de matéria
(`conclusaoMaterias` — agenda a revisão de 30 pro dia seguinte), revisões de 30 feitas,
âncora + domingos de cartas feitos. O campo antigo `trilha` (TrilhaEstudo) ficou como legado
persistido, não é mais lido por nenhuma UI.

## 3. UI (`TrilhaTab.tsx`) e bookkeeping

Painel "Meta de hoje": header com grupo/horas e contagem de blocos; card de cartas (domingo) ou
linha com a próxima data; cards de revisão de 30 questões; blocos de estudo com barra de minutos
(CTA "Ler PDF" → aba Biblioteca); questões liberadas com registro INLINE de acertos/erros (grava
direto no caderno do grupo via `onUpdateTopicos` — mesmo dado do Edital, aparece lá também);
progresso por matéria (teoria x/y · questões n/4y, badge 100%/em revisão).

Dois `useEffect` de bookkeeping (com guards contra loop):
1. matéria recém-100% → grava `conclusaoMaterias[nome] = hoje` (uma vez);
2. blocos do dia todos entregues → `grupoCiclo = seguinte(efetivo)` + `grupoCicloAvancadoEm =
   hoje` (nunca 2x no mesmo dia).

O banner "amanhã segue pro grupo X" mostra o grupo EFETIVO de amanhã (resolve o skip de grupos
vazios — com todas as matérias na divisão A, amanhã volta pro A, não pro B literal).

## 4. Aviso de meta no leitor de PDF

`page.tsx` calcula `metaMinutosRestantes: Record<materia, minutos>` (alvo − feito de hoje, por
bloco) e passa por `BibliotecaTab` → `LeitorPdf` (`minutosMetaRestantes` da matéria do PDF,
congelado na abertura — as sessões só entram no calendário ao FECHAR o leitor, então o
cronômetro da sessão é a única fonte "ao vivo"). Quando `segundos >= restante*60`, toast
"🎯 Meta de hoje de {matéria} concluída!" (uma vez por sessão).

`DashboardTab`: o CardTrilha virou o resumo da meta de hoje (blocos feitos, pendências,
matérias 100%) — computa `computarMetaDia` na hora.

**LIÇÃO — `EstudoConfigCiclo.horasPorDia` guarda MINUTOS, apesar do nome**: `CicloTab.tsx`
(`updateHoras`) grava `horas * 60` e divide por 60 só na exibição. A 1ª versão deste motor
multiplicava por 60 de novo (`horasDia * 60`) achando que o campo vinha em horas — bug real
reportado pelo usuário (dia de "180h/5400min" pra uma config de 3h). O campo do `MetaDia` chama-se
`minutosDia`, não `horasDia`, exatamente pra isso não se repetir.

## 5. Arquivos

```
src/lib/trilha-dinamica.ts            motor puro (análise por matéria + meta do dia)
src/lib/estudo-data.ts                 TrilhaDinamicaState (+ TrilhaEstudo legado deprecated)
src/components/estudo/TrilhaTab.tsx    painel Meta de Hoje + ativação + bookkeeping
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
  calendário, grupo efetivo pulando grupo vazio, revisão de 30 no dia seguinte (não no mesmo
  dia; some depois de feita), domingos de cartas (+0/+7/+14, marcação e atividade "cartas").
- UI: rota descartável `/signup/preview-trilha` — ativar, conferir blocos/questões/progresso,
  simular 3 sessões de 60min → 3/3 "dia entregue" + ciclo avança (1x), registrar questões
  inline → some da lista e progresso atualiza.
