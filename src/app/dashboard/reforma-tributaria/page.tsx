"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Scale, Loader2 } from "lucide-react"
import EmpresaCard, { type EmpresaReformaResumo } from "@/components/reforma/EmpresaCard"
import { toast } from "sonner"
import { removerProjetoWizard } from "@/lib/reforma-wizard-store"

type Empresa = EmpresaReformaResumo

export default function ReformaTributariaPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/reforma-tributaria/empresas")
      const data = await res.json()
      setEmpresas(data)
    } catch {
      toast.error("Erro ao carregar empresas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta empresa e todas as simulações?")) return
    try {
      await fetch(`/api/reforma-tributaria/empresas/${id}`, { method: "DELETE" })
      // limpa também os dados do estudo salvos neste navegador (IndexedDB)
      await removerProjetoWizard(id).catch(() => {})
      setEmpresas((prev) => prev.filter((e) => e.id !== id))
      toast.success("Empresa excluída")
    } catch {
      toast.error("Erro ao excluir empresa")
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Reforma Tributária</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Simule o impacto da EC 132/2023 e LC 214/2025 para cada empresa: IBS, CBS, extinção
            progressiva do ICMS (2029–2033), fim do IPI (2027) e impacto nos benefícios fiscais.
          </p>
        </div>
        <Link href="/dashboard/reforma-tributaria/nova">
          <Button className="bg-primary hover:bg-primary/90 text-white shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nova Empresa
          </Button>
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "2026", desc: "CBS 0,9% + IBS 0,1%" },
          { label: "2027–28", desc: "CBS 8,7% — IPI extinto" },
          { label: "2029–32", desc: "IBS+CBS cresce gradual" },
          { label: "2033", desc: "IBS+CBS 26,5% — ICMS 0%" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-3 text-center">
            <p className="font-bold text-primary text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Empresas */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhuma empresa cadastrada ainda.</p>
          <Link href="/dashboard/reforma-tributaria/nova">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Cadastrar primeira empresa
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((empresa) => (
            <EmpresaCard key={empresa.id} empresa={empresa} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
