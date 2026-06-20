import Link from "next/link";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";

const legislacoes = [
  {
    href: "/dashboard/legislacoes/ctn",
    numero: "Lei 5.172/1966",
    nome: "Código Tributário Nacional (CTN)",
    descricao:
      "Estabelece as normas gerais de direito tributário aplicáveis à União, aos Estados, ao Distrito Federal e aos Municípios. Base estrutural de todo o sistema tributário brasileiro.",
    escopo: ["Tributo", "Competência", "Obrigação", "Crédito Tributário"],
    publicacao: "25 out. 1966",
    vigencia: "Em vigor (com alterações)",
    artigos: 208,
  },
  {
    href: "/dashboard/legislacoes/lcp-214",
    numero: "LC 214/2025",
    nome: "Lei Complementar nº 214, de 11 de janeiro de 2025",
    descricao:
      "Institui o Imposto sobre Bens e Serviços (IBS), a Contribuição Social sobre Bens e Serviços (CBS) e o Imposto Seletivo (IS), no âmbito da Reforma Tributária.",
    escopo: ["IBS", "CBS", "IS"],
    publicacao: "11 jan. 2025",
    vigencia: "Transição 2026-2033",
    artigos: 480,
  },
  {
    href: "/dashboard/legislacoes/ricms-ce",
    numero: "Decreto nº 33.327/2019",
    nome: "RICMS do Ceará — Regulamento do ICMS",
    descricao:
      "Consolida e regulamenta a legislação do ICMS no Estado do Ceará, com base na Lei nº 12.670/1996. Organizado segundo a teoria da regra-matriz de incidência: critérios material, temporal, espacial, pessoal e quantitativo.",
    escopo: ["ICMS", "Ceará", "RICMS"],
    publicacao: "30 out. 2019",
    vigencia: "Em vigor (com alterações)",
    artigos: 108,
  },
  {
    href: "/dashboard/legislacoes/res-cgsn-183",
    numero: "Res. CGSN nº 183/2025",
    nome: "Resolução CGSN nº 183, de 26 de setembro de 2025",
    descricao:
      "Altera a Resolução CGSN nº 140/2018 para adequar o Simples Nacional à LC 214/2025 (Reforma Tributária) e à LC 216/2025. Inclui novos princípios do regime, administração tributária integrada, vedações ampliadas, multas pela Defis (art. 97-A), regras do MEI e efeitos temporais diferenciados.",
    escopo: ["Simples Nacional", "MEI", "PGDAS-D", "DASN-Simei"],
    publicacao: "13 out. 2025",
    vigencia: "Em vigor (Art. 3º a partir de 01/01/2026)",
    artigos: 7,
  },
];

export default function LegislacoesPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Legislações
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Textos legais comentados: análise própria artigo a artigo.
        </p>
      </div>

      <div className="grid gap-4">
        {legislacoes.map((leg) => (
          <Link
            key={leg.href}
            href={leg.href}
            className="group block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-[#007cca] dark:hover:border-[#007cca] hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#007cca]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#007cca]">
                      {leg.numero}
                    </span>
                    {leg.escopo.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                    {leg.nome}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {leg.descricao}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {leg.publicacao}
                    </span>
                    <span>Vigência: {leg.vigencia}</span>
                    <span>{leg.artigos} artigos comentados</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-300 dark:text-gray-700 group-hover:text-[#007cca] transition-colors mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
