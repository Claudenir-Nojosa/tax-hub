import {
  MATERIAS,
  topicoKey,
  buildDefaultConfigCiclo,
  type EstudoConfigCiclo,
  type TopicoState,
  type TrilhaConfig,
  type TrilhaEstudo,
  type TrilhaNivelMateria,
} from "../src/lib/estudo-data";
import {
  gerarTrilha, estimarResumo, atualizarTrilha, topicosNaoCobertos, metaAtualIndex, proximoStatus,
  materiasConcluidasNaTrilha,
} from "../src/lib/trilha-generator";

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
const cfg1: TrilhaConfig = { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") };
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
const cfg2: TrilhaConfig = { disponibilidade: "hardcore", nivelPorMateria: nivelTodas("arestas") };
const metas2 = gerarTrilha({ materias, config: cfg2, topicos: {}, configCiclo });
assert(metas2.every((m) => m.atividades.every((a) => a.tipo !== "teoria")), "arestas gerou teoria");
console.log(`  ${metas2.length} metas, zero teorias ✓`);

// ── Cenário 3: mix com matérias fora do Ciclo + tópicos pré-estudados ────────
console.log("3) mix com matérias fora do Ciclo e pré-estudados");
const foraDoCiclo = [materias[3].nome, materias[7].nome];
const nivelMix = nivelTodas("comecei");
nivelMix[materias[0].nome] = "sem_confianca";
const preEstudados: Record<string, TopicoState> = {};
for (const t of materias[1].topicos.slice(0, 5)) {
  preEstudados[topicoKey(materias[1].nome, t)] = {
    estudado: true,
    cadernos: { A: { acertos: 0, erros: 0 }, B: { acertos: 0, erros: 0 }, C: { acertos: 0, erros: 0 }, D: { acertos: 0, erros: 0 } },
  };
}
// fonte de verdade de "matéria ativa" é o Ciclo, não mais um campo próprio da Trilha
const configCiclo3: EstudoConfigCiclo = {
  ...configCiclo,
  materias: {
    ...configCiclo.materias,
    [foraDoCiclo[0]]: { ...configCiclo.materias[foraDoCiclo[0]], incluir: false },
    [foraDoCiclo[1]]: { ...configCiclo.materias[foraDoCiclo[1]], incluir: false },
  },
};
const cfg3: TrilhaConfig = { disponibilidade: "easy", nivelPorMateria: nivelMix };
const metas3 = gerarTrilha({ materias, config: cfg3, topicos: preEstudados, configCiclo: configCiclo3 });
assert(
  metas3.every((m) => m.atividades.every((a) => !foraDoCiclo.includes(a.materia))),
  "matéria fora do Ciclo apareceu na trilha"
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
// força materias[0] incluída no Ciclo (por padrão ela vem incluir=false — irrelevante pra este
// cenário, que testa cobertura de tópicos, não o filtro do Ciclo em si, coberto no cenário 5)
const configCiclo4: EstudoConfigCiclo = {
  ...configCiclo,
  materias: { ...configCiclo.materias, [materias[0].nome]: { ...configCiclo.materias[materias[0].nome], incluir: true } },
};
const materiasMenos = materias.map((m, i) => (i === 0 ? { ...m, topicos: m.topicos.slice(0, -2) } : m));
const metas4 = gerarTrilha({ materias: materiasMenos, config: cfg1, topicos: {}, configCiclo: configCiclo4 });
const trilha4: TrilhaEstudo = { config: cfg1, metas: metas4, criadaEm: new Date().toISOString(), versao: 1 };
const faltando = topicosNaoCobertos(trilha4, materias, configCiclo4);
assert(faltando.length === 2, `esperava 2 tópicos não cobertos, achou ${faltando.length}`);
const trilha4b = atualizarTrilha(trilha4, materias, {}, configCiclo4);
assert(topicosNaoCobertos(trilha4b, materias, configCiclo4).length === 0, "atualizarTrilha não cobriu os novos tópicos");
assert(trilha4b.versao === 2, "versao não incrementou");
assert(trilha4b.metas.length > metas4.length, "não anexou metas novas");
const numeros = trilha4b.metas.map((m) => m.numero);
assert(numeros.every((n, i) => n === i + 1), "numeração não é contínua");
console.log(`  +${trilha4b.metas.length - metas4.length} meta(s) anexada(s), numeração contínua ✓`);

// ── Cenário 5: o Ciclo é a fonte de verdade de "matéria ativa" ───────────────
console.log("5) Ciclo é a fonte de verdade");
const materiaA = materias[2].nome; // "Contabilidade Avançada" — incluirDefault true
const materiaB = materias[6].nome; // "Direito Administrativo" — incluirDefault false
// incluir=false no Ciclo exclui, mesmo sem nenhum campo "puladas"
const configCiclo5a: EstudoConfigCiclo = {
  ...configCiclo,
  materias: { ...configCiclo.materias, [materiaA]: { ...configCiclo.materias[materiaA], incluir: false } },
};
const metas5a = gerarTrilha({ materias, config: { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") }, topicos: {}, configCiclo: configCiclo5a });
assert(metas5a.every((m) => m.atividades.every((a) => a.materia !== materiaA)), "incluir=false no Ciclo não excluiu a matéria");
// incluir=true no Ciclo inclui mesmo simulando um `puladas` antigo que a excluiria (campo
// deprecated, não é mais lido) — materiaB tem incluirDefault=false, forço incluir=true aqui
const configCiclo5b: EstudoConfigCiclo = {
  ...configCiclo,
  materias: { ...configCiclo.materias, [materiaB]: { ...configCiclo.materias[materiaB], incluir: true } },
};
const cfg5b: TrilhaConfig = {
  disponibilidade: "normal",
  nivelPorMateria: nivelTodas("nunca"),
  puladas: [materiaB], // registro "antigo" — não deve mais ser respeitado
};
const metas5b = gerarTrilha({ materias, config: cfg5b, topicos: {}, configCiclo: configCiclo5b });
assert(metas5b.some((m) => m.atividades.some((a) => a.materia === materiaB)), "puladas antigo ainda está sendo lido (deveria ser ignorado)");
console.log("  incluir=false exclui, incluir=true inclui (puladas ignorado) ✓");

// ── Cenário 6: matéria graduada não recebe conteúdo novo ─────────────────────
console.log("6) matéria graduada");
const materiaGrad = materias[4].nome; // "Contabilidade Geral" — incluirDefault true
const metas6base = gerarTrilha({ materias, config: { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") }, topicos: {}, configCiclo });
// marca TODAS as atividades da matéria como concluídas em todas as metas
const metas6graduado = metas6base.map((m) => ({
  ...m,
  atividades: m.atividades.map((a) => (a.materia === materiaGrad ? { ...a, status: "concluida" as const } : a)),
}));
const trilha6: TrilhaEstudo = { config: { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") }, metas: metas6graduado, criadaEm: new Date().toISOString(), versao: 1 };
const graduadas6 = materiasConcluidasNaTrilha(trilha6);
assert(graduadas6.includes(materiaGrad), "materiasConcluidasNaTrilha não detectou a matéria graduada");
assert(!graduadas6.includes(materias[0].nome), "materiasConcluidasNaTrilha detectou matéria não-graduada");
// gera de novo (ex.: "Refazer") passando materiasConcluidas — não deve ter teoria/questões novas
const metas6regen = gerarTrilha({
  materias, config: { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") }, topicos: {}, configCiclo,
  materiasConcluidas: graduadas6,
});
assert(
  metas6regen.every((m) => m.atividades.every((a) => a.materia !== materiaGrad || a.tipo === "revisao")),
  "matéria graduada recebeu teoria/questões novas na regeração"
);
console.log("  matéria graduada detectada e sem conteúdo novo na regeração ✓");

// ── Cenário 7: topicosNaoCobertos não sinaliza tópicos de matéria graduada ───
console.log("7) topicosNaoCobertos ignora matéria graduada");
const faltando7 = topicosNaoCobertos(trilha6, materias, configCiclo);
assert(
  !faltando7.some((k) => k.startsWith(`${materiaGrad}||`)),
  "topicosNaoCobertos sinalizou tópico de matéria já graduada como faltante"
);
console.log("  nenhum tópico da matéria graduada sinalizado como faltante ✓");

// ── Helpers ──────────────────────────────────────────────────────────────────
assert(proximoStatus("nao_iniciada") === "iniciada" && proximoStatus("concluida") === "nao_iniciada", "ciclo de status errado");
assert(metaAtualIndex(metas1) === 0, "metaAtualIndex inicial deveria ser 0");

console.log(falhas === 0 ? "\nTODOS OS ASSERTS PASSARAM ✓" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
