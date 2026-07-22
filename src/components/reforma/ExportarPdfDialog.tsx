"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import RichTextInput from "./RichTextInput"
import { FileText, Loader2, ScrollText, MessageSquareText, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { gerarPdfReforma } from "@/lib/reforma-pdf"
import { calcularQuadroComparativo } from "@/lib/reforma-excel/quadro-comparativo"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"

// Dialog do PDF executivo: o usuário escreve/revisa os textos de LEGISLAÇÕES e CONSIDERAÇÕES
// FINAIS, que são SALVOS na empresa (parametrosExtra.pdfLegislacoes/pdfConsideracoes) ANTES da
// geração — o PDF é montado com o texto salvo (pedido explícito do usuário). Os dados pesados
// chegam via obterDados() (IndexedDB no card, estado do wizard na Revisão).

export interface DadosPesadosPdf {
  linhasSaidas: LinhaSaidaEfd[]
  linhasEntradas: LinhaEntradaEfd[]
  classificacoes: Record<string, ResultadoConsultaCnpj>
  baseIbsCbs: LinhaBaseIbsCbs[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaId: string
  empresa: EmpresaData
  nomeProjeto?: string | null
  premissas: PremissasReformaData
  // parametrosExtra ATUAL completo — o PUT manda ele mesclado com os textos, pra não perder nada
  parametrosExtraAtual: Record<string, unknown>
  // pré-preenchimento da 1ª vez (nota manual do Passo 3), quando ainda não há texto salvo
  textoLegislacoesInicial?: string
  obterDados: () => Promise<DadosPesadosPdf>
  onTextosSalvos?: (textos: { pdfLegislacoes: string; pdfConsideracoes: string }) => void
}

export default function ExportarPdfDialog({
  open, onOpenChange, empresaId, empresa, nomeProjeto, premissas,
  parametrosExtraAtual, textoLegislacoesInicial, obterDados, onTextosSalvos,
}: Props) {
  const [legislacoes, setLegislacoes] = useState("")
  const [consideracoes, setConsideracoes] = useState("")
  const [gerando, setGerando] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [etapa, setEtapa] = useState("")

  // Preenche os dois textos com a IA (persona de especialista em reforma tributária), usando o
  // contexto real do estudo: CNAE, redução 60%, achados do Passo 3 e os números do quadro
  // comparativo/fornecedores. O usuário revisa e edita no editor antes de salvar/gerar.
  const preencherComIA = async () => {
    setGerandoIA(true)
    try {
      let estatisticas: Record<string, number> = {}
      try {
        const dados = await obterDados()
        const quadro = calcularQuadroComparativo(
          dados.linhasSaidas, premissas, dados.linhasEntradas, dados.classificacoes, dados.baseIbsCbs
        )
        const cls = Object.values(dados.classificacoes)
        estatisticas = {
          totalFornecedores: cls.length,
          pctFornecedoresRegimeRegular: cls.length > 0 ? cls.filter((c) => !c.simplesNacional && !c.erro).length / cls.length : 0,
          total2026: quadro[2026].total,
          total2033: quadro[2033].total,
          impacto2033Pct: quadro[2033].impactoPct ?? 0,
          creditoTotal2033: quadro[2033].creditoCbs + quadro[2033].creditoIbs,
        }
      } catch {
        // sem os dados pesados (outro navegador) a IA ainda redige — só sem os números do estudo
      }
      const achadosPasso3 = (parametrosExtraAtual.legislacao as { achados?: unknown } | undefined)?.achados
      const res = await fetch("/api/reforma-tributaria/textos-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razaoSocial: empresa.razaoSocial,
          cnaePrincipal: empresa.cnaePrincipal,
          cnaePrincipalCodigo: empresa.cnaePrincipalCodigo,
          cnaesSecundarios: empresa.cnaesSecundarios,
          regime: empresa.regime,
          uf: empresa.uf,
          reducao60: premissas.reducao60,
          achadosPasso3: Array.isArray(achadosPasso3) ? achadosPasso3 : [],
          estatisticas,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha ao redigir os textos com IA")
      setLegislacoes(String(json.legislacoes))
      setConsideracoes(String(json.consideracoes))
      toast.success("Textos redigidos pela IA — revise e ajuste antes de gerar o PDF")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao redigir com IA")
    } finally {
      setGerandoIA(false)
    }
  }

  // Pré-preenche ao abrir: texto salvo > nota manual do Passo 3 > vazio
  useEffect(() => {
    if (!open) return
    const salvoLeg = typeof parametrosExtraAtual.pdfLegislacoes === "string" ? parametrosExtraAtual.pdfLegislacoes : ""
    const salvoCon = typeof parametrosExtraAtual.pdfConsideracoes === "string" ? parametrosExtraAtual.pdfConsideracoes : ""
    setLegislacoes(salvoLeg || textoLegislacoesInicial || "")
    setConsideracoes(salvoCon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const salvarEGerar = async () => {
    setGerando(true)
    try {
      // 1) salva os textos na empresa ANTES de gerar (o PDF usa o texto salvo)
      setEtapa("Salvando textos...")
      const res = await fetch(`/api/reforma-tributaria/empresas/${empresaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parametrosExtra: { ...parametrosExtraAtual, pdfLegislacoes: legislacoes, pdfConsideracoes: consideracoes },
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Falha ao salvar os textos")
      }
      onTextosSalvos?.({ pdfLegislacoes: legislacoes, pdfConsideracoes: consideracoes })

      // 2) calcula o quadro (mesma fonte de números do Excel) e gera o PDF
      setEtapa("Calculando o quadro comparativo...")
      const dados = await obterDados()
      const quadro = calcularQuadroComparativo(
        dados.linhasSaidas, premissas, dados.linhasEntradas, dados.classificacoes, dados.baseIbsCbs
      )
      setEtapa("Montando o PDF...")
      await gerarPdfReforma({
        empresa, nomeProjeto, premissas,
        textoLegislacoes: legislacoes, textoConsideracoes: consideracoes, quadro,
      })
      toast.success("PDF gerado com sucesso")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF")
    } finally {
      setGerando(false)
      setEtapa("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !gerando && !gerandoIA && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-rose-500" />
            PDF executivo
          </DialogTitle>
          <DialogDescription>
            Escreva os textos das seções abaixo — eles ficam salvos no projeto e entram no PDF
            junto com os dados da empresa, as premissas e o quadro comparativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            onClick={preencherComIA}
            disabled={gerando || gerandoIA}
            className="w-full rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors px-4 py-2.5 flex items-center gap-3 text-left disabled:opacity-60"
          >
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              {gerandoIA ? <Loader2 className="h-4 w-4 text-violet-500 animate-spin" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-300">
                {gerandoIA ? "Redigindo com IA..." : "Preencher com IA"}
              </p>
              <p className="text-[11px] text-violet-700/70 dark:text-violet-400/60">
                Especialista em reforma tributária redige as duas seções com base no CNAE, nas
                premissas e nos números do estudo — você revisa antes de gerar
              </p>
            </div>
          </button>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <ScrollText className="h-3.5 w-3.5 text-primary" /> Legislações aplicáveis
            </Label>
            <RichTextInput
              value={legislacoes}
              onChange={setLegislacoes}
              placeholder="Ex.: LC 214/2025, art. 133 — redução de 60% nas alíquotas de IBS/CBS para medicamentos..."
              disabled={gerando || gerandoIA}
              minHeightClass="min-h-28"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <MessageSquareText className="h-3.5 w-3.5 text-emerald-500" /> Considerações finais
            </Label>
            <RichTextInput
              value={consideracoes}
              onChange={setConsideracoes}
              placeholder="Explique o porquê dos valores: metodologia, comportamento dos tributos na transição, pontos de atenção para o cliente..."
              disabled={gerando || gerandoIA}
              minHeightClass="min-h-32"
            />
          </div>

          <Button
            onClick={salvarEGerar}
            disabled={gerando || gerandoIA}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            {gerando ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {etapa || "Gerando..."}</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Salvar textos e gerar PDF</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
