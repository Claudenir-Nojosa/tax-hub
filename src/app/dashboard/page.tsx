import Link from "next/link";
import Image from "next/image";
import { Clock, Calendar } from "lucide-react";

const artigos = [
  {
    href: "/dashboard/blog/equiparacao-hospitalar",
    tags: ["Equiparação Hospitalar", "IRPJ", "CSLL", "Lucro Presumido"],
    titulo:
      "Equiparação Hospitalar: como clínicas médicas podem reduzir IRPJ e CSLL no Lucro Presumido",
    resumo:
      "A equiparação hospitalar permite que clínicas médicas sejam tributadas como hospitais, com redução significativa de IRPJ e CSLL. Entenda os critérios, como solicitar o benefício e como garantir segurança jurídica no processo.",
    data: "Jun. 2025",
    leitura: "10 min",
    imagem: "/articles/equiparacao.jpg" as string | null,
  },
  {
    href: "/dashboard/blog/res-cgsn-183-2025",
    tags: ["Simples Nacional", "CGSN", "MEI", "Reforma Tributária"],
    titulo:
      "A armadilha do §10: como a consolidação de dívidas do sócio afeta o acesso ao Simples Nacional",
    resumo:
      "A Res. CGSN 183/2025 explicitou que todos os débitos tributários exigíveis do titular — em qualquer inscrição cadastral — são consolidados para fins de permanência no Simples. Entenda os cenários de risco e como planejar.",
    data: "Out. 2025",
    leitura: "10 min",
    imagem: "/articles/RESOLUÇÃO CGSN Nº 183, DE 26 DE SETEMBRO DE 2025.png" as string | null,
  },
  {
    href: "/dashboard/blog/stj-pis-cofins-postos-lc-192",
    tags: ["STJ", "PIS/Cofins", "Combustíveis", "Monofasia"],
    titulo:
      "STJ nega créditos de PIS/Cofins a postos de combustíveis durante a vigência da LC 192/2022",
    resumo:
      "A 1ª Seção encerrou a tese dos varejistas de combustíveis. Reduzir alíquotas dentro do regime monofásico não transforma a estrutura do regime e também não ressuscita o direito ao crédito nos elos intermediários da cadeia.",
    data: "Jun. 2025",
    leitura: "8 min",
    imagem: "/articles/posto.jpg" as string | null,
  },
];

export default function DashboardPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Cabeçalho */}
      <div className="mb-8 pb-5 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Artigos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análise própria sobre decisões, legislações e temas de direito tributário.
        </p>
      </div>

      {/* Feed de artigos */}
      <div className="divide-y divide-border/70">
        {artigos.map((artigo) => (
          <Link
            key={artigo.href}
            href={artigo.href}
            className="group flex gap-5 py-6 first:pt-0 last:pb-0"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-[130px] h-[88px] rounded-lg overflow-hidden">
              {artigo.imagem ? (
                <div className="relative w-full h-full">
                  <Image
                    src={artigo.imagem}
                    alt={artigo.titulo}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center gap-1 border border-primary/15">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest text-center px-2 leading-tight">
                    {artigo.tags[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
              <div className="space-y-1.5">
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {artigo.tags.slice(0, 3).map((tag, i) => (
                    <span key={tag} className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                        {tag}
                      </span>
                      {i < Math.min(artigo.tags.length, 3) - 1 && (
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </span>
                  ))}
                </div>

                {/* Título */}
                <h2 className="text-[15px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-150 line-clamp-2">
                  {artigo.titulo}
                </h2>

                {/* Resumo */}
                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 hidden sm:block">
                  {artigo.resumo}
                </p>
              </div>

              {/* Metadados */}
              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground/80">
                <div className="flex items-center gap-2">
                  <div className="relative h-6 w-6 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-border">
                    <Image
                      src="/perfil.jpeg"
                      alt="Claudenir Vasconcelos Nojosa"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                  <span>Claudenir Nojosa</span>
                </div>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {artigo.data}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {artigo.leitura} de leitura
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
