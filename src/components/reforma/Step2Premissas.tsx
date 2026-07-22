"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PREMISSAS_PADRAO, ANOS_TRANSICAO, type PremissaAno } from "@/lib/reforma-engine"
import type { DadosReaisXml } from "@/lib/nfe-parser"
import type { DadosEfd } from "@/lib/efd-parser"
import dynamic from "next/dynamic"
import { formatarMoeda, formatarPorcentagem } from "@/lib/reforma-engine"

const XmlImportPanel = dynamic(() => import("./XmlImportPanel"), { ssr: false })
const EfdImportPanel = dynamic(() => import("./EfdImportPanel"), { ssr: false })
const XmlEntradasPanel = dynamic(() => import("./XmlEntradasPanel"), { ssr: false })

export type FonteSaidas = "xml" | "efd" | "manual"
export type FonteEntradas = "xml" | "efd" | "nenhuma"

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
  bcICMSEntradas?: number
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
  empresaId: string
  // Saídas
  fonteSaidas: FonteSaidas
  onFonteSaidas: (f: FonteSaidas) => void
  dadosXml: DadosReaisXml | null
  onDadosXml: (dados: DadosReaisXml | null) => void
  // Entradas
  fonteEntradas: FonteEntradas
  onFonteEntradas: (f: FonteEntradas) => void
  dadosXmlEntradas: DadosReaisXml | null
  onDadosXmlEntradas: (dados: DadosReaisXml | null) => void
  // EFD (compartilhado entre saídas e entradas)
  dadosEfd: DadosEfd | null
  onDadosEfd: (dados: DadosEfd | null) => void
}

const pct = (v: number) => `${(v * 100).toFixed(2)}`
const fromPct = (s: string) => parseFloat(s) / 100 || 0

function SourceTab({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {label}
    </button>
  )
}

