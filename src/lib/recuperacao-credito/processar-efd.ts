import db from "@/lib/db"
import { processarArquivosEfd } from "@/lib/efd-icms-parser"
import { parseEntradasEfdIcmsIpi } from "@/lib/efd-icms-ipi-entradas-parser"
import { detectarTipoEfd, processarArquivosEfdContribuicoes } from "@/lib/efd-contribuicoes-parser"
import { processarArquivosEcf, temBlocoPresumido } from "@/lib/ecf-parser"
import { detectarDctf, processarArquivosDctf } from "@/lib/dctf-parser"
import { detectarEcd, processarArquivosEcd } from "@/lib/ecd-parser"

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "")
}

export type ResultadoProcessarEfd =
  | { ok: true; competencia: string; tipo: "ICMS_IPI" | "CONTRIBUICOES" | "ECF" | "DCTF" | "ECD" }
  | { ok: false; motivo: string }

// Dispatch por-arquivo de um EFD/ECF/.dec — mesma lógica de detecção/parsing/persistência que
// vivia direto em src/app/api/recuperacao-credito/efd/upload/route.ts, extraída sem alteração de
// regra pra ser reaproveitada tanto pelo upload direto (FormData, ainda usado como fallback)
// quanto pelo fluxo de upload via Storage (processar-storage) — ver docs/recuperacao-credito.md.
// Detecta automaticamente se o arquivo é EFD ICMS/IPI, EFD Contribuições (PIS/COFINS), ECF
// (IRPJ/CSLL) ou DCTF (.dec) pelo CONTEÚDO. EFDs/DCTF: 1 arquivo = 1 competência (mês); ECF: 1
// arquivo = 1 ano-calendário.
export async function processarArquivoEfdRecuperacaoCredito(
  file: File,
  projeto: { id: string },
  cliente: { cnpj: string }
): Promise<ResultadoProcessarEfd> {
  const nomeLower = file.name.toLowerCase()
  if (!nomeLower.endsWith(".txt") && !nomeLower.endsWith(".dec")) {
    return { ok: false, motivo: "Apenas arquivos .txt (EFD/ECF) ou .dec (DCTF) são aceitos" }
  }

  const conteudo = await file.text()

  if (detectarEcd(conteudo)) {
    const [dados] = await processarArquivosEcd([file])
    if (!dados) return { ok: false, motivo: "Não foi possível ler o plano de contas (I050) da ECD" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ da ECD (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    await db.declaracaoEcd.upsert({
      where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.anoCalendario } },
      create: { projetoId: projeto.id, competencia: dados.anoCalendario, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
      update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    })
    return { ok: true, competencia: dados.anoCalendario, tipo: "ECD" }
  }

  if (detectarDctf(conteudo)) {
    const [dados] = await processarArquivosDctf([file])
    if (!dados) return { ok: false, motivo: "Não foi possível ler os débitos da DCTF (.dec)" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ da DCTF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    await db.declaracaoDctf.upsert({
      where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
      create: { projetoId: projeto.id, competencia: dados.competencia, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
      update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    })
    return { ok: true, competencia: dados.competencia, tipo: "DCTF" }
  }

  const tipo = detectarTipoEfd(conteudo)
  if (!tipo) {
    return { ok: false, motivo: "Não foi possível identificar o tipo do arquivo (EFD ICMS/IPI, EFD Contribuições, ECF ou DCTF)" }
  }

  if (tipo === "ECF") {
    const [dados] = await processarArquivosEcf([file])
    if (!dados) return { ok: false, motivo: "Não foi possível ler o registro 0000 (cabeçalho) da ECF" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ da ECF (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }
    if (!temBlocoPresumido(dados)) {
      return {
        ok: false,
        motivo: "ECF sem apuração de Lucro Presumido (bloco P) — a apuração via bloco N (Lucro Real) ainda não é suportada",
      }
    }
    await db.declaracaoEcf.upsert({
      where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.anoCalendario } },
      create: { projetoId: projeto.id, competencia: dados.anoCalendario, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
      update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    })
    return { ok: true, competencia: dados.anoCalendario, tipo: "ECF" }
  }

  if (tipo === "ICMS_IPI") {
    const [dados] = await processarArquivosEfd([file])
    if (!dados) return { ok: false, motivo: "Não foi possível ler o registro 0000 (cabeçalho) do EFD" }
    if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
      return { ok: false, motivo: `CNPJ do EFD (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
    }

    // Linhas item a item (C100/C170) pra aba "Entradas" — mesmo parser usado na Reforma
    // Tributária (src/lib/efd-icms-ipi-entradas-parser.ts), reaproveitado aqui sem alteração.
    dados.linhasEntrada = parseEntradasEfdIcmsIpi(conteudo).linhas

    await db.declaracaoEfdIcmsIpi.upsert({
      where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
      create: { projetoId: projeto.id, competencia: dados.competencia, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
      update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    })
    return { ok: true, competencia: dados.competencia, tipo: "ICMS_IPI" }
  }

  const [dados] = await processarArquivosEfdContribuicoes([file])
  if (!dados) return { ok: false, motivo: "Não foi possível ler o registro 0000 (cabeçalho) do EFD" }
  if (somenteDigitos(dados.cnpj) !== somenteDigitos(cliente.cnpj)) {
    return { ok: false, motivo: `CNPJ do EFD (${dados.cnpj}) não corresponde ao cliente selecionado (${cliente.cnpj})` }
  }
  await db.declaracaoEfdContribuicoes.upsert({
    where: { projetoId_competencia: { projetoId: projeto.id, competencia: dados.competencia } },
    create: { projetoId: projeto.id, competencia: dados.competencia, cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
    update: { cnpj: dados.cnpj, arquivoNome: file.name, dados: dados as unknown as object },
  })
  return { ok: true, competencia: dados.competencia, tipo: "CONTRIBUICOES" }
}
