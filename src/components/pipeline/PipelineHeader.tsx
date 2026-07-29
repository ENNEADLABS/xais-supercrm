"use client";

import { useState } from "react";
import { Kanban, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportCsvButton, ImportCsvDialog } from "@/components/csv";
import { DealCreateDialog } from "./DealCreateDialog";

type ViewMode = "kanban" | "list";

interface PipelineHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Barre d'en-tete du pipeline : titre, toggle vue, bouton creation.
 */
export function PipelineHeader({ viewMode, onViewModeChange }: PipelineHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import / Export CSV */}
          <ImportCsvDialog entityType="deal" />
          <ExportCsvButton entityType="deal" />

          {/* Toggle Kanban / Liste */}
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("kanban")}
              aria-label="Vue kanban"
            >
              <Kanban className="mr-1 size-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              aria-label="Vue liste"
            >
              <List className="mr-1 size-4" />
              Liste
            </Button>
          </div>

          {/* Bouton nouveau deal */}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 size-4" />
            Nouveau deal
          </Button>
        </div>
      </div>

      <DealCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
