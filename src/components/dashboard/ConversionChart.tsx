"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionPoint } from "@/lib/services/dashboard/timeSeriesQueries";

interface ConversionChartProps {
  data: ConversionPoint[];
}

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ name: string; value: number; color: string }>;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label as string}</p>
      {items.map((item) => (
        <p key={item.name} className="text-sm" style={{ color: item.color }}>
          {item.name} : {item.name === "Taux" ? `${item.value}%` : item.value}
        </p>
      ))}
    </div>
  );
}

export function ConversionChart({ data }: ConversionChartProps) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Conversion pipeline</CardTitle>
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
        <CardTitle>Conversion pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="count" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="rate"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 100]}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value: string) => <span className="text-sm">{value}</span>}
              />
              <Area
                yAxisId="count"
                dataKey="wonDeals"
                name="Gagnés"
                stackId="1"
                fill="#22c55e"
                stroke="#16a34a"
                fillOpacity={0.6}
              />
              <Area
                yAxisId="count"
                dataKey="lostDeals"
                name="Perdus"
                stackId="1"
                fill="#ef4444"
                stroke="#dc2626"
                fillOpacity={0.4}
              />
              <Area
                yAxisId="rate"
                dataKey="conversionRate"
                name="Taux"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8b5cf6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
