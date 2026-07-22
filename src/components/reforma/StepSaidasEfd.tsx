"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { parseSaidasEfdContribuicoes, type LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"

// Passo 5 do wizard: fonte das saídas para os anos 2026-2033 — só EFD Contribuições nesta versão
// (XML fica pra depois, conforme pedido do usuário). Aceita múltiplos arquivos .txt (um por
// período/estabelecimento) e concatena as linhas — cada linha vira 1 item de nota fiscal, no
// mesmo shape das colunas A-BH das abas de ano (a cadeia de fórmulas BI+ é gerada na Fase 3).

export type SaidasEfdData = {
  arquivos: { nome: string; linhas: LinhaSaidaEfd[] }[]
}

export function defaultSaidasEfd(): SaidasEfdData {
  return { arquivos: [] }
}

interface Props {
  data: SaidasEfdData
  onChange: (d: SaidasEfdData) => void
  onBack: () => void
  onNext: () => void
}

export default function StepSaidasEfd({ data, onChange, onBack, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const processarArquivos = async (files: FileList) => {
    setLoading(true)
    const novos: SaidasEfdData["arquivos"] = []
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".txt")) {
          toast.error(`${file.name} não é .txt — ignorado`)
          continue
        }
        const texto = await file.text()
        const dados = parseSaidasEfdContribuicoes(texto)
        if (dados.linhas.length === 0) {
          toast.warning(`${file.name}: nenhum registro de saída (C170/C175, A170, F100 ou F550) encontrado`)
          continue
        }
        novos.push({ nome: file.name, linhas: dados.linhas })
      }
      if (novos.length > 0) {
        onChange({ arquivos: [...data.arquivos, ...novos] })
        toast.success(`${novos.length} arquivo(s) processado(s)`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar EFD Contribuições")
    } finally {
      setLoading(false)
    }
  }

  const remover = (nome: string) => onChange({ arquivos: data.arquivos.filter((a) => a.nome !== nome) })

  const totalLinhas = data.arquivos.reduce((s, a) => s + a.linhas.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Saídas — EFD Contribuições</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Envie os arquivos .txt do EFD Contribuições (PIS/COFINS) dos períodos que serão simulados.
          Cada item de nota (C170), NFC-e consolidada (C175), serviço (A170), demais operações (F100)
          e consolidação por competência (F550) vira uma linha nas abas de ano, com o CNPJ do
          estabelecimento correto (matriz e filiais do mesmo arquivo são separadas). Pode enviar
          mais de um arquivo (um por mês/empresa).
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/10" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) processarArquivos(e.dataTransfer.files) }}
      >
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          {loading ? "Processando..." : "Arraste um ou mais arquivos .txt do EFD Contribuições aqui"}
        </p>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Selecionar arquivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) processarArquivos(e.target.files) }}
        />
      </div>

      {data.arquivos.length > 0 && (
        <div className="space-y-2">
          {data.arquivos.map((a) => (
            <div key={a.nome} className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-700 dark:text-green-400 truncate">{a.nome}</span>
                <span className="text-xs text-muted-foreground shrink-0">— {a.linhas.length} itens</span>
              </div>
              <button onClick={() => remover(a.nome)} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-right">Total: {totalLinhas} linhas de item</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} disabled={data.arquivos.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Próximo: Entradas →
        </Button>
      </div>
    </div>
  )
}
