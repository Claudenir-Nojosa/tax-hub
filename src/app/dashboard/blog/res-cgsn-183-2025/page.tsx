import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar, BookOpen } from "lucide-react";

export default function ArtigoResCgsn1832025() {
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
        <div className="flex flex-wrap gap-2 mb-4">
          {["Simples Nacional", "Planejamento Tributário", "CGSN 183/2025", "MEI", "Débitos"].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
          A armadilha do §10: como a consolidação de dívidas do sócio afeta o acesso ao Simples Nacional
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          A Resolução CGSN nº 183/2025 explicitou uma regra que muitos ignoravam: todos os débitos
          tributários exigíveis de um mesmo titular, em qualquer inscrição cadastral, são
          consolidados para fins de permanência no Simples Nacional. Entenda os cenários de risco
          e como estruturar o planejamento corretamente.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-border pt-5">
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Outubro de 2025
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              9 min de leitura
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Res. CGSN nº 183/2025, Art. 2º, §10
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

        <p className="text-base text-foreground leading-relaxed mb-6">
          Entre as muitas alterações trazidas pela Resolução CGSN nº 183/2025, uma passa despercebida
          por quem lê o texto com pressa: a redação consolidada do{" "}
          <strong>§10 do art. 2º da Resolução CGSN nº 140/2018</strong>. O dispositivo não cria
          uma regra nova do zero: ele torna explícita e operacionalmente clara uma consequência
          que já decorria da LC 123/2006, mas que na prática era frequentemente ignorada.
          O resultado é um risco relevante de planejamento tributário que todo contador e empresário
          do Simples Nacional precisa conhecer.
        </p>

        <Section title="O que diz o §10 do art. 2º (texto consolidado)" />

        <div className="rounded-lg bg-muted border-l-4 border-border px-5 py-4 text-sm text-muted-foreground leading-relaxed mb-6">
          <p className="font-semibold text-foreground mb-2">Art. 2º, §10 da Res. CGSN nº 140/2018 (redação dada pela Res. 183/2025):</p>
          <p>
            "Para fins do disposto nesta Resolução, em relação às entidades de que trata o inciso I do
            caput e o art. 100, ainda que em inscrições cadastrais distintas ou na qualidade de
            contribuinte individual, devem ser considerados:
          </p>
          <p className="mt-2 ml-4">I - todas as atividades econômicas exercidas e as receitas brutas auferidas em um mesmo ano-calendário; e</p>
          <p className="ml-4 font-semibold">II - todos os débitos tributários exigíveis."</p>
          <p className="mt-2 text-xs text-muted-foreground">(LC nº 123/2006, art. 3º, §19)</p>
        </div>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Traduzindo: quando a Receita Federal verifica se um empresário individual (EI), um MEI ou
          qualquer optante do Simples tem direito ao regime, ela não olha apenas para aquele CNPJ
          isolado. Ela consolida, no mesmo bolo, <strong>todas as atividades e receitas</strong>{" "}
          que o titular exerce em qualquer registro (outros CNPJs, CPF como autônomo, produtor rural)
          e <strong>todos os débitos tributários exigíveis</strong> que existam em qualquer
          dessas inscrições. O inciso I (receitas) é a regra anti-fracionamento. O inciso II
          (débitos) é o foco deste artigo.
        </p>

        <Section title="Por que o inciso II é a parte mais perigosa para o planejamento" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          A LC 123/2006 já previa, no art. 17, V, que empresa com débito com qualquer Fazenda Pública
          não pode optar pelo Simples. O §10, inciso II vai além: ele determina que os débitos
          de <em>qualquer inscrição cadastral</em> do mesmo titular contam para essa verificação.
          Isso cria três cenários de risco que o planejamento tributário precisa endereçar:
        </p>

        <Callout>
          <strong>Regra central:</strong> Para o Simples Nacional, o sujeito de análise não é
          o CNPJ, mas a <em>pessoa</em> por trás do CNPJ. Todos os débitos do titular, em qualquer
          registro, são consolidados.
        </Callout>

        <Section title="Cenário 1: Dívida no CPF, empresa no Simples" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          Este é o cenário mais comum e o menos percebido. O empresário abre um MEI ou uma ME e
          mantém o Simples em dia, sem nenhum débito no CNPJ. Mas tem pendências tributárias
          no <strong>CPF</strong>: IRPF não recolhido, contribuição previdenciária como autônomo
          em aberto, ou dívidas de um período como segurado especial.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          O §10, inciso II determina que esses débitos do CPF entram no cômputo. O optante está,
          tecnicamente, em situação impeditiva, mesmo que o CNPJ esteja limpo.
        </p>

        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 mb-6 text-sm text-foreground">
          <p className="font-semibold text-destructive mb-2">⚠️ Risco concreto</p>
          <p>
            Um médico atua como autônomo (CPF) e tem uma clínica no Simples (CNPJ). Se ele tem
            contribuição previdenciária em aberto como contribuinte individual, essa dívida do CPF
            impede a manutenção da clínica no Simples, porque o titular é o mesmo e o §10
            consolida todos os débitos.
          </p>
        </div>

        <p className="text-base text-foreground leading-relaxed mb-6">
          <strong>O que fazer:</strong> Antes de optar ou renovar o Simples, o contador deve
          verificar a situação do <em>titular</em> (CPF), não apenas do CNPJ. Consulta no
          e-CAC pelo CPF do sócio/titular é etapa obrigatória do diagnóstico fiscal.
        </p>

        <Section title="Cenário 2: Dois CNPJs, dívida em um, Simples no outro" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          É comum que um empreendedor tenha mais de um negócio formalizado: um MEI para
          uma atividade e uma ME para outra, ou dois EIs em segmentos distintos. Se um dos
          CNPJs acumula débito tributário exigível e o outro está em dia, a pergunta que
          o §10 responde de forma inequívoca é: <em>o CNPJ em dia pode continuar no Simples?</em>
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          A resposta é <strong>não</strong>. O inciso II manda consolidar "todos os débitos tributários
          exigíveis" do titular, independentemente de em qual inscrição cadastral estão registrados.
          O CNPJ limpo não está isolado: ele compartilha o mesmo titular do CNPJ com débito.
        </p>

        <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-5 mb-6 text-sm text-foreground">
          <p className="font-semibold text-orange-700 dark:text-orange-400 mb-2">Exemplo prático</p>
          <p>
            João tem um MEI de fotografia (CNPJ-A) e uma ME de consultoria (CNPJ-B) no Simples.
            O MEI acumulou DAS não pagos no último ano e foi negativado. A ME de consultoria não
            tem débitos. Pelo §10, os débitos do MEI de João impedem que sua ME permaneça no
            Simples, pois o titular é o mesmo e todos os débitos são consolidados.
          </p>
        </div>

        <p className="text-base text-foreground leading-relaxed mb-6">
          <strong>O que fazer:</strong> Manter todos os CNPJs de um mesmo titular em dia é condição
          para que qualquer um deles continue no Simples. O planejamento deve enxergar o
          conjunto, não cada empresa isoladamente.
        </p>

        <Section title="Cenário 3: Dívida antiga, empresa nova" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          Este é o cenário do "recomeço": o empresário encerrou uma empresa anterior com débitos
          em aberto e abriu um novo CNPJ tentando "começar do zero" no Simples. O §10 fecha essa
          porta. Os débitos exigíveis da empresa encerrada, se ainda não foram quitados, parcelados
          ou extintos, seguem o titular para a nova empresa.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Vale distinguir duas situações:
        </p>

        <ul className="space-y-3 mb-6 text-base text-foreground">
          <li>
            <strong>Débito em cobrança ativa (exigível):</strong> impede o Simples do novo CNPJ.
            O termo "exigível" é técnico: significa que não há suspensão da exigibilidade
            (parcelamento deferido, depósito judicial, liminar, etc.). Débito inscrito em dívida
            ativa sem garantia ou sem suspensão é exigível.
          </li>
          <li>
            <strong>Débito com exigibilidade suspensa:</strong> parcelamento em dia, depósito
            judicial do montante integral, tutela antecipada. Nesses casos, o débito <em>existe</em>{" "}
            mas não está <em>exigível</em>. A empresa nova pode optar pelo Simples normalmente.
          </li>
        </ul>

        <Callout>
          <strong>Ponto-chave para o planejamento:</strong> A palavra "exigíveis" no inciso II
          não é decorativa. Um débito parcelado com parcelas em dia não é exigível: a
          exigibilidade está suspensa (art. 151, VI do CTN). Isso cria uma janela de
          planejamento legítima: regularizar via parcelamento para suspender a exigibilidade
          e garantir o acesso ao Simples.
        </Callout>

        <Section title="A estratégia do parcelamento como instrumento de planejamento" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          Quando o empresário ou seu titular tem débitos tributários exigíveis, o caminho mais
          eficiente para manter ou recuperar o Simples Nacional é o <strong>parcelamento</strong>.
          O efeito jurídico é imediato: ao deferir o parcelamento, a Fazenda suspende a
          exigibilidade do débito (art. 151, VI do CTN), que deixa de ser impeditivo para o Simples.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          No âmbito do Simples Nacional, o parcelamento especial é regulado pelo art. 79 da
          LC 123/2006. Existe ainda o Refis do Simples, aberto periodicamente por lei específica.
          Para débitos federais em geral (IRPF, previdenciária como autônomo), o PERT ou o
          parcelamento ordinário da RFB (60 meses) também suspendem a exigibilidade.
        </p>

        <div className="rounded-xl border border-border overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Situação do débito</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Exigível?</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Impede o Simples?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-foreground">Débito vencido e não pago (sem garantia)</td>
                <td className="px-4 py-3 text-destructive font-medium">Sim</td>
                <td className="px-4 py-3 text-destructive font-medium">Sim</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">Parcelamento deferido com parcelas em dia</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">Débito com liminar/tutela suspendendo exigibilidade</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">Depósito judicial do montante integral</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">Parcelamento com parcela em atraso</td>
                <td className="px-4 py-3 text-destructive font-medium">Sim (rescisão)</td>
                <td className="px-4 py-3 text-destructive font-medium">Sim</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">Débito prescrito</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">Não</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-base text-foreground leading-relaxed mb-6">
          O planejamento correto, portanto, começa com um <strong>levantamento completo de débitos
          do titular</strong>: CPF e todos os CNPJs associados. Identificados os débitos exigíveis,
          a estratégia de regularização (parcelamento, pagamento, depósito judicial ou discussão
          da exigibilidade) deve ser executada <em>antes</em> da opção pelo Simples ou antes
          do período de exclusão de ofício.
        </p>

        <Section title="O risco da exclusão retroativa (art. 84, §5º)" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          Se a empresa permanece no Simples sem perceber que o titular tinha débito exigível
          em outra inscrição, a exclusão de ofício, quando ocorre, pode ser{" "}
          <strong>retroativa</strong>. O art. 84, §5º da Res. 140/2018 determina que o efeito
          da exclusão retroage ao mês seguinte ao da ocorrência da situação impeditiva.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-4">
          Na prática: a empresa recolheu o DAS durante dois anos dentro do Simples, mas havia
          um débito exigível do titular desde o início. A exclusão retroativa pode fazer com que
          o Fisco reclassifique toda a receita desse período para o regime geral (Lucro Presumido
          ou Lucro Real), gerando diferenças de IRPJ, CSLL, PIS e Cofins, além de multas
          e juros sobre o período.
        </p>

        <Callout>
          <strong>O custo da descoberta tardia é muito maior que o custo do diagnóstico preventivo.</strong>{" "}
          Uma exclusão retroativa de dois anos de Simples, com reclassificação para Lucro Presumido,
          pode resultar em uma conta tributária que torna inviável a continuidade do negócio.
        </Callout>

        <Section title="Checklist de planejamento: o que verificar antes de optar pelo Simples" />

        <ol className="list-decimal list-inside space-y-3 mb-6 text-base text-foreground">
          <li>
            <strong>Consultar a situação fiscal do CPF do titular</strong> no e-CAC (aba "Certidões e Situação Fiscal"): IRPF, contribuições previdenciárias, parcelamentos ativos.
          </li>
          <li>
            <strong>Listar todos os CNPJs vinculados ao titular</strong> (MEIs anteriores, EIs encerrados, outras MEs) e verificar a situação de cada um no Portal do Simples Nacional.
          </li>
          <li>
            <strong>Para débitos encontrados</strong>, verificar se a exigibilidade está suspensa (parcelamento, liminar, depósito) ou se o débito é exigível.
          </li>
          <li>
            <strong>Regularizar débitos exigíveis</strong> antes da opção: parcelamento é a ferramenta mais rápida para suspender a exigibilidade sem necessidade de pagamento integral.
          </li>
          <li>
            <strong>Manter o monitoramento contínuo</strong>: a situação que hoje não é impeditiva pode se tornar impeditiva se um parcelamento for rescindido ou um novo débito surgir.
          </li>
        </ol>

        <Section title="O que muda com a Resolução CGSN nº 183/2025" />

        <p className="text-base text-foreground leading-relaxed mb-4">
          A regra do §10, inciso II já existia implicitamente no art. 3º, §19 da LC 123/2006
          desde 2014. O que a Res. 183/2025 faz é torná-la <strong>explícita no corpo da
          Resolução regulamentadora</strong>, aumentando a probabilidade de que a RFB e os
          entes fiscalizadores a apliquem ativamente em procedimentos de exclusão de ofício.
        </p>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Na prática, isso significa que o risco de uma exclusão retroativa por débito em
          inscrição diversa é agora <em>maior</em>. Não porque a regra mudou, mas porque
          ela está mais visível e, portanto, mais passível de ser aplicada nas fiscalizações
          cruzadas que o novo ambiente de compartilhamento de dados (arts. 70 e 72 da Res. 140/2018,
          também atualizados pela 183/2025) torna possível.
        </p>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Para o texto completo da Resolução CGSN nº 183/2025 com comentários artigo a artigo, acesse a{" "}
            <Link
              href="/dashboard/legislacoes/res-cgsn-183"
              className="text-primary hover:underline font-medium"
            >
              página de legislação comentada
            </Link>.
          </p>
        </div>

      </article>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h2 className="text-xl font-bold text-foreground mt-8 mb-4 leading-snug">
      {title}
    </h2>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-primary bg-primary/10 px-6 py-4 text-sm text-foreground leading-relaxed">
      {children}
    </div>
  );
}
