"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItemProps) => {
  return (
    <motion.div
      layout
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-gradient-to-r from-[#00cfec]/5 to-[#007cca]/5 transition-colors"
        onClick={onClick}
      >
        <span className="font-semibold text-gray-900 dark:text-white pr-4 text-sm md:text-base">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          {isOpen ? (
            <Minus className="w-5 h-5 text-[#007cca] dark:text-[#00cfec]" />
          ) : (
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-5 pt-2">
              <motion.p
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FAQ = () => {
  const { t } = useTranslation(["faq", "common"]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const getFAQData = () => {
    const fallbackData = [
      {
        question: "How does tax-hub work?",
        answer:
          "tax-hub is an intelligent financial assistant that simplifies your transactions, sets spending limits, and provides personalized insights to help you stay in control of your finances.",
      },
      {
        question: "Is my financial data secure?",
        answer:
          "Yes! We use bank-level encryption (256-bit SSL) and never store your login credentials. Your data is exclusively yours and is never shared with third parties.",
      },
      {
        question: "Can I cancel my subscription at any time?",
        answer:
          "Yes, no hassle! You can cancel your subscription at any time directly in the app. There are no cancellation fees, and you will continue to have access until the end of the paid period.",
      },
      {
        question: "How does the free trial period work?",
        answer:
          "We offer a 7-day free trial with full access to all premium features. After the trial period, you can choose whether to continue with one of our plans.",
      },
      {
        question: "Does tax-hub work on mobile devices?",
        answer:
          "Yes! tax-hub works perfectly on mobile devices through a responsive web interface. Your data is synced in real time across all devices.",
      },
      {
        question: "How does the AI analysis work?",
        answer:
          "Our artificial intelligence analyzes your spending patterns, compares them with market benchmarks, and identifies opportunities to save money over time.",
      },
      {
        question: "Do I need financial knowledge to use it?",
        answer:
          "No! tax-hub was designed to be intuitive and accessible for everyone. The interface is simple and easy to understand.",
      },
    ];

    try {
      const translatedData = [];
      for (let i = 1; i <= fallbackData.length; i++) {
        const q = t(`faq:items.q${i}`, {
          defaultValue: fallbackData[i - 1].question,
        });
        const a = t(`faq:items.a${i}`, {
          defaultValue: fallbackData[i - 1].answer,
        });

        translatedData.push({ question: q, answer: a });
      }
      return translatedData;
    } catch (error) {
      console.log("FAQ translation error, using fallback:", error);
      return fallbackData;
    }
  };

  const faqData = getFAQData();

  const badgeText = t("faq:badge", {
    defaultValue: "Frequently Asked Questions",
  });
  const titlePart1 = t("faq:title.part1", {
    defaultValue: "Questions?",
  });
  const titlePart2 = t("faq:title.part2", {
    defaultValue: "We have the answers",
  });
  const subtitleText = t("faq:subtitle", {
    defaultValue:
      "Check out the most common questions about tax-hub. Didn’t find what you’re looking for? Contact us!",
  });
  const stillQuestions = t("faq:stillHaveQuestions", {
    defaultValue: "Still have questions?",
  });
  const contactSupport = t("faq:contactSupport", {
    defaultValue: "Contact our support",
  });

  return (
    <section
      className="py-20 md:py-24 relative overflow-hidden bg-background"
      id="faq"
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <motion.span className="inline-block px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00cfec]/10 to-[#007cca]/10 text-[#007cca] dark:text-[#00cfec] text-xs font-medium mb-3 border border-[#00cfec]/20">
            {badgeText}
          </motion.span>

          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900 dark:text-white">
            {titlePart1}{" "}
            <span className="bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
              {titlePart2}
            </span>
          </h2>

          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            {subtitleText}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqData.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => toggleFAQ(index)}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            {stillQuestions}
          </p>
          <a
            href="mailto:support@tax-hubapp.com?subject=tax-hub%20Support"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/80 dark:bg-gray-900/80 border hover:bg-gradient-to-r from-[#00cfec]/5 to-[#007cca]/5 transition-colors font-medium text-sm"
          >
            {contactSupport}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
