"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  FileSpreadsheet, FileDown, Loader2, FolderOpen, ArrowUpFromLine, ArrowDownToLine,
  Users, CalendarClock, ShieldCheck, Sparkles, FileText,
} from "lucide-react"
import { toast } from "sonner"
import { carregarProjetoWizard, type ProjetoWizardSalvo } from "@/lib/reforma-wizard-store"
import { gerarExcelReforma, type OpcoesGeracao } from "@/lib/reforma-excel/gerar-excel-reforma"
import { parseBaseIbsCbsCustomizada } from "@/lib/reforma-base-ibs-cbs-custom"
import { defaultPremissasReforma } from "@/components/reforma/StepPremissasReforma"
import { defaultLegislacao } from "@/components/reforma/StepLegislacaoIA"
import ExportarPdfDialog, { type DadosPesadosPdf } from "./ExportarPdfDialog"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"
import type { EmpresaReformaResumo } from "./EmpresaCard"

// Dialog de exportação rápida, aberto direto do card da listagem: mostra um resumo do estudo
// salvo NESTE navegador (IndexedDB) e gera os dois Exceis (completo e do cliente) sem precisar
// reabrir o wizard. Premissas/legislação/nome do projeto/logo vêm do banco (parametrosExtra);
// as linhas de EFD vêm do IndexedDB — se não existirem aqui (outro navegador), orienta a abrir
// o projeto para reimportar.

