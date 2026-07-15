import ExcelJS from "exceljs"
import JSZip from "jszip"
import { montarAbaPremissas, montarAbaLegislacoes } from "./premissas-legislacoes"
import { montarAbaAnoCabecalho, gerarXmlDadosAno, extrairEstilosDasColunas, ABAS_ANO, LINHA_DADOS_INICIO_ANO, letraColunaAno } from "./anos"
import { montarAbaValorTotalNfe } from "./valor-total-nfe"
import { montarAbaQuadroComparativo } from "./quadro-comparativo"
import { montarAbaBaseIbsCbs } from "./base-ibs-cbs"
import { montarAbaEntradasEfd } from "./entradas-efd"
import { montarAbaAnaliseFornecedores } from "./analise-fornecedores"
import { yieldToEventLoop } from "./yield"
import type { PremissasReformaData } from "@/components/reforma/StepPremissasReforma"
import type { LegislacaoData } from "@/components/reforma/StepLegislacaoIA"
import type { EmpresaData } from "@/components/reforma/Step1Empresa"
import type { LinhaSaidaEfd } from "@/lib/efd-contribuicoes-saidas-parser"
import type { LinhaEntradaEfd } from "@/lib/efd-icms-ipi-entradas-parser"
import type { LinhaBaseIbsCbs } from "@/lib/reforma-base-ibs-cbs"
import type { ResultadoConsultaCnpj } from "@/lib/consulta-simples-nacional"

// Orquestrador do Excel de entrega da Reforma Tributária — Premissas, Legislações, as 7 abas de
// ano (2026-2033), Valor Total NF-e, Quadro Comparativo, Base IBS-CBS, Entradas EFD ICMS IPI e
// Análise Fornecedores (ver docs/reforma-tributaria-v2.md).
//
// GERAÇÃO HÍBRIDA (Fase 8, versão navegador): o ExcelJS monta todas as abas, mas nas 7 abas de
// ano só entram os CABEÇALHOS (linhas 1-7). As ~200 mil linhas de dados são geradas como XML de
// planilha puro (gerarXmlDadosAno) e injetadas no .xlsx com o jszip, trocando o conteúdo do
// <sheetData> de cada aba de ano. Sem isso, o modelo de documento do ExcelJS criava ~14 milhões
// de objetos de célula e o Chrome estourava memória ("Out of Memory") com bases grandes. O
// WorkbookWriter streaming do ExcelJS não existe no bundle de browser, daí o pós-processamento.

export interface DadosGeracaoExcel {
  empresa: EmpresaData
  premissasReforma: PremissasReformaData
  legislacao: LegislacaoData
  linhasSaidas: LinhaSaidaEfd[]
  baseIbsCbs: LinhaBaseIbsCbs[]
  linhasEntradas: LinhaEntradaEfd[]
  classificacoesFornecedores: Record<string, ResultadoConsultaCnpj>
  // Nome escolhido pelo usuário na Revisão — vira o nome do arquivo .xlsx (a versão do cliente
  // ganha o sufixo " (Cliente)"). Em branco, cai no padrão "Reforma Tributária - <razão social>".
  nomeProjeto?: string
}

export type ProgressoGeracao = (percentual: number, etapa: string) => void

export interface OpcoesGeracao {
  // Versão pra ENVIAR AO CLIENTE: só as abas Premissas, Legislações, anos (2026-2033), Valor
  // Total NF-e, Quadro Comparativo e Entradas - EFD ICMS IPI; TODAS as fórmulas viram valores
  // sólidos (pra não expor a metodologia de cálculo), EXCETO nas abas Quadro Comparativo e
  // Valor Total NF-e — os dropdowns delas (Empresa/Documento/Ano) precisam continuar funcionais,
  // e isso exige manter os SUMIFS/VLOOKUP que reagem à seleção (eles só somam colunas visíveis
  // das outras abas, não revelam a cadeia de cálculo).
  modoCliente?: boolean
}

// Abas que NÃO vão pro Excel do cliente
const ABAS_REMOVER_CLIENTE = ["Base IBS-CBS", "Análise Fornecedores"]

