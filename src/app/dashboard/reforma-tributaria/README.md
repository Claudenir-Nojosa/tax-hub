# Reforma Tributária — Regras e Diretrizes

> Fonte legal: EC 132/2023 + LC 214/2025  
> Qualquer alteração nesta feature **deve** seguir estas regras. Não altere alíquotas, cronograma ou lógica de cálculo sem atualizar este documento.

> **Wizard v2 (atual)**: o wizard de 7 passos que gera o Excel de entrega fiel ao modelo do
> cliente (com fórmulas nativas, 14 abas) está documentado em detalhe em
> [`docs/reforma-tributaria-v2.md`](../../../../docs/reforma-tributaria-v2.md) — leia aquele
> documento primeiro se for mexer no wizard, nos parsers de EFD ou no gerador de Excel
> (`src/lib/reforma-excel/`). As seções 1-8 e 11 deste README (cronograma, conceitos dos
> tributos, período de teste, FCBF, crédito de compras sem XML, comparativo Simples) continuam
> válidas e são a fonte legal de referência para os dois wizards. As seções 9, 10, 12 e 13
> abaixo descrevem o wizard **antigo** de 4 passos (`reforma-engine.ts` + `Step1-4*.tsx`), que
> continua no código como engine de simulação rápida (sem EFD granular), mas não é mais o fluxo
> principal do módulo.

---

## 1. Cronograma de Transição (imutável por lei)

| Ano  | CBS      | IBS UF   | IBS Mun  | Total IBS+CBS | ICMS restante | IPI     | Observação                          |
|------|----------|----------|----------|---------------|---------------|---------|-------------------------------------|
| 2026 | 0,90%    | 0,10%    | 0,00%    | 1,00%         | 100%          | Ativo   | **Período de teste** — IBS/CBS compensados por crédito PIS/COFINS; carga líquida = carga atual |
| 2027 | 8,70%    | 0,05%    | 0,05%    | 8,80%         | 100%          | Extinto | IPI extinto (exceto ZFM); PIS/COFINS extintos |
| 2028 | 8,70%    | 0,05%    | 0,05%    | 8,80%         | 100%          | Extinto | —                                   |
| 2029 | 8,80%    | 1,75%    | 0,87%    | 11,42%        | 90%           | Extinto | Transição IBS começa                |
| 2030 | 8,80%    | 3,42%    | 1,71%    | 13,93%        | 80%           | Extinto | —                                   |
| 2031 | 8,80%    | 5,02%    | 2,51%    | 16,33%        | 70%           | Extinto | —                                   |
| 2032 | 8,80%    | 6,56%    | 3,28%    | 18,64%        | 60%           | Extinto | —                                   |
| 2033 | 8,80%    | 12,27%   | 5,43%    | 26,50%        | 0%            | Extinto | ICMS extinto; alíquota plena IBS+CBS |

**Regras obrigatórias do cronograma:**
- Os anos de transição são sempre `[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]` — exportados como `ANOS_TRANSICAO` em `reforma-engine.ts`.
- O usuário pode editar as alíquotas na tela (Step 2 — Premissas), mas o padrão `PREMISSAS_PADRAO` deve refletir exatamente a tabela acima.
- O botão "Restaurar padrão" sempre volta para `PREMISSAS_PADRAO`.

---

## 2. Conceitos dos Tributos

### CBS — Contribuição sobre Bens e Serviços
- Substitui PIS + COFINS no regime regular.
- É federal. Alíquota cresce de 0,9% (2026) até 8,8% (2027+).
- Base de cálculo: faturamento bruto (ou `totalBaseIbsCbs` quando XML importado).

### IBS — Imposto sobre Bens e Serviços
- Substitui ICMS e ISS progressivamente.
- Dividido em **IBS UF** (estadual) + **IBS Mun** (municipal).
- Base de cálculo: mesma base da CBS.

