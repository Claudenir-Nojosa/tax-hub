"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function Loading() {
  const [fase, setFase] = useState(0);
  const fases = [1, 2, 3];

  useEffect(() => {
    const interval = setInterval(() => {
      setFase((prev) => (prev + 1) % fases.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const imagens = {
    1: "/loading/1.png",
    2: "/loading/2.png",
    3: "/loading/3.png",
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-40">
      <div className="text-center">
        {/* Container principal ampliado */}
        <div className="relative h-64 w-64 mx-auto flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={fase}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.5,
                  ease: "easeOut",
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: {
                  duration: 0.4,
                  ease: "easeIn",
                },
              }}
              className="absolute"
            >
              <Image
                src={imagens[fases[fase] as keyof typeof imagens]}
                alt="Carregando"
                width={220}
                height={220}
                className="drop-shadow-lg"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
