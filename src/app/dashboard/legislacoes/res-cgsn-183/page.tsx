"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";

/* ─── índice ─── */

const tocEntries = [
  { id: "intro",        label: "Identificação e Ementa",                       level: 0 },
  { id: "art-1",        label: "Art. 1º — Alterações na Res. 140/2018",        level: 2 },
  { id: "sub-rb",       label: "Art. 2º — Receita Bruta e §10",                level: 1 },
  { id: "sub-princ",    label: "Art. 2º-A — Princípios do Simples Nacional",   level: 1 },
  { id: "sub-adm",      label: "Art. 2º-B — Administração Tributária Integrada", level: 1 },
  { id: "sub-opcao",    label: "Art. 6º — Opção pelo Simples (Redesim)",       level: 1 },
  { id: "sub-ciencia",  label: "Art. 14 — Ciência do Termo de Exclusão",       level: 1 },
  { id: "sub-ved",      label: "Art. 15 — Vedações ao Simples Nacional",       level: 1 },
  { id: "sub-pgdas",    label: "Art. 38 — PGDAS-D: Natureza Declaratória",    level: 1 },
  { id: "sub-efd",      label: "Art. 65 — Escrituração Fiscal Digital",        level: 1 },
  { id: "sub-compart",  label: "Art. 70 — Compartilhamento de Documentos",    level: 1 },
  { id: "sub-defis",    label: "Art. 72 — Defis: Compartilhamento e Guarda",  level: 1 },
  { id: "sub-excl81",   label: "Art. 81 — Hipóteses de Exclusão",              level: 1 },
  { id: "sub-reg84",    label: "Art. 84 — Regularização e Exclusão Retroativa", level: 1 },
  { id: "sub-lancof",   label: "Art. 87 — Vedação ao Lançamento de Ofício",   level: 1 },
  { id: "sub-97a",      label: "Art. 97-A (NOVO) — Multas pela Defis",         level: 1 },
  { id: "sub-98",       label: "Art. 98 — Multas pelo PGDAS-D",               level: 1 },
  { id: "sub-100",      label: "Art. 100 — MEI: Múltiplas Atividades",         level: 1 },
  { id: "sub-109",      label: "Art. 109 — DASN-Simei: Prazo e Natureza",     level: 1 },
  { id: "art-2",        label: "Art. 2º — Obrigações Acessórias (Art. 40-A)", level: 2 },
  { id: "art-3",        label: "Art. 3º — Multas PGDAS-D (vigência 2026)",    level: 2 },
  { id: "art-4",        label: "Art. 4º — Seção I: Definições e Princípios",  level: 2 },
  { id: "art-5",        label: "Art. 5º — Seção II: DASN-Simei",              level: 2 },
  { id: "art-6",        label: "Art. 6º — Revogações",                         level: 2 },
  { id: "art-7",        label: "Art. 7º — Vigência e Efeitos",                level: 2 },
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

export default function ResCgsn183Page() {
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
      <div className="rounded-xl px-8 py-10 mb-10" style={{ background: "linear-gradient(135deg, #0a1628 0%, #1a3a2a 60%, #2e6a44 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#7ec8a0] mb-3">Estudos de Legislação Tributária</p>
        <h1 className="text-4xl font-black text-white leading-tight">Resolução CGSN nº 183/2025</h1>
        <h2 className="mt-2 text-base font-normal text-[#a8d8b8] border-l-4 border-[#2e6a44] pl-4">
          Comentários à Resolução CGSN nº 183, de 26 de setembro de 2025 — Claudenir Vasconcelos Nojosa
        </h2>
        <hr className="my-6 border-[#2e6a44]" />
        <div className="flex flex-wrap gap-8 text-sm">
          <div><p className="text-xs uppercase tracking-widest text-[#7ec8a0]">Publicação no DOU</p><p className="text-white font-medium">13 out. 2025 — Seção 1, p. 26</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7ec8a0]">Vigência</p><p className="text-white font-medium">Imediata (Art. 3º a partir de 01/01/2026)</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7ec8a0]">Artigos</p><p className="text-white font-medium">Arts. 1º ao 7º</p></div>
          <div><p className="text-xs uppercase tracking-widest text-[#7ec8a0]">Altera</p><p className="text-white font-medium">Resolução CGSN nº 140/2018</p></div>
        </div>
        <div className="mt-6 flex gap-3 flex-wrap">
          <Link
            href="/legislacoes/Resol. CGSN nº 183-2025.pdf"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm text-white transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </Link>
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

          {/* Identificação */}
          <div id="intro" className="scroll-mt-4 rounded-xl border border-border bg-card p-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Identificação</span>
            <h3 className="mt-1 text-lg font-semibold text-foreground mb-4">Resolução CGSN nº 183, de 26 de setembro de 2025</h3>
            <div className="text-sm text-foreground space-y-3 leading-relaxed">
              <p>
                <strong>Ementa:</strong> Altera a Resolução CGSN nº 140, de 22 de maio de 2018, que dispõe sobre o
                Regime Especial Unificado de Arrecadação de Tributos e Contribuições devidos pelas Microempresas e
                Empresas de Pequeno Porte — Simples Nacional.
              </p>
              <p>
                <strong>Fundamento legal:</strong> Lei Complementar nº 123/2006; Decreto nº 6.038/2007; Regimento
                Interno aprovado pela Resolução CGSN nº 176/2024; arts. 516 e 544, II, da{" "}
                <strong>LC 214/2025</strong> (Reforma Tributária); e art. 2º da <strong>LC 216/2025</strong>.
              </p>
              <p>
                <strong>Signatária:</strong> Adriana Gomes Rego — Vice-Presidente do Comitê Gestor do Simples Nacional.
              </p>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 px-5 py-4 text-sm text-foreground leading-relaxed">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">⚠️ Contexto Geral</p>
              <p>
                A Resolução CGSN nº 183/2025 é a primeira grande atualização da Resolução CGSN nº 140/2018 para
                adequá-la ao ambiente pós-Reforma Tributária. Ela incorpora à regulamentação do Simples Nacional
                os reflexos das Leis Complementares nº 214 e nº 216, de 2025, que tratam do IBS, CBS, IS e das
                adaptações ao sistema de Simples Nacional na transição. As alterações abrangem: novos princípios
                do regime, obrigações declaratórias, vedações ao ingresso, multas pela Defis (novo art. 97-A),
                compartilhamento de dados entre as administrações tributárias, e regras específicas para o MEI.
              </p>
            </div>
          </div>

          {/* Art. 1º */}
          <Secao id="art-1" titulo="Art. 1º — Alterações na Resolução CGSN nº 140/2018" subtitulo="Vigência imediata — múltiplos artigos alterados" />

          {/* sub-rb */}
          <Artigo id="sub-rb" numero="Art. 2º da Res. 140/2018 (alterado)" titulo="Definição de Receita Bruta e §10 — Cômputo Global">
            <LegalText>
              <p className="font-medium mb-2">Inciso II (NR):</p>
              <p>
                II — receita bruta (RB) o produto da venda de bens e serviços nas operações de conta própria,
                o preço dos serviços prestados, o resultado nas operações em conta alheia e as demais receitas da
                atividade ou objeto principal das microempresas ou das empresas de pequeno porte,{" "}
                <strong>excluídas as vendas canceladas e os descontos incondicionais concedidos</strong>.
                (LC nº 123/2006, art. 3º, caput e §1º)
              </p>
              <p className="mt-3 font-medium">§10 (NR):</p>
              <p className="mt-1">
                Para fins do disposto nesta Resolução, em relação às entidades de que trata o inciso I do caput
                e o art. 100, ainda que em inscrições cadastrais distintas ou na qualidade de contribuinte individual,
                devem ser considerados: (LC nº 123/2006, art. 3º, §19)
              </p>
              <p className="mt-2 ml-4">I — todas as atividades econômicas exercidas e as receitas brutas auferidas em um mesmo ano-calendário; e</p>
              <p className="ml-4">II — todos os débitos tributários exigíveis.</p>
            </LegalText>
            <Comentario>
              <p>
                A alteração do inciso II reconsolida a definição de receita bruta do Simples Nacional, mantendo-a
                alinhada com o art. 3º da LC 123/2006. A exclusão das vendas canceladas e descontos incondicionais
                já estava no texto anterior, mas a redação atual deixa mais clara a abrangência: incluem-se{" "}
                <em>todas as receitas</em> da atividade principal, não apenas as decorrentes de vendas de mercadorias.
              </p>
              <p className="mt-3">
                O §10 é a parte mais relevante desta alteração para o cotidiano do planejamento tributário.
                Ele determina que, para o empresário individual (MEI e EI) que também atua como contribuinte
                individual ou segurado especial, mesmo que com CPF/CNPJ distintos, o cômputo da receita bruta
                e dos débitos tributários deve ser feito de forma <strong>consolidada</strong>. Na prática,
                isso impede que um empresário individual abra múltiplos CNPJs para diluir receita e permanecer
                no Simples ou no MEI. O inciso II ("todos os débitos tributários exigíveis") também veda o
                ingresso ou a permanência no Simples de quem tem débito com qualquer ente tributante, mesmo
                que o débito seja de outra inscrição cadastral.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-princ */}
          <Artigo id="sub-princ" numero="Art. 2º-A da Res. 140/2018 (novo)" titulo="Princípios do Simples Nacional">
            <LegalText>
              <p>
                O Simples Nacional deve observar os princípios: (LC nº 123/2006, art. 12, §2º)
              </p>
              <p className="mt-2 ml-4">I — da simplicidade;</p>
              <p className="ml-4">II — da transparência;</p>
              <p className="ml-4">III — da justiça tributária;</p>
              <p className="ml-4">IV — da cooperação e integração das administrações tributárias da União, dos Estados, do Distrito Federal e dos Municípios; e</p>
              <p className="ml-4">V — da defesa do meio ambiente.</p>
            </LegalText>
            <Comentario>
              <p>
                A positivação expressa dos cinco princípios do Simples Nacional no corpo da Resolução CGSN
                nº 140/2018 tem valor interpretativo e programático. Antes da Reforma Tributária, a LC 123/2006
                não explicitava um elenco de princípios próprios do regime; a Res. 183/2025 os introduz formalmente,
                seguindo a inclusão do §2º ao art. 12 da LC 123/2006 promovida pela LC 214/2025.
              </p>
              <p className="mt-3">
                Para provas e concursos, vale destacar:
              </p>
              <ul className="mt-2 ml-4 space-y-1">
                <li><strong>Simplicidade</strong> — é a razão de existir do regime: unificar guias, simplificar cálculo e reduzir burocracia.</li>
                <li><strong>Transparência</strong> — os optantes devem ter clareza sobre os tributos efetivamente recolhidos dentro do DAS.</li>
                <li><strong>Justiça tributária</strong> — corolário da capacidade contributiva: ME e EPP recolhem menos porque faturam menos.</li>
                <li><strong>Cooperação e integração entre administrações</strong> — base do compartilhamento de dados entre RFB, SEFAZ e secretarias municipais.</li>
                <li><strong>Defesa do meio ambiente</strong> — reflexo da agenda ESG que permeia a Reforma Tributária; pode influenciar futuras vedações ou alíquotas diferenciadas.</li>
              </ul>
            </Comentario>
          </Artigo>

          {/* sub-adm */}
          <Artigo id="sub-adm" numero="Art. 2º-B da Res. 140/2018 (novo)" titulo="Administração Tributária Integrada do Simples Nacional">
            <LegalText>
              <p>
                A União, os Estados, o Distrito Federal e os Municípios exercerão a administração tributária
                do Simples Nacional de <strong>forma integrada</strong>, nos termos e limites estabelecidos
                pela Constituição Federal, pela Lei Complementar nº 123, de 2006 e por esta Resolução.
                (LC nº 123/2006, art. 12 §3º)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 2º-B é a contraface institucional do princípio IV (cooperação e integração). Ele deixa
                claro que, no Simples Nacional, a administração tributária não é privativa de nenhum ente:
                União (via RFB), Estados (via SEFAZ) e Municípios (via secretarias municipais de finanças)
                atuam de forma integrada. Na prática, isso já era a realidade operacional do regime — o DAS
                é arrecadado pela RFB e redistribuído —, mas sua inclusão expressa na Res. 140/2018 fortalece
                a base normativa para o compartilhamento de dados previsto nos arts. 70 e 72.
              </p>
              <p className="mt-3">
                No contexto da Reforma Tributária, este artigo é ainda mais relevante: com a criação do IBS
                (gerido pelo Comitê Gestor dos Estados e Municípios), a colaboração entre administrações
                tributárias de diferentes entes passa a ser uma exigência estrutural, não apenas uma faculdade.
                O art. 2º-B antecipa essa lógica dentro do Simples Nacional.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-opcao */}
          <Artigo id="sub-opcao" numero="Art. 6º, §5º da Res. 140/2018 (alterado)" titulo="Opção pelo Simples Nacional na Abertura de Empresa via Redesim">
            <LegalText>
              <p>
                No caso de opção pelo Simples Nacional feita por ME ou EPP na condição de{" "}
                <strong>empresa em início de atividade</strong>, a realização da solicitação será simultânea
                à inscrição no CNPJ por meio do sistema da administração tributária disponibilizado no{" "}
                <strong>Portal Redesim</strong>, observadas as seguintes regras:
              </p>
              <p className="mt-2 ml-4">
                IV — confirmada a regularidade da inscrição municipal e, quando exigível, da estadual, ou
                ultrapassado o prazo do inciso III sem manifestação, a opção será deferida;
              </p>
              <p className="ml-4">
                V — a opção produzirá efeitos a partir da data de inscrição no CNPJ; e
              </p>
              <p className="ml-4">
                VI — caso a opção seja indeferida por pendências impeditivas, o contribuinte poderá
                regularizá-las no prazo de até <strong>30 (trinta) dias</strong> contados da data
                de inscrição no CNPJ.
              </p>
            </LegalText>
            <Comentario>
              <p>
                Este dispositivo regulamenta o fluxo de opção pelo Simples Nacional para empresas em início
                de atividade pelo Redesim. Os incisos I a IV anteriores foram revogados pelo art. 6º desta
                Resolução; os incisos IV a VI que permanecem consolidam as regras de deferimento e regularização.
              </p>
              <p className="mt-3">
                O inciso V é fundamental para o planejamento das empresas nascentes: a opção pelo Simples
                retroage à data de inscrição no CNPJ, e não à data do efetivo deferimento. Isso protege
                o contribuinte de incidência de tributos pelo regime geral no período entre a abertura e
                o deferimento da opção.
              </p>
              <p className="mt-3">
                O prazo de 30 dias do inciso VI para regularização de pendências (após indeferimento) é uma
                importante janela de saneamento. Empresas que têm pendências cadastrais menores (inscrição
                estadual ou municipal) não são automaticamente excluídas — têm a chance de regularizar
                dentro do mês de abertura. Findo o prazo sem regularização, o indeferimento se consolida e
                a empresa deve aguardar o próximo período de opção (janeiro do ano seguinte) para aderir.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-ciencia */}
          <Artigo id="sub-ciencia" numero="Art. 14, parágrafo único da Res. 140/2018 (alterado)" titulo="Ciência do Termo de Indeferimento ou Exclusão">
            <LegalText>
              <p>
                Será dada ciência do termo a que se refere o caput à ME ou à EPP:
                (LC nº 123/2006, art. 16, §§1º-A e 6º; art. 29, §8º)
              </p>
              <p className="mt-2 ml-4">
                I — pelo ente federado que tenha indeferido o pedido de formalização da sua opção, segundo
                a sua legislação, da forma estabelecida pelo art. 122, caput e parágrafos; ou
              </p>
              <p className="ml-4">
                II — na hipótese do início de atividade de que trata o art. 6º, §5º,{" "}
                <strong>no momento da solicitação da opção</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 14 trata da comunicação formal dos atos de indeferimento ou exclusão ao optante.
                A alteração no parágrafo único harmoniza o dispositivo com o novo fluxo do Redesim.
                O inciso II passou a prever que, no caso de início de atividade, a ciência ocorre{" "}
                <em>no momento da solicitação da opção</em>, e não apenas quando o ente federado se manifesta.
              </p>
              <p className="mt-3">
                Do ponto de vista processual, a ciência é o marco que inicia o prazo para eventual recurso
                ou regularização. Para empresas em início de atividade, a antecipação da ciência ao momento
                da solicitação significa que o contador e o empresário precisam estar cientes das vedações
                e pendências <em>antes</em> de protocolar a abertura, pois a contagem do prazo de 30 dias
                (art. 6º, §5º, VI) começa da data do CNPJ, não do deferimento.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-ved */}
          <Artigo id="sub-ved" numero="Art. 15 da Res. 140/2018 (alterado)" titulo="Vedações ao Ingresso e Permanência no Simples Nacional">
            <LegalText>
              <p className="mb-2">Incisos alterados ou consolidados (texto atualizado):</p>
              <p className="ml-4">
                <strong>VI</strong> — cujo sócio ou titular de fato ou de direito seja administrador ou
                equiparado de outra pessoa jurídica com fins lucrativos, desde que a{" "}
                <strong>receita bruta global ultrapasse o limite</strong> do inciso I do caput;
              </p>
              <p className="mt-2 ml-4">
                <strong>XIII</strong> — que possua titular ou sócio domiciliado no exterior;
              </p>
              <p className="mt-2 ml-4">
                <strong>XXIII</strong> — que realize <strong>atividade de locação de imóveis próprios</strong>;
              </p>
              <p className="mt-2 ml-4">
                <strong>XXV</strong> — cujos titulares ou sócios guardem, cumulativamente, com o contratante
                do serviço, relação de <strong>pessoalidade, subordinação e habitualidade</strong>;
              </p>
              <p className="mt-2 ml-4">
                <strong>XXVI</strong> — constituída sob a forma de{" "}
                <strong>sociedade em conta de participação</strong>; e
              </p>
              <p className="mt-2 ml-4">
                <strong>XXVII</strong> — que tenha filial, sucursal, agência ou representação{" "}
                <strong>no exterior</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 15 consolida o rol de vedações ao Simples Nacional. A Res. 183/2025 explicita e
                renumera vários incisos para adequação à realidade pós-LC 214. Os pontos mais relevantes:
              </p>
              <p className="mt-3">
                <strong>Inciso VI (sócio administrador de outra PJ):</strong> A vedação só se aplica quando
                a <em>receita bruta global</em> (a do optante + a da outra PJ administrada pelo sócio)
                ultrapassa o limite do Simples. Se a empresa administrada não tiver fins lucrativos (ONG,
                associação), não há vedação.
              </p>
              <p className="mt-3">
                <strong>Inciso XXIII (locação de imóveis próprios):</strong> Atividade de locação de
                imóveis próprios é vedada ao Simples. Isso se aplica à empresa cuja atividade principal
                ou relevante seja a locação de imóveis de sua propriedade. A locação eventual ou de
                imóvel único não torna, por si só, a empresa vedada — o contexto é o de quem exerce a
                locação como negócio.
              </p>
              <p className="mt-3">
                <strong>Inciso XXV (relação de emprego disfarçada):</strong> Quando os titulares/sócios
                mantêm com o tomador de serviços relação de pessoalidade, subordinação e habitualidade
                de forma <em>cumulativa</em>, configura-se vínculo empregatício e a empresa é vedada ao
                Simples. Isso combate a "pejotização" ilegal, em que empresas são criadas apenas para
                revestir relações de emprego.
              </p>
              <p className="mt-3">
                <strong>Incisos XXVI e XXVII (novos):</strong> Sociedade em conta de participação
                (SCP) e empresa com estrutura no exterior passam a ser vedações expressas. As SCP,
                por sua natureza especial (sócio ostensivo e sócio participante), são incompatíveis
                com o sistema unificado de apuração do Simples. Já a vedação à presença no exterior
                (filial, sucursal, agência, representação) reflete os controles de conformidade
                tributária internacional que ganharam força com o BEPS e a agenda da OCDE.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-pgdas */}
          <Artigo id="sub-pgdas" numero="Art. 38, §2º da Res. 140/2018 (alterado)" titulo="PGDAS-D: Natureza Declaratória e Compartilhamento">
            <LegalText>
              <p className="mb-2">§2º, incisos I, II e III (NR):</p>
              <p className="ml-4">
                I — têm <strong>caráter declaratório</strong>, constituindo confissão de dívida e instrumento
                hábil e suficiente para a exigência dos tributos e contribuições que não tenham sido
                recolhidos resultantes das informações nele prestadas;
              </p>
              <p className="mt-2 ml-4">
                II — deverão ser fornecidas à RFB mensalmente até o <strong>vencimento do prazo para
                pagamento</strong> dos tributos devidos no âmbito do Simples Nacional em cada mês, previsto
                no art. 40, relativamente aos fatos geradores ocorridos no mês anterior; e
              </p>
              <p className="mt-2 ml-4">
                III — serão <strong>compartilhadas entre as administrações tributárias</strong> da União,
                dos Estados, do Distrito Federal e dos Municípios.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O PGDAS-D (Programa Gerador do Documento de Arrecadação do Simples Nacional — Declaratório)
                é o sistema pelo qual o optante apura mensalmente sua receita bruta e calcula o DAS. O §2º
                consolidado deixa claro três pontos críticos:
              </p>
              <p className="mt-3">
                <strong>Inciso I (natureza declaratória):</strong> A prestação de informações no PGDAS-D
                equivale a uma confissão de dívida. Se o contribuinte informa receita e não paga o DAS,
                a RFB pode inscrever em dívida ativa sem necessidade de lançamento de ofício — a própria
                declaração constitui o crédito. Este entendimento já constava do art. 18, §15-A, I da
                LC 123/2006 e agora está positivado na Resolução.
              </p>
              <p className="mt-3">
                <strong>Inciso II (prazo mensal):</strong> A prestação de informações no PGDAS-D deve
                ocorrer até o vencimento do DAS do mês (art. 40), que é o dia 20 do mês seguinte ao
                fato gerador. Não há prazo separado para declarar e pagar — são simultâneos.
              </p>
              <p className="mt-3">
                <strong>Inciso III (compartilhamento):</strong> Os dados do PGDAS-D são compartilhados
                com todos os entes federativos. Isso permite que SEFAZ estadual e secretaria municipal
                acompanhem a apuração do contribuinte e façam cruzamentos de dados, especialmente
                relevante para o ICMS e ISS que compõem o DAS.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-efd */}
          <Artigo id="sub-efd" numero="Art. 65 da Res. 140/2018 (alterado)" titulo="Escrituração Fiscal Digital para Optantes do Simples">
            <LegalText>
              <p>
                Os Estados, o Distrito Federal e os Municípios poderão exigir a escrituração fiscal digital
                ou obrigação equivalente para a ME ou EPP optante pelo Simples Nacional, desde que:
                (LC nº 123/2006, art. 26, §4º-A, II e §15)
              </p>
              <p className="mt-2 ml-4">
                II — [...] a) mediante <strong>programa gratuito</strong>, disponibilizado pela
                administração tributária estipulante, com <strong>link disponibilizado no Portal do
                Simples Nacional</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 65 estabelece uma condição essencial para que os Estados, DF e Municípios possam
                exigir EFD (Escrituração Fiscal Digital) ou obrigação equivalente de optantes do Simples:
                o sistema deve ser gratuito e acessível pelo Portal do Simples Nacional. Essa regra
                protege as micro e pequenas empresas do custo de múltiplos sistemas de escrituração
                exigidos por entes diferentes.
              </p>
              <p className="mt-3">
                Na prática, o alínea "a" atualizado restringe a liberdade dos Estados e Municípios de
                criar obrigações acessórias onerosas: só podem exigir EFD se disponibilizarem o software
                gratuitamente e centralizarem o acesso no Portal nacional. Isso uniformiza a experiência
                de conformidade do optante do Simples, evitando proliferação de sistemas proprietários.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-compart */}
          <Artigo id="sub-compart" numero="Art. 70 da Res. 140/2018 (alterado)" titulo="Compartilhamento de Documentos Fiscais">
            <LegalText>
              <p>
                Os dados dos documentos fiscais de qualquer espécie serão{" "}
                <strong>compartilhados entre as administrações tributárias</strong> da União, dos Estados, do
                Distrito Federal e dos Municípios e, quando emitidos por meio eletrônico, a ME ou a EPP
                optante pelo Simples Nacional fica <strong>desobrigada de transmitir seus dados</strong> às
                referidas administrações tributárias, ressalvado o disposto no art. 64, §1º, inciso II.
                (LC nº 123/2006, art. 25-A; e art. 26, §§11 e 15)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 70 consagra um princípio central da Reforma Tributária no âmbito do Simples:
                o compartilhamento automático de documentos fiscais eletrônicos entre as três esferas
                de governo. Na prática, NF-e, NFS-e, CT-e e outros documentos eletrônicos emitidos
                pelo optante do Simples já são captados centralmente e redistribuídos às SEFAZ
                estaduais e secretarias municipais — o optante não precisa transmitir os mesmos dados
                separadamente para cada ente.
              </p>
              <p className="mt-3">
                A ressalva ao art. 64, §1º, II refere-se a situações específicas em que a transmissão
                direta ainda é exigida (hipóteses de substituição tributária, por exemplo). Fora dessas
                exceções, a desobrigação de transmissão é regra geral, reduzindo o custo de conformidade
                para as ME/EPP.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-defis */}
          <Artigo id="sub-defis" numero="Art. 72, §§5º e 10 da Res. 140/2018 (alterados)" titulo="Defis: Compartilhamento de Informações e Guarda de Documentos">
            <LegalText>
              <p>
                <strong>§5º (NR):</strong> As informações prestadas pelo contribuinte na Defis serão
                compartilhadas entre a RFB e os <strong>órgãos de fiscalização tributária dos Estados,
                do Distrito Federal e dos Municípios</strong>.
              </p>
              <p className="mt-3">
                <strong>§10 (NR):</strong> Os documentos que fundamentaram a Defis deverão ser mantidos
                em boa ordem e guarda enquanto não decorrido o{" "}
                <strong>prazo decadencial e não prescritas eventuais ações</strong> que lhes sejam
                pertinentes. (LC nº 123/2006, art. 26, caput, inciso II)
              </p>
            </LegalText>
            <Comentario>
              <p>
                A Defis (Declaração de Informações Socioeconômicas e Fiscais) é a declaração anual das
                ME/EPP (exceto MEI), entregue até 31 de março do ano seguinte ao exercício. O §5º
                atualizado alinha o compartilhamento da Defis com a lógica do art. 70: os dados
                declarados na Defis também chegam às SEFAZ estaduais e às prefeituras, não apenas à RFB.
              </p>
              <p className="mt-3">
                O §10 é norma de guarda documental: o contribuinte deve conservar os documentos que
                embasaram a Defis até o fim do prazo decadencial (normalmente 5 anos a partir do
                1º dia do exercício seguinte, nos termos do art. 173 do CTN) e até a prescrição de
                eventuais ações que recaiam sobre o período. Na prática, recomenda-se guardar
                documentos por no mínimo 6 anos — o prazo decadencial de 5 anos mais 1 ano de
                margem para possíveis interrupções ou suspensões de prazo.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-excl81 */}
          <Artigo id="sub-excl81" numero="Art. 81, II, 'c' da Res. 140/2018 (alterado)" titulo="Hipóteses de Exclusão de Ofício do Simples Nacional">
            <LegalText>
              <p>
                A exclusão de ofício ocorrerá quando a ME ou EPP:
              </p>
              <p className="mt-2 ml-4">
                II — [...] c) incorrer nas hipóteses de vedação previstas nos{" "}
                <strong>incisos II a XIV, XVI a XXV e XXVII do art. 15</strong>, hipótese em que a
                exclusão produzirá efeitos nos termos estabelecidos. (LC nº 123/2006, art. 30, caput, II)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O inciso "c" do art. 81, II lista quais vedações do art. 15 geram exclusão de ofício.
                A atualização promovida pela Res. 183/2025 incorpora os novos incisos XXVI e XXVII ao
                rol, mas mantém o XXVI (sociedade em conta de participação) <em>fora</em> da hipótese
                de exclusão retroativa do art. 81 — isso significa que o XXVII (filial no exterior)
                é causa de exclusão de ofício, mas o XXVI (SCP) segue regra própria.
              </p>
              <p className="mt-3">
                O inciso XXIV (não consta do rol do art. 81) e o inciso XXVI (SCP) têm tratamento
                diferenciado: a exclusão por SCP pode ter efeitos prospectivos distintos, a depender
                da leitura em conjunto com o art. 84. Para fins de prova, o mapa das vedações que
                geram exclusão retroativa versus as que geram exclusão prospectiva é ponto frequente
                em concursos de fiscal tributário.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-reg84 */}
          <Artigo id="sub-reg84" numero="Art. 84, §§1º e 5º da Res. 140/2018 (alterados)" titulo="Prazo de Regularização e Exclusão Retroativa">
            <LegalText>
              <p>
                <strong>§1º (NR):</strong> Na hipótese prevista nos incisos V e VI do caput, a comprovação
                da regularização do débito ou do cadastro fiscal, no prazo de até{" "}
                <strong>90 (noventa) dias</strong>, contado da ciência da comunicação da exclusão de ofício,
                possibilitará a permanência da ME ou da EPP como optante pelo Simples Nacional.
                (LC nº 123/2006, art. 31, §2º)
              </p>
              <p className="mt-3">
                <strong>§5º (NR):</strong> Na hipótese das vedações dos incisos II a XIV, XVI a XXIII, XXV
                e XXVII do art. 15, uma vez que o motivo da exclusão deixe de existir, se houver exclusão
                retroativa de ofício (inciso I do caput), o efeito dar-se-á a partir do{" "}
                <strong>mês seguinte ao da ocorrência da situação impeditiva</strong>, limitado ao último
                dia do ano-calendário em que a referida situação deixou de existir.
                (LC nº 123/2006, art. 31, §5º)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O §1º concede ao contribuinte notificado de exclusão por débito (inciso V) ou irregularidade
                cadastral (inciso VI) um prazo de 90 dias para regularizar e permanecer no Simples.
                É um "salvo-conduto" que evita a exclusão imediata de empresas que tenham débitos pontuais
                ou irregularidades cadastrais menores — desde que saneadas dentro do trimestre.
              </p>
              <p className="mt-3">
                O §5º trata da chamada <em>exclusão retroativa</em>: quando a empresa incorre em vedação
                do art. 15 (por exemplo, passa a ter sócio no exterior — inciso XIII), a exclusão não
                produz efeitos apenas para o futuro. Ela retroage ao <em>mês seguinte ao da ocorrência</em>{" "}
                da situação impeditiva. Isso significa que o DAS recolhido no período irregular pode ser
                questionado e o contribuinte sujeito à diferença de tributos pelo regime geral no período.
                A limitação ao "último dia do ano-calendário em que a situação deixou de existir" protege
                o contribuinte de retroatividade ilimitada quando o impedimento foi temporário.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-lancof */}
          <Artigo id="sub-lancof" numero="Art. 87, §8º da Res. 140/2018 (alterado)" titulo="Vedação ao Lançamento de Ofício — Débitos Declarados">
            <LegalText>
              <p>
                <strong>§8º (NR):</strong> Os débitos relativos aos impostos e contribuições resultantes das
                informações prestadas na <strong>Defis</strong>, na{" "}
                <strong>Declaração Anual Simplificada para o Microempreendedor Individual — DASN-Simei</strong>{" "}
                ou no <strong>PGDAS-D</strong> estarão devidamente constituídos, sendo{" "}
                <strong>vedado o lançamento de ofício</strong> por parte das administrações tributárias
                federal, estaduais, distrital ou municipais.
                (LC nº 123/2006, art. 18, §15-A, I; art. 25, §1º; e art. 41, §4º)
              </p>
            </LegalText>
            <Comentario>
              <p>
                Este parágrafo é de enorme relevância prática. Ele estabelece que os débitos informados
                nas três declarações principais do Simples (PGDAS-D, Defis e DASN-Simei) estão{" "}
                <em>automaticamente constituídos</em> pela própria declaração — não é necessário que
                a autoridade fiscal faça um lançamento de ofício. A consequência é dupla:
              </p>
              <ul className="mt-3 ml-4 space-y-2">
                <li>
                  <strong>Para o Fisco:</strong> Pode inscrever em dívida ativa e ajuizar execução
                  fiscal sem precisar do processo administrativo de lançamento, pois o próprio contribuinte
                  já confessou o débito ao declarar.
                </li>
                <li>
                  <strong>Para o contribuinte:</strong> A denúncia espontânea (art. 138 do CTN) não é
                  possível em relação a débitos já declarados. A declaração é a confissão; o pagamento
                  posterior não "elimina" a infração de atraso — apenas quita o principal com os acréscimos.
                </li>
              </ul>
              <p className="mt-3">
                A extensão desse princípio à Defis e ao DASN-Simei (além do PGDAS-D) é uma das
                novidades relevantes da Res. 183/2025: agora as três declarações têm explicitamente
                o mesmo status de "instrumento hábil e suficiente para a exigência".
              </p>
            </Comentario>
          </Artigo>

          {/* sub-97a */}
          <Artigo id="sub-97a" numero="Art. 97-A da Res. 140/2018 (NOVO)" titulo="Multas por Omissão, Atraso ou Incorreção na Defis">
            <LegalText>
              <p>
                A ME ou EPP que deixar de apresentar a Defis ou que a apresentar com incorreções ou
                omissões, ou ainda que a apresentar fora do prazo fixado, será intimada e sujeitar-se-á a multa:
              </p>
              <p className="mt-2 ml-4">
                I — de <strong>2% (dois por cento) ao mês-calendário ou fração</strong>, incidentes sobre
                o montante dos tributos informados na Defis, ainda que integralmente pago, no caso de falta
                de entrega ou entrega após o prazo, <strong>limitada a 20% (vinte por cento)</strong>,
                observado o §3º; ou
              </p>
              <p className="mt-2 ml-4">
                II — de <strong>R$ 100,00 (cem reais) para cada grupo de 10 (dez) informações incorretas
                ou omitidas</strong>.
              </p>
              <p className="mt-3 font-medium">Reduções (§2º):</p>
              <p className="ml-4">I — à <strong>metade</strong>, quando a declaração for apresentada após o prazo, mas antes de qualquer procedimento de ofício;</p>
              <p className="ml-4">II — a <strong>75%</strong>, se houver a apresentação no prazo fixado em intimação.</p>
              <p className="mt-3"><strong>§3º:</strong> Multa mínima de <strong>R$ 200,00</strong>.</p>
              <p className="mt-2"><strong>§4º:</strong> Declaração não conforme às especificações técnicas é considerada não entregue; prazo de 10 dias para nova entrega após intimação.</p>
            </LegalText>
            <Comentario>
              <p>
                O art. 97-A é inteiramente novo na Resolução CGSN nº 140/2018. Antes dele, as penalidades
                por atraso ou incorreção na Defis não tinham disciplina própria no texto da Resolução
                (aplicavam-se as regras gerais da LC 123/2006, art. 38). Agora, o CGSN positivou uma
                estrutura de multas espelhada nas multas do PGDAS-D (art. 98) e do DASN-Simei.
              </p>
              <p className="mt-3">
                <strong>Inciso I vs. II — qual se aplica?</strong> A multa do inciso I (2%/mês até 20%)
                aplica-se à falta de entrega ou entrega intempestiva. A multa do inciso II (R$100 por
                grupo de 10 informações) aplica-se quando a Defis é entregue no prazo, mas contém
                erros ou omissões. São multas distintas e não cumulativas no mesmo fato.
              </p>
              <p className="mt-3">
                <strong>Reduções estratégicas:</strong> Entregar a Defis atrasada antes de qualquer
                autuação reduz a multa à metade (50% do valor apurado). Entregar após intimação reduz
                a 75% (ou seja, o contribuinte paga 75% do valor calculado). A omissão até o auto de
                infração resulta na multa integral. A multa mínima de R$200 garante um piso de
                arrecadação mesmo quando o montante de tributos informados é baixo.
              </p>
              <p className="mt-3">
                <strong>Base de cálculo (inciso I):</strong> Incide sobre o montante dos tributos
                informados na Defis, mesmo que já tenham sido integralmente pagos no PGDAS-D. A multa
                pela declaração é independente da multa por falta de pagamento — penaliza a omissão
                declaratória em si, não o inadimplemento tributário.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-98 */}
          <Artigo id="sub-98" numero="Art. 98 da Res. 140/2018 (alterado via Art. 1º)" titulo="Multas pelo PGDAS-D — Reduções e Declaração Técnica">
            <LegalText>
              <p className="mb-2">Alterações ao art. 98 via Art. 1º desta Resolução (NR):</p>
              <p>
                <strong>§3º:</strong> As multas serão reduzidas:
              </p>
              <p className="ml-4">I — à metade, quando a declaração for apresentada após o prazo, mas antes de qualquer procedimento de ofício; ou</p>
              <p className="ml-4">II — a 75%, se houver a apresentação no prazo fixado em intimação.</p>
              <p className="mt-3">
                <strong>§4º:</strong> Considera-se não entregue a declaração que não atender às
                especificações técnicas estabelecidas pelo CGSN.
              </p>
              <p className="mt-2">
                <strong>§5º:</strong> O sujeito passivo será intimado a apresentar nova declaração, no
                prazo de <strong>10 dias</strong>, e sujeitar-se-á à multa do inciso I do caput,
                observados os §§1º e 2º.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 98, via Art. 1º desta Resolução, recebe os mesmos §§3º, 4º e 5º que foram
                criados para a Defis (art. 97-A). A uniformização do tratamento das três declarações
                (PGDAS-D, Defis, DASN-Simei) é um dos eixos da Res. 183/2025 — mesmas regras de
                redução, mesmos prazos de correção, mesma base de cálculo.
              </p>
              <p className="mt-3">
                O §4º sobre especificações técnicas é importante: uma declaração transmitida com erros
                de formato que impeçam seu processamento é tratada como não entregue. A empresa deve
                corrigir o problema e retransmitir dentro de 10 dias da intimação. Esse prazo se aplica
                independentemente do motivo técnico — problema de validação de schema, arquivo corrompido,
                ou incompatibilidade de versão do sistema.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-100 */}
          <Artigo id="sub-100" numero="Art. 100, §9º da Res. 140/2018 (alterado)" titulo="MEI: Cômputo de Múltiplas Atividades">
            <LegalText>
              <p>
                <strong>§9º (NR):</strong> Para fins do disposto neste artigo, deve ser observado o
                art. 2º, §10º, desta Resolução, ainda que também atuem como pessoa física, caracterizada,
                para fins previdenciários, como{" "}
                <strong>contribuinte individual ou segurado especial</strong>.
                (LC nº 123/2006, art. 3º, §19; art. 18-A, §§1º, 4º, III, §14 e art. 18-E, §5º)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O §9º do art. 100 fecha o círculo iniciado no §10 do art. 2º: a regra de cômputo
                consolidado de receitas e débitos se aplica também ao MEI, mesmo quando ele atua
                simultaneamente como pessoa física (contribuinte individual ou segurado especial).
              </p>
              <p className="mt-3">
                Na prática, isso significa que o MEI que também tem receita como autônomo (serviços
                prestados em nome próprio) ou como produtor rural (segurado especial) deve somar
                todas essas receitas para verificar se continua dentro do limite do MEI (atualmente
                R$81.000 anuais, ou R$6.750 mensais). Se a receita total ultrapassar o limite,
                o desenquadramento é obrigatório, ainda que a receita formal do CNPJ MEI esteja
                dentro do teto.
              </p>
            </Comentario>
          </Artigo>

          {/* sub-109 */}
          <Artigo id="sub-109" numero="Art. 109 da Res. 140/2018 (alterado)" titulo="DASN-Simei: Prazo, Natureza e Obrigações do MEI">
            <LegalText>
              <p>
                Na hipótese de o empresário individual ou o empreendedor ter optado pelo Simei no
                ano-calendário anterior, ele deverá apresentar, até o{" "}
                <strong>último dia de maio de cada ano</strong>, à RFB, a{" "}
                <strong>Declaração Anual Única e Simplificada de Informações Socioeconômicas e
                Fiscais para o Microempreendedor Individual (DASN-Simei)</strong>, que conterá:
                (LC nº 123/2006, art. 25, caput e §4º; e art. 25-B)
              </p>
              <p className="mt-3">
                <strong>§3º:</strong> A DASN-Simei poderá ser retificada independentemente de prévia
                autorização da administração tributária, observado o disposto no parágrafo único do
                art. 138 do CTN.
              </p>
              <p className="mt-2">
                <strong>§7º:</strong> A DASN-Simei possui{" "}
                <strong>caráter declaratório</strong>, constituindo confissão de dívida e instrumento
                hábil e suficiente para a exigência dos tributos que não tenham sido recolhidos.
              </p>
              <p className="mt-2">
                <strong>§8º:</strong> O direito de o MEI retificar as informações extingue-se no prazo
                de <strong>5 (cinco) anos</strong>, contado a partir do 1º dia do exercício seguinte
                àquele ao qual se refere a declaração.
              </p>
              <p className="mt-2">
                <strong>§9º:</strong> Os documentos que fundamentaram a DASN-Simei deverão ser mantidos
                em boa ordem e guarda enquanto não decorrido o prazo decadencial e não prescritas as
                eventuais ações pertinentes.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 109, atualizado pela Res. 183/2025, codifica na Resolução nº 140 todas as regras
                de entrega, natureza e retificação da DASN-Simei que antes estavam dispersas em
                Instruções Normativas da RFB. Os pontos de maior atenção:
              </p>
              <p className="mt-3">
                <strong>Prazo (último dia de maio):</strong> Diferentemente da Defis (31 de março),
                a DASN-Simei tem prazo até 31 de maio. O MEI em situação de baixa tem regra especial:
                se a baixa ocorreu entre janeiro e abril, a declaração deve ser entregue em 30 dias
                após a baixa; nos demais meses, até 31 de maio.
              </p>
              <p className="mt-3">
                <strong>Retificação (§3º):</strong> Pode ser feita sem autorização prévia, mas com
                uma ressalva importante da referência ao art. 138 do CTN: a retificação não configura
                denúncia espontânea se o débito que ela cria já estava sendo investigado ou apurado
                pelo Fisco. A denúncia espontânea pressupõe que o fisco ainda não conhecia a infração.
              </p>
              <p className="mt-3">
                <strong>Prazo de retificação (§8º — 5 anos):</strong> O direito de retificar se extingue
                em 5 anos do 1º dia do exercício seguinte. Para o exercício 2024, o prazo de retificação
                vai até 1º de janeiro de 2030. Após isso, qualquer correção depende de autorização da RFB.
              </p>
              <p className="mt-3">
                <strong>RAIS (§6º):</strong> Os dados de empregado do MEI informados na DASN-Simei podem
                ser encaminhados pelo Serpro ao Ministério do Trabalho, desobrigando o MEI de entregar a
                RAIS separadamente — uma desburocratização significativa para os MEI empregadores.
              </p>
            </Comentario>
          </Artigo>

          {/* Art. 2º da Resolução */}
          <Secao id="art-2" titulo="Art. 2º — Alteração do Art. 40-A da Res. 140/2018" subtitulo="Extensão das obrigações acessórias ao PGDAS-D, Defis e DASN-Simei" />

          <Artigo id="art-2" numero="Art. 2º da Resolução CGSN nº 183/2025" titulo="Obrigações Acessórias: Aplicação do Art. 40-A ao PGDAS-D, Defis e DASN-Simei">
            <LegalText>
              <p>
                A Resolução CGSN nº 140, de 2018, passa a vigorar com as seguintes alterações:
              </p>
              <p className="mt-3">
                "Art. 40-A. [...] <strong>§5º</strong> O previsto neste artigo aplica-se, no que couber,
                às obrigações tributárias acessórias dispostas nos arts. 38 (PGDAS-D), 72 (Defis) e 109
                (DASN-Simei) desta Resolução." (NR)
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 40-A da Res. 140/2018 trata das regras gerais de obrigações acessórias no âmbito
                do Simples Nacional. A inclusão do §5º via Art. 2º desta Resolução unifica o tratamento:
                as regras gerais de obrigações acessórias se aplicam às três declarações do Simples
                (PGDAS-D, Defis, DASN-Simei) no que for compatível.
              </p>
              <p className="mt-3">
                Na prática, isso uniformiza os critérios de aceitação técnica das declarações, prazos
                de apresentação em casos especiais, e regras de ciência dos atos administrativos
                relacionados às obrigações acessórias. A expressão "no que couber" preserva as
                especificidades de cada declaração (PGDAS-D é mensal; Defis e DASN-Simei são anuais).
              </p>
            </Comentario>
          </Artigo>

          {/* Art. 3º da Resolução */}
          <Secao id="art-3" titulo="Art. 3º — Multas pelo PGDAS-D (Vigência a partir de 01/01/2026)" subtitulo="Altera Art. 98, I e §1º da Res. 140/2018" />

          <Artigo id="art-3" numero="Art. 3º da Resolução CGSN nº 183/2025" titulo="PGDAS-D: Multa de 2%/mês — Cálculo e Prazo (vigência 2026)">
            <LegalText>
              <p>
                A Resolução CGSN nº 140, de 2018, passa a vigorar com as seguintes alterações:
              </p>
              <p className="mt-3">
                "Art. 98. [...]
              </p>
              <p className="mt-2 ml-4">
                I — de <strong>2% (dois por cento) ao mês-calendário ou fração</strong>, a partir do dia
                seguinte ao término do <strong>prazo originalmente fixado</strong> para a entrega da
                declaração, incidentes sobre o montante dos impostos e contribuições decorrentes das
                informações prestadas no PGDAS-D, ainda que integralmente pago, no caso de ausência de
                prestação de informações ou sua efetuação após o prazo, <strong>limitada a 20%</strong>,
                observado o §2º deste artigo;
              </p>
              <p className="mt-2">
                <strong>§1º</strong> Para fins de aplicação da multa prevista no inciso I do caput, será
                considerado como <strong>termo inicial</strong> o dia seguinte ao término do prazo
                originalmente fixado para a entrega da declaração e como{" "}
                <strong>termo final</strong> a data da efetiva prestação ou, no caso de não prestação,
                da lavratura do auto de infração." (NR)
              </p>
            </LegalText>
            <Comentario>
              <p>
                Esta é a única alteração desta Resolução com vigência diferida:{" "}
                <strong>produzirá efeitos a partir de 1º de janeiro de 2026</strong>, conforme o
                §4º do art. 38-A da LC 123/2006, ao qual o art. 7º, I remete expressamente.
              </p>
              <p className="mt-3">
                A mudança no inciso I é técnica mas importante: o termo inicial da multa passa a ser
                o dia seguinte ao término do <em>prazo originalmente fixado</em>, e não da intimação.
                Isso impede que o contribuinte postergue indefinidamente a prestação de informações
                no PGDAS-D sem acumulação da multa — o contador começa a partir do vencimento
                natural do prazo.
              </p>
              <p className="mt-3">
                O §1º codifica os marcos temporais de forma cristalina: início = dia seguinte ao
                prazo original; fim = entrega efetiva (ou auto de infração se não houver entrega).
                A multa é calculada em meses ou fração — cada mês ou parte de mês de atraso conta
                como um mês cheio para efeito de incidência dos 2%.
              </p>
            </Comentario>
          </Artigo>

          {/* Arts. 4º e 5º */}
          <Secao id="art-4" titulo="Arts. 4º e 5º — Renomeação de Seções da Res. 140/2018" subtitulo="Adequação estrutural — vigência imediata" />

          <Artigo id="art-4" numero="Art. 4º da Resolução CGSN nº 183/2025" titulo="Seção I do Cap. I do Título I — Das Definições e Princípios">
            <LegalText>
              <p>
                A Seção I do Capítulo I do Título I, localizada imediatamente após o art. 1º da Resolução
                CGSN nº 140, de 2018, passa a vigorar com a seguinte redação:
              </p>
              <p className="mt-3 ml-4 font-medium">
                "TÍTULO I<br />
                [...]<br />
                Seção I<br />
                Das Definições e Princípios" (NR)
              </p>
            </LegalText>
            <Comentario>
              <p>
                A renomeação da Seção I para "Das Definições e Princípios" é consequência direta da
                inclusão dos novos arts. 2º-A (princípios) e 2º-B (administração integrada). A seção
                que antes tratava apenas de definições agora precisa do título ampliado para abranger
                os princípios que foram positivados.
              </p>
              <p className="mt-3">
                Do ponto de vista da técnica legislativa, a renomeação de seção sem necessidade de
                aprovação de lei complementar (basta Resolução do CGSN) é possível porque os
                princípios já estavam na LC 123/2006 (art. 12, §2º) — o CGSN apenas os incorporou
                à Resolução regulamentadora.
              </p>
            </Comentario>
          </Artigo>

          <Artigo id="art-5" numero="Art. 5º da Resolução CGSN nº 183/2025" titulo="Seção II do Cap. III do Título II — DASN-Simei">
            <LegalText>
              <p>
                A Seção II do Capítulo III do Título II, localizada imediatamente após o art. 108 da
                Resolução CGSN nº 140, de 2018, passa a vigorar com a seguinte redação:
              </p>
              <p className="mt-3 ml-4 font-medium">
                "Seção II<br />
                Da Declaração Anual Única e Simplificada de Informações Socioeconômicas e Fiscais
                para o MEI (DASN-Simei)" (NR)
              </p>
            </LegalText>
            <Comentario>
              <p>
                A renomeação formal da seção do DASN-Simei dá visibilidade à importância da declaração
                anual do MEI dentro da estrutura da Res. 140/2018. Antes, a seção tinha denominação
                mais genérica. Com a inclusão das disposições detalhadas do art. 109 (§§1º a §9º)
                pela Res. 183/2025, a seção passou a ter densidade normativa suficiente para merecer
                denominação própria e específica.
              </p>
            </Comentario>
          </Artigo>

          {/* Art. 6º */}
          <Secao id="art-6" titulo="Art. 6º — Revogações" subtitulo="Dispositivos da Res. 140/2018 revogados" />

          <Artigo id="art-6" numero="Art. 6º da Resolução CGSN nº 183/2025" titulo="Revogação de Dispositivos da Res. 140/2018">
            <LegalText>
              <p>
                Ficam revogados os seguintes dispositivos da Resolução CGSN nº 140, de 2018:
              </p>
              <p className="mt-2 ml-4">
                I — os <strong>incisos I a IV do §5º do art. 6º</strong>; e
              </p>
              <p className="ml-4">
                II — os <strong>incisos I e II do §4º do art. 98</strong>.
              </p>
            </LegalText>
            <Comentario>
              <p>
                <strong>Inciso I (revogação dos incisos I a IV do §5º do art. 6º):</strong> O art. 6º, §5º
                tratava do procedimento de opção pelo Simples Nacional por empresas em início de atividade
                via Redesim. Os incisos I a IV continham os prazos e etapas do processo de confirmação
                pelos entes federativos que, com a atualização do procedimento Redesim, ficaram
                desatualizados. Os incisos IV, V e VI que permaneceram (ver comentário do art. 1º sobre
                o art. 6º, §5º) já cobrem o essencial.
              </p>
              <p className="mt-3">
                <strong>Inciso II (revogação dos incisos I e II do §4º do art. 98):</strong> O §4º do
                art. 98 continha as reduções de multa do PGDAS-D em texto próprio. Com a inclusão do
                novo §3º via art. 1º desta Resolução (que consolida as mesmas reduções com texto
                atualizado e uniforme), os incisos I e II do §4º tornam-se redundantes e são revogados
                para evitar duplicidade.
              </p>
            </Comentario>
          </Artigo>

          {/* Art. 7º */}
          <Secao id="art-7" titulo="Art. 7º — Vigência e Efeitos Temporais" subtitulo="Regra geral: imediata — exceção: Art. 3º a partir de 01/01/2026" />

          <Artigo id="art-7" numero="Art. 7º da Resolução CGSN nº 183/2025" titulo="Entrada em Vigor e Efeitos">
            <LegalText>
              <p>
                Esta Resolução entra em vigor na data de sua publicação no Diário Oficial da União e
                produzirá efeitos:
              </p>
              <p className="mt-2 ml-4">
                I — a partir de <strong>1º de janeiro de 2026</strong>, em relação ao art. 3º, nos
                termos do disposto no §4º do art. 38-A da Lei Complementar nº 123, de 2006; e
              </p>
              <p className="ml-4">
                II — <strong>imediatamente</strong>, em relação aos demais artigos.
              </p>
            </LegalText>
            <Comentario>
              <p>
                O art. 7º establece a regra geral de vigência imediata, com uma exceção importante para
                o art. 3º (alterações ao art. 98, I e §1º da Res. 140/2018 — multas pelo PGDAS-D),
                que só produz efeitos a partir de 01/01/2026.
              </p>
              <p className="mt-3">
                A razão do diferimento do art. 3º está expressa na remissão ao §4º do art. 38-A da
                LC 123/2006: as regras sobre multas pelo PGDAS-D exigem o cumprimento da anterioridade
                nonagesimal (90 dias de antecedência) ou a limitação ao exercício seguinte para produzir
                efeitos, a fim de respeitar a segurança jurídica do contribuinte. Como a Resolução foi
                publicada em 13/10/2025, o prazo de 90 dias aproximadamente coincide com 01/01/2026.
              </p>
              <p className="mt-3">
                <strong>Implicação prática para fins de aplicação da lei no tempo:</strong>
              </p>
              <ul className="mt-2 ml-4 space-y-1">
                <li>Arts. 1º, 2º, 4º, 5º, 6º: vigentes desde 13/10/2025 (data do DOU);</li>
                <li>Art. 3º (multas PGDAS-D): vigente a partir de 01/01/2026;</li>
                <li>Para fatos geradores ocorridos até 31/12/2025, as regras anteriores de multa do PGDAS-D continuam se aplicando.</li>
              </ul>
            </Comentario>
          </Artigo>

        </div>
      </div>
    </div>
  );
}
