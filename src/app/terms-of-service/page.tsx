// app/[lang]/terms-of-service/page.tsx
import { getFallback } from "@/lib/i18nFallback";

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = lang || "pt";

  // Função auxiliar para obter tradução com fallback
  const getTranslation = (key: string) => {
    switch (key) {
      // Títulos e headers
      case "titulo":
        return getFallback(
          currentLang,
          "Termos de Serviço",
          "Terms of Service",
        );
      case "ultimaAtualizacao":
        return getFallback(
          currentLang,
          "Última atualização: 15 de Dezembro, 2023",
          "Last updated: December 15, 2023",
        );
      case "aceitacaoTermos":
        return getFallback(
          currentLang,
          "Aceitação dos Termos",
          "Acceptance of Terms",
        );
      case "descricaoServico":
        return getFallback(
          currentLang,
          "Descrição do Serviço",
          "Service Description",
        );
      case "cadastroConta":
        return getFallback(
          currentLang,
          "Cadastro e Conta",
          "Registration and Account",
        );
      case "responsabilidadeUsuario":
        return getFallback(
          currentLang,
          "Responsabilidades do Usuário",
          "User Responsibilities",
        );
      case "propriedadeIntelectual":
        return getFallback(
          currentLang,
          "Propriedade Intelectual",
          "Intellectual Property",
        );
      case "privacidade":
        return getFallback(currentLang, "Privacidade", "Privacy");
      case "limitacaoResponsabilidade":
        return getFallback(
          currentLang,
          "Limitação de Responsabilidade",
          "Limitation of Liability",
        );
      case "encerramento":
        return getFallback(currentLang, "Encerramento", "Termination");
      case "alteracoesTermos":
        return getFallback(
          currentLang,
          "Alterações nos Termos",
          "Changes to Terms",
        );
      case "legislacao":
        return getFallback(
          currentLang,
          "Legislação Aplicável",
          "Governing Law",
        );
      case "contato":
        return getFallback(currentLang, "Contato", "Contact");

      // Texto do conteúdo
      case "aceitacaoTexto1":
        return getFallback(
          currentLang,
          "Ao acessar e utilizar o aplicativo tax-hub, você concorda em cumprir e ficar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, você não deve usar nosso serviço.",
          "By accessing and using the tax-hub application, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our service.",
        );

      case "aceitacaoTexto2":
        return getFallback(
          currentLang,
          "Estes termos constituem um acordo legal entre você e a tax-hub. Recomendamos que você leia cuidadosamente todos os termos antes de usar o aplicativo.",
          "These terms constitute a legal agreement between you and tax-hub. We recommend that you carefully read all terms before using the application.",
        );

      case "descricaoTexto1":
        return getFallback(
          currentLang,
          "tax-hub é uma aplicação web de gestão financeira pessoal que permite aos usuários:",
          "tax-hub is a personal financial management web application that allows users to:",
        );

      case "descricaoLista1":
        return getFallback(
          currentLang,
          "Registrar receitas e despesas",
          "Record income and expenses",
        );

      case "descricaoLista2":
        return getFallback(
          currentLang,
          "Criar orçamentos e metas financeiras",
          "Create budgets and financial goals",
        );

      case "descricaoLista3":
        return getFallback(
          currentLang,
          "Acompanhar gastos por categoria",
          "Track spending by category",
        );

      case "descricaoLista4":
        return getFallback(
          currentLang,
          "Visualizar relatórios e gráficos financeiros",
          "View financial reports and charts",
        );

      case "descricaoLista5":
        return getFallback(
          currentLang,
          "Gerenciar cartões de crédito e débito",
          "Manage credit and debit cards",
        );

      case "descricaoTexto2":
        return getFallback(
          currentLang,
          "O serviço é fornecido 'como está' e pode sofrer alterações, melhorias ou interrupções sem aviso prévio.",
          "The service is provided 'as is' and may undergo changes, improvements, or interruptions without prior notice.",
        );

      case "cadastroTexto1":
        return getFallback(
          currentLang,
          "Para usar o serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por:",
          "To use the service, you must create an account by providing accurate and complete information. You are responsible for:",
        );

      case "cadastroLista1":
        return getFallback(
          currentLang,
          "Manter a confidencialidade de sua senha",
          "Maintaining the confidentiality of your password",
        );

      case "cadastroLista2":
        return getFallback(
          currentLang,
          "Toda atividade que ocorre em sua conta",
          "All activity that occurs in your account",
        );

      case "cadastroLista3":
        return getFallback(
          currentLang,
          "Notificar-nos imediatamente sobre qualquer uso não autorizado",
          "Notifying us immediately of any unauthorized use",
        );

      case "cadastroTexto2":
        return getFallback(
          currentLang,
          "Você deve ter pelo menos 18 anos ou idade legal em sua jurisdição para usar nosso serviço.",
          "You must be at least 18 years old or of legal age in your jurisdiction to use our service.",
        );

      case "responsabilidadeTexto1":
        return getFallback(
          currentLang,
          "Ao usar nosso serviço, você concorda em:",
          "When using our service, you agree to:",
        );

      case "responsabilidadeLista1":
        return getFallback(
          currentLang,
          "Fornecer informações financeiras precisas",
          "Provide accurate financial information",
        );

      case "responsabilidadeLista2":
        return getFallback(
          currentLang,
          "Não usar o serviço para atividades ilegais",
          "Not use the service for illegal activities",
        );

      case "responsabilidadeLista3":
        return getFallback(
          currentLang,
          "Não tentar acessar contas de outros usuários",
          "Not attempt to access other users' accounts",
        );

      case "responsabilidadeLista4":
        return getFallback(
          currentLang,
          "Não interferir no funcionamento do serviço",
          "Not interfere with the service operation",
        );

      case "responsabilidadeLista5":
        return getFallback(
          currentLang,
          "Não utilizar robôs, crawlers ou métodos automatizados",
          "Not use robots, crawlers, or automated methods",
        );

      case "propriedadeTexto1":
        return getFallback(
          currentLang,
          "Todo o conteúdo, design, logotipos, gráficos e software do tax-hub são propriedade exclusiva da nossa empresa e estão protegidos por leis de direitos autorais e propriedade intelectual.",
          "All content, design, logos, graphics, and software of tax-hub are the exclusive property of our company and are protected by copyright and intellectual property laws.",
        );

      case "propriedadeTexto2":
        return getFallback(
          currentLang,
          "Você não pode copiar, modificar, distribuir ou criar trabalhos derivados baseados em nosso serviço sem autorização expressa por escrito.",
          "You may not copy, modify, distribute, or create derivative works based on our service without express written authorization.",
        );

      case "propriedadeTexto3":
        return getFallback(
          currentLang,
          "Você mantém os direitos sobre seus dados financeiros inseridos no aplicativo. No entanto, nos concede uma licença limitada para processar e armazenar esses dados para fornecer o serviço.",
          "You retain rights to your financial data entered into the application. However, you grant us a limited license to process and store this data to provide the service.",
        );

      case "privacidadeTexto1":
        return getFallback(
          currentLang,
          "Sua privacidade é importante para nós. Coletamos e usamos suas informações conforme descrito em nossa Política de Privacidade. Ao usar nosso serviço, você concorda com nossas práticas de coleta e uso de dados.",
          "Your privacy is important to us. We collect and use your information as described in our Privacy Policy. By using our service, you agree to our data collection and use practices.",
        );

      case "limitacaoTexto1":
        return getFallback(
          currentLang,
          "O tax-hub é fornecido para fins informativos e de gestão pessoal. Não somos uma instituição financeira, consultoria de investimentos ou serviço de assessoria financeira profissional.",
          "tax-hub is provided for informational and personal management purposes. We are not a financial institution, investment advisory, or professional financial advisory service.",
        );

      case "limitacaoTexto2":
        return getFallback(
          currentLang,
          "Não garantimos a precisão, integridade ou atualidade das informações financeiras fornecidas. Você deve verificar informações importantes com fontes autorizadas.",
          "We do not guarantee the accuracy, completeness, or timeliness of financial information provided. You should verify important information with authorized sources.",
        );

      case "limitacaoTexto3":
        return getFallback(
          currentLang,
          "Em nenhum caso seremos responsáveis por quaisquer danos diretos, indiretos, incidentais ou consequenciais resultantes do uso ou incapacidade de usar nosso serviço.",
          "In no event shall we be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our service.",
        );

      case "encerramentoTexto1":
        return getFallback(
          currentLang,
          "Podemos encerrar ou suspender sua conta a qualquer momento, sem aviso prévio, por violação destes termos ou por qualquer outra razão a nosso critério.",
          "We may terminate or suspend your account at any time, without notice, for violation of these terms or for any other reason at our discretion.",
        );

      case "encerramentoTexto2":
        return getFallback(
          currentLang,
          "Você pode encerrar sua conta a qualquer momento entrando em contato conosco. Após o encerramento, seus dados poderão ser retidos por um período razoável conforme exigido por lei.",
          "You may terminate your account at any time by contacting us. After termination, your data may be retained for a reasonable period as required by law.",
        );

      case "alteracoesTexto1":
        return getFallback(
          currentLang,
          "Reservamo-nos o direito de modificar ou atualizar estes Termos de Serviço a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação no aplicativo.",
          "We reserve the right to modify or update these Terms of Service at any time. Changes will take effect immediately after posting in the application.",
        );

      case "alteracoesTexto2":
        return getFallback(
          currentLang,
          "O uso continuado do serviço após as alterações constitui aceitação dos novos termos. Recomendamos que você revise periodicamente esta página para se manter informado.",
          "Continued use of the service after changes constitutes acceptance of the new terms. We recommend that you periodically review this page to stay informed.",
        );

      case "legislacaoTexto1":
        return getFallback(
          currentLang,
          "Estes Termos de Serviço serão regidos e interpretados de acordo com as leis do Brasil, sem considerar seus princípios de conflito de leis.",
          "These Terms of Service shall be governed and construed in accordance with the laws of Brazil, without regard to its conflict of law principles.",
        );

      case "legislacaoTexto2":
        return getFallback(
          currentLang,
          "Qualquer disputa relacionada a estes termos será resolvida nos tribunais competentes da cidade de São Paulo, Brasil.",
          "Any dispute relating to these terms shall be resolved in the competent courts of the city of São Paulo, Brazil.",
        );

      case "contatoTexto1":
        return getFallback(
          currentLang,
          "Se você tiver alguma dúvida sobre estes Termos de Serviço, entre em contato conosco:",
          "If you have any questions about these Terms of Service, please contact us:",
        );

      case "emailContato":
        return getFallback(
          currentLang,
          "Email: support@tax-hubapp.com",
          "Email: support@tax-hubapp.com",
        );

      case "enderecoContato":
        return getFallback(
          currentLang,
          "Endereço: Rua das Finanças, 123 - Centro, São Paulo - SP, 01001-001",
          "Address: Finance Street, 123 - Centro, São Paulo - SP, 01001-001",
        );

      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    titulo: getTranslation("titulo"),
    ultimaAtualizacao: getTranslation("ultimaAtualizacao"),
    aceitacaoTermos: getTranslation("aceitacaoTermos"),
    descricaoServico: getTranslation("descricaoServico"),
    cadastroConta: getTranslation("cadastroConta"),
    responsabilidadeUsuario: getTranslation("responsabilidadeUsuario"),
    propriedadeIntelectual: getTranslation("propriedadeIntelectual"),
    privacidade: getTranslation("privacidade"),
    limitacaoResponsabilidade: getTranslation("limitacaoResponsabilidade"),
    encerramento: getTranslation("encerramento"),
    alteracoesTermos: getTranslation("alteracoesTermos"),
    legislacao: getTranslation("legislacao"),
    contato: getTranslation("contato"),
    aceitacaoTexto1: getTranslation("aceitacaoTexto1"),
    aceitacaoTexto2: getTranslation("aceitacaoTexto2"),
    descricaoTexto1: getTranslation("descricaoTexto1"),
    descricaoLista1: getTranslation("descricaoLista1"),
    descricaoLista2: getTranslation("descricaoLista2"),
    descricaoLista3: getTranslation("descricaoLista3"),
    descricaoLista4: getTranslation("descricaoLista4"),
    descricaoLista5: getTranslation("descricaoLista5"),
    descricaoTexto2: getTranslation("descricaoTexto2"),
    cadastroTexto1: getTranslation("cadastroTexto1"),
    cadastroLista1: getTranslation("cadastroLista1"),
    cadastroLista2: getTranslation("cadastroLista2"),
    cadastroLista3: getTranslation("cadastroLista3"),
    cadastroTexto2: getTranslation("cadastroTexto2"),
    responsabilidadeTexto1: getTranslation("responsabilidadeTexto1"),
    responsabilidadeLista1: getTranslation("responsabilidadeLista1"),
    responsabilidadeLista2: getTranslation("responsabilidadeLista2"),
    responsabilidadeLista3: getTranslation("responsabilidadeLista3"),
    responsabilidadeLista4: getTranslation("responsabilidadeLista4"),
    responsabilidadeLista5: getTranslation("responsabilidadeLista5"),
    propriedadeTexto1: getTranslation("propriedadeTexto1"),
    propriedadeTexto2: getTranslation("propriedadeTexto2"),
    propriedadeTexto3: getTranslation("propriedadeTexto3"),
    privacidadeTexto1: getTranslation("privacidadeTexto1"),
    limitacaoTexto1: getTranslation("limitacaoTexto1"),
    limitacaoTexto2: getTranslation("limitacaoTexto2"),
    limitacaoTexto3: getTranslation("limitacaoTexto3"),
    encerramentoTexto1: getTranslation("encerramentoTexto1"),
    encerramentoTexto2: getTranslation("encerramentoTexto2"),
    alteracoesTexto1: getTranslation("alteracoesTexto1"),
    alteracoesTexto2: getTranslation("alteracoesTexto2"),
    legislacaoTexto1: getTranslation("legislacaoTexto1"),
    legislacaoTexto2: getTranslation("legislacaoTexto2"),
    contatoTexto1: getTranslation("contatoTexto1"),
    emailContato: getTranslation("emailContato"),
    enderecoContato: getTranslation("enderecoContato"),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {translations.titulo}
          </h1>
        </div>

        {/* Conteúdo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-10">
          {/* Seção 1: Aceitação dos Termos */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              {translations.aceitacaoTermos}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {translations.aceitacaoTexto1}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {translations.aceitacaoTexto2}
            </p>
          </section>

          {/* Seção 2: Descrição do Serviço */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.descricaoServico}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {translations.descricaoTexto1}
            </p>

            <ul className="space-y-3 text-gray-700 dark:text-gray-300 ml-4 list-disc mb-6">
              <li>{translations.descricaoLista1}</li>
              <li>{translations.descricaoLista2}</li>
              <li>{translations.descricaoLista3}</li>
              <li>{translations.descricaoLista4}</li>
              <li>{translations.descricaoLista5}</li>
            </ul>

            <p className="text-gray-700 dark:text-gray-300">
              {translations.descricaoTexto2}
            </p>
          </section>

          {/* Seção 3: Cadastro e Conta */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.cadastroConta}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.cadastroTexto1}
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 ml-4 list-disc mb-6">
              <li>{translations.cadastroLista1}</li>
              <li>{translations.cadastroLista2}</li>
              <li>{translations.cadastroLista3}</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              {translations.cadastroTexto2}
            </p>
          </section>

          {/* Seção 4: Responsabilidades do Usuário */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.responsabilidadeUsuario}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.responsabilidadeTexto1}
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 ml-4 list-disc">
              <li>{translations.responsabilidadeLista1}</li>
              <li>{translations.responsabilidadeLista2}</li>
              <li>{translations.responsabilidadeLista3}</li>
              <li>{translations.responsabilidadeLista4}</li>
              <li>{translations.responsabilidadeLista5}</li>
            </ul>
          </section>

          {/* Seção 5: Propriedade Intelectual */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.propriedadeIntelectual}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.propriedadeTexto1}
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.propriedadeTexto2}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {translations.propriedadeTexto3}
            </p>
          </section>

          {/* Seção 6: Privacidade */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.privacidade}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {translations.privacidadeTexto1}
            </p>
          </section>

          {/* Seção 7: Limitação de Responsabilidade */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.limitacaoResponsabilidade}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.limitacaoTexto1}
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.limitacaoTexto2}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {translations.limitacaoTexto3}
            </p>
          </section>

          {/* Seção 9: Alterações nos Termos */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.alteracoesTermos}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.alteracoesTexto1}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {translations.alteracoesTexto2}
            </p>
          </section>

          {/* Seção 11: Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.contato}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.contatoTexto1}
            </p>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {translations.emailContato}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
