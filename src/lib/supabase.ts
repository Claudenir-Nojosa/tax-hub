// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Adicione esta linha

// Cliente para frontend (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para backend (service role key - ignora RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Suas funções existentes (mantenha-as)
export async function uploadMetaImage(file: File, userId: string, metaId: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${metaId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('metas-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('metas-images')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    throw error;
  }
}

export async function deleteMetaImage(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts.slice(-3).join('/');
    
    const { error } = await supabase.storage
      .from('metas-images')
      .remove([fileName]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
}