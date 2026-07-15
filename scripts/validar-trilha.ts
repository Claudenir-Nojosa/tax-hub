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

// metas agora são PEQUENAS por design (pedido do usuário): 1 bloco de UMA matéria (conteúdo) OU
// um grupo pequeno de revisões — nunca as duas coisas juntas, nunca várias matérias de conteúdo
// novo na mesma meta. Teto generoso (bloco com teoria: até 3 tópicos × 90min + questões ≈
// 400min; revisão agrupada: até 4 × 12min).
const ORCAMENTO = 1890;
metas1.forEach((m) => {
  const soRevisao = m.atividades.every((a) => a.tipo === "revisao");
  const minutos = m.atividades.reduce((s, a) => s + a.duracaoMin, 0);
  if (soRevisao) {
    const REV1_MIN = 12; // espelha a constante interna do gerador (não exportada)
    assert(minutos <= 4 * REV1_MIN, `meta ${m.numero} de revisão maior que o esperado: ${minutos}min`);
  } else {
    assert(minutos <= 400, `meta ${m.numero} de conteúdo estourou o teto de bloco: ${minutos}min (bem acima do orçamento semanal de ${ORCAMENTO})`);
    const materiasContudoNovo = new Set(m.atividades.filter((a) => a.tipo !== "revisao").map((a) => a.materia));
    assert(materiasContudoNovo.size === 1, `meta ${m.numero} de conteúdo tem ${materiasContudoNovo.size} matérias (esperado exatamente 1)`);
  }
});

// espaçamento das revisões agora é por MINUTOS DE ESTUDO acumulados (não mais "índice de meta +
// N", já que metas deixaram de valer 1 semana cada): rev1 só pode entrar numa meta depois que o
// relógio passar ORCAMENTO minutos desde o fechamento do bloco estudado; rev2, 4×ORCAMENTO.
const minutosAcumulados: number[] = []; // minutosAcumulados[i] = minutos decorridos APÓS a meta i (0-based)
{
  let acc = 0;
  for (const m of metas1) {
    acc += m.atividades.reduce((s, a) => s + a.duracaoMin, 0);
    minutosAcumulados.push(acc);
  }
}
const idxEstudo = new Map<string, number>();
const idxRev = new Map<string, { r1?: number; r2?: number }>();
metas1.forEach((m, idx) => {
  for (const a of m.atividades) {
    const chave = `${a.materia}::${a.topicos[0]}`;
    if (a.tipo === "questoes") idxEstudo.set(chave, idx);
    if (a.tipo === "revisao") {
      const r = idxRev.get(chave) ?? {};
      if (a.numeroRevisao === 1) r.r1 = idx;
      else r.r2 = idx;
      idxRev.set(chave, r);
    }
  }
});
// "rabo da trilha": depois da última meta de CONTEÚDO, não há mais nada fazendo o relógio andar
// além das próprias revisões pendentes — o gerador antecipa o vencimento pra não deixar revisão
// pra trás (mesmo comportamento documentado no gerador antigo). Metas nessa faixa ficam isentas
// da checagem estrita de ORCAMENTO min de gap.
const ultimoIdxConteudo = metas1.reduce((max, m, idx) => (m.atividades.some((a) => a.tipo !== "revisao") ? idx : max), -1);
let gapRev1Total = 0, nRev1 = 0, noRabo = 0;
for (const [chave, idxEst] of idxEstudo) {
  const r = idxRev.get(chave);
  assert(!!r?.r1 && !!r?.r2, `bloco ${chave} sem as 2 revisões`);
  const minutoDoEstudo = minutosAcumulados[idxEst];
  if (r?.r1 !== undefined) {
    const relogioAntesDoRev1 = r.r1 === 0 ? 0 : minutosAcumulados[r.r1 - 1];
    const gap = relogioAntesDoRev1 - minutoDoEstudo;
    if (r.r1 > ultimoIdxConteudo) {
      noRabo++; // rabo: só garante que não veio antes do próprio estudo
      assert(gap >= 0, `rev1 de ${chave} (no rabo) veio antes do estudo (gap ${gap}min)`);
    } else {
      assert(gap >= ORCAMENTO, `rev1 de ${chave} entrou antes de completar ~1 semana de estudo (gap ${gap}min, esperado ≥${ORCAMENTO})`);
    }
    gapRev1Total += gap;
    nRev1++;
  }
  if (r?.r2 !== undefined) {
    assert(r.r2! > r.r1!, `rev2 de ${chave} veio antes ou junto do rev1 (rev1 idx ${r.r1}, rev2 idx ${r.r2})`);
    if (r.r2 <= ultimoIdxConteudo) {
      const relogioAntesDoRev2 = r.r2 === 0 ? 0 : minutosAcumulados[r.r2 - 1];
      assert(relogioAntesDoRev2 - minutoDoEstudo >= 4 * ORCAMENTO, `rev2 de ${chave} entrou antes de completar ~4 semanas de estudo (gap ${relogioAntesDoRev2 - minutoDoEstudo}min, esperado ≥${4 * ORCAMENTO})`);
    }
  }
}
console.log(`  gap médio até rev1: ${Math.round(gapRev1Total / nRev1)}min (orçamento semanal: ${ORCAMENTO}min) — ${nRev1} blocos, ${noRabo} no rabo da trilha`);

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
