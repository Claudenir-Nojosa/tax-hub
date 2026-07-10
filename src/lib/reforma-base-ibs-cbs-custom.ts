import type { LinhaBaseIbsCbs } from "./reforma-base-ibs-cbs"

// Lê uma base de NCM customizada (upload do Passo 4 do wizard, StepBaseNcm) — aceita um .xlsx com
// as mesmas colunas da base padrão (por nome de cabeçalho, não por posição fixa, pra tolerar
// pequenas variações de coluna extra/ordem). Mesmo padrão de leitura client-side de
// src/lib/consulta-simples-nacional.ts (xlsx + sheet_to_json).

const COLUNAS: Record<keyof LinhaBaseIbsCbs, string[]> = {
  anexo: ["anexo"],
  item: ["item"],
  descricaoItem: ["descrição item", "descricao item"],
  dataInicial: ["data inicial"],
  dataFinal: ["data final"],
  codigoNcm: ["código ncm", "codigo ncm", "ncm"],
  codigoNbs: ["código nbs", "codigo nbs", "nbs"],
  aliquotaReducao: ["alíquota de redução", "aliquota de reducao"],
  descricaoAliquota: ["descrição alíquota", "descricao aliquota"],
  cstIbsCbs: ["cst ibs/cbs", "cst ibs cbs"],
  codigoClassificacaoTributaria: ["código classificação tributária", "codigo classificacao tributaria"],
  nomeCodigoClassificacaoTributaria: ["nome código classificação tributária", "nome codigo classificacao tributaria"],
  tipoAliquota: ["tipo alíquota", "tipo aliquota"],
}

function normalizar(s: string): string {
  return s.toLowerCase().trim()
}

export async function parseBaseIbsCbsCustomizada(buffer: ArrayBuffer): Promise<LinhaBaseIbsCbs[]> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][]
  if (linhas.length < 2) return []

  const cabecalho = linhas[0].map((c) => normalizar(String(c ?? "")))
  const indicePorCampo = {} as Record<keyof LinhaBaseIbsCbs, number>
  for (const campo of Object.keys(COLUNAS) as (keyof LinhaBaseIbsCbs)[]) {
    const idx = cabecalho.findIndex((h) => COLUNAS[campo].some((alvo) => h.includes(alvo)))
    indicePorCampo[campo] = idx
  }

  const pegar = (row: (string | number)[], campo: keyof LinhaBaseIbsCbs): string => {
    const idx = indicePorCampo[campo]
    return idx === -1 ? "" : String(row[idx] ?? "")
  }

  return linhas.slice(1).map((row) => ({
    anexo: pegar(row, "anexo"),
    item: pegar(row, "item"),
    descricaoItem: pegar(row, "descricaoItem"),
    dataInicial: pegar(row, "dataInicial"),
    dataFinal: pegar(row, "dataFinal"),
    codigoNcm: pegar(row, "codigoNcm"),
    codigoNbs: pegar(row, "codigoNbs"),
    aliquotaReducao: Number(pegar(row, "aliquotaReducao")) || 0,
    descricaoAliquota: pegar(row, "descricaoAliquota"),
    cstIbsCbs: pegar(row, "cstIbsCbs"),
    codigoClassificacaoTributaria: pegar(row, "codigoClassificacaoTributaria"),
    nomeCodigoClassificacaoTributaria: pegar(row, "nomeCodigoClassificacaoTributaria"),
    tipoAliquota: pegar(row, "tipoAliquota"),
  }))
}
