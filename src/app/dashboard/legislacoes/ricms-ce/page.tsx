"use client";

import { useState, useEffect, useRef } from "react";

/* ─── índice ─── */

const tocEntries = [
  { id: "livro-1",    label: "LIVRO I: Parte Geral",                           level: 0 },
  { id: "disp-prel",  label: "Disposição Preliminar",                          level: 1 },
  { id: "art-1",      label: "Art. 1º: Consolidação do ICMS/CE",               level: 2 },
  { id: "titulo-1",   label: "TÍTULO I: Do Imposto",                           level: 0 },
  { id: "cap-mat",    label: "Cap. I: Critério Material (Incidência)",         level: 1 },
  { id: "art-2",      label: "Art. 2º: Hipóteses de Incidência",               level: 2 },
  { id: "cap-temp",   label: "Cap. II: Critério Temporal (Fato Gerador)",      level: 1 },
  { id: "art-3",      label: "Art. 3º: Momento do Fato Gerador",               level: 2 },
  { id: "cap-nao",    label: "Cap. III: Não Incidência",                       level: 1 },
  { id: "art-4",      label: "Art. 4º: Não Incidência — Operações",            level: 2 },
  { id: "art-5",      label: "Art. 5º: Não Incidência — Prestações",           level: 2 },
  { id: "cap-isen",   label: "Cap. IV: Isenções",                              level: 1 },
  { id: "art-6",      label: "Art. 6º: Isenções (Anexo I)",                    level: 2 },
  { id: "art-7",      label: "Art. 7º: Revogação de Of. da Isenção",           level: 2 },
  { id: "art-8",      label: "Art. 8º: Condição Posterior",                    level: 2 },
  { id: "cap-dif",    label: "Cap. V: Diferimento",                            level: 1 },
  { id: "art-9",      label: "Art. 9º: Conceito de Diferimento",               level: 2 },
  { id: "art-10",     label: "Art. 10: Hipóteses de Diferimento (Anexo II)",   level: 2 },
  { id: "art-11",     label: "Art. 11: Encerramento do Diferimento",           level: 2 },
  { id: "art-12",     label: "Art. 12: Exigência do ICMS Diferido",            level: 2 },
  { id: "art-13",     label: "Art. 13: Destaque no Documento Fiscal",          level: 2 },
  { id: "cap-esp",    label: "Cap. VI: Critério Espacial",                     level: 1 },
  { id: "art-14",     label: "Art. 14: Local da Operação",                     level: 2 },
  { id: "art-15",     label: "Art. 15: Conceito de Estabelecimento",           level: 2 },
  { id: "art-16",     label: "Art. 16: Estabelecimento Autônomo",              level: 2 },
  { id: "cap-pes",    label: "Cap. VII: Critério Pessoal",                     level: 1 },
  { id: "sec-contrib","label": "Seção I: Do Contribuinte",                     level: 1 },
  { id: "art-17",     label: "Art. 17: Contribuinte do ICMS",                  level: 2 },
  { id: "sec-resp",   label: "Seção II: Do Responsável",                       level: 1 },
  { id: "art-18",     label: "Art. 18: Responsabilidade de Terceiros",         level: 2 },
  { id: "art-19",     label: "Art. 19: Responsáveis pelo ICMS",                level: 2 },
  { id: "sec-solid",  label: "Seção III: Responsabilidade Solidária",          level: 1 },
  { id: "art-20",     label: "Art. 20: Solidariedade Passiva",                 level: 2 },
  { id: "art-21",     label: "Art. 21: Estabelecimentos da Mesma PJ",          level: 2 },
  { id: "sec-geral",  label: "Seção IV: Disposições Gerais",                   level: 1 },
  { id: "art-22",     label: "Art. 22: Irrelevância de Fatores Civis",         level: 2 },
  { id: "art-23",     label: "Art. 23: Responsabilidade Pessoal do Gestor",    level: 2 },
  { id: "art-24",     label: "Art. 24: Convenções Particulares x Fisco",       level: 2 },
  { id: "cap-quant",  label: "Cap. VIII: Critério Quantitativo",               level: 1 },
  { id: "sec-bc",     label: "Seção I: Base de Cálculo",                       level: 1 },
  { id: "art-25",     label: "Art. 25: Base de Cálculo do ICMS",               level: 2 },
  { id: "art-26",     label: "Art. 26: DIFAL — Consumidor Final Não Contribuinte", level: 2 },
  { id: "art-27",     label: "Art. 27: Moeda Estrangeira na Importação",           level: 2 },
  { id: "art-28",     label: "Art. 28: BC na Ausência de Valor da Operação",       level: 2 },
  { id: "art-29",     label: "Art. 29: Prestação de Serviço sem Valor Fixado",     level: 2 },
  { id: "art-30",     label: "Art. 30: BC na Substituição Tributária",             level: 2 },
  { id: "art-31",     label: "Art. 31: Frete Excedente entre Interdependentes",    level: 2 },
  { id: "art-32",     label: "Art. 32: Arbitramento pelo Fisco",                   level: 2 },
  { id: "art-33",     label: "Art. 33: Arbitramento em Extravio de Documentos",    level: 2 },
  { id: "art-34",     label: "Art. 34: Pauta de Preços pelo Executivo",            level: 2 },
  { id: "art-35",     label: "Art. 35: CEVR — Catálogo Eletrônico de Valores",       level: 2 },
  { id: "art-36",     label: "Art. 36: Cadastro Fiscal de Produtos",               level: 2 },
  { id: "art-37",     label: "Art. 37: Arbitramento — Casos Especiais",            level: 2 },
  { id: "art-38",     label: "Art. 38: Discordância no Arbitramento",              level: 2 },
  { id: "art-39",     label: "Art. 39: Procedimentos de Comprovação de Valor",     level: 2 },
  { id: "art-40",     label: "Art. 40: Regime Simplificado de Apuração",           level: 2 },
  { id: "art-41",     label: "Art. 41: Mercadoria sem Destinatário Certo",         level: 2 },
  { id: "art-42",     label: "Art. 42: Preço Sujeito a Verificação Posterior",     level: 2 },
  { id: "art-43",     label: "Art. 43: Reajustamento de Preço",                    level: 2 },
  { id: "art-44",     label: "Art. 44: Redução da Base de Cálculo",                level: 2 },
  { id: "sec-aliq",   label: "Seção II: Das Alíquotas",                            level: 1 },
  { id: "art-45",     label: "Art. 45: Alíquotas do ICMS",                         level: 2 },
  { id: "art-46",     label: "Art. 46: Aplicação das Alíquotas Internas",          level: 2 },
  { id: "sec-fecop",  label: "Seção III: FECOP",                                   level: 1 },
  { id: "art-47",     label: "Art. 47: Mercadorias com Adicional FECOP",           level: 2 },
  { id: "art-48",     label: "Art. 48: Recolhimento do FECOP",                     level: 2 },
  { id: "art-49",     label: "Art. 49: Apuração Mensal do FECOP",                  level: 2 },
  { id: "art-50",     label: "Art. 50: FECOP na ST por Convênio/Protocolo",        level: 2 },
  { id: "art-51",     label: "Art. 51: FECOP na ST Interna (Carga Líquida)",       level: 2 },
  { id: "art-52",     label: "Art. 52: (Revogado)",                                level: 2 },
  { id: "art-53",     label: "Art. 53: (Revogado)",                                level: 2 },
  { id: "art-54",     label: "Art. 54: Momento do FECOP — Produtos Específicos",   level: 2 },
  { id: "art-55",     label: "Art. 55: FECOP e Incentivos Fiscais",                level: 2 },
  { id: "art-56",     label: "Art. 56: FECOP e DIFAL EC 87/2015",                 level: 2 },
  { id: "art-57",     label: "Art. 57: Campos FECOP nos Documentos Fiscais",      level: 2 },
  { id: "art-57a",    label: "Art. 57-A: Remissão ao Capítulo X",                 level: 2 },
  { id: "cap-ix",     label: "Cap. IX: Sistemática de Apuração do ICMS",          level: 1 },
  { id: "sec-nao-cum",label: "Seção I: Não Cumulatividade",                       level: 1 },
  { id: "art-58",     label: "Art. 58: Não Cumulatividade do ICMS",               level: 2 },
  { id: "art-59",     label: "Art. 59: Montante do ICMS a Recolher",              level: 2 },
  { id: "art-60",     label: "Art. 60: Transferência de Saldo Credor",            level: 2 },
  { id: "sec-cred",   label: "Seção II: Do Crédito do Imposto",                   level: 1 },
  { id: "art-61",     label: "Art. 61: Crédito Fiscal — Hipóteses",               level: 2 },
  { id: "art-62",     label: "Art. 62: Crédito de Energia Elétrica",              level: 2 },
  { id: "art-63",     label: "Art. 63: Crédito de Comunicação",                   level: 2 },
  { id: "art-64",     label: "Art. 64: Crédito de Transporte (FOB/CIF)",          level: 2 },
  { id: "art-65",     label: "Art. 65: Crédito de Ativo Imobilizado (1/48)",      level: 2 },
  { id: "art-66",     label: "Art. 66: CIAP — Controle do Ativo Permanente",      level: 2 },
  { id: "art-67",     label: "Art. 67: Saldo Credor no Encerramento",             level: 2 },
  { id: "art-68",     label: "Art. 68: Crédito na Devolução e Retorno",           level: 2 },
  { id: "art-69",     label: "Art. 69: Crédito Extemporâneo",                     level: 2 },
  { id: "art-70",     label: "Art. 70: Crédito Interestadual — Limitação",        level: 2 },
  { id: "art-71",     label: "Art. 71: Crédito Fiscal Presumido",                 level: 2 },
  { id: "art-72",     label: "Art. 72: Vedações ao Crédito de ICMS",              level: 2 },
  { id: "art-73",     label: "Art. 73: Estorno do Crédito",                       level: 2 },
  { id: "art-74",     label: "Art. 74: Transferência de Crédito de Exportação",   level: 2 },
  { id: "art-75",    label: "Art. 75: Procedimentos de Transferência",             level: 2 },
  { id: "art-76",    label: "Art. 76: Apropriação pelo Destinatário",              level: 2 },
  { id: "art-77",    label: "Art. 77: CADINE e Transferência de Crédito",          level: 2 },
  { id: "sec-vii",   label: "Seção VII: Leilão de Créditos Acumulados",           level: 1 },
  { id: "art-78",    label: "Art. 78: Leilão Reverso (Opção ao Art. 74)",         level: 2 },
  { id: "art-79",    label: "Art. 79: Modalidade do Leilão Reverso",              level: 2 },
  { id: "art-80",    label: "Art. 80: Credenciamento ao Leilão",                  level: 2 },
  { id: "art-81",    label: "Art. 81: Homologação pela PGE",                      level: 2 },
  { id: "art-82",    label: "Art. 82: Normas do Pregão Aplicáveis",               level: 2 },
  { id: "sec-viii",  label: "Seção VIII: Da Compensação",                         level: 1 },
  { id: "art-83",    label: "Art. 83: Compensação de Crédito Inscrito em DA",    level: 2 },
  { id: "art-84",    label: "Art. 84: Compensação de Ofício pela SEFAZ",         level: 2 },
  { id: "sec-ix",    label: "Seção IX: Compensação com Precatórios",             level: 1 },
  { id: "art-85",    label: "Art. 85: Compensação com Precatórios",              level: 2 },
  { id: "cap-x",     label: "Cap. X: Do Recolhimento do Imposto",                level: 0 },
  { id: "sec-x-i",   label: "Seção I: Forma e Prazos",                           level: 1 },
  { id: "art-86",    label: "Art. 86: Contagem Contínua dos Prazos",             level: 2 },
  { id: "art-87",    label: "Art. 87: Rede Arrecadadora Credenciada",            level: 2 },
  { id: "art-88",    label: "Art. 88: Prazos de Recolhimento do ICMS",          level: 2 },
  { id: "art-89",    label: "Art. 89: Encerramento de Atividades",               level: 2 },
  { id: "sec-x-ii",  label: "Seção II: Acréscimos Moratórios",                  level: 1 },
  { id: "art-90",    label: "Art. 90: Mora Espontânea (0,15%/dia, máx. 15%)",  level: 2 },
  { id: "art-91",    label: "Art. 91: Juros de Mora SELIC",                     level: 2 },
  { id: "art-92",    label: "Art. 92: Acréscimos Moratórios no SITRAM",         level: 2 },
  { id: "art-93",    label: "Art. 93: Auto de Infração sem Data Certa",         level: 2 },
  { id: "sec-x-iii", label: "Seção III: Do Parcelamento",                       level: 1 },
  { id: "art-94",    label: "Art. 94: Parcelamento de Débitos não Inscritos",   level: 2 },
  { id: "art-95",    label: "Art. 95: Requerimento de Parcelamento",            level: 2 },
  { id: "art-96",    label: "Art. 96: Deferimento Automático (até 60 parcelas)", level: 2 },
  { id: "art-96a",   label: "Art. 96-A: Parcelamento de Estoque (CNAE/ST)",    level: 2 },
  { id: "art-97",    label: "Art. 97: Cálculo do Valor das Parcelas",           level: 2 },
  { id: "art-98",    label: "Art. 98: Perda do Parcelamento por Atraso",        level: 2 },
  { id: "art-99",    label: "Art. 99: Parcelamento em Cobrança Judicial",       level: 2 },
  { id: "art-100",   label: "Art. 100: (Revogado)",                                   level: 2 },
  { id: "sec-sub-ii",label: "Subseção II: Parcelamento de Débitos Inscritos em DA",   level: 1 },
  { id: "art-101",   label: "Art. 101: Parcelamento de Débitos Inscritos em DA",      level: 2 },
  { id: "cap-xi",    label: "Cap. XI: Da Restituição",                                level: 0 },
  { id: "sec-xi-i",  label: "Seção I: Disposições Gerais",                            level: 1 },
  { id: "art-102",   label: "Art. 102: Restituição de Pagamento Indevido",           level: 2 },
  { id: "art-103",   label: "Art. 103: Restituição a Quem Assumiu o Encargo",        level: 2 },
  { id: "art-104",   label: "Art. 104: Restituição Proporcional dos Acréscimos",     level: 2 },
  { id: "sec-xi-ii", label: "Seção II: Restituição Autorizada pelo Secretário",      level: 1 },
  { id: "art-105",   label: "Art. 105: Pedidos com Valor >= 5.000 UFIRCEs",          level: 2 },
  { id: "sec-xi-iii",label: "Seção III: Restituição em Conta Gráfica (EFD)",         level: 1 },
  { id: "art-106",   label: "Art. 106: Pedidos Abaixo de 5.000 UFIRCEs",             level: 2 },
  { id: "sec-xi-iv", label: "Seção IV: Restituição via SITRAM",                      level: 1 },
  { id: "art-107",   label: "Art. 107: Restituição via Crédito no SITRAM",           level: 2 },
  { id: "cap-xii",   label: "Cap. XII: Disposições Finais",                          level: 0 },
  { id: "art-108",   label: "Art. 108: Revogação de Disposições Anteriores",         level: 2 },
];

/* ─── componentes ─── */

function LegalText({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 border-l-4 border-gray-300 dark:border-gray-700 px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </div>
  );
}

