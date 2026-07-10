import fs from "fs"
import path from "path"

// Base padrão de NCM/Anexo/redução (aba "Base IBS-CBS" do Excel-modelo, 4.524 linhas) — extraída
// uma única vez do arquivo de referência e versionada como asset do projeto (ver
// docs/reforma-tributaria-v2.md, Fase 2/Passo 4). Usada quando o cliente não sobe uma base
// própria no wizard.

export interface LinhaBaseIbsCbs {
  anexo: string
  item: string
  descricaoItem: string
  dataInicial: string
  dataFinal: string
  codigoNcm: string
  codigoNbs: string
  aliquotaReducao: number
  descricaoAliquota: string
  cstIbsCbs: string
  codigoClassificacaoTributaria: string
  nomeCodigoClassificacaoTributaria: string
  tipoAliquota: string
}

let cache: LinhaBaseIbsCbs[] | null = null

export function carregarBaseIbsCbsPadrao(): LinhaBaseIbsCbs[] {
  if (cache) return cache
  const raw = fs.readFileSync(
    path.join(process.cwd(), "src", "data", "reforma-base-ibs-cbs", "base.json"),
    "utf-8"
  )
  const rows = JSON.parse(raw) as (string | number | null)[][]
  // rows[0] = título "Base IBS/CBS", rows[1] = cabeçalho — dados a partir de rows[2]
  cache = rows.slice(2).map((r) => ({
    anexo: String(r[1] ?? ""),
    item: String(r[2] ?? ""),
    descricaoItem: String(r[3] ?? ""),
    dataInicial: String(r[4] ?? ""),
    dataFinal: String(r[5] ?? ""),
    codigoNcm: String(r[6] ?? ""),
    codigoNbs: String(r[7] ?? ""),
    aliquotaReducao: Number(r[8] ?? 0),
    descricaoAliquota: String(r[9] ?? ""),
    cstIbsCbs: String(r[10] ?? ""),
    codigoClassificacaoTributaria: String(r[11] ?? ""),
    nomeCodigoClassificacaoTributaria: String(r[12] ?? ""),
    tipoAliquota: String(r[13] ?? ""),
  }))
  return cache
}
