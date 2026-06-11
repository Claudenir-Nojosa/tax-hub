// components/AdicionarEmpresaForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { calcularVencimento } from "@/lib/vencimentos";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

type ObrigacaoPrincipal = {
  id: string;
  nome: string;
  descricao: string;
};

type ObrigacaoPrincipalSelecionada = {
  id: string;
  nome: string;
  selecionada: boolean;
  diaVencimento: number;
  anteciparDiaNaoUtil: boolean;
  temMultiplos?: boolean;
  itens?: Array<{
    diaVencimento: number;
    anteciparDiaNaoUtil: boolean;
    descricao: string;
    uf: string;
  }>;
};

// Adicione este tipo no início do arquivo
type ObrigacaoAcessoria = {
  id: string;
  nome: string;
  descricao: string | null;
  periodicidade: string;
};

type ObrigacaoAcessoriaSelecionada = {
  id: string;
  nome: string;
  selecionada: boolean;
  diaVencimento: number;
  anteciparDiaNaoUtil: boolean;
};
// Esquemas de validação para cada etapa
const infoGeraisSchema = z.object({
  razaoSocial: z
    .string()
    .min(3, "Razão social deve ter pelo menos 3 caracteres"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(14),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  cidade: z.string(),
  uf: z.string().length(2, "UF inválida!"),
  regimeTributacao: z.enum([
    "SIMPLES_NACIONAL",
    "LUCRO_PRESUMIDO",
    "LUCRO_REAL",
  ]),
  responsavel: z
    .string()
    .min(3, "Responsável deve ter pelo menos 3 caracteres"),
  observacoes: z.string().optional(),
});

const obrigacoesAcessoriasSchema = z.object({
  obrigacoesAcessorias: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      selecionada: z.boolean(),
      diaVencimento: z.number().min(1).max(31),
      anteciparDiaNaoUtil: z.boolean(), // true = antecipa, false = posterga
    })
  ),
});

const icmsItemSchema = z.object({
  id: z.string().optional(),
  diaVencimento: z.number().min(1).max(31),
  anteciparDiaNaoUtil: z.boolean(),
  descricao: z.string().optional(),
  uf: z.string().length(2).optional(),
});

const obrigacoesPrincipaisSchema = z.object({
  obrigacoesPrincipais: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      selecionada: z.boolean(),
      temMultiplos: z.boolean().optional(),
      itens: z.array(icmsItemSchema).optional(),
      // Campos para quando temMultiplos=false
      diaVencimento: z.number().min(1).max(31).optional(),
      anteciparDiaNaoUtil: z.boolean().optional(),
    })
  ),
});

const parcelamentoSchema = z.object({
  parcelamentos: z
    .array(
      z.object({
        ambito: z.enum(["FEDERAL", "ESTADUAL", "MUNICIPAL"]),
        debitoConsolidado: z.number().min(0),
        numeroParcelas: z.number().min(1),
        dataVencimento: z.string(), // Mantém como string para o input date
        observacoes: z.string().optional(),
      })
    )
    .optional(), // Torna opcional para permitir nenhum parcelamento
});

const formSchema = infoGeraisSchema
  .merge(obrigacoesAcessoriasSchema)
  .merge(obrigacoesPrincipaisSchema)
  .merge(parcelamentoSchema);

type FormValues = z.infer<typeof infoGeraisSchema> &
  z.infer<typeof obrigacoesAcessoriasSchema> &
  z.infer<typeof obrigacoesPrincipaisSchema> &
  z.infer<typeof parcelamentoSchema>;

// Dados mockados para as obrigações (você pode buscar do banco de dados)
const obrigacoesAcessorias = [
  { id: "1", nome: "EFD ICMS IPI", periodicidade: "Mensal" },
  { id: "3", nome: "DeSTDA", periodicidade: "Mensal" },
  { id: "2", nome: "EFD Contribuições", periodicidade: "Mensal" },
  { id: "4", nome: "GIA", periodicidade: "Mensal" },
  { id: "5", nome: "DIME", periodicidade: "Mensal" },
];

