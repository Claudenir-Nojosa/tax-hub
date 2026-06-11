"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChartData {
  name: string;
  principais: number;
  acessorias: number;
}

interface ObrigacoesChartProps {
  data: ChartData[];
}

export function ObrigacoesChart({ data }: ObrigacoesChartProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Percentual de Entrega por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, value === 1 ? 'Principal' : 'Acessória']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Legend 
                formatter={(value) => value === 'principais' ? 'Obrigações Principais' : 'Obrigações Acessórias'}
              />
              <Bar dataKey="principais" fill="#8884d8" name="Principais" />
              <Bar dataKey="acessorias" fill="#82ca9d" name="Acessórias" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}