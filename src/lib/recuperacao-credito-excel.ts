import ExcelJS from "exceljs"
import { montarAbaIcms, type DeclaracaoEfdRegistro } from "./efd-icms-excel"
import { montarAbasPisCofins, type DeclaracaoEfdContribuicoesRegistro } from "./efd-contribuicoes-excel"
import { montarAbaChecklist } from "./checklist-excel"

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "").trim()
}

// Monta um único Excel com uma aba por tipo de declaração fiscal presente no projeto (ICMS/IPI
// e/ou PIS/COFINS) — é o que a UI de Recuperação de Crédito chama quando o usuário clica em
// "Baixar Excel" na seção de declarações fiscais, pra nunca gerar dois arquivos separados
// quando o mesmo projeto tem os dois tipos importados.
export async function exportarDeclaracaoFiscalExcel(
  nomeCliente: string,
  dados: {
    icms?: DeclaracaoEfdRegistro[]
    pisCofins?: DeclaracaoEfdContribuicoesRegistro[]
  }
): Promise<void> {
  const temIcms = (dados.icms?.length ?? 0) > 0
  const temPisCofins = (dados.pisCofins?.length ?? 0) > 0

  if (!temIcms && !temPisCofins) return

  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Recuperação de Crédito"
  wb.created = new Date()

  if (temIcms) await montarAbaIcms(wb, dados.icms!, nomeCliente)
  if (temPisCofins) await montarAbasPisCofins(wb, dados.pisCofins!, nomeCliente)
  await montarAbaChecklist(wb, nomeCliente)

  const contextos: string[] = []
  if (temIcms) contextos.push("ICMS e IPI")
  if (temPisCofins) contextos.push("PIS e COFINS")
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
