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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { exportarPgdasExcel, type DeclaracaoPgdasRegistro } from "@/lib/pgdas/export-pgdas-excel";
import type { DadosPgdas, TipoDocumentoPgdas } from "@/lib/pgdas/types";
import type { DeclaracaoEfdRegistro } from "@/lib/efd-icms-excel";
import type { DadosEfdIcmsIpi } from "@/lib/efd-icms-parser";
import type { DeclaracaoEfdContribuicoesRegistro } from "@/lib/efd-contribuicoes-excel";
import type { DadosEfdContribuicoes } from "@/lib/efd-contribuicoes-parser";
import { labelTributo, type DadosComprovantePagamento } from "@/lib/comprovante-pagamento-parser";
import { valorLinhaEcf, type DadosEcf } from "@/lib/ecf-parser";
import type { DeclaracaoEcfRegistro } from "@/lib/ecf-excel";
import type { DadosDctfWeb } from "@/lib/dctfweb-parser";
import type { DadosDctf } from "@/lib/dctf-parser";
import type { DeclaracaoDctfWebRegistro, DeclaracaoDctfRegistro } from "@/lib/dctf-excel";
import type { DadosFontesPagadoras } from "@/lib/fontes-pagadoras-parser";
import type { DeclaracaoFontesPagadorasRegistro } from "@/lib/fontes-pagadoras-excel";
import type { DadosEcd } from "@/lib/ecd-parser";
import type { DeclaracaoEcdRegistro } from "@/lib/ecd-excel";
import { exportarDeclaracaoFiscalExcel, type IncluirAbas } from "@/lib/recuperacao-credito-excel";
import type { DadosCadastroEmpresa } from "@/lib/cadastro-parser";
import { resumoSimples } from "@/lib/cadastro-excel";
import { calcularAntecipacaoItem, elegivelAntecipacaoIcmsSt, parseDataBr } from "@/lib/icms-st-antecipacao-ce";
import { SecaoColapsavel, GraficoBarras, GraficoSeries, ListaArquivosColapsavel } from "@/components/recuperacao-credito/painel-importados";
import SelecionarAbasExportDialog, { type OpcaoAbaExport } from "@/components/recuperacao-credito/SelecionarAbasExportDialog";
import {
  FileSearch,
  Upload,
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
  Pencil,
  Check,
  Users,
  Building2,
  FolderOpen,
  ArrowRight,
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
  updatedAt: string;
  totalProjetos: number;
}

interface Projeto {
  id: string;
  clienteId: string;
  nome: string;
  updatedAt: string;
  totalDocumentos: number;
}

interface DeclaracaoRow {
  id: string;
  competencia: string;
  tipoDocumento: TipoDocumentoPgdas;
  dados: DadosPgdas;
}

interface DeclaracaoEfdRow {
  id: string;
  competencia: string;
  dados: DadosEfdIcmsIpi;
}

interface DeclaracaoEfdContribuicoesRow {
  id: string;
  competencia: string;
  dados: DadosEfdContribuicoes;
}

interface DeclaracaoComprovanteRow {
  id: string;
  numeroDocumento: string;
  dados: DadosComprovantePagamento;
}

interface DeclaracaoEcfRow {
  id: string;
  competencia: string; // ano-calendário "YYYY"
  dados: DadosEcf;
}

interface DeclaracaoDctfWebRow {
  id: string;
  competencia: string; // "YYYY-MM"
  dados: DadosDctfWeb;
}

interface DeclaracaoDctfRow {
  id: string;
  competencia: string; // "YYYY-MM"
  dados: DadosDctf;
}

interface DeclaracaoFontesRow {
  id: string;
  competencia: string; // ano "YYYY"
  dados: DadosFontesPagadoras;
}

interface DeclaracaoEcdRow {
  id: string;
  competencia: string; // ano "YYYY"
  dados: DadosEcd;
}

interface CadastroRow {
  id: string;
  projetoId: string;
  cnpj: string;
  dados: DadosCadastroEmpresa;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// "atualizado em" nos cards de cliente/projeto — data curta, sem hora
function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
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
    badge: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary",
    dot: "bg-primary",
  },
};

function isPdf(nome: string) {
  return /\.pdf$/i.test(nome);
}

function isEfd(nome: string) {
  // .txt = EFD ICMS/IPI, EFD Contribuições, ECF · .dec = DCTF Mensal — todos vão pro mesmo endpoint
  return /\.(txt|dec)$/i.test(nome);
}

// Lê a resposta como JSON com segurança — hosts serverless (Vercel) devolvem corpo não-JSON
// ("Request Entity Too Large" em texto puro, sem CORS/JSON) quando o payload de upload excede o
// limite da plataforma (~4.5MB), e `res.json()` direto quebra com "Unexpected token" nesse caso,
// mascarando a causa real do erro.
async function parseRespostaJson(res: Response): Promise<Record<string, unknown>> {
  const texto = await res.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      res.status === 413 || /request entity too large/i.test(texto)
        ? "Os arquivos enviados são grandes demais para uma única importação — tente enviar menos arquivos de uma vez."
        : `Erro inesperado do servidor (${res.status}).`
    );
  }
}

// Limite de payload por requisição de upload, com margem de segurança abaixo do limite de ~4.5MB
// de request body de funções serverless (Vercel) — nunca manda um lote maior que isso de uma vez.
const TAMANHO_MAX_LOTE_BYTES = 3.5 * 1024 * 1024;

