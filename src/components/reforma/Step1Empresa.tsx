"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, Building2, Plus, X, Landmark } from "lucide-react"
import { toast } from "sonner"

export type CnaeInfo = {
  codigo: string
  descricao: string
}

// Matriz/filial ou empresas do mesmo grupo comercial — cada uma tem CNPJ próprio e entra na
// tabela Estabelecimento→CNPJ da aba Premissas, usada pelos dropdowns de Valor Total NF-e e
// Quadro Comparativo (ver premissas-legislacoes.ts). A empresa buscada no topo (cnpj/razaoSocial
// deste EmpresaData) é sempre a matriz/principal — é dela que vêm regime, CNAE e faturamento
// usados no restante do wizard (premissas, legislação); as adicionais só entram na lista de
// estabelecimentos, sem duplicar essas informações.
export type EstabelecimentoData = {
  cnpj: string
  razaoSocial: string
}

export type EmpresaData = {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  regime: string
  simplesNacional: boolean
  uf: string
  municipio: string
  cnaePrincipal: string
  cnaePrincipalCodigo: string
  cnaesSecundarios: CnaeInfo[]
  faturamento: number
  estabelecimentosAdicionais: EstabelecimentoData[]
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

function formatCNPJ(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export default function Step1Empresa({ data, onChange, onNext }: Props) {
  const [cnpjInput, setCnpjInput] = useState(data.cnpj || "")
  const [loading, setLoading] = useState(false)
  const [cnpjAdicionalInput, setCnpjAdicionalInput] = useState("")
  const [buscandoAdicional, setBuscandoAdicional] = useState(false)

  const adicionarEstabelecimento = async () => {
    const digits = cnpjAdicionalInput.replace(/\D/g, "")
    if (digits.length !== 14) {
      toast.error("Digite um CNPJ válido com 14 dígitos")
      return
    }
    if (digits === data.cnpj || data.estabelecimentosAdicionais.some((e) => e.cnpj === digits)) {
      toast.error("Esse CNPJ já foi adicionado")
      return
    }
    setBuscandoAdicional(true)
    try {
      const res = await fetch(`/api/reforma-tributaria/cnpj/${digits}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onChange({
        ...data,
        estabelecimentosAdicionais: [
          ...data.estabelecimentosAdicionais,
          { cnpj: digits, razaoSocial: json.razaoSocial || digits },
        ],
      })
      setCnpjAdicionalInput("")
      toast.success(`${json.razaoSocial || "Estabelecimento"} adicionado`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar CNPJ")
    } finally {
      setBuscandoAdicional(false)
    }
  }

  const removerEstabelecimento = (cnpj: string) => {
    onChange({ ...data, estabelecimentosAdicionais: data.estabelecimentosAdicionais.filter((e) => e.cnpj !== cnpj) })
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
        cnaePrincipalCodigo: json.cnaeCode || "",
        cnaesSecundarios: Array.isArray(json.cnaesSecundarios) ? json.cnaesSecundarios : [],
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
    data.uf

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
            <p className="text-xs text-gray-500">
              {data.cnaePrincipalCodigo && <span className="font-mono">{data.cnaePrincipalCodigo}</span>} {data.cnaePrincipal}
            </p>
          )}
          {data.cnaesSecundarios.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">CNAEs secundários</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {data.cnaesSecundarios.map((c) => (
                  <li key={c.codigo}>
                    <span className="font-mono">{c.codigo}</span> {c.descricao}
                  </li>
                ))}
              </ul>
            </div>
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

      {/* Filiais / grupo comercial */}
      <div className="space-y-2">
        <Label>Outros CNPJs (matriz/filiais ou grupo comercial)</Label>
        <p className="text-xs text-gray-500">
          Se a simulação envolve mais de um CNPJ (matriz + filiais, ou empresas do mesmo grupo),
          adicione aqui — cada um vira um estabelecimento nos filtros do Excel final (Valor Total
          NF-e, Quadro Comparativo). O CNPJ buscado acima continua sendo o principal (dele vêm o
          regime, o CNAE e o faturamento usados no restante do wizard).
        </p>
        <div className="flex gap-2">
          <Input
            value={formatCNPJ(cnpjAdicionalInput)}
            onChange={(e) => setCnpjAdicionalInput(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="00.000.000/0000-00"
            className="font-mono"
            onKeyDown={(e) => e.key === "Enter" && adicionarEstabelecimento()}
          />
          <Button onClick={adicionarEstabelecimento} disabled={buscandoAdicional} variant="outline" className="shrink-0">
            {buscandoAdicional ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Adicionar</span>
          </Button>
        </div>
        {data.estabelecimentosAdicionais.length > 0 && (
          <ul className="space-y-1.5 mt-2">
            {data.estabelecimentosAdicionais.map((e) => (
              <li
                key={e.cnpj}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Landmark className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium truncate">{e.razaoSocial}</span>
                  <span className="text-xs font-mono text-gray-400 shrink-0">{formatCNPJ(e.cnpj)}</span>
                </div>
                <button onClick={() => removerEstabelecimento(e.cnpj)} className="text-gray-400 hover:text-red-500 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} className="bg-blue-600 hover:bg-blue-700 text-white">
          Próximo: Premissas →
        </Button>
      </div>
    </div>
  )
}
