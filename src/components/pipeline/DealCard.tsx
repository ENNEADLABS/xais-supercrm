"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: {
    id: string;
    name: string;
    company_name?: string;
    amount: number | null;
    probability: number | null;
    expected_close_date: string | null;
  };
  dealId: string;
  index: number;
}

/**
 * Carte d'un deal dans le kanban, wrappee dans un Draggable.
 */
export function DealCard({ deal, dealId, index }: DealCardProps) {
  const isOverdue =
    deal.expected_close_date != null && new Date(deal.expected_close_date) < new Date();

  return (
    <Draggable draggableId={dealId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
        >
          <Card
            className={cn(
              "transition-shadow hover:shadow-md",
              snapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
            )}
          >
            <CardContent className="space-y-1.5 p-3">
              <Link
                href={`/deals/${dealId}`}
                className="line-clamp-1 text-sm font-medium hover:underline"
              >
                {deal.name}
              </Link>

              {deal.company_name && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{deal.company_name}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{formatCurrency(deal.amount)}</span>
                {deal.probability != null && (
                  <Badge variant="secondary" className="text-xs">
                    {deal.probability}%
                  </Badge>
                )}
              </div>

              {deal.expected_close_date && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  <CalendarDays className="size-3" />
                  <span>
                    {new Date(deal.expected_close_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
