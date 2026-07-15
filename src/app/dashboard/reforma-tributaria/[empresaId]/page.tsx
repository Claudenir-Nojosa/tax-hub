"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Scale, ChevronRight } from "lucide-react"
import { carregarProjetoWizard, salvarProjetoWizard } from "@/lib/reforma-wizard-store"
import Step1Empresa, { type EmpresaData } from "@/components/reforma/Step1Empresa"
import StepPremissasReforma, {
  type PremissasReformaData,
  defaultPremissasReforma,
} from "@/components/reforma/StepPremissasReforma"
import StepLegislacaoIA, {
  type LegislacaoData,
  defaultLegislacao,
} from "@/components/reforma/StepLegislacaoIA"
import StepBaseNcm, { type BaseNcmData, defaultBaseNcm } from "@/components/reforma/StepBaseNcm"
import StepSaidasEfd, { type SaidasEfdData, defaultSaidasEfd } from "@/components/reforma/StepSaidasEfd"
import StepEntradasEfd, { type EntradasEfdData, defaultEntradasEfd } from "@/components/reforma/StepEntradasEfd"
import StepRevisao from "@/components/reforma/StepRevisao"

// Wizard v2: 7 passos rumo à geração do Excel fiel ao modelo (ver docs/reforma-tributaria-v2.md).
// Todos os 7 passos já funcionam. O Excel gerado no Passo 7 (Fase 2) só tem as abas Premissas e
// Legislações prontas — as abas de ano/entradas/análise são fases seguintes (tasks #65+), mas os
// dados de saídas/entradas já importados aqui ficam no estado do wizard pra quando existirem. O
// wizard antigo de 4 passos (Empresa/Premissas ICMS-IPI-FCBF/Simulação/Análise, com gráficos e
// export estático) foi substituído por este fluxo — a reconstrução é intencional, ver plano.
const STEPS = ["Empresa", "Premissas", "Legislação", "Base NCM", "Saídas", "Entradas", "Revisão"]

