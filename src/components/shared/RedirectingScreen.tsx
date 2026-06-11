// components/shared/RedirectingScreen.tsx
"use client";

import { Loading } from "../ui/loading-barrinhas";
import { motion } from "framer-motion";

export function RedirectingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-gray-950 z-50"
    >
      <div className="container mx-auto h-full flex flex-col items-center justify-center px-4">
        {/* Conteúdo principal centralizado verticalmente */}
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
          
          {/* Container do loading com espaço controlado */}
          <div className="relative w-full flex justify-center mb-8">
            <div className="relative h-64 w-64 flex items-center justify-center -mt-10">
              <Loading />
            </div>
          </div>
          
          {/* Texto com animação suave */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-4"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Preparando sua jornada!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                Vamos conhecer você melhor para criar uma experiência personalizada
              </p>
            </div>
            
            {/* Indicador de progresso sutil */}
            <div className="pt-4">
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3].map((dot) => (
                  <motion.div
                    key={dot}
                    className="w-2 h-2 rounded-full bg-blue-200 dark:bg-gray-700"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      backgroundColor: ["#bfdbfe", "#3b82f6", "#bfdbfe"]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: dot * 0.2
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Redirecionando em breve...
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}