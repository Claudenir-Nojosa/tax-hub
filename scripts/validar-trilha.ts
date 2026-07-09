import {
  MATERIAS,
  topicoKey,
  buildDefaultConfigCiclo,
  type TopicoState,
  type TrilhaConfig,
  type TrilhaEstudo,
  type TrilhaNivelMateria,
} from "./src/lib/estudo-data";
import { gerarTrilha, estimarResumo, atualizarTrilha, topicosNaoCobertos, metaAtualIndex, proximoStatus } from "./src/lib/trilha-generator";

let falhas = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    falhas++;
    console.error("  ✗ FALHOU:", msg);
  }
}

const configCiclo = buildDefaultConfigCiclo();
const materias = MATERIAS.map((m) => ({ nome: m.nome, topicos: m.topicos }));
const totalTopicos = materias.reduce((s, m) => s + m.topicos.length, 0);
console.log(`edital: ${materias.length} matérias, ${totalTopicos} tópicos\n`);

function nivelTodas(nivel: TrilhaNivelMateria): Record<string, TrilhaNivelMateria> {
  return Object.fromEntries(materias.map((m) => [m.nome, nivel]));
}

// ── Cenário 1: tudo-nunca / Normal ───────────────────────────────────────────
console.log("1) tudo-nunca / Normal");
const cfg1: TrilhaConfig = { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca"), puladas: [] };
const metas1 = gerarTrilha({ materias, config: cfg1, topicos: {}, configCiclo });
const resumo1 = estimarResumo(metas1, "2026-08-01");
console.log(`  ${resumo1.totalMetas} metas · ${Math.round(resumo1.totalMinutos / 60)}h totais · cabe até a prova: ${resumo1.cabeAteProva}`);

// orçamento por meta (±10%, exceto metas finais de revisão)
const ORCAMENTO = 1890;
const metasSoRevisao = new Set<number>();
metas1.forEach((m) => {
  const soRevisao = m.atividades.every((a) => a.tipo === "revisao");
  if (soRevisao) metasSoRevisao.add(m.numero);
  const minutos = m.atividades.reduce((s, a) => s + a.duracaoMin, 0);
  if (!soRevisao) assert(minutos <= ORCAMENTO * 1.1, `meta ${m.numero} estourou orçamento: ${minutos}min`);
  // trava de variedade vale pra CONTEÚDO NOVO (teoria/questões); revisões passam livres
  const nMateriasNovas = new Set(m.atividades.filter((a) => a.tipo !== "revisao").map((a) => a.materia)).size;
  assert(nMateriasNovas <= 4, `meta ${m.numero} tem ${nMateriasNovas} matérias de conteúdo novo (>4)`);
});

// revisões: rev1 ≥ meta de estudo + 1; rev2 ≥ meta de estudo + 4
const metaEstudo = new Map<string, number>();
const metaRev = new Map<string, { r1?: number; r2?: number }>();
for (const m of metas1) {
  for (const a of m.atividades) {
    const chave = `${a.materia}::${a.topicos[0]}`;
    if (a.tipo === "questoes") metaEstudo.set(chave, m.numero);
    if (a.tipo === "revisao") {
      const r = metaRev.get(chave) ?? {};
      if (a.numeroRevisao === 1) r.r1 = m.numero;
      else r.r2 = m.numero;
      metaRev.set(chave, r);
    }
  }
}
let rev1Exata = 0, rev1Total = 0;
for (const [chave, est] of metaEstudo) {
  const r = metaRev.get(chave);
  assert(!!r?.r1 && !!r?.r2, `bloco ${chave} sem as 2 revisões`);
  if (r?.r1) {
    assert(r.r1 >= est + 1, `rev1 de ${chave} veio antes de N+1 (estudo ${est}, rev ${r.r1})`);
    rev1Total++;
    if (r.r1 === est + 1) rev1Exata++;
  }
  // rev2 respeita N+4, exceto no rabo da trilha (metas só-de-revisão agrupam por vencimento)
  if (r?.r2) {
    assert(
      r.r2 >= est + 4 || metasSoRevisao.has(r.r2),
      `rev2 de ${chave} veio antes de N+4 fora do rabo (estudo ${est}, rev ${r.r2})`
    );
    assert(r.r2 >= est + 2, `rev2 de ${chave} cedo demais mesmo pro rabo (estudo ${est}, rev ${r.r2})`);
  }
}
console.log(`  rev1 exatamente em N+1: ${rev1Exata}/${rev1Total}`);

// determinismo
const metas1b = gerarTrilha({ materias, config: cfg1, topicos: {}, configCiclo });
assert(JSON.stringify(metas1) === JSON.stringify(metas1b), "geração não é determinística");

// ── Cenário 2: tudo-arestas / Hardcore ───────────────────────────────────────
console.log("2) tudo-arestas / Hardcore");
const cfg2: TrilhaConfig = { disponibilidade: "hardcore", nivelPorMateria: nivelTodas("arestas"), puladas: [] };
const metas2 = gerarTrilha({ materias, config: cfg2, topicos: {}, configCiclo });
assert(metas2.every((m) => m.atividades.every((a) => a.tipo !== "teoria")), "arestas gerou teoria");
console.log(`  ${metas2.length} metas, zero teorias ✓`);

// ── Cenário 3: mix com puladas + tópicos pré-estudados ───────────────────────
console.log("3) mix com puladas e pré-estudados");
const puladas = [materias[3].nome, materias[7].nome];
const nivelMix = nivelTodas("comecei");
nivelMix[materias[0].nome] = "sem_confianca";
const preEstudados: Record<string, TopicoState> = {};
for (const t of materias[1].topicos.slice(0, 5)) {
  preEstudados[topicoKey(materias[1].nome, t)] = {
    estudado: true,
    cadernos: { A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 } },
  };
}
const cfg3: TrilhaConfig = { disponibilidade: "easy", nivelPorMateria: nivelMix, puladas };
const metas3 = gerarTrilha({ materias, config: cfg3, topicos: preEstudados, configCiclo });
assert(
  metas3.every((m) => m.atividades.every((a) => !puladas.includes(a.materia))),
  "matéria pulada apareceu na trilha"
);
for (const m of metas3) {
  for (const a of m.atividades) {
    if (a.tipo !== "teoria") continue;
    for (const t of a.topicos) {
      assert(!preEstudados[topicoKey(a.materia, t)], `tópico pré-estudado ganhou teoria: ${t}`);
    }
  }
}
console.log(`  ${metas3.length} metas, puladas fora e pré-estudados sem teoria ✓`);