function Comentario({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-l-4 border-[#007cca] px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#007cca] mb-3">
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
    <div id={id} className="scroll-mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#007cca]">{numero}</span>
        <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

function Secao({ id, titulo, subtitulo }: { id: string; titulo: string; subtitulo?: string }) {
  return (
    <div id={id} className="scroll-mt-4 pt-4">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#007cca]">{titulo}</p>
        {subtitulo && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitulo}</p>}
      </div>
    </div>
  );
}

function TableOfContents({ activeId }: { activeId: string }) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const el = navRef.current.querySelector(`[href="#${activeId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <nav ref={navRef} className="text-sm space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-2">Índice</p>
      {tocEntries.map((entry) => {
        const isActive = activeId === entry.id;
        return (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={[
              "block rounded-lg transition-all duration-150 leading-snug",
              entry.level === 0 ? "px-2 py-1.5 font-semibold text-[13px] text-gray-800 dark:text-gray-100" : "",
              entry.level === 1 ? "pl-4 pr-2 py-1.5 font-medium text-[12px] text-gray-600 dark:text-gray-400" : "",
              entry.level === 2 ? "pl-6 pr-2 py-1 text-[12px] text-gray-500 dark:text-gray-500" : "",
              isActive
                ? "!text-[#007cca] bg-blue-50 dark:bg-blue-950/50 font-medium"
                : "hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200",
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

export default function RicmsCePage() {
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
        <h1 className="text-4xl font-black text-white leading-tight">RICMS do Ceará</h1>
        <h2 className="mt-2 text-base font-normal text-[#a8c8e8] border-l-4 border-[#2e6da4] pl-4">
          Comentários ao Decreto nº 33.327/2019 — Claudenir Vasconcelos Nojosa
        </h2>
        <hr className="my-6 border-[#2e6da4]" />
        <div className="flex flex-wrap gap-8 text-sm">
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Publicação</p><p className="text-white font-medium">30 out. 2019</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Vigência</p><p className="text-white font-medium">Em vigor (com alterações)</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Artigos comentados</p><p className="text-white font-medium">Arts. 1º ao 108</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7eb8e8]">Escopo</p><p className="text-white font-medium">ICMS — Estado do Ceará</p></div>
        </div>
      </div>

      {/* layout */}
      <div className="flex gap-8 items-start">

        {/* TOC lateral */}
        <aside className="hidden xl:block w-64 flex-shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <TableOfContents activeId={activeId} />
        </aside>

        {/* conteúdo */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── LIVRO PRIMEIRO ── */}
          <Secao id="livro-1" titulo="LIVRO PRIMEIRO — Parte Geral" />

          <Secao id="disp-prel" titulo="Disposição Preliminar" />

          <Artigo id="art-1" numero="Art. 1º" titulo="Consolidação do ICMS no Ceará">
            <LegalText>
              <p>
                Este Decreto consolida e regulamenta a legislação do Imposto sobre
                Operações Relativas à Circulação de Mercadorias e sobre Prestações
                de Serviços de Transporte Interestadual e Intermunicipal e de
                Comunicação (ICMS), de que trata a Lei nº 12.670, de 27 de
                dezembro de 1996.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O RICMS do Ceará (Decreto nº 33.327/2019) é o regulamento geral
                do ICMS estadual, expedido com base no art. 212 do CTN, que
                autoriza o Poder Executivo a consolidar a legislação tributária em
                texto único. O decreto não cria tributo; retoma a Lei nº
                12.670/1996 e a detalha para fins de aplicação administrativa.
              </p>
              <p className="mt-3">
                Importante notar que o decreto se ancora em ampla construção
                doutrinária da regra-matriz de incidência tributária (Carvalho,
                Becker), estruturando seus capítulos exatamente nos critérios
                dessa teoria: material, temporal, espacial, pessoal e quantitativo.
                Essa organização torna o RICMS do Ceará um dos regulamentos
                estaduais mais didaticamente estruturados do país.
              </p>
            </Comentario>
          </Artigo>

          {/* ── TÍTULO I ── */}
          <Secao id="titulo-1" titulo="TÍTULO I — Do Imposto" />

          <Secao id="cap-mat" titulo="Capítulo I — Critério Material (Incidência)" />

          <Artigo id="art-2" numero="Art. 2º" titulo="Hipóteses de Incidência do ICMS">
            <LegalText>
              <p>O ICMS incide sobre:</p>
              <p className="mt-2">
                <strong>I</strong> — as operações relativas à circulação de
                mercadorias, inclusive o fornecimento de alimentação e bebidas em
                bares, restaurantes e estabelecimentos similares;
              </p>
              <p>
                <strong>II</strong> — a aquisição, em licitação promovida pelo
                Poder Público, de mercadorias ou bens importados do exterior,
                apreendidos ou abandonados;
              </p>
              <p>
                <strong>III</strong> — o fornecimento de mercadorias com
                prestação de serviços não compreendidos na competência tributária
                dos Municípios;
              </p>
              <p>
                <strong>IV</strong> — o fornecimento de mercadorias com prestação
                de serviços compreendidos na competência tributária dos Municípios,
                com indicação expressa da incidência do ICMS, conforme LC
                116/2003;
              </p>
              <p>
                <strong>V</strong> — as operações de circulação de mercadoria ou
                bem importados do exterior por pessoa física ou jurídica, ainda que
                não seja contribuinte habitual, qualquer que seja a finalidade;
              </p>
              <p>
                <strong>VI</strong> — as operações de circulação, neste Estado,
                decorrentes de entradas interestaduais de: (a) mercadoria sujeita
                ao regime de pagamento antecipado; (b) mercadoria, bem ou serviço
                destinados a contribuinte para uso/consumo ou ativo imobilizado;
                (c) energia elétrica e petróleo, não destinados à comercialização
                ou industrialização;
              </p>
              <p>
                <strong>VII</strong> — operações e prestações iniciadas em outra
                UF que destinem mercadorias, bens ou serviços a consumidor final
                não contribuinte localizado no Ceará (DIFAL-EC 87);
              </p>
              <p>
                <strong>VIII</strong> — prestações de serviços de transporte
                interestadual e intermunicipal, por qualquer via;
              </p>
              <p>
                <strong>IX</strong> — prestações onerosas de serviços de
                comunicação, por qualquer meio;
              </p>
              <p>
                <strong>X</strong> — serviços de transporte e de comunicação
                prestados ou iniciados no exterior.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> A energia elétrica é considerada mercadoria
                para efeito da incidência do ICMS.
              </p>
              <p>
                <strong>§ 4º</strong> São irrelevantes para o fato gerador: a
                natureza jurídica da operação, a posse do título jurídico, a
                validade dos atos praticados, o cumprimento de exigências legais e
                o resultado financeiro obtido.
              </p>
              <p>
                <strong>§ 5º</strong> A autoridade fiscal poderá desconsiderar ato
                ou negócio jurídico praticado com a finalidade de descaracterizar o
                fato gerador, assegurado o contraditório e a ampla defesa.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 2º espelha o art. 2º da Lei Kandir (LC 87/1996) e define o
                critério material da regra-matriz do ICMS cearense. O inciso I
                abrange a hipótese central: a circulação jurídica de mercadorias,
                que exige a transferência de titularidade (STJ, Súmula 166, proíbe
                incidência sobre transferência entre estabelecimentos do mesmo
                titular, embora o tema ainda seja disputado no STF após a ADC 49).
              </p>
              <p className="mt-3">
                O inciso VI alínea "b" reproduz o mecanismo do diferencial de
                alíquota (DIFAL) nas aquisições interestaduais para uso, consumo e
                ativo imobilizado por contribuintes, previsto na EC 87/2015, que
                depois foi estendido, pelo próprio inciso VII, às operações com
                consumidor final não contribuinte. O § 4º consagra o princípio da
                substância sobre a forma: o ICMS incide com base na realidade
                econômica da operação, independentemente de vícios formais ou
                nulidades de direito privado.
              </p>
              <p className="mt-3">
                O § 5º incorpora a cláusula anti-elisiva, compatível com o art. 116,
                parágrafo único, do CTN, autorizando a desconsideração de atos
                artificiosos destinados a elidir o fato gerador.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-temp" titulo="Capítulo II — Critério Temporal (Fato Gerador)" />

          <Artigo id="art-3" numero="Art. 3º" titulo="Momento de Ocorrência do Fato Gerador">
            <LegalText>
              <p>Ocorre o fato gerador do ICMS no momento:</p>
              <p className="mt-2">
                <strong>I</strong> — da saída, a qualquer título, de mercadoria de
                estabelecimento de contribuinte, ainda que para outro do mesmo
                titular;
              </p>
              <p>
                <strong>II</strong> — do fornecimento de alimentação, bebidas e
                outras mercadorias em qualquer estabelecimento;
              </p>
              <p>
                <strong>III</strong> — da transmissão, a terceiro, de mercadoria
                depositada em armazém geral ou em depósito fechado;
              </p>
              <p>
                <strong>IV</strong> — da transmissão de propriedade de mercadoria
                ou de título que a represente, quando a mercadoria não houver
                transitado pelo estabelecimento do transmitente;
              </p>
              <p>
                <strong>VIII</strong> — do desembaraço aduaneiro de mercadorias ou
                bens importados do exterior;
              </p>
              <p>
                <strong>IX</strong> — da entrada, neste Estado, de mercadoria
                sujeita ao regime de pagamento antecipado;
              </p>
              <p>
                <strong>X</strong> — da entrada, no estabelecimento de
                contribuinte, de mercadoria ou bem oriundos de outra UF, destinados
                ao uso, consumo ou ativo imobilizado;
              </p>
              <p>
                <strong>XIII</strong> — do início da prestação de serviços de
                transporte interestadual e intermunicipal;
              </p>
              <p>
                <strong>XVI</strong> — da entrada, neste Estado, de mercadoria,
                bem ou serviço oriundo de outra UF, destinado a consumidor final
                não contribuinte (DIFAL-EC 87).
              </p>
              <p className="mt-2">
                <strong>§ 6º</strong> Equipara-se à saída: (I) a transmissão da
                propriedade de mercadoria que não transitar pelo estabelecimento do
                transmitente; (II) o estoque final de mercadorias na data do
                encerramento da atividade econômica.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 3º define o critério temporal da regra-matriz: em que
                instante exata nasce a obrigação tributária. Ao todo são dezesseis
                incisos, cada um correspondendo a uma hipótese distinta de fato
                gerador. O mais frequente na prática (inciso I) é a saída de
                mercadoria do estabelecimento, que gera o imposto mesmo quando a
                transferência se dá entre filiais do mesmo grupo econômico.
              </p>
              <p className="mt-3">
                O inciso VIII cria o fato gerador na importação pelo desembaraço
                aduaneiro, alinhado ao art. 155, § 2º, IX, "a", da CF/88 e ao
                entendimento do STF (RE 580.603). O inciso IX prevê o pagamento
                antecipado como momento de incidência, mecanismo amplamente
                utilizado pelo Ceará para assegurar a arrecadação nas entradas de
                mercadorias sujeitas a substituição tributária ou antecipação
                tributária sem encerramento de fase.
              </p>
              <p className="mt-3">
                O § 6º equipara à saída a transmissão de propriedade sem trânsito
                físico pelo estabelecimento (venda à ordem, por exemplo) e o
                estoque final na baixa de atividade, evitando saídas desoneradas na
                extinção de empresas.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-nao" titulo="Capítulo III — Não Incidência" />

          <Artigo id="art-4" numero="Art. 4º" titulo="Não Incidência sobre Operações">
            <LegalText>
              <p>O ICMS não incide sobre:</p>
              <p className="mt-2">
                <strong>I</strong> — operações com livros, jornais, periódicos e o
                papel destinado à sua impressão, ainda que gravados por meio
                eletrônico;
              </p>
              <p>
                <strong>II</strong> — operações que destinem ao exterior
                mercadorias, inclusive produtos primários e industrializados
                semielaborados (imunidade exportação);
              </p>
              <p>
                <strong>III</strong> — operações interestaduais com energia
                elétrica e petróleo, lubrificantes e combustíveis dele derivados,
                quando destinados à industrialização ou à comercialização;
              </p>
              <p>
                <strong>IV</strong> — operações com ouro como ativo financeiro ou
                instrumento cambial;
              </p>
              <p>
                <strong>XIV</strong> — operações de saída de mercadorias com fim
                específico de exportação para empresa comercial exportadora,
                armazém alfandegado ou entreposto aduaneiro;
              </p>
              <p>
                <strong>XVI</strong> — operações de fornecimento de energia
                elétrica para consumidor residencial com consumo igual ou inferior
                a 50 kWh/mês; produtor rural; ou enquadrado na "Residencial Baixa
                Renda" com consumo de 51 a 140 kWh/mês.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O artigo relaciona as hipóteses de não incidência, que incluem
                tanto imunidades constitucionais (incisos I e II, derivadas dos
                arts. 150, VI, "d" e 155, § 2º, X, "a" da CF/88) quanto
                desonerações criadas pela própria lei estadual. A distinção é
                relevante: a imunidade constitucional é absoluta e não pode ser
                revogada pelo legislador infraconstitucional; já a não incidência
                legal pode ser reduzida ou condicionada por lei.
              </p>
              <p className="mt-3">
                O inciso XVI introduz uma não incidência social expressiva: a
                isenção de ICMS sobre o consumo de energia elétrica de baixa renda.
                Trata-se de técnica de extrafiscalidade que usa o tributo estadual
                para reduzir o custo do serviço essencial às famílias mais
                vulneráveis, compatível com o princípio da seletividade previsto no
                art. 155, § 2º, III, da CF/88.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-5" numero="Art. 5º" titulo="Não Incidência sobre Prestações">
            <LegalText>
              <p>O ICMS não incide sobre prestações:</p>
              <p className="mt-2">
                <strong>I</strong> — de serviço de transporte que destinem ao
                exterior mercadorias ou bens;
              </p>
              <p>
                <strong>II</strong> — gratuitas de radiodifusão sonora e de
                televisão;
              </p>
              <p>
                <strong>III</strong> — de serviço de transporte de carga própria,
                desde que acompanhado de nota fiscal e identificação como "Transporte
                de carga própria";
              </p>
              <p>
                <strong>IV</strong> — de transporte de pessoas não remunerado,
                efetuado por particulares.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 5º complementa o art. 4º tratando das prestações de
                serviços não sujeitas ao ICMS. O inciso I é uma imunidade
                constitucional ligada à exportação (art. 155, § 2º, X, "a", CF),
                garantindo que o serviço de transporte vinculado à exportação também
                saia imune. O inciso II protege a radiodifusão gratuita, setor
                regulado e fiscalizado pela União, que não apresenta a
                onerosidade necessária para a incidência do ICMS sobre serviços de
                comunicação.
              </p>
              <p className="mt-3">
                O inciso III exige documentação específica para o transporte de
                carga própria, criando ônus documental como contrapartida da não
                incidência. Trata-se de regra antiabuso, que impede que
                transportadoras disfarcem prestações onerosas como transporte
                próprio para fugir do imposto.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-isen" titulo="Capítulo IV — Isenções" />

          <Artigo id="art-6" numero="Art. 6º" titulo="Isenções do ICMS (Anexo I)">
            <LegalText>
              <p>
                São isentas do ICMS as operações e prestações relacionadas no
                Anexo I deste Decreto.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> A isenção, salvo determinação em contrário:
                (I) não implicará crédito para compensação com o montante devido
                nas operações seguintes; (II) acarretará a anulação do crédito
                relativo às operações anteriores.
              </p>
              <p>
                <strong>§ 2º</strong> A isenção do imposto não dispensa o
                contribuinte do cumprimento das obrigações acessórias, salvo
                disposição em contrário.
              </p>
              <p>
                <strong>§ 3º</strong> A isenção para operação com determinada
                mercadoria não alcança a prestação de serviço de transporte com ela
                relacionada, salvo disposição em contrário.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 6º remete ao Anexo I para o rol das isenções, técnica
                legislativa que permite atualização das hipóteses sem alterar o
                corpo principal do decreto. O § 1º incorpora as regras do art. 20
                da LC 87/1996 sobre vedação ao creditamento nas operações isentas,
                corolário da não-cumulatividade: se a saída é isenta, não faz
                sentido assegurar crédito sobre as entradas correspondentes.
              </p>
              <p className="mt-3">
                O § 3º é importante na prática: mesmo que a mercadoria seja isenta,
                o transporte pode ser tributado pelo ICMS, pois a isenção de uma
                operação não se comunica automaticamente à prestação de serviço
                correlata. Isso exige atenção nas operações em que a nota fiscal de
                transporte é emitida separadamente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-7" numero="Art. 7º" titulo="Revogação de Ofício da Isenção">
            <LegalText>
              <p>
                Nos casos em que a isenção for concedida por despacho da autoridade
                fazendária, este não gera direito adquirido, devendo a concessão
                ser revogada de ofício sempre que se apure que o beneficiário não
                satisfazia ou deixou de satisfazer as condições, ou não cumpria ou
                deixou de cumprir os requisitos para a sua concessão.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> A revogação de ofício será
                realizada pela autoridade fazendária competente para conceder a
                respectiva isenção, devendo ser oportunizado ao beneficiário o
                contraditório e a ampla defesa.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O dispositivo reflete o art. 179 do CTN: a isenção condicionada a
                despacho não gera direito adquirido. Se os pressupostos deixam de
                ser atendidos, o fisco pode revogar o benefício retroativamente ao
                momento em que a condição foi descumprida. O parágrafo único é
                importante garantia processual: antes de revogar, o fisco deve
                oportunizar o contraditório, exigência que decorre do art. 5º, LV,
                da CF/88 e é reafirmada aqui.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-8" numero="Art. 8º" titulo="Isenção com Condição Posterior">
            <LegalText>
              <p>
                A isenção ou qualquer outro benefício fiscal cujo reconhecimento
                depender de condição posterior não prevalecerá quando esta não for
                satisfeita, hipótese em que o ICMS será exigido a partir do momento
                da ocorrência do fato gerador, sem prejuízo da cobrança dos
                acréscimos legais.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 8º trata da isenção subordinada a condição resolutiva: se a
                condição futura não se implementa, o benefício caduca desde o início
                e o ICMS passa a ser exigido com juros e multa desde o fato
                gerador. A norma desestimula o uso do benefício por contribuintes
                que não têm certeza de cumprir a condição exigida, pois o risco
                retroativo recai sobre eles.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-dif" titulo="Capítulo V — Diferimento" />

          <Artigo id="art-9" numero="Art. 9º" titulo="Conceito de Diferimento">
            <LegalText>
              <p>
                Entende-se por diferimento a postergação do pagamento do ICMS
                devido em determinada operação ou prestação, o qual é transferido
                para etapas posteriores.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Ocorrendo o diferimento, atribuir-se-á a
                responsabilidade pelo pagamento do ICMS diferido ao adquirente ou
                destinatário da mercadoria ou ao tomador do serviço.
              </p>
              <p>
                <strong>§ 2º</strong> Salvo disposição em contrário, fica vedada a
                aplicação do diferimento às operações: (I) sujeitas ao regime de
                substituição tributária; (II) de importação.
              </p>
              <p>
                <strong>§ 3º</strong> Interrompe o diferimento a ocorrência de
                qualquer fato que altere o curso da operação antes de encerrada a
                etapa do diferimento.
              </p>
              <p>
                <strong>§ 5º</strong> Observado o disposto no § 6º, o diferimento
                aplica-se somente às operações e prestações internas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O diferimento é uma técnica de tributação diferida: o fato gerador
                ocorre (há incidência), mas o pagamento é transferido para o próximo
                elo da cadeia. Distingue-se da isenção (ausência de incidência) e
                da substituição tributária progressiva (recolhimento antecipado). No
                diferimento, quem paga é o adquirente, não o remetente.
              </p>
              <p className="mt-3">
                O mecanismo é amplamente utilizado nas cadeias produtivas primárias
                do Ceará: produtor rural que vende para indústria, por exemplo, pode
                sair com o imposto diferido, e a responsabilidade recai sobre a
                indústria adquirente. O § 2º evita conflito com a substituição
                tributária: não se aplica diferimento a operações já sujeitas a
                regime de ST, que tem regras próprias.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-10" numero="Art. 10" titulo="Hipóteses de Diferimento (Anexo II)">
            <LegalText>
              <p>
                O imposto será diferido nas hipóteses relacionadas no Anexo II deste
                Decreto.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Anexo II contém o rol detalhado das operações com diferimento,
                abrangendo setores como agropecuária, pesca, mineração e insumos
                industriais. A técnica de remissão a anexo permite atualização ágil
                das hipóteses via ato do Secretário da Fazenda, sem necessidade de
                alterar o corpo do decreto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-11" numero="Art. 11" titulo="Encerramento do Diferimento">
            <LegalText>
              <p>Encerra-se o diferimento, salvo disposição da legislação em contrário, quando:</p>
              <p className="mt-2">
                <strong>I</strong> — a operação com mercadoria recebida com o
                imposto diferido, ou com outra dela resultante, promovida pelo
                adquirente, não estiver alcan&#231;ada pelo diferimento, for isenta
                ou não tributada;
              </p>
              <p>
                <strong>II</strong> — a operação for realizada ou o serviço
                prestado sem o acompanhamento por documento fiscal;
              </p>
              <p>
                <strong>III</strong> — a mercadoria ou o serviço estiverem
                acompanhados de documento fiscal que consigne valor inferior ao
                deliberadamente praticado no mercado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O encerramento do diferimento é automático quando a mercadoria
                deixa o circuito diferido: seja porque o adquirente a vende em
                operação tributada normalmente (inciso I), seja por irregularidade
                documental (incisos II e III). O inciso II é antiabuso clássico:
                usar o diferimento para transitar mercadoria sem nota é fraude, e o
                tributo torna-se imediatamente exigível.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-12" numero="Art. 12" titulo="Exigência do ICMS Diferido">
            <LegalText>
              <p>
                Salvo disposição da legislação em contrário:
              </p>
              <p className="mt-2">
                <strong>I</strong> — encerrada a etapa do diferimento, o ICMS será
                exigido ainda que a operação que encerra essa fase: (a) não esteja
                sujeita ao pagamento do ICMS; (b) esteja sujeita a carga tributária
                inferior à prevista para a operação anteriormente diferida;
              </p>
              <p>
                <strong>II</strong> — o pagamento do ICMS diferido será efetuado
                pelo contribuinte que promover a operação que encerrar a fase de
                diferimento, nos prazos e na forma previstos na legislação.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> Não será exigido o ICMS diferido:
                (I) quando o diferimento encerrar-se por ocasião de saída para o
                exterior; (II) após decorridos 5 (cinco) anos contados da data da
                emissão da nota fiscal relativa à operação cujo imposto foi
                diferido.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 12 estabelece que o diferimento não gera redução de carga:
                mesmo que a saída subsequente seja isenta ou tributada a alíquota
                menor, o ICMS diferido é exigido integralmente. Excepciona-se a
                exportação (regra constitucional: imunidade do inciso X do art. 155,
                § 2º, CF) e a prescrição quinquenal do direito de cobrar o imposto
                diferido, prazo alinhado ao art. 174 do CTN.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-13" numero="Art. 13" titulo="Destaque no Documento Fiscal">
            <LegalText>
              <p>
                O valor do imposto diferido não deverá ser destacado no documento
                fiscal relativo à operação ou prestação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A vedação ao destaque do imposto diferido na nota fiscal tem
                finalidade informacional: como o ICMS não é pago naquela etapa, não
                há montante a ser creditado pelo destinatário. Destacar o imposto
                diferido criaria crédito fictício e violaria a não-cumulatividade.
                Essa regra é complementada pela Instrução Normativa nº 29/2025, que
                detalha o preenchimento da NF-e nas operações com diferimento.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-esp" titulo="Capítulo VI — Critério Espacial" />

          <Artigo id="art-14" numero="Art. 14" titulo="Local da Operação ou Prestação">
            <LegalText>
              <p>
                O local da operação ou da prestação, para efeito de cobrança do
                imposto e definição do estabelecimento responsável, é:
              </p>
              <p className="mt-2">
                <strong>I</strong> — tratando-se de mercadoria ou bem: (a) o do
                estabelecimento onde se encontre no momento do fato gerador; (b)
                onde se encontre em situação irregular por falta de documentação;
                (c) o do estabelecimento que transfira a propriedade sem trânsito
                físico; (d) importado do exterior, o do estabelecimento do
                destinatário; (h) o do adquirente, nas entradas interestaduais de
                energia elétrica e petróleo não destinados à comercialização;
              </p>
              <p>
                <strong>II</strong> — tratando-se de prestação de serviço de
                transporte: (a) aquele onde se tenha iniciado a prestação; (b) onde
                se encontre o transportador em situação irregular; (c) o do
                estabelecimento destinatário, na utilização de serviço interestadual
                não vinculado à operação subsequente;
              </p>
              <p>
                <strong>III</strong> — tratando-se de prestação onerosa de serviço
                de comunicação: (a) o da prestação realizada; (b) o do
                estabelecimento que forneça fichas, cartões ou assemelhados; (d) o
                do tomador, quando prestado por meio de satélite;
              </p>
              <p>
                <strong>IV</strong> — tratando-se de serviços prestados ou
                iniciados no exterior, o do estabelecimento do destinatário.
              </p>
              <p className="mt-2">
                <strong>§ 5º</strong> Tratando-se de serviços não medidos que
                envolvam localidades em diferentes UFs, com preço cobrado por
                períodos, o imposto será recolhido em partes iguais para as UFs
                onde estiverem localizados o prestador e o tomador.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O critério espacial determina qual estado tem competência para
                exigir o ICMS em cada operação. A regra geral (inciso I, "a") é o
                local do estabelecimento no momento do fato gerador. As exceções
                mais relevantes são: (i) a importação, tributada no Estado do
                destinatário (alínea "d"); (ii) a energia elétrica e petróleo não
                destinados à comercialização, tributados no Estado do adquirente
                (alínea "h"), regra que deu origem a frequentes disputas entre
                estados produtores e consumidores.
              </p>
              <p className="mt-3">
                O § 5º resolve a repartição do ICMS-Comunicação nos serviços não
                medidos (TV por assinatura, por exemplo), determinando partilha
                igualitária entre o estado prestador e o estado tomador. Esse modelo
                foi objeto de ampla litigância antes de sua positivação.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-15" numero="Art. 15" titulo="Conceito de Estabelecimento">
            <LegalText>
              <p>
                Para os efeitos deste Decreto, estabelecimento é o local, privado
                ou público, edificado ou não, ainda que existente apenas em ambiente
                virtual, móvel ou imóvel, próprio ou de terceiro, onde pessoas
                físicas ou jurídicas exerçam suas atividades em caráter temporário
                ou permanente, bem como onde se encontrem armazenadas mercadorias
                ou bens.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Na impossibilidade de determinação do
                estabelecimento, considera-se como tal o local em que tenha sido
                efetuada a operação ou prestação, encontrada a mercadoria ou
                constatada a prestação.
              </p>
              <p>
                <strong>§ 2º</strong> O veículo usado no comércio ambulante e a
                embarcação utilizada na captura de peixes, crustáceos e moluscos
                consideram-se extensão do estabelecimento.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O conceito legal de estabelecimento é amplo e funcional. A inclusão
                de ambientes virtuais na definição (atualização introduzida pelo
                Decreto nº 33.452/2020) é resposta à economia digital: plataformas
                de e-commerce, marketplaces e empresas com presença exclusivamente
                on-line passam a se enquadrar na mesma definição de estabelecimento
                que uma loja física.
              </p>
              <p className="mt-3">
                O § 2º é norma prática que resolve o problema do comércio ambulante
                e da pesca artesanal: o veículo ou a embarcação é tratado como filial
                do estabelecimento principal, permitindo a emissão de documentos
                fiscais e o controle da arrecadação.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-16" numero="Art. 16" titulo="Estabelecimento Autônomo">
            <LegalText>
              <p>
                Salvo disposição em contrário, considera-se estabelecimento
                autônomo, para efeito de emissão de documentos fiscais e sua
                escrituração, e, quando for o caso, para recolhimento do imposto
                relativo às operações e prestações nele realizadas, cada
                estabelecimento, ainda que do mesmo contribuinte.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O princípio da autonomia dos estabelecimentos é pilar da
                escrituração fiscal do ICMS: cada filial emite sua própria nota
                fiscal, apura seu próprio saldo e recolhe ou credita
                separadamente. Isso é relevante para o SPED ICMS/IPI (EFD) e para
                a análise de aproveitamento de créditos: o crédito gerado em um
                estabelecimento não pode ser transferido livremente para outro sem
                previsão legal específica.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-pes" titulo="Capítulo VII — Critério Pessoal" />
          <Secao id="sec-contrib" titulo="Seção I — Do Contribuinte" />

          <Artigo id="art-17" numero="Art. 17" titulo="Contribuinte do ICMS">
            <LegalText>
              <p>
                Contribuinte é qualquer pessoa física ou jurídica que realize, com
                habitualidade ou em volume que caracterize intuito comercial,
                operações de circulação de mercadorias ou prestações de serviços de
                transporte interestadual e intermunicipal e de comunicação, ainda
                que as operações e prestações se iniciem no exterior.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> É também contribuinte a pessoa física ou
                jurídica que, mesmo sem habitualidade ou intuito comercial: (I)
                importe mercadorias ou bens do exterior; (II) seja destinatária de
                serviço prestado no exterior; (III) adquira, em licitação, bens
                importados apreendidos ou abandonados; (IV) adquira energia elétrica
                e petróleo oriundos de outra UF, não destinados à comercialização.
              </p>
              <p>
                <strong>§ 2º</strong> Incluem-se entre os contribuintes do ICMS: o
                importador, o arrematante, o produtor, o extrator, o industrial e o
                comerciante; o prestador de serviços de transporte e de comunicação;
                a cooperativa; a instituição financeira e a seguradora; entre outros.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A definição de contribuinte adota o critério da habitualidade ou do
                volume que caracterize intuito comercial, alinhada ao art. 4º da LC
                87/1996. O critério de habitualidade distingue o comerciante (que
                pratica atos de circulação de modo reiterado) do particular (que
                eventualmente aliena um bem próprio sem incidência do ICMS).
              </p>
              <p className="mt-3">
                O § 1º cria contribuintes ocasionais, sem habitualidade, para
                hipóteses especiais: o importador que faz uma única importação já é
                contribuinte; o adquirente de petróleo interestadual para uso
                próprio também o é. Essa extensão evita a evasão via operações
                eventuais, garantindo o alcance do ICMS sobre toda a circulação
                econômica de bens no estado.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-resp" titulo="Seção II — Do Responsável" />

          <Artigo id="art-18" numero="Art. 18" titulo="Responsabilidade de Terceiros">
            <LegalText>
              <p>
                A responsabilidade pelo pagamento do ICMS e acréscimos devidos pelo
                contribuinte ou responsável poderá ser atribuída a terceiros, quando
                os atos ou omissões destes concorrerem para o não recolhimento do
                imposto.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 18 cria a responsabilidade por concurso de omissão ou ato
                comissivo, compatível com o art. 128 do CTN. Terceiros que, por
                ação ou omissão, contribuírem para a inadimplência do contribuinte
                originário ficam solidária ou subsidiariamente responsáveis. Trata-se
                de norma de fechamento que permite ao fisco estender a cobrança para
                além do devedor principal quando há participação de terceiros na
                evasão.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-19" numero="Art. 19" titulo="Responsáveis pelo ICMS">
            <LegalText>
              <p>São responsáveis pelo pagamento do ICMS:</p>
              <p className="mt-2">
                <strong>I</strong> — os armazéns gerais e estabelecimentos
                depositários congêneres: (a) na saída de mercadoria depositada por
                contribuinte de outro Estado; (b) na transmissão de propriedade de
                mercadoria depositada; (c) no recebimento ou saída de mercadoria sem
                documento fiscal;
              </p>
              <p>
                <strong>II</strong> — o transportador, em relação à mercadoria: (a)
                proveniente de outro Estado para entrega a destinatário não
                designado; (b) negociada em trânsito no Ceará; (c) transportada sem
                documento fiscal ou sendo este inidôneo; (d) entregue em local
                diverso do indicado no documento fiscal; (e) transportada sem
                registro no SITRAM;
              </p>
              <p>
                <strong>III</strong> — o remetente, destinatário, depositário ou
                qualquer possuidor de mercadoria desacompanhada de documento fiscal
                ou com documento inidôneo;
              </p>
              <p>
                <strong>IV</strong> — o contribuinte ou destinatário, no recebimento
                de mercadoria cujo ICMS não tenha sido pago, no todo ou em parte;
              </p>
              <p>
                <strong>VI</strong> — o síndico, administrador judicial, comissário,
                inventariante ou liquidante, em relação ao ICMS devido na saída
                decorrente de alienação em falência, recuperação judicial, inventário
                ou dissolução de sociedade;
              </p>
              <p>
                <strong>VII</strong> — o leiloeiro, em relação ao ICMS devido na
                saída de mercadoria em arremate em leilão.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 19 elenca um rol extenso de responsáveis pelo ICMS. O
                transportador ocupa posição central: é ele o último agente a ter
                contato com a mercadoria antes da entrega e, por isso, responde por
                irregularidades documentais que estejam dentro de sua esfera de
                controle. O inciso II, "e", menciona o SITRAM (Sistema de Trânsito
                de Mercadorias do Ceará), ferramenta eletrônica de controle de
                cargas que exige o registro da NF-e antes da saída da mercadoria.
              </p>
              <p className="mt-3">
                O inciso VI atribui responsabilidade a administradores de massas
                falidas e inventários, evitando que a extinção do contribuinte
                principal elimine a obrigação tributária. Nessas situações, o
                responsável legal da massa ou do espólio fica pessoalmente vinculado
                ao recolhimento do ICMS sobre as alienações decorrentes do processo.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-solid" titulo="Seção III — Responsabilidade Solidária" />

          <Artigo id="art-20" numero="Art. 20" titulo="Solidariedade Passiva">
            <LegalText>
              <p>Respondem solidariamente pelo pagamento do ICMS:</p>
              <p className="mt-2">
                <strong>I</strong> — o entreposto aduaneiro, entreposto industrial
                e depósito aduaneiro de distribuição, ou qualquer pessoa que
                promova: (a) saída para o exterior sem documentação fiscal; (b)
                saída de mercadoria estrangeira para o mercado interno sem
                documentação ou para titular diverso do importador; (c)
                reintrodução no mercado interno de mercadoria depositada para
                exportação;
              </p>
              <p>
                <strong>II</strong> — o representante, mandatário ou gestor de
                negócio; o despachante aduaneiro nas operações de importação e
                exportação;
              </p>
              <p>
                <strong>IX</strong> — todos aqueles que concorrerem para a
                sonegação do ICMS mediante: (a) omissão quanto às informações de
                pagamentos eletrônicos autorizando transações sem emissão de
                documento fiscal; (b) conluio.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A solidariedade tributária no ICMS é mecanismo poderoso: qualquer
                devedor solidário pode ser cobrado pela totalidade da dívida,
                independentemente de o devedor principal ter sido previamente
                acionado. O art. 20 amplia o alcance da responsabilidade ao
                incluir despachantes aduaneiros, gestores de negócio e qualquer
                participante de esquemas de sonegação.
              </p>
              <p className="mt-3">
                O inciso IX, alínea "a", é norma específica para o comércio
                eletrônico: operadoras de pagamento eletrônico que autorizem
                transações sem a correspondente emissão de NF-e ficam solidariamente
                responsáveis pelo ICMS sonegado. Essa regra cria um incentivo
                relevante para que as adquirentes e gateways de pagamento verifiquem
                o cumprimento das obrigações acessórias pelos seus clientes.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-21" numero="Art. 21" titulo="Estabelecimentos da Mesma Pessoa Jurídica">
            <LegalText>
              <p>
                Todos os estabelecimentos da mesma pessoa jurídica são considerados
                em conjunto para efeito de responderem por débitos do imposto,
                acréscimos de qualquer natureza e multas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Embora o art. 16 adote o princípio da autonomia dos estabelecimentos
                para fins de escrituração fiscal, o art. 21 rompe essa autonomia na
                esfera da responsabilidade patrimonial: todos os estabelecimentos da
                mesma PJ respondem solidariamente pelos débitos de qualquer deles.
                Em linguagem prática: se a matriz não paga o ICMS, o fisco pode
                lavrar auto de infração ou ajuizar execução fiscal em face de
                qualquer filial, e vice-versa.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-geral" titulo="Seção IV — Disposições Gerais sobre a Sujeição Passiva" />

          <Artigo id="art-22" numero="Art. 22" titulo="Irrelevância de Fatores do Direito Civil">
            <LegalText>
              <p>
                São irrelevantes para excluir a responsabilidade pelo cumprimento
                da obrigação tributária ou a decorrente de sua inobservância:
              </p>
              <p className="mt-2">
                <strong>I</strong> — a causa que, de acordo com o direito privado,
                exclua a capacidade civil da pessoa natural;
              </p>
              <p>
                <strong>II</strong> — o fato de se achar a pessoa natural sujeita a
                medidas que importem privação ou limitação do exercício de atividades
                civil, comercial ou profissional;
              </p>
              <p>
                <strong>III</strong> — a irregularidade formal na constituição da
                pessoa jurídica de direito privado ou de firma individual, bastando
                que configure uma unidade econômica ou profissional;
              </p>
              <p>
                <strong>IV</strong> — a inexistência de estabelecimento fixo, a
                clandestinidade ou a precariedade de suas instalações.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 22 reproduz o art. 126 do CTN (capacidade tributária passiva)
                no âmbito do ICMS cearense. O direito tributário tem autonomia em
                relação ao direito civil: menores, incapazes, sócios de fato,
                empresas irregulares e ambulantes que pratiquem operações econômicas
                são contribuintes plenos do ICMS, independentemente de sua
                capacidade civil ou da regularidade formal de sua atividade.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-23" numero="Art. 23" titulo="Responsabilidade Pessoal do Gestor">
            <LegalText>
              <p>
                É pessoalmente responsável pelos créditos correspondentes a
                obrigações tributárias resultantes de atos praticados com excesso de
                poderes ou infração de lei, contrato social ou estatuto o dirigente
                responsável pela gestão de empresa estabelecida no País em que
                tenham participação societária pessoas físicas ou jurídicas,
                inclusive estrangeiras, residentes ou domiciliadas no exterior, que
                não possuam inscrição no CPF ou CNPJ.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 23 estabelece a responsabilidade pessoal do gestor de
                empresas com sócios estrangeiros não cadastrados no CPF/CNPJ, norma
                que complementa o art. 135 do CTN. Em tais estruturas societárias,
                o dirigente residente no Brasil responde com o próprio patrimônio
                pelos débitos tributários resultantes de atos ilícitos ou abuso de
                poder, o que previne o uso de interpostas pessoas no exterior para
                blindar a responsabilização dos controladores de fato.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-24" numero="Art. 24" titulo="Convenções Particulares x Fazenda Pública">
            <LegalText>
              <p>
                As convenções particulares relativas à responsabilidade pelo
                pagamento do ICMS não podem ser opostas à Fazenda Pública para
                modificar a definição legal do sujeito passivo das obrigações
                tributárias correspondentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 24 reproduz o art. 123 do CTN. Contratos entre particulares
                que transfiram a responsabilidade pelo ICMS de uma parte para outra
                (cláusulas de reembolso de tributos, por exemplo) são válidos entre
                os contratantes, mas não vinculam o fisco: o sujeito passivo
                definido em lei continua sendo cobrado pela autoridade fiscal,
                independentemente do que foi acordado no contrato privado.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-quant" titulo="Capítulo VIII — Critério Quantitativo" />
          <Secao id="sec-bc" titulo="Seção I — Base de Cálculo do Imposto" />

          <Artigo id="art-25" numero="Art. 25" titulo="Base de Cálculo do ICMS">
            <LegalText>
              <p>A base de cálculo do ICMS será:</p>
              <p className="mt-2">
                <strong>I</strong> — o valor da operação: (a) na saída de
                mercadoria de estabelecimento de contribuinte; (b) na transmissão a
                terceiro de mercadoria em armazém geral; (c) na transmissão de
                propriedade sem trânsito físico; (d) na opção de compra no
                arrendamento mercantil;
              </p>
              <p>
                <strong>II</strong> — o valor da operação, compreendendo mercadoria
                e serviços prestados, no fornecimento de alimentação e bebidas;
              </p>
              <p>
                <strong>III</strong> — o preço do serviço, na prestação de serviço
                de transporte;
              </p>
              <p>
                <strong>X</strong> — o valor da operação ou da prestação: (a) na
                utilização de serviço interestadual não vinculado a operação
                subsequente; (b) na entrada de mercadoria ou bem de outra UF
                destinado a uso/consumo ou ativo imobilizado; (c) na entrada de
                mercadoria, bem ou serviço de outra UF destinado a consumidor final
                não contribuinte (DIFAL);
              </p>
              <p>
                <strong>XI</strong> — o montante correspondente ao valor de entrada
                da mercadoria, incluídos IPI, seguro, frete e outros encargos, nas
                entradas sujeitas ao regime de pagamento antecipado;
              </p>
              <p>
                <strong>XII</strong> — na hipótese de mercadoria desacompanhada de
                documento fiscal, o valor no varejo ou no atacado acrescido de 30%.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> Integram a base de cálculo: (I) o montante do
                próprio imposto (ICMS por dentro); (II) seguros, juros, bonificações
                e descontos condicionados; frete cobrado pelo próprio remetente.
              </p>
              <p>
                <strong>§ 4º</strong> Não integra a base de cálculo o IPI quando a
                operação envolver contribuintes e produto destinado à industrialização
                ou comercialização, configurando fato gerador de ambos os impostos.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 25 é um dos mais densamente técnicos do RICMS. O ponto
                central é a inclusão do próprio ICMS na base de cálculo (§ 3º, I),
                o chamado "ICMS por dentro" ou "cálculo por dentro". Isso significa
                que a alíquota nominal de 20%, por exemplo, não representa 20% do
                preço sem imposto: representa 20% do preço com imposto, o que
                resulta em uma carga efetiva maior. A fórmula é BC = Valor / (1
                - alíquota).
              </p>
              <p className="mt-3">
                O § 4º exclui o IPI da base de cálculo nas operações entre
                contribuintes quando ambos os impostos incidem (operações industrial
                a industrial). Isso evita a dupla tributação sobre a mesma grandeza
                econômica, alinhado ao art. 155, § 2º, XI, da CF/88. Já o inciso
                XII prevê uma base de cálculo presumida para mercadorias
                irregulares, acrescida de 30%, como mecanismo dissuasório de
                circulação sem nota fiscal.
              </p>
              <p className="mt-3">
                O inciso X reproduz as regras do diferencial de alíquota (DIFAL),
                tanto nas entradas para uso/consumo e ativo imobilizado (regra
                anterior à EC 87/2015) quanto na nova sistemática de partilha com
                o Estado destino nas operações com consumidor final não contribuinte.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-26" numero="Art. 26" titulo="DIFAL — Consumidor Final Não Contribuinte de Outro Estado">
            <LegalText>
              <p>
                Nas operações e prestações que destinem bens e serviços a consumidor
                final não contribuinte do ICMS localizado em outra Unidade da
                Federação, a base de cálculo única é o valor da operação ou o preço
                do serviço.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O ICMS devido à Unidade da Federação de
                origem corresponde ao valor resultante da aplicação da alíquota
                interestadual sobre a base de cálculo.
              </p>
              <p>
                <strong>§ 2º</strong> O ICMS devido ao Estado do Ceará, na condição
                de Unidade da Federação de destino, corresponde ao valor resultante
                da aplicação da alíquota interna sobre a base de cálculo, deduzido
                o imposto calculado na forma do § 1º.
              </p>
              <p>
                <strong>§ 3º</strong> O recolhimento do ICMS ao Estado do Ceará
                deverá ser efetuado por meio de GNRE ou outro documento de
                arrecadação, por ocasião de cada operação ou prestação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 26 incorpora ao RICMS a sistemática introduzida pela EC
                87/2015, que repartiu o ICMS nas vendas a consumidores finais não
                contribuintes entre o estado de origem e o estado de destino. Antes
                da emenda, todo o ICMS ficava com o estado de origem, favorecendo
                os grandes centros comerciais e prejudicando os estados compradores.
              </p>
              <p className="mt-3">
                A fórmula funciona assim: o remetente calcula o ICMS normal pela
                alíquota interestadual (7% ou 12%) e recolhe ao seu estado. A
                diferença entre a alíquota interna do Ceará (geralmente 20%) e
                a alíquota interestadual forma o DIFAL, que deve ser recolhido
                ao Ceará via GNRE a cada operação. Esse mecanismo ganhou
                relevância com o e-commerce, que concentrava receitas em SP e
                MG mesmo vendendo para todo o Brasil.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-27" numero="Art. 27" titulo="Moeda Estrangeira na Importação">
            <LegalText>
              <p>
                Quando o valor da operação ou a prestação forem expressos em moeda
                estrangeira, proceder-se-a a sua conversão em moeda nacional ao
                câmbio do dia da ocorrência do fato gerador.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Na hipótese de importação do exterior, a
                conversão far-se-a pela mesma taxa de câmbio utilizada no cálculo
                do Imposto de Importação, sem qualquer acréscimo ou devolução
                posterior se houver variação da taxa de câmbio até o pagamento
                efetivo do preço.
              </p>
              <p>
                <strong>§ 2º</strong> O valor fixado pela autoridade aduaneira
                para a base de cálculo do Imposto de Importação, nos termos da
                lei aplicável, substituirá o preço declarado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A regra de conversão cambial na importação vincula o ICMS ao mesmo
                câmbio usado pelo Imposto de Importação, evitando divergências
                entre as duas apurações que recaem sobre o mesmo fato. O § 1º
                afasta o risco de revisão posterior pela variação cambial: a
                obrigação tributária se cristaliza na data do desembaraço, e
                oscilações subsequentes no câmbio nao alteram o ICMS devido.
              </p>
              <p className="mt-3">
                O § 2º resolve o problema do subfaturamento: se a autoridade
                aduaneira arbitrou uma base maior para o II (ajuste do Acordo de
                Valoração Aduaneira), esse valor arbitrado também serve de BC
                para o ICMS, impedindo que o importador recolha ICMS sobre um
                preço declarado artificialmente baixo enquanto o II ja incide
                sobre o valor corrigido.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-28" numero="Art. 28" titulo="Base de Cálculo na Ausência do Valor da Operação">
            <LegalText>
              <p>
                Na falta do valor a que se referem os incisos do art. 25, a base
                de cálculo do ICMS será:
              </p>
              <p className="mt-2">
                <strong>I</strong> — o preço corrente da mercadoria, ou de seu
                similar, no mercado atacadista do local da operação, ou, na sua
                falta, no mercado atacadista regional, caso o remetente seja
                produtor, extrator ou gerador;
              </p>
              <p>
                <strong>II</strong> — o preço FOB estabelecimento industrial a
                vista, caso o remetente seja industrial;
              </p>
              <p>
                <strong>III</strong> — o preço FOB estabelecimento comercial a
                vista, nas vendas a outros comerciantes ou industriais, caso o
                remetente seja comerciante.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Para aplicação dos incisos II e III, adotar-se-a:
                (I) o preço efetivamente cobrado pelo estabelecimento remetente
                na operação mais recente; (II) caso o remetente nao tenha
                efetuado venda, o preço corrente da mercadoria ou de seu similar
                no mercado atacadista do local da operação ou no regional.
              </p>
              <p>
                <strong>§ 2º</strong> Na hipótese do inciso III, se o estabelecimento
                remetente nao efetuar vendas a outros comerciantes ou industriais
                ou, em qualquer caso, se nao houver mercadoria similar, a base de
                cálculo será equivalente a 75% (setenta e cinco por cento) do preço
                de venda corrente no varejo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 28 fornece uma hierarquia de bases de cálculo subsidiárias
                para quando o valor da operação é desconhecido ou insubsistente.
                A lógica é gradual: primeiro se tenta o preco de mercado no atacado
                local; depois, o FOB industrial ou comercial da operacao mais
                recente; por fim, 75% do varejo como ultima saida.
              </p>
              <p className="mt-3">
                O percentual de 75% sobre o varejo (§ 2º) é uma estimativa
                conservadora da margem bruta do varejista. Assume-se que o custo
                de aquisicao representa 75% do preco final ao consumidor, assim
                o ICMS incide sobre o valor que o comerciante efetivamente pagou
                pela mercadoria, e nao sobre a margem ja agregada pelo varejo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-29" numero="Art. 29" titulo="Prestação de Serviço sem Valor Fixado">
            <LegalText>
              <p>
                Quando o valor do frete ou do servico for indeterminado ou nao
                estiver fixado, a base de cálculo do ICMS será o preço corrente
                do servico no local da prestacao.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 29 complementa o art. 28 para as prestacoes de servicos
                de transporte e comunicacao. Quando o contrato nao fixa preco
                (servicos por demanda, contratos guarda-chuva ou situacoes de
                emergencia sem formalizacao), o fisco usa o preco de mercado
                praticado na praca como referencia. Isso evita que a ausencia de
                uma nota de servico formalmente precificada resulte em nao
                tributacao do transporte ou da comunicacao.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-30" numero="Art. 30" titulo="Base de Cálculo na Substituição Tributária">
            <LegalText>
              <p>
                Na hipótese de substituição tributária, a base de cálculo será
                definida na forma do regulamento especifico do regime de
                substituicao tributaria, observada a legislacao aplicável.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A substituicao tributaria possui regras proprias de base de
                calculo, pois o ICMS e recolhido antecipadamente pelo substituto
                tributario em relacao a fatos geradores futuros. A base e
                composta pelo preco de venda ao consumidor final, geralmente
                calculado mediante a Margem de Valor Agregado (MVA) aplicada
                sobre o preco praticado na saida do substituto, ou pelo Preco
                Medio Ponderado ao Consumidor Final (PMPF) divulgado pelo fisco.
              </p>
              <p className="mt-3">
                A remissao ao regulamento especifico e tecnicamente necessaria
                porque cada segmento de mercado tem sua propria MVA (combustiveis,
                cigarros, bebidas, automoveis), negociada em convenios CONFAZ e
                internalizada por decreto estadual, o que torna inviavel a
                previsao exaustiva no proprio RICMS.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-31" numero="Art. 31" titulo="Frete Excedente entre Empresas Interdependentes">
            <LegalText>
              <p>
                Quando o frete seja condição do fornecimento e o preço cobrado
                entre empresas interdependentes for superior ao valor de mercado,
                o valor excedente será incluído na base de cálculo do ICMS
                relativo à operação.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Consideram-se interdependentes duas empresas
                quando: (I) uma delas, por si, seus sócios ou acionistas, e
                respectivos cônjuges ou filhos menores, for titular de mais de
                50% do capital da outra; (II) uma mesma pessoa fizer parte de
                ambas, na qualidade de diretor, sócio ou gerente com poderes de
                gestão; (III) uma delas locar ou transferir à outra, a qualquer
                título, veículo destinado ao transporte de mercadorias.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 31 é um dispositivo antiplanejamento tributário abusivo.
                Grupos economicos costumavam reduzir a base de calculo do ICMS
                transferindo parte do preco do produto para o frete praticado
                entre empresas do mesmo grupo, tornando o preco do produto
                artificialmente baixo. Como o frete de transporte integra a
                base de cálculo apenas na parte contratada pelo remetente, essa
                manobra podia resultar em menor ICMS sobre a operacao.
              </p>
              <p className="mt-3">
                O paragrafo sobre interdependencia estabelece tres situacoes
                objetivas: participacao cruzada de capital superior a 50%,
                gestao comum (mesmo diretor ou gerente com poderes efetivos) e
                o aluguel de veiculos. Este ultimo caso e menos intuitivo, mas
                busca capturar o transporte proprio disfarçado de frete de
                terceiros dentro do mesmo grupo economico.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-32" numero="Art. 32" titulo="Arbitramento pelo Fisco">
            <LegalText>
              <p>
                A autoridade fiscal poderá arbitrar a base de cálculo ou o preço
                das mercadorias ou serviços quando: (I) o contribuinte nao exibir
                os elementos necessários a comprovação do valor da operação ou
                da prestação; (II) houver fundada suspeita de que os documentos
                fiscais nao refletem o valor real da operação ou da prestação;
                (III) o valor declarado for notoriamente inferior ao valor de
                mercado.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> Do auto de arbitramento caberá
                avaliação contraditória, administrativa ou judicial, a requerimento
                do interessado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O arbitramento é uma técnica de reconstituicao da base de cálculo
                que permite ao fisco lanar o ICMS mesmo quando o contribuinte omite
                ou falsifica informacoes. Sua legitimidade constitucional e
                reconhecida, desde que respeitado o contraditório, conforme
                determina o paragrafo unico.
              </p>
              <p className="mt-3">
                A condicao de "fundada suspeita" (inciso II) exige que a autoridade
                fiscal fundamente objetivamente a discrepancia entre o valor
                declarado e o valor de mercado, nao podendo arbitrar
                indiscriminadamente. O STJ consolidou o entendimento de que o
                arbitramento deve ser subsidiário: primeiro o fisco deve tentar
                obter os documentos ou a escrituracao do contribuinte; apenas
                quando esses elementos nao existem ou sao inverossimeis é que
                o arbitramento se justifica.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-33" numero="Art. 33" titulo="Arbitramento em Extravio de Documentos Fiscais">
            <LegalText>
              <p>
                No caso de extravio de documentos fiscais, a base de cálculo
                será arbitrada com base no valor médio ponderado das operacoes
                ou prestacoes realizadas pelo contribuinte no período imediatamente
                anterior ou posterior ao da ocorrência do extravio, observada a
                mesma espécie de operação ou prestação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 33 especifica a metodologia de arbitramento para a situacao
                particular de extravio de notas fiscais. O uso da média ponderada
                do periodo adjacente — anterior ou posterior ao extravio — busca
                uma aproximacao estatistica da realidade do contribuinte, evitando
                tanto a sub e a supertributacao decorrentes de sazonalidades.
              </p>
              <p className="mt-3">
                O extravio de documentos fiscais, mesmo que involuntario, representa
                risco fiscal relevante: sem os documentos, o fisco nao consegue
                verificar as operacoes, e o contribuinte fica exposto ao arbitramento.
                Por isso, o Sped Fiscal (EFD ICMS IPI) tem papel preventivo
                essencial: os registros eletronicos preservados no ambiente da
                SEFAZ substituem os documentos fisicos como prova da escrituracao.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-34" numero="Art. 34" titulo="Pauta de Preços pelo Poder Executivo">
            <LegalText>
              <p>
                O Poder Executivo poderá manter atualizada tabela de preços de
                mercadorias e servicos para efeito de fixacao da base de cálculo
                do ICMS.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> Nas operações e prestações
                interestaduais, a adocao de tabela de precos fica condicionada
                a previa celebracao de acordo entre as Unidades da Federacao
                envolvidas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A pauta de precos é um instrumento de gestao fiscal que permite
                ao estado definir valores minimos de referencia para o calculo
                do ICMS em determinados setores onde o subfaturamento é endémico,
                como o comercio varejista de determinados produtos de alto valor
                agregado. Ao fixar um preco minimo de pauta, o fisco impede
                que o contribuinte recolha o imposto sobre um valor declarado
                artificialmente inferior ao de mercado.
              </p>
              <p className="mt-3">
                O paragrafo unico e importante para o comercio interestadual:
                se o Ceara estabelece uma pauta para certo produto, mas o estado
                de origem nao a reconhece, pode haver conflito de competencia.
                A exigencia de acordo previo (via protocolo ou convenio CONFAZ)
                garante que ambos os estados concordem com o mesmo valor de
                referencia, evitando bitributacao ou lacunas na arrecadacao.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-35" numero="Art. 35" titulo="CEVR — Catálogo Eletrônico de Valores de Referência">
            <LegalText>
              <p>
                Fica instituído o Catálogo Eletrônico de Valores de Referência
                (CEVR), elaborado com base nos dados das NF-e, CT-e e EFD
                transmitidos à SEFAZ/CE, para fins de orientação e fiscalização
                da base de cálculo do ICMS.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O CEVR será atualizado periodicamente por
                ato do Poder Executivo, conforme regulamentado pelo Decreto
                nº 36.277/2024, com vigencia a partir de 1º de setembro de 2024.
              </p>
              <p>
                <strong>§ 2º</strong> O valor de referência constante do CEVR
                corresponde à média aritmética ponderada das operacoes registradas,
                acrescida de um desvio-padrao, calculados sobre os precos
                efetivamente praticados nas operacoes informadas ao fisco cearense.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O CEVR representa a evolucao tecnológica do antigo sistema de
                pautas de precos: em vez de tabelas fixas negociadas manualmente,
                o catalogo e gerado automaticamente a partir dos bilhoes de
                registros de NF-e, CT-e e EFD ja transmitidos ao ambiente SEFAZ.
                Isso confere ao instrumento uma base estatistica muito mais robusta
                e atual do que qualquer pauta tradicional.
              </p>
              <p className="mt-3">
                A metodologia do § 2º é tecnicamente rigorosa: a média ponderada
                captura o preco tipico das operacoes reais, e o acrescimo de um
                desvio-padrao posiciona o valor de referencia no percentil superior
                da distribuicao normal dos precos (aproximadamente 84%), afastando
                as operacoes declaradas com precos muito abaixo da média. O
                resultado é um instrumento dinâmico de combate ao subfaturamento,
                calibrado pelos proprios dados do mercado cearense.
              </p>
              <p className="mt-3">
                O Decreto nº 36.277/2024 formalizou e atualizou o CEVR a partir
                de setembro de 2024, tornando-o operacional como instrumento de
                apoio ao arbitramento e à auditoria fiscal eletronica no Estado
                do Ceara.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-36" numero="Art. 36" titulo="Cadastro Fiscal de Produtos">
            <LegalText>
              <p>
                O Cadastro Fiscal de Produtos, composto de código fiscal de
                produtos, classes, gêneros e espécies, será utilizado na fixação
                de valores de referência, nas perícias fiscais no âmbito do
                Contencioso Administrativo Tributário (CONAT), no controle das
                categorias de produtos no trânsito de mercadorias e nos
                levantamentos de auditoria fiscal, em conformidade com a
                estrutura de dados do CEVR de que trata o art. 34 deste Decreto,
                conforme disposto em ato do Secretário da Fazenda.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O Cadastro Fiscal de Produtos é o backbone estrutural do CEVR
                (art. 35): enquanto o CEVR fornece os valores de referência, o
                Cadastro estabelece a taxonomia dos produtos em classes, gêneros
                e espécies que permite comparar operações com mercadorias
                semelhantes. Sem uma classificação padronizada, seria impossível
                calcular a média ponderada do CEVR de forma confiável.
              </p>
              <p className="mt-3">
                Na prática, o Cadastro Fiscal funciona como um NCM (Nomenclatura
                Comum do Mercosul) estadual complementar, voltado especificamente
                para as necessidades de auditoria e controle de trânsito da
                SEFAZ/CE. Ele é também insumo para as perícias do CONAT, onde a
                discussão do valor da operação muitas vezes gira em torno da
                classificação correta do produto no catálogo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-37" numero="Art. 37" titulo="Arbitramento — Casos Especiais">
            <LegalText>
              <p>
                Nos seguintes casos especiais, o valor da operação ou da
                prestação poderá ser arbitrado pela autoridade fiscal, sem
                prejuízo das penalidades cabíveis:
              </p>
              <p className="mt-2">
                <strong>I</strong> — não exibição ou entrega, à fiscalização,
                dentro do prazo da intimação, dos elementos necessários à
                comprovação do valor real da operação ou da prestação, nos casos
                de perda ou extravio de livros ou documentos fiscais;
              </p>
              <p>
                <strong>II</strong> — fundada suspeita de que os documentos
                fiscais não refletem o valor real da operação ou da prestação;
              </p>
              <p>
                <strong>III</strong> — declaração nos documentos fiscais, sem
                motivo justificado, de valores notoriamente inferiores ao preço
                corrente no mercado local ou regional das mercadorias ou dos
                serviços;
              </p>
              <p>
                <strong>IV</strong> — transporte ou estocagem de mercadoria
                desacompanhada de documentos fiscais ou sendo estes inidôneos.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> No caso dos incisos do caput
                deste artigo, o arbitramento deverá observar o disposto no art. 32
                deste Decreto.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 37 enumera as hipóteses de arbitramento especial, que se
                somam ao arbitramento geral do art. 32. A diferença é que o art. 37
                trata de situações mais específicas: o inciso I abrange perda ou
                extravio de documentos (não a simples recusa de entregá-los); o
                inciso IV captura mercadorias em trânsito sem nota, que é o
                cenário mais frequente de abordagem fiscal nas barreiras de
                controle do Ceará.
              </p>
              <p className="mt-3">
                O parágrafo único remete ao art. 32 para a metodologia: o
                arbitramento deve ser fundado, documentado e sujeito ao
                contraditório. Isso significa que, mesmo que o fiscal apreenda
                mercadoria sem nota, o valor arbitrado deve ser justificado por
                parâmetros objetivos (CEVR, preço de mercado, tabela da SEFAZ),
                não por mera estimativa.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-38" numero="Art. 38" titulo="Discordância no Arbitramento">
            <LegalText>
              <p>
                Nas hipóteses dos arts. 34 e 37, havendo discordância em relação
                ao valor fixado ou arbitrado, caberá ao contribuinte comprovar a
                exatidão do valor por ele declarado, que prevalecerá, nessa
                hipótese, como base de cálculo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 38 inverte o ônus da prova em favor do fisco: uma vez que
                a autoridade fiscal arbitra ou adota um valor de referência (pauta
                ou CEVR), cabe ao contribuinte provar que o preço declarado é
                correto. Isso é constitucional porque o ICMS é um imposto sobre
                circulação econômica, e o contribuinte detém melhores condições de
                demonstrar o valor real das suas operações.
              </p>
              <p className="mt-3">
                Na prática, o contribuinte que discorda do valor de pauta deve
                apresentar documentação robusta: contratos, faturas comerciais,
                extrato bancário mostrando o pagamento e declaração do destinatário.
                O art. 39 especifica exatamente quais documentos são aceitos para
                esse fim.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-39" numero="Art. 39" titulo="Procedimentos de Comprovação de Valor">
            <LegalText>
              <p>
                Para efeito de comprovação do valor referido no art. 38, deverão
                ser adotados os seguintes procedimentos:
              </p>
              <p className="mt-2">
                <strong>I</strong> — o contribuinte deverá comprovar esta
                circunstância através de documentos, tais como contrato
                devidamente registrado em cartório de títulos e documentos,
                declaração do destinatário da mercadoria ou serviço com firma
                reconhecida, ordem de pagamento vinculada à transação ou outros;
              </p>
              <p>
                <strong>II</strong> — a autoridade fiscal deverá reter cópias dos
                documentos comprobatórios referidos no inciso I, para comprovar o
                valor adotado como base de cálculo;
              </p>
              <p>
                <strong>III</strong> — caso não haja a comprovação prevista no
                inciso I, deverá a autoridade fiscal considerar a prerrogativa de
                espontaneidade e não promover a autuação do contribuinte,
                efetuando a cobrança do imposto sem penalidade, se este procurar a
                unidade fiscal antes de qualquer procedimento do fisco estadual.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O inciso III é relevante sob o ângulo do planejamento tributário
                defensivo: o contribuinte que percebe que sua nota fiscal registra
                valor inferior ao de pauta pode comparecer espontaneamente à
                unidade fiscal antes de qualquer ação do fisco e recolher a
                diferença sem multa. Esse mecanismo é análogo à denúncia
                espontânea do art. 138 do CTN, mas aplicado especificamente à
                discrepância de valores na base de cálculo.
              </p>
              <p className="mt-3">
                A exigência de firma reconhecida na declaração do destinatário
                (inciso I) tem finalidade antifraude: impede que o contribuinte
                produza documentos internos sem autenticidade para justificar
                preços artificialmente baixos em operações entre partes
                relacionadas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-40" numero="Art. 40" titulo="Regime Simplificado de Apuração">
            <LegalText>
              <p>
                A critério do Fisco, o ICMS devido por contribuinte de pequeno
                porte cujo volume ou modalidade de negócios aconselhe tratamento
                tributário simplificado, poderá ser adotada forma diversa de
                apuração, conforme dispuser a legislação.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> Na hipótese do caput, verificada
                no final do período qualquer diferença entre o ICMS devido e o
                calculado, esta será: (I) quando desfavorável ao contribuinte,
                recolhida na forma da legislação, sem acréscimo de multa;
                (II) quando favorável ao contribuinte: (a) compensada para o
                período seguinte; (b) restituída no caso de encerramento de
                atividade.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 40 habilita o fisco a substituir o regime de conta gráfica
                (débitos menos créditos) por uma apuração simplificada para
                pequenos contribuintes, geralmente baseada em percentual fixo
                sobre a receita bruta ou em pauta de valores. Esse regime é
                distinto do Simples Nacional, que é federal: trata-se de uma
                simplificação estadual autônoma prevista no próprio RICMS.
              </p>
              <p className="mt-3">
                O parágrafo único garante o equilíbrio: se no fechamento do
                período o ICMS efetivamente devido for maior que o calculado pelo
                regime simplificado, o contribuinte paga a diferença sem multa;
                se for menor, ele recebe crédito ou devolução. Isso evita que o
                regime simplificado resulte em enriquecimento ilícito do estado
                ou em penalização indevida do contribuinte.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-41" numero="Art. 41" titulo="Mercadoria sem Destinatário Certo de Outra UF">
            <LegalText>
              <p>
                Na entrada de mercadoria trazida por contribuinte de outra
                unidade da Federação sem destinatário certo neste Estado, a base
                de cálculo será o valor constante do documento fiscal de origem,
                inclusive as parcelas correspondentes ao IPI e às despesas
                acessórias, acrescido de 30% (trinta por cento) quando inexistir
                percentual de agregação específico para produto sujeito ao regime
                de substituição tributária.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O disposto neste artigo aplica-se à
                mercadoria trazida por comerciante ambulante ou não estabelecido.
              </p>
              <p>
                <strong>§ 2º</strong> Ocorrendo a situação descrita neste artigo,
                deduzir-se-á, para fins de cálculo do ICMS devido a este Estado,
                o montante devido ao Estado de origem.
              </p>
              <p>
                <strong>§ 3º</strong> O imposto de que trata este artigo será
                recolhido no primeiro posto fiscal de entrada neste Estado.
              </p>
              <p>
                <strong>§ 4º</strong> O tratamento tributário previsto neste
                artigo aplica-se também aos destinatários baixados do Cadastro
                Geral da Fazenda.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 41 trata da situação do chamado "carrinho voador": o
                comerciante que entra no Ceará com mercadoria de outro estado sem
                ter cliente certo. Nesse caso, a SEFAZ antecipa o ICMS no posto
                fiscal de entrada, usando o valor do documento de origem mais um
                markup de 30% como base presumida de revenda.
              </p>
              <p className="mt-3">
                O § 2º é tecnicamente importante: o ICMS já pago ao estado de
                origem pela alíquota interestadual é deduzido do cálculo, evitando
                bitributação. O Ceará cobra apenas a diferença entre a alíquota
                interna (20%) e a interestadual já recolhida (7% ou 12%). O § 4º
                alcança também destinatários baixados do cadastro, fechando a
                brecha de enviar mercadoria para CNPJ cancelado como forma de
                burlar o controle.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-42" numero="Art. 42" titulo="Preço Sujeito a Verificação Posterior">
            <LegalText>
              <p>
                Quando a fixação de preços ou a apuração do valor tributável
                depender de fatos ou condições verificáveis após a saída da
                mercadoria, tais como pesagem, medição, análise e classificação,
                o ICMS será calculado inicialmente sobre o preço corrente da
                mercadoria e, após essa verificação, sobre a diferença, se houver,
                atendidas as disposições pertinentes da legislação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 42 resolve uma situação comum em commodities agrícolas e
                produtos a granel: o preço final depende de pesagem ou análise
                laboratorial que só ocorre após a saída. No comércio de grãos
                (soja, milho), por exemplo, a nota fiscal é emitida com preço
                estimado e ajustada após o recebimento e pesagem no destino.
              </p>
              <p className="mt-3">
                A solução adotada é bifásica: emite-se a nota com o preço
                provisório (baseado no preço corrente de mercado) e, após a
                aferição, emite-se uma nota complementar pela diferença. Esse
                mecanismo é compatível com o art. 150, § 4º, da CF, que veda
                a cobrança do imposto antes da ocorrência do fato gerador, mas
                admite a antecipação razoável quando o valor final é incerto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-43" numero="Art. 43" titulo="Reajustamento de Preço">
            <LegalText>
              <p>
                Quando, em virtude de contrato, ocorrer reajustamento de preço,
                o ICMS correspondente ao acréscimo do valor será recolhido junto
                com o montante devido no período em que for apurado, atendidas as
                normas pertinentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 43 trata do reajustamento contratual de preços, situação
                frequente em contratos de fornecimento de longo prazo com cláusula
                de reajuste por índice (IGP-M, IPCA, etc.). Quando o preço é
                reajustado retroativamente, o ICMS incidente sobre o acréscimo
                deve ser recolhido no período em que o reajuste é apurado, não na
                competência original da operação.
              </p>
              <p className="mt-3">
                Isso evita retificações de escrituração fiscal de períodos
                passados: em vez de reabrir o livro fiscal do mês original, o
                contribuinte registra o reajuste como débito no mês corrente. O
                tratamento é análogo ao do art. 42 (verificação posterior), com
                a diferença de que aqui o evento motivador é contratual e não
                físico.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-44" numero="Art. 44" titulo="Redução da Base de Cálculo">
            <LegalText>
              <p>
                A base de cálculo do imposto será reduzida nas hipóteses
                relacionadas no Anexo III deste Decreto.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 44 é uma cláusula de remissão para o Anexo III do RICMS,
                que lista os produtos e situações com redução de base de cálculo
                concedida por convênio CONFAZ ou por legislação estadual. A
                redução de BC é tecnicamente diferente de uma alíquota reduzida:
                aplica-se a alíquota nominal sobre uma base menor, resultando em
                carga tributária efetiva inferior.
              </p>
              <p className="mt-3">
                Exemplos típicos de redução de BC no Ceará incluem máquinas e
                equipamentos industriais, produtos da cesta básica e veículos para
                portadores de deficiência. A forma convênio é exigida pelo art. 155,
                § 2º, XII, g, da CF para qualquer benefício fiscal de ICMS, o que
                significa que o Ceará só pode conceder redução de BC se houver
                autorização expressa do CONFAZ via convênio.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-aliq" titulo="Seção II — Das Alíquotas" />

          <Artigo id="art-45" numero="Art. 45" titulo="Alíquotas do ICMS">
            <LegalText>
              <p>As alíquotas do ICMS são (vigência a partir de 01.01.2024):</p>
              <p className="mt-2">
                <strong>I — nas operações internas:</strong>
              </p>
              <p>
                a) 25% para joias e álcool para quaisquer fins (exceto quando
                combustível);
              </p>
              <p>
                b) 28% para bebidas alcoólicas, armas e munições, fogos de
                artifício, fumo, cigarros e artigos de tabacaria, rodas esportivas,
                aviões ultraleves, asas-delta, drones, embarcações esportivas e
                jet-skis;
              </p>
              <p>
                c) 20% para operações com combustíveis e energia elétrica;
              </p>
              <p>
                d) 20% para as demais mercadorias ou bens.
              </p>
              <p className="mt-2">
                <strong>II — nas prestações internas:</strong> 20% para
                comunicação e 20% para transporte intermunicipal.
              </p>
              <p className="mt-2">
                <strong>III — nas operações e prestações interestaduais:</strong>
              </p>
              <p>
                a) 4% para transporte aéreo de passageiro, carga e mala postal;
              </p>
              <p>
                b) 4% para mercadorias ou bens importados do exterior com
                conteúdo de importação superior a 40% (Resolução Senado nº 13/2012),
                salvo lista CAMEX de sem similar nacional e produtos de processo
                produtivo básico;
              </p>
              <p>
                c) 12% para as demais prestações e operações interestaduais.
              </p>
              <p className="mt-2">
                <strong>IV</strong> — para combustíveis e lubrificantes com
                incidência monofásica: alíquotas definidas por deliberação dos
                Estados e DF via CONFAZ (art. 155, § 2º, XII, g, CF).
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 45 é o coração do critério quantitativo do ICMS cearense:
                define as alíquotas ad valorem aplicáveis a cada tipo de operação.
                A alíquota geral interna de 20% vigora desde 01.01.2024, após a
                unificação promovida pelo Decreto nº 35.808/2023, que eliminou
                a alíquota de 12% que ainda existia para algumas mercadorias.
              </p>
              <p className="mt-3">
                A alíquota interestadual de 4% para importados (inciso III, b)
                é uma imposição da Resolução do Senado nº 13/2012, editada para
                combater a "guerra dos portos": estados com benefícios fiscais de
                importação atraíam operações apenas para se apropriar do ICMS,
                prejudicando os estados destino. A alíquota única de 4% elimina
                esse diferencial competitivo entre estados.
              </p>
              <p className="mt-3">
                A alíquota de 28% para bebidas alcoólicas, fumo e similares
                reflete o princípio da seletividade (art. 155, § 2º, III, CF):
                mercadorias consideradas supérfluas ou danosas à saúde pública
                podem ser tributadas mais pesadamente, ainda que isso resulte
                em regressividade para consumidores de menor renda.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-46" numero="Art. 46" titulo="Aplicação das Alíquotas Internas">
            <LegalText>
              <p>As alíquotas internas são aplicadas quando:</p>
              <p className="mt-2">
                <strong>I</strong> — o remetente ou o prestador e o destinatário
                de mercadoria ou serviços estiverem situados neste Estado;
              </p>
              <p>
                <strong>II</strong> — da entrada de mercadoria ou bem importado
                do exterior;
              </p>
              <p>
                <strong>III</strong> — da entrada, neste Estado, de energia
                elétrica, petróleo e lubrificantes e combustíveis líquidos e
                gasosos dele derivados, quando não destinados à comercialização
                ou à industrialização;
              </p>
              <p>
                <strong>IV</strong> — da prestação de serviços de transporte
                iniciado ou contratado no exterior, e de comunicação transmitida
                ou emitida no estrangeiro e recebida neste Estado;
              </p>
              <p>
                <strong>V</strong> — da arrematação de mercadoria ou bem.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 46 delimita quando a alíquota interna (20% ou superiores)
                prevalece sobre a interestadual (12% ou 4%). Os incisos II e III
                implementam a regra constitucional do art. 155, § 2º, IX, CF:
                nas importações e entradas de energia/petróleo para uso e consumo,
                todo o ICMS fica com o estado destino, sendo aplicada a alíquota
                interna.
              </p>
              <p className="mt-3">
                O inciso V (arrematação) é relevante para o comércio de bens
                usados em leilão judicial ou extrajudicial: o arrematante recolhe
                o ICMS pela alíquota interna do Ceará, independentemente de onde
                a mercadoria estava localizada originalmente. Essa regra evita
                que o estado onde o bem estava fisicamente arrecade o imposto em
                detrimento do estado onde ocorre o leilão.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-fecop" titulo="Seção III — Fundo Estadual de Combate à Pobreza (FECOP)" />

          <Artigo id="art-47" numero="Art. 47" titulo="Mercadorias com Adicional FECOP">
            <LegalText>
              <p>
                As operações internas com as mercadorias a seguir indicadas serão
                tributadas com a aplicação das alíquotas estabelecidas no art. 65
                da Lei nº 18.665/2023, acrescidas do adicional de 2% destinado ao
                Fundo Estadual de Combate à Pobreza (FECOP):
              </p>
              <p className="mt-2">
                I — bebidas alcoólicas; II — armas e munições; III — embarcações
                esportivas; IV — fumo, cigarros e artigos de tabacaria; V —
                aviões ultraleves e asas-delta; IX — joias; X — isotônicos,
                bebidas gaseificadas não alcoólicas e refrigerantes; XI —
                perfumes, extratos, águas-de-colônia e produtos de beleza com
                valor unitário superior a 50 UFIRCEs; XII — artigos e alimentos
                para animais de estimação (exceto medicamentos e vacinas);
                XIII — inseticidas, fungicidas, formicidas, herbicidas e
                similares.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O adicional do FECOP incidirá somente nas
                operações destinadas ao consumidor final, ou por ocasião da
                cobrança do ICMS sob o regime de substituição tributária.
              </p>
              <p>
                <strong>§ 2º</strong> O adicional aplica-se, inclusive, às
                operações realizadas pelos optantes pelo Simples Nacional.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O FECOP é um adicional constitucional autorizado pelo ADCT, art.
                82, que permite aos estados acrescentar até 2 pontos percentuais
                ao ICMS sobre produtos supérfluos para financiar ações sociais de
                combate à pobreza. No Ceará, o fundamento está na Lei Complementar
                Estadual nº 37/2003.
              </p>
              <p className="mt-3">
                A lista de produtos (incisos I a XIII) combina mercadorias de luxo
                (joias, embarcações, perfumes caros) com produtos considerados
                nocivos (álcool, cigarro, armas) e alguns que foram controversamente
                incluídos, como refrigerantes e produtos para pets. O § 1º restringe
                a incidência ao consumidor final ou à substituição tributária,
                evitando que o FECOP incida em cadeia nas operações intermediárias
                (o que oneraria toda a cadeia produtiva, não apenas o consumo final).
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-48" numero="Art. 48" titulo="Recolhimento do FECOP">
            <LegalText>
              <p>
                O adicional do ICMS destinado ao FECOP deverá ser recolhido por
                ocasião:
              </p>
              <p className="mt-2">
                <strong>I</strong> — do desembaraço aduaneiro, nas operações de
                importação dos produtos de que trata o art. 47;
              </p>
              <p>
                <strong>II</strong> — da entrada neste Estado;
              </p>
              <p>
                <strong>III</strong> — das saídas internas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 48 define o momento de exigibilidade do FECOP, alinhado
                aos fatos geradores do ICMS principal. Na prática, o recolhimento
                ocorre junto ao ICMS normal mas em DAE específico, mantendo a
                segregação contábil necessária para o controle do fundo. A
                separação dos dois tributos num único documento fiscal simplifica
                a operação para o contribuinte mas exige dois recolhimentos
                distintos.
              </p>
              <p className="mt-3">
                O inciso I (desembaraço aduaneiro) é especialmente relevante
                para distribuidores que importam os produtos listados no art. 47:
                eles precisam incluir o FECOP no cálculo do custo de importação,
                pois é exigível antes de qualquer operação interna com a mercadoria.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-49" numero="Art. 49" titulo="Apuração Mensal do FECOP">
            <LegalText>
              <p>
                A apuração mensal do ICMS Normal e Substituição Tributária,
                relativamente ao adicional do FECOP, deverá ser feita pelo
                contribuinte, observado o seguinte:
              </p>
              <p className="mt-2">
                <strong>II</strong> — o somatório dos valores do ICMS referentes
                às operações e prestações realizadas com as cargas tributárias
                indicadas no art. 47 deve ser multiplicado pelos seguintes
                coeficientes: (a) carga tributária de 20%: coeficiente de 0,122;
                (b) carga tributária de 27%: coeficiente de 0,099;
                (c) carga tributária de 29%: coeficiente de 0,095;
                (d) carga tributária de 30%: coeficiente de 0,093.
              </p>
              <p>
                <strong>III</strong> — o valor do adicional do FECOP deverá ser
                recolhido separadamente do imposto, por meio de DAE específico.
              </p>
              <p className="mt-2">
                <strong>§ 5º</strong> Para o cálculo do adicional do FECOP,
                o contribuinte deverá aplicar o percentual de 2% sobre o somatório
                dos valores relativos às operações ou prestações realizadas.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Os coeficientes do inciso II são frações derivadas da estrutura
                do "ICMS por dentro": como o FECOP é calculado sobre a base de
                cálculo (que já inclui o ICMS), o coeficiente transforma o valor
                total da operação no montante do adicional devido. Para uma carga
                de 20% (alíquota base + 2% FECOP = 22%), o coeficiente 0,122
                representa 2/16,39 (isto é, os 2 pontos de FECOP dentro do
                montante total já com o tributo embutido).
              </p>
              <p className="mt-3">
                O § 5º simplifica o cálculo para o contribuinte optante pelo
                Simples Nacional (art. 49-A) e para situações em que a segregação
                da base não é imediata: basta aplicar 2% sobre o total das
                operações sujeitas ao FECOP. O resultado prático é o mesmo, mas
                o caminho aritmético é mais direto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-50" numero="Art. 50" titulo="FECOP na Substituição Tributária por Convênio/Protocolo">
            <LegalText>
              <p>
                Nas operações sujeitas a Regime de Substituição Tributária
                decorrente de Convênio ou Protocolo ICMS celebrado no âmbito do
                CONFAZ, bem como nas operações sujeitas a Regime de ST interna em
                que se utilize margem de valor agregado, valor de referência ou
                congênere, o percentual de 2% do ICMS destinado ao FECOP deverá
                ser adicionado:
              </p>
              <p className="mt-2">
                <strong>I</strong> — à alíquota do ICMS referente à operação ou
                prestação própria do contribuinte substituto;
              </p>
              <p>
                <strong>II</strong> — à alíquota referente ao cálculo do ICMS
                devido por substituição tributária.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O adicional do FECOP deverá ser retido e
                recolhido pelo contribuinte substituto, ainda que localizado em
                outra unidade da Federação, por meio de GNRE ou DAE específico.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 50 estende o FECOP ao regime de substituição tributária
                (ST): o substituto tributário não recolhe apenas o ICMS-ST normal,
                mas também o adicional de 2% sobre ambas as bases — a operação
                própria e a presumida para o consumidor final.
              </p>
              <p className="mt-3">
                A exigência de recolhimento por GNRE para substitutos de outros
                estados é importante: significa que uma indústria paulista que
                venda refrigerantes para distribuidores cearenses deve retener e
                recolher o FECOP ao Ceará por GNRE, junto ao ICMS-ST. O não
                cumprimento expõe o substituto a autuação pela SEFAZ/CE durante
                a conferência eletrônica das GNREs recebidas versus NF-es
                registradas na SEFAZ.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-51" numero="Art. 51" titulo="FECOP na ST Interna com Carga Tributária Líquida">
            <LegalText>
              <p>
                Nas operações sujeitas a Regime de Substituição Tributária interna
                que preveja a cobrança de carga tributária líquida por entrada,
                por saída ou na forma mista, nos termos da Lei nº 14.237/2008,
                o adicional do FECOP deverá ser calculado da seguinte forma:
              </p>
              <p className="mt-2">
                <strong>I</strong> — quanto ao ICMS próprio devido pelo industrial,
                fabricante ou importador: o adicional do FECOP deverá ser
                adicionado à alíquota referente às operações próprias;
              </p>
              <p>
                <strong>II</strong> — quanto ao ICMS-ST: o adicional do FECOP,
                determinado na legislação específica, deverá ser adicionado à
                carga líquida específica do contribuinte.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O disposto neste artigo aplica-se inclusive
                nos casos em que o ICMS-ST for dispensado ou diferido.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 51 trata do regime de carga tributária líquida previsto na
                Lei Estadual nº 14.237/2008, que é a sistemática cearense de ST
                com base em percentual fixo sobre o preço de entrada ou saída,
                diferente da MVA federal. Nesse modelo, o FECOP incide sobre a
                mesma base mas é segregado contabilmente.
              </p>
              <p className="mt-3">
                O § 2º é antiabuso importante: mesmo que o ICMS-ST seja diferido
                ou dispensado por algum benefício fiscal, o FECOP continua sendo
                devido. Isso preserva a receita do fundo social independentemente
                de políticas de incentivo fiscal que o estado conceda para atrair
                investimentos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-52" numero="Art. 52" titulo="(Revogado)">
            <LegalText>
              <p>
                Revogado pelo Decreto nº 35.975/2024 (DOE de 02.05.2024), com
                efeitos a partir de 01.02.2024.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 52 foi revogado pelo Decreto nº 35.975/2024, que
                reorganizou a estrutura de recolhimento do FECOP nas operações
                de importação. O conteúdo original versava sobre procedimentos
                de recolhimento que foram consolidados e simplificados pela nova
                regulamentação, tornando o artigo redundante.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-53" numero="Art. 53" titulo="(Revogado)">
            <LegalText>
              <p>
                Revogado pelo Decreto nº 35.975/2024 (DOE de 02.05.2024), com
                efeitos a partir de 01.02.2024.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Assim como o art. 52, o art. 53 foi revogado no mesmo decreto
                de 2024. Artigos revogados permanecem numerados no regulamento
                para não alterar a numeração dos artigos seguintes, mas seu
                conteúdo normativo não produz mais efeitos. A existência de
                artigos revogados também serve como registro histórico da
                evolução legislativa do RICMS.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-54" numero="Art. 54" titulo="Momento do FECOP em Produtos Específicos">
            <LegalText>
              <p>
                Nas operações de circulação dos produtos de que tratam os incisos
                II, III, V, IX, XI e XIII do art. 47 (armas, embarcações, aviões
                ultraleves, joias, perfumes e pesticidas/herbicidas), bem como
                artigos de tabacaria e artigos para animais de estimação (exceto
                medicamentos e vacinas), o adicional do ICMS destinado ao FECOP
                deverá incidir no momento:
              </p>
              <p className="mt-2">
                <strong>I</strong> — do desembaraço aduaneiro, nas operações de
                importação;
              </p>
              <p>
                <strong>II</strong> — da entrada interestadual, caso o produto
                seja adquirido para consumo final;
              </p>
              <p>
                <strong>III</strong> — da saída interna, nos demais casos.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 54 especifica o momento de incidência do FECOP para um
                subconjunto dos produtos do art. 47, distinguindo-os do regime
                geral do art. 48. A diferença prática está nas operações
                interestaduais: enquanto o art. 48 prevê cobrança "na entrada
                neste Estado" de forma genérica, o art. 54 especifica que, para
                esses produtos, o FECOP só incide na entrada interestadual se a
                mercadoria for adquirida para consumo final.
              </p>
              <p className="mt-3">
                Isso significa que um distribuidor cearense que compra joias de
                SP para revender não deve recolher o FECOP na entrada; ele
                recolherá apenas quando da saída interna para o consumidor final.
                Essa distinção evita o acúmulo de FECOP ao longo da cadeia
                distributiva, concentrando a exação no ponto de consumo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-55" numero="Art. 55" titulo="FECOP e Incentivos Fiscais">
            <LegalText>
              <p>
                A parcela do ICMS destinada ao FECOP apurada na forma do art. 49
                deste Decreto não poderá ser utilizada nem considerada para efeito
                de cálculo de qualquer incentivo ou benefício fiscal, inclusive em
                relação ao previsto na Lei Estadual nº 10.367, de 7 de dezembro
                de 1979.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 55 isola o FECOP do sistema de incentivos fiscais: mesmo
                que o contribuinte seja beneficiário de redução ou isenção do
                ICMS normal (FDI, PROVIN, SEDET e outros programas de atração de
                investimentos), esse benefício não pode ser estendido ao adicional
                do FECOP. O fundo social tem receita garantida independentemente
                dos incentivos concedidos pelo estado.
              </p>
              <p className="mt-3">
                A referência expressa à Lei Estadual nº 10.367/1979 é relevante:
                trata-se de uma das leis mais antigas de incentivos fiscais do
                Ceará, que criou deduções de ICMS para atividades específicas.
                Sem a vedação expressa do art. 55, contribuintes beneficiários
                poderiam argumentar que o FECOP, sendo parcela do ICMS, estaria
                coberto pelo incentivo. A vedação expressa fecha essa brecha.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-56" numero="Art. 56" titulo="FECOP e DIFAL EC 87/2015">
            <LegalText>
              <p>
                O adicional do ICMS destinado ao FECOP deve ser recolhido
                inclusive quando houver o recolhimento do ICMS Diferencial de
                Alíquotas na forma da Emenda Constitucional nº 87, de 16 de
                abril de 2015.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 56 elimina dúvida operacional importante: o FECOP incide
                também nas operações com DIFAL da EC 87/2015 (vendas a consumidor
                final não contribuinte de outro estado). Sem essa previsão
                expressa, poderia surgir a tese de que o FECOP só alcança
                operações puramente internas, não o DIFAL de operações
                interestaduais.
              </p>
              <p className="mt-3">
                Na prática, um e-commerce sediado em São Paulo vendendo joias
                (produto do art. 47, inciso IX) para consumidor cearense deve
                recolher, além do ICMS-DIFAL ao Ceará, também o adicional de 2%
                do FECOP. Esse recolhimento é feito via GNRE por ocasião de cada
                operação, conforme art. 26, § 3º.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-57" numero="Art. 57" titulo="Campos FECOP nos Documentos Fiscais">
            <LegalText>
              <p>
                Os contribuintes obrigados ao recolhimento do acréscimo de que
                trata esta Seção, ainda que inscritos ou não como substitutos
                tributários, ficam obrigados, nas operações internas, de
                importação e interestaduais destinadas a este Estado, ao
                preenchimento dos respectivos campos relativos ao adicional do
                ICMS destinado ao FECOP nos documentos fiscais, quando houver,
                independente do referido adicional estar incluído nos campos
                relativos ao ICMS.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> O Secretário da Fazenda editará
                os atos necessários à explicitação do disposto no caput deste
                artigo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 57 cria obrigação acessória de escrituração: o FECOP deve
                ser explicitado nos campos específicos da NF-e (tag vFCP e
                vFCPST, conforme NT 2015/003), mesmo quando já esteja embutido no
                valor total do ICMS. Essa segregação é fundamental para o controle
                eletrônico da SEFAZ: o validador da NF-e confere se o FECOP está
                corretamente destacado nas operações com os produtos do art. 47.
              </p>
              <p className="mt-3">
                A Instrução Normativa nº 31/2024 da SEFAZ/CE regulamentou os
                procedimentos operacionais para emissão dos documentos fiscais com
                destaque do FECOP, trazendo os códigos de receita DAE e orientações
                de preenchimento da EFD para cada tipo de operação.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-57a" numero="Art. 57-A" titulo="Remissão ao Capítulo X">
            <LegalText>
              <p>
                Aplica-se ao adicional do ICMS destinado ao FECOP, no que
                couber, o disposto na Seção III do Capítulo X do Título I do
                Livro Primeiro deste Decreto. Acrescentado pelo Decreto
                nº 35.314/2023.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 57-A, acrescentado em 2023, incorpora ao FECOP as regras
                do Capítulo X (que trata do pagamento do imposto), particularmente
                as disposições sobre prazo, multa e juros. Isso encerra a
                discussão sobre se o adicional do FECOP, por não ser tecnicamente
                "ICMS" mas sim uma contribuição parafiscal incidente sobre o fato
                gerador do ICMS, estaria submetido aos mesmos acréscimos moratórios.
              </p>
              <p className="mt-3">
                Com a remissão expressa, o recolhimento intempestivo do FECOP
                sujeita-se aos mesmos juros SELIC (art. 91 do RICMS) e multas de
                mora que o ICMS normal, tornando o tratamento uniforme e eliminando
                incentivo ao atraso do pagamento do adicional.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="cap-ix" titulo="Capítulo IX — Sistemática de Apuração do Imposto" />
          <Secao id="sec-nao-cum" titulo="Seção I — Da Não Cumulatividade" />

          <Artigo id="art-58" numero="Art. 58" titulo="Não Cumulatividade do ICMS">
            <LegalText>
              <p>
                O imposto é não cumulativo, compensando-se o que for devido em
                cada operação relativa à circulação de mercadoria ou prestação de
                serviços de transporte interestadual e intermunicipal e de
                comunicação com o montante cobrado nas anteriores por este ou por
                outro Estado.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O mês será o período considerado para
                efeito de apuração e lançamento do ICMS com base na escrituração
                em conta gráfica.
              </p>
              <p>
                <strong>§ 2º</strong> Excepcionalmente, e atendendo às
                peculiaridades de determinadas operações ou prestações, o ICMS
                poderá ser apurado por mercadoria ou serviço, à vista de cada
                operação ou prestação, ou, ainda, por período diverso do
                estabelecido no caput, na forma prevista em ato do Secretário da
                Fazenda.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O princípio da não cumulatividade (art. 155, § 2º, I, CF) é a
                pedra angular do ICMS: cada contribuinte na cadeia produtiva só
                paga o imposto sobre o valor que agregou, deduzindo o ICMS já
                pago nas etapas anteriores. Sem esse mecanismo, o imposto
                incidiria em cascata, onerando cada etapa produtiva sobre o valor
                cheio, incluindo os impostos já cobrados — o chamado "efeito
                cumulativo" que marca tributos como o antigo ICM antes da
                CF/1988.
              </p>
              <p className="mt-3">
                O § 1º faz o período de apuração mensal ser a regra. A apuração
                por operação (§ 2º) é excepcional e se aplica principalmente ao
                ICMS Antecipado (entrada de mercadorias de outros estados sem
                destinatário certo) e ao DIFAL, onde o imposto é exigido a cada
                fato gerador sem aguardar o fechamento mensal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-59" numero="Art. 59" titulo="Montante do ICMS a Recolher">
            <LegalText>
              <p>
                O montante do ICMS a recolher resultará da diferença positiva,
                no período considerado, entre os débitos e os créditos do
                imposto.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> No total dos débitos deverão estar
                compreendidas: (I) saídas e prestações com débito; (II) outros
                débitos; (III) estorno de créditos.
              </p>
              <p>
                <strong>§ 2º</strong> No total dos créditos deverão estar
                compreendidas: (I) entradas e prestações com crédito; (II) outros
                créditos; (III) estorno de débitos; (IV) eventual saldo credor
                anterior.
              </p>
              <p>
                <strong>§ 3º</strong> O saldo credor é transferível para o
                período ou períodos seguintes, ou compensável com saldo devedor
                de estabelecimento do mesmo sujeito passivo localizado neste
                Estado.
              </p>
              <p>
                <strong>§ 5º</strong> A liquidação das obrigações por
                compensação dar-se-á até o montante dos créditos escriturados no
                mesmo período, inclusive o saldo credor oriundo do período
                anterior.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 59 operacionaliza a não cumulatividade em mecânica
                contábil: o ICMS a pagar é sempre a diferença positiva entre
                débitos (saídas e prestações) e créditos (entradas com crédito).
                Na EFD ICMS IPI, isso corresponde exatamente aos registros E110
                (débitos) e E111/E116 (créditos) do Bloco E, cuja diferença
                resulta no campo VL_TOTAL_DEBITOS_OA menos VL_TOTAL_CREDITOS_OA.
              </p>
              <p className="mt-3">
                O § 3º autoriza a compensação de saldo credor entre
                estabelecimentos do mesmo sujeito passivo no Ceará, mecanismo
                regulamentado pelo Decreto nº 35.759/2023 e pela IN nº 03/2024.
                Na prática, o estabelecimento com saldo credor emite uma NF-e com
                CFOP 5.602 transferindo o crédito para o estabelecimento com
                saldo devedor, registrando a operação na EFD de ambos os
                estabelecimentos.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-60" numero="Art. 60" titulo="Transferência de Saldo Credor entre Estabelecimentos">
            <LegalText>
              <p>
                Após o encerramento do período de apuração, para efeito da
                compensação de saldo credor de estabelecimento com saldo devedor
                de um ou mais estabelecimentos do mesmo contribuinte, deverão ser
                observados os seguintes procedimentos:
              </p>
              <p className="mt-2">
                <strong>I</strong> — o valor do crédito a ser transferido deverá
                ser igual ou inferior ao valor do saldo devedor do estabelecimento
                destinatário;
              </p>
              <p>
                <strong>II</strong> — o estabelecimento detentor dos créditos
                deverá emitir NF-e de transferência no mês subsequente ao da
                apuração do saldo credor, até o dia 20;
              </p>
              <p>
                <strong>III</strong> — na NF-e de transferência deverá constar:
                (a) data de saída correspondente ao último dia do período de
                apuração; (b) CFOP 5.602; (c) como destinatário, o estabelecimento
                com saldo devedor; (d) nas informações complementares, fundamento
                no § 3º do art. 59.
              </p>
              <p className="mt-2">
                <strong>§ 5º</strong> Fica vedada a devolução de créditos fiscais
                para a origem.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 60 é o mais operacional do capítulo: define o ritual
                exato da transferência de saldo credor entre estabelecimentos do
                mesmo CNPJ raiz. A exigência do CFOP 5.602 e a datação retroativa
                ao último dia do período de apuração (inciso III, a) são
                essenciais para que a escrituração seja aceita pelo validador
                da EFD.
              </p>
              <p className="mt-3">
                O § 5º ("vedada a devolução") impede que o crédito retorne ao
                estabelecimento que o transferiu: a operação é irreversível. Isso
                evita o uso oportunista do mecanismo — transferir crédito para
                quitar débito, e depois tentar resgatar o crédito original quando
                o estabelecimento destinatário tiver novo saldo credor. A
                irreversibilidade também simplifica a auditoria eletrônica, pois
                cada transferência é um evento definitivo no histórico da EFD.
              </p>
            </Comentario>
          </Artigo>

          <Secao id="sec-cred" titulo="Seção II — Do Crédito do Imposto" />

          <Artigo id="art-61" numero="Art. 61" titulo="Crédito Fiscal — Hipóteses">
            <LegalText>
              <p>
                Para fins de compensação do ICMS devido, constitui crédito fiscal
                o valor do imposto relativo:
              </p>
              <p className="mt-2">
                <strong>I</strong> — à mercadoria recebida para comercialização;
              </p>
              <p>
                <strong>II</strong> — à mercadoria ou produto utilizados no
                processo industrial do estabelecimento;
              </p>
              <p>
                <strong>III</strong> — ao material de embalagem a ser utilizado
                na saída de mercadoria sujeita ao imposto;
              </p>
              <p>
                <strong>IV</strong> — aos serviços de transporte e de comunicação
                utilizados pelo estabelecimento;
              </p>
              <p>
                <strong>IX</strong> — à entrada de bem: (a) para incorporação ao
                ativo imobilizado; (b) para uso e consumo do estabelecimento, a
                partir de 1º de janeiro de 2033.
              </p>
              <p className="mt-2">
                <strong>§ 7º</strong> Não se considera como montante cobrado a
                parcela do ICMS contida no documento fiscal emitido por
                contribuinte de outra UF que corresponda a benefício ou incentivo
                fiscal em desacordo com o art. 155, § 2º, XII, g, CF, exceto se
                reinstituído na forma da LC 160/2017 e do Convênio ICMS 190/17.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 61 enumera as hipóteses de crédito admitidas pelo RICMS/CE,
                operacionalizando a não cumulatividade do art. 58. O ponto central
                é o inciso IX: o crédito de ativo imobilizado é permitido
                imediatamente (desde que observada a regra 1/48 do art. 65), mas
                o crédito de uso e consumo só será liberado em 2033, após sucessivas
                postergações (era 2007, depois 2011, 2015, 2020, 2025 e agora
                2033).
              </p>
              <p className="mt-3">
                O § 7º implementa a "guerra fiscal às avessas": créditos de ICMS
                originários de estados que concedem benefícios inconstitucionais
                (sem convênio CONFAZ) são glosados pelo Ceará. Só é aceito o
                crédito de estados cujos benefícios foram reinstituídos sob a
                LC 160/2017 e o Convênio 190/17 — o chamado "estorno da glosa".
                Na prática, o contribuinte cearense deve verificar se o crédito
                destacado pelo fornecedor de outro estado tem respaldo no Convênio
                190/17.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-62" numero="Art. 62" titulo="Crédito de Energia Elétrica">
            <LegalText>
              <p>
                Para efeito do disposto no art. 61, a energia elétrica entrada
                no estabelecimento somente dará direito a crédito:
              </p>
              <p className="mt-2">
                <strong>I</strong> — quando a operação seguinte corresponder a
                uma saída de energia elétrica;
              </p>
              <p>
                <strong>II</strong> — quando consumida no processo de
                industrialização;
              </p>
              <p>
                <strong>III</strong> — quando seu consumo resultar em operação
                de saída ou prestação para o exterior, na proporção destas sobre
                as saídas ou prestações totais;
              </p>
              <p>
                <strong>IV</strong> — nas demais hipóteses, a partir de 1º de
                janeiro de 2033.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Na hipótese do inciso II, o sujeito passivo
                poderá creditar-se: (I) do montante integral, quando dispuser de
                medição própria específica para a área industrial; ou (II) de 80%
                do valor do imposto destacado no documento fiscal de aquisição,
                independentemente de comprovação do efetivo emprego.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A restrição ao crédito de energia elétrica reflete uma tensão
                histórica do ICMS: a energia consumida nas atividades
                administrativas e comerciais de um estabelecimento não gera crédito
                (até 2033), mas a energia usada diretamente na produção industrial
                gera. Essa distinção é relevante para indústrias que misturam
                processos produtivos e administrativos numa mesma instalação.
              </p>
              <p className="mt-3">
                O § 1º, inciso II, cria um crédito presumido de 80% para
                industriais que não possuam medição separada: ao invés de instalar
                medidores específicos para a área fabril, o contribuinte
                simplesmente credita 80% do ICMS da conta de energia. Trata-se
                de uma simplificação que beneficia principalmente pequenas e médias
                indústrias, que dificilmente têm infraestrutura de medição por setor.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-63" numero="Art. 63" titulo="Crédito de Serviços de Comunicação">
            <LegalText>
              <p>
                Para efeito do disposto no inciso IV do caput do art. 61, os
                serviços de comunicação utilizados pelo estabelecimento somente
                darão direito a crédito:
              </p>
              <p className="mt-2">
                <strong>I</strong> — quando tenham sido prestados na execução de
                serviços da mesma natureza (comunicação vendida usando comunicação);
              </p>
              <p>
                <strong>II</strong> — quando sua utilização resultar em operação
                de saída ou prestação para o exterior, na proporção desta sobre
                as saídas ou prestações totais;
              </p>
              <p>
                <strong>III</strong> — nas demais hipóteses, a partir de 1º de
                janeiro de 2033.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 63 restringe o crédito de comunicação de forma ainda mais
                severa que o de energia: fora do caso de uma prestadora de serviços
                de comunicação (que usa comunicação para prestar comunicação) e das
                exportações, praticamente nenhuma empresa aproveita crédito de
                comunicação até 2033. Internet, telefone, TV por assinatura paga
                pela empresa — tudo gera débito de ICMS para a operadora, mas não
                gera crédito para o tomador do serviço.
              </p>
              <p className="mt-3">
                Essa assimetria é uma das mais criticadas do ICMS: o consumidor
                empresarial de comunicação paga ICMS embutido no serviço mas não
                pode recuperá-lo como crédito, o que o transforma num custo
                definitivo. A postergação até 2033 já foi adiada múltiplas vezes
                porque a liberação reduziria significativamente a arrecadação
                estadual.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-64" numero="Art. 64" titulo="Crédito de Transporte — FOB e CIF">
            <LegalText>
              <p>
                Para efeito do disposto no inciso IV do caput do art. 61,
                relativamente ao crédito decorrente dos serviços de transporte
                utilizados pelo estabelecimento:
              </p>
              <p className="mt-2">
                <strong>I — operações a preço FOB</strong> (despesas de frete
                por conta do destinatário): (a) em operação tributada, se por
                transportador autônomo, o crédito é do destinatário indicado como
                tomador; se por empresa transportadora, o crédito é o valor
                destacado no CT-e; (b) em operação isenta, não tributada ou com
                substituição tributária, não há crédito de transporte;
              </p>
              <p>
                <strong>II — operações a preço CIF</strong> (frete incluído no
                preço, pago pelo remetente): em operação tributada, o ICMS do
                frete é crédito do remetente, vedada a apropriação pelo
                destinatário.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> FOB (Free on Board): frete
                e seguro por conta do adquirente. CIF (Cost, Insurance and
                Freight): frete e seguro incluídos no preço do remetente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 64 resolve um ponto de confusão frequente na escrituração:
                quem se credita do ICMS do frete — o remetente ou o destinatário?
                A resposta depende da modalidade do contrato de compra e venda.
                Na prática, o critério é quem contratou o transporte: em operações
                CIF, o remetente contratou e paga, logo ele se credita; em FOB,
                o destinatário contratou, logo ele se credita.
              </p>
              <p className="mt-3">
                O CT-e (Conhecimento de Transporte Eletrônico) é o documento
                que materializa esse crédito: o contribuinte indicado como
                "tomador" no CT-e é quem tem direito ao crédito do ICMS destacado.
                Na auditoria eletrônica da SEFAZ, o cruzamento entre os CT-es
                recebidos e os créditos registrados na EFD é uma das verificações
                automáticas mais comuns, e erros nessa alocação são fonte frequente
                de autos de infração por crédito indevido.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-65" numero="Art. 65" titulo="Crédito de Ativo Imobilizado — Regra 1/48">
            <LegalText>
              <p>
                Para efeito do disposto na alínea a do inciso IX do caput do
                art. 61, relativamente ao crédito decorrente da entrada de
                mercadorias destinadas ao ativo imobilizado, deverá ser observado
                o seguinte:
              </p>
              <p className="mt-2">
                <strong>I</strong> — a apropriação será feita à razão de 1/48
                por mês, sendo a primeira fração apropriada no mês de entrada
                do bem no estabelecimento;
              </p>
              <p>
                <strong>II</strong> — em cada período, não será admitida a
                apropriação correspondente à razão entre o total das saídas
                isentas ou não tributadas e o total das saídas do mesmo período;
              </p>
              <p>
                <strong>III</strong> — o montante do crédito a ser apropriado a
                cada mês será obtido multiplicando o valor total do crédito pelo
                fator 1/48 da relação entre saídas tributadas e total das saídas
                do período;
              </p>
              <p>
                <strong>V</strong> — na hipótese de alienação antes de decorridos
                4 anos da aquisição, não será mais admitida a apropriação da
                fração restante do quadriênio.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A regra 1/48 (crédito de ativo imobilizado em 48 parcelas mensais,
                equivalente a 4 anos) é uma das mais impactantes no fluxo de caixa
                das empresas com alto investimento em bens de capital. Uma máquina
                industrial com ICMS de R$ 100.000 gera crédito de apenas R$ 2.083
                por mês, e esse valor ainda é reduzido proporcionalmente às saídas
                isentas (inciso II).
              </p>
              <p className="mt-3">
                O inciso V protege a receita estadual: se o bem for vendido antes
                dos 4 anos, o crédito residual é cancelado. Isso evita que empresas
                comprem ativo imobilizado apenas para aproveitar crédito acelerado
                e depois alienem o bem. O controle desse histórico é feito pelo
                CIAP (art. 66), que registra a vida fiscal de cada bem do ativo.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-66" numero="Art. 66" titulo="CIAP — Controle de Crédito do Ativo Permanente">
            <LegalText>
              <p>
                Os contribuintes deverão lançar os créditos decorrentes da
                entrada de bens destinados ao ativo imobilizado do estabelecimento
                no documento de Controle de Crédito de ICMS do Ativo Permanente
                (CIAP), observando-se a forma e condições previstas no Ato
                COTEPE/ICMS nº 09/08.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O contribuinte somente poderá apropriar-se
                do crédito relativo à aquisição de componentes após a sua efetiva
                integração que resulte em bem do ativo imobilizado, oportunidade
                em que deverá emitir NF-e consignando nas informações
                complementares os números e datas das notas de aquisição dos
                componentes.
              </p>
              <p>
                <strong>§ 3º</strong> Na hipótese de alienação ou transferência
                antes de decorridos 48 meses, não será admitido o crédito da
                fração que corresponderia ao restante do quadriênio.
              </p>
              <p>
                <strong>§ 6º</strong> Aplicam-se à escrituração do CIAP, no que
                couber, as orientações do Manual da EFD publicado no Portal
                Nacional do SPED.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O CIAP é o sub-registro do Bloco G da EFD ICMS IPI: cada bem do
                ativo imobilizado tem uma "ficha" no registro G110 (identificação)
                com os saldos mensais nos registros G125 (movimentação) e G126
                (crédito apropriado). A SEFAZ cruza automaticamente o Bloco G da
                EFD com as NF-es de aquisição de bens do ativo, verificando se o
                crédito 1/48 está sendo calculado corretamente.
              </p>
              <p className="mt-3">
                O § 2º trata dos bens montados por partes (componentes): cada
                componente entra individualmente no estoque sem gerar crédito; só
                quando todos os componentes são integrados e o bem entra em
                operação o contribuinte emite uma NF-e de "ativação" e começa a
                apropriar o crédito 1/48. Esse procedimento é comum em plantas
                industriais onde equipamentos são montados in loco ao longo de
                meses.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-67" numero="Art. 67" titulo="Saldo Credor no Encerramento de Atividades">
            <LegalText>
              <p>
                O saldo credor do imposto existente na data do encerramento das
                atividades de qualquer estabelecimento não é passível de
                restituição nem de transferência para outro estabelecimento.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> O disposto no caput não se
                aplica às hipóteses de: (I) transferência de estoque de
                mercadorias em virtude de fusão, cisão, transformação e
                incorporação de empresas; (II) transferência para compensação
                com saldo devedor de estabelecimento do mesmo sujeito passivo
                localizado neste Estado, na forma prevista no art. 59.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A regra geral do art. 67 é severa: ao encerrar as atividades, o
                saldo credor acumulado simplesmente perece — não pode ser
                monetizado nem transferido para outro CNPJ do mesmo grupo. Isso
                reflete a lógica do ICMS como imposto estadual: o crédito só tem
                utilidade dentro da cadeia de circulação daquele estabelecimento.
              </p>
              <p className="mt-3">
                As exceções do parágrafo único são economicamente justificadas:
                em reorganizações societárias (fusão, cisão, incorporação), o
                saldo credor acompanha o acervo da empresa reorganizada porque
                o estabelecimento jurídico é extinto mas a atividade continua.
                Sem essa exceção, reorganizações empresariais no Ceará seriam
                penalizadas com a perda de créditos acumulados.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-68" numero="Art. 68" titulo="Crédito na Devolução e Retorno">
            <LegalText>
              <p>
                Fica assegurado o direito ao crédito quando a mercadoria,
                anteriormente onerada pelo imposto, for objeto de:
              </p>
              <p className="mt-2">
                <strong>I</strong> — devolução, na forma da legislação
                pertinente;
              </p>
              <p>
                <strong>II</strong> — retorno, por não ter ocorrido a tradição
                real.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 68 distingue devolução de retorno: a devolução ocorre
                quando a mercadoria foi entregue (tradição real ocorreu) e o
                comprador a devolve por defeito, inadimplemento ou arrependimento;
                o retorno ocorre quando a tradição nunca se completou (mercadoria
                que retorna ao remetente por não encontrar o destinatário, por
                exemplo).
              </p>
              <p className="mt-3">
                Em ambos os casos, o vendedor original tem direito ao crédito do
                ICMS que foi debitado na saída, pois a operação foi desfeita. Na
                prática, a devolução é documentada por NF-e de devolução emitida
                pelo destinatário (com CFOP 5.201/6.201), e o retorno é documentado
                pela própria NF-e original com indicação de retorno. Sem essa
                assimetria de créditos, o vendedor pagaria ICMS sobre uma operação
                que não se concretizou economicamente.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-69" numero="Art. 69" titulo="Crédito Extemporâneo">
            <LegalText>
              <p>
                Por ocasião da solicitação, ao Fisco, do aproveitamento de
                crédito extemporâneo, o contribuinte deverá anexar o comprovante
                do pagamento da taxa de que trata o subitem 1.7 do Anexo IV da
                Lei nº 15.838/2015 (Taxa de Fiscalização e Prestação de Serviço
                Público), equivalente a 450 UFIRCEs.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O crédito extemporâneo é o crédito fiscal que o contribuinte não
                aproveitou no período próprio de escrituração e que pretende
                lançar em período posterior. Para fazê-lo, precisa solicitar
                autorização ao fisco acompanhada do pagamento de taxa de 450
                UFIRCEs (aproximadamente R$ 500 a R$ 600 em 2024).
              </p>
              <p className="mt-3">
                Essa taxa desestimula o acúmulo deliberado de créditos para
                lançamento tardio, mas onera o contribuinte que simplesmente
                perdeu prazo por erro ou desconhecimento. É importante notar que
                o direito ao crédito extemporâneo tem prazo prescricional de 5
                anos (art. 150, § 4º, CTN aplicado analogicamente): créditos com
                mais de 5 anos não podem ser aproveitados, mesmo com pagamento
                da taxa.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-70" numero="Art. 70" titulo="Crédito Interestadual — Limitação de Alíquota">
            <LegalText>
              <p>
                Nas operações e prestações oriundas de outras unidades da
                Federação, o crédito fiscal só será admitido, no máximo, se
                calculado pelas seguintes alíquotas:
              </p>
              <p className="mt-2">
                <strong>I</strong> — das Regiões Norte, Nordeste e Centro-Oeste:
                12% (doze por cento);
              </p>
              <p>
                <strong>II</strong> — das Regiões Sul e Sudeste: 7% (sete por
                cento).
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> Para efeito do disposto neste
                artigo: Região Norte — AC, AP, AM, PA, RO, RR, TO; Região
                Nordeste — AL, BA, CE, MA, PB, PE, PI, RN, SE; Região Sul —
                PR, RS, SC; Região Sudeste — ES, MG, RJ, SP; Região
                Centro-Oeste — DF, GO, MS, MT.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 70 implementa as alíquotas interestaduais da Resolução do
                Senado nº 22/1989: 12% para operações de estados menos
                desenvolvidos (Norte, Nordeste e Centro-Oeste) e 7% para estados
                mais desenvolvidos (Sul e Sudeste). Essas alíquotas foram
                estabelecidas para garantir partilha de receita entre estados de
                origem e destino nas operações interestaduais.
              </p>
              <p className="mt-3">
                A limitação do crédito é relevante quando o fornecedor destaca um
                valor de ICMS maior que o permitido pela alíquota interestadual —
                o que pode ocorrer por erro ou por benefício fiscal concedido pelo
                estado de origem. O Ceará só admite como crédito o valor calculado
                pela alíquota interestadual aplicável, independentemente do valor
                destacado na nota. Qualquer excesso é glosado na auditoria da EFD.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-71" numero="Art. 71" titulo="Crédito Fiscal Presumido">
            <LegalText>
              <p>
                O crédito fiscal presumido será concedido nas hipóteses
                relacionadas no Anexo IV deste Decreto.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O crédito fiscal presumido é um benefício fiscal que substitui o
                regime normal de crédito/débito: em vez de compensar o ICMS
                efetivamente cobrado nas entradas, o contribuinte credita um
                percentual presumido calculado sobre as saídas, simplificando a
                escrituração e reduzindo a carga tributária efetiva.
              </p>
              <p className="mt-3">
                O Anexo IV do RICMS/CE lista setores beneficiados, como
                distribuidores de produtos farmacêuticos, frigoríficos e atacadistas
                de determinados produtos. Esses créditos presumidos são negociados
                via convênios CONFAZ (ou por lei estadual nas hipóteses
                constitucionalmente permitidas) e representam instrumento de política
                industrial, reduzindo o custo tributário de setores estratégicos
                para a economia cearense.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-72" numero="Art. 72" titulo="Vedações ao Aproveitamento de Crédito">
            <LegalText>
              <p>
                Fica vedado o aproveitamento de crédito de ICMS nas seguintes
                hipóteses (relacionadas no Decreto):
              </p>
              <p className="mt-2">
                — entradas de mercadorias ou utilização de serviços que não se
                vinculem à atividade econômica do estabelecimento;
              </p>
              <p>
                — aquisição de bens destinados ao uso e consumo do estabelecimento
                (até 31.12.2032);
              </p>
              <p>
                — operações de aquisição cobertas por isenção, não incidência ou
                diferimento do ICMS, salvo disposição em contrário;
              </p>
              <p>
                — aquisições por contribuintes optantes pelo Simples Nacional
                (exceto nas situações expressamente autorizadas).
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 72 é o complemento negativo do art. 61: enquanto aquele
                lista o que gera crédito, este lista o que não gera. A vedação
                mais economicamente significativa é a de uso e consumo (postergada
                até 2033): qualquer despesa do estabelecimento que não seja insumo
                de produção ou mercadoria para revenda não gera crédito de ICMS,
                transformando o imposto embutido nessas compras em custo definitivo.
              </p>
              <p className="mt-3">
                A vedação para compras isentas ou com diferimento é lógica: se
                não houve ICMS na entrada, não há o que compensar. A exceção
                relevante é o crédito de entrada isenta seguida de saída tributada
                em produtos agropecuários (art. 61, inciso X), que permite o crédito
                proporcional nas operações de beneficiamento de produtos rurais.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-73" numero="Art. 73" titulo="Estorno do Crédito">
            <LegalText>
              <p>
                Salvo disposição da legislação em contrário, o sujeito passivo
                deverá efetuar o estorno do ICMS de que se tiver creditado,
                sempre que o serviço tomado ou a mercadoria entrada no
                estabelecimento: (I) for objeto de saída ou prestação de serviço
                não tributada ou isenta, sendo esta circunstância imprevisível na
                data da entrada da mercadoria ou da utilização do serviço;
                (II) for integrada ou consumida em processo de industrialização,
                quando a saída do produto resultante não for tributada ou estiver
                isenta do imposto; (III) vier a ser utilizada em fim alheio à
                atividade do estabelecimento; (IV) vier a perecer, deteriorar-se
                ou extraviar-se.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O estorno de crédito é a operação inversa ao aproveitamento: o
                contribuinte que se creditou de uma entrada e depois constata que
                aquela mercadoria ou serviço não será usado em operação tributada
                deve devolver o crédito ao fisco. É o mecanismo que preserva a
                lógica da não cumulatividade — o crédito só tem razão de existir
                se houver débito correspondente em algum ponto da cadeia.
              </p>
              <p className="mt-3">
                O inciso IV (perecimento, deterioração, extravio) é
                operacionalmente relevante para o varejo e a indústria alimentícia:
                toda mercadoria que dá baixa por quebra, vencimento ou roubo
                exige estorno do ICMS creditado na entrada. O correto registro
                desses estornos na EFD (registro E111) é verificado pela SEFAZ
                no cruzamento com os inventários declarados, e a falta de estorno
                é infração frequentemente identificada em auditorias.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-74" numero="Art. 74" titulo="Transferência de Crédito Acumulado de Exportação">
            <LegalText>
              <p>
                O estabelecimento que tenha realizado operação ou prestação de
                exportação para o exterior poderá utilizar o crédito acumulado em
                razão dessas operações para: (I) compensação com débitos do ICMS
                próprios do estabelecimento exportador ou de outros estabelecimentos
                do mesmo contribuinte; (II) transferência para fornecedores de
                mercadorias ou serviços, para pagamento das aquisições desses
                fornecedores.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O contribuinte que pretender efetuar
                transferência de créditos fiscais deverá observar as condições e
                procedimentos do art. 75.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O crédito acumulado de exportação surge porque o ICMS das entradas
                (insumos, matéria-prima) gera crédito, mas as saídas para o
                exterior são imunes ao ICMS (art. 155, § 2º, X, a, CF). O
                exportador acumula, portanto, créditos que nunca terão débito
                correspondente — e o art. 74 cria os mecanismos para monetizar
                esses créditos.
              </p>
              <p className="mt-3">
                A possibilidade de transferir o crédito para fornecedores
                (inciso II) é especialmente valiosa: o exportador pode pagar
                suas compras com crédito de ICMS em vez de dinheiro, melhorando
                seu capital de giro. O fornecedor, por sua vez, usa esse crédito
                recebido para quitar seus próprios débitos de ICMS. Esse mercado
                de créditos de exportação é regulamentado pelo art. 75 e seguintes,
                que definem as condições de habilitação e transferência.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-75"
            numero="Artigo 75"
            titulo="Procedimentos para Transferência de Créditos Fiscais"
          >
            <LegalText>
              <p>
                O contribuinte que pretender efetuar transferência de créditos fiscais
                deverá observar os seguintes procedimentos:
              </p>
              <p className="mt-2">
                <strong>I</strong> na hipótese de transferência a outro estabelecimento
                do mesmo contribuinte: emitir nota fiscal em transferência de crédito
                fiscal e escriturar no campo <em>Ajustes a Débito</em> da apuração do
                ICMS na EFD, dentro do período de apuração em que ocorreu a
                transferência;
              </p>
              <p className="mt-2">
                <strong>II</strong> na hipótese de transferência para estabelecimento
                de outro contribuinte: apresentar requerimento à Secretaria da Fazenda,
                relatando os dados relativos ao crédito, tais como valor e o período em
                que foi acumulado.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 75 diferencia dois fluxos operacionais distintos. Na transferência
                intraempresa (inciso I), a operação se formaliza diretamente na EFD por
                meio de nota fiscal de transferência de crédito, lançada no registro de
                ajustes a débito do período. Já a transferência para terceiro (inciso II)
                exige aprovação prévia da SEFAZ, que analisará a legitimidade e o valor
                do crédito antes de autorizar a operação.
              </p>
              <p className="mt-3">
                Na prática, o fisco precisa do requerimento para verificar: (a) se o
                crédito não está contaminado por incentivos fiscais (§ 3º do art. 74);
                (b) se o destinatário não está inscrito no CADINE (art. 77); (c) se não
                há irregularidades que exijam intimação para saneamento (§ 6º do art. 74).
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-76"
            numero="Artigo 76"
            titulo="Apropriação pelo Destinatário do Crédito Transferido"
          >
            <LegalText>
              <p>
                Os créditos tributários transferidos deverão ser apropriados pelo
                destinatário somente a partir do mês subsequente àquele em que foram
                transferidos, observado o seguinte:
              </p>
              <p className="mt-2">
                <strong>I</strong> a apropriação fica limitada a <strong>20%</strong> do
                valor remanescente do saldo devedor do ICMS apurado mensalmente pelo
                contribuinte recebedor, após as deduções decorrentes de incentivos ou
                benefícios fiscais;
              </p>
              <p className="mt-2">
                <strong>II</strong> do valor do saldo devedor exclui-se, quando for o
                caso, o valor destinado ao FECOP;
              </p>
              <p className="mt-2">
                <strong>III</strong> havendo saldos remanescentes dos créditos recebidos,
                esses poderão ser transferidos para os meses subsequentes, até a total
                apropriação, sempre respeitada a limitação do inciso I.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O legislador criou um mecanismo de amortização gradual para evitar que a
                apropriação imediata do crédito recebido cause desequilíbrio na
                arrecadação mensal. Ao limitar a 20% do saldo devedor por mês, o Estado
                garante que o beneficiário continue recolhendo ao menos 80% de seu ICMS
                normalmente durante o período de absorção.
              </p>
              <p className="mt-3">
                A exclusão do FECOP da base do saldo devedor (inciso II) é relevante para
                contribuintes sujeitos ao adicional: o crédito recebido não pode ser usado
                para compensar o percentual destinado ao Fundo. Isso preserva a receita do
                FECOP, que tem destinação constitucional específica ao combate à pobreza.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-77"
            numero="Artigo 77"
            titulo="CADINE: Restrição à Transferência de Crédito"
          >
            <LegalText>
              <p>
                Ao contribuinte inscrito no Cadastro de Inadimplentes da Fazenda
                Pública Estadual (CADINE) não se permitirá transferir ou receber em
                transferência crédito do ICMS na hipótese do § 1º do art. 74, salvo
                quando se destinar à quitação de créditos tributários.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A inscrição no CADINE sinaliza inadimplência fiscal, o que tornaria
                contraditório permitir que o devedor participe do mercado de créditos de
                exportação. A vedação é bilateral: o inadimplente não pode ceder nem
                receber créditos de terceiros.
              </p>
              <p className="mt-3">
                A exceção para quitação de créditos tributários é pragmática: se o
                próprio intuito da operação for regularizar a dívida que gerou a inscrição
                no CADINE, não há razão para bloquear. O Estado prefere receber por meio
                de créditos de ICMS do que manter o contribuinte inadimplente
                indefinidamente.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-vii"
            titulo="Seção VII — Do Leilão dos Créditos Acumulados Decorrentes de Exportações"
          />

          <Artigo
            id="art-78"
            numero="Artigo 78"
            titulo="Leilão Reverso de Créditos Acumulados de Exportação"
          >
            <LegalText>
              <p>
                Opcionalmente à sistemática do art. 74, os saldos credores acumulados a
                partir de 16 de setembro de 1996 por estabelecimentos exportadores
                poderão ser adquiridos, mediante <strong>leilão reverso</strong>, pela
                Fazenda Pública, com deságio mínimo de (redação do Dec. 34.274/2021):
              </p>
              <p className="mt-2">
                <strong>I</strong> 2%, quando se tratar de empresa exclusivamente
                exportadora (ao menos 90% das saídas destinadas ao exterior);
              </p>
              <p className="mt-2">
                <strong>II</strong> 4%, quanto aos demais contribuintes.
              </p>
              <p className="mt-2">
                O pagamento será feito pelo CEDE em até 30 dias da homologação do
                resultado. Alternativamente, o arrematante pode transferir o crédito
                com deságio para terceiros, registrado na EFD do adquirente.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O leilão reverso é uma alternativa ao regime ordinário do art. 74: em
                vez de o exportador transferir o crédito diretamente a terceiros (sujeito
                a trâmites burocráticos), ele "vende" o crédito ao próprio Estado com um
                deságio, recebendo recursos financeiros imediatos. O Estado, por sua vez,
                pode utilizar esses créditos para compensar débitos de outros
                contribuintes.
              </p>
              <p className="mt-3">
                O deságio diferenciado (2% para exportadores exclusivos, 4% para demais)
                foi introduzido pelo Decreto 34.274/2021 para incentivar empresas
                predominantemente exportadoras, que acumulam maiores volumes de crédito e
                têm mais dificuldade em utilizá-los por transferência direta. A opção
                pelo leilão substitui, para o crédito ofertado, o regime do art. 74.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-79"
            numero="Artigo 79"
            titulo="Modalidade e Condições do Leilão Reverso"
          >
            <LegalText>
              <p>
                A aquisição a que se refere o art. 78 obedecerá ao seguinte:
              </p>
              <p className="mt-2">
                <strong>I</strong> será realizada na modalidade de licitação leilão
                reverso;
              </p>
              <p className="mt-2">
                <strong>II</strong> a periodicidade do leilão reverso será definida
                pela SEFAZ conforme critérios de conveniência e oportunidade;
              </p>
              <p className="mt-2">
                <strong>III</strong> as condições serão estabelecidas em edital
                publicado no DOE, na internet e em jornal de grande circulação no Estado.
              </p>
              <p className="mt-2">
                Parágrafo único. O leilão reverso deverá ser realizado na modalidade de
                pregão presencial ou eletrônico.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O pregão (presencial ou eletrônico) é a modalidade padrão para aquisição
                de bens e serviços comuns, adaptada aqui para a "compra" de créditos
                tributários pelo Estado. A publicação do edital no DOE, na internet e em
                jornal garante transparência e concorrência entre os exportadores
                interessados em monetizar seus saldos credores.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-80"
            numero="Artigo 80"
            titulo="Credenciamento ao Leilão Reverso"
          >
            <LegalText>
              <p>
                No ato de credenciamento ao leilão, o contribuinte interessado deverá
                apresentar certificado da existência válida e regular do crédito
                acumulado, fornecido pela SEFAZ, com base no parecer técnico de que
                tratam os §§ 2º e 3º do art. 78.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O certificado emitido pela SEFAZ após análise do parecer técnico é o
                documento que habilita o exportador a participar do leilão. Sua finalidade
                é garantir que apenas créditos legítimos e devidamente verificados pelo
                fisco sejam ofertados, evitando que créditos irregulares ou já extintos
                ingressem no processo licitatório.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-81"
            numero="Artigo 81"
            titulo="Homologação do Leilão Reverso pela PGE"
          >
            <LegalText>
              <p>
                Homologado o leilão reverso pela Procuradoria Geral do Estado (PGE),
                o resultado será oficializado à SEFAZ e à Secretaria de Desenvolvimento
                Econômico (SDE), que adotarão as providências para a realização do
                pagamento no prazo de 30 dias contados a partir da homologação.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A PGE homologa o leilão por ser ela a responsável pela representação do
                Estado em matéria fiscal e pela supervisão da Dívida Ativa. A comunicação
                à SDE reflete o aspecto econômico da operação: créditos de exportação têm
                relação direta com a política de incentivo à atividade exportadora do
                Estado.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-82"
            numero="Artigo 82"
            titulo="Normas do Pregão Aplicáveis ao Leilão Reverso"
          >
            <LegalText>
              <p>
                Deverão ser aplicadas à realização do leilão reverso, no que couber, as
                normas previstas no Decreto Estadual nº 28.089/2006, que regulamenta a
                licitação na modalidade pregão no âmbito da Administração Pública
                Estadual, instituída pela Lei Federal nº 10.520/2002, para aquisição de
                bens e serviços comuns.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A remissão ao Decreto do pregão garante que o leilão reverso siga as
                mesmas garantias procedimentais aplicáveis a qualquer licitação estadual:
                publicidade, isonomia entre participantes, possibilidade de recursos e
                controle pelos órgãos de fiscalização. A expressão <em>no que couber</em>{" "}
                permite adaptações necessárias à natureza específica da operação, que
                envolve a "compra" de créditos tributários pelo Estado, e não de bens ou
                serviços convencionais.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-viii"
            titulo="Seção VIII — Da Compensação"
          />

          <Artigo
            id="art-83"
            numero="Artigo 83"
            titulo="Compensação de ICMS Inscrito em Dívida Ativa"
          >
            <LegalText>
              <p>
                O crédito tributário decorrente do ICMS inscrito em dívida ativa poderá
                ser compensado com crédito da mesma espécie do sujeito passivo, líquido,
                certo e reconhecido pelo Fisco.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Não se aplica a débitos relativos ao Adicional do
                ICMS destinado ao FECOP.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O contribuinte deverá apresentar requerimento à
                SEFAZ com demonstrativo dos valores do crédito e do débito.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> Após análise e parecer homologado pelo Secretário
                da Fazenda, o processo será encaminhado à PGE para extinção dos créditos
                tributários até o limite em que se compensem.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A compensação de crédito inscrito em dívida ativa é um mecanismo relevante
                para contribuintes que, simultaneamente, são credores e devedores do
                Estado. Em vez de pagar o débito inscrito e aguardar a restituição do
                crédito (processo demorado), a compensação extingue ambas as obrigações
                de uma só vez.
              </p>
              <p className="mt-3">
                Os requisitos para o crédito do contribuinte são rigorosos: deve ser
                líquido (valor determinado), certo (existência inquestionável) e
                reconhecido pelo Fisco. Créditos contestados administrativamente ou com
                valor ainda em apuração não podem ser utilizados. A exclusão do FECOP
                (§ 1º) segue a mesma lógica do art. 76, inciso II: a destinação
                constitucional do fundo não admite compensações cruzadas.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-84"
            numero="Artigo 84"
            titulo="Compensação de Ofício pela SEFAZ"
          >
            <LegalText>
              <p>
                A compensação poderá ser efetuada de ofício sempre que a SEFAZ verificar
                que o titular do crédito a ser restituído tem débito de ICMS vencido
                referente a períodos anteriores.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A compensação de ofício é uma prerrogativa da administração tributária
                que visa evitar a situação paradoxal de restituir dinheiro a um
                contribuinte que, ao mesmo tempo, possui débito vencido. Ao agir de
                ofício, a SEFAZ aplica o princípio da eficiência administrativa: extingue
                o débito antes de devolver o crédito, reduzindo o volume de cobranças e
                restituições desnecessárias.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-ix"
            titulo="Seção IX — Da Compensação de Crédito Tributário com Precatórios"
          />

          <Artigo
            id="art-85"
            numero="Artigo 85"
            titulo="Compensação de ICMS com Precatórios"
          >
            <LegalText>
              <p>
                Aplica-se à compensação de crédito tributário de ICMS com precatórios o
                disposto no Decreto nº 28.265, de 5 de junho de 2006, ou outro que venha
                a dispor sobre a matéria.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Precatórios são créditos do contribuinte (ou de terceiros que os
                adquiriram) contra o Estado, resultantes de decisões judiciais transitadas
                em julgado. A possibilidade de compensar precatórios com débitos de ICMS
                permite ao Estado reduzir o volume de precatórios pendentes e ao
                contribuinte quitar seus débitos fiscais sem dispêndio imediato de caixa.
              </p>
              <p className="mt-3">
                A remissão ao Decreto 28.265/2006 ou norma posterior é uma técnica de
                remissão dinâmica: o RICMS não repete as regras procedimentais, mas
                incorpora suas disposições por referência, evitando conflitos normativos
                e facilitando a atualização do regramento sem necessidade de alterar o
                próprio RICMS.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="cap-x"
            titulo="Capítulo X — Do Recolhimento do Imposto"
          />

          <Secao
            id="sec-x-i"
            titulo="Seção I — Da Forma e dos Prazos"
          />

          <Artigo
            id="art-86"
            numero="Artigo 86"
            titulo="Contagem Contínua dos Prazos"
          >
            <LegalText>
              <p>
                Os prazos fixados na legislação serão contínuos, excluindo-se da sua
                contagem o dia de início e incluindo-se o de vencimento.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O prazo cujo vencimento ocorra em feriado estadual
                ou nacional fica prorrogado para o primeiro dia útil subsequente.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O § 1º não se aplica quando o prazo de vencimento
                estiver previsto para o último dia do mês: nesse caso, o recolhimento
                deverá ser efetuado até o dia útil anterior.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A regra de contagem contínua impede o uso de interpretações que
                excluiriam sábados, domingos ou feriados do cômputo do prazo. O ICMS usa
                prazo civil corrido, não prazo processual.
              </p>
              <p className="mt-3">
                A exceção do § 2º é relevante na prática: quando o vencimento cai no
                último dia do mês (comum em vários prazos do art. 88) e esse dia é
                feriado, o contribuinte deve recolher no dia útil anterior, e não no
                primeiro dia útil do mês seguinte. Isso evita que o recolhimento migre
                para outro mês de apuração, gerando distorções na contabilidade fiscal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-87"
            numero="Artigo 87"
            titulo="Rede Arrecadadora Credenciada"
          >
            <LegalText>
              <p>
                O imposto, inclusive multas e acréscimos legais, deverá ser recolhido na
                rede arrecadadora credenciada, na forma disposta em ato normativo expedido
                pelo Secretário da Fazenda.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O recolhimento exclusivamente pela rede credenciada (bancos e
                estabelecimentos autorizados) garante o registro centralizado dos
                pagamentos e a conciliação automática com os sistemas de arrecadação da
                SEFAZ. O Documento de Arrecadação Estadual (DAE) e a GNRE são os
                documentos de recolhimento emitidos nessa rede.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-88"
            numero="Artigo 88"
            titulo="Prazos de Recolhimento do ICMS"
          >
            <LegalText>
              <p>
                O recolhimento do ICMS deverá ser efetuado nos seguintes prazos
                (ressalvados os prazos da legislação específica):
              </p>
              <p className="mt-2">
                <strong>I</strong> até o último dia útil do mês subsequente ao fato
                gerador: estabelecimentos industriais (ICMS próprio e ST) e produtores
                agropecuários; exceto novembro, cujo vencimento ocorrerá no
                antepúltimo dia útil de dezembro;
              </p>
              <p className="mt-2">
                <strong>II</strong> até o 20º dia do mês subsequente: substitutos,
                atacadistas e varejistas (ST por entradas, por saídas, retido na fonte e
                operações próprias); credenciados para recolher ST por entrada
                interestadual, ICMS Antecipado e DIFAL; contribuintes da Lei 14.237/2008
                e demais inscritos no CGF sem prazo específico;
              </p>
              <p className="mt-2">
                <strong>III</strong> até o 20º dia após a entrada da mercadoria, nos
                casos em que a legislação exija emissão de Nota Fiscal de entrada;
              </p>
              <p className="mt-2">
                <strong>IV</strong> no momento da expedição da Nota Fiscal Avulsa;
              </p>
              <p className="mt-2">
                <strong>V</strong> antes da saída da mercadoria da repartição em que se
                processar o despacho, o desembaraço aduaneiro ou o leilão, pelo
                importador ou pelo arrematante;
              </p>
              <p className="mt-2">
                <strong>VI</strong> nos prazos fixados em Convênio ou Protocolo do ICMS,
                para contribuintes de outros estados inscritos no Ceará como substitutos
                tributários;
              </p>
              <p className="mt-2">
                <strong>VII</strong> até o 15º dia do mês subsequente: contribuintes de
                outras UF credenciados para o DIFAL de operações destinadas a consumidor
                final não contribuinte no Ceará;
              </p>
              <p className="mt-2">
                <strong>VIII</strong> até o 15º dia após o fato gerador: mercadorias
                transportadas por empresa credenciada de outros estados a contribuinte
                não credenciado (ICMS Antecipado, ST ou DIFAL); se a entrega ocorrer
                antes de 15 dias, o recolhimento deve ser feito até o momento da entrega;
              </p>
              <p className="mt-2">
                <strong>IX</strong> no momento da entrada no território do Ceará:
                mercadorias transportadas por empresa não credenciada de outros estados a
                contribuinte não credenciado (ICMS Antecipado, ST ou DIFAL);
              </p>
              <p className="mt-2">
                <strong>X</strong> até 10 de abril de cada exercício: ICMS-ST relativo
                à diferença de estoque de combustíveis líquidos derivados de petróleo
                apurada ao final do exercício por distribuidores, informada na EFD;
              </p>
              <p className="mt-2">
                <strong>XI</strong> no momento do fato gerador: demais casos.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 88 é o coração operacional do ICMS para os profissionais de
                contabilidade fiscal. Os três prazos mais frequentes na rotina são: o
                último dia útil do mês seguinte (inciso I, para indústrias), o 20º dia
                do mês seguinte (inciso II, para comércio atacadista/varejista e ST) e
                o momento da entrada no Estado (inciso IX, para mercadorias trazidas por
                transportadora não credenciada).
              </p>
              <p className="mt-3">
                A distinção entre transportadoras credenciadas (inciso VIII) e não
                credenciadas (inciso IX) tem impacto logístico direto: com empresa
                credenciada o contribuinte tem até 15 dias para recolher; com não
                credenciada, o ICMS deve ser recolhido na barreira fiscal antes da
                entrada da mercadoria no Ceará. Isso explica por que muitas empresas
                preferem contratar transportadoras credenciadas pela SEFAZ-CE.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-89"
            numero="Artigo 89"
            titulo="Encerramento de Atividades e Recolhimento do ICMS"
          >
            <LegalText>
              <p>
                O encerramento das atividades do contribuinte é a data para recolhimento
                do ICMS relativo às mercadorias constantes do estoque final do
                estabelecimento.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Na baixa do CGF (Cadastro Geral da Fazenda), o contribuinte deve apurar
                o ICMS incidente sobre o estoque final de mercadorias e recolhê-lo na
                data do encerramento. Isso evita que mercadorias com crédito de ICMS na
                entrada saiam do ciclo tributário sem a correspondente tributação na
                saída, que nunca ocorrerá após a baixa do estabelecimento.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-x-ii"
            titulo="Seção II — Dos Acréscimos Moratórios e da Atualização Monetária"
          />

          <Artigo
            id="art-90"
            numero="Artigo 90"
            titulo="Mora Espontânea: 0,15% ao Dia (Máximo 15%)"
          >
            <LegalText>
              <p>
                O pagamento espontâneo do imposto, fora dos prazos e antes de qualquer
                procedimento do Fisco, ficará sujeito à mora de{" "}
                <strong>0,15% por dia de atraso</strong>, até o limite máximo de{" "}
                <strong>15%</strong>.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> O acréscimo:
              </p>
              <p className="mt-2">
                <strong>I</strong> será calculado sobre o valor originário do imposto;
              </p>
              <p className="mt-2">
                <strong>II</strong> não se aplica na pendência de pedido de registro ou
                de alteração de registro de documento fiscal no SITRAM, formulado pelo
                devedor dentro do prazo legal para pagamento do crédito tributário.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 90 regula a mora qualificada pela espontaneidade: o contribuinte
                que recolhe voluntariamente, sem que haja procedimento fiscal em
                andamento, paga apenas a multa moratória (0,15%/dia, até 15%). Após o
                início de qualquer ação fiscal, aplica-se o regime da multa de ofício,
                que é bem mais gravoso.
              </p>
              <p className="mt-3">
                O limite de 15% equivale a 100 dias de atraso (15% / 0,15% = 100 dias).
                A partir do 101º dia, a mora deixa de crescer, mas continuam correndo os
                juros SELIC do art. 91. A exceção do inciso II protege o contribuinte que
                abriu pedido no SITRAM tempestivamente: enquanto o pedido está pendente
                de análise, não corre a mora espontânea.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-91"
            numero="Artigo 91"
            titulo="Juros de Mora pela Taxa SELIC"
          >
            <LegalText>
              <p>
                O crédito tributário do ICMS, inclusive o decorrente de multa, quando não
                pago na data do vencimento, será acrescido de juros de mora equivalentes
                à <strong>taxa SELIC</strong> acumulada mensalmente, ou a qualquer outra
                taxa que vier a substituí-la.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Os juros moratórios incidirão a partir do primeiro
                dia do mês subsequente ao do vencimento do débito.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O disposto neste artigo aplica-se, inclusive, na
                hipótese de pagamento parcelado.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> O crédito tributário fica acrescido dos juros
                deste artigo, exceto na parte relativa à mora do art. 90 (sem cumulação
                de acréscimos sobre a mesma base).
              </p>
              <p className="mt-2">
                <strong>§ 4º</strong> O crédito tributário terá seu valor atualizado
                monetariamente nos casos previstos na legislação, exceto quando garantido
                por depósito.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O uso da SELIC como taxa de juros moratórios é a prática dominante entre
                os estados. Ao replicar essa taxa, o Ceará garante que o custo financeiro
                do atraso no pagamento do ICMS seja equivalente ao custo de carregamento
                de dívida no mercado, desestimulando o uso do imposto como fonte de
                capital de giro à custa do erário.
              </p>
              <p className="mt-3">
                O § 3º resolve um potencial conflito: a mora do art. 90 e os juros do
                art. 91 não se somam sobre a mesma parcela. Sobre o valor do imposto
                atrasado incide a mora (até 15%); sobre o saldo do débito incide a SELIC
                a partir do 1º dia do mês seguinte ao vencimento. Não há dupla incidência
                de acréscimos financeiros sobre o mesmo valor.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-92"
            numero="Artigo 92"
            titulo="Acréscimos Moratórios nas Operações com Registro no SITRAM"
          >
            <LegalText>
              <p>
                Para fins de cálculo dos acréscimos moratórios do ICMS relativo às
                operações de entrada de mercadorias neste Estado, quando exista pedido de
                registro ou de alteração de registro de documento fiscal no SITRAM, deve
                ser considerado o prazo estabelecido no art. 88.
              </p>
              <p className="mt-2">
                <strong>Parágrafo único.</strong> O cálculo dos acréscimos moratórios
                nas situações de alteração de registro de documento fiscal no SITRAM
                deverá observar:
              </p>
              <p className="mt-2">
                <strong>I</strong> caso formalizado no prazo: (a) deferido o pedido, não
                há acréscimos moratórios; (b) indeferido, os acréscimos retroagem à data
                do vencimento;
              </p>
              <p className="mt-2">
                <strong>II</strong> caso formalizado fora do prazo: (a) deferido, o
                acréscimo incide da data do vencimento até a data do pedido; (b)
                indeferido, os acréscimos retroagem integralmente à data do vencimento.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O SITRAM gera situações em que o ICMS pode ser exigido em momento diferente
                da entrada da mercadoria. O art. 92 regula como a mora incide nesses
                casos, criando uma matriz de quatro cenários: tempestivo e deferido (sem
                mora), tempestivo e indeferido (mora total desde o vencimento), tardio e
                deferido (mora parcial, até a data do pedido), tardio e indeferido (mora
                total desde o vencimento).
              </p>
              <p className="mt-3">
                A lógica é que o contribuinte que fez o pedido de regularização dentro
                do prazo de boa-fé não deve ser penalizado com mora enquanto aguarda a
                resposta do fisco. Se o pedido foi tardio ou negado, a mora corre
                normalmente desde o vencimento original do imposto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-93"
            numero="Artigo 93"
            titulo="Auto de Infração sem Data Identificável do Fato Gerador"
          >
            <LegalText>
              <p>
                Quando o auto de infração referir-se a falta de recolhimento do imposto
                nos casos em que não se torne possível identificar, no período
                fiscalizado, a data da ocorrência, a taxa de juros será a correspondente
                à do:
              </p>
              <p className="mt-2">
                <strong>I</strong> mês médio, quando o período for ímpar;
              </p>
              <p className="mt-2">
                <strong>II</strong> primeiro mês da segunda metade, quando o período
                for par.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Quando uma fiscalização apura operações de vários meses sem documentação
                cronológica suficiente para identificar o mês exato do fato gerador, o
                art. 93 cria uma regra de aproximação objetiva: usa-se o mês médio do
                período para calcular os juros.
              </p>
              <p className="mt-3">
                Para um período fiscalizado de 12 meses, o mês médio seria o 6º e o
                "primeiro mês da segunda metade" seria o 7º. Na prática, essa regra
                impede que a autoridade fiscal escolha arbitrariamente o mês de maior
                taxa SELIC para maximizar os juros devidos, ao mesmo tempo em que evita
                que o contribuinte argumente que a infração ocorreu no último mês do
                período (quando os juros seriam menores).
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-x-iii"
            titulo="Seção III — Do Parcelamento"
            subtitulo="Subseção I: Parcelamento de Débitos não Inscritos em Dívida Ativa"
          />

          <Artigo
            id="art-94"
            numero="Artigo 94"
            titulo="Parcelamento de Débitos não Inscritos em Dívida Ativa"
          >
            <LegalText>
              <p>
                O crédito tributário não inscrito em dívida ativa poderá ser pago
                mediante parcelamento, em prestações mensais e sucessivas, a requerimento
                do interessado.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O crédito tributário consolidado abrange: (I)
                valores originais do imposto e da multa; (II) juros de mora; (III)
                atualização monetária, quando couber.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> Os acréscimos legais serão calculados até o dia
                da concessão do parcelamento.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> É vedado o parcelamento nos casos de: (IV) auto
                de infração em que figure como autuado pessoa não inscrita no CGF; (V)
                auto de infração lavrado por infração cometida no trânsito de mercadorias
                — exceto se o autuado estiver inscrito no CGF e houver assumido a
                condição de fiel depositário da mercadoria.
              </p>
              <p className="mt-2">
                <strong>§ 4º</strong> O parcelamento espontâneo pode ser concedido até
                4 vezes no mesmo exercício, exceto quando houver quitação integral de
                parcelamento anterior no mesmo exercício (que autoriza novo pedido).
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 94 institui o parcelamento administrativo do ICMS como instrumento
                de regularização fiscal. A consolidação do crédito na data da concessão
                (§ 2º) é uma vantagem para o contribuinte: a partir do deferimento, o
                saldo não cresce por novos acréscimos legais, exceto pelos juros que
                incidirão sobre cada parcela conforme o art. 97.
              </p>
              <p className="mt-3">
                As vedações do § 3º (com redação após o Decreto 35.314/2023, que revogou
                os incisos I, II e III) refletem situações em que a adesão ao parcelamento
                poderia ser contraditória: o autuado não inscrito no CGF (inciso IV) não
                tem vínculo regular com o fisco, e a autuação em trânsito (inciso V)
                geralmente envolve flagrante de infração grave, contexto em que o
                parcelamento imediato poderia incentivar futuras irregularidades.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-95"
            numero="Artigo 95"
            titulo="Requerimento de Parcelamento via Internet"
          >
            <LegalText>
              <p>
                O parcelamento deverá ser requerido pelo sujeito passivo por meio da
                Internet, no sítio eletrônico da SEFAZ, via Acesso Seguro, devendo o
                requerimento conter:
              </p>
              <p className="mt-2">
                <strong>I</strong> a identificação do sujeito passivo e os dados do
                representante da pessoa jurídica ou procurador legalmente constituído;
              </p>
              <p className="mt-2">
                <strong>II</strong> a confissão irretratável do débito, que implicará:
                (a) renúncia prévia ou desistência tácita de impugnação ou recurso
                administrativo e judicial quanto ao valor confessado; (b) interrupção do
                prazo prescricional; (c) satisfação das condições para inscrição do
                débito em Dívida Ativa;
              </p>
              <p className="mt-2">
                <strong>III</strong> relação discriminada dos valores componentes do
                crédito tributário.
              </p>
              <p className="mt-2">
                <strong>§ 4º</strong> Fica facultado ao sujeito passivo requerer o
                parcelamento por processo físico, a ser protocolizado em qualquer unidade
                de atendimento da SEFAZ.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A confissão irretratável do débito (inciso II) é o elemento central do
                requerimento de parcelamento. Ao assinar o pedido, o contribuinte renuncia
                a qualquer contestação administrativa ou judicial sobre o valor confessado,
                interrompe a prescrição (o prazo recomeça a correr do zero) e cria as
                condições jurídicas para inscrição do débito em DA caso o parcelamento
                seja descumprido.
              </p>
              <p className="mt-3">
                Isso significa que o parcelamento não é uma medida neutra: o contribuinte
                que parcela débito contestável renuncia ao direito de questionar sua
                legalidade. Antes de aderir ao parcelamento, convém avaliar a procedência
                do débito, pois a confissão tem efeito vinculante nas esferas
                administrativa e judicial.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-96"
            numero="Artigo 96"
            titulo="Deferimento Automático do Parcelamento (até 60 Parcelas)"
          >
            <LegalText>
              <p>
                O parcelamento será deferido automaticamente, desde que atendidas todas
                as exigências previstas na legislação, podendo ser concedido em até{" "}
                <strong>60 parcelas</strong>, conforme solicitado pelo sujeito passivo
                (redação do Decreto 35.314/2023).
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O valor de cada parcela não poderá ser inferior a{" "}
                <strong>92 UFIRCEs</strong>.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> Condicionado ao recolhimento de entrada mínima na
                data da concessão:
              </p>
              <p className="mt-2">
                <strong>I</strong> 8% do total do débito quando o número de parcelas for
                superior a 30 e até 45;
              </p>
              <p className="mt-2">
                <strong>II</strong> 10% do total do débito quando o número de parcelas
                for superior a 45.
              </p>
              <p className="mt-2">
                <strong>§ 5º</strong> O não inscrito no CGF terá no máximo 12 parcelas
                quando o parcelamento referir-se ao DIFAL de operações a consumidor final
                não contribuinte (acrescentado pelo Decreto 37.145/2026).
              </p>
            </LegalText>
            <Comentario>
              <p>
                O deferimento automático, condicionado ao cumprimento das exigências
                legais, dispensa a análise discricionária de cada pedido, tornando o
                processo ágil e previsível. O contribuinte que preenche os requisitos sabe
                que o parcelamento será concedido sem risco de indeferimento por outros
                critérios.
              </p>
              <p className="mt-3">
                As entradas mínimas escalonadas (8% ou 10%) foram introduzidas para
                parcelamentos longos, garantindo comprometimento financeiro inicial do
                contribuinte. A parcela mínima de 92 UFIRCEs evita parcelamentos com
                valores irrisórios por parcela, que gerariam custo administrativo superior
                ao benefício arrecadatório.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-96a"
            numero="Artigo 96-A"
            titulo="Parcelamento de ICMS-ST sobre Estoque em Novos CNAEs"
          >
            <LegalText>
              <p>
                Os contribuintes que venham a ser enquadrados em CNAEs elencadas em
                decretos que disponham sobre substituição tributária com carga líquida do
                ICMS (Lei 14.237/2008), e que devam apurar e recolher o ICMS-ST relativo
                ao estoque de mercadorias existente no estabelecimento, poderão parcelar
                esse débito em até <strong>2 parcelas mensais</strong>, iguais e
                sucessivas.
              </p>
              <p className="mt-2">
                A 1ª parcela deverá ser recolhida até o último dia útil do 1º mês
                subsequente àquele em que o contribuinte foi obrigado a efetuar o
                levantamento do estoque; as demais até o último dia útil dos meses
                seguintes. (Acrescentado pelo Decreto 33.862/2020.)
              </p>
            </LegalText>
            <Comentario>
              <p>
                Quando um segmento econômico passa a ser abrangido por regime de
                substituição tributária com carga líquida, os contribuintes já
                estabelecidos precisam apurar e recolher o ICMS-ST sobre o estoque
                existente de uma só vez. Isso pode representar impacto financeiro
                significativo, pois o recolhimento incide sobre mercadorias adquiridas
                sob regime anterior.
              </p>
              <p className="mt-3">
                O art. 96-A alivia esse impacto permitindo dividir o débito de estoque em
                até 2 parcelas. Embora o prazo seja curto em comparação ao parcelamento
                geral (art. 96, até 60 meses), é uma facilidade importante para a
                transição, evitando que a mudança de regime cause desequilíbrio imediato
                de caixa nos contribuintes enquadrados.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-97"
            numero="Artigo 97"
            titulo="Cálculo do Valor de Cada Parcela"
          >
            <LegalText>
              <p>
                O valor principal de cada parcela será obtido mediante a divisão do valor
                do débito consolidado no dia da concessão do benefício pelo número de
                parcelas.
              </p>
              <p className="mt-2">
                Parágrafo único. As parcelas serão pagas mensalmente a partir do mês
                subsequente ao da concessão, com vencimento no mesmo dia do mês em que
                foi concedido o parcelamento; cada parcela, por ocasião do pagamento,
                será acrescida de juros de mora calculados na forma do art. 90.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O valor de cada parcela é fixo: débito consolidado dividido pelo número de
                parcelas. Sobre esse valor fixo incidem juros mensalmente, de modo que as
                parcelas mais distantes carregam mais juros acumulados. O contribuinte que
                quitar antecipadamente economiza nos juros futuros.
              </p>
              <p className="mt-3">
                O vencimento coincidente com o dia da concessão do parcelamento pode
                gerar situações em que a parcela vence em fim de semana ou feriado:
                aplica-se, nesses casos, a regra do art. 86, com prorrogação para o
                primeiro dia útil subsequente (ou dia útil anterior, se o vencimento
                for o último dia do mês).
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-98"
            numero="Artigo 98"
            titulo="Perda do Parcelamento por Atraso Superior a 60 Dias"
          >
            <LegalText>
              <p>
                O beneficiário que atrasar o pagamento de qualquer parcela do débito por
                período superior a <strong>60 dias</strong> perderá o direito ao
                parcelamento, devendo o restante do débito ser encaminhado para inscrição
                na Dívida Ativa Estadual.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A tolerância de 60 dias antes da rescisão do parcelamento é um prazo
                relativamente generoso, que permite ao contribuinte regularizar uma
                parcela em atraso sem perder o benefício. Na prática, o contribuinte que
                perceber o atraso dentro de 60 dias ainda pode quitar a parcela vencida e
                manter o parcelamento vigente.
              </p>
              <p className="mt-3">
                A consequência da rescisão é a inscrição automática do saldo remanescente
                em Dívida Ativa, o que gera o acréscimo dos honorários da PGE e abre
                caminho para o ajuizamento de execução fiscal. O contribuinte perde também
                a espontaneidade, passando a sujeitar-se às sanções mais gravosas do
                regime de cobrança judicial.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-99"
            numero="Artigo 99"
            titulo="Parcelamento em Fase de Cobrança Judicial"
          >
            <LegalText>
              <p>
                O parcelamento de débitos fiscais em fase de cobrança judicial suspenderá
                a execução fiscal.
              </p>
              <p className="mt-2">
                Parágrafo único. A perda do parcelamento concedido nos termos deste
                artigo, em decorrência da infração do art. 98, importará no imediato
                prosseguimento do processo de execução.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O parcelamento de débitos já em fase de execução judicial tem um efeito
                suspensivo importante: paralisa os atos executivos (penhora, leilão,
                remoção de bens) enquanto o contribuinte cumpre as parcelas. Isso é
                relevante para empresas que enfrentam execuções fiscais e precisam de
                tempo para reorganizar seu fluxo de caixa sem risco imediato de
                constrição patrimonial.
              </p>
              <p className="mt-3">
                A retomada imediata da execução em caso de descumprimento (parágrafo
                único) reforça o caráter condicional da suspensão: o Estado concede o
                prazo, mas não abre mão do processo executivo. A suspensão é instrumental
                ao parcelamento, e não uma renúncia ao direito de cobrar.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-100"
            numero="Artigo 100"
            titulo="(Revogado)"
          >
            <LegalText>
              <p>
                <strong>Revogado</strong> pelo Decreto nº 33.557/2020 (DOE de
                28.04.2020), com efeitos a partir de 28.04.2020.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 100 foi revogado pelo Decreto 33.557/2020, que também alterou
                diversas outras disposições do RICMS relacionadas ao parcelamento. As
                matérias que eventualmente eram tratadas neste artigo foram absorvidas
                pelas disposições remanescentes ou por normas específicas editadas após a
                revogação.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-sub-ii"
            titulo="Subseção II — Parcelamento de Débitos Inscritos em Dívida Ativa do Estado"
          />

          <Artigo
            id="art-101"
            numero="Artigo 101"
            titulo="Parcelamento de Débitos Inscritos em Dívida Ativa"
          >
            <LegalText>
              <p>
                O parcelamento de débitos inscritos em dívida ativa reger-se-á por
                decreto regulamentar do art. 25 da Lei Complementar nº 58, de 31 de
                março de 2006.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A distinção entre débitos não inscritos (arts. 94-100) e inscritos em
                dívida ativa (art. 101) é fundamental: após a inscrição em DA, o crédito
                tributário passa para a esfera da PGE, que detém a competência para
                negociar e conceder o parcelamento por meio de normativa própria
                (decreto regulamentador da LC 58/2006).
              </p>
              <p className="mt-3">
                Na prática, o contribuinte que tem débito inscrito em DA não negocia
                diretamente com a SEFAZ, mas com a Procuradoria Geral do Estado,
                sujeito a condições distintas — geralmente com honorários de sucumbência
                embutidos no valor a parcelar. A remissão à LC 58/2006 garante que as
                regras de parcelamento de DA possam ser atualizadas sem necessidade de
                alterar o RICMS.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="cap-xi"
            titulo="Capítulo XI — Da Restituição"
          />

          <Secao
            id="sec-xi-i"
            titulo="Seção I — Das Disposições Gerais"
          />

          <Artigo
            id="art-102"
            numero="Artigo 102"
            titulo="Restituição de Pagamento Indevido de ICMS"
          >
            <LegalText>
              <p>
                O crédito tributário pago indevidamente será restituído, no todo ou em
                parte, a requerimento do sujeito passivo.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> O requerimento deverá conter: (I) identificação
                do interessado e dados da conta bancária para crédito do valor a ser
                restituído; (II) esclarecimentos circunstanciados sobre a restituição
                pleiteada; (III) identificação da NF-e ou CT-e e do respectivo DAE ou
                GNRE; (IV) indicação dos dispositivos legais em que se fundamenta o
                pedido.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> O requerimento será encaminhado para manifestação:
                (I) do CONAT, quando oriundo de auto de infração (exceto pagamento em
                duplicidade); (II) da COART, para DAE ou GNRE rejeitados ou pagos em
                duplicidade; (III) da COTRI, nos demais casos.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> Quando a operação tiver sido destinada a outra UF
                sem registro no SITRAM, poderá ser exigido: (I) do destinatário
                contribuinte: documentos comprobatórios de que registrou a entrada e
                estornou ou não utilizou o crédito fiscal; (II) de destinatário não
                contribuinte: declaração confirmando a respectiva entrada.
              </p>
              <p className="mt-2">
                <strong>§ 4º</strong> A critério da SEFAZ, quando o contribuinte apurar
                o ICMS na sistemática normal de compensação, a restituição poderá ser
                efetuada sob a forma de crédito fiscal.
              </p>
              <p className="mt-2">
                <strong>§ 5º</strong> Na hipótese do inciso II do § 2º, a CEGES emitirá
                informação fiscal a ser homologada pelo Coordenador da COART (valor
                até 5.000 UFIRCEs) ou pelo Secretário da Fazenda (demais casos).
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 102 estrutura o procedimento administrativo de restituição do
                ICMS pago indevidamente. A triagem entre CONAT, COART e COTRI (§ 2º)
                é importante para o contribuinte saber a qual órgão dirigir o pedido:
                autuações vão ao CONAT; erros de pagamento (duplicidade, DAE rejeitado)
                vão à COART; e situações gerais (operação imune ou não tributada recolhida
                por engano, crédito de exportação não aproveitado etc.) vão à COTRI.
              </p>
              <p className="mt-3">
                A exigência de identificação do DAE ou GNRE (§ 1º, III) é condição
                essencial do pedido: sem o comprovante do pagamento que se quer restituir,
                o processo não pode prosseguir. A possibilidade de restituição sob a forma
                de crédito fiscal (§ 4º) é vantajosa para contribuintes com fluxo regular
                de apuração de ICMS, pois evita o demorado processo de restituição em
                espécie e permite o uso imediato do crédito na escrituração fiscal.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-103"
            numero="Artigo 103"
            titulo="Restituição a Quem Assumiu o Encargo do Imposto"
          >
            <LegalText>
              <p>
                A restituição somente será feita a quem prove haver assumido o referido
                encargo, ou, no caso de tê-lo transferido a terceiro, esteja por este
                expressamente autorizado a recebê-lo.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 103 é uma decorrência da estrutura indireta do ICMS: o tributo é
                embutido no preço da mercadoria e suportado economicamente pelo adquirente
                (consumidor final ou contribuinte seguinte na cadeia). Se o revendedor
                transferiu o encargo econômico ao seu cliente, não pode reter a restituição
                para si — seria um enriquecimento sem causa às custas do fisco.
              </p>
              <p className="mt-3">
                Na prática, quem costuma ter direito à restituição sem maiores dificuldades
                é o contribuinte que pagou ICMS em excesso em operação própria e absorveu
                o custo (por exemplo, recolhimento com alíquota errada). Quando há
                repercussão do tributo, como no ICMS-ST recolhido pelo substituto e
                embutido no preço cobrado do substituído, a legitimidade para pedir a
                restituição pode recair no substituído, não no substituto.
              </p>
            </Comentario>
          </Artigo>

          <Artigo
            id="art-104"
            numero="Artigo 104"
            titulo="Restituição Proporcional dos Acréscimos Moratórios e Penalidades"
          >
            <LegalText>
              <p>
                A restituição total ou parcial do ICMS dá lugar à restituição, na mesma
                proporção, dos acréscimos moratórios e da penalidade pecuniária, salvo se
                referentes a infração de caráter formal não prejudicada pela causa da
                restituição.
              </p>
              <p className="mt-2">
                Parágrafo único. A importância a ser restituída será atualizada
                monetariamente, observados os mesmos critérios aplicáveis à cobrança de
                crédito tributário.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Se o contribuinte pagou ICMS indevidamente e também recolheu multa e
                juros sobre esse mesmo débito, a restituição abrange todos esses
                componentes na mesma proporção. A exceção são as penalidades por
                infrações formais autônomas: se o contribuinte emitiu documento fiscal
                fora do prazo (infração formal) e, por isso, pagou multa, essa multa
                não é restituída só porque o tributo subjacente acabou sendo indevido
                — a infração formal existiu independentemente da questão tributária.
              </p>
              <p className="mt-3">
                A atualização monetária do parágrafo único garante simetria: o mesmo
                índice que corrige os débitos do contribuinte para com o Estado também
                corrige os créditos do contribuinte para com o Estado. Sem essa regra,
                o contribuinte sofreria duplo prejuízo — pagou indevidamente e ainda
                perdeu poder aquisitivo durante o tempo de tramitação do pedido.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-xi-ii"
            titulo="Seção II — Da Restituição Autorizada pelo Secretário da Fazenda"
          />

          <Artigo
            id="art-105"
            numero="Artigo 105"
            titulo="Restituição de Valor Igual ou Superior a 5.000 UFIRCEs"
          >
            <LegalText>
              <p>
                O pedido de restituição de crédito tributário com valor igual ou superior
                a <strong>5.000 UFIRCEs</strong> deverá ser autorizado pelo Secretário
                da Fazenda, observado o disposto nos arts. 102 a 104.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Formulado o pedido, e não tendo o Secretário da
                Fazenda deliberado a respeito no prazo de <strong>90 dias</strong>, o
                contribuinte poderá compensar o valor pago indevidamente no período de
                apuração seguinte.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> Na hipótese do § 1º, sobrevindo decisão contrária
                e irrecorrível, o contribuinte, no prazo de 15 dias da notificação,
                procederá ao estorno do crédito lançado, devidamente atualizado, com o
                pagamento de multa e juros cabíveis.
              </p>
            </LegalText>
            <Comentario>
              <p>
                A exigência de autorização do Secretário da Fazenda para restituições de
                maior valor é um controle interno que visa evitar restituições indevidas
                de grande monta. Para o contribuinte, o prazo de 90 dias é uma proteção
                relevante: o silêncio administrativo autoriza a compensação unilateral,
                impedindo que a burocracia interna do Estado cause prejuízo indefinido ao
                credor.
              </p>
              <p className="mt-3">
                O risco da compensação após o prazo de 90 dias (§ 1º) é real: se o
                Secretário depois negar o pedido, o contribuinte terá que estornar o
                crédito com multa e juros (§ 2º). Por isso, antes de compensar com base
                no silêncio administrativo, convém avaliar a solidez do direito à
                restituição — créditos contestáveis não recomendam essa estratégia.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-xi-iii"
            titulo="Seção III — Da Restituição mediante Crédito em Conta Gráfica"
          />

          <Artigo
            id="art-106"
            numero="Artigo 106"
            titulo="Restituição de Valor Inferior a 5.000 UFIRCEs via Lançamento na EFD"
          >
            <LegalText>
              <p>
                Caso o pedido de restituição seja de importância{" "}
                <strong>inferior a 5.000 UFIRCEs</strong>, o sujeito passivo poderá
                lançar o valor a título de crédito no registro de apuração do ICMS na
                EFD, independentemente de prévia manifestação da SEFAZ, devendo:
              </p>
              <p className="mt-2">
                <strong>I</strong> comunicar a ocorrência ao órgão fiscal de sua
                circunscrição, que analisará e, se for o caso, homologará os
                procedimentos adotados;
              </p>
              <p className="mt-2">
                <strong>II</strong> atender ao disposto nos incisos II, III e IV do
                § 1º do art. 102.
              </p>
              <p className="mt-2">
                <strong>§ 1º</strong> Sobrevindo decisão contrária à homologação, o
                contribuinte, no prazo de 15 dias da notificação, procederá ao estorno
                do crédito lançado, com multa e juros cabíveis.
              </p>
              <p className="mt-2">
                <strong>§ 2º</strong> Em caso de discordância entre o valor homologado
                e o requerido: (I) se o homologado for superior ao requerido, o
                contribuinte poderá creditar-se da diferença; (II) se o homologado for
                inferior, deverá estornar a diferença com acréscimos moratórios.
              </p>
              <p className="mt-2">
                <strong>§ 3º</strong> O disposto no caput não se aplica quando envolver
                situação decorrente de auto de infração.
              </p>
              <p className="mt-2">
                <strong>§ 4º</strong> O Secretário da Fazenda poderá delegar para outras
                autoridades da Administração Tributária a homologação dos pedidos de
                restituição do caput, nos casos em que o sujeito passivo tenha solicitado
                diretamente à SEFAZ a repetição de indébito. (Acrescentado pelo Decreto
                33.986/2021.)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 106 cria um rito simplificado para restituições de menor valor:
                o contribuinte não precisa aguardar autorização prévia da SEFAZ para
                lançar o crédito na EFD. Basta comunicar ao órgão fiscal e documentar
                o pedido (incisos I e II). Isso é extremamente prático para corrigir
                erros de recolhimento de pequena monta sem aguardar meses pela resposta
                administrativa.
              </p>
              <p className="mt-3">
                O risco — análogo ao do art. 105, § 1º — é que, se a SEFAZ não
                homologar, o contribuinte precisará estornar com multa e juros. A regra
                do § 2º sobre discordância de valores é bastante favorável ao
                contribuinte: se a SEFAZ homologar valor maior que o requerido, o
                contribuinte pode aproveitar o excesso; se homologar valor menor, estorna
                apenas a diferença. A exclusão de autos de infração (§ 3º) evita que o
                rito simplificado seja usado para contornar lançamentos já formaliz
                ados pela fiscalização.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="sec-xi-iv"
            titulo="Seção IV — Da Restituição Mediante Inclusão do Crédito no SITRAM"
          />

          <Artigo
            id="art-107"
            numero="Artigo 107"
            titulo="Restituição via Crédito Inserido no SITRAM"
          >
            <LegalText>
              <p>
                A restituição do imposto indevidamente recolhido, decorrente de
                homologação pelo fisco de pedido de registro ou de alteração de registro
                de documento fiscal no SITRAM, em valor inferior a{" "}
                <strong>5.000 UFIRCEs</strong>, será feita por meio de crédito inserido
                no próprio SITRAM, para quitação — ainda que parcial — de futuros débitos
                do ICMS do mesmo contribuinte e com mesmo código de receita, decorrentes
                de operações ou prestações interestaduais.
              </p>
              <p className="mt-2">
                Parágrafo único. Os créditos de restituições de valores indevidamente
                destinados ao FECOP só poderão ser utilizados para quitação de débitos
                da mesma espécie.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 107 trata de uma modalidade específica de restituição: aquela que
                decorre do deferimento pelo fisco de pedido de registro ou alteração de
                registro no SITRAM, ou seja, situações em que o contribuinte recolheu
                ICMS e depois obteve a homologação de que a operação não era devida
                (ou era devida em valor menor).
              </p>
              <p className="mt-3">
                Em vez de devolver o valor em espécie ou via crédito na EFD, o fisco
                insere o crédito diretamente no SITRAM, que funciona como um saldo
                disponível para abater futuros débitos de ICMS interestaduais do mesmo
                contribuinte e mesmo código de receita. Isso agiliza a compensação e
                evita o trâmite de processo de restituição separado. A vedação do
                parágrafo único é coerente com a lógica do FECOP: créditos de FECOP
                restituídos só quitam débitos de FECOP, preservando a segregação de
                destinação constitucional do fundo.
              </p>
            </Comentario>
          </Artigo>

          <Secao
            id="cap-xii"
            titulo="Capítulo XII — Das Disposições Finais"
          />

          <Artigo
            id="art-108"
            numero="Artigo 108"
            titulo="Revogação de Disposições Anteriores"
          >
            <LegalText>
              <p>
                Revogam-se as seguintes disposições:
              </p>
              <p className="mt-2">
                <strong>I</strong> Título I do Livro Primeiro e arts. 491 a 494, 570 a
                574, 595 a 603, 605 a 618, 626 a 637 do Decreto nº 24.569, de 31 de
                julho de 1997 (RICMS anterior);
              </p>
              <p className="mt-2">
                <strong>II a XIII</strong> Decretos nº 27.140/2003, 27.865/2005,
                28.352/2006, 29.086/2007, 29.199/2008, 29.248/2008, 29.767/2009,
                30.422/2011, 31.362/2013, 31.449/2014, 31.894/2016 e 32.010/2016.
              </p>
              <p className="mt-2">
                Parágrafo único. Os dispositivos deste Decreto passam a substituir e a
                complementar as remissões aos artigos dos decretos ora revogados.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 108 consolida as revogações expressas que o Decreto 33.327/2019
                promoveu ao entrar em vigor. O principal ato revogado é o Decreto
                24.569/1997, que era o RICMS anterior do Ceará, vigente por mais de
                duas décadas. A revogação parcial (Título I e artigos específicos)
                indica que algumas disposições do decreto de 1997 permaneceram em vigor
                para matérias não abrangidas pelo novo RICMS.
              </p>
              <p className="mt-3">
                O parágrafo único tem relevância prática para quem trabalha com normas
                que fazem remissão aos decretos revogados: as referências a artigos dos
                decretos extintos devem ser lidas como referências aos artigos
                correspondentes do Decreto 33.327/2019. Isso evita que a revogação
                crie lacunas em normas infralegais (portarias, instruções normativas,
                atos declaratórios) que ainda citavam os dispositivos anteriores.
              </p>
            </Comentario>
          </Artigo>

        </div>

      </div>
    </div>
  );
}