// ---------------------------------------------------------------------------------------------
// Logo em todas as abas: a do cliente (enviada no Passo 1) ou, sem ela, a padrão do TaxHub.
// Âncora por aba (coluna/linha 0-based do canto superior esquerdo) — o padrão A1 serve pras abas
// largas (anos, Entradas, Quadro), mas as abas com título/filtros no topo-esquerdo ganham uma
// âncora à direita do conteúdo pra logo não cobrir nada.
const LOGO_TAXHUB_URL = "/icons/taxhub_logo_principal_claro_transparente.png"
const ANCORA_LOGO: Record<string, { col: number; row: number }> = {
  "Premissas": { col: 12, row: 0 },        // depois das colunas de ano (C..K)
  "Legislações": { col: 3, row: 0 },       // depois da coluna C (largura 110)
  "Valor Total NF-e": { col: 9, row: 0 },  // depois do bloco B..H
  "Base IBS-CBS": { col: 16, row: 0 },     // depois da tabela C..O
}

// Dimensões de PNG (IHDR) ou JPEG (marcador SOF) direto dos bytes — funciona no navegador e no
// Node, sem depender de Image()/DOM
function dimensoesDaImagem(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset)
    return { w: dv.getUint32(16), h: dv.getUint32(20) }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue }
      const marker = bytes[i + 1]
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const dv = new DataView(bytes.buffer, bytes.byteOffset)
        return { w: dv.getUint16(i + 7), h: dv.getUint16(i + 5) }
      }
      i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3])
    }
  }
  return null
}

