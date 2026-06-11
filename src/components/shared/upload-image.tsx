// components/upload-image.tsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supaBaseClient";
import { cn } from "@/lib/utils"; // Importe o utilitário cn se você tiver

interface UploadImageProps {
  onImageChange: (url: string | null) => void;
  currentImage?: string | null;
  userId: string;
  metaId?: string;
  className?: string; // Adicione esta linha
}

export function UploadImage({
  onImageChange,
  currentImage,
  userId,
  metaId,
  className, // Receba a prop
}: UploadImageProps) {
  const { t } = useTranslation("upload");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error(t("erros.tipoInvalido"));
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("erros.tamanhoMaximo"));
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${metaId || "temp"}/${Date.now()}.${fileExt}`;

      console.log("Fazendo upload do arquivo:", fileName);

      const { data, error } = await supabase.storage
        .from("metas-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Erro no upload:", error);
        throw new Error(`${t("erros.upload")}: ${error.message}`);
      }

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("metas-images").getPublicUrl(data.path);

      console.log("Upload realizado com sucesso:", publicUrl);
      onImageChange(publicUrl);
      toast.success(t("mensagens.uploadSucesso"));
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error(t("erros.upload"));
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    if (!currentImage) return;

    try {
      // Extrair nome do arquivo da URL
      const url = new URL(currentImage);
      const pathParts = url.pathname.split("/");
      const fileName = pathParts.slice(-3).join("/");

      const { error } = await supabase.storage
        .from("metas-images")
        .remove([fileName]);

      if (error) {
        console.error("Erro ao deletar imagem:", error);
      }
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
    } finally {
      onImageChange(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {" "}
      {/* Aplique a classe aqui */}
      <Label className="text-gray-900 dark:text-white">{t("titulo")}</Label>
      {currentImage ? (
        <div className="relative group">
          <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
            <img
              src={currentImage}
              alt={t("alt.capaMeta")}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={removeImage}
            className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="meta-image"
            disabled={isUploading}
          />
          <Label
            htmlFor="meta-image"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isUploading
                  ? t("estados.uploading")
                  : t("botoes.adicionarImagem")}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t("instrucoes.formatos")}
              </p>
            </div>
          </Label>
        </div>
      )}
    </div>
  );
}
