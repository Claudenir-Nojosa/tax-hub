// FormEditarCartao.tsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { toast } from "sonner";

interface Cartao {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  ativo: boolean;
  observacoes?: string;
}

interface FormEditarCartaoProps {
  cartao: Cartao;
  onSalvo: () => void;
  onCancelar: () => void;
}

export function FormEditarCartao({
  cartao,
  onSalvo,
  onCancelar,
}: FormEditarCartaoProps) {
  const { t } = useTranslation("editCartoes");
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: cartao.nome,
    bandeira: cartao.bandeira,
    limite: cartao.limite.toString(),
    diaFechamento: cartao.diaFechamento.toString(),
    diaVencimento: cartao.diaVencimento.toString(),
    cor: cartao.cor,
    observacoes: cartao.observacoes || "",
  });
  const BANDEIRAS = [
    { value: "VISA", label: t("bandeiras.visa") },
    { value: "MASTERCARD", label: t("bandeiras.mastercard") },
    { value: "AMERICAN_EXPRESS", label: t("bandeiras.americanExpress") },
    { value: "DISCOVER", label: t("bandeiras.discover") },
    { value: "UNIONPAY", label: t("bandeiras.unionpay") },
    { value: "JCB", label: t("bandeiras.jcb") },
    { value: "DINERS", label: t("bandeiras.diners") },
    { value: "ELO", label: t("bandeiras.elo") },
    { value: "HIPERCARD", label: t("bandeiras.hipercard") },
    { value: "OUTROS", label: t("bandeiras.outros") },
  ];

  const CORES = [
    { value: "#3B82F6", label: t("cores.azul") },
    { value: "#EF4444", label: t("cores.vermelho") },
    { value: "#10B981", label: t("cores.verde") },
    { value: "#F59E0B", label: t("cores.amarelo") },
    { value: "#8B5CF6", label: t("cores.roxo") },
    { value: "#EC4899", label: t("cores.rosa") },
    { value: "#06B6D4", label: t("cores.ciano") },
    { value: "#F97316", label: t("cores.laranja") },
    { value: "#84CC16", label: t("cores.lima") },
    { value: "#6B7280", label: t("cores.cinza") },
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const response = await fetch(`/api/cartoes/${cartao.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          limite: parseFloat(formData.limite),
          diaFechamento: parseInt(formData.diaFechamento),
          diaVencimento: parseInt(formData.diaVencimento),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("erros.atualizarCartao"));
      }

      toast.success(t("mensagens.atualizadoSucesso"));
      onSalvo();
    } catch (error: any) {
      toast.error(error.message || t("erros.atualizarCartao"));
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Informações Básicas */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
          {t("formulario.informacoesBasicas")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-gray-900 dark:text-white text-sm sm:text-base">
              {t("formulario.nomeCartao")} *
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder={t("formulario.placeholderNome")}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bandeira" className="text-gray-900 dark:text-white text-sm sm:text-base">
              {t("formulario.bandeira")} *
            </Label>
            <Select
              value={formData.bandeira}
              onValueChange={(value) => handleChange("bandeira", value)}
              required
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full">
                <SelectValue
                  placeholder={t("formulario.placeholderBandeira")}
                />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white max-h-60">
                {BANDEIRAS.map((bandeira) => (
                  <SelectItem key={bandeira.value} value={bandeira.value} className="text-sm">
                    {bandeira.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="limite" className="text-gray-900 dark:text-white text-sm sm:text-base">
            {t("formulario.limiteCartao")} *
          </Label>
          <Input
            id="limite"
            type="number"
            step="0.01"
            min="0"
            value={formData.limite}
            onChange={(e) => handleChange("limite", e.target.value)}
            placeholder="0,00"
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
            required
          />
        </div>
      </div>

      {/* Datas do Cartão */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
          {t("formulario.datasCartao")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="diaFechamento"
              className="text-gray-900 dark:text-white text-sm sm:text-base"
            >
              {t("formulario.diaFechamento")} *
            </Label>
            <Input
              id="diaFechamento"
              type="number"
              min="1"
              max="31"
              value={formData.diaFechamento}
              onChange={(e) => handleChange("diaFechamento", e.target.value)}
              placeholder="1-31"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
              required
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t("formulario.dicaFechamento")}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="diaVencimento"
              className="text-gray-900 dark:text-white text-sm sm:text-base"
            >
              {t("formulario.diaVencimento")} *
            </Label>
            <Input
              id="diaVencimento"
              type="number"
              min="1"
              max="31"
              value={formData.diaVencimento}
              onChange={(e) => handleChange("diaVencimento", e.target.value)}
              placeholder="1-31"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full"
              required
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t("formulario.dicaVencimento")}
            </p>
          </div>
        </div>
      </div>

      {/* Personalização */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
          {t("formulario.personalizacao")}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="cor" className="text-gray-900 dark:text-white text-sm sm:text-base">
            {t("formulario.corIdentificacao")}
          </Label>
          <Select
            value={formData.cor}
            onValueChange={(value) => handleChange("cor", value)}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full">
              <SelectValue placeholder={t("formulario.placeholderCor")} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white max-h-60">
              {CORES.map((cor) => (
                <SelectItem key={cor.value} value={cor.value} className="text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: cor.value }}
                    />
                    <span className="truncate">{cor.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="observacoes"
            className="text-gray-900 dark:text-white text-sm sm:text-base"
          >
            {t("formulario.observacoes")}
          </Label>
          <Textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            placeholder={t("formulario.placeholderObservacoes")}
            rows={3}
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm sm:text-base w-full min-h-[80px] resize-y"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-gray-300 dark:border-gray-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancelar}
          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white text-sm sm:text-base w-full sm:w-auto"
        >
          <X className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{t("botoes.cancelar")}</span>
        </Button>
        <Button
          type="submit"
          disabled={salvando}
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {salvando ? t("estados.salvando") : t("botoes.salvarAlteracoes")}
          </span>
        </Button>
      </div>
    </form>
  );
}