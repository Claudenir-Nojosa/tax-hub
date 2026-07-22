"use client";

import { useState, useEffect, useRef } from "react";

/* ─── índice ─── */

const tocEntries = [
  { id: "titulo-1",  label: "TÍTULO I: Disposições Gerais",           level: 0 },
  { id: "art-1",     label: "Art. 1º: Âmbito de Aplicação",           level: 2 },
  { id: "art-2",     label: "Art. 2º: Hierarquia das Normas",          level: 2 },
  { id: "art-3",     label: "Art. 3º: Conceito de Tributo",            level: 2 },
  { id: "art-4",     label: "Art. 4º: Natureza Jurídica",              level: 2 },
  { id: "art-5",     label: "Art. 5º: Espécies Tributárias",           level: 2 },
  { id: "titulo-2",  label: "TÍTULO II: Competência Tributária",       level: 0 },
  { id: "cap-1",     label: "Cap. I: Disposições Gerais",              level: 1 },
  { id: "art-6",     label: "Art. 6º: Competência Legislativa Plena",  level: 2 },
  { id: "art-7",     label: "Art. 7º: Indelegabilidade",               level: 2 },
  { id: "art-8",     label: "Art. 8º: Não-Exercício",                  level: 2 },
  { id: "cap-2",     label: "Cap. II: Limitações da Competência",      level: 1 },
  { id: "art-9",     label: "Art. 9º: Vedações",                       level: 2 },
  { id: "art-10",    label: "Art. 10: Uniformidade Geográfica",        level: 2 },
  { id: "art-11",    label: "Art. 11: (Revogado)",                     level: 2 },
  { id: "art-12",    label: "Art. 12: (Revogado)",                     level: 2 },
  { id: "art-13",    label: "Art. 13: (Revogado)",                     level: 2 },
  { id: "art-14",    label: "Art. 14: Condições da Imunidade",         level: 2 },
  { id: "art-15",    label: "Art. 15: Empréstimos Compulsórios",       level: 2 },
  { id: "titulo-3",  label: "TÍTULO III: Impostos",                    level: 0 },
  { id: "cap-3",     label: "Cap. I: Disposições Gerais",              level: 1 },
  { id: "art-16",    label: "Art. 16: Definição de Imposto",           level: 2 },
  { id: "art-17",    label: "Art. 17: Impostos do Sistema",            level: 2 },
  { id: "art-18",    label: "Art. 18: Competência Cumulativa",         level: 2 },
  { id: "cap-4",     label: "Cap. II: Comércio Exterior",              level: 1 },
  { id: "sec-ii",    label: "Seção I: Imposto de Importação",          level: 1 },
  { id: "art-19",    label: "Art. 19: II — Fato Gerador",              level: 2 },
  { id: "art-20",    label: "Art. 20: II — Base de Cálculo",           level: 2 },
  { id: "art-21",    label: "Art. 21: II — Alíquotas e Executivo",     level: 2 },
  { id: "art-22",    label: "Art. 22: II — Contribuinte",              level: 2 },
  { id: "sec-ie",    label: "Seção II: Imposto de Exportação",         level: 1 },
  { id: "art-23",    label: "Art. 23: IE — Fato Gerador",              level: 2 },
  { id: "art-24",    label: "Art. 24: IE — Base de Cálculo",           level: 2 },
  { id: "art-25",    label: "Art. 25: IE — Alíquotas e Executivo",     level: 2 },
  { id: "art-26",    label: "Art. 26: IE — Pauta de Valor Mínimo",     level: 2 },
  { id: "art-27",    label: "Art. 27: IE — Contribuinte",              level: 2 },
  { id: "art-28",    label: "Art. 28: IE — Destino da Receita",        level: 2 },
  { id: "cap-5",     label: "Cap. III: Patrimônio e Renda",            level: 1 },
  { id: "sec-itr",   label: "Seção I: ITR",                            level: 1 },
  { id: "art-29",    label: "Art. 29: ITR — Fato Gerador",             level: 2 },
  { id: "art-30",    label: "Art. 30: ITR — Base de Cálculo",          level: 2 },
  { id: "art-31",    label: "Art. 31: ITR — Contribuinte",             level: 2 },
  { id: "sec-iptu",  label: "Seção II: IPTU",                          level: 1 },
  { id: "art-32",    label: "Art. 32: IPTU — Fato Gerador",            level: 2 },
  { id: "art-33",    label: "Art. 33: IPTU — Base de Cálculo",         level: 2 },
  { id: "art-34",    label: "Art. 34: IPTU — Contribuinte",            level: 2 },
  { id: "sec-itbi",  label: "Seção III: ITBI e ITCMD",                 level: 1 },
  { id: "art-35",    label: "Art. 35: Transmissão — Fato Gerador",     level: 2 },
  { id: "art-36",    label: "Art. 36: Transmissão — Exclusões",        level: 2 },
  { id: "art-37",    label: "Art. 37: Preponderância Imobiliária",     level: 2 },
  { id: "art-38",    label: "Art. 38: Transmissão — Base de Cálculo",  level: 2 },
  { id: "art-39",    label: "Art. 39: Transmissão — Alíquotas",        level: 2 },
  { id: "art-40",    label: "Art. 40: Transmissão — Dedução no IR",    level: 2 },
  { id: "art-41",    label: "Art. 41: Transmissão — Estado Credor",    level: 2 },
  { id: "art-42",    label: "Art. 42: Transmissão — Contribuinte",     level: 2 },
  { id: "sec-ir",    label: "Seção IV: Imposto de Renda",              level: 1 },
  { id: "art-43",    label: "Art. 43: IR — Fato Gerador",              level: 2 },
  { id: "art-44",    label: "Art. 44: IR — Base de Cálculo",           level: 2 },
  { id: "art-45",    label: "Art. 45: IR — Contribuinte e Fonte",      level: 2 },
  { id: "cap-6",     label: "Cap. IV: Produção e Circulação",          level: 1 },
  { id: "sec-ipi",   label: "Seção I: IPI",                            level: 1 },
  { id: "art-46",    label: "Art. 46: IPI — Fato Gerador",             level: 2 },
  { id: "art-47",    label: "Art. 47: IPI — Base de Cálculo",          level: 2 },
  { id: "art-48",    label: "Art. 48: IPI — Seletividade",             level: 2 },
  { id: "art-49",    label: "Art. 49: IPI — Não-Cumulatividade",       level: 2 },
  { id: "art-50",    label: "Art. 50: IPI — Contribuinte",             level: 2 },
  { id: "art-51",    label: "Art. 51: IPI — Definições",              level: 2 },
  { id: "sec-comb",  label: "Seção II: Combustíveis e Energia",        level: 1 },
  { id: "art-52",    label: "Art. 52: Comb. — Fato Gerador",           level: 2 },
  { id: "art-53",    label: "Art. 53: Comb. — Base de Cálculo",        level: 2 },
  { id: "art-54",    label: "Art. 54: Comb. — Alíquotas",              level: 2 },
  { id: "art-55",    label: "Art. 55: Comb. — Isenções",               level: 2 },
  { id: "art-56",    label: "Art. 56: Comb. — Exclusividade",          level: 2 },
  { id: "sec-transp", label: "Seção III: Transportes e Comunicações",  level: 1 },
  { id: "art-57",    label: "Art. 57: Transp. — Fato Gerador",         level: 2 },
  { id: "art-58",    label: "Art. 58: Transp. — Base de Cálculo",      level: 2 },
  { id: "art-59",    label: "Art. 59: Transp. — Alíquotas",            level: 2 },
  { id: "art-60",    label: "Art. 60: Transp. — Contribuinte",         level: 2 },
  { id: "art-61",    label: "Art. 61: Transp. — Isenções",             level: 2 },
  { id: "art-62",    label: "Art. 62: Transp. — Normas Complementares", level: 2 },
  { id: "sec-iof",   label: "Seção IV: IOF",                           level: 1 },
  { id: "art-63",    label: "Art. 63: IOF — Fato Gerador",             level: 2 },
  { id: "art-64",    label: "Art. 64: IOF — Base de Cálculo",          level: 2 },
  { id: "art-65",    label: "Art. 65: IOF — Alíquotas e Política Monetária", level: 2 },
  { id: "art-66",    label: "Art. 66: IOF — Contribuinte",             level: 2 },
  { id: "art-67",    label: "Art. 67: IOF — Destino da Receita",       level: 2 },
  { id: "sec-icm",   label: "Seção V: ICM (predecessor do ICMS)",      level: 1 },
  { id: "art-68",    label: "Art. 68: ICM — Fato Gerador",             level: 2 },
  { id: "art-69",    label: "Art. 69: ICM — Não-Cumulatividade",       level: 2 },
  { id: "art-70",    label: "Art. 70: ICM — Base de Cálculo",          level: 2 },
  { id: "art-71",    label: "Art. 71: ICM — Alíquotas",               level: 2 },
  { id: "art-72",    label: "Art. 72: ICM — Convênios de Isenção",    level: 2 },
  { id: "art-73",    label: "Art. 73: ICM — Contribuinte",            level: 2 },
  { id: "art-74",    label: "Art. 74: ICM — Solidariedade",           level: 2 },
  { id: "art-75",    label: "Art. 75: ICM — Disposições Finais",      level: 2 },
  { id: "sec-extr",  label: "Cap. V: Impostos Extraordinários",       level: 1 },
  { id: "art-76",    label: "Art. 76: Imposto Extraordinário",        level: 2 },
  { id: "titulo-4",  label: "TÍTULO IV: Taxas",                       level: 0 },
  { id: "art-77",    label: "Art. 77: Taxa — Fato Gerador",           level: 2 },
  { id: "art-78",    label: "Art. 78: Poder de Polícia",              level: 2 },
  { id: "art-79",    label: "Art. 79: Serviços Específicos",          level: 2 },
  { id: "art-80",    label: "Art. 80: Competência para Taxas",        level: 2 },
  { id: "titulo-5",  label: "TÍTULO V: Contribuições de Melhoria",   level: 0 },
  { id: "art-81",    label: "Art. 81: Contribuição de Melhoria",     level: 2 },
  { id: "art-82",    label: "Art. 82: Requisitos para Instituição",  level: 2 },
  { id: "titulo-6",  label: "TÍTULO VI: Distribuição de Rendas",     level: 0 },
  { id: "art-83",    label: "Art. 83: Discriminação (Revogado)",      level: 2 },
  { id: "art-84",    label: "Art. 84: (Revogado)",                   level: 2 },
  { id: "art-85",    label: "Art. 85: (Revogado)",                   level: 2 },
  { id: "art-86",    label: "Art. 86: (Revogado)",                   level: 2 },
  { id: "art-87",    label: "Art. 87: Adicional IR — Estados",       level: 2 },
  { id: "art-88",    label: "Art. 88: (Revogado)",                   level: 2 },
  { id: "art-89",    label: "Art. 89: (Revogado)",                   level: 2 },
  { id: "art-90",    label: "Art. 90: Cota Municípios — ICM",        level: 2 },
  { id: "art-91",    label: "Art. 91: (Revogado)",                   level: 2 },
  { id: "art-92",    label: "Art. 92: (Revogado)",                   level: 2 },
  { id: "art-93",    label: "Art. 93: (Revogado)",                   level: 2 },
  { id: "art-94",    label: "Art. 94: (Revogado)",                   level: 2 },
  { id: "art-95",    label: "Art. 95: (Revogado)",                   level: 2 },
  { id: "livro-2",   label: "LIVRO SEGUNDO: Normas Gerais",          level: 0 },
  { id: "tit-leg",   label: "Título I: Legislação Tributária",       level: 1 },
  { id: "art-96",    label: "Art. 96: Legislação Tributária",        level: 2 },
  { id: "art-97",    label: "Art. 97: Matéria Reservada à Lei",     level: 2 },
  { id: "art-98",    label: "Art. 98: Tratados Internacionais",      level: 2 },
  { id: "art-99",    label: "Art. 99: Decretos",                     level: 2 },
  { id: "art-100",   label: "Art. 100: Normas Complementares",       level: 2 },
  { id: "art-101",   label: "Art. 101: Vigência no Espaço e Tempo",  level: 2 },
  { id: "art-102",   label: "Art. 102: Vigência Extraterritorial",   level: 2 },
  { id: "art-103",   label: "Art. 103: Vigência — Normas Compl.",    level: 2 },
  { id: "art-104",   label: "Art. 104: Anterioridade de Exercício",  level: 2 },
  { id: "art-105",   label: "Art. 105: Aplicação Imediata",          level: 2 },
  { id: "art-106",   label: "Art. 106: Retroatividade da Lei",       level: 2 },
  { id: "art-107",   label: "Art. 107: Interpretação da Legislação", level: 2 },
  { id: "art-108",   label: "Art. 108: Métodos de Integração",       level: 2 },
  { id: "art-109",   label: "Art. 109: Princípios de Dir. Privado",  level: 2 },
  { id: "art-110",   label: "Art. 110: Conceitos de Dir. Privado",   level: 2 },
  { id: "art-111",   label: "Art. 111: Interpretação Literal",       level: 2 },
  { id: "art-112",   label: "Art. 112: Interpretação Benigna",       level: 2 },
  { id: "tit-obrig", label: "TÍTULO II: Obrigação Tributária",       level: 0 },
  { id: "cap-obrig", label: "Cap. I: Disposições Gerais",            level: 1 },
  { id: "art-113",   label: "Art. 113: Obrigação Principal e Acessória", level: 2 },
  { id: "art-114",   label: "Art. 114: Fato Gerador Principal",      level: 2 },
  { id: "art-115",   label: "Art. 115: Fato Gerador Acessório",      level: 2 },
  { id: "art-116",   label: "Art. 116: Ocorrência do Fato Gerador",  level: 2 },
  { id: "art-117",   label: "Art. 117: Negócio Jurídico Condicional",level: 2 },
  { id: "art-118",   label: "Art. 118: Definição do Fato Gerador",   level: 2 },
  { id: "art-119",   label: "Art. 119: Sujeito Ativo",               level: 2 },
  { id: "art-120",   label: "Art. 120: Desmembramento Territorial",  level: 2 },
  { id: "cap-passivo", label: "Cap. II: Sujeito Passivo",            level: 1 },
  { id: "art-121",   label: "Art. 121: Contribuinte e Responsável",  level: 2 },
  { id: "art-122",   label: "Art. 122: Sujeito Passivo Acessório",   level: 2 },
  { id: "art-123",   label: "Art. 123: Convenções Particulares",     level: 2 },
  { id: "sec-solid",   label: "Sec. II: Solidariedade",              level: 1 },
  { id: "art-124",   label: "Art. 124: Solidariedade — Hipóteses",  level: 2 },
  { id: "art-125",   label: "Art. 125: Solidariedade — Efeitos",    level: 2 },
  { id: "sec-capac",   label: "Sec. III: Capacidade Tributária",     level: 1 },
  { id: "art-126",   label: "Art. 126: Capacidade Tributária",       level: 2 },
  { id: "sec-domicilio", label: "Sec. IV: Domicílio Tributário",     level: 1 },
  { id: "art-127",   label: "Art. 127: Domicílio Tributário",        level: 2 },
  { id: "cap-resp",    label: "Cap. III: Responsabilidade Tributária", level: 1 },
  { id: "art-128",   label: "Art. 128: Resp. — Disposições Gerais",  level: 2 },
  { id: "sec-resp-suc", label: "Sec. II: Resp. dos Sucessores",      level: 1 },
  { id: "art-129",   label: "Art. 129: Créditos Abrangidos",         level: 2 },
  { id: "art-130",   label: "Art. 130: Adquirente de Imóveis",       level: 2 },
  { id: "art-131",   label: "Art. 131: Resp. Pessoal — Sucessores",  level: 2 },
  { id: "art-132",   label: "Art. 132: Fusão e Incorporação",        level: 2 },
  { id: "art-133",   label: "Art. 133: Compra de Estabelecimento",   level: 2 },
  { id: "sec-resp-terc", label: "Sec. III: Resp. de Terceiros",      level: 1 },
  { id: "art-134",   label: "Art. 134: Terceiros — Subsidiária",     level: 2 },
  { id: "art-135",   label: "Art. 135: Terceiros — Pessoal",         level: 2 },
  { id: "sec-resp-infr", label: "Sec. IV: Resp. por Infrações",      level: 1 },
  { id: "art-136",   label: "Art. 136: Resp. Objetiva",              level: 2 },
  { id: "art-137",   label: "Art. 137: Resp. Pessoal do Agente",     level: 2 },
  { id: "art-138",   label: "Art. 138: Denúncia Espontânea",         level: 2 },
  { id: "tit-credito", label: "TÍTULO III: Crédito Tributário",      level: 0 },
  { id: "art-139",   label: "Art. 139: Crédito Tributário — Natureza", level: 2 },
  { id: "art-140",   label: "Art. 140: Autonomia do Crédito",        level: 2 },
  { id: "cap-const",  label: "Cap. I: Constituição do Crédito",      level: 1 },
  { id: "sec-lancam", label: "Sec. I: Lançamento",                   level: 1 },
  { id: "art-141",   label: "Art. 141: Modificação Legal do Crédito",level: 2 },
  { id: "art-142",   label: "Art. 142: Lançamento — Definição",      level: 2 },
  { id: "art-143",   label: "Art. 143: Moeda Estrangeira",           level: 2 },
  { id: "art-144",   label: "Art. 144: Lei Aplicável ao Lançamento", level: 2 },
  { id: "art-145",   label: "Art. 145: Alteração do Lançamento",     level: 2 },
  { id: "art-146",   label: "Art. 146: Mudança de Critério Jurídico",level: 2 },
  { id: "art-147",   label: "Art. 147: Lançamento por Declaração",   level: 2 },
  { id: "art-148",   label: "Art. 148: Arbitramento",                level: 2 },
  { id: "art-149",   label: "Art. 149: Lançamento de Ofício",        level: 2 },
  { id: "art-150",   label: "Art. 150: Lançamento por Homologação",  level: 2 },
  { id: "cap-suspens", label: "Cap. II: Suspensão da Exigibilidade", level: 1 },
  { id: "art-151",   label: "Art. 151: Hipóteses de Suspensão",      level: 2 },
  { id: "art-152",   label: "Art. 152: Moratória — Competência",     level: 2 },
  { id: "art-153",   label: "Art. 153: Moratória — Requisitos",      level: 2 },
  { id: "art-154",   label: "Art. 154: Moratória — Créditos",        level: 2 },
  { id: "art-155",   label: "Art. 155: Moratória — Revogação",       level: 2 },
  { id: "art-155a",  label: "Art. 155-A: Parcelamento",              level: 2 },
  { id: "cap-extin",  label: "Cap. III: Extinção do Crédito",        level: 1 },
  { id: "art-156",   label: "Art. 156: Modalidades de Extinção",     level: 2 },
  { id: "art-157",   label: "Art. 157: Penalidade e Tributo",        level: 2 },
  { id: "art-158",   label: "Art. 158: Presunção de Pagamento",      level: 2 },
  { id: "art-159",   label: "Art. 159: Local de Pagamento",          level: 2 },
  { id: "art-160",   label: "Art. 160: Prazo de Pagamento",          level: 2 },
  { id: "art-161",   label: "Art. 161: Juros de Mora",               level: 2 },
  { id: "art-162",   label: "Art. 162: Formas de Pagamento",         level: 2 },
  { id: "art-163",   label: "Art. 163: Imputação de Pagamento",      level: 2 },
  { id: "art-164",   label: "Art. 164: Consignação em Pagamento",    level: 2 },
  { id: "art-165",   label: "Art. 165: Restituição do Indébito",     level: 2 },
  { id: "art-166",   label: "Art. 166: Tributos Indiretos",          level: 2 },
  { id: "art-167",   label: "Art. 167: Juros sobre Restituição",     level: 2 },
  { id: "art-168",   label: "Art. 168: Prazo para Restituição",      level: 2 },
  { id: "art-169",   label: "Art. 169: Ação Anulatória — Prazo",     level: 2 },
  { id: "art-170",   label: "Art. 170: Compensação",                 level: 2 },
  { id: "art-171",   label: "Art. 171: Transação",                   level: 2 },
  { id: "art-172",   label: "Art. 172: Remissão",                    level: 2 },
  { id: "art-173",   label: "Art. 173: Decadência",                  level: 2 },
  { id: "art-174",   label: "Art. 174: Prescrição",                  level: 2 },
  { id: "cap-exclu", label: "Cap. V: Exclusão do Crédito",           level: 1 },
  { id: "art-175",   label: "Art. 175: Hipóteses de Exclusão",       level: 2 },
  { id: "sec-isenc", label: "Sec. II: Isenção",                      level: 1 },
  { id: "art-176",   label: "Art. 176: Isenção — Conceito",          level: 2 },
  { id: "art-177",   label: "Art. 177: Isenção — Não Extensão",      level: 2 },
  { id: "art-178",   label: "Art. 178: Isenção — Revogabilidade",    level: 2 },
  { id: "art-179",   label: "Art. 179: Isenção Individual",          level: 2 },
  { id: "sec-anis",  label: "Sec. III: Anistia",                     level: 1 },
  { id: "art-180",   label: "Art. 180: Anistia — Infrações",         level: 2 },
  { id: "art-181",   label: "Art. 181: Anistia — Formas",            level: 2 },
  { id: "art-182",   label: "Art. 182: Anistia Individual",          level: 2 },
  { id: "cap-garan", label: "Cap. VI: Garantias e Privilégios",      level: 1 },
  { id: "art-183",   label: "Art. 183: Garantias — Extensão",        level: 2 },
  { id: "art-184",   label: "Art. 184: Bens Sujeitos à Garantia",    level: 2 },
  { id: "art-185",   label: "Art. 185: Fraude à Execução",           level: 2 },
  { id: "art-185a",  label: "Art. 185-A: Indisponibilidade de Bens", level: 2 },
  { id: "art-186",   label: "Art. 186: Preferência do Crédito",      level: 2 },
  { id: "art-187",   label: "Art. 187: Concurso de Credores",        level: 2 },
  { id: "art-188",   label: "Art. 188: Créditos Extraconcursais",    level: 2 },
  { id: "art-189",   label: "Art. 189: Crédito em Inventário",       level: 2 },
  { id: "art-190",   label: "Art. 190: Crédito em Liquidação",       level: 2 },
  { id: "art-191",   label: "Art. 191: Prova — Recuperação Judicial", level: 2 },
  { id: "art-192",   label: "Art. 192: Prova — Partilha",             level: 2 },
  { id: "art-193",   label: "Art. 193: Prova — Contratos Públicos",   level: 2 },
  { id: "tit-adm",   label: "Tít. IV: Administração Tributária",      level: 0 },
  { id: "cap-fisc",  label: "Cap. I: Fiscalização",                   level: 1 },
  { id: "art-194",   label: "Art. 194: Competência de Fiscalização",  level: 2 },
  { id: "art-195",   label: "Art. 195: Acesso a Documentos",          level: 2 },
  { id: "art-196",   label: "Art. 196: Termos de Fiscalização",       level: 2 },
  { id: "art-197",   label: "Art. 197: Dever de Informar",            level: 2 },
  { id: "art-198",   label: "Art. 198: Sigilo Fiscal",                level: 2 },
  { id: "art-199",   label: "Art. 199: Assistência Mútua",            level: 2 },
  { id: "art-200",   label: "Art. 200: Auxílio da Força Pública",     level: 2 },
  { id: "cap-dativ", label: "Cap. II: Dívida Ativa",                 level: 1 },
  { id: "art-201",   label: "Art. 201: Dívida Ativa — Definição",    level: 2 },
  { id: "art-202",   label: "Art. 202: Requisitos da Inscrição",     level: 2 },
  { id: "art-203",   label: "Art. 203: Nulidade da Inscrição",       level: 2 },
  { id: "art-204",   label: "Art. 204: Presunção de Certeza",        level: 2 },
  { id: "cap-cert",  label: "Cap. III: Certidões Negativas",         level: 1 },
  { id: "art-205",   label: "Art. 205: Certidão Negativa (CND)",     level: 2 },
  { id: "art-206",   label: "Art. 206: CPD-EN",                      level: 2 },
  { id: "art-207",   label: "Art. 207: Dispensa de Certidão",        level: 2 },
  { id: "art-208",   label: "Art. 208: Responsabilidade por CND Falsa", level: 2 },
];

/* ─── building blocks ─── */

function LegalText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted border-l-4 border-border px-5 py-4 text-sm text-foreground leading-relaxed">
      {children}
    </div>
  );
}

function Comentario({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-primary/10 border-l-4 border-primary px-5 py-4 text-sm text-foreground leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
        💬 Meu comentário
      </p>
      {children}
    </div>
  );
}

function Artigo({
  id, numero, titulo, children,
}: {
  id: string; numero: string; titulo: string; children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-4 rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-primary">{numero}</span>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

function Secao({ id, titulo, subtitulo }: { id: string; titulo: string; subtitulo?: string }) {
  return (
    <div id={id} className="scroll-mt-4 pt-4">
      <div className="border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{titulo}</p>
        {subtitulo && <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>}
      </div>
    </div>
  );
}

/* ─── TOC ─── */

function TableOfContents({ activeId }: { activeId: string }) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const el = navRef.current.querySelector(`[href="#${activeId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <nav ref={navRef} className="text-sm space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-2">Índice</p>
      {tocEntries.map((entry) => {
        const isActive = activeId === entry.id;
        return (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={[
              "block rounded-lg transition-all duration-150 leading-snug",
              entry.level === 0 ? "px-2 py-1.5 font-semibold text-[13px] text-foreground" : "",
              entry.level === 1 ? "pl-4 pr-2 py-1.5 font-medium text-[12px] text-muted-foreground" : "",
              entry.level === 2 ? "pl-6 pr-2 py-1 text-[12px] text-muted-foreground" : "",
              isActive
                ? "!text-primary bg-primary/10 font-medium"
                : "hover:bg-accent hover:text-accent-foreground",
            ].filter(Boolean).join(" ")}
          >
            {entry.label}
          </a>
        );
      })}
    </nav>
  );
}

/* ─── página ─── */

export default function CtnPage() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = tocEntries.map((e) => document.getElementById(e.id)).filter((el): el is HTMLElement => el !== null);
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.35;
      let current = headings[0];
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= threshold) current = el;
      }
      if (current) setActiveId(current.id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="pb-16">

      {/* header */}
      <div className="rounded-xl px-8 py-10 mb-10" style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #1b3a5c 60%, #2e6da4 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#7eb8e8] mb-3">Estudos de Legislação Tributária</p>
        <h1 className="text-4xl font-black text-white leading-tight">Código Tributário Nacional</h1>
        <h2 className="mt-2 text-base font-normal text-[#a8c8e8] border-l-4 border-[#2e6da4] pl-4">
          Comentários à Lei nº 5.172/1966 (CTN) — Claudenir Vasconcelos Nojosa
        </h2>
        <hr className="my-6 border-[#2e6da4]" />
        <div className="flex flex-wrap gap-8 text-sm">
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Publicação</p><p className="text-white font-medium">25 out. 1966</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Vigência</p><p className="text-white font-medium">Em vigor (com alterações)</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Artigos comentados</p><p className="text-white font-medium">Arts. 1º ao 218</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Escopo</p><p className="text-white font-medium">Sistema Tributário Nacional</p></div>
        </div>
      </div>

      {/* layout */}
      <div className="flex gap-8 items-start">

        {/* TOC lateral */}
        <aside className="hidden xl:block w-64 flex-shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-4">
          <TableOfContents activeId={activeId} />
        </aside>

        {/* conteúdo */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── TÍTULO I ── */}
          <Secao id="titulo-1" titulo="Livro Primeiro: Sistema Tributário Nacional — Título I: Disposições Gerais" subtitulo="Arts. 1º ao 5º" />

          <Artigo id="art-1" numero="Art. 1º" titulo="Âmbito de Aplicação do Código">
            <LegalText>
              <p>
                Este Código estabelece, com fundamento na Emenda Constitucional n. 18, de 1º de dezembro
                de 1965, as normas gerais de direito tributário aplicáveis à <strong>União, aos Estados,
                ao Distrito Federal e aos Municípios</strong>, sem prejuízo da respectiva legislação
                complementar, supletiva ou regulamentar.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 1º resolve uma questão que muita gente ignora: o CTN nasceu em 1966 como lei
                ordinária. Mas a Constituição de 1988 criou a exigência de lei complementar para normas
                gerais de direito tributário (art. 146, III). A solução foi a recepção: o CTN foi recebido
                pela nova ordem constitucional com status de lei complementar porque seu conteúdo corresponde
                ao que a CF/88 reserva a esse tipo de norma. Para alterar o CTN hoje você precisa de maioria
                absoluta no Congresso, não de maioria simples.
              </p>
              <p className="mt-3">
                A referência à EC 18/1965 ficou desatualizada com a CF/88, mas não invalida o código. O
                fundamento constitucional atual é o art. 146 da CF/88. A expressão "sem prejuízo da
                respectiva legislação complementar, supletiva ou regulamentar" deixa claro que o CTN é o
                esqueleto normativo sobre o qual cada ente federativo constrói sua legislação específica.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-2" numero="Art. 2º" titulo="Hierarquia das Normas Tributárias">
            <LegalText>
              <p>
                O sistema tributário nacional é regido pelo disposto na Emenda Constitucional n. 18, de
                1º de dezembro de 1965, em <strong>leis complementares, em resoluções do Senado Federal</strong> e,
                nos limites das respectivas competências, em leis federais, nas Constituições e em leis
                estaduais, e em leis municipais.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Lida à luz da CF/88, a hierarquia real hoje é: Constituição Federal no topo, depois leis
                complementares (onde se encaixa o próprio CTN), depois as resoluções do Senado, e por fim
                as leis federais, estaduais e municipais dentro de cada competência. As resoluções do Senado
                têm papel específico no ICMS: fixam alíquotas interestaduais (Resolução 22/1989) e alíquotas
                máximas nas operações com bens importados (Resolução 13/2012). Quando o Senado mexe nessas
                alíquotas, mexe no equilíbrio da guerra fiscal entre estados sem precisar de emenda
                constitucional.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-3" numero="Art. 3º" titulo="Conceito de Tributo">
            <LegalText>
              <p>
                Tributo é toda prestação <strong>pecuniária compulsória</strong>, em moeda ou cujo valor
                nela se possa exprimir, que <strong>não constitua sanção de ato ilícito</strong>, instituída
                em lei e cobrada mediante <strong>atividade administrativa plenamente vinculada</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Este é o artigo mais importante de todo o CTN. Cinco elementos compõem a definição. Pecuniária
                compulsória: pago em dinheiro, independe da vontade do contribuinte. Que não constitua sanção
                de ato ilícito: o tributo não é punição. Quem ganha dinheiro com atividade ilícita paga
                imposto de renda sobre esse ganho porque o fato gerador é o acréscimo patrimonial, não a
                licitude da origem. O STF consagrou isso. Atividade administrativa plenamente vinculada:
                o fiscal não tem discricionariedade. Ocorreu o fato gerador, preenchidos os requisitos
                legais, a cobrança é obrigatória.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-4" numero="Art. 4º" titulo="Natureza Jurídica do Tributo">
            <LegalText>
              <p>A natureza jurídica específica do tributo é determinada pelo <strong>fato gerador</strong> da respectiva obrigação, sendo irrelevantes para qualificá-la:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - a denominação e demais características formais adotadas pela lei;</li>
                <li><strong>II</strong> - a destinação legal do produto da sua arrecadação.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O que define a natureza de um tributo é o fato gerador, não o nome que o legislador colocou
                na lei. Se um estado criar uma "contribuição" cujo fato gerador seja simplesmente ter renda,
                sem relação com obra pública, ela é imposto. O inciso II sobre a irrelevância da destinação
                precisa de ressalva: para as contribuições especiais (sociais, CIDE, corporativas), o STF
                entende que a destinação SIM é relevante para identificar a espécie. É um ponto em que a
                CF/88 modificou o sistema do CTN sem revogá-lo expressamente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-5" numero="Art. 5º" titulo="Espécies Tributárias">
            <LegalText>
              <p>Os tributos são <strong>impostos, taxas e contribuições de melhoria</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O CTN adota a teoria tripartite. O STF, ao interpretar a CF/88, adotou a teoria pentapartite:
                impostos, taxas, contribuições de melhoria, empréstimos compulsórios e contribuições especiais
                (sociais, CIDE e de interesse de categorias profissionais). A distinção importa porque cada
                espécie tem seu regime constitucional próprio de anterioridade, imunidades e requisitos
                formais. Identificar a espécie corretamente é o primeiro passo para saber quais regras
                se aplicam a um tributo específico.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO II ── */}
          <Secao id="titulo-2" titulo="Título II: Competência Tributária" subtitulo="Arts. 6º ao 15" />
          <Secao id="cap-1" titulo="Capítulo I: Disposições Gerais" subtitulo="Arts. 6º ao 8º" />

          <Artigo id="art-6" numero="Art. 6º" titulo="Competência Legislativa Plena">
            <LegalText>
              <p>
                A atribuição constitucional de competência tributária compreende a <strong>competência
                legislativa plena</strong>, ressalvadas as limitações contidas na Constituição Federal,
                nas Constituições dos Estados e nas Leis Orgânicas do Distrito Federal e dos Municípios.
              </p>
              <p className="mt-3"><strong>Parágrafo único.</strong> Os tributos cuja receita seja distribuída, no todo ou em parte, a outras pessoas jurídicas de direito público pertencem à competência legislativa daquele a quem tenham sido atribuídos.</p>
            </LegalText>
            <Comentario>
              <p>
                O fato de a receita ser compartilhada com outro ente não muda quem tem competência para
                legislar. O Imposto de Renda é de competência da União. Mesmo que 47% da arrecadação do
                IR seja repartida com estados e municípios pelo Fundo de Participação, isso não dá aos
                estados qualquer poder de mexer nas alíquotas ou bases de cálculo. Quem cria e altera é
                a União. Quem recebe parte da receita são os outros entes, sem nenhum poder normativo
                sobre o tributo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-7" numero="Art. 7º" titulo="Indelegabilidade da Competência Tributária">
            <LegalText>
              <p>
                A competência tributária é <strong>indelegável</strong>, salvo atribuição das funções de
                arrecadar ou fiscalizar tributos, ou de executar leis, serviços, atos ou decisões
                administrativas em matéria tributária, conferida por uma pessoa jurídica de direito público
                a outra.
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>§ 1º</strong> A atribuição compreende as garantias e os privilégios processuais que competem à pessoa jurídica de direito público que a conferir.</li>
                <li><strong>§ 2º</strong> A atribuição pode ser revogada, a qualquer tempo, por ato unilateral da pessoa jurídica de direito público que a tenha conferido.</li>
                <li><strong>§ 3º</strong> Não constitui delegação de competência o cometimento, a pessoas de direito privado, do encargo ou da função de arrecadar tributos.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A distinção fundamental é entre competência tributária (poder de legislar) e capacidade
                tributária ativa (poder de arrecadar e fiscalizar). A competência não se transfere. A
                capacidade pode ser delegada entre entes públicos. O §3º resolve a dúvida do cotidiano:
                quando você paga um DARF no Bradesco, o banco não está exercendo competência tributária.
                Ele só recebe o dinheiro por contrato com a Receita Federal. Não há delegação de poder
                público, há prestação de serviço de arrecadação por entidade privada.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-8" numero="Art. 8º" titulo="Não-Exercício da Competência Tributária">
            <LegalText>
              <p>O <strong>não-exercício da competência tributária</strong> não a defere a pessoa jurídica de direito público diversa daquela a que a Constituição a tenha atribuído.</p>
            </LegalText>
            <Comentario>
              <p>
                Se um estado não cria um tributo que poderia criar, isso não transfere o poder de criá-lo
                para nenhum outro ente. O ITCMD é um bom exemplo: alguns estados já deixaram de exercer
                plenamente sua competência sobre o imposto de transmissão causa mortis. Esse silêncio não
                permite que a União cobre um equivalente nem que o município passe a tributar heranças.
                A Constituição deu esse espaço ao estado, e o estado pode ocupá-lo quando quiser ou deixá-lo
                vazio, mas sem que ninguém entre no seu lugar.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-2" titulo="Capítulo II: Limitações da Competência Tributária — Seção I: Disposições Gerais" subtitulo="Arts. 9º ao 15" />

          <Artigo id="art-9" numero="Art. 9º" titulo="Vedações às Pessoas Políticas">
            <LegalText>
              <p>É vedado à União, aos Estados, ao Distrito Federal e aos Municípios:</p>
              <ul className="mt-3 space-y-2 pl-4">
                <li><strong>I</strong> - instituir ou majorar tributos sem que a lei o estabeleça;</li>
                <li><strong>II</strong> - cobrar imposto sobre o patrimônio e a renda com base em lei posterior à data inicial do exercício financeiro a que corresponda;</li>
                <li><strong>III</strong> - estabelecer limitações ao tráfego, no território nacional, de pessoas ou mercadorias, por meio de tributos interestaduais ou intermunicipais;</li>
                <li>
                  <strong>IV</strong> - cobrar imposto sobre:
                  <ul className="mt-2 space-y-1 pl-4">
                    <li><strong>a)</strong> o patrimônio, a renda ou os serviços uns dos outros;</li>
                    <li><strong>b)</strong> templos de qualquer culto;</li>
                    <li><strong>c)</strong> o patrimônio, a renda ou serviços dos partidos políticos, inclusive suas fundações, das entidades sindicais dos trabalhadores, das instituições de educação e de assistência social, sem fins lucrativos, observados os requisitos fixados na Seção II deste Capítulo;</li>
                    <li><strong>d)</strong> papel destinado exclusivamente à impressão de jornais, periódicos e livros.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-3"><strong>§ 1º</strong> O disposto no inciso IV não exclui a atribuição, por essas pessoas jurídicas, às contribuições sociais previstas no art. 217 deste Código.</p>
              <p className="mt-2"><strong>§ 2º</strong> O disposto na alínea a do inciso IV aplica-se, exclusivamente, aos serviços próprios das pessoas jurídicas de direito público a que se refere este artigo, e inerentes aos seus objetivos.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 9º é o coração das limitações ao poder de tributar no CTN, correspondendo ao art.
                150 da CF/88. O inciso I é a legalidade tributária: sem lei, sem tributo. O inciso II traz
                a anterioridade de exercício para impostos sobre patrimônio e renda. As imunidades do inciso
                IV são as mais litigadas: a imunidade recíproca entre entes (alínea a) protege apenas
                serviços essenciais, não qualquer atividade econômica de empresas públicas. A imunidade
                religiosa (alínea b) protege o patrimônio vinculado às finalidades religiosas, não qualquer
                bem da entidade. A imunidade das entidades sem fins lucrativos (alínea c) exige os requisitos
                do art. 14, o que ainda gera litígios frequentes.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-10" numero="Art. 10" titulo="Uniformidade Geográfica dos Tributos Federais">
            <LegalText>
              <p>
                É vedado à União instituir tributo que não seja <strong>uniforme em todo o território
                nacional</strong>, ou que importe distinção ou preferência em favor de determinado Estado
                ou Município, em detrimento de outro, admitida a concessão de <strong>incentivos fiscais</strong>{" "}
                destinados a promover o equilíbrio do desenvolvimento socioeconômico entre as diferentes
                regiões do País.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A exceção para incentivos de equilíbrio regional é o que legitima juridicamente a Zona
                Franca de Manaus e os incentivos do SUDAM e SUDENE. A Zona Franca oferece IPI e II reduzidos
                para produtos industrializados em Manaus. Isso parece uma preferência em favor do Amazonas
                e de fato é, mas passa pelo filtro do Art. 10 porque existe para reduzir a desigualdade
                regional, compensando as desvantagens logísticas da Amazônia. O STF já reconheceu esse
                regime diversas vezes, inclusive diante das mudanças que a reforma tributária traz para
                o modelo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-11" numero="Art. 11" titulo="(Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">Artigo revogado. Integrava a Seção II do Capítulo II, que tratava da discriminação de rendas tributárias sob a ordem constitucional de 1946 e 1967. Seu conteúdo foi absorvido pelas normas de repartição de receitas da Constituição Federal de 1988 (arts. 157 a 162).</p>
            </LegalText>
            <Comentario>
              <p>
                Os arts. 11 a 13 do CTN original cuidavam da "discriminação de rendas": as regras que
                definiam quais tributos pertenciam à União, aos estados e aos municípios e como as receitas
                seriam partilhadas. Com a Constituição de 1988 reestruturando completamente o sistema de
                repartição de receitas, esses artigos perderam objeto e foram revogados. Hoje, as regras
                de partilha estão nos arts. 157 a 162 da CF/88 e nas normas do Fundo de Participação
                dos Estados e dos Municípios.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-12" numero="Art. 12" titulo="(Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">Artigo revogado. Tratava da discriminação de rendas entre entes federativos sob a ordem constitucional anterior à CF/88.</p>
            </LegalText>
            <Comentario>
              <p>
                A lógica de revogação é a mesma do Art. 11. Com a CF/88 absorvendo as regras de repartição
                de receitas diretamente no texto constitucional, os dispositivos do CTN sobre discriminação
                de rendas tornaram-se incompatíveis com a nova ordem e foram excluídos. O CTN ainda disciplina
                os tributos e suas normas gerais, mas quem distribui receitas entre os entes é a própria
                Constituição.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-13" numero="Art. 13" titulo="(Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">Artigo revogado. Integrava a mesma seção sobre discriminação de rendas.</p>
            </LegalText>
            <Comentario>
              <p>
                A sequência de artigos revogados (11, 12 e 13) ilustra bem como o CTN de 1966 foi editado
                dentro de uma ordem constitucional específica (EC 18/1965, CF/1967) e precisou ser adaptado
                à CF/88. Os artigos que sobreviveram são os que tratam de institutos permanentes do direito
                tributário: conceito de tributo, obrigação, crédito, lançamento. Os que lidavam com a
                estrutura política de distribuição de poder tributário precisaram ser substituídos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-14" numero="Art. 14" titulo="Condições para a Imunidade das Entidades sem Fins Lucrativos">
            <LegalText>
              <p>O disposto na alínea c do inciso IV do artigo 9º é subordinado à observância dos seguintes requisitos pelas entidades nele referidas:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - não distribuírem qualquer parcela de seu patrimônio ou de suas rendas, a qualquer título;</li>
                <li><strong>II</strong> - aplicarem integralmente, no País, os seus recursos na manutenção dos seus objetivos institucionais;</li>
                <li><strong>III</strong> - manterem escrituração de suas receitas e despesas em livros revestidos de formalidades capazes de assegurar sua exatidão.</li>
              </ul>
              <p className="mt-3"><strong>§ 1º</strong> Na falta de cumprimento do disposto neste artigo, ou no § 1º do artigo 9º, a autoridade competente pode suspender a aplicação do benefício.</p>
              <p className="mt-2"><strong>§ 2º</strong> Os serviços a que se refere a alínea c do inciso IV do artigo 9º são exclusivamente os diretamente relacionados com os objetivos institucionais das entidades de que trata este artigo, previstos nos respectivos estatutos ou atos constitutivos.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 14 é um dos mais litigados de todo o sistema tributário brasileiro. Ele estabelece
                as três condições para que uma entidade de educação ou assistência social sem fins lucrativos
                goze da imunidade do art. 9º, IV, c: não distribuir lucros, aplicar recursos integralmente
                no país e manter escrituração regular. O detalhe que gera mais conflitos é o inciso I. A
                expressão "a qualquer título" levou muitas prefeituras a questionar se o pagamento de salários
                acima do mercado a diretores de fundações configuraria distribuição indireta de lucros. O
                STF firmou que remuneração de dirigentes não descaracteriza a imunidade desde que seja
                razoável e dentro dos padrões de mercado.
              </p>
              <p className="mt-3">
                O §2º limita a imunidade aos serviços diretamente ligados aos objetivos institucionais.
                Uma universidade imune ao IPTU sobre seus prédios acadêmicos não necessariamente tem imunidade
                sobre um estacionamento comercial que aluga vagas para o público. O STF tem julgado essas
                situações caso a caso, mas a tendência geral é de que receitas que financiam as atividades
                institucionais também ficam protegidas, desde que o lucro não seja distribuído.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-15" numero="Art. 15" titulo="Empréstimos Compulsórios">
            <LegalText>
              <p>Somente a União, nos seguintes casos excepcionais, pode instituir <strong>empréstimos compulsórios</strong>:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - guerra externa, ou sua iminência;</li>
                <li><strong>II</strong> - calamidade pública que exija auxílio federal impossível de atender com os recursos orçamentários disponíveis;</li>
                <li><strong>III</strong> - conjuntura que exija a absorção temporária de poder aquisitivo.</li>
              </ul>
              <p className="mt-3"><strong>Parágrafo único.</strong> A lei fixará obrigatoriamente o prazo do empréstimo e as condições de seu resgate, observando, no que for aplicável, o disposto nesta Lei.</p>
            </LegalText>
            <Comentario>
              <p>
                O empréstimo compulsório é o tributo que a União pode cobrar com a obrigação de devolver.
                O Art. 15 lista três situações autorizadoras no texto original do CTN. O inciso III, sobre
                "conjuntura que exija absorção temporária de poder aquisitivo", foi a base do famigerado
                empréstimo compulsório sobre combustíveis e veículos da década de 1980 (DecretosLeis 2.047/1983
                e 2.049/1983). O STF acabou declarando inconstitucionais essas cobranças após a CF/88, que
                no art. 148 limitou os empréstimos compulsórios a guerra e calamidade, eliminando a hipótese
                de conjuntura econômica.
              </p>
              <p className="mt-3">
                O parágrafo único traz um ponto que não é meramente formal: a lei tem que fixar prazo e
                condições de resgate. Empréstimo compulsório sem prazo definido de devolução vira imposto
                disfarçado. O STF usou essa linha de raciocínio em vários julgamentos, reconhecendo o
                direito de contribuintes à devolução dos valores cobrados a título de empréstimo compulsório
                nos anos 1980.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO III ── */}
          <Secao id="titulo-3" titulo="Título III: Impostos" subtitulo="Arts. 16 ao 76" />
          <Secao id="cap-3" titulo="Capítulo I: Disposições Gerais" subtitulo="Arts. 16 ao 18" />

          <Artigo id="art-16" numero="Art. 16" titulo="Definição de Imposto">
            <LegalText>
              <p>
                Imposto é o tributo cuja obrigação tem por fato gerador uma situação{" "}
                <strong>independente de qualquer atividade estatal específica</strong>, relativa ao
                contribuinte.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A definição de imposto do Art. 16 é o espelho da definição de taxa. O imposto não exige
                contraprestação estatal específica para existir. Você paga Imposto de Renda porque auferiu
                renda, não porque o governo prestou algum serviço individualizado para você. Isso é
                fundamentalmente diferente de uma taxa de coleta de lixo, que existe porque o município
                presta aquele serviço específico.
              </p>
              <p className="mt-3">
                Essa distinção é determinante para o controle de constitucionalidade. Se o Congresso
                criar uma cobrança chamada de "contribuição" mas cujo fato gerador é uma situação sem
                qualquer referência a atividade estatal (como "ser proprietário de um bem"), essa
                cobrança é um imposto e precisa de competência constitucional específica. O STF aplica
                o Art. 4º combinado com o Art. 16 para fazer esse teste.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-17" numero="Art. 17" titulo="Impostos do Sistema Tributário Nacional">
            <LegalText>
              <p>Os impostos componentes do sistema tributário nacional são exclusivamente os que constam deste Título, com as competências e limitações nele previstas.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 17 expressa o princípio da taxatividade dos impostos: apenas os impostos previstos
                na Constituição e no CTN podem ser cobrados. Isso reflete o sistema de competências
                tributárias enumeradas da CF/88: cada ente tem poderes específicos e delimitados para
                criar impostos. A União tem o IR, IPI, II, IE, IOF, ITR, IGF. Os estados têm ICMS,
                ITCMD, IPVA. Os municípios têm ISS, IPTU, ITBI. Fora desse rol, há a competência residual
                da União (art. 154, I CF/88) para impostos novos, desde que por lei complementar e sem
                duplicidade de fato gerador.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-18" numero="Art. 18" titulo="Competência Cumulativa da União e do Distrito Federal">
            <LegalText>
              <p>Compete:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - à União, instituir, nos Territórios Federais, os impostos atribuídos aos Estados e, se aqueles não tiverem Câmaras de Vereadores, os atribuídos aos Municípios;</li>
                <li><strong>II</strong> - ao Distrito Federal e aos Estados não divididos em Municípios, instituir, cumulativamente, os impostos atribuídos aos Estados e aos Municípios.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O inciso I perdeu parte de seu sentido prático com a extinção dos Territórios Federais
                pela CF/88. Hoje o Brasil não tem territórios no sentido constitucional de 1966. Mas o
                inciso II continua plenamente aplicável ao Distrito Federal: por ser um ente federado que
                não se divide em municípios, o DF acumula tanto a competência estadual quanto a municipal.
                Por isso o DF cobra ICMS (estadual), ITCMD (estadual), IPVA (estadual), e ao mesmo tempo
                ISS (municipal), IPTU (municipal) e ITBI (municipal). É o único ente do país com essa
                duplicidade de competências.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP II — COMÉRCIO EXTERIOR ── */}
          <Secao id="cap-4" titulo="Capítulo II: Impostos sobre o Comércio Exterior" subtitulo="Arts. 19 ao 28" />
          <Secao id="sec-ii" titulo="Seção I: Imposto sobre a Importação (II)" subtitulo="Arts. 19 ao 22" />

          <Artigo id="art-19" numero="Art. 19" titulo="II: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência da União, sobre a importação de produtos estrangeiros tem como fato gerador a <strong>entrada destes no território nacional</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O fato gerador do II é a entrada no território nacional. Na prática, o STJ e o STF firmaram
                que a entrada relevante é o desembaraço aduaneiro, não a simples chegada física da mercadoria
                ao porto ou aeroporto. A mercadoria que chega mas não é despachada (aguarda em zona primária
                de tributação) ainda não gerou o fato gerador do II. Isso tem impacto direto em casos de
                destruição de mercadorias antes do desembaraço, que ficam fora do alcance do imposto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-20" numero="Art. 20" titulo="II: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quando a alíquota seja específica, a unidade de medida adotada pela lei tributária;</li>
                <li><strong>II</strong> - quando a alíquota seja ad valorem, o preço normal que o produto, ou seu similar, alcançaria, ao tempo da importação, em uma venda em condições de livre concorrência, para entrega no porto ou lugar de entrada do produto no País;</li>
                <li><strong>III</strong> - quando se trate de produto apreendido ou abandonado, levado a leilão, o preço da arrematação.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O inciso II descreve o valor aduaneiro, que na prática é o conceito do Acordo de Valoração
                Aduaneira do GATT/OMC (Acordo sobre Valoração em Alfândega), incorporado ao direito
                brasileiro pelo Decreto 1.355/1994. O "preço normal em condições de livre concorrência"
                é o que o Acordo chama de "valor de transação": o preço efetivamente pago ou a pagar pela
                mercadoria. Quando esse preço não pode ser verificado ou é suspeito (subfaturamento), a
                Receita Federal pode usar métodos alternativos de valoração, sempre na sequência hierárquica
                definida no Acordo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-21" numero="Art. 21" titulo="II: Poder do Executivo sobre Alíquotas">
            <LegalText>
              <p>O <strong>Poder Executivo</strong> pode, nas condições e nos limites estabelecidos em lei, alterar as alíquotas ou as bases de cálculo do imposto, a fim de ajustá-lo aos objetivos da <strong>política cambial e do comércio exterior</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O II é um dos poucos impostos em que o Executivo pode alterar alíquotas sem lei formal.
                Isso não viola a legalidade tributária porque a própria lei (e a CF/88, art. 153, §1º)
                autoriza essa flexibilidade por razões extrafiscais: o II é instrumento de política
                comercial e cambial, e a necessidade de resposta rápida a situações de mercado é incompatível
                com o tempo de tramitação legislativa. Na prática, as alíquotas do II são reguladas pela
                TEC (Tarifa Externa Comum do MERCOSUL), alterada por decisões do bloco. A CAMEX (hoje
                GECEX) tem competência delegada para mexer nas alíquotas dentro dos limites acordados
                no bloco.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-22" numero="Art. 22" titulo="II: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o importador ou quem a lei a ele equiparar;</li>
                <li><strong>II</strong> - o arrematante de produtos apreendidos ou abandonados.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A expressão "quem a lei a ele equiparar" abre espaço para responsabilidade tributária em
                toda a cadeia logística. Despachantes aduaneiros, transportadoras e armazéns alfandegários
                podem ser responsabilizados solidariamente pelo II em determinadas situações. O art. 32 do
                Decreto-Lei 37/1966, que regula o II, detalha os casos de equiparação. O arrematante no
                leilão de bens apreendidos ou abandonados na alfândega é o contribuinte mais direto: ao
                comprar a mercadoria em leilão, ele assume o dever de recolher o imposto.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-ie" titulo="Seção II: Imposto sobre a Exportação (IE)" subtitulo="Arts. 23 ao 28" />

          <Artigo id="art-23" numero="Art. 23" titulo="IE: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência da União, sobre a exportação, para o estrangeiro, de produtos nacionais ou nacionalizados tem como fato gerador a <strong>saída destes do território nacional</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O IE incide sobre a saída de produtos para o exterior. Na prática, sua alíquota é zero
                para a grande maioria dos produtos, porque o Brasil tem política de estímulo às exportações.
                Quando utilizado, o IE serve como instrumento de política comercial: controlar a saída de
                produtos com escassez interna (como ocorreu historicamente com couro e cacau). A CF/88
                mantém a imunidade ao IE para produtos industrializados (diferente do que ocorre com o IPI,
                que também tem imunidade nas exportações).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-24" numero="Art. 24" titulo="IE: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quando a alíquota seja específica, a unidade de medida adotada pela lei tributária;</li>
                <li><strong>II</strong> - quando a alíquota seja ad valorem, o preço normal que o produto, ou seu similar, alcançaria, ao tempo da exportação, em uma venda em condições de livre concorrência.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo do IE espelha a do II, com a diferença do sentido do fluxo da mercadoria.
                O "preço normal em livre concorrência" para exportação é o preço FOB (Free on Board) no
                porto de embarque, excluídos os fretes e seguros internacionais. Nas poucas situações em
                que o IE é efetivamente cobrado (como no caso do café em períodos históricos específicos),
                o preço de exportação é frequentemente fixado por pauta mínima estabelecida pela autoridade
                aduaneira, para evitar subfaturamento nas exportações.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-25" numero="Art. 25" titulo="IE: Poder do Executivo sobre Alíquotas">
            <LegalText>
              <p>O <strong>Poder Executivo</strong> pode, nas condições e nos limites estabelecidos em lei, alterar as alíquotas ou as bases de cálculo do imposto, a fim de ajustá-lo aos objetivos da <strong>política cambial e do comércio exterior</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                Assim como no II, o Executivo tem flexibilidade para alterar as alíquotas do IE por ato
                infralegal, dentro dos limites fixados em lei. Essa extrafiscalidade é ainda mais marcante
                no IE do que no II: o IE é raramente um instrumento de arrecadação e quase sempre um
                instrumento de controle de oferta interna. Quando o governo quer impedir a saída de um
                produto essencial em momento de escassez interna, pode elevar a alíquota do IE rapidamente
                sem depender do processo legislativo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-26" numero="Art. 26" titulo="IE: Pauta de Valor Mínimo">
            <LegalText>
              <p>O Poder Executivo pode substituir, no todo ou em parte, a alíquota ad valorem por outra específica, ou vice-versa, e adotar pautas de valor mínimo para a base de cálculo do imposto, com o objetivo de evitar o subfaturamento nas operações de exportação.</p>
            </LegalText>
            <Comentario>
              <p>
                A pauta de valor mínimo é um instrumento antievasão aplicado nas exportações. Sem ela,
                um exportador poderia subfaturar a mercadoria (declarar preço abaixo do real) para reduzir
                a base de cálculo do IE. A pauta estabelece um piso: mesmo que o preço declarado seja
                menor, o imposto é calculado sobre o valor mínimo da pauta. Na prática, esse mecanismo
                é mais usado no II (para combater subfaturamento de importações) do que no IE, mas o
                CTN o prevê para ambos os tributos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-27" numero="Art. 27" titulo="IE: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é o <strong>exportador ou quem a lei a ele equiparar</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O exportador é o sujeito passivo natural do IE: é quem realiza a operação de envio da
                mercadoria ao exterior. A equiparação legal pode alcançar tradings e outros intermediários
                que atuam em nome próprio nas exportações. Uma distinção importante: o mandatário que
                exporta em nome do produtor rural ou industrial não é contribuinte do IE, pois age em
                nome alheio. Já a trading house que compra a mercadoria e revende para o exterior em
                nome próprio é a exportadora de direito e, portanto, o contribuinte.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-28" numero="Art. 28" titulo="IE: Destino da Receita">
            <LegalText>
              <p>A receita líquida do imposto destina-se à formação de reservas monetárias, na forma da lei.</p>
            </LegalText>
            <Comentario>
              <p>
                Este artigo reflete a visão de 1966 de que o IE deveria alimentar reservas cambiais do
                país. Com a CF/88, o princípio da não vinculação de receitas de impostos (art. 167, IV)
                e as transformações do sistema cambial brasileiro tornaram essa destinação específica
                praticamente inoperante na forma original. Hoje as reservas internacionais do Brasil são
                gerenciadas pelo Banco Central dentro de um regime de câmbio flutuante, sem vinculação
                direta com receitas tributárias. O artigo permanece no texto do CTN, mas sua aplicação
                prática é residual.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP III — PATRIMÔNIO E RENDA ── */}
          <Secao id="cap-5" titulo="Capítulo III: Impostos sobre o Patrimônio e a Renda" subtitulo="Arts. 29 ao 45" />
          <Secao id="sec-itr" titulo="Seção I: Imposto sobre a Propriedade Territorial Rural (ITR)" subtitulo="Arts. 29 ao 31" />

          <Artigo id="art-29" numero="Art. 29" titulo="ITR: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência da União, sobre a propriedade territorial rural tem como fato gerador a <strong>propriedade, o domínio útil ou a posse de imóvel por natureza</strong>, como definido na lei civil, localizado fora da zona urbana do Município.</p>
            </LegalText>
            <Comentario>
              <p>
                O ITR incide sobre imóveis rurais, mas a definição de "rural" usa a localização fora da
                zona urbana como critério, não a destinação. Um imóvel localizado fora do perímetro urbano
                do município é rural para fins de ITR, mesmo que seja usado para lazer ou esteja inativo.
                O inverso também existe: a "área urbanizável" do art. 32, §2º pode ser considerada urbana
                para IPTU mesmo estando além do perímetro formal. Essa distinção gerou a Súmula 626 do
                STJ: o IPTU pode incidir sobre imóvel situado em área considerada pelo plano diretor como
                zona urbana de expansão, mesmo sem os melhoramentos listados no art. 32.
              </p>
              <p className="mt-3">
                A CF/88 criou uma opção para municípios assumirem a fiscalização e arrecadação do ITR
                (art. 153, §4º, III), ficando com 100% da arrecadação. Isso inverteu o desincentivo
                histórico que os municípios tinham em atualizar os cadastros rurais: antes, 50% ia para
                a União e o esforço de fiscalização parecia pouco compensador.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-30" numero="Art. 30" titulo="ITR: Base de Cálculo">
            <LegalText>
              <p>A base do cálculo do imposto é o <strong>valor fundiário</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O valor fundiário é o valor da terra nua, excluídas as benfeitorias, construções e
                culturas. É diferente do valor venal total do imóvel rural. Essa distinção faz sentido
                tributário: o ITR é imposto sobre a propriedade da terra, não sobre o que o proprietário
                construiu ou cultivou nela. Na prática, a Lei 9.393/1996 (lei específica do ITR) operacionaliza
                esse conceito com o VTN (Valor da Terra Nua) declarado pelo próprio contribuinte em sistema
                de autolançamento. A Receita Federal cruza as declarações com bases de dados de mercado
                de terras para identificar subdeclarações.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-31" numero="Art. 31" titulo="ITR: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é o proprietário do imóvel, o titular do seu domínio útil, ou o seu <strong>possuidor a qualquer título</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                A inclusão do possuidor como contribuinte é relevante em duas situações comuns na
                realidade rural brasileira: assentamentos de reforma agrária (onde o assentado tem posse
                mas não propriedade formal) e contratos de arrendamento (onde o arrendatário pode ser
                considerado possuidor). O STJ firmou que o adquirente de imóvel rural responde pelos
                débitos de ITR anteriores à transferência, com exceção quando a certidão negativa de débitos
                foi exigida na escritura. Isso cria risco real em transações imobiliárias rurais sem
                due diligence tributária adequada.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-iptu" titulo="Seção II: Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU)" subtitulo="Arts. 32 ao 34" />

          <Artigo id="art-32" numero="Art. 32" titulo="IPTU: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência dos Municípios, sobre a propriedade predial e territorial urbana tem como fato gerador a propriedade, o domínio útil ou a posse de bem imóvel por natureza ou por acessão física, como definido na lei civil, <strong>localizado na zona urbana do Município</strong>.</p>
              <p className="mt-3"><strong>§ 1º</strong> Para os efeitos deste imposto, entende-se como zona urbana a definida em lei municipal; observado o requisito mínimo da existência de melhoramentos indicados em pelo menos 2 (dois) dos incisos seguintes, construídos ou mantidos pelo Poder Público:</p>
              <ul className="mt-2 space-y-1 pl-4">
                <li><strong>I</strong> - meio-fio ou calçamento, com canalização de águas pluviais;</li>
                <li><strong>II</strong> - abastecimento de água;</li>
                <li><strong>III</strong> - sistema de esgotos sanitários;</li>
                <li><strong>IV</strong> - rede de iluminação pública, com ou sem posteamento para distribuição domiciliar;</li>
                <li><strong>V</strong> - escola primária ou posto de saúde a uma distância máxima de 3 (três) quilômetros do imóvel considerado.</li>
              </ul>
              <p className="mt-3"><strong>§ 2º</strong> A lei municipal pode considerar urbanas as áreas urbanizáveis, ou de expansão urbana, constantes de loteamentos aprovados pelos órgãos competentes, destinados à habitação, à indústria ou ao comércio, mesmo que localizados fora das zonas definidas nos termos do parágrafo anterior.</p>
            </LegalText>
            <Comentario>
              <p>
                A definição de zona urbana do §1º é o ponto mais litigado do IPTU. O município precisa
                de pelo menos dois dos cinco melhoramentos listados para considerar uma área como urbana.
                Mas o §2º abre um caminho alternativo: áreas de expansão urbana aprovadas no plano diretor
                podem ser consideradas urbanas independentemente dos melhoramentos. O STJ tem uma jurisprudência
                complexa sobre o chamado "critério da destinação": imóveis localizados em área formalmente
                urbana mas usados para atividade rural (pequenas chácaras de subsistência, por exemplo)
                podem ser considerados rurais para fins de ITR. A Súmula 626 do STJ consolidou o critério
                da localização para a maioria dos casos, mas casos de imóveis rurais em área urbana ainda
                geram debates.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-33" numero="Art. 33" titulo="IPTU: Base de Cálculo">
            <LegalText>
              <p>A base do cálculo do imposto é o <strong>valor venal do imóvel</strong>.</p>
              <p className="mt-3"><strong>Parágrafo único.</strong> Na determinação da base de cálculo, não se considera o valor dos bens móveis mantidos, em caráter permanente ou temporário, no imóvel, para efeito de sua utilização, exploração, aformoseamento ou comodidade.</p>
            </LegalText>
            <Comentario>
              <p>
                O valor venal para o IPTU é o valor de mercado do imóvel, apurado pela planta genérica
                de valores do município. Na prática, a planta genérica é periodicamente desatualizada,
                o que gera dois problemas opostos: municípios que cobram IPTU sobre valor venal muito
                abaixo do mercado (perda de receita) e municípios que atualizam a planta por decreto
                acima da inflação, o que o STF considera majoração da base de cálculo e exige lei. A
                Súmula Vinculante 29 do STF consolidou que atualizar o valor venal pelo índice oficial
                de inflação pode ser feito por decreto, mas aumentar além da inflação exige lei formal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-34" numero="Art. 34" titulo="IPTU: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é o proprietário do imóvel, o titular do seu domínio útil, ou o seu <strong>possuidor a qualquer título</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                No IPTU, a escolha do contribuinte pelo município entre proprietário, titular do domínio
                útil ou possuidor gera situações interessantes no mercado imobiliário. Em contratos de
                compromisso de compra e venda, o promitente comprador que está imitido na posse pode ser
                considerado contribuinte do IPTU, conforme o STJ. Isso é relevante em situações de
                inadimplemento: o vendedor pode exigir que o comprador que está no imóvel pague o IPTU
                do período em que esteve na posse, mesmo que o contrato não tenha sido levado a registro.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-itbi" titulo="Seção III: Imposto sobre Transmissão de Bens Imóveis e Direitos" subtitulo="Arts. 35 ao 42" />

          <Artigo id="art-35" numero="Art. 35" titulo="Transmissão: Fato Gerador">
            <LegalText>
              <p>O imposto sobre a transmissão de bens imóveis e de direitos a eles relativos tem como fato gerador:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - a transmissão, a qualquer título, da propriedade ou do domínio útil de bens imóveis por natureza ou por acessão física, como definidos na lei civil;</li>
                <li><strong>II</strong> - a transmissão, a qualquer título, de direitos reais sobre imóveis, exceto os direitos reais de garantia;</li>
                <li><strong>III</strong> - a cessão de direitos relativos às transmissões referidas nos incisos I e II.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 35 foi escrito para um imposto único que em 1966 cobria tanto as transmissões
                causa mortis quanto as inter vivos. A CF/88 dividiu essa competência: o ITCMD (transmissão
                causa mortis e doação) ficou com os estados (art. 155, I CF/88), e o ITBI (transmissão
                inter vivos onerosa, exceto doação) ficou com os municípios (art. 156, II CF/88). Os
                arts. 35 a 42 do CTN passaram a ter aplicação dual: os estados aplicam ao ITCMD e os
                municípios ao ITBI, com as adaptações necessárias ao contexto de cada um.
              </p>
              <p className="mt-3">
                O inciso III, sobre a cessão de direitos, é especialmente relevante para o ITBI municipal
                no mercado imobiliário. Quando alguém cede seus direitos em um contrato de compromisso
                de compra e venda de imóvel antes do registro definitivo, essa cessão é fato gerador
                do ITBI. Muitos compradores tentam evitar o imposto argumentando que houve apenas cessão
                de contrato e não transmissão de propriedade, mas o inciso III fecha esse caminho.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-36" numero="Art. 36" titulo="Transmissão: Exclusões da Incidência">
            <LegalText>
              <p>Ressalvado o disposto no artigo seguinte, o imposto não incide sobre a transmissão dos bens ou direitos referidos no artigo anterior:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quando efetuada para sua incorporação ao patrimônio de pessoa jurídica em pagamento de capital nela subscrito;</li>
                <li><strong>II</strong> - quando decorrente da incorporação ou da fusão de uma pessoa jurídica por outra ou com outra.</li>
              </ul>
              <p className="mt-3"><strong>Parágrafo único.</strong> O imposto não incide sobre a transmissão aos mesmos alienantes, dos bens e direitos adquiridos na forma do inciso I deste artigo, em decorrência da sua desincorporação do patrimônio da pessoa jurídica a que foram conferidos.</p>
            </LegalText>
            <Comentario>
              <p>
                O inciso I cria um benefício importante para o mercado corporativo: a integralização de
                imóveis no capital de uma empresa não gera ITBI ou ITCMD. A lógica é que o sócio que
                integraliza o imóvel continua indiretamente dono do bem via participação societária, não
                há uma alienação real a terceiro. O parágrafo único é o complemento: quando o imóvel
                sai da empresa de volta para o mesmo sócio que o integralizou, também não há incidência.
                Isso cria um planejamento comum no ciclo de investimentos imobiliários.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-37" numero="Art. 37" titulo="Preponderância de Atividade Imobiliária">
            <LegalText>
              <p>O disposto no inciso I do artigo anterior não se aplica quando a pessoa jurídica adquirente tenha como <strong>atividade preponderante</strong> a venda ou locação de propriedade imobiliária ou a cessão de direitos relativos à sua aquisição.</p>
              <p className="mt-3"><strong>§ 1º</strong> Considera-se caracterizada a atividade preponderante referida neste artigo quando mais de 50% (cinquenta por cento) da receita operacional da pessoa jurídica adquirente, nos 2 (dois) anos anteriores e nos 2 (dois) anos subsequentes à aquisição, decorrer de transações mencionadas neste artigo.</p>
              <p className="mt-2"><strong>§ 2º</strong> Se a pessoa jurídica adquirente iniciar suas atividades após a aquisição, ou menos de 2 (dois) anos antes dela, apurar-se-á a preponderância levando em conta os 3 (três) primeiros anos seguintes à data da aquisição.</p>
              <p className="mt-2"><strong>§ 3º</strong> Verificada a preponderância referida neste artigo, tornar-se-á devido o imposto, nos termos da lei vigente à data da aquisição, sobre o valor do bem ou direito nessa data.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 37 fecha a janela que o Art. 36 abriria para evasão: se a não incidência no
                aporte de imóvel ao capital fosse irrestrita, qualquer comprador poderia criar uma empresa,
                integralizar o imóvel sem pagar ITBI e depois liquidar a empresa. O teste de preponderância
                imobiliária impede isso. Se mais de 50% da receita da empresa vem de compra, venda ou
                locação de imóveis, a isenção cai e o ITBI é devido. O prazo de análise de dois anos
                antes e dois anos depois da aquisição é justamente para pegar o caso em que a empresa
                foi criada para a operação específica e logo encerra atividades.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-38" numero="Art. 38" titulo="Transmissão: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é o <strong>valor venal dos bens ou direitos transmitidos</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                O valor venal para o ITBI é o valor de mercado do imóvel na data da transmissão. Aqui
                existe uma tensão frequente: municípios que fixam a base de cálculo do ITBI pela planta
                genérica de valores (a mesma usada para o IPTU) e contribuintes que apresentam o valor
                de transação da escritura, frequentemente menor que a planta. O STF, no julgamento do
                Tema 1.113, definiu que a base de cálculo do ITBI é o valor do negócio jurídico (o preço
                efetivamente pago), não o valor venal da planta genérica, e que o município não pode
                arbitrar a base sem abrir processo administrativo com contraditório.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-39" numero="Art. 39" titulo="Transmissão: Alíquotas">
            <LegalText>
              <p>A alíquota do imposto não excederá os limites fixados em <strong>resolução do Senado Federal</strong>, que distinguirá, para efeito de aplicação de alíquota mais baixa, as transmissões que atendam à política nacional de habitação.</p>
            </LegalText>
            <Comentario>
              <p>
                O Senado nunca chegou a fixar os limites máximos de alíquota previstos no Art. 39 para
                o ITBI. Na prática, os municípios fixam suas alíquotas livremente (geralmente entre 2%
                e 3%), e os estados fazem o mesmo para o ITCMD (geralmente entre 4% e 8%, com o STF
                tendo definido o limite máximo de 8% por resolução do Senado no RE 562.045). A menção
                às "transmissões que atendam à política nacional de habitação" é a base do ITBI zero
                previsto em muitos municípios para o primeiro imóvel financiado pelo SFH (Sistema
                Financeiro de Habitação).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-40" numero="Art. 40" titulo="Transmissão: Dedutibilidade no Imposto de Renda">
            <LegalText>
              <p>O montante do imposto é dedutível do devido à União, a título do imposto de que trata o artigo 43, sobre o provento decorrente da mesma transmissão.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 40 estabelece a dedutibilidade do ITBI pago da base de cálculo do IR sobre o
                ganho de capital na mesma operação. Na prática, quando alguém vende um imóvel e apura
                ganho de capital tributável pelo IR, o ITBI pago pelo comprador pode compor o custo de
                aquisição do adquirente e reduzir o ganho de capital futuro. O artigo é mais importante
                como princípio de coordenação entre tributos do que como regra de liquidez imediata,
                já que o IR sobre ganho de capital é pago pelo vendedor e o ITBI pelo comprador (em geral).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-41" numero="Art. 41" titulo="Transmissão: Estado Competente para a Cobrança">
            <LegalText>
              <p>O imposto compete ao Estado da situação do bem, ou ao Distrito Federal, segundo a sua localização.</p>
            </LegalText>
            <Comentario>
              <p>
                Para o ITCMD (causa mortis e doação), o critério territorial é o estado onde está localizado
                o bem imóvel. Para bens móveis, ações e créditos, o critério pode ser o estado onde se
                processar o inventário ou o domicílio do doador, conforme a CF/88 prevê que lei complementar
                regulamente. Como essa lei complementar nunca foi editada, os estados legislaram de forma
                independente, gerando conflitos de competência em transmissões envolvendo bens em estados
                diferentes. Para o ITBI municipal, o critério é mais simples: o município onde está
                localizado o imóvel.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-42" numero="Art. 42" titulo="Transmissão: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é qualquer das partes na operação tributada, como dispuser a lei.</p>
            </LegalText>
            <Comentario>
              <p>
                A abertura do Art. 42 é incomum: ao contrário de outros tributos onde o CTN designa
                precisamente o contribuinte, aqui a lei pode escolher entre as partes da operação. No
                ITBI, a prática consolidada é que o comprador é o contribuinte, mas isso não é norma
                federal vinculante, é o que a maioria das leis municipais escolheu. No ITCMD, o herdeiro
                ou donatário é o contribuinte típico, mas a lei estadual pode atribuir essa condição ao
                inventariante ou ao doador em determinadas circunstâncias. A flexibilidade do Art. 42
                foi intencional para dar autonomia às diferentes esferas tributantes.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-ir" titulo="Seção IV: Imposto sobre a Renda e Proventos de Qualquer Natureza (IR)" subtitulo="Arts. 43 ao 45" />

          <Artigo id="art-43" numero="Art. 43" titulo="IR: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência da União, sobre a renda e proventos de qualquer natureza tem como fato gerador a <strong>aquisição da disponibilidade econômica ou jurídica</strong>:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - de renda, assim entendido o produto do capital, do trabalho ou da combinação de ambos;</li>
                <li><strong>II</strong> - de proventos de qualquer natureza, assim entendidos os acréscimos patrimoniais não compreendidos no inciso anterior.</li>
              </ul>
              <p className="mt-3"><strong>§ 1º</strong> A incidência do imposto independe da denominação da receita ou do rendimento, da localização, condição jurídica ou nacionalidade da fonte, da origem e da forma de percepção.</p>
              <p className="mt-2"><strong>§ 2º</strong> Na hipótese de receita ou de rendimento oriundos do exterior, a lei estabelecerá as condições e o momento em que se dará sua disponibilidade, para fins de incidência do imposto referido neste artigo.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 43 é um dos mais sofisticados do CTN. A expressão "disponibilidade econômica ou
                jurídica" define quando o IR nasce: disponibilidade jurídica é quando o contribuinte tem
                direito adquirido ao rendimento (crédito líquido e exigível), mesmo que ainda não tenha
                o dinheiro em mãos. Disponibilidade econômica é quando efetivamente recebe o recurso.
                O IR pode nascer em qualquer um dos dois momentos, dependendo do regime de tributação
                (competência ou caixa). Daí a discussão sobre JSCP (Juros sobre Capital Próprio) e sobre
                variação cambial: a disponibilidade jurídica da variação cambial positiva sobre investimentos
                no exterior pode ou não gerar IR no momento em que ocorre, dependendo de como a lei
                regulamenta o §2º.
              </p>
              <p className="mt-3">
                O §1º resolve de uma vez o debate sobre a irrelevância da origem: renda de atividade
                ilícita (corrupção, tráfico, fraude) é tributável pelo IR porque o fato gerador é o
                acréscimo patrimonial, não a licitude da fonte. Essa combinação com o Art. 3º (tributo
                não é sanção de ato ilícito) forma o arcabouço legal pelo qual a Receita Federal pode
                cobrar IR sobre patrimônio incompatível com a renda declarada, independentemente de
                qualquer processo penal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-44" numero="Art. 44" titulo="IR: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é o montante, <strong>real, arbitrado ou presumido</strong>, da renda ou dos proventos tributáveis.</p>
            </LegalText>
            <Comentario>
              <p>
                A tripartição da base de cálculo em real, arbitrado ou presumido corresponde aos três
                regimes de tributação das pessoas jurídicas. O lucro real exige apuração contábil completa
                das receitas e despesas, com ajustes fiscais determinados na legislação do IR. O lucro
                presumido aplica percentuais fixos sobre a receita bruta para estimar o lucro, dispensando
                a escrituração completa. O lucro arbitrado é imposto pela Receita quando a empresa não
                manteve livros contábeis adequados ou os apresentou com irregularidades. A escolha entre
                real e presumido é do contribuinte dentro dos limites legais, e essa decisão tem impacto
                enorme na carga tributária, especialmente em atividades com margens variáveis.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-45" numero="Art. 45" titulo="IR: Contribuinte e Responsabilidade na Fonte">
            <LegalText>
              <p>Contribuinte do imposto é o titular da disponibilidade a que se refere o artigo 43, sem prejuízo de atribuir a lei essa condição ao possuidor, a qualquer título, dos bens produtores de renda ou dos proventos tributáveis.</p>
              <p className="mt-3"><strong>Parágrafo único.</strong> A lei pode atribuir à fonte pagadora da renda ou dos proventos tributáveis a condição de responsável pelo imposto cuja retenção e recolhimento lhe caibam.</p>
            </LegalText>
            <Comentario>
              <p>
                O parágrafo único do Art. 45 é a base legal de todo o sistema de retenção na fonte do
                IR. Quando uma empresa paga salários e retém o IRRF do empregado, quando um banco retém
                IR sobre juros de aplicações financeiras, quando uma tomadora de serviços retém IR de
                prestador pessoa jurídica — tudo isso se apoia nesse parágrafo. A fonte pagadora vira
                responsável tributária pela retenção: se não retiver, o débito é dela, não do beneficiário.
                Isso é um dos pilares da eficiência arrecadatória do IR brasileiro: ao transferir o ônus
                da retenção para agentes econômicos de maior porte e capacidade administrativa, a Receita
                Federal consegue cobrar de um número menor de agentes com muito maior eficiência.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP IV — PRODUÇÃO E CIRCULAÇÃO ── */}
          <Secao id="cap-6" titulo="Capítulo IV: Impostos sobre a Produção e a Circulação" subtitulo="Arts. 46 ao 76" />
          <Secao id="sec-ipi" titulo="Seção I: Imposto sobre Produtos Industrializados (IPI)" subtitulo="Arts. 46 ao 51" />

          <Artigo id="art-46" numero="Art. 46" titulo="IPI: Fato Gerador">
            <LegalText>
              <p>O imposto, de competência da União, sobre produtos industrializados tem como fato gerador:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o seu desembaraço aduaneiro, quando de procedência estrangeira;</li>
                <li><strong>II</strong> - a sua saída dos estabelecimentos a que se refere o parágrafo único do artigo 51;</li>
                <li><strong>III</strong> - a sua arrematação, quando apreendido ou abandonado e levado a leilão.</li>
              </ul>
              <p className="mt-3"><strong>Parágrafo único.</strong> Para os efeitos deste imposto, considera-se industrializado o produto que tenha sido submetido a qualquer operação que lhe modifique a natureza ou a finalidade, ou o aperfeiçoe para o consumo.</p>
            </LegalText>
            <Comentario>
              <p>
                O inciso II, sobre a saída do estabelecimento industrial, é o fato gerador mais frequente
                do IPI. O parágrafo único define industrialização de forma ampla: qualquer operação que
                modifique natureza, finalidade ou aperfeiçoe para o consumo. Isso inclui transformação
                (criação de produto novo), beneficiamento (modificação de características), montagem,
                acondicionamento e renovação. O RIPI (Decreto 7.212/2010) detalha essas modalidades e
                lista as exclusões, como operações de varejo e reparos simples.
              </p>
              <p className="mt-3">
                O inciso I equipara a importação à industrialização para fins de IPI: o importador de
                produto industrializado paga IPI no desembaraço, o que nivela a carga tributária entre
                o produto nacional (que paga na saída da fábrica) e o importado (que paga no desembaraço).
                Essa equiparação é relevante para o cálculo do crédito de IPI: o importador tem direito
                a creditar o IPI pago no desembaraço quando utiliza o produto como insumo na produção
                de outros produtos tributados.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-47" numero="Art. 47" titulo="IPI: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - no caso do inciso I do artigo anterior, o preço normal do produto importado, acrescido do montante: (a) do imposto sobre a importação; (b) das taxas exigidas para entrada do produto no País; (c) dos encargos cambiais efetivamente pagos;</li>
                <li>
                  <strong>II</strong> - no caso do inciso II:
                  <ul className="mt-1 pl-4 space-y-1">
                    <li><strong>a)</strong> o valor da operação de que decorrer a saída da mercadoria;</li>
                    <li><strong>b)</strong> na falta do valor a que se refere a alínea anterior, o preço corrente da mercadoria, ou sua similar, no mercado atacadista da praça do remetente;</li>
                  </ul>
                </li>
                <li><strong>III</strong> - no caso do inciso III do artigo anterior, o preço da arrematação.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo do IPI na importação (inciso I) é o valor aduaneiro mais II mais taxas
                mais encargos cambiais. Isso significa que o IPI sobre importado é calculado sobre uma
                base já inflada pelo II. É a chamada base "over" ou "por dentro" em cascata: o importador
                paga II sobre o valor aduaneiro e depois paga IPI sobre (valor aduaneiro + II). Nas saídas
                de estabelecimentos industriais nacionais (inciso II), a base é o valor da nota fiscal,
                o que simplifica o cálculo mas exige atenção com operações entre partes relacionadas onde
                o valor pode ser manipulado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-48" numero="Art. 48" titulo="IPI: Seletividade">
            <LegalText>
              <p>O imposto é <strong>seletivo em função da essencialidade dos produtos</strong>.</p>
            </LegalText>
            <Comentario>
              <p>
                A seletividade do IPI é um princípio com força real: produtos essenciais têm alíquota
                baixa ou zero, produtos supérfluos ou nocivos têm alíquota alta. Na Tabela de Incidência
                do IPI (TIPI), a alíquota de medicamentos é zero, alimentos básicos têm alíquotas baixas,
                cigarros chegam a 300%, bebidas alcoólicas podem passar de 30% e automóveis de luxo têm
                alíquotas diferenciadas das populares. A seletividade do IPI também foi usada como
                instrumento de política industrial: reduções temporárias de IPI para automóveis em 2008
                e 2012 buscaram estimular a produção doméstica em momentos de crise. O STF reconhece
                que a seletividade é vinculante para o legislador, mas deixa margem ampla de apreciação
                sobre o que é "essencial".
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-49" numero="Art. 49" titulo="IPI: Não-Cumulatividade">
            <LegalText>
              <p>
                O imposto é <strong>não-cumulativo</strong>, dispondo a lei de forma que o montante
                devido resulte da diferença a maior, em determinado período, entre o imposto referente
                aos produtos saídos do estabelecimento e o pago relativamente aos produtos nele entrados.
              </p>
              <p className="mt-3"><strong>Parágrafo único.</strong> O saldo verificado, em determinado período, em favor do contribuinte transfere-se para o período ou períodos seguintes.</p>
            </LegalText>
            <Comentario>
              <p>
                A não-cumulatividade do IPI é garantia constitucional (art. 153, §3º, II da CF/88) e
                funciona pelo sistema de créditos e débitos. O industrial apura o IPI dos produtos que
                saíram do estabelecimento (débito) e desconta o IPI que pagou nas matérias-primas e
                insumos que entraram (crédito). A diferença é o IPI a recolher. Se os créditos superam
                os débitos, o saldo credor se transfere para o mês seguinte. Diferente do ICMS, onde a
                não-cumulatividade pode ser limitada por lei estadual, a não-cumulatividade do IPI é
                plena: não há vedação de crédito por legislação infraconstitucional.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-50" numero="Art. 50" titulo="IPI: Contribuinte">
            <LegalText>
              <p>Contribuinte do imposto é:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o importador ou quem a lei a ele equiparar;</li>
                <li><strong>II</strong> - o industrial ou quem a lei a ele equiparar;</li>
                <li><strong>III</strong> - o comerciante de produtos sujeitos ao imposto, que os forneça aos contribuintes definidos no inciso anterior;</li>
                <li><strong>IV</strong> - o arrematante de produtos apreendidos ou abandonados, levado a leilão.</li>
              </ul>
              <p className="mt-3"><strong>Parágrafo único.</strong> Para os efeitos deste imposto, considera-se contribuinte autônomo qualquer estabelecimento de importador, industrial, comerciante ou arrematante.</p>
            </LegalText>
            <Comentario>
              <p>
                O parágrafo único traz uma regra peculiar do IPI: cada estabelecimento é contribuinte
                autônomo. Numa grande indústria com matriz em São Paulo e filiais em outros estados, cada
                estabelecimento tem sua própria apuração de IPI. A transferência entre estabelecimentos
                da mesma empresa é fato gerador do IPI, o que significa que há IPI na nota de transferência
                entre a fábrica e o centro de distribuição da mesma companhia. Isso é diferente do ICMS
                em operações de transferência, onde o STF decidiu recentemente que não há fato gerador
                porque não há circulação de mercadoria em sentido jurídico (mudança de titularidade).
                O IPI mantém a autonomia dos estabelecimentos mesmo sem mudança de titularidade.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-51" numero="Art. 51" titulo="IPI: Definições de Comerciante e Industrial">
            <LegalText>
              <p>Para efeito do disposto no artigo anterior, considera-se:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - comerciante, qualquer pessoa que realize, com habitualidade, operações de compra e venda de produto industrializado;</li>
                <li><strong>II</strong> - industrial, qualquer pessoa que realize operações características de industrialização.</li>
              </ul>
              <p className="mt-3"><strong>Parágrafo único.</strong> Para os efeitos deste imposto, considera-se contribuinte autônomo qualquer estabelecimento de importador, industrial, comerciante ou arrematante.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 51 completa a disciplina do contribuinte do IPI, fornecendo as definições operacionais
                de comerciante e industrial. A definição de industrial é especialmente abrangente: não exige
                que a pessoa tenha uma fábrica formal ou alvará de indústria. Qualquer um que realize
                operações de transformação, beneficiamento, montagem, acondicionamento, renovação ou
                restauração de produto é industrial para fins de IPI, ainda que seja uma pessoa física
                ou uma microempresa sem CNPJ industrial.
              </p>
              <p className="mt-3">
                O parágrafo único sobre contribuinte autônomo por estabelecimento é uma regra de grande
                impacto prático para grupos empresariais. Uma holding que controla várias fábricas em
                estados diferentes não apura IPI de forma consolidada: cada planta é um contribuinte
                autônomo, com seu próprio CNPJ, seus próprios créditos e débitos de IPI e sua própria
                escrituração fiscal. Isso significa que os créditos acumulados na fábrica A não compensam
                automaticamente os débitos da fábrica B, mesmo que ambas pertençam ao mesmo grupo.
                É necessária a transferência formal de créditos entre estabelecimentos, com as limitações
                legais aplicáveis.
              </p>
            </Comentario>
          </Artigo>

          {/* ── SEÇÃO II — COMBUSTÍVEIS ── */}
          <Secao id="sec-comb" titulo="Seção II: Imposto sobre Operações relativas a Combustíveis, Lubrificantes, Energia Elétrica e Minerais do País" subtitulo="Arts. 52 ao 56 — Revogados" />

          <Artigo id="art-52" numero="Art. 52" titulo="Combustíveis: Fato Gerador (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado pela Lei Complementar nº 102, de 11 de julho de 2000. O texto original definia
                como fato gerador deste imposto a produção ou a importação de combustíveis, lubrificantes,
                energia elétrica e minerais do País.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Este artigo integrava a Seção II do Capítulo IV do Título III, que criava um imposto federal
                exclusivo da União sobre combustíveis, lubrificantes, energia elétrica e minerais. Com a
                promulgação da CF/88, o sistema tributário sobre energia e combustíveis passou por uma
                reestruturação profunda. A tributação desses produtos migrou progressivamente para o ICMS
                estadual (que passou a incidir sobre operações com energia elétrica e combustíveis) e para
                a CIDE-Combustíveis, criada pela Lei 10.336/2001 com base no art. 177, §4º da CF/88.
              </p>
              <p className="mt-3">
                A revogação pela LC 102/2000 fechou formalmente essa seção do CTN, mas o tema permanece
                economicamente relevante. A tributação de combustíveis é hoje compartilhada entre PIS/Cofins
                monofásico (federal), CIDE (federal) e ICMS (estadual), com alíquotas que variam por
                produto, estado e regime. A LC 192/2022, que criou alíquotas ad rem de PIS/Cofins sobre
                combustíveis, e a discussão sobre o ICMS monofásico de combustíveis pós-reforma tributária
                mostram que este campo continua em permanente disputa entre União e estados.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-53" numero="Art. 53" titulo="Combustíveis: Base de Cálculo (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original previa como base de cálculo o valor da operação de saída do
                estabelecimento produtor (para a produção interna) ou a base de cálculo do imposto de
                importação (para os produtos importados).
              </p>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo ad valorem prevista originalmente neste artigo foi substituída, no
                contexto atual, pela tributação ad rem (por unidade de medida, como litro ou metro cúbico)
                que caracteriza tanto a CIDE quanto o PIS/Cofins monofásico sobre combustíveis. A escolha
                pela base ad rem não é aleatória: em produtos cujo preço oscila muito, como petróleo e
                derivados, a base ad valorem gera volatilidade de arrecadação e pode agravar crises
                inflacionárias. A base ad rem estabiliza a receita tributária independentemente da variação
                de preço, o que facilita o planejamento orçamentário mas reduz a sensibilidade do tributo
                ao valor real do produto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-54" numero="Art. 54" titulo="Combustíveis: Alíquotas (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original atribuía ao Poder Executivo a competência para fixar e alterar
                as alíquotas do imposto, dentro dos limites estabelecidos em lei.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A flexibilidade executiva para alterar alíquotas sobre combustíveis prevista neste artigo
                era consistente com a natureza extrafiscal do tributo: combustíveis são insumo essencial
                da economia e a tributação precisa de agilidade para responder a choques de preços
                internacionais. Esse raciocínio sobreviveu na arquitetura atual: tanto a CIDE quanto o
                PIS/Cofins sobre combustíveis admitem redução e restabelecimento de alíquotas por ato do
                Executivo (Decreto), sem precisar de lei, exatamente porque são tributos com forte caráter
                regulatório. O art. 177, §4º, I, b da CF/88 consagrou essa flexibilidade para a CIDE-Combustíveis.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-55" numero="Art. 55" titulo="Combustíveis: Isenções para Entes Públicos (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original isentava do imposto as operações realizadas por órgão público,
                autarquia ou entidade paraestatal.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A isenção para operações de entes públicos refletia tanto a imunidade recíproca quanto
                a lógica de que tributar o próprio setor público seria um giro de dinheiro sem sentido
                econômico. Hoje, a questão das imunidades e isenções para entes públicos e suas empresas
                na aquisição de combustíveis é tratada de forma mais fragmentada: Petrobras, Transpetro
                e distribuidoras controladas pelo Estado são contribuintes normais do PIS/Cofins e da
                CIDE, mas há regimes diferenciados para operações de defesa nacional, embarcações da
                Marinha e aeronaves militares.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-56" numero="Art. 56" titulo="Combustíveis: Exclusividade Federal (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original declarava o imposto exclusivo da União, vedando qualquer
                adicional ou percentagem estadual ou municipal sobre ele.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O princípio da exclusividade federal sobre a tributação de combustíveis previsto neste
                artigo não sobreviveu à CF/88, que atribuiu ao ICMS a competência sobre operações com
                combustíveis e lubrificantes. Isso criou a tensão que até hoje marca a tributação do setor:
                a União tributa com PIS/Cofins e CIDE, os estados tributam com ICMS, e municípios cobram
                ISS sobre serviços de postos. A guerra fiscal no ICMS de combustíveis, com estados
                concedendo benefícios para atrair distribuidoras, é diretamente consequência do abandono
                da exclusividade federal que este artigo pretendia garantir.
              </p>
            </Comentario>
          </Artigo>

          {/* ── SEÇÃO III — TRANSPORTES E COMUNICAÇÕES ── */}
          <Secao id="sec-transp" titulo="Seção III: Imposto sobre Serviços de Transportes e Comunicações" subtitulo="Arts. 57 ao 60 — Revogados" />

          <Artigo id="art-57" numero="Art. 57" titulo="Transportes: Fato Gerador (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original definia como fato gerador a prestação ou utilização de serviços
                de transporte de natureza comercial (exceto o estritamente municipal) e de comunicações,
                inclusive radiodifusão.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Este artigo pertencia a um imposto federal sobre transportes e comunicações que o CTN de
                1966 estruturou dentro da competência da União. A CF/88 redesenhou completamente esse
                campo: os serviços de transporte interestadual e intermunicipal de passageiros e cargas
                passaram a ser tributados pelo ICMS estadual. Os serviços de comunicação também migraram
                para o ICMS. Já os serviços de transporte estritamente municipal ficaram sob o ISS
                municipal. A União perdeu a competência sobre esses serviços na CF/88 e os arts. 57 a 60
                do CTN foram revogados porque não havia mais fato gerador federal a disciplinar.
              </p>
              <p className="mt-3">
                A exceção relevante é o transporte aéreo internacional: há discussão sobre a incidência
                de ISS, ICMS ou nenhum tributo nessas operações, e o STF já teve de arbitrar conflitos
                entre estados que queriam o ICMS e municípios que queriam o ISS sobre esses serviços.
                A solução veio com a Lei Complementar 157/2016, que incluiu o transporte aéreo na lista
                do ISS, atribuindo a tributação ao município.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-58" numero="Art. 58" titulo="Transportes: Base de Cálculo (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia como base de cálculo o preço do serviço, sem
                qualquer dedução.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo do serviço de transporte pelo preço bruto, sem deduções, antecipa
                o debate que existe até hoje no ISS e no ICMS sobre transporte. No ICMS de transportes,
                a base é o preço do serviço. A discussão recorrente é se pedágios, seguros e outros
                componentes do frete integram ou não a base de cálculo. O STJ já decidiu que pedágios
                não integram a base do ICMS sobre transporte, pois são encargos do tomador do serviço
                pagos diretamente ao concessionário, não parcela da remuneração do transportador.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-59" numero="Art. 59" titulo="Transportes: Alíquotas (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original atribuía ao Poder Executivo a competência para fixar e alterar
                as alíquotas, atendendo às condições do mercado de transportes e comunicações.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A flexibilidade executiva para alíquotas de transportes e comunicações fazia sentido
                quando esses serviços eram monopólio estatal ou fortemente regulados. No contexto de 1966,
                o Ministério dos Transportes e a Anatel (no papel de seus predecessores) detinham controle
                sobre tarifas e alíquotas fazia sentido como instrumento de política setorial. Com a
                privatização e a abertura dos setores de telecomunicações e transportes nos anos 1990
                e 2000, a lógica regulatória mudou completamente, e a competência tributária migrou para
                os estados via ICMS, com alíquotas fixadas pelo processo legislativo estadual e com limites
                do Senado Federal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-60" numero="Art. 60" titulo="Transportes: Contribuinte (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original identificava como contribuinte do imposto o prestador dos
                serviços de transporte e comunicações referidos no Art. 57.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Com a revogação desta seção, o prestador de serviços de transporte interestadual e
                intermunicipal passou a ser contribuinte do ICMS estadual, e o prestador de serviços
                de comunicação também. A transição não foi sem conflito: havia dúvidas sobre qual estado
                era credor do ICMS de transportes, se o estado de origem da carga ou o estado de destino.
                O Convênio ICMS 25/1990 e diversas decisões do STF foram necessários para pacificar a
                questão. Hoje, o ICMS sobre transporte interestadual compete ao estado onde se inicia
                a prestação, e o de transporte interno compete ao estado onde ocorre integralmente o
                serviço.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-61" numero="Art. 61" titulo="Transportes e Comunicações: Isenções (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original previa isenções específicas do imposto sobre transportes e
                comunicações para determinadas operações realizadas por entidades públicas e para serviços
                de radiodifusão de recepção gratuita destinados à educação e à cultura.
              </p>
            </LegalText>
            <Comentario>
              <p>
                As isenções previstas neste artigo refletiam a visão de 1966 de que certos serviços de
                comunicação tinham função pública e não deveriam ser onerados por tributos federais. A
                radiodifusão gratuita era considerada um serviço social relevante, e a isenção buscava
                não encarecer a atividade das emissoras de rádio e televisão abertas. Com a revogação
                desta seção pela CF/88 (que transferiu a competência para os estados via ICMS em comunicações),
                a questão das isenções migrou para o campo estadual. A CF/88 criou imunidade expressa
                para o ICMS sobre radiodifusão sonora e de sons e imagens (art. 155, §2º, X, d), perpetuando
                a tradição de não tributar pesadamente a comunicação de massa de acesso gratuito.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-62" numero="Art. 62" titulo="Transportes e Comunicações: Normas Complementares (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original atribuía ao Poder Executivo a competência para estabelecer
                normas complementares sobre a aplicação do imposto, com possibilidade de distinção entre
                categorias de serviços para fins de alíquota.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A flexibilidade executiva prevista neste artigo era coerente com a natureza fortemente
                estatizada dos transportes e comunicações no Brasil de 1966. O setor de telecomunicações
                era monopólio da Telebrás, as estradas eram operadas pelo DNER e as ferrovias pertenciam
                à RFFSA. Nesse cenário, o Poder Executivo controlava não apenas a tributação, mas também
                a própria prestação dos serviços, o que tornava natural que ele calibrasse as alíquotas
                conforme a política setorial. A privatização dos anos 1990 (Telebrás em 1998, concessões
                rodoviárias, extinção da RFFSA) tornou esse modelo obsoleto. Hoje, ANATEL, ANTT e ANTAQ
                regulam os setores de forma independente, e a tributação é definida por lei, não por
                decreto executivo.
              </p>
            </Comentario>
          </Artigo>

          {/* ── SEÇÃO IV — IOF ── */}
          <Secao id="sec-iof" titulo="Seção IV: Imposto sobre Operações de Crédito, Câmbio e Seguros (IOF)" subtitulo="Arts. 63 ao 67" />

          <Artigo id="art-63" numero="Art. 63" titulo="IOF: Fato Gerador">
            <LegalText>
              <p>
                O imposto, de competência da União, sobre operações de crédito, câmbio e seguro, e sobre
                operações relativas a títulos e valores mobiliários tem como fato gerador:
              </p>
              <ul className="mt-3 space-y-2 pl-4">
                <li><strong>I</strong> - quanto às operações de crédito, a sua efetivação pela entrega total ou parcial do montante ou do valor que constitua o objeto da obrigação, ou sua colocação à disposição do interessado;</li>
                <li><strong>II</strong> - quanto às operações de câmbio, a sua efetivação pela entrega de moeda nacional ou estrangeira, ou de documento que a represente, ou sua colocação à disposição do interessado em montante equivalente à moeda estrangeira ou nacional entregue ou posta à disposição por este;</li>
                <li><strong>III</strong> - quanto às operações de seguro, a sua efetivação pela emissão da apólice ou do documento equivalente, ou recebimento do prêmio, na forma da lei aplicável;</li>
                <li><strong>IV</strong> - quanto às operações relativas a títulos e valores mobiliários, a emissão, transmissão, pagamento ou resgate destes, na forma da lei aplicável.</li>
              </ul>
              <p className="mt-3">
                <strong>Parágrafo único.</strong> A incidência definida no inciso I exclui a definida no
                inciso IV, e reciprocamente, quanto à emissão, ao pagamento ou resgate do título
                representativo de uma mesma operação de crédito.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O IOF é o imposto federal com maior flexibilidade regulatória do sistema tributário
                brasileiro. Seus quatro fatos geradores cobrem operações financeiras completamente
                distintas: empréstimos e financiamentos (crédito), conversão de moedas (câmbio),
                contratos de seguro e negociação de títulos (TVM). O parágrafo único evita dupla
                incidência: se um empréstimo é representado por uma nota promissória, o IOF incide
                uma vez, sobre a operação de crédito ou sobre a emissão do título, não sobre ambos.
              </p>
              <p className="mt-3">
                Na prática atual, o IOF-crédito é o mais relevante em volume de arrecadação e litígios.
                Incide sobre empréstimos pessoais, cheque especial, cartão de crédito (no saque e na
                parcela), financiamentos em geral e operações compromissadas entre instituições financeiras.
                O IOF-câmbio teve papel central nos debates sobre desindustrialização: em 2010 o governo
                Lula elevou o IOF sobre entrada de capital estrangeiro para 6% tentando conter a valorização
                do real. Essa experiência mostrou os limites do IOF como instrumento de política cambial
                num mercado global de capitais altamente integrado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-64" numero="Art. 64" titulo="IOF: Base de Cálculo">
            <LegalText>
              <p>A base de cálculo do imposto é:</p>
              <ul className="mt-3 space-y-2 pl-4">
                <li><strong>I</strong> - quanto às operações de crédito, o montante da obrigação, compreendendo o principal e os juros;</li>
                <li>
                  <strong>II</strong> - quanto às operações de câmbio, o respectivo montante em moeda nacional, determinado à taxa de câmbio vigente na data da operação;
                </li>
                <li><strong>III</strong> - quanto às operações de seguro, o montante do prêmio;</li>
                <li>
                  <strong>IV</strong> - quanto às operações relativas a títulos e valores mobiliários:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li><strong>a)</strong> na emissão, o valor nominal mais o ágio, se houver;</li>
                    <li><strong>b)</strong> na transmissão, o preço ou o valor nominal, ou o valor da cotação em Bolsa, como determinar a lei;</li>
                    <li><strong>c)</strong> no pagamento ou resgate, o preço.</li>
                  </ul>
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo do IOF-crédito incluir principal e juros é um ponto que já gerou
                questionamentos sobre bitributação: o Imposto de Renda também incide sobre os juros
                recebidos pelo credor. O STF e o STJ pacificaram que não há bis in idem porque os
                fatos geradores são distintos: o IOF incide sobre a operação de crédito em si (ato
                de emprestar/tomar emprestado), enquanto o IR incide sobre o rendimento dos juros
                (acréscimo patrimonial). São tributos sobre eventos econômicos diferentes.
              </p>
              <p className="mt-3">
                Para o IOF-câmbio, a base é o montante em reais na data da operação. Isso significa
                que a taxa de câmbio aplicada para calcular o IOF é a mesma usada na operação de
                conversão, e não uma taxa de referência do Banco Central. Em operações de câmbio de
                viagens internacionais, por exemplo, a base do IOF é o valor em reais efetivamente
                cobrado pelo banco, que inclui o spread cambial, e não o valor do câmbio comercial PTAX.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-65" numero="Art. 65" titulo="IOF: Poder do Executivo e Política Monetária">
            <LegalText>
              <p>
                O Poder Executivo pode, nas condições e nos limites estabelecidos em lei, <strong>alterar
                as alíquotas ou as bases de cálculo</strong> do imposto, a fim de ajustá-los aos objetivos
                da <strong>política monetária</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O IOF é, junto com o II e o IE, um dos raros tributos em que a CF/88 autoriza o Executivo
                a alterar alíquotas por ato infralegal (art. 153, §1º da CF/88). A justificativa é a
                natureza instrumental do IOF: ele não é primariamente um tributo arrecadatório, mas um
                instrumento de política monetária e financeira. O Banco Central e o Ministério da Fazenda
                usam o IOF para influenciar o custo do crédito, o fluxo de capitais e o comportamento
                do mercado de câmbio sem depender do processo legislativo, que é inevitavelmente lento.
              </p>
              <p className="mt-3">
                Na prática, o Decreto 6.306/2007 (RIOF) é a norma que operacionaliza a flexibilidade
                do Executivo, consolidando alíquotas e regras do IOF. Alterações de alíquota são feitas
                por decreto presidencial e produzem efeito imediato, o que distingue o IOF da quase
                totalidade dos outros tributos federais, sujeitos à anterioridade de exercício e à
                anterioridade nonagesimal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-66" numero="Art. 66" titulo="IOF: Contribuinte">
            <LegalText>
              <p>
                Contribuinte do imposto é <strong>qualquer das partes na operação tributada</strong>,
                como dispuser a lei.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A abertura do Art. 66 é semelhante à do Art. 42 (transmissão imobiliária): a lei pode
                escolher quem é o contribuinte dentro das partes da operação. Na prática, o Decreto
                6.306/2007 distribuiu a sujeição passiva assim: nas operações de crédito, o tomador
                do empréstimo é o contribuinte; nas de câmbio, o comprador de moeda estrangeira (ou
                o vendedor, conforme o caso); nas de seguro, o segurado. As instituições financeiras
                e seguradoras atuam como responsáveis pela retenção e recolhimento do IOF, de forma
                análoga à retenção na fonte do IR. Se a instituição não reter, o débito é dela.
              </p>
              <p className="mt-3">
                Há uma situação de destaque: o IOF cobrado nas operações de crédito entre pessoas jurídicas
                coligadas ou entre holding e subsidiária. O Fisco tem questionado se essas operações
                de "mútuo entre partes relacionadas" configuram operação de crédito para fins de IOF.
                O STJ tem entendido que sim: qualquer entrega de recursos com obrigação de devolução,
                mesmo entre empresas do mesmo grupo, é operação de crédito e sujeita ao IOF, salvo
                hipótese expressa de isenção.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-67" numero="Art. 67" titulo="IOF: Destino da Receita">
            <LegalText>
              <p>
                A receita líquida do imposto destina-se à formação de <strong>reservas monetárias</strong>,
                na forma da lei.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 67 repete a lógica do Art. 28 (IE) ao vincular a receita à formação de reservas
                monetárias. Em 1966 isso fazia sentido num sistema de câmbio administrado pelo Banco
                Central com reservas mantidas pelo Estado. Com o regime de câmbio flutuante adotado
                em 1999 e a autonomia do Banco Central para gerir as reservas internacionais, essa
                destinação específica tornou-se letra morta na prática. O IOF hoje integra as receitas
                administradas pela Receita Federal, é partilhado com estados e municípios dentro dos
                critérios do fundo de participação e não tem destino constitucionalmente vinculado,
                uma vez que o art. 167, IV da CF/88 veda genericamente a vinculação de receitas de
                impostos (com exceções para saúde, educação e garantia de operações de crédito).
              </p>
            </Comentario>
          </Artigo>

          {/* ── SEÇÃO V — ICM ── */}
          <Secao id="sec-icm" titulo="Seção V: Imposto sobre a Circulação de Mercadorias (ICM) — predecessor do ICMS" subtitulo="Arts. 68 ao 73 — Revogados" />

          <Artigo id="art-68" numero="Art. 68" titulo="ICM: Fato Gerador (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original definia como fato gerador do ICM (Imposto sobre Circulação de
                Mercadorias), de competência dos Estados e do Distrito Federal, a saída de mercadorias de
                estabelecimento comercial, industrial ou produtor.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O ICM do CTN de 1966 era o predecessor direto do atual ICMS. Em 1966, o imposto incidia
                apenas sobre a circulação de mercadorias em sentido estrito: saída de produtos de
                estabelecimentos comerciais e industriais. A CF/88 ampliou radicalmente o escopo ao criar
                o ICMS, que passou a incidir também sobre serviços de transporte interestadual e
                intermunicipal, serviços de comunicação e operações com energia elétrica, petróleo e
                minerais. Essa ampliação transformou o ICM, um imposto relativamente simples sobre
                mercadorias, no ICMS, o tributo mais complexo do sistema tributário brasileiro.
              </p>
              <p className="mt-3">
                A seção do CTN sobre ICM foi revogada e substituída inicialmente pelo Decreto-Lei 406/1968
                e depois pela Lei Complementar 87/1996 (Lei Kandir), que é a norma geral do ICMS vigente.
                O CTN ainda fornece as bases gerais de direito tributário aplicáveis ao ICMS (obrigação,
                crédito, lançamento), mas as regras específicas do imposto estão na Lei Kandir e nos
                regulamentos estaduais (RICMSs).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-69" numero="Art. 69" titulo="ICM: Não-Cumulatividade (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original consagrava a não-cumulatividade do ICM, determinando que o
                montante devido em cada operação resultasse da diferença entre o imposto cobrado nas
                saídas e o pago nas entradas de mercadorias.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A não-cumulatividade do ICM/ICMS é uma garantia constitucional desde 1965 (EC 18/1965)
                e foi mantida pela CF/88 no art. 155, §2º, I. Diferente da não-cumulatividade do IPI,
                que é plena, a não-cumulatividade do ICMS pode ser limitada por lei complementar, que
                pode vedá-la "quando houver isenção ou não-incidência, salvo determinação em contrário
                da legislação". Essa assimetria é a raiz da chamada "guerra fiscal" do ICMS: quando um
                estado concede isenção a uma empresa, o crédito gerado por essa isenção pode ser estornado
                pelo estado de destino, gerando dupla penalização econômica (perda do benefício e estorno
                do crédito).
              </p>
              <p className="mt-3">
                O STF tem limitado progressivamente a possibilidade dos estados estornarem créditos de
                ICMS gerados em operações beneficiadas por incentivos de outros estados (RE 628.075 e
                ADPF 198). Essa jurisprudência vai na direção do que o CTN original previa: uma
                não-cumulatividade mais robusta, sem as manipulações que a guerra fiscal introduziu
                ao longo das décadas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-70" numero="Art. 70" titulo="ICM: Base de Cálculo (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original fixava como base de cálculo do ICM o valor da operação de
                que decorresse a saída da mercadoria; na falta desse valor, o preço corrente da mercadoria
                no mercado atacadista da praça do remetente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A base de cálculo do ICM original era relativamente simples: o valor da nota fiscal.
                O ICMS atual mantém esse núcleo, mas a Lei Kandir e a CF/88 adicionaram complexidade
                significativa. O ponto mais polêmico é o cálculo "por dentro" do ICMS: a alíquota é
                aplicada sobre uma base que já inclui o próprio ICMS. Se uma mercadoria vale R$ 100
                e a alíquota de ICMS é 17%, o ICMS não é R$ 17 (17% de R$ 100). A base de cálculo
                é R$ 120,48 (R$ 100 dividido por 0,83), e o ICMS é R$ 20,48. Isso resulta em uma
                carga efetiva maior do que a alíquota nominal sugere, e foi objeto de diversas contestações
                judiciais. O STF validou o cálculo "por dentro" como constitucional (RE 582.461, Tema 214),
                reconhecendo que é a forma de cálculo consagrada pelo sistema tributário brasileiro.
              </p>
            </Comentario>
          </Artigo>

          {/* ── Arts. 71-75 — ICM: artigos finais (revogados) ── */}

          <Artigo id="art-71" numero="Art. 71" titulo="ICM: Alíquotas (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia que as alíquotas do ICM seriam fixadas em
                resolução do Senado Federal, sendo uniformes em todo o território nacional para as
                operações interestaduais, com liberdade dos estados para as operações internas dentro
                dos limites fixados.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A competência do Senado para fixar alíquotas do ICM sobreviveu na CF/88, mas com
                alcance mais restrito. O art. 155, §2º, IV e V da CF/88 atribui ao Senado Federal
                a competência para fixar as alíquotas do ICMS aplicáveis às operações interestaduais
                e de exportação. O Senado fixou as alíquotas interestaduais em 7% para saídas
                destinadas a estados do Norte, Nordeste, Centro-Oeste e Espírito Santo, e 12% para
                saídas destinadas aos estados do Sul e Sudeste. Esse diferencial é a base estrutural
                do debate sobre a partilha do ICMS no comércio eletrônico, tema que levou à EC 87/2015
                e ao DIFAL, obrigando que a diferença entre a alíquota interestadual e a interna do
                estado destinatário seja recolhida ao estado do consumidor final.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-72" numero="Art. 72" titulo="ICM: Convênios de Isenção (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original exigia que as isenções do ICM fossem concedidas mediante
                convênios entre os estados, vedando benefícios fiscais unilaterais que comprometessem
                a uniformidade do imposto no mercado nacional.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 72 é o ancestral direto do CONFAZ e da exigência de deliberação unânime para
                concessão de benefícios de ICMS. A LC 24/1975 regulamentou os convênios interestaduais
                e exige unanimidade de todos os estados para conceder benefícios e maioria qualificada
                de quatro quintos para revogá-los. A CF/88 constitucionalizou o sistema no art. 155,
                §2º, XII, g, determinando que lei complementar regulará como isenções e incentivos
                serão concedidos mediante deliberação dos estados. Estados que concedem benefícios sem
                convênio cometem o que o STF denomina "guerra fiscal inconstitucional", sujeita a ação
                declaratória. A LC 160/2017 permitiu a convalidação de incentivos concedidos sem convênio
                antes de 2017, mas o regime prospectivo mantém a exigência da unanimidade no CONFAZ para
                novos benefícios.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-73" numero="Art. 73" titulo="ICM: Contribuinte (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original definia como contribuinte do ICM o comerciante, o industrial
                e o produtor que realizasse operações com mercadorias tributadas, com habitualidade
                e intuito comercial.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A definição do contribuinte foi progressivamente ampliada pelo legislador complementar.
                A Lei Kandir (LC 87/1996) define contribuinte como qualquer pessoa, física ou jurídica,
                que realize operações de circulação de mercadoria ou prestações de serviço de transporte
                interestadual e intermunicipal e de comunicação com habitualidade ou em volume que
                caracterize intuito comercial. Mas a própria Lei Kandir admite que os estados definam
                como contribuinte, mesmo sem habitualidade, quem importe mercadorias do exterior para
                uso próprio. O STF validou essa extensão (RE 439.796), reconhecendo que a importação
                para uso próprio pode ser tributada pelo ICMS independentemente do caráter eventual
                da operação, o que é uma das maiores fontes de autuações contra pessoas físicas
                que importam bens de maior valor.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-74" numero="Art. 74" titulo="ICM: Solidariedade (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia que eram solidariamente responsáveis pelo
                pagamento do ICM os comerciantes, industriais e produtores que participassem de
                operações irregulares ou inidôneas com mercadorias, independentemente de terem
                participado diretamente da irregularidade.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A responsabilidade solidária no ICMS ainda existe e é frequentemente invocada em casos
                de notas fiscais frias, operações simuladas e compras de mercadorias de empresas em
                situação irregular perante o fisco estadual. A jurisprudência do STJ distingue dois
                cenários. Se o adquirente agiu de boa-fé e tomou as cautelas razoáveis para verificar
                a regularidade do fornecedor, não pode ser responsabilizado solidariamente pelo ICMS
                que o vendedor fraudulento deixou de recolher. Se agiu com culpa ou dolo, a
                solidariedade é aplicável. Essa distinção impulsionou as empresas a desenvolverem
                programas de compliance fiscal para verificar a regularidade cadastral de fornecedores
                antes de aceitar créditos de ICMS nas entradas, prática que o fisco estadual tem
                exigido progressivamente como requisito para manutenção dos créditos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-75" numero="Art. 75" titulo="ICM: Disposições Finais da Seção (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original encerrava o capítulo do ICM com disposições sobre o
                cumprimento de obrigações acessórias, emissão de documentos fiscais e poderes dos
                estados para regulamentação complementar do imposto dentro dos limites fixados em
                lei complementar federal.
              </p>
            </LegalText>
            <Comentario>
              <p>
                As obrigações acessórias do ICMS hoje formam um dos maiores complexos burocráticos
                do sistema tributário brasileiro. Cada estado tem seu próprio Regulamento do ICMS
                (RICMS), gerando 27 conjuntos distintos de regras sobre emissão de NF-e, SPED Fiscal,
                EFD ICMS/IPI, regime de substituição tributária, DIFAL e centenas de outras obrigações
                específicas. Uma empresa que opera em múltiplos estados precisa manter estruturas de
                compliance tributário separadas para cada RICMS. A Reforma Tributária de 2025 (EC
                132/2023 e LC 214/2025) unificará o ICMS no IBS a partir de 2033, substituindo os 27
                regulamentos estaduais por norma complementar federal uniforme. A complexidade acumulada
                desde 1966 é precisamente o que a reforma busca eliminar.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP V — IMPOSTOS EXTRAORDINÁRIOS ── */}
          <Secao id="sec-extr" titulo="Capítulo V: Impostos Extraordinários" subtitulo="Art. 76" />

          <Artigo id="art-76" numero="Art. 76" titulo="Imposto Extraordinário de Guerra">
            <LegalText>
              <p>
                Na iminência ou no caso de guerra externa, a União pode instituir, temporariamente,
                impostos extraordinários compreendidos ou não na sua competência tributária normal,
                suprimidos, gradativamente, no prazo máximo de <strong>cinco anos</strong>, contados
                da celebração da paz.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O imposto extraordinário de guerra do Art. 76 é uma das hipóteses de flexibilização
                das competências tributárias no CTN, mantido quase integralmente pela CF/88 no
                art. 154, II. A CF/88 acrescentou apenas a exigência de "iminência ou caso" de
                guerra externa, o que requer ameaça concreta, não meramente hipotética. A expressão
                "compreendidos ou não na sua competência tributária normal" é tecnicamente relevante:
                em caso de guerra a União pode criar impostos sobre fatos geradores que normalmente
                são de competência estadual ou municipal. Isso representa uma suspensão temporária
                do pacto federativo de distribuição de competências em favor da centralização
                fiscal necessária ao esforço de guerra.
              </p>
              <p className="mt-3">
                O Brasil nunca usou o Art. 76 desde a vigência do CTN em 1966, o que reflete a
                ausência de conflitos armados externos no período. O dispositivo existe como
                salvaguarda constitucional para situações extremas. O prazo de cinco anos para
                supressão gradual após a celebração da paz deixa claro que o legislador não pretendia
                permitir tributação extraordinária indefinida mesmo sob conflito prolongado. O imposto
                extraordinário não se sujeita ao princípio da anterioridade de exercício nem à
                anterioridade nonagesimal, podendo entrar em vigor imediatamente ante a urgência
                da situação que o justifica.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO IV — TAXAS ── */}
          <Secao id="titulo-4" titulo="Título IV: Taxas" subtitulo="Arts. 77 ao 80" />

          <Artigo id="art-77" numero="Art. 77" titulo="Taxa: Definição e Fato Gerador">
            <LegalText>
              <p>
                As taxas cobradas pela União, pelos Estados, pelo Distrito Federal ou pelos Municípios,
                no âmbito de suas respectivas atribuições, têm como fato gerador o{" "}
                <strong>exercício regular do poder de polícia</strong>, ou a{" "}
                <strong>utilização, efetiva ou potencial, de serviço público específico e divisível</strong>,
                prestado ao contribuinte ou posto à sua disposição.
              </p>
              <p className="mt-3">
                Parágrafo único. A taxa não pode ter base de cálculo ou fato gerador idênticos aos
                que correspondam a imposto, nem ser calculada em função do capital das empresas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 77 define taxa por seus dois fatos geradores alternativos: poder de polícia
                ou serviço público específico e divisível. A escolha do adjetivo "regular" para
                qualificar o poder de polícia não é casual. Taxa cobrada por poder de polícia
                irregular, exercido em excesso ou fora das atribuições do ente, é inconstitucional.
                A atividade estatal que justifica a taxa precisa ter base legal e ser exercida
                dentro dos limites da competência do ente tributante.
              </p>
              <p className="mt-3">
                O parágrafo único traz a restrição mais litigada das taxas: a vedação de base de
                cálculo idêntica à de imposto. O STF editou a Súmula Vinculante 29, permitindo que
                a taxa utilize um ou alguns dos elementos que compõem a base do imposto, desde que
                não haja identidade integral entre as duas bases. A taxa de coleta de lixo calculada
                com base na área do imóvel usa o mesmo elemento do IPTU, mas não é idêntica ao valor
                venal que compõe a base de cálculo do imposto predial. Por isso o STF a considerou
                válida. A segunda vedação, proibição de calcular a taxa em função do capital das
                empresas, impede que o poder público use a taxa como substituto do imposto sobre
                o patrimônio empresarial.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-78" numero="Art. 78" titulo="Poder de Polícia: Definição">
            <LegalText>
              <p>
                Considera-se poder de polícia a atividade da administração pública que, limitando ou
                disciplinando direito, interesse ou liberdade, <strong>regula a prática de ato ou
                abstenção de fato</strong>, em razão de interesse público concernente à segurança,
                à higiene, à ordem, aos costumes, à disciplina da produção e do mercado, ao exercício
                de atividades econômicas dependentes de concessão ou autorização do Poder Público,
                à tranquilidade pública ou ao respeito à propriedade e aos direitos individuais
                ou coletivos.
              </p>
              <p className="mt-3">
                Parágrafo único. Considera-se regular o exercício do poder de polícia quando
                desempenhado pelo órgão competente nos limites da lei aplicável, com observância
                do processo legal e, tratando-se de atividade que a lei tenha como discricionária,
                sem abuso ou desvio de poder.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A definição de poder de polícia do Art. 78 é a mais abrangente do direito
                administrativo tributário brasileiro. Ela alcança virtualmente qualquer atividade
                regulatória do Estado: fiscalização sanitária (Anvisa), controle ambiental (Ibama),
                licenciamento de construção (prefeituras), vigilância de telecomunicações (Anatel),
                inspeção de alimentos, vigilância epidemiológica. Toda essa atividade, quando
                exercida regularmente conforme o parágrafo único, pode fundamentar a cobrança de taxa.
              </p>
              <p className="mt-3">
                O ponto mais controverso na jurisprudência foi a exigência de efetivo exercício
                do poder de polícia ou mera disponibilidade do aparelho fiscalizatório. O STF
                pacificou no RE 588.322 (Tema 16) que é constitucional a cobrança de taxa de
                fiscalização e vigilância sanitária mesmo sem comprovação de visita fiscal ao
                estabelecimento, desde que exista órgão de fiscalização estruturado e em
                funcionamento. A taxa remunera a disponibilidade do aparato de controle, não
                necessariamente a fiscalização individualizada de cada contribuinte.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-79" numero="Art. 79" titulo="Serviços Específicos e Divisíveis">
            <LegalText>
              <p>Os serviços públicos a que se refere o artigo 77 consideram-se:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - utilizados pelo contribuinte:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>a) efetivamente, quando por ele usufruídos a qualquer título;</li>
                    <li>b) potencialmente, quando, sendo de utilização compulsória, sejam postos à sua disposição mediante atividade administrativa em efetivo funcionamento;</li>
                  </ul>
                </li>
                <li className="mt-1">
                  <strong>II</strong> - específicos, quando possam ser destacados em unidades autônomas de intervenção, de utilidade, ou de necessidades públicas;
                </li>
                <li className="mt-1">
                  <strong>III</strong> - divisíveis, quando suscetíveis de utilização, separadamente, por parte de cada um dos seus usuários.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                Os conceitos de especificidade e divisibilidade do Art. 79 são os critérios que
                distinguem serviços públicos remuneráveis por taxa daqueles financiados exclusivamente
                por impostos. Segurança pública e iluminação de logradouros são serviços gerais
                (uti universi): não podem ser identificados individualmente por usuário nem atribuídos
                a um contribuinte específico. Por isso o STF vedou pela Súmula Vinculante 41 a cobrança
                de taxa de iluminação pública de logradouros. Hoje os municípios cobram a COSIP
                (Contribuição para o Custeio da Iluminação Pública), que é contribuição, não taxa,
                exatamente para contornar essa limitação constitucional.
              </p>
              <p className="mt-3">
                O inciso I, alínea b, é o dispositivo que permite cobrar taxa de serviço mesmo sem
                uso efetivo pelo contribuinte: basta que o serviço esteja disponível e seja de uso
                compulsório por norma legal. A taxa de esgoto é o exemplo clássico: o proprietário
                que não conecta seu imóvel à rede de esgoto ainda paga a taxa se a rede passa na
                testada do imóvel e o uso é obrigatório por lei municipal. O STF validou esse modelo
                no RE 576.321 (Tema 339), reconhecendo a constitucionalidade da cobrança pela mera
                disponibilidade do serviço de coleta de esgoto com utilização potencial.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-80" numero="Art. 80" titulo="Competência para Cobrar Taxas">
            <LegalText>
              <p>
                Para efeito de instituição e cobrança de taxas, consideram-se compreendidas no âmbito
                das atribuições da União, dos Estados, do Distrito Federal ou dos Municípios, aquelas
                que, segundo a Constituição Federal, as Constituições dos Estados, as Leis Orgânicas
                do Distrito Federal e dos Municípios e a legislação com elas compatível,{" "}
                <strong>competem a cada uma dessas pessoas de direito público</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 80 resolve a questão de competência para taxas com uma regra elegante e
                correta: a competência tributária para cobrar a taxa segue a competência administrativa
                para prestar o serviço ou exercer o poder de polícia. Se a Anvisa fiscaliza
                medicamentos, a taxa de vigilância sanitária é federal. Se é a Vigilância Sanitária
                Municipal que licencia restaurantes locais, a taxa é municipal. Esse paralelismo
                entre competência administrativa e competência tributária é a regra geral e resolve
                a maioria dos conflitos de competência em matéria de taxas.
              </p>
              <p className="mt-3">
                O ponto de maior litigiosidade está nos serviços concorrentes, onde mais de um ente
                tem atribuições regulatórias. Nesses casos pode haver sobreposição de taxas, que o
                STF disciplina caso a caso verificando se há bis in idem (dois entes cobrando pelo
                mesmo fato gerador e pela mesma atividade estatal) ou se as taxas remuneram atividades
                de fiscalização genuinamente distintas. A taxa de fiscalização de estabelecimentos
                de saúde cobrada tanto pelo estado quanto pelo município gerou vasta jurisprudência
                sobre a identificação do fato gerador de cada cobrança.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO V — CONTRIBUIÇÕES DE MELHORIA ── */}
          <Secao id="titulo-5" titulo="Título V: Contribuições de Melhoria" subtitulo="Arts. 81 ao 82" />

          <Artigo id="art-81" numero="Art. 81" titulo="Contribuição de Melhoria: Definição e Limites">
            <LegalText>
              <p>
                A contribuição de melhoria cobrada pela União, pelos Estados, pelo Distrito Federal
                ou pelos Municípios, no âmbito das respectivas atribuições, é instituída para fazer
                face ao <strong>custo de obras públicas</strong> de que decorra{" "}
                <strong>valorização imobiliária</strong>, tendo como limite total a despesa realizada
                e como limite individual o acréscimo de valor que da obra resultar para cada imóvel
                beneficiado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A contribuição de melhoria é o tributo de maior racionalidade econômica do sistema
                tributário brasileiro: quem se beneficia financeiramente de uma obra pública contribui
                para custeá-la proporcionalmente ao ganho obtido. O proprietário do imóvel que se
                valoriza com a construção de uma linha de metrô ou a pavimentação de uma avenida
                recebe um benefício patrimonial concreto sem contrapartida direta, e a contribuição
                de melhoria captura parte desse ganho para financiar a obra que o gerou.
              </p>
              <p className="mt-3">
                Os dois limites do Art. 81 são garantias fundamentais do contribuinte. O limite total,
                equivalente ao custo da obra, impede que o poder público lucre com a contribuição:
                a arrecadação total não pode superar o gasto total da obra. O limite individual,
                equivalente ao acréscimo de valor de cada imóvel, impede que um proprietário pague
                mais do que efetivamente ganhou em valorização. Na prática, a contribuição de melhoria
                é raramente utilizada no Brasil apesar de sua coerência teórica, porque exige apuração
                prévia da valorização individual de cada imóvel beneficiado, processo tecnicamente
                complexo e politicamente custoso para o gestor público.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-82" numero="Art. 82" titulo="Contribuição de Melhoria: Requisitos para Instituição">
            <LegalText>
              <p>A lei relativa à contribuição de melhoria observará os seguintes requisitos mínimos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - publicação prévia dos seguintes elementos:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>a) memorial descritivo do projeto;</li>
                    <li>b) orçamento do custo da obra;</li>
                    <li>c) determinação da parcela do custo da obra a ser financiada pela contribuição;</li>
                    <li>d) delimitação da zona beneficiada;</li>
                    <li>e) determinação do fator de absorção do benefício da valorização para toda a zona ou para cada uma das áreas diferenciadas nela contidas.</li>
                  </ul>
                </li>
                <li className="mt-1"><strong>II</strong> - fixação de prazo não inferior a 30 dias, para impugnação pelos interessados, de qualquer dos elementos referidos no inciso anterior;</li>
                <li className="mt-1"><strong>III</strong> - regulamentação do processo administrativo de instrução e julgamento da impugnação a que se refere o inciso anterior, sem prejuízo da sua apreciação judicial.</li>
              </ul>
              <p className="mt-3">
                §1º A contribuição relativa a cada imóvel será determinada pelo rateio da parcela
                do custo da obra a que se refere a alínea c do inciso I pelos imóveis situados na
                zona beneficiada em função dos respectivos fatores individuais de valorização.
              </p>
              <p className="mt-1">
                §2º Por ocasião do respectivo lançamento, cada contribuinte deverá ser notificado do
                montante da contribuição, da forma e dos prazos de seu pagamento e dos elementos que
                integram o respectivo cálculo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 82 é um dos artigos mais ricos em garantias procedimentais do CTN. Antes de
                cobrar a contribuição de melhoria, o ente público precisa publicar o projeto, o
                orçamento, a zona beneficiada e o critério de rateio, e ainda abrir prazo de 30 dias
                para os proprietários impugnarem esses elementos. Isso transforma a contribuição de
                melhoria em um tributo com contraditório prévio ao lançamento: o contribuinte pode
                questionar o custo da obra, a delimitação da zona beneficiada ou o fator de valorização
                atribuído ao seu imóvel antes de ser cobrado.
              </p>
              <p className="mt-3">
                A exigência da alínea e, fator de absorção do benefício, é tecnicamente a mais
                complexa. Ela determina que o poder público calcule quanto da valorização imobiliária
                é atribuível à obra e não a outros fatores de mercado. Se um bairro se valoriza 20%
                após uma obra de saneamento, mas 10% desse percentual se deve a uma retomada geral do
                mercado imobiliário, apenas os 10% restantes seriam o benefício da obra para fins de
                cálculo da contribuição. Essa apuração requer avaliação pericial e é um dos motivos
                pelos quais o tributo é raramente utilizado, mesmo sendo teoricamente o mais justo
                do sistema tributário brasileiro.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO VI — DISTRIBUIÇÃO DAS RENDAS TRIBUTÁRIAS ── */}
          <Secao id="titulo-6" titulo="Título VI: Distribuição das Rendas Tributárias" subtitulo="Arts. 83 ao 95 — todos revogados pela Constituição Federal de 1988" />

          <Artigo id="art-83" numero="Art. 83" titulo="Discriminação das Rendas Tributárias (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original fixava os critérios gerais para discriminação das rendas
                tributárias entre a União, os Estados e os Municípios, estabelecendo a separação
                exclusiva de fontes como método principal de partilha fiscal e vedando a tributação
                do mesmo fato gerador por mais de um ente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Título VI do CTN de 1966 refletia o modelo de federalismo fiscal da época:
                discriminação de rendas por fonte, onde cada ente tributava exclusivamente o que
                lhe era designado. A CF/88 substituiu esse modelo por um sistema misto que combina
                separação de fontes com partilha obrigatória de arrecadação. Os arts. 157 a 162 da
                CF/88 criaram os Fundos de Participação dos Estados (FPE) e Municípios (FPM), as
                cotas do ICMS e os demais repasses constitucionais. O Título VI inteiro foi superado
                por esse novo sistema e todos os seus artigos foram revogados, restando como referência
                histórica do modelo pré-CF/88.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-84" numero="Art. 84" titulo="Rendas Tributárias da União (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original relacionava as rendas tributárias da União, incluindo os
                impostos e taxas de sua competência, e as transferências resultantes de fundos de
                participação previstos na legislação então vigente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O sistema de distribuição de rendas de 1966 foi desenhado num contexto de baixa
                autonomia dos entes subnacionais. A União concentrava a maior parte das receitas e
                redistribuía por meio de transferências frequentemente condicionadas a contrapartidas
                políticas e sujeitas a negociações discricionárias. A CF/88 constitucionalizou os
                repasses e os tornou automáticos, periódicos e independentes de aprovação federal caso
                a caso, o que reforçou a autonomia fiscal de estados e municípios ao reduzir sua
                dependência das transferências voluntárias controladas pelo governo federal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-85" numero="Art. 85" titulo="Rendas Tributárias dos Estados (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original relacionava as rendas tributárias estaduais e suas
                participações nas receitas federais, fixando regras de repasse de cotas dos
                impostos federais arrecadados em cada estado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O modelo pré-CF/88 de participação estadual era baseado em cotas proporcionais à
                arrecadação federal em cada território estadual, o que favorecia automaticamente os
                estados mais ricos com maior atividade econômica. A CF/88 inverteu parcialmente essa
                lógica ao criar o FPE com critérios redistributivos: 21,5% do IR e IPI são repartidos
                com base em fatores que privilegiam estados menos desenvolvidos. O FPE é hoje a
                principal fonte de receita de vários estados do Norte e Nordeste, sendo decisivo para
                a equidade fiscal do federalismo brasileiro.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-86" numero="Art. 86" titulo="Rendas Tributárias dos Municípios (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia as rendas tributárias dos municípios,
                incluindo os impostos de competência municipal e as cotas-parte de impostos
                federais e estaduais a que os municípios faziam jus.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Os municípios são os maiores dependentes de transferências intergovernamentais no
                sistema tributário brasileiro. Municípios pequenos, com baixa base econômica para
                gerar IPTU, ISS e ITBI, dependem essencialmente do FPM (22,5% do IR e IPI federais)
                e da cota do ICMS (25% da arrecadação estadual do imposto) para custear seus serviços
                públicos essenciais. A LC 214/2025 criará o Fundo de Desenvolvimento Municipal para
                compensar municípios que percam receita de ISS na transição para o IBS, reconhecendo
                que a Reforma Tributária afeta estruturalmente a base fiscal municipal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-87" numero="Art. 87" titulo="Adicional Estadual do IR (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original permitia aos estados instituir adicional do Imposto de
                Renda sobre rendimentos de contribuintes domiciliados em seus territórios, como
                mecanismo de ampliação da capacidade fiscal estadual dentro do modelo de
                discriminação de rendas da época.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O adicional estadual do IR existiu no direito pré-CF/88 como instrumento de
                flexibilidade fiscal subnacional. A CF/88 aboliu esse instrumento ao tornar o IR
                tributo exclusivo da União (art. 153, III), com partilha automática de receita por
                meio do FPE e FPM. A vedação de que estados instituam adicionais ao IR federal faz
                parte da separação rígida de competências tributárias da CF/88. O debate sobre
                federalismo fiscal volta periodicamente: países como os EUA e o Canadá permitem que
                estados e províncias cobrem seus próprios impostos de renda sobre os mesmos rendimentos,
                modelo que tem defensores no debate tributário brasileiro como alternativa à guerra fiscal
                via ICMS.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-88" numero="Art. 88" titulo="Partilha do ITBI entre Estados e Municípios (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original regulamentava a distribuição das receitas do imposto sobre
                transmissão de bens imóveis entre estados e municípios, fixando critérios de
                partilha com base na localização do bem transmitido.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A CF/88 resolveu a questão da transmissão imobiliária com uma divisão clara: o ITCMD
                (transmissões causa mortis e doações) pertence ao estado; o ITBI (transmissões
                onerosas inter vivos de imóveis) pertence ao município onde está localizado o bem
                (art. 156, II da CF/88). Essa separação eliminou a partilha prevista no sistema do
                CTN e tornou os dois impostos completamente distintos quanto ao ente credor. A
                simplificação foi bem-vinda, mas o ITCMD ainda gera conflitos de competência
                nos casos de transmissão de bens móveis (quotas societárias, ações) onde a
                localização do bem é juridicamente incerta.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-89" numero="Art. 89" titulo="Cota-Parte Municipal do ICM (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia a participação dos municípios na arrecadação
                do ICM pelos estados, fixando percentual mínimo de cota-parte distribuível com
                base no valor adicionado fiscal gerado em cada município.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A cota-parte do ICMS, herdeira direta da cota-parte do ICM prevista nesse artigo,
                é hoje regulada pelo art. 158, IV da CF/88: 25% da arrecadação estadual do ICMS
                pertence aos municípios, sendo no mínimo três quartos desse percentual distribuídos
                com base no valor adicionado fiscal de cada município. O critério do valor adicionado
                cria incentivos para que municípios atraiam atividade econômica geradora de ICMS, o
                que alimenta a guerra fiscal municipal por indústrias, distribuidoras e centros de
                distribuição. Com a Reforma Tributária de 2025 substituindo o ICMS pelo IBS, esse
                critério de distribuição será profundamente alterado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-90" numero="Art. 90" titulo="Repasse da Cota Municipal do ICM (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original fixava os prazos e formas de repasse pelos estados aos
                municípios da respectiva cota-parte do ICM, incluindo penalidades aplicáveis ao
                estado em caso de inadimplência no repasse.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O repasse da cota do ICMS é uma das transferências constitucionais mais relevantes do
                federalismo fiscal. Atrasos ou desvios nesse repasse são vedados e sujeitam o estado
                a sanções. O STF e o STJ reconhecem que os municípios têm direito subjetivo ao repasse,
                podendo ajuizar ações para compeli-los. A CF/88, no art. 160, proíbe expressamente
                que a União e os estados condicionem a entrega de transferências constitucionais a
                municípios ao pagamento de dívidas ou ao cumprimento de qualquer requisito além das
                exceções previstas expressamente, como a aplicação mínima em saúde. Essa proteção
                reflete a lição histórica de que transferências condicionadas politicamente distorcem
                o federalismo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-91" numero="Art. 91" titulo="Receitas de Combustíveis (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original regulamentava as transferências intergovernamentais
                relacionadas aos impostos sobre combustíveis e lubrificantes, então de competência
                estadual, fixando obrigatoriedade de aplicação das receitas em obras rodoviárias.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A vinculação de receitas sobre combustíveis a despesas com rodovias foi característica
                marcante do sistema tributário de 1966, compatível com o modelo desenvolvimentista
                da época que priorizava a expansão da malha rodoviária. A CF/88 aboliu a maior parte
                dessas vinculações ao centralizar os tributos sobre combustíveis na competência federal.
                O modelo atual da CIDE-Combustíveis (contribuição federal criada pela Lei 10.336/2001)
                tem parte da receita vinculada a financiamento de infraestrutura de transporte, num eco
                atenuado do sistema pré-CF/88. Mas a CIDE-Combustíveis tem alíquotas zeradas desde 2012,
                tornando a vinculação irrelevante na prática atual.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-92" numero="Art. 92" titulo="Receitas do IPI para os Estados (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original dispunha sobre as participações dos estados nas receitas
                do imposto federal sobre a produção industrial, incluindo percentuais de repasse
                proporcionais à exportação de produtos industrializados de cada estado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O repasse do IPI-Exportação sobreviveu ao CTN e está hoje no art. 159, II da CF/88:
                10% do IPI é repassado aos estados em proporção às respectivas exportações de produtos
                industrializados. Esse repasse compensa os estados exportadores pela desoneração do IPI
                nas exportações, que é imunidade constitucional (art. 153, §3º, III da CF/88). Sem essa
                compensação, estados com grande atividade exportadora de industrializados perderiam receita
                tributária sem contrapartida. O repasse é calculado e distribuído mensalmente pela Receita
                Federal com base nos dados de exportação de cada estado, sendo relevante para estados do
                Sul e Sudeste com parques industriais exportadores.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-93" numero="Art. 93" titulo="ISS — Titularidade Municipal (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original estabelecia que o imposto sobre serviços de qualquer
                natureza pertencia integralmente ao município, definindo como critério de competência
                ativa o local onde o serviço fosse efetivamente prestado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O ISS é hoje inteiramente municipal, regulado pela LC 116/2003. A questão da competência
                ativa do ISS (qual município cobra: o do estabelecimento prestador ou o do local da
                prestação?) é uma das mais litigadas do direito tributário municipal. A LC 116/2003 lista
                hipóteses em que prevalece o local da prestação, criando uma regra geral de competência
                do estabelecimento prestador com exceções específicas. A LC 175/2020 avançou na
                uniformização para serviços de streaming, plataformas digitais e planos de saúde,
                exigindo recolhimento no domicílio do tomador para evitar a concentração de receita em
                municípios com alíquotas reduzidas, prática conhecida como "guerra fiscal municipal
                do ISS".
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-94" numero="Art. 94" titulo="Fundos de Participação (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original dispunha sobre a constituição e o funcionamento dos fundos
                de participação de estados e municípios, fixando os percentuais dos impostos federais
                sobre a renda e sobre produtos industrializados destinados a esses fundos e os critérios
                de distribuição entre os beneficiários.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Os Fundos de Participação (FPE e FPM) mencionados neste artigo são hoje pilares
                constitucionais do federalismo fiscal brasileiro. O FPE absorve 21,5% do IR e do IPI
                arrecadados pela União, e o FPM absorve 22,5%, com percentuais adicionais introduzidos
                por emendas constitucionais posteriores. A distribuição entre beneficiários obedece a
                critérios de população, renda per capita e área territorial, favorecendo os entes menores
                e menos desenvolvidos. O sistema é crucial para o equilíbrio federativo, mas também é
                criticado por criar incentivos perversos à multiplicação de municípios economicamente
                inviáveis que sobrevivem quase inteiramente de transferências obrigatórias.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-95" numero="Art. 95" titulo="Fiscalização das Transferências (Revogado)">
            <LegalText>
              <p className="italic text-muted-foreground">
                Revogado. O texto original encerrava o Livro Primeiro do CTN com disposições sobre
                a fiscalização do cumprimento das normas de discriminação e distribuição de rendas
                tributárias, atribuindo ao Tribunal de Contas da União competência para examinar
                os repasses e transferências intergovernamentais.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O controle das transferências intergovernamentais pelo TCU permanece atual e é exercido
                com base na CF/88 e na Lei Orgânica do TCU (Lei 8.443/1992). O TCU examina a
                regularidade dos repasses constitucionais, a correta aplicação dos critérios de
                distribuição do FPE, FPM e das demais transferências, e pode recomendar ou determinar
                correções quando identifica irregularidades. Com o encerramento do Livro Primeiro no
                Art. 95, o CTN passa a tratar, a partir do Art. 96, das Normas Gerais de Direito
                Tributário, matéria que é o coração do código e que tem aplicação cotidiana em todos
                os níveis da administração tributária brasileira.
              </p>
            </Comentario>
          </Artigo>

          {/* ── LIVRO SEGUNDO — NORMAS GERAIS DE DIREITO TRIBUTÁRIO ── */}
          <Secao id="livro-2" titulo="Livro Segundo: Normas Gerais de Direito Tributário" subtitulo="Arts. 96 ao 218" />
          <Secao id="tit-leg" titulo="Título I: Legislação Tributária" subtitulo="Arts. 96 ao 112" />

          <Artigo id="art-96" numero="Art. 96" titulo="Legislação Tributária: Conceito">
            <LegalText>
              <p>
                A expressão "legislação tributária" compreende as <strong>leis, os tratados e as
                convenções internacionais, os decretos e as normas complementares</strong> que versem,
                no todo ou em parte, sobre tributos e relações jurídicas a eles pertinentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 96 define "legislação tributária" em sentido amplo, abrangendo um espectro
                normativo muito mais largo do que apenas as leis em sentido formal. Isso tem implicações
                diretas para o intérprete: quando o CTN usa "legislação tributária" nos artigos seguintes,
                refere-se a toda essa cadeia normativa. Quando usa "lei", refere-se especificamente à lei
                formal. A distinção é determinante nos artigos sobre o princípio da legalidade (Art. 97),
                que lista o que somente lei pode estabelecer, deixando as demais matérias tributárias para
                o domínio mais amplo da legislação tributária.
              </p>
              <p className="mt-3">
                Na hierarquia das normas tributárias, a ordem é: Constituição Federal, leis complementares
                (como o próprio CTN), leis ordinárias e medidas provisórias, tratados internacionais
                (que se equiparam a lei ordinária, com a ressalva do Art. 98), decretos do Executivo,
                e finalmente as normas complementares do Art. 100. Cada nível tem limites claros sobre
                o que pode regular, e a violação desses limites é causa de ilegalidade ou
                inconstitucionalidade do ato normativo questionado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-97" numero="Art. 97" titulo="Princípio da Legalidade: Matéria Reservada à Lei">
            <LegalText>
              <p>Somente a lei pode estabelecer:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - a instituição de tributos, ou a sua extinção;</li>
                <li><strong>II</strong> - a majoração de tributos, ou sua redução, ressalvado o disposto nos artigos 21, 26, 39, 57 e 65;</li>
                <li><strong>III</strong> - a definição do fato gerador da obrigação tributária principal, ressalvado o disposto no inciso I do §3º do artigo 52, e do seu sujeito passivo;</li>
                <li><strong>IV</strong> - a fixação de alíquota do tributo e da sua base de cálculo, ressalvado o disposto nos artigos 21, 26, 39, 57 e 65;</li>
                <li><strong>V</strong> - a cominação de penalidades para as ações ou omissões contrárias a seus dispositivos, ou para outras infrações nela definidas;</li>
                <li><strong>VI</strong> - as hipóteses de exclusão, suspensão e extinção de créditos tributários, ou de dispensa ou redução de penalidades.</li>
              </ul>
              <p className="mt-3">
                §1º Equipara-se à majoração do tributo a modificação de sua base de cálculo, que
                importe em torná-lo mais oneroso.
              </p>
              <p className="mt-1">
                §2º Não constitui majoração de tributo, para os fins do disposto no inciso II deste
                artigo, a atualização do valor monetário da respectiva base de cálculo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 97 é a positivação infraconstitucional do princípio da legalidade tributária
                (art. 150, I da CF/88) em suas consequências práticas. A lista de incisos representa
                o núcleo intocável pelo Executivo: nenhum decreto, portaria ou instrução normativa pode
                criar tributo, extingui-lo, definir o fato gerador, fixar alíquotas ou base de cálculo
                além do que a lei autoriza, criar penalidades ou conceder isenções. As ressalvas aos
                incisos II e IV referem-se às exceções constitucionais para II, IE, IPI e IOF, onde o
                Executivo pode alterar alíquotas por decreto dentro dos limites legais.
              </p>
              <p className="mt-3">
                O §1º tem aplicação prática frequente nas disputas sobre reajuste de base de cálculo
                por ato infralegal. Se uma portaria atualiza a pauta fiscal de cigarros acima da inflação,
                isso equivale a majorar o IPI sem lei, violando o Art. 97 e o art. 150, I da CF/88. O STF
                aplica esse raciocínio em casos envolvendo pautas fiscais de bebidas, cosméticos e outros
                produtos tributados por valor de referência. O §2º é a exceção que salva as atualizações
                monetárias: atualizar a base pelo IPCA por decreto não é majoração. Mas se a atualização
                exceder o índice oficial de inflação, a diferença representa majoração sem lei, como
                decidido no RE 648.245 (Tema 296) sobre o IPTU.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-98" numero="Art. 98" titulo="Tratados e Convenções Internacionais">
            <LegalText>
              <p>
                Os tratados e as convenções internacionais <strong>revogam ou modificam a legislação
                tributária interna</strong>, e serão observados pela que lhes sobrevenha.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 98 é um dos mais debatidos e consequentes do CTN. Ele não afirma que tratados
                têm hierarquia constitucional ou de lei complementar: afirma que revogam ou modificam
                a legislação tributária interna e que a legislação posterior deve observá-los. O STJ
                consolidou que os tratados de direito tributário prevalecem sobre a lei interna posterior
                conflitante, não por hierarquia formal, mas por força do princípio de direito
                internacional pacta sunt servanda combinado com a regra do Art. 98.
              </p>
              <p className="mt-3">
                Na prática, isso significa que um tratado para evitar dupla tributação celebrado pelo
                Brasil não pode ser revogado tacitamente por uma lei ordinária posterior que tribute os
                mesmos rendimentos. O Brasil tem acordos para evitar dupla tributação com mais de 30
                países, e a interpretação do Art. 98 define se a legislação interna de retenção na fonte
                do IR prevalece sobre as alíquotas negociadas nos tratados. O STJ tem entendido
                predominantemente que os tratados prevalecem sobre a lei interna conflitante, postura
                relevante para o planejamento tributário de empresas multinacionais que estruturam
                fluxos de royalties, juros e dividendos entre Brasil e países com tratado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-99" numero="Art. 99" titulo="Decretos">
            <LegalText>
              <p>
                O conteúdo e o alcance dos decretos restringem-se aos das leis em função das quais
                sejam expedidos, determinados com observância das regras de interpretação
                estabelecidas nesta Lei.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 99 é a regra geral de subordinação do decreto à lei em matéria tributária.
                Decretos regulamentares apenas complementam e explicitam o que a lei diz; não criam,
                modificam ou extinguem obrigações tributárias além do que a lei autoriza. Se o
                Regulamento do IPI criar uma hipótese de incidência não prevista na Lei do IPI, o
                dispositivo regulamentar é ilegal e não pode ser aplicado pelo Fisco nem pelo Judiciário.
              </p>
              <p className="mt-3">
                As exceções constitucionais ao Art. 99 são expressas e taxativas: o II, IE, IPI e IOF
                admitem alteração de alíquotas por decreto do Executivo dentro dos limites estabelecidos
                em lei (art. 153, §1º da CF/88). Fora dessas hipóteses, qualquer decreto que onere o
                contribuinte além do que a lei permite é passível de anulação judicial. O STJ e o STF
                aplicam o Art. 99 como fundamento para declarar ilegais portarias que restringem créditos
                tributários, decretos que ampliam bases de cálculo e atos ministeriais que criam
                obrigações acessórias sem previsão legal adequada.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-100" numero="Art. 100" titulo="Normas Complementares da Legislação Tributária">
            <LegalText>
              <p>São normas complementares das leis, dos tratados e dos decretos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - os atos normativos expedidos pelas autoridades administrativas;</li>
                <li><strong>II</strong> - as decisões dos órgãos singulares ou coletivos de jurisdição administrativa, a que a lei atribua eficácia normativa;</li>
                <li><strong>III</strong> - as práticas reiteradamente observadas pelas autoridades administrativas;</li>
                <li><strong>IV</strong> - os convênios que entre si celebrem a União, os Estados, o Distrito Federal e os Municípios.</li>
              </ul>
              <p className="mt-3">
                Parágrafo único. A observância das normas referidas neste artigo <strong>exclui a
                imposição de penalidades, a cobrança de juros de mora e a atualização do valor
                monetário da base de cálculo do tributo</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 100 é um dos dispositivos mais protetivos do contribuinte em todo o CTN. O
                parágrafo único consagra a proteção da confiança legítima tributária: o contribuinte
                que age conforme instruções normativas, soluções de consulta, práticas administrativas
                reiteradas ou decisões administrativas com eficácia normativa não pode ser penalizado
                nem cobrado com juros de mora se o Fisco posteriormente mudar de orientação. A mudança
                de entendimento vale para o futuro, mas não pode retroagir contra quem agiu de boa-fé
                conforme a orientação anterior.
              </p>
              <p className="mt-3">
                O inciso III merece destaque especial. Práticas reiteradamente observadas pelas
                autoridades equivalem a uma espécie de costume administrativo tributário vinculante
                para o Fisco. Se a Receita Federal aceitava por anos determinada metodologia de
                reconhecimento de créditos de PIS/Cofins sem autuação, e repentinamente muda de
                posição, o contribuinte que seguia a prática aceita tem proteção pelo parágrafo
                único: poderá ser cobrado do tributo principal, mas não das multas e juros pelo
                período em que agia conforme o entendimento que o próprio Fisco praticava.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-101" numero="Art. 101" titulo="Vigência da Legislação Tributária no Espaço e no Tempo">
            <LegalText>
              <p>
                A vigência, no espaço e no tempo, da legislação tributária rege-se pelas disposições
                legais aplicáveis às normas jurídicas em geral, ressalvado o previsto neste Capítulo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 101 é uma norma de remissão: para tudo que o CTN não tratar especificamente
                sobre vigência, aplica-se a regra geral da LINDB (Lei de Introdução às Normas do
                Direito Brasileiro, Decreto-Lei 4.657/1942). A LINDB estabelece que a lei entra em
                vigor 45 dias após a publicação no Brasil, salvo disposição em contrário, e tem
                vigência até ser revogada por outra lei. Para a legislação tributária, a ressalva
                final do Art. 101 é fundamental: os Arts. 103 e 104 do CTN trazem regras especiais
                de vigência que se sobrepõem à regra geral da LINDB. Se o Art. 104, por exemplo,
                exige que normas sobre impostos sobre patrimônio e renda entrem em vigor no primeiro
                dia do exercício seguinte, essa regra especial do CTN prevalece sobre o prazo de 45
                dias da LINDB.
              </p>
              <p className="mt-3">
                No plano espacial, a regra geral é a territorialidade: a legislação tributária de um
                ente vigora no seu território. As exceções, tratadas no Art. 102, exigem convênios
                ou autorização legal expressa. O Art. 101 funciona como porta de entrada para os
                demais artigos do capítulo de vigência, e entendê-lo bem evita o erro comum de
                aplicar as regras gerais da LINDB onde o CTN tem disposição específica.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-102" numero="Art. 102" titulo="Vigência Extraterritorial da Legislação Estadual e Municipal">
            <LegalText>
              <p>
                A legislação tributária dos Estados, do Distrito Federal e dos Municípios vigora,
                no País, fora dos respectivos territórios, nos limites em que lhe reconheçam{" "}
                <strong>extraterritorialidade</strong> os convênios de que participem, ou do que
                disponham esta ou outras leis de normas gerais expedidas pela União.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 102 consagra a territorialidade como regra e a extraterritorialidade como
                exceção condicionada. A legislação do Estado de São Paulo, em princípio, vigora
                apenas no território paulista. Para que produza efeitos fora desse território, é
                preciso convênio com outros estados ou previsão em lei complementar federal. Isso
                tem impacto direto no ICMS: quando uma mercadoria sai de São Paulo para o Paraná,
                a lei paulista do ICMS determina o que ocorre na saída (fato gerador no estabelecimento
                remetente), enquanto a lei paranaense regula a entrada no destino. Sem essa delimitação
                territorial clara, haveria sobreposição de competências e dupla tributação interna.
              </p>
              <p className="mt-3">
                Os convênios do CONFAZ, previstos na LC 24/1975 e no art. 155, §2º, XII, g da CF/88,
                são o principal instrumento de reconhecimento mútuo de extraterritorialidade em matéria
                de ICMS. Eles permitem que estados negociem, por exemplo, o reconhecimento de isenções
                concedidas por outro estado, sem que isso represente invasão territorial ilegítima.
                Para o ISS municipal, a LC 116/2003 é a lei de normas gerais que define a competência
                territorial de cada município, resolvendo os conflitos de ISS entre municípios sem
                exigir convênio bilateral para cada situação.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-103" numero="Art. 103" titulo="Vigência das Normas Complementares">
            <LegalText>
              <p>Salvo disposição em contrário, entram em vigor:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - os atos normativos a que se refere o inciso I do artigo 100,
                  na data da sua publicação;
                </li>
                <li>
                  <strong>II</strong> - as decisões a que se refere o inciso II do artigo 100, quanto
                  a seus efeitos normativos, 30 (trinta) dias após a data da sua publicação;
                </li>
                <li>
                  <strong>III</strong> - os convênios a que se refere o inciso IV do artigo 100, na
                  data neles prevista.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 103 regula quando as normas complementares do Art. 100 entram em vigor. Os
                atos normativos das autoridades administrativas (portarias, instruções normativas,
                circulares) entram em vigor na data da publicação, sem carência. Isso é coerente
                com a posição subordinada dessas normas: elas apenas explicitam o que a lei já
                determina, não criando obrigações novas. A portaria que regulamenta o prazo de
                entrega da DCTF não cria imposto novo; apenas organiza o cumprimento de uma
                obrigação acessória já prevista em lei.
              </p>
              <p className="mt-3">
                O prazo de 30 dias para decisões administrativas com eficácia normativa (inciso II)
                protege o contribuinte: uma decisão do CARF que muda a interpretação de uma norma
                com efeito normativo geral não pode pegá-lo de surpresa no dia seguinte à publicação.
                O mês de carência permite que o contribuinte ajuste suas práticas. Os convênios
                (inciso III) seguem a data que eles próprios fixam, geralmente alinhada com o início
                de um período fiscal relevante, como o primeiro dia de um mês ou de um exercício.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-104" numero="Art. 104" titulo="Anterioridade de Exercício para Impostos sobre Patrimônio e Renda">
            <LegalText>
              <p>
                Entram em vigor no <strong>primeiro dia do exercício seguinte</strong> àquele em que
                ocorra a sua publicação os dispositivos de lei, referentes a impostos sobre o
                patrimônio ou a renda:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - que instituem ou majoram tais impostos;</li>
                <li><strong>II</strong> - que definem novas hipóteses de incidência;</li>
                <li>
                  <strong>III</strong> - que extinguem ou reduzem isenções, salvo se a lei dispuser
                  de maneira mais favorável ao contribuinte, e observado o disposto no artigo 178.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 104 positivava no CTN o princípio da anterioridade de exercício especificamente
                para impostos sobre patrimônio e renda, antes de a CF/88 generalizá-lo para todos os
                tributos no art. 150, III, b. Com a CF/88, a anterioridade de exercício tornou-se
                uma garantia constitucional ampla, e o Art. 104 foi parcialmente superado pela
                Constituição. Mas o inciso III tem relevância interpretativa própria: a extinção ou
                redução de isenção equipara-se a majoração do tributo para fins de anterioridade,
                o que o STF confirmou no RE 204.062 e outros precedentes.
              </p>
              <p className="mt-3">
                Isso significa que uma lei que revoga uma isenção do IPTU vigente para determinadas
                categorias de imóveis não pode produzir efeitos imediatos: os contribuintes que
                perderam a isenção só serão atingidos no exercício seguinte ao da publicação da lei.
                O mesmo raciocínio se aplica à redução parcial de uma isenção do IR. A proteção não
                é absoluta: o Art. 178 do CTN, referenciado no inciso III, permite que isenções
                concedidas por prazo certo e sob condição onerosa não sejam revogadas durante o prazo,
                independentemente de anterioridade.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-105" numero="Art. 105" titulo="Aplicação Imediata da Legislação Tributária">
            <LegalText>
              <p>
                A legislação tributária aplica-se <strong>imediatamente</strong> aos fatos geradores
                futuros e aos pendentes, assim entendidos aqueles cuja ocorrência tenha tido início
                mas não esteja completa nos termos do artigo 116.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 105 estabelece a aplicação imediata da lei tributária como regra: ela alcança
                fatos geradores futuros e os pendentes (aqueles iniciados mas não consumados). Isso
                contrasta com a retroatividade, que o Art. 106 limita severamente. A distinção entre
                fato gerador pendente e fato gerador passado é tecnicamente relevante no IR: se uma
                lei que majora o IR é publicada em outubro, ela alcança os rendimentos auferidos de
                outubro a dezembro (fato gerador pendente do período-base anual), não apenas os
                rendimentos de novembro em diante? Esse debate levou à Súmula 584 do STF, que durante
                décadas permitiu a aplicação da lei de IR publicada até 31 de dezembro ao ano-base
                inteiro. O STF acabou superando essa súmula no RE 183.130, reconhecendo que a lei
                não pode alcançar fatos ocorridos antes da sua vigência.
              </p>
              <p className="mt-3">
                O conceito de fato gerador pendente é especialmente relevante para tributos com
                período-base longo, como o IR e a CSLL. A doutrina majoritária entende que o fato
                gerador do IR anual é complexivo: se consuma ao final do exercício. Assim, a lei
                publicada durante o ano-base, para incidir naquele ano, precisaria retroagir, o
                que o Art. 106 veda. A interpretação correta do Art. 105 é que a nova lei incide
                nos fatos geradores inteiramente futuros à sua vigência, não nos iniciados antes dela.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-106" numero="Art. 106" titulo="Retroatividade da Lei Tributária">
            <LegalText>
              <p>A lei aplica-se a ato ou fato pretérito:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - em qualquer caso, quando seja expressamente interpretativa,
                  excluída a aplicação de penalidade à infração dos dispositivos interpretados;
                </li>
                <li>
                  <strong>II</strong> - tratando-se de ato não definitivamente julgado:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>
                      a) quando deixe de defini-lo como infração;
                    </li>
                    <li>
                      b) quando deixe de tratá-lo como contrário a qualquer exigência de ação ou
                      omissão, desde que não tenha sido fraudulento e não tenha implicado em falta de
                      pagamento de tributo;
                    </li>
                    <li>
                      c) quando lhe comine penalidade menos severa que a prevista na lei vigente ao
                      tempo da sua prática.
                    </li>
                  </ul>
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 106 é a aplicação tributária do princípio penal da retroatividade da lei mais
                benigna (art. 5º, XL da CF/88). No inciso I, a lei interpretativa retroage mas sem
                penalidade: se o Congresso edita lei que esclarece o sentido de norma anterior cuja
                obscuridade gerou autuações, o esclarecimento retroage, mas as multas aplicadas no
                período de incerteza não podem ser confirmadas. O inciso II, alínea c, é o coração
                do artigo: se uma lei posterior reduz a multa aplicável a determinada infração, o
                contribuinte autuado pela lei anterior tem direito à penalidade menor da lei nova,
                desde que o processo não esteja definitivamente julgado.
              </p>
              <p className="mt-3">
                "Definitivamente julgado" significa coisa julgada administrativa (decisão irrecorrível
                no âmbito administrativo) ou judicial (trânsito em julgado da ação judicial). Enquanto
                houver recurso pendente, a retroatividade benigna do Art. 106, II, c é plenamente
                aplicável. Isso tem impacto relevante em processos administrativos fiscais no CARF:
                se uma lei reduz uma multa de 75% para 50% após a lavratura do auto de infração mas
                antes da decisão final do colegiado, o CARF deve aplicar a penalidade menor. O STJ
                confirmou essa interpretação em vários precedentes, alinhando-a ao princípio penal
                da retroatividade benigna que o direito tributário sancionador adota por força
                do Art. 106.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-107" numero="Art. 107" titulo="Interpretação da Legislação Tributária">
            <LegalText>
              <p>
                A legislação tributária será interpretada conforme o disposto neste Capítulo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 107 é o artigo-cabeça do subcapítulo de interpretação do CTN, funcionando como
                porta de entrada para os Arts. 108 a 112. Embora curto, ele tem um papel relevante:
                afasta a pretensão de que o direito tributário tenha métodos de interpretação
                completamente próprios e desconexos dos demais ramos do direito. A interpretação
                tributária segue métodos jurídicos reconhecidos, disciplinados pelos artigos seguintes
                do CTN, não uma lógica de fiscalidade autônoma que pudesse justificar interpretações
                exclusivamente favoráveis ao Fisco ou exclusivamente ao contribuinte.
              </p>
              <p className="mt-3">
                O capítulo de interpretação do CTN (Arts. 107 a 112) é uma das partes mais importantes
                e menos estudadas do código. Ele estabelece a hierarquia dos métodos de integração
                (Art. 108), os limites do uso de conceitos de direito privado (Arts. 109 e 110), a
                exigência de literalidade em matéria de benefícios e isenções (Art. 111) e a
                interpretação benigna em matéria de penalidades (Art. 112). Cada um desses artigos
                tem consequências concretas em litígios tributários cotidianos e representa uma
                escolha legislativa sobre como o Estado e o contribuinte devem ler as normas que
                definem os deveres fiscais.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-108" numero="Art. 108" titulo="Métodos de Interpretação e Integração da Legislação Tributária">
            <LegalText>
              <p>
                Na ausência de disposição expressa, a autoridade competente para aplicar a legislação
                tributária utilizará sucessivamente, na ordem indicada:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - a analogia;</li>
                <li><strong>II</strong> - os princípios gerais de direito tributário;</li>
                <li><strong>III</strong> - os princípios gerais de direito público;</li>
                <li><strong>IV</strong> - a equidade.</li>
              </ul>
              <p className="mt-3">
                §1º O emprego da analogia não poderá resultar na exigência de tributo não previsto em lei.
              </p>
              <p className="mt-1">
                §2º O emprego da equidade não poderá resultar na dispensa do pagamento de tributo devido.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 108 estabelece uma hierarquia de métodos de integração para lacunas da legislação
                tributária. A palavra-chave é "lacuna": quando há disposição expressa, não há necessidade
                de integração. O Art. 108 só entra em jogo na ausência de norma específica aplicável.
                A ordem é relevante e cogente: antes de recorrer a princípios gerais, tenta-se a
                analogia; antes de recorrer à equidade, esgotam-se os princípios gerais. Essa hierarquia
                impede que o intérprete salte direto para a equidade quando a analogia seria o método
                adequado.
              </p>
              <p className="mt-3">
                Os parágrafos trazem as duas vedações mais importantes. O §1º proíbe que a analogia
                resulte em tributo não previsto em lei, o que é a aplicação do princípio da legalidade
                ao método de integração: mesmo que a situação A seja análoga à situação B tributada em
                lei, não é possível tributar A por analogia se A não está prevista em lei como fato
                gerador. O §2º proíbe que a equidade dispense tributo legalmente devido: o juiz ou
                auditor fiscal não pode, por razões de justiça individual, deixar de cobrar tributo que
                a lei impõe. Equidade pode influenciar a interpretação de normas ambíguas, mas não
                pode criar isenções não previstas em lei.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-109" numero="Art. 109" titulo="Princípios Gerais de Direito Privado">
            <LegalText>
              <p>
                Os princípios gerais de direito privado utilizam-se para pesquisa da{" "}
                <strong>definição, do conteúdo e do alcance</strong> de seus institutos, conceitos e
                formas, mas <strong>não para definição dos respectivos efeitos tributários</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 109 traça uma linha divisória fundamental: o direito privado define o que é
                uma compra e venda, uma locação, uma sociedade, um contrato de prestação de serviços.
                O direito tributário pega esses institutos já definidos e decide quais consequências
                fiscais deles decorrem. Essas são duas operações distintas. Para saber o que é uma
                "saída de mercadoria" para fins de ICMS, o intérprete vai ao direito privado (Código
                Civil, Código Comercial) para entender o conceito de circulação de mercadoria. Mas
                para decidir se essa saída gera ICMS, a que alíquota e com qual base de cálculo, o
                intérprete vai exclusivamente ao direito tributário.
              </p>
              <p className="mt-3">
                A distinção parece simples mas gera litígios sofisticados. Quando o Fisco quer tributar
                pelo ISS uma atividade que o contribuinte classifica como locação de bens (que não é
                serviço), o debate começa no Art. 109: a definição de locação vem do Código Civil
                (direito privado), mas o efeito tributário de não incidência de ISS sobre locação
                pura foi confirmado pelo STF na Súmula Vinculante 31. O Fisco não pode usar o direito
                privado para "redefinir" locação como serviço, nem o direito tributário pode criar um
                conceito autônomo de locação diferente do civil.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-110" numero="Art. 110" titulo="Vedação de Alteração de Conceitos Constitucionais por Lei Tributária">
            <LegalText>
              <p>
                A lei tributária não pode alterar a definição, o conteúdo e o alcance de institutos,
                conceitos e formas de direito privado, utilizados, expressa ou implicitamente, pela
                Constituição Federal, pelas Constituições dos Estados, ou pelas Leis Orgânicas do
                Distrito Federal ou dos Municípios, para{" "}
                <strong>definir ou limitar competências tributárias</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 110 é complemento do Art. 109 e trata de situação mais grave: quando a
                Constituição usa um conceito de direito privado para delimitar a competência tributária
                de um ente, a lei tributária não pode redefini-lo para ampliar ou restringir essa
                competência. A CF/88 atribui ao município competência para tributar "serviços de
                qualquer natureza" (art. 156, III). O conceito de "serviço" é um conceito de direito
                privado. O Congresso, ao legislar sobre o ISS, não pode redefinir "serviço" para incluir
                atividades que o direito privado classifica como locação ou venda de mercadoria, porque
                isso ampliaria a competência municipal além do que a Constituição autoriza.
              </p>
              <p className="mt-3">
                Esse artigo foi o centro de um dos julgamentos mais importantes do STF em matéria
                tributária: o RE 116.121, que discutiu se a locação de bens móveis poderia ser
                tributada pelo ISS. O STF concluiu que não, precisamente porque "serviço" no art. 156,
                III da CF/88 é um conceito do direito privado que não inclui locação, e a lei do ISS
                não pode redefinir o termo para incluí-la. O Art. 110 do CTN foi o fundamento central
                do voto condutor, demonstrando que essa norma de 1966 continua sendo a espinha dorsal
                do controle de constitucionalidade das leis tributárias que tentam ampliar competências
                por via de redefinição conceitual.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-111" numero="Art. 111" titulo="Interpretação Literal: Isenções e Benefícios">
            <LegalText>
              <p>Interpreta-se literalmente a legislação tributária que disponha sobre:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - suspensão ou exclusão do crédito tributário;</li>
                <li><strong>II</strong> - outorga de isenção;</li>
                <li><strong>III</strong> - dispensa do cumprimento de obrigações tributárias acessórias.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 111 é frequentemente mal compreendido. "Interpretação literal" não significa
                interpretação cega que ignora o contexto e a finalidade da norma. Significa que o
                intérprete não pode ampliar o alcance de uma isenção por analogia ou por interpretação
                extensiva, concedendo o benefício a situações que a lei não previu expressamente. A
                isenção é exceção à regra de incidência, e o ônus de demonstrar que se enquadra na
                exceção é do contribuinte que a invoca.
              </p>
              <p className="mt-3">
                Na prática, o Art. 111 impede que uma isenção de ICMS concedida a "produtos alimentícios"
                seja estendida por analogia a bebidas alcoólicas, mesmo que se argumente que bebidas
                também são "produtos alimentícios" em sentido amplo. A lista da lei é a lista do
                benefício; o que não está na lista não está isento. O STJ aplica esse princípio
                sistematicamente em casos envolvendo isenções de PIS/Cofins, IRPJ, CSLL e ISS. Ao
                mesmo tempo, a interpretação literal não impede que se use os demais métodos
                interpretativos para esclarecer o sentido dos termos usados na lei de isenção: ela
                apenas veda a extensão do alcance do benefício para além do que o texto comporta.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-112" numero="Art. 112" titulo="Interpretação Benigna em Matéria de Infrações e Penalidades">
            <LegalText>
              <p>
                A lei tributária que define infrações, ou lhe comina penalidades, interpreta-se da
                maneira <strong>mais favorável ao acusado</strong>, em caso de dúvida quanto:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - à capitulação legal do fato;</li>
                <li><strong>II</strong> - à natureza ou às circunstâncias materiais do fato, ou à natureza ou extensão dos seus efeitos;</li>
                <li><strong>III</strong> - à autoria, imputabilidade, ou punibilidade;</li>
                <li><strong>IV</strong> - à natureza da penalidade aplicável, ou à sua graduação.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 112 aplica ao direito tributário sancionador o princípio penal do in dubio pro reo.
                Em matéria de infrações e penalidades tributárias, a dúvida favorece o contribuinte.
                Isso vale para a qualificação da infração (inciso I), para os fatos que a caracterizam
                (inciso II), para a identificação do infrator (inciso III) e para a graduação da
                penalidade (inciso IV). Se há dúvida razoável sobre se a conduta do contribuinte é
                sonegação dolosa (multa de 150%) ou mero erro (multa de 75%), o benefício da dúvida
                leva à aplicação da penalidade menor.
              </p>
              <p className="mt-3">
                O CARF aplica sistematicamente o Art. 112 nas discussões sobre qualificação de multa.
                Para que a multa qualificada (150%) seja aplicada, o Fisco precisa demonstrar de forma
                inequívoca o dolo, a fraude ou a simulação. Na dúvida, aplica-se a multa ordinária.
                O artigo também é relevante em discussões sobre responsabilidade de sócios e
                administradores pelo pagamento de tributos da pessoa jurídica: se há dúvida sobre
                se o sócio agiu com excesso de poderes ou infração de lei para fins do art. 135,
                III do CTN, a dúvida deve beneficiá-lo, afastando o redirecionamento da execução.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO II — OBRIGAÇÃO TRIBUTÁRIA ── */}
          <Secao id="tit-obrig" titulo="Título II: Obrigação Tributária" subtitulo="Arts. 113 ao 138" />
          <Secao id="cap-obrig" titulo="Capítulo I: Disposições Gerais" subtitulo="Arts. 113 ao 118" />

          <Artigo id="art-113" numero="Art. 113" titulo="Obrigação Tributária Principal e Acessória">
            <LegalText>
              <p>A obrigação tributária é principal ou acessória.</p>
              <p className="mt-3">
                §1º A obrigação principal surge com a ocorrência do fato gerador, tem por objeto o
                pagamento de <strong>tributo ou penalidade pecuniária</strong> e extingue-se
                juntamente com o crédito dela decorrente.
              </p>
              <p className="mt-1">
                §2º A obrigação acessória decorre da legislação tributária e tem por objeto as
                prestações, positivas ou negativas, nela previstas no interesse da arrecadação
                ou da fiscalização dos tributos.
              </p>
              <p className="mt-1">
                §3º A obrigação acessória, pelo simples fato da sua inobservância,{" "}
                <strong>converte-se em obrigação principal</strong> relativamente à penalidade
                pecuniária.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 113 estabelece a distinção fundamental entre obrigação principal e acessória.
                A principal tem por objeto pagar: pagar o tributo ou pagar a multa. A acessória tem
                por objeto fazer ou não fazer: emitir nota fiscal, entregar declaração, manter
                escrituração contábil, tolerar fiscalização. Essa distinção parece didática mas tem
                consequências processuais sérias: descumprir uma obrigação acessória gera uma multa
                que, por força do §3º, passa a ser obrigação principal. A multa por atraso na entrega
                da DCTF é, portanto, cobrada como obrigação principal pelo Fisco, pelo mesmo processo
                de constituição e cobrança do crédito tributário.
              </p>
              <p className="mt-3">
                O §1º inclui "penalidade pecuniária" no objeto da obrigação principal, o que gerou
                debate doutrinário: penalidade não é tributo, mas o CTN a trata como objeto de
                obrigação principal para fins de procedimento de cobrança. Isso simplifica a
                arrecadação ao unificar o rito de constituição e execução de tributos e multas,
                mas embaraça a distinção conceitual entre tributo (art. 3º do CTN, que expressamente
                excluía sanção de ato ilícito) e penalidade. O STF tem reafirmado que a natureza de
                tributo é determinada pelo fato gerador, não pelo nome ou pela forma de cobrança,
                e que penalidades tributárias não são tributos mesmo quando cobradas pelo mesmo
                processo executivo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-114" numero="Art. 114" titulo="Fato Gerador da Obrigação Principal">
            <LegalText>
              <p>
                Fato gerador da obrigação principal é a <strong>situação definida em lei como necessária
                e suficiente</strong> à sua ocorrência.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A definição do Art. 114 é lapidar. "Necessária e suficiente" significa que o fato
                gerador não pode ser ampliado por analogia (é necessário que a situação ocorra
                exatamente como descrita em lei) nem exige condições adicionais além das previstas
                na lei (uma vez ocorrida a situação legal, o tributo nasce, sem necessidade de ato
                administrativo adicional). Isso tem uma consequência imediata: o tributo nasce
                automaticamente com a ocorrência do fato gerador, não com o lançamento. O
                lançamento apenas apura e formaliza uma obrigação que já existe.
              </p>
              <p className="mt-3">
                A expressão "situação definida em lei" é o requisito da legalidade tributária
                aplicado ao fato gerador: somente lei pode definir o que gera tributo. Portaria
                não pode criar fato gerador, decreto não pode ampliar o fato gerador definido em
                lei, instrução normativa não pode equiparar situação não tributável a situação
                tributável. Isso deriva diretamente do Art. 97, III do CTN e do art. 150, I da
                CF/88. O Art. 114 é, portanto, o ponto de encontro entre o princípio da legalidade
                e a estrutura da obrigação tributária: a lei define o fato; o fato ocorrido gera
                a obrigação; a obrigação gera o crédito após o lançamento.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-115" numero="Art. 115" titulo="Fato Gerador da Obrigação Acessória">
            <LegalText>
              <p>
                Fato gerador da obrigação acessória é qualquer situação que, na forma da legislação
                aplicável, impõe a <strong>prática ou a abstenção de ato</strong> que não configure
                obrigação principal.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 115 define o fato gerador da obrigação acessória de forma intencionalmente
                aberta. Enquanto o fato gerador da obrigação principal precisa estar em lei (Art.
                114 combinado com Art. 97, III), o fato gerador da obrigação acessória pode estar
                em qualquer norma da "legislação tributária" no sentido amplo do Art. 96, incluindo
                portarias e instruções normativas. Uma instrução normativa da Receita Federal que
                obriga determinadas empresas a entregar arquivo digital de escrituração está criando
                um fato gerador de obrigação acessória (a existência da atividade empresarial)
                e a obrigação correspondente (entregar o arquivo).
              </p>
              <p className="mt-3">
                Isso não significa que obrigações acessórias sejam ilimitadas. Elas precisam ter
                nexo com a arrecadação ou fiscalização dos tributos, como exige o §2º do Art. 113.
                Uma obrigação acessória completamente desvinculada de qualquer tributo seria
                inconstitucional por falta de competência tributária. O STJ tem limitado obrigações
                acessórias que, na prática, impõem ônus desproporcionais sem correspondência razoável
                com as necessidades de controle fiscal, aplicando o princípio da proporcionalidade
                mesmo nesse campo onde a legalidade é menos rígida do que na obrigação principal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-116" numero="Art. 116" titulo="Ocorrência do Fato Gerador">
            <LegalText>
              <p>
                Salvo disposição de lei em contrário, considera-se ocorrido o fato gerador e
                existentes os seus efeitos:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - tratando-se de situação de fato, desde o momento em que se
                  verifiquem as circunstâncias materiais necessárias a que produza os efeitos que
                  normalmente lhe são próprios;
                </li>
                <li>
                  <strong>II</strong> - tratando-se de situação jurídica, desde o momento em que
                  esteja definitivamente constituída, nos termos de direito aplicável.
                </li>
              </ul>
              <p className="mt-3">
                Parágrafo único. A autoridade administrativa poderá <strong>desconsiderar atos ou
                negócios jurídicos</strong> praticados com a finalidade de dissimular a ocorrência
                do fato gerador do tributo ou a natureza dos elementos constitutivos da obrigação
                tributária, observados os procedimentos a serem estabelecidos em lei ordinária.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 116 distingue dois tipos de fato gerador conforme sua natureza. O fato gerador
                de situação de fato (inciso I) ocorre quando as circunstâncias materiais estão
                presentes: a saída física de uma mercadoria do estabelecimento. Não é preciso que
                o ato jurídico subjacente seja perfeito ou eficaz; basta que a situação de fato
                ocorra. O fato gerador de situação jurídica (inciso II) ocorre quando o ato ou
                negócio jurídico está definitivamente constituído segundo o direito civil: a assinatura
                do contrato de compra e venda, o registro da transmissão imobiliária, o recebimento
                formal do rendimento.
              </p>
              <p className="mt-3">
                O parágrafo único, incluído pela LC 104/2001, é a cláusula geral antielisiva do direito
                tributário brasileiro. Ela autoriza a autoridade fiscal a desconsiderar atos ou negócios
                jurídicos praticados para dissimular o fato gerador. Se uma empresa realiza reestruturação
                societária artificial exclusivamente para não tributar uma operação que, em sua substância
                econômica, equivale a uma operação tributável, o Fisco pode desconsiderar a forma
                jurídica escolhida e tributar o conteúdo real da operação. Esse parágrafo ainda depende
                de regulamentação por lei ordinária, o que nunca foi feito de forma completa, gerando
                debate sobre sua aplicabilidade direta. O STJ tem reconhecido sua eficácia nos casos
                em que há prova clara de simulação ou abuso de formas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-117" numero="Art. 117" titulo="Negócio Jurídico Condicionado">
            <LegalText>
              <p>
                Para os efeitos do inciso II do artigo anterior e salvo disposição de lei em contrário,
                os atos ou negócios jurídicos condicionais reputam-se perfeitos e acabados:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - sendo suspensiva a condição, desde o momento de seu implemento;
                </li>
                <li>
                  <strong>II</strong> - sendo resolutória a condição, desde o momento da prática do
                  ato ou da celebração do negócio.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 117 regula quando o fato gerador de natureza jurídica ocorre em negócios
                condicionados. Na condição suspensiva (inciso I), o negócio só produz efeitos
                quando a condição se implementa: se a venda de imóvel está sujeita à condição
                de aprovação de financiamento bancário, o ITBI só incide quando o financiamento
                for aprovado e a transmissão se tornar definitivamente exigível. Até lá, o fato
                gerador não ocorreu.
              </p>
              <p className="mt-3">
                Na condição resolutória (inciso II), o negócio produz efeitos imediatamente, podendo
                ser desfeito se a condição se implementar. O fato gerador ocorre no momento da prática
                do ato, não aguardando o implemento da condição. Se uma transmissão imobiliária é
                celebrada com cláusula de resolução em caso de descumprimento de prazo de pagamento,
                o ITBI incide na celebração do contrato. Se posteriormente o negócio se resolver,
                o imposto já recolhido não é restituído automaticamente (embora o contribuinte possa
                pleitear restituição por erro na incidência original, dependendo da circunstância).
                Essa distinção é relevante em operações imobiliárias complexas com condições suspensivas
                ou resolutórias sobre o preço ou a posse.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-118" numero="Art. 118" titulo="Definição do Fato Gerador: Irrelevância da Validade e dos Efeitos">
            <LegalText>
              <p>
                A definição legal do fato gerador é interpretada abstraindo-se:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - da validade jurídica dos atos efetivamente praticados pelos
                  contribuintes, responsáveis, ou terceiros, bem como da natureza do seu objeto
                  ou dos seus efeitos;
                </li>
                <li>
                  <strong>II</strong> - dos efeitos dos fatos efetivamente ocorridos.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 118 consagra o princípio tributário do "non olet" (o dinheiro não tem cheiro),
                atribuído ao imperador romano Vespasiano. O fato gerador ocorre independentemente da
                validade jurídica do ato ou da licitude da atividade que o gerou. Renda auferida com
                tráfico de drogas é tributável pelo IR. Receita de atividade clandestina é sujeita ao
                PIS/Cofins. Mercadoria contrabandeada sujeita ao ICMS a saída do estabelecimento que
                a comercializa. A nulidade civil do contrato não desfaz o fato gerador tributário
                que já ocorreu.
              </p>
              <p className="mt-3">
                O STJ aplica o Art. 118 em casos envolvendo atividades ilícitas e contratos nulos.
                Uma construtora que recebe pagamentos por obra irregular, sem licença municipal, deve
                recolher ISS sobre esses pagamentos. A irregularidade da construção não afasta o fato
                gerador do ISS, que é a prestação do serviço de construção civil, independentemente
                de ter sido licenciada ou não. O reverso também é verdadeiro: se um contrato é anulado
                judicialmente, e os valores pagos são devolvidos, o contribuinte pode pleitear
                restituição do tributo pago sobre operação que se revelou não ocorrida em sua
                plenitude jurídica.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-119" numero="Art. 119" titulo="Sujeito Ativo da Obrigação Tributária">
            <LegalText>
              <p>
                Sujeito ativo da obrigação é a{" "}
                <strong>pessoa jurídica de direito público</strong>, titular da competência para
                exigir o seu cumprimento.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 119 define o sujeito ativo como a pessoa jurídica de direito público titular
                da competência para exigir a obrigação. A regra geral é que o sujeito ativo coincide
                com o ente federado titular da competência tributária: a União cobra o IR, o Estado
                cobra o ICMS, o Município cobra o ISS. Mas a definição do Art. 119 comporta uma
                nuance importante: o sujeito ativo é quem tem competência para "exigir", não
                necessariamente quem detém a competência constitucional para "instituir".
              </p>
              <p className="mt-3">
                Isso permite a delegação de capacidade tributária ativa a outras pessoas jurídicas
                de direito público, como autarquias e conselhos profissionais. O CREA (autarquia
                federal) pode arrecadar anuidades com base na delegação de competência para fiscalizar
                o exercício da engenharia. O INSS (hoje Receita Federal) arrecada contribuições
                previdenciárias com base na competência delegada pela Constituição. Pessoas jurídicas
                de direito privado, como bancos e cooperativas, não são sujeitos ativos: elas atuam
                como agentes arrecadadores por conta do sujeito ativo de direito público, mas a
                competência para exigir o tributo permanece na esfera pública.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-120" numero="Art. 120" titulo="Desmembramento Territorial de Pessoa Jurídica de Direito Público">
            <LegalText>
              <p>
                Salvo disposição de lei em contrário, a pessoa jurídica de direito público, que se
                constituir pelo <strong>desmembramento territorial de outra</strong>, sub-roga-se nos
                direitos desta, cuja legislação tributária aplicará até que entre em vigor a sua própria.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 120 regula uma situação específica mas de grande relevância prática no contexto
                brasileiro de intenso desmembramento municipal: quando um novo município é criado a
                partir de outro, o novo ente automaticamente herda a legislação tributária do município
                de origem e a aplica até que sua própria lei municipal entre em vigor. Isso evita um
                vácuo tributário que poderia existir entre a criação do município e a aprovação da sua
                primeira lei tributária local.
              </p>
              <p className="mt-3">
                A sub-rogação nos direitos inclui créditos tributários pendentes de cobrança. Se um
                contribuinte devia IPTU ao município original por terreno que agora integra o território
                do novo município, o débito passa a ser do novo ente, que pode cobrá-lo como sujeito
                ativo sub-rogado. O Brasil criou centenas de municípios nas décadas de 1980 e 1990,
                e o Art. 120 foi o dispositivo que garantiu a continuidade da arrecadação nesses
                processos de emancipação. A regra vale igualmente para estados criados por
                desmembramento, embora os casos federais sejam historicamente mais raros.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP II — SUJEITO PASSIVO ── */}
          <Secao id="cap-passivo" titulo="Capítulo II: Sujeito Passivo" subtitulo="Arts. 121 ao 128" />

          <Artigo id="art-121" numero="Art. 121" titulo="Sujeito Passivo da Obrigação Principal: Contribuinte e Responsável">
            <LegalText>
              <p>Sujeito passivo da obrigação principal é a pessoa obrigada ao pagamento de tributo ou penalidade pecuniária.</p>
              <p className="mt-3">Parágrafo único. O sujeito passivo da obrigação principal diz-se:</p>
              <ul className="mt-1 space-y-1 pl-4">
                <li><strong>I</strong> - contribuinte, quando tenha <strong>relação pessoal e direta</strong> com a situação que constitua o respectivo fato gerador;</li>
                <li><strong>II</strong> - responsável, quando, sem revestir a condição de contribuinte, sua obrigação decorra de <strong>disposição expressa de lei</strong>.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 121 estabelece a distinção fundamental entre contribuinte e responsável. O contribuinte
                tem relação pessoal e direta com o fato gerador: quem aufere a renda paga o IR, quem promove
                a saída da mercadoria paga o ICMS, quem é proprietário do imóvel paga o IPTU. É a manifestação
                de riqueza que justifica a cobrança que recai sobre o próprio sujeito que a realizou.
              </p>
              <p className="mt-3">
                O responsável não realizou o fato gerador, mas a lei o coloca na posição de devedor porque
                tem alguma relação com o contribuinte ou com o evento tributável que torna economicamente
                eficiente ou juridicamente conveniente cobrar dele. A empresa que retém o IR na fonte do seu
                empregado é responsável pelo repasse; o adquirente de imóvel é responsável pelos débitos
                de IPTU do alienante; o sócio-gerente pode ser responsável pelos tributos da empresa que
                administra. A exigência de lei expressa para o inciso II é a vedação de responsabilidade
                tributária por analogia ou por construção jurisprudencial sem base legal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-122" numero="Art. 122" titulo="Sujeito Passivo da Obrigação Acessória">
            <LegalText>
              <p>Sujeito passivo da obrigação acessória é a <strong>pessoa obrigada às prestações</strong> que constituam o seu objeto.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 122 é deliberadamente amplo. O universo de sujeitos passivos de obrigações acessórias
                é significativamente maior do que o das obrigações principais. Qualquer pessoa a quem a
                legislação tributária imponha um fazer ou não fazer pode ser sujeito passivo de obrigação
                acessória, mesmo sem ser contribuinte de tributo algum. Instituições financeiras entregam
                à Receita Federal declarações sobre movimentações financeiras de clientes (Decred). Notários
                informam sobre transmissões de imóveis. Distribuidoras de combustíveis informam sobre volumes
                comercializados. Nenhuma dessas entidades é contribuinte do IR de seus clientes ou do ICMS
                dos vendedores; são apenas obrigadas a prestar informações no interesse da fiscalização.
              </p>
              <p className="mt-3">
                Essa amplitude gera tensões com o sigilo bancário e fiscal. O STF, no RE 601.314, reconheceu
                a constitucionalidade do acesso direto da Receita Federal a dados bancários de contribuintes
                sem necessidade de autorização judicial prévia, desde que para fins tributários e com
                respeito às salvaguardas do processo administrativo. Essa decisão é aplicável precisamente
                porque as instituições financeiras são sujeitos passivos de obrigações acessórias de
                fornecimento de informações, tornando o compartilhamento de dados uma prestação tributária,
                não uma quebra de sigilo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-123" numero="Art. 123" titulo="Inoponibilidade de Convenções Particulares ao Fisco">
            <LegalText>
              <p>
                Salvo disposições de lei em contrário, as convenções particulares, relativas à responsabilidade
                pelo pagamento de tributos, <strong>não podem ser opostas à Fazenda Pública</strong>, para
                modificar a definição legal do sujeito passivo das obrigações tributárias correspondentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 123 resolve de forma direta um problema prático muito comum: contratos privados que
                redistribuem a responsabilidade tributária entre as partes. O exemplo clássico é a cláusula
                contratual em contratos de locação que estipula "todos os tributos incidentes sobre o imóvel
                ficam a cargo do locatário." Esse ajuste é válido entre locador e locatário: se o locatário
                não pagar o IPTU, o locador pode cobrar regressivamente. Mas para a Prefeitura, o devedor
                continua sendo o proprietário do imóvel (contribuinte por força do art. 34 do CTN). A
                Fazenda cobra do locador; a convenção privada não a vincula.
              </p>
              <p className="mt-3">
                O mesmo vale para cláusulas em contratos de prestação de serviços que atribuem o ISS ao
                tomador, ou acordos societários que designam um sócio como responsável exclusivo pelos
                tributos da sociedade. Esses arranjos têm validade entre as partes contratantes, podendo
                gerar direito de regresso, mas são absolutamente ineficazes para afastar a cobrança do
                Fisco contra o sujeito passivo que a lei designa. A expressão "salvo disposições de lei
                em contrário" deixa margem para que a lei tributária reconheça certos contratos, como
                ocorre no regime de substituição tributária do ICMS onde o fabricante substituto recolhe
                pelo varejista por força da própria lei, não por convenção particular.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-solid" titulo="Seção II: Solidariedade" subtitulo="Arts. 124 ao 125" />

          <Artigo id="art-124" numero="Art. 124" titulo="Solidariedade Tributária: Hipóteses">
            <LegalText>
              <p>São solidariamente obrigadas:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - as pessoas que tenham <strong>interesse comum</strong> na situação que constitua o fato gerador da obrigação principal;</li>
                <li><strong>II</strong> - as pessoas expressamente designadas por lei.</li>
              </ul>
              <p className="mt-3">Parágrafo único. A solidariedade referida neste artigo não comporta benefício de ordem.</p>
            </LegalText>
            <Comentario>
              <p>
                O "interesse comum" do inciso I é o conceito mais litigado do artigo. No contexto tributário,
                ele significa participação conjunta no fato gerador, não apenas interesse econômico geral
                na operação. Coproprietários de um imóvel têm interesse comum no fato gerador do IPTU
                (propriedade do imóvel) e são solidários no débito. Sócios de uma empresa que praticam
                juntos atos que configuram o fato gerador do ICMS têm interesse comum na operação e
                podem ser solidários. Mas o simples fato de uma empresa ser acionista de outra não cria
                solidariedade tributária pelo inciso I, porque a controladora não tem participação
                direta no fato gerador do tributo da controlada.
              </p>
              <p className="mt-3">
                A ausência de benefício de ordem é consequência da natureza da solidariedade passiva:
                o Fisco pode cobrar o valor total de qualquer um dos devedores solidários, sem precisar
                esgotar a cobrança contra os demais primeiro. Isso é distinto da responsabilidade
                subsidiária do Art. 134, onde o terceiro só é cobrado quando o contribuinte principal
                não puder pagar. A solidariedade do Art. 124 é mais severa: qualquer devedor solidário
                pode ser o alvo da execução fiscal pelo valor integral, cabendo a ele buscar regresso
                contra os demais.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-125" numero="Art. 125" titulo="Solidariedade Tributária: Efeitos">
            <LegalText>
              <p>Salvo disposição de lei em contrário, são os seguintes os efeitos da solidariedade:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o pagamento efetuado por um dos obrigados aproveita aos demais;</li>
                <li><strong>II</strong> - a isenção ou remissão de crédito exonera todos os obrigados, salvo se outorgada pessoalmente a um deles, subsistindo, nesse caso, a solidariedade quanto aos demais pelo saldo;</li>
                <li><strong>III</strong> - a interrupção da prescrição, em favor ou contra um dos obrigados, favorece ou prejudica aos demais.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O inciso I é a consequência lógica da solidariedade: o pagamento extingue a obrigação
                para todos. Se um dos coproprietários quita o IPTU integralmente, os demais estão
                liberados perante a Fazenda, preservando o direito de cobrança regressiva entre eles
                conforme o direito civil.
              </p>
              <p className="mt-3">
                O inciso III é o de maior impacto processual. A interrupção da prescrição contra um
                devedor solidário interrompe para todos os demais. Se a execução fiscal é ajuizada
                contra a empresa contribuinte e a citação interrompe o prazo prescricional, esse efeito
                se propaga ao sócio-gerente que eventualmente venha a ser incluído no polo passivo por
                redirecionamento. Na direção oposta, se a prescrição se consuma em favor de um dos
                devedores solidários, ela não se comunica automaticamente aos demais quando fundada em
                causa pessoal a ele. O STJ tem aplicado essas regras sistematicamente nas execuções
                fiscais com pluralidade de devedores, especialmente nos casos de redirecionamento contra
                sócios com base no Art. 135.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-capac" titulo="Seção III: Capacidade Tributária" subtitulo="Art. 126" />

          <Artigo id="art-126" numero="Art. 126" titulo="Capacidade Tributária Passiva">
            <LegalText>
              <p>A capacidade tributária passiva independe:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - da capacidade civil das pessoas naturais;</li>
                <li><strong>II</strong> - de achar-se a pessoa natural sujeita a medidas que importem privação ou limitação do exercício de atividades civis, comerciais ou profissionais, ou da administração direta de seus bens ou negócios;</li>
                <li><strong>III</strong> - de estar a pessoa jurídica regularmente constituída, bastando que configure uma unidade econômica ou profissional.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 126 consagra a autonomia da capacidade tributária passiva em relação à capacidade
                civil. O menor de idade que recebe herança com rendimentos é contribuinte do IR sobre
                esses rendimentos, mesmo não tendo capacidade civil para praticar atos da vida civil sem
                assistência ou representação. O interdito que é proprietário de imóvel paga IPTU. A
                incapacidade civil não é escudo fiscal: os representantes legais (pais, tutores, curadores)
                é que respondem pelo pagamento, conforme o Art. 134, mas o tributo é devido.
              </p>
              <p className="mt-3">
                O inciso III é especialmente relevante no combate à evasão fiscal. Uma empresa constituída
                de fato, sem registro formal, que realiza operações comerciais com habitualidade é sujeito
                passivo dos tributos incidentes sobre essas operações. O Fisco não precisa aguardar a
                regularização formal da pessoa jurídica para autuá-la. Da mesma forma, estabelecimentos
                que operam na informalidade, associações não registradas que exercem atividade econômica
                e profissionais autônomos sem inscrição nos conselhos de classe são todos contribuintes
                e sujeitos passivos das obrigações tributárias decorrentes de suas atividades.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-domicilio" titulo="Seção IV: Domicílio Tributário" subtitulo="Art. 127" />

          <Artigo id="art-127" numero="Art. 127" titulo="Domicílio Tributário">
            <LegalText>
              <p>Na falta de eleição, pelo contribuinte ou responsável, de domicílio tributário, na forma da legislação aplicável, considera-se como tal:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quanto às pessoas naturais, a sua residência habitual, ou, sendo esta incerta ou desconhecida, o centro habitual de sua atividade;</li>
                <li><strong>II</strong> - quanto às pessoas jurídicas de direito privado ou às firmas individuais, o lugar da sua sede, ou, em relação aos atos ou fatos que derem origem à obrigação, o de cada estabelecimento;</li>
                <li><strong>III</strong> - quanto às pessoas jurídicas de direito público, qualquer de suas repartições no território da entidade tributante.</li>
              </ul>
              <p className="mt-3">§1º Quando não couber a aplicação das regras fixadas em qualquer dos incisos deste artigo, considerar-se-á como domicílio tributário do contribuinte ou responsável o lugar da situação dos bens ou da ocorrência dos atos ou fatos que deram origem à obrigação.</p>
              <p className="mt-1">§2º A autoridade administrativa pode recusar o domicílio eleito, quando impossibilite ou dificulte a arrecadação ou a fiscalização do tributo, aplicando-se então a regra do parágrafo anterior.</p>
            </LegalText>
            <Comentario>
              <p>
                O domicílio tributário é relevante em múltiplos planos: define qual repartição fiscal tem
                jurisdição sobre o contribuinte, onde as intimações e notificações devem ser entregues,
                e qual vara de execuções fiscais é competente para o ajuizamento da execução. A eleição
                de domicílio pelo contribuinte, admitida como regra, é limitada pelo §2º: se o domicílio
                eleito foi escolhido estrategicamente para dificultar a fiscalização ou a cobrança, a
                autoridade pode recusá-lo e aplicar os critérios legais do artigo.
              </p>
              <p className="mt-3">
                Para empresas com múltiplos estabelecimentos, o inciso II tem uma nuance importante:
                cada estabelecimento pode ser considerado domicílio tributário para as obrigações que
                dele emanam. Um estabelecimento em São Paulo que emite notas fiscais de ICMS responde
                perante o fisco paulista por aquelas operações, mesmo que a sede da empresa esteja no
                Rio de Janeiro. Isso é coerente com a autonomia dos estabelecimentos para fins de ICMS
                e com a territorialidade das competências estaduais.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP III — RESPONSABILIDADE TRIBUTÁRIA ── */}
          <Secao id="cap-resp" titulo="Capítulo III: Responsabilidade Tributária" subtitulo="Arts. 128 ao 138" />

          <Artigo id="art-128" numero="Art. 128" titulo="Responsabilidade Tributária: Disposições Gerais">
            <LegalText>
              <p>
                Sem prejuízo do disposto neste Capítulo, a lei pode atribuir de modo expresso a
                responsabilidade pelo crédito tributário a <strong>terceira pessoa, vinculada ao fato
                gerador</strong> da respectiva obrigação, excluindo a responsabilidade do contribuinte
                ou atribuindo-a a este em caráter supletivo do cumprimento total ou parcial da
                referida obrigação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 128 é o dispositivo que autoriza a substituição tributária. Ele fixa três
                requisitos inafastáveis: (1) lei expressa, sem responsabilidade tributária por analogia
                ou decreto; (2) terceiro vinculado ao fato gerador, não qualquer pessoa escolhida
                arbitrariamente; (3) clareza sobre se o contribuinte original fica excluído ou apenas
                subsidiário. É a base legal para o ICMS-ST, onde o fabricante ou importador recolhe
                o imposto de toda a cadeia de distribuição antecipadamente.
              </p>
              <p className="mt-3">
                A exigência de vínculo do responsável com o fato gerador é o critério constitucional
                de validade da responsabilidade tributária por substituição. Um fabricante de cerveja
                tem vínculo óbvio com o fato gerador do ICMS nas vendas posteriores de suas cervejas
                ao varejo: o produto que ele vendeu é o mesmo produto que o varejista venderá ao
                consumidor. Atribuir responsabilidade a uma pessoa sem qualquer relação com a cadeia
                do bem tributado violaria o Art. 128. O STF validou a substituição tributária "para
                frente" (com base em fato gerador presumido) no RE 213.396, desde que seja assegurada
                a restituição do imposto pago a maior quando o fato gerador não se realizar ou ocorrer
                em valor inferior ao presumido.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-resp-suc" titulo="Seção II: Responsabilidade dos Sucessores" subtitulo="Arts. 129 ao 133" />

          <Artigo id="art-129" numero="Art. 129" titulo="Créditos Abrangidos pela Responsabilidade dos Sucessores">
            <LegalText>
              <p>
                O disposto nesta Seção aplica-se por igual aos créditos tributários{" "}
                <strong>definitivamente constituídos</strong> ou em curso de constituição à data dos
                atos nela referidos, e aos <strong>constituídos posteriormente</strong> aos mesmos atos,
                desde que relativos a obrigações tributárias surgidas até a referida data.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 129 define o alcance temporal da responsabilidade dos sucessores. Três categorias
                de créditos estão abrangidas: os já formalmente constituídos por lançamento até a data
                do evento (fusão, compra de estabelecimento, abertura da sucessão), os que estão sendo
                constituídos nessa data (auto de infração lavrado mas não definitivo), e os constituídos
                depois do evento mas referentes a obrigações que já existiam antes dele.
              </p>
              <p className="mt-3">
                Esse terceiro grupo é o mais relevante para o planejamento tributário de aquisições.
                Se uma empresa adquire o fundo de comércio de outra em janeiro de 2024, e em março de
                2025 o fisco lança créditos tributários referentes a fatos geradores de 2022 e 2023
                (obrigações surgidas antes da aquisição), o adquirente responde por esses créditos, mesmo
                que tenham sido constituídos mais de um ano após o negócio. Isso sublinha a importância
                do due diligence fiscal completo antes de aquisições, incluindo análise de possíveis
                passivos fiscais não constituídos formalmente, como autuações ainda em andamento no
                Fisco ou obrigações declaradas mas não pagas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-130" numero="Art. 130" titulo="Responsabilidade do Adquirente de Imóveis">
            <LegalText>
              <p>
                Os créditos tributários relativos a impostos cujo fato gerador seja a propriedade, o
                domínio útil ou a posse de bens imóveis, e bem assim os relativos a taxas pela prestação
                de serviços referentes a tais bens, ou a contribuições de melhoria,{" "}
                <strong>sub-rogam-se na pessoa dos respectivos adquirentes</strong>, salvo quando conste
                do título a prova de sua quitação.
              </p>
              <p className="mt-3">Parágrafo único. No caso de arrematação em hasta pública, a sub-rogação ocorre sobre o respectivo preço.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 130 estabelece que dívidas de IPTU, taxas imobiliárias e contribuições de melhoria
                acompanham o imóvel, não o devedor. Quem compra o bem compra também os débitos fiscais
                pendentes, salvo se a escritura ou o instrumento de transferência vier acompanhado da
                prova de quitação dos tributos. Por isso as certidões negativas de débitos municipais
                (e estaduais, para o ITCMD) são etapa padrão em qualquer due diligence imobiliária.
              </p>
              <p className="mt-3">
                O parágrafo único é a grande exceção: na arrematação judicial (leilão determinado por
                decisão judicial, como em execução hipotecária ou falência), os débitos de IPTU não
                seguem o imóvel para o arrematante. Eles sub-rogam ao preço da arrematação, sendo
                pagos com os recursos do leilão antes de qualquer repasse ao credor exequente.
                Isso torna os leilões judiciais de imóveis instrumentos úteis de aquisição a preços
                abaixo de mercado, sem o risco de herdar passivos fiscais imobiliários, o que explica
                parte do interesse de investidores nesse mercado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-131" numero="Art. 131" titulo="Responsabilidade Pessoal dos Sucessores">
            <LegalText>
              <p>São pessoalmente responsáveis:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o adquirente ou legatário, pelos tributos relativos aos bens adquiridos ou legados;</li>
                <li><strong>II</strong> - o sucessor a qualquer título e o cônjuge meeiro, pelos tributos devidos pelo de cujus até a data da partilha ou adjudicação, limitada esta responsabilidade ao montante do quinhão do legado ou da meação;</li>
                <li><strong>III</strong> - o espólio, pelos tributos devidos pelo de cujus até a data da abertura da sucessão.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 131 divide a responsabilidade tributária nas sucessões em dois momentos. Antes
                da abertura da sucessão (morte), é o de cujus o contribuinte; com a morte, o espólio
                assume os débitos do falecido (inciso III). Depois da partilha, os herdeiros e legatários
                ficam pessoalmente responsáveis pelos débitos que foram partilhados junto com os bens
                (incisos I e II).
              </p>
              <p className="mt-3">
                A limitação do inciso II ao "montante do quinhão" é a proteção central para os herdeiros:
                ninguém herda mais dívida do que bem. Se o espólio vale R$ 1 milhão e os débitos fiscais
                do falecido somam R$ 3 milhões, cada herdeiro responde apenas até o valor que efetivamente
                recebeu. Isso garante que a herança não seja uma armadilha: aceitar a herança em inventário
                é seguro porque a responsabilidade fiscal é limitada. O mesmo vale para o cônjuge meeiro:
                a meação corresponde à metade dos bens do casal; a responsabilidade tributária do cônjuge
                sobrevivente fica limitada ao valor dessa meação.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-132" numero="Art. 132" titulo="Responsabilidade em Fusão, Transformação e Incorporação">
            <LegalText>
              <p>
                A pessoa jurídica de direito privado que resultar de fusão, transformação ou incorporação
                de outra ou em outra é <strong>responsável pelos tributos devidos</strong> até a data do
                ato pelas pessoas jurídicas de direito privado fusionadas, transformadas ou incorporadas.
              </p>
              <p className="mt-3">Parágrafo único. O disposto neste artigo aplica-se aos casos de extinção de pessoas jurídicas de direito privado, quando a exploração da respectiva atividade seja continuada por qualquer sócio remanescente, ou seu espólio, sob a mesma ou outra razão social, ou sob firma individual.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 132 impede que reorganizações societárias sejam usadas para extinguir passivos
                fiscais. A empresa resultante de fusão ou incorporação carrega os débitos das entidades
                que lhe deram origem. Isso torna o due diligence tributário uma etapa indispensável
                em qualquer M&A: antes de incorporar uma empresa, é necessário mapear todos os passivos
                fiscais contingentes e constituídos, porque a incorporadora os herda integralmente.
              </p>
              <p className="mt-3">
                O parágrafo único fecha uma lacuna que seria usada para evasão: dissolve-se a empresa,
                um dos sócios continua a atividade com nova razão social ou como firma individual,
                e a ideia seria que os débitos fiscais ficassem na empresa extinta sem patrimônio.
                O CTN não aceita esse artifício: se há continuidade da atividade por qualquer sócio
                ou seus sucessores, há sucessão tributária. O STJ aplica esse parágrafo frequentemente
                em casos de "confusão patrimonial" onde uma empresa é desativada e outra, com os
                mesmos sócios e o mesmo objeto, assume o lugar da primeira.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-133" numero="Art. 133" titulo="Responsabilidade do Adquirente de Estabelecimento Comercial">
            <LegalText>
              <p>
                A pessoa natural ou jurídica de direito privado que adquirir de outra, por qualquer
                título, fundo de comércio ou estabelecimento comercial, industrial ou profissional, e
                continuar a respectiva exploração, sob a mesma ou outra razão social ou sob firma ou
                nome individual, responde pelos tributos relativos ao fundo ou estabelecimento adquirido,
                devidos até a data do ato:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - <strong>integralmente</strong>, se o alienante cessar a exploração do comércio, indústria ou atividade;</li>
                <li><strong>II</strong> - <strong>subsidiariamente</strong> com o alienante, se este prosseguir na exploração ou iniciar dentro de seis meses a contar da data da alienação, nova atividade no mesmo ou em outro ramo de comércio, indústria ou profissão.</li>
              </ul>
              <p className="mt-3">§1º O disposto no caput deste artigo não se aplica na hipótese de alienação judicial em processo de falência ou de filial ou unidade produtiva isolada, em processo de recuperação judicial.</p>
              <p className="mt-1">§2º Não se aplica o disposto no §1º quando o adquirente for sócio da sociedade falida ou em recuperação judicial, ou sociedade controlada pelo devedor falido ou em recuperação judicial, ou parente até o quarto grau do devedor falido ou em recuperação judicial ou de qualquer de seus sócios, ou identificado como agente do falido ou do devedor em recuperação judicial com o objetivo de fraudar a sucessão tributária.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 133 é o dispositivo central da "sucessão tributária empresarial" e um dos mais
                relevantes para operações de M&A. A distinção entre os incisos I e II é crucial. Se o
                vendedor para de operar completamente após a venda do estabelecimento, o comprador
                assume toda a responsabilidade fiscal: não há mais ninguém a quem o Fisco possa
                cobrar. Se o vendedor continua operando (mesmo em outro ramo), a responsabilidade
                do comprador é subsidiária: o Fisco cobra primeiro do vendedor e, se este não pagar,
                cobra do comprador.
              </p>
              <p className="mt-3">
                O §1º, introduzido pela LC 118/2005, foi uma revolução para os processos de recuperação
                judicial e falência no Brasil. Antes dessa alteração, a aquisição de ativos em leilão
                judicial de empresas em recuperação ou falência gerava sucessão tributária automática,
                desestimulando compradores e derrubando o valor dos ativos. Com a lei, a alienação
                judicial em falência ou de unidades produtivas isoladas em recuperação não gera
                sucessão. Isso permitiu que empresas em dificuldades vendessem ativos estratégicos
                para compradores dispostos a continuar a operação, preservando empregos e valor
                econômico. O §2º fecha o desvio óbvio: partes relacionadas ao devedor não podem
                usar esse benefício para adquirir ativos limpos de dívidas fiscais.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-resp-terc" titulo="Seção III: Responsabilidade de Terceiros" subtitulo="Arts. 134 ao 135" />

          <Artigo id="art-134" numero="Art. 134" titulo="Responsabilidade de Terceiros: Subsidiária">
            <LegalText>
              <p>Nos casos de impossibilidade de exigência do cumprimento da obrigação principal pelo contribuinte, respondem solidariamente com este nos atos em que intervierem ou pelas omissões de que forem responsáveis:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - os pais, pelos tributos devidos por seus filhos menores;</li>
                <li><strong>II</strong> - os tutores e curadores, pelos tributos devidos por seus tutelados ou curatelados;</li>
                <li><strong>III</strong> - os administradores de bens de terceiros, pelos tributos devidos por estes;</li>
                <li><strong>IV</strong> - o inventariante, pelos tributos devidos pelo espólio;</li>
                <li><strong>V</strong> - o síndico e o comissário, pelos tributos devidos pela massa falida ou pelo concordatário;</li>
                <li><strong>VI</strong> - os tabeliães, escrivães e demais serventuários de ofício, pelos tributos devidos sobre os atos praticados por eles, ou perante eles, em razão do seu ofício;</li>
                <li><strong>VII</strong> - os sócios, no caso de liquidação de sociedade de pessoas.</li>
              </ul>
              <p className="mt-3">Parágrafo único. O disposto neste artigo só se aplica, em matéria de penalidades, às de caráter moratório.</p>
            </LegalText>
            <Comentario>
              <p>
                Apesar de o caput usar a palavra "solidariamente", o STJ pacificou que a responsabilidade
                do Art. 134 é subsidiária, não solidária em sentido técnico. A condição de "impossibilidade
                de exigência do cumprimento pelo contribuinte" significa que esses terceiros só são cobrados
                quando o contribuinte principal não puder pagar. O Fisco não pode ir direto ao pai para
                cobrar o IR do filho menor sem antes tentar cobrar do espólio ou do representante
                competente do menor.
              </p>
              <p className="mt-3">
                O inciso VII é o mais discutido: sócios de sociedades de pessoas (sociedades simples,
                firmas individuais, sociedades em nome coletivo) respondem pelos tributos da sociedade
                em liquidação. Isso não se aplica às sociedades de capital (S.A., Ltda.) no âmbito
                do Art. 134: para essas, a responsabilidade dos sócios por tributos exige o dolo ou
                excesso de poderes do Art. 135. O parágrafo único restringe a responsabilidade dos
                terceiros em matéria de penalidades às multas moratórias, não alcançando multas
                punitivas ou de ofício aplicadas por infrações cometidas diretamente pelo contribuinte.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-135" numero="Art. 135" titulo="Responsabilidade Pessoal de Terceiros com Excesso de Poderes">
            <LegalText>
              <p>São pessoalmente responsáveis pelos créditos correspondentes a obrigações tributárias resultantes de atos praticados com <strong>excesso de poderes ou infração de lei, contrato social ou estatutos</strong>:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - as pessoas referidas no artigo anterior;</li>
                <li><strong>II</strong> - os mandatários, prepostos e empregados;</li>
                <li><strong>III</strong> - os diretores, gerentes ou representantes de pessoas jurídicas de direito privado.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 135, inciso III, é o dispositivo mais litigado de todo o CTN. Ele permite o
                redirecionamento da execução fiscal da pessoa jurídica para seus diretores e gerentes
                quando estes agiram com excesso de poderes ou infração de lei, contrato social ou
                estatuto. A questão que gerou décadas de jurisprudência conflitante foi: o simples
                não pagamento de tributos é "infração de lei" para fins de redirecionamento?
              </p>
              <p className="mt-3">
                O STJ respondeu negativamente: a Súmula 430 diz que o inadimplemento da obrigação
                tributária pela sociedade não gera, por si só, responsabilidade solidária do sócio-gerente.
                Mas a Súmula 435 diz que presume-se dissolvida irregularmente a empresa que deixa de
                funcionar no seu domicílio fiscal sem comunicação aos órgãos competentes, autorizando o
                redirecionamento. A distinção prática é: empresa que para de pagar impostos mas continua
                operando e se comunicando com o Fisco não gera redirecionamento automático. Empresa que
                simplesmente some, deixa o endereço fiscal vazio e para de funcionar sem dissolução
                formal permite o redirecionamento. O sócio que não era gerente na época do fato gerador
                também não pode ser redirecionado, o que o STJ confirmou no Tema 962.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-resp-infr" titulo="Seção IV: Responsabilidade por Infrações" subtitulo="Arts. 136 ao 138" />

          <Artigo id="art-136" numero="Art. 136" titulo="Responsabilidade Objetiva por Infrações">
            <LegalText>
              <p>
                Salvo disposição de lei em contrário, a responsabilidade por infrações da legislação
                tributária <strong>independe da intenção do agente</strong> ou do responsável e da
                efetividade, natureza e extensão dos efeitos do ato.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 136 estabelece a objetividade da responsabilidade por infrações tributárias.
                Para a maioria das infrações administrativas tributárias, basta que o fato infrator
                tenha ocorrido: a entrega atrasada da DCTF gera multa independentemente de qualquer
                intenção de descumprir a lei; a emissão de nota fiscal com erro gera penalidade
                independentemente de boa-fé do contribuinte; o recolhimento a menor por erro de
                cálculo gera juros e multa de mora independentemente da causa do erro.
              </p>
              <p className="mt-3">
                A ressalva "salvo disposição de lei em contrário" e a exceção do Art. 137 são importantes.
                O Art. 112 já determina interpretação benigna em caso de dúvida. O Art. 137 isola as
                infrações que requerem dolo específico ou têm natureza criminal. E a própria jurisprudência
                reconhece que a objetividade do Art. 136 não afasta a possibilidade de o contribuinte
                demonstrar ausência de culpa em situações específicas: erro escusável na interpretação
                de norma tributária genuinamente obscura pode afastar a multa qualificada, por exemplo,
                ainda que não afaste a multa moratória. A linha entre infração objetiva e infração
                dolosa é o eixo central das discussões de qualificação de multa no CARF.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-137" numero="Art. 137" titulo="Responsabilidade Pessoal do Agente">
            <LegalText>
              <p>A responsabilidade é pessoal ao agente:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quanto às infrações conceituadas por lei como crimes ou contravenções, salvo quando praticadas no exercício regular de administração, mandato, função, cargo ou emprego, ou no cumprimento de ordem expressa emitida por quem de direito;</li>
                <li><strong>II</strong> - quanto às infrações em cuja definição o dolo específico do agente seja elementar;</li>
                <li>
                  <strong>III</strong> - quanto às infrações que decorram direta e exclusivamente de dolo específico:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>a) das pessoas referidas no artigo 134, contra aquelas por quem respondem;</li>
                    <li>b) dos mandatários, prepostos ou empregados, contra seus mandantes, preponentes ou empregadores;</li>
                    <li>c) dos diretores, gerentes ou representantes de pessoas jurídicas de direito privado, contra estas.</li>
                  </ul>
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 137 recorta da regra objetiva do Art. 136 as infrações que são pessoais ao
                agente que as cometeu. O inciso I é particularmente relevante: quando a infração
                é crime tributário (sonegação, fraude, conluio tipificados na Lei 8.137/1990), a
                responsabilidade é pessoal do agente que a praticou. A empresa pode ser autuada
                para fins de cobrança do tributo, mas a responsabilidade criminal é pessoal.
              </p>
              <p className="mt-3">
                O inciso III cria uma inversão importante em relação ao Art. 134. Enquanto o Art. 134
                trata de responsabilidade de representantes pelos tributos dos representados, o Art. 137,
                III, trata do caso oposto: o representante pratica infração com dolo, em prejuízo do
                representado, para benefício próprio. Um diretor que desvia tributos da empresa para
                uso pessoal, um empregado que falsifica documentos fiscais para prejudicar o empregador,
                um tutor que pratica fraude fiscal contra os bens do tutelado: nessas situações a
                responsabilidade pela infração é pessoal do agente, não da empresa ou do representado.
                Isso protege a empresa-vítima de arcar com penalidades decorrentes de ato doloso de
                seu administrador contra seus próprios interesses.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-138" numero="Art. 138" titulo="Denúncia Espontânea">
            <LegalText>
              <p>
                A responsabilidade é excluída pela <strong>denúncia espontânea da infração</strong>,
                acompanhada, se for o caso, do pagamento do tributo devido e dos juros de mora, ou do
                depósito da importância arbitrada pela autoridade administrativa, quando o montante do
                tributo dependa de apuração.
              </p>
              <p className="mt-3">
                Parágrafo único. Não se considera espontânea a denúncia apresentada após o início de
                qualquer procedimento administrativo ou medida de fiscalização, relacionados com a infração.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A denúncia espontânea é o mecanismo de autodeclaração e regularização voluntária do
                CTN: o contribuinte que se apresenta ao Fisco antes de qualquer ação fiscal, confessa
                a infração e paga o tributo com juros, tem a multa excluída. Isso cria incentivo
                para a regularização voluntária e reduz o custo de contencioso. A exigência de
                pagamento concomitante é estrita: mera confissão sem pagamento não configura denúncia
                espontânea válida.
              </p>
              <p className="mt-3">
                O STJ construiu jurisprudência rica em torno do Art. 138. A Súmula 360 determina que
                o contribuinte que declarou o tributo mas não o pagou no prazo não pode usar a denúncia
                espontânea para afastar a multa de mora quando fizer o pagamento tardio: ao declarar,
                ele já "confessou" a dívida, e o Fisco já sabia do débito, então não há espontaneidade
                real na regularização posterior. Entretanto, quando há infração não declarada (omissão
                de receitas, crédito indevido tomado sem escrituração, informações incorretas em
                declarações) e o contribuinte se apresenta para corrigir antes da autuação, a denúncia
                espontânea afasta integralmente as multas, preservando apenas os juros de mora.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO III — CRÉDITO TRIBUTÁRIO ── */}
          <Secao id="tit-credito" titulo="Título III: Crédito Tributário" subtitulo="Arts. 139 ao 193" />

          <Artigo id="art-139" numero="Art. 139" titulo="Crédito Tributário: Natureza e Origem">
            <LegalText>
              <p>
                O crédito tributário <strong>decorre da obrigação principal</strong> e tem a mesma
                natureza desta.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 139 estabelece a relação entre obrigação tributária e crédito tributário. A
                obrigação nasce com o fato gerador (Art. 114), de forma automática e independente de
                qualquer ato administrativo. O crédito tributário, derivado dessa obrigação, é
                constituído formalmente pelo lançamento (Art. 142). São dois momentos distintos:
                a obrigação existe desde o fato gerador; o crédito só existe após o lançamento.
              </p>
              <p className="mt-3">
                "Tem a mesma natureza" significa que a natureza jurídica do crédito reflete a da
                obrigação: se a obrigação é tributária, o crédito é tributário. Isso tem consequências
                nos privilégios do crédito tributário (preferência sobre outros créditos em concurso
                de credores), nos prazos prescricionais (específicos do CTN, não do Código Civil),
                e na via de cobrança (execução fiscal pela Lei 6.830/1980, não ação de cobrança
                comum). A identidade de natureza impede que o Fisco "transforme" créditos tributários
                em outra categoria para escapar das regras específicas do CTN.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-140" numero="Art. 140" titulo="Autonomia do Crédito Tributário frente à Obrigação">
            <LegalText>
              <p>
                As circunstâncias que modificam o crédito tributário, sua extensão ou seus efeitos,
                ou as garantias ou os privilégios a ele atribuídos, ou que excluem sua{" "}
                <strong>exigibilidade não afetam a obrigação tributária</strong> que lhe deu origem.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 140 consagra a autonomia relativa entre crédito e obrigação. O crédito pode
                ter sua exigibilidade suspensa (por liminar judicial, parcelamento, recurso administrativo)
                sem que isso extinga a obrigação que o originou. A obrigação permanece intacta como
                vínculo jurídico; o que muda é a eficácia da cobrança. Quando a liminar é cassada
                ou o parcelamento é rescindido, o crédito ressurge exigível, porque a obrigação nunca
                desapareceu.
              </p>
              <p className="mt-3">
                Na prática, isso significa que a suspensão da exigibilidade do crédito tributário
                por mandado de segurança não extingue o débito, apenas impede a cobrança enquanto
                a medida judicial estiver em vigor. Se o contribuinte obtém liminar e não recolhe
                o tributo, e depois perde a ação, deverá pagar o principal mais juros contados
                desde o vencimento original, porque a obrigação persistiu durante todo o período
                de suspensão. Isenção ou remissão, por outro lado, extinguem o crédito (Art. 175)
                e, conforme o alcance da lei, podem também extinguir a obrigação correspondente.
                O Art. 140 vale para situações que afetam o crédito mas não a obrigação.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP I — CONSTITUIÇÃO DO CRÉDITO TRIBUTÁRIO ── */}
          <Secao id="cap-const" titulo="Capítulo I: Constituição do Crédito Tributário" subtitulo="Arts. 141 ao 150" />
          <Secao id="sec-lancam" titulo="Seção I: Lançamento" subtitulo="Arts. 142 ao 150" />

          <Artigo id="art-141" numero="Art. 141" titulo="Crédito Tributário: Modificação Somente nos Casos Previstos em Lei">
            <LegalText>
              <p>
                O crédito tributário regularmente constituído somente se modifica ou extingue, ou tem
                sua exigibilidade suspensa ou excluída, nos casos previstos nesta Lei, fora dos quais
                não podem ser dispensadas, sob pena de{" "}
                <strong>responsabilidade funcional</strong> na forma da lei, a sua efetivação ou as
                respectivas garantias.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 141 é o contraponto, do ponto de vista do Fisco, ao princípio da legalidade que
                protege o contribuinte. Assim como o contribuinte não pode ser cobrado fora dos casos
                previstos em lei, o crédito tributário não pode ser dispensado, reduzido ou suspenso
                pelo agente fiscal fora das hipóteses legalmente previstas. O servidor público que
                "deixa de cobrar" um crédito tributário sem autorização legal comete infração funcional
                e pode ser responsabilizado pessoalmente.
              </p>
              <p className="mt-3">
                Esse dispositivo é a vedação expressa à "barganha fiscal" informal: o auditor não pode
                negociar a redução de um auto de infração fora dos programas legais de transação
                tributária, como o Programa de Transação Tributária do art. 171 do CTN ou os PARCELAMENTOs
                autorizados por lei. O princípio da indisponibilidade do crédito tributário, que decorre
                do Art. 141, é um dos fundamentos do regime jurídico tributário: tributo é obrigação
                legal, não negocial, e seus termos só podem ser modificados pela lei, não pela vontade
                das partes.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-142" numero="Art. 142" titulo="Lançamento: Definição e Caráter Vinculado">
            <LegalText>
              <p>
                Compete privativamente à autoridade administrativa constituir o crédito tributário pelo
                lançamento, assim entendido o <strong>procedimento administrativo</strong> tendente a:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>verificar a ocorrência do fato gerador da obrigação correspondente;</li>
                <li>determinar a matéria tributável;</li>
                <li>calcular o montante do tributo devido;</li>
                <li>identificar o sujeito passivo;</li>
                <li>sendo caso, propor a aplicação da penalidade cabível.</li>
              </ul>
              <p className="mt-3">Parágrafo único. A atividade administrativa de lançamento é <strong>vinculada e obrigatória</strong>, sob pena de responsabilidade funcional.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 142 define o lançamento tributário como o ato pelo qual o Estado formaliza a
                existência do crédito tributário. O lançamento não cria a obrigação (que nasce com o
                fato gerador), mas a torna líquida e exigível. Até o lançamento, há obrigação sem
                crédito formalmente constituído; após o lançamento, o crédito existe e pode ser cobrado.
                A palavra "privativamente" é importante: somente a autoridade administrativa pode fazer
                o lançamento original; o Judiciário não lança, apenas revisa lançamentos já feitos.
              </p>
              <p className="mt-3">
                O parágrafo único é fundamental. "Vinculada e obrigatória" significa que o auditor fiscal
                que verifica a ocorrência de um fato gerador tem o dever legal de lavrar o auto de
                infração ou o lançamento. Não há discricionariedade quanto ao "se lançar". Pode haver
                alguma discricionariedade quanto ao "como" graduar a penalidade dentro dos limites
                legais, mas não quanto à obrigação de constituir o crédito quando os fatos o justificam.
                O servidor que deixa de lançar quando deveria comete infração funcional, assim como o
                que lança indevidamente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-143" numero="Art. 143" titulo="Lançamento em Moeda Estrangeira">
            <LegalText>
              <p>
                Salvo disposição de lei em contrário, quando o valor tributário esteja expresso em
                moeda estrangeira, no lançamento far-se-á sua <strong>conversão em moeda nacional ao
                câmbio do dia da ocorrência do fato gerador</strong> da obrigação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 143 fixa a data da conversão cambial para fins tributários: o câmbio do dia
                do fato gerador, não o câmbio do dia do lançamento nem o do pagamento. Isso tem
                impacto direto no II e IE, onde mercadorias importadas e exportadas são frequentemente
                valorizadas em dólar. A taxa de câmbio aplicável ao cálculo do II é a vigente na
                data do registro da Declaração de Importação (DI), que é o momento em que o Fisco
                considera ocorrido o fato gerador para fins aduaneiros.
              </p>
              <p className="mt-3">
                Para o IR sobre rendimentos em moeda estrangeira, a legislação específica (RIR e
                instrução normativa da Receita Federal) tem regras próprias de conversão que podem
                divergir da regra geral do Art. 143, prevalecendo como lei especial. O contribuinte
                que recebe dividendos em dólar de empresa no exterior, por exemplo, usa a taxa de
                câmbio da data do recebimento efetivo, não da data de competência, conforme as regras
                específicas de cada tipo de rendimento estrangeiro.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-144" numero="Art. 144" titulo="Lei Aplicável ao Lançamento">
            <LegalText>
              <p>
                O lançamento reporta-se à <strong>data da ocorrência do fato gerador</strong> da
                obrigação e rege-se pela lei então vigente, ainda que posteriormente modificada
                ou revogada.
              </p>
              <p className="mt-3">§1º Aplica-se ao lançamento a legislação que, posteriormente à ocorrência do fato gerador da obrigação, tenha instituído novos critérios de apuração ou processos de fiscalização, ampliado os poderes de investigação das autoridades administrativas, ou outorgado ao crédito maiores garantias ou privilégios, exceto, neste último caso, para o efeito de atribuir responsabilidade tributária a terceiros.</p>
              <p className="mt-1">§2º O disposto neste artigo não se aplica aos impostos lançados por períodos certos de tempo, desde que a respectiva lei fixe expressamente a data em que o fato gerador se considera ocorrido.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 144 aplica o princípio tempus regit actum à tributação: a lei que rege o
                lançamento é a vigente na data do fato gerador. Se uma empresa auferisse renda em
                2020 com alíquota de IR de 15%, e em 2022 a alíquota fosse elevada para 20%, o
                lançamento de 2024 referente a 2020 aplica a alíquota de 15%. A lei nova é irretroativa
                para fins de cobrança material do tributo.
              </p>
              <p className="mt-3">
                O §1º abre uma exceção importante para regras procedimentais: novos critérios de
                fiscalização, ampliação de poderes de investigação e novas garantias do crédito
                aplicam-se retroativamente aos lançamentos em andamento. Isso significa que se a
                Receita Federal ganhou novo poder de acesso a dados bancários por lei de 2023, pode
                usar esse poder para investigar operações de 2019. Mas a exceção final do §1º é
                relevante: a nova lei não pode retroativamente criar responsabilidade tributária de
                terceiros por fatos ocorridos antes dela, o que é a proteção do contribuinte e de
                seus eventuais responsáveis contra a retroatividade das regras de atribuição
                de responsabilidade.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-145" numero="Art. 145" titulo="Alteração do Lançamento Após Notificação">
            <LegalText>
              <p>O lançamento regularmente notificado ao sujeito passivo só pode ser alterado em virtude de:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - impugnação do sujeito passivo;</li>
                <li><strong>II</strong> - recurso de ofício;</li>
                <li><strong>III</strong> - iniciativa de ofício da autoridade administrativa, nos casos previstos no artigo 149.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 145 confere estabilidade ao lançamento após a notificação: o crédito tributário
                notificado ao contribuinte só pode ser alterado por três vias. A impugnação (inciso I)
                é o recurso administrativo do contribuinte que discorda do auto de infração, podendo
                levar à redução, manutenção ou aumento do crédito após julgamento. O recurso de ofício
                (inciso II) é o reexame automático obrigatório pelo órgão superior quando a decisão de
                primeira instância é favorável ao contribuinte acima de determinado valor. A revisão
                de ofício (inciso III) permite ao Fisco rever seu próprio lançamento nas hipóteses do
                Art. 149, como descoberta de fatos novos ou comprovação de fraude.
              </p>
              <p className="mt-3">
                O que o Art. 145 veda é a modificação unilateral do lançamento fora dessas hipóteses:
                um auditor não pode simplesmente "corrigir" um auto de infração que já notificou o
                contribuinte, salvo pelas vias descritas. Isso protege o contribuinte que, após receber
                o auto, planeja sua defesa com base nos valores e fatos nele descritos. Alterações
                arbitrárias do lançamento já notificado violam o contraditório e a ampla defesa.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-146" numero="Art. 146" titulo="Mudança de Critério Jurídico no Lançamento">
            <LegalText>
              <p>
                A modificação introduzida, de ofício ou em consequência de decisão administrativa ou
                judicial, nos critérios jurídicos adotados pela autoridade administrativa no exercício
                do lançamento somente pode ser efetivada, em relação a um mesmo sujeito passivo,
                quanto a{" "}
                <strong>fato gerador ocorrido posteriormente</strong> à sua introdução.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 146 é a proteção do contribuinte contra a retroatividade de mudanças de
                interpretação jurídica do Fisco. Se a Receita Federal adotava determinado critério
                jurídico para calcular o IPI sobre operações triangulares e decide mudar esse critério,
                a nova interpretação vale para fatos geradores futuros, não para os já ocorridos sob
                o critério anterior.
              </p>
              <p className="mt-3">
                Esse artigo complementa o Art. 100, parágrafo único (proteção do contribuinte que
                seguiu norma complementar ou prática administrativa) e o Art. 106 (retroatividade
                benigna de lei penal tributária). Juntos, esses dispositivos formam um sistema de
                proteção da confiança legítima do contribuinte: quem agiu conforme a interpretação
                oficial vigente não pode ser retroativamente penalizado por uma mudança de entendimento
                que ocorreu depois. A proteção é especialmente relevante em matéria de créditos de
                PIS/Cofins, ICMS e IPI, onde interpretações administrativas divergentes ao longo do
                tempo geraram autuações retroativas que o Art. 146 deveria impedir.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-147" numero="Art. 147" titulo="Lançamento por Declaração">
            <LegalText>
              <p>
                O lançamento é efetuado com base na declaração do sujeito passivo ou de terceiro,
                quando um ou outro, na forma da legislação tributária, presta à autoridade administrativa
                informações sobre matéria de fato, indispensáveis à sua efetivação.
              </p>
              <p className="mt-3">§1º A retificação da declaração por iniciativa do próprio declarante, quando vise a reduzir ou a excluir tributo, só é admissível mediante comprovação do erro em que se funde, e antes de notificado o lançamento.</p>
              <p className="mt-1">§2º Os erros contidos na declaração e apuráveis pelo seu exame serão retificados de ofício pela autoridade administrativa a que competir a revisão daquela.</p>
            </LegalText>
            <Comentario>
              <p>
                O lançamento por declaração é uma das três modalidades clássicas do CTN. O contribuinte
                ou terceiro presta informações factuais ao Fisco, e a autoridade realiza o lançamento
                com base nessas informações. O ITBI é o exemplo mais comum hoje: o comprador informa
                o valor da transação; a Prefeitura lança o imposto. A DIRF (Declaração de Imposto
                de Renda Retido na Fonte) prestada pelas fontes pagadoras é outro exemplo: a empresa
                informa quanto reteve na fonte, e o Fisco usa essas informações para cruzar com as
                declarações dos beneficiários.
              </p>
              <p className="mt-3">
                O §1º cria uma assimetria intencional: retificar a declaração para aumentar o tributo
                é sempre possível, mas para reduzir ou excluir o tributo exige comprovação do erro
                e deve ocorrer antes da notificação do lançamento. Após notificado, o contribuinte
                só pode discutir o lançamento por impugnação, não por retificação de declaração.
                Isso evita que declarações sejam usadas estrategicamente para reduzir débitos após
                o Fisco já ter iniciado o procedimento de cobrança.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-148" numero="Art. 148" titulo="Arbitramento da Base de Cálculo">
            <LegalText>
              <p>
                Quando o cálculo do tributo tenha por base, ou tome em consideração, o valor ou o
                preço de bens, direitos, serviços ou atos jurídicos, a autoridade lançadora, mediante
                processo regular, <strong>arbitrará aquele valor ou preço</strong>, sempre que sejam
                omissos ou não mereçam fé as declarações ou os esclarecimentos prestados, ou os
                documentos expedidos pelo sujeito passivo ou pelo terceiro legalmente obrigado,
                ressalvada, em caso de contestação, avaliação contraditória, administrativa ou judicial.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O arbitramento é o poder que o Art. 148 confere ao Fisco de substituir o valor
                declarado pelo contribuinte quando esse valor não merece fé. A condição para o
                arbitramento é a ausência ou a inidoneidade das declarações do contribuinte: notas
                fiscais subfaturadas, preços de transferência abaixo de mercado em operações com
                partes relacionadas, valores venais de imóveis declarados muito abaixo do mercado
                são as situações típicas.
              </p>
              <p className="mt-3">
                A ressalva final do artigo é a proteção mais importante: o contribuinte sempre tem
                direito à avaliação contraditória. Se o Fisco arbitrou o valor do imóvel de uma
                empresa em R$ 10 milhões para fins de ITBI, o contribuinte pode contratar um
                avaliador independente e submeter essa avaliação ao processo administrativo ou
                judicial. O arbitramento não é uma imposição unilateral definitiva: é uma posição
                inicial do Fisco que pode ser contestada com evidências objetivas de mercado.
                Nas regras de preços de transferência do IR, o BACEN e a Receita Federal usam
                métodos específicos de comparação que são formas qualificadas de arbitramento
                regulamentadas pela IN RFB 1.312/2012 e pela nova Lei 14.596/2023.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-149" numero="Art. 149" titulo="Lançamento de Ofício: Hipóteses">
            <LegalText>
              <p>O lançamento é efetuado e revisto de ofício pela autoridade administrativa nos seguintes casos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quando a lei assim o determine;</li>
                <li><strong>II</strong> - quando a declaração não seja prestada, por quem de direito, no prazo e na forma da legislação tributária;</li>
                <li><strong>III</strong> - quando a pessoa legalmente obrigada, embora tenha prestado declaração, deixe de atender a pedido de esclarecimento formulado pela autoridade administrativa, recuse-se a prestá-lo ou não o preste satisfatoriamente;</li>
                <li><strong>IV</strong> - quando se comprove falsidade, erro ou omissão quanto a qualquer elemento definido na legislação tributária como sendo de declaração obrigatória;</li>
                <li><strong>V</strong> - quando se comprove omissão ou inexatidão, por parte da pessoa legalmente obrigada, no exercício da atividade de lançamento por homologação;</li>
                <li><strong>VI</strong> - quando se comprove ação ou omissão do sujeito passivo, ou de terceiro legalmente obrigado, que dê lugar à aplicação de penalidade pecuniária;</li>
                <li><strong>VII</strong> - quando se comprove que o sujeito passivo, ou terceiro em benefício daquele, agiu com dolo, fraude ou simulação;</li>
                <li><strong>VIII</strong> - quando deva ser apreciado fato não conhecido ou não provado por ocasião do lançamento anterior;</li>
                <li><strong>IX</strong> - quando se comprove que, no lançamento anterior, ocorreu fraude ou falta funcional da autoridade que o efetuou, ou omissão, pela mesma autoridade, de ato ou formalidade especial.</li>
              </ul>
              <p className="mt-3">Parágrafo único. A revisão do lançamento só pode ser iniciada enquanto não extinto o crédito pela decadência.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 149 lista os casos em que o Fisco age de ofício para lançar ou rever um
                lançamento anterior. O inciso II é o mais aplicado: quando o contribuinte não entrega
                a declaração de IR, a Receita Federal faz o lançamento com base nas informações
                disponíveis (fontes pagadoras, movimentações financeiras, DIRF). Os incisos IV, V
                e VII cobrem as situações de autuação por inconsistência ou fraude descoberta
                durante fiscalização.
              </p>
              <p className="mt-3">
                O inciso VIII (fato não conhecido por ocasião do lançamento anterior) é relevante
                para revisão de lançamentos. Se a Receita Federal homologou tacitamente o IRPJ de
                uma empresa e depois descobre informações em poder de terceiros que demonstram
                omissão de receitas, pode revisar o lançamento anterior pelo inciso VIII, desde que
                dentro do prazo de decadência. O parágrafo único limita todo o Art. 149 ao prazo
                decadencial: expirado esse prazo sem lançamento, a possibilidade de constituir o
                crédito se extingue definitivamente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-150" numero="Art. 150" titulo="Lançamento por Homologação">
            <LegalText>
              <p>
                O lançamento por homologação, que ocorre quanto aos tributos cuja legislação atribua
                ao sujeito passivo o dever de <strong>antecipar o pagamento sem prévio exame da
                autoridade administrativa</strong>, opera-se pelo ato em que a referida autoridade,
                tomando conhecimento da atividade assim exercida pelo obrigado, expressamente a homologa.
              </p>
              <p className="mt-3">§1º O pagamento antecipado pelo obrigado nos termos deste artigo extingue o crédito, sob condição resolutória da ulterior homologação ao lançamento.</p>
              <p className="mt-1">§2º Não influem sobre a obrigação tributária quaisquer atos anteriores à homologação, praticados pelo sujeito passivo ou por terceiro, visando à extinção total ou parcial do crédito.</p>
              <p className="mt-1">§3º Os atos a que se refere o parágrafo anterior serão, porém, considerados na apuração do saldo porventura devido e, sendo o caso, na imposição de penalidade, ou sua graduação.</p>
              <p className="mt-1">§4º Se a lei não fixar prazo à homologação, será ele de <strong>cinco anos</strong>, a contar da ocorrência do fato gerador; expirado esse prazo sem que a Fazenda Pública se tenha pronunciado, considera-se homologado o lançamento e definitivamente extinto o crédito, salvo se comprovada a ocorrência de dolo, fraude ou simulação.</p>
            </LegalText>
            <Comentario>
              <p>
                O lançamento por homologação é a modalidade mais importante na prática: IR, CSLL,
                IPI, ICMS, PIS, Cofins, ISS e a maioria dos tributos relevantes seguem esse modelo.
                O contribuinte calcula, declara e paga sem prévia autorização do Fisco. A Receita
                Federal ou o fisco estadual/municipal então revisa a declaração e o pagamento,
                podendo homologá-los expressamente ou, na prática mais comum, silenciar.
              </p>
              <p className="mt-3">
                O §4º é o coração do artigo para fins de planejamento tributário e contencioso. O
                prazo de 5 anos para homologação conta da ocorrência do fato gerador; decorrido
                esse prazo sem manifestação do Fisco, ocorre a homologação tácita e o crédito se
                extingue. Para fins de autuação, esse prazo é também o prazo decadencial do Art. 173:
                depois de 5 anos da homologação tácita, o Fisco não pode mais autuar. A ressalva
                de dolo, fraude ou simulação é importante: nos casos de sonegação comprovada, o
                prazo do Art. 173, I se aplica integralmente, podendo ser mais longo. O debate
                sobre o prazo para pedir restituição em lançamentos por homologação gerou o famoso
                tema da "tese dos cinco mais cinco", superada pelo STJ no Tema 169.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP II — SUSPENSÃO DA EXIGIBILIDADE ── */}
          <Secao id="cap-suspens" titulo="Capítulo II: Suspensão da Exigibilidade do Crédito Tributário" subtitulo="Arts. 151 ao 155-A" />

          <Artigo id="art-151" numero="Art. 151" titulo="Hipóteses de Suspensão da Exigibilidade">
            <LegalText>
              <p>Suspendem a exigibilidade do crédito tributário:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - moratória;</li>
                <li><strong>II</strong> - o depósito do seu montante integral;</li>
                <li><strong>III</strong> - as reclamações e os recursos, nos termos das leis reguladoras do processo tributário administrativo;</li>
                <li><strong>IV</strong> - a concessão de medida liminar em mandado de segurança;</li>
                <li><strong>V</strong> - a concessão de medida liminar ou de tutela antecipada, em outras espécies de ação judicial;</li>
                <li><strong>VI</strong> - o parcelamento.</li>
              </ul>
              <p className="mt-3">Parágrafo único. O disposto neste artigo não dispensa o cumprimento das obrigações acessórias dependentes da obrigação principal cujo crédito seja suspenso, ou dela consequentes.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 151 lista as seis hipóteses de suspensão da exigibilidade do crédito tributário.
                A suspensão não extingue o crédito (como fazem os casos do Art. 156), apenas impede
                temporariamente sua cobrança. Durante a suspensão, o Fisco não pode ajuizar execução
                fiscal, não pode incluir o contribuinte em cadastro de inadimplentes (CADIN) e deve
                emitir certidão positiva com efeito de negativa (CPD-EN) conforme o Art. 206 do CTN.
              </p>
              <p className="mt-3">
                O depósito do montante integral (inciso II) é a forma mais usada em litígios tributários:
                o contribuinte deposita o valor discutido em juízo, suspende a exigibilidade e afasta
                a fluência de juros de mora sobre o valor depositado. Se ganhar a ação, levanta o
                depósito com correção. O inciso III cobre o processo administrativo fiscal: enquanto
                o auto de infração estiver em discussão no CARF ou nas Delegacias de Julgamento, a
                exigibilidade está suspensa e a prescrição não corre. O parágrafo único é crucial:
                a suspensão da principal não dispensa obrigações acessórias. Mesmo com liminar que
                suspende o ICMS, o contribuinte continua obrigado a emitir notas fiscais, escriturar
                o livro fiscal e entregar o SPED.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-152" numero="Art. 152" titulo="Moratória: Competência para Conceder">
            <LegalText>
              <p>A moratória somente pode ser concedida:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - em caráter geral:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>a) pela pessoa jurídica de direito público competente para instituir o tributo a que se refira;</li>
                    <li>b) pela União, quanto a tributos de competência dos Estados, do Distrito Federal ou dos Municípios, quando simultaneamente concedida quanto aos tributos de competência federal e às obrigações de direito privado;</li>
                  </ul>
                </li>
                <li className="mt-1"><strong>II</strong> - em caráter individual, por despacho da autoridade administrativa, desde que autorizada por lei nas condições do inciso anterior.</li>
              </ul>
              <p className="mt-3">Parágrafo único. A lei concessiva de moratória pode circunscrever expressamente a sua aplicabilidade à determinada região do território da pessoa jurídica de direito público que a expedir, ou a determinada classe ou categoria de sujeitos passivos.</p>
            </LegalText>
            <Comentario>
              <p>
                A moratória é a extensão do prazo para pagamento de tributos, concedida pelo ente
                com competência para instituir o tributo. A regra geral é a coincidência entre
                competência tributária e competência para a moratória: a União concede moratória do
                IR; os estados, do ICMS; os municípios, do ISS.
              </p>
              <p className="mt-3">
                A hipótese do inciso I, b, é a mais politicamente significativa: a União pode conceder
                moratória de tributos estaduais e municipais em situações excepcionais, como calamidades
                públicas ou desastres naturais, mas apenas se simultaneamente conceder moratória
                equivalente dos tributos federais. Isso evita que a União use moratória de tributos
                alheios como instrumento de influência política sem custos para o orçamento federal.
                O parágrafo único permite moratórias regionais ou setoriais: uma moratória de IPTU
                apenas para imóveis em área de deslizamento, ou uma moratória de ISS apenas para
                empresas do setor de eventos durante uma pandemia, são exemplos de aplicação
                territorialmente ou setorialmente delimitada.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-153" numero="Art. 153" titulo="Moratória: Requisitos da Lei">
            <LegalText>
              <p>A lei que conceda moratória em caráter geral ou autorize sua concessão em caráter individual especificará, sem prejuízo de outros requisitos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o prazo de duração do favor;</li>
                <li><strong>II</strong> - as condições da concessão do favor em caráter individual;</li>
                <li>
                  <strong>III</strong> - sendo caso:
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>a) os tributos a que se aplica;</li>
                    <li>b) o número de prestações e seus vencimentos, dentro do prazo a que se refere o inciso I;</li>
                    <li>c) as garantias que devem ser fornecidas pelo beneficiado no caso de concessão em caráter individual.</li>
                  </ul>
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 153 estabelece o conteúdo mínimo da lei de moratória. A exigência de prazo
                determinado (inciso I) é a diferença estrutural entre moratória e remissão: moratória
                adia o pagamento; remissão perdoa a dívida. Uma lei que conceda moratória por prazo
                indeterminado seria, na prática, uma remissão disfarçada, violando o Art. 172 que
                exige lei específica para a remissão.
              </p>
              <p className="mt-3">
                A exigência de garantias na moratória individual (alínea c do inciso III) é comum
                nos parcelamentos de grandes débitos fiscais: a empresa que negocia um parcelamento
                especial de centenas de milhões de reais frequentemente precisa oferecer bens em
                garantia, como imóveis, equipamentos ou títulos. Isso protege o Fisco contra o
                risco de o contribuinte beneficiado pela moratória continuar acumulando débitos
                durante o período de parcelamento e depois se tornar insolvente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-154" numero="Art. 154" titulo="Moratória: Créditos Abrangidos">
            <LegalText>
              <p>
                Salvo disposição de lei em contrário, a moratória somente abrange os créditos{" "}
                <strong>definitivamente constituídos</strong> à data da lei ou do despacho que a
                conceder, ou cujo lançamento já tenha sido iniciado àquela data por ato regularmente
                notificado ao sujeito passivo.
              </p>
              <p className="mt-3">Parágrafo único. A moratória não aproveita aos casos de dolo, fraude ou simulação do sujeito passivo ou do terceiro em benefício daquele.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 154 limita a moratória aos créditos já existentes na data da lei ou do
                despacho concessivo. Isso impede o uso estratégico da moratória: o contribuinte não
                pode esperar a promulgação de uma lei de moratória para cometer infrações sabendo
                que já serão abrangidas pelo benefício. Apenas os débitos já constituídos ou em
                processo de constituição (lançamento notificado) antes da lei são alcançados.
              </p>
              <p className="mt-3">
                O parágrafo único nega a moratória para quem agiu com dolo, fraude ou simulação.
                Isso é coerente com o princípio geral de que benefícios fiscais não devem premiar
                a má-fé. Na prática, a verificação de dolo, fraude ou simulação pode ser complexa
                e pode ser contestada pelo contribuinte que se diz enquadrado na moratória. O Fisco
                tem o ônus de demonstrar a má-fé para excluir o contribuinte do benefício, não o
                contrário.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-155" numero="Art. 155" titulo="Moratória: Revogação">
            <LegalText>
              <p>
                A concessão da moratória em caráter individual não gera direito adquirido e será{" "}
                <strong>revogada de ofício</strong> sempre que se apure que o beneficiado não satisfazia
                ou deixou de satisfazer as condições ou não cumprira ou deixou de cumprir os requisitos
                para a concessão do favor, cobrando-se o crédito acrescido de juros de mora:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - com imposição da penalidade cabível, nos casos de dolo ou simulação do beneficiado, ou de terceiro em seu benefício;</li>
                <li><strong>II</strong> - sem imposição de penalidade, nos demais casos.</li>
              </ul>
              <p className="mt-3">Parágrafo único. No caso do inciso I deste artigo, o tempo decorrido entre a concessão da moratória e sua revogação não se computa para efeito da prescrição do direito à cobrança do crédito; no caso do inciso II deste artigo, a revogação só pode ocorrer antes de prescrito o referido direito.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 155 trata da revogação da moratória individual quando o beneficiário não
                cumpre as condições. A distinção entre os incisos é fundamental. No inciso I, quem
                obteve a moratória por fraude ou simulação paga o tributo com juros e penalidades,
                e o período de vigência da moratória não conta para efeitos de prescrição: o Fisco
                recupera o tempo perdido durante o período fraudulento. No inciso II, quem perdeu
                o direito à moratória por circunstância superveniente sem culpa (por exemplo, empresa
                que se enquadrava nos requisitos mas mudou de porte) paga o tributo com juros, sem
                penalidade, e a revogação precisa acontecer antes de prescrever o crédito.
              </p>
              <p className="mt-3">
                A afirmação de que a moratória individual "não gera direito adquirido" é relevante
                para o planejamento do contribuinte: a moratória individual pode ser revogada a
                qualquer momento se as condições legais deixarem de ser satisfeitas. Isso contrasta
                com a isenção onerosa por prazo certo (Art. 178), que o STF considera irrevogável
                durante o prazo acordado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-155a" numero="Art. 155-A" titulo="Parcelamento">
            <LegalText>
              <p>O parcelamento será concedido na forma e condição estabelecidas em lei específica.</p>
              <p className="mt-3">§1º Salvo disposição de lei em contrário, o parcelamento do crédito tributário não exclui a incidência de juros e multas.</p>
              <p className="mt-1">§2º Aplicam-se, subsidiariamente, ao parcelamento as disposições desta Lei, relativas à moratória.</p>
              <p className="mt-1">§3º Lei específica disporá sobre as condições de parcelamento dos créditos tributários do devedor em recuperação judicial.</p>
              <p className="mt-1">§4º A inexistência da lei específica a que se refere o §3º deste artigo importa na aplicação das leis gerais de parcelamento do ente da Federação ao devedor em recuperação judicial, não podendo, neste caso, ser o prazo de parcelamento inferior ao concedido pela lei federal específica.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 155-A foi incluído pela LC 104/2001 para disciplinar o parcelamento como
                modalidade autônoma de suspensão da exigibilidade, distinta da moratória. A diferença
                prática essencial está no §1º: o parcelamento não exclui juros e multas, salvo
                disposição legal expressa em contrário. Programas como o REFIS, PAES, PARCELAMENTO
                ESPECIAL e, mais recentemente, o Programa de Regularização Tributária (PRT), PERT
                e Transação Tributária da Lei 13.988/2020 são formas de parcelamento que a lei
                específica pode criar com condições mais favoráveis, incluindo redução de multas
                e juros. O Art. 155-A é o fundamento legal para que leis específicas criem essas
                condições diferenciadas.
              </p>
              <p className="mt-3">
                Os §§3º e 4º são relevantes para o cruzamento entre direito tributário e direito
                empresarial. Em recuperação judicial, a empresa precisa regularizar seus passivos
                tributários, e a negociação do parcelamento é parte central do plano de recuperação.
                A Lei 11.101/2005 (Lei de Recuperação Judicial e Falências) e a Lei 13.988/2020
                (Transação Tributária) criaram instrumentos específicos para esse contexto, incluindo
                parcelamentos com prazos mais longos e descontos mais significativos para empresas
                em recuperação que comprovem viabilidade econômica.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP III — EXTINÇÃO DO CRÉDITO TRIBUTÁRIO ── */}
          <Secao id="cap-extin" titulo="Capítulo III: Extinção do Crédito Tributário" subtitulo="Arts. 156 ao 174" />

          <Artigo id="art-156" numero="Art. 156" titulo="Modalidades de Extinção do Crédito Tributário">
            <LegalText>
              <p>Extinguem o crédito tributário:</p>
              <ul className="mt-3 space-y-2 pl-4">
                <li><strong>I</strong> - o pagamento;</li>
                <li><strong>II</strong> - a compensação;</li>
                <li><strong>III</strong> - a transação;</li>
                <li><strong>IV</strong> - remissão;</li>
                <li><strong>V</strong> - a prescrição e a decadência;</li>
                <li><strong>VI</strong> - a conversão de depósito em renda;</li>
                <li><strong>VII</strong> - o pagamento antecipado e a homologação do lançamento nos termos do disposto no artigo 150 e seus §§1º e 4º;</li>
                <li><strong>VIII</strong> - a consignação em pagamento, nos termos do disposto no §2º do artigo 164;</li>
                <li><strong>IX</strong> - a decisão administrativa irreformável, assim entendida a definitiva na órbita administrativa, que não mais possa ser objeto de ação anulatória;</li>
                <li><strong>X</strong> - a decisão judicial passada em julgado;</li>
                <li><strong>XI</strong> - a dação em pagamento em bens imóveis, na forma e condições estabelecidas em lei.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 156 apresenta a lista taxativa das modalidades de extinção do crédito tributário.
                O pagamento (inciso I) é a forma natural e mais comum. A compensação (inciso II) é a
                segunda mais utilizada no contencioso tributário: o contribuinte que tem crédito
                reconhecido contra o Fisco pode abater dos tributos a pagar, operação que o STJ
                admite de forma ampla. A transação (inciso III) é a mais recente em termos de
                regulamentação efetiva: a Lei 13.988/2020 criou o programa de transação tributária
                federal, permitindo que a Receita Federal e a PGFN negociem condições de extinção
                do crédito com contribuintes em situação de dificuldade financeira ou em relação a
                teses com grau elevado de litigiosidade.
              </p>
              <p className="mt-3">
                A prescrição e a decadência (inciso V) extinguem o crédito de forma peremptória:
                a decadência impede o lançamento; a prescrição extingue o crédito já lançado se
                o Fisco não cobrar no prazo. A inclusão desses dois institutos como modalidades de
                extinção reforça que o prazo tributário não é mera defesa processual do contribuinte,
                mas extinção substantiva do direito de crédito do Fisco. A dação em pagamento em
                bens imóveis (inciso XI, incluído pela LC 104/2001) é subutilizada na prática porque
                depende de lei específica e envolve dificuldades de avaliação e liquidez dos bens
                para o ente público.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-157" numero="Art. 157" titulo="Penalidade Não Substitui o Tributo">
            <LegalText>
              <p>A imposição de penalidade não ilide o pagamento integral do crédito tributário.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 157 estabelece uma regra que parece óbvia mas tem consequências práticas
                importantes: pagar a multa não quita o tributo. O contribuinte autuado deve pagar
                tanto o tributo principal quanto a penalidade. A penalidade não é uma espécie de
                "compra do direito de não pagar o tributo"; é uma sanção adicional que coexiste
                com a obrigação de pagar o principal.
              </p>
              <p className="mt-3">
                Na prática, o Art. 157 também afasta a ideia de que a quitação da multa em um
                programa de parcelamento ou transação extingue automaticamente o tributo subjacente.
                Quando um programa como o PERT oferece redução de 100% de multas e juros para
                pagamento à vista do principal, significa que o contribuinte ainda deve pagar o
                valor integral do tributo sem os acréscimos. Redução de penalidades não equivale
                a redução do tributo. O princípio reflete a natureza jurídica distinta entre o
                tributo (obrigação principal) e a penalidade (sanção administrativa), ainda que
                o CTN os agrupe para fins de cobrança e execução.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-158" numero="Art. 158" titulo="Presunção de Pagamento">
            <LegalText>
              <p>O pagamento de um crédito não importa em presunção de pagamento:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - quando parcial, das prestações em que se decomponha;</li>
                <li><strong>II</strong> - quando total, de outros créditos referentes ao mesmo ou a outros tributos.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 158 nega a presunção de quitação integral a partir do pagamento parcial
                ou de um único crédito. Se o contribuinte paga a parcela de janeiro de um
                parcelamento de IRPJ, isso não presume o pagamento das parcelas de fevereiro,
                março e assim por diante. Se paga o IRPJ de 2022, isso não presume o pagamento
                do IRPJ de 2021 nem da CSLL de 2022.
              </p>
              <p className="mt-3">
                Na prática fiscal, o Art. 158 afasta defesas baseadas em presunção de quitação.
                Uma empresa que apresenta recibos de pagamento de IR de determinado período não
                pode presumir que tributos de períodos anteriores estejam quitados sem prova
                específica de cada pagamento. Isso também é relevante para certidões de regularidade
                fiscal (CND): a certidão negativa reflete a ausência de débitos na data de emissão,
                baseada em cruzamento de informações específico, não em qualquer presunção
                derivada de pagamentos anteriores.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-159" numero="Art. 159" titulo="Local de Pagamento">
            <LegalText>
              <p>
                Quando a legislação tributária não dispuser a respeito, o pagamento é efetuado na
                repartição competente do <strong>domicílio do sujeito passivo</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 159 é a regra supletiva de local de pagamento: na ausência de norma específica,
                paga-se na repartição fiscal competente do domicílio do sujeito passivo. Na prática
                atual, os pagamentos de tributos federais são feitos mediante DARF em qualquer agência
                bancária autorizada, via internet banking ou Pix (para o Simples Nacional via DAS),
                o que torna o critério de domicílio irrelevante para a maioria das situações práticas.
              </p>
              <p className="mt-3">
                O artigo ainda tem aplicação para algumas taxas e emolumentos cobrados diretamente
                em repartições públicas (taxas de licenciamento, emolumentos cartorários para atos
                praticados perante o Estado), onde o local de pagamento é determinado pela localização
                do serviço prestado ou da repartição competente. Para o IPTU e o ISS municipal, a
                legislação municipal específica define o local de pagamento, geralmente através de
                guias próprias pagas em rede bancária.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-160" numero="Art. 160" titulo="Prazo de Pagamento">
            <LegalText>
              <p>
                Quando a legislação tributária não fixar o tempo do pagamento, o vencimento do
                crédito ocorre <strong>trinta dias</strong> depois da data em que se considera o
                sujeito passivo notificado do lançamento.
              </p>
              <p className="mt-3">Parágrafo único. A legislação tributária pode conceder desconto pela antecipação do pagamento, nas condições que estabeleça.</p>
            </LegalText>
            <Comentario>
              <p>
                O prazo de 30 dias após a notificação é a regra geral supletiva: cada tributo tem
                seu vencimento específico definido em lei ou regulamento, e o Art. 160 só se aplica
                na ausência dessas regras específicas. Na prática, autos de infração têm prazo de
                30 dias para pagamento ou impugnação contados da notificação, o que coincide com
                a regra do Art. 160.
              </p>
              <p className="mt-3">
                O parágrafo único permite os "descontos por pontualidade" que vários entes utilizam:
                municípios que concedem desconto de 5% a 10% no IPTU para pagamento antecipado em
                cota única em janeiro; estados que oferecem desconto no IPVA para pagamento em
                cota única; programas de regularização fiscal com redução de encargos para pagamento
                à vista. Todos esses instrumentos encontram fundamento no parágrafo único do Art.
                160, que habilita o poder público a criar incentivos de pagamento antecipado sem
                que isso configure remissão irregular de crédito tributário.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-161" numero="Art. 161" titulo="Juros de Mora">
            <LegalText>
              <p>
                O crédito não integralmente pago no vencimento é acrescido de <strong>juros de mora</strong>,
                seja qual for o motivo determinante da falta, sem prejuízo da imposição das penalidades
                cabíveis e da aplicação de quaisquer medidas de garantia previstas nesta Lei ou em
                lei tributária.
              </p>
              <p className="mt-3">§1º Se a lei não dispuser de modo diverso, os juros de mora são calculados à taxa de um por cento ao mês.</p>
              <p className="mt-1">§2º O disposto neste artigo não se aplica na pendência de consulta formulada pelo sujeito passivo dentro do prazo legal para pagamento do crédito.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 161 estabelece os juros de mora sobre tributos não pagos no prazo, com caráter
                objetivo: "seja qual for o motivo determinante da falta." Dificuldades financeiras,
                disputas sobre a interpretação da lei, força maior: nenhum desses fatores afasta os
                juros de mora. Para tributos federais, a Lei 9.250/1995 substituiu a taxa de 1% ao
                mês do §1º pela taxa SELIC, que é atualizada mensalmente pelo Banco Central. Para
                tributos estaduais e municipais, cada ente define sua própria taxa, desde que não
                superior à taxa federal.
              </p>
              <p className="mt-3">
                O §2º é a proteção do contribuinte que fez uma consulta tributária formal ao Fisco
                dentro do prazo de pagamento e aguarda a resposta. Durante esse período, os juros
                de mora não correm: o contribuinte não está em mora porque está aguardando
                esclarecimento oficial sobre a própria obrigação. Essa proteção incentiva o uso
                das consultas tributárias como instrumento de segurança jurídica, evitando que o
                contribuinte que busca orientação oficial seja punido com juros pelo atraso causado
                pela demora na resposta da própria administração.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-162" numero="Art. 162" titulo="Formas de Pagamento">
            <LegalText>
              <p>O pagamento é efetuado:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - em moeda corrente, cheque ou vale postal;</li>
                <li><strong>II</strong> - nos casos previstos em lei, em estampilha, em papel selado, ou por processo mecânico.</li>
              </ul>
              <p className="mt-3">§1º A legislação tributária pode determinar as garantias exigidas para o pagamento por cheque ou vale postal, desde que não o torne impossível ou mais oneroso que o pagamento em moeda corrente.</p>
              <p className="mt-1">§2º O crédito pago por cheque somente se considera extinto com o resgate deste pelo sacado.</p>
              <p className="mt-1">§3º O crédito pagável em estampilha considera-se extinto com a inutilização regular daquela, ressalvado o disposto no artigo 150.</p>
              <p className="mt-1">§4º A perda ou destruição da estampilha, ou o erro no pagamento por esta modalidade, não dão direito a restituição, salvo nos casos expressamente previstos na legislação tributária, ou naquelas em que o erro seja imputável à autoridade administrativa.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 162 reflete a realidade tecnológica de 1966: estampilhas (selos adesivos),
                papel selado e processos mecânicos eram formas usuais de pagamento de tributos na
                época. Hoje, o pagamento de tributos federais é feito por DARF, DAS (Simples
                Nacional) ou guias eletrônicas via sistema de arrecadação bancária, e os tributos
                estaduais e municipais têm suas próprias guias eletrônicas. As referências a
                estampilhas e papel selado são curiosidades históricas.
              </p>
              <p className="mt-3">
                A regra do §2º, que exige o efetivo resgate do cheque para considerar o pagamento
                realizado, ainda tem aplicação prática. Um contribuinte que pagou guia de IPTU
                com cheque que posteriormente não foi compensado por falta de fundos não efetuou
                pagamento válido, mesmo que tenha comprovante de emissão do cheque. A Prefeitura
                pode cobrar o IPTU com juros e multa como se não houvesse pagamento. Isso é relevante
                para determinar quando o prazo de vencimento foi observado em pagamentos por cheque
                próximos do vencimento.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-163" numero="Art. 163" titulo="Imputação de Pagamento">
            <LegalText>
              <p>
                Existindo simultaneamente dois ou mais débitos vencidos do mesmo sujeito passivo
                para com a mesma pessoa jurídica de direito público, relativos ao mesmo ou a diferentes
                tributos ou provenientes de penalidades pecuniárias ou juros de mora, a autoridade
                administrativa competente para receber o pagamento determinará a respectiva imputação,
                obedecidas as seguintes regras, na ordem em que enumeradas:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - em primeiro lugar, aos débitos por obrigação própria, e em segundo lugar aos decorrentes de responsabilidade tributária;</li>
                <li><strong>II</strong> - primeiramente, às contribuições de melhoria, depois às taxas e por fim aos impostos;</li>
                <li><strong>III</strong> - na ordem crescente dos prazos de prescrição;</li>
                <li><strong>IV</strong> - na ordem decrescente dos montantes.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 163 disciplina a imputação do pagamento quando o contribuinte tem múltiplos
                débitos e efetua um pagamento que não cobre todos. A hierarquia definida pelos quatro
                incisos é cogente: o Fisco decide a imputação conforme essa ordem, e o contribuinte
                não pode escolher livremente a qual débito alocar o pagamento. Isso é diferente do
                direito civil, onde o devedor geralmente pode indicar a qual dívida o pagamento se
                destina.
              </p>
              <p className="mt-3">
                A lógica dos incisos reflete a proteção dos créditos mais importantes: obrigações
                próprias antes de responsabilidade tributária (inciso I); contribuições de melhoria
                e taxas antes de impostos, por serem contraprestativas (inciso II); créditos com
                prescrição mais próxima primeiro, para evitar que o tempo extinga-os (inciso III);
                e débitos menores antes dos maiores, presumivelmente para extinguir o maior número
                possível de obrigações com o recurso disponível (inciso IV). Na prática das execuções
                fiscais, a imputação é feita automaticamente pelos sistemas da Receita Federal ou
                do fisco estadual.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-164" numero="Art. 164" titulo="Consignação em Pagamento">
            <LegalText>
              <p>A importância de crédito tributário pode ser consignada judicialmente pelo sujeito passivo, nos casos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - de recusa de recebimento, ou subordinação deste ao pagamento de outro tributo ou de penalidade, ou ao cumprimento de obrigação acessória;</li>
                <li><strong>II</strong> - de subordinação do recebimento ao cumprimento de exigências administrativas sem fundamento legal;</li>
                <li><strong>III</strong> - de exigência, por mais de uma pessoa jurídica de direito público, de tributo idêntico sobre um mesmo fato gerador.</li>
              </ul>
              <p className="mt-3">§1º A consignação só pode versar sobre o crédito que o consignante se propõe pagar.</p>
              <p className="mt-1">§2º Julgada procedente a consignação, o pagamento se reputa efetuado e a importância consignada é convertida em renda; julgada improcedente a consignação no todo ou em parte, cobra-se o crédito acrescido de juros de mora, sem prejuízo das penalidades cabíveis.</p>
            </LegalText>
            <Comentario>
              <p>
                A consignação em pagamento tributária do Art. 164 é um mecanismo pouco usado mas
                valioso. O inciso III é o mais relevante na prática atual: quando dois municípios
                disputam o ISS sobre a mesma prestação de serviços (por exemplo, o município onde
                está o estabelecimento do prestador e o município onde o serviço é prestado),
                o contribuinte pode consignar judicialmente o valor do ISS e deixar os municípios
                litigarem entre si. Paga apenas uma vez e fica protegido de dupla cobrança.
              </p>
              <p className="mt-3">
                O inciso I abrange situação menos comum mas que ocorre: o Fisco condicionando o
                recebimento de um tributo ao pagamento de outro que o contribuinte contesta.
                Nesses casos, o contribuinte que quer pagar o que admite dever pode consignar
                judicialmente o valor que entende correto, forçando o Fisco a receber sem a
                condição ilegal. O §1º limita a consignação ao valor que o consignante se propõe
                pagar: o instrumento não é para discutir se o tributo é devido, mas para resolver
                impasse sobre como ou a quem pagar o que é admitido como devido.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-165" numero="Art. 165" titulo="Restituição do Indébito Tributário">
            <LegalText>
              <p>O sujeito passivo tem direito, independentemente de prévio protesto, à restituição total ou parcial do tributo, seja qual for a modalidade do seu pagamento, ressalvado o disposto no §4º do artigo 162, nos seguintes casos:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - cobrança ou pagamento espontâneo de tributo indevido ou maior que o devido em face da legislação tributária aplicável, ou da natureza ou circunstâncias materiais do fato gerador efetivamente ocorrido;</li>
                <li><strong>II</strong> - erro na edificação do sujeito passivo, na determinação da alíquota aplicável, no cálculo do montante do débito ou na elaboração ou conferência de qualquer documento relativo ao pagamento;</li>
                <li><strong>III</strong> - reforma, anulação, revogação ou rescisão de decisão condenatória.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O direito à restituição do indébito tributário é o fundamento do que os contribuintes
                chamam de "tese tributária": quando o STF ou STJ decide que determinado tributo era
                indevido (por exemplo, ICMS não integra a base de cálculo do PIS/Cofins, como no
                RE 574.706, Tema 69), os contribuintes que pagaram esse tributo indevido têm direito
                à restituição com base no Art. 165. Não precisam ter feito protesto prévio ao pagar;
                basta demonstrar que o pagamento era indevido.
              </p>
              <p className="mt-3">
                O inciso I cobre tanto a cobrança indevida pelo Fisco quanto o pagamento espontâneo
                a maior pelo próprio contribuinte (erro no DARF, alíquota maior do que a devida
                aplicada no SPED, por exemplo). O inciso III é o caso em que um auto de infração
                que gerou pagamento foi posteriormente anulado em decisão administrativa ou judicial
                definitiva: o contribuinte que pagou para evitar autuação ou para liberar certidão
                tem direito à restituição quando a decisão que fundamentou a cobrança é revertida.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-166" numero="Art. 166" titulo="Restituição de Tributos Indiretos">
            <LegalText>
              <p>
                A restituição de tributos que comportem, por sua natureza, transferência do respectivo
                encargo financeiro somente será feita a quem prove haver assumido o referido encargo,
                ou, no caso de tê-lo transferido a terceiro, <strong>estar por este expressamente
                autorizado</strong> a recebê-la.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 166 é um dos artigos mais controversos do CTN. Para tributos indiretos, como
                IPI e ICMS, cujo encargo econômico é repassado ao consumidor final via preço, a
                restituição só é devida a quem efetivamente suportou o ônus, não ao contribuinte
                de direito que simplesmente recolheu o valor ao Fisco mas o recuperou no preço.
                Isso criou a "tese da impossibilidade de restituição de tributos indiretos", muito
                usada pelo Fisco para negar pedidos de restituição de ICMS e IPI.
              </p>
              <p className="mt-3">
                O STJ evoluiu na interpretação do Art. 166. A Súmula 461 confirma o direito de
                compensação para tributos diretos sem essas limitações. Para o ICMS-ST recolhido
                a maior (por exemplo, quando o preço final de venda ao consumidor foi inferior
                ao presumido para cálculo da substituição tributária), o STF no RE 593.849 (Tema 201)
                reconheceu o direito à restituição, entendendo que o contribuinte substituído
                que vendeu a preço menor suportou efetivamente o encargo do ICMS a maior, sendo
                legitimado à restituição sem a restrição do Art. 166.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-167" numero="Art. 167" titulo="Juros sobre a Restituição">
            <LegalText>
              <p>
                A restituição total ou parcial do tributo dá lugar à restituição, na mesma proporção,
                dos juros de mora e das penalidades pecuniárias, salvo as referentes a infrações de
                caráter formal não prejudicadas pela causa da restituição.
              </p>
              <p className="mt-3">Parágrafo único. A restituição vence juros não capitalizáveis, a partir do trânsito em julgado da decisão definitiva que a determinar.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 167 garante que a restituição do tributo pago indevidamente vem acompanhada
                da restituição proporcional dos encargos que o acompanharam: juros de mora e
                penalidades pecuniárias pagas junto com o tributo indevido são igualmente devolvidos.
                A exceção para infrações formais não relacionadas à causa da restituição é relevante:
                se o contribuinte pagou multa por entrega atrasada da DCTF além do IRPJ que se
                revelou indevido, apenas o IRPJ e os encargos sobre ele são restituídos; a multa
                pelo atraso na entrega da declaração não é restituída porque essa infração foi
                independente da irregularidade no lançamento do IRPJ.
              </p>
              <p className="mt-3">
                O parágrafo único determina que a restituição em si vence juros contados do trânsito
                em julgado da decisão definitiva. Para tributos federais, esses juros são calculados
                à taxa SELIC (Lei 9.250/1995 e Lei 9.532/1997). O STJ firmou no Tema 905 que a
                taxa SELIC é aplicável tanto aos débitos do contribuinte para com o Fisco quanto
                aos créditos do contribuinte contra o Fisco, mantendo uma simetria nas taxas de
                atualização em ambas as direções.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-168" numero="Art. 168" titulo="Prazo para Pleitear a Restituição">
            <LegalText>
              <p>O direito de pleitear a restituição extingue-se com o decurso do prazo de <strong>5 anos</strong>, contados:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - nas hipóteses dos incisos I e II do artigo 165, da data da extinção do crédito tributário;</li>
                <li><strong>II</strong> - na hipótese do inciso III do artigo 165, da data em que se tornar definitiva a decisão administrativa ou passar em julgado a decisão judicial que tenha reformado, anulado, revogado ou rescindido a decisão condenatória.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O prazo de 5 anos para pedir restituição corre, no caso do inciso I, da data da
                extinção do crédito, que no lançamento por homologação é a data do pagamento
                antecipado (conforme o Art. 150, §1º). Isso é o que o STJ fixou no Tema 169,
                superando a antiga "tese dos cinco mais cinco": não há prazo de 5 anos contados
                da homologação tácita adicionados a mais 5 anos do Art. 168. O prazo de 5 anos
                conta simplesmente da data do pagamento.
              </p>
              <p className="mt-3">
                Para o inciso II, o prazo de 5 anos começa quando a decisão de anulação do crédito
                se torna definitiva. Um contribuinte que pagou CSLL com base em auto de infração
                e teve o auto anulado pelo CARF em 2024 tem até 2029 para pedir a restituição
                do que pagou. Esse prazo não se confunde com o prazo de prescrição da ação judicial
                de repetição de indébito, que o Art. 169 distingue. A extinção do direito prevista
                no Art. 168 opera tanto na via administrativa (PER/DCOMP) quanto na via judicial
                (ação de repetição de indébito).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-169" numero="Art. 169" titulo="Ação Anulatória de Decisão Administrativa Denegatória">
            <LegalText>
              <p>Prescreve em <strong>dois anos</strong> a ação anulatória da decisão administrativa que denegar a restituição.</p>
              <p className="mt-3">Parágrafo único. O prazo de prescrição é interrompido pelo início da ação judicial, recomeçando o seu curso, por metade, a partir da data da intimação validamente feita ao representante judicial da Fazenda Pública interessada.</p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 169 disciplina o prazo para a ação judicial quando o pedido administrativo
                de restituição foi negado pelo Fisco. O contribuinte tem dois caminhos para pedir
                a restituição: diretamente pela via judicial (respeitando o prazo de 5 anos do Art.
                168) ou pela via administrativa primeiro (PER/DCOMP) e, se negado, pela via judicial
                no prazo de 2 anos do Art. 169. A vantagem da via administrativa prévia é que,
                ao tentar administrativamente, o contribuinte interrompe o prazo do Art. 168 durante
                o processamento do pedido, conforme o STJ tem entendido.
              </p>
              <p className="mt-3">
                O parágrafo único traz uma peculiaridade: o prazo de 2 anos é interrompido pelo
                ajuizamento da ação e recomeça a correr pela metade (1 ano) após a intimação da
                Fazenda. Esse mecanismo de reinício pela metade reflete a lógica de que, uma vez
                iniciada a ação judicial, a Fazenda tem ciência do pleito e o contribuinte não
                precisa de tanto tempo para prosseguir no processo. O STJ aplica essa regra nos
                processos de ação anulatória de débito fiscal movida após negativa administrativa,
                diferenciando-a dos prazos gerais de prescrição da ação de repetição de indébito.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-170" numero="Art. 170" titulo="Compensação Tributária">
            <LegalText>
              <p>
                A lei pode, nas condições e sob as garantias que estipular, ou cuja estipulação em
                cada caso atribuir à autoridade administrativa, autorizar a{" "}
                <strong>compensação de créditos tributários com créditos líquidos e certos, vencidos
                ou vincendos</strong>, do sujeito passivo contra a Fazenda Pública.
              </p>
              <p className="mt-3">Parágrafo único. Sendo vincendo o crédito do sujeito passivo, a lei determinará, para os efeitos deste artigo, a apuração do seu montante, não podendo, porém, cominar redução maior que a correspondente ao juro de 1% (um por cento) ao mês pelo tempo a decorrer entre a data da compensação e o vencimento.</p>
            </LegalText>
            <Comentario>
              <p>
                A compensação tributária é um dos institutos mais utilizados no planejamento e
                na recuperação de créditos fiscais. Quando o contribuinte tem um crédito líquido
                e certo contra o Fisco (por exemplo, saldo credor de PIS/Cofins, IR pago a maior
                na fonte ou restituição reconhecida) pode usar esse crédito para abater tributos
                correntes, em vez de pedir restituição em dinheiro. O Art. 170 condiciona a
                compensação à autorização legal específica e às garantias que a lei estipular.
              </p>
              <p className="mt-3">
                A Lei 9.430/1996 regulamentou a compensação federal, permitindo ao contribuinte
                utilizar créditos de qualquer tributo administrado pela Receita Federal para
                compensar débitos de outros tributos da mesma administração. O PER/DCOMP
                (Pedido de Restituição, Ressarcimento ou Reembolso e Declaração de Compensação)
                é o instrumento administrativo para exercer esse direito. A compensação produz
                efeitos extinção do crédito desde a data da entrega da declaração, mas fica
                sujeita à homologação posterior pela Receita Federal: se a Receita não homologar
                (por entender que o crédito não era válido), o contribuinte volta a dever o
                tributo com juros e multa. O STJ na Súmula 461 confirmou que o crédito reconhecido
                por sentença judicial pode ser compensado imediatamente, sem necessidade de aguardar
                o trânsito em julgado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-171" numero="Art. 171" titulo="Transação">
            <LegalText>
              <p>
                A lei pode facultar, nas condições que estabeleça, aos sujeitos ativo e passivo da
                obrigação tributária celebrar{" "}
                <strong>transação que, mediante concessões mútuas, importe em terminação de litígio</strong>{" "}
                e consequente extinção de crédito tributário.
              </p>
              <p className="mt-3">Parágrafo único. A lei indicará a autoridade competente para autorizar a transação em cada caso.</p>
            </LegalText>
            <Comentario>
              <p>
                A transação tributária ficou durante décadas praticamente letra morta no CTN, pois
                exige lei específica e envolve concessões mútuas, algo que as Fazendas Públicas
                resistiam por temer precedentes de renúncia de receita. A mudança de paradigma veio
                com a Lei 13.988/2020, que instituiu a Transação Tributária Federal, operada pela
                PGFN e pela Receita Federal. O programa permite que contribuintes com dívidas em
                grau elevado de litigiosidade ou em situação de dificuldade financeira negociem
                descontos em multas, juros e encargos em troca da quitação do principal.
              </p>
              <p className="mt-3">
                A diferença estrutural entre transação e remissão é importante. Na remissão (Art.
                172), o Fisco cede unilateralmente, por decisão de autoridade competente, sem exigir
                contrapartida do contribuinte. Na transação, há concessões de ambas as partes: o
                Fisco reduz encargos ou aceita parcelamento mais favorável, e o contribuinte
                reconhece o débito e se compromete com o pagamento. Por isso, a transação extingue
                litígio, não apenas o crédito: ela encerra a controvérsia administrativa ou judicial
                sobre a exigibilidade. O parágrafo único reforça que a competência para transacionar
                não é de qualquer agente, mas de autoridade expressamente indicada pela lei, evitando
                que negociações informais ocorram fora dos programas legalmente autorizados.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-172" numero="Art. 172" titulo="Remissão">
            <LegalText>
              <p>
                A lei pode autorizar a autoridade administrativa a conceder, por despacho fundamentado,{" "}
                <strong>remissão total ou parcial do crédito tributário</strong>, atendendo:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - à situação econômica do sujeito passivo;</li>
                <li><strong>II</strong> - ao erro ou ignorância excusáveis do sujeito passivo, quanto a matéria de fato;</li>
                <li><strong>III</strong> - à diminuta importância do crédito tributário;</li>
                <li><strong>IV</strong> - a considerações de equidade, em relação com as características pessoais ou materiais do caso;</li>
                <li><strong>V</strong> - a condições peculiares a determinada região do território da entidade tributante.</li>
              </ul>
              <p className="mt-3">Parágrafo único. O despacho referido neste artigo não gera direito adquirido, aplicando-se, quando cabível, o disposto no artigo 155.</p>
            </LegalText>
            <Comentario>
              <p>
                A remissão é o perdão total ou parcial do crédito tributário já constituído. Ao
                contrário da moratória (que adia o pagamento) e da transação (que exige concessões
                mútuas), a remissão é unilateral: o Fisco perdoa a dívida sem exigir contrapartida,
                por razões de equidade ou política pública. O Art. 172 não concede a remissão
                diretamente, mas autoriza a lei ordinária a criar esse poder para a autoridade
                administrativa, dentro dos cinco critérios listados nos incisos.
              </p>
              <p className="mt-3">
                O inciso III tem grande aplicação prática. A maioria dos entes públicos possui normas
                de dispensa de cobrança de créditos de pequeno valor: a Receita Federal, por portaria,
                não ajuíza execução fiscal abaixo de R$ 20 mil, e muitos municípios têm limites
                ainda mais baixos para o IPTU. Essa decisão combina o inciso III do Art. 172 com
                uma análise de custo-benefício da cobrança. O inciso II abrange os casos de erro
                escusável sobre fato, como o contribuinte que pagou o tributo com base em informação
                incorreta prestada pelo próprio Fisco. O parágrafo único é coerente com o regime
                geral: o despacho de remissão individual não gera direito adquirido e pode ser
                revogado se as condições que o fundamentaram deixarem de existir, sujeitando o
                beneficiado às mesmas regras do Art. 155.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-173" numero="Art. 173" titulo="Decadência: Prazo para Constituição do Crédito">
            <LegalText>
              <p>
                O direito de a Fazenda Pública constituir o crédito tributário extingue-se após{" "}
                <strong>5 (cinco) anos</strong>, contados:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - do primeiro dia do exercício seguinte àquele em que o lançamento
                  poderia ter sido efetuado;
                </li>
                <li>
                  <strong>II</strong> - da data em que se tornar definitiva a decisão que houver
                  anulado, por vício formal, o lançamento anteriormente efetuado.
                </li>
              </ul>
              <p className="mt-3">
                Parágrafo único. O direito a que se refere este artigo extingue-se definitivamente
                com o decurso do prazo nele previsto, contado da data em que tenha sido iniciada a
                constituição do crédito tributário pela notificação, ao sujeito passivo, de qualquer
                medida preparatória indispensável ao lançamento.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A decadência do Art. 173 é o prazo que o Fisco tem para lançar o crédito tributário.
                Decorrido esse prazo sem lançamento, o direito de cobrar se extingue definitivamente
                e não pode ser reconstituído. A decadência atinge o direito de lançar; a prescrição
                (Art. 174) atinge o direito de cobrar o crédito já lançado. São momentos sucessivos:
                só há prescrição se antes houver lançamento; se o lançamento não ocorreu no prazo
                decadencial, a questão nem chega à prescrição.
              </p>
              <p className="mt-3">
                Para tributos lançados de ofício ou por declaração, a contagem do inciso I começa
                no primeiro dia do exercício seguinte ao do fato gerador. Para um fato gerador
                ocorrido em março de 2019, o prazo começa em 1º de janeiro de 2020 e encerra em
                31 de dezembro de 2024. Para tributos sujeitos a lançamento por homologação (Art.
                150), o STJ firmou no Tema 169 que o Art. 150, §4º é o marco inicial (5 anos
                contados do fato gerador), e o Art. 173, I só prevalece nos casos de dolo, fraude
                ou simulação, ou quando não houve pagamento antecipado algum.
              </p>
              <p className="mt-3">
                O inciso II prevê que, se um lançamento é anulado por vício formal em decisão
                definitiva, o Fisco tem mais 5 anos contados dessa decisão para refazer o lançamento
                sem o vício. Esse prazo é intransferível: o Fisco não pode usar anulações sucessivas
                como mecanismo para perpetuar indefinidamente o direito de lançar. O parágrafo único
                esclarece que a mera notificação de medida preparatória ao lançamento não interrompe
                nem suspende o prazo decadencial, que se extingue definitivamente ao término dos
                5 anos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-174" numero="Art. 174" titulo="Prescrição: Prazo para Cobrança do Crédito">
            <LegalText>
              <p>
                A ação para a cobrança do crédito tributário prescreve em{" "}
                <strong>5 (cinco) anos</strong>, contados da data da sua{" "}
                <strong>constituição definitiva</strong>.
              </p>
              <p className="mt-3">Parágrafo único. A prescrição se interrompe:</p>
              <ul className="mt-2 space-y-1 pl-4">
                <li><strong>I</strong> - pelo despacho do juiz que ordenar a citação em execução fiscal;</li>
                <li><strong>II</strong> - pelo protesto judicial;</li>
                <li><strong>III</strong> - por qualquer ato judicial que constitua em mora o devedor;</li>
                <li><strong>IV</strong> - por qualquer ato inequívoco ainda que extrajudicial, que importe em reconhecimento do débito pelo devedor.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A prescrição do Art. 174 é o prazo que a Fazenda Pública tem para cobrar
                judicialmente o crédito já lançado. O marco inicial é a "constituição definitiva"
                do crédito, que ocorre quando o lançamento se torna exigível sem possibilidade de
                recurso administrativo com efeito suspensivo: em regra, quando transcorre o prazo
                de 30 dias para impugnação sem que ela seja apresentada, ou quando a decisão
                administrativa definitiva confirma o crédito. O prazo prescricional de 5 anos
                corre a partir daí; se o Fisco não ajuizar a execução fiscal nesse período, o
                crédito se extingue.
              </p>
              <p className="mt-3">
                A LC 118/2005 alterou o inciso I para determinar que o despacho do juiz que ordena
                a citação (e não a citação efetivada) interrompe a prescrição. Essa mudança foi
                relevante porque, em execuções fiscais ajuizadas próximo ao fim do prazo prescricional,
                os contribuintes argumentavam que a demora do Fisco em promover a citação impedia
                a interrupção. Com a redação atual, o ajuizamento da execução e o despacho inicial
                já produzem a interrupção, independentemente de quando a citação é efetivada.
              </p>
              <p className="mt-3">
                O inciso IV tem aplicação frequente: a adesão a programa de parcelamento é ato
                inequívoco de reconhecimento do débito e interrompe a prescrição, reiniciando o
                prazo do zero a partir da data da adesão. Isso significa que contribuintes que
                aderem a parcelamentos e depois os abandonam podem se surpreender com créditos
                tributários que, sem a interrupção, já teriam prescrito. A declaração de compensação
                (DCOMP) que reconhece o débito a ser compensado também pode ter esse efeito
                interruptivo, conforme entendimento do STJ.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP V — EXCLUSÃO DO CRÉDITO TRIBUTÁRIO ── */}
          <Secao id="cap-exclu" titulo="Capítulo V: Exclusão do Crédito Tributário" subtitulo="Arts. 175 ao 182" />

          <Artigo id="art-175" numero="Art. 175" titulo="Hipóteses de Exclusão do Crédito Tributário">
            <LegalText>
              <p>Excluem o crédito tributário:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - a isenção;</li>
                <li><strong>II</strong> - a anistia.</li>
              </ul>
              <p className="mt-3">
                Parágrafo único. A exclusão do crédito tributário não dispensa o cumprimento das
                obrigações acessórias dependentes da obrigação principal cujo crédito seja excluído,
                ou dela consequentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A exclusão do crédito tributário é estruturalmente diferente da extinção (Art. 156):
                na extinção, o crédito já foi constituído e é eliminado; na exclusão, o crédito sequer
                chega a se constituir. A lei impede sua formação desde a origem. A isenção atua sobre
                o tributo (excluindo o crédito do tributo principal); a anistia atua sobre as
                penalidades (excluindo o crédito das multas decorrentes de infrações cometidas
                antes da lei que a concede).
              </p>
              <p className="mt-3">
                O parágrafo único reproduz a lógica já presente nos Arts. 151 e 155: a exclusão
                beneficia o crédito tributário principal, não a relação jurídica tributária como
                um todo. O contribuinte isento de ICMS, por exemplo, ainda deve emitir notas
                fiscais, escriturar o livro de saídas e entregar o SPED Fiscal. O descumprimento
                das obrigações acessórias pode gerar penalidades, ainda que o tributo principal
                esteja excluído. Essa separação é relevante nas fiscalizações: o Fisco pode autuar
                um contribuinte isento pela falta de escrituração, mesmo que não possa cobrar
                o tributo em si.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-isenc" titulo="Seção II: Isenção" subtitulo="Arts. 176 ao 179" />

          <Artigo id="art-176" numero="Art. 176" titulo="Isenção: Conceito e Requisitos Legais">
            <LegalText>
              <p>
                A isenção, ainda quando prevista em contrato, é sempre decorrente de{" "}
                <strong>lei que especifique</strong> as condições e requisitos exigidos para a sua
                concessão, os tributos a que se aplica e, sendo caso, o prazo de sua duração.
              </p>
              <p className="mt-3">
                Parágrafo único. A isenção pode ser restrita a determinada região do território
                da entidade tributante, em função de condições a ela peculiares.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 176 é a expressão do princípio da legalidade aplicado à isenção: não há
                isenção sem lei que a preveja e que especifique os tributos alcançados, as condições
                para a concessão e, quando temporária, o prazo de duração. A referência à isenção
                "prevista em contrato" é relevante historicamente: governos estaduais costumavam
                firmar contratos de incentivo fiscal com empresas que se instalavam no estado,
                prometendo isenção de ICMS em troca de investimentos e empregos. O Art. 176 deixa
                claro que esses contratos não criam a isenção por si sós; eles apenas evidenciam
                a isenção que precisa necessariamente estar prevista em lei. O contrato sem lei
                habilitante não tem valor para fins de exclusão do crédito tributário.
              </p>
              <p className="mt-3">
                O parágrafo único permite as isenções regionais, instrumento de política de
                desenvolvimento territorial. Municípios criam zonas de desenvolvimento econômico
                com isenção de ISS para startups; estados isentam de ICMS regiões afetadas por
                calamidades; a Zona Franca de Manaus tem regime diferenciado de IPI e ICMS com
                fundamento na CF/88 (art. 40 do ADCT) e legislação específica, exatamente porque
                "condições peculiares" da região amazônica justificam tratamento tributário distinto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-177" numero="Art. 177" titulo="Isenção: Não Extensão a Outros Tributos">
            <LegalText>
              <p>Salvo disposição de lei em contrário, a isenção não é extensiva:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - às taxas e às contribuições de melhoria;</li>
                <li><strong>II</strong> - aos tributos instituídos posteriormente à sua concessão.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 177 estabelece que a isenção tem efeito pontual e não se propaga
                automaticamente a outros tributos. O inciso I é direto: uma isenção de imposto
                municipal não abrange taxas municipais de licença, alvará ou limpeza pública,
                nem contribuições de melhoria. Se uma lei municipal isenta determinada atividade
                do ISS, o contribuinte ainda paga a taxa de funcionamento. A extensão exige
                disposição legal expressa.
              </p>
              <p className="mt-3">
                O inciso II é especialmente relevante no contexto da Reforma Tributária. Com a
                LC 214/2025 criando o IBS e a CBS em substituição ao ICMS, ao ISS, ao PIS e à
                Cofins, as isenções concedidas antes da vigência do novo sistema não se estendem
                automaticamente ao IBS e à CBS. Cada benefício fiscal existente precisará ser
                avaliado e, se mantido no novo sistema, expressamente previsto na legislação do
                IBS/CBS. A LC 214/2025 tratou dessa questão estabelecendo um regime de transição
                para os benefícios fiscais vigentes, mas o Art. 177, II é o fundamento de que a
                omissão do novo sistema quanto a um benefício anterior equivale a não extensão.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-178" numero="Art. 178" titulo="Isenção: Revogabilidade">
            <LegalText>
              <p>
                A isenção, salvo se concedida por prazo certo e em função de determinadas condições,
                pode ser <strong>revogada ou modificada por lei, a qualquer tempo</strong>, observado
                o disposto no inciso III do artigo 104.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 178 é o ponto central do debate sobre direito adquirido em matéria de
                isenção. A regra geral é clara: a isenção pode ser revogada a qualquer tempo
                por lei. Uma isenção simples de IPTU, concedida sem prazo e sem condições, pode
                ser eliminada pela Câmara Municipal no exercício seguinte, sem indenização e sem
                que o contribuinte tenha direito de questionar a revogação.
              </p>
              <p className="mt-3">
                A exceção, porém, é o que define a jurisprudência tributária moderna. A isenção
                "onerosa" (concedida por prazo certo e em função de condições específicas) não
                pode ser revogada antes do término do prazo, sob pena de violação do direito
                adquirido e do princípio da proteção da confiança legítima. O STF consagrou
                esse entendimento nas Súmulas 544 e 545. O exemplo clássico são os contratos
                de investimento com estados: uma empresa que recebeu isenção de ICMS por 10 anos
                em troca de construir uma fábrica e gerar empregos tem direito à manutenção do
                benefício pelo prazo contratado. Se o estado revogar a isenção no 5º ano por
                lei nova, o contribuinte pode continuar usufruindo do benefício até o prazo
                original, independentemente da revogação legislativa.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-179" numero="Art. 179" titulo="Isenção Individual: Reconhecimento e Renovação">
            <LegalText>
              <p>
                A isenção, quando não concedida em caráter geral, é efetivada, em cada caso,{" "}
                <strong>por despacho da autoridade administrativa</strong>, em requerimento com o
                qual o interessado faça prova do preenchimento das condições e do cumprimento dos
                requisitos previstos em lei ou contrato para sua concessão.
              </p>
              <p className="mt-3">
                §1º Tratando-se de tributo lançado por período certo de tempo, o despacho referido
                neste artigo será renovado antes da expiração de cada período, cessando
                automaticamente os seus efeitos a partir do primeiro dia do período para o qual
                o interessado deixar de promover a continuidade do reconhecimento da isenção.
              </p>
              <p className="mt-1">
                §2º O despacho referido neste artigo não gera direito adquirido, aplicando-se,
                quando cabível, o disposto no artigo 155.
              </p>
            </LegalText>
            <Comentario>
              <p>
                As isenções individuais exigem um ato administrativo de reconhecimento emitido
                após requerimento do contribuinte com prova dos requisitos legais. São exemplos
                frequentes: a isenção de IPI na compra de automóvel por pessoa com deficiência
                (Lei 8.989/1995), a isenção de IR sobre proventos de portadores de doenças graves
                especificadas em lei (Art. 6º da Lei 7.713/1988), e a isenção de IPTU para
                imóveis de entidades sem fins lucrativos que atendem aos requisitos municipais.
                Em todos esses casos, o contribuinte precisa apresentar documentação e aguardar
                despacho favorável da autoridade; não pode simplesmente deixar de pagar o tributo.
              </p>
              <p className="mt-3">
                O §1º é importante para isenções de tributos periódicos como IPTU e IPVA. A
                isenção individual não é eterna: precisa ser renovada antes de cada período de
                apuração. O contribuinte isento de IPTU por ser portador de doença grave precisa
                renovar o requerimento periodicamente perante a Prefeitura. Se deixar de renovar,
                a isenção cessa automaticamente no início do exercício seguinte, e o tributo passa
                a ser exigível sem necessidade de notificação específica para a revogação. O §2º
                fecha o regime: o despacho de reconhecimento individual não gera direito adquirido.
                Se as condições que o fundamentaram deixarem de existir, o Fisco revoga o ato e
                restaura a exigibilidade do tributo.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-anis" titulo="Seção III: Anistia" subtitulo="Arts. 180 ao 182" />

          <Artigo id="art-180" numero="Art. 180" titulo="Anistia: Infrações Abrangidas">
            <LegalText>
              <p>
                A anistia abrange exclusivamente as{" "}
                <strong>infrações cometidas anteriormente à vigência da lei</strong> que a concede,
                não se aplicando:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - aos atos qualificados em lei como crimes ou contravenções
                  e aos que, mesmo sem essa qualificação, sejam praticados com dolo, fraude ou
                  simulação pelo sujeito passivo ou por terceiro em benefício daquele;
                </li>
                <li>
                  <strong>II</strong> - salvo disposição em contrário, às infrações resultantes
                  de conluio entre duas ou mais pessoas naturais ou jurídicas.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                A anistia exclui o crédito das penalidades tributárias por infrações cometidas
                antes da lei que a concede. Diferencia-se da remissão (que perdoa o tributo
                principal) e da isenção (que afasta a constituição de crédito futuro). Os programas
                de regularização fiscal como REFIS, PERT e a Transação Tributária são formas de
                anistia parcial das multas combinada com parcelamento do principal: o contribuinte
                paga o tributo, mas com redução ou eliminação das multas de ofício e de mora.
                Por isso esses programas dependem de lei específica que autorize a anistia.
              </p>
              <p className="mt-3">
                O inciso I preserva a seriedade do sistema: crimes tributários (sonegação fiscal,
                nos termos dos Arts. 1º e 2º da Lei 8.137/1990), lavagem de dinheiro com origem
                em evasão fiscal, e atos praticados com dolo ou simulação não são anistiados.
                A anistia tributária não é um instrumento de impunidade para sonegadores: é um
                mecanismo de regularização para contribuintes que descumpriram obrigações acessórias,
                cometeram erros formais ou atrasaram pagamentos sem dolo. O inciso II veda a
                anistia de infrações oriundas de conluio entre partes, salvo lei expressa em
                contrário, o que cobre casos como o cartel de fornecedores que combinam subfaturar
                notas para reduzir a base tributável de um beneficiário comum. A anistia tem efeito
                retroativo estritamente limitado: infrações cometidas após a vigência da lei não
                são alcançadas, mesmo que do mesmo tipo das anteriores anistiadas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-181" numero="Art. 181" titulo="Anistia: Formas de Concessão">
            <LegalText>
              <p>A anistia pode ser concedida:</p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - em caráter geral;</li>
                <li>
                  <strong>II</strong> - limitadamente:
                  <ul className="mt-2 space-y-1 pl-4">
                    <li>a) às infrações da legislação relativa a determinado tributo;</li>
                    <li>b) às infrações punidas com penalidades pecuniárias até determinado montante, conjugadas ou não com penalidades de outra natureza;</li>
                    <li>c) a determinada região do território da entidade tributante, em função de condições a ela peculiares;</li>
                    <li>d) sob condição do pagamento de tributo no prazo fixado pela lei que a conceder, ou cuja fixação seja atribuída pela mesma lei à autoridade administrativa.</li>
                  </ul>
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 181 espelha para a anistia a mesma bipartição da moratória do Art. 152:
                concessão em caráter geral (por lei, sem necessidade de requerimento individual)
                ou limitada a categorias específicas. A anistia geral é a mais comum nos grandes
                programas de regularização fiscal: quando a lei federal concede anistia das multas
                de mora para contribuintes que aderirem ao REFIS ou ao PERT, todos os que
                preencherem os requisitos são automaticamente abrangidos, sem precisar de despacho
                individual para cada contribuinte.
              </p>
              <p className="mt-3">
                As modalidades limitadas do inciso II permitem calibrar a anistia com precisão.
                A alínea b permite limitar a anistia às multas até determinado valor, evitando
                que grandes sonegadores se beneficiem no mesmo grau que pequenos contribuintes
                com infrações menores. A alínea d é a mais relevante na prática dos programas
                modernos: a anistia condicionada ao pagamento do tributo. O contribuinte não é
                anistiado automaticamente; precisa aderir ao programa, confessar o débito e pagar
                (à vista ou parcelado). Se não cumprir o pagamento, perde o benefício e os encargos
                retornam integralmente. É o modelo do PERT (Lei 13.496/2017) e da Transação
                Tributária (Lei 13.988/2020) para os casos em que a lei autoriza redução de multas
                condicionada à quitação do principal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-182" numero="Art. 182" titulo="Anistia Individual">
            <LegalText>
              <p>
                A anistia, quando não concedida em caráter geral, é efetivada, em cada caso,{" "}
                <strong>por despacho da autoridade administrativa</strong>, em requerimento com o
                qual o interessado faça prova do preenchimento das condições e do cumprimento dos
                requisitos previstos em lei para sua concessão.
              </p>
              <p className="mt-3">
                Parágrafo único. O despacho referido neste artigo não gera direito adquirido,
                aplicando-se, quando cabível, o disposto no artigo 155.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 182 é o paralelo da isenção individual do Art. 179, agora para a anistia:
                quando não concedida em caráter geral, exige requerimento do contribuinte com prova
                dos requisitos. Na prática dos programas modernos de regularização fiscal, a
                anistia individual se materializa no ato de adesão ao programa e na análise da
                situação específica do contribuinte pela autoridade fiscal. A PGFN, por exemplo,
                avalia o grau de recuperabilidade do crédito antes de definir o percentual de
                desconto na transação: créditos classificados como irrecuperáveis têm descontos
                maiores do que créditos de alta recuperabilidade, exatamente porque a transação
                individual considera as circunstâncias concretas de cada devedor.
              </p>
              <p className="mt-3">
                O parágrafo único fecha o ciclo com a regra geral aplicável a todos os benefícios
                fiscais individuais no CTN: o despacho de anistia não gera direito adquirido. Se
                o contribuinte descumprir as condições da anistia (deixar de pagar as parcelas,
                perder a regularidade fiscal posterior exigida pelo programa), a anistia é revogada
                e os encargos que ela havia excluído retornam, nos termos do Art. 155. Essa regra
                é fundamental para a seriedade dos programas de regularização: a adesão não é um
                cheque em branco para descumprir obrigações futuras.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP VI — GARANTIAS E PRIVILÉGIOS DO CRÉDITO TRIBUTÁRIO ── */}
          <Secao id="cap-garan" titulo="Capítulo VI: Garantias e Privilégios do Crédito Tributário" subtitulo="Arts. 183 ao 193" />

          <Artigo id="art-183" numero="Art. 183" titulo="Garantias do Crédito Tributário: Extensão">
            <LegalText>
              <p>
                A enumeração das garantias atribuídas neste Capítulo ao crédito tributário não
                exclui outras que sejam{" "}
                <strong>expressamente previstas em lei</strong>, em função da natureza ou das
                características do tributo a que se refiram.
              </p>
              <p className="mt-3">
                Parágrafo único. A natureza das garantias atribuídas ao crédito tributário não
                altera a natureza deste nem a da obrigação tributária a que corresponda.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 183 abre o capítulo com uma norma de abertura: o rol de garantias do Cap.
                VI é exemplificativo, não taxativo. A lei pode criar garantias adicionais em função
                das características específicas de cada tributo. Isso habilitou a criação de
                mecanismos extravagantes de proteção do crédito fiscal: o arrolamento
                administrativo de bens (Lei 9.532/1997, arts. 64 e 64-A), que registra
                automaticamente penhora nos bens do contribuinte em débito acima de R$ 2 milhões;
                a medida cautelar fiscal (Lei 8.397/1991), que permite ao Fisco pedir ao juiz o
                bloqueio preventivo de bens antes mesmo de ajuizar a execução; e o protesto
                extrajudicial da certidão de dívida ativa (Lei 9.492/1997, art. 1º), que
                permite ao Fisco inscrever o devedor em cartório como forma de pressão para
                pagamento.
              </p>
              <p className="mt-3">
                O parágrafo único é uma norma de pureza jurídica: o fato de o crédito tributário
                ter garantias especiais não transforma o tributo em algo diferente. O IPTU com
                preferência sobre créditos quirografários continua sendo imposto sobre propriedade;
                a multa com arrolamento de bens continua sendo penalidade pecuniária. As garantias
                são instrumentos de cobrança, não elementos que alteram a natureza jurídica da
                obrigação tributária subjacente. Essa distinção importa especialmente em falências,
                onde a natureza do crédito define a ordem de preferência no pagamento.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-184" numero="Art. 184" titulo="Bens Sujeitos à Garantia do Crédito Tributário">
            <LegalText>
              <p>
                Sem prejuízo dos privilégios especiais sobre determinados bens, que sejam
                expressamente previstos em lei, responde pelo pagamento do crédito tributário a{" "}
                <strong>totalidade dos bens e das rendas, de qualquer origem ou natureza</strong>,
                do sujeito passivo, seu espólio ou sua massa falida, inclusive os gravados por
                ônus real ou cláusula de inalienabilidade ou impenhorabilidade, seja qual for a
                data da constituição do ônus ou da cláusula, excetuados unicamente os bens e
                rendas que a lei declare{" "}
                <strong>absolutamente impenhoráveis</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 184 estabelece que o patrimônio inteiro do sujeito passivo responde pelo
                crédito tributário, inclusive bens gravados por hipoteca, penhor, usufruto ou
                cláusula de inalienabilidade de origem convencional ou testamentária. Isso supera
                o regime do direito civil: um imóvel dado em hipoteca pode não ser penhorável
                por credor quirografário privado, mas é alcançável pelo Fisco para pagamento de
                tributo. A única exceção são os bens declarados absolutamente impenhoráveis por
                lei, como o bem de família (Lei 8.009/1990) e os instrumentos necessários ao
                exercício de profissão (CPC, art. 833).
              </p>
              <p className="mt-3">
                Na prática, esse dispositivo expõe estruturas de planejamento patrimonial que
                tentam usar cláusulas de inalienabilidade para proteger bens de execuções fiscais.
                Um imóvel doado com cláusula de inalienabilidade e incomunicabilidade ainda
                responde pelo crédito tributário do donatário, pois a cláusula convencional não
                equivale à impenhorabilidade legal absoluta. O STJ tem admitido a penhora de
                bens com cláusula de inalienabilidade para satisfação de créditos tributários
                com base no Art. 184, o que é relevante para avaliar a eficácia de estruturas
                de holding patrimonial destinadas a blindar bens de execuções da Fazenda.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-185" numero="Art. 185" titulo="Presunção de Fraude à Execução Fiscal">
            <LegalText>
              <p>
                Presume-se <strong>fraudulenta</strong> a alienação ou oneração de bens ou rendas,
                ou seu começo, por sujeito passivo em débito para com a Fazenda Pública, por{" "}
                <strong>crédito tributário regularmente inscrito como dívida ativa</strong>.
              </p>
              <p className="mt-3">
                Parágrafo único. O disposto neste artigo não se aplica na hipótese de terem sido
                reservados, pelo devedor, bens ou rendas suficientes ao total pagamento da
                dívida inscrita.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 185 é uma das normas de maior impacto prático para o planejamento
                patrimonial com passivos fiscais. A presunção de fraude à execução opera de
                forma objetiva e absoluta: a partir da inscrição do débito em dívida ativa,
                qualquer alienação ou oneração de bens pelo devedor é presumidamente fraudulenta,
                sem necessidade de o Fisco provar a intenção de defraudar ou que a alienação
                causou insolvência. No direito civil comum, a fraude à execução exige que a
                ação judicial já tenha sido ajuizada ou que o devedor seja notório insolvente;
                no direito tributário, basta a inscrição em dívida ativa, que ocorre antes do
                ajuizamento da execução fiscal.
              </p>
              <p className="mt-3">
                A única saída legítima para o contribuinte inscrito em dívida ativa que deseja
                alienar bens é a do parágrafo único: reservar bens suficientes para cobrir todo
                o débito inscrito. Isso está alinhado com a exigência de certidão negativa de
                débitos (CND) ou de certidão positiva com efeito de negativa (CPEN) para
                determinadas transações imobiliárias e societárias. O STJ, na Súmula 375,
                limitou a presunção de fraude à execução para créditos civis à existência de
                penhora registrada ou ajuizamento anterior da ação; mas para créditos tributários
                a Súmula 375 foi explicitamente afastada: a inscrição em dívida ativa basta,
                conforme decidido no REsp 1.141.990 (Tema 290 do STJ). A presunção é relativa
                apenas no sentido de admitir a prova da reserva de bens do parágrafo único,
                não no sentido de exigir demonstração de má-fé.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-185a" numero="Art. 185-A" titulo="Indisponibilidade de Bens na Execução Fiscal">
            <LegalText>
              <p>
                Na hipótese de o devedor tributário, devidamente citado, não pagar nem apresentar
                bens à penhora no prazo legal e não forem encontrados bens penhoráveis, o juiz
                determinará a <strong>indisponibilidade de seus bens e direitos</strong>,
                comunicando a decisão, preferencialmente por meio eletrônico, aos órgãos e
                entidades que promovem registros de transferência de bens, especialmente ao
                registro público de imóveis e às autoridades supervisoras do mercado bancário
                e do mercado de capitais, a fim de que, no âmbito de suas atribuições, façam
                cumprir a ordem judicial.
              </p>
              <p className="mt-3">
                §1º A indisponibilidade de que trata o caput deste artigo limitar-se-á ao valor
                total exigível, devendo o juiz determinar o imediato levantamento da
                indisponibilidade dos bens ou valores que excederem esse limite.
              </p>
              <p className="mt-1">
                §2º Os órgãos e entidades aos quais se fizer a comunicação de que trata o caput
                deste artigo enviarão imediatamente ao juízo a relação discriminada dos bens e
                direitos cuja indisponibilidade houverem promovido.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 185-A, incluído pela LC 118/2005, é o fundamento legal do bloqueio judicial
                de ativos financeiros nas execuções fiscais, operado hoje via SISBAJUD (sucessor
                do BacenJud). Quando a execução fiscal não encontra bens penhoráveis após a
                citação sem pagamento, o juiz pode decretar a indisponibilidade de bens e direitos
                do executado em todo o sistema financeiro e nos registros de imóveis e veículos.
                A ordem eletrônica chega ao Banco Central, que a distribui a todas as instituições
                financeiras, bloqueando contas e investimentos até o limite da dívida.
              </p>
              <p className="mt-3">
                O STJ, no REsp 1.377.507 (Tema 631), consolidou que a indisponibilidade do Art.
                185-A é medida excepcional, aplicável apenas após o esgotamento das diligências
                ordinárias de localização de bens: pesquisa no Renajud (veículos), Infojud
                (declarações de IR), registros de imóveis e outros sistemas. Não é um atalho para
                execuções recém-ajuizadas: o Fisco precisa demonstrar que buscou bens pelos meios
                ordinários e não os encontrou. O §1º garante proporcionalidade: a indisponibilidade
                não pode superar o valor da dívida, e o excesso deve ser liberado imediatamente
                para não comprometer a atividade do executado além do necessário. Isso é relevante
                porque o bloqueio global de contas pode inviabilizar operações de uma empresa em
                funcionamento, e o §1º limita esse risco ao mínimo indispensável para a garantia
                da execução.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-186" numero="Art. 186" titulo="Preferência do Crédito Tributário">
            <LegalText>
              <p>
                O crédito tributário <strong>prefere a qualquer outro</strong>, seja qual for sua
                natureza ou o tempo de sua constituição, ressalvados os créditos decorrentes da
                legislação do trabalho ou do acidente de trabalho.
              </p>
              <p className="mt-3">Parágrafo único. Na falência:</p>
              <ul className="mt-2 space-y-1 pl-4">
                <li>
                  <strong>I</strong> - o crédito tributário não prefere aos créditos extraconcursais
                  ou às importâncias passíveis de restituição, nos termos da lei falimentar, nem
                  aos créditos com garantia real, no limite do valor do bem gravado;
                </li>
                <li>
                  <strong>II</strong> - a lei poderá estabelecer limites e condições para a
                  preferência dos créditos decorrentes da legislação do trabalho; e
                </li>
                <li>
                  <strong>III</strong> - a multa tributária prefere apenas aos créditos subordinados.
                </li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 186 estabelece a preferência geral do crédito tributário: ressalvados os
                créditos trabalhistas e acidentários, o Fisco tem prioridade de recebimento em
                concurso de credores fora do processo falimentar. O parágrafo único, introduzido
                pela LC 118/2005 para ajustar o CTN à Lei de Falências (Lei 11.101/2005), modifica
                substancialmente essa preferência no contexto falimentar e constitui uma das
                maiores mudanças no regime de privilégios do crédito tributário desde a edição
                do CTN em 1966.
              </p>
              <p className="mt-3">
                Na falência, a ordem de pagamento passou a ser: (1) créditos extraconcursais
                (despesas do processo, obrigações contratadas pelo administrador judicial);
                (2) créditos com garantia real no limite do bem gravado; (3) créditos trabalhistas
                até 150 salários mínimos por credor; (4) créditos tributários; (5) créditos com
                privilégio especial; (6) créditos quirografários; (7) multas tributárias; (8)
                créditos subordinados. A queda do crédito tributário abaixo dos créditos com
                garantia real foi a mudança mais relevante para o mercado de crédito: credores
                bancários com hipoteca ou alienação fiduciária passaram a ter prioridade sobre
                o Fisco no limite da garantia, o que tornou os financiamentos com garantia real
                mais atrativos para empresas em dificuldade. O inciso III é igualmente relevante:
                a multa tributária ficou na penúltima posição, acima apenas dos créditos
                subordinados, o que reduziu drasticamente o impacto de autuações com multas
                vultosas nos processos falimentares.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-187" numero="Art. 187" titulo="Cobrança Judicial: Não Sujeição a Concurso de Credores">
            <LegalText>
              <p>
                A cobrança judicial do crédito tributário{" "}
                <strong>não é sujeita a concurso de credores</strong> ou habilitação em falência,
                recuperação judicial, concordata, inventário ou arrolamento.
              </p>
              <p className="mt-3">
                Parágrafo único. O concurso de preferência somente se verifica entre pessoas
                jurídicas de direito público, na seguinte ordem:
              </p>
              <ul className="mt-2 space-y-1 pl-4">
                <li><strong>I</strong> - União;</li>
                <li><strong>II</strong> - Estados, Distrito Federal e Territórios, conjuntamente e pró rata;</li>
                <li><strong>III</strong> - Municípios, conjuntamente e pró rata.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 187 é uma das normas de maior impacto prático para empresas em recuperação
                judicial. A cobrança do crédito tributário por execução fiscal não se suspende
                com o deferimento da recuperação judicial, ao contrário das execuções de credores
                privados, que ficam suspensas por 180 dias pelo Art. 6º da Lei 11.101/2005. O
                Fisco cobra por via própria, em vara de execuções fiscais, paralelamente ao
                processo de recuperação judicial. Isso criou o maior gargalo estrutural das
                recuperações no Brasil: empresas em recuperação que acumularam dívidas tributárias
                vultosas não conseguem equacionar sua situação sem um parcelamento fiscal viável,
                e o processo de recuperação judicial não pode incluir créditos tributários no
                plano de renegociação com credores privados.
              </p>
              <p className="mt-3">
                O parágrafo único disciplina o concurso de preferência entre Fazendas Públicas
                distintas: a União recebe primeiro, depois Estados e Distrito Federal em conjunto
                proporcionalmente, depois Municípios em conjunto proporcionalmente. Na prática,
                esse dispositivo é raramente aplicado porque o Fisco federal, estadual e municipal
                cobram por execuções fiscais separadas e autônomas. O dispositivo só tem relevância
                real quando há concurso efetivo de preferências sobre o mesmo patrimônio, o que
                ocorre sobretudo em processos de insolvência de grandes devedores com dívidas
                relevantes perante diversas esferas de governo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-188" numero="Art. 188" titulo="Créditos Tributários Extraconcursais na Falência">
            <LegalText>
              <p>
                São <strong>extraconcursais</strong> os créditos tributários decorrentes de fatos
                geradores ocorridos no curso do processo de falência.
              </p>
              <p className="mt-3">
                §1º Contestado o crédito tributário, o juiz remeterá as partes ao processo
                competente, mandando reservar bens suficientes à extinção total do crédito e seus
                acrescidos, se a massa não puder efetuar a garantia da instância por outra forma,
                ouvido, quanto à natureza e valor dos bens reservados, o representante da Fazenda
                Pública interessada.
              </p>
              <p className="mt-1">
                §2º O disposto neste artigo aplica-se aos processos de concordata.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 188 trata dos créditos tributários nascidos após a decretação da falência.
                Tributos gerados pela própria atividade da massa falida durante o processo, como
                o IRPJ sobre o ganho de capital na alienação de bens do ativo permanente, o INSS
                sobre salários pagos pelo administrador judicial, ou o ISS sobre serviços
                contratados pela massa, não participam do concurso geral de credores. São pagos
                antes de todos os credores concursais, como despesas do processo. A lógica é que
                a massa falida continua praticando atos jurídicos que geram obrigações tributárias
                novas, e o Fisco não pode ser tratado como credor comum do devedor pré-falência
                nesses casos: são obrigações geradas no interesse e por conta da própria
                administração da falência.
              </p>
              <p className="mt-3">
                O §1º protege o Fisco na hipótese de o administrador judicial contestar o crédito
                tributário extraconcursal: o juiz determina a reserva de bens suficientes para
                garantir o pagamento enquanto o litígio se resolve no processo competente (a
                execução fiscal paralela). Isso evita que a massa seja encerrada e distribuída
                antes de resolver pendências tributárias controvertidas geradas durante o próprio
                processo. Na prática do STJ, os créditos tributários extraconcursais do Art. 188
                têm precedência sobre os créditos concursais, mas devem respeitar a sequência
                interna das próprias despesas do processo falimentar.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-189" numero="Art. 189" titulo="Preferência do Crédito Tributário no Inventário">
            <LegalText>
              <p>
                São pagos <strong>preferencialmente</strong> a quaisquer créditos habilitados em
                inventário ou arrolamento, ou a outros encargos do monte, os créditos tributários
                vencidos ou vincendos, a cargo do de cujus ou de seu espólio, exigíveis no
                decurso do processo de inventário ou arrolamento.
              </p>
              <p className="mt-3">
                Parágrafo único. Contestado o crédito tributário, proceder-se-á na forma do
                disposto no §1º do artigo anterior.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 189 aplica ao inventário a mesma lógica do Art. 188 para a falência: os
                créditos tributários do espólio têm preferência sobre qualquer outro credor durante
                o processo de inventário. Os tributos vencidos ou vincendos a cargo do falecido
                ou de seu espólio que se tornem exigíveis durante o inventário são pagos antes
                que os bens sejam partilhados entre os herdeiros ou destinados a qualquer outro
                credor. Isso inclui o ITCMD sobre a própria transmissão (exigível durante o
                inventário), o IRPF do espólio sobre rendimentos recebidos após a morte do titular
                e tributos anteriores pendentes que o falecido não havia pago em vida.
              </p>
              <p className="mt-3">
                Na prática, o inventariante precisa verificar e quitar todos os débitos tributários
                do espólio antes de concluir a partilha. O descumprimento dessa ordem pode
                responsabilizar pessoalmente o inventariante e, após a partilha, os herdeiros que
                receberam os bens sem a quitação dos tributos, com fundamento no Art. 131, II e
                III do CTN (responsabilidade dos sucessores). A certidão negativa de débitos do
                espólio junto à Receita Federal é um documento essencial para o encerramento do
                inventário sem riscos de responsabilidade residual dos herdeiros. O parágrafo
                único remete ao §1º do Art. 188: se o crédito for contestado pelo espólio, o
                juiz do inventário determina a reserva de bens suficientes antes de homologar
                a partilha.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-190" numero="Art. 190" titulo="Preferência do Crédito Tributário na Liquidação de Pessoas Jurídicas">
            <LegalText>
              <p>
                São pagos <strong>preferencialmente a quaisquer outros</strong> os créditos
                tributários vencidos ou vincendos, a cargo de pessoas jurídicas de direito privado
                em <strong>liquidação judicial ou voluntária</strong>, exigíveis no decurso
                da liquidação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 190 estende a preferência tributária ao processo de liquidação de pessoas
                jurídicas fora do regime falimentar: dissolução e encerramento de sociedades,
                seja por decisão dos sócios (liquidação voluntária) ou por determinação judicial.
                Os créditos tributários vencidos ou vincendos exigíveis durante a liquidação têm
                preferência sobre qualquer outro credor, incluindo credores quirografários e
                até mesmo sócios com créditos contra a própria sociedade.
              </p>
              <p className="mt-3">
                Na prática, os sócios-administradores e o liquidante nomeado precisam providenciar
                a quitação de todos os tributos antes de distribuir o remanescente do patrimônio
                social aos sócios. A Receita Federal, embora não condicione formalmente a baixa
                do CNPJ ao pagamento de todos os débitos (a Instrução Normativa RFB 1.244/2012
                permitiu a baixa com débitos, mantendo os sócios como responsáveis), garante por
                meio do Art. 190 que os créditos tributários têm prioridade sobre qualquer
                distribuição patrimonial durante o processo de liquidação. Os sócios que receberem
                bens do patrimônio social antes da quitação dos tributos respondem pessoalmente
                pelo crédito tributário remanescente, com fundamento no Art. 134, VII do CTN,
                que estabelece a responsabilidade subsidiária dos sócios liquidantes.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-191" numero="Art. 191" titulo="Prova de Quitação de Tributos: Recuperação Judicial">
            <LegalText>
              <p>
                A concessão de recuperação judicial depende da apresentação da{" "}
                <strong>prova de quitação de todos os tributos</strong>, observado o disposto nos
                arts. 151, 205 e 206 desta Lei.
              </p>
              <p className="mt-3 text-xs text-muted-foreground italic">
                Redação dada pela Lei Complementar nº 118, de 9 de fevereiro de 2005.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 191 condiciona a concessão da recuperação judicial à prova de regularidade
                fiscal, admitindo como prova tanto a Certidão Negativa de Débitos (CND) quanto a
                Certidão Positiva com Efeito de Negativa (CPD-EN), que é emitida quando os créditos
                têm exigibilidade suspensa (Art. 151) ou estão garantidos na forma dos Arts. 205 e
                206. Na prática, isso significa que parcelamentos em vigor, depósitos judiciais do
                montante integral e liminares que suspendam a exigibilidade viabilizam a obtenção
                da CPD-EN sem quitação efetiva.
              </p>
              <p className="mt-3">
                A exigência criou historicamente um dos maiores gargalos das recuperações judiciais
                brasileiras: empresas em dificuldade financeira quase sempre têm débitos tributários
                em aberto, e a obtenção da CND antes da concessão da recuperação seria inviável.
                A resposta normativa veio em etapas: o Art. 155-A, §§3º e 4º do CTN criou a
                previsão de parcelamento específico para devedores em recuperação; a Lei 14.112/2020
                (reforma da Lei de Falências) e a Lei 13.988/2020 (Transação Tributária) criaram
                os instrumentos práticos. O STJ, em precedentes como o REsp 1.187.404, também
                admitiu flexibilizações quando a empresa demonstra impossibilidade objetiva de
                obter a certidão por razão não imputável a ela, como a demora da Fazenda na
                processamento de pedidos de parcelamento.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-192" numero="Art. 192" titulo="Prova de Quitação de Tributos: Sentença de Partilha">
            <LegalText>
              <p>
                Nenhuma sentença de julgamento de partilha ou adjudicação será proferida sem{" "}
                <strong>prova da quitação de todos os tributos</strong> relativos aos bens do
                espólio, ou às suas rendas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 192 impede que o juiz profira sentença de encerramento do inventário sem
                a prova de quitação dos tributos sobre os bens e as rendas do espólio. O dispositivo
                garante a efetividade do Art. 189: se os créditos tributários têm preferência no
                inventário, a própria sentença de partilha fica condicionada à demonstração de que
                eles foram pagos. Isso obriga o inventariante a providenciar as certidões de
                regularidade fiscal do espólio antes de requerer a homologação da partilha.
              </p>
              <p className="mt-3">
                As certidões exigidas abrangem a CND federal (para o IRPF do espólio sobre
                rendimentos recebidos após o óbito, ganhos de capital na transmissão de bens),
                a certidão estadual (para o ITCMD, que é de competência dos estados) e a certidão
                municipal (para o IPTU dos imóveis integrantes do espólio). A ausência de qualquer
                dessas certidões impede a prolação da sentença de partilha. Quando há débitos
                tributários contestados, o juiz pode condicionar a sentença à reserva de bens
                suficientes para eventual pagamento, nos termos do Art. 189, parágrafo único. Na
                partilha amigável homologada pelo juiz, a exigência vale igualmente: a homologação
                só ocorre com prova de regularidade tributária do espólio.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-193" numero="Art. 193" titulo="Prova de Quitação de Tributos: Contratos com o Poder Público">
            <LegalText>
              <p>
                Salvo quando expressamente autorizado por lei, nenhum departamento da administração
                pública da União, dos Estados, do Distrito Federal, ou dos Municípios, ou sua
                autarquia, <strong>celebrará contrato ou aceitará proposta em concorrência
                pública</strong> sem que o contratante ou proponente faça prova da quitação de
                todos os tributos devidos à Fazenda Pública interessada, relativamente à atividade
                em cujo exercício contrata ou concorre.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 193 é o fundamento da exigência de regularidade fiscal para participar de
                licitações e contratar com o Poder Público. A Lei 8.666/1993 e a Lei 14.133/2021
                (nova Lei de Licitações) reproduziram essa exigência, tornando a CND ou a CPD-EN
                um requisito de habilitação em qualquer licitação pública. Empresa com débito
                tributário inscrito em dívida ativa sem suspensão da exigibilidade fica impedida
                de contratar com o Estado.
              </p>
              <p className="mt-3">
                O trecho "relativamente à atividade em cujo exercício contrata ou concorre" foi
                interpretado de forma ampliada pela legislação posterior de licitações, que passou
                a exigir regularidade fiscal plena (não apenas do ramo de atividade contratado).
                Isso cria um forte incentivo à regularização fiscal para empresas do setor público:
                obras, saúde, educação, tecnologia da informação e qualquer setor que dependa de
                contratos governamentais. A dispensa de CND "quando expressamente autorizado por
                lei" cobre casos como cooperativas de catadores de resíduos (LC 123/2006) e
                microempresas em situação específica, que podem contratar com o poder público
                mesmo com pendências fiscais dentro dos limites da legislação de benefícios para
                pequenos negócios.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO IV — ADMINISTRAÇÃO TRIBUTÁRIA ── */}
          <Secao id="tit-adm" titulo="Título IV: Administração Tributária" subtitulo="Arts. 194 ao 208" />
          <Secao id="cap-fisc" titulo="Capítulo I: Fiscalização" subtitulo="Arts. 194 ao 200" />

          <Artigo id="art-194" numero="Art. 194" titulo="Competência e Poderes de Fiscalização">
            <LegalText>
              <p>
                A legislação tributária, observado o disposto nesta Lei, regulará, em caráter
                geral, ou especificamente em função da natureza do tributo de que se tratar, a
                competência e os poderes das autoridades administrativas em matéria de{" "}
                <strong>fiscalização da sua aplicação</strong>.
              </p>
              <p className="mt-3">
                Parágrafo único. A legislação a que se refere este artigo aplica-se às pessoas
                naturais ou jurídicas, contribuintes ou não, inclusive às que gozem de{" "}
                <strong>imunidade tributária ou de isenção de caráter pessoal</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 194 abre o capítulo de fiscalização estabelecendo que os poderes da
                autoridade fiscal são definidos pela legislação ordinária de cada ente, dentro
                dos limites gerais do CTN. O parágrafo único é um dos dispositivos mais
                relevantes do capítulo: a fiscalização alcança inclusive quem goza de imunidade
                ou isenção. Uma entidade filantrópica imune ao IPTU ainda pode ser fiscalizada
                pela Prefeitura para verificar se os requisitos da imunidade do Art. 14 do CTN
                estão sendo cumpridos; uma empresa isenta de IRPJ pode ser auditada pela Receita
                Federal para confirmar que as condições da isenção persistem.
              </p>
              <p className="mt-3">
                A inclusão dos "contribuintes ou não" é relevante para o alcance da fiscalização:
                responsáveis tributários, substitutos, terceiros obrigados a fornecer informações
                (Art. 197) e simples depositários de bens sujeitos ao tributo estão todos sujeitos
                ao poder fiscalizatório, independentemente de serem ou não o sujeito passivo direto.
                Isso fundamenta, por exemplo, a fiscalização de transportadoras de mercadorias
                para verificar o ICMS de operações de terceiros, e a auditoria de instituições
                financeiras para cruzar dados com contribuintes do IR.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-195" numero="Art. 195" titulo="Acesso a Livros e Documentos Fiscais">
            <LegalText>
              <p>
                Para os efeitos da legislação tributária, não têm aplicação quaisquer disposições
                legais excludentes ou limitativas do direito de{" "}
                <strong>examinar mercadorias, livros, arquivos, documentos, papéis e efeitos
                comerciais ou fiscais</strong> dos comerciantes industriais ou produtores, ou da
                obrigação destes de exibi-los.
              </p>
              <p className="mt-3">
                Parágrafo único. Os livros obrigatórios de escrituração comercial e fiscal e os
                comprovantes dos lançamentos neles efetuados serão conservados até que ocorra a{" "}
                <strong>prescrição dos créditos tributários</strong> decorrentes das operações a
                que se refiram.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 195 confere à autoridade fiscal um poder amplo de acesso a documentos:
                nenhuma cláusula contratual de confidencialidade, segredo industrial ou sigilo
                comercial pode ser oposta ao Fisco para impedir o exame de livros e documentos.
                A única limitação relevante é o sigilo profissional protegido constitucionalmente:
                o escritório de advocacia tem proteção específica quanto a documentos do cliente
                cobertos pela relação de patrocínio (CF, art. 133), e o STF delimitou esse
                alcance no RE 603.616. Para documentos puramente contábeis ou financeiros em
                poder do contribuinte, porém, não há sigilo oponível ao Fisco.
              </p>
              <p className="mt-3">
                O parágrafo único define o prazo de guarda de documentos fiscais: devem ser
                conservados até a prescrição dos créditos tributários relacionados. Como a
                prescrição é de 5 anos (Art. 174), em geral os documentos devem ser guardados
                por esse período a contar da extinção do crédito correspondente. A Receita
                Federal orienta na prática a guarda por 5 anos a partir do exercício seguinte
                ao da entrega da declaração. Para empresas com operações complexas ou saldos
                de créditos fiscais que se arrastam por vários exercícios, o prazo de guarda
                pode ser substancialmente maior, pois a prescrição só começa a correr com a
                constituição definitiva de cada crédito individualmente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-196" numero="Art. 196" titulo="Termos de Início e Conclusão da Fiscalização">
            <LegalText>
              <p>
                A autoridade administrativa que proceder ou presidir a quaisquer diligências de
                fiscalização lavrará os <strong>termos necessários para que se documente o início
                do procedimento</strong>, na forma da legislação aplicável, que fixará prazo
                máximo para a conclusão daquelas.
              </p>
              <p className="mt-3">
                Parágrafo único. Os termos a que se refere este artigo serão lavrados, sempre
                que possível, em um dos livros fiscais exibidos; quando lavrados em separado
                deles se dará ciência ao sujeito passivo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 196 exige que o início da fiscalização seja documentado por termo formal,
                com consequência jurídica fundamental para o contribuinte: a lavratura do termo
                de início encerra a possibilidade de denúncia espontânea com exclusão de
                penalidade (Art. 138 do CTN). A espontaneidade pressupõe que o contribuinte
                se antecipe ao Fisco; após a ciência do início da fiscalização, qualquer
                recolhimento complementar já não é mais "espontâneo" e não afasta as multas.
                Na Receita Federal, o Mandado de Procedimento Fiscal (MPF) e o Termo de Início
                de Ação Fiscal (TIAF) são os instrumentos que concretizam o Art. 196.
              </p>
              <p className="mt-3">
                O prazo máximo para conclusão da fiscalização mencionado no Art. 196 é
                regulamentado por legislação específica de cada ente. Para a Receita Federal,
                o Decreto 70.235/1972 e a IN RFB 2.066/2022 estabelecem procedimentos e prazos.
                O prazo tem relevância prática para o contribuinte: uma fiscalização que se
                prolonga muito além do razoável pode ser questionada quanto à validade dos atos
                praticados fora do prazo legal, especialmente se o contribuinte demonstrar prejuízo
                à sua defesa. O prazo de conclusão também importa para o cômputo do prazo
                decadencial: o início da fiscalização formal pode alterar o marco inicial do
                prazo decadencial nos termos do parágrafo único do Art. 173.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-197" numero="Art. 197" titulo="Dever de Informar: Terceiros Obrigados">
            <LegalText>
              <p>
                Mediante intimação escrita, são obrigados a prestar à autoridade administrativa
                todas as informações de que disponham com relação aos bens, negócios ou atividades
                de terceiros:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - os tabeliães, escrivães e demais serventuários de ofício;</li>
                <li><strong>II</strong> - os bancos, casas bancárias, Caixas Econômicas e demais instituições financeiras;</li>
                <li><strong>III</strong> - as empresas de administração de bens;</li>
                <li><strong>IV</strong> - os corretores, leiloeiros e despachantes oficiais;</li>
                <li><strong>V</strong> - os inventariantes;</li>
                <li><strong>VI</strong> - os síndicos, comissários e liquidatários;</li>
                <li><strong>VII</strong> - quaisquer outras entidades ou pessoas que a lei designe, em razão de seu cargo, ofício, função, ministério, atividade ou profissão.</li>
              </ul>
              <p className="mt-3">
                Parágrafo único. A obrigação prevista no caput deste artigo não abrange a
                prestação de informações quanto a fatos sobre os quais o informante esteja
                legalmente obrigado a observar segredo em razão de cargo, ofício, função,
                ministério, atividade ou profissão.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 197 é o fundamento legal para o fornecimento compulsório de informações
                ao Fisco por terceiros. O inciso II (instituições financeiras) foi o mais
                debatido: o STF, no RE 601.314 (Tema 225), decidiu em 2016 que a Receita Federal
                pode obter informações bancárias diretamente das instituições financeiras sem
                necessidade de ordem judicial, com base na LC 105/2001, que regulamentou o Art.
                197, II. O argumento foi que o sigilo bancário cede ao sigilo fiscal: as informações
                obtidas ficam protegidas pelo Art. 198 e só podem ser usadas para fins tributários.
                A decisão do STF encerrou anos de controvérsia sobre a constitucionalidade da
                quebra administrativa do sigilo bancário.
              </p>
              <p className="mt-3">
                O parágrafo único protege o sigilo profissional: advogados, médicos, contadores
                e outros profissionais com dever de sigilo não são obrigados a revelar informações
                cobertas por essa proteção. Mas a proteção é do profissional em relação à sua
                atividade específica, não uma proteção absoluta do cliente: o sigilo do advogado
                não impede que o próprio cliente seja obrigado a fornecer os mesmos documentos ao
                Fisco. O inciso VII (cláusula aberta) permite que legislação específica amplie a
                lista, o que a Receita Federal tem feito por meio de instruções normativas que
                obrigam administradoras de cartão de crédito, plataformas de marketplace e corretoras
                de criptoativos a informar transações acima de determinados limites.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-198" numero="Art. 198" titulo="Sigilo Fiscal: Vedação e Exceções">
            <LegalText>
              <p>
                Sem prejuízo do disposto na legislação criminal, é{" "}
                <strong>vedada a divulgação</strong>, por parte da Fazenda Pública ou de seus
                servidores, de informação obtida em razão do ofício sobre a situação econômica
                ou financeira do sujeito passivo ou de terceiros e sobre a natureza e o estado
                de seus negócios ou atividades.
              </p>
              <p className="mt-3">
                §1º Excetuam-se do disposto neste artigo, além dos casos previstos no art. 199,
                os seguintes:
              </p>
              <ul className="mt-2 space-y-1 pl-4">
                <li><strong>I</strong> - requisição de autoridade judiciária no interesse da justiça;</li>
                <li><strong>II</strong> - solicitações de autoridade administrativa no interesse da Administração Pública, desde que seja comprovada a instauração regular de processo administrativo, no órgão ou na entidade respectiva, com o objetivo de investigar o sujeito passivo a que se refere a informação, por prática de infração administrativa.</li>
              </ul>
              <p className="mt-3">§2º O intercâmbio de informação sigilosa, no âmbito da Administração Pública, será realizado mediante processo regularmente instaurado, e a entrega será feita pessoalmente à autoridade solicitante, mediante recibo, que formalize a transferência e assegure a preservação do sigilo.</p>
              <p className="mt-1">§3º Não é vedada a divulgação de informações relativas a:</p>
              <ul className="mt-2 space-y-1 pl-4">
                <li><strong>I</strong> - representações fiscais para fins penais;</li>
                <li><strong>II</strong> - inscrições na Dívida Ativa da Fazenda Pública;</li>
                <li><strong>III</strong> - parcelamento ou moratória.</li>
              </ul>
            </LegalText>
            <Comentario>
              <p>
                O Art. 198 é a contrapartida do Art. 197: se o Fisco pode exigir informações de
                terceiros, o sigilo fiscal garante que essas informações não sejam divulgadas
                indevidamente. O sigilo fiscal protege tanto o contribuinte quanto terceiros cujas
                informações cheguem ao conhecimento da Fazenda durante a fiscalização. O servidor
                que viola o sigilo fiscal incorre em crime funcional (Art. 325 do Código Penal,
                violação de sigilo funcional) e em responsabilidade civil pelo dano causado.
              </p>
              <p className="mt-3">
                As exceções do §3º têm grande relevância prática. O inciso II torna as inscrições
                em dívida ativa públicas: qualquer pessoa pode consultar o CADIN (Cadastro
                Informativo de Créditos Não Quitados do Setor Público Federal) ou a base de dados
                da PGFN para verificar se uma empresa ou pessoa tem débitos federais inscritos
                em dívida ativa. Isso é fundamental para due diligence em fusões e aquisições e
                para avaliação de risco de crédito em operações comerciais. O inciso I permite
                que a Receita Federal encaminhe representação fiscal para fins penais ao Ministério
                Público quando encontra indícios de crime tributário durante a fiscalização, sem
                que isso configure violação do sigilo: o compartilhamento com o MP é autorizado
                como exceção ao dever de sigilo. O inciso III permite divulgar que determinada
                empresa tem parcelamento ativo, o que é relevante para credores que negociam com
                empresas em regularização fiscal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-199" numero="Art. 199" titulo="Assistência Mútua entre Fazendas e com o Exterior">
            <LegalText>
              <p>
                A Fazenda Pública da União e as dos Estados, do Distrito Federal e dos Municípios
                prestar-se-ão mutuamente{" "}
                <strong>assistência para a fiscalização dos tributos respectivos e permuta de
                informações</strong>, na forma estabelecida, em caráter geral ou específico,
                por lei ou convênio.
              </p>
              <p className="mt-3">
                Parágrafo único. A Fazenda Pública da União, na forma estabelecida em tratados,
                acordos ou convênios, poderá permutar informações com Estados estrangeiros no
                interesse da arrecadação e da fiscalização de tributos.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 199 é o fundamento para os convênios de cooperação fiscal entre os entes
                da federação e, no parágrafo único, para a troca de informações com fiscos
                estrangeiros. Os convênios do CONFAZ (Conselho Nacional de Política Fazendária)
                entre os estados para intercâmbio de informações sobre o ICMS, e a integração
                da Receita Federal com o SPED para cruzamento de dados entre o IR federal e os
                tributos estaduais e municipais, têm base no Art. 199.
              </p>
              <p className="mt-3">
                O parágrafo único é especialmente relevante no contexto da tributação
                internacional. A Receita Federal participa do Common Reporting Standard (CRS)
                da OCDE e mantém acordos bilaterais de troca automática de informações financeiras
                com dezenas de países. Isso permite que a Receita Federal identifique residentes
                fiscais brasileiros com contas e ativos no exterior, mesmo que não declarados
                voluntariamente. A e-Financeira (obrigação acessória que substituiu a DIMOF)
                e o CbCR (Country-by-Country Report) para multinacionais são instrumentos
                operacionais dessa rede de intercâmbio. Na prática, a troca automática de
                informações (AEOI) no âmbito do CRS tornou a ocultação de ativos offshore
                nas jurisdições participantes substancialmente mais difícil e arriscada para
                contribuintes brasileiros que não declaram esses ativos no IRPF ou no ECF.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-200" numero="Art. 200" titulo="Auxílio da Força Pública na Fiscalização">
            <LegalText>
              <p>
                As autoridades administrativas federais poderão <strong>requisitar o auxílio da
                força pública</strong> federal, estadual ou municipal, e reciprocamente, quando
                vítimas de embaraço ou desacato no exercício de suas funções, ou quando necessário
                à efetivação de medida prevista na legislação tributária, ainda que não se configure
                fato definido em lei como crime ou contravenção.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 200 autoriza a autoridade fiscal a solicitar apoio policial para o exercício
                da fiscalização quando houver resistência do contribuinte ou de terceiros. O
                dispositivo tem três situações de aplicação: embaraço (resistência passiva à
                ação fiscal, como recusa de acesso ao estabelecimento), desacato (resistência
                ativa, incluindo ameaças ou atos de intimidação de auditores), e necessidade de
                efetivação de medida prevista na legislação tributária (por exemplo, apreensão
                de mercadorias em trânsito irregular).
              </p>
              <p className="mt-3">
                A ressalva "ainda que não se configure fato definido em lei como crime ou
                contravenção" é juridicamente relevante: o Fisco não precisa aguardar que a
                resistência do contribuinte atinja o grau de crime de desobediência (Art. 330 do
                Código Penal) ou de desacato (Art. 331 do Código Penal) para pedir auxílio
                policial. A simples recusa em permitir acesso ao estabelecimento para fiscalização
                ou em exibir documentos intimados já justifica a requisição. Na prática, as
                grandes operações conjuntas entre a Receita Federal e a Polícia Federal em
                estabelecimentos investigados por sonegação fiscal usam tanto o Art. 200 quanto
                medidas cautelares judiciais específicas (busca e apreensão), que permitem acesso
                forçado mesmo a locais com expectativa constitucional de privacidade, como
                escritórios de advocacia em situações excepcionais.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP II — DÍVIDA ATIVA ── */}
          <Secao id="cap-dativ" titulo="Capítulo II: Dívida Ativa" subtitulo="Arts. 201 ao 204" />

          <Artigo id="art-201" numero="Art. 201" titulo="Dívida Ativa Tributária: Definição">
            <LegalText>
              <p>
                Constitui dívida ativa tributária a proveniente de crédito dessa natureza,{" "}
                <strong>regularmente inscrita na repartição administrativa competente</strong>,
                depois de esgotado o prazo fixado, para pagamento, pela lei ou por decisão final
                proferida em processo regular.
              </p>
              <p className="mt-3">
                Parágrafo único. A fluência de juros de mora não exclui, para os efeitos deste
                artigo, a liquidez do crédito.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A inscrição em dívida ativa é o ato administrativo que transforma o crédito
                tributário constituído e não pago em título executivo extrajudicial — a Certidão
                de Dívida Ativa (CDA) — habilitando o Fisco a ajuizar a execução fiscal com base
                na Lei 6.830/1980 (LEF). O crédito só pode ser inscrito após o esgotamento do
                prazo para pagamento sem quitação: enquanto houver recurso administrativo pendente
                com efeito suspensivo (Art. 151, III), a exigibilidade está suspensa e a inscrição
                não é possível. A inscrição é, portanto, posterior ao lançamento, à notificação,
                ao prazo para impugnação e ao eventual julgamento administrativo definitivo.
              </p>
              <p className="mt-3">
                O parágrafo único esclarece que a fluência contínua de juros de mora não compromete
                a liquidez da dívida. O valor da CDA não precisa ser um número fixo para que o
                título seja líquido: basta que especifique o principal e a forma de calcular os
                acréscimos. Na execução fiscal, o exequente atualiza o valor no momento da petição
                inicial aplicando a taxa legal (SELIC para débitos federais) desde a data da
                inscrição, calculada sobre o valor principal inscrito. A liquidez, para fins do
                Art. 201, é a determinabilidade do valor, não sua fixidez.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-202" numero="Art. 202" titulo="Inscrição em Dívida Ativa: Requisitos Formais">
            <LegalText>
              <p>
                O termo de inscrição da dívida ativa, autenticado pela autoridade competente,
                indicará <strong>obrigatoriamente</strong>:
              </p>
              <ul className="mt-3 space-y-1 pl-4">
                <li><strong>I</strong> - o nome do devedor e, sendo caso, o dos co-responsáveis, bem como, sempre que possível, o domicílio ou a residência de um e de outros;</li>
                <li><strong>II</strong> - a quantia devida e a maneira de calcular os juros de mora acrescidos;</li>
                <li><strong>III</strong> - a origem e natureza do crédito, mencionada especificamente a disposição da lei em que seja fundado;</li>
                <li><strong>IV</strong> - a data em que foi inscrita;</li>
                <li><strong>V</strong> - sendo caso, o número do processo administrativo de que se originar o crédito.</li>
              </ul>
              <p className="mt-3">
                Parágrafo único. A Certidão de Dívida Ativa (CDA) conterá os mesmos elementos
                do termo de inscrição e será autenticada pela autoridade competente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 202 lista os requisitos formais obrigatórios da inscrição e da CDA. Esses
                requisitos são condição de validade do título executivo: a ausência ou erro grave
                em qualquer deles pode gerar a nulidade da CDA e de toda a execução fiscal (Art.
                203). O inciso I exige a identificação do devedor e dos corresponsáveis: a inclusão
                de sócio-administrador como corresponsável na CDA original exige que os elementos
                de responsabilidade tributária já estejam presentes por ocasião da inscrição;
                incluí-lo posteriormente por simples petição não é admissível sem substituição
                formal da CDA.
              </p>
              <p className="mt-3">
                O inciso III é o mais relevante para a defesa do contribuinte: a CDA precisa
                mencionar especificamente a disposição legal que fundamenta o crédito e descrever
                sua origem e natureza. Uma CDA que diz apenas "IRPJ — exercício 2020" sem
                especificar o período de apuração, a base legal (art. X da Lei Y), o critério
                de cálculo e o fato gerador pode ser anulada por insuficiência de fundamentação.
                O STJ, em julgados como o REsp 1.090.248, tem exigido que a CDA contenha todos
                os elementos que permitam ao devedor compreender a origem e a extensão do débito
                e exercer adequadamente sua defesa nos embargos à execução.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-203" numero="Art. 203" titulo="Nulidade da Inscrição: Sanação e Substituição da CDA">
            <LegalText>
              <p>
                A omissão de quaisquer dos requisitos previstos no artigo anterior, ou o erro a
                eles relativo, são causas de{" "}
                <strong>nulidade da inscrição e do processo de cobrança</strong> dela decorrente,
                mas a nulidade poderá ser sanada até a decisão de primeira instância, mediante
                substituição da certidão nula, devolvido ao sujeito passivo, acusado ou interessado
                o prazo para defesa, que somente poderá versar sobre a parte modificada.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 203 equilibra a proteção do contribuinte com a efetividade da cobrança.
                A regra inicial é severa: qualquer omissão ou erro nos requisitos do Art. 202
                gera nulidade da inscrição e de toda a execução fiscal decorrente. Mas a exceção
                é igualmente significativa: a nulidade é sanável pela substituição da CDA, desde
                que ocorra até a sentença de primeiro grau nos embargos, com devolução de prazo
                ao contribuinte para impugnar apenas as modificações introduzidas.
              </p>
              <p className="mt-3">
                A Súmula 392 do STJ delimita com precisão o que pode ser substituído: a CDA pode
                ser substituída para corrigir erro material ou formal (valor errado por simples
                equívoco de digitação, data incorreta, endereço desatualizado), mas não para
                modificar o sujeito passivo, ampliar o período de apuração ou incluir novo
                fundamento legal que não estava na inscrição original. Essas últimas alterações
                não são "sanação de nulidade": são a criação de um crédito diferente, que exige
                nova inscrição e novo processo. O STJ também entende que a substituição da CDA
                só é possível enquanto o prazo decadencial ou prescricional não houver esgotado
                para o crédito que se pretende incluir na versão substituída.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-204" numero="Art. 204" titulo="Presunção de Certeza e Liquidez da Dívida Ativa">
            <LegalText>
              <p>
                A dívida regularmente inscrita goza da{" "}
                <strong>presunção de certeza e liquidez</strong> e tem o efeito de{" "}
                <strong>prova pré-constituída</strong>.
              </p>
              <p className="mt-3">
                Parágrafo único. A presunção a que se refere este artigo é{" "}
                <strong>relativa</strong> e pode ser ilidida por prova inequívoca, a cargo do
                sujeito passivo ou do terceiro a que aproveite.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 204 confere à CDA o status de título executivo extrajudicial com presunção
                de certeza (o crédito existe e é exigível) e liquidez (o valor é determinável).
                Essa presunção inverte o ônus da prova nas execuções fiscais: o Fisco não precisa
                demonstrar, no processo de execução, que o crédito existe e está correto — a CDA
                sozinha satisfaz esse requisito. É o contribuinte que, nos embargos à execução
                (LEF, art. 16) ou na exceção de pré-executividade, precisa produzir prova
                inequívoca em contrário.
              </p>
              <p className="mt-3">
                O parágrafo único limita a presunção como relativa (iuris tantum), não absoluta.
                O contribuinte pode ilidir a presunção com prova inequívoca de que o crédito não
                existe, foi extinto ou tem valor incorreto. São exemplos de prova inequívoca
                admitida pelo STJ: comprovante de pagamento anterior à inscrição, decisão
                administrativa definitiva que cancelou o auto de infração antes da inscrição,
                demonstração de que o prazo decadencial já havia esgotado antes do lançamento,
                e prova documental de que o valor da CDA inclui parcelas já prescritas. A
                expressão "ou do terceiro a que aproveite" permite que o próprio sócio citado
                como corresponsável impugne a presunção quanto à sua responsabilidade pessoal,
                demonstrando que não exercia a gestão da empresa à época do fato gerador.
              </p>
            </Comentario>
          </Artigo>

          {/* ── CAP III — CERTIDÕES NEGATIVAS ── */}
          <Secao id="cap-cert" titulo="Capítulo III: Certidões Negativas" subtitulo="Arts. 205 ao 208" />

          <Artigo id="art-205" numero="Art. 205" titulo="Certidão Negativa de Débitos (CND)">
            <LegalText>
              <p>
                A lei poderá exigir que a prova da quitação de determinado tributo, quando
                exigível, seja feita por{" "}
                <strong>certidão negativa</strong>, expedida à vista de requerimento do
                interessado, que contenha todas as informações necessárias à identificação de
                sua pessoa, domicílio fiscal e ramo de negócio ou atividade e indique o período
                a que se refere o pedido.
              </p>
              <p className="mt-3">
                Parágrafo único. A certidão negativa será sempre expedida nos termos em que haja
                sido requerida e será fornecida dentro de{" "}
                <strong>10 (dez) dias</strong> da data da entrada do requerimento na repartição.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 205 regulamenta a Certidão Negativa de Débitos (CND), o documento que
                comprova a regularidade fiscal de uma pessoa perante determinado ente tributante.
                A CND é exigida em diversas situações previstas na legislação: para participar
                de licitações e celebrar contratos com o poder público (Art. 193 do CTN), para
                a concessão de incentivos fiscais, para o registro de atos societários em juntas
                comerciais e para o encerramento de pessoas jurídicas. A CND federal — que abrange
                débitos com a Receita Federal e com a PGFN — é hoje emitida instantaneamente
                via Portal e-CAC ou pelo sistema Regularize da PGFN, tornando o prazo de 10 dias
                do parágrafo único relevante apenas para situações excepcionais.
              </p>
              <p className="mt-3">
                O prazo de 10 dias para emissão é uma garantia do contribuinte que tem
                consequências: se o Fisco não emite a certidão no prazo sem justificativa legítima
                (análise de pendência em andamento, por exemplo), o contribuinte pode impetrar
                mandado de segurança para compelir a emissão. O STJ reconhece que a demora
                injustificada na emissão da CND pode gerar dano ao contribuinte, especialmente
                quando impede participação em licitações ou operações com prazo determinado. A
                repartição não pode negar a emissão por dúvida sobre a existência de débitos:
                se não há débito lançado ou inscrito, a CND deve ser emitida; se há, emite-se
                certidão positiva ou CPD-EN.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-206" numero="Art. 206" titulo="Certidão Positiva com Efeito de Negativa (CPD-EN)">
            <LegalText>
              <p>
                Tem os mesmos efeitos previstos no artigo anterior a certidão de que conste a
                existência de créditos{" "}
                <strong>não vencidos, em curso de cobrança executiva em que tenha sido
                efetivada a penhora</strong>, ou cuja{" "}
                <strong>exigibilidade esteja suspensa</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 206 é a base legal da CPD-EN (Certidão Positiva com Efeito de Negativa),
                um dos institutos mais utilizados no dia a dia das empresas com contencioso
                tributário ativo. A CPD-EN produz os mesmos efeitos jurídicos da CND para todos
                os fins legais, mas é emitida mesmo quando existem débitos, desde que ocorra uma
                das três situações: (a) os créditos ainda não venceram (débito parcelado com
                parcelas em dia); (b) a execução fiscal tem penhora efetivada (o crédito está
                garantido judicialmente); (c) a exigibilidade está suspensa por qualquer hipótese
                do Art. 151.
              </p>
              <p className="mt-3">
                Na prática, a estratégia mais utilizada para obter a CPD-EN quando há débito
                exigível sem parcelamento é o depósito judicial do montante integral (Art. 151,
                II), que simultaneamente suspende a exigibilidade e garante o crédito em juízo.
                Outra via é a adesão a parcelamento: a partir do deferimento do parcelamento, o
                débito passa à condição de "créditos não vencidos" (as parcelas têm vencimentos
                futuros) e a CPD-EN é emitida. Durante processos de fusão, aquisição ou venda de
                ativos relevantes, a obtenção de CPD-EN para todas as esferas de governo é
                condição essencial para a conclusão da operação, sendo o Art. 206 o fundamento
                que permite esse resultado mesmo quando há litígio tributário em andamento.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-207" numero="Art. 207" titulo="Dispensa de Certidão para Evitar Caducidade de Direito">
            <LegalText>
              <p>
                Independentemente de disposição legal permissiva, será{" "}
                <strong>dispensada a prova de quitação de tributos</strong>, ou o seu suprimento,
                quando se tratar de prática de ato indispensável para evitar a caducidade de
                direito, respondendo, porém, todos os participantes no ato pelo tributo
                porventura devido e pelas penalidades cabíveis, exceto as relativas a infrações
                cuja responsabilidade seja pessoal ao infrator.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 207 cria uma válvula de emergência: quando a exigência de certidão impede
                a prática de ato indispensável para evitar a caducidade de um direito, a certidão
                é dispensada automaticamente, sem necessidade de autorização do Fisco ou do
                judiciário. O exemplo mais claro é a renovação de registro ou licença com prazo
                de validade iminente: se a exigência de CND impede a renovação a tempo e o
                direito caducaria (extinção do registro, perda da licença de funcionamento), o
                Art. 207 afasta a exigência. A dispensa é de pleno direito, não discricionária.
              </p>
              <p className="mt-3">
                A consequência do Art. 207 é a responsabilidade tributária solidária de todos
                os participantes do ato realizado sem a certidão. Se um imóvel foi transmitido
                sem CND com base no Art. 207 (para evitar caducidade de prazo em contrato de
                compra e venda), comprador e vendedor ficam solidariamente responsáveis pelos
                tributos devidos sobre a operação. Para o terceiro adquirente, isso é relevante
                em operações imobiliárias: adquirir bem sem CND, ainda que amparado pelo Art.
                207, implica assumir o risco de responsabilidade pelo ITBI e demais tributos
                que o vendedor devia sobre aquela operação. A ressalva das "infrações de
                responsabilidade pessoal ao infrator" protege o terceiro de boa-fé de ser
                responsabilizado por multas decorrentes de ato doloso exclusivo do outro
                participante.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-208" numero="Art. 208" titulo="Responsabilidade Pessoal por Certidão Negativa Falsa">
            <LegalText>
              <p>
                A certidão negativa expedida com{" "}
                <strong>dolo ou fraude</strong>, que contenha erro contra a Fazenda Pública,
                responsabiliza <strong>pessoalmente o funcionário</strong> que a expedir, pelo
                crédito tributário e juros de mora acrescidos.
              </p>
              <p className="mt-3">
                Parágrafo único. O disposto neste artigo não exclui a responsabilidade criminal
                e funcional que no caso couber.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Art. 208 encerra o Título IV com uma norma de responsabilização pessoal: o
                servidor público que expede CND sabidamente indevida, com dolo ou mediante
                fraude, responde com seu patrimônio pessoal pelo valor integral do crédito
                tributário que deveria ter impedido a emissão da certidão, acrescido de juros
                de mora. Não é a Fazenda Pública que paga — é o servidor. Essa responsabilidade
                patrimonial pessoal é mais gravosa do que a regra geral do Art. 37, §6º da
                CF/88, que prevê a responsabilidade objetiva do Estado com direito de regresso
                contra o agente em casos de dolo ou culpa: no Art. 208 do CTN, o dever de
                responder diretamente é do próprio funcionário, sem necessidade de ação de
                regresso prévia do Estado.
              </p>
              <p className="mt-3">
                O parágrafo único acumula as responsabilidades: a patrimonial do caput não
                exclui a criminal nem a funcional-disciplinar. Dependendo das circunstâncias,
                a emissão fraudulenta de CND pode configurar prevaricação (Art. 319 do Código
                Penal, quando o servidor se omite ou pratica ato para satisfazer interesse
                próprio), falsidade ideológica (Art. 299, quando insere declaração falsa em
                documento público) ou até peculato (Art. 312, se houver apropriação de valor
                pago pela certidão indevida). Na prática, os sistemas informatizados modernos
                de emissão de certidões (e-CAC, Regularize) automatizam a verificação e
                dificultam substancialmente a emissão manual indevida; o Art. 208 tem
                aplicação sobretudo em casos de manipulação de sistemas ou de servidores que
                atuam em repartições com controles menos automatizados.
              </p>
            </Comentario>
          </Artigo>

        </div>
      </div>
    </div>
  );
}
