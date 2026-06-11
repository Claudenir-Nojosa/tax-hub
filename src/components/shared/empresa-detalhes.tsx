"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Calendar,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState } from "react";
import { formatResponsavel } from "@/lib/utils";

interface EmpresaDetalhesProps {
  empresa: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    inscricaoEstadual?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    uf: string;
    cep?: string;
    regimeTributacao: string;
    responsavel: string;
    observacoes?: string;
    obrigacoesAcessorias: Array<{
      id: string;
      obrigacaoAcessoria: {
        nome: string;
      };
      diaVencimento: number;
      anteciparDiaNaoUtil: boolean;
    }>;
    obrigacoesPrincipais: Array<{
      id: string;
      obrigacaoPrincipal: {
        nome: string;
      };
      diaVencimento: number;
      anteciparDiaNaoUtil: boolean;
      aliquota?: number;
    }>;
    parcelamentos: Array<{
      id: string;
      numero: number;
      valor: number;
      dataVencimento: string;
      status: string;
    }>;
  };
}

export function EmpresaDetalhes({ empresa }: EmpresaDetalhesProps) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [vencimentos, setVencimentos] = useState<
    { mes: string; data: string }[]
  >([]);
  const [obrigacaoNome, setObrigacaoNome] = useState("");

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  };

  const formatRegime = (regime: string) => {
    const regimes: Record<string, string> = {
      SIMPLES_NACIONAL: "Simples Nacional",
      LUCRO_PRESUMIDO: "Lucro Presumido",
      LUCRO_REAL: "Lucro Real",
    };
    return regimes[regime] || regime;
  };

  const calcularVencimentos = (
    diaVencimento: number,
    antecipar: boolean,
    nome: string
  ) => {
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const vencimentosCalculados = [];

    for (let mes = 0; mes < 12; mes++) {
      // Calcula o mês seguinte para o vencimento
      const mesVencimento = (mes + 1) % 12; // Isso garante que após dezembro (11) voltamos para janeiro (0)
      let anoVencimento = anoAtual + Math.floor((mes + 1) / 12); // Incrementa o ano se passarmos de dezembro

      // Cria a data do vencimento (mês seguinte)
      const dataVencimento = new Date(
        anoVencimento,
        mesVencimento,
        diaVencimento
      );

      // Ajuste para dia útil (simplificado)
      if (antecipar && dataVencimento.getDay() === 0) {
        // Domingo
        dataVencimento.setDate(dataVencimento.getDate() - 2);
      } else if (antecipar && dataVencimento.getDay() === 6) {
        // Sábado
        dataVencimento.setDate(dataVencimento.getDate() - 1);
      } else if (!antecipar && dataVencimento.getDay() === 0) {
        // Domingo
        dataVencimento.setDate(dataVencimento.getDate() + 1);
      } else if (!antecipar && dataVencimento.getDay() === 6) {
        // Sábado
        dataVencimento.setDate(dataVencimento.getDate() + 2);
      }

      vencimentosCalculados.push({
        mes: meses[mes], // Mantém o mês atual no label
        data: dataVencimento.toLocaleDateString("pt-BR"),
      });
    }

    setObrigacaoNome(nome);
    setVencimentos(vencimentosCalculados);
    setOpenDialog(true);
  };

  return (
    <div className="space-y-6 mt-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{empresa.razaoSocial}</h1>
          {empresa.nomeFantasia && (
            <p className="text-muted-foreground">{empresa.nomeFantasia}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Voltar
          </Button>
          <Button asChild>
            <Link href={`/dashboard/empresas/${empresa.id}/editar`}>
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coluna 1 */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{formatCNPJ(empresa.cnpj)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Regime Tributário
                  </p>
                  <p className="font-medium">
                    {formatRegime(empresa.regimeTributacao)}
                  </p>
                </div>
              </div>

              {/* Coluna 2 */}
              <div className="space-y-4">
                {empresa.inscricaoEstadual && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Inscrição Estadual
                    </p>
                    <p className="font-medium">{empresa.inscricaoEstadual}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">
                    {formatResponsavel(empresa.responsavel)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p>{empresa.telefone}</p>
              </div>
            )}
            {empresa.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{empresa.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa.endereco && <p>{empresa.endereco}</p>}
            {(empresa.cidade || empresa.uf) && (
              <p>
                {empresa.cidade} {empresa.cidade && empresa.uf && "-"}{" "}
                {empresa.uf}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Obrigações Acessórias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Obrigações Acessórias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empresa.obrigacoesAcessorias.length > 0 ? (
            <div className="space-y-4">
              {empresa.obrigacoesAcessorias.map((obrigacao) => (
                <div key={obrigacao.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">
                      {obrigacao.obrigacaoAcessoria.nome}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        Dia {obrigacao.diaVencimento}{" "}
                        {obrigacao.anteciparDiaNaoUtil
                          ? "(Antecipa)"
                          : "(Posterga)"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          calcularVencimentos(
                            obrigacao.diaVencimento,
                            obrigacao.anteciparDiaNaoUtil,
                            obrigacao.obrigacaoAcessoria.nome
                          )
                        }
                      >
                        Ver Vencimentos
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma obrigação acessória cadastrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Obrigações Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Obrigações Principais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empresa.obrigacoesPrincipais.length > 0 ? (
            <div className="space-y-4">
              {empresa.obrigacoesPrincipais.map((obrigacao) => (
                <div key={obrigacao.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">
                      {obrigacao.obrigacaoPrincipal.nome}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        Dia {obrigacao.diaVencimento}{" "}
                        {obrigacao.anteciparDiaNaoUtil
                          ? "(Antecipa)"
                          : "(Posterga)"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          calcularVencimentos(
                            obrigacao.diaVencimento,
                            obrigacao.anteciparDiaNaoUtil,
                            obrigacao.obrigacaoPrincipal.nome
                          )
                        }
                      >
                        Ver Vencimentos
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma obrigação principal cadastrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Vencimentos */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vencimentos - {obrigacaoNome}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {vencimentos.map((vencimento: any, index: any) => (
              <div key={index} className="border rounded-lg p-3">
                <p className="font-medium">{vencimento.mes}</p>
                <p className="text-sm text-muted-foreground">
                  {vencimento.data}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Parcelamentos */}
      {empresa.parcelamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Parcelamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm text-muted-foreground">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-sm text-muted-foreground">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-sm text-muted-foreground">
                      Vencimento
                    </th>
                    <th className="px-4 py-3 text-left text-sm text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {empresa.parcelamentos.map((parcelamento) => (
                    <tr key={parcelamento.id}>
                      <td className="px-4 py-3">{parcelamento.numero}</td>
                      <td className="px-4 py-3">
                        {parcelamento.valor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(
                          parcelamento.dataVencimento
                        ).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            parcelamento.status === "PAGO"
                              ? "default"
                              : parcelamento.status === "ATRASADO"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {parcelamento.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {empresa.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{empresa.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
