"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, ScrollText, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { CnaeInfo } from "./Step1Empresa"

// Passo 3 do wizard: a IA busca nas 3 legislações (LC 214/2025, Decreto CBS, Resolução CGIBS)
// trechos com tratamento específico para o CNAE da empresa e apresenta pro usuário confirmar ou
// complementar manualmente. O texto final (livre, escrito pelo usuário) é o que vai pra aba
// "Legislações" do Excel — a resposta bruta da IA nunca é gravada direto lá.

export interface AchadoLegislacao {
  fonte: string
  artigoOuTrecho: string
  resumo: string
}

export type LegislacaoData = {
  buscaFeita: boolean
  encontrado: boolean
  resumoIA: string
  achados: AchadoLegislacao[]
  notaManual: string
}

export function defaultLegislacao(): LegislacaoData {
  return { buscaFeita: false, encontrado: false, resumoIA: "", achados: [], notaManual: "" }
}

interface Props {
  data: LegislacaoData
  onChange: (d: LegislacaoData) => void
  cnaePrincipal: CnaeInfo
  cnaesSecundarios: CnaeInfo[]
  onBack: () => void
  onNext: () => void
}

export default function StepLegislacaoIA({ data, onChange, cnaePrincipal, cnaesSecundarios, onBack, onNext }: Props) {
  const [loading, setLoading] = useState(false)

  const buscar = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reforma-tributaria/legislacao-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnaePrincipal, cnaesSecundarios }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onChange({
        buscaFeita: true,
        encontrado: json.encontrado,
        resumoIA: json.resumo,
        achados: json.achados ?? [],
        notaManual: data.notaManual,
      })
      toast.success(json.encontrado ? "Legislação relevante encontrada" : "Busca concluída — nada específico encontrado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar legislação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Legislação específica por CNAE</h3>
        <p className="text-xs text-muted-foreground mt-1">
          A IA procura, nas 3 legislações da reforma, trechos que tragam tratamento diferenciado para a
          atividade "{cnaePrincipal.codigo} - {cnaePrincipal.descricao}". Revise o resultado — só o que
          você confirmar/escrever abaixo vai para a aba "Legislações" do Excel final.
        </p>
      </div>

      {!data.buscaFeita && (
        <Button onClick={buscar} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Buscar legislação com IA
        </Button>
      )}

      {data.buscaFeita && (
        <div className="space-y-4">
          <div
            className={`rounded-lg border p-4 flex items-start gap-3 ${
              data.encontrado
                ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-border bg-muted"
            }`}
          >
            {data.encontrado ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <p className="text-sm text-foreground">{data.resumoIA}</p>
          </div>

          {data.achados.length > 0 && (
            <div className="space-y-2">
              {data.achados.map((a, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ScrollText className="h-3.5 w-3.5" />
                    {a.fonte} — {a.artigoOuTrecho}
                  </div>
                  <p className="text-xs text-muted-foreground">{a.resumo}</p>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={buscar} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
            Buscar novamente
          </Button>

          <div className="space-y-2">
            <Label>Nota manual (vai para a aba &quot;Legislações&quot; do Excel)</Label>
            <Textarea
              value={data.notaManual}
              onChange={(e) => onChange({ ...data, notaManual: e.target.value })}
              placeholder="Confirme, complemente ou reescreva com suas palavras o que será registrado na aba Legislações..."
              rows={6}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} disabled={!data.buscaFeita} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Próximo: Base NCM →
        </Button>
      </div>
    </div>
  )
}
