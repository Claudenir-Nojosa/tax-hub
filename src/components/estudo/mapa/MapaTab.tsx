"use client";

import { useState } from "react";
import { MATERIAS, type MateriaConcurso, type TopicoState } from "@/lib/estudo-data";
import Acampamento from "./Acampamento";
import MapaMundo from "./MapaMundo";
import MapaRegiao from "./MapaRegiao";
import TelaTreino from "./TelaTreino";

type Tela = "acampamento" | "mundo" | "treino";

// Fase 1 do RPG medieval de estudos: mapa + acampamento andável, sem batalha/HP/motor de jogo
// ainda — pedido explícito do usuário ("faça o mapa, depois eu decido o resto"). Entrada é o
// Acampamento (campo de descanso/hub, personagem andável com as setas) — daí dá pra ir pro Mapa
// do Mundo, onde cada matéria é uma região; cada tópico dela é uma cidade dentro da região. 100%
// derivado do progresso real (TopicoState.estudado) e da mesma ordem de desbloqueio que a Trilha
// já usa — nenhum estado novo é persistido nesta fase.
export default function MapaTab({
  materiasConcurso,
  topicos,
}: {
  materiasConcurso?: MateriaConcurso[];
  topicos: Record<string, TopicoState>;
}) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [tela, setTela] = useState<Tela>("acampamento");
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string | null>(null);

  const materia = regiaoSelecionada ? materiasAtivas.find((m) => m.nome === regiaoSelecionada) : undefined;

  if (tela === "acampamento") {
    return (
      <Acampamento
        onIrParaMapa={() => setTela("mundo")}
        onEntrarTreino={() => setTela("treino")}
      />
    );
  }

  if (tela === "treino") {
    return <TelaTreino onVoltar={() => setTela("acampamento")} />;
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