export default function Step2Premissas({
  data, onChange, onBack, onNext, empresaId,
  fonteSaidas, onFonteSaidas, dadosXml, onDadosXml,
  fonteEntradas, onFonteEntradas, dadosXmlEntradas, onDadosXmlEntradas,
  dadosEfd, onDadosEfd,
}: Props) {
  const set = (patch: Partial<PremissasData>) => onChange({ ...data, ...patch })

  const setPremissaAno = (ano: number, field: keyof PremissaAno, raw: string) => {
    const val = field === "ipiAtivo" ? raw === "true" : fromPct(raw)
    onChange({
      ...data,
      premissasAnuais: { ...data.premissasAnuais, [ano]: { ...data.premissasAnuais[ano], [field]: val } },
    })
  }

  const resetPremissas = () => set({ premissasAnuais: structuredClone(PREMISSAS_PADRAO) as Record<number, PremissaAno> })

  // Handlers de auto-preenchimento
  const handleDadosXml = (dados: DadosReaisXml | null) => {
    onDadosXml(dados)
    if (dados) {
      onChange({
        ...data,
        aliquotaICMS: dados.aliquotaICMSEfetiva || data.aliquotaICMS,
        temIPI: dados.aliquotaIPIEfetiva > 0,
        aliquotaIPI: dados.aliquotaIPIEfetiva || data.aliquotaIPI,
        percentualIPISaidas: dados.percentualIPISaidas || data.percentualIPISaidas,
      })
    }
  }

  const handleDadosXmlEntradas = (dados: DadosReaisXml | null) => {
    onDadosXmlEntradas(dados)
    if (dados) {
      onChange({
        ...data,
        aliquotaICMSCompras: dados.totalVProd > 0 ? dados.totalVICMS / dados.totalVProd : data.aliquotaICMSCompras,
        bcICMSEntradas: dados.totalBaseIbsCbs,
      })
    } else {
      onChange({ ...data, bcICMSEntradas: undefined })
    }
  }

  const handleDadosEfd = (dados: DadosEfd | null) => {
    onDadosEfd(dados)
    if (dados) {
      // Saídas: auto-preenche alíquota ICMS saídas e IPI (do C100)
      const newData: Partial<PremissasData> = {}
      if (fonteSaidas === "efd" && dados.saidasParaSimulacao.totalVProd > 0) {
        newData.aliquotaICMS = dados.saidasParaSimulacao.aliquotaICMSEfetiva || data.aliquotaICMS
        newData.temIPI = dados.saidasParaSimulacao.aliquotaIPIEfetiva > 0
        newData.aliquotaIPI = dados.saidasParaSimulacao.aliquotaIPIEfetiva || data.aliquotaIPI
        newData.percentualIPISaidas = dados.saidasParaSimulacao.percentualIPISaidas || data.percentualIPISaidas
      }
      // Entradas: auto-preenche alíquota ICMS compras
      if (fonteEntradas === "efd") {
        newData.aliquotaICMSCompras = dados.aliquotaMediaEntradas || data.aliquotaICMSCompras
        newData.bcICMSEntradas = dados.bcICMSEntradas
      }
      if (Object.keys(newData).length > 0) onChange({ ...data, ...newData })
    } else {
      const patch: Partial<PremissasData> = {}
      if (fonteEntradas === "efd") patch.bcICMSEntradas = undefined
      if (Object.keys(patch).length > 0) onChange({ ...data, ...patch })
    }
  }

  // Quando muda a fonte, limpa bcICMSEntradas se necessário
  const handleFonteSaidasChange = (f: FonteSaidas) => {
    onFonteSaidas(f)
  }

  const handleFonteEntradasChange = (f: FonteEntradas) => {
    onFonteEntradas(f)
    if (f !== "xml" && f !== "efd") {
      onChange({ ...data, bcICMSEntradas: undefined })
    }
  }

  // Verifica se o EFD é necessário (usado em saídas ou entradas)
  const efdNecessario = fonteSaidas === "efd" || fonteEntradas === "efd"

  // Badge de fonte
  const badgeEntradas = fonteEntradas === "efd" ? "EFD" : fonteEntradas === "xml" ? "XML" : null

  return (
    <div className="space-y-8">

      {/* ═══ SAÍDAS ═══ */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">
            Saídas — base do cálculo IBS/CBS
          </h3>
          <div className="flex gap-1.5">
            <SourceTab label="XML NF-e" active={fonteSaidas === "xml"} onClick={() => handleFonteSaidasChange("xml")} />
            <SourceTab label="EFD TXT" active={fonteSaidas === "efd"} onClick={() => handleFonteSaidasChange("efd")} />
            <SourceTab label="Manual" active={fonteSaidas === "manual"} onClick={() => handleFonteSaidasChange("manual")} />
          </div>
        </div>

        {fonteSaidas === "xml" && (
          <>
            <XmlImportPanel empresaId={empresaId} dadosXml={dadosXml} onDadosXml={handleDadosXml} />
            {dadosXml && (
              <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                ✓ Alíquotas de saídas preenchidas automaticamente dos XMLs.
              </p>
            )}
          </>
        )}

        {fonteSaidas === "efd" && (
          <>
            {!dadosEfd ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                ⚠ Importe o EFD ICMS IPI abaixo. Os dados de C100 saídas serão usados como base da simulação.
              </p>
            ) : dadosEfd.saidasParaSimulacao.totalVProd > 0 ? (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total saídas (VL_DOC)</p>
                  <p className="font-bold text-primary text-sm">{formatarMoeda(dadosEfd.saidasParaSimulacao.totalVProd)}</p>
                </div>
                <div className="rounded-md bg-card border border-border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Base IBS/CBS saídas</p>
                  <p className="font-semibold text-sm">{formatarMoeda(dadosEfd.saidasParaSimulacao.totalBaseIbsCbs)}</p>
                </div>
                <div className="rounded-md bg-card border border-border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Alíq. ICMS média</p>
                  <p className="font-semibold text-sm">{formatarPorcentagem(dadosEfd.saidasParaSimulacao.aliquotaICMSEfetiva, 2)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠ Nenhum registro C100 de saída encontrado no EFD. Verifique o arquivo.
              </p>
            )}
          </>
        )}

        {fonteSaidas === "manual" && (
          <p className="text-xs text-muted-foreground">
            Os campos de tributação abaixo serão usados para estimar a carga sobre o faturamento informado.
          </p>
        )}
      </section>

      {/* ═══ ENTRADAS ═══ */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">
            Entradas — base do crédito IBS/CBS
          </h3>
          <div className="flex gap-1.5">
            <SourceTab label="XML NF-e" active={fonteEntradas === "xml"} onClick={() => handleFonteEntradasChange("xml")} />
            <SourceTab label="EFD TXT" active={fonteEntradas === "efd"} onClick={() => handleFonteEntradasChange("efd")} />
            <SourceTab label="Não calcular" active={fonteEntradas === "nenhuma"} onClick={() => handleFonteEntradasChange("nenhuma")} />
          </div>
        </div>

        {fonteEntradas === "xml" && (
          <XmlEntradasPanel dadosXmlEntradas={dadosXmlEntradas} onDadosXmlEntradas={handleDadosXmlEntradas} />
        )}

        {fonteEntradas === "efd" && (
          <>
            {!dadosEfd ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Importe o EFD ICMS IPI abaixo. Os dados de C190 entradas serão usados como base do crédito.
              </p>
            ) : dadosEfd.bcICMSEntradas > 0 ? (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">BC ICMS Entradas</p>
                  <p className="font-bold text-primary text-sm">{formatarMoeda(dadosEfd.bcICMSEntradas)}</p>
                  <p className="text-xs text-primary">base crédito IBS/CBS</p>
                </div>
                <div className="rounded-md bg-card border border-border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Crédito ICMS atual</p>
                  <p className="font-semibold text-sm">{formatarMoeda(dadosEfd.icmsCreditoEntradas)}</p>
                </div>
                <div className="rounded-md bg-card border border-border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Alíq. média</p>
                  <p className="font-semibold text-sm">{formatarPorcentagem(dadosEfd.aliquotaMediaEntradas, 2)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠ Nenhum C190 de entrada encontrado no EFD.
              </p>
            )}
          </>
        )}

        {fonteEntradas === "nenhuma" && (
          <p className="text-xs text-muted-foreground">
            Crédito IBS/CBS das compras será estimado pela alíquota ICMS compras × faturamento.
          </p>
        )}
      </section>

      {/* ═══ EFD Upload (compartilhado) ═══ */}
      {efdNecessario && (
        <section>
          <h3 className="font-semibold text-sm mb-3 text-foreground">
            EFD ICMS IPI
            <span className="ml-2 text-xs font-normal text-muted-foreground">— arquivo .txt do SPED Fiscal</span>
          </h3>
          <EfdImportPanel dadosEfd={dadosEfd} onDadosEfd={handleDadosEfd} />
        </section>
      )}

      {/* ═══ Tributação Atual ═══ */}
      <section>
        <h3 className="font-semibold text-sm mb-4 text-foreground">Tributação Atual</h3>
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
            <div className="flex items-center gap-2">
              <Label>Alíquota ICMS média — compras (%)</Label>
              {badgeEntradas && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                  {badgeEntradas}
                </span>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              value={pct(data.aliquotaICMSCompras)}
              onChange={(e) => set({ aliquotaICMSCompras: fromPct(e.target.value) })}
              placeholder="12.00"
            />
            <p className="text-xs text-muted-foreground">
              {fonteEntradas !== "nenhuma"
                ? "Auto-preenchido pela fonte selecionada. Ajuste se necessário."
                : "Usado para estimar crédito IBS/CBS nas compras"}
            </p>
          </div>
        </div>

        {/* IPI */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={data.temIPI} onCheckedChange={(v) => set({ temIPI: v })} />
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

        <p className="mt-3 text-xs text-muted-foreground">
          PIS (0,65%) + COFINS (3%) fixos para Lucro Presumido. IPI extinto a partir de 2027 (fora ZFM).
        </p>
      </section>

      {/* ═══ FCBF ═══ */}
      <section>
        <h3 className="font-semibold text-sm mb-4 text-foreground">
          Benefício Fiscal Estadual (FCBF / Crédito Presumido)
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <Switch checked={data.temFCBF} onCheckedChange={(v) => set({ temFCBF: v })} />
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
              <p className="text-xs text-muted-foreground">Valor mensal da base sobre o qual incide o crédito. Será anualizado (x12).</p>
            </div>
          </div>
        )}
        {data.temFCBF && (
          <p className="ml-8 mt-2 text-xs text-amber-600 dark:text-amber-400">
            ⚠ O FCBF extingue-se gradualmente de 2029 a 2032, sendo zerado em 2033 com a extinção do ICMS.
          </p>
        )}
      </section>

      {/* ═══ Alíquotas da Reforma ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-foreground">
            Alíquotas da Reforma (LC 214/2025) — editáveis
          </h3>
          <Button variant="ghost" size="sm" onClick={resetPremissas} className="text-xs">
            Restaurar padrão
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Ano</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">CBS (%)</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">IBS UF (%)</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">IBS Mun (%)</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Total IBS+CBS (%)</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">ICMS restante (%)</th>
              </tr>
            </thead>
            <tbody>
              {ANOS_TRANSICAO.map((ano) => {
                const p = data.premissasAnuais[ano]
                const total = ((p.cbs + p.ibsUF + p.ibsMUN) * 100).toFixed(2)
                return (
                  <tr key={ano} className="border-b border-border">
                    <td className="py-2 pr-3 font-medium">{ano}</td>
                    <td className="py-1 px-2">
                      <Input type="number" step="0.01" className="h-7 text-xs text-center w-20" value={pct(p.cbs)} onChange={(e) => setPremissaAno(ano, "cbs", e.target.value)} />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" step="0.01" className="h-7 text-xs text-center w-20" value={pct(p.ibsUF)} onChange={(e) => setPremissaAno(ano, "ibsUF", e.target.value)} />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" step="0.01" className="h-7 text-xs text-center w-20" value={pct(p.ibsMUN)} onChange={(e) => setPremissaAno(ano, "ibsMUN", e.target.value)} />
                    </td>
                    <td className="py-1 px-2 text-center font-semibold text-primary">{total}%</td>
                    <td className="py-1 px-2 text-center">{(p.icmsReducao * 100).toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Voltar</Button>
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Calcular Simulação →
        </Button>
      </div>
    </div>
  )
}
