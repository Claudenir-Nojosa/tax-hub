"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { ResultadoAno } from "@/lib/reforma-engine"
import { SIMPLES_ALIQUOTAS } from "@/lib/reforma-engine"
import { formatarMoeda, formatarPorcentagem } from "@/lib/reforma-engine"

interface Props {
  resultados: ResultadoAno[]
  regime: string
  temFCBF: boolean
  razaoSocial: string
  faturamento: number
  onBack: () => void
  onSave: () => void
  saving: boolean
}

export default function Step4Analise({
  resultados,
  regime,
  temFCBF,
  razaoSocial,
  faturamento,
  onBack,
  onSave,
  saving,
}: Props) {
  const isSimples = regime.startsWith("SIMPLES")
  const simplesInfo = SIMPLES_ALIQUOTAS[regime]

  // Encontra o primeiro ano em que regime regular fica mais vantajoso que simples
  const anoMigracao = resultados.find((r) => r.diferencaSimplesPct > 0)

  const deltaAcumulado = resultados.reduce((s, r) => s + r.delta, 0)
  const economiaFCBF = resultados.reduce((s, r) => s + r.fcbfEconomia, 0)
  const cargaFinal2033 = resultados[resultados.length - 1]

  if (!resultados.length || !cargaFinal2033) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Nenhuma simulação disponível. Volte e rode a simulação primeiro.
        <Button variant="outline" onClick={onBack} className="ml-4">← Voltar</Button>
      </div>
    )
  }

  const fmt2 = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

  const cargaAtualBase = resultados[0]?.cargaAtualTotal ?? 0

  return (
    <div className="space-y-8">

      {/* Tabela estilo Excel — composição por tributo */}
      <section>
        <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">
          Composição da Carga Tributária por Ano
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="text-left py-2 px-3 font-semibold border border-gray-600 min-w-[160px]">TRIBUTO</th>
                {resultados.map((r) => (
                  <th key={r.ano} className="text-right py-2 px-3 font-semibold border border-gray-600 min-w-[100px]">{r.ano}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* PIS/COFINS */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700">PIS/COFINS (Cumulativo)</td>
                {resultados.map((r) => (
                  <td key={r.ano} className="py-2 px-3 text-right border border-gray-200 dark:border-gray-700">
                    {r.pisCofinsAtual > 0 ? fmt2(r.pisCofinsAtual) : <span className="text-gray-400">-</span>}
                  </td>
                ))}
              </tr>
              {/* ICMS */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700">ICMS (Não cumulativo)</td>
                {resultados.map((r) => (
                  <td key={r.ano} className="py-2 px-3 text-right border border-gray-200 dark:border-gray-700">
                    {r.icmsReforma > 0 ? fmt2(r.icmsReforma) : <span className="text-gray-400">-</span>}
                  </td>
                ))}
              </tr>
              {/* IPI */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700">IPI (Não cumulativo)</td>
                {resultados.map((r) => (
                  <td key={r.ano} className="py-2 px-3 text-right border border-gray-200 dark:border-gray-700">
                    {r.ipiReforma > 0 ? fmt2(r.ipiReforma) : <span className="text-gray-400">-</span>}
                  </td>
                ))}
              </tr>
              {/* CBS */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700">CBS (Não cumulativo)</td>
                {resultados.map((r) => (
                  <td key={r.ano} className={`py-2 px-3 text-right border border-gray-200 dark:border-gray-700 ${r.ano === 2026 ? "text-gray-400 italic" : "text-blue-600 dark:text-blue-400"}`}>
                    {fmt2(r.cbs)}
                  </td>
                ))}
              </tr>
              {/* IBS */}
              <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700">IBS (Não cumulativo)</td>
                {resultados.map((r) => (
                  <td key={r.ano} className={`py-2 px-3 text-right border border-gray-200 dark:border-gray-700 ${r.ano === 2026 ? "text-gray-400 italic" : "text-blue-500 dark:text-blue-300"}`}>
                    {fmt2(r.ibsTotal)}
                  </td>
                ))}
              </tr>
              {/* VALOR TOTAL */}
              <tr className="bg-gray-100 dark:bg-gray-800 font-semibold border-t-2 border-gray-400">
                <td className="py-2 px-3 border border-gray-300 dark:border-gray-600">VALOR TOTAL</td>
                {resultados.map((r) => (
                  <td key={r.ano} className="py-2 px-3 text-right border border-gray-300 dark:border-gray-600">
                    {fmt2(r.cargaReformaTotal)}
                  </td>
                ))}
              </tr>
              {/* IMPACTO */}
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <td className="py-2 px-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  IMPACTO CARGA TRIBUTÁRIA
                </td>
                {resultados.map((r) => {
                  const pct = cargaAtualBase > 0 ? (r.cargaReformaTotal - cargaAtualBase) / cargaAtualBase : 0
                  const isBase = r.ano === 2026
                  return (
                    <td key={r.ano} className={`py-2 px-3 text-right border border-gray-200 dark:border-gray-700 font-medium ${isBase ? "text-gray-400" : pct < 0 ? "text-green-600" : "text-red-600"}`}>
                      {isBase ? "-" : `${pct >= 0 ? "+" : ""}${(pct * 100).toFixed(2)}%`}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">* Análise sem considerar os créditos de IBS/CBS.</p>
      </section>

      {/* Resumo Executivo */}
      <section className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
        <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">Resumo Executivo — {razaoSocial}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">Faturamento anual</p>
            <p className="font-bold text-lg">{formatarMoeda(faturamento)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Impacto acumulado 2026–2033</p>
            <p className={`font-bold text-lg ${deltaAcumulado < 0 ? "text-green-600" : "text-red-600"}`}>
              {deltaAcumulado < 0 ? "Economia de " : "Custo de "}{formatarMoeda(Math.abs(deltaAcumulado))}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Carga IBS+CBS em 2033</p>
            <p className="font-bold text-lg text-blue-600">
              {formatarPorcentagem(cargaFinal2033.ibsCbsPct)}
            </p>
          </div>
        </div>
      </section>

      {/* Simples Nacional vs Regime Regular — só mostra se empresa for Simples */}
      {isSimples && <section>
        <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">
          Comparativo: Simples Nacional vs Regime Regular
        </h3>
        {simplesInfo && (
          <p className="text-xs text-gray-500 mb-3">
            {simplesInfo.descricao} — alíquota nominal: {formatarPorcentagem(simplesInfo.nominal)}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-2 px-3">Ano</th>
                <th className="text-right py-2 px-3">Simples Nacional</th>
                <th className="text-right py-2 px-3">Regime Regular</th>
                <th className="text-center py-2 px-3">Vantagem</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => {
                const regularMaisBarato = r.cargaReformaTotal < r.cargaSimplesNominal
                return (
                  <tr key={r.ano} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium">{r.ano}</td>
                    <td className="py-2 px-3 text-right">
                      {formatarMoeda(r.cargaSimplesNominal)}
                      <span className="ml-1 text-gray-400">({formatarPorcentagem(r.cargaSimplesPct)})</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatarMoeda(r.cargaReformaTotal)}
                      <span className="ml-1 text-gray-400">({formatarPorcentagem(r.cargaReformaPct)})</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${regularMaisBarato
                          ? "border-blue-300 text-blue-700 dark:text-blue-400"
                          : "border-green-300 text-green-700 dark:text-green-400"
                        }`}
                      >
                        {regularMaisBarato ? "Regime Regular" : "Simples Nacional"}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {anoMigracao && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Ponto de inflexão detectado em {anoMigracao.ano}:</strong> A partir deste ano, o
              Regime Regular passa a ser mais vantajoso que o Simples Nacional para esta empresa.
              Recomenda-se avaliar a migração de regime com antecedência.
            </div>
          </div>
        )}

        {!anoMigracao && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-800 dark:text-green-300">
              O Simples Nacional permanece vantajoso durante todo o período de transição para esta empresa.
            </p>
          </div>
        )}
      </section>}

      {/* FCBF */}
      {temFCBF && (
        <section>
          <h3 className="font-semibold text-sm mb-4 text-gray-900 dark:text-white">
            Impacto do Benefício Fiscal (FCBF / Crédito Presumido)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-2 px-3">Ano</th>
                  <th className="text-right py-2 px-3">Sem FCBF</th>
                  <th className="text-right py-2 px-3">Economia FCBF</th>
                  <th className="text-right py-2 px-3">Com FCBF</th>
                  <th className="text-right py-2 px-3">ICMS restante</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r) => (
                  <tr key={r.ano} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium">{r.ano}</td>
                    <td className="py-2 px-3 text-right">{formatarMoeda(r.cargaReformaTotal)}</td>
                    <td className="py-2 px-3 text-right text-green-600">
                      {r.fcbfEconomia > 0 ? `-${formatarMoeda(r.fcbfEconomia)}` : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{formatarMoeda(r.cargaLiquidaComFcbf)}</td>
                    <td className="py-2 px-3 text-right text-gray-500">
                      {(r.icmsReducaoFator * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-medium bg-gray-50 dark:bg-gray-800">
                  <td className="py-2 px-3">TOTAL</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right text-green-600">-{formatarMoeda(economiaFCBF)}</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800 dark:text-red-300">
              <strong>Atenção:</strong> O FCBF e todos os benefícios atrelados ao ICMS serão extintos
              progressivamente de 2029 a 2032, sendo zerados em 2033 com a extinção total do ICMS.
              Planeje a recomposição de margens com antecedência.
            </p>
          </div>
        </section>
      )}

      {/* Observações legais */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Notas metodológicas:</strong></p>
            <p>• Simulação baseada nas alíquotas estimadas da LC 214/2025 e EC 132/2023. Alíquotas definitivas do IBS serão fixadas por resolução do Comitê Gestor.</p>
            <p>• IPI extinto a partir de 2027 para produtos fora da Zona Franca de Manaus (exceto veículos e tabaco).</p>
            <p>• Cálculo simplificado sobre receita bruta. Para análise precisa por produto/NCM, consulte seu contador.</p>
            <p>• Créditos IBS/CBS nas compras calculados proporcionalmente à alíquota de IBS+CBS do ano vigente aplicada sobre a base de compras.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Ver Simulação</Button>
        <Button onClick={onSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? "Salvando..." : "Salvar Simulação"}
        </Button>
      </div>
    </div>
  )
}
