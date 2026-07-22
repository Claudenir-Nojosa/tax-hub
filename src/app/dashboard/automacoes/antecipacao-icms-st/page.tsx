"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { parseEntradasEfdIcmsIpi, type LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser";
import { calcularAntecipacaoItem, type ResultadoAntecipacaoItem } from "@/lib/icms-st-antecipacao-ce";
import { exportarAntecipacaoIcmsStExcel } from "@/lib/icms-st-antecipacao-excel";
import { Percent, Upload, FileText, X, Loader2, Download, RefreshCw, AlertTriangle } from "lucide-react";

interface ArquivoCarregado {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface LinhaResultado {
  linha: LinhaEntradaEfd;
  resultado: ResultadoAntecipacaoItem;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const LABEL_SITUACAO: Record<ResultadoAntecipacaoItem["situacao"], string> = {
  dentro_estado: "Dentro do Estado",
  fora_estado: "Fora do Estado",
  importacao_exterior: "Importação do Exterior",
};

type Etapa = "idle" | "lendo" | "concluido";

export default function AntecipacaoIcmsStPage() {
  const [arquivos, setArquivos] = useState<ArquivoCarregado[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [resultado, setResultado] = useState<LinhaResultado[] | null>(null);
  const [naoClassificados, setNaoClassificados] = useState(0);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionarArquivos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const aceitos = Array.from(fileList).filter((f) => /\.txt$/i.test(f.name));
    const invalidos = fileList.length - aceitos.length;
    if (invalidos > 0) toast.warning(`${invalidos} arquivo(s) ignorado(s) — apenas .txt (EFD ICMS/IPI) são aceitos.`);

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
      toast.error("Adicione pelo menos um arquivo de EFD ICMS/IPI (.txt).");
      return;
    }
    setEtapa("lendo");

    const todasLinhas: LinhaEntradaEfd[] = [];
    let empresaEncontrada = "";
    let arquivosRejeitados = 0;
    let arquivosSemDados = 0;

    for (const a of arquivos) {
      const texto = await a.file.text();
      const dados = parseEntradasEfdIcmsIpi(texto);
      if (!dados.cnpj) {
        arquivosSemDados++;
        continue;
      }
      // Regra de antecipação parcial ICMS-ST é específica do Ceará (IN CE nº 17/2013) — travada
      // pro CE, avisa e ignora arquivos de outros estados em vez de aplicar a regra errada.
      if (dados.linhas[0] && dados.linhas[0].ufPropria !== "CE") {
        arquivosRejeitados++;
        toast.warning(`${a.name}: EFD de ${dados.linhas[0].ufPropria || "UF desconhecida"}, não do Ceará — ignorado.`);
        continue;
      }
      if (!empresaEncontrada) empresaEncontrada = dados.empresa;
      todasLinhas.push(...dados.linhas);
    }

    if (arquivosSemDados > 0) {
      toast.warning(`${arquivosSemDados} arquivo(s) sem registro 0000 (cabeçalho) válido — ignorado(s).`);
    }

    if (todasLinhas.length === 0) {
      toast.error(arquivosRejeitados > 0 ? "Nenhum arquivo do Ceará foi encontrado." : "Nenhuma linha de entrada foi encontrada nos arquivos.");
      setEtapa("idle");
      return;
    }

    const calculadas: LinhaResultado[] = [];
    let semClassificar = 0;
    for (const linha of todasLinhas) {
      const r = calcularAntecipacaoItem(linha);
      if (r) calculadas.push({ linha, resultado: r });
      else semClassificar++;
    }

    setResultado(calculadas);
    setNaoClassificados(semClassificar);
    setNomeEmpresa(empresaEncontrada || "Empresa");
    setEtapa("concluido");
    toast.success(`${calculadas.length} itens calculados!`);
  };

  const handleReset = () => {
    setArquivos([]);
    setResultado(null);
    setEtapa("idle");
  };

