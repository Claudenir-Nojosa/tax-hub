"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Loader2, ScrollText, MessageSquareText } from "lucide-react"
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
  const [etapa, setEtapa] = useState("")

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
    <Dialog open={open} onOpenChange={(v) => !gerando && onOpenChange(v)}>
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
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <ScrollText className="h-3.5 w-3.5 text-blue-500" /> Legislações aplicáveis
            </Label>
            <Textarea
              value={legislacoes}
              onChange={(e) => setLegislacoes(e.target.value)}
              placeholder="Ex.: LC 214/2025, art. 133 — redução de 60% nas alíquotas de IBS/CBS para medicamentos..."
              rows={5}
              disabled={gerando}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <MessageSquareText className="h-3.5 w-3.5 text-emerald-500" /> Considerações finais
            </Label>
            <Textarea
              value={consideracoes}
              onChange={(e) => setConsideracoes(e.target.value)}
              placeholder="Explique o porquê dos valores: metodologia, comportamento dos tributos na transição, pontos de atenção para o cliente..."
              rows={6}
              disabled={gerando}
              className="text-sm"
            />
          </div>

          <Button
            onClick={salvarEGerar}
            disabled={gerando}
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
