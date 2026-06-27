"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PREMISSAS_PADRAO, ANOS_TRANSICAO, type PremissaAno } from "@/lib/reforma-engine"

export type PremissasData = {
  aliquotaICMS: number
  aliquotaICMSCompras: number
  temIPI: boolean
  aliquotaIPI: number
  percentualIPISaidas: number
  temFCBF: boolean
  fcbfPercentual: number
  fcbfBaseCalculo: number
  premissasAnuais: Record<number, PremissaAno>
}

export function defaultPremissas(aliquotaICMS = 0.12): PremissasData {
  return {
    aliquotaICMS,
    aliquotaICMSCompras: aliquotaICMS,
    temIPI: false,
    aliquotaIPI: 0,
    percentualIPISaidas: 0,
    temFCBF: false,
    fcbfPercentual: 0,
    fcbfBaseCalculo: 0,
    premissasAnuais: structuredClone(PREMISSAS_PADRAO) as Record<number, PremissaAno>,
  }
}

interface Props {
  data: PremissasData
  onChange: (d: PremissasData) => void
  onBack: () => void
  onNext: () => void
}

const pct = (v: number) => `${(v * 100).toFixed(2)}`
const fromPct = (s: string) => parseFloat(s) / 100 || 0

export default function Step2Premissas({ data, onChange, onBack, onNext }: Props) {
  const set = (patch: Partial<PremissasData>) => onChange({ ...data, ...patch })

  const setPremissaAno = (ano: number, field: keyof PremissaAno, raw: string) => {
    const val = field === "ipiAtivo" ? raw === "true" : fromPct(raw)
    onChange({
      ...data,
      premissasAnuais: {
        ...data.premissasAnuais,
        [ano]: { ...data.premissasAnuais[ano], [field]: val },
      },
    })
  }

  const resetPremissas = () => set({ premissasAnuais: structuredClone(PREMISSAS_PADRAO) as Record<number, PremissaAno> })

  return (
    <div className="space-y-8">
      {/* Tributação Atual */}
      <section>
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">Tributação Atual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alíquota ICMS média — saídas (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={pct(data.aliquotaICMS)}
              onChange={(e) => set({ aliquotaICMS: fromPct(e.target.value) })}
              placeholder="12.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Alíquota ICMS média — compras (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={pct(data.aliquotaICMSCompras)}
              onChange={(e) => set({ aliquotaICMSCompras: fromPct(e.target.value) })}
              placeholder="12.00"
            />
            <p className="text-xs text-gray-500">Usado para calcular crédito IBS/CBS nas compras</p>
          </div>
        </div>

        {/* IPI */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={data.temIPI}
              onCheckedChange={(v) => set({ temIPI: v })}
            />
            <Label>Produto sujeito a IPI (indústria / importador)</Label>
          </div>
          {data.temIPI && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8">
              <div className="space-y-2">
                <Label>Alíquota IPI (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pct(data.aliquotaIPI)}
                  onChange={(e) => set({ aliquotaIPI: fromPct(e.target.value) })}
                  placeholder="15.00"
                />
              </div>
              <div className="space-y-2">
                <Label>% das saídas com IPI (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={pct(data.percentualIPISaidas)}
                  onChange={(e) => set({ percentualIPISaidas: fromPct(e.target.value) })}
                  placeholder="80.00"
                />
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          PIS (0,65%) + COFINS (3%) fixos para Lucro Presumido. IPI extinto a partir de 2027 (fora ZFM).
        </p>
      </section>

      {/* FCBF */}
      <section>
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">
          Benefício Fiscal Estadual (FCBF / Crédito Presumido)
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <Switch
            checked={data.temFCBF}
            onCheckedChange={(v) => set({ temFCBF: v })}
          />
          <Label>Possui benefício estadual de crédito presumido de ICMS?</Label>
        </div>
        {data.temFCBF && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8">
            <div className="space-y-2">
              <Label>Percentual do crédito presumido (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={pct(data.fcbfPercentual)}
                onChange={(e) => set({ fcbfPercentual: fromPct(e.target.value) })}
                placeholder="2.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Base de cálculo mensal (R$)</Label>
              <Input
                type="number"
                value={data.fcbfBaseCalculo || ""}
                onChange={(e) => set({ fcbfBaseCalculo: Number(e.target.value) })}
                placeholder="Ex: 565000"
              />
              <p className="text-xs text-gray-500">
                Valor mensal da base sobre o qual incide o crédito. Será anualizado (x12).
              </p>
            </div>
          </div>
        )}
        {data.temFCBF && (
          <p className="ml-8 mt-2 text-xs text-amber-600 dark:text-amber-400">
            ⚠ O FCBF (e todos os benefícios atrelados ao ICMS) extingue-se gradualmente de 2029 a 2032, sendo zerado em 2033 com a extinção do ICMS.
          </p>
        )}
      </section>

      {/* Alíquotas da Reforma */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            Alíquotas da Reforma (LC 214/2025) — editáveis
          </h3>
          <Button variant="ghost" size="sm" onClick={resetPremissas} className="text-xs">
            Restaurar padrão
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Ano</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">CBS (%)</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">IBS UF (%)</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">IBS Mun (%)</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">Total IBS+CBS (%)</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500">ICMS restante (%)</th>
              </tr>
            </thead>
            <tbody>
              {ANOS_TRANSICAO.map((ano) => {
                const p = data.premissasAnuais[ano]
                const total = ((p.cbs + p.ibsUF + p.ibsMUN) * 100).toFixed(2)
                return (
                  <tr key={ano} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 font-medium">{ano}</td>
                    <td className="py-1 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs text-center w-20"
                        value={pct(p.cbs)}
                        onChange={(e) => setPremissaAno(ano, "cbs", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs text-center w-20"
                        value={pct(p.ibsUF)}
                        onChange={(e) => setPremissaAno(ano, "ibsUF", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 text-xs text-center w-20"
                        value={pct(p.ibsMUN)}
                        onChange={(e) => setPremissaAno(ano, "ibsMUN", e.target.value)}
                      />
                    </td>
                    <td className="py-1 px-2 text-center font-semibold text-blue-600 dark:text-blue-400">
                      {total}%
                    </td>
                    <td className="py-1 px-2 text-center">
                      {(p.icmsReducao * 100).toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700 text-white">
          Calcular Simulação →
        </Button>
      </div>
    </div>
  )
}
