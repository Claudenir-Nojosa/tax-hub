import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, BookOpen } from "lucide-react";

export default function ArtigoResCgsn1832025() {
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

      {/* Header */}
      <header className="mb-10">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Simples Nacional", "CGSN", "MEI", "PGDAS-D", "Reforma Tributária"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-[#007cca]"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
          Resolução CGSN nº 183/2025: o Simples Nacional na era da Reforma Tributária
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          O CGSN publicou a primeira grande atualização do regulamento do Simples Nacional para adequá-lo
          às Leis Complementares nº 214 e nº 216/2025. Novos princípios, vedações ampliadas, multas
          pela Defis e regras do MEI consolidadas: o que muda na prática.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
          {/* Autor */}
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

          {/* Metadados */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Outubro de 2025
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              10 min de leitura
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Resolução CGSN nº 183/2025
            </span>
          </div>
        </div>
      </header>

      {/* Imagem de capa */}
      <div className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden mb-10">
        <Image
          src="/articles/RESOLUÇÃO CGSN Nº 183, DE 26 DE SETEMBRO DE 2025.png"
          alt="Resolução CGSN nº 183, de 26 de setembro de 2025"
          fill
          className="object-cover"
        />
      </div>

      {/* Body */}
      <article className="prose-article">

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          A Resolução CGSN nº 183, publicada no Diário Oficial da União em 13 de outubro de 2025,
          é a resposta do Comitê Gestor do Simples Nacional ao novo ambiente regulatório criado pela
          Reforma Tributária. Ela altera a Resolução CGSN nº 140/2018 — o regulamento geral do
          Simples — em vários pontos, com fundamento nos arts. 516 e 544 da LC 214/2025 (IBS e CBS)
          e no art. 2º da LC 216/2025.
        </p>

        <Section title="O contexto: por que o Simples precisava ser atualizado?" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A Lei Complementar nº 214/2025 criou o IBS (Imposto sobre Bens e Serviços) e a CBS
          (Contribuição Social sobre Bens e Serviços), que substituirão ICMS, ISS e PIS/Cofins
          ao longo do período de transição (2026–2033). A LC 216/2025 promoveu ajustes pontuais
          no Simples Nacional para compatibilizá-lo com esse novo sistema.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          O Simples Nacional não foi abolido pela Reforma — ele continua como regime especial
          para ME e EPP. Mas precisa se adaptar: novos princípios precisam ser explicitados,
          regras de administração integrada entre os entes precisam ser formalizadas, e as
          obrigações declaratórias (PGDAS-D, Defis, DASN-Simei) precisam ser uniformizadas.
          A Resolução CGSN nº 183/2025 faz exatamente isso.
        </p>

        <Section title="Novos princípios do Simples Nacional (art. 2º-A)" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          A primeira grande novidade estrutural é a inclusão do art. 2º-A na Res. 140/2018,
          que elenca cinco princípios que o Simples Nacional deve observar:
        </p>

        <ol className="list-decimal list-inside space-y-2 mb-6 text-base text-gray-700 dark:text-gray-300">
          <li><strong>Simplicidade</strong> — razão de existir do regime.</li>
          <li><strong>Transparência</strong> — clareza sobre tributos efetivamente recolhidos no DAS.</li>
          <li><strong>Justiça tributária</strong> — carga menor para quem fatura menos.</li>
          <li><strong>Cooperação e integração das administrações tributárias</strong> — base do compartilhamento de dados entre RFB, SEFAZ e secretarias municipais.</li>
          <li><strong>Defesa do meio ambiente</strong> — agenda ESG que permeia a Reforma Tributária.</li>
        </ol>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Esses princípios já estavam na LC 123/2006 (art. 12, §2º, incluído pela LC 214/2025),
          mas agora ficam expressamente positivados no regulamento do Simples. Para o intérprete
          e para o concurseiro, eles servem como critério de interpretação de todo o restante
          da Resolução.
        </p>

        <Section title="Administração integrada: o art. 2º-B e o compartilhamento de dados" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          O novo art. 2º-B estabelece que União, Estados, DF e Municípios exercem a administração
          tributária do Simples Nacional de <em>forma integrada</em>. Na prática, isso já era
          a realidade operacional — o DAS é arrecadado pela RFB e redistribuído. Mas a
          positivação formal ganhou força normativa com a Reforma Tributária, pois o IBS será
          gerido por um Comitê Gestor multigovernamental.
        </p>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          A integração se materializa em três artigos atualizados: o art. 38 (PGDAS-D compartilhado),
          o art. 70 (documentos fiscais eletrônicos compartilhados automaticamente, dispensando
          transmissão separada) e o art. 72 (Defis compartilhada com SEFAZ e prefeituras). Para
          o contribuinte, isso significa que uma inconsistência detectada pela RFB pode ser
          rapidamente comunicada à secretaria estadual ou municipal.
        </p>

        <Callout>
          <strong>Atenção prática:</strong> O MEI e a ME/EPP devem garantir que as informações
          prestadas no PGDAS-D, na Defis e na DASN-Simei sejam consistentes entre si e com
          os documentos fiscais emitidos. O cruzamento automático de dados entre os três entes
          torna a inconsistência documental mais fácil de detectar.
        </Callout>

        <Section title="Vedações ampliadas: o que mudou no art. 15" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          O art. 15 da Res. 140/2018 lista as situações que impedem o ingresso ou a permanência
          no Simples Nacional. A Res. 183/2025 consolidou e ampliou esse rol. As alterações
          mais relevantes para a prática:
        </p>

        <ul className="space-y-3 mb-6 text-base text-gray-700 dark:text-gray-300">
          <li>
            <strong>Inciso XXIII — locação de imóveis próprios:</strong> Explicitamente vedada.
            A empresa cuja atividade principal seja a locação de imóveis próprios não pode optar
            pelo Simples. Isso não é novidade em termos de LC 123/2006 (art. 17, XV), mas agora
            está numerado e consolidado na Resolução.
          </li>
          <li>
            <strong>Inciso XXVI — sociedade em conta de participação (SCP):</strong> Vedação
            nova. Por sua natureza especial (sócio ostensivo e sócio participante), a SCP é
            incompatível com o sistema unificado de apuração do DAS.
          </li>
          <li>
            <strong>Inciso XXVII — filial no exterior:</strong> Empresa com filial, sucursal,
            agência ou representação no exterior está vedada ao Simples. Reflete a agenda
            de conformidade tributária internacional (BEPS/OCDE).
          </li>
          <li>
            <strong>Inciso XXV — pejotização:</strong> Vedação expressa quando titulares/sócios
            mantêm relação de pessoalidade, subordinação e habitualidade com o tomador de
            serviços — o tripé do vínculo empregatício do art. 3º da CLT.
          </li>
        </ul>

        <Section title="Art. 97-A: novo regime de multas pela Defis" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Uma das novidades mais práticas da Resolução é a criação do art. 97-A, que estabelece
          multas específicas para atraso, omissão ou incorreção na Defis (Declaração de
          Informações Socioeconômicas e Fiscais das ME/EPP). A estrutura é espelhada nas
          multas do PGDAS-D e do DASN-Simei:
        </p>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Situação</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Multa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Redução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Falta de entrega ou entrega após o prazo</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">2%/mês sobre tributos informados (máx. 20%)</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">—</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Entrega espontânea após prazo (antes do Fisco)</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">2%/mês sobre tributos informados (máx. 20%)</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">50% (paga-se a metade)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Entrega após intimação</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">2%/mês sobre tributos informados (máx. 20%)</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">25% (paga-se 75%)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Informações incorretas ou omitidas</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">R$ 100 por grupo de 10 informações</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">—</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400">
            Multa mínima: R$ 200,00 — independentemente do valor apurado.
          </div>
        </div>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          Antes dessa Resolução, as multas pela Defis não tinham disciplina própria no regulamento —
          recorria-se às regras gerais da LC 123/2006. Agora, contadores e empresários têm
          clareza sobre os valores em jogo e as oportunidades de redução.
        </p>

        <Section title="PGDAS-D: multas com vigência a partir de 2026" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          O Art. 3º desta Resolução altera o art. 98 da Res. 140/2018, que trata das multas pelo
          PGDAS-D. A mudança é técnica mas importante: o termo inicial da multa passa a ser o dia
          seguinte ao <em>prazo originalmente fixado</em>, independentemente de intimação. Isso
          impede a postergação indefinida da prestação de informações sem acumulação de multa.
          <strong> Esta alteração só produz efeitos a partir de 1º de janeiro de 2026</strong>,
          respeitando a anterioridade nonagesimal do art. 38-A, §4º da LC 123/2006.
        </p>

        <Section title="MEI: DASN-Simei consolidada no art. 109" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Para o MEI, a principal mudança é a consolidação no art. 109 de todas as regras da
          DASN-Simei (Declaração Anual Única e Simplificada do MEI). Os pontos essenciais:
        </p>

        <ul className="space-y-2 mb-6 text-base text-gray-700 dark:text-gray-300">
          <li><strong>Prazo:</strong> Até o último dia de maio de cada ano (31/05).</li>
          <li><strong>Natureza declaratória:</strong> Confissão de dívida — os tributos apurados na DASN-Simei não precisam de lançamento de ofício para serem exigíveis.</li>
          <li><strong>Retificação:</strong> Pode ser feita sem autorização prévia, mas o direito extingue-se em 5 anos do 1º dia do exercício seguinte ao declarado.</li>
          <li><strong>Desobrigação da RAIS:</strong> Os dados do empregado informados na DASN-Simei podem ser encaminhados pelo Serpro ao MTE, dispensando a entrega da RAIS pelo MEI empregador.</li>
          <li><strong>Cômputo consolidado:</strong> MEI que também atua como contribuinte individual ou segurado especial deve somar todas as receitas para verificar o limite do MEI (§9º do art. 100).</li>
        </ul>

        <Callout>
          <strong>Atenção para MEI empregador:</strong> Verifique se o sistema da sua secretaria
          está configurado para enviar os dados de empregados à DASN-Simei via Serpro/MTE.
          Se sim, você está dispensado da RAIS — se não, a entrega da RAIS ainda é obrigatória
          até que a integração esteja operacional.
        </Callout>

        <Section title="O que muda para o contador e para o empresário" />

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Na prática, a Res. 183/2025 exige atenção em três frentes:
        </p>

        <ol className="list-decimal list-inside space-y-3 mb-6 text-base text-gray-700 dark:text-gray-300">
          <li>
            <strong>Revisar o enquadramento dos clientes no Simples</strong> com base no rol ampliado
            de vedações do art. 15 (especialmente locação de imóveis próprios, SCP, filial no exterior
            e pejotização).
          </li>
          <li>
            <strong>Uniformizar o processo de entrega das três declarações</strong> (PGDAS-D, Defis e
            DASN-Simei): mesmos prazos de atenção, mesma régua de multas, mesmos critérios de
            declaração técnica adequada.
          </li>
          <li>
            <strong>Preparar-se para 01/01/2026</strong>, quando entram em vigor as novas regras de
            cálculo de multas do PGDAS-D (termo inicial a partir do prazo original, não da intimação).
          </li>
        </ol>

        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
          O Simples Nacional é um dos regimes tributários mais utilizados no Brasil — são mais de
          21 milhões de empresas optantes. Uma atualização regulatória desta magnitude merece
          leitura cuidadosa por parte de qualquer profissional de direito tributário ou contabilidade.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Para uma análise artigo por artigo com comentários detalhados, consulte a{" "}
            <Link
              href="/dashboard/legislacoes/res-cgsn-183"
              className="text-[#007cca] hover:underline font-medium"
            >
              página de legislação da Resolução CGSN nº 183/2025
            </Link>{" "}
            na seção de Legislações Comentadas.
          </p>
        </div>

      </article>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 leading-snug">
      {title}
    </h2>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-[#007cca] bg-blue-50 dark:bg-blue-950/30 px-6 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </div>
  );
}
