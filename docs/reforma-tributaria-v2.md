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

## Fase 8 — registrada para sessão futura (não iniciada)

**Reescrever o gerador de Excel para streaming**, resolvendo o achado de escala da Fase 7 (~8GB/132s para 139.769 linhas de fórmula). Não é "polish rápido" — é uma reescrita real:

- Trocar `ExcelJS.Workbook` (em memória) por `ExcelJS.stream.xlsx.WorkbookWriter` em todos os módulos de `src/lib/reforma-excel/` (`anos.ts`, `entradas-efd.ts`, `quadro-comparativo.ts`, `valor-total-nfe.ts`, `base-ibs-cbs.ts`, `analise-fornecedores.ts`, `premissas-legislacoes.ts`).
- Streaming exige escrita estritamente sequencial por linha (`row.commit()`), sem acesso aleatório a células já commitadas — hoje todo mundo usa `ws.getCell()` livremente. Ponto de atenção específico: a tabela de fornecedores em `entradas-efd.ts` (colunas AZ/BA) é escrita antes do loop principal de dados, numa faixa de linhas que precisa continuar compatível com a ordem sequencial.
- Depois da reescrita, **repetir a bateria de validação com dados reais** já usada nas Fases 3-6 (parsing dos 10 meses da Art Farma, geração completa, checagem de 0 erros de fórmula) — é fácil essa mudança introduzir uma regressão sutil (célula escrita fora de ordem).
- Pode aproveitar o mesmo passe pra resolver os cosméticos menores pendentes: `numFmt` nas colunas percentuais brutas das abas de ano (hoje sem formatação, só valor decimal).
- Estimativa: comparável em tamanho a uma das fases anteriores (ex. Fase 3 ou Fase 5) — não é questão de minutos, é uma sessão de trabalho focado.
- Task registrada: `TaskList`, "Reforma v2 — Fase 8".
