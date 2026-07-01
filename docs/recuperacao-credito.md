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
| `.pdf` (Declaração/Extrato PGDAS) | Simples Nacional | Extrai e persiste por projeto |
| `.txt` (EFD ICMS/IPI, começa com `\|0000\|`) | ICMS/IPI | Extrai e persiste por projeto |
| `.xlsx` / `.xls` / `.csv` | Análise genérica por IA | Stub — ainda não implementado (`/api/recuperacao-credito/route.ts`) |

PDFs e `.txt` exigem **Cliente + Projeto** selecionados (ver seção 2); os arquivos genéricos
(`.xlsx/.csv`) não exigem, pois essa parte ainda não persiste nada.

## 2. Modelo de dados: Cliente → Projeto → Declarações

```
ClienteRecuperacaoCredito (CNPJ + Razão Social, por usuário)
  └── ProjetoRecuperacaoCredito (nome livre, ex.: "Reverificação 2026")
        ├── DeclaracaoPgdas[]          (1 registro por mês × tipo: DECLARACAO | EXTRATO)
        └── DeclaracaoEfdIcmsIpi[]     (1 registro por mês)
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
  servidor** (`src/app/api/recuperacao-credito/pgdas/upload/route.ts`).
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

## 5. Padrão visual do Excel (obrigatório em qualquer novo export deste módulo)

Todo Excel gerado por este módulo segue o **mesmo "brand"**, estabelecido primeiro no export do
Simples Nacional (`src/lib/pgdas/export-pgdas-excel.ts`) e replicado no de ICMS/IPI
(`src/lib/efd-icms-excel.ts`):

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
  seguintes para não colidir o nome do arquivo (ex.: `"... - ICMS e IPI - ..."`).
- **Linhas de detalhe recolhíveis**: `row.outlineLevel = 1` em toda linha que não é cabeçalho de
  seção (`bold` sem `destaque`), reproduzindo o agrupamento colapsável visto nos exemplos de
  referência do usuário.
- O helper de estilo `sc()` (font/fill/alignment/numFmt num só lugar) é **duplicado em cada
  arquivo de export**, de propósito — evita que um ajuste num módulo quebre por acidente o
  visual de outro já em produção. Se um dia isso virar fardo, extrair pra
  `src/lib/excel-style-utils.ts` compartilhado é a extração natural, mas não fazer isso "de
  graça" numa mudança não relacionada.

## 6. Regra geral: IA vs. determinístico

- **Formato fixo/oficial do governo** (PGDAS, EFD ICMS/IPI) → **parser determinístico
  (regex/split)**, nunca IA. Motivo: previsível, grátis, instantâneo, zero risco de alucinação
  num valor financeiro.
- **Texto livre/interpretativo** (ex.: descrição de serviço em NFS-e pra decidir equiparação
  hospitalar, módulo irmão em `/dashboard/automacoes/equiparacao-hospitalar`) → **IA**, porque a
  variação de redação entre emissores torna um parser de regras simples insuficiente.

Antes de escolher a abordagem para um novo tipo de arquivo/análise, perguntar: "o formato é
ditado por um layout oficial fixo, ou é redação livre de terceiros?" — a resposta define IA vs.
determinístico.

## 7. Checklist para adicionar um novo tipo de declaração ao módulo

1. Confirmar o formato de origem (fixo → parser; livre → IA) e o(s) registro(s)/campo(s) exatos
   validando contra um arquivo real do usuário — nunca supor o layout de um campo sem
   confirmação (como aconteceu com o `E520` do IPI, documentado como gap acima).
2. Novo model Prisma `DeclaracaoXxx`, sempre com `projetoId` (nunca `clienteId` direto) e
   `@@unique([projetoId, competencia, ...])`.
3. Parser em `src/lib/xxx-parser.ts` (server-side se for persistir; só marcar `"use client"` se
   genuinamente depender de API de browser, como `DOMParser`).
4. Rotas `src/app/api/recuperacao-credito/xxx/upload/route.ts` (POST, valida CNPJ, erro
   por-arquivo não derruba o lote) e `.../xxx/route.ts` (GET por `projetoId`, DELETE por `id`).
5. Exportador Excel em `src/lib/xxx-excel.ts` seguindo a seção 5 deste documento à risca.
6. UI: estender a detecção automática de tipo de arquivo em
   `src/app/dashboard/recuperacao-credito/page.tsx` (`isXxx()` + branch em `handleAnalisar`) e
   adicionar uma nova seção de tabela "meses importados" com seu próprio botão "Baixar Excel" —
   nunca reaproveitar a tabela de outro tipo de declaração.
7. Validar o pipeline inteiro (parse → grava no banco → lê de volta → gera Excel) contra dados
   reais do usuário antes de considerar pronto, com um cliente/projeto **descartável** (criar,
   testar, apagar) pra não sujar dados reais durante o teste.
8. Atualizar este documento.