function dividirEmLotes(arquivos: ArquivoCarregado[]): ArquivoCarregado[][] {
  const lotes: ArquivoCarregado[][] = [];
  let loteAtual: ArquivoCarregado[] = [];
  let tamanhoAtual = 0;
  for (const a of arquivos) {
    if (loteAtual.length > 0 && tamanhoAtual + a.size > TAMANHO_MAX_LOTE_BYTES) {
      lotes.push(loteAtual);
      loteAtual = [];
      tamanhoAtual = 0;
    }
    loteAtual.push(a);
    tamanhoAtual += a.size;
  }
  if (loteAtual.length > 0) lotes.push(loteAtual);
  return lotes;
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
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null);
  const [modoNovoCliente, setModoNovoCliente] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState("");
  const [novaRazaoSocial, setNovaRazaoSocial] = useState("");
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [excluindoClienteId, setExcluindoClienteId] = useState<string | null>(null);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [carregandoProjetos, setCarregandoProjetos] = useState(false);
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string | null>(null);
  const [modoNovoProjeto, setModoNovoProjeto] = useState(false);
  const [novoNomeProjeto, setNovoNomeProjeto] = useState("");
  const [criandoProjeto, setCriandoProjeto] = useState(false);
  // id do card em edição de nome — null quando nenhum projeto está sendo renomeado (rename agora
  // acontece direto no card da galeria, não precisa mais o projeto estar "aberto")
  const [projetoEditandoId, setProjetoEditandoId] = useState<string | null>(null);
  const [nomeRenomeado, setNomeRenomeado] = useState("");
  const [renomeandoProjeto, setRenomeandoProjeto] = useState(false);
  const [excluindoProjetoId, setExcluindoProjetoId] = useState<string | null>(null);

  const [declaracoesPgdas, setDeclaracoesPgdas] = useState<DeclaracaoRow[]>([]);
  const [carregandoDeclaracoes, setCarregandoDeclaracoes] = useState(false);
  const [dialogAbasAberto, setDialogAbasAberto] = useState(false);

  const [declaracoesEfd, setDeclaracoesEfd] = useState<DeclaracaoEfdRow[]>([]);
  const [carregandoDeclaracoesEfd, setCarregandoDeclaracoesEfd] = useState(false);

  const [declaracoesEfdContrib, setDeclaracoesEfdContrib] = useState<DeclaracaoEfdContribuicoesRow[]>([]);
  const [carregandoDeclaracoesEfdContrib, setCarregandoDeclaracoesEfdContrib] = useState(false);

  const [declaracoesComprovante, setDeclaracoesComprovante] = useState<DeclaracaoComprovanteRow[]>([]);
  const [carregandoDeclaracoesComprovante, setCarregandoDeclaracoesComprovante] = useState(false);

  const [declaracoesEcf, setDeclaracoesEcf] = useState<DeclaracaoEcfRow[]>([]);
  const [carregandoDeclaracoesEcf, setCarregandoDeclaracoesEcf] = useState(false);

  const [declaracoesDctfWeb, setDeclaracoesDctfWeb] = useState<DeclaracaoDctfWebRow[]>([]);
  const [declaracoesDctf, setDeclaracoesDctf] = useState<DeclaracaoDctfRow[]>([]);
  const [carregandoDctf, setCarregandoDctf] = useState(false);

  const [declaracoesFontes, setDeclaracoesFontes] = useState<DeclaracaoFontesRow[]>([]);
  const [carregandoFontes, setCarregandoFontes] = useState(false);

  const [declaracoesEcd, setDeclaracoesEcd] = useState<DeclaracaoEcdRow[]>([]);
  const [carregandoEcd, setCarregandoEcd] = useState(false);

  const [cadastro, setCadastro] = useState<CadastroRow | null>(null);
  const [carregandoCadastro, setCarregandoCadastro] = useState(false);

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) ?? null;
  const projetoSelecionado = projetos.find((p) => p.id === projetoSelecionadoId) ?? null;

  const carregarClientes = useCallback(async () => {
    setCarregandoClientes(true);
    try {
      const res = await fetch("/api/recuperacao-credito/clientes");
      setClientes(await res.json());
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setCarregandoClientes(false);
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const carregarProjetos = useCallback(async (clienteId: string) => {
    setCarregandoProjetos(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/projetos?clienteId=${clienteId}`);
      setProjetos(await res.json());
    } catch {
      toast.error("Erro ao carregar projetos");
    } finally {
      setCarregandoProjetos(false);
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

  const carregarDeclaracoesEfd = useCallback(async (projetoId: string) => {
    setCarregandoDeclaracoesEfd(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/efd?projetoId=${projetoId}`);
      setDeclaracoesEfd(await res.json());
    } catch {
      toast.error("Erro ao carregar declarações de ICMS/IPI");
    } finally {
      setCarregandoDeclaracoesEfd(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDeclaracoesEfd(projetoSelecionadoId);
    else setDeclaracoesEfd([]);
  }, [projetoSelecionadoId, carregarDeclaracoesEfd]);

  const carregarDeclaracoesEfdContrib = useCallback(async (projetoId: string) => {
    setCarregandoDeclaracoesEfdContrib(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/efd-contribuicoes?projetoId=${projetoId}`);
      setDeclaracoesEfdContrib(await res.json());
    } catch {
      toast.error("Erro ao carregar declarações de PIS/COFINS");
    } finally {
      setCarregandoDeclaracoesEfdContrib(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDeclaracoesEfdContrib(projetoSelecionadoId);
    else setDeclaracoesEfdContrib([]);
  }, [projetoSelecionadoId, carregarDeclaracoesEfdContrib]);

  const carregarDeclaracoesComprovante = useCallback(async (projetoId: string) => {
    setCarregandoDeclaracoesComprovante(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/comprovante-pagamento?projetoId=${projetoId}`);
      setDeclaracoesComprovante(await res.json());
    } catch {
      toast.error("Erro ao carregar comprovantes de pagamento");
    } finally {
      setCarregandoDeclaracoesComprovante(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDeclaracoesComprovante(projetoSelecionadoId);
    else setDeclaracoesComprovante([]);
  }, [projetoSelecionadoId, carregarDeclaracoesComprovante]);

  // atenção ao nome: "Ecf" (IRPJ/CSLL) ≠ "Efd" (ICMS/IPI), que já existe acima
  const carregarDeclaracoesEcf = useCallback(async (projetoId: string) => {
    setCarregandoDeclaracoesEcf(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/ecf?projetoId=${projetoId}`);
      setDeclaracoesEcf(await res.json());
    } catch {
      toast.error("Erro ao carregar ECFs (IRPJ/CSLL)");
    } finally {
      setCarregandoDeclaracoesEcf(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDeclaracoesEcf(projetoSelecionadoId);
    else setDeclaracoesEcf([]);
  }, [projetoSelecionadoId, carregarDeclaracoesEcf]);

  // DCTFWeb (PDF) e DCTF (.dec) — carregados juntos (aparecem na mesma seção da UI)
  const carregarDctfTudo = useCallback(async (projetoId: string) => {
    setCarregandoDctf(true);
    try {
      const [web, dctf] = await Promise.all([
        fetch(`/api/recuperacao-credito/dctfweb?projetoId=${projetoId}`).then((r) => r.json()),
        fetch(`/api/recuperacao-credito/dctf?projetoId=${projetoId}`).then((r) => r.json()),
      ]);
      setDeclaracoesDctfWeb(web);
      setDeclaracoesDctf(dctf);
    } catch {
      toast.error("Erro ao carregar DCTF/DCTFWeb");
    } finally {
      setCarregandoDctf(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarDctfTudo(projetoSelecionadoId);
    else {
      setDeclaracoesDctfWeb([]);
      setDeclaracoesDctf([]);
    }
  }, [projetoSelecionadoId, carregarDctfTudo]);

  const carregarFontes = useCallback(async (projetoId: string) => {
    setCarregandoFontes(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/fontes-pagadoras?projetoId=${projetoId}`);
      setDeclaracoesFontes(await res.json());
    } catch {
      toast.error("Erro ao carregar Fontes Pagadoras");
    } finally {
      setCarregandoFontes(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarFontes(projetoSelecionadoId);
    else setDeclaracoesFontes([]);
  }, [projetoSelecionadoId, carregarFontes]);

  const carregarEcd = useCallback(async (projetoId: string) => {
    setCarregandoEcd(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/ecd?projetoId=${projetoId}`);
      setDeclaracoesEcd(await res.json());
    } catch {
      toast.error("Erro ao carregar ECD (Balanço Patrimonial)");
    } finally {
      setCarregandoEcd(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarEcd(projetoSelecionadoId);
    else setDeclaracoesEcd([]);
  }, [projetoSelecionadoId, carregarEcd]);

  const carregarCadastro = useCallback(async (projetoId: string) => {
    setCarregandoCadastro(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/cadastro?projetoId=${projetoId}`);
      setCadastro(await res.json());
    } catch {
      toast.error("Erro ao carregar dados cadastrais");
    } finally {
      setCarregandoCadastro(false);
    }
  }, []);

  useEffect(() => {
    if (projetoSelecionadoId) carregarCadastro(projetoSelecionadoId);
    else setCadastro(null);
  }, [projetoSelecionadoId, carregarCadastro]);

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

  // recebe o id explicitamente (não mais o "projeto aberto") — a galeria de cards permite
  // renomear qualquer projeto da lista, não só o que está selecionado/aberto no momento
  const handleRenomearProjeto = async (projetoId: string, novoNome: string) => {
    if (!clienteSelecionadoId) return;
    if (!novoNome.trim()) {
      toast.error("Dê um nome ao projeto");
      return;
    }
    setRenomeandoProjeto(true);
    try {
      const res = await fetch(`/api/recuperacao-credito/projetos/${projetoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao renomear projeto");
      toast.success("Projeto renomeado!");
      setProjetoEditandoId(null);
      await carregarProjetos(clienteSelecionadoId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao renomear projeto");
    } finally {
      setRenomeandoProjeto(false);
    }
  };

  const handleExcluirProjeto = async (projeto: Projeto) => {
    if (!clienteSelecionadoId) return;
    if (!confirm(`Excluir o projeto "${projeto.nome}" e todas as declarações importadas nele?`)) return;
    setExcluindoProjetoId(projeto.id);
    try {
      const res = await fetch(`/api/recuperacao-credito/projetos/${projeto.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir projeto");
      toast.success("Projeto excluído");
      if (projetoSelecionadoId === projeto.id) setProjetoSelecionadoId(null);
      await carregarProjetos(clienteSelecionadoId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir projeto");
    } finally {
      setExcluindoProjetoId(null);
    }
  };

  const handleExcluirCliente = async (cliente: Cliente) => {
    if (!confirm(`Excluir o cliente "${cliente.razaoSocial}" e todos os projetos/declarações associados? Essa ação não pode ser desfeita.`)) return;
    setExcluindoClienteId(cliente.id);
    try {
      const res = await fetch(`/api/recuperacao-credito/clientes/${cliente.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir cliente");
      toast.success("Cliente excluído");
      if (clienteSelecionadoId === cliente.id) setClienteSelecionadoId(null);
      await carregarClientes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir cliente");
    } finally {
      setExcluindoClienteId(null);
    }
  };

  const adicionarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const aceitos = Array.from(fileList).filter((f) =>
      /\.(xlsx|xls|csv|pdf|txt|dec)$/i.test(f.name)
    );
    const invalidos = fileList.length - aceitos.length;
    if (invalidos > 0)
      toast.warning(`${invalidos} arquivo(s) ignorado(s) — apenas .xlsx, .xls, .csv, .pdf, .txt e .dec são aceitos.`);

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

  // Um único endpoint recebe qualquer PDF e detecta sozinho se é Declaração/Extrato do Simples
  // Nacional ou Comprovante de Arrecadação de DARF pelo conteúdo — por isso recarrega as duas
  // listas depois. Envia em lotes (ver dividirEmLotes) pra não estourar o limite de payload de
  // upload da plataforma quando o usuário solta vários PDFs de uma vez.
  const processarPdfs = async (pdfs: ArquivoCarregado[]) => {
    if (!projetoSelecionadoId) return;
    const salvos: { tipo: string; detalhe: string }[] = [];
    const erros: { arquivo: string; motivo: string }[] = [];

    for (const lote of dividirEmLotes(pdfs)) {
      const form = new FormData();
      form.append("projetoId", projetoSelecionadoId);
      lote.forEach((a) => form.append("files", a.file, a.name));

      try {
        const res = await fetch("/api/recuperacao-credito/pdf/upload", { method: "POST", body: form });
        const data = await parseRespostaJson(res);
        if (!res.ok) {
          erros.push({ arquivo: lote.map((a) => a.name).join(", "), motivo: (data.error as string) ?? "Erro ao processar PDFs" });
          continue;
        }
        salvos.push(...((data.salvos as { tipo: string; detalhe: string }[]) ?? []));
        erros.push(...((data.erros as { arquivo: string; motivo: string }[]) ?? []));
      } catch (e) {
        erros.push({ arquivo: lote.map((a) => a.name).join(", "), motivo: e instanceof Error ? e.message : "Erro ao processar PDFs" });
      }
    }

    const salvosPgdas = salvos.filter((s) => s.tipo === "PGDAS").length;
    const salvosComprovante = salvos.filter((s) => s.tipo === "COMPROVANTE");
    const salvosDctfWeb = salvos.filter((s) => s.tipo === "DCTFWEB").length;
    const salvosFontes = salvos.filter((s) => s.tipo === "FONTES").length;
    if (salvosPgdas > 0) toast.success(`${salvosPgdas} documento(s) do Simples Nacional importado(s)!`);
    if (salvosComprovante.length > 0) {
      const totalDarfs = salvosComprovante.reduce((s, item) => s + (parseInt(item.detalhe, 10) || 0), 0);
      toast.success(`${totalDarfs} DARF(s) importado(s) do Comprovante de Arrecadação!`);
    }
    if (salvosDctfWeb > 0) toast.success(`${salvosDctfWeb} DCTFWeb importada(s)!`);
    if (salvosFontes > 0) toast.success(`${salvosFontes} relatório(s) de Fontes Pagadoras importado(s)!`);
    const salvosCadastro = salvos.filter((s) => s.tipo === "CADASTRO");
    for (const s of salvosCadastro) toast.success(`Cadastro importado: ${s.detalhe}`);
    for (const erro of erros) {
      toast.error(`${erro.arquivo}: ${erro.motivo}`);
    }
    await Promise.all([
      carregarDeclaracoes(projetoSelecionadoId),
      carregarDeclaracoesComprovante(projetoSelecionadoId),
      carregarDctfTudo(projetoSelecionadoId),
      carregarFontes(projetoSelecionadoId),
      carregarCadastro(projetoSelecionadoId),
    ]);
  };

  // Um único endpoint recebe qualquer EFD (.txt) e detecta sozinho se é ICMS/IPI ou
  // Contribuições (PIS/COFINS) pelo conteúdo — por isso recarrega as duas listas depois. Também
  // enviado em lotes, mesmo motivo do processarPdfs.
  const processarEfds = async (efds: ArquivoCarregado[]) => {
    if (!projetoSelecionadoId) return;
    const salvos: { tipo: string }[] = [];
    const erros: { arquivo: string; motivo: string }[] = [];

    for (const lote of dividirEmLotes(efds)) {
      const form = new FormData();
      form.append("projetoId", projetoSelecionadoId);
      lote.forEach((a) => form.append("files", a.file, a.name));

      try {
        const res = await fetch("/api/recuperacao-credito/efd/upload", { method: "POST", body: form });
        const data = await parseRespostaJson(res);
        if (!res.ok) {
          erros.push({ arquivo: lote.map((a) => a.name).join(", "), motivo: (data.error as string) ?? "Erro ao processar EFDs" });
          continue;
        }
        salvos.push(...((data.salvos as { tipo: string }[]) ?? []));
        erros.push(...((data.erros as { arquivo: string; motivo: string }[]) ?? []));
      } catch (e) {
        erros.push({ arquivo: lote.map((a) => a.name).join(", "), motivo: e instanceof Error ? e.message : "Erro ao processar EFDs" });
      }
    }

    const salvosIcms = salvos.filter((s) => s.tipo === "ICMS_IPI").length;
    const salvosContrib = salvos.filter((s) => s.tipo === "CONTRIBUICOES").length;
    const salvosEcf = salvos.filter((s) => s.tipo === "ECF").length;
    const salvosDctf = salvos.filter((s) => s.tipo === "DCTF").length;
    const salvosEcd = salvos.filter((s) => s.tipo === "ECD").length;
    if (salvosIcms > 0) toast.success(`${salvosIcms} EFD(s) de ICMS/IPI importado(s)!`);
    if (salvosContrib > 0) toast.success(`${salvosContrib} EFD(s) de Contribuições (PIS/COFINS) importado(s)!`);
    if (salvosEcf > 0) toast.success(`${salvosEcf} ECF(s) de IRPJ/CSLL importada(s)!`);
    if (salvosDctf > 0) toast.success(`${salvosDctf} DCTF importada(s)!`);
    if (salvosEcd > 0) toast.success(`${salvosEcd} ECD (Balanço Patrimonial) importada(s)!`);
    for (const erro of erros) {
      toast.error(`${erro.arquivo}: ${erro.motivo}`);
    }
    await Promise.all([
      carregarDeclaracoesEfd(projetoSelecionadoId),
      carregarDeclaracoesEfdContrib(projetoSelecionadoId),
      carregarDeclaracoesEcf(projetoSelecionadoId),
      carregarDctfTudo(projetoSelecionadoId),
      carregarEcd(projetoSelecionadoId),
    ]);
  };

  const processarArquivosAnalise = async (outros: ArquivoCarregado[]) => {
    const formData = new FormData();
    outros.forEach((a) => formData.append("files", a.file, a.name));

    const res = await fetch("/api/recuperacao-credito", { method: "POST", body: formData });
    const data = await parseRespostaJson(res);
    if (!res.ok) throw new Error((data.error as string) || "Erro na análise");

    setResultado(data as unknown as ResultadoAnalise);
  };

  const handleAnalisar = async () => {
    if (arquivos.length === 0) {
      toast.error("Adicione pelo menos um arquivo para analisar.");
      return;
    }

    const pdfs = arquivos.filter((a) => isPdf(a.name));
    const efds = arquivos.filter((a) => isEfd(a.name));
    const outros = arquivos.filter((a) => !isPdf(a.name) && !isEfd(a.name));

    if ((pdfs.length > 0 || efds.length > 0) && (!clienteSelecionadoId || !projetoSelecionadoId)) {
      toast.error("Selecione (ou crie) um cliente e um projeto para importar PDFs ou EFDs.");
      return;
    }

    setAnalisando(true);
    setResultado(null);
    try {
      if (pdfs.length > 0) await processarPdfs(pdfs);
      if (efds.length > 0) await processarEfds(efds);
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

  const handleExcluirDeclaracaoEfd = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/efd?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDeclaracoesEfd(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirDeclaracaoEfdContrib = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/efd-contribuicoes?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDeclaracoesEfdContrib(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirDeclaracaoEcf = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/ecf?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDeclaracoesEcf(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirDctfWeb = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/dctfweb?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDctfTudo(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirDctf = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/dctf?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarDctfTudo(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirFontes = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/fontes-pagadoras?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarFontes(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleExcluirEcd = async (id: string) => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/ecd?id=${id}`, { method: "DELETE" });
      toast.success("Removido");
      await carregarEcd(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // A UI mostra os comprovantes consolidados por ano (sem linha por DARF), então a exclusão
  // também é em bloco: remove todos os DARFs importados do projeto de uma vez.
  const handleExcluirComprovantes = async () => {
    if (!projetoSelecionadoId) return;
    if (!confirm(`Remover todos os ${declaracoesComprovante.length} DARF(s) importados deste projeto?`)) return;
    try {
      await fetch(`/api/recuperacao-credito/comprovante-pagamento?projetoId=${projetoSelecionadoId}`, {
        method: "DELETE",
      });
      toast.success("Comprovantes removidos");
      await carregarDeclaracoesComprovante(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // Um botão só: monta um Excel com a(s) aba(s) do que existir no projeto (ICMS/IPI, PIS/COFINS,
  // IRPJ/CSLL e/ou Comprovante de Pagamentos) — nunca vários arquivos separados quando mais de
  // um tipo foi importado junto.
  const handleExcluirCadastro = async () => {
    if (!projetoSelecionadoId) return;
    try {
      await fetch(`/api/recuperacao-credito/cadastro?projetoId=${projetoSelecionadoId}`, { method: "DELETE" });
      toast.success("Cadastro removido");
      await carregarCadastro(projetoSelecionadoId);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const montarDadosExportFiscal = () => {
    const icms: DeclaracaoEfdRegistro[] = declaracoesEfd.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    const pisCofins: DeclaracaoEfdContribuicoesRegistro[] = declaracoesEfdContrib.map((d) => ({
      competencia: d.competencia,
      dados: d.dados,
    }));
    const comprovantes: DadosComprovantePagamento[] = declaracoesComprovante.map((d) => d.dados);
    const ecf: DeclaracaoEcfRegistro[] = declaracoesEcf.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    const dctfWeb: DeclaracaoDctfWebRegistro[] = declaracoesDctfWeb.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    const dctf: DeclaracaoDctfRegistro[] = declaracoesDctf.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    const fontesPagadoras: DeclaracaoFontesPagadorasRegistro[] = declaracoesFontes.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    const ecd: DeclaracaoEcdRegistro[] = declaracoesEcd.map((d) => ({ competencia: d.competencia, dados: d.dados }));
    return { icms, pisCofins, comprovantes, ecf, dctfWeb, dctf, fontesPagadoras, ecd, cadastro: cadastro?.dados ?? null };
  };

  // Um checkbox por tipo de declaração PRESENTE no projeto (mesmos agrupamentos das seções da
  // página) — Checklist fica de fora da lista porque sempre entra no arquivo.
  const opcoesAbasExport = (): OpcaoAbaExport[] => {
    const opcoes: OpcaoAbaExport[] = [];
    if (declaracoesEfd.length > 0) opcoes.push({ key: "icms", label: "ICMS e IPI (inclui Entradas)" });
    if (declaracoesEfd.length > 0 && elegivelIcmsSt) opcoes.push({ key: "antecipacaoIcmsSt", label: "Antecipação ICMS-ST (Ceará)" });
    if (declaracoesEfdContrib.length > 0) opcoes.push({ key: "pisCofins", label: "PIS e COFINS" });
    if (declaracoesEcf.length > 0) opcoes.push({ key: "ecf", label: "IRPJ e CSLL" });
    if (declaracoesEcd.length > 0) opcoes.push({ key: "ecd", label: "Balanço Patrimonial (ECD)" });
    if (declaracoesDctfWeb.length > 0 || declaracoesDctf.length > 0) opcoes.push({ key: "dctf", label: "DCTF e DCTFWeb" });
    if (declaracoesFontes.length > 0) opcoes.push({ key: "fontes", label: "Fontes Pagadoras" });
    if (declaracoesComprovante.length > 0) opcoes.push({ key: "comprovantes", label: "Comprovante de Pagamentos" });
    if (cadastro) opcoes.push({ key: "cadastro", label: "Cadastro (Menu)" });
    return opcoes;
  };

  const handleBaixarExcelFiscal = async () => {
    if (!clienteSelecionado) return;
    const opcoes = opcoesAbasExport();
    if (opcoes.length === 0) return;
    // Com só 1 tipo de declaração não faz sentido perguntar quais abas — exporta direto.
    if (opcoes.length === 1) {
      await exportarDeclaracaoFiscalExcel(clienteSelecionado.razaoSocial, montarDadosExportFiscal());
      return;
    }
    setDialogAbasAberto(true);
  };

  const handleConfirmarAbasExport = async (incluir: IncluirAbas) => {
    if (!clienteSelecionado) return;
    await exportarDeclaracaoFiscalExcel(clienteSelecionado.razaoSocial, montarDadosExportFiscal(), incluir);
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

  const mesesEfdOrdenados = [...declaracoesEfd].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const mesesEfdContribOrdenados = [...declaracoesEfdContrib].sort((a, b) => a.competencia.localeCompare(b.competencia));

  // Antecipação ICMS-ST (Ceará) — só calcula quando o cliente é elegível (UF CE + CNAE têxtil no
  // Cartão CNPJ). Reaproveita os itens já lidos das abas Entradas de todos os EFDs ICMS/IPI do
  // projeto (linhasEntrada), sem precisar de upload separado.
  const elegivelIcmsSt = elegivelAntecipacaoIcmsSt(cadastro?.dados.consultaCnpj ?? null);
  const linhasEntradaTodas = elegivelIcmsSt ? declaracoesEfd.flatMap((d) => d.dados.linhasEntrada ?? []) : [];
  const resultadosAntecipacaoIcmsSt = linhasEntradaTodas.map((linha) => ({ linha, resultado: calcularAntecipacaoItem(linha) }));
  const aplicaveisAntecipacaoIcmsSt = resultadosAntecipacaoIcmsSt.filter((r) => r.resultado);
  const totalGeralAntecipacaoIcmsSt = aplicaveisAntecipacaoIcmsSt.reduce((s, r) => s + r.resultado!.valor, 0);
  const totalPorCompetenciaAntecipacaoIcmsSt = Array.from(
    aplicaveisAntecipacaoIcmsSt
      .reduce((mapa, r) => {
        const d = parseDataBr(r.linha.dataEntradaSaida);
        const chave = d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` : "?";
        mapa.set(chave, (mapa.get(chave) ?? 0) + r.resultado!.valor);
        return mapa;
      }, new Map<string, number>())
      .entries()
  ).sort(([a], [b]) => a.localeCompare(b));

  // Anos de ECF, com IRPJ/CSLL "a pagar" somados dos períodos (P300 código 15 / P500 código 13)
  const anosEcfOrdenados = [...declaracoesEcf]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((d) => ({
      id: d.id,
      ano: d.competencia,
      irpjAPagar: d.dados.periodos.reduce((s, p) => s + valorLinhaEcf(p.p300, "15"), 0),
      csllAPagar: d.dados.periodos.reduce((s, p) => s + valorLinhaEcf(p.p500, "13"), 0),
    }));

  const dctfWebOrdenadas = [...declaracoesDctfWeb].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const dctfOrdenadas = [...declaracoesDctf].sort((a, b) => a.competencia.localeCompare(b.competencia));
  const fontesOrdenadas = [...declaracoesFontes]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((d) => ({
      id: d.id,
      ano: d.competencia,
      qtdFontes: d.dados.fontes.length,
      totalImposto: d.dados.fontes.reduce((s, f) => s + f.codigos.reduce((a, c) => a + c.imposto, 0), 0),
    }));
  const ecdOrdenadas = [...declaracoesEcd]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((d) => ({ id: d.id, ano: d.competencia, qtdContas: d.dados.contas.length }));
  // Consolidação por ano (do Período de Apuração) dos valores pagos de PIS/COFINS/IRPJ/CSLL —
  // é o que a UI mostra em vez de listar cada DARF (o detalhamento por DARF continua no Excel).
  // Códigos de receita fora desses 4 tributos (INSS, multas, TJLP etc.) ficam de fora da tabela.
  const TRIBUTOS_CONSOLIDADOS = ["PIS", "COFINS", "IRPJ", "CSLL"] as const;
  const comprovantesPorAno = (() => {
    const porAno = new Map<string, Record<(typeof TRIBUTOS_CONSOLIDADOS)[number], number>>();
    for (const d of declaracoesComprovante) {
      const ano = d.dados.periodoApuracao.slice(6); // "DD/MM/AAAA" -> "AAAA"
      if (!ano) continue;
      let linha = porAno.get(ano);
      if (!linha) {
        linha = { PIS: 0, COFINS: 0, IRPJ: 0, CSLL: 0 };
        porAno.set(ano, linha);
      }
      for (const codigo of d.dados.codigos) {
        const tributo = labelTributo(codigo.codigo) as (typeof TRIBUTOS_CONSOLIDADOS)[number] | null;
        if (tributo && tributo in linha) linha[tributo] += codigo.total;
      }
    }
    return [...porAno.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, valores]) => ({ ano, ...valores, total: valores.PIS + valores.COFINS + valores.IRPJ + valores.CSLL }));
  })();

  // Linha de rodapé da tabela consolidada: total de cada coluna (tributo) somando todos os anos
  const comprovantesTotalGeral = comprovantesPorAno.reduce(
    (acc, linha) => ({
      PIS: acc.PIS + linha.PIS,
      COFINS: acc.COFINS + linha.COFINS,
      IRPJ: acc.IRPJ + linha.IRPJ,
      CSLL: acc.CSLL + linha.CSLL,
      total: acc.total + linha.total,
    }),
    { PIS: 0, COFINS: 0, IRPJ: 0, CSLL: 0, total: 0 }
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const hero = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
            <FileSearch className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Recuperação de Crédito
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
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
  );

  // Diálogos de criação (Novo Cliente / Novo Projeto) — usados tanto na galeria quanto reabertos
  // de dentro de um projeto já aberto (breadcrumb), por isso ficam fora do "if" abaixo.
  const dialogos = (
    <>
      <Dialog
        open={modoNovoCliente}
        onOpenChange={(open) => {
          setModoNovoCliente(open);
          if (!open) { setNovoCnpj(""); setNovaRazaoSocial(""); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Cadastre o CNPJ e a razão social do cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={novoCnpj} onChange={(e) => setNovoCnpj(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Razão Social</Label>
              <Input
                autoFocus={false}
                placeholder="Nome da empresa"
                value={novaRazaoSocial}
                onChange={(e) => setNovaRazaoSocial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCriarCliente()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModoNovoCliente(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarCliente} disabled={criandoCliente} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {criandoCliente ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modoNovoProjeto}
        onOpenChange={(open) => {
          setModoNovoProjeto(open);
          if (!open) setNovoNomeProjeto("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
            <DialogDescription>
              {clienteSelecionado ? `Novo projeto para ${clienteSelecionado.razaoSocial}` : "Dê um nome ao projeto"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome do projeto</Label>
            <Input
              autoFocus
              placeholder="ex.: Reverificação 2026"
              value={novoNomeProjeto}
              onChange={(e) => setNovoNomeProjeto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriarProjeto()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModoNovoProjeto(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarProjeto} disabled={criandoProjeto} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {criandoProjeto ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Cartão de projeto reutilizado tanto na galeria de projetos quanto (se um dia precisar) fora
  // dela — mantém a lógica de edição/exclusão inline num só lugar.
  const cartaoProjeto = (p: Projeto) => (
    <div
      key={p.id}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 flex flex-col"
    >
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FolderOpen className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {projetoEditandoId === p.id ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={nomeRenomeado}
                  onChange={(e) => setNomeRenomeado(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenomearProjeto(p.id, nomeRenomeado);
                    if (e.key === "Escape") setProjetoEditandoId(null);
                  }}
                  className="h-7 text-sm"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRenomearProjeto(p.id, nomeRenomeado); }}
                  disabled={renomeandoProjeto}
                  className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                  title="Salvar"
                >
                  {renomeandoProjeto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground truncate" title={p.nome}>{p.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Atualizado em {formatarDataCurta(p.updatedAt)}</p>
              </>
            )}
          </div>
          {projetoEditandoId !== p.id && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setNomeRenomeado(p.nome); setProjetoEditandoId(p.id); }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Renomear projeto"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleExcluirProjeto(p); }}
                disabled={excluindoProjetoId === p.id}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Excluir projeto"
              >
                {excluindoProjetoId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/50 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <FileSearch className="h-3.5 w-3.5 shrink-0" />
          {p.totalDocumentos} documento{p.totalDocumentos === 1 ? "" : "s"} importado{p.totalDocumentos === 1 ? "" : "s"}
        </div>

        <button
          onClick={() => setProjetoSelecionadoId(p.id)}
          className="mt-auto h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          Abrir projeto <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  // Antes de um projeto estar aberto: mostra a galeria de Clientes (nível 1) ou, com um cliente
  // selecionado, a galeria de Projetos dele (nível 2) — navegação em cards pedida pelo usuário,
  // no lugar dos <Select> antigos. O botão "+" no topo direito troca de alvo (cliente/projeto)
  // conforme o nível em que o usuário está.
  if (!projetoSelecionado) {
    return (
      <div className="space-y-8 pb-16">
        {hero}

        {clienteSelecionado ? (
          <div className="space-y-5">
            <button
              onClick={() => setClienteSelecionadoId(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="h-3.5 w-3.5" /> Clientes
            </button>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{clienteSelecionado.razaoSocial}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{clienteSelecionado.cnpj}</p>
              </div>
              <Button onClick={() => setModoNovoProjeto(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                <Plus className="h-4 w-4 mr-2" /> Novo projeto
              </Button>
            </div>

            {carregandoProjetos ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projetos.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum projeto ainda para este cliente.</p>
                <Button onClick={() => setModoNovoProjeto(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" /> Criar primeiro projeto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projetos.map((p) => cartaoProjeto(p))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Clientes</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Escolha um cliente para ver os projetos, ou cadastre um novo</p>
              </div>
              <Button onClick={() => setModoNovoCliente(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                <Plus className="h-4 w-4 mr-2" /> Novo cliente
              </Button>
            </div>

            {carregandoClientes ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado ainda.</p>
                <Button onClick={() => setModoNovoCliente(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar primeiro cliente
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setClienteSelecionadoId(c.id)}
                    className="group relative rounded-2xl border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 flex flex-col"
                  >
                    <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate" title={c.razaoSocial}>{c.razaoSocial}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.cnpj}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExcluirCliente(c); }}
                          disabled={excluindoClienteId === c.id}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors shrink-0"
                          title="Excluir cliente"
                        >
                          {excluindoClienteId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {c.totalProjetos} projeto{c.totalProjetos === 1 ? "" : "s"}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                          Ver projetos <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {dialogos}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb — só aparece com um projeto aberto; leva de volta pra galeria de cards */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <button onClick={() => setClienteSelecionadoId(null)} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> Clientes
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <button onClick={() => setProjetoSelecionadoId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
          {clienteSelecionado?.razaoSocial}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{projetoSelecionado.nome}</span>
      </div>

      {hero}

      {/* Upload Section */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Arquivos para Análise</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Aceita .xlsx, .xls, .csv, PDFs de Declaração/Extrato do Simples Nacional e .txt de EFD ICMS/IPI —
                você pode carregar múltiplos arquivos de uma vez
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
                : "border-border hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-accent dark:hover:bg-muted/50"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"
            }`}>
              <Upload className={`h-6 w-6 transition-colors ${
                isDragging ? "text-emerald-600" : "text-muted-foreground"
              }`} />
            </div>
            <p className="text-sm font-medium text-foreground text-center">
              Clique ou arraste os arquivos aqui
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              .xlsx · .xls · .csv · .pdf · .txt — sem limite de quantidade
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.txt,.dec"
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </div>

          {/* File list — resumo colapsável (contagem + tamanho, expande pra ver/remover cada um) */}
          <ListaArquivosColapsavel arquivos={arquivos} onRemover={removerArquivo} />

          {/* Cadastro (Consulta CNPJ + Simples Nacional + QSA) — vira a aba "Menu" do Excel */}
          {projetoSelecionado && (carregandoCadastro || cadastro) && (
            <SecaoColapsavel
              titulo="Cadastro (Menu)"
              resumo={
                carregandoCadastro
                  ? "carregando…"
                  : [
                      cadastro?.dados.consultaCnpj && "CNPJ",
                      cadastro?.dados.simplesNacional && "Simples",
                      cadastro?.dados.qsa && "QSA",
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
              }
              acaoDireita={
                cadastro ? (
                  <button onClick={handleExcluirCadastro} title="Remover dados cadastrais" className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            >
              {carregandoCadastro ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                cadastro && (
                  <div className="space-y-3 px-1 text-sm">
                    {cadastro.dados.consultaCnpj && (
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {cadastro.dados.consultaCnpj.nomeEmpresarial}
                          <span className="font-normal text-muted-foreground"> · {cadastro.dados.consultaCnpj.cnpj}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            cadastro.dados.consultaCnpj.situacaoCadastral && `Situação: ${cadastro.dados.consultaCnpj.situacaoCadastral}`,
                            cadastro.dados.consultaCnpj.porte && `Porte: ${cadastro.dados.consultaCnpj.porte}`,
                            cadastro.dados.consultaCnpj.dataAbertura && `Abertura: ${cadastro.dados.consultaCnpj.dataAbertura}`,
                            cadastro.dados.consultaCnpj.municipio &&
                              `${cadastro.dados.consultaCnpj.municipio}/${cadastro.dados.consultaCnpj.uf}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {cadastro.dados.consultaCnpj.cnaePrincipal && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">CNAE principal:</span> {cadastro.dados.consultaCnpj.cnaePrincipal.codigo} —{" "}
                            {cadastro.dados.consultaCnpj.cnaePrincipal.descricao}
                          </p>
                        )}
                        {cadastro.dados.consultaCnpj.cnaesSecundarios.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Secundários:</span>{" "}
                            {cadastro.dados.consultaCnpj.cnaesSecundarios.map((c) => `${c.codigo} — ${c.descricao}`).join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                    {cadastro.dados.simplesNacional && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Simples Nacional</Badge>
                        <span className="text-xs text-foreground">{resumoSimples(cadastro.dados.simplesNacional)}</span>
                      </div>
                    )}
                    {cadastro.dados.qsa && cadastro.dados.qsa.socios.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">QSA</p>
                        {cadastro.dados.qsa.socios.map((s) => (
                          <p key={s.cpf} className="text-xs text-foreground">
                            {s.nome} <span className="text-muted-foreground">· {s.qualificacao} · capital {s.capitalSocial} · CPF {s.cpf}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Essas informações viram a aba <span className="font-medium">Menu</span> (primeira aba) do Excel.
                      {cadastro.dados.simplesNacional?.extraidoPorIA &&
                        " A Consulta Optantes foi lida por IA (documento escaneado) — confira contra o original."}
                    </p>
                  </div>
                )
              )}
            </SecaoColapsavel>
          )}

          {/* Meses do Simples Nacional já importados para o projeto selecionado */}
          {projetoSelecionado && (carregandoDeclaracoes || mesesAgrupados.length > 0) && (
            <SecaoColapsavel
              titulo="Simples Nacional"
              resumo={carregandoDeclaracoes ? "carregando…" : `${mesesAgrupados.length} ${mesesAgrupados.length === 1 ? "competência" : "competências"}`}
            >
              {carregandoDeclaracoes ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
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
                                    className="text-muted-foreground hover:text-red-500"
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
            </SecaoColapsavel>
          )}

          {/* Meses de ICMS/IPI já importados para o projeto selecionado */}
          {projetoSelecionado && (carregandoDeclaracoesEfd || mesesEfdOrdenados.length > 0) && (
            <SecaoColapsavel
              titulo="ICMS / IPI"
              resumo={carregandoDeclaracoesEfd ? "carregando…" : `${mesesEfdOrdenados.length} ${mesesEfdOrdenados.length === 1 ? "competência" : "competências"}`}
            >
              {carregandoDeclaracoesEfd ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {mesesEfdOrdenados.length > 0 && (
                    <GraficoBarras
                      dados={mesesEfdOrdenados.map((d) => ({
                        mes: formatarCompetencia(d.competencia),
                        valor: d.dados.apuracaoIcms.icmsARecolher,
                      }))}
                      chaveX="mes"
                      chaveValor="valor"
                      nome="ICMS a Recolher"
                      cor="#60a5fa"
                    />
                  )}
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">ICMS a Recolher</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mesesEfdOrdenados.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{formatarCompetencia(d.competencia)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.dados.apuracaoIcms.icmsARecolher)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleExcluirDeclaracaoEfd(d.id)}
                              title="Remover"
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </SecaoColapsavel>
          )}

          {/* Antecipação ICMS-ST (Ceará) — só aparece quando o cliente é elegível (UF CE + CNAE
              têxtil no Cartão CNPJ) e já tem EFD ICMS/IPI importado no projeto. Sem Cartão CNPJ
              ainda importado, fica de fora silenciosamente (decisão confirmada com o usuário). */}
          {projetoSelecionado && elegivelIcmsSt && (carregandoDeclaracoesEfd || mesesEfdOrdenados.length > 0) && (
            <SecaoColapsavel
              titulo="Antecipação ICMS-ST (Ceará)"
              resumo={
                carregandoDeclaracoesEfd
                  ? "carregando…"
                  : `${aplicaveisAntecipacaoIcmsSt.length} ${aplicaveisAntecipacaoIcmsSt.length === 1 ? "item sujeito" : "itens sujeitos"}`
              }
            >
              {carregandoDeclaracoesEfd ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="border-border">
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeralAntecipacaoIcmsSt)}</p>
                        <p className="text-xs text-muted-foreground">Total de antecipação devida</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border">
                      <CardContent className="pt-5 pb-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{aplicaveisAntecipacaoIcmsSt.length}</p>
                        <p className="text-xs text-muted-foreground">Itens sujeitos (CFOP 1403/2403) de {linhasEntradaTodas.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {totalPorCompetenciaAntecipacaoIcmsSt.length > 0 && (
                    <GraficoBarras
                      dados={totalPorCompetenciaAntecipacaoIcmsSt.map(([competencia, valor]) => ({
                        mes: formatarCompetencia(competencia),
                        valor,
                      }))}
                      chaveX="mes"
                      chaveValor="valor"
                      nome="Antecipação ICMS-ST"
                      cor="#f59e0b"
                    />
                  )}

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Cliente do Ceará com CNAE de comércio varejista de tecidos (47.55-5-01) — a análise de
                      antecipação parcial do ICMS/FECOP (IN CE nº 17/2013) sai automaticamente na aba própria
                      do Excel combinado, com os itens de entrada de todos os EFDs ICMS/IPI já importados.
                    </p>
                  </div>
                </>
              )}
            </SecaoColapsavel>
          )}

          {/* Meses de PIS/COFINS (EFD Contribuições) já importados para o projeto selecionado */}
          {projetoSelecionado && (carregandoDeclaracoesEfdContrib || mesesEfdContribOrdenados.length > 0) && (
            <SecaoColapsavel
              titulo="PIS / COFINS"
              resumo={carregandoDeclaracoesEfdContrib ? "carregando…" : `${mesesEfdContribOrdenados.length} ${mesesEfdContribOrdenados.length === 1 ? "competência" : "competências"}`}
            >
              {carregandoDeclaracoesEfdContrib ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {mesesEfdContribOrdenados.length > 0 && (
                    <GraficoSeries
                      dados={mesesEfdContribOrdenados.map((d) => ({
                        mes: formatarCompetencia(d.competencia),
                        PIS: d.dados.apuracaoPis.valorARecolher,
                        COFINS: d.dados.apuracaoCofins.valorARecolher,
                      }))}
                      chaveX="mes"
                      series={[
                        { chave: "PIS", nome: "PIS" },
                        { chave: "COFINS", nome: "COFINS" },
                      ]}
                    />
                  )}
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">PIS a Recolher</TableHead>
                      <TableHead className="text-right">COFINS a Recolher</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mesesEfdContribOrdenados.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{formatarCompetencia(d.competencia)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.dados.apuracaoPis.valorARecolher)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.dados.apuracaoCofins.valorARecolher)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleExcluirDeclaracaoEfdContrib(d.id)}
                              title="Remover"
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </SecaoColapsavel>
          )}

          {/* Anos de ECF (IRPJ/CSLL - Lucro Presumido) já importados para o projeto selecionado */}
          {projetoSelecionado && (carregandoDeclaracoesEcf || anosEcfOrdenados.length > 0) && (
            <SecaoColapsavel
              titulo="ECF (IRPJ / CSLL)"
              resumo={carregandoDeclaracoesEcf ? "carregando…" : `${anosEcfOrdenados.length} ${anosEcfOrdenados.length === 1 ? "ano" : "anos"}`}
            >
              {carregandoDeclaracoesEcf ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {anosEcfOrdenados.length > 0 && (
                    <GraficoSeries
                      dados={anosEcfOrdenados.map((d) => ({
                        ano: String(d.ano),
                        IRPJ: d.irpjAPagar,
                        CSLL: d.csllAPagar,
                      }))}
                      chaveX="ano"
                      series={[
                        { chave: "IRPJ", nome: "IRPJ" },
                        { chave: "CSLL", nome: "CSLL" },
                      ]}
                      empilhado={false}
                    />
                  )}
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead>
                      <TableHead className="text-right">IRPJ a Pagar</TableHead>
                      <TableHead className="text-right">CSLL a Pagar</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anosEcfOrdenados.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.ano}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.irpjAPagar)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.csllAPagar)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleExcluirDeclaracaoEcf(d.id)}
                              title="Remover"
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </SecaoColapsavel>
          )}

          {/* DCTFWeb (PDF) importadas — lista de débitos declarados fica no Excel */}
          {projetoSelecionado && (carregandoDctf || dctfWebOrdenadas.length > 0) && (
            <SecaoColapsavel
              titulo="DCTFWeb"
              resumo={carregandoDctf ? "carregando…" : `${dctfWebOrdenadas.length} ${dctfWebOrdenadas.length === 1 ? "período" : "períodos"}`}
            >
              {carregandoDctf ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                dctfWebOrdenadas.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período Apuração</TableHead>
                        <TableHead>Nº Recibo</TableHead>
                        <TableHead className="text-right">Débitos</TableHead>
                        <TableHead className="text-right">Total Apurado</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dctfWebOrdenadas.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.dados.periodoApuracao}</TableCell>
                          <TableCell>{d.dados.numeroRecibo}</TableCell>
                          <TableCell className="text-right">{d.dados.debitos.length}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.dados.debitos.reduce((s, db) => s + db.debitoApurado, 0))}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <button onClick={() => handleExcluirDctfWeb(d.id)} title="Remover" className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </SecaoColapsavel>
          )}

          {/* DCTF (.dec) importadas — lista de débitos declarados fica no Excel */}
          {projetoSelecionado && (carregandoDctf || dctfOrdenadas.length > 0) && (
            <SecaoColapsavel
              titulo="DCTF"
              resumo={carregandoDctf ? "carregando…" : `${dctfOrdenadas.length} ${dctfOrdenadas.length === 1 ? "competência" : "competências"}`}
            >
              {carregandoDctf ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                dctfOrdenadas.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Competência</TableHead>
                        <TableHead>Tributos Declarados</TableHead>
                        <TableHead className="text-right">Total Débito</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dctfOrdenadas.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{formatarCompetencia(d.competencia)}</TableCell>
                          <TableCell>{d.dados.debitos.map((db) => db.tributo ?? db.grupo.split(" -")[0]).join(", ")}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(d.dados.debitos.reduce((s, db) => s + db.valorDebito, 0))}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <button onClick={() => handleExcluirDctf(d.id)} title="Remover" className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </SecaoColapsavel>
          )}

          {/* ECD (Balanço Patrimonial) importada — detalhamento das contas fica no Excel */}
          {projetoSelecionado && (carregandoEcd || ecdOrdenadas.length > 0) && (
            <SecaoColapsavel
              titulo="ECD (Balanço Patrimonial)"
              resumo={carregandoEcd ? "carregando…" : `${ecdOrdenadas.length} ${ecdOrdenadas.length === 1 ? "ano" : "anos"}`}
            >
              {carregandoEcd ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                ecdOrdenadas.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ano</TableHead>
                        <TableHead className="text-right">Contas no Plano</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ecdOrdenadas.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.ano}</TableCell>
                          <TableCell className="text-right">{d.qtdContas}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <button onClick={() => handleExcluirEcd(d.id)} title="Remover" className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </SecaoColapsavel>
          )}

          {/* Fontes Pagadoras (DIRF) importadas — detalhamento por fonte/código fica no Excel */}
          {projetoSelecionado && (carregandoFontes || fontesOrdenadas.length > 0) && (
            <SecaoColapsavel
              titulo="Fontes Pagadoras (DIRF)"
              resumo={carregandoFontes ? "carregando…" : `${fontesOrdenadas.length} ${fontesOrdenadas.length === 1 ? "ano" : "anos"}`}
            >
              {carregandoFontes ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                fontesOrdenadas.length > 0 && (
                  <>
                  <GraficoBarras
                    dados={fontesOrdenadas.map((d) => ({ ano: String(d.ano), valor: d.totalImposto }))}
                    chaveX="ano"
                    chaveValor="valor"
                    nome="Imposto Retido"
                    cor="#818cf8"
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ano</TableHead>
                        <TableHead className="text-right">Fontes</TableHead>
                        <TableHead className="text-right">Total Imposto Retido</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fontesOrdenadas.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.ano}</TableCell>
                          <TableCell className="text-right">{d.qtdFontes}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.totalImposto)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <button onClick={() => handleExcluirFontes(d.id)} title="Remover" className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </>
                )
              )}
            </SecaoColapsavel>
          )}

          {/* Comprovantes de pagamento (DARF): resumo consolidado por ano de PIS/COFINS/IRPJ/CSLL
              pagos — o detalhamento por DARF fica no Excel, não aqui */}
          {projetoSelecionado && (carregandoDeclaracoesComprovante || declaracoesComprovante.length > 0) && (
            <SecaoColapsavel
              titulo="Pagamentos (DARF)"
              resumo={carregandoDeclaracoesComprovante ? "carregando…" : `${declaracoesComprovante.length} DARF(s)`}
              acaoDireita={
                declaracoesComprovante.length > 0 ? (
                  <button
                    onClick={handleExcluirComprovantes}
                    title={`Remover todos os ${declaracoesComprovante.length} DARF(s) importados`}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            >
              {carregandoDeclaracoesComprovante ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {comprovantesPorAno.length > 0 && (
                    <GraficoSeries
                      dados={comprovantesPorAno.map((linha) => ({
                        ano: String(linha.ano),
                        PIS: linha.PIS,
                        COFINS: linha.COFINS,
                        IRPJ: linha.IRPJ,
                        CSLL: linha.CSLL,
                      }))}
                      chaveX="ano"
                      series={[
                        { chave: "PIS", nome: "PIS" },
                        { chave: "COFINS", nome: "COFINS" },
                        { chave: "IRPJ", nome: "IRPJ" },
                        { chave: "CSLL", nome: "CSLL" },
                      ]}
                    />
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ano</TableHead>
                        <TableHead className="text-right">PIS</TableHead>
                        <TableHead className="text-right">COFINS</TableHead>
                        <TableHead className="text-right">IRPJ</TableHead>
                        <TableHead className="text-right">CSLL</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comprovantesPorAno.map((linha) => (
                        <TableRow key={linha.ano}>
                          <TableCell className="font-medium">{linha.ano}</TableCell>
                          <TableCell className="text-right">{formatCurrency(linha.PIS)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(linha.COFINS)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(linha.IRPJ)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(linha.CSLL)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(linha.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-border">
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(comprovantesTotalGeral.PIS)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(comprovantesTotalGeral.COFINS)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(comprovantesTotalGeral.IRPJ)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(comprovantesTotalGeral.CSLL)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(comprovantesTotalGeral.total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground px-1">
                    {declaracoesComprovante.length} DARF(s) importado(s) · valores por ano do período de apuração,
                    somando apenas PIS, COFINS, IRPJ e CSLL — o detalhamento completo (incluindo INSS, multas etc.)
                    sai no Excel.
                  </p>
                </>
              )}
            </SecaoColapsavel>
          )}

          {/* Um botão só: se ICMS/IPI, PIS/COFINS, IRPJ/CSLL e/ou Comprovante de Pagamentos foram importados no mesmo projeto, sai 1 Excel com todas as abas */}
          {projetoSelecionado &&
            (mesesEfdOrdenados.length > 0 ||
              mesesEfdContribOrdenados.length > 0 ||
              anosEcfOrdenados.length > 0 ||
              dctfWebOrdenadas.length > 0 ||
              dctfOrdenadas.length > 0 ||
              fontesOrdenadas.length > 0 ||
              ecdOrdenadas.length > 0 ||
              declaracoesComprovante.length > 0 ||
              cadastro !== null) && (
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={handleBaixarExcelFiscal}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Excel
                </Button>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Info banner (shown before first analysis) */}
      {!resultado && arquivos.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-primary dark:text-primary">
            <span className="font-semibold">Como funciona:</span> carregue os arquivos Excel com dados fiscais e
            contábeis da empresa (DRE, notas fiscais, etc.), os PDFs de Declaração/Extrato do Simples Nacional,
            Comprovante de Arrecadação de DARF, DCTFWeb ou Fontes Pagadoras (DIRF), os .txt de EFD ICMS/IPI, EFD
            Contribuições (PIS/COFINS), ECF (IRPJ/CSLL) e ECD (Balanço Patrimonial), ou os .dec de DCTF — o sistema
            reconhece o tipo de cada arquivo automaticamente e processa cada um do jeito certo.
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
            <Card className="border-border">
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
                            <p className="text-sm font-semibold text-foreground">
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
                          <p className="text-sm text-foreground">
                            {op.descricao}
                          </p>
                          <p className="text-xs text-muted-foreground italic">
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
                        <span className="text-sm text-foreground">{a}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {resultado.proximosPassos.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Próximos Passos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {resultado.proximosPassos.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground">{p}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * A análise é baseada nos arquivos fornecidos e nas normas vigentes. Recomenda-se validação com contador ou advogado tributarista antes de iniciar o processo de recuperação.
          </p>
        </div>
      )}

      <SelecionarAbasExportDialog
        open={dialogAbasAberto}
        onOpenChange={setDialogAbasAberto}
        opcoes={opcoesAbasExport()}
        onConfirmar={handleConfirmarAbasExport}
      />
    </div>
  );
}
