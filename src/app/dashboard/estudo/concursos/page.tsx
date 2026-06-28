"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Trash2, Pencil, Star, Loader2, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import type { ConcursoData } from "@/lib/estudo-data"

const ConcursoModal = dynamic(() => import("@/components/estudo/ConcursoModal"), { ssr: false })

type Concurso = ConcursoData & { createdAt: string }

export default function ConcursosPage() {
  const router = useRouter()
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Concurso | null>(null)
  const [definindoPrincipal, setDefinindoPrincipal] = useState<string | null>(null)

  const carregar = async () => {
    try {
      const res = await fetch("/api/concurso")
      setConcursos(await res.json())
    } catch { toast.error("Erro ao carregar concursos") }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const handleSalvar = async (dados: Omit<ConcursoData, "id" | "isPrincipal">) => {
    if (editando) {
      await fetch(`/api/concurso/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      toast.success("Concurso atualizado!")
    } else {
      await fetch("/api/concurso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dados, isPrincipal: concursos.length === 0 }),
      })
      toast.success("Concurso criado!")
    }
    setEditando(null)
    setModalAberto(false)
    carregar()
  }

  const handleDefinirPrincipal = async (id: string) => {
    setDefinindoPrincipal(id)
    try {
      await fetch(`/api/concurso/${id}/principal`, { method: "POST" })
      toast.success("Concurso principal definido!")
      carregar()
    } catch { toast.error("Erro") }
    finally { setDefinindoPrincipal(null) }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este concurso e todo o progresso associado?")) return
    await fetch(`/api/concurso/${id}`, { method: "DELETE" })
    toast.success("Concurso excluído")
    carregar()
  }

  const handleEstudar = async (concurso: Concurso) => {
    if (!concurso.isPrincipal) await handleDefinirPrincipal(concurso.id)
    router.push("/dashboard/estudo")
  }

  const formatData = (iso?: string) => {
    if (!iso) return null
    // Força parse sem conversão de fuso: pega só a parte YYYY-MM-DD
    const [y, m, d] = iso.split("T")[0].split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Concursos</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie seus concursos e acesse o módulo de estudos de cada um.</p>
        </div>
        <Button onClick={() => { setEditando(null); setModalAberto(true) }} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Novo Concurso
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
      ) : concursos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum concurso ainda. Crie o primeiro!</p>
          <Button onClick={() => { setEditando(null); setModalAberto(true) }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Criar Concurso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {concursos.map(c => (
            <div key={c.id} className={`rounded-xl border p-5 bg-white dark:bg-gray-900 flex flex-col gap-3 transition-all ${c.isPrincipal ? "border-blue-500 shadow-blue-500/20 shadow-lg" : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"}`}>
              {/* Header */}
              <div className="flex items-start gap-3">
                {c.foto ? (
                  <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center overflow-visible">
                    <img src={c.foto} alt={c.nome} className="max-w-[56px] max-h-[56px] w-auto h-auto rounded-lg object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-7 w-7 text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{c.nome}</h3>
                    {c.isPrincipal && <Badge className="text-xs bg-blue-600/20 text-blue-600 dark:text-blue-300 border-blue-600/40">Principal</Badge>}
                  </div>
                  {c.orgao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.orgao}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditando(c); setModalAberto(true) }} className="text-gray-400 hover:text-blue-500 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleExcluir(c.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{c.materias?.length ?? 0} matérias</span>
                {c.dataProva && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />{formatData(c.dataProva)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <Button onClick={() => handleEstudar(c)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  Estudar
                </Button>
                {!c.isPrincipal && (
                  <Button variant="outline" size="sm" className="text-xs h-8" disabled={definindoPrincipal === c.id} onClick={() => handleDefinirPrincipal(c.id)}>
                    {definindoPrincipal === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <ConcursoModal
          inicial={editando ?? undefined}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setEditando(null) }}
        />
      )}
    </div>
  )
}
