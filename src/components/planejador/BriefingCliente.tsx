"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BriefingClienteData = {
  // Business — Operacional
  atividade: string;
  possuiSite: boolean;
  siteUrl: string;
  grupoEconomico: boolean;
  grupoEconomicoDesc: string;
  faturamentoMensalGerencial: string;
  faturamentoAnualGerencial: string;
  numFuncionarios: string;
  folhaGerencial: string;
  percFuncionariosInformais: string;
  margemGerencial: string;
  // Business — Comercial
  percVendasInterestadual: string;
  percVendasInternas: string;
  percVendasExportacao: string;
  percComprasInterestadual: string;
  percComprasInternas: string;
  percComprasImportacao: string;
  percVendasPF: string;
  percVendasPJ: string;
  inadimplencia: string;
  principaisFornecedores: string;
  principaisConcorrentes: string;
  // Business — Outros
  licitacoes: string;
  retencaoFonte: boolean;
  beneficioFiscal: boolean;
  beneficioFiscalDesc: string;
  trabalhoJuridicoPrevio: boolean;
  trabalhoJuridicoDesc: string;
  fluxoCaixa: string;
  outrasReceitas: string;
  principaisDespesas: string;
  // Compliance
  ajustesContabeis: boolean;
  ajustesContabeisDesc: string;
  segregaReceitas: boolean;
  segregaReceitasDesc: string;
  desoneraFolha: boolean;
  pagamentosSemNF: string;
  retiradaCaixaSocios: string;
  balanceteAtualizado: boolean;
  nivelOrganizacao: number;
  // Estratégia
  planoExpansaoReceita: boolean;
  planoExpansaoReceitaDesc: string;
  planoExpansaoCustos: boolean;
  planoExpansaoCustosDesc: string;
  // Holding
  possuiHolding: boolean;
  composicaoAtivos: string;
  estruturaReceitasHolding: string;
  atividadePreponHolding: string;
  quadroSocietario: string;
};

export const defaultBriefingCliente: BriefingClienteData = {
  atividade: "",
  possuiSite: false,
  siteUrl: "",
  grupoEconomico: false,
  grupoEconomicoDesc: "",
  faturamentoMensalGerencial: "",
  faturamentoAnualGerencial: "",
  numFuncionarios: "",
  folhaGerencial: "",
  percFuncionariosInformais: "",
  margemGerencial: "",
  percVendasInterestadual: "",
  percVendasInternas: "",
  percVendasExportacao: "",
  percComprasInterestadual: "",
  percComprasInternas: "",
  percComprasImportacao: "",
  percVendasPF: "",
  percVendasPJ: "",
  inadimplencia: "",
  principaisFornecedores: "",
  principaisConcorrentes: "",
  licitacoes: "",
  retencaoFonte: false,
  beneficioFiscal: false,
  beneficioFiscalDesc: "",
  trabalhoJuridicoPrevio: false,
  trabalhoJuridicoDesc: "",
  fluxoCaixa: "",
  outrasReceitas: "",
  principaisDespesas: "",
  ajustesContabeis: false,
  ajustesContabeisDesc: "",
  segregaReceitas: false,
  segregaReceitasDesc: "",
  desoneraFolha: false,
  pagamentosSemNF: "",
  retiradaCaixaSocios: "",
  balanceteAtualizado: false,
  nivelOrganizacao: 0,
  planoExpansaoReceita: false,
  planoExpansaoReceitaDesc: "",
  planoExpansaoCustos: false,
  planoExpansaoCustosDesc: "",
  possuiHolding: false,
  composicaoAtivos: "",
  estruturaReceitasHolding: "",
  atividadePreponHolding: "",
  quadroSocietario: "",
};

