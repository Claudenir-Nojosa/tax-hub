import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, Scale } from "lucide-react";

export default function ArtigoStjPisCofinsCombustiveis() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">

      {/* Voltar */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos artigos
      </Link>

      {/* Header */}
      <header className="mb-10">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["STJ", "PIS/Cofins", "Combustíveis", "Monofasia", "LC 192/2022"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
          STJ nega créditos de PIS/Cofins a postos de combustíveis durante a vigência da LC 192/2022
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          A 1ª Seção encerrou a tese dos varejistas de combustíveis. Reduzir alíquotas dentro
          do regime monofásico não transforma a estrutura do regime e também não ressuscita o
          direito ao crédito nos elos intermediários da cadeia.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-border pt-5">
          {/* Autor */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-border">
              <Image
                src="/perfil.jpeg"
                alt="Claudenir Vasconcelos Nojosa"
                fill
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Claudenir Vasconcelos Nojosa
              </p>
              <p className="text-xs text-muted-foreground">
                Especialista em Direito Tributário
              </p>
            </div>
          </div>

          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Junho de 2025
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              8 min de leitura
            </span>
            <span className="flex items-center gap-1.5">
              <Scale className="h-4 w-4" />
              1ª Seção do STJ (unânime)
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="prose-article">

        <p className="text-base text-foreground leading-relaxed mb-6">
          O regime monofásico de PIS/Cofins sobre combustíveis sempre foi simples na teoria e bastante
          prolífico em litígios na prática. A LC 192/2022, que recalibrou as alíquotas das contribuições
          sobre combustíveis em plena crise de preços no pós-pandemia, abriu mais uma janela de tese
          tributária para postos de combustíveis e distribuidores. A 1ª Seção do STJ, em decisão unânime,
          fechou essa janela.
        </p>

        {/* Seção 1 */}
        <Section title="O regime monofásico de combustíveis: o que ele é e o que ele não é" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          O monofásico de PIS/Cofins concentra a incidência das contribuições em um único elo da cadeia,
          tipicamente o produtor ou importador. As alíquotas aplicadas nesse elo são majoradas para capturar
          toda a carga que incidiria ao longo da cadeia. Os elos subsequentes, como distribuidoras e postos
          de combustíveis, ficam com alíquota zero. Mas essa alíquota zero vem junto com uma vedação ao
          creditamento: como a tributação foi concentrada e paga pela refinaria ou importadora, não há crédito
          a tomar nos elos que operam com alíquota zero.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Esse modelo para combustíveis existe desde a Lei 9.718/1998 e foi consolidado pelas modificações
          posteriores, especialmente pelos arts. 3º, §2º, I, da Lei 10.637/2002 e da Lei 10.833/2003, que
          vedam expressamente o creditamento sobre receitas e compras sujeitas à alíquota zero no regime
          monofásico. A vedação não é acidental: ela é estrutural. Sem ela, o monofásico não faria sentido
          econômico, porque o contribuinte do elo intermediário tomaria crédito de uma aquisição que não foi
          tributada pelo adquirente anterior, gerando saldo credor sem nenhuma correspondência com tributação
          efetiva na cadeia.
        </p>

        {/* Seção 2 */}
        <Section title="O que a LC 192/2022 trouxe de novo" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          A LC 192/2022 foi editada no meio do choque inflacionário do preço dos combustíveis. Ela estabeleceu
          alíquotas específicas, ad rem (por litro ou metro cúbico), para o PIS/Cofins sobre gasolina, diesel,
          querosene de aviação, GLP e etanol hidratado combustível. Em determinados períodos e para determinados
          produtos, ela zerou a alíquota também no elo produtor e importador, não apenas nos elos intermediários.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Essa estrutura, com alíquotas ad rem distintas das ad valorem históricas e com zeramento parcial ou
          total no elo originário, foi o gatilho para a tese dos postos. O argumento era o seguinte: a LC 192
          não teria apenas ajustado o monofásico existente. Ela teria criado um modelo tributário estruturalmente
          novo, com regras próprias, desconectado da monofasia da Lei 9.718/1998 e das leis do PIS/Cofins não
          cumulativo. Nesse modelo novo, as vedações ao crédito dos arts. 3º, §2º, I das Leis 10.637 e 10.833
          não se aplicariam automaticamente.
        </p>

        {/* Callout */}
        <Callout>
          A tese dos postos dependia de uma premissa: que a lei pode criar implicitamente um novo regime
          tributário apenas calibrando alíquotas de forma diferente, sem precisar revogar expressamente as
          vedações ao crédito do regime anterior. O STJ rejeitou essa premissa.
        </Callout>

        {/* Seção 3 */}
        <Section title="O argumento dos varejistas: onde ele ganha e onde ele perde" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          O argumento dos postos tinha força formal. A LC 192 é lei complementar, hierarquicamente superior
          às leis ordinárias que instituíram o PIS/Cofins. Ela estabeleceu alíquotas próprias, em base de
          cálculo específica (por litro/m³), para combustíveis. Nesse raciocínio, a lex specialis posterior
          derrogaria implicitamente as normas gerais do monofásico na medida do conflito.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Além disso, a própria lógica da não cumulatividade do PIS/Cofins poderia ser invocada. Se há
          aquisição tributada em elo anterior, o adquirente tem direito ao crédito, salvo vedação legal
          expressa. Se a LC 192 criou um regime novo sem vedar o crédito nesse novo regime, o silêncio
          seria permissivo.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          O problema com esse raciocínio é que ele confunde dois planos distintos: o plano das <em>alíquotas</em> e
          o plano da <em>estrutura do regime</em>. A LC 192 operou exclusivamente no plano das alíquotas. Ela disse
          quanto PIS/Cofins incide sobre combustíveis em cada elo e em cada período. Ela não disse nada sobre a
          estrutura de creditamento. E sobre o que não regula, a lex specialis não derroga o regime geral:
          ela simplesmente não alcança esse ponto.
        </p>

        {/* Seção 4 */}
        <Section title="A decisão da 1ª Seção: unanimidade que sinaliza solidez" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          A 1ª Seção do STJ rejeitou unanimemente a tese dos postos de combustíveis. O fundamento central
          da decisão foi que a LC 192/2022 não criou um modelo distinto da monofasia. Ela apenas recalibrou
          as alíquotas dentro do modelo monofásico já existente. O regime jurídico que governa o PIS/Cofins
          sobre combustíveis continua sendo o monofásico das Leis 9.718/1998, 10.637/2002 e 10.833/2003.
          A LC 192 atuou dentro desse regime, não contra ele.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Como consequência, as vedações ao creditamento dos arts. 3º, §2º, I, das Leis 10.637 e 10.833
          permanecem plenamente vigentes e aplicáveis durante todo o período de vigência da LC 192. Não há
          crédito de PIS/Cofins para postos de combustíveis e distribuidoras na aquisição de combustíveis
          tributados pelo regime monofásico, independentemente de a alíquota aplicada ao elo anterior ter
          sido ad rem, ad valorem, majorada ou zerada.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          A unanimidade é um sinal importante. Na 1ª Seção do STJ, que reúne a 1ª e a 2ª Turmas e decide
          matérias tributárias de grande relevância, o julgamento unânime sinaliza ausência de controvérsia
          jurídica relevante entre os Ministros. Na prática, isso tende a estabilizar o precedente e
          desincentivar recursos e teses semelhantes em instâncias inferiores.
        </p>

        {/* Seção 5 */}
        <Section title="Por que a decisão está correta e o que ela significa para o sistema" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          O STJ acertou. A identificação do regime tributário aplicável não pode depender de como o
          legislador calibrou as alíquotas em determinado período. Ela depende da estrutura jurídica que
          governa a incidência, a base de cálculo e, principalmente, o creditamento. A LC 192 não tocou
          na estrutura de creditamento. Portanto, não alterou o regime.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Se a tese dos postos tivesse prevalecido, o efeito colateral seria grave. Qualquer lei que
          altere alíquotas do regime monofásico de combustíveis poderia ser interpretada como criadora
          de um novo regime que abre o creditamento nos elos intermediários. O legislador ficaria refém
          da interpretação: qualquer ajuste de alíquota por razões de política econômica viraria uma
          janela de crédito tributário não prevista e não quantificada no impacto fiscal da medida.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Há também um argumento de coerência sistêmica. O direito ao crédito de PIS/Cofins é um direito
          legal, não constitucional. Ele existe onde a lei o prevê e na medida exata em que a lei o prevê.
          A Constituição garante a não cumulatividade do IPI e do ICMS. Para o PIS/Cofins, a não
          cumulatividade é uma opção legislativa ordinária, o que significa que o legislador pode
          estabelecer vedações ao crédito por razões de política tributária. É exatamente isso que os
          arts. 3º, §2º, I, das Leis 10.637 e 10.833 fazem: vedam o crédito no regime monofásico por
          uma razão de coerência econômica com a concentração da incidência.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Por fim, vale notar que o resultado concreto para os postos de combustíveis é a impossibilidade
          de aproveitar créditos de PIS/Cofins nas aquisições de gasolina, diesel, etanol e GLP no período
          em que a LC 192/2022 esteve vigente. Para quem já constituiu ativo de crédito com base na tese
          rejeitada, ou já utilizou esses créditos em compensação, a decisão do STJ cria risco de autuação
          e exige revisão imediata das posições fiscais adotadas.
        </p>

        {/* Conclusão */}
        <Section title="Conclusão" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          A decisão da 1ª Seção é mais do que a resolução de um caso específico sobre combustíveis. Ela
          reafirma um princípio geral de interpretação do regime monofásico de PIS/Cofins: a estrutura de
          vedação ao crédito é autônoma em relação às alíquotas aplicadas. Enquanto o legislador não revogar
          expressamente a vedação ao creditamento, apenas recalibrando alíquotas, o monofásico permanece
          monofásico, com todas as suas consequências para os elos intermediários da cadeia.
        </p>

        <p className="text-base text-foreground leading-relaxed">
          Para o contribuinte do setor de combustíveis, a lição prática é clara: teses tributárias baseadas
          em mudanças de alíquota que não alteram a estrutura do regime têm vida curta no STJ. A janela
          existiu e foi fechada com unanimidade.
        </p>
      </article>

      {/* Rodapé do artigo */}
      <footer className="mt-12 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Este artigo expressa análise própria sobre a decisão da 1ª Seção do STJ que negou créditos de
          PIS/Cofins a postos de combustíveis durante a vigência da LC 192/2022. Não constitui parecer
          jurídico ou opinião legal sobre casos específicos.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver todos os artigos
        </Link>
      </footer>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h2 className="text-xl font-bold text-foreground mt-10 mb-4 pb-2 border-b border-border">
      {title}
    </h2>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-primary bg-primary/10 px-6 py-4">
      <p className="text-sm text-foreground leading-relaxed italic">
        {children}
      </p>
    </div>
  );
}
