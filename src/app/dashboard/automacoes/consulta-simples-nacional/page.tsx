"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  extrairCnpjsDoExcel,
  extrairCnpjsDoTexto,
  consultarCnpjsEmLote,
  type ResultadoConsultaCnpj,
} from "@/lib/consulta-simples-nacional";
import { exportarConsultaSimplesNacionalExcel } from "@/lib/consulta-simples-nacional-excel";
import {
  BadgeCheck,
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type Etapa = "idle" | "lendo" | "consultando" | "concluido";

export default function ConsultaSimplesNacionalPage() {
  const [modo, setModo] = useState<"upload" | "colar">("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [textoColado, setTextoColado] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resultado, setResultado] = useState<ResultadoConsultaCnpj[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processando = etapa === "lendo" || etapa === "consultando";

  const adicionarArquivo = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("Envie um arquivo .xlsx, .xls ou .csv");
      return;
    }
    setArquivo(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      adicionarArquivo(e.dataTransfer.files);
    },
    [adicionarArquivo]
  );

  const handleConsultar = async () => {
    try {
      setEtapa("lendo");
      let cnpjs: string[];
      if (modo === "upload") {
        if (!arquivo) {
          toast.error("Selecione um arquivo Excel com a coluna de CNPJ.");
          setEtapa("idle");
          return;
        }
        cnpjs = await extrairCnpjsDoExcel(arquivo);
      } else {
        cnpjs = extrairCnpjsDoTexto(textoColado);
      }

      if (cnpjs.length === 0) {
        toast.error("Nenhum CNPJ válido (14 dígitos) foi encontrado.");
        setEtapa("idle");
        return;
      }

      setEtapa("consultando");
      setProgresso({ atual: 0, total: cnpjs.length });
      const resultados = await consultarCnpjsEmLote(cnpjs, (atual, total) => setProgresso({ atual, total }));

      setResultado(resultados);
      setEtapa("concluido");
      toast.success(`${resultados.length} CNPJ(s) consultado(s)!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar a consulta");
      setEtapa("idle");
    }
  };

  const handleReset = () => {
    setArquivo(null);
    setTextoColado("");
    setResultado(null);
    setEtapa("idle");
  };

  const handleBaixarExcel = async () => {
    if (!resultado) return;
    await exportarConsultaSimplesNacionalExcel(resultado);
  };

  const contagem = resultado
    ? {
        optantes: resultado.filter((r) => r.simplesNacional === true).length,
        naoOptantes: resultado.filter((r) => r.simplesNacional === false).length,
        erros: resultado.filter((r) => r.erro).length,
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
          <BadgeCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consulta Simples Nacional</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifique em lote, por CNPJ, se a empresa é optante do Simples Nacional — via Excel ou colando a lista.
          </p>
        </div>
      </div>

      {etapa !== "concluido" && (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">CNPJs a consultar</CardTitle>
            <CardDescription className="text-xs">
              Suba uma planilha com uma coluna de CNPJ ou cole a lista diretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={modo} onValueChange={(v) => setModo(v as "upload" | "colar")}>
              <TabsList>
                <TabsTrigger value="upload" disabled={processando}>Upload de Excel</TabsTrigger>
                <TabsTrigger value="colar" disabled={processando}>Colar CNPJs</TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => !processando && inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl py-12 px-6 flex flex-col items-center justify-center transition-all duration-200 ${
                    processando ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800"
                  }`}
                >
                  <Upload className="h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                    Clique ou arraste a planilha aqui
                  </p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx · .xls · .csv — uma coluna com "CNPJ" no título</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    disabled={processando}
                    onChange={(e) => { adicionarArquivo(e.target.files); e.target.value = ""; }}
                  />
                </div>

                {arquivo && (
                  <div className="flex items-center gap-3 p-3 mt-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">{arquivo.name}</p>
                    {!processando && (
                      <button type="button" onClick={() => setArquivo(null)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 flex-shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="colar">
                <Textarea
                  value={textoColado}
                  onChange={(e) => setTextoColado(e.target.value)}
                  disabled={processando}
                  placeholder={"Cole os CNPJs aqui, um por linha (ou separados por vírgula/espaço):\n15.165.645/0001-51\n11.222.333/0001-81\n..."}
                  className="min-h-[180px] font-mono text-xs"
                />
              </TabsContent>
            </Tabs>

            {processando && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {etapa === "lendo"
                      ? "Lendo CNPJs..."
                      : `Consultando na Receita Federal (${progresso.atual}/${progresso.total})...`}
                  </span>
                  {etapa === "consultando" && (
                    <span>{progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0}%</span>
                  )}
                </div>
                {etapa === "consultando" && (
                  <Progress value={progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0} />
                )}
              </div>
            )}

            {!processando && (
              <div className="flex justify-end">
                <Button onClick={handleConsultar} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <BadgeCheck className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {etapa === "concluido" && resultado && contagem && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{resultado.length} CNPJ(s) consultado(s)</p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova consulta
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-5 pb-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{contagem.optantes}</p>
                <p className="text-xs text-gray-400">Optantes</p>
              </CardContent>
            </Card>
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="pt-5 pb-4 text-center">
                <XCircle className="h-5 w-5 mx-auto mb-1.5 text-gray-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{contagem.naoOptantes}</p>
                <p className="text-xs text-gray-400">Não optantes</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-5 pb-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1.5 text-amber-600 dark:text-amber-400" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{contagem.erros}</p>
                <p className="text-xs text-gray-400">Não encontrados/erro</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Simples Nacional</TableHead>
                  <TableHead>Data Opção</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.map((r) => (
                  <TableRow key={r.cnpj}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{r.cnpjFormatado}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{r.razaoSocial ?? "—"}</TableCell>
                    <TableCell>
                      {r.erro ? (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                          {r.erro}
                        </Badge>
                      ) : r.simplesNacional === true ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Optante</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 dark:text-gray-400">Não optante</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-gray-500">{r.dataOpcaoSimples ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500">{r.situacaoCadastral ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleBaixarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            * Dados públicos da Receita Federal (BrasilAPI, com fallback ReceitaWS). CNPJs não encontrados podem
            estar com erro de digitação ou fora da base — confira manualmente antes de qualquer decisão fiscal.
          </p>
        </div>
      )}
    </div>
  );
}
