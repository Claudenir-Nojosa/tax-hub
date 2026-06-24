import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, Building2 } from "lucide-react";

export default function ArtigoEquiparacaoHospitalar() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">

      {/* Voltar */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#007cca] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos artigos
      </Link>

      {/* Cover */}
      <div className="relative w-full h-[220px] rounded-2xl overflow-hidden mb-8 shadow-md">
        <Image
          src="/articles/equiparacao.jpg"
          alt="Equiparação Hospitalar"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {["Equiparação Hospitalar", "IRPJ", "CSLL", "Lucro Presumido", "Clínicas Médicas"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-[#007cca]"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
          Equiparação Hospitalar: como clínicas médicas podem reduzir IRPJ e CSLL no Lucro Presumido
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          A equiparação hospitalar permite que clínicas médicas sejam tributadas como hospitais,
          com redução significativa de IRPJ e CSLL. Os requisitos são precisos e a aplicação
          não é automática: entenda quem se enquadra, como solicitar e como garantir segurança
          jurídica nesse processo.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
              <Image
                src="/perfil.jpeg"
                alt="Claudenir Vasconcelos Nojosa"
                fill
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Claudenir Vasconcelos Nojosa
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Especialista em Direito Tributário
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Junho de 2025
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              10 min de leitura
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Planejamento Tributário
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="prose-article">

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          De forma simples, a equiparação hospitalar é uma classificação tributária que permite
          que clínicas médicas sejam tratadas, para fins fiscais, como hospitais. Isso significa
          que essas clínicas podem se beneficiar de uma redução significativa no IRPJ e na CSLL,
          desde que atendam a critérios específicos estabelecidos pela legislação e pela Receita Federal.
        </p>

        {/* Seção 1 */}
        <Section title="Quem pode se beneficiar? Os 4 critérios fundamentais" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Para que sua clínica possa se beneficiar dessa tributação diferenciada, é preciso atender
          a critérios específicos. Não basta apenas realizar procedimentos médicos complexos — a
          estrutura jurídica, o regime tributário e o enquadramento regulatório precisam estar alinhados.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          1. Regime tributário do Lucro Presumido
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Se sua clínica está no Simples Nacional, infelizmente a equiparação hospitalar não se aplica.
          Esse benefício é exclusivo para clínicas no Lucro Presumido, pois a legislação que permite a
          redução da base de cálculo do IRPJ e da CSLL se restringe a esse regime.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          2. Atividades estruturadas como sociedade empresária
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Sua clínica precisa estar registrada como uma sociedade empresária — e não como uma sociedade
          simples. Isso significa CNPJ formalmente constituído, registrado na Junta Comercial, com
          atividades organizadas e voltadas à geração de lucro.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          3. Conformidade com as normas da Anvisa
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A clínica deve cumprir as normas sanitárias exigidas pela Anvisa e pela vigilância sanitária
          local. Isso significa ter uma estrutura segura e devidamente licenciada para realizar os
          procedimentos médicos que justificam a equiparação hospitalar.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          4. Natureza dos serviços prestados
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Esse é um dos critérios mais importantes. A Receita Federal não concede esse benefício para
          qualquer tipo de clínica médica — é preciso comprovar que os serviços prestados exigem
          infraestrutura hospitalar. Entre os procedimentos que podem justificar a equiparação,
          destacam-se:
        </p>

        <ul className="mb-6 space-y-2 pl-4">
          {[
            "Cirurgias (plásticas, reparadoras, ortopédicas, oftalmológicas etc.)",
            "Exames de imagem (ressonância magnética, tomografia, ultrassonografia avançada)",
            "Procedimentos invasivos e terapias especializadas (endoscopia, colonoscopia, hemodiálise, oncologia, reprodução assistida)",
            "Vacinação",
            "Serviços de anestesiologia e sedação",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#007cca] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Callout>
          Se sua clínica atua exclusivamente com consultas médicas ou procedimentos estéticos não invasivos,
          provavelmente não conseguirá se enquadrar na equiparação hospitalar.
        </Callout>

        {/* Seção 2 */}
        <Section title="Como garantir a equiparação: pedido administrativo ou ação judicial?" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Não basta apenas se enquadrar nos critérios — é preciso demonstrar isso de forma formal e
          bem fundamentada perante a Receita Federal. E nesse ponto, existem dois caminhos possíveis.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          O pedido administrativo: quando a Receita Federal aceita voluntariamente?
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A opção mais direta é o pedido administrativo, no qual a clínica reúne toda a documentação
          necessária e apresenta à Receita Federal para solicitar o enquadramento. Essa solicitação
          precisa estar muito bem fundamentada, incluindo:
        </p>

        <ul className="mb-4 space-y-2 pl-4">
          {[
            "Documentação societária e contábil que demonstre que a clínica cumpre os requisitos legais",
            "Comprovação da infraestrutura e dos serviços prestados, mostrando que os procedimentos se enquadram na categoria de 'serviços hospitalares'",
            "Parecer técnico ou jurídico que justifique a aplicação da alíquota reduzida",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#007cca] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          O problema? A Receita Federal nem sempre aceita esse pedido de forma pacífica. Em muitos casos,
          o fisco adota uma interpretação restritiva, argumentando que apenas hospitais propriamente ditos
          teriam direito à tributação diferenciada. Isso faz com que muitas clínicas tenham seu pedido
          negado, mesmo cumprindo todos os requisitos legais.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          A ação judicial: quando recorrer à Justiça para garantir o direito?
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Quando o pedido administrativo é negado — ou quando a clínica quer garantir sua segurança antes
          mesmo de uma eventual autuação — a alternativa mais eficaz pode ser a ação judicial. Nos últimos
          anos, o Judiciário tem sido favorável aos médicos e clínicas que solicitam a equiparação
          hospitalar, desde que os requisitos sejam atendidos e devidamente comprovados.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Quando vale a pena recorrer à Justiça?
        </p>

        <ul className="mb-6 space-y-2 pl-4">
          {[
            "Se a Receita Federal negou o pedido administrativo sem justificativa clara",
            "Se há risco de fiscalização e questionamento da equiparação hospitalar",
            "Se a clínica quer recuperar tributos pagos a mais nos últimos cinco anos",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#007cca] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Isso significa que a clínica pode, além de garantir o benefício daqui para frente, solicitar
          a devolução dos valores pagos indevidamente — um recurso que pode representar uma recuperação
          significativa de capital.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
          Qual caminho escolher?
        </h3>

        <Callout>
          O pedido administrativo pode ser a primeira tentativa para evitar um processo judicial, mas tem
          altas chances de ser negado sem um forte embasamento. A ação judicial, por outro lado, pode ser
          mais eficiente para garantir que a clínica tenha seu direito reconhecido sem depender do
          entendimento da Receita Federal.
        </Callout>

        {/* Seção 3 */}
        <Section title="Atenção: a equiparação não é automática — reorganize antes de tributar" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Aqui entra um ponto fundamental que merece destaque: a equiparação hospitalar não é automática.
          Após as alterações legislativas promovidas pela Lei 11.727/08, a fruição do tratamento favorecido
          passou a exigir, além do enquadramento material da atividade, que a prestadora esteja organizada
          sob a forma de sociedade empresária e atenda às normas da Anvisa.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A Receita também vem exigindo demonstração de efetivo elemento empresarial e, em soluções mais
          recentes, ressalta a relevância de o ambiente de prestação do serviço possuir alvará sanitário
          estadual ou municipal. Em outras palavras, não basta prestar um serviço tecnicamente sofisticado:
          é necessário que a estrutura jurídica e regulatória da clínica esteja corretamente ajustada.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Esse contexto explica por que, muitas vezes, a primeira providência para buscar a equiparação
          hospitalar não é alterar a apuração do tributo, mas reorganizar a empresa. É preciso revisar:
        </p>

        <ul className="mb-6 space-y-2 pl-4">
          {[
            "Contrato social e natureza registral",
            "Atividade econômica efetivamente explorada",
            "Licenças sanitárias e alvarás",
            "Conformidade com a vigilância sanitária",
            "Forma de faturamento e individualização contábil dos serviços",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#007cca] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          A clínica que mistura consultas, exames e procedimentos sem adequada individualização contábil
          e fiscal eleva substancialmente o risco de glosa. A segurança jurídica da tese depende, em larga
          medida, da capacidade de demonstrar com clareza quais receitas decorrem de atividades elegíveis
          e quais permanecem submetidas à regra geral.
        </p>

        {/* Conclusão */}
        <Section title="Conclusão" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A equiparação hospitalar é um benefício tributário real e juridicamente sólido — mas exige
          planejamento, documentação robusta e estruturação prévia da empresa. Uma economia tributária
          significativa só se concretiza quando a estratégia é bem planejada e segura.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
          A forma como a equiparação é solicitada faz toda a diferença no resultado final. Um pedido mal
          estruturado pode gerar questionamentos e até riscos fiscais, enquanto um processo bem fundamentado
          tem muito mais chances de sucesso — seja na via administrativa ou judicial.
        </p>

      </article>

      {/* Rodapé */}
      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-600 leading-relaxed">
          Este artigo expressa análise própria sobre o instituto da equiparação hospitalar e os critérios
          para sua aplicação no âmbito do Lucro Presumido. Não constitui parecer jurídico ou opinião
          legal sobre casos específicos. Recomenda-se consulta a profissional habilitado para análise
          da situação concreta de cada clínica.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-4 text-sm text-[#007cca] hover:underline"
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
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-10 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
      {title}
    </h2>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-[#007cca] bg-blue-50 dark:bg-blue-950/30 px-6 py-4">
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
        {children}
      </p>
    </div>
  );
}
