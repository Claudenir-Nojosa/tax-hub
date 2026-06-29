"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"

export type EmpresaData = {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  regime: string
  simplesNacional: boolean
  uf: string
  municipio: string
  cnaePrincipal: string
  faturamento: number
}

const REGIMES = [
  { value: "SIMPLES_I",  label: "Simples Nacional — Anexo I (Comércio)" },
  { value: "SIMPLES_II", label: "Simples Nacional — Anexo II (Indústria)" },
  { value: "SIMPLES_III",label: "Simples Nacional — Anexo III (Serviços)" },
  { value: "LUCRO_PRESUMIDO", label: "Lucro Presumido" },
  { value: "LUCRO_REAL",      label: "Lucro Real" },
]

interface Props {
  data: EmpresaData
  onChange: (d: EmpresaData) => void
  onNext: () => void
}

export default function Step1Empresa({ data, onChange, onNext }: Props) {
  const [cnpjInput, setCnpjInput] = useState(data.cnpj || "")
  const [loading, setLoading] = useState(false)

  const formatCNPJ = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 14)
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  const buscarCNPJ = async () => {
    const digits = cnpjInput.replace(/\D/g, "")
    if (digits.length !== 14) {
      toast.error("Digite um CNPJ válido com 14 dígitos")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/reforma-tributaria/cnpj/${digits}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const regimeDetectado = json.simplesNacional ? "SIMPLES_II" : "LUCRO_PRESUMIDO"
      onChange({
        ...data,
        cnpj: digits,
        razaoSocial: json.razaoSocial || "",
        nomeFantasia: json.nomeFantasia || "",
        regime: regimeDetectado,
        simplesNacional: json.simplesNacional,
        uf: json.uf || "",
        municipio: json.municipio || "",
        cnaePrincipal: json.cnaePrincipal || "",
      })
      toast.success("CNPJ encontrado!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar CNPJ")
    } finally {
      setLoading(false)
    }
  }

  const isSimples = data.regime?.startsWith("SIMPLES")

  const canProceed =
    data.cnpj.length === 14 &&
    data.razaoSocial &&
    data.regime &&
    data.uf &&
    data.faturamento > 0

  return (
    <div className="space-y-6">
      {/* CNPJ */}
      <div className="space-y-2">
        <Label>CNPJ</Label>
        <div className="flex gap-2">
          <Input
            value={formatCNPJ(cnpjInput)}
            onChange={(e) => setCnpjInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="00.000.000/0000-00"
            className="font-mono"
            onKeyDown={(e) => e.key === "Enter" && buscarCNPJ()}
          />
          <Button onClick={buscarCNPJ} disabled={loading} variant="outline" className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Buscar</span>
          </Button>
        </div>
      </div>

      {/* Dados empresa */}
      {data.razaoSocial && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-sm">{data.razaoSocial}</span>
            {data.nomeFantasia && (
              <span className="text-xs text-gray-500">({data.nomeFantasia})</span>
            )}
            <Badge variant={isSimples ? "default" : "outline"} className="ml-auto text-xs">
              {REGIMES.find((r) => r.value === data.regime)?.label ?? (isSimples ? "Simples Nacional" : "Regime Regular")}
            </Badge>
          </div>
          {data.cnaePrincipal && (
            <p className="text-xs text-gray-500">{data.cnaePrincipal}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>UF: <span className="text-gray-700 dark:text-gray-300 font-medium">{data.uf}</span></span>
            <span>Município: <span className="text-gray-700 dark:text-gray-300 font-medium">{data.municipio}</span></span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input
            value={data.razaoSocial}
            onChange={(e) => onChange({ ...data, razaoSocial: e.target.value })}
            placeholder="Nome da empresa"
          />
        </div>
        <div className="space-y-2">
          <Label>UF</Label>
          <Input
            value={data.uf}
            onChange={(e) => onChange({ ...data, uf: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="CE"
            maxLength={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Regime Tributário</Label>
        <Select value={data.regime} onValueChange={(v) => onChange({ ...data, regime: v, simplesNacional: v.startsWith("SIMPLES") })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o regime" />
          </SelectTrigger>
          <SelectContent>
            {REGIMES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Faturamento Anual Estimado (R$)</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={data.faturamento ? new Intl.NumberFormat("pt-BR").format(data.faturamento) : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
            const num = parseFloat(raw)
            onChange({ ...data, faturamento: isNaN(num) ? 0 : num })
          }}
          placeholder="Ex: 12.670.021"
        />
        <p className="text-xs text-gray-500">
          Receita bruta anual — base para o cálculo das simulações
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} className="bg-blue-600 hover:bg-blue-700 text-white">
          Próximo: Premissas →
        </Button>
      </div>
    </div>
  )
}
