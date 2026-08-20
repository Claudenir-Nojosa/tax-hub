// Catálogo de inimigos do roguelike — conteúdo autoral (arte + lore, um por vez), por isso fica
// como arquivo estático versionado junto com os assets, não banco (diferente de QuestaoRPG, que é
// importado em massa sem curadoria manual). `materia`/`topico` batem exatamente com o nome real do
// tópico no currículo do concurso (conferido direto no banco) — é isso que liga um inimigo a um
// tópico real do edital. HP/ATK/DEF vêm dos cards de personagem que o usuário forneceu; HP não é
// usado diretamente na luta (o inimigo sempre tem 100 de vida em combate, ver TelaCombateCampanha
// — 10 acertos derrubam), mas ATK define quanto dano ele causa por resposta errada.
export interface InimigoRPG {
  materia: string;
  topico: string;
  nome: string;
  classe: string;
  hp: number;
  atk: number;
  def: number;
  habilidadeNome: string;
  habilidadeDescricao: string;
  // falas antes da luta — rascunho, sujeito a revisão do usuário
  dialogo: string[];
  sprite: string;
}

const MATERIA = "Direito Tributário";

export const INIMIGOS_RPG: InimigoRPG[] = [
  {
    materia: MATERIA,
    topico: "Conceito de Tributos",
    nome: "Invocador da Prestação Oblíqua",
    classe: "Invocador",
    hp: 28,
    atk: 7,
    def: 2,
    habilidadeNome: "Prestação Oblíqua",
    habilidadeDescricao: "Convoca tributos para drenar o alvo.",
    dialogo: [
      "Toda prestação tem um nome, viajante — e a lei diz exatamente qual.",
      "Compulsória, pecuniária, que não constitua sanção... você sabe recitar o que me define?",
      "Prove que conhece meu conceito, ou sinta o peso da minha balança.",
    ],
    sprite: "/personagens/inimigo-invocador.png",
  },
  {
    materia: MATERIA,
    topico: "Princípios Tributários",
    nome: "Paladino da Carta Magna",
    classe: "Paladino",
    hp: 36,
    atk: 7,
    def: 8,
    habilidadeNome: "Supremacia Constitucional",
    habilidadeDescricao: "Protege os princípios e garante a justiça em toda batalha.",
    dialogo: [
      "Legalidade. Anterioridade. Isonomia. Não avanço um passo sem eles — e você?",
      "Meu escudo é forjado nos limites que a Constituição impõe ao poder de tributar.",
      "Mostre que também os carrega, ou minha espada não terá piedade.",
    ],
    sprite: "/personagens/inimigo-paladino.png",
  },
  {
    materia: MATERIA,
    topico: "Imunidade Tributária",
    nome: "Monge do Santuário",
    classe: "Monge",
    hp: 32,
    atk: 4,
    def: 9,
    habilidadeNome: "Imunidade Tributária",
    habilidadeDescricao: "Intocável por tributos e exações. Protegido pela lei e pelo sagrado.",
    dialogo: [
      "Templos, livros, partidos... há coisas que a mão do fisco jamais alcança.",
      "Não é isenção, peregrino — é a própria Constituição que me torna intocável.",
      "Distinga o sagrado do meramente favorecido, e talvez sobreviva a este encontro.",
    ],
    sprite: "/personagens/inimigo-monge.png",
  },
  {
    materia: MATERIA,
    topico: "Competência Tributária",
    nome: "Rei Coroador",
    classe: "Monarca",
    hp: 40,
    atk: 6,
    def: 8,
    habilidadeNome: "Competência Tributária",
    habilidadeDescricao: "Detém o poder originário de instituir tributos dentro de seus limites.",
    dialogo: [
      "União, Estados, Municípios, Distrito Federal — cada um governa dentro de seus muros.",
      "Meu cetro traça as fronteiras de quem pode cobrar o quê. Ultrapasse-as, e verá.",
      "Diga-me: sabe reconhecer os limites do meu reino tributário?",
    ],
    sprite: "/personagens/inimigo-rei.png",
  },
  {
    materia: MATERIA,
    topico: "Repartição de Receitas Tributárias",
    nome: "Tesoureiro da Távola",
    classe: "Guardião do Tesouro",
    hp: 34,
    atk: 4,
    def: 6,
    habilidadeNome: "Repartição de Receitas Tributárias",
    habilidadeDescricao: "Divide com sabedoria os frutos da tributação entre os entes do reino, mantendo o equilíbrio.",
    dialogo: [
      "Nada do que é arrecadado fica com um só — a balança do reino exige partilha.",
      "Fundos de participação, percentuais, transferências... cada moeda tem seu destino certo.",
      "Calcule comigo a divisão justa, ou meus livros nunca fecharão a seu favor.",
    ],
    sprite: "/personagens/inimigo-tesoureiro.png",
  },
  {
    materia: MATERIA,
    topico: "Legislação Tributária",
    nome: "Escriba Imperial",
    classe: "Mago dos Tomos",
    hp: 26,
    atk: 4,
    def: 2,
    habilidadeNome: "Legislação Tributária",
    habilidadeDescricao: "Escreve leis e normas que regem os tributos com autoridade imperial.",
    dialogo: [
      "Leis, tratados, decretos, normas complementares... tudo cabe no meu grimório.",
      "Cada tributo nasce de uma fonte formal precisa. Confunda-as, e o feitiço se volta contra você.",
      "Vamos ver se decifra minhas páginas antes que elas o decifrem.",
    ],
    sprite: "/personagens/inimigo-escriba.png",
  },
  {
    materia: MATERIA,
    topico: "Obrigação Tributária",
    nome: "Tece-Vínculos",
    classe: "Feiticeiro",
    hp: 28,
    atk: 5,
    def: 3,
    habilidadeNome: "Obrigação Tributária",
    habilidadeDescricao: "Cria vínculos invisíveis que impõem o dever de pagar o tributo devido.",
    dialogo: [
      "Todo fato gerador tece um fio entre você e o fisco. Você não vê, mas eu sim.",
      "Principal ou acessória — meus vínculos raramente se rompem sozinhos.",
      "Sinta o fio se apertar a cada resposta errada.",
    ],
    sprite: "/personagens/inimigo-tece-vinculos.png",
  },
  {
    materia: MATERIA,
    topico: "Responsabilidade Tributária",
    nome: "Necromante de Dívidas",
    classe: "Necromante",
    hp: 30,
    atk: 5,
    def: 2,
    habilidadeNome: "Responsabilidade Tributária",
    habilidadeDescricao: "Invoca dívidas do passado e atribui a responsabilidade pelo pagamento.",
    dialogo: [
      "Nem sempre quem deve é quem paga. Eu decido para quem a dívida se transfere.",
      "Sucessores, terceiros, substitutos... suas almas contábeis não escapam de mim.",
      "Diga-me quem responde por cada dívida, ou responderá pela sua própria.",
    ],
    sprite: "/personagens/inimigo-necromante.png",
  },
  {
    materia: MATERIA,
    topico: "Crédito Tributário: Constituição e Lançamento",
    nome: "Alquimista da Formalização",
    classe: "Alquimista",
    hp: 28,
    atk: 4,
    def: 3,
    habilidadeNome: "Crédito Tributário: Constituição e Lançamento",
    habilidadeDescricao: "Formula e lança o crédito tributário com precisão e formalidade.",
    dialogo: [
      "Uma obrigação abstrata, por si só, não paga nada — eu a transformo em crédito exigível.",
      "De ofício, por declaração, por homologação... cada fórmula tem seu próprio frasco.",
      "Erre a fórmula, e a explosão será sua.",
    ],
    sprite: "/personagens/inimigo-alquimista.png",
  },
  {
    materia: MATERIA,
    topico: "Suspensão da Exigibilidade do Crédito Tributário",
    nome: "Cronomante da Trégua",
    classe: "Mago do Tempo",
    hp: 27,
    atk: 3,
    def: 4,
    habilidadeNome: "Suspensão da Exigibilidade do Crédito Tributário",
    habilidadeDescricao: "Suspende temporariamente a cobrança do crédito tributário, concedendo trégua ao devedor.",
    dialogo: [
      "O tempo cobra, mas eu sei os feitiços que o fazem esperar.",
      "Moratória, depósito, liminar, parcelamento... minhas ampulhetas conhecem cada trégua.",
      "Mostre que sabe quando o relógio da cobrança pode parar.",
    ],
    sprite: "/personagens/inimigo-cronomante.png",
  },
];

export function inimigoDoTopico(materia: string, topico: string): InimigoRPG | undefined {
  return INIMIGOS_RPG.find((i) => i.materia === materia && i.topico === topico);
}
