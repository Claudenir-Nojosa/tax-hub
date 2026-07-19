"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Brain, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import {
  MATERIAS,
  type MapaMental, type MateriaConcurso, type MateriaDef,
} from "@/lib/estudo-data";
import { calcularLayout, clonarComNovosIds, contarNos, criarMapaVazio } from "./mapas/mapa-utils";
import { resolverCorMateria } from "./trilha/trilha-ui";

// pdf.js-sized editor (canvas com pan/zoom) só carrega quando abre um mapa
const EditorMapaMental = dynamic(() => import("./mapas/EditorMapaMental"), { ssr: false });

interface Props {
  mapas: MapaMental[];
  onChange: (mapas: MapaMental[]) => void;
  materiasConcurso?: MateriaConcurso[];
}

function novoMapa(materia: string): MapaMental {
  const hoje = new Date().toISOString();
  return {
    id: `mapa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: "Novo mapa mental",
    materia,
    raiz: criarMapaVazio(),
    criadoEm: hoje,
    atualizadoEm: hoje,
  };
}

function fmtRelativo(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function MapasMentaisTab({ mapas, onChange, materiasConcurso }: Props) {
  const materiasAtivas: (MateriaDef | MateriaConcurso)[] =
    materiasConcurso && materiasConcurso.length > 0 ? materiasConcurso : MATERIAS;

  const [editando, setEditando] = useState<MapaMental | null>(null);

  const grupos = useMemo(() => {
    const porMateria = new Map<string, MapaMental[]>();
    for (const m of mapas) {
      const lista = porMateria.get(m.materia) ?? [];
      lista.push(m);
      porMateria.set(m.materia, lista);
    }
    const ordem = materiasAtivas.map((m) => m.nome);
    return [...porMateria.entries()]
      .sort((a, b) => {
        const ia = ordem.indexOf(a[0]);
        const ib = ordem.indexOf(b[0]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a[0].localeCompare(b[0]);
      })
      .map(([materia, lista]) => ({
        materia,
        lista: [...lista].sort((a, b) => (b.atualizadoEm ?? b.criadoEm).localeCompare(a.atualizadoEm ?? a.criadoEm)),
      }));
  }, [mapas, materiasAtivas]);

  const criar = () => {
    const mapa = novoMapa(materiasAtivas[0]?.nome ?? "");
    onChange([mapa, ...mapas]);
    setEditando(mapa);
  };

  const duplicar = (mapa: MapaMental) => {
    const hoje = new Date().toISOString();
    const copia: MapaMental = {
      ...mapa,
      id: `mapa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      titulo: `${mapa.titulo} (cópia)`,
      raiz: clonarComNovosIds(mapa.raiz),
      criadoEm: hoje,
      atualizadoEm: hoje,
    };
    onChange([copia, ...mapas]);
  };

  const excluir = (mapa: MapaMental) => {
    if (!confirm(`Excluir o mapa "${mapa.titulo}"? Essa ação não pode ser desfeita.`)) return;
    onChange(mapas.filter((m) => m.id !== mapa.id));
  };

  const salvarEdicao = (mapa: MapaMental) => {
    onChange(mapas.map((m) => (m.id === mapa.id ? mapa : m)));
  };

  if (editando) {
    return (
      <EditorMapaMental
        mapa={editando}
        materiasAtivas={materiasAtivas}
        onChange={(m) => { salvarEdicao(m); setEditando(m); }}
        onFechar={() => setEditando(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Brain className="h-6 w-6" />
            <div>
              <div className="text-lg font-bold">Mapas Mentais</div>
              <div className="text-xs text-violet-100">
                {mapas.length === 0
                  ? "Crie mapas mentais com imagens, cores e formatação — igual Xmind, direto no site."
                  : `${mapas.length} ${mapas.length !== 1 ? "mapas mentais" : "mapa mental"}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={criar}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" /> Novo mapa mental
          </button>
        </div>
      </div>

      {mapas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <Brain className="h-8 w-8 mx-auto mb-3 text-violet-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhum mapa mental ainda.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto mb-4">
            Monte a estrutura de uma lei ou de um tópico inteiro visualmente: tema central,
            ramos coloridos, texto em negrito/itálico, imagens e cores por nó.
          </p>
          <button
            type="button"
            onClick={criar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Criar primeiro mapa
          </button>
        </div>
      ) : (
        grupos.map(({ materia, lista }) => {
          const cor = resolverCorMateria(materia, materiasAtivas);
          return (
            <div key={materia} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <span className={`w-2.5 h-2.5 rounded-full ${cor.dot}`} />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">{materia}</span>
                <span className="text-[11px] text-gray-400">{lista.length} mapa{lista.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                {lista.map((mapa) => (
                  <CartaoMapa
                    key={mapa.id}
                    mapa={mapa}
                    onAbrir={() => setEditando(mapa)}
                    onDuplicar={() => duplicar(mapa)}
                    onExcluir={() => excluir(mapa)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function CartaoMapa({ mapa, onAbrir, onDuplicar, onExcluir }: { mapa: MapaMental; onAbrir: () => void; onDuplicar: () => void; onExcluir: () => void }) {
  const layout = useMemo(() => calcularLayout(mapa.raiz), [mapa.raiz]);
  const totalNos = useMemo(() => contarNos(mapa.raiz), [mapa.raiz]);
  const largura = layout.maxX - layout.minX;
  const altura = layout.maxY - layout.minY;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-violet-400 dark:hover:border-violet-600 transition-colors group">
      <button type="button" onClick={onAbrir} className="block w-full text-left">
        <div className="h-28 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
          <svg viewBox={`${layout.minX} ${layout.minY} ${largura} ${altura}`} className="w-full h-full p-2">
            {layout.conexoes.map((c, i) => <path key={i} d={c.d} stroke={c.cor} strokeWidth={4} fill="none" opacity={0.7} />)}
            {layout.nos.map((n) => (
              <rect
                key={n.no.id}
                x={n.x - n.largura / 2}
                y={n.y - n.altura / 2}
                width={n.largura}
                height={n.altura}
                rx={8}
                fill={n.no.corFundo || (n.lado === "raiz" ? n.corRamo : `${n.corRamo}33`)}
                stroke={n.no.semBorda ? "transparent" : (n.no.corBorda || n.corRamo)}
                strokeWidth={2.5}
              />
            ))}
          </svg>
        </div>
      </button>
      <div className="p-3">
        <button type="button" onClick={onAbrir} className="block w-full text-left">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{mapa.titulo || "Sem título"}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {mapa.topico ? `${mapa.topico} · ` : ""}{totalNos} nó{totalNos !== 1 ? "s" : ""} · atualizado {fmtRelativo(mapa.atualizadoEm ?? mapa.criadoEm)}
          </div>
        </button>
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onAbrir} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-violet-500" title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDuplicar} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500" title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onExcluir} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 ml-auto" title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
