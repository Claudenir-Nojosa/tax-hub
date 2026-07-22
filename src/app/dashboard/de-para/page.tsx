"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
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
  Filter,
  FileSpreadsheet,
  X,
  Copy,
  Sparkles,
  Settings,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

interface AISuggestion {
  fromCode: string;
  fromDesc: string;
  suggestedToCode: string;
  suggestedToDesc: string;
  confidence: number;
  reason: string;
}

type View = "upload" | "products" | "manual" | "auto";
type FilterMode = "none" | "excel" | "paste";

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

  // Coleta os códigos 0200 existentes no arquivo original
  const existing0200 = new Set<string>();
  for (const line of lines) {
    const f = line.split("|");
    if (f[1] === "0200") {
      const code = (f[2] || "").trim();
      if (code) existing0200.add(code);
    }
  }

  // Self-mappings (fromCode === toCode) são descartados — não fazem nada útil
  // mas destroem a linha 0200 pelo filtro de duplicidade
  const validMappings = mappings.filter((m) => m.fromCode !== m.toCode);
  if (validMappings.length === 0) return raw;

  const mappingMap = new Map(validMappings.map((m) => [m.fromCode, m.toCode]));

  // Mapa código → UNID_INV do 0200 (campo [6])
  // Usado para corrigir o campo UNID do C170 ao renomear o código
  const unitMap = new Map<string, string>();
  for (const line of lines) {
    const f = line.split("|");
    if (f[1] === "0200") {
      const code = (f[2] || "").trim();
      const unit = (f[6] || "").trim();
      if (code && unit) unitMap.set(code, unit);
    }
  }

  // Remove linhas 0200 duplicadas e atualiza códigos em 0200/C170
  const result = lines
    .filter((line) => {
      const f = line.split("|");
      if (f[1] !== "0200") return true;
      const code = (f[2] || "").trim();
      const toCode = mappingMap.get(code);
      // Se o toCode já tem 0200 no arquivo, exclui esta linha (evita duplicidade)
      return !(toCode && existing0200.has(toCode));
    })
    .map((line) => {
      const f = line.split("|");
      if (f.length < 3) return line;
      for (const m of validMappings) {
        if (f[1] === "0200" && (f[2] || "").trim() === m.fromCode) {
          f[2] = m.toCode;
          return f.join("|");
        }
        if (f[1] === "C170" && (f[3] || "").trim() === m.fromCode) {
          f[3] = m.toCode;
          // Corrige UNID (campo 6) para a unidade do produto de destino no 0200
          const toUnit = unitMap.get(m.toCode);
          if (toUnit) f[6] = toUnit;
          return f.join("|");
        }
      }
      return line;
    });

  // ── Atualiza registros de controle ─────────────────────────────────────────

  // 0990: quantidade de linhas do Bloco 0 (o bloco 0 começa na linha 0)
  const idx0990 = result.findIndex((l) => l.split("|")[1] === "0990");
  if (idx0990 >= 0) {
    const f = result[idx0990].split("|");
    f[2] = String(idx0990 + 1); // bloco 0 vai da linha 0 até idx0990 inclusive
    result[idx0990] = f.join("|");
  }

  // 9900|0200: contagem de registros 0200 no arquivo
  const cnt0200 = result.filter((l) => l.split("|")[1] === "0200").length;
  for (let i = 0; i < result.length; i++) {
    const f = result[i].split("|");
    if (f[1] === "9900" && (f[2] || "").trim() === "0200") {
      f[3] = String(cnt0200);
      result[i] = f.join("|");
      break;
    }
  }

  // 9999: total de linhas do arquivo (exclui strings vazias do split final)
  const totalLines = result.filter((l) => l.length > 0).length;
  for (let i = result.length - 1; i >= 0; i--) {
    const f = result[i].split("|");
    if (f[1] === "9999") {
      f[2] = String(totalLines);
      result[i] = f.join("|");
      break;
    }
  }

  return result.join("\n");
}

// Remove assinatura digital (tudo após o registro 9999) e corrige o QTD_LIN
function stripSignature(text: string): string {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.split("|")[1] === "9999");
  if (idx < 0) return text;

  const result = lines.slice(0, idx + 1);

  // Atualiza QTD_LIN: o total de linhas é exatamente result.length (idx + 1)
  const f = result[idx].split("|");
  f[2] = String(result.length);
  result[idx] = f.join("|");

  return result.join("\n") + "\n";
}

// ── Componente principal ───────────────────────────────────────────────────

