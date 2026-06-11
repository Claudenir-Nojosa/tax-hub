// app/[lang]/privacy-policy/page.tsx
import { getFallback } from "@/lib/i18nFallback";

export default async function PrivacyPolicyPage({
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
          "Política de Privacidade",
          "Privacy Policy",
        );
      case "ultimaAtualizacao":
        return getFallback(
          currentLang,
          "Última atualização: 15 de Dezembro, 2023",
          "Last updated: December 15, 2023",
        );
      case "introducao":
        return getFallback(currentLang, "Introdução", "Introduction");
      case "dadosColetados":
        return getFallback(currentLang, "Dados Coletados", "Data We Collect");
      case "usoDados":
        return getFallback(
          currentLang,
          "Uso dos Dados",
          "How We Use Your Data",
        );
      case "compartilhamentoDados":
        return getFallback(
          currentLang,
          "Compartilhamento de Dados",
          "Data Sharing",
        );
      case "seguranca":
        return getFallback(currentLang, "Segurança", "Security");
      case "seusDireitos":
        return getFallback(currentLang, "Seus Direitos", "Your Rights");
      case "cookies":
        return getFallback(currentLang, "Cookies", "Cookies");
      case "contato":
        return getFallback(currentLang, "Contato", "Contact");

      // Texto do conteúdo
      case "introducaoTexto":
        return getFallback(
          currentLang,
          "Bem-vindo ao tax-hub, um software de gestão financeira pessoal. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações quando você usa nosso serviço. Ao utilizar nossa ferramenta, você concorda com a coleta e uso de informações de acordo com esta política.",
          "Welcome to tax-hub, a personal financial management software. This Privacy Policy describes how we collect, use, and protect your information when you use our service. By using our software, you agree to the collection and use of information in accordance with this policy.",
        );

      case "dadosColetadosTexto":
        return getFallback(
          currentLang,
          "Coletamos os seguintes tipos de informações:",
          "We collect the following types of information:",
        );

      case "dadosPessoais":
        return getFallback(currentLang, "Dados Pessoais", "Personal Data");
      case "dadosPessoaisLista":
        return getFallback(
          currentLang,
          "Nome, endereço de e-mail, informações de perfil.",
          "Name, email address, profile information.",
        );

      case "dadosFinanceiros":
        return getFallback(currentLang, "Dados Financeiros", "Financial Data");
      case "dadosFinanceirosLista":
        return getFallback(
          currentLang,
          "Transações (receitas e despesas), categorias, orçamentos, metas financeiras, cartões de crédito e débito (opcional).",
          "Transactions (income and expenses), categories, budgets, financial goals, credit and debit cards (optional).",
        );

      case "dadosUso":
        return getFallback(currentLang, "Dados de Uso", "Usage Data");
      case "dadosUsoLista":
        return getFallback(
          currentLang,
          "Como você interage com o aplicativo, páginas visitadas, recursos utilizados, dados de análise e diagnóstico.",
          "How you interact with the application, pages visited, features used, analytics and diagnostic data.",
        );

      case "usoDadosTexto":
        return getFallback(
          currentLang,
          "Utilizamos seus dados para:",
          "We use your data to:",
        );

      case "usoDadosLista1":
        return getFallback(
          currentLang,
          "Fornecer e manter nosso serviço de gestão financeira.",
          "Provide and maintain our financial management service.",
        );

      case "usoDadosLista2":
        return getFallback(
          currentLang,
          "Personalizar sua experiência e fornecer relatórios financeiros.",
          "Personalize your experience and provide financial reports.",
        );

      case "usoDadosLista4":
        return getFallback(
          currentLang,
          "Detectar e prevenir atividades fraudulentas.",
          "Detect and prevent fraudulent activities.",
        );

      case "compartilhamentoTexto1":
        return getFallback(
          currentLang,
          "Não vendemos, alugamos ou comercializamos seus dados pessoais. Podemos compartilhar informações apenas nas seguintes situações:",
          "We do not sell, rent, or trade your personal data. We may share information only in the following situations:",
        );

      case "compartilhamentoLista1":
        return getFallback(
          currentLang,
          "Com serviços de pagamento (como Stripe) para processar transações (quando aplicável).",
          "With payment services (like Stripe) to process transactions (when applicable).",
        );

      case "compartilhamentoLista2":
        return getFallback(
          currentLang,
          "Com serviços de análise (como Google Analytics) para melhorar nosso aplicativo.",
          "With analytics services (like Google Analytics) to improve our application.",
        );

      case "compartilhamentoLista3":
        return getFallback(
          currentLang,
          "Quando exigido por lei ou para proteger nossos direitos legais.",
          "When required by law or to protect our legal rights.",
        );

      case "segurancaTexto":
        return getFallback(
          currentLang,
          "Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia para dados sensíveis, autenticação segura e monitoramento contínuo.",
          "We implement technical and organizational security measures to protect your data against unauthorized access, alteration, disclosure, or destruction. We use encryption for sensitive data, secure authentication, and continuous monitoring.",
        );

      case "seusDireitosTexto":
        return getFallback(
          currentLang,
          "Você tem os seguintes direitos:",
          "You have the following rights:",
        );

      case "direitosLista1":
        return getFallback(
          currentLang,
          "Acessar seus dados pessoais armazenados por nós.",
          "Access your personal data stored by us.",
        );

      case "direitosLista2":
        return getFallback(
          currentLang,
          "Corrigir dados imprecisos ou incompletos.",
          "Correct inaccurate or incomplete data.",
        );

      case "direitosLista3":
        return getFallback(
          currentLang,
          "Solicitar a exclusão de seus dados pessoais.",
          "Request deletion of your personal data.",
        );

      case "direitosLista4":
        return getFallback(
          currentLang,
          "Exportar seus dados em formato legível.",
          "Export your data in a readable format.",
        );

      case "direitosLista5":
        return getFallback(
          currentLang,
          "Retirar consentimento para processamento de dados.",
          "Withdraw consent for data processing.",
        );

      case "cookiesTexto":
        return getFallback(
          currentLang,
          "Utilizamos cookies e tecnologias similares para melhorar sua experiência, lembrar suas preferências e analisar o uso do aplicativo. Você pode controlar cookies através das configurações do seu navegador.",
          "We use cookies and similar technologies to improve your experience, remember your preferences, and analyze application usage. You can control cookies through your browser settings.",
        );

      case "contatoTexto":
        return getFallback(
          currentLang,
          "Se você tiver alguma dúvida sobre esta Política de Privacidade ou sobre como lidamos com seus dados, entre em contato conosco:",
          "If you have any questions about this Privacy Policy or how we handle your data, please contact us:",
        );

      case "emailContato":
        return getFallback(
          currentLang,
          "Email: support@tax-hubapp.com",
          "Email: support@tax-hubapp.com",
        );

      case "alteracoesTexto":
        return getFallback(
          currentLang,
          "Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas através do aplicativo ou por e-mail.",
          "We may update this Privacy Policy periodically. We will notify you of significant changes through the application or by email.",
        );

      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    titulo: getTranslation("titulo"),
    ultimaAtualizacao: getTranslation("ultimaAtualizacao"),
    introducao: getTranslation("introducao"),
    dadosColetados: getTranslation("dadosColetados"),
    usoDados: getTranslation("usoDados"),
    compartilhamentoDados: getTranslation("compartilhamentoDados"),
    seguranca: getTranslation("seguranca"),
    seusDireitos: getTranslation("seusDireitos"),
    cookies: getTranslation("cookies"),
    contato: getTranslation("contato"),
    introducaoTexto: getTranslation("introducaoTexto"),
    dadosColetadosTexto: getTranslation("dadosColetadosTexto"),
    dadosPessoais: getTranslation("dadosPessoais"),
    dadosPessoaisLista: getTranslation("dadosPessoaisLista"),
    dadosFinanceiros: getTranslation("dadosFinanceiros"),
    dadosFinanceirosLista: getTranslation("dadosFinanceirosLista"),
    dadosUso: getTranslation("dadosUso"),
    dadosUsoLista: getTranslation("dadosUsoLista"),
    usoDadosTexto: getTranslation("usoDadosTexto"),
    usoDadosLista1: getTranslation("usoDadosLista1"),
    usoDadosLista2: getTranslation("usoDadosLista2"),
    usoDadosLista3: getTranslation("usoDadosLista3"),
    usoDadosLista4: getTranslation("usoDadosLista4"),
    compartilhamentoTexto1: getTranslation("compartilhamentoTexto1"),
    compartilhamentoLista1: getTranslation("compartilhamentoLista1"),
    compartilhamentoLista2: getTranslation("compartilhamentoLista2"),
    compartilhamentoLista3: getTranslation("compartilhamentoLista3"),
    segurancaTexto: getTranslation("segurancaTexto"),
    seusDireitosTexto: getTranslation("seusDireitosTexto"),
    direitosLista1: getTranslation("direitosLista1"),
    direitosLista2: getTranslation("direitosLista2"),
    direitosLista3: getTranslation("direitosLista3"),
    direitosLista4: getTranslation("direitosLista4"),
    direitosLista5: getTranslation("direitosLista5"),
    cookiesTexto: getTranslation("cookiesTexto"),
    contatoTexto: getTranslation("contatoTexto"),
    emailContato: getTranslation("emailContato"),
    alteracoesTexto: getTranslation("alteracoesTexto"),
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
          {/* Seção 1: Introdução */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              {translations.introducao}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {translations.introducaoTexto}
            </p>
          </section>

          {/* Seção 2: Dados Coletados */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.dadosColetados}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {translations.dadosColetadosTexto}
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {translations.dadosPessoais}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {translations.dadosPessoaisLista}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {translations.dadosFinanceiros}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {translations.dadosFinanceirosLista}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {translations.dadosUso}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {translations.dadosUsoLista}
                </p>
              </div>
            </div>
          </section>

          {/* Seção 3: Uso dos Dados */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.usoDados}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.usoDadosTexto}
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-1">
                  <span className="text-blue-600 dark:text-blue-300 text-sm">
                    1
                  </span>
                </div>
                {translations.usoDadosLista1}
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-1">
                  <span className="text-blue-600 dark:text-blue-300 text-sm">
                    2
                  </span>
                </div>
                {translations.usoDadosLista2}
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-1">
                  <span className="text-blue-600 dark:text-blue-300 text-sm">
                    3
                  </span>
                </div>
                {translations.usoDadosLista4}
              </li>
            </ul>
          </section>

          {/* Seção 4: Compartilhamento de Dados */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.compartilhamentoDados}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.compartilhamentoTexto1}
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 ml-4 list-disc">
              <li>{translations.compartilhamentoLista1}</li>
              <li>{translations.compartilhamentoLista2}</li>
              <li>{translations.compartilhamentoLista3}</li>
            </ul>
          </section>

          {/* Seção 5: Segurança */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.seguranca}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {translations.segurancaTexto}
            </p>
          </section>

          {/* Seção 6: Seus Direitos */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.seusDireitos}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.seusDireitosTexto}
            </p>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300 ml-4 list-disc">
              <li>{translations.direitosLista1}</li>
              <li>{translations.direitosLista2}</li>
              <li>{translations.direitosLista3}</li>
              <li>{translations.direitosLista4}</li>
              <li>{translations.direitosLista5}</li>
            </ul>
          </section>

          {/* Seção 7: Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.cookies}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {translations.cookiesTexto}
            </p>
          </section>

          {/* Seção 8: Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {translations.contato}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {translations.contatoTexto}
            </p>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {translations.emailContato}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-6">
              {translations.alteracoesTexto}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
