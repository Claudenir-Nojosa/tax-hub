import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(null, { status: 401 });
    }

    const progresso = await db.estudoProgresso.findUnique({
      where: { userId: session.user.id },
      select: { dados: true },
    });

    return NextResponse.json(progresso?.dados ?? null);
  } catch (err) {
    console.error("[GET /api/estudo]", err);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const dados = await request.json();

    await db.estudoProgresso.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, dados },
      update: { dados },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/estudo]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
