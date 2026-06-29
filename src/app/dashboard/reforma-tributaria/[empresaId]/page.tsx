"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Scale, ChevronRight } from "lucide-react"
import Step1Empresa, { type EmpresaData } from "@/components/reforma/Step1Empresa"
import Step2Premissas, {
  type PremissasData,
  type FonteSaidas,
  type FonteEntradas,
  defaultPremissas,
} from "@/components/reforma/Step2Premissas"
import Step3Simulacao from "@/components/reforma/Step3Simulacao"
import Step4Analise from "@/components/reforma/Step4Analise"
import type { ResultadoAno } from "@/lib/reforma-engine"
import type { DadosReaisXml } from "@/lib/nfe-parser"
import type { DadosEfd } from "@/lib/efd-parser"

const STEPS = ["Empresa", "Premissas", "Simulação", "Análise"]

const defaultEmpresa: EmpresaData = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  regime: "",
  simplesNacional: false,
  uf: "",
  municipio: "",
  cnaePrincipal: "",
  faturamento: 0,
}

export default function EmpresaWizardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>}>
      <EmpresaWizardInner />
    </Suspense>
  )
}

function EmpresaWizardInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNova = params.empresaId === "nova"
  const empresaId = isNova ? null : (params.empresaId as string)
  const viewMode = searchParams.get("view") === "analise"
  const editMode = searchParams.get("edit") === "true"

  const [step, setStep] = useState(viewMode ? 3 : 0)
  const [loadingEmpresa, setLoadingEmpresa] = useState(!isNova)
  const [empresa, setEmpresa] = useState<EmpresaData>(defaultEmpresa)
  const [premissas, setPremissas] = useState<PremissasData>(defaultPremissas())
  const [resultados, setResultados] = useState<ResultadoAno[]>([])
  const [savedEmpresaId, setSavedEmpresaId] = useState<string | null>(empresaId)
  const [loadingSimulacao, setLoadingSimulacao] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fontes
  const [fonteSaidas, setFonteSaidas] = useState<FonteSaidas>("manual")
  const [fonteEntradas, setFonteEntradas] = useState<FonteEntradas>("nenhuma")

  // Dados
  const [dadosXml, setDadosXml] = useState<DadosReaisXml | null>(null)       // saídas XML (salvo no DB)
  const [dadosXmlEntradas, setDadosXmlEntradas] = useState<DadosReaisXml | null>(null) // entradas XML (client-side)
  const [dadosEfd, setDadosEfd] = useState<DadosEfd | null>(null)             // EFD TXT (client-side)
  const [usouXml, setUsouXml] = useState(false)

  // Carrega empresa existente
  useEffect(() => {
    if (!empresaId) return
    fetch(`/api/reforma-tributaria/empresas/${empresaId}`)
      .then((r) => r.json())
      .then((data) => {
        setEmpresa({
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia ?? "",
          regime: data.regime,
          simplesNacional: data.simplesNacional,
          uf: data.uf,
          municipio: data.municipio ?? "",
          cnaePrincipal: data.cnaePrincipal ?? "",
          faturamento: data.faturamento,
        })
        setPremissas({
          aliquotaICMS: data.aliquotaICMS,
          aliquotaICMSCompras: data.aliquotaICMSCompras,
          temIPI: data.temIPI,
          aliquotaIPI: data.aliquotaIPI ?? 0,
          percentualIPISaidas: data.percentualIPISaidas ?? 0,
          temFCBF: data.temFCBF,
          fcbfPercentual: data.fcbfPercentual ?? 0,
          fcbfBaseCalculo: data.fcbfBaseCalculo ?? 0,
          premissasAnuais: defaultPremissas().premissasAnuais,
        })
        if (data.simulacoes?.length > 0) {
          setResultados(data.simulacoes[0].resultados as ResultadoAno[])
          setUsouXml(data.simulacoes[0].usouXml ?? false)
        }
        setLoadingEmpresa(false)
      })
      .catch(() => { toast.error("Erro ao carregar empresa"); setLoadingEmpresa(false) })

    // Carrega XML de saídas do DB
    fetch(`/api/reforma-tributaria/xml?empresaId=${empresaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.totalItens > 0) {
          setDadosXml({
            periodos: data.periodos,
            totalNFs: data.totalNFs,
            totalItens: data.totalItens,
            totalVProd: data.totalVProd,
            totalVICMS: data.totalVICMS,
            totalVPIS: data.totalVPIS,
            totalVCOFINS: data.totalVCOFINS,
            totalVIPI: data.totalVIPI,
            totalVBCICMS: 0,
            totalBaseIbsCbs: data.totalBaseIbsCbs,
            aliquotaICMSEfetiva: data.aliquotaICMSEfetiva,
            aliquotaIPIEfetiva: data.aliquotaIPIEfetiva,
            percentualIPISaidas: data.percentualIPISaidas,
            mesesImportados: data.mesesImportados,
            fatorAnualizacao: 12 / data.mesesImportados,
            itens: data.itens ?? [],
          })
          setFonteSaidas("xml")
        }
      })
      .catch(() => {/* sem dados XML é ok */})
  }, [empresaId])

  const salvarEmpresa = async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/reforma-tributaria/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: empresa.cnpj,
          razaoSocial: empresa.razaoSocial,
          nomeFantasia: empresa.nomeFantasia || null,
          regime: empresa.regime,
          simplesNacional: empresa.simplesNacional,
          uf: empresa.uf,
          municipio: empresa.municipio,
          cnaePrincipal: empresa.cnaePrincipal,
          faturamento: empresa.faturamento,
          aliquotaICMS: premissas.aliquotaICMS,
          aliquotaICMSCompras: premissas.aliquotaICMSCompras,
          temIPI: premissas.temIPI,
          aliquotaIPI: premissas.aliquotaIPI,
          percentualIPISaidas: premissas.percentualIPISaidas,
          temFCBF: premissas.temFCBF,
          fcbfPercentual: premissas.fcbfPercentual,
          fcbfBaseCalculo: premissas.fcbfBaseCalculo,
        }),
      })
      const data = await res.json()
      return data.id
    } catch {
      return null
    }
  }

  const rodarSimulacao = async () => {
    setLoadingSimulacao(true)
    setStep(2)
    try {
      const id = await salvarEmpresa()
      if (!id) throw new Error("Falha ao salvar empresa")
      setSavedEmpresaId(id)

      // Salva XML de saídas no DB se fonte = xml e dados disponíveis
      if (fonteSaidas === "xml" && dadosXml) {
        await fetch("/api/reforma-tributaria/xml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresaId: id, dadosXml }),
        })
      }

      // Determina bcICMSEntradas conforme fonte das entradas
      let bcICMSEntradas: number | undefined
      if (fonteEntradas === "efd" && dadosEfd) {
        bcICMSEntradas = dadosEfd.bcICMSEntradas
      } else if (fonteEntradas === "xml" && dadosXmlEntradas) {
        bcICMSEntradas = dadosXmlEntradas.totalBaseIbsCbs
      }

      const res = await fetch("/api/reforma-tributaria/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: id,
          premissasOverride: premissas.premissasAnuais,
          usarXml: fonteSaidas === "xml",
          usarEfdSaidas: fonteSaidas === "efd",
          efdSaidasInput: fonteSaidas === "efd" && dadosEfd ? dadosEfd.saidasParaSimulacao : undefined,
          bcICMSEntradas,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultados(data.resultados)
      setUsouXml(data.usouXml ?? false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao calcular simulação")
      setStep(1)
    } finally {
      setLoadingSimulacao(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      toast.success("Simulação salva com sucesso!")
      router.push("/dashboard/reforma-tributaria")
    } catch {
      toast.error("Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Scale className="h-5 w-5 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isNova ? "Nova Empresa" : empresa.razaoSocial || "Empresa"}
        </h1>
      </div>

      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => {
          const canNavigate = i < step || (editMode && savedEmpresaId !== null)
          return (
            <div key={label} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => canNavigate && setStep(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-blue-600 text-white"
                    : canNavigate
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer hover:bg-blue-200"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-default"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === step ? "bg-white/20" : i < step ? "bg-blue-200" : "bg-gray-200 dark:bg-gray-700"
                }`}>
                  {i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        {step === 0 && (
          <Step1Empresa data={empresa} onChange={setEmpresa} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <Step2Premissas
            data={premissas}
            onChange={setPremissas}
            onBack={() => setStep(0)}
            onNext={rodarSimulacao}
            empresaId={savedEmpresaId || "nova"}
            fonteSaidas={fonteSaidas}
            onFonteSaidas={setFonteSaidas}
            dadosXml={dadosXml}
            onDadosXml={setDadosXml}
            fonteEntradas={fonteEntradas}
            onFonteEntradas={setFonteEntradas}
            dadosXmlEntradas={dadosXmlEntradas}
            onDadosXmlEntradas={setDadosXmlEntradas}
            dadosEfd={dadosEfd}
            onDadosEfd={setDadosEfd}
          />
        )}
        {step === 2 && (
          <Step3Simulacao
            resultados={resultados}
            temFCBF={premissas.temFCBF}
            loading={loadingSimulacao}
            usouXml={usouXml}
            nomeEmpresa={empresa.razaoSocial}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step4Analise
            resultados={resultados}
            regime={empresa.regime}
            temFCBF={premissas.temFCBF}
            razaoSocial={empresa.razaoSocial}
            faturamento={empresa.faturamento}
            loading={loadingEmpresa}
            onBack={() => setStep(2)}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>

      {savedEmpresaId && (
        <p className="text-xs text-center text-gray-400 mt-4">
          ID da empresa: {savedEmpresaId}
        </p>
      )}
    </div>
  )
}