### ICMS
- Reduzido gradualmente de 2029 a 2033.
- Fator de redução: `icmsReducao` (1,00 = 100% vigente → 0,00 = extinto).
- **Sem dados XML**: `icmsReforma = faturamento × aliquotaICMS × icmsReducao`
- **Com dados XML** (2027+): base do ICMS é recalculada por dentro do preço — fórmula de cálculo "por dentro": `icmsReforma = (baseIbsCbs + ibsCbsTotal) × aliq / (1 - aliq)`, onde `aliq = aliquotaICMSEfetiva × icmsReducao`.

### IPI
- Vigente até 2026. **Extinto a partir de 2027** para todos os produtos, exceto os produzidos na Zona Franca de Manaus (ZFM — fora do escopo desta simulação).
- Flag: `ipiAtivo` em cada `PremissaAno`. Apenas 2026 tem `ipiAtivo: true`.

### PIS / COFINS
- Regime Lucro Real: 9,25% (não-cumulativo)
- Regime Lucro Presumido: 3,65% (cumulativo — PIS 0,65% + COFINS 3%)
- Simples Nacional: incluído no DAS; não calculado separadamente (`pisCofinsAtual = 0`)
- **Extintos a partir de 2027**, substituídos pelo CBS.

---

## 3. Período de Teste — 2026

Em 2026 o IBS/CBS são cobrados em caráter de teste:
- As empresas pagam CBS 0,9% + IBS 0,1%, mas recebem crédito equivalente de PIS/COFINS.
- **Efeito líquido: zero** — a carga total em 2026 é igual à carga atual.
- Implementação: `periodoTeste: true` em `PREMISSAS_PADRAO[2026]`.
- Na engine: `ibsCbsNaCarga = p.periodoTeste ? 0 : ibsCbsTotal`.

---

## 4. FCBF — Fundo de Combate e Erradicação da Pobreza / Crédito Presumido de ICMS

- Benefício fiscal **estadual** baseado em ICMS (ex: crédito presumido do SEFAZ-CE).
- Como é vinculado ao ICMS, extingue-se proporcionalmente ao ICMS.
- **Fórmula**: `fcbfEconomia = fcbfBaseAnual × fcbfPercentual × icmsReducao`
- `fcbfBaseAnual = fcbfBaseCalculoMensal × 12`
- O benefício é zero quando `icmsReducao = 0` (2033 em diante).
- Apresentado na tela como economia separada: "Carga Líquida com FCBF".

**Atenção:** O `fcbfBaseCalculo` armazenado no banco é **mensal**. A anualização (×12) ocorre somente dentro da engine no momento do cálculo.

---

## 5. Crédito de ICMS nas Compras (sem XML)

Quando não há XML importado, o sistema calcula um crédito presumido de IBS/CBS pelas compras:

```
creditoCompras = faturamento × aliquotaICMSCompras × (cbs + ibsUF + ibsMUN)
```

Esse crédito representa o aproveitamento proporcional do crédito IBS/CBS gerado nas entradas, estimado pela alíquota de ICMS nas compras.

> **Com dados XML** este crédito não é calculado (`creditoCompras = 0`), pois as bases já são os valores reais das NF-e de saída.

---

## 6. Simulação com XML de NF-e

Quando o usuário importa XMLs de NF-e de saída:
- A engine usa `calcularSimulacaoXml` em vez de `calcularSimulacao`.
- Base de faturamento: `totalVProd` (soma dos valores dos produtos).
- Base IBS/CBS: `totalBaseIbsCbs` = `vProd - vICMS - vPIS - vCOFINS` (base por dentro, já deduzidos os tributos atuais).
- Alíquotas efetivas (ICMS e IPI) são extraídas dos XMLs e preenchidas automaticamente no Step 2.
- Em 2026: carga reforma = carga atual (período de teste, mantém PIS/COFINS e ICMS reais do XML).
- A partir de 2027: PIS/COFINS extintos; CBS entra na base completa.

