# Recuperação de Crédito — Cérebro do Módulo

Este documento descreve como o módulo **Recuperação de Crédito** (`/dashboard/recuperacao-credito`)
funciona hoje, e as regras/convenções que devem ser seguidas ao estender ou corrigir qualquer
parte dele. Atualize este arquivo sempre que uma regra de negócio, mapeamento de campo ou
convenção visual mudar — ele é a fonte de verdade, não o código de um módulo específico.

## 1. Visão geral

A página tem **uma única zona de upload** ("Arquivos para Análise"). O usuário arrasta
qualquer combinação de arquivos e o sistema detecta sozinho o que fazer com cada um pela
extensão/conteúdo:

| Tipo de arquivo | Rota | O que faz |
|---|---|---|
| `.pdf` (Declaração/Extrato PGDAS ou Comprovante de Arrecadação de DARF) | Simples Nacional ou Comprovante de Pagamentos | Um único endpoint (`/api/recuperacao-credito/pdf/upload`) detecta o sub-tipo pelo conteúdo e extrai/persiste no model certo |
| `.txt` (EFD ICMS/IPI ou EFD Contribuições, começa com `\|0000\|`) | ICMS/IPI ou PIS/COFINS | Um único endpoint (`/api/recuperacao-credito/efd/upload`) detecta o sub-tipo pelo conteúdo (`detectarTipoEfd`) e extrai/persiste no model certo |
| `.xlsx` / `.xls` / `.csv` | Análise genérica por IA | Stub — ainda não implementado (`/api/recuperacao-credito/route.ts`) |

PDFs e `.txt` exigem **Cliente + Projeto** selecionados (ver seção 2); os arquivos genéricos
(`.xlsx/.csv`) não exigem, pois essa parte ainda não persiste nada.

## 2. Modelo de dados: Cliente → Projeto → Declarações

```
ClienteRecuperacaoCredito (CNPJ + Razão Social, por usuário)
  └── ProjetoRecuperacaoCredito (nome livre, ex.: "Reverificação 2026")
        ├── DeclaracaoPgdas[]                    (1 registro por mês × tipo: DECLARACAO | EXTRATO)
        ├── DeclaracaoEfdIcmsIpi[]               (1 registro por mês)
        ├── DeclaracaoEfdContribuicoes[]         (1 registro por mês — PIS/COFINS)
        └── DeclaracaoComprovantePagamento[]     (1 registro por DARF — ver seção 6, chave diferente)
```

**Por que "Projeto" existe**: um cliente pode ter mais de um diagnóstico/reverificação em
andamento ao mesmo tempo (ex.: dois períodos diferentes sendo revisados). Sem o Projeto como
camada intermediária, reimportar um mês para um novo diagnóstico sobrescreveria silenciosamente
os dados do diagnóstico anterior. A unicidade de cada declaração é sempre `[projetoId, ...]`,
nunca `[clienteId, ...]` diretamente.

**CRUD de Cliente/Projeto**: `/api/recuperacao-credito/clientes` e `/api/recuperacao-credito/projetos`
(GET lista, POST cria/upsert por CNPJ no caso do cliente). Projeto também tem `PATCH` (renomear)
e `DELETE` (cascade apaga as declarações) em `/api/recuperacao-credito/projetos/[id]`.

**Validação de CNPJ**: toda rota de upload confere que o CNPJ extraído do arquivo bate com o
CNPJ do cliente selecionado (comparando só dígitos, `somenteDigitos()`). Se não bater, o arquivo
é rejeitado com erro por-arquivo — não derruba o upload dos outros arquivos do lote.

## 3. Simples Nacional (PGDAS-D)

- **Parser**: `src/lib/pgdas/` — **regex determinístico, sem IA**. O PDF é gerado pelo próprio
  Programa Gerador do PGDAS-D (governo), formato fixo — IA seria mais lenta, tem custo e risco
  de alucinar um valor financeiro à toa. Extração via `unpdf` (`extractText`) roda **no
  servidor**, dentro do endpoint unificado de upload de PDF (ver seção 6,
  `src/app/api/recuperacao-credito/pdf/upload/route.ts`), que detecta se cada PDF é PGDAS ou
  Comprovante de Arrecadação antes de decidir qual parser chamar.
