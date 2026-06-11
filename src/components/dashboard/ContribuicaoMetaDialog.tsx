// components/ContribuicaoMetaDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Target } from "lucide-react";

// Interface simplificada apenas para o diálogo
interface CategoriaDialog {
  id: string;
  nome: string;
  tipo: string;
  cor: string | null;
  icone: string | null;
}

interface ContribuicaoMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metaTitulo: string;
  valorContribuicao: number;
  onConfirmar: (data: {
    lancarComoDespesa: boolean;
    categoriaId?: string;
    novaCategoriaNome?: string;
  }) => void;
  categorias: CategoriaDialog[]; // 👈 Use a interface simplificada
  carregando: boolean;
}

export function ContribuicaoMetaDialog({
  open,
  onOpenChange,
  metaTitulo,
  valorContribuicao,
  onConfirmar,
  categorias,
  carregando,
}: ContribuicaoMetaDialogProps) {
  const [lancarComoDespesa, setLancarComoDespesa] = useState<boolean>(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("");
  const [novaCategoriaNome, setNovaCategoriaNome] = useState<string>("");
  const [criarNovaCategoria, setCriarNovaCategoria] = useState<boolean>(false);

  // Resetar form quando abrir
  useEffect(() => {
    if (open) {
      setLancarComoDespesa(true);
      setCategoriaSelecionada("");
      setNovaCategoriaNome("");
      setCriarNovaCategoria(false);
    }
  }, [open]);

  const categoriasDespesa = categorias.filter((cat) => cat.tipo === "DESPESA");

  const handleConfirmar = () => {
    if (lancarComoDespesa) {
      if (criarNovaCategoria && !novaCategoriaNome.trim()) {
        alert("Digite um nome para a nova categoria");
        return;
      }

      if (!criarNovaCategoria && !categoriaSelecionada) {
        alert("Selecione uma categoria");
        return;
      }
    }

    onConfirmar({
      lancarComoDespesa,
      categoriaId: criarNovaCategoria ? undefined : categoriaSelecionada,
      novaCategoriaNome: criarNovaCategoria ? novaCategoriaNome : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Contribuir para Meta
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Adicionar R$ {valorContribuicao.toFixed(2)} à meta "{metaTitulo}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Opção de lançar como despesa */}
          <div className="space-y-3">
            <Label className="text-white">Deseja lançar como despesa?</Label>
            <RadioGroup
              value={lancarComoDespesa ? "sim" : "nao"}
              onValueChange={(value) => setLancarComoDespesa(value === "sim")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="sim" />
                <Label htmlFor="sim" className="text-gray-300 cursor-pointer">
                  Sim, lançar como despesa
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="nao" />
                <Label htmlFor="nao" className="text-gray-300 cursor-pointer">
                  Não, apenas contribuir
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seção de categoria (apenas se for lançar como despesa) */}
          {lancarComoDespesa && (
            <div className="space-y-3 border border-gray-700 rounded-lg p-3">
              <Label className="text-white">Categoria da Despesa</Label>

              {/* Opção de usar categoria existente */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  id="categoria-existente"
                  value="existente"
                  checked={!criarNovaCategoria}
                  onClick={() => setCriarNovaCategoria(false)} // 👈 Use onClick
                />
                <Label
                  htmlFor="categoria-existente"
                  className="text-gray-300 cursor-pointer flex-1"
                >
                  Usar categoria existente
                </Label>
              </div>

              {!criarNovaCategoria && (
                <Select
                  value={categoriaSelecionada}
                  onValueChange={setCategoriaSelecionada}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {categoriasDespesa.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: categoria.cor || "#6B7280",
                            }}
                          />
                          {categoria.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {!criarNovaCategoria && (
                <Select
                  value={categoriaSelecionada}
                  onValueChange={setCategoriaSelecionada}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {categoriasDespesa.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: categoria.cor || "#6B7280", // Fallback para cinza
                            }}
                          />
                          {categoria.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Resumo */}
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-300">
              <strong>Resumo:</strong> Contribuir com{" "}
              <Badge variant="outline" className="ml-1">
                R$ {valorContribuicao.toFixed(2)}
              </Badge>{" "}
              {lancarComoDespesa && "e lançar como despesa"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={carregando}
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            {carregando ? "Processando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
