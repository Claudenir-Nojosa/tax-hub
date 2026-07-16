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
const resumo1 = estimarResumo(metas1, "normal", "2026-08-01");
console.log(`  ${resumo1.totalMetas} metas · ${Math.round(resumo1.totalMinutos / 60)}h totais · cabe até a prova: ${resumo1.cabeAteProva}`);

// metas agora são MÍNIMAS por design (pedido do usuário): cada meta é exatamente 1 TÓPICO de
// UMA matéria ("conclua a teoria do tópico X") — sem revisão, sem questões, sem agrupar tópicos.
metas1.forEach((m) => {
  assert(m.atividades.length === 1, `meta ${m.numero} deveria ter exatamente 1 atividade, tem ${m.atividades.length}`);
  const a = m.atividades[0];
  assert(a.tipo === "teoria", `meta ${m.numero} tem atividade tipo "${a.tipo}" (esperado só "teoria")`);
  assert(a.topicos.length === 1, `meta ${m.numero} tem ${a.topicos.length} tópicos (esperado exatamente 1)`);
});
assert(metas1.length === materias.filter((m) => configCiclo.materias[m.nome]?.incluir).reduce((s, m) => s + m.topicos.length, 0),
  "total de metas deveria ser igual ao total de tópicos das matérias incluídas no Ciclo");

// determinismo
const metas1b = gerarTrilha({ materias, config: cfg1, topicos: {}, configCiclo });
assert(JSON.stringify(metas1) === JSON.stringify(metas1b), "geração não é determinística");

// ── Cenário 2: tudo-arestas / Hardcore ───────────────────────────────────────
console.log("2) tudo-arestas / Hardcore");
const cfg2: TrilhaConfig = { disponibilidade: "hardcore", nivelPorMateria: nivelTodas("arestas") };
const metas2 = gerarTrilha({ materias, config: cfg2, topicos: {}, configCiclo });
// arestas gera teoria RÁPIDA (15min, teoriaRapida=true) — não mais zero teoria; e, como pedido do
// usuário, NENHUM nível gera atividade tipo "questoes" (removida da Trilha por completo)
assert(metas2.every((m) => m.atividades.every((a) => a.tipo !== "questoes")), "gerou atividade tipo questoes (não deveria mais existir)");
assert(
  metas2.every((m) => m.atividades.every((a) => a.tipo !== "teoria" || (a.teoriaRapida === true && a.duracaoMin <= 15 * a.topicos.length))),
  "teoria de arestas não veio rápida (15min/tópico)"
);
console.log(`  ${metas2.length} metas, teoria só rápida (arestas), nenhuma atividade "questoes" ✓`);

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
// tópico já marcado estudado:true no Edital é EXCLUÍDO por completo da trilha — não é "tópico
// novo", não deve aparecer em nenhuma atividade (nem como teoria rápida)
const chavesPreEstudadas = new Set(Object.keys(preEstudados));
const apareceramPreEstudados = metas3.some((m) =>
  m.atividades.some((a) => a.topicos.some((t) => chavesPreEstudadas.has(topicoKey(a.materia, t))))
);
assert(!apareceramPreEstudados, "tópico pré-estudado apareceu na trilha (deveria ficar de fora por completo)");
console.log(`  ${metas3.length} metas, matérias fora do Ciclo e pré-estudados de fora ✓`);

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
const faltando = topicosNaoCobertos(trilha4, materias, configCiclo4, {});
assert(faltando.length === 2, `esperava 2 tópicos não cobertos, achou ${faltando.length}`);
const trilha4b = atualizarTrilha(trilha4, materias, {}, configCiclo4);
assert(topicosNaoCobertos(trilha4b, materias, configCiclo4, {}).length === 0, "atualizarTrilha não cobriu os novos tópicos");
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
// gera de novo (ex.: "Refazer") passando materiasConcluidas — a matéria graduada não deve
// aparecer NA TRILHA REGERADA de jeito nenhum (sem revisão pra "segurar" ela mais)
const metas6regen = gerarTrilha({
  materias, config: { disponibilidade: "normal", nivelPorMateria: nivelTodas("nunca") }, topicos: {}, configCiclo,
  materiasConcluidas: graduadas6,
});
assert(
  metas6regen.every((m) => m.atividades.every((a) => a.materia !== materiaGrad)),
  "matéria graduada recebeu conteúdo novo na regeração"
);
console.log("  matéria graduada detectada e sem conteúdo novo na regeração ✓");

// ── Cenário 7: topicosNaoCobertos não sinaliza tópicos de matéria graduada ───
console.log("7) topicosNaoCobertos ignora matéria graduada");
const faltando7 = topicosNaoCobertos(trilha6, materias, configCiclo, {});
assert(
  !faltando7.some((k) => k.startsWith(`${materiaGrad}||`)),
  "topicosNaoCobertos sinalizou tópico de matéria já graduada como faltante"
);
console.log("  nenhum tópico da matéria graduada sinalizado como faltante ✓");

// ── Cenário 8: nenhum cenário gera atividade tipo "questoes" ou "revisao" ────
console.log("8) sem atividades de questões ou revisão em nenhum cenário");
for (const [nome, metas] of [["1", metas1], ["2", metas2], ["3", metas3], ["6-regen", metas6regen]] as const) {
  assert(metas.every((m) => m.atividades.every((a) => a.tipo !== "questoes")), `cenário ${nome} gerou atividade tipo "questoes"`);
  assert(metas.every((m) => m.atividades.every((a) => a.tipo !== "revisao")), `cenário ${nome} gerou atividade tipo "revisao"`);
}
console.log("  nenhuma atividade tipo questoes/revisao em nenhum cenário ✓");

// ── Helpers ──────────────────────────────────────────────────────────────────
assert(proximoStatus("nao_iniciada") === "iniciada" && proximoStatus("concluida") === "nao_iniciada", "ciclo de status errado");
assert(metaAtualIndex(metas1) === 0, "metaAtualIndex inicial deveria ser 0");

console.log(falhas === 0 ? "\nTODOS OS ASSERTS PASSARAM ✓" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
