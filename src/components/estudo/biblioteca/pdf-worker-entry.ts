// Entry do worker do pdf.js, com polyfill de `Promise.withResolvers` ANTES de carregar o worker
// de verdade — ver o comentário completo em VisorPdf.tsx (mesmo polyfill duplicado lá pro thread
// principal; contextos de execução diferentes, cada um com seu próprio global `Promise`).
if (!("withResolvers" in Promise)) {
  // @ts-expect-error -- polyfill de API ES2024 ausente em runtimes mais antigos (iOS < 17.4 etc.)
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import "pdfjs-dist/build/pdf.worker.min.mjs";
