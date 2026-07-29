"use client";

import { useTasksForEntity, useCompleteTask, useDeleteTask } from "@/lib/hooks/useTasks";
import type { EntityType } from "@/types/database";
import { TaskList } from "./TaskList";

interface EntityTasksTabProps {
  entityType: EntityType;
  entityId: string;
}

/**
 * Onglet taches pour les pages de detail d'entite.
 * Charge les taches liees a l'entite et permet de les completer/supprimer.
 */
export function EntityTasksTab({ entityType, entityId }: EntityTasksTabProps) {
  const { data: tasks, isLoading } = useTasksForEntity(entityType, entityId);
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <TaskList
      tasks={tasks ?? []}
      onComplete={(taskId) => completeTask.mutate(taskId)}
      onDelete={(taskId) => deleteTask.mutate(taskId)}
      entityType={entityType}
      entityId={entityId}
    />
  );
}
