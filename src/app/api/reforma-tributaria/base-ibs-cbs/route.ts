import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { carregarBaseIbsCbsPadrao } from "@/lib/reforma-base-ibs-cbs"

// Serve a base padrão de NCM/Anexo/redução (aba "Base IBS-CBS", 4.524 linhas) pro gerador de
// Excel — que roda no browser e não pode usar `fs` diretamente (ver reforma-base-ibs-cbs.ts).
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const linhas = carregarBaseIbsCbsPadrao()
  return NextResponse.json({ linhas })
}
