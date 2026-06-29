"use client"

import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingDown, TrendingUp, FileSpreadsheet } from "lucide-react"
import type { ResultadoAno } from "@/lib/reforma-engine"
import { formatarMoeda, formatarPorcentagem } from "@/lib/reforma-engine"
import { exportarSimulacaoExcel } from "@/lib/export-simulacao-excel"
import type { DadosReaisXml } from "@/lib/nfe-parser"
import type { DadosEfd } from "@/lib/efd-parser"

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

const TransicaoChart = dynamic(() => import("./TransicaoChart"), {
  ssr: false,
  loading: () => <div className="h-[360px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>,
})

interface Props {
  resultados: ResultadoAno[]
  temFCBF: boolean
  loading: boolean
  usouXml?: boolean
  nomeEmpresa?: string
  regime?: string
  dadosXml?: DadosReaisXml | null
  dadosEfd?: DadosEfd | null
  onBack: () => void
  onNext: () => void
}

export default function Step3Simulacao({ resultados, temFCBF, loading, usouXml, nomeEmpresa, regime, dadosXml, dadosEfd, onBack, onNext }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">Calculando simulação...</span>
      </div>
    )
  }

  if (!resultados.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>Nenhum resultado disponível. Volte e configure as premissas.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">← Voltar</Button>
      </div>
    )
  }

  const deltaAcumulado = resultados.reduce((s, r) => s + r.delta, 0)
  const economiaFCBF = resultados.reduce((s, r) => s + r.fcbfEconomia, 0)

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 mb-1">Delta acumulado 2026–2033</p>
          <p className={`text-lg font-bold ${deltaAcumulado < 0 ? "text-green-600" : "text-red-600"}`}>
            {formatarMoeda(deltaAcumulado)}
          </p>
          <p className="text-xs text-gray-400">
            {deltaAcumulado < 0 ? "Economia com a reforma" : "Custo adicional com a reforma"}
          </p>
        </div>
        {temFCBF && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 mb-1">Economia FCBF 2026–2032</p>
            <p className="text-lg font-bold text-green-600">{formatarMoeda(economiaFCBF)}</p>
            <p className="text-xs text-gray-400">Crédito presumido acumulado</p>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 mb-1">Carga em 2033 (pós-reforma)</p>
          <p className="text-lg font-bold text-blue-600">
            {formatarPorcentagem(resultados[resultados.length - 1].cargaReformaPct)}
          </p>
          <p className="text-xs text-gray-400">Da receita bruta</p>
        </div>
      </div>

      {/* Gráfico */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-sm">Evolução da Carga Tributária 2026–2033</h3>
          {usouXml && (
            <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300">
              Dados reais (NF-e)
            </Badge>
          )}
        </div>
        <TransicaoChart resultados={resultados} temFCBF={temFCBF} />
        <p className="text-xs text-gray-400 mt-2 text-center">
          Barras empilhadas = composição da carga reforma | Linha amarela = carga atual (baseline)
          {temFCBF && " | Linha verde = carga líquida com FCBF"}
        </p>
      </div>

      {/* Tabela detalhada */}
      <div>
        <h3 className="font-semibold text-sm mb-4">Detalhamento por Ano</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-2 px-3 font-medium">Ano</th>
                <th className="text-right py-2 px-3 font-medium">Carga Atual</th>
                <th className="text-right py-2 px-3 font-medium">CBS</th>
                <th className="text-right py-2 px-3 font-medium">IBS</th>
                <th className="text-center py-2 px-3 font-medium text-gray-400">ICMS %</th>
                <th className="text-right py-2 px-3 font-medium">ICMS</th>
                <th className="text-right py-2 px-3 font-medium">
                  <div className="flex items-center justify-end gap-1">
                    Crédito IBS/CBS
                    {resultados[0]?.usouEfd && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-0.5 rounded font-medium">EFD</span>
                    )}
                  </div>
                </th>
                <th className="text-right py-2 px-3 font-medium">Carga Reforma</th>
                {temFCBF && <th className="text-right py-2 px-3 font-medium">FCBF</th>}
                {temFCBF && <th className="text-right py-2 px-3 font-medium">Carga Líq.</th>}
                <th className="text-right py-2 px-3 font-medium">Delta</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.ano} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-2 px-3 font-medium">{r.ano}</td>
                  <td className="py-2 px-3 text-right">
                    <div>{fmt(r.cargaAtualTotal)}</div>
                    <div className="text-gray-400">{formatarPorcentagem(r.cargaAtualPct)}</div>
                  </td>
                  <td className="py-2 px-3 text-right text-blue-600">
                    {fmt(r.cbs)}
                    {r.ano === 2026 && <div className="text-xs text-gray-400 italic">teste</div>}
                  </td>
                  <td className="py-2 px-3 text-right text-blue-500">
                    {fmt(r.ibsTotal)}
                    {r.ano === 2026 && <div className="text-xs text-gray-400 italic">teste</div>}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-400 text-xs">
                    {(r.icmsReducaoFator * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 px-3 text-right">{fmt(r.icmsReforma)}</td>
                  <td className="py-2 px-3 text-right text-green-600 font-medium">
                    {r.creditoCompras > 0 ? `-${fmt(r.creditoCompras)}` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {fmt(r.cargaReformaTotal)}
                    <div className="text-gray-400">{formatarPorcentagem(r.cargaReformaPct)}</div>
                  </td>
                  {temFCBF && (
                    <td className="py-2 px-3 text-right text-green-600">
                      {r.fcbfEconomia > 0 ? `-${fmt(r.fcbfEconomia)}` : "—"}
                    </td>
                  )}
                  {temFCBF && (
                    <td className="py-2 px-3 text-right font-medium">
                      {fmt(r.cargaLiquidaComFcbf)}
                    </td>
                  )}
                  <td className="py-2 px-3 text-right">
                    <Badge
                      variant={r.delta < 0 ? "default" : "destructive"}
                      className={`text-xs ${r.delta < 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                    >
                      {r.delta < 0
                        ? <><TrendingDown className="h-3 w-3 inline mr-1" />{fmt(Math.abs(r.delta))}</>
                        : <><TrendingUp className="h-3 w-3 inline mr-1" />+{fmt(r.delta)}</>
                      }
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>← Ajustar Premissas</Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportarSimulacaoExcel(resultados, temFCBF, nomeEmpresa, regime, dadosXml, dadosEfd)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700 text-white">
            Ver Análise Comparativa →
          </Button>
        </div>
      </div>
    </div>
  )
}
