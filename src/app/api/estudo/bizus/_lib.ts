import { Prisma } from "@prisma/client"
import db from "@/lib/db"

// O request inclui metadados e dois documentos JSON além da imagem principal.
// O teto é aplicado durante a leitura do stream, inclusive quando não há Content-Length.
export const LIMITE_REQUISICAO_BYTES = 14 * 1024 * 1024
export const LIMITE_IMAGEM_URL = 10 * 1024 * 1024

const LIMITES = {
  concursoId: 100,
  materia: 180,
  topico: 300,
  titulo: 180,
  conteudo: 100_000,
  imagemOrigem: 40,
  tema: 80,
  layout: 80,
  poseAvatar: 120,
} as const

const LIMITES_DOCUMENTO = {
  bytes: 12 * 1024 * 1024,
  profundidade: 24,
  valores: 50_000,
  propriedades: 200,
  tamanhoChave: 128,
  itensArray: 5_000,
  texto: 200_000,
  richText: 500_000,
  nodes: 500,
  edges: 1_500,
  revisoes: 100,
  id: 128,
  tipo: 80,
  coordenada: 10_000_000,
  dimensao: 100_000,
  zoomMin: 0.02,
  zoomMax: 32,
  url: 8_192,
  imagemDecodificada: 8 * 1024 * 1024,
  imagensDocumento: 10 * 1024 * 1024,
} as const

type JsonGravavel = Prisma.InputJsonValue | typeof Prisma.DbNull

export type BizuCreateInput = {
  concursoId: string
  materia: string
  topico: string
  titulo: string
  conteudo: string
  conteudoEstruturado?: JsonGravavel
  imagemUrl: string | null
  imagemOrigem: string
  tema: string
  layout: string
  poseAvatar: string
  configuracao?: JsonGravavel
}

export type BizuUpdateInput = Partial<Omit<BizuCreateInput, "concursoId">>

export type Validacao<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

interface EstadoDocumento {
  valores: number
  bytesImagens: number
}

function objetoJson(valor: unknown): valor is Record<string, unknown> {
  return !!valor && typeof valor === "object" && !Array.isArray(valor)
}

function falha(error: string, status?: number): Validacao<never> {
  return { ok: false, error, ...(status !== undefined && { status }) }
}

function sucesso<T>(data: T): Validacao<T> {
  return { ok: true, data }
}

function texto(
  valor: unknown,
  nome: keyof typeof LIMITES,
  opcoes: { obrigatorio?: boolean; padrao?: string } = {}
): Validacao<string> {
  if (valor === undefined || valor === null) {
    if (opcoes.obrigatorio) return falha(`${nome} é obrigatório`)
    return sucesso(opcoes.padrao ?? "")
  }
  if (typeof valor !== "string") return falha(`${nome} deve ser texto`)

  const resultado = valor.trim()
  if (opcoes.obrigatorio && !resultado) return falha(`${nome} é obrigatório`)
  if (resultado.length > LIMITES[nome]) {
    return falha(`${nome} excede o limite de ${LIMITES[nome]} caracteres`)
  }
  return sucesso(resultado)
}

function conteudoTexto(valor: unknown): Validacao<string> {
  if (valor === undefined || valor === null) return sucesso("")
  if (typeof valor !== "string") return falha("conteudo deve ser texto")
  if (valor.length > LIMITES.conteudo) {
    return falha(`conteudo excede o limite de ${LIMITES.conteudo} caracteres`)
  }
  return sucesso(valor)
}

function bytesUtf8(valor: string) {
  return new TextEncoder().encode(valor).byteLength
}

