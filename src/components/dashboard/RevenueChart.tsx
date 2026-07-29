"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { TimeSeriesPoint } from "@/lib/services/dashboard/timeSeriesQueries";

interface RevenueChartProps {
  data: TimeSeriesPoint[];
}

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label as string}</p>
      {items.map((item) => (
        <p key={item.name} className="text-sm" style={{ color: item.color }}>
          {item.name} : {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Chiffre d&apos;affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Chiffre d&apos;affaires</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value: string) => <span className="text-sm">{value}</span>}
              />
              <Bar dataKey="revenue" name="CA encaissé" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line
                dataKey="invoiced"
                name="Facturé"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                dataKey="quoted"
                name="Devisé"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