- **Dois tipos de documento por mês**: "Declaração" (valor devido) e "Extrato" (valor
  efetivamente pago — DAS gerado, juros, multa). Ao mesclar os dois (`agregarDeclaracoes` em
  `export-pgdas-excel.ts`), o Extrato prevalece nos campos em comum por ser o documento mais
  autoritativo sobre o que foi de fato apurado.
- **Gaps conhecidos/assunções** (documentados no próprio código, ver comentários em
  `export-pgdas-excel.ts`):
  - Linha `$ DAS - Documento de Arrecadação do Simples Nacional`: espelha a linha `Vlr Total
    Pago` — suposição, não confirmada nos PDFs de origem.
  - Linha `$ Valor eCAC - Pgtos DARF(DAS)`: **decisão deliberada de não implementar** — é a
    comprovação de pagamento via portal eCAC, um 3º tipo de documento fora do escopo atual.
    Fica sempre 0.
  - Seções 5 e 6.2 do Extrato (quando HÁ pagamento reconhecido, não "não identificado"): o
    formato real ainda não foi observado numa amostra — o parser não quebra (cai no fallback
    `reconhecido:false`), mas precisa ser validado contra um PDF real com pagamento antes de
    confiar 100% nessas linhas.

## 4. ICMS/IPI (EFD — SPED Fiscal)

- **Parser**: `src/lib/efd-icms-parser.ts` — texto pipe-delimited, parsing direto por split,
  **sem IA** (mesmo raciocínio do PGDAS: formato fixo do governo). Roda **no servidor**
  (`src/app/api/recuperacao-credito/efd/upload/route.ts`), um arquivo = uma competência (mês).
- **Registros usados**: `0000` (cabeçalho: CNPJ, razão social, UF, competência), `C190`
  (valor operacional/base de cálculo/ICMS/IPI, **agregado por combinação única de CFOP + CST +
  Alíquota** — várias notas com a mesma combinação são somadas em um só registro), `E110`
  (apuração do ICMS: débitos, créditos, saldo apurado, ICMS a recolher, saldo a transportar).
- **Saída vs. Entrada**: determinado pelo **primeiro dígito do CFOP** (`1`, `2`, `3` = entrada;
  `5`, `6`, `7` = saída) — `isSaida()` em `efd-icms-parser.ts`. Não depende do registro `C100`
  pai (`IND_OPER`), simplificando o parser (cada linha `C190` é processada isoladamente).
- **CST vs. CSOSN**: o campo `CST_ICMS` do `C190` pode conter um CST de regime normal (1 dígito
  de origem + 2 dígitos de CST, ex. `000`) OU um CSOSN de Simples Nacional (código de 3 dígitos
  completo, ex. `102`, `400`, `500`) — isso reflete o regime de quem **emitiu** a nota, não o do
  declarante do EFD. Como alguns códigos existem nas duas tabelas (`400`, `500`), a função
  `labelCst()` prioriza a leitura como CSOSN. Essa ambiguidade é uma limitação real do dado de
  origem — o exemplo de referência do usuário às vezes mostrava as duas interpretações como
  linhas separadas; **decisão deliberada**: mostrar só uma interpretação por código, não
  duplicar.
- **CFOP**: `CFOP_LABELS` em `efd-icms-parser.ts` é uma lista **não-exaustiva** dos CFOPs de
  mercadoria mais comuns, com descrição oficial (não abreviada, diferente do BI de origem do
  usuário). Código fora da lista aparece só como `CFOP <código>`, sem inventar descrição.
