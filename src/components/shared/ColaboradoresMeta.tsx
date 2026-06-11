"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { UserPlus, Mail, Trash2, User, Users } from "lucide-react";

interface ColaboradoresMetaProps {
  metaId: string;
  colaboradores: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    permissao: string;
  }>;
  convites: Array<{
    id: string;
    emailConvidado: string;
    status: string;
    expiraEm: string;
  }>;
  usuarioAtualEhDono: boolean;
  onColaboradoresAtualizados: () => void;
}

export function ColaboradoresMeta({
  metaId,
  colaboradores,
  convites,
  usuarioAtualEhDono,
  onColaboradoresAtualizados,
}: ColaboradoresMetaProps) {
  const { t, i18n } = useTranslation("colaboradores");
  const [dialogConvidarAberto, setDialogConvidarAberto] = useState(false);
  const [emailConvidado, setEmailConvidado] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  const handleConvidarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailConvidado.trim()) {
      toast.error(t("erros.emailVazio"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailConvidado)) {
      toast.error(t("erros.emailInvalido"));
      return;
    }

    setEnviandoConvite(true);
    try {
      const response = await fetch(
        `/api/dashboard/metas/${metaId}/colaboradores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailConvidado: emailConvidado.trim() }),
        }
      );

      if (response.ok) {
        toast.success(t("mensagens.conviteSucesso"));
        setEmailConvidado("");
        setDialogConvidarAberto(false);
        onColaboradoresAtualizados();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t("erros.enviarConvite"));
      }
    } catch (error: any) {
      console.error(t("erros.enviarConvite"), error);
      toast.error(error.message || t("erros.enviarConvite"));
    } finally {
      setEnviandoConvite(false);
    }
  };

  const handleRemoverColaborador = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/metas/${metaId}/colaboradores/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success(t("mensagens.removerSucesso"));
        onColaboradoresAtualizados();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t("erros.removerColaborador"));
      }
    } catch (error: any) {
      console.error(t("erros.removerColaborador"), error);
      toast.error(error.message || t("erros.removerColaborador"));
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("titulo")}
        </p>
        {usuarioAtualEhDono && (
          <Dialog
            open={dialogConvidarAberto}
            onOpenChange={setDialogConvidarAberto}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {t("botoes.convidar")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">
                  {t("dialog.titulo")}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  {t("dialog.descricao")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConvidarColaborador} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-gray-900 dark:text-white"
                  >
                    {t("dialog.labelEmail")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailConvidado}
                    onChange={(e) => setEmailConvidado(e.target.value)}
                    placeholder={t("dialog.placeholderEmail")}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogConvidarAberto(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t("botoes.cancelar")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={enviandoConvite}
                    className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  >
                    {enviandoConvite
                      ? t("estados.enviando")
                      : t("botoes.enviarConvite")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista de Colaboradores */}
      <div className="space-y-2">
        {/* Colaboradores */}
        {colaboradores.map((colaborador) => (
          <div
            key={colaborador.id}
            className="flex items-center justify-between p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={colaborador.user.image || ""} />
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  {colaborador.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {colaborador.user.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {colaborador.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700">
                {colaborador.permissao === "LEITURA"
                  ? t("permissoes.leitura")
                  : t("permissoes.escrita")}
              </Badge>
              {usuarioAtualEhDono && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoverColaborador(colaborador.user.id)
                        }
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 dark:bg-gray-800 text-white dark:text-white border-gray-700">
                      <p>{t("tooltips.removerColaborador")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        ))}

        {/* Convites Pendentes - Só mostrar para o dono */}
        {usuarioAtualEhDono &&
          convites.map((convite) => (
            <div
              key={convite.id}
              className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-yellow-600 text-white text-xs">
                    <Mail className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {convite.emailConvidado}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {t("convites.pendente")} - {t("convites.expiraEm")}{" "}
                    {formatarData(convite.expiraEm)}
                  </p>
                </div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700">
                {t("convites.status.pendente")}
              </Badge>
            </div>
          ))}

        {colaboradores.length === 0 &&
          (!usuarioAtualEhDono || convites.length === 0) && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("mensagens.nenhumColaborador")}</p>
              {usuarioAtualEhDono && (
                <p className="text-xs">{t("mensagens.convideParaColaborar")}</p>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
