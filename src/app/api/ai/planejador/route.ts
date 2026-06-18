import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "../../../../auth";
import db from "@/lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REGIME_LABELS: Record<string, string> = {
  mei: "MEI",
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

function v(val: unknown): string {
  if (val === null || val === undefined || val === "" || val === false) return "Não informado";
  if (val === true) return "Sim";
  if (typeof val === "number") return val === 0 ? "Não informado" : String(val);
  return String(val);
}

function yesNo(val: boolean | undefined, detail?: string): string {
  if (!val) return "Não";
  return detail ? `Sim — ${detail}` : "Sim";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both old (flat FormData) and new (briefing) formats
    const { identificacao, briefingCliente: bc, briefingInterna: bi } = body;

    // If old format, fall back gracefully
    if (!identificacao) {
      return NextResponse.json({ error: "Formato de dados inválido" }, { status: 400 });
    }

    const prompt = `Você é um especialista em planejamento tributário brasileiro com 20 anos de experiência. Analise os dados completos do briefing abaixo e forneça um planejamento tributário preciso e detalhado.

## IDENTIFICAÇÃO
**Empresa:** ${v(identificacao.nomeEmpresa)}
**CNPJ:** ${v(identificacao.cnpj)}
**Expectativas do cliente:** ${v(identificacao.expectativas)}

---

## SEÇÃO CLIENTE (informações fornecidas pelo cliente)

### Business — Operacional
- Atividade: ${v(bc.atividade)}
- Nº de funcionários: ${v(bc.numFuncionarios)}
- Faturamento mensal gerencial: ${v(bc.faturamentoMensalGerencial)}
- Faturamento anual gerencial: ${v(bc.faturamentoAnualGerencial)}
- Folha de pagamento gerencial: ${v(bc.folhaGerencial)}
- % Funcionários informais (PF/PJ): ${v(bc.percFuncionariosInformais)}
- Margem gerencial: ${v(bc.margemGerencial)}
- Possui site: ${yesNo(bc.possuiSite, bc.siteUrl)}
- Grupo econômico: ${yesNo(bc.grupoEconomico, bc.grupoEconomicoDesc)}

### Business — Comercial
- % Vendas interestadual / interna / exportação: ${v(bc.percVendasInterestadual)}% / ${v(bc.percVendasInternas)}% / ${v(bc.percVendasExportacao)}%
- % Compras interestadual / interna / importação: ${v(bc.percComprasInterestadual)}% / ${v(bc.percComprasInternas)}% / ${v(bc.percComprasImportacao)}%
- % Vendas por perfil PF / PJ: ${v(bc.percVendasPF)}% / ${v(bc.percVendasPJ)}%
- Inadimplência média: ${v(bc.inadimplencia)}
- Principais fornecedores: ${v(bc.principaisFornecedores)}
- Principais concorrentes: ${v(bc.principaisConcorrentes)}

### Business — Outros
- Licitações: ${v(bc.licitacoes)}
- Retenção na fonte: ${yesNo(bc.retencaoFonte)}
- Benefício fiscal: ${yesNo(bc.beneficioFiscal, bc.beneficioFiscalDesc)}
- Trabalho jurídico-tributário prévio: ${yesNo(bc.trabalhoJuridicoPrevio, bc.trabalhoJuridicoDesc)}
- Fluxo de caixa: ${v(bc.fluxoCaixa)}
- Outras receitas: ${v(bc.outrasReceitas)}
- Principais despesas/custos: ${v(bc.principaisDespesas)}

### Compliance
- Ajustes no resultado contábil: ${yesNo(bc.ajustesContabeis, bc.ajustesContabeisDesc)}
- Segrega receitas com outro CNPJ: ${yesNo(bc.segregaReceitas, bc.segregaReceitasDesc)}
- Desonera folha pelo Simples Nacional: ${yesNo(bc.desoneraFolha)}
- Pagamentos/recebimentos sem NF: ${v(bc.pagamentosSemNF)}
- Retirada de caixa dos sócios: ${v(bc.retiradaCaixaSocios)}
- Balancete atualizado: ${yesNo(bc.balanceteAtualizado)}
- Nível de organização operacional/administrativa: ${bc.nivelOrganizacao > 0 ? `${bc.nivelOrganizacao}/5` : "Não informado"}

### Estratégia
- Plano de expansão de receita: ${yesNo(bc.planoExpansaoReceita, bc.planoExpansaoReceitaDesc)}
- Plano de expansão de custos/investimentos: ${yesNo(bc.planoExpansaoCustos, bc.planoExpansaoCustosDesc)}

${bc.possuiHolding ? `### Holding
- Composição de ativos: ${v(bc.composicaoAtivos)}
- Estrutura de receitas da holding: ${v(bc.estruturaReceitasHolding)}
- Atividade/receita preponderante: ${v(bc.atividadePreponHolding)}
- Quadro societário: ${v(bc.quadroSocietario)}` : "### Holding\n- Não possui / não analisa estrutura de holding"}

---

## SEÇÃO INTERNA (dados levantados pela equipe técnica)

### Business
- Regime atual — Federal: ${REGIME_LABELS[bi.regimeFederal] || v(bi.regimeFederal)}
- Regime atual — Estadual/Municipal: ${v(bi.regimeEstadualMunicipal)}
- UF: ${v(bi.uf)}
- CNAE principal: ${v(bi.cnaePrincipal)}
- CNAE secundário: ${v(bi.cnaeSecundario)}
- NCM principais produtos: ${v(bi.ncmPrincipais)}
- Benefícios setoriais identificados: ${v(bi.beneficiosSetoriais)}
- Faturamento fiscal mensal: ${v(bi.faturamentoFiscalMensal)} (ref: ${v(bi.mesReferenciaFiscal)})
- Faturamento fiscal anual (ano corrente): ${v(bi.faturamentoFiscalAnual)}
- Média faturamento mensal (3 meses): ${v(bi.mediaFaturamentoMensal)}
- Média tributos mensais (3 meses): ${v(bi.mediaTributosMensal)}
- Qtde funcionários formais: ${v(bi.numFuncionariosFormais)}
- Média BC contribuição previdenciária (folha/3 meses): ${v(bi.mediaBcPrevidencia)}
- Qualidade das informações fiscais: ${bi.qualidadeInformacoesFiscais > 0 ? `${bi.qualidadeInformacoesFiscais}/5` : "Não informado"}

### Compliance
- Situação fiscal federal: ${v(bi.situacaoFiscalFederal)}
- Situação fiscal estadual/municipal: ${v(bi.situacaoFiscalEstadual)}

### Estratégia
- Alíquota efetiva total (média 3 meses): ${v(bi.aliquotaEfetivaTotal)}

---

## INSTRUÇÕES

Com base neste briefing completo, realize uma análise comparativa detalhada dos três regimes tributários brasileiros (Simples Nacional, Lucro Presumido e Lucro Real).

Use prioritariamente os dados fiscais da Seção Interna para os cálculos. Quando houver dados gerenciais (Seção Cliente) sem correspondente fiscal, use os gerenciais com nota de ajuste.

Calcule estimativas REAIS de carga tributária usando alíquotas vigentes em 2025. Para o Simples Nacional, use as tabelas dos Anexos I a V conforme o setor/CNAE. Para Lucro Presumido, use os percentuais de presunção corretos por atividade. Para Lucro Real, estime com base nas margens informadas e dados financeiros fornecidos.

Leve em conta na análise:
- Situação fiscal (irregular/pendente pode inviabilizar mudança de regime)
- Benefícios setoriais e incentivos identificados
- Planos de expansão e estratégia futura
- Estrutura de holding se aplicável
- Mix de vendas (PF/PJ, interestadual/interna/exportação)

Retorne APENAS um JSON válido com esta estrutura exata:

{
  "regimeRecomendado": "simples" | "lucro_presumido" | "lucro_real",
  "justificativa": "Texto detalhado (3-5 parágrafos) explicando por que este regime é o melhor, citando os dados do briefing. Mencione a alíquota efetiva atual vs a estimada no regime recomendado.",
  "economiaEstimada": número em reais (diferença anual vs regime atual — positivo = economia, negativo = custo adicional),
  "economiaPercentual": número percentual (pode ser negativo),
  "comparativo": [
    {
      "regime": "simples" | "lucro_presumido" | "lucro_real",
      "label": "Simples Nacional" | "Lucro Presumido" | "Lucro Real",
      "cargaPercentual": número percentual sobre faturamento,
      "totalAnual": número em reais,
      "elegivel": true | false,
      "motivoInelegivel": "string ou null",
      "impostos": [
        {
          "nome": "Nome do imposto",
          "baseCalculo": número,
          "aliquota": número percentual,
          "valor": número em reais
        }
      ]
    }
  ],
  "oportunidades": ["3 a 6 oportunidades tributárias específicas para esta empresa, baseadas nos dados do briefing"],
  "riscos": ["2 a 4 riscos ou pontos de atenção específicos"],
  "consideracoes": ["2 a 4 considerações adicionais importantes, incluindo impacto da reforma tributária se relevante"]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em planejamento tributário brasileiro. Responda SEMPRE em JSON válido conforme a estrutura solicitada.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0].message.content || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido");

    const analise = JSON.parse(jsonMatch[0]);

    // Salvar no banco associado ao usuário autenticado
    try {
      const session = await auth();
      if (session?.user?.id) {
        await db.taxPlan.create({
          data: {
            userId: session.user.id,
            companyName: identificacao.nomeEmpresa || "Empresa",
            cnpj: identificacao.cnpj || null,
            regimeAtual: bi.regimeFederal || "nao_informado",
            estado: bi.uf || "",
            setor: bc.atividade || "",
            porte: "",
            dados: { identificacao, briefingCliente: bc, briefingInterna: bi },
            analiseIA: analise,
            status: "analyzed",
          },
        });
      }
    } catch (saveError) {
      console.error("Aviso: falha ao salvar TaxPlan:", saveError);
    }

    return NextResponse.json(analise);
  } catch (error) {
    console.error("Erro no planejador tributário:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
