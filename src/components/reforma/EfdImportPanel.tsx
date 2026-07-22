"use client"

import { useRef, useState } from "react"
import { FileText, Upload, X, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { parseEfdTxt, type DadosEfd } from "@/lib/efd-parser"
import { formatarMoeda, formatarPorcentagem } from "@/lib/reforma-engine"

interface Props {
  dadosEfd: DadosEfd | null
  onDadosEfd: (dados: DadosEfd | null) => void
}

export default function EfdImportPanel({ dadosEfd, onDadosEfd }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showC190, setShowC190] = useState(false)

  const processar = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      toast.error("Apenas arquivos .txt do EFD ICMS IPI são aceitos.")
      return
    }
    setLoading(true)
    try {
      const texto = await file.text()
      const dados = parseEfdTxt(texto)
      if (dados.c190Entradas.length === 0 && dados.c190Saidas.length === 0) {
        toast.warning("Nenhum registro C190 encontrado. Verifique se é um EFD ICMS IPI válido.")
      }
      onDadosEfd(dados)
      toast.success("EFD importado com sucesso.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar o EFD.")
    } finally {
      setLoading(false)
    }
  }

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    processar(files[0])
  }

  const remover = () => {
    onDadosEfd(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  if (!dadosEfd) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
      >
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          {loading ? "Processando..." : "Arraste o arquivo .txt do EFD ICMS IPI aqui"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">Registros extraídos: C100, C190 e E110</p>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3 mr-1" /> Selecionar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
    )
  }

  const { apuracaoICMS } = dadosEfd
  const saldoDevedor = apuracaoICMS && apuracaoICMS.vlICMSRecolher > 0
  const saldoCredor = apuracaoICMS && apuracaoICMS.vlSldCredorTransp > 0

  return (
    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            EFD ICMS IPI importado
          </span>
          {dadosEfd.periodos.length > 0 && (
            <span className="text-xs text-muted-foreground">
              — {dadosEfd.periodos.join(", ")}
            </span>
          )}
        </div>
        <button
          onClick={remover}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remover EFD"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-green-700 dark:text-green-400">
        ✓ Alíquota ICMS compras preenchida automaticamente dos dados EFD.
      </p>

      {/* Seção 1 — C190 Créditos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Créditos — C190 Entradas
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-xs text-muted-foreground mb-1">BC ICMS Entradas</p>
            <p className="font-bold text-primary text-sm">
              {formatarMoeda(dadosEfd.bcICMSEntradas)}
            </p>
            <p className="text-xs text-primary">base crédito IBS/CBS</p>
          </div>
          <div className="rounded-md bg-card border border-border p-2 text-center">
            <p className="text-xs text-muted-foreground mb-1">Crédito ICMS atual</p>
            <p className="font-semibold text-sm">{formatarMoeda(dadosEfd.icmsCreditoEntradas)}</p>
          </div>
          <div className="rounded-md bg-card border border-border p-2 text-center">
            <p className="text-xs text-muted-foreground mb-1">Alíq. média entradas</p>
            <p className="font-semibold text-sm">{formatarPorcentagem(dadosEfd.aliquotaMediaEntradas, 2)}</p>
          </div>
        </div>

        {/* Toggle tabela C190 */}
        <button
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowC190((v) => !v)}
        >
          {showC190 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showC190 ? "Ocultar" : "Ver"} registros C190 ({dadosEfd.c190Entradas.length} entradas / {dadosEfd.c190Saidas.length} saídas)
        </button>
        {showC190 && (
          <div className="mt-2 overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-1 pr-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-1 px-2 font-medium text-muted-foreground">CFOP</th>
                  <th className="text-left py-1 px-2 font-medium text-muted-foreground">CST</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">Alíq.</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">VL OPR</th>
                  <th className="text-right py-1 px-2 font-medium text-muted-foreground">BC ICMS</th>
                  <th className="text-right py-1 pl-2 font-medium text-muted-foreground">ICMS</th>
                </tr>
              </thead>
              <tbody>
                {[...dadosEfd.c190Entradas, ...dadosEfd.c190Saidas].map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className={`py-1 pr-2 font-medium ${r.tipoOperacao === "entrada" ? "text-green-600" : "text-orange-500"}`}>
                      {r.tipoOperacao === "entrada" ? "Ent" : "Saí"}
                    </td>
                    <td className="py-1 px-2 font-mono">{r.cfop}</td>
                    <td className="py-1 px-2 font-mono">{r.cst}</td>
                    <td className="py-1 px-2 text-right">{formatarPorcentagem(r.aliqICMS / 100, 2)}</td>
                    <td className="py-1 px-2 text-right">{formatarMoeda(r.vlOpr)}</td>
                    <td className="py-1 px-2 text-right">{formatarMoeda(r.vlBCICMS)}</td>
                    <td className="py-1 pl-2 text-right">{formatarMoeda(r.vlICMS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção 2 — C100 Documentos */}
      {(dadosEfd.totalDocumentosEntrada > 0 || dadosEfd.totalDocumentosSaida > 0) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Documentos — C100
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-card border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">NFs Entrada</p>
              <p className="font-semibold text-sm">{dadosEfd.totalDocumentosEntrada}</p>
              <p className="text-xs text-muted-foreground">{formatarMoeda(dadosEfd.totalEntradasVlOpr)}</p>
            </div>
            <div className="rounded-md bg-card border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">NFs Saída</p>
              <p className="font-semibold text-sm">{dadosEfd.totalDocumentosSaida}</p>
              <p className="text-xs text-muted-foreground">{formatarMoeda(dadosEfd.totalSaidasVlOpr)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Seção 3 — E110 Apuração */}
      {apuracaoICMS && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Apuração ICMS — E110
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-card border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Débitos</p>
              <p className="font-semibold text-sm text-red-600">{formatarMoeda(apuracaoICMS.vlTotDebitos)}</p>
            </div>
            <div className="rounded-md bg-card border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Créditos</p>
              <p className="font-semibold text-sm text-green-600">{formatarMoeda(apuracaoICMS.vlTotCreditos)}</p>
            </div>
          </div>
          <div className={`mt-2 rounded-md p-2 text-center border ${
            saldoDevedor
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          }`}>
            {saldoDevedor ? (
              <>
                <p className="text-xs text-red-600 dark:text-red-400">ICMS a recolher</p>
                <p className="font-bold text-red-700 dark:text-red-400">{formatarMoeda(apuracaoICMS.vlICMSRecolher)}</p>
              </>
            ) : saldoCredor ? (
              <>
                <p className="text-xs text-green-600 dark:text-green-400">Saldo credor a transportar</p>
                <p className="font-bold text-green-700 dark:text-green-400">{formatarMoeda(apuracaoICMS.vlSldCredorTransp)}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sem saldo a recolher ou transportar</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
