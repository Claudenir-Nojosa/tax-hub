"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Maximize, Minimize, Sparkles, Volume2, VolumeX } from "lucide-react";
import { MATERIAS, materiasDefaultSefaz, type JogoRPGState, type MateriaConcurso, type TopicoState } from "@/lib/estudo-data";
import Acampamento from "./Acampamento";
import { catalogoEsgotado, novaCampanha, progressoDaMateria, type CampanhaRPGState } from "./campanha-rpg";
import { inimigosDaMateria } from "./inimigos-rpg";
import MapaMundo from "./MapaMundo";
import MapaRegiao from "./MapaRegiao";
import TelaCombateCampanha, { type QuestaoErrada } from "./TelaCombateCampanha";
import TelaEstatisticasRPG from "./TelaEstatisticasRPG";
import TelaMenu from "./TelaMenu";
import TelaRevisaoCombate from "./TelaRevisaoCombate";
import TelaRotaCampanha from "./TelaRotaCampanha";
import TelaSelecaoMapa from "./TelaSelecaoMapa";
import TelaTreino from "./TelaTreino";

type Tela = "menu" | "acampamento" | "mundo" | "treino" | "selecaoMapa" | "rota" | "combate" | "revisao" | "estatisticas";

// RPG medieval de estudos. Entrada é o Menu (título do jogo): Nova Campanha/Continuar levam pra
// Seleção de Mapa — cada mapa é uma matéria, escolhida livremente pelo jogador (reformulação que
// substitui a rota única do edital inteiro do design anterior). Dentro do mapa escolhido, a rota
// sequencial de inimigos daquela matéria; combate real com perguntas; ao fim de CADA combate, se
// sobrar questão errada, entra em Revisão (resposta certa + dica de IA) antes de voltar. Estatísticas
// agrega o histórico (RespostaRPG) por matéria/tópico. Morrer reseta a corrida (progresso por
// matéria, ouro, XP) mas preserva itens/XP permanente/histórico — ver campanha-rpg.ts. "Ir para o
// mapa" leva ao modo livre já existente (Acampamento andável → Mapa do Mundo por matéria/tópico, ou
// treino solto contra o Nerdão) — esse fluxo é 100% derivado do progresso real (TopicoState.estudado)
// e não persiste nada de novo; roda em paralelo à campanha, sistemas de ouro/XP separados.
//
// Tela cheia e música ficam AQUI (não dentro de cada tela) de propósito: todas as telas do jogo
// (menu/acampamento/treino/seleçãoMapa/rota/combate/revisão/estatísticas) compartilham o mesmo
// wrapper (só "mundo" fica fora), então trocar entre elas nunca desmonta o <audio>/fullscreen — se
// cada tela fosse dona do próprio elemento, a troca cortaria o som e derrubaria a tela cheia no meio
// (bug já reportado pelo usuário nessa área). A música muda de faixa (acampamento.mp3 <-> luta.mp3)
// conforme a tela, sem trocar de dono.
export default function MapaTab({
  materiasConcurso,
  topicos,
  jogoRPG,
  onUpdateJogoRPG,
  concursoId,
}: {
  materiasConcurso?: MateriaConcurso[];
  topicos: Record<string, TopicoState>;
  jogoRPG: JogoRPGState;
  onUpdateJogoRPG: (jogo: JogoRPGState) => void;
  concursoId?: string;
}) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  // TelaSelecaoMapa precisa de id/cor reais (MateriaConcurso), que MATERIAS (MateriaDef, sem esses
  // campos) não tem — fallback próprio via materiasDefaultSefaz() em vez do materiasAtivas genérico
  // (mesma lição já documentada no app: não misturar o union MateriaConcurso[]|MateriaDef[] com um
  // consumidor que exige só um dos dois lados).
  const materiasParaMapa: MateriaConcurso[] = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : materiasDefaultSefaz();
  const [tela, setTela] = useState<Tela>("menu");
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string | null>(null);

  const [campanha, setCampanha] = useState<CampanhaRPGState | null>(null);
  const [carregandoCampanha, setCarregandoCampanha] = useState(true);
  const [materiaEscolhida, setMateriaEscolhida] = useState<string | null>(null);
  const [erradasCombate, setErradasCombate] = useState<QuestaoErrada[]>([]);
  const [destinoAposRevisao, setDestinoAposRevisao] = useState<"rota" | "menu">("rota");

  const [telaCheia, setTelaCheia] = useState(false);
  const [tocandoMusica, setTocandoMusica] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!concursoId) {
      setCarregandoCampanha(false);
      return;
    }
    setCarregandoCampanha(true);
    fetch(`/api/concurso/${concursoId}/campanha-rpg`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: CampanhaRPGState | null) => setCampanha(c))
      .catch(() => setCampanha(null))
      .finally(() => setCarregandoCampanha(false));
  }, [concursoId]);

  const persistirCampanha = (nova: CampanhaRPGState) => {
    setCampanha(nova);
    if (!concursoId) return;
    fetch(`/api/concurso/${concursoId}/campanha-rpg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nova),
    }).catch(() => {});
  };

  const iniciarNovaCampanha = () => {
    persistirCampanha(novaCampanha(campanha ?? undefined));
    setTela("selecaoMapa");
  };

  const inimigoAtual =
    campanha && materiaEscolhida ? inimigosDaMateria(materiaEscolhida)[progressoDaMateria(campanha, materiaEscolhida)] : undefined;

  const resolverVitoria = (hpFinalHeroi: number, ouroGanho: number, xpGanho: number, erradas: QuestaoErrada[]) => {
    if (!campanha || !materiaEscolhida || !inimigoAtual) return;
    const novaPosicao = progressoDaMateria(campanha, materiaEscolhida) + 1;
    const novoProgresso = { ...campanha.progressoMaterias, [materiaEscolhida]: novaPosicao };
    const topicoKey = `${inimigoAtual.materia}::${inimigoAtual.topico}`;
    persistirCampanha({
      ...campanha,
      status: catalogoEsgotado(novoProgresso) ? "conteudo_esgotado" : "em_andamento",
      heroiHP: hpFinalHeroi,
      ouroCorrida: campanha.ouroCorrida + ouroGanho,
      xpCorrida: campanha.xpCorrida + xpGanho,
      progressoMaterias: novoProgresso,
      topicosVencidosTotal: campanha.topicosVencidosTotal.includes(topicoKey)
        ? campanha.topicosVencidosTotal
        : [...campanha.topicosVencidosTotal, topicoKey],
    });
    if (erradas.length > 0) {
      setErradasCombate(erradas);
      setDestinoAposRevisao("rota");
      setTela("revisao");
    } else {
      setTela("rota");
    }
  };

  const resolverDerrota = (erradas: QuestaoErrada[]) => {
    if (!campanha) return;
    persistirCampanha({ ...novaCampanha(campanha), status: "morto" });
    if (erradas.length > 0) {
      setErradasCombate(erradas);
      setDestinoAposRevisao("menu");
      setTela("revisao");
    } else {
      setTela("menu");
    }
  };

  const musicaAtual = tela === "combate" ? "/sons/luta.mp3" : "/sons/acampamento.mp3";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !tocandoMusica) return;
    audio.play().catch(() => {});
    // troca a faixa (acampamento <-> luta) quando `tela` muda de categoria — precisa retomar o play
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicaAtual, tocandoMusica]);

  useEffect(() => {
    const onFullscreenChange = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  // navegador bloqueia autoplay com som sem gesto do usuário — por isso começa pausado, e o
  // botão de música é o próprio gesto que libera o play
  const alternarMusica = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocandoMusica) audio.pause();
    else audio.play().catch(() => {});
    setTocandoMusica((v) => !v);
  };

  const materia = regiaoSelecionada ? materiasAtivas.find((m) => m.nome === regiaoSelecionada) : undefined;

  if (
    tela === "menu" ||
    tela === "acampamento" ||
    tela === "treino" ||
    tela === "selecaoMapa" ||
    tela === "rota" ||
    tela === "combate" ||
    tela === "revisao" ||
    tela === "estatisticas"
  ) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black ${
          telaCheia ? "w-screen h-screen flex items-center justify-center" : "rounded-2xl border border-amber-800/20 dark:border-amber-100/10"
        }`}
      >
        <audio ref={audioRef} src={musicaAtual} loop preload="none" />

        {tela === "menu" &&
          (carregandoCampanha ? (
            <div className="flex items-center justify-center w-full h-full p-10">
              <p className="text-sm text-white/40">Carregando...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
              <TelaMenu
                campanha={campanha}
                onNovaCampanha={iniciarNovaCampanha}
                onContinuar={() => setTela("selecaoMapa")}
                onIrParaMapa={() => setTela("acampamento")}
                onVerEstatisticas={() => setTela("estatisticas")}
              />
            </div>
          ))}

        {tela === "acampamento" && (
          <Acampamento
            telaCheia={telaCheia}
            onIrParaMapa={() => setTela("mundo")}
            onEntrarTreino={() => setTela("treino")}
          />
        )}

        {tela === "treino" && (
          <TelaTreino
            telaCheia={telaCheia}
            jogoRPG={jogoRPG}
            onUpdateJogoRPG={onUpdateJogoRPG}
            concursoId={concursoId}
            onVoltar={() => setTela("acampamento")}
          />
        )}

        {tela === "selecaoMapa" &&
          (campanha ? (
            <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
              <TelaSelecaoMapa
                materiasConcurso={materiasParaMapa}
                campanha={campanha}
                onSelecionarMateria={(m) => {
                  setMateriaEscolhida(m);
                  setTela("rota");
                }}
                onVoltarMenu={() => setTela("menu")}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-10">
              <p className="text-sm text-white/40">Nenhuma campanha ativa.</p>
            </div>
          ))}

        {tela === "rota" &&
          (campanha && materiaEscolhida ? (
            <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
              <TelaRotaCampanha
                materia={materiaEscolhida}
                campanha={campanha}
                onEntrarCombate={() => setTela("combate")}
                onTrocarMapa={() => setTela("selecaoMapa")}
                onVoltarMenu={() => setTela("menu")}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-10">
              <p className="text-sm text-white/40">Nenhum mapa selecionado.</p>
            </div>
          ))}

        {tela === "combate" &&
          (campanha && inimigoAtual ? (
            <TelaCombateCampanha
              telaCheia={telaCheia}
              inimigo={inimigoAtual}
              heroiHPMax={campanha.heroiHPMax}
              heroiHPInicial={campanha.heroiHP}
              concursoId={concursoId}
              onVitoria={resolverVitoria}
              onDerrota={resolverDerrota}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full p-10">
              <p className="text-sm text-white/40">Nenhuma luta disponível.</p>
            </div>
          ))}

        {tela === "revisao" && (
          <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
            <TelaRevisaoCombate erradas={erradasCombate} onContinuar={() => setTela(destinoAposRevisao)} />
          </div>
        )}

        {tela === "estatisticas" && (
          <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
            <TelaEstatisticasRPG concursoId={concursoId} onVoltarMenu={() => setTela("menu")} />
          </div>
        )}

        {(tela === "acampamento" || tela === "treino") && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5">
            <span className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-300">
              <Coins className="h-3.5 w-3.5" /> {jogoRPG.gold}
            </span>
            <span className="flex items-center gap-1 text-xs font-mono font-semibold text-violet-300">
              <Sparkles className="h-3.5 w-3.5" /> {jogoRPG.xp} XP
            </span>
          </div>
        )}

        {(tela === "acampamento" || tela === "treino") && (
          <button
            type="button"
            onClick={() => setTela("menu")}
            className="absolute top-3 left-3 z-10 text-xs font-medium text-white/60 hover:text-white transition-colors bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5"
          >
            ← Menu
          </button>
        )}

        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={alternarMusica}
            title={tocandoMusica ? "Pausar música" : "Tocar música"}
            className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/75 text-white flex items-center justify-center border border-white/15 transition-colors"
          >
            {tocandoMusica ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={alternarTelaCheia}
            title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            className="h-8 w-8 rounded-lg bg-black/60 hover:bg-black/75 text-white flex items-center justify-center border border-white/15 transition-colors"
          >
            {telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  if (materia) {
    return (
      <MapaRegiao
        materia={materia}
        materias={materiasAtivas}
        topicos={topicos}
        onVoltar={() => setRegiaoSelecionada(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setTela("acampamento")}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Voltar ao acampamento
      </button>
      <MapaMundo
        materias={materiasAtivas}
        topicos={topicos}
        onSelecionarRegiao={setRegiaoSelecionada}
      />
    </div>
  );
}
