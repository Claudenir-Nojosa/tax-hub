import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import {
  buildDefaultConfigCiclo, mergeTopicoState, mergeBlocoEstado, mergePdfEstudo,
  splitTopicoState, splitBlocoEstado, splitPdfEstudo,
  type EstudoState, type TopicoState, type Bloco, type PdfEstudo, type PdfCurricular,
  type MateriaConcurso,
} from "@/lib/estudo-data"

// Currículo (matérias/tópicos/Blocos com links, PDFs) é COMPARTILHADO entre todos os acessores do
// concurso — vive em Concurso.topicosCompartilhados/blocosCompartilhados e na tabela PdfConcurso.
// Progresso (estudado, cadernos A-D, página onde parou, trilha, cartas, calendário) é POR USUÁRIO
// — vive em ConcursoProgressoUsuario, uma linha por (concurso, usuário). Esta rota compõe as duas
// metades num EstudoState só pro GET (mesmo formato de sempre, pra não mudar o load do page.tsx),
// e faz o caminho inverso no POST — o client continua mandando o EstudoState inteiro, sem precisar
// saber da separação.

async function carregarAcesso(id: string, userId: string) {
  return db.concursoAcesso.findUnique({ where: { concursoId_userId: { concursoId: id, userId } } })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  const acesso = await carregarAcesso(id, userId)
  if (!acesso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const [concurso, pdfs, progressoUsuario] = await Promise.all([
    db.concurso.findUnique({ where: { id } }),
    db.pdfConcurso.findMany({ where: { concursoId: id } }),
    db.concursoProgressoUsuario.findUnique({ where: { concursoId_userId: { concursoId: id, userId } } }),
  ])
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const dados = (progressoUsuario?.dados ?? {}) as Partial<EstudoState> & {
    blocosProgresso?: Record<string, unknown>
    pdfsProgresso?: Record<string, unknown>
  }
  const topicosCompartilhados = (concurso.topicosCompartilhados ?? {}) as unknown as Record<string, TopicoState>
  const blocosCompartilhados = (concurso.blocosCompartilhados ?? {}) as unknown as Record<string, Bloco>
  const topicosProgresso = (dados.topicos ?? {}) as Record<string, TopicoState>
  const blocosProgresso = dados.blocosProgresso ?? {}
  const pdfsProgresso = dados.pdfsProgresso ?? {}

  const topicos: Record<string, TopicoState> = {}
  for (const key of new Set([...Object.keys(topicosCompartilhados), ...Object.keys(topicosProgresso)])) {
    topicos[key] = mergeTopicoState(topicosCompartilhados[key] as never, topicosProgresso[key] as never)
  }

  const blocos: Record<string, Bloco> = {}
  for (const id2 of new Set([...Object.keys(blocosCompartilhados), ...Object.keys(blocosProgresso)])) {
    if (!blocosCompartilhados[id2]) continue // progresso órfão (bloco já removido) — ignora
    blocos[id2] = mergeBlocoEstado(blocosCompartilhados[id2] as never, blocosProgresso[id2] as never)
  }

  const pdfsEstudo: PdfEstudo[] = pdfs.map((p) =>
    mergePdfEstudo(
      {
        id: p.id, nome: p.nome, materia: p.materia,
        topicos: (p.topicos as string[] | null) ?? undefined,
        totalPaginas: p.totalPaginas,
        paginaConteudoFim: p.paginaConteudoFim ?? undefined,
        intervalosPaginas: (p.intervalosPaginas as unknown as PdfCurricular["intervalosPaginas"]) ?? undefined,
        capitulos: (p.capitulos as unknown as PdfCurricular["capitulos"]) ?? undefined,
        arquivoEnviado: p.arquivoEnviado,
        criadoEm: p.criadoEm.toISOString(),
      },
      pdfsProgresso[p.id] as never
    )
  )

  const estudoState: EstudoState = {
    topicos,
    blocos,
    pdfs: pdfsEstudo,
    calendario: dados.calendario ?? {},
    cartas: dados.cartas ?? [],
    configCiclo: dados.configCiclo ?? buildDefaultConfigCiclo(concurso.materias as unknown as MateriaConcurso[]),
    streak: dados.streak ?? 0,
    semanasOK: dados.semanasOK ?? 0,
    ...(dados.trilha !== undefined && { trilha: dados.trilha }),
    ...(dados.trilhaDinamica !== undefined && { trilhaDinamica: dados.trilhaDinamica }),
    topicosExcluidos: dados.topicosExcluidos ?? [],
    capitulosConcluidos: dados.capitulosConcluidos ?? [],
  }
  return NextResponse.json(estudoState)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  const acesso = await carregarAcesso(id, userId)
  if (!acesso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const body = (await req.json()) as EstudoState & { blocosRemovidos?: string[]; pdfsRemovidos?: string[] }
  const concurso = await db.concurso.findUnique({
    where: { id },
    select: { topicosCompartilhados: true, blocosCompartilhados: true },
  })
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // --- tópicos: split por chave, merge (só adiciona/atualiza) na metade curricular ---
  const topicosCompartilhados = { ...((concurso.topicosCompartilhados ?? {}) as Record<string, unknown>) }
  const topicosProgresso: Record<string, unknown> = {}
  for (const [key, t] of Object.entries(body.topicos ?? {})) {
    const { curricular, progresso } = splitTopicoState(t)
    if (Object.keys(curricular).length > 0) topicosCompartilhados[key] = curricular
    topicosProgresso[key] = progresso
  }

  // --- blocos: idem, mais remoção explícita (blocosRemovidos) — nunca infere remoção por
  // ausência no body, já que o body pode ser de um cliente com estado desatualizado do que o
  // OUTRO usuário acabou de adicionar
  const blocosCompartilhados = { ...((concurso.blocosCompartilhados ?? {}) as Record<string, unknown>) }
  for (const removidoId of body.blocosRemovidos ?? []) delete blocosCompartilhados[removidoId]
  const blocosProgresso: Record<string, unknown> = {}
  for (const [blocoId, b] of Object.entries(body.blocos ?? {})) {
    const { curricular, progresso } = splitBlocoEstado(b)
    blocosCompartilhados[blocoId] = curricular
    if (Object.keys(progresso).length > 0) blocosProgresso[blocoId] = progresso
  }

  // --- pdfs: metade curricular vira upsert em PdfConcurso (só quando REALMENTE muda — ver
  // abaixo); progresso vai no blob ---
  const pdfsExistentes = await db.pdfConcurso.findMany({
    where: { id: { in: (body.pdfs ?? []).map((p) => p.id) } },
    select: {
      id: true, nome: true, materia: true, totalPaginas: true, topicos: true,
      paginaConteudoFim: true, intervalosPaginas: true, capitulos: true, arquivoEnviado: true,
    },
  })
  const pdfsExistentesPorId = new Map(pdfsExistentes.map((p) => [p.id, p]))

  const pdfsProgresso: Record<string, unknown> = {}
  const pdfUpserts: ReturnType<typeof db.pdfConcurso.upsert>[] = []
  for (const p of body.pdfs ?? []) {
    const { curricular, progresso } = splitPdfEstudo(p)
    pdfsProgresso[p.id] = progresso
    const dadosCurric = {
      nome: curricular.nome, materia: curricular.materia, totalPaginas: curricular.totalPaginas,
      topicos: curricular.topicos ?? null, paginaConteudoFim: curricular.paginaConteudoFim ?? null,
      intervalosPaginas: curricular.intervalosPaginas ?? null, capitulos: curricular.capitulos ?? null,
      arquivoEnviado: curricular.arquivoEnviado ?? false,
    }
    // com 281 PDFs nesse concurso, reescrever todos a cada save (mesmo um que não tem nada a ver
    // com PDF, tipo editar o Calendário) foi o maior peso por trás dos timeouts do Postgres — só
    // faz o upsert se o registro é novo ou se algo curricular dele de fato mudou
    const existente = pdfsExistentesPorId.get(p.id)
    if (existente && JSON.stringify({ ...existente, id: undefined }) === JSON.stringify({ ...dadosCurric, id: undefined })) {
      continue
    }
    pdfUpserts.push(db.pdfConcurso.upsert({
      where: { id: p.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json? aceita null, mas o
      // tipo gerado do Prisma exige o sentinel Prisma.JsonNull em vez do literal null
      update: dadosCurric as any,
      create: { id: p.id, concursoId: id, criadoPorUserId: userId, storagePath: `${id}/${p.id}.pdf`, criadoEm: new Date(curricular.criadoEm), ...dadosCurric } as any,
    }))
  }

  const progressoDados = {
    topicos: topicosProgresso,
    blocosProgresso,
    pdfsProgresso,
    calendario: body.calendario ?? {},
    cartas: body.cartas ?? [],
    configCiclo: body.configCiclo,
    streak: body.streak ?? 0,
    semanasOK: body.semanasOK ?? 0,
    ...(body.trilha !== undefined && { trilha: body.trilha }),
    ...(body.trilhaDinamica !== undefined && { trilhaDinamica: body.trilhaDinamica }),
    topicosExcluidos: body.topicosExcluidos ?? [],
    capitulosConcluidos: body.capitulosConcluidos ?? [],
  }

  // só reescreve o currículo compartilhado (Concurso.topicosCompartilhados/blocosCompartilhados)
  // se algo curricular REALMENTE mudou — a esmagadora maioria dos saves (Calendário, marcar
  // capítulo, cadernos A-D, cartas...) é progresso puro e nunca toca nisso. Sem essa checagem,
  // TODO save reescrevia um JSONB de ~180 Blocos + centenas de tópicos inteiro no Concurso,
  // pesado o bastante pra estourar o statement_timeout do Postgres (visto em produção), além de
  // arriscar sobrescrever currículo fresco com uma cópia desatualizada que uma aba antiga ainda
  // tinha em memória (o mesmo bug que já causou os links do TecConcursos voltarem sozinhos)
  const curriculoMudou =
    JSON.stringify(topicosCompartilhados) !== JSON.stringify(concurso.topicosCompartilhados ?? {}) ||
    JSON.stringify(blocosCompartilhados) !== JSON.stringify(concurso.blocosCompartilhados ?? {})

  await db.$transaction([
    ...(curriculoMudou
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico (não modela o
      // shape de TopicoCurricular/BlocoCurricular no schema.prisma)
      ? [db.concurso.update({ where: { id }, data: { topicosCompartilhados, blocosCompartilhados } as any })]
      : []),
    ...(body.pdfsRemovidos?.length
      ? [db.pdfConcurso.deleteMany({ where: { concursoId: id, id: { in: body.pdfsRemovidos } } })]
      : []),
    ...pdfUpserts,
    db.concursoProgressoUsuario.upsert({
      where: { concursoId_userId: { concursoId: id, userId } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Json genérico
      update: { dados: progressoDados as any },
      create: { concursoId: id, userId, dados: progressoDados as any },
    }),
  ])
  return NextResponse.json({ ok: true })
}

// DELETE — reseta o progresso só DE QUEM CHAMOU (currículo compartilhado não é afetado)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  const acesso = await carregarAcesso(id, userId)
  if (!acesso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  await db.concursoProgressoUsuario.deleteMany({ where: { concursoId: id, userId } })
  return NextResponse.json({ ok: true })
}
