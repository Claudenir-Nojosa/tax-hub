"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Trash2, Loader2, FileText, Upload, ChevronDown, ChevronRight, CornerDownRight, Pencil, Check } from "lucide-react"
import { toast } from "sonner"
import type { MateriaConcurso, ConcursoData } from "@/lib/estudo-data"

const CORES_DISPONIVEIS = [
  "sky","blue","emerald","violet","rose","amber","teal","indigo",
  "pink","cyan","lime","orange","purple","red","green","yellow",
]

const COR_CLASSES: Record<string, string> = {
  sky: "bg-sky-500", blue: "bg-primary", emerald: "bg-emerald-500",
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
  // subtopicoPara: "materiaId:topicoIdx" → texto do novo subtópico
  const [subtopicoPara, setSubtopicoPara] = useState<string | null>(null)
  const [novoSubtopico, setNovoSubtopico] = useState("")
  // editando: "materiaId:topicoIdx" para tópico/subtópico
  const [editandoTopico, setEditandoTopico] = useState<string | null>(null)
  const [editandoValor, setEditandoValor] = useState("")
  const [corPicker, setCorPicker] = useState<{ materiaId: string; top: number; left: number } | null>(null)
  const corPickerRef = useRef<HTMLDivElement>(null)

  const abrirCorPicker = (materiaId: string, el: HTMLElement) => {
    if (corPicker?.materiaId === materiaId) { setCorPicker(null); return }
    const rect = el.getBoundingClientRect()
    setCorPicker({ materiaId, top: rect.bottom + 6, left: rect.left })
  }

  const alterarCorMateria = (materiaId: string, cor: string) => {
    setMaterias(prev => prev.map(m => m.id === materiaId ? { ...m, cor } : m))
    setCorPicker(null)
  }

  useEffect(() => {
    if (!corPicker) return
    const fecharClique = (e: MouseEvent) => {
      if (corPickerRef.current && !corPickerRef.current.contains(e.target as Node)) setCorPicker(null)
    }
    const fecharScroll = () => setCorPicker(null)
    document.addEventListener("mousedown", fecharClique)
    window.addEventListener("scroll", fecharScroll, true)
    return () => {
      document.removeEventListener("mousedown", fecharClique)
      window.removeEventListener("scroll", fecharScroll, true)
    }
  }, [corPicker])

  const isSubtopico = (t: string) => t.startsWith("  ")

  const adicionarSubtopico = (materiaId: string, topicoIdx: number) => {
    if (!novoSubtopico.trim()) return
    setMaterias(prev => prev.map(m => {
      if (m.id !== materiaId) return m
      const topicos = [...m.topicos]
      // insere logo após o tópico pai e seus subtópicos existentes
      let insercao = topicoIdx + 1
      while (insercao < topicos.length && isSubtopico(topicos[insercao])) insercao++
      topicos.splice(insercao, 0, "  " + novoSubtopico.trim())
      return { ...m, topicos }
    }))
    setNovoSubtopico("")
    setSubtopicoPara(null)
  }
  const [saving, setSaving] = useState(false)
  const [parsindoPdf, setParsindoPdf] = useState(false)

  const [textoEdital, setTextoEdital] = useState("")
  const [modoImport, setModoImport] = useState<null | "texto" | "pdf">(null)

  const processarResposta = async (res: Response) => {
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erro ao processar edital")
    const novas = data.materias as MateriaConcurso[]
    setMaterias(prev => {
      const resultado = [...prev]
      for (const nova of novas) {
        const idx = resultado.findIndex(m => m.nome.toLowerCase() === nova.nome.toLowerCase())
        if (idx >= 0) {
          // matéria já existe: adiciona apenas tópicos que ainda não existem
          const topicosExistentes = new Set(resultado[idx].topicos.map(t => t.trim().toLowerCase()))
          const topicosNovos = nova.topicos.filter(t => !topicosExistentes.has(t.trim().toLowerCase()))
          resultado[idx] = { ...resultado[idx], topicos: [...resultado[idx].topicos, ...topicosNovos] }
        } else {
          // cor calculada pela posição final na lista, não pelo lote da IA — evita cores repetidas
          // quando o edital é importado em várias chamadas (ex: PDF + texto colado depois)
          const cor = CORES_DISPONIVEIS[resultado.length % CORES_DISPONIVEIS.length]
          resultado.push({ ...nova, cor })
        }
      }
      return resultado
    })
    setModoImport(null)
    setTextoEdital("")
    toast.success(`${novas.length} matérias mescladas com sucesso!`)
  }

  const handleProcessarTexto = async () => {
    if (!textoEdital.trim()) { toast.error("Cole o texto do edital primeiro"); return }
    setParsindoPdf(true)
    try {
      const res = await fetch("/api/ai/edital-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoEdital }),
      })
      await processarResposta(res)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar edital")
    } finally {
      setParsindoPdf(false)
    }
  }

  const handleUploadPdf = async (file: File) => {
    if (!file.name.endsWith(".pdf")) { toast.error("Apenas arquivos PDF são aceitos"); return }
    setParsindoPdf(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/ai/edital-pdf", { method: "POST", body: form })
      await processarResposta(res)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar PDF")
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

  const iniciarEdicaoTopico = (materiaId: string, idx: number, valorAtual: string) => {
    setEditandoTopico(`${materiaId}:${idx}`)
    setEditandoValor(valorAtual)
    setSubtopicoPara(null)
  }

  const confirmarEdicaoTopico = (materiaId: string, idx: number) => {
    const novoValor = editandoValor.trim()
    if (novoValor) {
      setMaterias(prev => prev.map(m => {
        if (m.id !== materiaId) return m
        const topicos = [...m.topicos]
        const eSub = isSubtopico(topicos[idx])
        topicos[idx] = eSub ? "  " + novoValor : novoValor
        return { ...m, topicos }
      }))
    }
    setEditandoTopico(null)
    setEditandoValor("")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-muted border border-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">{inicial?.id ? "Editar Concurso" : "Novo Concurso"}</h2>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Nome do Concurso *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SEFAZ-CE 2026" className="bg-muted border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Órgão / Banca</Label>
              <Input value={orgao} onChange={e => setOrgao(e.target.value)} placeholder="Ex: CEBRASPE" className="bg-muted border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data da Prova</Label>
              <Input type="date" value={dataProva} onChange={e => setDataProva(e.target.value)} className="bg-muted border-border" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">URL da Foto (opcional)</Label>
              <Input value={foto} onChange={e => setFoto(e.target.value)} placeholder="https://..." className="bg-muted border-border" />
            </div>
          </div>

          {/* Importar via IA */}
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Importar Conteúdo Programático via IA</p>
                <p className="text-xs text-muted-foreground">Envie o PDF do edital ou cole o texto — a IA extrai as matérias automaticamente</p>
              </div>
            </div>

            {parsindoPdf ? (
              <div className="flex items-center justify-center gap-2 py-4 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processando com IA...</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {/* Upload PDF */}
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPdf(f); e.target.value = "" }}
                    />
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-2.5 transition-colors">
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Enviar PDF</span>
                    </div>
                  </label>

                  {/* Texto colado */}
                  <button
                    type="button"
                    onClick={() => setModoImport(v => v === "texto" ? null : "texto")}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-2.5 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Colar texto</span>
                  </button>
                </div>

                {modoImport === "texto" && (
                  <div className="space-y-2">
                    <textarea
                      value={textoEdital}
                      onChange={e => setTextoEdital(e.target.value)}
                      placeholder="Cole aqui o conteúdo programático do edital..."
                      rows={8}
                      className="w-full text-xs bg-muted border border-border text-foreground rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={handleProcessarTexto}
                      disabled={!textoEdital.trim()}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                    >
                      Extrair matérias com IA
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Matérias */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Matérias ({materias.length})</Label>
            <div className="flex gap-2">
              <Input value={novaMateria} onChange={e => setNovaMateria(e.target.value)} placeholder="Nome da matéria" className="bg-muted border-border" onKeyDown={e => e.key === "Enter" && adicionarMateria()} />
              <Button variant="outline" size="icon" onClick={adicionarMateria}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {materias.map(m => (
                <div key={m.id} className="rounded-lg border border-border bg-muted/50">
                  <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpandida(expandida === m.id ? null : m.id)}>
                    <button
                      type="button"
                      title="Alterar cor"
                      onClick={e => { e.stopPropagation(); abrirCorPicker(m.id, e.currentTarget) }}
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background/50 ring-transparent hover:ring-ring transition-all ${COR_CLASSES[m.cor] ?? "bg-muted"}`}
                    />
                    <span className="text-sm text-foreground flex-1">{m.nome}</span>
                    <Badge variant="outline" className="text-xs">{m.topicos.length} tópicos</Badge>
                    {expandida === m.id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <button onClick={e => { e.stopPropagation(); removerMateria(m.id) }} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {expandida === m.id && (
                    <div className="px-3 pb-2 space-y-1 border-t border-border">
                      <div className="flex gap-1 mt-2">
                        <Input
                          value={novosTopicos[m.id] ?? ""}
                          onChange={e => setNovosTopicos(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Adicionar tópico"
                          className="bg-muted border-border text-xs h-7"
                          onKeyDown={e => e.key === "Enter" && adicionarTopico(m.id)}
                        />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => adicionarTopico(m.id)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      {m.topicos.map((t, i) => {
                        const eSub = isSubtopico(t)
                        const chave = `${m.id}:${i}`
                        const editando = editandoTopico === chave
                        return (
                          <div key={i}>
                            <div className={`flex items-center gap-1.5 text-xs text-muted-foreground group ${eSub ? "pl-5" : "pl-1"}`}>
                              {eSub && <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                              {editando ? (
                                <>
                                  <Input
                                    autoFocus
                                    value={editandoValor}
                                    onChange={e => setEditandoValor(e.target.value)}
                                    className="bg-muted border-border text-xs h-6 flex-1"
                                    onKeyDown={e => { if (e.key === "Enter") confirmarEdicaoTopico(m.id, i); if (e.key === "Escape") setEditandoTopico(null) }}
                                  />
                                  <button onClick={() => confirmarEdicaoTopico(m.id, i)} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check className="h-3 w-3" /></button>
                                  <button onClick={() => setEditandoTopico(null)} className="text-muted-foreground hover:text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 truncate">{eSub ? t.trimStart() : t}</span>
                                  <button
                                    type="button"
                                    title="Editar"
                                    onClick={() => iniciarEdicaoTopico(m.id, i, eSub ? t.trimStart() : t)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-400 transition-opacity"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  {!eSub && (
                                    <button
                                      type="button"
                                      title="Adicionar subtópico"
                                      onClick={() => { setSubtopicoPara(subtopicoPara === chave ? null : chave); setNovoSubtopico("") }}
                                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                    >
                                      <CornerDownRight className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button onClick={() => removerTopico(m.id, i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"><X className="h-3 w-3" /></button>
                                </>
                              )}
                            </div>
                            {subtopicoPara === chave && (
                              <div className="flex gap-1 pl-5 mt-1">
                                <Input
                                  autoFocus
                                  value={novoSubtopico}
                                  onChange={e => setNovoSubtopico(e.target.value)}
                                  placeholder="Nome do subtópico"
                                  className="bg-muted border-border text-xs h-6"
                                  onKeyDown={e => { if (e.key === "Enter") adicionarSubtopico(m.id, i); if (e.key === "Escape") setSubtopicoPara(null) }}
                                />
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => adicionarSubtopico(m.id, i)}><Plus className="h-2.5 w-2.5" /></Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Concurso"}
          </Button>
        </div>
      </div>

      {corPicker && createPortal(
        <div
          ref={corPickerRef}
          style={{ top: corPicker.top, left: corPicker.left }}
          className="fixed z-[60] grid grid-cols-4 gap-2 p-3 rounded-lg border border-border bg-muted shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {CORES_DISPONIVEIS.map(cor => (
            <button
              key={cor}
              type="button"
              title={cor}
              onClick={() => alterarCorMateria(corPicker.materiaId, cor)}
              className={`w-6 h-6 rounded-full ${COR_CLASSES[cor]} transition-transform hover:scale-110 ${
                materias.find(m => m.id === corPicker.materiaId)?.cor === cor
                  ? "ring-2 ring-white ring-offset-2 ring-offset-background"
                  : ""
              }`}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
