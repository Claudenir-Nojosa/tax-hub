"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, X, FileText, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { processarArquivos, RarNotSupportedError, type DadosReaisXml } from "@/lib/nfe-parser"
import { formatarMoeda } from "@/lib/reforma-engine"

interface Props {
  empresaId: string
  dadosXml: DadosReaisXml | null
  onDadosXml: (dados: DadosReaisXml | null) => void
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n)
const pct = (n: number) => `${(n * 100).toFixed(2)}%`

export default function XmlImportPanel({ empresaId, dadosXml, onDadosXml }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ atual: 0, total: 0 })
  const [showTable, setShowTable] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processar = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    setLoading(true)
    setProgress({ atual: 0, total: arr.length })
    try {
      const dados = await processarArquivos(arr, (a, t) => setProgress({ atual: a, total: t }))
      if (dados.totalItens === 0) {
        toast.error("Nenhum item encontrado nos XMLs. Verifique se são NF-e modelo 55.")
        return
      }
      onDadosXml(dados)

      // Salva no servidor (dados agregados — sem XMLs brutos)
      setSaving(true)
      const res = await fetch("/api/reforma-tributaria/xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, dadosXml: dados }),
      })
      if (!res.ok) {
        toast.warning("Dados processados mas não salvos no servidor. Verifique a conexão.")
      } else {
        toast.success(`${fmt(dados.totalNFs)} notas processadas — ${dados.mesesImportados} ${dados.mesesImportados === 1 ? "mês" : "meses"}`)
      }
    } catch (e) {
      if (e instanceof RarNotSupportedError) {
        toast.error(e.message, {
          description: "Windows: clique com botão direito no .rar → Extrair aqui → selecione os .xml ou compacte em .zip",
          duration: 8000,
        })
      } else {
        toast.error(e instanceof Error ? e.message : "Erro ao processar XMLs")
      }
    } finally {
      setLoading(false)
      setSaving(false)
    }
  }, [empresaId, onDadosXml])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processar(e.dataTransfer.files)
  }, [processar])

  const handleRemover = async () => {
    onDadosXml(null)
    await fetch(`/api/reforma-tributaria/xml?empresaId=${empresaId}`, { method: "DELETE" })
    toast.info("Dados XML removidos")
  }

  if (dadosXml) {
    const fator = dadosXml.fatorAnualizacao
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm text-green-800 dark:text-green-200">
              Dados reais importados
            </span>
            <Badge variant="outline" className="text-xs border-green-400 text-green-700 dark:text-green-300">
              {fmt(dadosXml.totalNFs)} NF-es · {dadosXml.mesesImportados} {dadosXml.mesesImportados === 1 ? "mês" : "meses"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemover}
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-3 w-3 mr-1" /> Remover
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">vProd total</p>
            <p className="font-semibold">{formatarMoeda(dadosXml.totalVProd)}</p>
            {fator > 1 && <p className="text-muted-foreground">{formatarMoeda(dadosXml.totalVProd * fator)}/ano (×{fator.toFixed(1)})</p>}
          </div>
          <div>
            <p className="text-muted-foreground">ICMS total</p>
            <p className="font-semibold">{formatarMoeda(dadosXml.totalVICMS)}</p>
            <p className="text-muted-foreground">{pct(dadosXml.aliquotaICMSEfetiva)} efetivo</p>
          </div>
          <div>
            <p className="text-muted-foreground">Base IBS/CBS</p>
            <p className="font-semibold text-primary">{formatarMoeda(dadosXml.totalBaseIbsCbs)}</p>
            <p className="text-muted-foreground">vProd − ICMS − PIS − COF</p>
          </div>
          <div>
            <p className="text-muted-foreground">Períodos</p>
            <p className="font-semibold">{dadosXml.periodos.join(", ")}</p>
            {fator !== 1 && <p className="text-amber-600">Fator ×{fator.toFixed(1)}</p>}
          </div>
        </div>

        {/* Tabela de itens (colapsável) */}
        <div>
          <button
            onClick={() => setShowTable((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showTable ? "Ocultar" : "Ver"} detalhamento por item ({fmt(dadosXml.totalItens)} itens)
          </button>
          {showTable && (
            <div className="mt-2 max-h-72 overflow-auto rounded border border-border">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 px-2">NF</th>
                    <th className="text-left py-1.5 px-2">Mês</th>
                    <th className="text-left py-1.5 px-2">Produto</th>
                    <th className="text-left py-1.5 px-2">NCM</th>
                    <th className="text-left py-1.5 px-2">CFOP</th>
                    <th className="text-right py-1.5 px-2">vProd</th>
                    <th className="text-right py-1.5 px-2">ICMS</th>
                    <th className="text-right py-1.5 px-2">PIS</th>
                    <th className="text-right py-1.5 px-2">COFINS</th>
                    <th className="text-right py-1.5 px-2">IPI</th>
                    <th className="text-right py-1.5 px-2 text-primary">Base IBS/CBS</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosXml.itens.slice(0, 500).map((item, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted">
                      <td className="py-1 px-2 font-mono">{item.nNF}</td>
                      <td className="py-1 px-2">{item.dhEmi}</td>
                      <td className="py-1 px-2 max-w-[160px] truncate" title={item.xProd}>{item.xProd}</td>
                      <td className="py-1 px-2 font-mono">{item.ncm}</td>
                      <td className="py-1 px-2 font-mono">{item.cfop}</td>
                      <td className="py-1 px-2 text-right">{formatarMoeda(item.vProd)}</td>
                      <td className="py-1 px-2 text-right">{formatarMoeda(item.vICMS)}</td>
                      <td className="py-1 px-2 text-right">{formatarMoeda(item.vPIS)}</td>
                      <td className="py-1 px-2 text-right">{formatarMoeda(item.vCOFINS)}</td>
                      <td className="py-1 px-2 text-right">{item.vIPI > 0 ? formatarMoeda(item.vIPI) : "—"}</td>
                      <td className="py-1 px-2 text-right font-semibold text-primary">{formatarMoeda(item.baseIbsCbs)}</td>
                    </tr>
                  ))}
                  {dadosXml.itens.length > 500 && (
                    <tr>
                      <td colSpan={11} className="py-2 px-2 text-center text-muted-foreground">
                        Mostrando 500 de {fmt(dadosXml.totalItens)} itens
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragging
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      style={{ cursor: loading ? "default" : "pointer" }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xml,.zip"
        className="hidden"
        onChange={(e) => processar(e.target.files)}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Processando {progress.atual}/{progress.total} {saving ? "· salvando..." : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Arraste XMLs ou ZIPs aqui
          </p>
          <p className="text-xs text-muted-foreground">
            Aceita <strong>.xml</strong> individual ou <strong>.zip</strong> com múltiplas NF-es
          </p>
          <p className="text-xs text-muted-foreground">
            Arquivo .rar? Extraia primeiro (clique direito → Extrair aqui) e importe como .zip ou .xml
          </p>
          <Button variant="outline" size="sm" className="mt-1 pointer-events-none">
            Selecionar arquivos
          </Button>
        </div>
      )}
    </div>
  )
}
