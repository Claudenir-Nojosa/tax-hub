# Reforma Tributária v2 — Reconstrução guiada por wizard, Excel fiel ao modelo

> Documento-cérebro deste módulo. Sempre que retomar o trabalho em outra sessão, leia este arquivo primeiro e confira o estado das tasks (`TaskList`, prefixo "Reforma v2").

## Objetivo

Substituir o wizard atual de 4 passos por um de **7 passos**, e o exportador Excel atual (`export-simulacao-excel.ts`, valores estáticos) por um gerador novo que produz um Excel **idêntico em estrutura e estilo** ao modelo de entrega real do cliente Art Farma (`Reforma_Tributária - Art Farma vff.xlsx`), com **fórmulas nativas** (não pré-calculadas) em praticamente todas as células.

O propósito de negócio: simular a transição dos tributos indiretos atuais (ICMS, PIS/COFINS, ISS, IPI) para IBS/CBS ao longo do cronograma da reforma (2026-2033), por cliente, com granularidade de nota fiscal.

## Fonte de verdade

- **Excel-modelo**: `C:\Users\FIN-CLAUDENIR\Desktop\Artfarma\Reforma_Tributária - Art Farma vff.xlsx` (~90MB, 14 abas). Não abrir com `ExcelJS.Workbook().xlsx.readFile()` direto (estoura memória) — usar `ExcelJS.stream.xlsx.WorkbookReader` com `node --max-old-space-size=6144`.
- **Legislações**: 3 PDFs em `C:\Users\FIN-CLAUDENIR\Desktop\Artfarma\` (LC 214/2025, Decreto CBS, Resolução CGIBS). Texto extraível via `unpdf` (`extractText`) — confirmado, sem necessidade de OCR.
- **Amostras EFD**: arquivos `.txt` de EFD Contribuições e EFD ICMS/IPI em `C:\Users\FIN-CLAUDENIR\Desktop\Artfarma\`, CNPJ real 25033836000113 (L Cardoso Melo LTDA / Art Farma).
- **README normativo já existente**: `src/app/dashboard/reforma-tributaria/README.md` — cronograma de transição e regras do módulo atual. Este documento estende, não substitui, aquele — qualquer alteração de alíquota/cronograma deve ser refletida nos dois.

## Inventário: reaproveitar vs. construir

### Reaproveitar diretamente
| Peça | Arquivo |
|---|---|
| Engine de cálculo determinístico (fallback/comparação) | `src/lib/reforma-engine.ts` |
| State machine do wizard (padrão de step numérico) | `src/app/dashboard/reforma-tributaria/[empresaId]/page.tsx` |
| Consulta Simples Nacional em lote (zero-erro, retry/backoff) | `src/lib/consulta-simples-nacional.ts` + `POST /api/automacoes/consulta-simples-nacional` |
| Padrão de Excel com fórmulas nativas (`f(formula, result)`, SUMIFS/VLOOKUP cross-sheet, SUBTOTAL, addTable) | `src/lib/consolidacao-pis-cofins-excel.ts`, `src/lib/selic-excel.ts` |
| Padrão de IA lendo PDF (`unpdf` + `gpt-4o` chat.completions) | `src/app/api/estudo/resumos/route.ts` |
| Models Prisma `EmpresaReforma`/`SimulacaoReforma`/`DadosXmlReforma` | `prisma/schema.prisma` |

### Construir do zero
- CNAE secundários na rota `cnpj/[cnpj]/route.ts` (dado já vem da BrasilAPI, só falta repassar).
- IA lendo as 3 legislações por CNAE (Passo 3).
- Parser de EFD ICMS/IPI com CNPJ do fornecedor por documento (registro `0150` + `C100`/`C170` — os parsers existentes só agregam por CFOP+CST+alíquota, sem granularidade de fornecedor).
- Gerador de Excel com ~14 abas interligadas por fórmula.
- Wizard de 7 passos.

## As 14 abas do Excel-modelo (ordem exata)

1. **Premissas** — alíquotas IBS/CBS 2026-2033 + variante de redução de 60% + % de redução ICMS/ISS 2029-2033 + tabela Estabelecimento→CNPJ (`B47:C50`) + listas suspensas de Documento e Ano.
2. **Legislações** — artigos citados da LC 214/2025 (célula B4 em diante fica **em branco** no Excel gerado pela ferramenta; é espaço de anotação manual do usuário).
3-9. **2026, "2027 e 2028", 2029, 2030, 2031, 2032, 2033** — saídas do EFD Contribuições, ~27.550 linhas cada, colunas A-BH = dados brutos, colunas seguintes = cadeia de fórmulas (ver abaixo). "2027 e 2028" é uma única aba cobrindo os dois anos.
10. **Valor Total NF-e** — dropdown Estabelecimento/Documento/Ano, `VLOOKUP` de CNPJ, soma filtrada.
11. **Quadro Comparativo** — dropdown Empresa, tabela PIS/COFINS × ICMS × ISS × CBS × IBS por ano, via `SUMIFS`/`SUM`+`IF`.
12. **Base IBS-CBS** — 4.524 linhas, base padrão de NCM/Anexo/redução (asset reaproveitável entre clientes, a menos que o usuário suba uma base própria no Passo 4).
13. **Entradas - EFD ICMS IPI** — 4.840 linhas, créditos de IBS/CBS por fornecedor (Regime IBS/CBS via consulta Simples Nacional, Crédito CBS/IBS via `VLOOKUP` na Base IBS-CBS).
14. **Análise Fornecedores Art Farma** — resumo Regime Regular vs Simples Nacional (modelo usa Tabela Dinâmica nativa via GETPIVOTDATA; **na reconstrução vira tabela SUMIFS equivalente + gráfico nativo ExcelJS**, decisão já validada com o usuário — ExcelJS não cria pivots nativas).

## Cadeia de fórmulas das abas de ano (a partir da coluna de dados calculados)

Nomes de coluna (as **letras exatas variam por aba** — ex. total de PIS/COFINS é `BM` em "2026" mas `BL` em "2027 e 2028" — o gerador deve calcular letras programaticamente a partir da lista de cabeçalhos, nunca hardcoded):

```
VALOR SEM TRIBUTO   = Vlr Item − Vlr ISS − Vlr PIS − Vlr COFINS − Vlr ICMS − Vlr Desconto Item
BASE PIS COFINS     = VALOR SEM TRIBUTO / (1 − aliq.PIS% − aliq.COFINS%)          [gross-up]
VLR PIS              = BASE PIS COFINS × aliq.PIS%
VLR COFINS            = BASE PIS COFINS × aliq.COFINS%
VLR PIS + COFINS      = VLR PIS + VLR COFINS
BASE ICMS FINANCE    = SE Documento="NFS": 0   SENÃO: (VALOR SEM TRIBUTO + VLR PIS + VLR COFINS) / (1 − aliq.ICMS%)
ICMS                 = BASE ICMS FINANCE × aliq.ICMS%
BASE ISS FINANCE     = SE Documento="NFS": (VALOR SEM TRIBUTO + VLR PIS + VLR COFINS) / (1 − aliq.ISS%)   SENÃO: 0
ISS                  = BASE ISS FINANCE × aliq.ISS%           [aliq.ISS vem da Premissa, o EFD Contribuições não tem ISS]
VLR PIS+COFINS+ISS    = VLR PIS + VLR COFINS + ISS
DIF VALOR PRODUTO     = BASE ISS FINANCE − BASE ICMS FINANCE − VALOR SEM TRIBUTO
BASE IBS/CBS          = VALOR SEM TRIBUTO
IBS                   = BASE IBS/CBS × aliq.IBS(ano, premissa)   [× 0,4 se a atividade tem redução de 60% — só no DÉBITO, crédito integral]
CBS                   = BASE IBS/CBS × aliq.CBS(ano, premissa)   [idem]
TOTAL NF FINANCE      = BASE ISS FINANCE + BASE ICMS FINANCE
TOTAL NF CLIENTE      = Vlr Item − Vlr Desconto Item
DIF                   = TOTAL NF CLIENTE − TOTAL NF FINANCE
```

Linha 5 de cada aba: `SUBTOTAL(9,...)` por coluna (respeita filtro). Linhas 1-4: labels de Documento (DANFE/NFS) e rótulo do ano.

## Tabela de alíquotas (fonte: aba Premissas do modelo, cruzada com a LC 214/2025 e o README do módulo atual)

```
IBS/CBS          2026    2027    2028    2029    2030    2031    2032    2033
ALIQ. CBS        0,90%   8,70%   8,70%   8,80%   8,80%   8,80%   8,80%   8,80%
ALIQ. IBS UF     0,10%   0,05%   0,05%   1,75%   3,42%   5,02%   6,56%   12,27%
ALIQ. IBS MUN    0,00%   0,05%   0,05%   0,87%   1,71%   2,51%   3,28%   5,43%