export default function DeParaPage() {
  const [view, setView] = useState<View>("upload");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [rawEFD, setRawEFD] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // busca na lista de produtos
  const [search, setSearch] = useState("");

  // mapeamentos manuais definidos
  const [mappings, setMappings] = useState<Mapping[]>([]);

  // Filtro de produtos
  const [filterMode, setFilterMode] = useState<FilterMode>("none");
  const [filterCodes, setFilterCodes] = useState<Set<string>>(new Set());
  const [pasteText, setPasteText] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // modal de novo mapeamento
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newCodeSearch, setNewCodeSearch] = useState("");

  // opção de remoção de assinatura digital
  const [stripSig, setStripSig] = useState(false);

  // IA State
  const [showAISettings, setShowAISettings] = useState(false);
  const [customRules, setCustomRules] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showAIConfirmation, setShowAIConfirmation] = useState(false);

  // busca na lista de produtos de destino dentro do modal
  const modalProducts = products.filter((p) => {
    const q = newCodeSearch.toLowerCase();
    return !q || p.code.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
  });

  // Produtos exibidos (com filtro aplicado)
  const displayedProducts = filteredProducts.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.code.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
  });

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { products, raw } = parseEFD(text);
      setProducts(products);
      setFilteredProducts(products);
      setRawEFD(raw);
      setFilterMode("none");
      setFilterCodes(new Set());
      setPasteText("");
      setView("products");
      toast.success(`${products.length} produtos encontrados no arquivo`);
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
    setFilteredProducts([]);
    setRawEFD("");
    setFileName("");
    setSearch("");
    setMappings([]);
    setFilterMode("none");
    setFilterCodes(new Set());
    setPasteText("");
    setAiSuggestions([]);
    setStripSig(false);
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
const clearAllMappings = () => {
  toast.custom((t) => (
    <div className="bg-card rounded-lg shadow-lg border border-border p-4 max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Limpar todos os mapeamentos?
          </h3>
          <p className="text-xs text-muted-foreground">
            Esta ação irá remover todos os {mappings.length} mapeamentos definidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.dismiss(t)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMappings([]);
                toast.dismiss(t);
                toast.success("Todos os mapeamentos foram removidos");
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, limpar tudo
            </Button>
          </div>
        </div>
      </div>
    </div>
  ), { duration: Infinity });
};

  const downloadResult = () => {
    if (mappings.length === 0 && !stripSig) {
      toast.error("Nenhum mapeamento definido.");
      return;
    }
    let result = mappings.length > 0 ? applyMappings(rawEFD, mappings) : rawEFD;
    if (stripSig) result = stripSignature(result);
    const blob = new Blob([result], { type: "text/plain;charset=latin1" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".txt", "_depara.txt");
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo gerado com sucesso.");
  };

  // Importar mapeamentos do Excel
  const importMappingsFromExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      const newMappings: Mapping[] = [];
      const errors: string[] = [];
      
      // Detecta se tem cabeçalho
      const firstRow = jsonData[0] as any[];
      const hasHeader = firstRow && 
                        (firstRow[0]?.toString().toLowerCase().includes('código') || 
                         firstRow[0]?.toString().toLowerCase().includes('codigo') ||
                         firstRow[1]?.toString().toLowerCase().includes('código') ||
                         firstRow[1]?.toString().toLowerCase().includes('codigo'));
      
      const startRow = hasHeader ? 1 : 0;
      
      for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length < 2) continue;
        
        const fromCode = row[0]?.toString().trim();
        const toCode = row[1]?.toString().trim();
        
        if (fromCode && toCode && fromCode !== toCode) {
          // Verifica se o código existe nos produtos
          const product = products.find(p => p.code === fromCode);
          if (product) {
            newMappings.push({
              fromCode: fromCode,
              fromDesc: product.desc,
              toCode: toCode
            });
          } else {
            errors.push(fromCode);
          }
        }
      }
      
      if (newMappings.length > 0) {
        setMappings(prev => {
          // Remove mapeamentos antigos que serão substituídos
          const filtered = prev.filter(m => !newMappings.some(nm => nm.fromCode === m.fromCode));
          return [...filtered, ...newMappings];
        });
        
        toast.success(`${newMappings.length} mapeamentos importados com sucesso!`);
        if (errors.length > 0) {
          toast.warning(`${errors.length} códigos não encontrados: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
        }
      } else {
        toast.error("Nenhum mapeamento válido encontrado no arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Processar arquivo Excel para filtro
  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      const codes = new Set<string>();
      jsonData.forEach((row: any) => {
        if (row[0] && typeof row[0] === "string") {
          const code = row[0].trim();
          if (code) codes.add(code);
        } else if (row[0] && typeof row[0] === "number") {
          const code = row[0].toString().trim();
          if (code) codes.add(code);
        }
      });
      
      applyFilter(codes);
    };
    reader.readAsArrayBuffer(file);
  };

  // Processar texto colado
  const processPastedText = () => {
    const codes = new Set<string>();
    const lines = pasteText.split(/\r?\n/);
    lines.forEach(line => {
      const code = line.trim();
      if (code) codes.add(code);
    });
    applyFilter(codes);
    setShowFilterModal(false);
  };

  // Aplicar filtro
  const applyFilter = (codes: Set<string>) => {
    if (codes.size === 0) {
      toast.warning("Nenhum código válido encontrado");
      return;
    }
    
    const filtered = products.filter(product => codes.has(product.code));
    
    if (filtered.length === 0) {
      toast.error(`Nenhum produto encontrado com os códigos fornecidos. Verifique se os códigos estão corretos.`);
      return;
    }
    
    setFilterCodes(codes);
    setFilteredProducts(filtered);
    toast.success(`Filtro aplicado: ${filtered.length} produtos encontrados de ${products.length} no total`);
    setShowFilterModal(false);
  };

  // Limpar filtro
  const clearFilter = () => {
    setFilteredProducts(products);
    setFilterMode("none");
    setFilterCodes(new Set());
    setPasteText("");
    toast.info("Filtro removido. Todos os produtos visíveis novamente.");
  };

  // IA Functions
  const processAIMappings = async () => {
    if (products.length === 0) {
      toast.error("Nenhum produto carregado. Importe um arquivo EFD primeiro.");
      return;
    }

    setIsProcessingAI(true);
    
    try {
      const response = await fetch("/api/ai/depara", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: filteredProducts,
          customRules: customRules,
          currentMappings: mappings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar IA");
      }

      const data = await response.json();
      setAiSuggestions(data.suggestions);
      setShowAIConfirmation(true);
      toast.success(`IA encontrou ${data.suggestions.length} sugestões de mapeamento`);
    } catch (error) {
      console.error("Erro na IA:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar IA");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const applyAISuggestions = () => {
    const newMappings = [...mappings];
    
    aiSuggestions.forEach(suggestion => {
      const existingIndex = newMappings.findIndex(m => m.fromCode === suggestion.fromCode);
      if (existingIndex !== -1) {
        newMappings.splice(existingIndex, 1);
      }
      
      newMappings.push({
        fromCode: suggestion.fromCode,
        fromDesc: suggestion.fromDesc,
        toCode: suggestion.suggestedToCode,
      });
    });
    
    setMappings(newMappings);
    setShowAIConfirmation(false);
    setAiSuggestions([]);
    toast.success(`${aiSuggestions.length} mapeamentos aplicados com sucesso!`);
    setView("manual");
  };

  const rejectAISuggestion = (fromCode: string) => {
    setAiSuggestions(prev => prev.filter(s => s.fromCode !== fromCode));
    toast.info("Sugestão rejeitada");
  };

  const processLocalPatterns = () => {
    const localSuggestions: AISuggestion[] = [];
    
    for (const product of filteredProducts) {
      const code = product.code;
      
      if (code.toLowerCase().includes('get')) {
        const numbers = code.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          let baseCode = numbers[0].replace(/^0+/, '');
          const targetProduct = filteredProducts.find(p => p.code === baseCode);
          
          if (targetProduct && targetProduct.code !== product.code) {
            localSuggestions.push({
              fromCode: product.code,
              fromDesc: product.desc,
              suggestedToCode: targetProduct.code,
              suggestedToDesc: targetProduct.desc,
              confidence: 0.95,
              reason: `Padrão GET identificado: "${product.code}" deve ser padronizado para "${targetProduct.code}"`
            });
          } else if (baseCode) {
            localSuggestions.push({
              fromCode: product.code,
              fromDesc: product.desc,
              suggestedToCode: baseCode,
              suggestedToDesc: `Produto ${baseCode} (sugerido)`,
              confidence: 0.90,
              reason: `Código com prefixo GET contém o número ${baseCode}. Recomenda-se padronizar para este código.`
            });
          }
        }
      }
    }
    
    setAiSuggestions(localSuggestions);
    setShowAIConfirmation(true);
    
    if (localSuggestions.length === 0) {
      toast.info("Nenhum padrão GET encontrado nos produtos");
    } else {
      toast.success(`${localSuggestions.length} padrões identificados localmente`);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  if (view === "upload") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            De-Para de Produtos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40 hover:bg-accent/40"
            }
          `}
        >
          <div className="p-4 rounded-full bg-muted group-hover:bg-accent transition-colors">
            <Upload className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              Importar arquivo EFD ICMS IPI
            </p>
            <p className="text-sm text-muted-foreground mt-1">
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
    <div className="max-w-6xl mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            De-Para de Produtos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
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
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setView("products")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            view === "products"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Produtos
          <span className="ml-2 text-xs text-muted-foreground">
            {displayedProducts.length.toLocaleString("pt-BR")}
            {filteredProducts.length !== products.length && 
              ` / ${products.length.toLocaleString("pt-BR")}`
            }
          </span>
        </button>
        <button
          onClick={() => setView("manual")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            view === "manual"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          De-Para Manual
          {mappings.length > 0 && (
            <Badge className="ml-1 bg-primary/15 text-primary border-0 text-xs h-5">
              {mappings.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setView("auto")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            view === "auto"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          De-Para Automático
        </button>
      </div>

      {/* ── Tab: Produtos ── */}
      {view === "products" && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilterModal(true)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtrar
              {filterCodes.size > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filteredProducts.length}
                </Badge>
              )}
            </Button>
            {filterCodes.size > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilter}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {filterCodes.size > 0 && (
            <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Filtro ativo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mostrando {filteredProducts.length} de {products.length} produtos
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(filterCodes).slice(0, 5).map(code => (
                      <Badge key={code} variant="secondary" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                    {filterCodes.size > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{filterCodes.size - 5} códigos
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <PackageSearch className="h-10 w-10 mb-3" />
              <p className="text-sm">Nenhum produto encontrado.</p>
              {filterCodes.size > 0 && (
                <Button
                  variant="link"
                  onClick={clearFilter}
                  className="mt-2 text-sm"
                >
                  Limpar filtro
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-accent/60">
                    <TableHead className="w-44 font-medium text-muted-foreground">Código</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Descrição</TableHead>
                    <TableHead className="w-32 text-right font-medium text-muted-foreground">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProducts.map((product) => {
                    const mapped = mappings.find((m) => m.fromCode === product.code);
                    return (
                      <TableRow
                        key={product.code}
                        className="hover:bg-accent/60 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-foreground">
                              {product.code}
                            </span>
                            {mapped && (
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-mono">{mapped.toCode}</span>
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {product.desc}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
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
              <div className="px-4 py-2.5 border-t border-border bg-muted">
                <p className="text-xs text-muted-foreground">
                  {displayedProducts.length.toLocaleString("pt-BR")} de{" "}
                  {filteredProducts.length.toLocaleString("pt-BR")} produtos exibidos
                </p>
              </div>
            </div>
          )}
        </>
      )}

{/* ── Tab: De-Para Manual ── */}
{view === "manual" && (
  <>
    <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
      <div className="flex gap-2">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          id="mapping-excel-upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importMappingsFromExcel(file);
          }}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById("mapping-excel-upload")?.click()}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Importar mapeamentos do Excel
        </Button>
      </div>
      {mappings.length > 0 && (
        <Button
          variant="outline"
          onClick={clearAllMappings}
          className="gap-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4" />
          Limpar todos
        </Button>
      )}
    </div>

    {mappings.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Wand2 className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum mapeamento definido ainda.
        </p>
        <p className="text-xs mt-1">
          Vá para a aba Produtos e clique em "Mapear" nos produtos desejados, ou importe um arquivo Excel com os mapeamentos.
        </p>
      </div>
    ) : (
      <>
        <div className="rounded-lg border border-border overflow-hidden mb-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-accent/60">
                <TableHead className="font-medium text-muted-foreground">Código atual</TableHead>
                <TableHead className="font-medium text-muted-foreground">Descrição atual</TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-medium text-muted-foreground">Novo código</TableHead>
                <TableHead className="w-20 text-right font-medium text-muted-foreground">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.fromCode} className="hover:bg-accent/60 transition-colors">
                  <TableCell className="font-mono text-sm text-muted-foreground line-through">
                    {m.fromCode}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.fromDesc}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                    {m.toCode}
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
          <div className="px-4 py-2.5 border-t border-border bg-muted flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {mappings.length} mapeamento{mappings.length !== 1 ? "s" : ""} definido{mappings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

      </>
    )}

    {/* Opções de exportação — sempre visíveis na aba */}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
      <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={stripSig}
          onChange={(e) => setStripSig(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        Excluir assinatura digital do arquivo
      </label>
      {(mappings.length > 0 || stripSig) && (
        <Button onClick={downloadResult} className="gap-2">
          <Download className="h-4 w-4" />
          Gerar arquivo com de-para aplicado
        </Button>
      )}
    </div>
  </>
)}

      {/* ── Tab: De-Para Automático ── */}
      {view === "auto" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">
                  Configuração da IA
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAISettings(!showAISettings)}
              >
                {showAISettings ? "Ocultar" : "Mostrar"} regras
              </Button>
            </div>

            {showAISettings && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Regras personalizadas (opcional)
                </label>
                <Textarea
                  placeholder={`Exemplo:
- Todo código que começa com "GET" deve ser mapeado para o mesmo código sem o "GET"
- Códigos numéricos devem ser priorizados sobre alfanuméricos
- Manter apenas números nos códigos`}
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva as regras que a IA deve seguir para sugerir os mapeamentos.
                </p>
              </div>
            )}
          </div>

          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>A IA analisará todos os produtos carregados</li>
                  <li>Identificará similaridades entre códigos e descrições</li>
                  <li>Seguirá as regras personalizadas que você definir (se houver)</li>
                  <li>Gerará sugestões de mapeamento para sua aprovação</li>
                  <li>Você poderá revisar cada sugestão antes de aplicar</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={processLocalPatterns}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Identificar Padrões Locais
            </Button>
            <Button
              onClick={processAIMappings}
              disabled={isProcessingAI || products.length === 0}
              size="lg"
              className="gap-2"
            >
              {isProcessingAI ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Processar com IA
                </>
              )}
            </Button>
          </div>

          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {products.length}
                </p>
                <p className="text-xs text-muted-foreground">Total de produtos</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {mappings.length}
                </p>
                <p className="text-xs text-muted-foreground">Mapeamentos já definidos</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {products.length - mappings.length}
                </p>
                <p className="text-xs text-muted-foreground">Pendentes de mapeamento</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Filtrar produtos ── */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Filtrar produtos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Opção 1: Enviar arquivo Excel
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="excel-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processExcelFile(file);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("excel-upload")?.click()}
                  className="flex-1 gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Selecionar arquivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                O arquivo deve ter uma coluna com os códigos dos produtos
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-background text-muted-foreground">ou</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Opção 2: Colar códigos manualmente
              </p>
              <textarea
                placeholder="Cole os códigos aqui, um por linha&#10;Exemplo:&#10;3127&#10;GET3127&#10;4567"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                onClick={processPastedText}
                disabled={!pasteText.trim()}
                className="w-full mt-3 gap-2"
              >
                <Copy className="h-4 w-4" />
                Aplicar filtro
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterModal(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmação de Sugestões da IA ── */}
      <Dialog open={showAIConfirmation} onOpenChange={setShowAIConfirmation}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Sugestões da IA
            </DialogTitle>
            <DialogDescription>
              A IA sugere os seguintes mapeamentos baseados nas regras e similaridades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.fromCode}
                className="rounded-lg border border-border p-4 hover:bg-accent/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="bg-primary/10">
                        Confiança: {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Código atual</p>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {suggestion.fromCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.fromDesc}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Sugestão de novo código</p>
                        <p className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                          {suggestion.suggestedToCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.suggestedToDesc}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Motivo:</span> {suggestion.reason}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => rejectAISuggestion(suggestion.fromCode)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAIConfirmation(false)}>
              Cancelar
            </Button>
            <Button onClick={applyAISuggestions} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Aplicar {aiSuggestions.length} sugestões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Selecionar novo código ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mapear código</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Código atual</p>
                  <p className="font-mono text-sm font-medium text-foreground">
                    {selectedProduct.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedProduct.desc}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Novo código
                </p>
                <Input
                  placeholder="Digite o novo código diretamente..."
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="font-mono mb-3"
                />

                <p className="text-xs text-muted-foreground mb-2">
                  Ou selecione um código existente:
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={newCodeSearch}
                    onChange={(e) => setNewCodeSearch(e.target.value)}
                    className="pl-8 text-sm h-8"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  {modalProducts
                    .filter((p) => p.code !== selectedProduct.code)
                    .slice(0, 50)
                    .map((p) => (
                      <button
                        key={p.code}
                        onClick={() => setNewCode(p.code)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-accent/60 ${
                          newCode === p.code ? "bg-primary/10" : ""
                        }`}
                      >
                        {newCode === p.code && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        )}
                        <span className="font-mono text-foreground">{p.code}</span>
                        <span className="text-muted-foreground truncate text-xs">{p.desc}</span>
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