// ── Cenário 4: atualizarTrilha cobre tópico adicionado ───────────────────────
console.log("4) atualizarTrilha");
const materiasMenos = materias.map((m, i) => (i === 0 ? { ...m, topicos: m.topicos.slice(0, -2) } : m));
const metas4 = gerarTrilha({ materias: materiasMenos, config: cfg1, topicos: {}, configCiclo });
const trilha4: TrilhaEstudo = { config: cfg1, metas: metas4, criadaEm: new Date().toISOString(), versao: 1 };
const faltando = topicosNaoCobertos(trilha4, materias);
assert(faltando.length === 2, `esperava 2 tópicos não cobertos, achou ${faltando.length}`);
const trilha4b = atualizarTrilha(trilha4, materias, {}, configCiclo);
assert(topicosNaoCobertos(trilha4b, materias).length === 0, "atualizarTrilha não cobriu os novos tópicos");
assert(trilha4b.versao === 2, "versao não incrementou");
assert(trilha4b.metas.length > metas4.length, "não anexou metas novas");
const numeros = trilha4b.metas.map((m) => m.numero);
assert(numeros.every((n, i) => n === i + 1), "numeração não é contínua");
console.log(`  +${trilha4b.metas.length - metas4.length} meta(s) anexada(s), numeração contínua ✓`);

// ── Helpers ──────────────────────────────────────────────────────────────────
assert(proximoStatus("nao_iniciada") === "iniciada" && proximoStatus("concluida") === "nao_iniciada", "ciclo de status errado");
assert(metaAtualIndex(metas1) === 0, "metaAtualIndex inicial deveria ser 0");

console.log(falhas === 0 ? "\nTODOS OS ASSERTS PASSARAM ✓" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
