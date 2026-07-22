"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { PREMISSAS_PADRAO, ANOS_TRANSICAO, type PremissaAno } from "@/lib/reforma-engine"
import { Percent } from "lucide-react"

// Passo 2 do wizard novo: alíquotas de premissa IBS/CBS por ano — usa PREMISSAS_PADRAO como
// default (mesma fonte que já era a "verdade legal" do módulo, ver README), com opção de
// sobrescrever manualmente por ano, e o toggle de redução de 60% (LC 214/2025 art. 133 —
// medicamentos Anvisa/farmácia de manipulação, não genérico: fica marcado só se o usuário
// confirmar que a atividade se enquadra). A redução de 60% se aplica SÓ ao débito (IBS/CBS
// devido nas saídas) — o crédito das entradas permanece integral, por isso não mexe em nada
// relacionado a crédito aqui.

export type PremissaAnoWizard = PremissaAno & { aliquotaISS: number }

export type PremissasReformaData = {
  premissasPorAno: Record<number, PremissaAnoWizard>
  reducao60: boolean
  // Alíquota de ICMS usada na coluna "Alíquota ICMS" das abas de ano — é uma PREMISSA do
  // analista (alíquota modal do estado, ex: 22,5% no PI), constante em todas as linhas DANFE,
  // exatamente como no Excel-modelo (que ignora a alíquota por item do EFD nessa coluna).
  aliquotaICMS: number
}

export function defaultPremissasReforma(): PremissasReformaData {
  const premissasPorAno: Record<number, PremissaAnoWizard> = {}
  for (const ano of ANOS_TRANSICAO) {
    premissasPorAno[ano] = { ...PREMISSAS_PADRAO[ano], aliquotaISS: 0.05 }
  }
  return { premissasPorAno, reducao60: false, aliquotaICMS: 0.225 }
}

interface Props {
  data: PremissasReformaData
  onChange: (d: PremissasReformaData) => void
  onBack: () => void
  onNext: () => void
}

function pct(v: number) {
  return (v * 100).toFixed(2)
}

export default function StepPremissasReforma({ data, onChange, onBack, onNext }: Props) {
  const atualizarAno = (ano: number, campo: keyof PremissaAnoWizard, valor: number) => {
    onChange({
      ...data,
      premissasPorAno: {
        ...data.premissasPorAno,
        [ano]: { ...data.premissasPorAno[ano], [campo]: valor },
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Premissas de alíquota</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Alíquotas padrão da transição IBS/CBS (LC 214/2025). Ajuste por ano se o cliente tiver uma
          premissa específica; senão mantenha os valores padrão. A alíquota de ISS não vem do EFD
          Contribuições — informe-a aqui, é ela que será usada no gross-up das notas de serviço.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <Percent className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="reducao60" className="text-sm font-medium">
              Atividade com redução de 60% nas alíquotas de IBS/CBS
            </Label>
            <Switch
              id="reducao60"
              checked={data.reducao60}
              onCheckedChange={(v) => onChange({ ...data, reducao60: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            LC 214/2025, art. 133 — medicamentos registrados na Anvisa ou produzidos por farmácia de
            manipulação. Aplica-se apenas ao <strong>débito</strong> (IBS/CBS das saídas); o crédito das
            entradas permanece integral. Só marque se a atividade do cliente realmente se enquadrar
            (confirme no Passo 3 — Legislação).
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="aliquotaIcms" className="text-sm font-medium">Alíquota ICMS padrão (%)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Alíquota modal do estado do cliente (ex: 22,5% no Piauí). Usada como premissa constante
            na coluna Alíquota ICMS de todas as linhas de mercadoria das abas de ano.
          </p>
        </div>
        <Input
          id="aliquotaIcms"
          type="number"
          step="0.1"
          value={pct(data.aliquotaICMS ?? 0.225)}
          onChange={(e) => onChange({ ...data, aliquotaICMS: (parseFloat(e.target.value) || 0) / 100 })}
          className="w-24 h-8 text-right shrink-0"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ano</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">CBS</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">IBS UF</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">IBS Mun</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">ISS (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ANOS_TRANSICAO.map((ano) => {
              const p = data.premissasPorAno[ano]
              return (
                <tr key={ano}>
                  <td className="px-3 py-2 font-medium text-foreground">{ano}</td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={pct(p.cbs)}
                      onChange={(e) => atualizarAno(ano, "cbs", (parseFloat(e.target.value) || 0) / 100)}
                      className="w-20 h-7 text-right ml-auto"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={pct(p.ibsUF)}
                      onChange={(e) => atualizarAno(ano, "ibsUF", (parseFloat(e.target.value) || 0) / 100)}
                      className="w-20 h-7 text-right ml-auto"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={pct(p.ibsMUN)}
                      onChange={(e) => atualizarAno(ano, "ibsMUN", (parseFloat(e.target.value) || 0) / 100)}
                      className="w-20 h-7 text-right ml-auto"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={pct(p.aliquotaISS)}
                      onChange={(e) => atualizarAno(ano, "aliquotaISS", (parseFloat(e.target.value) || 0) / 100)}
                      className="w-20 h-7 text-right ml-auto"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Próximo: Legislação →
        </Button>
      </div>
    </div>
  )
}
