"use client"

import { useRef, useState } from "react"
import { FileBox, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { processarArquivos, type DadosReaisXml } from "@/lib/nfe-parser"
import { formatarMoeda, formatarPorcentagem } from "@/lib/reforma-engine"

interface Props {
  dadosXmlEntradas: DadosReaisXml | null
  onDadosXmlEntradas: (dados: DadosReaisXml | null) => void
}

export default function XmlEntradasPanel({ dadosXmlEntradas, onDadosXmlEntradas }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ atual: 0, total: 0 })

  const processar = async (files: FileList) => {
    setLoading(true)
    try {
      const dados = await processarArquivos(Array.from(files), (atual, total) =>
        setProgress({ atual, total })
      )
      if (!dados || dados.totalItens === 0) {
        toast.warning("Nenhum item encontrado. Verifique se são NF-e modelo 55 de entradas.")
        return
      }
      onDadosXmlEntradas(dados)
      toast.success(`${dados.totalNFs} NF-e de entradas processadas.`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao processar os XMLs."
      toast.error(msg)
    } finally {
      setLoading(false)
      setProgress({ atual: 0, total: 0 })
    }
  }

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    processar(files)
  }

  const remover = () => {
    onDadosXmlEntradas(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  if (!dadosXmlEntradas) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
      >
        <FileBox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          {loading
            ? progress.total > 0 ? `Processando ${progress.atual}/${progress.total}...` : "Processando..."
            : "Arraste XMLs de NF-e de entrada aqui"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">Aceita .xml individuais ou .zip</p>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3 mr-1" /> Selecionar arquivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.zip"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
    )
  }

  const bcEntradas = dadosXmlEntradas.totalBaseIbsCbs
  const icmsCredito = dadosXmlEntradas.totalVICMS
  const aliqMedia = dadosXmlEntradas.totalVProd > 0 ? icmsCredito / dadosXmlEntradas.totalVProd : 0

  return (
    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBox className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            {dadosXmlEntradas.totalNFs} NF-e de entradas importadas
          </span>
          {dadosXmlEntradas.periodos.length > 0 && (
            <span className="text-xs text-muted-foreground">— {dadosXmlEntradas.periodos.join(", ")}</span>
          )}
        </div>
        <button onClick={remover} className="text-muted-foreground hover:text-destructive transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-green-700 dark:text-green-400">
        ✓ Base de crédito IBS/CBS obtida dos XMLs de entrada.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
          <p className="text-xs text-muted-foreground mb-1">BC IBS/CBS Entradas</p>
          <p className="font-bold text-primary text-sm">{formatarMoeda(bcEntradas)}</p>
          <p className="text-xs text-primary">base crédito</p>
        </div>
        <div className="rounded-md bg-card border border-border p-2 text-center">
          <p className="text-xs text-muted-foreground mb-1">Crédito ICMS atual</p>
          <p className="font-semibold text-sm">{formatarMoeda(icmsCredito)}</p>
        </div>
        <div className="rounded-md bg-card border border-border p-2 text-center">
          <p className="text-xs text-muted-foreground mb-1">Alíq. média</p>
          <p className="font-semibold text-sm">{formatarPorcentagem(aliqMedia, 2)}</p>
        </div>
      </div>
    </div>
  )
}
