"use client";

import { Plus } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { DealCard } from "./DealCard";
import type { PipelineStage } from "@/types/database";

interface DealWithCompany {
  id: string;
  name: string;
  company_name?: string;
  amount: number | null;
  probability: number | null;
  expected_close_date: string | null;
}

interface PipelineColumnProps {
  stage: PipelineStage;
  deals: DealWithCompany[];
  onAddDeal?: (stageId: string) => void;
}

/**
 * Colonne kanban : zone droppable contenant les cartes de deals.
 */
export function PipelineColumn({ stage, deals, onAddDeal }: PipelineColumnProps) {
  const totalAmount = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  // Fond distinct pour les colonnes won/lost
  const columnBg =
    stage.id === "won"
      ? "bg-green-50 dark:bg-green-950/20"
      : stage.id === "lost"
        ? "bg-red-50 dark:bg-red-950/20"
        : "bg-muted/30";

  return (
    <div className={cn("flex w-72 shrink-0 flex-col rounded-lg border", columnBg)}>
      {/* En-tete de la colonne */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
            {deals.length}
          </span>
        </div>
        {onAddDeal && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onAddDeal(stage.id)}
            aria-label={`Ajouter un deal dans ${stage.label}`}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Total montant */}
      <div className="border-b px-3 py-1.5">
        <p className="text-xs text-muted-foreground">{formatCurrency(totalAmount)}</p>
      </div>

      {/* Zone droppable avec les cartes */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-2",
              "min-h-[120px]",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} dealId={deal.id} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
