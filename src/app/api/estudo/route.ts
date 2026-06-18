import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import db from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progresso = await (db as any).estudoProgresso.findUnique({
    where: { userId: session.user.id },
    select: { dados: true },
  });

  return NextResponse.json(progresso?.dados ?? null);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const dados = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).estudoProgresso.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, dados },
    update: { dados },
  });

  return NextResponse.json({ ok: true });
}
