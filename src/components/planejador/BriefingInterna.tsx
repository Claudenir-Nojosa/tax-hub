"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BriefingInternaData = {
  // Business
  regimeFederal: string;
  regimeEstadualMunicipal: string;
  uf: string;
  cnaePrincipal: string;
  cnaeSecundario: string;
  ncmPrincipais: string;
  beneficiosSetoriais: string;
  faturamentoFiscalMensal: string;
  mesReferenciaFiscal: string;
  faturamentoFiscalAnual: string;
  mediaFaturamentoMensal: string;
  mediaTributosMensal: string;
  numFuncionariosFormais: string;
  mediaBcPrevidencia: string;
  qualidadeInformacoesFiscais: number;
  // Compliance
  situacaoFiscalFederal: string;
  situacaoFiscalEstadual: string;
  // Estratégia
  aliquotaEfetivaTotal: string;
};

export const defaultBriefingInterna: BriefingInternaData = {
  regimeFederal: "",
  regimeEstadualMunicipal: "",
  uf: "",
  cnaePrincipal: "",
  cnaeSecundario: "",
  ncmPrincipais: "",
  beneficiosSetoriais: "",
  faturamentoFiscalMensal: "",
  mesReferenciaFiscal: "",
  faturamentoFiscalAnual: "",
  mediaFaturamentoMensal: "",
  mediaTributosMensal: "",
  numFuncionariosFormais: "",
  mediaBcPrevidencia: "",
  qualidadeInformacoesFiscais: 0,
  situacaoFiscalFederal: "",
  situacaoFiscalEstadual: "",
  aliquotaEfetivaTotal: "",
};

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  data: BriefingInternaData;
  onChange: (data: BriefingInternaData) => void;
}

function SectionCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className={`w-1 h-5 ${color} rounded-full flex-shrink-0`} />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FL({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      {children}
    </Label>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-colors ${
            value === n
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function BriefingInterna({ data, onChange }: Props) {
  const set = (field: keyof BriefingInternaData, value: unknown) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      {/* Business */}
      <SectionCard title="Business" color="bg-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FL>Regime Atual — Federal</FL>
            <Select value={data.regimeFederal} onValueChange={(v) => set("regimeFederal", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mei">MEI</SelectItem>
                <SelectItem value="simples">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FL>Regime Atual — Estadual / Municipal</FL>
            <Input
              value={data.regimeEstadualMunicipal}
              onChange={(e) => set("regimeEstadualMunicipal", e.target.value)}
              placeholder="Ex: ICMS Normal, ISS, Simples"
            />
          </div>

          <div className="space-y-1.5">
            <FL>UF</FL>
            <Select value={data.uf} onValueChange={(v) => set("uf", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {UF_OPTIONS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FL>CNAE Principal</FL>
            <Input
              value={data.cnaePrincipal}
              onChange={(e) => set("cnaePrincipal", e.target.value)}
              placeholder="Ex: 47.12-1-00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>CNAE Secundário</FL>
            <Input
              value={data.cnaeSecundario}
              onChange={(e) => set("cnaeSecundario", e.target.value)}
              placeholder="Ex: 46.91-5-00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>NCM Principais Produtos</FL>
            <Input
              value={data.ncmPrincipais}
              onChange={(e) => set("ncmPrincipais", e.target.value)}
              placeholder="Ex: 1905.90.90"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Faturamento Fiscal Mensal</FL>
            <div className="flex gap-2">
              <Input
                value={data.faturamentoFiscalMensal}
                onChange={(e) => set("faturamentoFiscalMensal", e.target.value)}
                placeholder="R$ 0,00"
                className="flex-1"
              />
              <Input
                value={data.mesReferenciaFiscal}
                onChange={(e) => set("mesReferenciaFiscal", e.target.value)}
                placeholder="MM/AAAA"
                className="w-28"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FL>Faturamento Fiscal Anual (ano corrente)</FL>
            <Input
              value={data.faturamentoFiscalAnual}
              onChange={(e) => set("faturamentoFiscalAnual", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Média Faturamento Mensal (3 últimos meses)</FL>
            <Input
              value={data.mediaFaturamentoMensal}
              onChange={(e) => set("mediaFaturamentoMensal", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Média Tributos Mensais (3 últimos meses)</FL>
            <Input
              value={data.mediaTributosMensal}
              onChange={(e) => set("mediaTributosMensal", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Qtde Funcionários Formais</FL>
            <Input
              value={data.numFuncionariosFormais}
              onChange={(e) => set("numFuncionariosFormais", e.target.value)}
              placeholder="Ex: 32"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Média BC Contrib. Previdenciária — Folha (3 meses)</FL>
            <Input
              value={data.mediaBcPrevidencia}
              onChange={(e) => set("mediaBcPrevidencia", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <FL>Benefícios Setoriais</FL>
          <Textarea
            value={data.beneficiosSetoriais}
            onChange={(e) => set("beneficiosSetoriais", e.target.value)}
            placeholder="Ex: IPI reduzido, ICMS diferido por lei estadual..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <FL>Qualidade das Informações Fiscais (1 a 5)</FL>
          <RatingPicker
            value={data.qualidadeInformacoesFiscais}
            onChange={(v) => set("qualidadeInformacoesFiscais", v)}
          />
        </div>
      </SectionCard>

      {/* Compliance */}
      <SectionCard title="Compliance" color="bg-amber-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FL>Situação Fiscal Federal</FL>
            <Select
              value={data.situacaoFiscalFederal}
              onValueChange={(v) => set("situacaoFiscalFederal", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="irregular">Irregular</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="a_verificar">A verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FL>Situação Fiscal Estadual / Municipal</FL>
            <Select
              value={data.situacaoFiscalEstadual}
              onValueChange={(v) => set("situacaoFiscalEstadual", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="irregular">Irregular</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="a_verificar">A verificar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Estratégia */}
      <SectionCard title="Estratégia" color="bg-emerald-500">
        <div className="max-w-xs space-y-1.5">
          <FL>Alíquota Efetiva Total — média 3 últimos meses</FL>
          <Input
            value={data.aliquotaEfetivaTotal}
            onChange={(e) => set("aliquotaEfetivaTotal", e.target.value)}
            placeholder="Ex: 12,5%"
          />
        </div>
      </SectionCard>
    </div>
  );
}
