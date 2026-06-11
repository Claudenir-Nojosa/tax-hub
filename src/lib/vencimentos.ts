// utils/vencimentos.ts
export function calcularVencimento(
  mesCompetencia: number,  // Mês da competência (1-12)
  ano: number,             // Ano atual
  diaVencimento: number,   // Dia base do vencimento (ex: 20)
  anteciparDiaNaoUtil: boolean
): string {
  // O vencimento é sempre no mês seguinte à competência
  let dataVencimento = new Date(ano, mesCompetencia, diaVencimento);
  
  if (anteciparDiaNaoUtil) {
    dataVencimento = ajustarParaDiaUtil(dataVencimento, true); // Antecipa
  } else {
    dataVencimento = ajustarParaDiaUtil(dataVencimento, false); // Posterga
  }

  return dataVencimento.toLocaleDateString('pt-BR');
}

function ajustarParaDiaUtil(data: Date, antecipar: boolean): Date {
  const novaData = new Date(data);
  let incremento = antecipar ? -1 : 1;

  while (!ehDiaUtil(novaData)) {
    novaData.setDate(novaData.getDate() + incremento);
  }

  return novaData;
}


function ehDiaUtil(data: Date): boolean {
  // Verifica fim de semana (0 = Domingo, 6 = Sábado)
  if ([0, 6].includes(data.getDay())) return false;
  
  // Aqui você pode adicionar verificação de feriados se necessário
  return true;
}
