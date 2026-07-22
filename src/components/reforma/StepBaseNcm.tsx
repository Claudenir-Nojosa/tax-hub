"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, X, Database } from "lucide-react"
import { toast } from "sonner"

// Passo 4 do wizard: base de NCM a usar no cálculo de crédito IBS/CBS das entradas (Fase 5). Se
// o usuário não enviar uma base própria, usa a "Base IBS-CBS" padrão (4.524 linhas, extraída do
// Excel-modelo — ver src/lib/reforma-base-ibs-cbs.ts). O upload aceita .xlsx com as mesmas
// colunas do modelo; a validação de estrutura fica pra quando a base for de fato consumida
// (Fase 4/5), aqui só se guarda o arquivo.

export type BaseNcmData = {
  usarPadrao: boolean
  arquivoCustomNome: string | null
  arquivoCustomBuffer: ArrayBuffer | null
}

export function defaultBaseNcm(): BaseNcmData {
  return { usarPadrao: true, arquivoCustomNome: null, arquivoCustomBuffer: null }
}

interface Props {
  data: BaseNcmData
  onChange: (d: BaseNcmData) => void
  onBack: () => void
  onNext: () => void
}

export default function StepBaseNcm({ data, onChange, onBack, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const processarArquivo = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      toast.error("Envie um arquivo Excel (.xlsx ou .xls)")
      return
    }
    const buffer = await file.arrayBuffer()
    onChange({ usarPadrao: false, arquivoCustomNome: file.name, arquivoCustomBuffer: buffer })
    toast.success("Base de NCM carregada")
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Base de NCM</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Base usada para calcular o crédito de IBS/CBS nas entradas (Passo 6), com o percentual de
          redução por NCM/Anexo. Use a base padrão ou envie uma específica do cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onChange({ ...data, usarPadrao: true })}
          className={`rounded-lg border p-4 text-left transition-colors ${
            data.usarPadrao
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40"
          }`}
        >
          <Database className={`h-5 w-5 mb-2 ${data.usarPadrao ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium">Usar base padrão</p>
          <p className="text-xs text-muted-foreground mt-1">4.524 NCMs mapeados com alíquota de redução (Anexos da LC 214/2025)</p>
        </button>

        <button
          onClick={() => onChange({ ...data, usarPadrao: false })}
          className={`rounded-lg border p-4 text-left transition-colors ${
            !data.usarPadrao
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40"
          }`}
        >
          <FileSpreadsheet className={`h-5 w-5 mb-2 ${!data.usarPadrao ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium">Base própria do cliente</p>
          <p className="text-xs text-muted-foreground mt-1">Envie um Excel com as mesmas colunas da base padrão</p>
        </button>
      </div>

      {!data.usarPadrao && (
        <div>
          {!data.arquivoCustomNome ? (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragging ? "border-primary bg-primary/10" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processarArquivo(file) }}
            >
              <p className="text-sm text-muted-foreground mb-3">Arraste o Excel da base de NCM aqui</p>
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> Selecionar arquivo
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) processarArquivo(file) }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">{data.arquivoCustomNome}</span>
              </div>
              <button onClick={() => onChange({ ...data, arquivoCustomNome: null, arquivoCustomBuffer: null })} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button
          onClick={onNext}
          disabled={!data.usarPadrao && !data.arquivoCustomNome}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo: Saídas →
        </Button>
      </div>
    </div>
  )
}
