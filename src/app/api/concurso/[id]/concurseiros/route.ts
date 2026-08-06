import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../../../auth"
import db from "@/lib/db"
import type { MateriaConcurso } from "@/lib/estudo-data"

// GET — todo mundo com acesso a este concurso (compartilhado) + um resumo do progresso de cada
// um: % do edital e o último PDF em que mexeu. Currículo é comum, mas cada linha aqui lê o
// ConcursoProgressoUsuario de UM userId diferente por vez — é a única rota que olha progresso de
// outra pessoa, só possível porque todos aqui têm ConcursoAcesso ao MESMO concurso.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const { id } = await params

  const meuAcesso = await db.concursoAcesso.count({ where: { concursoId: id, userId: session.user.id } })
  if (meuAcesso === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const [concurso, acessos, progressos, pdfs] = await Promise.all([
    db.concurso.findUnique({ where: { id } }),
    db.concursoAcesso.findMany({
      where: { concursoId: id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    db.concursoProgressoUsuario.findMany({ where: { concursoId: id } }),
    db.pdfConcurso.findMany({ where: { concursoId: id }, select: { id: true, nome: true, materia: true } }),
  ])
  if (!concurso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const totalTopicos = ((concurso.materias as unknown as MateriaConcurso[]) ?? []).reduce((s, m) => s + m.topicos.length, 0)
  const pdfPorId = new Map(pdfs.map((p) => [p.id, p]))
  const progressoPorUsuario = new Map(progressos.map((p) => [p.userId, p.dados as Record<string, unknown>]))

  const concurseiros = acessos.map((a) => {
    const dados = progressoPorUsuario.get(a.userId) ?? {}
    const topicos = (dados.topicos as Record<string, { estudado?: boolean }> | undefined) ?? {}
    const estudados = Object.values(topicos).filter((t) => t?.estudado).length
    const percEdital = totalTopicos > 0 ? Math.round((estudados / totalTopicos) * 100) : 0

    const pdfsProgresso = (dados.pdfsProgresso as Record<string, { atualizadoEm?: string; paginaAtual?: number }> | undefined) ?? {}
    let ultimoPdfId: string | null = null
    let ultimoEm: string | undefined
    for (const [pdfId, prog] of Object.entries(pdfsProgresso)) {
      if (!prog?.atualizadoEm || !pdfPorId.has(pdfId)) continue
      if (!ultimoEm || prog.atualizadoEm > ultimoEm) {
        ultimoEm = prog.atualizadoEm
        ultimoPdfId = pdfId
      }
    }
    const ultimoPdf = ultimoPdfId ? pdfPorId.get(ultimoPdfId) : undefined

    return {
      userId: a.userId,
      name: a.user.name,
      image: a.user.image,
      isPrincipal: a.isPrincipal,
      topicosEstudados: estudados,
      totalTopicos,
      percEdital,
      ultimoPdf: ultimoPdf ? { nome: ultimoPdf.nome, materia: ultimoPdf.materia, atualizadoEm: ultimoEm } : null,
    }
  })

  return NextResponse.json(concurseiros)
}
