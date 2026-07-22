"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, FolderOpen, Trash2, FileDown, FileSpreadsheet, HardDrive, CloudOff } from "lucide-react"
import { carregarProjetoWizard } from "@/lib/reforma-wizard-store"
import ExportarProjetoDialog from "./ExportarProjetoDialog"
import type { PremissasReformaData } from "./StepPremissasReforma"
import type { LegislacaoData } from "./StepLegislacaoIA"
import type { CnaeInfo, EstabelecimentoData } from "./Step1Empresa"

// Shape da empresa como vem da listagem (GET /api/reforma-tributaria/empresas) — inclui o
// parametrosExtra completo, que alimenta a exportação rápida do ExportarProjetoDialog.
export type EmpresaReformaResumo = {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  regime: string
  simplesNacional: boolean
  uf: string
  municipio?: string | null
  cnaePrincipal?: string | null
  parametrosExtra?: {
    nomeProjeto?: string
    logoDataUrl?: string | null
    cnaePrincipalCodigo?: string
    cnaesSecundarios?: CnaeInfo[]
    estabelecimentosAdicionais?: EstabelecimentoData[]
    premissasReforma?: PremissasReformaData
    legislacao?: LegislacaoData
    // textos do PDF executivo, salvos antes da geração (ExportarPdfDialog)
    pdfLegislacoes?: string
    pdfConsideracoes?: string
  } | null
}

interface Props {
  empresa: EmpresaReformaResumo
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
  const logo = empresa.parametrosExtra?.logoDataUrl
  const [exportarAberto, setExportarAberto] = useState(false)
  // dados do estudo salvos NESTE navegador (IndexedDB)? Define o estado do botão Exportar
  const [temDadosLocais, setTemDadosLocais] = useState<boolean | null>(null)

  useEffect(() => {
    let ativo = true
    carregarProjetoWizard(empresa.id)
      .then((p) => { if (ativo) setTemDadosLocais(Boolean(p && p.saidasEfd.arquivos.length > 0)) })
      .catch(() => { if (ativo) setTemDadosLocais(false) })
    return () => { ativo = false }
  }, [empresa.id])

  return (
    <div className="group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 flex flex-col">
      {/* filete superior de identidade */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-400" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Cabeçalho: avatar/logo + nomes + excluir */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground leading-snug truncate" title={empresa.razaoSocial}>
              {empresa.razaoSocial}
            </p>
            {empresa.nomeFantasia && (
              <p className="text-xs text-muted-foreground truncate">{empresa.nomeFantasia}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(empresa.id)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
            title="Excluir empresa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
            {formatCNPJ(empresa.cnpj)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
            {empresa.uf}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
            {REGIME_LABELS[empresa.regime] ?? empresa.regime}
          </span>
        </div>

        {/* Projeto + status dos dados locais */}
        <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 flex items-center gap-2.5">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">
              {nomeProjeto ?? "Projeto sem nome"}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              {temDadosLocais === null ? (
                "Verificando dados locais..."
              ) : temDadosLocais ? (
                <><HardDrive className="h-3 w-3 text-emerald-500" /> Estudo salvo neste navegador</>
              ) : (
                <><CloudOff className="h-3 w-3 text-amber-500" /> Sem dados de EFD neste navegador</>
              )}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            onClick={() => setExportarAberto(true)}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5" /> Exportar Excel
          </button>
          <Link
            href={`/dashboard/reforma-tributaria/${empresa.id}?edit=true`}
            className="h-9 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" /> Abrir projeto
          </Link>
        </div>
      </div>

      <ExportarProjetoDialog empresa={empresa} open={exportarAberto} onOpenChange={setExportarAberto} />
    </div>
  )
}
