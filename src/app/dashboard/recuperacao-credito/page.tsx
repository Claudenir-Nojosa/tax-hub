"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportarPgdasExcel, type DeclaracaoPgdasRegistro } from "@/lib/pgdas/export-pgdas-excel";
import type { DadosPgdas, TipoDocumentoPgdas } from "@/lib/pgdas/types";
import {
  FileSearch,
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Info,
  Plus,
  Download,
  Trash2,
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

interface Cliente {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

interface Projeto {
  id: string;
  clienteId: string;
  nome: string;
}

interface DeclaracaoRow {
  id: string;
  competencia: string;
  tipoDocumento: TipoDocumentoPgdas;
  dados: DadosPgdas;
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

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarCompetencia(comp: string): string {
  const [ano, mes] = comp.split("-");
  return `${MESES_ABREV[parseInt(mes, 10) - 1] ?? mes}/${ano}`;
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

function isPdf(nome: string) {
  return /\.pdf$/i.test(nome);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RecuperacaoCreditoPage() {
  const [arquivos, setArquivos] = useState<ArquivoCarregado[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cliente e Projeto (necessários para os PDFs de Declaração/Extrato do Simples Nacional —
  // cada projeto tem seu próprio conjunto de meses importados, pra não colidir/sobrescrever
  // quando o mesmo cliente tem mais de um diagnóstico/reverificação em andamento)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);
  const [modoNovoCliente, setModoNovoCliente] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState("");
  const [novaRazaoSocial, setNovaRazaoSocial] = useState("");
  const [criandoCliente, setCriandoCliente] = useState(false);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string | null>(null);
  const [modoNovoProjeto, setModoNovoProjeto] = useState(false);
  const [novoNomeProjeto, setNovoNomeProjeto] = useState("");
  const [criandoProjeto, setCriandoProjeto] = useState(false);

  const [declaracoesPgdas, setDeclaracoesPgdas] = useState<DeclaracaoRow[]>([]);
  const [carregandoDeclaracoes, setCarregandoDeclaracoes] = useState(false);

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) ?? null;
  const projetoSelecionado = projetos.find((p) => p.id === projetoSelecionadoId) ?? null;

  const carregarClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/recuperacao-credito/clientes");
      setClientes(await res.json());
    } catch {
      toast.error("Erro ao carregar clientes");
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const carregarProjetos = useCallback(async (clienteId: string) => {
    try {
      const res = await fetch(`/api/recuperacao-credito/projetos?clienteId=${clienteId}`);
      setProjetos(await res.json());
    } catch {
      toast.error("Erro ao carregar projetos");
    }
  }, []);

  useEffect(() => {
    setProjetoSelecionadoId(null);
    if (clienteSelecionadoId) carregarProjetos(clienteSelecionadoId);
    else setProjetos([]);
  }, [clienteSelecionadoId, carregarProjetos]);

  const carregarDeclaracoes = useCallback(async (projetoId: string) => {
    setCarregandoDeclaracoes(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/pgdas?projetoId=${projetoId}`);
      setDeclaracoesPgdas(await res.json());
    } catch {
      toast.error("Erro ao carregar declarações do Simples Nacional");
    } finally {
      setCarregandoDeclaracoes(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDeclaracoes(projetoSelecionadoId);
    else setDeclaracoesPgdas([]);
  }, [projetoSelecionadoId, carregarDeclaracoes]);

  const handleCriarCliente = async () => {
    if (!novoCnpj.trim() || !novaRazaoSocial.trim()) {
      toast.error("Preencha CNPJ e Razão Social");
      return;
    }
    setCriandoCliente(true);
    try {
      const res = await fetch("/api/recuperacao-credito/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: novoCnpj.trim(), razaoSocial: novaRazaoSocial.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar cliente");
      toast.success("Cliente criado!");
      setNovoCnpj("");
      setNovaRazaoSocial("");
      setModoNovoCliente(false);
      await carregarClientes();
      setClienteSelecionadoId(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar cliente");
    } finally {
      setCriandoCliente(false);
    }
  };

  const handleCriarProjeto = async () => {
    if (!clienteSelecionadoId) return;
    if (!novoNomeProjeto.trim()) {
      toast.error("Dê um nome ao projeto");
      return;
    }
    setCriandoProjeto(true);
    try {
      const res = await fetch("/api/recuperacao-credito/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: clienteSelecionadoId, nome: novoNomeProjeto.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar projeto");
      toast.success("Projeto criado!");
      setNovoNomeProjeto("");
      setModoNovoProjeto(false);
      await carregarProjetos(clienteSelecionadoId);
      setProjetoSelecionadoId(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar projeto");
    } finally {
      setCriandoProjeto(false);
    }
  };

  const adicionarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const aceitos = Array.from(fileList).filter((f) =>
      /\.(xlsx|xls|csv|pdf)$/i.test(f.name)
    );
    const invalidos = fileList.length - aceitos.length;
    if (invalidos > 0)
      toast.warning(`${invalidos} arquivo(s) ignorado(s) — apenas .xlsx, .xls, .csv e .pdf são aceitos.`);

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

  const processarPdfsPgdas = async (pdfs: ArquivoCarregado[]) => {
    if (!projetoSelecionadoId) return;
    const form = new FormData();
    form.append("projetoId", projetoSelecionadoId);
    pdfs.forEach((a) => form.append("files", a.file, a.name));

    const res = await fetch("/api/recuperacao-credito/pgdas/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Erro ao processar PDFs do Simples Nacional");
      return;
    }
    if (data.salvos?.length > 0) {
      toast.success(`${data.salvos.length} documento(s) do Simples Nacional importado(s)!`);
    }
    for (const erro of data.erros ?? []) {
      toast.error(`${erro.arquivo}: ${erro.motivo}`);
    }
    await carregarDeclaracoes(projetoSelecionadoId);
  };

  const processarArquivosAnalise = async (outros: ArquivoCarregado[]) => {
    const formData = new FormData();
    outros.forEach((a) => formData.append("files", a.file, a.name));

    const res = await fetch("/api/recuperacao-credito", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na análise");

    setResultado(data);
  };

  const handleAnalisar = async () => {
    if (arquivos.length === 0) {
      toast.error("Adicione pelo menos um arquivo para analisar.");
      return;
    }

    const pdfs = arquivos.filter((a) => isPdf(a.name));
    const outros = arquivos.filter((a) => !isPdf(a.name));

    if (pdfs.length > 0 && (!clienteSelecionadoId || !projetoSelecionadoId)) {
      toast.error("Selecione (ou crie) um cliente e um projeto para importar os PDFs do Simples Nacional.");
      return;
    }

    setAnalisando(true);
    setResultado(null);
    try {
      if (pdfs.length > 0) await processarPdfsPgdas(pdfs);
      if (outros.length > 0) await processarArquivosAnalise(outros);
      if (outros.length > 0 && !resultado) toast.success("Análise concluída!");
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

  const handleExcluirDeclaracao = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/pgdas?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDeclaracoes(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleBaixarExcel = async () => {
    if (!clienteSelecionado || declaracoesPgdas.length === 0) return;
    const registros: DeclaracaoPgdasRegistro[] = declaracoesPgdas.map((d) => ({
      competencia: d.competencia,
      tipoDocumento: d.tipoDocumento,
      dados: d.dados,
    }));
    await exportarPgdasExcel(registros, clienteSelecionado.razaoSocial);
  };

  const mesesAgrupados = Array.from(new Set(declaracoesPgdas.map((d) => d.competencia)))
    .sort()
    .map((competencia) => {
      const doMes = declaracoesPgdas.filter((d) => d.competencia === competencia);
      return {
        competencia,
        tipos: doMes.map((d) => d.tipoDocumento),
        receita: doMes[0]?.dados.rpa.total ?? 0,
      };
    });

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
                Aceita .xlsx, .xls, .csv e PDFs de Declaração/Extrato do Simples Nacional — você pode carregar
                múltiplos arquivos de uma vez
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
          {/* Cliente — necessário só para os PDFs do Simples Nacional */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 dark:text-gray-400">
              Cliente <span className="font-normal text-gray-400">(cliente + projeto são necessários para importar PDFs do Simples Nacional)</span>
            </Label>
            {modoNovoCliente ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="CNPJ"
                  value={novoCnpj}
                  onChange={(e) => setNovoCnpj(e.target.value)}
                  className="sm:max-w-[200px]"
                />
                <Input
                  placeholder="Razão Social"
                  value={novaRazaoSocial}
                  onChange={(e) => setNovaRazaoSocial(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCriarCliente} disabled={criandoCliente}>
                    {criandoCliente ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setModoNovoCliente(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={clienteSelecionadoId ?? undefined} onValueChange={setClienteSelecionadoId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razaoSocial} — {c.cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setModoNovoCliente(true)} title="Novo cliente">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Projeto — escopo dos meses importados; um cliente pode ter vários projetos */}
          {clienteSelecionado && (
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">
                Projeto <span className="font-normal text-gray-400">({clienteSelecionado.razaoSocial})</span>
              </Label>
              {modoNovoProjeto ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Nome do projeto (ex.: Reverificação 2026)"
                    value={novoNomeProjeto}
                    onChange={(e) => setNovoNomeProjeto(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCriarProjeto} disabled={criandoProjeto}>
                      {criandoProjeto ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setModoNovoProjeto(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={projetoSelecionadoId ?? undefined} onValueChange={setProjetoSelecionadoId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projetos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setModoNovoProjeto(true)} title="Novo projeto">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

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
              .xlsx · .xls · .csv · .pdf — sem limite de quantidade
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf"
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
                    {isPdf(a.name) ? (
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
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

          {/* Meses do Simples Nacional já importados para o projeto selecionado */}
          {projetoSelecionado && (carregandoDeclaracoes || mesesAgrupados.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                Simples Nacional importado — {clienteSelecionado?.razaoSocial} · {projetoSelecionado.nome}
              </p>
              {carregandoDeclaracoes ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competência</TableHead>
                        <TableHead>Documentos</TableHead>
                        <TableHead className="text-right">Receita Bruta do PA</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mesesAgrupados.map((m) => (
                        <TableRow key={m.competencia}>
                          <TableCell className="font-medium">{formatarCompetencia(m.competencia)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {m.tipos.includes("DECLARACAO") && <Badge variant="outline" className="text-xs">Declaração</Badge>}
                              {m.tipos.includes("EXTRATO") && <Badge variant="outline" className="text-xs">Extrato</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(m.receita)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {declaracoesPgdas
                                .filter((d) => d.competencia === m.competencia)
                                .map((d) => (
                                  <button
                                    key={d.id}
                                    onClick={() => handleExcluirDeclaracao(d.id)}
                                    title={`Remover ${d.tipoDocumento === "DECLARACAO" ? "Declaração" : "Extrato"}`}
                                    className="text-gray-400 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleBaixarExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Excel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner (shown before first analysis) */}
      {!resultado && arquivos.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Como funciona:</span> carregue os arquivos Excel com dados fiscais e
            contábeis da empresa (SPED, EFD, DRE, notas fiscais, etc.) ou os PDFs de Declaração/Extrato do Simples
            Nacional — o sistema reconhece o tipo de cada arquivo automaticamente e processa cada um do jeito certo.
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
                Processando arquivos...
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
    </div>
  );
}