  const handleBaixarExcel = async () => {
    if (!resultado) return;
    await exportarAntecipacaoIcmsStExcel(resultado.map((r) => r.linha), nomeEmpresa);
  };

  const processando = etapa === "lendo";

  const totalGeral = resultado ? resultado.reduce((s, r) => s + r.resultado.valor, 0) : 0;
  const totalPorCompetencia = resultado
    ? Array.from(
        resultado.reduce((mapa, r) => {
          mapa.set(r.linha.pa, (mapa.get(r.linha.pa) ?? 0) + r.resultado.valor);
          return mapa;
        }, new Map<string, number>())
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const comAdicional = resultado ? resultado.filter((r) => r.resultado.adicionalRegiao > 0).length : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center">
          <Percent className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Antecipação ICMS-ST (Ceará)</h1>
          <p className="text-sm text-muted-foreground">
            Importe o EFD ICMS/IPI — calcula a antecipação parcial do ICMS/FECOP devida sobre cada entrada,
            conforme a IN CE nº 17/2013 e o critério de origem estrangeira da Resolução SF nº 13/2012. Ferramenta
            específica do Ceará.
          </p>
        </div>
      </div>

      {etapa !== "concluido" && (
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Arquivos EFD ICMS/IPI</CardTitle>
            <CardDescription className="text-xs">
              Aceita .txt do EFD ICMS/IPI (SPED Fiscal) do Ceará — pode carregar vários meses de uma vez
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
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                  : "border-border hover:border-amber-300 dark:hover:border-amber-800"
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground text-center">
                Clique ou arraste os EFDs aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">.txt — sem limite de quantidade</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".txt"
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
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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

            {arquivos.length > 0 && !processando && (
              <div className="flex justify-end">
                <Button onClick={handleProcessar} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {processando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Percent className="h-4 w-4 mr-2" />}
                  Calcular Antecipação
                </Button>
              </div>
            )}
            {processando && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lendo e calculando...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {etapa === "concluido" && resultado && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{resultado.length} itens calculados — {nomeEmpresa}</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova análise
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-border">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
                <p className="text-xs text-muted-foreground">Total de antecipação devida</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-2xl font-bold text-foreground">{comAdicional}</p>
                <p className="text-xs text-muted-foreground">Itens com adicional regional (+3%/+8%)</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-2xl font-bold text-foreground">{totalPorCompetencia.length}</p>
                <p className="text-xs text-muted-foreground">Competência(s) analisada(s)</p>
              </CardContent>
            </Card>
          </div>

          {naoClassificados > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {naoClassificados} item(ns) ficaram de fora do cálculo (CFOP fora do escopo de entrada ou Data de
                Entrada/Saída não reconhecida).
              </p>
            </div>
          )}

          <Card className="border-border overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Por competência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {totalPorCompetencia.map(([pa, valor]) => (
                  <Badge key={pa} variant="outline" className="text-xs font-normal">
                    {pa}: {formatCurrency(valor)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Itens (prévia)</CardTitle>
              <CardDescription className="text-xs">Todas as colunas saem no Excel — aqui é só um resumo</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Alíquota</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-[200px] truncate">{r.linha.nomeFornecedor}</TableCell>
                        <TableCell>{r.linha.ufFornecedor}</TableCell>
                        <TableCell>{r.linha.cfop}</TableCell>
                        <TableCell className="text-xs">{LABEL_SITUACAO[r.resultado.situacao]}</TableCell>
                        <TableCell className="text-right">{(r.resultado.aliquotaTotal * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.resultado.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleBaixarExcel} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * Cálculo baseado na regra informada para o Ceará (IN CE nº 17/2013 + Resolução SF nº 13/2012) — não
            cruza com nenhum valor já recolhido. Recomenda-se validação com contador ou advogado tributarista.
          </p>
        </div>
      )}
    </div>
  );
}
