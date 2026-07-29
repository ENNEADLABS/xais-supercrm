"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database";

import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskForm } from "./TaskForm";

interface TaskListProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showNewButton?: boolean;
  entityType?: string;
  entityId?: string;
}

/**
 * Verifie si une tache est en retard (echeance depassee et pas terminee/annulee).
 */
function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.due_date) < new Date();
}

/**
 * Formate une date pour l'affichage.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

/**
 * Liste reutilisable de taches pour les onglets d'entite et la page principale.
 */
export function TaskList({
  tasks,
  onComplete,
  onDelete,
  showNewButton = true,
  entityType,
  entityId,
}: TaskListProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-2">
      {showNewButton && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Nouvelle tâche
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune tâche</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-4 py-3">
              {/* Checkbox de completion */}
              <button
                type="button"
                onClick={() => task.status !== "done" && onComplete(task.id)}
                disabled={task.status === "done" || task.status === "cancelled"}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded border",
                  task.status === "done"
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-300 hover:border-gray-400",
                )}
                aria-label={task.status === "done" ? "Tâche terminée" : "Marquer comme terminée"}
              >
                {task.status === "done" && <Check className="size-3" />}
              </button>

              {/* Contenu de la tache */}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    task.status === "done" && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </span>
              </div>

              {/* Badges */}
              <TaskPriorityBadge priority={task.priority} />

              {/* Echeance */}
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isOverdue(task) ? "font-medium text-red-600" : "text-muted-foreground",
                )}
              >
                {formatDate(task.due_date)}
              </span>

              <TaskStatusBadge status={task.status} />

              {/* Action supprimer */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Supprimer la tâche"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        entityType={entityType}
        entityId={entityId}
      />
    </div>
  );
}
