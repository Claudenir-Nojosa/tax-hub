"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PgdasImportSection from "@/components/recuperacao-credito/PgdasImportSection";
import {
  FileSearch,
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArquivoCarregado {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface OportunidadeCredito {
  tipo: string;
  descricao: string;
  valorEstimado: number | null;
  prioridade: "alta" | "media" | "baixa";
  fundamentacao: string;
}

interface ResultadoAnalise {
  resumo: string;
  totalEstimado: number | null;
  oportunidades: OportunidadeCredito[];
  alertas: string[];
  proximosPassos: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

const PRIORIDADE_CONFIG = {
  alta: {
    label: "Alta",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
  },
  media: {
    label: "Média",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  baixa: {
    label: "Baixa",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    dot: "bg-blue-500",
  },
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RecuperacaoCreditoPage() {
  const [arquivos, setArquivos] = useState<ArquivoCarregado[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const aceitos = Array.from(fileList).filter((f) =>
      /\.(xlsx|xls|csv)$/i.test(f.name)
    );
    const invalidos = fileList.length - aceitos.length;
    if (invalidos > 0)
      toast.warning(`${invalidos} arquivo(s) ignorado(s) — apenas .xlsx, .xls e .csv são aceitos.`);

    const novos: ArquivoCarregado[] = aceitos.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      size: f.size,
    }));
    setArquivos((prev) => [...prev, ...novos]);
  }, []);

  const removerArquivo = (id: string) =>
    setArquivos((prev) => prev.filter((a) => a.id !== id));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      adicionarArquivos(e.dataTransfer.files);
    },
    [adicionarArquivos]
  );

  const handleAnalisar = async () => {
    if (arquivos.length === 0) {
      toast.error("Adicione pelo menos um arquivo para analisar.");
      return;
    }
    setAnalisando(true);
    setResultado(null);
    try {
      const formData = new FormData();
      arquivos.forEach((a) => formData.append("files", a.file, a.name));

      const res = await fetch("/api/recuperacao-credito", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na análise");

      setResultado(data);
      toast.success("Análise concluída!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  };

  const handleReset = () => {
    setArquivos([]);
    setResultado(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-16">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
              <FileSearch className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recuperação de Crédito
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Carregue os arquivos fiscais e contábeis — a IA identifica oportunidades de recuperação de créditos tributários.
          </p>
        </div>
        {resultado && (
          <Button variant="outline" onClick={handleReset} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova análise
          </Button>
        )}
      </div>

      {/* Upload Section */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Arquivos para Análise</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Aceita .xlsx, .xls e .csv — você pode carregar múltiplos arquivos
              </CardDescription>
            </div>
            {arquivos.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-12 px-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-gray-800"
            }`}>
              <Upload className={`h-6 w-6 transition-colors ${
                isDragging ? "text-emerald-600" : "text-gray-400 dark:text-gray-500"
              }`} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
              Clique ou arraste os arquivos aqui
            </p>
            <p className="text-xs text-gray-400 mt-1 text-center">
              .xlsx · .xls · .csv — sem limite de quantidade
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </div>

          {/* File list */}
          {arquivos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                Arquivos carregados
              </p>
              {arquivos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {a.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatBytes(a.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerArquivo(a.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner (shown before first analysis) */}
      {!resultado && arquivos.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Como funciona:</span> carregue os arquivos Excel com dados fiscais e contábeis da empresa (SPED, EFD, DRE, notas fiscais, etc.), clique em analisar e a IA irá mapear oportunidades de recuperação de crédito com base nos dados fornecidos.
          </p>
        </div>
      )}

      {/* Analyze Button */}
      {arquivos.length > 0 && !resultado && (
        <div className="flex justify-end">
          <Button
            onClick={handleAnalisar}
            disabled={analisando}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 font-semibold"
          >
            {analisando ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analisando arquivos...
              </>
            ) : (
              <>
                <FileSearch className="h-5 w-5 mr-2" />
                Analisar Oportunidades
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {resultado && (
        <div className="space-y-6">
          {/* Resumo */}
          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Resumo da Análise
                    </p>
                    {resultado.totalEstimado != null && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                        Potencial: {formatCurrency(resultado.totalEstimado)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    {resultado.resumo}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Oportunidades */}
          {resultado.oportunidades.length > 0 && (
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">
                    Oportunidades Identificadas
                  </CardTitle>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {resultado.oportunidades.length} encontrada{resultado.oportunidades.length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {resultado.oportunidades.map((op, i) => {
                  const cfg = PRIORIDADE_CONFIG[op.prioridade];
                  return (
                    <div key={i}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-2 flex-shrink-0`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {op.tipo}
                            </p>
                            <Badge className={`text-xs ${cfg.badge}`}>
                              {cfg.label}
                            </Badge>
                            {op.valorEstimado != null && (
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                                {formatCurrency(op.valorEstimado)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {op.descricao}
                          </p>
                          <p className="text-xs text-gray-400 italic">
                            {op.fundamentacao}
                          </p>
                        </div>
                      </div>
                      {i < resultado.oportunidades.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Alertas e Próximos Passos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {resultado.alertas.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">Pontos de Atenção</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resultado.alertas.map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{a}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {resultado.proximosPassos.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-900/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Próximos Passos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {resultado.proximosPassos.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{p}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            * A análise é baseada nos arquivos fornecidos e nas normas vigentes. Recomenda-se validação com contador ou advogado tributarista antes de iniciar o processo de recuperação.
          </p>
        </div>
      )}

      <Separator className="my-8" />

      <PgdasImportSection />
    </div>
  );
}
