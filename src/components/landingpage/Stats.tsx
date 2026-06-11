"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

const STATS: StatItem[] = [
  { value: 10000, suffix: "+", label: "Usuários Ativos" },
  { value: 50, prefix: "R$", suffix: "M+", label: "Gerenciados" },
  { value: 30, suffix: "%", label: "Economia Média" },
  { value: 4.9, suffix: "/5", label: "Avaliação" },
];

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  isDecimal?: boolean;
  duration?: number;
}

const AnimatedCounter = ({
  value,
  prefix = "",
  suffix = "",
  isDecimal = false,
  duration = 2000,
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    const steps = 60;
    const stepValue = value / steps;
    const intervalDuration = duration / steps;
    let current = 0;
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      current = value * progress;
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(value); // Garante o valor final exato
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, value, duration]);

  const formattedValue = useMemo(() => {
    if (isDecimal) {
      return count.toFixed(1);
    }
    return Math.floor(count).toLocaleString("pt-BR");
  }, [count, isDecimal]);

  return (
    <span
      ref={ref}
      className="tabular-nums"
      aria-live="polite"
      aria-label={`${prefix}${formattedValue}${suffix}`}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};

interface StatCardProps {
  stat: StatItem;
  index: number;
}

const StatCard = ({ stat, index }: StatCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="text-center group"
      aria-label={`Estatística: ${stat.label}`}
    >
      <div className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent mb-2 transition-all duration-300 group-hover:scale-105">
        <AnimatedCounter
          value={stat.value}
          prefix={stat.prefix}
          suffix={stat.suffix}
          isDecimal={stat.value % 1 !== 0}
          duration={2000 + index * 200} // Delay escalonado
        />
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base lg:text-lg font-medium">
        {stat.label}
      </p>
    </motion.div>
  );
};

export const Stats = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isSectionInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const glowStyles = useMemo(
    () => ({
      background: "radial-gradient(circle at 50% 50%, rgba(0, 124, 202, 0.15) 0%, transparent 50%)",
    }),
    []
  );

  const glassStyles = useMemo(
    () => ({
      background: "rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    }),
    []
  );

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 lg:py-32 relative overflow-hidden scroll-mt-20"
      id="estatisticas"
      aria-labelledby="stats-heading"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/20 to-transparent dark:via-gray-900/20" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isSectionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Glow effect - otimizado para performance */}
          <div
            className="absolute inset-0 rounded-3xl opacity-30 blur-3xl pointer-events-none"
            style={glowStyles}
            aria-hidden="true"
          />

          {/* Stats container */}
          <div
            className="relative rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl transition-all duration-300 hover:shadow-3xl"
            style={glassStyles}
          >
            <h2
              id="stats-heading"
              className="sr-only"
            >
              Estatísticas
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {STATS.map((stat, index) => (
                <StatCard
                  key={`${stat.label}-${index}`}
                  stat={stat}
                  index={index}
                />
              ))}
            </div>

            {/* Decorative elements */}
            <div
              className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl"
              aria-hidden="true"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};