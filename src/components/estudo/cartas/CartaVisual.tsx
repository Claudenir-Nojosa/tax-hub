import { Flame, Pencil } from "lucide-react";
import type { Carta } from "@/lib/estudo-data";
import { CARTA_CONFIG, labelDue } from "./carta-config";

export default function CartaVisual({ carta, onExcluir, onEditar }: { carta: Carta; onExcluir: (id: string) => void; onEditar: (carta: Carta) => void }) {
  const cfg = CARTA_CONFIG[carta.tipo];
  const Icon = cfg.icone;
  const due = labelDue(carta);
  const taxa = carta.acertos + carta.erros > 0
    ? Math.round((carta.acertos / (carta.acertos + carta.erros)) * 100)
    : null;

  return (
    <div className={`relative rounded-2xl border-2 ${cfg.borda} bg-gradient-to-b ${cfg.cor} shadow-xl ${cfg.sombra} flex flex-col group overflow-hidden`}>
      {/* Botões de ação */}
      <button
        onClick={() => onEditar(carta)}
        className="absolute top-2 right-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-primary"
        title="Editar carta"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onExcluir(carta.id)}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 text-xs font-bold px-1"
        title="Excluir carta"
      >
        ✕
      </button>

      {/* Área da imagem */}
      <div className="flex items-center justify-center pt-5 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cfg.imagem}
          alt={cfg.nome}
          className="h-24 w-24 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Badge */}
      <div className="px-4 pb-2">
        <div className={`inline-flex items-center gap-1 ${cfg.badge} rounded-full px-2 py-0.5`}>
          <Icon className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold text-white tracking-wider">{cfg.texto}</span>
        </div>
      </div>

      {/* Texto da carta */}
      <div className="px-4 pb-3 flex-1">
        <p className="text-sm text-white/90 leading-snug line-clamp-3">{carta.frente}</p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40 truncate max-w-[55%]">{carta.materia ?? "Geral"}</span>
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${due.urgente ? "text-amber-400" : "text-white/40"}`}>
            {due.urgente && <Flame className="h-2.5 w-2.5" />}
            {due.texto}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/30 border-t border-white/10 pt-1.5">
          <span>✓ {carta.acertos}</span>
          <span>✗ {carta.erros}</span>
          {taxa !== null && <span className={taxa >= 70 ? "text-emerald-400" : taxa >= 50 ? "text-amber-400" : "text-red-400"}>{taxa}%</span>}
          <span className="ml-auto">#{carta.repeticoes} rev.</span>
        </div>
      </div>
    </div>
  );
}
