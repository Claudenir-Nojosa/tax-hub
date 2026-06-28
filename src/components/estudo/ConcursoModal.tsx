"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Trash2, Loader2, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { MateriaConcurso, ConcursoData } from "@/lib/estudo-data"

const CORES_DISPONIVEIS = [
  "sky","blue","emerald","violet","rose","amber","teal","indigo",
  "pink","cyan","lime","orange","purple","red","green","yellow",
]

const COR_CLASSES: Record<string, string> = {
  sky: "bg-sky-500", blue: "bg-blue-500", emerald: "bg-emerald-500",
  violet: "bg-violet-500", rose: "bg-rose-500", amber: "bg-amber-500",
  teal: "bg-teal-500", indigo: "bg-indigo-500", pink: "bg-pink-500",
  cyan: "bg-cyan-500", lime: "bg-lime-500", orange: "bg-orange-500",
  purple: "bg-purple-500", red: "bg-red-500", green: "bg-green-500",
  yellow: "bg-yellow-500",
}

interface Props {
  inicial?: Partial<ConcursoData>
  onSalvar: (dados: Omit<ConcursoData, "id" | "isPrincipal">) => Promise<void>
  onFechar: () => void
}

export default function ConcursoModal({ inicial, onSalvar, onFechar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? "")
  const [orgao, setOrgao] = useState(inicial?.orgao ?? "")
  const [foto, setFoto] = useState(inicial?.foto ?? "")
  const [dataProva, setDataProva] = useState(inicial?.dataProva?.split("T")[0] ?? "")
  const [materias, setMaterias] = useState<MateriaConcurso[]>(inicial?.materias ?? [])
  const [expandida, setExpandida] = useState<string | null>(null)
  const [novaMateria, setNovaMateria] = useState("")
  const [novosTopicos, setNovosTopicos] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [parsindoPdf, setParsindoPdf] = useState(false)

  const [textoEdital, setTextoEdital] = useState("")
  const [mostrarTextarea, setMostrarTextarea] = useState(false)

  const handleProcessarTexto = async () => {
    if (!textoEdital.trim()) { toast.error("Cole o texto do edital primeiro"); return }
    setParsindoPdf(true)
    try {
      const res = await fetch("/api/ai/edital-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoEdital }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao processar edital")
      setMaterias(data.materias as MateriaConcurso[])
      setTextoEdital("")
      setMostrarTextarea(false)
      toast.success(`${data.materias.length} matérias extraídas do edital!`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar edital")
    } finally {
      setParsindoPdf(false)
    }
  }

  const adicionarMateria = () => {
    if (!novaMateria.trim()) return
    const id = novaMateria.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    if (materias.find(m => m.id === id)) { toast.error("Matéria já existe"); return }
    const cor = CORES_DISPONIVEIS[materias.length % CORES_DISPONIVEIS.length]
    setMaterias(prev => [...prev, { id, nome: novaMateria.trim(), cor, topicos: [] }])
    setNovaMateria("")
  }

  const removerMateria = (id: string) => setMaterias(prev => prev.filter(m => m.id !== id))

  const adicionarTopico = (materiaId: string) => {
    const texto = novosTopicos[materiaId]?.trim()
    if (!texto) return
    setMaterias(prev => prev.map(m =>
      m.id === materiaId ? { ...m, topicos: [...m.topicos, texto] } : m
    ))
    setNovosTopicos(prev => ({ ...prev, [materiaId]: "" }))
  }

  const removerTopico = (materiaId: string, idx: number) => {
    setMaterias(prev => prev.map(m =>
      m.id === materiaId ? { ...m, topicos: m.topicos.filter((_, i) => i !== idx) } : m
    ))
  }

  const handleSalvar = async () => {
    if (!nome.trim()) { toast.error("Nome obrigatório"); return }
    setSaving(true)
    try {
      await onSalvar({ nome: nome.trim(), orgao: orgao.trim() || undefined, foto: foto.trim() || undefined, dataProva: dataProva || undefined, materias })
      onFechar()
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{inicial?.id ? "Editar Concurso" : "Novo Concurso"}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-gray-400">Nome do Concurso *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SEFAZ-CE 2026" className="bg-gray-800 border-gray-600" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Órgão / Banca</Label>
              <Input value={orgao} onChange={e => setOrgao(e.target.value)} placeholder="Ex: CEBRASPE" className="bg-gray-800 border-gray-600" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Data da Prova</Label>
              <Input type="date" value={dataProva} onChange={e => setDataProva(e.target.value)} className="bg-gray-800 border-gray-600" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-gray-400">URL da Foto (opcional)</Label>
              <Input value={foto} onChange={e => setFoto(e.target.value)} placeholder="https://..." className="bg-gray-800 border-gray-600" />
            </div>
          </div>

          {/* Importar via texto colado */}
          <div className="rounded-lg border border-dashed border-gray-600 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-200">Importar Conteúdo Programático via IA</p>
                  <p className="text-xs text-gray-400">Cole o texto do edital e a IA extrai as matérias automaticamente</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMostrarTextarea(v => !v)}>
                {mostrarTextarea ? "Fechar" : "Colar texto"}
              </Button>
            </div>
            {mostrarTextarea && (
              <div className="space-y-2">
                <textarea
                  value={textoEdital}
                  onChange={e => setTextoEdital(e.target.value)}
                  placeholder="Cole aqui o conteúdo programático do edital..."
                  rows={8}
                  className="w-full text-xs bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                />
                <Button
                  onClick={handleProcessarTexto}
                  disabled={parsindoPdf || !textoEdital.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {parsindoPdf ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Processando com IA...</> : "Extrair matérias com IA"}
                </Button>
              </div>
            )}
          </div>

          {/* Matérias */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Matérias ({materias.length})</Label>
            <div className="flex gap-2">
              <Input value={novaMateria} onChange={e => setNovaMateria(e.target.value)} placeholder="Nome da matéria" className="bg-gray-800 border-gray-600" onKeyDown={e => e.key === "Enter" && adicionarMateria()} />
              <Button variant="outline" size="icon" onClick={adicionarMateria}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {materias.map(m => (
                <div key={m.id} className="rounded-lg border border-gray-700 bg-gray-800/50">
                  <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpandida(expandida === m.id ? null : m.id)}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${COR_CLASSES[m.cor] ?? "bg-gray-500"}`} />
                    <span className="text-sm text-gray-200 flex-1">{m.nome}</span>
                    <Badge variant="outline" className="text-xs">{m.topicos.length} tópicos</Badge>
                    {expandida === m.id ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                    <button onClick={e => { e.stopPropagation(); removerMateria(m.id) }} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {expandida === m.id && (
                    <div className="px-3 pb-2 space-y-1 border-t border-gray-700">
                      <div className="flex gap-1 mt-2">
                        <Input
                          value={novosTopicos[m.id] ?? ""}
                          onChange={e => setNovosTopicos(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Adicionar tópico"
                          className="bg-gray-700 border-gray-600 text-xs h-7"
                          onKeyDown={e => e.key === "Enter" && adicionarTopico(m.id)}
                        />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adicionarTopico(m.id)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      {m.topicos.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-300 pl-1">
                          <span className="flex-1 truncate">{t}</span>
                          <button onClick={() => removerTopico(m.id, i)} className="text-gray-600 hover:text-red-400"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Concurso"}
          </Button>
        </div>
      </div>
    </div>
  )
}