**Regra de prioridade**: se `usarXml = true` e há `dadosXml` no banco → usa `calcularSimulacaoXml`. Caso contrário → `calcularSimulacao` com premissas manuais.

---

## 7. Comparativo com Simples Nacional

Mesmo para empresas no regime regular (Lucro Presumido/Real), o sistema sempre calcula a carga hipotética do Simples Nacional para comparação:

| Anexo Simples  | Regime          | Alíquota nominal (faixa 1 até R$180k) |
|----------------|-----------------|---------------------------------------|
| SIMPLES_I      | Comércio        | 4,00%                                 |
| SIMPLES_II     | Indústria       | 4,50%                                 |
| SIMPLES_III    | Serviços        | 6,00%                                 |

- `diferencaSimplesPct = cargaSimplesPct - cargaReformaPct` — positivo = Simples mais caro.
- **Atenção:** A comparação usa apenas a faixa 1. Para faturamentos maiores, as alíquotas do Simples aumentam progressivamente; este campo é apenas orientativo.

---

## 8. Estrutura de Dados — Banco (Prisma)

### `EmpresaReforma`
Campos principais armazenados por empresa:

| Campo                  | Tipo      | Descrição                                      |
|------------------------|-----------|------------------------------------------------|
| `cnpj`                 | String    | CNPJ formatado                                 |
| `razaoSocial`          | String    | Razão social                                   |
| `regime`               | String    | `LUCRO_PRESUMIDO`, `LUCRO_REAL`, `SIMPLES_I/II/III` |
| `simplesNacional`      | Boolean   | Se está no Simples                             |
| `uf`                   | String    | UF da empresa                                  |
| `faturamento`          | Float     | Receita bruta anual (R$)                       |
| `aliquotaICMS`         | Float     | Alíquota ICMS saídas (decimal, ex: 0.12)       |
| `aliquotaICMSCompras`  | Float     | Alíquota ICMS compras (decimal)                |
| `temIPI`               | Boolean   | Sujeita a IPI?                                 |
| `aliquotaIPI`          | Float     | Alíquota IPI (decimal)                         |
| `percentualIPISaidas`  | Float     | % das saídas com IPI (decimal)                 |
| `temFCBF`              | Boolean   | Tem benefício FCBF/crédito presumido?          |
| `fcbfPercentual`       | Float     | Percentual do benefício (decimal)              |
| `fcbfBaseCalculo`      | Float     | Base de cálculo **mensal** do FCBF (R$)        |

### `SimulacaoReforma`
- `premissas`: JSON com `Record<number, PremissaAno>` usadas no cálculo.
- `resultados`: JSON com array `ResultadoAno[]` (8 anos: 2026–2033).
- `usouXml`: Boolean — indica se o cálculo usou dados de XML.

### `DadosXmlReforma`
- Armazena dados agregados dos XMLs importados (totalVProd, totalVICMS, etc.).
- Relação 1:1 com `EmpresaReforma`.

---

## 9. Fluxo Wizard (4 Steps)

```
Step 1 — Empresa
  ↓ CNPJ (busca automática Receita Federal), razão social, regime, UF, faturamento
Step 2 — Premissas
  ↓ Alíquotas ICMS (saídas/compras), IPI, FCBF
  ↓ Importação opcional de XMLs de NF-e (auto-preenche alíquotas)
  ↓ Tabela editável de alíquotas da reforma por ano
Step 3 — Simulação
  ↓ Gráficos: carga atual vs reforma por ano, delta percentual
  ↓ Tabela detalhada por tributo/ano
Step 4 — Análise
  ↓ Insights gerados pela IA (Claude) sobre o impacto
  ↓ Exportação PDF/PPT
  ↓ Botão "Salvar" → redireciona para lista de empresas
```

