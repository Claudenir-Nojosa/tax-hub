"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, Loader2, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { parseEntradasEfdIcmsIpi, type LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import { consultarCnpjsEmLote, type ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"

// Passo 6 do wizard: fonte das entradas (crédito IBS/CBS) — só EFD ICMS/IPI nesta versão (XML
// fica pra depois). O CNPJ do fornecedor por documento (via registro 0150) é o que faltava nos
// parsers existentes. Assim que os arquivos são processados, classifica automaticamente cada CNPJ
// de fornecedor único como Simples Nacional ou Regime Regular via consultarCnpjsEmLote (mesma lib
// endurecida — retry/backoff — da Consulta Simples Nacional em Automações). O usuário pediu "zero
// erro" nessa classificação: qualquer CNPJ que não resolver fica marcado e bloqueia a geração do
// Excel até reclassificar, em vez de assumir um regime por padrão.

export type EntradasEfdData = {
  arquivos: { nome: string; linhas: LinhaEntradaEfd[] }[]
  classificacoes: Record<string, ResultadoConsultaCnpj>
}

export function defaultEntradasEfd(): EntradasEfdData {
  return { arquivos: [], classificacoes: {} }
}

interface Props {
  data: EntradasEfdData
  onChange: (d: EntradasEfdData) => void
  onBack: () => void
  onNext: () => void
}

export default function StepEntradasEfd({ data, onChange, onBack, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [classificando, setClassificando] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)

  const classificarPendentes = async (arquivos: EntradasEfdData["arquivos"], classificacoesAtuais: Record<string, ResultadoConsultaCnpj>) => {
    const todosCnpjs = new Set(arquivos.flatMap((a) => a.linhas.map((l) => l.cnpjFornecedor).filter(Boolean)))
    // "pendente" = nunca classificado OU classificado com erro — assim reclassificar tenta de novo
    // só quem falhou, sem gastar chamada em quem já resolveu certo (e sem perder o resultado bom)
    const pendentes = Array.from(todosCnpjs).filter((cnpj) => !classificacoesAtuais[cnpj] || classificacoesAtuais[cnpj].erro)
    if (pendentes.length === 0) return classificacoesAtuais

    setClassificando(true)
    setProgresso({ atual: 0, total: pendentes.length })
    try {
      const resultados = await consultarCnpjsEmLote(pendentes, (atual, total) => setProgresso({ atual, total }))
      const novas = { ...classificacoesAtuais }
      for (const r of resultados) novas[r.cnpj] = r
      const comErro = resultados.filter((r) => r.erro).length
      if (comErro > 0) {
        toast.warning(`${comErro} fornecedor(es) não puderam ser classificados — tente reclassificar antes de gerar o Excel`)
      } else {
        toast.success(`${resultados.length} fornecedor(es) classificados (Simples Nacional / Regime Regular)`)
      }
      return novas
    } finally {
      setClassificando(false)
      setProgresso(null)
    }
  }

  const processarArquivos = async (files: FileList) => {
    setLoading(true)
    const novos: EntradasEfdData["arquivos"] = []
    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".txt")) {
          toast.error(`${file.name} não é .txt — ignorado`)
          continue
        }
        const texto = await file.text()
        const dados = parseEntradasEfdIcmsIpi(texto)
        if (dados.linhas.length === 0) {
          toast.warning(`${file.name}: nenhum registro de entrada (C100/C170 com CFOP 1xxx/2xxx/3xxx) encontrado`)
          continue
        }
        novos.push({ nome: file.name, linhas: dados.linhas })
      }
      if (novos.length > 0) {
        const arquivos = [...data.arquivos, ...novos]
        onChange({ arquivos, classificacoes: data.classificacoes })
        toast.success(`${novos.length} arquivo(s) processado(s)`)
        const classificacoes = await classificarPendentes(arquivos, data.classificacoes)
        onChange({ arquivos, classificacoes })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar EFD ICMS/IPI")
    } finally {
      setLoading(false)
    }
  }

  const reclassificar = async () => {
    // passa as classificações já obtidas (não {}) — senão reclassificarPendentes acha que TODO
    // mundo está pendente de novo, incluindo quem já classificou certo, e refaz o lote inteiro
    const classificacoes = await classificarPendentes(data.arquivos, data.classificacoes)
    onChange({ ...data, classificacoes })
  }

  const remover = (nome: string) => onChange({ ...data, arquivos: data.arquivos.filter((a) => a.nome !== nome) })

  const todasLinhas = data.arquivos.flatMap((a) => a.linhas)
  const cnpjsUnicos = Array.from(new Set(todasLinhas.map((l) => l.cnpjFornecedor).filter(Boolean)))
  const cnpjsComErro = cnpjsUnicos.filter((c) => data.classificacoes[c]?.erro)
  const cnpjsClassificados = cnpjsUnicos.filter((c) => data.classificacoes[c] && !data.classificacoes[c].erro)
  const simplesCount = cnpjsClassificados.filter((c) => data.classificacoes[c].simplesNacional).length
  const regularCount = cnpjsClassificados.length - simplesCount
  const podeAvancar = data.arquivos.length > 0 && !classificando && cnpjsComErro.length === 0 && cnpjsUnicos.length === cnpjsClassificados.length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Entradas — EFD ICMS/IPI</h3>
        <p className="text-xs text-gray-500 mt-1">
          Envie os arquivos .txt do EFD ICMS/IPI com as compras do período. Cada fornecedor único é
          classificado automaticamente como Simples Nacional ou Regime Regular — usado depois pra
          calcular o crédito de IBS/CBS (Simples Nacional não gera crédito).
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) processarArquivos(e.dataTransfer.files) }}
      >
        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-3">
          {loading ? "Processando..." : "Arraste um ou mais arquivos .txt do EFD ICMS/IPI aqui"}
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
                <span className="text-xs text-gray-400 shrink-0">— {a.linhas.length} itens</span>
              </div>
              <button onClick={() => remover(a.nome)} className="text-gray-400 hover:text-red-500 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500 text-right">
            Total: {todasLinhas.length} linhas de item — {cnpjsUnicos.length} fornecedores únicos
          </p>
        </div>
      )}

      {classificando && progresso && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Classificando fornecedores ({progresso.atual}/{progresso.total})...
          </p>
        </div>
      )}

      {!classificando && cnpjsUnicos.length > 0 && (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 ${
            cnpjsComErro.length > 0
              ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30"
              : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30"
          }`}
        >
          {cnpjsComErro.length > 0 ? (
            <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 space-y-1">
            <p className={`text-xs ${cnpjsComErro.length > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {cnpjsComErro.length > 0
                ? `${cnpjsComErro.length} fornecedor(es) não classificados — a geração do Excel fica bloqueada até reclassificar`
                : `${regularCount} Regime Regular, ${simplesCount} Simples Nacional`}
            </p>
            {cnpjsComErro.length > 0 && (
              <Button variant="outline" size="sm" onClick={reclassificar}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reclassificar
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} disabled={!podeAvancar} className="bg-blue-600 hover:bg-blue-700 text-white">
          Próximo: Revisão →
        </Button>
      </div>
    </div>
  )
}
