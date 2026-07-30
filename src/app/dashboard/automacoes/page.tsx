import Link from "next/link";
import { FlipHorizontal2, HeartPulse, BadgeCheck, Percent, ArrowRight, Download } from "lucide-react";

// atualizar esta URL manualmente sempre que gerar uma nova versão do .exe
// (efd-pva-rpa/dist/TaxRPAHub.exe, via `pyinstaller TaxRPAHub.spec`)
const URL_DOWNLOAD_TAX_RPAHUB =
  "https://9qulyjk55bzciljt.public.blob.vercel-storage.com/downloads/TaxRPAHub.exe";

const automacoes = [
  {
    href: "/dashboard/de-para",
    nome: "De-Para",
    descricao:
      "Importa o EFD ICMS/IPI, mapeia os códigos de produto (manual, por planilha ou com sugestão por IA) e gera o EFD já com o de-para aplicado.",
    tags: ["EFD", "ICMS", "IPI"],
    icon: FlipHorizontal2,
  },
  {
    href: "/dashboard/automacoes/equiparacao-hospitalar",
    nome: "Conferência de Equiparação Hospitalar",
    descricao:
      "Importa os XMLs de NFS-e, analisa a descrição de cada serviço e classifica se há oportunidade de equiparação hospitalar (redução de IRPJ/CSLL no lucro presumido), gerando um Excel com o resultado.",
    tags: ["NFS-e", "IRPJ", "CSLL"],
    icon: HeartPulse,
  },
  {
    href: "/dashboard/automacoes/consulta-simples-nacional",
    nome: "Consulta Simples Nacional",
    descricao:
      "Verifica em lote, por CNPJ, se a empresa é optante do Simples Nacional — via upload de Excel com a coluna de CNPJ ou colando a lista, com exportação do resultado.",
    tags: ["Simples Nacional", "CNPJ"],
    icon: BadgeCheck,
  },
  {
    href: "/dashboard/automacoes/antecipacao-icms-st",
    nome: "Antecipação ICMS-ST (Ceará)",
    descricao:
      "Importa o EFD ICMS/IPI e calcula, item a item, a antecipação parcial de ICMS/FECOP devida sobre entradas interestaduais e mercadoria de origem estrangeira, conforme a IN CE nº 17/2013 e a Resolução SF nº 13/2012.",
    tags: ["EFD", "ICMS-ST", "Ceará"],
    icon: Percent,
  },
];

export default function AutomacoesPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Automações
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ferramentas que automatizam tarefas repetitivas de conferência e apuração.
        </p>
      </div>

      <div className="grid gap-4">
        {automacoes.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group block rounded-xl border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-base font-semibold text-foreground leading-snug">
                    {a.nome}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {a.descricao}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-border group-hover:text-primary transition-colors mt-1" />
            </div>
          </Link>
        ))}

        <a
          href={URL_DOWNLOAD_TAX_RPAHUB}
          download
          className="group block rounded-xl border border-dashed border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Download className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {["Desktop", "Windows", "EFD Contribuições", "DCTF"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-base font-semibold text-foreground leading-snug">
                  Tax RPAHub (baixar app)
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  App desktop (Windows, .exe, sem instalação) que reúne automações supervisionadas
                  de transmissão: você escolhe a automação e o(s) arquivo(s), e acompanha o
                  programa alvo sendo pilotado na tela. <strong>EFD Contribuições</strong> valida,
                  assina e transmite de verdade pro PVA (em lote, vários arquivos de uma vez),
                  parando só no diálogo de salvar o recibo pra você conferir e confirmar. <strong>
                  DCTF</strong> (via DCTFMensalV3-9) está com a tela pronta — em breve a automação
                  em si.
                </p>
              </div>
            </div>
            <Download className="h-5 w-5 flex-shrink-0 text-border group-hover:text-primary transition-colors mt-1" />
          </div>
        </a>
      </div>
    </div>
  );
}