**Navegação entre steps:**
- Steps anteriores: sempre navegáveis via clique.
- Steps futuros: bloqueados até que a simulação seja rodada (`savedEmpresaId !== null`).
- URL da empresa existente com `?view=analise`: abre diretamente no Step 3.
- URL com `?edit=true`: permite voltar a qualquer step mesmo após salvo.

---

## 10. Regras de Exibição

- Valores monetários: sempre formatados com `formatarMoeda()` (pt-BR, R$, sem decimais).
- Porcentagens: `formatarPorcentagem()` com 1 decimal por padrão (ex: `12,3%`).
- Delta positivo (reforma mais cara) = vermelho; delta negativo (economia) = verde.
- Carga `Math.max(0, ...)` — nunca exibir carga negativa.
- FCBF: exibir coluna separada "Carga Líquida c/ FCBF" somente quando `temFCBF = true`.
- Ano 2026: exibir badge "Período de Teste" e nota explicativa sobre efeito líquido zero.

---

## 11. O que NÃO alterar sem revisão jurídica

1. `PREMISSAS_PADRAO` — alíquotas fixadas pela LC 214/2025.
2. `ANOS_TRANSICAO` — cronograma definido por lei (2026–2033).
3. Lógica de extinção do IPI (2027) e ICMS (2033).
4. Proporcionalidade do FCBF ao fator `icmsReducao`.
5. Efeito líquido zero do período de teste de 2026.

Qualquer atualização legal (ex: nova lei alterando alíquotas) deve ser refletida em `PREMISSAS_PADRAO` **e** neste documento simultaneamente.

---

## 12. EFD ICMS IPI — Importação de Créditos (client-side)

O sistema aceita o arquivo `.txt` do **EFD ICMS IPI** (SPED fiscal) para calcular créditos IBS/CBS com base real.

### Registros extraídos

| Registro | Campos usados | Finalidade |
|----------|--------------|------------|
| **0000** | DT_INI (campo 4) | Identifica o período (mês/ano) |
| **C100** | IND_OPER(2), DT_DOC(10), VL_DOC(11), VL_BC_ICMS(20), VL_ICMS(21), VL_IPI(24), VL_PIS(25), VL_COFINS(26) | Resumo por documento |
| **C190** | CST(2), **CFOP(3)**, ALIQ_ICMS(4), **VL_OPR(5)**, **VL_BC_ICMS(6)**, **VL_ICMS(7)** | Base real do crédito IBS/CBS |
| **E110** | VL_TOT_DEBITOS(2), VL_TOT_CREDITOS(6), VL_SLD_APURADO(11), VL_ICMS_RECOLHER(13), VL_SLD_CREDOR_TRANSP(14) | Posição fiscal do período |

> Os números de campo são **1-based** (campo 1 = identificador do registro).

### Classificação por CFOP

- CFOPs `1xxx` / `2xxx` / `3xxx` → **entrada** → geram crédito IBS/CBS
- CFOPs `5xxx` / `6xxx` / `7xxx` → **saída**
- Outros → `outro` (ignorado no crédito)

### Cálculo do crédito com EFD

```
creditoCompras(ano) = bcICMSEntradas × (cbs(ano) + ibsUF(ano) + ibsMUN(ano))
```

Onde `bcICMSEntradas` = soma do campo `VL_BC_ICMS` de todos os registros C190 com CFOP de entrada.

Sem EFD, a estimativa é: `faturamento × aliquotaICMSCompras × aliqIBSCBS(ano)`.

### Persistência

O EFD é 100% **client-side** — não é salvo no banco. O usuário reimporta quando precisar re-simular. O campo `bcICMSEntradas` é passado no body do POST `/api/reforma-tributaria/simulacao`.

### Regras de exibição

- Badge **"EFD"** aparece no Step 2 (campo alíquota ICMS compras) e no Step 3 (cabeçalho coluna "Crédito IBS/CBS") quando EFD importado.
- Saldo credor do E110 → verde; ICMS a recolher → vermelho.
- Se nenhum C190 for encontrado → aviso ao usuário para verificar se é EFD ICMS IPI modelo 55.

