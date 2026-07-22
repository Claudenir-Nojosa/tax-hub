# Automação — Antecipação ICMS-ST (Ceará)

Ferramenta em `/dashboard/automacoes/antecipacao-icms-st`: importa EFD ICMS/IPI e calcula, item a
item, a antecipação parcial de ICMS/FECOP devida sobre as entradas — regra específica do Ceará.

## Origem

Nasceu como um desdobramento da aba "Entradas" da Recuperação de Crédito (ver
`docs/recuperacao-credito.md` seção 4): a planilha de referência de um cliente real (GIGI
Tecidos) tinha colunas de "oportunidade de crédito ICMS-ST" alimentadas por uma tabela manual
("De x para") pesquisada pela equipe, específica daquele cliente — não generalizável, então foi
deixada de fora da aba "Entradas". O usuário forneceu depois a regra **real e genérica** por trás
daquele cálculo, permitindo isolar como automação própria.

## Regra (confirmada com o usuário nesta sessão, não extraída de leitura direta da legislação)

Base: Instrução Normativa CE n° 17/2013 (antecipação parcial do ICMS/FECOP do Ceará) + critério
de "origem estrangeira" da Resolução do Senado Federal n° 13/2012.

**Alíquota base**, pela "situação" do CFOP da entrada:
| Situação | CFOP | Até 31/12/2023 | A partir de 01/01/2024 |
|---|---|---|---|
| Dentro do estado | `1xxx` | 3% | 3,33% |
| Importação direta do exterior | `3xxx` | 3% | 3,33% |
| Fora do estado (interestadual) | `2xxx` | 8% | 8,90% |

Corte de data pela **Data de Entrada/Saída** (`DT_E_S` do registro `C100`).

**Adicional regional** — só quando a situação é **fora do estado** (`2xxx`) **e** a mercadoria é
de origem estrangeira:
- **+3%** — fornecedor do Sul (PR/SC/RS) ou Sudeste (SP/RJ/MG), **exceto ES**.
- **+8%** — fornecedor do Norte, Nordeste, Centro-Oeste, **ou ES**.

O adicional **não se aplica** a compras dentro do estado nem a importação direta (decisão
confirmada com o usuário — o adicional só faz sentido pra mercadoria que atravessou fronteira
estadual).

**Origem estrangeira**: 1º dígito do `CST_ICMS` ∈ {1, 2, 3, 8} — só funciona pra fornecedor do
regime normal (CST = origem + tributação, ex. `"200"`). **Limitação conhecida e decisão
deliberada**: fornecedor optante do Simples Nacional usa CSOSN (`101/102/103/201/202/203/300/
400/500/900`), uma tabela sem dígito de origem — não dá pra saber se a mercadoria é importada só
por esse campo. Esses casos são tratados como **origem nacional** (sem adicional), confirmado com
o usuário.

**Base de cálculo**: `Vlr Item − Vlr Desconto Item` (mesmo campo que a aba "Entradas - EFD ICMS
IPI" da Reforma Tributária já usa para o crédito de IBS/CBS — decisão confirmada com o usuário).

**Escopo do relatório**: só calcula o valor devido por essa regra, item a item + totais. **Não**
cruza com nenhum pagamento/GNRE já feito — o EFD ICMS/IPI sozinho não traz essa informação
(decisão confirmada com o usuário).

## Implementação

- **Cálculo puro**: `src/lib/icms-st-antecipacao-ce.ts` — `REGIAO_UF`, `origemEstrangeira`,
  `classificarSituacao`, `parseDataBr`, `calcularAntecipacaoItem`. Sem I/O, fácil de testar
  isoladamente.
- **Fonte dos dados**: reaproveita `parseEntradasEfdIcmsIpi()`
  (`src/lib/efd-icms-ipi-entradas-parser.ts`, já usado pela Reforma Tributária e pela aba
  "Entradas" da Recuperação de Crédito) — os campos `cfop`, `cstIcms`, `ufFornecedor`,
  `dataEntradaSaida`, `vlrItem`, `vlrDescontoItem` já vêm prontos dali.
- **Ferramenta leve, sem persistência**: diferente da Recuperação de Crédito (Cliente → Projeto →
  Declarações via Prisma), esta automação segue o padrão client-side de `/dashboard/de-para` e
  `/dashboard/automacoes/equiparacao-hospitalar` — upload → parse no navegador → mostra resultado
  → baixa Excel. Sem model novo, sem rota de API nova.
- **Travada no Ceará**: a página confere `UF Própria` (do registro `0000` de cada EFD, via
  `ufPropria` de `LinhaEntradaEfd`) e ignora com aviso qualquer arquivo que não seja do CE, em vez
  de aplicar uma regra que hoje só se conhece pro Ceará a outro estado.
- **Excel**: `src/lib/icms-st-antecipacao-excel.ts`, aba "Antecipação ICMS-ST" — 1 linha por item,
  `ws.addTable` com `SUBTOTAL` em Base de Cálculo e Valor Antecipação (mesmo padrão de
  `comprovante-pagamento-excel.ts` e da aba "Entradas" da Recuperação de Crédito).

## Validação

Testado (via `tsx`, fora do navegador) contra os 3 EFDs ICMS/IPI reais da GIGI Tecidos (CE,
competências 2025-11, 2025-12 e 2026-03): 1.681 itens processados, 0 não-classificáveis (todo
CFOP de entrada do EFD é `1xxx`/`2xxx`/`3xxx`). Confirmado nos dados reais:
- Situações `dentro_estado` e `fora_estado` ocorrendo (nenhum CFOP `3xxx` na amostra).
- Adicional +3% (fornecedor de SC, região Sul) e +8% (regiões Norte/Nordeste/Centro-Oeste/ES)
  ocorrendo corretamente.
- Itens `fora_estado` sem adicional (origem nacional ou fornecedor do Simples) ocorrendo.
- Amostra conferida manualmente: CFOP `2403`, CST `260` (origem 2 = estrangeira adquirida no
  mercado interno), fornecedor de SC, entrada em 13/03/2026 → alíquota base 8,90% + adicional 3%
  = 11,90% sobre base R$ 4.974,00 = **R$ 591,91** (bate com o cálculo manual).
- **GAP DE VALIDAÇÃO**: os 3 arquivos disponíveis são todos de 2025-2026 (pós 01/01/2024) — a
  faixa de alíquota antiga (3%/8%, até 31/12/2023) não pôde ser conferida contra dado real, só a
  lógica de corte de data (trivial, um único `if` sobre uma constante). Confirmar com um EFD
  real de 2023 se algum dia aparecer.

## Próximos passos possíveis (não implementados)

- Cruzar o valor calculado com o que já foi de fato recolhido (GNRE/DAE), se e quando existir uma
  fonte de dados pra isso.
- Estender pra outros estados, se algum dia o usuário trouxer a regra equivalente — hoje é
  deliberadamente travado no Ceará (ver decisão acima).
