"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Search,
  RefreshCw,
  PackageSearch,
  ArrowRight,
  Pencil,
  Download,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Product {
  code: string;
  desc: string;
}

interface Mapping {
  fromCode: string;
  fromDesc: string;
  toCode: string;
}

type View = "upload" | "products" | "manual";

// ── Parser EFD ─────────────────────────────────────────────────────────────

function parseEFD(text: string): { products: Product[]; raw: string } {
  const lines = text.split(/\r?\n/);
  const map = new Map<string, string>();

  for (const line of lines) {
    const fields = line.split("|");
    if (fields.length < 3) continue;
    const reg = fields[1];

    if (reg === "0200") {
      const code = (fields[2] || "").trim();
      const desc = (fields[3] || "").trim();
      if (!code) continue;
      if (!map.has(code)) map.set(code, desc || "—");
    } else if (reg === "C170") {
      const code = (fields[3] || "").trim();
      const desc = (fields[4] || "").trim();
      if (!code) continue;
      if (!map.has(code)) map.set(code, desc || "—");
    }
  }

  const products = Array.from(map.entries())
    .map(([code, desc]) => ({ code, desc }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return { products, raw: text };
}

// Aplica os mapeamentos no texto EFD e retorna o novo conteúdo
function applyMappings(raw: string, mappings: Mapping[]): string {
  if (mappings.length === 0) return raw;

  const lines = raw.split(/\r?\n/);
  return lines
    .map((line) => {
      const fields = line.split("|");
      if (fields.length < 3) return line;
      const reg = fields[1];

      for (const m of mappings) {
        if (reg === "0200" && fields[2]?.trim() === m.fromCode) {
          fields[2] = m.toCode;
          return fields.join("|");
        }
        if (reg === "C170" && fields[3]?.trim() === m.fromCode) {
          fields[3] = m.toCode;
          return fields.join("|");
        }
      }
      return line;
    })
    .join("\n");
}

// ── Componente principal ───────────────────────────────────────────────────

export default function DeParaPage() {
  const [view, setView] = useState<View>("upload");
  const [products, setProducts] = useState<Product[]>([]);
  const [rawEFD, setRawEFD] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // busca na lista de produtos
  const [search, setSearch] = useState("");

  // mapeamentos manuais definidos
  const [mappings, setMappings] = useState<Mapping[]>([]);

  // modal de novo mapeamento
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newCodeSearch, setNewCodeSearch] = useState("");

  // busca na lista de produtos de destino dentro do modal
  const modalProducts = products.filter((p) => {
    const q = newCodeSearch.toLowerCase();
    return !q || p.code.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
  });

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { products, raw } = parseEFD(text);
      setProducts(products);
      setRawEFD(raw);
      setView("products");
    };
    reader.readAsText(file, "latin1");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const reset = () => {
    setProducts([]);
    setRawEFD("");
    setFileName("");
    setSearch("");
    setMappings([]);
    setView("upload");
    if (inputRef.current) inputRef.current.value = "";
  };

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setNewCode("");
    setNewCodeSearch("");
    setModalOpen(true);
  };

  const confirmMapping = () => {
    if (!selectedProduct || !newCode.trim()) return;
    if (newCode.trim() === selectedProduct.code) {
      toast.error("O novo código é igual ao código atual.");
      return;
    }
    setMappings((prev) => {
      const filtered = prev.filter((m) => m.fromCode !== selectedProduct.code);
      return [
        ...filtered,
        {
          fromCode: selectedProduct.code,
          fromDesc: selectedProduct.desc,
          toCode: newCode.trim(),
        },
      ];
    });
    setModalOpen(false);
    toast.success(`Mapeamento adicionado: ${selectedProduct.code} → ${newCode.trim()}`);
  };

  const removeMapping = (fromCode: string) => {
    setMappings((prev) => prev.filter((m) => m.fromCode !== fromCode));
  };

  const downloadResult = () => {
    if (mappings.length === 0) {
      toast.error("Nenhum mapeamento definido.");
      return;
    }
    const result = applyMappings(rawEFD, mappings);
    const blob = new Blob([result], { type: "text/plain;charset=latin1" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".txt", "_depara.txt");
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo gerado com sucesso.");
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.code.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
  });

  // ── Upload ────────────────────────────────────────────────────────────────

  if (view === "upload") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            De-Para de Produtos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Importe o arquivo EFD ICMS IPI para iniciar o processo de de-para.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            group cursor-pointer rounded-xl border-2 border-dashed px-8 py-16
            flex flex-col items-center justify-center gap-4 transition-colors
            ${dragging
              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40"
            }
          `}
        >
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
            <Upload className="h-7 w-7 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900 dark:text-white">
              Importar arquivo EFD ICMS IPI
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Clique ou arraste o arquivo <span className="font-mono">.txt</span> aqui
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>
    );
  }

  // ── Lista de produtos + tabs ──────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            De-Para de Produtos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {fileName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Novo arquivo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setView("products")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            view === "products"
              ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Produtos
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            {products.length.toLocaleString("pt-BR")}
          </span>
        </button>
        <button
          onClick={() => setView("manual")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            view === "manual"
              ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          De-Para Manual
          {mappings.length > 0 && (
            <Badge className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs h-5">
              {mappings.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ── Tab: Produtos ── */}
      {view === "products" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
              <PackageSearch className="h-10 w-10 mb-3" />
              <p className="text-sm">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableHead className="w-44 font-medium text-gray-600 dark:text-gray-400">Código</TableHead>
                    <TableHead className="font-medium text-gray-600 dark:text-gray-400">Descrição</TableHead>
                    <TableHead className="w-32 text-right font-medium text-gray-600 dark:text-gray-400">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const mapped = mappings.find((m) => m.fromCode === product.code);
                    return (
                      <TableRow
                        key={product.code}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                              {product.code}
                            </span>
                            {mapped && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-mono">{mapped.toCode}</span>
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                          {product.desc}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            onClick={() => openModal(product)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            {mapped ? "Alterar" : "Mapear"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredProducts.length.toLocaleString("pt-BR")} de{" "}
                  {products.length.toLocaleString("pt-BR")} produtos
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: De-Para Manual ── */}
      {view === "manual" && (
        <>
          {mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
              <Wand2 className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nenhum mapeamento definido ainda.
              </p>
              <p className="text-xs mt-1">
                Vá para a aba Produtos e clique em "Mapear" nos produtos desejados.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <TableHead className="font-medium text-gray-600 dark:text-gray-400">Código atual</TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-medium text-gray-600 dark:text-gray-400">Novo código</TableHead>
                      <TableHead className="font-medium text-gray-600 dark:text-gray-400">Descrição</TableHead>
                      <TableHead className="w-20 text-right font-medium text-gray-600 dark:text-gray-400">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.fromCode} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <TableCell className="font-mono text-sm text-gray-500 dark:text-gray-400 line-through">
                          {m.fromCode}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          <ArrowRight className="h-4 w-4" />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {m.toCode}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                          {m.fromDesc}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => removeMapping(m.fromCode)}
                          >
                            Remover
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {mappings.length} mapeamento{mappings.length !== 1 ? "s" : ""} definido{mappings.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={downloadResult} className="gap-2">
                  <Download className="h-4 w-4" />
                  Gerar arquivo com de-para aplicado
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Modal: Selecionar novo código ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mapear código</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Código atual</p>
                  <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {selectedProduct.code}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedProduct.desc}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Novo código
                </p>
                <Input
                  placeholder="Digite o novo código diretamente..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="font-mono mb-3"
                />

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Ou selecione um código existente:
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar produto..."
                    value={newCodeSearch}
                    onChange={(e) => setNewCodeSearch(e.target.value)}
                    className="pl-8 text-sm h-8"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  {modalProducts
                    .filter((p) => p.code !== selectedProduct.code)
                    .slice(0, 50)
                    .map((p) => (
                      <button
                        key={p.code}
                        onClick={() => setNewCode(p.code)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                          newCode === p.code ? "bg-blue-50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {newCode === p.code && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                        <span className="font-mono text-gray-900 dark:text-white">{p.code}</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate text-xs">{p.desc}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmMapping} disabled={!newCode.trim()}>
              Confirmar mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}