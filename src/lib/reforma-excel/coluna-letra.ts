// Conversão índice de coluna (1-based, A=1) → letra Excel — compartilhada entre os módulos do
// gerador de Excel da Reforma Tributária.
export function colLetra(indice1Based: number): string {
  let n = indice1Based
  let letra = ""
  while (n > 0) {
    const resto = (n - 1) % 26
    letra = String.fromCharCode(65 + resto) + letra
    n = Math.floor((n - 1) / 26)
  }
  return letra
}
