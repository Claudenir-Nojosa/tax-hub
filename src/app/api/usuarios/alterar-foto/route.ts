// app/api/usuarios/alterar-foto/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../../../auth";

// GET - Obter URL da foto atual
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const usuario = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: usuario?.image,
      usuario: {
        id: usuario?.id,
        name: usuario?.name,
        email: usuario?.email,
      },
    });
  } catch (error) {
    console.error("Erro ao obter avatar:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const usuarioAtual = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true },
    });

    if (!usuarioAtual) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhuma imagem fornecida" },
        { status: 400 }
      );
    }

    // Validações
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Arquivo deve ser uma imagem válida" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 5MB" },
        { status: 400 }
      );
    }

    // Gerar nome do arquivo
    const fileExt = file.name.split(".").pop();
    const fileName = `${usuarioAtual.id}/${uuidv4()}.${fileExt}`;

    // Fazer upload COM SUPABASE ADMIN (ignora RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Erro no upload (admin):", uploadError);
      return NextResponse.json(
        { error: `Erro ao fazer upload da imagem: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: { publicUrl } } = await supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    console.log("Upload realizado com sucesso:", publicUrl);

    // Atualizar no banco de dados
    const usuarioAtualizado = await db.user.update({
      where: { email: session.user.email },
      data: { image: publicUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Foto atualizada com sucesso!",
      avatarUrl: usuarioAtualizado.image,
      usuario: {
        id: usuarioAtualizado.id,
        name: usuarioAtualizado.name,
        email: usuarioAtualizado.email,
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar avatar:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Remover foto do perfil
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const usuarioAtual = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, image: true },
    });

    if (!usuarioAtual) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Deletar foto do storage se existir
    if (usuarioAtual.image) {
      try {
        const imageUrl = usuarioAtual.image;
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/');
        
        // Encontrar a posição de 'avatars' e pegar o restante do caminho
        const avatarsIndex = pathParts.indexOf('avatars');
        if (avatarsIndex !== -1) {
          const fileName = pathParts.slice(avatarsIndex + 1).join('/');
          console.log("Tentando deletar:", fileName);
          
          const { error: deleteError } = await supabase.storage
            .from("avatars")
            .remove([fileName]);
          
          if (deleteError) {
            console.warn("Erro ao deletar foto do storage:", deleteError);
          } else {
            console.log("Foto deletada do storage com sucesso");
          }
        }
      } catch (error) {
        console.warn("Erro ao processar foto para deletar:", error);
        // Continuar mesmo se falhar em deletar do storage
      }
    }

    // Atualizar usuário removendo a imagem
    const usuarioAtualizado = await db.user.update({
      where: { email: session.user.email },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Foto removida com sucesso!",
      usuario: {
        id: usuarioAtualizado.id,
        name: usuarioAtualizado.name,
        email: usuarioAtualizado.email,
      },
    });
  } catch (error: any) {
    console.error("Erro ao remover avatar:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}