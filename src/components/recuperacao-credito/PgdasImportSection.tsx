"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Upload, Trash2, Download, Loader2, Plus, Building2 } from "lucide-react"
import { exportarPgdasExcel, type DeclaracaoPgdasRegistro } from "@/lib/pgdas/export-pgdas-excel"
import type { DadosPgdas, TipoDocumentoPgdas } from "@/lib/pgdas/types"

interface Cliente {
  id: string
  cnpj: string
  razaoSocial: string
}

interface DeclaracaoRow {
  id: string
  competencia: string
  tipoDocumento: TipoDocumentoPgdas
  dados: DadosPgdas
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function formatarCompetencia(comp: string): string {
  const [ano, mes] = comp.split("-")
  return `${MESES_ABREV[parseInt(mes, 10) - 1] ?? mes}/${ano}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export default function PgdasImportSection() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null)
  const [modoNovoCliente, setModoNovoCliente] = useState(false)
  const [novoCnpj, setNovoCnpj] = useState("")
  const [novaRazaoSocial, setNovaRazaoSocial] = useState("")
  const [criandoCliente, setCriandoCliente] = useState(false)

  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRow[]>([])
  const [carregandoDeclaracoes, setCarregandoDeclaracoes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const clienteSelecionado = clientes.find((c) => c.id === clienteSelecionadoId) ?? null

  const carregarClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/recuperacao-credito/clientes")
      const data = await res.json()
      setClientes(data)
    } catch {
      toast.error("Erro ao carregar clientes")
    }
  }, [])

  useEffect(() => {
    carregarClientes()
  }, [carregarClientes])

  const carregarDeclaracoes = useCallback(async (clienteId: string) => {
    setCarregandoDeclaracoes(true)
    try {
      const res = await fetch(`/api/recuperacao-credito/pgdas?clienteId=${clienteId}`)
      const data = await res.json()
      setDeclaracoes(data)
    } catch {
      toast.error("Erro ao carregar declarações")
    } finally {
      setCarregandoDeclaracoes(false)
    }
  }, [])

  useEffect(() => {
    if (clienteSelecionadoId) carregarDeclaracoes(clienteSelecionadoId)
    else setDeclaracoes([])
  }, [clienteSelecionadoId, carregarDeclaracoes])

  const handleCriarCliente = async () => {
    if (!novoCnpj.trim() || !novaRazaoSocial.trim()) {
      toast.error("Preencha CNPJ e Razão Social")
      return
    }
    setCriandoCliente(true)
    try {
      const res = await fetch("/api/recuperacao-credito/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: novoCnpj.trim(), razaoSocial: novaRazaoSocial.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar cliente")
      toast.success("Cliente criado!")
      setNovoCnpj("")
      setNovaRazaoSocial("")
      setModoNovoCliente(false)
      await carregarClientes()
      setClienteSelecionadoId(data.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar cliente")
    } finally {
      setCriandoCliente(false)
    }
  }

  const handleUploadPdfs = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || !clienteSelecionadoId) return
      const pdfs = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".pdf"))
      if (pdfs.length === 0) {
        toast.error("Selecione arquivos .pdf")
        return
      }

      setUploading(true)
      try {
        const form = new FormData()
        form.append("clienteId", clienteSelecionadoId)
        pdfs.forEach((f) => form.append("files", f, f.name))

        const res = await fetch("/api/recuperacao-credito/pgdas/upload", { method: "POST", body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erro ao processar PDFs")

        if (data.salvos?.length > 0) {
          toast.success(`${data.salvos.length} documento(s) importado(s) com sucesso!`)
        }
        for (const erro of data.erros ?? []) {
          toast.error(`${erro.arquivo}: ${erro.motivo}`)
        }

        await carregarDeclaracoes(clienteSelecionadoId)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao enviar PDFs")
      } finally {
        setUploading(false)
      }
    },
    [clienteSelecionadoId, carregarDeclaracoes]
  )

  const handleExcluirDeclaracao = async (id: string) => {
    if (!clienteSelecionadoId) return
    try {
      await fetch(`/api/recuperacao-credito/pgdas?id=${id}`, { method: "DELETE" })
      toast.success("Removido")
      await carregarDeclaracoes(clienteSelecionadoId)
    } catch {
      toast.error("Erro ao remover")
    }
  }

  const handleBaixarExcel = async () => {
    if (!clienteSelecionado || declaracoes.length === 0) return
    const registros: DeclaracaoPgdasRegistro[] = declaracoes.map((d) => ({
      competencia: d.competencia,
      tipoDocumento: d.tipoDocumento,
      dados: d.dados,
    }))
    await exportarPgdasExcel(registros, clienteSelecionado.razaoSocial)
  }

  // Agrupa declarações por mês pra exibir 1 linha por competência na tabela
  const mesesAgrupados = Array.from(new Set(declaracoes.map((d) => d.competencia)))
    .sort()
    .map((competencia) => {
      const doMes = declaracoes.filter((d) => d.competencia === competencia)
      const tipos = doMes.map((d) => d.tipoDocumento)
      const receita = doMes[0]?.dados.rpa.total ?? 0
      return { competencia, tipos, receita }
    })

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          <div>
            <CardTitle className="text-base">Importar Declarações do Simples Nacional (PGDAS-D)</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Envie os PDFs da Declaração e/ou Extrato do PGDAS — os dados são extraídos automaticamente e você pode
              baixar um Excel com um mês por coluna.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de cliente */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Cliente</Label>
          {modoNovoCliente ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="CNPJ" value={novoCnpj} onChange={(e) => setNovoCnpj(e.target.value)} className="sm:max-w-[200px]" />
              <Input placeholder="Razão Social" value={novaRazaoSocial} onChange={(e) => setNovaRazaoSocial(e.target.value)} className="flex-1" />
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

        {clienteSelecionado && (
          <>
            {/* Zona de upload */}
            <div
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUploadPdfs(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById("pgdas-file-input")?.click()}
              className={`border-2 border-dashed rounded-xl py-8 px-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Processando PDFs...</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Clique ou arraste as Declarações/Extratos (PDF) aqui
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Pode enviar vários meses de uma vez</p>
                </>
              )}
              <input
                id="pgdas-file-input"
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={(e) => { handleUploadPdfs(e.target.files); e.target.value = "" }}
              />
            </div>

            {/* Tabela de meses importados */}
            {carregandoDeclaracoes ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : mesesAgrupados.length > 0 ? (
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
                          {declaracoes
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
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum mês importado ainda para este cliente.</p>
            )}

            {mesesAgrupados.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleBaixarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Excel
                </Button>
              </div>
            )}
          </>
        )}

        {!clienteSelecionado && clientes.length === 0 && !modoNovoCliente && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
            <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Crie um cliente para começar a importar declarações do Simples Nacional.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
