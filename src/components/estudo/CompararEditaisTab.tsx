"use client"

import { useEffect, useState } from "react"
import { Loader2, BookOpen } from "lucide-react"
import Link from "next/link"
import type { ConcursoData, MateriaConcurso } from "@/lib/estudo-data"

type Concurso = ConcursoData & { id: string }

type LinhaComparacao = {
  nome: string
  emA: boolean
  emB: boolean
  topicosA: string[]
  topicosB: string[]
  topicosComuns: string[]
  topicosExclusivosB: string[]
}

function calcularComparacao(a: Concurso, b: Concurso): { linhas: LinhaComparacao[]; similaridade: number } {
  const materiasA = (a.materias ?? []) as MateriaConcurso[]
  const materiasB = (b.materias ?? []) as MateriaConcurso[]

  const nomesA = new Set(materiasA.map(m => m.nome.toLowerCase().trim()))
  const nomesB = new Set(materiasB.map(m => m.nome.toLowerCase().trim()))
  const todosNomes = new Set([...nomesA, ...nomesB])

  const linhas: LinhaComparacao[] = []
  for (const nome of todosNomes) {
    const mA = materiasA.find(m => m.nome.toLowerCase().trim() === nome)
    const mB = materiasB.find(m => m.nome.toLowerCase().trim() === nome)
    const topicosA = mA?.topicos ?? []
    const topicosB = mB?.topicos ?? []
    const setA = new Set(topicosA.map(t => t.toLowerCase().trim()))
    const setB = new Set(topicosB.map(t => t.toLowerCase().trim()))
    const topicosComuns = topicosB.filter(t => setA.has(t.toLowerCase().trim()))
    const topicosExclusivosB = topicosB.filter(t => !setA.has(t.toLowerCase().trim()))
    linhas.push({
      nome: mA?.nome ?? mB?.nome ?? nome,
      emA: !!mA,
      emB: !!mB,
      topicosA,
      topicosB,
      topicosComuns,
      topicosExclusivosB,
    })
  }

  const comuns = linhas.filter(l => l.emA && l.emB).length
  const similaridade = todosNomes.size > 0 ? Math.round((comuns / todosNomes.size) * 100) : 0

  return { linhas: linhas.sort((a, b) => {
    if (a.emA && a.emB) return -1
    if (b.emA && b.emB) return 1
    if (a.emA) return -1
    return 1
  }), similaridade }
}

export default function CompararEditaisTab() {
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [loading, setLoading] = useState(true)
  const [idA, setIdA] = useState("")
  const [idB, setIdB] = useState("")
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/concurso")
      .then(r => r.json())
      .then(lista => { setConcursos(lista); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const concursoA = concursos.find(c => c.id === idA)
  const concursoB = concursos.find(c => c.id === idB)
  const resultado = concursoA && concursoB && idA !== idB
    ? calcularComparacao(concursoA, concursoB)
    : null

  const toggleExpand = (nome: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  )

  if (concursos.length < 2) return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground mb-2">Você precisa de pelo menos 2 concursos para comparar.</p>
      <Link href="/dashboard/estudo/concursos" className="text-primary text-sm hover:underline">
        Gerenciar concursos →
      </Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Seletores */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Concurso A", value: idA, set: setIdA, excluir: idB },
          { label: "Concurso B", value: idB, set: setIdB, excluir: idA },
        ].map(({ label, value, set, excluir }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">{label}</label>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full text-sm bg-muted border border-border text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecionar...</option>
              {concursos
                .filter(c => c.id !== excluir)
                .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)
              }
            </select>
          </div>
        ))}
      </div>

      {resultado && (
        <>
          {/* Badge similaridade */}
          <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-xl border border-border">
            <div className="text-center">
              <div className={`text-4xl font-bold ${resultado.similaridade >= 70 ? "text-emerald-400" : resultado.similaridade >= 40 ? "text-amber-400" : "text-red-400"}`}>
                {resultado.similaridade}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Similaridade de matérias</div>
            </div>
            <div className="h-16 w-px bg-muted" />
            <div className="flex gap-6 text-xs">
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-400">{resultado.linhas.filter(l => l.emA && l.emB).length}</div>
                <div className="text-muted-foreground">Comuns</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">{resultado.linhas.filter(l => l.emA && !l.emB).length}</div>
                <div className="text-muted-foreground">Só em A</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-400">{resultado.linhas.filter(l => !l.emA && l.emB).length}</div>
                <div className="text-muted-foreground">Só em B</div>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block" /> Ambos os concursos</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30 border border-primary/50 inline-block" /> Só em {concursoA?.nome}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50 inline-block" /> Só em {concursoB?.nome}</span>
          </div>

          {/* Tabela */}
          <div className="space-y-1.5">
            {resultado.linhas.map(l => {
              const cor = l.emA && l.emB
                ? "border-emerald-700/50 bg-emerald-900/10"
                : l.emA
                ? "border-primary/50 bg-primary/10"
                : "border-orange-700/50 bg-orange-900/10"
              const dotCor = l.emA && l.emB ? "bg-emerald-500" : l.emA ? "bg-primary" : "bg-orange-500"
              const isOpen = expandidos.has(l.nome)

              return (
                <div key={l.nome} className={`rounded-lg border ${cor} overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(l.nome)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotCor}`} />
                    <span className="text-sm text-foreground flex-1">{l.nome}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                      {l.emA && <span>{l.topicosA.length} tóp. A</span>}
                      {l.emB && <span>{l.topicosB.length} tóp. B</span>}
                      {l.emA && l.emB && l.topicosExclusivosB.length > 0 && (
                        <span className="text-orange-400">+{l.topicosExclusivosB.length} só B</span>
                      )}
                    </div>
                  </button>

                  {isOpen && (l.emA && l.emB) && l.topicosExclusivosB.length > 0 && (
                    <div className="px-4 pb-3 border-t border-border/50">
                      <p className="text-xs text-orange-400 font-medium mt-2 mb-1.5">
                        Tópicos exclusivos de {concursoB?.nome}:
                      </p>
                      <div className="space-y-0.5">
                        {l.topicosExclusivosB.map((t, i) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5">+</span>
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isOpen && !l.emA && l.emB && (
                    <div className="px-4 pb-3 border-t border-border/50">
                      <p className="text-xs text-orange-400 font-medium mt-2 mb-1.5">Tópicos a estudar a mais:</p>
                      <div className="space-y-0.5">
                        {l.topicosB.map((t, i) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5">+</span>
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* O que estudar a mais */}
          {resultado.linhas.filter(l => !l.emA && l.emB).length > 0 && (
            <div className="rounded-xl border border-orange-700/50 bg-orange-900/10 p-4">
              <h3 className="text-sm font-semibold text-orange-300 mb-3">
                📚 Matérias exclusivas de {concursoB?.nome} (estudar a mais)
              </h3>
              <div className="space-y-1">
                {resultado.linhas.filter(l => !l.emA && l.emB).map(l => (
                  <div key={l.nome} className="text-sm text-muted-foreground">
                    • {l.nome} <span className="text-xs text-muted-foreground">({l.topicosB.length} tópicos)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