- **IPI — gap conhecido**: o valor de IPI por CFOP (`VL_IPI` do `C190`) **está implementado e
  validado**. A apuração de IPI a nível de saldo devedor/credor (registro `E520`) **não está
  implementada** — o layout exato de campos do `E520` não pôde ser confirmado contra um arquivo
  real com IPI diferente de zero (o arquivo de amostra disponível tinha todos os valores de IPI
  zerados). Antes de implementar essa parte, validar o `E520` campo a campo contra um cliente
  industrial real com IPI não-zero, do mesmo jeito que o `E110` do ICMS foi validado.

## 5. PIS/COFINS (EFD Contribuições)

- **Parser**: `src/lib/efd-contribuicoes-parser.ts` — mesmo raciocínio determinístico do ICMS/IPI
  (texto pipe-delimited, formato fixo do governo, **sem IA**). Roda **no servidor**, dentro do
  mesmo endpoint unificado de upload de EFD (`src/app/api/recuperacao-credito/efd/upload/route.ts`).
- **Distinção EFD ICMS/IPI vs. EFD Contribuições**: os dois leiautes são texto pipe-delimited
  começando igualmente com `\|0000\|`, então a detecção (`detectarTipoEfd()` em
  `efd-contribuicoes-parser.ts`) usa registros exclusivos de cada um: EFD Contribuições sempre
  tem bloco `M` (`\|M200\|` ou `\|M600\|` — apuração de PIS/COFINS); EFD ICMS/IPI sempre tem
  bloco `E` (`\|E100\|` ou `\|E110\|` — apuração de ICMS/IPI). Um arquivo sem nenhum desses dois
  marcadores é rejeitado com erro por-arquivo.
- **Atenção — o registro `0000` tem índices de campo DIFERENTES do EFD ICMS/IPI**: apesar do
  mesmo nome de registro, `NOME`/`CNPJ`/`UF` estão em `campos[8]/[9]/[10]` no EFD Contribuições
  (contra outros índices no EFD ICMS/IPI) — os dois parsers têm sua própria leitura do `0000`,
  não compartilhar essa lógica entre eles sem revalidar campo a campo.
- **Registros usados**: `0000` (cabeçalho), `C175` (mercadorias — receita com incidência de
  PIS/COFINS, **agregada separadamente para PIS e para COFINS** por combinação única de CFOP +
  CST + Alíquota — cada contribuição tem seu próprio CST e sua própria alíquota na mesma linha
  `C175`), `A170` (serviços/NFS-e — mesmo tratamento, mas **sem CFOP**: agrega com CFOP vazio,
  que o Excel rotula como "A100/A170 - Nota Fiscal de Serviço (sem CFOP)"), `M210`/`M200`
  (apuração do PIS) e o espelho `M610`/`M600` para a COFINS.
- **Regimes cumulativo E não cumulativo, ao mesmo tempo**: o `M200`/`M600` traz os dois regimes
  no mesmo registro (campos 2-8 = não cumulativo; campos 9-12 = cumulativo; campo 13 = total a
  recolher). O parser lê os dois e o Excel mostra o débito total + o detalhe por regime
  ("DÉBITO POR REGIME DE APURAÇÃO"), além das deduções (`( - ) Créditos Descontados` — campos
  3+4 — e `( - ) Outras Deduções e Retenções` — campos 6+7+10+11, ex.: retido na fonte/F600).
  Validado contra arquivos reais dos dois regimes: não cumulativo (Grasel/Azzo, Lucro Real com
  créditos descontados) e cumulativo (Core/Medfisio, Lucro Presumido de serviços com retenções).
  Registros gravados no banco antes desses campos existirem não os têm no JSON — o Excel usa
  fallback (`valorContribuicaoApurada` antigo vira o valor não cumulativo, cumulativo vira 0).
- **Gap conhecido — detalhe de receitas via `C170` não implementado**: alguns EFDs de mercadoria
  (ex.: Azzo Distribuidora) detalham receitas por item no `C170` (filho do `C100`), sem `C175` —
  nesses arquivos a apuração (M) sai completa e correta, mas as seções "por CFOP/CST/alíquota"
  ficam vazias. Implementar exige decidir como separar saídas de entradas (o `C170` mistura
  compras com crédito e vendas, via CST) e validar contra um exemplo de referência do usuário —
  não fazer por suposição (seção 10, regra 1).