function bytesParaBase64(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function obterLogo(logoDataUrl?: string | null): Promise<{ base64: string; extension: "png" | "jpeg"; width: number; height: number } | null> {
  let bytes: Uint8Array
  let extension: "png" | "jpeg"
  let base64: string
  if (logoDataUrl) {
    const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(logoDataUrl)
    if (!m) return null
    extension = m[1] === "png" ? "png" : "jpeg"
    base64 = m[2]
    const bin = atob(base64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } else {
    const res = await fetch(LOGO_TAXHUB_URL)
    if (!res.ok) return null
    bytes = new Uint8Array(await res.arrayBuffer())
    extension = "png"
    base64 = bytesParaBase64(bytes)
  }
  // altura alvo ~50px (cabe nas linhas 1-3 sem empurrar nada); largura pela proporção, com teto
  const dim = dimensoesDaImagem(bytes)
  const proporcao = dim && dim.h > 0 ? dim.w / dim.h : 1.9
  let height = 50
  let width = Math.round(proporcao * height)
  if (width > 150) { width = 150; height = Math.round(150 / proporcao) }
  return { base64, extension, width, height }
}

// Insere a logo (do cliente ou a padrão do TaxHub) em todas as abas do workbook.
// (exportada só pra validação em script — o fluxo real passa por gerarExcelReforma)
export async function adicionarLogoNasAbas(wb: ExcelJS.Workbook, logoDataUrl?: string | null): Promise<void> {
  const logo = await obterLogo(logoDataUrl)
  if (!logo) return
  const imgId = wb.addImage({ base64: logo.base64, extension: logo.extension })
  for (const ws of wb.worksheets) {
    const anc = ANCORA_LOGO[ws.name] ?? { col: 0, row: 0 }
    ws.addImage(imgId, { tl: { col: anc.col + 0.15, row: anc.row + 0.15 }, ext: { width: logo.width, height: logo.height } })
  }
}
// Abas que mantêm as fórmulas no modo cliente (dropdowns funcionais)
const ABAS_COM_FORMULA_CLIENTE = new Set(["Quadro Comparativo", "Valor Total NF-e"])

// Remove as fórmulas de um XML de worksheet mantendo os valores em cache: <f>...</f> some e o
// <v> (ou <is>) fica. Fórmula sem cache (o ExcelJS descarta resultado 0) vira <v>0</v> — senão a
// célula ficaria vazia onde deveria mostrar "R$ -".
function removerFormulasDoXml(xml: string): string {
  return xml.replace(
    /<c ([^>]*?)>(?:<f[^>]*>[^<]*<\/f>|<f[^>]*\/>)((?:<v>[^<]*<\/v>)|(?:<is>[\s\S]*?<\/is>))?<\/c>/g,
    (_m, attrs: string, resto: string | undefined) => {
      if (resto) return `<c ${attrs}>${resto}</c>`
      if (/t="str"/.test(attrs)) return `<c ${attrs.replace(/\s*t="str"/, "")}/>`
      return `<c ${attrs}><v>0</v></c>`
    }
  )
}

// Transforma o zip final na versão do cliente: tira fórmulas (exceto Quadro/Valor Total) e
// remove as abas internas (Base IBS-CBS, Análise Fornecedores) com todas as suas partes.
// (exportada só pra validação em script — o fluxo real passa por gerarExcelReforma)
export async function transformarParaCliente(zip: JSZip, caminhos: Map<string, string>): Promise<void> {
  // 1) fórmulas → valores nas abas mantidas (menos Quadro/Valor Total)
  for (const [nome, caminho] of caminhos) {
    if (ABAS_REMOVER_CLIENTE.includes(nome) || ABAS_COM_FORMULA_CLIENTE.has(nome)) continue
    const arquivo = zip.file(caminho)
    if (!arquivo) continue
    const xml = await arquivo.async("string")
    zip.file(caminho, new TextEncoder().encode(removerFormulasDoXml(xml)))
  }

  // 2) remove as abas internas: entrada no workbook.xml, relationship, arquivos da worksheet e
  // partes dependentes (rels da sheet → drawing → rels do drawing → imagens)
  let workbookXml = await zip.file("xl/workbook.xml")!.async("string")
  let relsXml = await zip.file("xl/_rels/workbook.xml.rels")!.async("string")
  let contentTypes = await zip.file("[Content_Types].xml")!.async("string")

  // Mídias (xl/media/*) referenciadas pelos drawings das abas removidas NÃO podem ser apagadas
  // às cegas: a LOGO é uma mídia única compartilhada pelos drawings de TODAS as abas — apagar
  // junto quebraria as abas mantidas. Elas viram candidatas e só saem se, no fim, nenhum drawing
  // remanescente as referenciar (o PNG do gráfico da Análise Fornecedores, p.ex., sai).
  const midiaCandidata = new Set<string>()

  for (const nome of ABAS_REMOVER_CLIENTE) {
    const m = new RegExp(`<sheet[^>]*name="${nome}"[^>]*r:id="(rId\\d+)"[^>]*/>`).exec(workbookXml)
    if (!m) continue
    const rid = m[1]
    workbookXml = workbookXml.replace(m[0], "")
    const rel = new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*/>`).exec(relsXml)
    if (rel) relsXml = relsXml.replace(rel[0], "")
    const caminho = caminhos.get(nome)
    if (!caminho) continue

    const paraRemover = [caminho]
    const relsSheet = caminho.replace("worksheets/", "worksheets/_rels/") + ".rels"
    const relsSheetArq = zip.file(relsSheet)
    if (relsSheetArq) {
      const relsSheetXml = await relsSheetArq.async("string")
      paraRemover.push(relsSheet)
      for (const t of relsSheetXml.matchAll(/Target="\.\.\/([^"]+)"/g)) {
        const alvo = `xl/${t[1]}`
        paraRemover.push(alvo)
        const relsAlvo = alvo.replace(/([^/]+)$/, "_rels/$1.rels")
        const relsAlvoArq = zip.file(relsAlvo)
        if (relsAlvoArq) {
          const relsAlvoXml = await relsAlvoArq.async("string")
          paraRemover.push(relsAlvo)
          for (const t2 of relsAlvoXml.matchAll(/Target="\.\.\/([^"]+)"/g)) {
            const alvo2 = `xl/${t2[1]}`
            if (alvo2.startsWith("xl/media/")) midiaCandidata.add(alvo2)
            else paraRemover.push(alvo2)
          }
        }
      }
    }
    for (const arq of paraRemover) {
      zip.remove(arq)
      contentTypes = contentTypes.replace(new RegExp(`<Override[^>]*PartName="/${arq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`), "")
    }
  }

  // remove só as mídias que nenhum drawing remanescente referencia
  if (midiaCandidata.size > 0) {
    const referenciadas = new Set<string>()
    const relsDeDrawings = Object.keys(zip.files).filter((p) => /^xl\/drawings\/_rels\/.+\.rels$/.test(p))
    for (const p of relsDeDrawings) {
      const xmlRels = await zip.file(p)!.async("string")
      for (const r of xmlRels.matchAll(/Target="\.\.\/([^"]+)"/g)) referenciadas.add(`xl/${r[1]}`)
    }
    for (const midia of midiaCandidata) {
      if (referenciadas.has(midia)) continue
      zip.remove(midia)
      contentTypes = contentTypes.replace(new RegExp(`<Override[^>]*PartName="/${midia.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/>`), "")
    }
  }
  // activeTab pode apontar pra uma aba removida — remove o atributo por segurança
  workbookXml = workbookXml.replace(/\s*activeTab="\d+"/, "")

  zip.file("xl/workbook.xml", new TextEncoder().encode(workbookXml))
  zip.file("xl/_rels/workbook.xml.rels", new TextEncoder().encode(relsXml))
  zip.file("[Content_Types].xml", new TextEncoder().encode(contentTypes))
}

// Localiza o arquivo XML de cada aba dentro do .xlsx (nome da aba → rId → caminho da worksheet)
export async function mapearCaminhosDasAbas(zip: JSZip): Promise<Map<string, string>> {
  const workbookXml = await zip.file("xl/workbook.xml")!.async("string")
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")!.async("string")
  const caminhoPorRid = new Map<string, string>()
  for (const m of relsXml.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    caminhoPorRid.set(m[1], `xl/${m[2].replace(/^\//, "").replace(/^xl\//, "")}`)
  }
  const caminhoPorNome = new Map<string, string>()
  for (const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    const caminho = caminhoPorRid.get(m[2])
    if (caminho) caminhoPorNome.set(m[1], caminho)
  }
  return caminhoPorNome
}

export async function gerarExcelReforma(dados: DadosGeracaoExcel, onProgress?: ProgressoGeracao, opcoes?: OpcoesGeracao): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Tax Hub — Reforma Tributária"
  wb.created = new Date()
  // recalcula tudo ao abrir no Excel — garante os valores certos mesmo onde o cache foi omitido
  wb.calcProperties.fullCalcOnLoad = true

  // Progresso ponderado: a geração do XML das 7 abas de ano é a parte pesada (cada linha de
  // saída vira 1 linha × 7 abas); montagem das demais abas e a compactação final entram como
  // fatias menores.
  const pesoAnos = Math.max(dados.linhasSaidas.length * ABAS_ANO.length, 1)
  const pesoOutras = Math.max(Math.round(pesoAnos * 0.1), 7)
  const pesoZip = Math.max(Math.round(pesoAnos * 0.1), 7)
  const pesoTotal = pesoAnos + pesoOutras + pesoZip
  let concluido = 0
  const reportar = (etapa: string, incremento: number) => {
    concluido += incremento
    onProgress?.(Math.min(99, Math.round((concluido / pesoTotal) * 100)), etapa)
  }

  montarAbaPremissas(wb, dados.premissasReforma, dados.empresa, dados.linhasSaidas)
  montarAbaLegislacoes(wb, dados.legislacao)
  reportar("Premissas e Legislações", pesoOutras / 6)
  await yieldToEventLoop()

  // cabeçalhos das abas de ano (linhas 1-7 + estilos + subtotais) — os dados entram depois, via XML
  for (const aba of ABAS_ANO) {
    montarAbaAnoCabecalho(wb, aba, dados.linhasSaidas, dados.premissasReforma)
    await yieldToEventLoop()
  }
  reportar("Cabeçalhos das abas de ano", pesoOutras / 6)

  montarAbaValorTotalNfe(wb, dados.empresa, dados.linhasSaidas, dados.premissasReforma)
  reportar("Valor Total NF-e", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaQuadroComparativo(wb, dados.empresa, dados.linhasSaidas, dados.premissasReforma, dados.linhasEntradas, dados.classificacoesFornecedores, dados.baseIbsCbs)
  reportar("Quadro Comparativo", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaBaseIbsCbs(wb, dados.baseIbsCbs)
  reportar("Base IBS-CBS", pesoOutras / 6)
  await yieldToEventLoop()

  montarAbaEntradasEfd(wb, dados.linhasEntradas, dados.classificacoesFornecedores, dados.premissasReforma, dados.baseIbsCbs)
  await yieldToEventLoop()
  await montarAbaAnaliseFornecedores(wb, dados.empresa, dados.linhasEntradas, dados.classificacoesFornecedores)
  reportar("Entradas e Análise Fornecedores", pesoOutras / 6)

  // Logo em todas as abas — a do cliente (Passo 1) ou a padrão do TaxHub. Falha aqui (rede,
  // arquivo inválido) não bloqueia a geração do Excel.
  try {
    await adicionarLogoNasAbas(wb, dados.empresa.logoDataUrl)
  } catch { /* segue sem logo */ }

  const bufferBase = await wb.xlsx.writeBuffer()
  await yieldToEventLoop()

  // Pós-processamento: injeta as linhas de dados (XML) nas 7 abas de ano
  const zip = await JSZip.loadAsync(bufferBase)
  const caminhos = await mapearCaminhosDasAbas(zip)
  const colFim = letraColunaAno("ISS ORIGINAL") // última coluna do layout das abas de ano
  const ultimaLinha = LINHA_DADOS_INICIO_ANO + Math.max(dados.linhasSaidas.length, 1) - 1

  if (dados.linhasSaidas.length > 0) {
    for (const aba of ABAS_ANO) {
      const caminho = caminhos.get(aba.label)
      if (!caminho || !zip.file(caminho)) throw new Error(`Aba "${aba.label}" não encontrada no arquivo gerado`)
      const concluidoAntesDaAba = concluido
      let sheetXml = await zip.file(caminho)!.async("string")
      // ids de estilo das colunas (do <cols> do stub) — carimbados em cada célula gerada, senão
      // o Excel não aplica o formato (PA viraria número serial, calculadas sem formato contábil)
      const estilosColunas = extrairEstilosDasColunas(sheetXml)
      const linhasXml = await gerarXmlDadosAno(aba, dados.linhasSaidas, dados.premissasReforma, estilosColunas, (linhaAtual) => {
        const progressoNaAba = concluidoAntesDaAba + linhaAtual
        onProgress?.(
          Math.min(99, Math.round((progressoNaAba / pesoTotal) * 100)),
          `Aba ${aba.label} (${linhaAtual}/${dados.linhasSaidas.length})`
        )
      })
      concluido = concluidoAntesDaAba + dados.linhasSaidas.length
      sheetXml = sheetXml.replace(/<dimension ref="[^"]*"\s*\/>/, `<dimension ref="A1:${colFim}${ultimaLinha}"/>`)
      sheetXml = sheetXml.replace("</sheetData>", `${linhasXml}</sheetData>`)
      // CRÍTICO: entregar BYTES (não string) ao JSZip. Com strings de ~100MB contendo caracteres
      // multi-byte (ç, õ, "Serviços"...), o JSZip do NAVEGADOR grava tamanhos inconsistentes no
      // zip ("uncompressed data size mismatch") e o Excel abre como corrompido ("Reparado"),
      // travando no reparo. Com TextEncoder o caminho vira binário, idêntico ao do Node — onde o
      // arquivo foi validado abrindo limpo no Excel real via COM.
      zip.file(caminho, new TextEncoder().encode(sheetXml))
      await yieldToEventLoop()
    }
  }

  if (opcoes?.modoCliente) {
    onProgress?.(Math.min(99, Math.round((concluido / pesoTotal) * 100)), "Preparando versão do cliente (sem fórmulas)...")
    await transformarParaCliente(zip, caminhos)
    await yieldToEventLoop()
  }

  const blobFinal = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    (meta) => {
      onProgress?.(
        Math.min(99, Math.round(((concluido + (meta.percent / 100) * pesoZip) / pesoTotal) * 100)),
        "Compactando o arquivo Excel..."
      )
    }
  )
  onProgress?.(100, "Pronto")

  const url = URL.createObjectURL(blobFinal)
  const a = document.createElement("a")
  a.href = url
  const nomeBase = dados.nomeProjeto?.trim()
    ? dados.nomeProjeto.trim()
    : `Reforma Tributária - ${dados.empresa.razaoSocial || "Empresa"}`
  const nomeArquivo = `${nomeBase}${opcoes?.modoCliente ? " (Cliente)" : ""}`.replace(/[\\/:*?"<>|]/g, "").trim()
  a.download = `${nomeArquivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