interface Props {
  data: BriefingClienteData;
  onChange: (data: BriefingClienteData) => void;
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

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 dark:text-gray-300 pr-4">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
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

export default function BriefingCliente({ data, onChange }: Props) {
  const set = (field: keyof BriefingClienteData, value: unknown) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="space-y-6">
      {/* Business — Operacional */}
      <SectionCard title="Business — Operacional" color="bg-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FL>Atividade</FL>
            <Select value={data.atividade} onValueChange={(v) => set("atividade", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="industria">Indústria</SelectItem>
                <SelectItem value="atacado">Atacado</SelectItem>
                <SelectItem value="varejo">Varejo</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="industria_varejo">Indústria + Varejo</SelectItem>
                <SelectItem value="comercio_servico">Comércio + Serviço</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <FL>Nº de Funcionários</FL>
            <Input
              value={data.numFuncionarios}
              onChange={(e) => set("numFuncionarios", e.target.value)}
              placeholder="Ex: 32"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Faturamento Mensal Gerencial</FL>
            <Input
              value={data.faturamentoMensalGerencial}
              onChange={(e) => set("faturamentoMensalGerencial", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Faturamento Anual Gerencial</FL>
            <Input
              value={data.faturamentoAnualGerencial}
              onChange={(e) => set("faturamentoAnualGerencial", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Folha de Pagamento Gerencial</FL>
            <Input
              value={data.folhaGerencial}
              onChange={(e) => set("folhaGerencial", e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-1.5">
            <FL>% Funcionários Informais (PF / PJ)</FL>
            <Input
              value={data.percFuncionariosInformais}
              onChange={(e) => set("percFuncionariosInformais", e.target.value)}
              placeholder="Ex: 20%"
            />
          </div>

          <div className="space-y-1.5">
            <FL>Margem Gerencial</FL>
            <Input
              value={data.margemGerencial}
              onChange={(e) => set("margemGerencial", e.target.value)}
              placeholder="Ex: 15%"
            />
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
          <SwitchRow
            label="Possui site institucional?"
            checked={data.possuiSite}
            onCheckedChange={(v) => set("possuiSite", v)}
          />
          {data.possuiSite && (
            <Input
              value={data.siteUrl}
              onChange={(e) => set("siteUrl", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          )}

          <SwitchRow
            label="Participa de grupo econômico?"
            checked={data.grupoEconomico}
            onCheckedChange={(v) => set("grupoEconomico", v)}
          />
          {data.grupoEconomico && (
            <Input
              value={data.grupoEconomicoDesc}
              onChange={(e) => set("grupoEconomicoDesc", e.target.value)}
              placeholder="Descreva o grupo econômico..."
              className="mt-1"
            />
          )}
        </div>
      </SectionCard>

      {/* Business — Comercial */}
      <SectionCard title="Business — Comercial" color="bg-cyan-500">
        <div className="space-y-4">
          <div>
            <FL>% Vendas — Interestadual / Interna / Exportação</FL>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Interestadual</span>
                <Input
                  value={data.percVendasInterestadual}
                  onChange={(e) => set("percVendasInterestadual", e.target.value)}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Interna</span>
                <Input
                  value={data.percVendasInternas}
                  onChange={(e) => set("percVendasInternas", e.target.value)}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Exportação</span>
                <Input
                  value={data.percVendasExportacao}
                  onChange={(e) => set("percVendasExportacao", e.target.value)}
                  placeholder="%"
                />
              </div>
            </div>
          </div>

          <div>
            <FL>% Compras — Interestadual / Interna / Importação</FL>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Interestadual</span>
                <Input
                  value={data.percComprasInterestadual}
                  onChange={(e) => set("percComprasInterestadual", e.target.value)}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Interna</span>
                <Input
                  value={data.percComprasInternas}
                  onChange={(e) => set("percComprasInternas", e.target.value)}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Importação</span>
                <Input
                  value={data.percComprasImportacao}
                  onChange={(e) => set("percComprasImportacao", e.target.value)}
                  placeholder="%"
                />
              </div>
            </div>
          </div>

          <div>
            <FL>% Vendas por Perfil de Cliente — PF / PJ</FL>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Pessoa Física</span>
                <Input
                  value={data.percVendasPF}
                  onChange={(e) => set("percVendasPF", e.target.value)}
                  placeholder="%"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400">Pessoa Jurídica</span>
                <Input
                  value={data.percVendasPJ}
                  onChange={(e) => set("percVendasPJ", e.target.value)}
                  placeholder="%"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <FL>Média de Inadimplência (último ano)</FL>
              <Input
                value={data.inadimplencia}
                onChange={(e) => set("inadimplencia", e.target.value)}
                placeholder="Ex: 3%"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FL>Principais Fornecedores</FL>
            <Textarea
              value={data.principaisFornecedores}
              onChange={(e) => set("principaisFornecedores", e.target.value)}
              placeholder="Liste os principais fornecedores..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <FL>Principais Concorrentes</FL>
            <Textarea
              value={data.principaisConcorrentes}
              onChange={(e) => set("principaisConcorrentes", e.target.value)}
              placeholder="Liste os principais concorrentes..."
              rows={2}
            />
          </div>
        </div>
      </SectionCard>

      {/* Business — Outros */}
      <SectionCard title="Business — Outros" color="bg-indigo-500">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <FL>Licitações</FL>
            <Select value={data.licitacoes} onValueChange={(v) => set("licitacoes", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não participa</SelectItem>
                <SelectItem value="sim">Sim, participa</SelectItem>
                <SelectItem value="pretende">Pretende participar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800">
            <SwitchRow
              label="Possui retenção na fonte?"
              checked={data.retencaoFonte}
              onCheckedChange={(v) => set("retencaoFonte", v)}
            />

            <SwitchRow
              label="Possui ou já possuiu Benefício Fiscal?"
              checked={data.beneficioFiscal}
              onCheckedChange={(v) => set("beneficioFiscal", v)}
            />
            {data.beneficioFiscal && (
              <Input
                value={data.beneficioFiscalDesc}
                onChange={(e) => set("beneficioFiscalDesc", e.target.value)}
                placeholder="Ex: Simples Nacional, ICMS diferido..."
                className="mt-1"
              />
            )}

            <SwitchRow
              label="Já realizou trabalho jurídico-tributário?"
              checked={data.trabalhoJuridicoPrevio}
              onCheckedChange={(v) => set("trabalhoJuridicoPrevio", v)}
            />
            {data.trabalhoJuridicoPrevio && (
              <Textarea
                value={data.trabalhoJuridicoDesc}
                onChange={(e) => set("trabalhoJuridicoDesc", e.target.value)}
                placeholder="Descreva o trabalho realizado..."
                rows={2}
                className="mt-1"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <FL>Fluxo de Caixa</FL>
            <Textarea
              value={data.fluxoCaixa}
              onChange={(e) => set("fluxoCaixa", e.target.value)}
              placeholder="Situação atual do fluxo de caixa..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <FL>Principais Outras Receitas</FL>
            <Input
              value={data.outrasReceitas}
              onChange={(e) => set("outrasReceitas", e.target.value)}
              placeholder="Ex: Aluguel de imóvel, receitas financeiras..."
            />
          </div>

          <div className="space-y-1.5">
            <FL>Principais Despesas / Custos</FL>
            <Textarea
              value={data.principaisDespesas}
              onChange={(e) => set("principaisDespesas", e.target.value)}
              placeholder="Ex: Folha 40%, Fornecedores 35%, Aluguel 10%..."
              rows={2}
            />
          </div>
        </div>
      </SectionCard>

      {/* Compliance */}
      <SectionCard title="Compliance" color="bg-amber-500">
        <div className="space-y-2">
          <SwitchRow
            label="Realiza ajustes no resultado contábil?"
            checked={data.ajustesContabeis}
            onCheckedChange={(v) => set("ajustesContabeis", v)}
          />
          {data.ajustesContabeis && (
            <Input
              value={data.ajustesContabeisDesc}
              onChange={(e) => set("ajustesContabeisDesc", e.target.value)}
              placeholder="Quais ajustes?"
              className="mb-1"
            />
          )}

          <SwitchRow
            label="Segrega receitas com outro CNPJ?"
            checked={data.segregaReceitas}
            onCheckedChange={(v) => set("segregaReceitas", v)}
          />
          {data.segregaReceitas && (
            <Input
              value={data.segregaReceitasDesc}
              onChange={(e) => set("segregaReceitasDesc", e.target.value)}
              placeholder="Qual CNPJ / qual atividade?"
              className="mb-1"
            />
          )}

          <SwitchRow
            label="Desonera folha pelo Simples Nacional?"
            checked={data.desoneraFolha}
            onCheckedChange={(v) => set("desoneraFolha", v)}
          />

          <SwitchRow
            label="Possui balancete atualizado?"
            checked={data.balanceteAtualizado}
            onCheckedChange={(v) => set("balanceteAtualizado", v)}
          />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
          <FL>Pagamentos / Recebimentos sem NF</FL>
          <Textarea
            value={data.pagamentosSemNF}
            onChange={(e) => set("pagamentosSemNF", e.target.value)}
            placeholder="Descreva situações de pagamentos ou recebimentos sem nota..."
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <FL>Retirada de Caixa dos Sócios</FL>
          <Input
            value={data.retiradaCaixaSocios}
            onChange={(e) => set("retiradaCaixaSocios", e.target.value)}
            placeholder="Ex: Antecipação de lucro R$ 10.000/mês"
          />
        </div>

        <div className="space-y-2">
          <FL>Nível de Organização Operacional / Administrativa (1 a 5)</FL>
          <RatingPicker
            value={data.nivelOrganizacao}
            onChange={(v) => set("nivelOrganizacao", v)}
          />
        </div>
      </SectionCard>

      {/* Estratégia */}
      <SectionCard title="Estratégia" color="bg-emerald-500">
        <div className="space-y-4">
          <div className="space-y-2">
            <SwitchRow
              label="Possui plano de expansão de receita?"
              checked={data.planoExpansaoReceita}
              onCheckedChange={(v) => set("planoExpansaoReceita", v)}
            />
            {data.planoExpansaoReceita && (
              <Textarea
                value={data.planoExpansaoReceitaDesc}
                onChange={(e) => set("planoExpansaoReceitaDesc", e.target.value)}
                placeholder="Descreva a expectativa de evolução de receita..."
                rows={2}
              />
            )}
          </div>

          <div className="space-y-2">
            <SwitchRow
              label="Possui plano de expansão de investimentos / custos?"
              checked={data.planoExpansaoCustos}
              onCheckedChange={(v) => set("planoExpansaoCustos", v)}
            />
            {data.planoExpansaoCustos && (
              <Textarea
                value={data.planoExpansaoCustosDesc}
                onChange={(e) => set("planoExpansaoCustosDesc", e.target.value)}
                placeholder="Descreva o plano de expansão de custos/investimentos..."
                rows={2}
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* Holding */}
      <SectionCard title="Holding" color="bg-purple-500">
        <SwitchRow
          label="Possui ou analisa estrutura de Holding?"
          checked={data.possuiHolding}
          onCheckedChange={(v) => set("possuiHolding", v)}
        />

        {data.possuiHolding && (
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1.5">
              <FL>Composição de Ativos</FL>
              <Textarea
                value={data.composicaoAtivos}
                onChange={(e) => set("composicaoAtivos", e.target.value)}
                placeholder="Imóveis, participações societárias, etc."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <FL>Estrutura de Receitas da Holding</FL>
              <Textarea
                value={data.estruturaReceitasHolding}
                onChange={(e) => set("estruturaReceitasHolding", e.target.value)}
                placeholder="Dividendos, aluguéis, etc."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <FL>Atividade / Receita Preponderante</FL>
              <Input
                value={data.atividadePreponHolding}
                onChange={(e) => set("atividadePreponHolding", e.target.value)}
                placeholder="Ex: Locação de imóveis"
              />
            </div>

            <div className="space-y-1.5">
              <FL>Composição do Quadro Societário</FL>
              <Textarea
                value={data.quadroSocietario}
                onChange={(e) => set("quadroSocietario", e.target.value)}
                placeholder="Sócios, percentuais, regime (PF/PJ), etc."
                rows={2}
              />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