Redução 60% (LC 214/2025 art. 133 — medicamentos Anvisa/farmácia de manipulação,
configurável por cliente no wizard, NÃO genérica):
  ALIQ.CBS/IBS UF/IBS MUN (RED.60%) = alíquota cheia × 0,4

ICMS/ISS — % de redução:
              2029   2030   2031   2032   2033
              90%    80%    70%    60%    0%
```

## Gaps conhecidos (endereçar nas fases correspondentes)

- **CFOP da amostra de "entradas"**: a amostra de EFD ICMS/IPI inspecionada mostrou CFOP `5102` (saída), não `1xxx/2xxx`. Validar contra todos os arquivos de amostra antes de codar o parser (Fase 5).
- **Schedule exato de % de crédito IBS/CBS 2027-2033** na aba "Entradas - EFD ICMS IPI": só as primeiras 30 linhas foram inspecionadas até agora — reler a aba completa na Fase 5.
- **PivotTable**: ExcelJS não cria Tabela Dinâmica nativa — decisão tomada: tabela SUMIFS + gráfico nativo (Fase 6).

## Fases

Ver plano completo em `TaskList` (tasks #62-#69, prefixo "Reforma v2"), cada uma com dependência sequencial na anterior:

0. Base (este doc + tasks + CNAE secundários)
1. Wizard Passos 1-3 (Empresa/CNAE, Premissas, Legislação via IA)
2. Wizard Passos 4-7 + Excel abas Premissas/Legislações
3. Excel abas de ano (2026-2033)
4. Excel Valor Total NF-e / Quadro Comparativo / Base IBS-CBS
5. Excel Entradas EFD ICMS/IPI (créditos + regime do fornecedor)
6. Excel Análise Fornecedores + gráfico
7. Integração, teste com dados reais, polish

## Estado atual

- [x] **Fase 0** — documento escrito, tasks #62-#69 criadas, CNAE secundários expostos em `cnpj/[cnpj]/route.ts` (`cnaesSecundarios`).
- [x] **Fase 1** — Wizard v2 com 7 passos (`STEPS` em `[empresaId]/page.tsx`), passos 4-7 com placeholder "em construção":
  - Passo 1 (Empresa): `Step1Empresa.tsx` estendido com `CnaeInfo`/`cnaesSecundarios`.
  - Passo 2 (Premissas): `StepPremissasReforma.tsx` (novo) — tabela editável de alíquotas CBS/IBS UF/IBS Mun/ISS por ano 2026-2033 + toggle de redução de 60%.
  - Passo 3 (Legislação): `StepLegislacaoIA.tsx` (novo) + rota `POST /api/reforma-tributaria/legislacao-ia` + `src/lib/reforma-legislacao-busca.ts` (busca por termos do CNAE nas 3 legislações, cacheadas em `src/data/reforma-legislacoes/*.txt` — extraídas uma vez via `unpdf`, não reprocessa PDF em runtime). **Validado com dados reais**: CNAE 4771701 (farmacêutico) → termos extraídos → busca encontra o art. 133 da LC 214/2025 (redução de 60%) corretamente.
  - Persistência: tudo em `EmpresaReforma.parametrosExtra` (JSON) — sem migração Prisma. Rotas `empresas/route.ts` (POST) aceitam e persistem `parametrosExtra`; `aliquotaICMS` e afins (campos do wizard antigo) agora têm fallback `?? 0`/`?? false` pois o wizard v2 não passa mais por aquela tela nos passos 1-3.
  - O wizard antigo (`Step2Premissas`/`Step3Simulacao`/`Step4Analise` — ICMS/IPI/FCBF, gráficos, export estático) foi desconectado desta página intencionalmente; os arquivos continuam no repo (não deletados) mas não são mais renderizados aqui.
- [x] **Fase 2** — Wizard completo (7/7 passos) + gerador de Excel real:
  - Passo 4 (Base NCM): `StepBaseNcm.tsx` — usa a base padrão (asset `src/data/reforma-base-ibs-cbs/base.json`, 4.524 linhas extraídas do Excel-modelo, carregada via `src/lib/reforma-base-ibs-cbs.ts`) ou upload de base própria (.xlsx, buffer guardado em memória).
  - Passo 5 (Saídas): `StepSaidasEfd.tsx` + `src/lib/efd-contribuicoes-saidas-parser.ts` (novo — parser granular por ITEM, registros 0000/0150/0200/C100/C170/A100/A170). **Validado campo a campo contra arquivo real** (Art Farma, CNPJ 25033836000113, período 10/2025): CNPJ/período/CFOP/NCM/valores de PIS/COFINS/ICMS todos conferem; 0 linhas sem CNPJ/CPF de participante, 0 DANFEs sem NCM em 1.421 itens.
  - Passo 6 (Entradas): `StepEntradasEfd.tsx` + `src/lib/efd-icms-ipi-entradas-parser.ts` (novo — mesmo princípio, mas para EFD ICMS/IPI, capturando **CNPJ do fornecedor via registro 0150** — o gap identificado na Fase 1). Testado contra amostra real (LIPI Supermercado): CNPJ/fornecedores/NCM/CFOP de entrada corretos.
  - Passo 7 (Revisão): `StepRevisao.tsx` — resumo de tudo + botão "Gerar Excel".
  - Gerador de Excel: `src/lib/reforma-excel/premissas-legislacoes.ts` (abas Premissas + Legislações, fórmulas nativas no padrão `f(formula,result)`, fonte Calibri) + `src/lib/reforma-excel/gerar-excel-reforma.ts` (orquestrador, download client-side). **Validado**: workbook gerado e relido via ExcelJS — título, alíquotas, fórmula `SUM(D4:D6)` do total, fórmula `D4*0.4` da redução de 60%, tabela ICMS/ISS 2029-2033, lookup Estabelecimento→CNPJ, e o requisito crítico de B4+ em branco na aba Legislações — todos conferem.
  - **Escopo explícito desta fase**: o Excel gerado no Passo 7 só tem as abas Premissas e Legislações. Os dados de saídas/entradas já importados ficam no estado do wizard (não persistidos no Prisma — grandes demais para JSON) para quando as abas de ano/entradas existirem (Fases 3 e 5).
- [x] **Fase 3** — Gerador das 7 abas de ano (2026, "2027 e 2028", 2029-2033): `src/lib/reforma-excel/anos.ts`, com a cadeia completa de fórmulas (VALOR SEM TRIBUTO → BASE PIS COFINS → ICMS/ISS gross-up → BASE IBS/CBS → IBS/CBS com redução de 60% honrada só no débito → TOTAL NF/DIF), letras de coluna computadas programaticamente via `letraDe()` (nunca hardcoded), alíquota IBS/CBS do ano gravada em células fixas (D2/D3 de cada aba) e referenciada por fórmula absoluta (`$D$2`/`$D$3`) nas linhas de dado. Módulo `coluna-letra.ts` extraído como utilitário compartilhado (usado também por `premissas-legislacoes.ts`).
  - **Decisão deliberada**: diferente do Excel-modelo (onde as letras de coluna variam levemente entre abas), aqui todas as 7 abas de ano usam o MESMO layout — como o arquivo é gerado do zero, não há motivo pra herdar essa inconsistência, e isso facilita a Fase 4 (Quadro Comparativo) referenciar as mesmas colunas em todas as abas.
  - **Validado com dados reais** (1.421 itens da Art Farma, out/2025, simulando redução de 60% ativa): workbook gerado (4,6MB) e relido via ExcelJS — **0 erros de fórmula em 1.421 linhas × 7 abas**; VALOR SEM TRIBUTO idêntico entre anos (esperado, a base não muda); IBS/CBS crescem monotonicamente 2026→2033 seguindo o cronograma (CBS com redução: 0,36%→3,52%; IBS com redução: 0,04%→7,08%); "2027 e 2028" usa a mesma alíquota (confirmado); fórmulas conferem célula a célula (`BJ5="AH5-AQ5-BA5-BG5-AS5-AK5"`, `BV5="BU5*$D$2"`).
  - Orquestrador (`gerar-excel-reforma.ts`) e `StepRevisao.tsx` atualizados: o Excel gerado no wizard já inclui as 7 abas de ano sobre os dados importados no Passo 5.
- [x] **Fase 4** — Abas Valor Total NF-e, Quadro Comparativo e Base IBS-CBS:
  - **`calculo-linha-ano.ts`** (novo): extrai `calcularCamposAno()` — a MESMA cadeia de cálculo usada em `anos.ts` — como função pura compartilhada, pra Valor Total NF-e e Quadro Comparativo pré-computarem resultados sem divergir da lógica das abas de ano (achado nesta fase: a primeira versão usava os valores brutos do EFD em vez dos recalculados — corrigido antes de finalizar).
  - **Correção de bug real encontrado nesta fase**: a redução de ICMS/ISS 2029-2033 (tabela da aba Premissas) nunca era aplicada nas fórmulas das abas de ano — ICMS e ISS ficavam constantes em todos os anos. Corrigido com a constante compartilhada `REDUCAO_ICMS_ISS` (2026-2028=100%, 2029=90%... 2033=0%, fixada por lei) aplicada tanto na Alíquota ICMS quanto na Alíquota ISS por linha, e usada tanto em `anos.ts` quanto no pré-cálculo do Quadro Comparativo. Premissas passou a importar essa mesma constante em vez de ter uma cópia local.
  - **`valor-total-nfe.ts`**: dropdowns (Estabelecimento/Documento/Ano) via `dataValidation`, cruzando a aba de ano selecionada com `INDIRECT` (necessário porque o nome da aba muda dinamicamente conforme o dropdown) + `SUMIFS`.
  - **`quadro-comparativo.ts`**: tabela PIS/COFINS × ICMS × ISS × CBS × IBS por ano, `SUMIFS`/`SUM` diretos por coluna (sheet name fixo por ano, sem precisar de `INDIRECT` aqui).
  - **`base-ibs-cbs.ts`** + **rota `GET /api/reforma-tributaria/base-ibs-cbs`** (serve a base padrão, 4.522 linhas, pro gerador client-side) + **`reforma-base-ibs-cbs-custom.ts`** (parser de base customizada via upload, por nome de cabeçalho).
  - **Validado com dados reais** (1.421 itens Art Farma): Valor Total NF-e — total calculado bate exatamente com o esperado em JS (R$ 5.440,78); Quadro Comparativo — PIS/COFINS e ICMS agora corretamente constantes só até 2028 e variam 2029+; CBS/IBS crescem como esperado; Base IBS-CBS — 4.524 linhas gravadas (2 de cabeçalho + 4.522 de dado), todas as colunas conferem.
  - **Limitação conhecida (baixa severidade)**: o ExcelJS descarta o valor em cache (`result`) de células de fórmula quando o resultado é exatamente `0` (bug/comportamento da lib, reproduzido isoladamente) — a fórmula em si fica correta e o Excel recalcula certo ao abrir; só afeta visualizadores que não recalculam (preview sem abrir no Excel de fato). Não bloqueia a fase; candidato a revisão na Fase 7 se importar pro caso de uso real.
- [x] **Fase 5** — Aba Entradas EFD ICMS/IPI (créditos de IBS/CBS por fornecedor):
  - **Achado que corrige a leitura original do pedido**: reabrindo as fórmulas reais da aba "Entradas - EFD ICMS IPI" do Excel-modelo, não existe um "percentual de crédito por ano" separado — é a MESMA alíquota IBS/CBS do ano (igual à Premissas), aplicada sobre a base da compra, com um multiplicador ×0,4 (ou ×0, ou nada) conforme a classificação do NCM na aba Base IBS-CBS (`Descrição Alíquota`: "Cheio" / "Alíquota reduzida em 60%" / "Alíquota zero" / "Não permitido"). O "Não permitido" também cobre fornecedor Simples Nacional. Sem crédito em 2026 (período de teste) — só 2027 em diante, igual ao modelo.
  - **Importante**: a redução de 60% aqui é por CLASSIFICAÇÃO DO NCM (Base IBS-CBS), diferente do toggle de redução de 60% do Passo 2 (que é sobre o débito da própria empresa) — são mecanismos independentes.
  - `StepEntradasEfd.tsx` (reescrito): após parsear os arquivos, classifica automaticamente todo CNPJ de fornecedor único via `consultarCnpjsEmLote` (mesma lib endurecida da Consulta Simples Nacional). Zero-erro de verdade: se algum CNPJ não resolver, a navegação pro próximo passo fica bloqueada até reclassificar — não assume regime por padrão.
  - `entradas-efd.ts` (novo): monta a aba com tabela de alíquotas cheias (2027 e 2028, 2029-2033), tabela de referência Fornecedor→Regime (fonte de um `VLOOKUP` real, não a fórmula quebrada `#REF!` encontrada no modelo original), coluna "Tipo Crédito" (`IFERROR(IF(Regime="Regime Regular",VLOOKUP(NCM,'Base IBS-CBS'!H:K,4,FALSE),"Não permitido"),"Cheio")`) e 12 colunas de Crédito IBS/CBS por ano.
  - **Bug real encontrado e corrigido durante a validação**: a primeira versão da tabela de alíquotas tinha os rótulos de linha desalinhados dos valores gravados (ex: linha rotulada "ALIQ. IBS MUN" continha na verdade o valor de IBS UF) — as fórmulas geradas referenciavam a célula certa por acidente em alguns casos e errada em outros (uma delas apontava pra uma célula de texto, o que quebraria com `#VALUE!` no Excel real). Corrigido com layout de linhas explícito e sem sobreposição (Ano/CBS/IBS UF/IBS MUN em linhas fixas e distintas).
  - **Validado com dados reais** (57 itens de entrada, amostra real EFD ICMS/IPI, 3 fornecedores únicos, classificação simulada alternando regimes): fornecedor Simples Nacional → Tipo Crédito "Não permitido" → crédito R$ 0,00 em todos os anos (confirmado, soma total = 0); fornecedor Regime Regular → Tipo Crédito "Cheio" → crédito calculado corretamente (ex: R$ 15,96 IBS / R$ 1.388,52 CBS pra um item em 2027/2028, valores conferem com base×alíquota).
- [x] **Fase 6** — Aba Análise Fornecedores (última aba do Excel — as 14 planejadas estão todas geradas):
  - **Achado que muda o combinado anterior**: o ExcelJS (v4.4.0, confirmado via inspeção do objeto worksheet) **não tem NENHUMA API de gráfico nativo do Excel** — não é só a limitação de Tabela Dinâmica já conhecida, é uma limitação mais ampla (nem `addChart` nem equivalente existe). A decisão registrada anteriormente ("tabela SUMIFS + gráfico nativo ExcelJS") tinha uma premissa incorreta sobre a capacidade da lib.
  - **Solução adotada**: `chart.js` (já uma dependência do projeto) renderiza o gráfico de pizza num `<canvas>` do browser (`grafico-fornecedores.ts`), vira PNG, e é embutido na planilha via `ws.addImage()` — que o ExcelJS suporta de verdade. Resultado visual "bonito" como pedido, mas **é uma imagem estática**, não um objeto de gráfico do Excel ligado às células (não recalcula sozinho ao editar dados na planilha — só quando o Excel é gerado de novo pelo wizard). Trade-off comunicado ao usuário na tela de Revisão, não escondido.
  - `analise-fornecedores.ts` (novo): tabela SUMIF (Regime Regular / Simples Nacional / Total Geral, com %) contra a aba Entradas, deduplicada por documento (não por item) pra bater com "Soma de Vlr Documento" do modelo. Fallback gracioso: se o ambiente não tiver `document`/canvas (ex.: geração em teste Node puro), a tabela continua íntegra e só a imagem é omitida.
  - **Validado com dados reais** (amostra LIPI, 3 fornecedores): fórmulas SUMIF corretas, Regime Regular + Simples Nacional = Total Geral (conferido), percentuais somam 100%.
  - Dev server compilou (3.334 módulos) sem erros de SSR com o `chart.js/auto` (import dinâmico, só carrega no client ao gerar o Excel).
- [x] **Fase 7** — Integração ponta a ponta, testes em escala real e polish. **O wizard v2 está completo — todas as 7 fases do plano concluídas.**
  - **Teste em escala real**: parseados os 10 arquivos mensais completos de EFD Contribuições da Art Farma (jan-out/2025, CNPJ 25033836000113) — 19.967 linhas de saída — e gerado o Excel completo (14 abas) com esses dados. Resultado: **0 erros de fórmula em 139.769 linhas de dados** (19.967 linhas × 7 abas de ano), todas as 14 abas presentes, magnitude plausível (R$ 5,4 milhões de faturamento em 10 meses de uma rede regional de farmácias — ordem de grandeza coerente).
  - **Achado real de escala (não documentado antes)**: gerar o workbook completo nesse volume levou ~132s e picos de ~8GB de memória no processo Node — a primeira tentativa com limite de 4GB deu `FATAL ERROR: Reached heap limit`. Isso é uma limitação real do gerador atual (ExcelJS mantém todas as células em memória, sem streaming) que pode travar em navegadores/máquinas com menos recursos. **Mitigação aplicada agora**: `StepRevisao.tsx` avisa o usuário quando o total de itens de saída passa de 8.000, recomendando gerar menos meses por vez. **Não corrigido** (ficaria pra uma sessão futura): reescrever o gerador pra usar `ExcelJS.stream.xlsx.WorkbookWriter`, que não mantém tudo em memória — mudança maior, fora do escopo de "polish".
  - **Gap de dados que permanece**: não há amostra real de EFD ICMS/IPI de entradas da Art Farma disponível (as entradas foram validadas com uma amostra de outro cliente, LIPI Supermercado — já era um gap conhecido desde a Fase 2/5, continua registrado aqui).
  - `README.md` do módulo atualizado: nota no topo apontando pro wizard v2 e pra este documento, seção 14 nova listando os arquivos do fluxo atual e a limitação de escala.
  - `type-check` limpo em todas as 7 fases; nenhum arquivo de teste/scratch deixado no repositório (todos os `_scratch_*` foram apagados após validação).

## Correções pós-lançamento (uso real, task #72)

Lote de correções reportado pelo usuário após uso em produção com dados reais da Art Farma (4 prints: cadastro, geração travando, aba de ano com `#VALOR!`, comparação "como foi vs correto" de PIS/COFINS):

- **Bug crítico corrigido — `#VALOR!` e PIS/COFINS lendo errado**: `rawRowValues()` em `anos.ts` estava com um valor faltando (só emitia uma célula pra "Alíquota ISS"+"Vlr ISS", que são duas colunas no cabeçalho `RAW_HEADERS`). Isso desalinhava TODAS as colunas seguintes por uma posição — a "Vlr Base Cálculo PIS" recebia o CST PIS (texto tipo `"01"`) em vez de um número, causando `#VALOR!` em cascata. Corrigido com o placeholder que faltava. Validado com dados reais da Art Farma: 0 erros de fórmula, células numéricas com tipo correto.
- **"Página sem resposta" durante a geração**: os loops pesados do gerador (até ~140 mil linhas de fórmula) rodavam 100% síncronos, travando a thread principal do browser. Corrigido com `yieldToEventLoop()` (`src/lib/reforma-excel/yield.ts`) chamado a cada 500 linhas dentro de `montarAbaAno` (agora assíncrona) e entre cada aba no orquestrador.
- **Barra de progresso real**: `gerarExcelReforma()` agora aceita um callback `onProgress(percentual, etapa)`, ponderado pelo tamanho de cada aba (as 7 abas de ano pesam proporcionalmente a `linhasSaidas.length × 7`, o resto é uma fatia pequena fixa). `StepRevisao.tsx` mostra a barra com % e a etapa atual durante a geração.
- **Larguras de coluna + formato contábil**: `anos.ts` ganhou `larguraColuna()` (largura por nome de cabeçalho, nada cortado) e os subtotais agora usam o formato contábil `_-"R$" * #,##0.00_-;...` em vez de número cru.
- **Regime tributário por CNPJ**: antes só dava pra escolher o regime da empresa principal; `EstabelecimentoData` (Step1Empresa.tsx) ganhou campos `regime`/`simplesNacional` próprios, com um dropdown de regime por estabelecimento adicionado na lista de CNPJs extras.
- **Busca de legislação não achava o Art. 133 da LC 214/2025**: `buscarTrechosRelevantes()` limitava resultados por POSIÇÃO no documento (top 6 por fonte), não por relevância — quando a empresa tinha vários CNAEs secundários genéricos (alimentício, cosméticos etc.), os termos deles apareciam mais cedo no texto da lei e ocupavam todo o orçamento de busca, escondendo o artigo específico do CNAE principal (farmácia de manipulação). Corrigido separando busca de termos principais (orçamento maior, garantido) de termos secundários (preenchem o restante sem sobrepor regiões já cobertas). Validado com o cenário exato relatado pelo usuário: achou o Art. 133 corretamente.
- **Nota manual de legislação não aparecia no Excel**: decisão original do projeto era deixar a aba Legislações em branco (B4+) pro usuário anotar depois de revisar na tela. Na prática o usuário queria que o texto digitado no wizard fosse pro Excel — `montarAbaLegislacoes()` agora grava `legislacao.notaManual` linha a linha em B4+ quando o usuário digitou algo (reversão explícita da decisão anterior, feita a pedido direto do usuário).
- **Otimização encontrada de passagem (não reportada pelo usuário)**: `quadro-comparativo.ts` recalculava `calcularCamposAno()` 5× por (ano, linha) — uma vez por tributo — sem necessidade, já que a função devolve os 5 campos de uma vez. Reduzido de 40N para 8N chamadas via pré-soma em `somasPorAno`.
- Campo "Faturamento Anual Estimado" — já tinha sido removido em commit anterior (`c29eb34`); o print do usuário estava desatualizado, nenhuma mudança de código necessária aqui.
- Validado: `npx tsc --noEmit` limpo, dev server sem erros de compilação, commit `665b36f`.

## Abas de ano fiéis ao modelo (task #73)

O usuário comparou o Excel gerado com o Excel-modelo real ("Reforma_Tributária - Art Farma vff.xlsx", grupo L Cardoso Melo + Pharmaplus, 4 CNPJs) e pediu que as ABAS DE ANO ficassem idênticas. A investigação célula a célula do modelo revelou que o gerador estava incompleto em vários pontos estruturais:

- **CNPJ por estabelecimento**: o parser pegava o CNPJ do registro 0000 (sempre a matriz) e ignorava os registros C010/A010/F010, que alternam os blocos de cada estabelecimento dentro do MESMO arquivo. Resultado: tudo saía com 1 CNPJ quando o modelo mostra 4 (matriz+filial de cada empresa). Corrigido rastreando o estabelecimento corrente na segunda passada do parser.
- **Registros que não eram lidos** (e no caso Pharmaplus significavam TODO o faturamento ausente):
  - `C175` — NFC-e (modelo 65) consolidada por CFOP/CST dentro do documento: 6.864 linhas nos arquivos reais, 25% da aba do modelo. Sem participante/quantidade, Vlr ICMS = 0, alíquota ICMS derivada do C100 quando existe.
  - `F100` — demais documentos e operações: 685 linhas, TODAS entram (sem filtro de IND_OPER — confirmado 685/685 no modelo).
  - `F550` — consolidação por regime de competência: os EFDs da Pharmaplus só têm F550 (nenhum C170/A170), então antes o parser retornava 0 linhas pra eles. Mod 98 = serviço (NFS), demais = DANFE; PA = período do arquivo; Vlr Item = 0 (como no modelo).
- **Formato das alíquotas**: PIS/COFINS agora ficam como NÚMERO PERCENTUAL (1,65 / 7,6, formato do EFD e do modelo) e as fórmulas usam `AY8%`/`BE8%`. Alíquota ICMS fica decimal (0,225) com fórmula `(1-AR8%)` — reproduz fielmente o modelo, inclusive a dupla divisão por 100 no gross-up de ICMS que o modelo tem.
- **Alíquota ICMS é PREMISSA, não dado**: descoberta importante — o modelo usa 22,5% constante em TODAS as linhas DANFE (até nos C170 onde o EFD diz 27%, 21%, 7%...) e 0 nas NFS. É a alíquota modal do estado escolhida pelo analista. Virou campo novo no Passo 2 do wizard (`PremissasReformaData.aliquotaICMS`, default 22,5%), usado nas abas de ano e no Quadro Comparativo.
- **Layout idêntico ao modelo**: dados começam na coluna B, linha 8; título "Saídas - EFD Contribuições" em B5; "FINANCE"/"DÉBITO" na linha 5; linha 6 = SUBTOTALs em formato contábil R$ (conjunto EXATO de colunas do modelo) com "X" em Frete/Seguro/Outras DA/Tipo Item; cabeçalho na linha 7; rótulos DANFE/NFS em AH2/AH3; alíquota efetiva IBS+CBS em BU3 (`IFERROR((BW6+BV6)/BU6,0)`); ano em BU4.
- **Coluna `id`** (P): fórmula `=O8&S8` (chave & valor do documento), igual ao modelo.
- **Fórmulas por linha idênticas ao modelo**: Alíquota ISS = `IF(AG8="09 Serviços",3%,0)` (premissa embutida como literal); Vlr ISS = `AH8*AP8`; IBS/CBS = `BU8*0.1%`/`BU8*0.9%` (literais do ano, com redução de 60% se marcada); PA como DATA (1º dia do mês, formato mm-dd-yy); rótulo de A170 corrigido pra "A100/A170 - Nota Fiscal de Serviço"; Descrição CFOP truncada em 50 caracteres como no modelo; CFOP 5933 nas linhas de serviço.
- **Validação (dados reais, 20 arquivos EFD do grupo)**: contagens por registro IGUAIS aos arquivos (C170 2.450 no total dos 20 — 91 na amostra do modelo —, C175 6.864 ✓, A170 19.876 ✓, F100 685 ✓, F550 61; modelo tem 34 F550 porque na época só existiam jan–jun da Pharmaplus); 4 CNPJs presentes ✓; a linha do doc 112 (set/2025) saiu IDÊNTICA à linha 8 do modelo em todas as colunas brutas e nas 17 calculadas (tolerância 1e-6); linha F550 da Pharmaplus idêntica à linha 27524 do modelo; 333.471 fórmulas geradas no teste integrado (7 abas de ano + Valor Total NF-e + Quadro Comparativo) com 0 erros e referências cruzadas apontando pro novo layout (coluna B, linha 8).
- **Espelho JS atualizado** (`calculo-linha-ano.ts`): mesmas convenções de unidade das fórmulas (PIS/COFINS ÷100, ICMS ÷100 na fórmula, ISS decimal direto) e VALOR SEM TRIBUTO agora subtrai o Vlr ISS calculado (o modelo subtrai AQ, que é fórmula, não 0).

## Ajustes visuais + F550 por Vlr Documento (task #74)

Segundo lote de ajustes do usuário sobre as abas de ano e Legislações (com prints do modelo como referência):

- **F550 parte do Vlr Documento**: linhas F550 não têm Vlr Item (fica 0), então VALOR SEM TRIBUTO (BJ) e TOTAL NF CLIENTE (BY) agora usam a coluna S (Vlr Documento) nessas linhas — `=S8-AK8-AS8-BA8-BG8-AQ8`. Espelho JS (`calcularCamposAno`) e o cache do Valor Total NF-e acompanham. Validado com os valores exatos do print do usuário: BJ=1.294,90 / BK=1.343,95 / BQ(mod 98)=358.603,10 / BR=10.758,09.
- **Visual das abas de ano igual ao modelo**: headers das colunas FINANCE em laranja `#FFC000` (negrito, centralizado), BASE IBS/CBS + IBS + CBS + DIF em vermelho `#FF0000` com fonte branca; barra do ano em azul `#5B9BD5` (mesclada sobre BASE IBS/CBS..CBS), "DÉBITO" em laranja logo abaixo, alíquota efetiva em negrito centrada acima; "FINANCE" mesclado e centralizado sobre BJ..BT; negativos da linha de subtotal em vermelho (`[Red]` no formato contábil).
- **Aba Legislações completa**: agora grava TODOS os achados da busca (fonte em negrito + artigo + texto completo do resumo, com wrapText), separados por linha em branco, e a nota manual do usuário numa seção "Anotações" no final. Antes só saíam fonte e rótulo do artigo do primeiro achado.
- **Cores das guias**: abas de ano em azul claro (`#9DC3E6`), Premissas e Legislações em amarelo alaranjado (`#FFC000`), como no modelo.

## PIS/COFINS zerado 2027+ e Quadro Comparativo no visual da referência (task #75)

- **PIS/COFINS zera a partir de 2027** (a CBS substitui; 2026 é o único ano de convivência): nas abas de ano 2027+, a célula BASE PIS COFINS vira a fórmula literal `=0` — VLR PIS, VLR COFINS e VLR PIS + COFINS zeram por consequência (referenciam a base), e o gross-up de ICMS/ISS passa a não embutir PIS/COFINS (os valores de ICMS/ISS de 2027 ficam levemente menores que 2026, como na referência do usuário). `calcularCamposAno()` ganhou o parâmetro `zerarPisCofins`, usado também no pré-cálculo do Quadro Comparativo.
- **Quadro Comparativo reformatado** (réplica da planilha de referência): faixa azul-marinho `#1F3864` com "TOTAL DOS TRIBUTOS INDIRETOS" (mesclada, fonte branca 14), caixa "Empresa" azul-marinho + dropdown com borda, cabeçalho TRIBUTO/anos e linha VALOR TOTAL em banda cinza `#F2F2F2`, linha "IMPACTO CARGA TRIBUTÁRIA" em azul claro `#DDEBF7` com a variação % vs 2026 (2026 mostra "-"), rótulos com sufixo ("ICMS (Não cumulativo)", "ISS (Cumulativo)" etc.), CBS/IBS de 2026 em fonte cinza (ano de teste). O lookup Empresa→CNPJ saiu da área visível (foi pra coluna M, discreto), os SUMIFS agora filtram por `$M$5`.

## Dropdown Empresa derivado das saídas (task #76)

A lista de estabelecimentos da aba Premissas (fonte do dropdown "Empresa"/"Estabelecimento" do Quadro Comparativo e do Valor Total NF-e) era montada a partir do CADASTRO (matriz + adicionais do Passo 1) — se o usuário cadastrasse só as 2 matrizes, o dropdown mostrava 2 itens mesmo com 4 CNPJs nos EFDs. Agora `listaEstabelecimentos()` (premissas-legislacoes.ts) deriva a lista dos CNPJs DISTINTOS presentes nas linhas de saída importadas, na ordem de aparição, com sufixo "- Matriz" / "- Filial NNNN" quando a mesma razão social tem mais de um CNPJ (ex: "PHARMAPLUS LTDA - Filial 0003"). `layoutListasPremissas()` mudou de assinatura (recebe o total de estabelecimentos) e os ranges de dropdown/VLOOKUP das três abas acompanham automaticamente. Fallback: sem saídas, usa o cadastro. Validado: 4 CNPJs do grupo → 4 itens + "Todos", ranges C17:C21 alinhados nas três abas.

## Estilos: Entradas, guias pretas e Valor Total NF-e "capa de DANFE" (task #77)

- **Entradas - EFD ICMS IPI** no estilo da referência: faixa azul `#5B9BD5` com o rótulo do ano mesclada sobre cada par de colunas de crédito, subcabeçalhos "IBS"/"CBS" com borda, e a coluna única "Tipo Crédito" virou DUAS colunas "Crédito CBS"/"Crédito IBS" (mesma classificação em ambas, cabeçalho azul claro `#DDEBF7`) — layout do modelo. Valores de crédito em formato contábil R$ e linha 6 com `SUBTOTAL(9,...)` por coluna de crédito. Constantes de layout mudaram (`LINHA_DADOS_INICIO_ENTRADA` 8→9), consumidores (Análise Fornecedores) acompanham via exports.
- **Guias pretas** nas abas Quadro Comparativo e Valor Total NF-e, como na referência.
- **Quadro Comparativo**: rótulo "Empresa" agora fica só na coluna C (removido o mesclar B5:C5, a pedido).
- **Valor Total NF-e reescrita** no layout "capa de DANFE" da referência: bloco de filtros B2:C5 (Estabelecimento/CNPJ/Documento/Ano, rótulos azul claro + bordas), faixa azul-marinho "VALOR TOTAL DA NOTA FISCAL", cabeçalho com o ano selecionado (fórmula `=C5`) e tabela 2×7 toda com bordas: BASE DE CÁLCULO DO ICMS (=Σ BASE ICMS FINANCE), VALOR DO ICMS, BASE/VALOR ICMS SUBST. (=Σ Vlr ICMS-ST), VALOR PIS/COFINS, VALOR DO ISS, VALOR TOTAL DOS PRODUTOS (=Σ VALOR SEM TRIBUTO), FRETE, SEGURO, DESCONTO (=Σ Vlr Desconto NF), OUTRAS DESP. ACESS., CBS, IBS e VALOR TOTAL DA NOTA (=Σ TOTAL NF FINANCE, célula destacada). Tudo por SUMIFS+INDIRECT sobre a aba do ano do dropdown; assinatura de `montarAbaValorTotalNfe` ganhou `premissas` (pros valores default em cache). Validado: BASE ICMS == VALOR TOTAL DA NOTA e PRODUTOS+PIS/COFINS+ICMS == TOTAL, com dados reais.

## Quadro DÉBITO/CRÉDITO/SALDO + Excel "modo cliente" sem fórmulas (task #84)

- **Quadro Comparativo reorganizado** (referência visual do usuário): PIS/COFINS, ICMS e ISS seguem como antes; o bloco IBS/CBS agora abre em **DÉBITO** (saídas — linhas salmão `#FCE4D6`, rótulo mesclado na coluna B), **CRÉDITO** (entradas — linhas verdes `#E2EFDA`, SUMIFS sobre os pares IBS/CBS da aba Entradas, 2026 = "R$ -" cinza) e **SALDO** (débito − crédito, fórmula `=D11-D13` etc.). A linha **VALOR TOTAL usa o SALDO** de IBS/CBS (não o débito): `SUM(PIS..ISS)+saldoCBS+saldoIBS` (2026 continua só PIS/COFINS+ICMS+ISS). IMPACTO acompanha. `montarAbaQuadroComparativo` ganhou `linhasEntradas`, `classificacoesFornecedores` e `baseIbsCbs`.
- **Bug real achado na validação**: o cache JS de crédito (Entradas e Quadro) assumia "Cheio" pra todo Regime Regular, ignorando a classificação do NCM na Base IBS-CBS — o valor congelado divergia do recalculado pelo Excel (277 mil vs 214,9 mil no teste). Corrigido com `tipoCreditoPorNcm()`/`fatorCreditoDoTipo()` (Cheio=1, reduzida 60%=0,4, zero/não permitido/diferimento=0, NCM fora da base=Cheio). Validado: cache reproduz o valor recalculado pelo Excel real até a 9ª casa (214.926,225233999).
- **Excel "modo cliente"** (`gerarExcelReforma(dados, onProgress, { modoCliente: true })`, botão novo no Passo 7): versão pra ENVIAR AO CLIENTE com só as abas Premissas, Legislações, anos (2026-2033), Valor Total NF-e, Quadro Comparativo e Entradas - EFD ICMS IPI. TODAS as fórmulas viram valores sólidos (`transformarParaCliente()`: remove `<f>` preservando `<v>`, fórmula sem cache vira 0), EXCETO nas abas Quadro Comparativo e Valor Total NF-e — os dropdowns (Empresa/Documento/Ano) continuam 100% funcionais porque os SUMIFS/VLOOKUP deles são mantidos (só somam colunas visíveis, não revelam a metodologia). Base IBS-CBS e Análise Fornecedores são removidas com todas as partes (worksheet, rels, drawing, imagem, Content_Types). Validado com dados reais: 12 abas, 0 fórmulas nas abas de dados, 86+16 fórmulas só no Quadro/VT, sem partes órfãs, 59MB (vs 84,5MB do interno), e AMBOS os arquivos abrindo limpos no Excel real via COM (interno 45s/14 abas, cliente 22s/12 abas, `HasFormula=False` nas células de dados do cliente).

## Fix consulta de CNPJ/classificação de fornecedores em produção (task #83)

Dois problemas simultâneos derrubaram a consulta de CNPJ (cadastro) e a classificação de fornecedores (Passo 6) em produção:

1. **BrasilAPI fora do ar** (HTTP 500 em TODOS os CNPJs por horas — confirmado via teste direto). O fallback ReceitaWS até respondia, mas (a) o plano público permite ~3 consultas/minuto (inviável pra lote de ~180 fornecedores) e (b) o parsing estava quebrado: a ReceitaWS mudou o formato de `simples`/`simei` de string "Sim"/"Não" pra OBJETO `{optante: boolean}`, então `fb.simples === "Sim"` nunca batia.
2. **Timeout da função no Vercel**: a rota de lote (20 CNPJs/request, concorrência 3 + retries com backoff) estourava o limite PADRÃO de 10s da função quando as APIs externas ficavam lentas; o Vercel matava a requisição e o wizard marcava todos os fornecedores do lote como não classificados. Em dev nunca reproduzia (sem limite de duração).

Correções:
- **Cadeia de 3 fontes** nas duas rotas (`automacoes/consulta-simples-nacional` e `reforma-tributaria/cnpj/[cnpj]`): BrasilAPI → **OpenCNPJ** (api.opencnpj.org — gratuita, sem rate limit agressivo, com Simples/MEI/CNAEs) → ReceitaWS (resgate pontual). Semântica do `opcao_simples` da OpenCNPJ validada com CNPJs de regime conhecido: `"S"` = optante, `"N"` = optou e saiu (vem com datas), `""` = nunca constou no cadastro do Simples = não optante (mesmo significado do `null` da BrasilAPI).
- **Parsing da ReceitaWS tolerante aos dois formatos** (objeto `{optante}` e string legada).
- **`export const maxDuration = 60`** na rota de lote + `AbortSignal.timeout(8000)` em toda chamada externa (uma API pendurada não consome o orçamento da função) + lote do cliente reduzido de 20 pra 10 CNPJs por request.
- Validado com a BrasilAPI AINDA fora: 12 fornecedores reais classificados via OpenCNPJ (incluindo 2 Simples Nacional legítimos), e a rota unitária respondendo 200 com CNAEs completos no dev server.

## Fix "Reparado"/arquivo corrompido no navegador (task #82)

O usuário reportou que o Excel gerado em produção abria como **"Reparado"** e travava ao habilitar edição. Diagnóstico com o arquivo real (PHARMAPLUS (5).xlsx, 89MB): o zip estava genuinamente corrompido — `uncompressed data size mismatch` nas entradas das abas de ano (~100MB descomprimidas cada). Causa: no pós-processamento híbrido, o XML das abas era entregue ao JSZip como **string**; o JSZip do NAVEGADOR grava metadados de tamanho inconsistentes para strings gigantes com caracteres multi-byte (ç, õ, "Serviços"...) — no Node ele converte pra Buffer antes e o problema não aparece (por isso todas as validações locais passavam). Correção de 1 linha no orquestrador: `zip.file(caminho, new TextEncoder().encode(sheetXml))` — o caminho vira binário, idêntico nos dois ambientes. Verificação decisiva via **Excel real (automação COM)**: o arquivo completo com os dados reais (14 abas, 84,5MB) abre limpo em ~42s, sem reparo, com fórmulas e valores corretos. Ferramenta nova de validação: abrir o .xlsx gerado no Excel via PowerShell COM (`Workbooks.Open`) — pega corrupções que o leitor do ExcelJS não pega.

## Fix ISS ORIGINAL + aba Entradas idêntica à planilha-original (task #81)

- **ISS ORIGINAL sempre com a alíquota de 2026**: a coluna usava `p.aliquotaISS` do PRÓPRIO ano da aba — se o usuário tivesse editado a premissa de ISS de anos futuros na tabela do Passo 2 (ex: 53% em 2032), o ISS ORIGINAL saía errado. Agora `contextoDaAba()` e o Quadro Comparativo usam `premissas.premissasPorAno[2026].aliquotaISS` (a alíquota NORMAL), independente do ano da aba.
- **Entradas - EFD ICMS IPI reescrita coluna a coluna igual à planilha-original do usuário** (conferir.xlsx, aba "original"): 61 colunas B..BW na ordem exata — CNPJ, PA (data mm-dd-yy), Registros ("C100/170/190 - Nota Fiscal"), Indicador Emitente, Situação, participante (código/CNPJ-CPF/Regime/nome/UF Origem-Destino), documento (número/série/modelo/chave/datas/valores com desconto, mercadoria, frete, seguro, outras DA), item (número/código/descrição/tipo/código de barra/NCM), bloco de crédito NO MEIO (coluna "Crédito IBS" vazia AD como no original + "Crédito CBS"/"Crédito IBS" com a classificação + 6 pares IBS/CBS), e o restante bruto (Vlr Operação vazio, Vlr Item, desconto, qtde, unidade, indicador de movimento, Natureza Crédito, CFOP + descrição, CST/base/alíquota/valor de ICMS, ICMS-ST, IPI, PIS, COFINS, conta contábil).
- **Parser de entradas expandido** (`efd-icms-ipi-entradas-parser.ts`): captura todos os campos acima do C100/C170 + 0200 (tipo/código de barra) + UF própria (0000). **Natureza Crédito derivada do CFOP** com o mapeamento extraído linha a linha do original (x102→"01 - revenda"; x101/x116/x122/x128/x556/x653→"02 - insumo"; 2551→"10 - ativo"; 1922→"13 - outras"; bonificação/amostra/conserto/1551/x949→em branco). Descrições de CFOP de entrada também extraídas do original.
- **Estrutura fiel**: tabela de alíquotas em AG1:AO4 (anos 2026-2033, alíquotas CHEIAS), título B5 + `SUBTOTAL` dos créditos em AG5:AR5 (R$), `SUBTOTAL` de Vlr Documento..Vlr Outras DA em R6:W6, banda de anos mesclada em AG6:AR6 (azul claro), cabeçalho na linha 7, dados na 8. Fórmulas de crédito idênticas às do original (IFs aninhados Cheio/reduzida 60%/zero/não permitido, base `(AT-AU)`, refs `$col$2..$4` da tabela, ambas testando AE). Tabela de fornecedores movida pra BY/BZ.
- **Validado contra o original com os 40 EFDs reais** (10 meses × 4 CNPJs): 4.833 linhas exatas, 51 colunas idênticas campo a campo na linha do doc 166037, valores de crédito iguais (0,00021 / 0,01827 / ...), fórmulas no mesmo formato, 0 erros.

## Fase 8 — CONCLUÍDA como geração híbrida (task #78, substitui o plano original de WorkbookWriter)

O usuário reportou **"Out of Memory" no Chrome** ao gerar em produção (taxhubapp.vercel.app) com a base completa do grupo (27.577 itens × 7 abas ≈ 193 mil linhas de fórmula). A causa: o modelo de documento do ExcelJS cria um objeto de célula pra cada célula (~14,6 milhões), e a aba do navegador tem teto de ~4GB. O plano original da Fase 8 (trocar por `ExcelJS.stream.xlsx.WorkbookWriter`) se mostrou INVIÁVEL no browser: **o bundle de browser do ExcelJS não inclui o WorkbookWriter** (depende de `archiver`/streams do Node). Solução implementada — **geração híbrida**:

1. **Duas otimizações de base** (valem pra qualquer aba): nenhum objeto de fonte por célula de dado (Calibri 11 já é o padrão do Excel) e formatos numéricos definidos no **estilo da coluna** (`ws.columns[].style.numFmt`), não célula a célula. Só isso derrubou o pico de ~8GB pra ~3GB — ainda insuficiente pro browser.
2. **Abas de ano em XML puro**: `montarAbaAnoCabecalho()` (anos.ts) monta via ExcelJS só as linhas 1-7 (título, barras, subtotais com somas pré-calculadas em JS, cabeçalho, estilos, larguras, congelamento). As linhas de dados são geradas por `gerarXmlDadosAno()` como SpreadsheetML em texto (strings com `inlineStr`, fórmulas `<f>` + resultado `<v>` em cache — de quebra resolve o velho problema do ExcelJS descartar cache de resultado 0), sem NENHUM objeto de célula.
3. **Injeção via jszip** (já era dependência): o orquestrador gera o .xlsx normal (com as abas de ano "vazias"), abre o zip, localiza o XML de cada aba de ano (workbook.xml → rels → sheetN.xml), troca o conteúdo do `<sheetData>` pelas linhas geradas, corrige o `<dimension>` e recompacta. `fullCalcOnLoad` ligado por segurança.

**Resultado medido com a base real completa (27.577 itens, 20 EFDs)**: pico de **1,35GB** (antes: estourava 4GB), 74s, arquivo de 76,8MB — cabe no navegador com folga. Validação: arquivo híbrido reaberto pelo leitor completo do ExcelJS, linha do doc 112 idêntica ao modelo (brutas + calculadas), 47.550 fórmulas sem erro no teste estrutural, XML do arquivo grande íntegro (escapes, dimension, contagem de linhas). Aviso de volume do `StepRevisao` atualizado (limiar 8.000 → 60.000 itens).

Nota: o leitor STREAMING do ExcelJS (`stream.xlsx.WorkbookReader`) não consegue ler o arquivo pós-jszip por depender da ordem das entradas no zip — o Excel e o leitor normal abrem sem problema; só afeta scripts de validação, que devem usar o leitor completo ou inspecionar o XML.

## Ajustes pós-híbrido: formatos por célula, gross-up 2027+ e VALOR TOTAL 2026 (task #79)

- **PA como data + formato contábil nas calculadas**: descoberta prática — o Excel NÃO aplica o estilo do `<col>` a células já gravadas sem atributo `s`; só vale pra células vazias/novas. Nas linhas injetadas via XML, o PA aparecia como número serial (45658) e as colunas calculadas perdiam o contábil. Correção: `extrairEstilosDasColunas()` lê os ids de estilo do `<cols>` do stub gerado pelo ExcelJS e `gerarXmlDadosAno()` carimba `s="N"` em cada célula de coluna estilizada.
- **Gross-up de ICMS/ISS a partir de 2027 embute IBS+CBS**: em 2026 as bases FINANCE continuam `(BJ+BL+BM)` (PIS/COFINS); de 2027 em diante viram `(BJ+BV+BW)/(1-AR%)` — o tributo embutido no preço passa a ser IBS+CBS, como na fórmula da referência do usuário (`=SE(AG="09 Serviços";0;(BJ+BV+BW)/(1-AR%))`). Espelho JS (`calcularCamposAno`) reordenado (IBS/CBS calculados antes das bases) com a mesma condição.
- **Quadro Comparativo, VALOR TOTAL de 2026**: soma só PIS/COFINS + ICMS + ISS (`SUM(D8:D10)`) — CBS/IBS de 2026 são alíquota-teste e ficam fora da carga real; 2027+ seguem somando as 5 linhas. O IMPACTO CARGA TRIBUTÁRIA usa esse novo total de 2026 como base.
- Validado com dados reais: célula PA com `mm-dd-yy`, BJ/BQ/S com contábil, BO de linha DANFE em 2027 = `(BJ+BV+BW)/(1-0,225%)` exato, D13 = soma das 3 primeiras linhas, 0 erros de fórmula.

## Colunas ICMS/ISS ORIGINAL no VALOR SEM TRIBUTO (task #80)

Nos anos de redução de alíquota de ICMS/ISS (2029-2033), o VALOR SEM TRIBUTO deduzia o ISS REDUZIDO do ano (a coluna Vlr ISS = AH×AP, com AP já reduzida), fazendo a base "crescer" nesses anos. A pedido do usuário, foram criadas duas colunas novas no fim do layout (CA/CB): **ICMS ORIGINAL** (`=AS`, o Vlr ICMS do EFD — o valor de 2026) e **ISS ORIGINAL** (`=SE(Tipo Item="09 Serviços";Vlr Item×premissa ISS CHEIA;0)` — sem o fator de redução). A fórmula do VALOR SEM TRIBUTO passou a deduzir os ORIGINAIS em todas as abas: `=ValorBase−Desconto−ICMSORIG−PIS−COFINS−ISSORIG`. Em 2026-2028 nada muda numericamente (fator 100%); em 2029-2033 a base fica estável. A coluna Vlr ISS (AQ, reduzida) continua existindo e alimentando o resto da cadeia (BQ/BR usam AP normalmente). Espelho JS ganhou o parâmetro `aliqIssOriginal` (repassado também pelo Quadro Comparativo). Validado com dados reais: 2026 doc 112 inalterado (983,29); linha de serviço em 2029 com ISS ORIGINAL = 3% (9,00) vs Vlr ISS reduzido = 2,7% (8,10) e BJ deduzindo o cheio; 0 erros de fórmula.

## Projeto reabrível + nome do projeto (task #85)

O estudo finalizado agora pode ser reaberto sem refazer nada: os dados pesados do wizard (saídas EFD, entradas EFD + classificações de fornecedores, base NCM customizada) são persistidos no **IndexedDB do navegador** (`src/lib/reforma-wizard-store.ts`, banco `taxhub-reforma`, store `wizard`, chave = id da EmpresaReforma) — não cabem no Postgres via API (limite de ~4,5MB de body no Vercel). Auto-save por `useEffect` a cada mudança de saídas/entradas/base; ao abrir uma empresa existente, o wizard restaura os dados e, se houver saídas salvas, cai direto no Passo 7 (Revisão), com todos os passos anteriores navegáveis para edição. Excluir a empresa também limpa o IndexedDB. Limitação assumida (comunicada nos comentários): os dados só existem no navegador em que o estudo foi feito; premissas/legislação/nome do projeto continuam no banco (`parametrosExtra`).

**Nome do projeto**: campo novo na Revisão, salvo em `parametrosExtra.nomeProjeto` (debounce de 800ms) e usado como nome do arquivo Excel (`<nome>.xlsx`; versão do cliente = `<nome> (Cliente).xlsx`). Em branco, cai no padrão `Reforma Tributária - <razão social>`. O card da listagem perdeu o bloco "Faturamento anual" (pedido do usuário) e os botões antigos (Iniciar Simulação/Visualizar/Editar, que apontavam pro fluxo v1) — agora mostra o nome do projeto e um único botão "Abrir projeto" (`?edit=true`).

Validação: `tsc --noEmit` limpo, páginas compilam no dev server, roundtrip IndexedDB (put/get/delete com ArrayBuffer e objetos aninhados) testado no navegador real.

## Logo em todas as abas + polish visual (task #86)

**Logo**: Passo 1 ganhou o bloco "A empresa possui logo?" (PNG/JPG até 1MB → data URL em `parametrosExtra.logoDataUrl`). Na geração, `adicionarLogoNasAbas()` (gerar-excel-reforma.ts) insere a imagem em TODAS as abas — a do cliente ou, sem ela, a padrão do TaxHub (`/icons/taxhub_logo_principal_claro_transparente.png`, buscada via fetch no navegador). Dimensões lidas direto dos bytes (IHDR do PNG / SOF do JPEG — sem depender de `Image()`/DOM, funciona em script Node), altura alvo 50px com teto de 150px de largura. Âncora por aba (`ANCORA_LOGO`): A1 nas abas largas (anos/Entradas/Quadro/Análise) e à direita do conteúdo nas abas com título/filtros no topo-esquerdo (Premissas M1, Legislações D1, Valor Total J1, Base IBS-CBS Q1). **Modo cliente**: a logo é uma mídia ÚNICA compartilhada pelos drawings de todas as abas — `transformarParaCliente` agora trata mídias das abas removidas como candidatas e só apaga as que nenhum drawing remanescente referencia (antes apagaria a logo junto e quebraria as abas mantidas).

**Entradas - EFD ICMS IPI**: tabela de alíquotas AG1:AO4 (rótulos + anos + %) com fonte BRANCA — os valores continuam lá (as fórmulas de crédito apontam pra eles), mas invisíveis. Colunas R..W (Vlr Documento..Vlr Outras DA) com formato contábil R$ no estilo da coluna (linhas E subtotais da linha 6 herdam) e largura 18.

**Larguras**: Quadro Comparativo colunas de ano 14→17 (linha 17 VALOR TOTAL virava #####), Valor Total NF-e colunas B..H 22→28 (rótulo "BASE DE CÁLCULO DO ICMS SUBST."), abas de ano colunas de valor 14→19 (subtotais contábeis na casa dos milhões).

Validação com dados reais (27.577 saídas / 4.833 entradas) + Excel real via COM: interno 14 abas em 52s, cliente 12 abas em 20s, AG1 com fonte 16777215 (branco), R6/R8 em contábil R$ renderizando sem #####, D17 do Quadro e B11 do Valor Total exibindo o valor completo, 1 Shape (logo) por aba nos dois arquivos, `xl/media/image1.png` (logo) preservada no cliente com 12 drawings.

## Card redesenhado + exportação rápida na listagem (task #87)

`EmpresaCard` reconstruído (visual profissional): filete superior em gradiente azul→esmeralda, avatar com a logo da empresa (ou ícone), chips de CNPJ/UF/regime, bloco do projeto com o nome e um indicador assíncrono de dados locais ("Estudo salvo neste navegador" via IndexedDB / "Sem dados de EFD neste navegador"), lixeira que aparece no hover, e duas ações: **Exportar Excel** (abre o dialog) e **Abrir projeto**. O tipo `EmpresaReformaResumo` (exportado do card) descreve a empresa como vem da listagem, incluindo `parametrosExtra` completo.

`ExportarProjetoDialog` (novo): aberto direto do card, carrega o estudo do IndexedDB e mostra resumo (itens de saída/entrada, fornecedores classificados, última atualização) + dois botões de geração — **Excel completo** e **Excel do cliente** — com barra de progresso, usando o MESMO `gerarExcelReforma` do wizard (premissas/legislação/nome do projeto/logo vêm do `parametrosExtra`; base NCM padrão via API ou a customizada salva). Sem dados locais (outro navegador), mostra estado vazio orientando a abrir o projeto.

Validação: tsc limpo; página de preview temporária (rota pública, deletada depois) confirmou no navegador real o render dos dois estados do card e o dialog completo (stats corretos com IndexedDB semeado, botões, link Editar projeto). A geração em si reusa o pipeline já validado com dados reais nas tasks #84/#86.
