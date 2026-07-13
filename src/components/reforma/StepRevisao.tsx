"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileDown, CheckCircle2, Building2, Percent, ScrollText, Database, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { EmpresaData } from "./Step1Empresa"
import type { PremissasReformaData } from "./StepPremissasReforma"
import type { LegislacaoData } from "./StepLegislacaoIA"
import type { BaseNcmData } from "./StepBaseNcm"
import type { SaidasEfdData } from "./StepSaidasEfd"
import type { EntradasEfdData } from "./StepEntradasEfd"
import { gerarExcelReforma } from "@/lib/reforma-excel/gerar-excel-reforma"
import { parseBaseIbsCbsCustomizada } from "@/lib/reforma-base-ibs-cbs-custom"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"

// Passo 7 (final) do wizard: resumo de tudo que foi coletado nos passos anteriores + botão para
// gerar o Excel de entrega. Todas as 14 abas planejadas já são geradas (ver
// docs/reforma-tributaria-v2.md) — Fase 7 é polish e teste ponta a ponta, não abas novas.

interface Props {
  empresa: EmpresaData
  premissasReforma: PremissasReformaData
  legislacao: LegislacaoData
  baseNcm: BaseNcmData
  saidasEfd: SaidasEfdData
  entradasEfd: EntradasEfdData
  onBack: () => void
}

function LinhaResumo({ icon: Icon, titulo, valor }: { icon: React.ElementType; titulo: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{titulo}</p>
        <p className="text-sm text-gray-900 dark:text-white">{valor}</p>
      </div>
    </div>
  )
}

export default function StepRevisao({ empresa, premissasReforma, legislacao, baseNcm, saidasEfd, entradasEfd, onBack }: Props) {
  const [gerando, setGerando] = useState(false)
  const [gerado, setGerado] = useState(false)
  const [progresso, setProgresso] = useState<{ pct: number; etapa: string } | null>(null)

  const totalSaidas = saidasEfd.arquivos.reduce((s, a) => s + a.linhas.length, 0)
  const totalEntradas = entradasEfd.arquivos.reduce((s, a) => s + a.linhas.length, 0)
  // Com a geração híbrida (cabeçalhos via ExcelJS + linhas de dados injetadas como XML no .xlsx),
  // 27.577 linhas × 7 abas usaram ~1,4GB de pico — cabe no navegador com folga. O aviso agora só
  // aparece em volumes bem maiores, como precaução.
  const volumeGrande = totalSaidas > 60000

  const gerar = async () => {
    setGerando(true)
    setProgresso({ pct: 0, etapa: "Carregando base de NCM..." })
    try {
      const linhasSaidas = saidasEfd.arquivos.flatMap((a) => a.linhas)

      let baseIbsCbs: LinhaBaseIbsCbs[]
      if (baseNcm.usarPadrao) {
        const res = await fetch("/api/reforma-tributaria/base-ibs-cbs")
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar a base padrão de NCM")
        baseIbsCbs = json.linhas
      } else if (baseNcm.arquivoCustomBuffer) {
        baseIbsCbs = await parseBaseIbsCbsCustomizada(baseNcm.arquivoCustomBuffer)
      } else {
        throw new Error("Nenhuma base de NCM disponível — volte ao Passo 4")
      }

      const linhasEntradas = entradasEfd.arquivos.flatMap((a) => a.linhas)
      await gerarExcelReforma(
        {
          empresa, premissasReforma, legislacao, linhasSaidas, baseIbsCbs,
          linhasEntradas, classificacoesFornecedores: entradasEfd.classificacoes,
        },
        (pct, etapa) => setProgresso({ pct, etapa })
      )
      setGerado(true)
      toast.success("Excel gerado com sucesso")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar Excel")
    } finally {
      setGerando(false)
      setProgresso(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revisão</h3>
        <p className="text-xs text-gray-500 mt-1">Confira os dados coletados antes de gerar o Excel.</p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 px-4">
        <LinhaResumo icon={Building2} titulo="Empresa" valor={`${empresa.razaoSocial} — ${empresa.regime}${premissasReforma.reducao60 ? " — redução 60% IBS/CBS ativa" : ""}`} />
        <LinhaResumo icon={Percent} titulo="Premissas" valor={`Alíquotas ${premissasReforma.reducao60 ? "com" : "sem"} redução de 60%, ISS 2026 = ${(premissasReforma.premissasPorAno[2026]?.aliquotaISS * 100).toFixed(2)}%`} />
        <LinhaResumo icon={ScrollText} titulo="Legislação" valor={legislacao.buscaFeita ? (legislacao.encontrado ? `${legislacao.achados.length} trecho(s) relevante(s) encontrado(s)` : "Nenhum tratamento específico encontrado") : "Busca não realizada"} />
        <LinhaResumo icon={Database} titulo="Base NCM" valor={baseNcm.usarPadrao ? "Base padrão (4.524 NCMs)" : `Base própria: ${baseNcm.arquivoCustomNome}`} />
        <LinhaResumo icon={ArrowUpFromLine} titulo="Saídas (EFD Contribuições)" valor={`${saidasEfd.arquivos.length} arquivo(s), ${totalSaidas} itens de nota fiscal`} />
        <LinhaResumo icon={ArrowDownToLine} titulo="Entradas (EFD ICMS/IPI)" valor={`${entradasEfd.arquivos.length} arquivo(s), ${totalEntradas} itens de compra`} />
      </div>

      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4">
        <p className="text-xs text-emerald-800 dark:text-emerald-300">
          O Excel gerado inclui <strong>Premissas</strong>, <strong>Legislações</strong>, as
          <strong> 7 abas de ano (2026 a 2033)</strong>, <strong>Valor Total NF-e</strong>,
          <strong> Quadro Comparativo</strong>, <strong>Base IBS-CBS</strong>,
          <strong> Entradas EFD ICMS/IPI</strong> e <strong>Análise Fornecedores</strong> (com
          gráfico). O gráfico é uma imagem gerada no momento da exportação — o Excel não suporta
          criação de gráfico nativo interativo por ferramentas externas, então ela não recalcula
          sozinha, só quando você gerar o Excel de novo.
        </p>
      </div>

      {volumeGrande && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {totalSaidas.toLocaleString("pt-BR")} itens de saída — cada um vira uma linha em 7 abas
            (2026 a 2033), então o Excel final terá {(totalSaidas * 7).toLocaleString("pt-BR")} linhas
            de fórmula. A geração pode levar alguns minutos. Se travar, tente gerar com menos meses
            de EFD por vez.
          </p>
        </div>
      )}

      {gerando && progresso && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-700 dark:text-blue-400 font-medium truncate">{progresso.etapa}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold shrink-0 ml-2">{progresso.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150 ease-out"
              style={{ width: `${progresso.pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} disabled={gerando}>← Voltar</Button>
        <Button onClick={gerar} disabled={gerando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : gerado ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
          {gerando ? "Gerando..." : gerado ? "Excel gerado — gerar novamente" : "Gerar Excel"}
        </Button>
      </div>
    </div>
  )
}