function validarDataUrlImagem(valor: string, caminho: string): Validacao<{ valor: string; bytes: number }> {
  if (valor.length > LIMITE_IMAGEM_URL) return falha(`${caminho} excede o limite permitido`)

  const virgula = valor.indexOf(",")
  if (virgula < 0) return falha(`${caminho} contém uma data URL inválida`)

  const cabecalho = valor.slice(0, virgula)
  if (!/^data:image\/(?:png|jpe?g|webp|gif|avif);base64$/i.test(cabecalho)) {
    return falha(`${caminho} usa um formato de imagem não permitido`)
  }

  const base64 = valor.slice(virgula + 1)
  if (!base64 || base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return falha(`${caminho} contém base64 inválido`)
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0
  const bytes = Math.floor((base64.length * 3) / 4) - padding
  if (bytes > LIMITES_DOCUMENTO.imagemDecodificada) {
    return falha(`${caminho} excede 8 MB após decodificação`)
  }
  return sucesso({ valor, bytes })
}

function validarUrlImagem(valorBruto: string, caminho: string): Validacao<{ valor: string; bytes: number }> {
  const valor = valorBruto.trim()
  if (!valor) return sucesso({ valor: "", bytes: 0 })
  if (/^data:image\//i.test(valor)) return validarDataUrlImagem(valor, caminho)
  if (valor.length > LIMITES_DOCUMENTO.url) return falha(`${caminho} contém uma URL longa demais`)

  const urlHttp = /^https?:\/\//i.test(valor)
  const caminhoRelativo = valor.startsWith("/") && !valor.startsWith("//")
  if (!urlHttp && !caminhoRelativo) {
    return falha(`${caminho} deve ser uma URL http(s), caminho relativo ou data URL de imagem`)
  }
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return falha(`${caminho} contém uma URL inválida`)
  try {
    const url = new URL(valor, "https://local.invalid")
    if (urlHttp && (url.protocol !== "http:" && url.protocol !== "https:")) throw new Error("protocolo")
    if (urlHttp && (url.username || url.password)) return falha(`${caminho} não pode conter credenciais`)
  } catch {
    return falha(`${caminho} contém uma URL inválida`)
  }
  return sucesso({ valor, bytes: 0 })
}

function imagem(valor: unknown): Validacao<string | null> {
  if (valor === undefined || valor === null || valor === "") return sucesso(null)
  if (typeof valor !== "string") return falha("imagemUrl deve ser texto ou null")
  const validada = validarUrlImagem(valor, "imagemUrl")
  if (!validada.ok) return validada
  return sucesso(validada.data.valor)
}

function chavePerigosa(chave: string) {
  return chave === "__proto__" || chave === "prototype" || chave === "constructor"
}

function contextoDeImagem(objeto: Record<string, unknown>) {
  const tipo = [objeto.type, objeto.tipo, objeto.kind]
    .find((item): item is string => typeof item === "string")
    ?.toLowerCase()
  return !!tipo && /(?:image|imagem|photo|foto|picture|illustration|ilustracao)/.test(tipo)
}

function chaveDeImagem(chave: string) {
  return /^(?:images?|imagens?|photos?|fotos?|thumbnail(?:Url)?|posterUrl|spriteUrl|avatarUrl|imageUrl|imagemUrl|imageSrc|imagemSrc|backgroundImage(?:Url)?|fundoImagem(?:Url)?)$/i.test(chave)
}

function chaveUrlDeObjetoImagem(chave: string) {
  return /^(?:url|src|uri|dataUrl|imageUrl|imagemUrl|imageSrc|imagemSrc)$/i.test(chave)
}

function chaveContainerDeImagem(chave: string) {
  return /^(?:data|payload|props|attributes|atributos)$/i.test(chave)
}

function chaveDeRichText(chave: string) {
  return /^(?:html|richText|richtext|textoHtml|contentHtml|conteudoHtml|markup)$/i.test(chave)
}

function validarRichText(valor: string, caminho: string): Validacao<void> {
  if (valor.length > LIMITES_DOCUMENTO.richText) return falha(`${caminho} excede o limite de rich text`)
  if (
    /<\s*\/?\s*(?:script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math|img|picture|source|video|audio)\b/i.test(valor) ||
    /\bon[a-z]+\s*=/i.test(valor) ||
    /\b(?:href|src|srcset|xlink:href)\s*=/i.test(valor) ||
    /(?:javascript|vbscript)\s*:/i.test(valor) ||
    /(?:expression\s*\(|url\s*\(|@import\b)/i.test(valor)
  ) {
    return falha(`${caminho} contém HTML ativo não permitido`)
  }
  return sucesso(undefined)
}

function validarNumero(
  valor: unknown,
  caminho: string,
  minimo: number,
  maximo: number
): Validacao<number> {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < minimo || valor > maximo) {
    return falha(`${caminho} deve ser um número entre ${minimo} e ${maximo}`)
  }
  return sucesso(valor)
}

function validarViewport(valor: unknown, caminho: string): Validacao<void> {
  if (!objetoJson(valor)) return falha(`${caminho} deve ser um objeto`)
  const possuiTransform = ["x", "y", "zoom", "offsetX", "offsetY", "scale"].some((campo) => Object.hasOwn(valor, campo))
  if (!possuiTransform) return sucesso(undefined)

  const xBruto = valor.x ?? valor.offsetX
  const yBruto = valor.y ?? valor.offsetY
  const zoomBruto = valor.zoom ?? valor.scale
  if (xBruto === undefined || yBruto === undefined || zoomBruto === undefined) {
    return falha(`${caminho} deve informar x/y/zoom ou offsetX/offsetY/scale`)
  }
  const x = validarNumero(xBruto, `${caminho}.x`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
  if (!x.ok) return x
  const y = validarNumero(yBruto, `${caminho}.y`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
  if (!y.ok) return y
  const zoom = validarNumero(zoomBruto, `${caminho}.zoom`, LIMITES_DOCUMENTO.zoomMin, LIMITES_DOCUMENTO.zoomMax)
  if (!zoom.ok) return zoom
  return sucesso(undefined)
}

function validarVersaoDocumento(objeto: Record<string, unknown>, caminho: string): Validacao<void> {
  const chaves = ["versao", "version", "schemaVersion"].filter((chave) => Object.hasOwn(objeto, chave))
  if (chaves.length === 0) {
    // Whiteboards novos sempre chegam ao banco explicitamente versionados; documentos legados
    // sem nodes/edges continuam intocados e compatíveis.
    objeto.versao = 1
  }

  for (const chave of chaves) {
    const valor = objeto[chave]
    const numeroValido = typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 1_000
    const semverValido = typeof valor === "string" && /^\d{1,4}(?:\.\d{1,4}){0,2}$/.test(valor)
    if (!numeroValido && !semverValido) return falha(`${caminho}.${chave} contém uma versão inválida`)
  }

  for (const chave of ["revisao", "revision"]) {
    if (!Object.hasOwn(objeto, chave)) continue
    const valor = objeto[chave]
    if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < 0) {
      return falha(`${caminho}.${chave} deve ser um inteiro não negativo`)
    }
  }
  return sucesso(undefined)
}

function validarPosicao(valor: unknown, caminho: string): Validacao<void> {
  if (!objetoJson(valor)) return falha(`${caminho} deve ser um objeto`)
  if (!Object.hasOwn(valor, "x") || !Object.hasOwn(valor, "y")) {
    return falha(`${caminho} deve informar x e y`)
  }
  const x = validarNumero(valor.x, `${caminho}.x`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
  if (!x.ok) return x
  const y = validarNumero(valor.y, `${caminho}.y`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
  if (!y.ok) return y
  return sucesso(undefined)
}

function stringId(valor: unknown, caminho: string): Validacao<string> {
  if (typeof valor !== "string" || !valor.trim() || valor !== valor.trim() || valor.length > LIMITES_DOCUMENTO.id) {
    return falha(`${caminho} deve ser um identificador não vazio de até ${LIMITES_DOCUMENTO.id} caracteres`)
  }
  return sucesso(valor)
}

function validarGrafo(objeto: Record<string, unknown>, caminho: string): Validacao<void> {
  const temNodes = Object.hasOwn(objeto, "nodes")
  const temEdges = Object.hasOwn(objeto, "edges")
  const temConnections = Object.hasOwn(objeto, "connections")
  const tipoDocumento = [objeto.documentType, objeto.tipoDocumento, objeto.kind, objeto.tipo]
    .find((item): item is string => typeof item === "string")
    ?.toLowerCase()
  const grafoDeclarado = !!tipoDocumento && /(?:whiteboard|mind.?map|mapa.?mental|canvas)/.test(tipoDocumento)
  const pareceGrafo =
    grafoDeclarado || Array.isArray(objeto.nodes) || Array.isArray(objeto.edges) || Array.isArray(objeto.connections)
  if (!pareceGrafo) return sucesso(undefined)
  if (temNodes && !Array.isArray(objeto.nodes)) return falha(`${caminho}.nodes deve ser uma lista`)
  if (temEdges && !Array.isArray(objeto.edges)) return falha(`${caminho}.edges deve ser uma lista`)
  if (temConnections && !Array.isArray(objeto.connections)) return falha(`${caminho}.connections deve ser uma lista`)

  const nodes = (objeto.nodes ?? []) as unknown[]
  const edges = [
    ...((objeto.edges ?? []) as unknown[]).map((edge, indice) => ({ edge, propriedade: "edges", indice })),
    ...((objeto.connections ?? []) as unknown[]).map((edge, indice) => ({ edge, propriedade: "connections", indice })),
  ]
  if (nodes.length > LIMITES_DOCUMENTO.nodes) return falha(`${caminho}.nodes excede ${LIMITES_DOCUMENTO.nodes} itens`)
  if (edges.length > LIMITES_DOCUMENTO.edges) return falha(`${caminho}.edges excede ${LIMITES_DOCUMENTO.edges} itens`)

  const versao = validarVersaoDocumento(objeto, caminho)
  if (!versao.ok) return versao

  const ids = new Set<string>()
  for (let indice = 0; indice < nodes.length; indice += 1) {
    const node = nodes[indice]
    const nodePath = `${caminho}.nodes[${indice}]`
    if (!objetoJson(node)) return falha(`${nodePath} deve ser um objeto`)
    const id = stringId(node.id, `${nodePath}.id`)
    if (!id.ok) return id
    if (ids.has(id.data)) return falha(`${caminho}.nodes contém o id duplicado "${id.data}"`)
    ids.add(id.data)

    if (Object.hasOwn(node, "position")) {
      const posicao = validarPosicao(node.position, `${nodePath}.position`)
      if (!posicao.ok) return posicao
    }
    if (Object.hasOwn(node, "positionAbsolute")) {
      const posicao = validarPosicao(node.positionAbsolute, `${nodePath}.positionAbsolute`)
      if (!posicao.ok) return posicao
    }
    if (Object.hasOwn(node, "x") || Object.hasOwn(node, "y")) {
      if (!Object.hasOwn(node, "x") || !Object.hasOwn(node, "y")) {
        return falha(`${nodePath} deve informar x e y juntos`)
      }
      const x = validarNumero(node.x, `${nodePath}.x`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
      if (!x.ok) return x
      const y = validarNumero(node.y, `${nodePath}.y`, -LIMITES_DOCUMENTO.coordenada, LIMITES_DOCUMENTO.coordenada)
      if (!y.ok) return y
    }
    for (const campo of ["width", "height"] as const) {
      if (!Object.hasOwn(node, campo)) continue
      const dimensao = validarNumero(node[campo], `${nodePath}.${campo}`, 0, LIMITES_DOCUMENTO.dimensao)
      if (!dimensao.ok) return dimensao
    }
    for (const campoTipo of ["type", "kind"] as const) {
      const tipo = node[campoTipo]
      if (Object.hasOwn(node, campoTipo) && (typeof tipo !== "string" || tipo.length > LIMITES_DOCUMENTO.tipo)) {
        return falha(`${nodePath}.${campoTipo} deve ter até ${LIMITES_DOCUMENTO.tipo} caracteres`)
      }
    }
  }

  const edgeIds = new Set<string>()
  for (let indice = 0; indice < edges.length; indice += 1) {
    const { edge, propriedade, indice: indiceNaColecao } = edges[indice]
    const edgePath = `${caminho}.${propriedade}[${indiceNaColecao}]`
    if (!objetoJson(edge)) return falha(`${edgePath} deve ser um objeto`)

    if (Object.hasOwn(edge, "id")) {
      const id = stringId(edge.id, `${edgePath}.id`)
      if (!id.ok) return id
      if (edgeIds.has(id.data)) return falha(`${caminho}.edges contém o id duplicado "${id.data}"`)
      edgeIds.add(id.data)
    }

    const sourceBruto = edge.source ?? edge.from ?? edge.origem
    const targetBruto = edge.target ?? edge.to ?? edge.destino
    const source = stringId(sourceBruto, `${edgePath}.source`)
    if (!source.ok) return source
    const target = stringId(targetBruto, `${edgePath}.target`)
    if (!target.ok) return target
    if (!ids.has(source.data) || !ids.has(target.data)) {
      return falha(`${edgePath} referencia um node inexistente`)
    }
  }

  for (const campo of ["width", "height"] as const) {
    if (!Object.hasOwn(objeto, campo)) continue
    const dimensao = validarNumero(objeto[campo], `${caminho}.${campo}`, 1, LIMITES_DOCUMENTO.dimensao)
    if (!dimensao.ok) return dimensao
  }

  if (Object.hasOwn(objeto, "viewport")) {
    const viewport = validarViewport(objeto.viewport, `${caminho}.viewport`)
    if (!viewport.ok) return viewport
  }
  return sucesso(undefined)
}

function validarJsonRecursivo(
  valor: unknown,
  caminho: string,
  profundidade: number,
  estado: EstadoDocumento,
  emContextoDeImagem = false,
  emContextoRichText = false
): Validacao<void> {
  estado.valores += 1
  if (estado.valores > LIMITES_DOCUMENTO.valores) return falha(`${caminho} possui elementos demais`)
  if (profundidade > LIMITES_DOCUMENTO.profundidade) return falha(`${caminho} é profundo demais`)

  if (valor === null || typeof valor === "boolean") return sucesso(undefined)
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || Math.abs(valor) > Number.MAX_SAFE_INTEGER) {
      return falha(`${caminho} contém um número inválido`)
    }
    return sucesso(undefined)
  }
  if (typeof valor === "string") {
    if (/^\s*(?:javascript|vbscript|data:text\/html)\s*:/i.test(valor)) {
      return falha(`${caminho} contém um protocolo não permitido`)
    }
    if (/^data:image\//i.test(valor)) {
      const validada = validarDataUrlImagem(valor, caminho)
      if (!validada.ok) return validada
      estado.bytesImagens += validada.data.bytes
      if (estado.bytesImagens > LIMITES_DOCUMENTO.imagensDocumento) {
        return falha(`${caminho} faz o documento exceder 10 MB de imagens incorporadas`)
      }
      return sucesso(undefined)
    }
    if (emContextoDeImagem && valor) {
      if (/^(?:https?:\/\/|\/)/i.test(valor)) {
        const validada = validarUrlImagem(valor, caminho)
        if (!validada.ok) return validada
        return sucesso(undefined)
      }
      // Um node de imagem pode apontar para `imagemUrl` do próprio Bizu em vez de duplicar
      // megabytes de base64 dentro do documento.
      if (valor.length > LIMITES_DOCUMENTO.id || !/^[\w.:-]+$/u.test(valor)) {
        return falha(`${caminho} deve ser uma URL de imagem ou referência curta ao asset primário`)
      }
      return sucesso(undefined)
    }
    if (emContextoRichText) return validarRichText(valor, caminho)
    if (valor.length > LIMITES_DOCUMENTO.texto) return falha(`${caminho} contém texto longo demais`)
    if (/<[^>]+>/.test(valor)) {
      const richText = validarRichText(valor, caminho)
      if (!richText.ok) return richText
    }
    return sucesso(undefined)
  }
  if (Array.isArray(valor)) {
    if (valor.length > LIMITES_DOCUMENTO.itensArray) return falha(`${caminho} possui itens demais`)
    for (let indice = 0; indice < valor.length; indice += 1) {
      const item = validarJsonRecursivo(
        valor[indice],
        `${caminho}[${indice}]`,
        profundidade + 1,
        estado,
        emContextoDeImagem,
        emContextoRichText
      )
      if (!item.ok) return item
    }
    return sucesso(undefined)
  }
  if (!objetoJson(valor)) return falha(`${caminho} contém um valor que não pode ser salvo como JSON`)

  const chaves = Object.keys(valor)
  if (chaves.length > LIMITES_DOCUMENTO.propriedades) return falha(`${caminho} possui propriedades demais`)
  const objetoImagem = emContextoDeImagem || contextoDeImagem(valor)

  const grafo = validarGrafo(valor, caminho)
  if (!grafo.ok) return grafo

  for (const chave of chaves) {
    if (chave.length > LIMITES_DOCUMENTO.tamanhoChave) return falha(`${caminho} possui uma chave longa demais`)
    if (chavePerigosa(chave)) return falha(`${caminho}.${chave} não é uma propriedade permitida`)
    if (/^(?:revisions|revisoes|versoes|history|historico)$/i.test(chave) && Array.isArray(valor[chave])) {
      if (valor[chave].length > LIMITES_DOCUMENTO.revisoes) {
        return falha(`${caminho}.${chave} excede ${LIMITES_DOCUMENTO.revisoes} revisões`)
      }
    }
    if (chave.toLowerCase() === "viewport") {
      const viewport = validarViewport(valor[chave], `${caminho}.${chave}`)
      if (!viewport.ok) return viewport
    }
    const filhoValor = valor[chave]
    const contextoFilhoImagem =
      chaveDeImagem(chave) ||
      (objetoImagem && chaveUrlDeObjetoImagem(chave)) ||
      (objetoImagem && chaveContainerDeImagem(chave) && (objetoJson(filhoValor) || Array.isArray(filhoValor)))
    const contextoFilhoRichText = chaveDeRichText(chave)
    const filho = validarJsonRecursivo(
      filhoValor,
      `${caminho}.${chave}`,
      profundidade + 1,
      estado,
      contextoFilhoImagem,
      contextoFilhoRichText
    )
    if (!filho.ok) return filho
    if (typeof valor[chave] === "string" && chaveDeRichText(chave)) {
      const richText = validarRichText(valor[chave], `${caminho}.${chave}`)
      if (!richText.ok) return richText
    }
  }
  return sucesso(undefined)
}

function jsonEditavel(valor: unknown, nome: string): Validacao<JsonGravavel> {
  if (valor === null) return sucesso(Prisma.DbNull)
  if (!objetoJson(valor) && !Array.isArray(valor)) {
    return falha(`${nome} deve ser um objeto, uma lista ou null`)
  }

  let serializado: string
  try {
    serializado = JSON.stringify(valor)
  } catch {
    return falha(`${nome} não é um JSON válido`)
  }
  if (bytesUtf8(serializado) > LIMITES_DOCUMENTO.bytes) {
    return falha(`${nome} excede o limite de 12 MB`)
  }

  const estrutura = validarJsonRecursivo(valor, nome, 0, { valores: 0, bytesImagens: 0 })
  if (!estrutura.ok) return estrutura
  return sucesso(valor as Prisma.InputJsonValue)
}

export async function lerJsonComLimite(req: Request): Promise<Validacao<unknown>> {
  const tamanhoDeclarado = Number(req.headers.get("content-length"))
  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > LIMITE_REQUISICAO_BYTES) {
    return falha("Corpo JSON excede o limite de 14 MB", 413)
  }
  if (!req.body) return falha("Corpo JSON inválido")

  const reader = req.body.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > LIMITE_REQUISICAO_BYTES) {
        await reader.cancel().catch(() => undefined)
        return falha("Corpo JSON excede o limite de 14 MB", 413)
      }
      partes.push(value)
    }
  } catch {
    return falha("Não foi possível ler o corpo JSON")
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const parte of partes) {
    bytes.set(parte, offset)
    offset += parte.byteLength
  }

  try {
    const textoJson = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return sucesso(JSON.parse(textoJson) as unknown)
  } catch {
    return falha("Corpo JSON inválido")
  }
}

export function validarCriacaoBizu(valor: unknown): Validacao<BizuCreateInput> {
  if (!objetoJson(valor)) return falha("Corpo JSON inválido")

  const concursoId = texto(valor.concursoId, "concursoId", { obrigatorio: true })
  if (!concursoId.ok) return concursoId
  const materia = texto(valor.materia, "materia", { obrigatorio: true })
  if (!materia.ok) return materia
  const topico = texto(valor.topico, "topico")
  if (!topico.ok) return topico
  const titulo = texto(valor.titulo, "titulo", { obrigatorio: true })
  if (!titulo.ok) return titulo
  const conteudo = conteudoTexto(valor.conteudo)
  if (!conteudo.ok) return conteudo
  const imagemUrl = imagem(valor.imagemUrl)
  if (!imagemUrl.ok) return imagemUrl
  const imagemOrigem = texto(valor.imagemOrigem, "imagemOrigem", {
    padrao: imagemUrl.data ? "url" : "nenhuma",
  })
  if (!imagemOrigem.ok) return imagemOrigem
  const tema = texto(valor.tema, "tema", { padrao: "vice-city" })
  if (!tema.ok) return tema
  const layout = texto(valor.layout, "layout", { padrao: "card" })
  if (!layout.ok) return layout
  const poseAvatar = texto(valor.poseAvatar, "poseAvatar", { padrao: "apontando" })
  if (!poseAvatar.ok) return poseAvatar

  let conteudoEstruturado: BizuCreateInput["conteudoEstruturado"]
  if (Object.hasOwn(valor, "conteudoEstruturado")) {
    const validado = jsonEditavel(valor.conteudoEstruturado, "conteudoEstruturado")
    if (!validado.ok) return validado
    conteudoEstruturado = validado.data
  }

  let configuracao: BizuCreateInput["configuracao"]
  if (Object.hasOwn(valor, "configuracao")) {
    const validado = jsonEditavel(valor.configuracao, "configuracao")
    if (!validado.ok) return validado
    configuracao = validado.data
  }

  return sucesso({
    concursoId: concursoId.data,
    materia: materia.data,
    topico: topico.data,
    titulo: titulo.data,
    conteudo: conteudo.data,
    ...(conteudoEstruturado !== undefined && { conteudoEstruturado }),
    imagemUrl: imagemUrl.data,
    imagemOrigem: imagemOrigem.data || (imagemUrl.data ? "url" : "nenhuma"),
    tema: tema.data || "vice-city",
    layout: layout.data || "card",
    poseAvatar: poseAvatar.data || "apontando",
    ...(configuracao !== undefined && { configuracao }),
  })
}

export function validarAtualizacaoBizu(valor: unknown): Validacao<BizuUpdateInput> {
  if (!objetoJson(valor)) return falha("Corpo JSON inválido")
  if (Object.hasOwn(valor, "concursoId")) return falha("concursoId não pode ser alterado")

  const data: BizuUpdateInput = {}
  for (const campo of ["materia", "titulo"] as const) {
    if (!Object.hasOwn(valor, campo)) continue
    const validado = texto(valor[campo], campo, { obrigatorio: true })
    if (!validado.ok) return validado
    data[campo] = validado.data
  }
  for (const campo of ["topico", "imagemOrigem", "tema", "layout", "poseAvatar"] as const) {
    if (!Object.hasOwn(valor, campo)) continue
    const validado = texto(valor[campo], campo)
    if (!validado.ok) return validado
    data[campo] = validado.data
  }
  if (Object.hasOwn(valor, "conteudo")) {
    const validado = conteudoTexto(valor.conteudo)
    if (!validado.ok) return validado
    data.conteudo = validado.data
  }
  if (Object.hasOwn(valor, "imagemUrl")) {
    const validado = imagem(valor.imagemUrl)
    if (!validado.ok) return validado
    data.imagemUrl = validado.data
    if (!Object.hasOwn(valor, "imagemOrigem") && !validado.data) data.imagemOrigem = "nenhuma"
  }
  for (const campo of ["conteudoEstruturado", "configuracao"] as const) {
    if (!Object.hasOwn(valor, campo)) continue
    const validado = jsonEditavel(valor[campo], campo)
    if (!validado.ok) return validado
    data[campo] = validado.data
  }

  if (Object.keys(data).length === 0) return falha("Nenhum campo editável foi informado")
  return sucesso(data)
}

export async function usuarioTemAcessoAoConcurso(concursoId: string, userId: string) {
  const acesso = await db.concursoAcesso.count({ where: { concursoId, userId } })
  return acesso > 0
}

export async function buscarBizuDoUsuario(id: string, userId: string) {
  return db.bizuEstudo.findFirst({
    where: {
      id,
      userId,
      concurso: { acessos: { some: { userId } } },
    },
  })
}
