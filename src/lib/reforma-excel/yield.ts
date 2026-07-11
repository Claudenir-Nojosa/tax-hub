// Devolve o controle ao event loop do browser por um instante — sem isso, os loops pesados do
// gerador de Excel (até ~140 mil linhas de fórmula) rodam 100% síncronos e o Chrome mostra
// "Página sem resposta" porque a aba fica sem processar repaint/input pelo tempo todo. Chamar
// isso a cada N iterações de um loop grande permite a UI atualizar (barra de progresso) e evita
// o aviso de travamento, ao custo de não deixar a geração mais rápida — só mais responsiva.
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
