import { dateKeyLocal, type Carta, type TipoCarta } from "@/lib/estudo-data";
import { fmtHoras } from "../trilha/trilha-ui";

export function novoId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtEta(paginasRestantes: number, pagPorHora: number | null): string | null {
  if (pagPorHora === null || pagPorHora <= 0 || paginasRestantes <= 0) return null;
  return fmtHoras(Math.round((paginasRestantes / pagPorHora) * 60));
}

export function fmtCrono(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function novaCartaManual(dados: {
  tipo: TipoCarta; materia: string; topico?: string; frente: string; verso: string; gabarito?: "verdadeiro" | "falso";
}): Carta {
  const hoje = dateKeyLocal();
  return {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    tipo: dados.tipo,
    materia: dados.materia,
    topico: dados.topico,
    frente: dados.frente.trim(),
    verso: dados.verso.trim(),
    gabarito: dados.tipo === "armadilha" ? dados.gabarito : undefined,
    intervalo: 0,
    facilidade: 2.5,
    repeticoes: 0,
    proximaRevisao: hoje,
    criada: hoje,
    acertos: 0,
    erros: 0,
  };
}
