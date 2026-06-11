import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCNPJ(cnpj: string) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function formatRegime(regime: string) {
  const regimes: Record<string, string> = {
    SIMPLES_NACIONAL: "Simples Nacional",
    LUCRO_PRESUMIDO: "Lucro Presumido",
    LUCRO_REAL: "Lucro Real",
  };
  return regimes[regime] || regime;
}

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Normaliza para decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/[^\w\-]+/g, ""); // Remove caracteres não alfanuméricos
}

export function formatResponsavel(responsavel: string): string {
  const formatMap: Record<string, string> = {
    CLAUDENIR: "Claudenir",
  };

  return formatMap[responsavel] || responsavel;
}

export function formatarDataParaExibição(data: Date | string | null): string {
  if (!data) return "-";
  
  try {
    const dataObj = new Date(data);
    
    if (isNaN(dataObj.getTime())) {
      return "-";
    }
    
    // Ajustar para fuso horário local
    const dataAjustada = new Date(dataObj.getTime() + dataObj.getTimezoneOffset() * 60000);
    
    return format(dataAjustada, "dd/MM/yyyy", {
      locale: ptBR,
    });
  } catch {
    return "-";
  }
}

export function formatarDataParaBanco(data: Date): string {
  if (!data || isNaN(data.getTime())) {
    throw new Error("Data inválida para salvar no banco");
  }
  return format(data, "yyyy-MM-dd");
}