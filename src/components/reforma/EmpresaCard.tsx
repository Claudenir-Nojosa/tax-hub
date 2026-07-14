"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, FolderOpen, Trash2 } from "lucide-react"

type Empresa = {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  regime: string
  simplesNacional: boolean
  uf: string
  parametrosExtra?: { nomeProjeto?: string } | null
  simulacoes: { createdAt: string; resultados: unknown }[]
}

interface Props {
  empresa: Empresa
  onDelete: (id: string) => void
}

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_I:        "Simples I",
  SIMPLES_II:       "Simples II",
  SIMPLES_III:      "Simples III",
  LUCRO_PRESUMIDO:  "Lucro Presumido",
  LUCRO_REAL:       "Lucro Real",
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export default function EmpresaCard({ empresa, onDelete }: Props) {
  const nomeProjeto = empresa.parametrosExtra?.nomeProjeto?.trim()

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm leading-tight">{empresa.razaoSocial}</p>
            {empresa.nomeFantasia && (
              <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-red-500 h-7 w-7 shrink-0"
          onClick={() => onDelete(empresa.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">{formatCNPJ(empresa.cnpj)}</Badge>
        <Badge variant="outline" className="text-xs">{empresa.uf}</Badge>
        <Badge
          variant={empresa.simplesNacional ? "default" : "outline"}
          className="text-xs"
        >
          {REGIME_LABELS[empresa.regime] ?? empresa.regime}
        </Badge>
      </div>

      {nomeProjeto && (
        <div className="text-sm">
          <p className="text-gray-500 text-xs">Projeto</p>
          <p className="font-medium">{nomeProjeto}</p>
        </div>
      )}

      {/* Abre o wizard em modo edição: se os dados do estudo estiverem salvos neste navegador
          (IndexedDB), cai direto na Revisão — dá pra consultar, editar qualquer passo e baixar
          o Excel de novo sem refazer nada. */}
      <Link href={`/dashboard/reforma-tributaria/${empresa.id}?edit=true`} className="mt-auto">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
          <FolderOpen className="h-4 w-4 mr-2" /> Abrir projeto
        </Button>
      </Link>
    </div>
  )
}
