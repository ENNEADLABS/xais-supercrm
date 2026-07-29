"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface PipelineStage {
  stage: string;
  label: string;
  color: string;
  count: number;
  amount: number;
}

interface PipelineFunnelProps {
  pipelineByStage: PipelineStage[];
}

function PipelineTooltip({ active, payload }: Record<string, unknown>) {
  if (!active || !payload) return null;
  const items = payload as Array<{ payload: PipelineStage }>;
  const stage = items[0]?.payload;
  if (!stage) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      <p className="text-sm font-medium">{stage.label}</p>
      <p className="text-sm text-muted-foreground">
        {stage.count} deal{stage.count > 1 ? "s" : ""} · {formatCurrency(stage.amount)}
      </p>
    </div>
  );
}

export function PipelineFunnel({ pipelineByStage }: PipelineFunnelProps) {
  const totalCount = Math.max(
    pipelineByStage.reduce((sum, s) => sum + s.count, 0),
    1,
  );
  const totalAmount = pipelineByStage.reduce((sum, s) => sum + s.amount, 0);
  const stagesWithAmount = pipelineByStage.filter((s) => s.amount > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {pipelineByStage.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune opportunité.</p>
        ) : (
          <div className="space-y-4">
            {/* Funnel horizontal */}
            <div className="space-y-2">
              {pipelineByStage.map((stage) => {
                const widthPct = Math.max((stage.count / totalCount) * 100, 4);
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs font-medium">
                      {stage.label}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-4 rounded"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: stage.color,
                          minWidth: "16px",
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {stage.count} · {formatCurrency(stage.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Donut chart montants */}
            {stagesWithAmount.length > 0 && (
              <div className="relative h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stagesWithAmount}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {stagesWithAmount.map((s) => (
                        <Cell key={s.stage} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PipelineTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Montant total au centre */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
                  <span className="text-[10px] text-muted-foreground">Total</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
