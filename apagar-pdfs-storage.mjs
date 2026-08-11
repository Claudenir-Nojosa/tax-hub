// Apaga de vez, direto no Supabase Storage, os arquivos das 6 matérias que você vai estudar só no
// futuro (Matemática Financeira, Economia e Finanças Públicas, Direito Empresarial, Direito
// Financeiro (AFO), Contabilidade Pública, Tecnologia da Informação). O REGISTRO no banco (nome,
// capítulos, intervalos de página, tópicos, links) NÃO é apagado — só o campo `arquivoEnviado`
// vira false, pra Biblioteca saber que o arquivo não existe mais e mostrar "Anexar" em vez de
// tentar abrir um PDF que já era. Quando quiser estudar de novo, é só reanexar o mesmo arquivo —
// capítulos e intervalos de página continuam mapeados automaticamente, sem redigitar nada.
//
// Como rodar (dentro da pasta do projeto, no seu terminal normal do Windows):
//   1) npx vercel env pull .env.producao.local --environment=production --yes
//   2) node apagar-pdfs-storage.mjs
//   (depois pode apagar o .env.producao.local — ele não deve ser commitado)
//
// É seguro rodar mais de uma vez: PDF já apagado manualmente (registro sumiu do banco, ou arquivo
// já sumiu do Storage) é simplesmente pulado, sem erro.

import dotenv from "dotenv";
dotenv.config({ path: "./.env.producao.local" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

// só a origem (protocolo+host), nunca um path colado junto — colar a URL de "/rest/v1" (a da API
// REST) em vez da Project URL crua faz o SDK montar um endereço errado pro Storage ("Invalid path
// specified in request URL"); new URL(...).origin descarta qualquer path/query/hash que tenha
// vindo junto, então funciona com qualquer uma das duas que for colada
const urlBruta = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
let url = "";
try {
  url = new URL(urlBruta).origin;
} catch {
  console.error(`NEXT_PUBLIC_SUPABASE_URL não é uma URL válida: "${urlBruta}"`);
  process.exit(1);
}
if (!url || !key) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  console.error("Confira se .env.producao.local está na mesma pasta e rodou 'npx vercel env pull .env.producao.local --environment=production --yes' antes.");
  process.exit(1);
}
console.log(`Usando Supabase em: ${url}`);
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const prisma = new PrismaClient();
const BUCKET = "biblioteca-pdfs";

const MATERIAS_ALVO = [
  "Matemática Financeira",
  "Economia e Finanças  Públicas", // espaço duplo mesmo — é como está gravado no banco
  "Direito Empresarial",
  "Direito Financeiro (AFO)",
  "Contabilidade Pública",
  "Tecnologia da  Informação", // espaço duplo mesmo
];
const CONCURSO_ID = "cms4u29bs0001e4wx7p3qbagk"; // Curso Regular para Área Fiscal

const pdfs = await prisma.pdfConcurso.findMany({
  where: { concursoId: CONCURSO_ID, materia: { in: MATERIAS_ALVO } },
});

console.log(`${pdfs.length} PDFs encontrados no banco pras 6 matérias-alvo.`);

let apagados = 0, falhas = 0;
const idsApagados = [];

// remove() do Storage aceita lote — mais rápido e não erra se algum path já não existir (Supabase
// trata como sucesso silencioso pra paths ausentes). Se o lote inteiro falhar (ex.: path
// realmente inválido em algum item), cai pra um-por-um, isolando qual path específico é o problema
// em vez de perder o lote inteiro por causa de 1 item ruim.
const paths = pdfs.map((p) => p.storagePath);
for (let i = 0; i < paths.length; i += 50) {
  const lotePdfs = pdfs.slice(i, i + 50);
  const lote = lotePdfs.map((p) => p.storagePath);
  const { data, error } = await admin.storage.from(BUCKET).remove(lote);
  if (!error) {
    apagados += data?.length ?? lote.length;
    idsApagados.push(...lotePdfs.map((p) => p.id));
    continue;
  }
  console.error(`Lote ${i}-${i + lote.length} falhou (${error.message}) — tentando um por um...`);
  for (const p of lotePdfs) {
    const { error: erroUm } = await admin.storage.from(BUCKET).remove([p.storagePath]);
    if (erroUm) {
      console.error(`  FALHOU: ${p.storagePath} (${p.materia} — ${p.nome}) — ${erroUm.message}`);
      falhas += 1;
    } else {
      apagados += 1;
      idsApagados.push(p.id);
    }
  }
}

// flip arquivoEnviado=false só nos que REALMENTE foram apagados do Storage — os que falharam
// continuam arquivoEnviado=true (ainda dá pra ler/abrir normalmente, nada quebrado)
const result = await prisma.pdfConcurso.updateMany({
  where: { id: { in: idsApagados } },
  data: { arquivoEnviado: false },
});

console.log(`\nStorage: ${apagados} objetos removidos, ${falhas} falhas.`);
console.log(`Banco: ${result.count} registros marcados como arquivoEnviado=false (capítulos/tópicos preservados).`);
console.log(`\nPronto. Confira em alguns minutos no dashboard do Supabase (Storage → uso) — a métrica de uso costuma demorar um pouco pra atualizar depois de apagar em massa.`);

await prisma.$disconnect();