interface Props {
  empresa: EmpresaReformaResumo
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function StatCard({ icon: Icon, valor, rotulo }: { icon: React.ElementType; valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-3 py-2.5 flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{valor}</p>
        <p className="text-[11px] text-muted-foreground leading-tight truncate">{rotulo}</p>
      </div>
    </div>
  )
}

export default function ExportarProjetoDialog({ empresa, open, onOpenChange }: Props) {
  const [carregando, setCarregando] = useState(true)
  const [projeto, setProjeto] = useState<ProjetoWizardSalvo | null>(null)
  const [gerando, setGerando] = useState<null | "completo" | "cliente">(null)
  const [progresso, setProgresso] = useState<{ pct: number; etapa: string } | null>(null)
  const [pdfAberto, setPdfAberto] = useState(false)
  // textos do PDF salvos nesta sessão do dialog — mantém o pré-preenchimento atualizado sem
  // esperar a listagem refazer o fetch
  const [textosPdf, setTextosPdf] = useState<{ pdfLegislacoes?: string; pdfConsideracoes?: string }>({})

  useEffect(() => {
    if (!open) return
    setCarregando(true)
    carregarProjetoWizard(empresa.id)
      .then((p) => setProjeto(p && p.saidasEfd.arquivos.length > 0 ? p : null))
      .catch(() => setProjeto(null))
      .finally(() => setCarregando(false))
  }, [open, empresa.id])

  const extra = empresa.parametrosExtra ?? {}
  const nomeProjeto = extra.nomeProjeto?.trim()
  const totalSaidas = projeto?.saidasEfd.arquivos.reduce((s, a) => s + a.linhas.length, 0) ?? 0
  const totalEntradas = projeto?.entradasEfd.arquivos.reduce((s, a) => s + a.linhas.length, 0) ?? 0
  const totalFornecedores = projeto ? Object.keys(projeto.entradasEfd.classificacoes).length : 0

  const resolverBaseIbsCbs = async (p: ProjetoWizardSalvo): Promise<LinhaBaseIbsCbs[]> => {
    if (p.baseNcm.usarPadrao || !p.baseNcm.arquivoCustomBuffer) {
      const res = await fetch("/api/reforma-tributaria/base-ibs-cbs")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar a base padrão de NCM")
      return json.linhas
    }
    return parseBaseIbsCbsCustomizada(p.baseNcm.arquivoCustomBuffer)
  }

  const dadosEmpresa = (): EmpresaData => ({
    cnpj: empresa.cnpj,
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia ?? "",
    regime: empresa.regime,
    simplesNacional: empresa.simplesNacional,
    uf: empresa.uf,
    municipio: empresa.municipio ?? "",
    cnaePrincipal: empresa.cnaePrincipal ?? "",
    cnaePrincipalCodigo: extra.cnaePrincipalCodigo ?? "",
    cnaesSecundarios: extra.cnaesSecundarios ?? [],
    faturamento: 0,
    estabelecimentosAdicionais: extra.estabelecimentosAdicionais ?? [],
    logoDataUrl: extra.logoDataUrl ?? null,
  })

  // dados pesados para o PDF (mesma resolução de base NCM do Excel)
  const obterDadosPdf = async (): Promise<DadosPesadosPdf> => {
    if (!projeto) throw new Error("Dados do estudo não estão neste navegador")
    return {
      linhasSaidas: projeto.saidasEfd.arquivos.flatMap((a) => a.linhas),
      linhasEntradas: projeto.entradasEfd.arquivos.flatMap((a) => a.linhas),
      classificacoes: projeto.entradasEfd.classificacoes,
      baseIbsCbs: await resolverBaseIbsCbs(projeto),
    }
  }

  const exportar = async (modo: "completo" | "cliente") => {
    if (!projeto) return
    setGerando(modo)
    setProgresso({ pct: 0, etapa: "Carregando base de NCM..." })
    try {
      const baseIbsCbs = await resolverBaseIbsCbs(projeto)
      const opcoes: OpcoesGeracao | undefined = modo === "cliente" ? { modoCliente: true } : undefined
      await gerarExcelReforma(
        {
          empresa: dadosEmpresa(),
          premissasReforma: extra.premissasReforma ?? defaultPremissasReforma(),
          legislacao: extra.legislacao ?? defaultLegislacao(),
          linhasSaidas: projeto.saidasEfd.arquivos.flatMap((a) => a.linhas),
          baseIbsCbs,
          linhasEntradas: projeto.entradasEfd.arquivos.flatMap((a) => a.linhas),
          classificacoesFornecedores: projeto.entradasEfd.classificacoes,
          nomeProjeto: nomeProjeto ?? undefined,
        },
        (pct, etapa) => setProgresso({ pct, etapa }),
        opcoes
      )
      toast.success(modo === "cliente" ? "Excel do cliente gerado" : "Excel completo gerado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar Excel")
    } finally {
      setGerando(null)
      setProgresso(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !gerando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            {nomeProjeto ?? `Reforma Tributária - ${empresa.razaoSocial}`}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs">{formatCNPJ(empresa.cnpj)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs">{empresa.uf}</span>
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !projeto ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-sm text-foreground font-medium">
              Os dados do estudo não estão salvos neste navegador
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Os arquivos de EFD ficam guardados localmente no navegador em que o estudo foi
              feito. Abra o projeto para importá-los e gerar o Excel.
            </p>
            <Link href={`/dashboard/reforma-tributaria/${empresa.id}?edit=true`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground mt-1">
                <FolderOpen className="h-4 w-4 mr-2" /> Abrir projeto
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={ArrowUpFromLine} valor={totalSaidas.toLocaleString("pt-BR")} rotulo="itens de saída (EFD Contribuições)" />
              <StatCard icon={ArrowDownToLine} valor={totalEntradas.toLocaleString("pt-BR")} rotulo="itens de entrada (EFD ICMS/IPI)" />
              <StatCard icon={Users} valor={totalFornecedores.toLocaleString("pt-BR")} rotulo="fornecedores classificados" />
              <StatCard
                icon={CalendarClock}
                valor={new Date(projeto.atualizadoEm).toLocaleDateString("pt-BR")}
                rotulo="última atualização"
              />
            </div>

            {gerando && progresso ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium truncate">{progresso.etapa}</span>
                  <span className="text-primary font-semibold shrink-0 ml-2">{progresso.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-150 ease-out" style={{ width: `${progresso.pct}%` }} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => exportar("completo")}
                  disabled={gerando !== null}
                  className="w-full group rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <FileDown className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Excel completo</p>
                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/60">
                      14 abas com todas as fórmulas — uso interno
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => exportar("cliente")}
                  disabled={gerando !== null}
                  className="w-full group rounded-xl border border-border bg-muted hover:bg-accent transition-colors px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Excel do cliente</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sem fórmulas, só valores — pronto para enviar ao cliente
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setPdfAberto(true)}
                  disabled={gerando !== null}
                  className="w-full group rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors px-4 py-3 flex items-center gap-3 text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-300">PDF executivo</p>
                    <p className="text-[11px] text-rose-700/70 dark:text-rose-400/60">
                      Empresa, premissas, legislações, quadro comparativo e considerações
                    </p>
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Gerado com premissas e legislação salvas
              </p>
              <Link
                href={`/dashboard/reforma-tributaria/${empresa.id}?edit=true`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Editar projeto →
              </Link>
            </div>
          </div>
        )}
      </DialogContent>

      <ExportarPdfDialog
        open={pdfAberto}
        onOpenChange={setPdfAberto}
        empresaId={empresa.id}
        empresa={dadosEmpresa()}
        nomeProjeto={nomeProjeto}
        premissas={extra.premissasReforma ?? defaultPremissasReforma()}
        parametrosExtraAtual={{ ...extra, ...textosPdf }}
        textoLegislacoesInicial={extra.legislacao?.notaManual}
        obterDados={obterDadosPdf}
        onTextosSalvos={setTextosPdf}
      />
    </Dialog>
  )
}
