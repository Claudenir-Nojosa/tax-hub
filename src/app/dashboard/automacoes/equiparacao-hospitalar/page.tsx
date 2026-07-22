"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { processarArquivosNfse, RarNotSupportedError, type NotaFiscalServico } from "@/lib/nfse-parser";
import { classificarNotas, type NotaClassificada } from "@/lib/equiparacao-hospitalar-classificar";
import { exportarEquiparacaoHospitalarExcel } from "@/lib/equiparacao-hospitalar-excel";
import {
  HeartPulse,
  Upload,
  FileText,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  XCircle,
  MinusCircle,
} from "lucide-react";

interface ArquivoCarregado {
  id: string;
  file: File;
  name: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type Etapa = "idle" | "lendo" | "classificando" | "concluido";

const OPORTUNIDADE_CONFIG = {
  Sim: { label: "Sim", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  Meio: { label: "Meio", icon: MinusCircle, className: "text-amber-600 dark:text-amber-400" },
  Dúvida: { label: "Dúvida", icon: HelpCircle, className: "text-primary dark:text-primary" },
  Não: { label: "Não", icon: XCircle, className: "text-muted-foreground" },
} as const;

export default function EquiparacaoHospitalarPage() {
  const [arquivos, setArquivos] = useState<ArquivoCarregado[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resultado, setResultado] = useState<NotaClassificada[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const aceitos = Array.from(fileList).filter((f) => /\.(xml|zip)$/i.test(f.name));
    const invalidos = fileList.length - aceitos.length;
    if (invalidos > 0) toast.warning(`${invalidos} arquivo(s) ignorado(s) — apenas .xml e .zip são aceitos.`);

    const novos: ArquivoCarregado[] = aceitos.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      size: f.size,
    }));
    setArquivos((prev) => [...prev, ...novos]);
  }, []);

  const removerArquivo = (id: string) => setArquivos((prev) => prev.filter((a) => a.id !== id));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      adicionarArquivos(e.dataTransfer.files);
    },
    [adicionarArquivos]
  );

  const handleProcessar = async () => {
    if (arquivos.length === 0) {
      toast.error("Adicione pelo menos um arquivo XML.");
      return;
    }
    try {
      setEtapa("lendo");
      setProgresso({ atual: 0, total: arquivos.length });
      const notas: NotaFiscalServico[] = await processarArquivosNfse(
        arquivos.map((a) => a.file),
        (atual, total) => setProgresso({ atual, total })
      );

      if (notas.length === 0) {
        toast.error("Nenhuma nota fiscal de serviço foi encontrada nos arquivos.");
        setEtapa("idle");
        return;
      }

      setEtapa("classificando");
      setProgresso({ atual: 0, total: notas.length });
      const classificadas = await classificarNotas(notas, (atual, total) => setProgresso({ atual, total }));

      setResultado(classificadas);
      setEtapa("concluido");
      toast.success(`${classificadas.length} notas classificadas!`);
    } catch (e) {
      if (e instanceof RarNotSupportedError) {
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : "Erro ao processar os arquivos");
      }
      setEtapa("idle");
    }
  };

  const handleReset = () => {
    setArquivos([]);
    setResultado(null);
    setEtapa("idle");
  };

  const handleBaixarExcel = async () => {
    if (!resultado) return;
    const nomeCliente = resultado.find((n) => n.prestadorRazaoSocial)?.prestadorRazaoSocial || "Cliente";
    await exportarEquiparacaoHospitalarExcel(resultado, nomeCliente);
  };

  const contagem = resultado
    ? {
        Sim: resultado.filter((n) => n.oportunidade === "Sim").length,
        Meio: resultado.filter((n) => n.oportunidade === "Meio").length,
        Dúvida: resultado.filter((n) => n.oportunidade === "Dúvida").length,
        Não: resultado.filter((n) => n.oportunidade === "Não").length,
      }
    : null;

  const valorComOportunidade = resultado
    ? resultado
        .filter((n) => n.oportunidade === "Sim" || n.oportunidade === "Meio")
        .reduce((s, n) => s + n.valorServico, 0)
    : 0;

  const processando = etapa === "lendo" || etapa === "classificando";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-500 flex items-center justify-center">
          <HeartPulse className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conferência de Equiparação Hospitalar</h1>
          <p className="text-sm text-muted-foreground">
            Importe os XMLs de NFS-e — a IA analisa a descrição de cada serviço e identifica oportunidade de
            equiparação hospitalar (redução de IRPJ/CSLL no lucro presumido).
          </p>
        </div>
      </div>

      {etapa !== "concluido" && (
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Arquivos XML</CardTitle>
            <CardDescription className="text-xs">
              Aceita .xml e .zip com vários XMLs de NFS-e — pode carregar múltiplos arquivos de uma vez
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !processando && inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-12 px-6 flex flex-col items-center justify-center transition-all duration-200 ${
                processando ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                isDragging
                  ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                  : "border-border hover:border-rose-300 dark:hover:border-rose-800"
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground text-center">
                Clique ou arraste os XMLs aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">.xml · .zip — sem limite de quantidade</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".xml,.zip"
                className="hidden"
                disabled={processando}
                onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ""; }}
              />
            </div>

            {arquivos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  {arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""} carregado{arquivos.length > 1 ? "s" : ""}
                </p>
                {arquivos.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border dark:border-border bg-muted/50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                    </div>
                    {!processando && (
                      <button
                        type="button"
                        onClick={() => removerArquivo(a.id)}
                        className="text-muted-foreground dark:text-muted-foreground hover:text-red-500 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {processando && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {etapa === "lendo"
                      ? `Lendo arquivos (${progresso.atual}/${progresso.total})...`
                      : `Classificando com IA (${progresso.atual}/${progresso.total})...`}
                  </span>
                  <span>{progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0}%</span>
                </div>
                <Progress value={progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0} />
              </div>
            )}

            {arquivos.length > 0 && !processando && (
              <div className="flex justify-end">
                <Button onClick={handleProcessar} className="bg-rose-600 hover:bg-rose-700 text-white">
                  <HeartPulse className="h-4 w-4 mr-2" />
                  Processar XMLs
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {etapa === "concluido" && resultado && contagem && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{resultado.length} notas analisadas</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova análise
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(OPORTUNIDADE_CONFIG) as (keyof typeof OPORTUNIDADE_CONFIG)[]).map((key) => {
              const cfg = OPORTUNIDADE_CONFIG[key];
              return (
                <Card key={key} className="border-border">
                  <CardContent className="pt-5 pb-4 text-center">
                    <cfg.icon className={`h-5 w-5 mx-auto mb-1.5 ${cfg.className}`} />
                    <p className="text-2xl font-bold text-foreground">{contagem[key]}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10">
            <CardContent className="pt-6 pb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Receita com oportunidade (Sim + Meio)
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatCurrency(valorComOportunidade)}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                de {formatCurrency(resultado.reduce((s, n) => s + n.valorServico, 0))} em receita total
              </Badge>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleBaixarExcel} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * A classificação é feita por IA com base nas regras de equiparação hospitalar e deve ser validada por um
            profissional antes de qualquer decisão fiscal.
          </p>
        </div>
      )}
    </div>
  );
}