const defaultEmpresa: EmpresaData = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  regime: "",
  simplesNacional: false,
  uf: "",
  municipio: "",
  cnaePrincipal: "",
  cnaePrincipalCodigo: "",
  cnaesSecundarios: [],
  faturamento: 0,
  estabelecimentosAdicionais: [],
  logoDataUrl: null,
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
  const editMode = searchParams.get("edit") === "true"

  const [step, setStep] = useState(0)
  const [loadingEmpresa, setLoadingEmpresa] = useState(!isNova)
  const [empresa, setEmpresa] = useState<EmpresaData>(defaultEmpresa)
  const [premissasReforma, setPremissasReforma] = useState<PremissasReformaData>(defaultPremissasReforma())
  const [legislacao, setLegislacao] = useState<LegislacaoData>(defaultLegislacao())
  // Base NCM / saídas / entradas não vão pro parametrosExtra do Prisma (milhares de linhas,
  // grande demais pra JSON via API) — ficam no estado do wizard e são persistidos LOCALMENTE no
  // IndexedDB (reforma-wizard-store) para o estudo poder ser reaberto sem reimportar nada.
  const [baseNcm, setBaseNcm] = useState<BaseNcmData>(defaultBaseNcm())
  const [saidasEfd, setSaidasEfd] = useState<SaidasEfdData>(defaultSaidasEfd())
  const [entradasEfd, setEntradasEfd] = useState<EntradasEfdData>(defaultEntradasEfd())
  const [nomeProjeto, setNomeProjeto] = useState("")
  const [savedEmpresaId, setSavedEmpresaId] = useState<string | null>(empresaId)
  const [saving, setSaving] = useState(false)
  // evita que o auto-save dispare durante a restauração inicial dos dados do IndexedDB
  const restauradoRef = useRef(false)

  // Carrega empresa existente (inclui parametrosExtra com premissasReforma/legislacao salvos) e,
  // em seguida, os dados pesados do wizard salvos neste navegador (IndexedDB). Se o estudo já foi
  // concluído aqui, cai direto na Revisão — dá pra consultar, editar qualquer passo ou baixar o
  // Excel de novo sem refazer nada.
  useEffect(() => {
    if (!empresaId) {
      restauradoRef.current = true
      return
    }
    fetch(`/api/reforma-tributaria/empresas/${empresaId}`)
      .then((r) => r.json())
      .then(async (data) => {
        setEmpresa({
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia ?? "",
          regime: data.regime,
          simplesNacional: data.simplesNacional,
          uf: data.uf,
          municipio: data.municipio ?? "",
          cnaePrincipal: data.cnaePrincipal ?? "",
          cnaePrincipalCodigo: data.parametrosExtra?.cnaePrincipalCodigo ?? "",
          cnaesSecundarios: data.parametrosExtra?.cnaesSecundarios ?? [],
          faturamento: data.faturamento,
          estabelecimentosAdicionais: data.parametrosExtra?.estabelecimentosAdicionais ?? [],
          logoDataUrl: data.parametrosExtra?.logoDataUrl ?? null,
        })
        if (data.parametrosExtra?.premissasReforma) {
          setPremissasReforma(data.parametrosExtra.premissasReforma)
        }
        if (data.parametrosExtra?.legislacao) {
          setLegislacao(data.parametrosExtra.legislacao)
        }
        if (typeof data.parametrosExtra?.nomeProjeto === "string") {
          setNomeProjeto(data.parametrosExtra.nomeProjeto)
        }
        try {
          const salvo = await carregarProjetoWizard(empresaId)
          if (salvo) {
            setBaseNcm(salvo.baseNcm)
            setSaidasEfd(salvo.saidasEfd)
            setEntradasEfd(salvo.entradasEfd)
            if (salvo.saidasEfd.arquivos.length > 0) {
              setStep(6)
              toast.success("Projeto recuperado — revise, edite ou gere o Excel novamente")
            }
          }
        } catch {
          // IndexedDB indisponível (modo privado etc.) — segue sem os dados locais
        }
        restauradoRef.current = true
        setLoadingEmpresa(false)
      })
      .catch(() => { toast.error("Erro ao carregar empresa"); restauradoRef.current = true; setLoadingEmpresa(false) })
  }, [empresaId])

  // Auto-save local dos dados pesados: sempre que saídas/entradas/base NCM mudarem (depois da
  // restauração inicial), persiste no IndexedDB chaveado pelo id da empresa.
  useEffect(() => {
    if (!restauradoRef.current || !savedEmpresaId) return
    if (saidasEfd.arquivos.length === 0 && entradasEfd.arquivos.length === 0 && baseNcm.usarPadrao) return
    salvarProjetoWizard({ empresaId: savedEmpresaId, saidasEfd, entradasEfd, baseNcm }).catch(() => {
      // sem IndexedDB o wizard continua funcionando — só perde o "reabrir depois"
    })
  }, [savedEmpresaId, saidasEfd, entradasEfd, baseNcm])

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
          // Campos ainda sem coluna própria no Prisma (Fase 1) — ficam em parametrosExtra até
          // uma fase futura decidir se merecem migração dedicada.
          parametrosExtra: {
            cnaePrincipalCodigo: empresa.cnaePrincipalCodigo,
            cnaesSecundarios: empresa.cnaesSecundarios,
            estabelecimentosAdicionais: empresa.estabelecimentosAdicionais,
            premissasReforma,
            legislacao,
            nomeProjeto,
            logoDataUrl: empresa.logoDataUrl ?? null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar empresa")
      return data.id
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar empresa")
      return null
    }
  }

  const avancarDoPasso1 = async () => {
    const id = await salvarEmpresa()
    if (!id) return
    setSavedEmpresaId(id)
    setStep(1)
  }

  const salvarEAvancar = async (proximoStep: number) => {
    setSaving(true)
    const id = await salvarEmpresa()
    setSaving(false)
    if (!id) return
    setSavedEmpresaId(id)
    setStep(proximoStep)
  }

  // Persiste o nome do projeto (parametrosExtra) com debounce enquanto o usuário digita na
  // Revisão — assim o nome sobrevive mesmo se ele fechar a página sem gerar o Excel.
  useEffect(() => {
    if (!restauradoRef.current || !savedEmpresaId || !empresa.cnpj) return
    const t = setTimeout(() => { salvarEmpresa() }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeProjeto])

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
        {loadingEmpresa ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Carregando...</div>
        ) : step === 0 ? (
          <Step1Empresa data={empresa} onChange={setEmpresa} onNext={avancarDoPasso1} />
        ) : step === 1 ? (
          <StepPremissasReforma
            data={premissasReforma}
            onChange={setPremissasReforma}
            onBack={() => setStep(0)}
            onNext={() => salvarEAvancar(2)}
          />
        ) : step === 2 ? (
          <StepLegislacaoIA
            data={legislacao}
            onChange={setLegislacao}
            cnaePrincipal={{ codigo: empresa.cnaePrincipalCodigo, descricao: empresa.cnaePrincipal }}
            cnaesSecundarios={empresa.cnaesSecundarios}
            onBack={() => setStep(1)}
            onNext={() => salvarEAvancar(3)}
          />
        ) : step === 3 ? (
          <StepBaseNcm data={baseNcm} onChange={setBaseNcm} onBack={() => setStep(2)} onNext={() => setStep(4)} />
        ) : step === 4 ? (
          <StepSaidasEfd data={saidasEfd} onChange={setSaidasEfd} onBack={() => setStep(3)} onNext={() => setStep(5)} />
        ) : step === 5 ? (
          <StepEntradasEfd data={entradasEfd} onChange={setEntradasEfd} onBack={() => setStep(4)} onNext={() => setStep(6)} />
        ) : step === 6 ? (
          <StepRevisao
            empresa={empresa}
            premissasReforma={premissasReforma}
            legislacao={legislacao}
            baseNcm={baseNcm}
            saidasEfd={saidasEfd}
            entradasEfd={entradasEfd}
            nomeProjeto={nomeProjeto}
            onNomeProjetoChange={setNomeProjeto}
            onBack={() => setStep(5)}
          />
        ) : null}
      </div>

      {savedEmpresaId && (
        <p className="text-xs text-center text-gray-400 mt-4">
          ID da empresa: {savedEmpresaId} {saving && "— salvando..."}
        </p>
      )}
    </div>
  )
}
