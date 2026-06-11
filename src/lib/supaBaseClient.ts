// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Funções de upload
export async function uploadMetaImage(
  file: File,
  userId: string,
  metaId: string
) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${metaId}/${Date.now()}.${fileExt}`;

    console.log("Tentando upload para:", fileName);

    const { data, error } = await supabase.storage
      .from("metas-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erro detalhado no upload:", error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("metas-images").getPublicUrl(data.path);

    console.log("Upload realizado com sucesso:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Erro completo no upload:", error);
    throw error;
  }
}

export async function deleteMetaImage(imageUrl: string) {
  try {
    // Extrair caminho do arquivo da URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const fileName = pathParts.slice(-3).join("/");

    console.log("Tentando deletar:", fileName);

    const { error } = await supabase.storage
      .from("metas-images")
      .remove([fileName]);

    if (error) {
      console.error("Erro ao deletar:", error);
      throw error;
    }

    console.log("Imagem deletada com sucesso");
  } catch (error) {
    console.error("Erro ao deletar imagem:", error);
    throw error;
  }
}
