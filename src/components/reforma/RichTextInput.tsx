"use client"

import { useEffect, useRef } from "react"
import { Bold, Italic, Underline, List } from "lucide-react"

// Editor de texto rico minimalista (negrito/itálico/sublinhado/lista) para os textos do PDF
// executivo. Guarda HTML simples (b/i/u/div/br/ul/li) — o mesmo subconjunto que o renderizador
// do PDF (htmlParaBlocos em reforma-pdf.ts) sabe desenhar. Texto puro salvo antes desta feature
// continua funcionando: é convertido pra HTML com <br> ao carregar.

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeightClass?: string // ex.: "min-h-28"
}

function escapeHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function valorParaHtml(v: string): string {
  if (!v) return ""
  if (/[<>]/.test(v)) return v // já é HTML do editor
  return escapeHtml(v).replace(/\n/g, "<br>")
}

const BOTOES: { cmd: string; icon: React.ElementType; titulo: string }[] = [
  { cmd: "bold", icon: Bold, titulo: "Negrito (Ctrl+B)" },
  { cmd: "italic", icon: Italic, titulo: "Itálico (Ctrl+I)" },
  { cmd: "underline", icon: Underline, titulo: "Sublinhado (Ctrl+U)" },
  { cmd: "insertUnorderedList", icon: List, titulo: "Lista" },
]

export default function RichTextInput({ value, onChange, placeholder, disabled, minHeightClass = "min-h-28" }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Sincroniza o conteúdo vindo de fora (abrir o dialog, texto salvo) sem brigar com o cursor:
  // só escreve no DOM quando o editor NÃO está focado
  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    const html = valorParaHtml(value)
    if (el.innerHTML !== html) el.innerHTML = html
  }, [value])

  const exec = (cmd: string) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand(cmd)
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className={`rounded-md border border-input bg-transparent ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-0.5 border-b border-input px-1.5 py-1">
        {BOTOES.map(({ cmd, icon: Icon, titulo }) => (
          <button
            key={cmd}
            type="button"
            title={titulo}
            // onMouseDown + preventDefault: não rouba o foco/seleção do editor
            onMouseDown={(e) => { e.preventDefault(); exec(cmd) }}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        data-placeholder={placeholder}
        className={`${minHeightClass} max-h-64 overflow-y-auto px-3 py-2 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none`}
      />
    </div>
  )
}