---

## 13. Arquivos Principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| [`src/lib/reforma-engine.ts`](../../../lib/reforma-engine.ts) | Motor de cálculo — toda lógica tributária |
| [`src/lib/efd-parser.ts`](../../../lib/efd-parser.ts) | Parser EFD ICMS IPI (C100, C190, E110) |
| [`src/app/dashboard/reforma-tributaria/page.tsx`](./page.tsx) | Lista de empresas |
| [`src/app/dashboard/reforma-tributaria/[empresaId]/page.tsx`](./[empresaId]/page.tsx) | Wizard 4 steps |
| [`src/components/reforma/Step1Empresa.tsx`](../../../components/reforma/Step1Empresa.tsx) | Step 1 — dados da empresa |
| [`src/components/reforma/Step2Premissas.tsx`](../../../components/reforma/Step2Premissas.tsx) | Step 2 — premissas, XML e EFD |
| [`src/components/reforma/EfdImportPanel.tsx`](../../../components/reforma/EfdImportPanel.tsx) | Painel drag-and-drop do EFD |
| [`src/components/reforma/Step3Simulacao.tsx`](../../../components/reforma/Step3Simulacao.tsx) | Step 3 — gráficos e tabela c/ crédito |
| [`src/components/reforma/Step4Analise.tsx`](../../../components/reforma/Step4Analise.tsx) | Step 4 — análise IA e export |
| [`src/app/api/reforma-tributaria/simulacao/route.ts`](../../api/reforma-tributaria/simulacao/route.ts) | API de cálculo |
| [`src/app/api/reforma-tributaria/xml/route.ts`](../../api/reforma-tributaria/xml/route.ts) | API de importação XML |

---

## 14. Arquivos do Wizard v2 (fluxo atual)

Ver `docs/reforma-tributaria-v2.md` para o detalhamento completo. Resumo dos arquivos principais:

| Arquivo | Responsabilidade |
|---------|-----------------|
| [`src/app/dashboard/reforma-tributaria/[empresaId]/page.tsx`](./[empresaId]/page.tsx) | Wizard 7 passos (mesmo arquivo do wizard antigo — substituído) |
| `src/components/reforma/Step1Empresa.tsx` a `StepRevisao.tsx` | Os 7 passos |
| `src/lib/efd-contribuicoes-saidas-parser.ts` | Parser granular de saídas (EFD Contribuições, por item de NF) |
| `src/lib/efd-icms-ipi-entradas-parser.ts` | Parser granular de entradas (EFD ICMS/IPI, com CNPJ do fornecedor) |
| `src/lib/reforma-legislacao-busca.ts` + `src/app/api/reforma-tributaria/legislacao-ia/route.ts` | Busca de legislação por CNAE via IA |
| `src/lib/reforma-base-ibs-cbs.ts` + `-custom.ts` | Base padrão/customizada de NCM |
| `src/lib/reforma-excel/*.ts` | Gerador do Excel — uma aba por módulo (`anos.ts`, `entradas-efd.ts`, `analise-fornecedores.ts` etc.), orquestrado por `gerar-excel-reforma.ts` |
| `src/data/reforma-legislacoes/*.txt`, `src/data/reforma-base-ibs-cbs/base.json` | Assets extraídos do Excel-modelo real (legislações e base de NCM) |

**Limitação de escala conhecida** (ver `docs/reforma-tributaria-v2.md`, Fase 7): cada linha de
saída importada é replicada nas 7 abas de ano. Testado com sucesso até ~20.000 itens (139.769
linhas de fórmula geradas, zero erros), mas nesse volume a geração leva minutos e usa vários GB de
memória — inviável em alguns navegadores/máquinas. `StepRevisao.tsx` avisa o usuário acima de 8.000
itens. Não há correção implementada ainda (exigiria reescrever o gerador para streaming); a
mitigação prática é gerar menos meses de EFD por vez.
