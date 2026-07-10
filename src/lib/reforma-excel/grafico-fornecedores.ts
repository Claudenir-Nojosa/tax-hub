// Renderiza o "gráfico bonito" da aba Análise Fornecedores como PNG, no browser (via Chart.js +
// canvas offscreen), pra embutir na planilha com ws.addImage(). Rationale: o ExcelJS (biblioteca
// usada em todo o gerador) NÃO tem API de gráfico nativo do Excel (confirmado nesta fase — nem
// `addChart` nem nada equivalente existe na v4.4, o mesmo motivo pelo qual não dá pra criar Tabela
// Dinâmica). A alternativa real dentro do que é possível: uma imagem PNG embutida, que abre e
// aparece perfeitamente no Excel, mas é estática (não recalcula sozinha — atualiza só quando o
// Excel é gerado de novo pelo wizard, diferente de um gráfico nativo ligado às células).

export async function renderizarGraficoFornecedoresPng(
  regimeRegularPct: number,
  simplesNacionalPct: number
): Promise<ArrayBuffer> {
  const { Chart } = await import("chart.js/auto")

  const canvas = document.createElement("canvas")
  canvas.width = 480
  canvas.height = 360

  const chart = new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["Regime Regular", "Simples Nacional"],
      datasets: [{
        data: [regimeRegularPct * 100, simplesNacionalPct * 100],
        backgroundColor: ["#0e2841", "#f4a300"],
        borderColor: "#ffffff",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: { display: true, text: "Fornecedores por Regime", font: { size: 16, family: "Calibri" } },
        legend: { position: "bottom", labels: { font: { family: "Calibri", size: 12 } } },
        tooltip: { enabled: false },
      },
    },
    plugins: [{
      id: "fundoBranco",
      beforeDraw: (c) => {
        const ctx = c.ctx
        ctx.save()
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.restore()
      },
    }],
  })

  // desenha os rótulos de percentual sobre as fatias
  chart.update()

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem do gráfico"))), "image/png")
  )
  chart.destroy()
  return blob.arrayBuffer()
}
