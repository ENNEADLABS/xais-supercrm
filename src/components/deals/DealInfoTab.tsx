"use client";

import Link from "next/link";
import { Calendar, CircleDollarSign, Gauge, Layers, Target, User, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Deal, PipelineStage } from "@/types/database";
import { formatCurrency } from "./utils";

interface DealInfoTabProps {
  deal: Deal;
  stages: PipelineStage[];
}

/**
 * Onglet Infos : détails du deal dans une Card.
 */
export function DealInfoTab({ deal, stages }: DealInfoTabProps) {
  const currentStage = stages.find((s) => s.id === deal.stage);
  const weightedAmount =
    deal.amount != null && deal.probability != null
      ? Math.round((deal.amount * deal.probability) / 100)
      : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Informations</h2>
        <Button variant="outline" size="sm" render={<Link href={`/deals/${deal.id}/edit`} />}>
          Modifier
        </Button>
      </div>

      <Separator className="my-4" />

      <dl className="space-y-4">
        <InfoRow
          icon={CircleDollarSign}
          label="Montant"
          value={deal.amount != null ? formatCurrency(deal.amount) : null}
        />
        <InfoRow
          icon={Gauge}
          label="Probabilité"
          value={deal.probability != null ? `${deal.probability}%` : null}
        />
        <InfoRow
          icon={Target}
          label="Montant pondéré"
          value={weightedAmount != null ? formatCurrency(weightedAmount) : null}
        />
        <InfoRow icon={Layers} label="Stage" value={currentStage?.label ?? deal.stage} />
        <InfoRow
          icon={Calendar}
          label="Clôture prévue"
          value={
            deal.expected_close_date
              ? new Date(deal.expected_close_date).toLocaleDateString("fr-FR")
              : null
          }
        />
        {deal.closed_at && (
          <InfoRow
            icon={Calendar}
            label="Fermé le"
            value={new Date(deal.closed_at).toLocaleDateString("fr-FR")}
          />
        )}
        {deal.lost_reason && (
          <InfoRow icon={XCircle} label="Motif de perte" value={deal.lost_reason} />
        )}
        <InfoRow icon={User} label="Assigné à" value={deal.assigned_to ?? null} />
        <InfoRow
          icon={Calendar}
          label="Créé le"
          value={new Date(deal.created_at).toLocaleDateString("fr-FR")}
        />
        <InfoRow
          icon={Calendar}
          label="Modifié le"
          value={new Date(deal.updated_at).toLocaleDateString("fr-FR")}
        />
      </dl>
    </Card>
  );
}

/** Ligne d'information avec icône */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <dt className="w-28 shrink-0 text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}