const obrigacoesPrincipais = [
  {
    id: "1",
    nome: "ICMS",
    descricao: "Imposto sobre Circulação de Mercadorias",
  },
  { id: "2", nome: "PIS", descricao: "Programa de Integração Social" },
  {
    id: "3",
    nome: "COFINS",
    descricao: "Contribuição para Financiamento da Seguridade Social",
  },
  {
    id: "4",
    nome: "IPI",
    descricao: "Imposto sobre Produtos Industrializados",
  },
];

const estadosBrasileiros = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

export function AdicionarEmpresaForm() {
  const [step, setStep] = useState(1);
  const session = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [obrigacoesAcessorias, setObrigacoesAcessorias] = useState<
    ObrigacaoAcessoria[]
  >([]);
  const [loadingObrigacoes, setLoadingObrigacoes] = useState(true);
  const [obrigacoesPrincipais, setObrigacoesPrincipais] = useState<
    ObrigacaoPrincipal[]
  >([]);
  const [loadingObrigacoesPrincipais, setLoadingObrigacoesPrincipais] =
    useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      razaoSocial: "",
      cnpj: "",
      email: "",
      cidade: "",
      uf: "",
      regimeTributacao: "SIMPLES_NACIONAL",
      responsavel: "",
      observacoes: "",
      obrigacoesAcessorias: [],
      obrigacoesPrincipais: [] as ObrigacaoPrincipalSelecionada[],
      parcelamentos: [],
    },
  });
  // Carregar obrigações acessórias do banco de dados
  useEffect(() => {
    async function loadObrigacoes() {
      try {
        const response = await fetch("/api/obrigacoes-acessorias");
        if (!response.ok) {
          throw new Error("Erro ao carregar obrigações");
        }
        const data = await response.json();
        setObrigacoesAcessorias(data);

        // Atualizar valores do formulário com as obrigações reais
        form.setValue(
          "obrigacoesAcessorias",
          data.map((obrigacao: ObrigacaoAcessoria) => ({
            id: obrigacao.id,
            nome: obrigacao.nome,
            selecionada: false,
            diaVencimento: 20,
            anteciparDiaNaoUtil: false,
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar obrigações:", error);
        toast.error("Erro ao carregar obrigações acessórias");
      } finally {
        setLoadingObrigacoes(false);
      }
    }

    loadObrigacoes();
  }, [form]);
  useEffect(() => {
    async function loadObrigacoesPrincipais() {
      try {
        const response = await fetch("/api/obrigacoes-principais");
        if (!response.ok) throw new Error("Erro ao carregar");
        const data: ObrigacaoPrincipal[] = await response.json();
        setObrigacoesPrincipais(data);

        form.setValue(
          "obrigacoesPrincipais",
          data.map((op) => ({
            id: op.id,
            nome: op.nome,
            selecionada: false,
            diaVencimento: 20,
            anteciparDiaNaoUtil: false,
          }))
        );
      } catch (error) {
        toast.error("Erro ao carregar obrigações principais");
      } finally {
        setLoadingObrigacoesPrincipais(false);
      }
    }

    loadObrigacoesPrincipais();
  }, [form]);
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      console.log("[FRONT] Iniciando submissão do formulário...");

      console.log("[FRONT] Sessão obtida:", {
        userId: session?.data?.user?.id,
        email: session?.data?.user?.email,
      });

      // Log dos dados do formulário antes de processar
      console.log(
        "[FRONT] Dados do formulário (raw):",
        JSON.parse(JSON.stringify(data))
      );

      const empresaData = {
        ...data,
        usuarioId: session?.data?.user?.id,
        obrigacoesAcessorias: data.obrigacoesAcessorias
          .filter((obrigacao) => obrigacao.selecionada)
          .map((obrigacao) => ({
            obrigacaoAcessoriaId: obrigacao.id,
            diaVencimento: obrigacao.diaVencimento,
            anteciparDiaNaoUtil: obrigacao.anteciparDiaNaoUtil,
          })),

        obrigacoesPrincipais: data.obrigacoesPrincipais
          .filter((obrigacao) => obrigacao.selecionada)
          .flatMap((obrigacao) => {
            // Tratamento especial para ICMS com múltiplos itens
            if (
              obrigacao.nome === "ICMS" &&
              obrigacao.temMultiplos &&
              obrigacao.itens
            ) {
              return obrigacao.itens.map((item) => ({
                obrigacaoPrincipalId: obrigacao.id,
                diaVencimento: item.diaVencimento,
                anteciparDiaNaoUtil: item.anteciparDiaNaoUtil,
                aliquota: 0, // Valor padrão
                descricao: item.descricao || null,
              }));
            }

            // Para outras obrigações ou ICMS sem múltiplos itens
            return {
              obrigacaoPrincipalId: obrigacao.id,
              diaVencimento: obrigacao.diaVencimento || 20,
              anteciparDiaNaoUtil: obrigacao.anteciparDiaNaoUtil || false,
              aliquota: 0, // Valor padrão
              descricao: null,
              uf: null,
            };
          }),

        parcelamentos:
          data.parcelamentos?.map((parcelamento) => ({
            ambito: parcelamento.ambito,
            debitoConsolidado: parcelamento.debitoConsolidado,
            numeroParcelas: parcelamento.numeroParcelas,
            dataVencimento: parcelamento.dataVencimento,
            observacoes: parcelamento.observacoes || null,
          })) || [],
      };

      // Log para debug
      console.log(
        "Dados enviados para API:",
        JSON.stringify(empresaData, null, 2)
      );

      const response = await fetch("/api/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(empresaData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro na resposta:", errorData);
        throw new Error(errorData.message || "Erro ao cadastrar empresa");
      }

      const result = await response.json();
      console.log("[FRONT] Empresa cadastrada com sucesso:", result);

      toast.success("Empresa cadastrada com sucesso!", {
        action: {
          label: "Visualizar",
          onClick: () => {
            // router.push(`/empresas/${result.id}`);
          },
        },
      });

      form.reset();
      setStep(1);
    } catch (error) {
      console.error("[FRONT] Erro completo no onSubmit:", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(
        error instanceof Error ? error.message : "Erro ao cadastrar empresa"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async (e?: React.FormEvent) => {
    // Valida os campos da etapa atual antes de avançar
    let isValid = true;
    if (e) {
      e.preventDefault(); // Previne o submit do formulário
    }
    if (step === 1) {
      isValid = await form.trigger([
        "razaoSocial",
        "cnpj",
        "uf",
        "regimeTributacao",
        "responsavel",
      ]);
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Corrigindo a função addParcelamento
  const addParcelamento = () => {
    const current = form.getValues("parcelamentos") || [];
    form.setValue("parcelamentos", [
      ...current,
      {
        ambito: "FEDERAL", // Valor padrão válido
        debitoConsolidado: 0,
        numeroParcelas: 1,
        dataVencimento: new Date().toISOString().split("T")[0], // Formato YYYY-MM-DD
        observacoes: "",
      },
    ]);
  };

  return (
    <Card className="max-w-3xl mx-auto dark:bg-gray-950">
      <CardHeader>
        <CardTitle className="text-xl">
          <h1 className="text-2xl font-bold mb-6">Adicionar Nova Empresa</h1>
          {step === 1 && "Informações Gerais"}
          {step === 2 && "Obrigações Acessórias"}
          {step === 3 && "Obrigações Principais"}
          {step === 4 && "Parcelamentos"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Etapa 1: Informações Gerais */}
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="razaoSocial"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Razão Social*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail*</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="exemplo@dominio.com"
                          className={
                            form.formState.errors.email ? "border-red-500" : ""
                          }
                        />
                      </FormControl>
                      {form.formState.errors.email && (
                        <FormMessage className="text-red-500">
                          {form.formState.errors.email.message}
                        </FormMessage>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estadosBrasileiros.map((estado) => (
                            <SelectItem key={estado.sigla} value={estado.sigla}>
                              {estado.sigla} - {estado.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regimeTributacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Tributação</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o regime tributário" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIMPLES_NACIONAL">
                            Simples Nacional
                          </SelectItem>
                          <SelectItem value="LUCRO_PRESUMIDO">
                            Lucro Presumido
                          </SelectItem>
                          <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CLAUDENIR">Claudenir</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Etapa 2: Obrigações Acessórias */}
            {/* Etapa 2: Obrigações Acessórias */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Obrigações Acessórias</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione as obrigações e configure os vencimentos
                </p>

                {loadingObrigacoes ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Carregando obrigações...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form
                      .watch("obrigacoesAcessorias")
                      ?.map((obrigacao, index) => {
                        const obrigacaoInfo = obrigacoesAcessorias.find(
                          (oa) => oa.id === obrigacao.id
                        );

                        return (
                          <div
                            key={obrigacao.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={obrigacao.selecionada}
                                  onCheckedChange={(checked) => {
                                    form.setValue(
                                      `obrigacoesAcessorias.${index}.selecionada`,
                                      !!checked
                                    );
                                  }}
                                />
                                <div>
                                  <h4 className="font-medium">
                                    {obrigacaoInfo?.nome || obrigacao.nome}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {obrigacaoInfo?.periodicidade || "Mensal"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {obrigacao.selecionada && (
                              <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name={`obrigacoesAcessorias.${index}.diaVencimento`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Dia base do vencimento
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={field.value}
                                            onChange={(e) => {
                                              const value = parseInt(
                                                e.target.value
                                              );
                                              field.onChange(
                                                isNaN(value)
                                                  ? 1
                                                  : Math.min(
                                                      Math.max(value, 1),
                                                      31
                                                    )
                                              );
                                            }}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`obrigacoesAcessorias.${index}.anteciparDiaNaoUtil`}
                                    render={({ field }) => (
                                      <FormItem className="space-y-3">
                                        <FormLabel>
                                          Ajuste para dia não útil
                                        </FormLabel>
                                        <FormControl>
                                          <RadioGroup
                                            onValueChange={(value) =>
                                              field.onChange(
                                                value === "antecipar"
                                              )
                                            }
                                            value={
                                              field.value
                                                ? "antecipar"
                                                : "postergar"
                                            }
                                            className="flex flex-col space-y-1"
                                          >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="antecipar" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Antecipar para o último dia útil
                                                anterior
                                              </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value="postergar" />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                Postergar para o próximo dia
                                                útil
                                              </FormLabel>
                                            </FormItem>
                                          </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Pré-visualização dos vencimentos */}
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2">
                                    Previsão de Vencimentos para o Ano
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Array.from({ length: 12 }).map(
                                      (_, monthIndex) => {
                                        const month = monthIndex + 1;
                                        const mesCompetencia = monthIndex + 1;
                                        const anoAtual =
                                          new Date().getFullYear();
                                        const diaBase = form.watch(
                                          `obrigacoesAcessorias.${index}.diaVencimento`
                                        );
                                        const antecipar = form.watch(
                                          `obrigacoesAcessorias.${index}.anteciparDiaNaoUtil`
                                        );

                                        const dataVencimento =
                                          calcularVencimento(
                                            mesCompetencia,
                                            anoAtual,
                                            diaBase,
                                            antecipar
                                          );

                                        return (
                                          <div key={month} className="text-sm">
                                            <span className="font-medium">
                                              {new Date(
                                                0,
                                                month - 1
                                              ).toLocaleString("pt-BR", {
                                                month: "short",
                                              })}
                                            </span>
                                            <div>{dataVencimento}</div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Botão para recarregar obrigações em caso de erro */}
                {!loadingObrigacoes && obrigacoesAcessorias.length === 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Não foi possível carregar as obrigações
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setLoadingObrigacoes(true);
                        try {
                          const response = await fetch(
                            "/api/obrigacoes-acessorias"
                          );
                          if (!response.ok) throw new Error("Erro ao carregar");
                          const data = await response.json();
                          setObrigacoesAcessorias(data);
                          form.setValue(
                            "obrigacoesAcessorias",
                            data.map((oa: any) => ({
                              id: oa.id,
                              nome: oa.nome,
                              selecionada: false,
                              diaVencimento: 20,
                              anteciparDiaNaoUtil: false,
                            }))
                          );
                        } catch (error) {
                          toast.error("Erro ao recarregar obrigações");
                        } finally {
                          setLoadingObrigacoes(false);
                        }
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Etapa 3: Obrigações Principais */}
            {/* Etapa 3: Obrigações Principais */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Obrigações Principais</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione as obrigações e configure os vencimentos
                </p>

                {loadingObrigacoesPrincipais ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Carregando obrigações...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form
                      .watch("obrigacoesPrincipais")
                      ?.map((obrigacao, index) => {
                        const obrigacaoInfo = obrigacoesPrincipais.find(
                          (op) => op.id === obrigacao.id
                        );

                        return (
                          <div
                            key={obrigacao.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={obrigacao.selecionada}
                                  onCheckedChange={(checked) => {
                                    form.setValue(
                                      `obrigacoesPrincipais.${index}.selecionada`,
                                      !!checked
                                    );
                                  }}
                                />
                                <div>
                                  <h4 className="font-medium">
                                    {obrigacaoInfo?.nome || obrigacao.nome}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {obrigacaoInfo?.descricao ||
                                      "Obrigação principal"}
                                  </p>
                                </div>
                              </div>

                              {obrigacaoInfo?.nome === "ICMS" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const current = form.getValues(
                                      `obrigacoesPrincipais.${index}`
                                    );
                                    const newValue = !current.temMultiplos;
                                    form.setValue(
                                      `obrigacoesPrincipais.${index}.temMultiplos`,
                                      newValue
                                    );

                                    if (newValue && !current.itens) {
                                      form.setValue(
                                        `obrigacoesPrincipais.${index}.itens`,
                                        [
                                          {
                                            diaVencimento:
                                              current.diaVencimento || 20,
                                            anteciparDiaNaoUtil:
                                              current.anteciparDiaNaoUtil ||
                                              false,
                                            descricao: "ICMS Principal",
                                            uf: "",
                                          },
                                        ]
                                      );
                                    }
                                  }}
                                >
                                  {obrigacao.temMultiplos
                                    ? "Remover múltiplos"
                                    : "Tem mais de um ICMS"}
                                </Button>
                              )}
                            </div>

                            {obrigacao.selecionada && (
                              <div className="mt-4 space-y-4">
                                {/* Modo múltiplos ICMS */}
                                {obrigacaoInfo?.nome === "ICMS" &&
                                obrigacao.temMultiplos ? (
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-medium">
                                        Itens de ICMS
                                      </h4>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const currentItems =
                                            form.getValues(
                                              `obrigacoesPrincipais.${index}.itens`
                                            ) || [];
                                          form.setValue(
                                            `obrigacoesPrincipais.${index}.itens`,
                                            [
                                              ...currentItems,
                                              {
                                                diaVencimento: 20,
                                                anteciparDiaNaoUtil: false,
                                                descricao: "",
                                                uf: "",
                                              },
                                            ]
                                          );
                                        }}
                                      >
                                        Adicionar ICMS
                                      </Button>
                                    </div>

                                    {obrigacao.itens?.map((item, itemIndex) => (
                                      <div
                                        key={itemIndex}
                                        className="border p-4 rounded-lg space-y-4"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <FormField
                                            control={form.control}
                                            name={`obrigacoesPrincipais.${index}.itens.${itemIndex}.descricao`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>
                                                  Descrição*
                                                </FormLabel>
                                                <FormControl>
                                                  <Input
                                                    {...field}
                                                    placeholder="Ex: ICMS Normal, ICMS ST"
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <FormField
                                            control={form.control}
                                            name={`obrigacoesPrincipais.${index}.itens.${itemIndex}.diaVencimento`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>
                                                  Dia base do vencimento
                                                </FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    value={field.value}
                                                    onChange={(e) => {
                                                      const value = parseInt(
                                                        e.target.value
                                                      );
                                                      field.onChange(
                                                        isNaN(value)
                                                          ? 1
                                                          : Math.min(
                                                              Math.max(
                                                                value,
                                                                1
                                                              ),
                                                              31
                                                            )
                                                      );
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name={`obrigacoesPrincipais.${index}.itens.${itemIndex}.anteciparDiaNaoUtil`}
                                            render={({ field }) => (
                                              <FormItem className="space-y-3">
                                                <FormLabel>
                                                  Ajuste para dia não útil
                                                </FormLabel>
                                                <FormControl>
                                                  <RadioGroup
                                                    onValueChange={(value) =>
                                                      field.onChange(
                                                        value === "antecipar"
                                                      )
                                                    }
                                                    value={
                                                      field.value
                                                        ? "antecipar"
                                                        : "postergar"
                                                    }
                                                    className="flex flex-col space-y-1"
                                                  >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                      <FormControl>
                                                        <RadioGroupItem value="antecipar" />
                                                      </FormControl>
                                                      <FormLabel className="font-normal">
                                                        Antecipar para o último
                                                        dia útil anterior
                                                      </FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                      <FormControl>
                                                        <RadioGroupItem value="postergar" />
                                                      </FormControl>
                                                      <FormLabel className="font-normal">
                                                        Postergar para o próximo
                                                        dia útil
                                                      </FormLabel>
                                                    </FormItem>
                                                  </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>

                                        {/* Pré-visualização dos vencimentos */}
                                        <div className="mt-4">
                                          <h4 className="text-sm font-medium mb-2">
                                            Previsão de Vencimentos
                                            (Competência/Vencimento)
                                          </h4>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {Array.from({ length: 12 }).map(
                                              (_, monthIndex) => {
                                                const mesCompetencia =
                                                  monthIndex + 1;
                                                const anoAtual =
                                                  new Date().getFullYear();
                                                const diaBase =
                                                  form.watch(
                                                    `obrigacoesPrincipais.${index}.itens.${itemIndex}.diaVencimento`
                                                  ) || 20;
                                                const antecipar =
                                                  form.watch(
                                                    `obrigacoesPrincipais.${index}.itens.${itemIndex}.anteciparDiaNaoUtil`
                                                  ) || false;

                                                const dataVencimento =
                                                  calcularVencimento(
                                                    mesCompetencia,
                                                    anoAtual,
                                                    diaBase,
                                                    antecipar
                                                  );

                                                return (
                                                  <div
                                                    key={monthIndex}
                                                    className="text-sm"
                                                  >
                                                    <span className="font-medium">
                                                      {new Date(
                                                        0,
                                                        monthIndex
                                                      ).toLocaleString(
                                                        "pt-BR",
                                                        {
                                                          month: "short",
                                                        }
                                                      )}
                                                    </span>
                                                    <div className="text-green-600 font-medium">
                                                      {dataVencimento || "N/A"}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        </div>

                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            const currentItems =
                                              form.getValues(
                                                `obrigacoesPrincipais.${index}.itens`
                                              ) || [];
                                            if (currentItems.length > 1) {
                                              form.setValue(
                                                `obrigacoesPrincipais.${index}.itens`,
                                                currentItems.filter(
                                                  (_, i) => i !== itemIndex
                                                )
                                              );
                                            } else {
                                              toast.warning(
                                                "É necessário ter pelo menos um item de ICMS"
                                              );
                                            }
                                          }}
                                        >
                                          Remover ICMS
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Modo único (para ICMS ou outras obrigações) */
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField
                                        control={form.control}
                                        name={`obrigacoesPrincipais.${index}.diaVencimento`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>
                                              Dia base do vencimento
                                            </FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                min="1"
                                                max="31"
                                                value={field.value}
                                                onChange={(e) => {
                                                  const value = parseInt(
                                                    e.target.value
                                                  );
                                                  field.onChange(
                                                    isNaN(value)
                                                      ? 20
                                                      : Math.min(
                                                          Math.max(value, 1),
                                                          31
                                                        )
                                                  );
                                                }}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name={`obrigacoesPrincipais.${index}.anteciparDiaNaoUtil`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-3">
                                            <FormLabel>
                                              Ajuste para dia não útil
                                            </FormLabel>
                                            <FormControl>
                                              <RadioGroup
                                                onValueChange={(value) =>
                                                  field.onChange(
                                                    value === "antecipar"
                                                  )
                                                }
                                                value={
                                                  field.value
                                                    ? "antecipar"
                                                    : "postergar"
                                                }
                                                className="flex flex-col space-y-1"
                                              >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                  <FormControl>
                                                    <RadioGroupItem value="antecipar" />
                                                  </FormControl>
                                                  <FormLabel className="font-normal">
                                                    Antecipar para o último dia
                                                    útil anterior
                                                  </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                  <FormControl>
                                                    <RadioGroupItem value="postergar" />
                                                  </FormControl>
                                                  <FormLabel className="font-normal">
                                                    Postergar para o próximo dia
                                                    útil
                                                  </FormLabel>
                                                </FormItem>
                                              </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium mb-2">
                                        Previsão de Vencimentos
                                        (Competência/Vencimento)
                                      </h4>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {Array.from({ length: 12 }).map(
                                          (_, monthIndex) => {
                                            const mesCompetencia =
                                              monthIndex + 1;
                                            const anoAtual =
                                              new Date().getFullYear();
                                            const diaBase =
                                              form.watch(
                                                `obrigacoesPrincipais.${index}.diaVencimento`
                                              ) || 20;
                                            const antecipar =
                                              form.watch(
                                                `obrigacoesPrincipais.${index}.anteciparDiaNaoUtil`
                                              ) || false;

                                            const dataVencimento =
                                              calcularVencimento(
                                                mesCompetencia,
                                                anoAtual,
                                                diaBase,
                                                antecipar
                                              );

                                            return (
                                              <div
                                                key={monthIndex}
                                                className="text-sm"
                                              >
                                                <span className="font-medium">
                                                  {new Date(
                                                    0,
                                                    monthIndex
                                                  ).toLocaleString("pt-BR", {
                                                    month: "short",
                                                  })}
                                                </span>
                                                <div className="text-green-600 font-medium">
                                                  {dataVencimento || "N/A"}
                                                </div>
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Botão para recarregar obrigações em caso de erro */}
                {!loadingObrigacoesPrincipais &&
                  obrigacoesPrincipais.length === 0 && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Não foi possível carregar as obrigações principais
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setLoadingObrigacoesPrincipais(true);
                          try {
                            const response = await fetch(
                              "/api/obrigacoes-principais"
                            );
                            if (!response.ok)
                              throw new Error("Erro ao carregar");
                            const data = await response.json();
                            setObrigacoesPrincipais(data);
                            form.setValue(
                              "obrigacoesPrincipais",
                              data.map((op: any) => ({
                                id: op.id,
                                nome: op.nome,
                                selecionada: false,
                                diaVencimento: 20,
                                anteciparDiaNaoUtil: false,
                              }))
                            );
                          } catch (error) {
                            toast.error(
                              "Erro ao recarregar obrigações principais"
                            );
                          } finally {
                            setLoadingObrigacoesPrincipais(false);
                          }
                        }}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  )}
              </div>
            )}

            {/* Etapa 4: Parcelamentos */}
            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Parcelamentos</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione os parcelamentos da empresa
                </p>

                <div className="space-y-4">
                  {form.watch("parcelamentos")?.map((parcelamento, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">
                          Parcelamento {index + 1}
                        </h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const current =
                              form.getValues("parcelamentos") || [];
                            form.setValue(
                              "parcelamentos",
                              current.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          Remover
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`parcelamentos.${index}.ambito`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Âmbito*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o âmbito" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="FEDERAL">
                                    Federal
                                  </SelectItem>
                                  <SelectItem value="ESTADUAL">
                                    Estadual
                                  </SelectItem>
                                  <SelectItem value="MUNICIPAL">
                                    Municipal
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`parcelamentos.${index}.debitoConsolidado`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Débito Consolidado (R$)*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`parcelamentos.${index}.numeroParcelas`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Parcelas*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`parcelamentos.${index}.dataVencimento`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Data do Primeiro Vencimento*
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.value)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`parcelamentos.${index}.observacoes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Observações</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Informações adicionais sobre o parcelamento"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addParcelamento} // Usa a função corrigida
                  >
                    Adicionar Parcelamento
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
              ) : (
                <div></div>
              )}
              {step < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={isSubmitting}
                >
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Empresa"}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
