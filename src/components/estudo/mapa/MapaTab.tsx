"use client";

import { useState } from "react";
import { MATERIAS, type MateriaConcurso, type TopicoState } from "@/lib/estudo-data";
import MapaMundo from "./MapaMundo";
import MapaRegiao from "./MapaRegiao";

// Fase 1 do RPG medieval de estudos: só o mapa (mundo + região), sem batalha/HP/motor de jogo
// ainda — pedido explícito do usuário ("faça o mapa, depois eu decido o resto"). Cada matéria é
// uma região do mundo; cada tópico dela é uma cidade dentro da região. 100% derivado do progresso
// real (TopicoState.estudado) e da mesma ordem de desbloqueio que a Trilha já usa — nenhum estado
// novo é persistido nesta fase.
export default function MapaTab({
  materiasConcurso,
  topicos,
}: {
  materiasConcurso?: MateriaConcurso[];
  topicos: Record<string, TopicoState>;
}) {
  const materiasAtivas = materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string | null>(null);

  const materia = regiaoSelecionada ? materiasAtivas.find((m) => m.nome === regiaoSelecionada) : undefined;

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
    <MapaMundo
      materias={materiasAtivas}
      topicos={topicos}
      onSelecionarRegiao={setRegiaoSelecionada}
    />
  );
}
