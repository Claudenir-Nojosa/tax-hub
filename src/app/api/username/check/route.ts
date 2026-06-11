// app/api/username/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username é obrigatório' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findFirst({
      where: { 
        username: username.toLowerCase(),
        id: { not: session.user.id }
      }
    });

    return NextResponse.json({
      disponivel: !existingUser,
      username: username.toLowerCase()
    });

  } catch (error) {
    console.error('Erro ao verificar username:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}