- **CST-PIS/COFINS**: tabela própria (`CST_PIS_COFINS_LABELS` em `efd-contribuicoes-parser.ts`,
  códigos `01` a `99`), **não** é a mesma tabela de CST/CSOSN do ICMS — não reaproveitar
  `labelCst()` do módulo de ICMS/IPI aqui, usar `labelCstPisCofins()`.
- **Gap conhecido — créditos não implementados**: os registros de crédito (`M100`/`M105` para
  PIS, `M500`/`M505` para COFINS, com os ~18 códigos de natureza de crédito) **não estão
  implementados**. O arquivo de amostra disponível não tinha nenhum crédito no período (registros
  ausentes no arquivo), então não foi possível validar o layout de campos com dados reais. Antes
  de implementar, validar campo a campo contra um EFD Contribuições real com créditos não-zeros,
  do mesmo jeito que o `M200`/`M210` foi validado (ver seção 10, regra 1).
- **Excel — uma aba "PIS" e uma aba "COFINS" no mesmo arquivo**: diferente do PGDAS e do ICMS/IPI
  (que cada um gera seu próprio arquivo), o PIS e a COFINS **sempre saem juntos, num único
  arquivo com duas abas** (`montarAbasPisCofins()` em `src/lib/efd-contribuicoes-excel.ts`, que
  chama duas vezes uma função interna `montarAbaContribuicao()` parametrizada por tributo). A
  estrutura de linhas de cada aba espelha a do ICMS (resumo, por CFOP, por CST, base de cálculo,
  débito em destaque cinza, por alíquota, valor a recolher em destaque cinza, Carga Tributária em
  azul) — só troca o rótulo do tributo e a fonte dos números.
- **Orquestrador multi-aba**: `src/lib/recuperacao-credito-excel.ts` exporta
  `exportarDeclaracaoFiscalExcel(nomeCliente, { icms?, pisCofins? })`, que monta **um único**
  workbook incluindo a aba de ICMS/IPI (se houver dados) e as abas de PIS/COFINS (se houver
  dados) — é o que a UI chama quando o usuário clica em "Baixar Excel" na seção de declarações
  fiscais do projeto, pra nunca gerar dois arquivos separados quando o mesmo projeto tem os dois
  tipos de EFD importados. Cada tipo de declaração expõe uma função `montarAbaXxx(wb, ...)` que
  só adiciona sua(s) aba(s) a um workbook já existente (sem fazer download) — o export "standalone"
  de cada módulo (`exportarEfdIcmsExcel`, `exportarEfdContribuicoesExcel`) é uma casca fina em
  volta dessa mesma função, pra quando só um tipo de EFD foi importado.

## 6. Comprovante de Pagamentos (Comprovante de Arrecadação de DARF)

- **Parser**: `src/lib/comprovante-pagamento-parser.ts` — texto extraído via `unpdf`, parsing
  **determinístico por regex, sem IA** (mesmo raciocínio dos outros: formato fixo, emitido pelo
  site da Receita Federal). Validado campo a campo contra um PDF real de 51 páginas/50 DARFs e
  cruzado com uma planilha de referência do usuário que já continha esses mesmos 50 DARFs
  (nenhuma divergência de valor fora do gap documentado abaixo).
- **Diferença estrutural em relação a PGDAS/EFD — não é "1 arquivo = 1 competência"**: um único
  PDF de Comprovante de Arrecadação contém **dezenas de DARFs**, de competências e anos
  diferentes (o arquivo de validação tinha DARFs de 2022 a 2025 num só PDF). Por isso:
  - `parseComprovantePagamento` devolve um **array de DARFs** por arquivo, não um único registro.
  - A chave de deduplicação em `DeclaracaoComprovantePagamento` é `[projetoId, numeroDocumento]`
    (o Número do Documento do próprio DARF, uma chave natural e estável), **não**
    `[projetoId, competencia]` como nos outros models — reenviar o mesmo PDF (ou um PDF novo que
    contenha um DARF já importado) atualiza aquele DARF em vez de duplicá-lo.
