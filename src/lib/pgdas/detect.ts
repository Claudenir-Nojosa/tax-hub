import type { TipoDocumentoPgdas } from "./types"

// Decide DECLARACAO vs EXTRATO a partir do texto extraído do PDF.
// Âncoras confirmadas no texto real extraído via unpdf:
//   Declaração: "Programa Gerador do Documento de Arrecadação do Simples Nacional -
//                Declaratório ... Declaração Retificadora"
//   Extrato:    "Extrato do Simples Nacional"
export function detectarTipoDocumento(texto: string): TipoDocumentoPgdas | null {
  if (/Extrato do Simples Nacional/i.test(texto)) return "EXTRATO"
  if (/Declarat[óo]rio/i.test(texto)) return "DECLARACAO"
  return null
}
