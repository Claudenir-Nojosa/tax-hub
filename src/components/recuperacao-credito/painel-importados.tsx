"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, FileText, FileSpreadsheet, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const brlCompacto = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ehPdfOuEfd = (nome: string) => /\.(pdf|txt|dec)$/i.test(nome);

type ArquivoCarregado = { id: string; name: string; size: number };

// Lista de arquivos carregados em formato compacto: por padrão mostra só a contagem + tamanho
// total, com um botão para expandir e ver/remover cada arquivo. Evita que a página cresça
// demais quando o usuário sobe muitos PDFs de uma vez.
export function ListaArquivosColapsavel({
  arquivos,
  onRemover,
}: {
  arquivos: ArquivoCarregado[];
  onRemover: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  if (arquivos.length === 0) return null;
  const tamanhoTotal = arquivos.reduce((s, a) => s + a.size, 0);

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {arquivos.length} {arquivos.length === 1 ? "arquivo carregado" : "arquivos carregados"}
          </p>
          <p className="text-xs text-gray-400">{formatBytes(tamanhoTotal)} no total</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0",
            !aberto && "-rotate-90"
          )}
        />
      </button>
      {aberto && (
        <div className="px-3 pb-3 space-y-1.5 animate-in fade-in duration-200">
          {arquivos.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              {ehPdfOuEfd(a.name) ? (
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <p className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-200 truncate">{a.name}</p>
              <p className="text-xs text-gray-400 flex-shrink-0">{formatBytes(a.size)}</p>
              <button
                type="button"
                onClick={() => onRemover(a.id)}
                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Seção colapsável com cabeçalho compacto (título + resumo) — evita que a página fique enorme
// quando há muitos tipos de declaração/anos importados. Fechada por padrão.
export function SecaoColapsavel({
  titulo,
  resumo,
  defaultAberto = false,
  acaoDireita,
  children,
}: {
  titulo: string;
  resumo?: string;
  defaultAberto?: boolean;
  acaoDireita?: ReactNode;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(defaultAberto);
  return (
    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 py-1 text-left group"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform group-hover:text-gray-600 dark:group-hover:text-gray-300",
              !aberto && "-rotate-90"
            )}
          />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            {titulo}
          </span>
          {resumo && <span className="text-xs text-gray-400 normal-case tracking-normal">· {resumo}</span>}
        </button>
        {acaoDireita}
      </div>
      {aberto && <div className="pt-2 animate-in fade-in duration-200">{children}</div>}
    </div>
  );
}

const CORES = {
  PIS: "#60a5fa",
  COFINS: "#818cf8",
  IRPJ: "#34d399",
  CSLL: "#fbbf24",
  Total: "#1f3864",
};

function TooltipCustom({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const itens = payload as { name: string; value: number; color: string }[];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {itens.map((it) => (
        <div key={it.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: it.color }} />
          <span className="text-gray-500 dark:text-gray-400">{it.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white ml-auto">{brlCompacto(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Barras simples por ano/período (uma série).
export function GraficoBarras({
  dados,
  chaveX,
  chaveValor,
  nome,
  cor = CORES.Total,
}: {
  dados: Record<string, string | number>[];
  chaveX: string;
  chaveValor: string;
  nome: string;
  cor?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 12 + 120)}>
      <BarChart data={dados} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <XAxis dataKey={chaveX} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => brlCompacto(Number(v))}
        />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} content={<TooltipCustom />} />
        <Bar dataKey={chaveValor} name={nome} fill={cor} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras empilhadas/agrupadas por ano com várias séries (ex.: PIS/COFINS/IRPJ/CSLL).
export function GraficoSeries({
  dados,
  chaveX,
  series,
  empilhado = true,
}: {
  dados: Record<string, string | number>[];
  chaveX: string;
  series: { chave: string; nome: string }[];
  empilhado?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <XAxis dataKey={chaveX} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => brlCompacto(Number(v))}
        />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} content={<TooltipCustom />} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            stackId={empilhado ? "a" : undefined}
            fill={CORES[s.nome as keyof typeof CORES] ?? CORES.Total}
            radius={empilhado ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={56}
          >
            {!empilhado && dados.map((_, i) => <Cell key={i} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
