"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  ChevronRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart2,
  PieChart,
  RefreshCw,
  Star,
  Target,
  Lightbulb,
  ShieldAlert,
  Users,
  ArrowLeft,
  Sparkles,
  Info,
} from "lucide-react";
import ExportButtons from "@/components/planejador/ExportButtons";
import BriefingCliente, {
  BriefingClienteData,
  defaultBriefingCliente,
} from "@/components/planejador/BriefingCliente";
import BriefingInterna, {
  BriefingInternaData,
  defaultBriefingInterna,
} from "@/components/planejador/BriefingInterna";

const ComparativoChart = dynamic(
  () => import("@/components/planejador/ComparativoChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    ),
  }
);
const ComposicaoChart = dynamic(
  () => import("@/components/planejador/ComposicaoChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Imposto {
  nome: string;
  baseCalculo: number;
  aliquota: number;
  valor: number;
}

interface RegimeComparativo {
  regime: string;
  label: string;
  cargaPercentual: number;
  totalAnual: number;
  elegivel: boolean;
  motivoInelegivel?: string;
  impostos: Imposto[];
}

interface AnaliseIA {
  regimeRecomendado: string;
  justificativa: string;
  economiaEstimada: number;
  economiaPercentual: number;
  comparativo: RegimeComparativo[];
  oportunidades: string[];
  riscos: string[];
  consideracoes: string[];
}

interface Identificacao {
  nomeEmpresa: string;
  cnpj: string;
  expectativas: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIME_LABELS: Record<string, string> = {
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
  nao_sei: "Não sei",
};

const REGIME_COLORS: Record<string, string> = {
  simples: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  lucro_presumido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lucro_real: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PlanejadorPage() {
  const [fase, setFase] = useState<"briefing" | "resultado">("briefing");
  const [activeTab, setActiveTab] = useState<"cliente" | "interna">("cliente");
  const [identificacao, setIdentificacao] = useState<Identificacao>({
    nomeEmpresa: "",
    cnpj: "",
    expectativas: "",
  });
  const [briefingCliente, setBriefingCliente] = useState<BriefingClienteData>(
    defaultBriefingCliente
  );
  const [briefingInterna, setBriefingInterna] = useState<BriefingInternaData>(
    defaultBriefingInterna
  );
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    if (!identificacao.nomeEmpresa.trim()) {
      toast.error("Informe o nome da empresa antes de continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/planejador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificacao, briefingCliente, briefingInterna }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na análise");
      setAnalise(data);
      setFase("resultado");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      toast.success("Análise concluída com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalise(null);
    setFase("briefing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Adapter for ExportButtons (maintains compatibility with existing export logic)
  const legacyFormData = {
    companyName: identificacao.nomeEmpresa,
    cnpj: identificacao.cnpj,
    regimeAtual: briefingInterna.regimeFederal,
    estado: briefingInterna.uf,
    setor: briefingCliente.atividade,
    porte: "",
    faturamentoAnual: briefingCliente.faturamentoAnualGerencial,
    folhaPagamento: briefingCliente.folhaGerencial,
    principaisDespesas: briefingCliente.principaisDespesas,
    dores: [] as string[],
    outrosDores: "",
    objetivos: [] as string[],
    outrosObjetivos: "",
    temImunidades: false,
    temIncentivos: briefingCliente.beneficioFiscal,
    detalheIncentivos: briefingCliente.beneficioFiscalDesc,
    temExportacao: parseFloat(briefingCliente.percVendasExportacao || "0") > 0,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-16">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Planejador Tributário
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm ml-13">
            Preencha o briefing e gere um planejamento tributário completo com IA.
          </p>
        </div>
        {analise && (
          <Button variant="outline" onClick={handleReset} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova análise
          </Button>
        )}
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              fase === "briefing"
                ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                : "bg-green-500 text-white"
            }`}
          >
            {fase === "resultado" ? <CheckCircle className="h-4 w-4" /> : "1"}
          </div>
          <span
            className={`text-sm font-medium ${
              fase === "briefing" ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
            }`}
          >
            Briefing
          </span>
        </div>
        <div className={`h-px flex-1 max-w-16 ${fase === "resultado" ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              fase === "resultado"
                ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm font-medium ${
              fase === "resultado" ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
            }`}
          >
            Resultado
          </span>
        </div>
      </div>

      {/* ── BRIEFING PHASE ──────────────────────────────────────────────────── */}
      {fase === "briefing" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Identificação */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Identificação</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome da empresa *</Label>
                  <Input
                    value={identificacao.nomeEmpresa}
                    onChange={(e) =>
                      setIdentificacao((p) => ({ ...p, nomeEmpresa: e.target.value }))
                    }
                    placeholder="Ex: Fátima Bolos Ltda"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input
                    value={identificacao.cnpj}
                    onChange={(e) =>
                      setIdentificacao((p) => ({ ...p, cnpj: e.target.value }))
                    }
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Expectativas do cliente</Label>
                <Textarea
                  value={identificacao.expectativas}
                  onChange={(e) =>
                    setIdentificacao((p) => ({ ...p, expectativas: e.target.value }))
                  }
                  placeholder="O que o cliente espera deste planejamento? Qual é a principal dor ou objetivo?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legenda das seções */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-start gap-2.5 flex-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Seção Cliente</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Dados fornecidos pelo cliente durante a reunião de briefing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 flex-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Seção Interna</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dados levantados internamente pela equipe técnica
                </p>
              </div>
            </div>
          </div>

          {/* Custom Tabs */}
          <div>
            <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("cliente")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "cliente"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Users className="h-4 w-4" />
                Seção Cliente
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("interna")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "interna"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Seção Interna
              </button>
            </div>

            {activeTab === "cliente" && (
              <BriefingCliente data={briefingCliente} onChange={setBriefingCliente} />
            )}
            {activeTab === "interna" && (
              <BriefingInterna data={briefingInterna} onChange={setBriefingInterna} />
            )}
          </div>

          {/* Analyze Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleAnalyze}
              disabled={loading || !identificacao.nomeEmpresa.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analisando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Gerar Análise Tributária
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── RESULTADO PHASE ──────────────────────────────────────────────────── */}
      {fase === "resultado" && analise && (
        <div ref={resultsRef} className="space-y-6">
          {/* Back */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFase("briefing")}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao Briefing
            </Button>
            <Button variant="outline" onClick={handleReset} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova análise
            </Button>
          </div>

          {/* Summary Hero Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="sm:col-span-1 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <Star className="h-5 w-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs">
                    Recomendado
                  </Badge>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">
                  Melhor Regime
                </p>
                <p className="text-xl font-bold text-green-900 dark:text-green-200">
                  {REGIME_LABELS[analise.regimeRecomendado] || analise.regimeRecomendado}
                </p>
              </CardContent>
            </Card>

            <Card
              className={`border sm:col-span-1 ${
                analise.economiaEstimada > 0
                  ? "border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  {analise.economiaEstimada > 0 ? (
                    <TrendingDown className="h-5 w-5 text-blue-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  )}
                  <Badge
                    className={
                      analise.economiaEstimada > 0
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs"
                    }
                  >
                    vs. regime atual
                  </Badge>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">
                  {analise.economiaEstimada > 0 ? "Economia Anual Estimada" : "Diferença Anual"}
                </p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-200">
                  {analise.economiaEstimada > 0 ? "" : "-"}
                  {formatCurrency(Math.abs(analise.economiaEstimada))}
                </p>
                {analise.economiaPercentual !== 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {Math.abs(analise.economiaPercentual).toFixed(1)}% de{" "}
                    {analise.economiaEstimada > 0 ? "redução" : "aumento"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800 sm:col-span-1">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <BarChart2 className="h-5 w-5 text-gray-500" />
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs">
                    Estimativa
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">Carga Tributária Estimada</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {analise.comparativo
                    .find((r) => r.regime === analise.regimeRecomendado)
                    ?.cargaPercentual.toFixed(1)}
                  % do faturamento
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatCurrency(
                    analise.comparativo.find((r) => r.regime === analise.regimeRecomendado)
                      ?.totalAnual || 0
                  )}
                  /ano
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Justificativa */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Análise da IA</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {analise.justificativa}
              </p>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Comparativo por Regime</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Carga tributária estimada anual por regime
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparativoChart
                  comparativo={analise.comparativo}
                  regimeRecomendado={analise.regimeRecomendado}
                  regimeAtual={briefingInterna.regimeFederal}
                />
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Composição Tributária</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {REGIME_LABELS[analise.regimeRecomendado]} — regime recomendado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComposicaoChart
                  impostos={
                    analise.comparativo.find((r) => r.regime === analise.regimeRecomendado)
                      ?.impostos || []
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhamento por Regime</CardTitle>
              <CardDescription className="text-xs">
                Tributos estimados — base de cálculo, alíquota e valor anual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analise.comparativo.map((regime) => (
                  <div key={regime.regime}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {regime.label}
                      </h3>
                      {regime.regime === analise.regimeRecomendado && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs">
                          ★ Recomendado
                        </Badge>
                      )}
                      {!regime.elegivel && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-300">
                          Não elegível
                        </Badge>
                      )}
                      <span className="ml-auto text-sm font-bold text-gray-700 dark:text-gray-300">
                        {regime.cargaPercentual.toFixed(1)}% ={" "}
                        {formatCurrency(regime.totalAnual)}/ano
                      </span>
                    </div>

                    {regime.motivoInelegivel && (
                      <p className="text-xs text-red-500 mb-2">{regime.motivoInelegivel}</p>
                    )}

                    {regime.impostos && regime.impostos.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800">
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                                Tributo
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                                Base de Cálculo
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                                Alíquota
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                                Valor Anual
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {regime.impostos.map((imp, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                              >
                                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                                  {imp.nome}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                  {formatCurrency(imp.baseCalculo)}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                  {imp.aliquota.toFixed(2)}%
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(imp.valor)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 dark:bg-gray-900/40">
                              <td
                                colSpan={3}
                                className="py-2 px-3 text-xs font-bold text-gray-700 dark:text-gray-300"
                              >
                                Total estimado
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                                {formatCurrency(regime.totalAnual)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {regime !== analise.comparativo[analise.comparativo.length - 1] && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Oportunidades e Riscos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-green-200 dark:border-green-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Oportunidades</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.oportunidades.map((op, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{op}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Pontos de Atenção</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.riscos.map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{r}</span>
                    </li>
                  ))}
                </ul>
                {analise.consideracoes && analise.consideracoes.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      Considerações adicionais
                    </p>
                    <ul className="space-y-2">
                      {analise.consideracoes.map((c, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exportar Relatório</CardTitle>
              <CardDescription className="text-xs">
                Gere um PDF profissional ou uma apresentação PPT completa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportButtons analise={analise} formData={legacyFormData} resultsRef={resultsRef} />
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400 text-center">
            * As estimativas são baseadas nas informações fornecidas e nas alíquotas vigentes em
            2025. Consulte sempre um contador ou advogado tributarista antes de tomar decisões
            fiscais.
          </p>
        </div>
      )}
    </div>
  );
}
