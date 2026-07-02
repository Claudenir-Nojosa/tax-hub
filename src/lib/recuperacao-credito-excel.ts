import ExcelJS from "exceljs"
import { montarAbaIcms, type DeclaracaoEfdRegistro } from "./efd-icms-excel"
import { montarAbasPisCofins, type DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import { montarAbaComprovantePagamento } from "./comprovante-pagamento-excel"
import type { DadosComprovantePagamento } from "./comprovante-pagamento-parser"
import { montarAbasEcf, type DeclaracaoEcfRegistro } from "./ecf-excel"
import { montarAbasDctf, type DeclaracaoDctfWebRegistro, type DeclaracaoDctfRegistro } from "./dctf-excel"
import { montarAbaChecklist } from "./checklist-excel"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

// Monta um único Excel com uma aba por tipo de declaração fiscal presente no projeto (ICMS/IPI,
// PIS/COFINS e/ou Comprovante de Pagamentos) — é o que a UI de Recuperação de Crédito chama
// quando o usuário clica em "Baixar Excel" na seção de declarações fiscais, pra nunca gerar
// vários arquivos separados quando o mesmo projeto tem mais de um tipo importado. PGDAS (Simples
// Nacional) fica de fora de propósito — tem seu próprio botão/exportador, ver
// src/lib/pgdas/export-pgdas-excel.ts.
export async function exportarDeclaracaoFiscalExcel(
  nomeCliente: string,
  dados: {
    icms?: DeclaracaoEfdRegistro[]
    pisCofins?: DeclaracaoEfdContribuicoesRegistro[]
    comprovantes?: DadosComprovantePagamento[]
    ecf?: DeclaracaoEcfRegistro[]
    dctfWeb?: DeclaracaoDctfWebRegistro[]
    dctf?: DeclaracaoDctfRegistro[]
  }
): Promise<void> {
  const temIcms = (dados.icms?.length ?? 0) > 0
  const temPisCofins = (dados.pisCofins?.length ?? 0) > 0
  const temComprovantes = (dados.comprovantes?.length ?? 0) > 0
  const temEcf = (dados.ecf?.length ?? 0) > 0
  const temDctfWeb = (dados.dctfWeb?.length ?? 0) > 0
  const temDctf = (dados.dctf?.length ?? 0) > 0

  if (!temIcms && !temPisCofins && !temComprovantes && !temEcf && !temDctfWeb && !temDctf) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()

  if (temIcms) await montarAbaIcms(wb, dados.icms!, nomeCliente)
  if (temPisCofins) await montarAbasPisCofins(wb, dados.pisCofins!, nomeCliente)
  if (temEcf) await montarAbasEcf(wb, dados.ecf!, nomeCliente)
  if (temDctfWeb || temDctf) await montarAbasDctf(wb, { dctfWeb: dados.dctfWeb, dctf: dados.dctf })
  if (temComprovantes) await montarAbaComprovantePagamento(wb, dados.comprovantes!, nomeCliente)
  await montarAbaChecklist(wb, nomeCliente)

  const contextos: string[] = []
  if (temIcms) contextos.push("ICMS e IPI")
  if (temPisCofins) contextos.push("PIS e COFINS")
  if (temEcf) contextos.push("IRPJ e CSLL")
  if (temDctfWeb || temDctf) contextos.push("DCTF e DCTFWeb")
  if (temComprovantes) contextos.push("Comprovante de Pagamentos")
  const contexto = contextos.join(", ")

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizarNomeArquivo(`Diagnóstico Tributário - ${contexto} - ${nomeCliente}`)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
