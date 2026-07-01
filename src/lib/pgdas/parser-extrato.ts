import type { ArrecadacaoDas, DasGerado, DasPagoAnterior } from "./types"
import { parseNumeroBR } from "./text-utils"

// Seção 5: "DAS deste PA que foram reconhecidos como pagos até a data da apuração"
export function extrairDasPagoAnterior(texto: string): DasPagoAnterior {
  if (/N[ãa]o foram identificados DAS pagos/i.test(texto)) {
    return { reconhecido: false }
  }
  // Formato "tem pagamento" ainda não observado numa amostra real do usuário — fallback seguro,
  // não lança exceção. Precisa validar com um PDF real quando um DAS anterior tiver sido pago.
  console.warn("[pgdas] seção 5 (DAS pago anterior) com formato não reconhecido — assumindo reconhecido:false")
  return { reconhecido: false }
}

// Seção 6: "Informações sobre DAS Gerado" — formato label-valor intercalado (diferente das
// tabelas de cabeçalho+valores usadas no resto do documento), confirmado no texto real extraído:
// "IRPJ 389,71 CSLL 248,00 COFINS 902,70 PIS/PASEP 195,56 INSS/CPP 2.975,94 ICMS 2.373,67
//  IPI 0,00 ISS 0,00 Principal 7.085,58 Multa 1.417,12 Juros 309,64 Total 8.812,34"
const DAS_GERADO_RE =
  /IRPJ\s+([\d.,]+)\s+CSLL\s+([\d.,]+)\s+COFINS\s+([\d.,]+)\s+PIS\/PASEP\s+([\d.,]+)\s+INSS\/CPP\s+([\d.,]+)\s+ICMS\s+([\d.,]+)\s+IPI\s+([\d.,]+)\s+ISS\s+([\d.,]+)\s+Principal\s+([\d.,]+)\s+Multa\s+([\d.,]+)\s+Juros\s+([\d.,]+)\s+Total\s+([\d.,]+)/i

export function extrairDasGerado(texto: string): DasGerado | undefined {
  const secaoMatch = texto.match(/6\)\s*Informa[cç][õo]es sobre DAS Gerado/i)
  if (!secaoMatch || secaoMatch.index === undefined) return undefined

  const janela = texto.slice(secaoMatch.index)
  const numero = janela.match(/N[úu]mero:\s*([\d.]+)/i)?.[1] ?? ""
  const dataVencimento = janela.match(/Data de Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? ""
  const dataLimiteAcolhimento = janela.match(/Data limite[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? ""

  const valores = janela.match(DAS_GERADO_RE)
  if (!valores) return undefined

  const [irpj, csll, cofins, pisPasep, inssCpp, icms, ipi, iss, principal, multa, juros, total] = valores
    .slice(1)
    .map(parseNumeroBR)

  return {
    numero,
    dataVencimento,
    dataLimiteAcolhimento,
    tributos: {
      irpj,
      csll,
      cofins,
      pisPasep,
      inssCpp,
      icms,
      ipi,
      iss,
      total: irpj + csll + cofins + pisPasep + inssCpp + icms + ipi + iss,
    },
    principal,
    multa,
    juros,
    total,
  }
}

// Seção 6.2: "Informações da Arrecadação do DAS gerado nesta apuração"
export function extrairArrecadacaoDas(texto: string): ArrecadacaoDas {
  const secaoMatch = texto.match(/6\.2\)?\s*Informa[cç][õo]es da Arrecada[cç][ãa]o do DAS/i)
  const janela = secaoMatch && secaoMatch.index !== undefined ? texto.slice(secaoMatch.index) : texto

  if (/N[ãa]o foi reconhecido pagamento at[ée] a presente data/i.test(janela)) {
    return { reconhecido: false }
  }

  // Formato "tem pagamento" ainda não observado numa amostra real do usuário — fallback seguro.
  // Precisa validar com um PDF real onde um DAS foi efetivamente pago para completar este caso.
  console.warn("[pgdas] seção 6.2 (arrecadação do DAS) com formato não reconhecido — assumindo reconhecido:false")
  return { reconhecido: false }
}
