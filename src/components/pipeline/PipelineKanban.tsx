"use client";

import { useState, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Loader2, Target } from "lucide-react";
import { useDealsByStage, useMoveDeal } from "@/lib/hooks/useDeals";
import { usePipelineStages } from "@/lib/hooks/useTenantConfig";
import { EmptyState } from "@/components/crm/EmptyState";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineSummary } from "./PipelineSummary";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineListView } from "./PipelineListView";
import { DealCreateDialog } from "./DealCreateDialog";
import type { Deal } from "@/types/database";

type ViewMode = "kanban" | "list";

/**
 * Orchestrateur principal du kanban pipeline.
 * Gere le drag & drop, le chargement et la vue kanban/liste.
 */
export function PipelineKanban() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultStage, setCreateDefaultStage] = useState<string | undefined>();

  const { data: dealsByStage, isLoading: dealsLoading } = useDealsByStage();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const moveDeal = useMoveDeal();

  // Handler drag & drop
  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      // Pas de changement
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }
      moveDeal.mutate({
        dealId: draggableId,
        stage: destination.droppableId,
        position: destination.index,
      });
    },
    [moveDeal],
  );

  // Ouvrir le dialog de creation avec un stage preselectionne
  const handleAddDeal = useCallback((stageId: string) => {
    setCreateDefaultStage(stageId);
    setCreateDialogOpen(true);
  }, []);

  // Etat de chargement
  if (dealsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Extraire tous les deals pour le summary
  const allDeals: Deal[] = dealsByStage
    ? Object.values(dealsByStage as Record<string, Deal[]>).flat()
    : [];

  // Pas de stages configures
  if (!stages || stages.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Pipeline non configuré"
        description="Configurez les stages du pipeline dans les paramètres."
        action={{ label: "Paramètres", href: "/settings" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PipelineHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      <PipelineSummary deals={allDeals} />

      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageDeals =
                (dealsByStage as Record<string, Deal[]> | undefined)?.[stage.id] ?? [];
              return (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  deals={
                    stageDeals as {
                      id: string;
                      name: string;
                      company_name?: string;
                      amount: number | null;
                      probability: number | null;
                      expected_close_date: string | null;
                    }[]
                  }
                  onAddDeal={handleAddDeal}
                />
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <PipelineListView />
      )}

      <DealCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStage={createDefaultStage}
      />
    </div>
  );
}
