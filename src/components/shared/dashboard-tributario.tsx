// components/dashboard-tributario.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  meses: string[];
  faturamento: number[];
  impostos: number[];
  compras: number[];
  cargaTributaria: number[];
  margemBruta: number[];
}

export function DashboardTributario({ data }: { data: DashboardData }) {
  const chartData = data.meses.map((mes, index) => ({
    mes,
    faturamento: data.faturamento[index],
    impostos: data.impostos[index],
    compras: data.compras[index],
    cargaTributaria: data.cargaTributaria[index],
    margemBruta: data.margemBruta[index]
  }));

  const composicaoAtividades = [
    { name: 'Comércio', value: 45 },
    { name: 'Indústria', value: 30 },
    { name: 'Serviços', value: 25 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Evolução do Faturamento */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Evolução do Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="faturamento" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Carga Tributária */}
      <Card>
        <CardHeader>
          <CardTitle>Carga Tributária</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cargaTributaria" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Composição por Atividade */}
      <Card>
        <CardHeader>
          <CardTitle>Composição por Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={composicaoAtividades}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {composicaoAtividades.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparativo Faturamento x Impostos */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Comparativo Faturamento vs Impostos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="faturamento" fill="#10b981" name="Faturamento" />
              <Bar dataKey="impostos" fill="#ef4444" name="Impostos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margem Bruta */}
      <Card>
        <CardHeader>
          <CardTitle>Margem Bruta</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="margemBruta" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}