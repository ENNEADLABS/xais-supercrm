"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateTask, useUpdateTask } from "@/lib/hooks/useTasks";
import type { Task, EntityType, TaskPriority } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TaskFormProps {
  entityType?: string;
  entityId?: string;
  task?: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Schema du formulaire (simplifie pour compatibilite RHF) */
const taskFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  task_type: z.string().max(50).optional(),
  due_date: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
});

interface TaskFormValues {
  title: string;
  description?: string;
  priority: TaskPriority;
  task_type?: string;
  due_date?: string;
  entity_type?: string;
  entity_id?: string;
}

/** Types de tache disponibles en V1 */
const TASK_TYPES = [
  { value: "appel", label: "Appel" },
  { value: "email", label: "Email" },
  { value: "reunion", label: "Réunion" },
  { value: "relance", label: "Relance" },
  { value: "administratif", label: "Administratif" },
];

const PRIORITIES = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];

/**
 * Formulaire de creation/edition de tache dans un dialog.
 */
export function TaskForm({ entityType, entityId, task, open, onOpenChange }: TaskFormProps) {
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "medium",
      task_type: task?.task_type ?? "",
      due_date: task?.due_date ? task.due_date.slice(0, 16) : "",
      entity_type: task?.entity_type ?? entityType ?? undefined,
      entity_id: task?.entity_id ?? entityId ?? undefined,
    },
  });

  async function onSubmit(data: TaskFormValues) {
    // Construire l'input conforme au schema d'action
    const input = {
      title: data.title,
      status: task?.status ?? ("todo" as const),
      priority: data.priority,
      description: data.description || null,
      task_type: data.task_type || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      entity_type: (data.entity_type || null) as EntityType | null,
      entity_id: data.entity_id || null,
    };

    if (isEdit) {
      await updateTask.mutateAsync({ taskId: task.id, input });
    } else {
      await createTask.mutateAsync(input);
    }

    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input id="title" {...register("title")} placeholder="Titre de la tâche" />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <select
                id="priority"
                {...register("priority")}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="task_type">Type</Label>
              <select
                id="task_type"
                {...register("task_type")}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              >
                <option value="">— Aucun —</option>
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="due_date">Échéance</Label>
            <Input id="due_date" type="datetime-local" {...register("due_date")} />
          </div>

          {/* Champs caches pour le lien polymorphe */}
          <input type="hidden" {...register("entity_type")} />
          <input type="hidden" {...register("entity_id")} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