- **Layout por DARF** (cada página do PDF começa com o rótulo "Data de Vencimento"): cabeçalho
  (CNPJ, Razão Social, Período de Apuração, Data de Vencimento, Número do Documento), 1+ linhas de
  código de receita (código de 4 dígitos, descrição, valores de Principal/Multa/Juros/Total nessa
  ordem exata — **não** é a ordem sugerida pela concatenação dos rótulos no texto extraído, foi
  confirmada cruzando contra a planilha de referência) e um rodapé (Data de Arrecadação, Banco,
  Valor Restituído).
- **DARF cujo bloco de códigos não cabe numa página**: as páginas seguintes repetem o mesmo
  cabeçalho (mesmo Número do Documento) e continuam a lista de códigos; o parser agrupa por
  Número do Documento ao longo de todas as páginas do PDF antes de persistir — testado e validado
  com um DARF real de 2 páginas.
- **Dois layouts históricos do comprovante**: comprovantes recentes identificam o pagamento por um
  "Número do Documento" de **17 dígitos**; comprovantes antigos (validado com DARFs de 2021 do
  mesmo cliente) usam um "Número do Pagamento" de **10 dígitos**, e o rodapé bancário vem sem o
  código do banco e com só um número após o nome (em vez de agência + estabelecimento). O parser
  aceita os dois (`\d{8,17}` no header; remoção de 1–2 números finais no banco) — validado com a
  soma dos 50 DARFs antigos batendo exatamente com as linhas "Totais" impressas no próprio PDF.
- **Tributo por código**: `CODIGO_TRIBUTO` em `comprovante-pagamento-parser.ts` é um mapa fixo e
  pequeno (`2089→IRPJ`, `2372→CSLL`, `8109→PIS`, `2172→COFINS`), validado como **completo e exato**
  contra a planilha de referência do usuário — todo código fora desses 4 (multas, TJLP de
  parcelamento, INSS/CP, etc.) fica sem rótulo de tributo, replicando fielmente o que a
  referência mostrava.
- **GAP CONHECIDO — "Descrição Principal" não é a nomenclatura oficial completa da RFB**: o Excel
  usa aqui a descrição impressa junto ao próprio código no PDF (menos abreviada/formatada que a
  official), não uma tabela externa de Códigos de Receita da RFB — o exemplo de referência do
  usuário mostrava descrições diferentes (mais abreviadas) para os mesmos códigos, que não vêm do
  PDF; parecem ter sido preenchidas manualmente pela equipe a partir de uma tabela própria. Não
  reproduzido aqui pra não inventar dado que não está na fonte.
- **GAP CONHECIDO — referência (sufixo "-NN" do Código) só aparece quando o PDF a imprime**:
  algumas linhas de código (ex.: `2203`, "Multa Omissão/Incorreção/Falta/Atraso na Entrega...")
  não trazem uma referência de 2 dígitos impressa no PDF; nesses casos o Código exportado fica só
  o de 4 dígitos, sem o sufixo. A planilha de referência do usuário tinha esse código específico
  já enriquecido como `2203-03` **e duplicado em 2 linhas** com o mesmo valor — parece
  categorização manual da equipe (2 motivos legais pro mesmo valor cobrado), não algo extraível do
  PDF. O parser gera só 1 linha por ocorrência real no PDF, por ser mais fiel à fonte-única
  disponível.
