"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  usePipelineStages,
  useTenantConfig,
  useUpdatePipelineConfig,
} from "@/lib/hooks/useTenantConfig";
import type { PipelineStageInput } from "@/lib/schemas/settings";

/**
 * Configuration des stages du pipeline (labels, couleurs, probabilites, ordre).
 */
export function PipelineSettings() {
  const { data: stages, isLoading: loadingStages } = usePipelineStages();
  const { data: config, isLoading: loadingConfig } = useTenantConfig();
  const updateMutation = useUpdatePipelineConfig();

  const [localStages, setLocalStages] = useState<PipelineStageInput[]>([]);
  const [probMap, setProbMap] = useState<Record<string, number>>({});

  // Synchroniser l'etat local quand les donnees arrivent
  useEffect(() => {
    if (stages) setLocalStages(stages.map((s) => ({ ...s })));
  }, [stages]);

  useEffect(() => {
    if (config?.probability_map) setProbMap({ ...config.probability_map });
  }, [config]);

  if (loadingStages || loadingConfig) {
    return <PipelineSkeleton />;
  }

  const updateStage = (index: number, field: keyof PipelineStageInput, value: string | number) => {
    setLocalStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Synchroniser la probability_map si l'id change
      if (field === "id") {
        const oldId = prev[index].id;
        setProbMap((pm) => {
          const updated = { ...pm };
          updated[value as string] = updated[oldId] ?? 0;
          if (oldId !== value) delete updated[oldId];
          return updated;
        });
      }
      return next;
    });
  };

  const updateProbability = (stageId: string, value: number) => {
    setProbMap((prev) => ({ ...prev, [stageId]: value }));
  };

  const addStage = () => {
    const order = localStages.length;
    const id = `stage_${Date.now()}`;
    setLocalStages((prev) => [...prev, { id, label: "", color: "#6366f1", order }]);
    setProbMap((prev) => ({ ...prev, [id]: 0 }));
  };

  const removeStage = (index: number) => {
    const removed = localStages[index];
    setLocalStages((prev) => prev.filter((_, i) => i !== index));
    setProbMap((prev) => {
      const updated = { ...prev };
      delete updated[removed.id];
      return updated;
    });
  };

  const handleSave = () => {
    // Recalculer les ordres avant sauvegarde
    const ordered = localStages.map((s, i) => ({ ...s, order: i }));
    updateMutation.mutate({ stages: ordered, probabilityMap: probMap });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stages du pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* En-tetes */}
        <div className="grid grid-cols-[48px_1fr_1fr_100px_100px_40px] items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>Couleur</span>
          <span>ID</span>
          <span>Label</span>
          <span>Probabilité</span>
          <span>Ordre</span>
          <span />
        </div>

        {/* Lignes */}
        {localStages.map((stage, index) => (
          <div
            key={stage.id + index}
            className="grid grid-cols-[48px_1fr_1fr_100px_100px_40px] items-center gap-2"
          >
            <Input
              type="color"
              value={stage.color}
              onChange={(e) => updateStage(index, "color", e.target.value)}
              className="h-9 w-12 cursor-pointer p-1"
              aria-label={`Couleur du stage ${stage.label}`}
            />
            <Input
              value={stage.id}
              onChange={(e) => updateStage(index, "id", e.target.value)}
              placeholder="stage_id"
              aria-label="ID du stage"
            />
            <Input
              value={stage.label}
              onChange={(e) => updateStage(index, "label", e.target.value)}
              placeholder="Nom du stage"
              aria-label="Label du stage"
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={probMap[stage.id] ?? 0}
                onChange={(e) => updateProbability(stage.id, Number(e.target.value))}
                aria-label="Probabilité"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Input
              type="number"
              min={0}
              value={stage.order}
              onChange={(e) => updateStage(index, "order", Number(e.target.value))}
              aria-label="Ordre"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeStage(index)}
              disabled={localStages.length <= 2}
              aria-label="Supprimer le stage"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addStage}>
            <Plus className="size-4" />
            Ajouter un stage
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}