- **Excel**: uma aba só, **"Comprovante de Pagamentos"**, uma linha por combinação (DARF, código
  de receita) — mesma granularidade da planilha de referência do usuário (`Relatório de
  Pagamentos.xlsx`). Estrutura de **Excel Table** (`ws.addTable`, `TableStyleMedium2`,
  `filterButton`), com uma linha de `SUBTOTAL` acima do cabeçalho para as 4 colunas monetárias
  finais — mesmo padrão já usado no export de Equiparação Hospitalar
  (`src/lib/equiparacao-hospitalar-excel.ts`), não o padrão de linhas/outline dos outros módulos
  deste doc (não faz sentido pra uma tabela "1 linha = 1 fato", sem hierarquia de seções).
- **Endpoint de upload compartilhado com PGDAS**: `src/app/api/recuperacao-credito/pdf/upload/route.ts`
  extrai o texto do PDF uma vez, detecta com `detectarComprovantePagamento()` (âncora: "consta nos
  sistemas da Receita Federal registro de arrecadação de DARF") se é Comprovante ou PGDAS, e
  despacha pro parser/model certo — mesmo padrão do endpoint unificado de EFD (seção 5).

## 7. Aba "Checklist" (presente em TODO Excel do módulo)

- **O quê**: `src/lib/checklist-excel.ts`, `montarAbaChecklist(wb, nomeCliente)` — adiciona uma
  aba **"Checklist"** em todo Excel gerado pela Recuperação de Crédito: Simples Nacional
  (`exportarPgdasExcel`), ICMS/IPI (`exportarEfdIcmsExcel`), PIS/COFINS
  (`exportarEfdContribuicoesExcel`) e no arquivo combinado (`exportarDeclaracaoFiscalExcel`) —
  sempre a **última** aba adicionada, chamada uma única vez por download (não por tipo de
  declaração).
- **Visual próprio**: diferente do resto do módulo (paleta azul clara `COR.azulClaro`/cinza
  `COR.cinzaClaro`), essa aba replica o visual de um checklist de diagnóstico usado manualmente
  pela equipe tributária (arquivo de referência do usuário) — paleta navy (`FF0E2841`) nos
  cabeçalhos e faixas de categoria, células "Situação" com fundo cinza claro. **Decisão
  deliberada**: reproduzir o visual de origem tal como está, só trocando a logo — não forçar essa
  aba a usar a paleta azul/cinza dos outros exports do módulo.
- **Estrutura**: colunas `id`, `Oportunidade` (descrição do tópico), `Situação` (D — reservada
  para 🌟/☠️), `Observações`, `Contingência` (descrição), `Situação` (G — reservada para 🌟/☠️),
  `Observações`. Os tópicos são agrupados em categorias (faixa navy clara, mesclada B:H) — ex.
  "SIMPLES NACIONAL", "PIS E COFINS INSUMOS/MERC. PARA REVENDA", "REVISÃO DE BASE DE CÁLCULO",
  "IPI", "IRPJ/CSLL", etc. Uma seção final "Extras (revisão manual)" lista itens que não são
  analisáveis a partir dos arquivos importados (exigem checagem em outro sistema/portal — ex.
  "Analisar Possibilidade de Transação") e por isso sempre mostram ☠️ fixo.
- **Dados estáticos, fixos no código**: os tópicos/categorias/textos de contingência em
  `CATEGORIAS` e `EXTRAS` (`checklist-excel.ts`) são os mesmos do arquivo de referência, sem
  nenhuma lógica de negócio por trás ainda — são uma lista de verificação fixa, igual pra todo
  cliente.
- **GAP CONHECIDO / TRABALHO FUTURO — colunas "Situação" (D e G) ficam em branco**: hoje essas
  colunas só têm a célula estilizada (fundo cinza, pronta pra receber um emoji), sem nenhum valor
  — a única exceção é o item "Bônus de 5% no CSLL" (categoria "Bônus de Adimplência"), que já vem
  pré-marcado com ☠️/"Sem oportunidade" no próprio arquivo de referência (regra de negócio fixa:
  não se aplica fora do Lucro Presumido). **O que falta implementar**: a plataforma vai analisar
  automaticamente os dados já importados do cliente (PGDAS, EFD ICMS/IPI, EFD Contribuições, e
  futuros tipos) e preencher sozinha, tópico a tópico: 🌟 na coluna D quando houver oportunidade
  real identificada para aquele cliente, ☠️ quando não houver; e o mesmo na coluna G para
  contingências. Isso exige, para cada tópico, uma regra própria de "o que checar nos dados
  importados" — não implementar isso "de graça" numa mudança não relacionada; ao construir essa
  análise automática no futuro, seguir a mesma disciplina de validação contra dados reais antes
  de confiar no resultado (seção 10, regra 1), já que aqui o risco não é um valor financeiro errado
  mas uma oportunidade real deixada de fora (falso ☠️) ou uma marcada à toa (falso 🌟).

## 8. Padrão visual do Excel (obrigatório em qualquer novo export deste módulo)

Todo Excel gerado por este módulo segue o **mesmo "brand"**, estabelecido primeiro no export do
Simples Nacional (`src/lib/pgdas/export-pgdas-excel.ts`) e replicado no de ICMS/IPI
(`src/lib/efd-icms-excel.ts`) e no de PIS/COFINS (`src/lib/efd-contribuicoes-excel.ts`). A aba de
Comprovante de Pagamentos (seção 6) e a de Checklist (seção 7) são as duas exceções conscientes —
usam sua própria paleta/estrutura de tabela, ver seções respectivas:

- **Logo**: TaxHub, versão `taxhub_logo_principal_claro_transparente.png` (texto escuro — a
  versão "escuro" tem o "TAX" quase invisível em fundo branco). Carregado via `fetch` +
  conversão pra base64 (não usar `Buffer` do Node, não existe no browser) e embutido com
  `wb.addImage({ base64: ... })`.
- **Fonte**: Calibri em toda a planilha.
- **Sem linhas de grade** (`showGridLines: false`) e **painéis congelados** (`xSplit`/`ySplit`
  cobrindo coluna(s) de rótulo + linhas de cabeçalho).
- **Coluna A**: margem estreita e vazia (largura ~3), só respiro visual — o conteúdo (rótulos)
  começa na coluna B.
- **Formato contábil BR** para valores monetários:
  `_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-` — símbolo à esquerda, número à
  direita, `-` para zero (não `R$ 0,00`).
- **Linha de destaque cinza** (`FFBFBFBF`, negrito) no valor "final" mais importante da seção
  (ex.: débito declarado do PGDAS, total a recolher do ICMS).
- **Linha "Carga Tributária"** sempre no final, destaque azul (`FFB4C6E7`), formato percentual —
  é sempre "o que se paga de imposto principal daquele tributo" dividido pela "receita/base do
  período":
  - Simples Nacional: `Vlr Débito Declarado PGDAS ÷ Receita Bruta do PA`
  - ICMS: `Total de ICMS a Recolher ÷ Valor Operacional (Saídas)`
- **Nome do arquivo**: `Diagnóstico Tributário - <contexto> - <Nome do Cliente>.xlsx` (sanitizado
  removendo só os caracteres inválidos em nome de arquivo, mantendo acentos/espaços). O
  `<contexto>` é omitido no Simples Nacional (é o "principal"/primeiro) e incluído nos módulos
  seguintes para não colidir o nome do arquivo (ex.: `"... - ICMS e IPI - ..."`). Quando o
  orquestrador (seção 5) combina ICMS/IPI e PIS/COFINS num único arquivo, o `<contexto>` vira a
  lista dos tipos presentes juntos, ex.: `"... - ICMS e IPI, PIS e COFINS - ..."`.
- **Linhas de detalhe recolhíveis**: `row.outlineLevel = 1` em toda linha que não é cabeçalho de
  seção (`bold` sem `destaque`), reproduzindo o agrupamento colapsável visto nos exemplos de
  referência do usuário.
- O helper de estilo `sc()` (font/fill/alignment/numFmt num só lugar) é **duplicado em cada
  arquivo de export**, de propósito — evita que um ajuste num módulo quebre por acidente o
  visual de outro já em produção. Se um dia isso virar fardo, extrair pra
  `src/lib/excel-style-utils.ts` compartilhado é a extração natural, mas não fazer isso "de
  graça" numa mudança não relacionada.

## 9. Regra geral: IA vs. determinístico

- **Formato fixo/oficial do governo** (PGDAS, EFD ICMS/IPI) → **parser determinístico
  (regex/split)**, nunca IA. Motivo: previsível, grátis, instantâneo, zero risco de alucinação
  num valor financeiro.
- **Texto livre/interpretativo** (ex.: descrição de serviço em NFS-e pra decidir equiparação
  hospitalar, módulo irmão em `/dashboard/automacoes/equiparacao-hospitalar`) → **IA**, porque a
  variação de redação entre emissores torna um parser de regras simples insuficiente.

Antes de escolher a abordagem para um novo tipo de arquivo/análise, perguntar: "o formato é
ditado por um layout oficial fixo, ou é redação livre de terceiros?" — a resposta define IA vs.
determinístico.

## 10. Checklist para adicionar um novo tipo de declaração ao módulo

1. Confirmar o formato de origem (fixo → parser; livre → IA) e o(s) registro(s)/campo(s) exatos
   validando contra um arquivo real do usuário — nunca supor o layout de um campo sem
   confirmação (como aconteceu com o `E520` do IPI e os créditos M100/M500 do PIS/COFINS,
   documentados como gaps acima).
2. Novo model Prisma `DeclaracaoXxx`, sempre com `projetoId` (nunca `clienteId` direto) e
   `@@unique([projetoId, competencia, ...])`.
3. Parser em `src/lib/xxx-parser.ts` (server-side se for persistir; só marcar `"use client"` se
   genuinamente depender de API de browser, como `DOMParser`). Se o novo tipo compartilha
   extensão de arquivo com um tipo já existente (caso do `.txt` de EFD), adicionar/expandir uma
   função `detectarTipoXxx()` baseada em registro(s) exclusivo(s) do leiaute, em vez de assumir
   pela extensão.
4. Rotas `src/app/api/recuperacao-credito/xxx/upload/route.ts` (POST, valida CNPJ, erro
   por-arquivo não derruba o lote) e `.../xxx/route.ts` (GET por `projetoId`, DELETE por `id`).
   Se o upload compartilha endpoint com um tipo irmão (caso do EFD), o dispatch por tipo detectado
   fica dentro do mesmo `POST`, nunca em rotas separadas por extensão.
5. Exportador Excel em `src/lib/xxx-excel.ts` seguindo a seção 8 deste documento à risca (e
   incluir a chamada a `montarAbaChecklist` — seção 7 — no wrapper standalone, se ainda não
   estiver coberto pelo orquestrador). Separar
   a montagem da(s) aba(s) (`montarAbaXxx(wb, ...)`, sem download) do wrapper "standalone" que
   cria o workbook e baixa (`exportarXxxExcel(...)`) — isso permite compor com outros tipos de
   declaração do mesmo projeto num único arquivo, como faz `recuperacao-credito-excel.ts` (seção
   5) para ICMS/IPI + PIS/COFINS. Só criar um exportador "solo" de verdade (sem essa separação) se
   o novo tipo nunca precisar sair combinado com outro no mesmo arquivo.
6. UI: estender a detecção automática de tipo de arquivo em
   `src/app/dashboard/recuperacao-credito/page.tsx` e adicionar uma nova seção de tabela "meses
   importados" própria (nunca reaproveitar a tabela de outro tipo de declaração). O botão "Baixar
   Excel", porém, deve ser compartilhado entre os tipos que saem combinados no mesmo arquivo (ver
   item 5) — não duplicar o botão por tipo nesse caso.
7. Validar o pipeline inteiro (parse → grava no banco → lê de volta → gera Excel) contra dados
   reais do usuário antes de considerar pronto, com um cliente/projeto **descartável** (criar,
   testar, apagar) pra não sujar dados reais durante o teste.
8. Atualizar este documento.
