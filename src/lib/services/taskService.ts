import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task } from "@/types/database";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/schemas/task";
import * as activityService from "./activityService";
import { getTask } from "./taskQueries";

// Mutations des taches (les lectures vivent dans taskQueries).

// --- Creation ---

export async function createTask(organizationId: string, userId: string, input: CreateTaskInput) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...input,
      organization_id: organizationId,
      created_by: userId,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Task creation failed");

  const task = data[0] as Task;

  await activityService.log(organizationId, {
    entityType: "task",
    entityId: task.id,
    action: "created",
    actorId: userId,
  });

  return task;
}

// --- Mise a jour ---

export async function updateTask(organizationId: string, taskId: string, input: UpdateTaskInput) {
  const supabase = await createServerSupabaseClient();

  // Recuperer l'etat actuel pour gerer les transitions completed_at
  const current = await getTask(organizationId, taskId);
  if (!current) throw new Error("Task not found");

  const updateData: Record<string, unknown> = { ...input };

  // Transition VERS done : set completed_at
  if (input.status === "done" && current.status !== "done") {
    updateData.completed_at = new Date().toISOString();
  }

  // Transition DEPUIS done vers un autre statut : clear completed_at
  if (input.status && input.status !== "done" && current.status === "done") {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Task not found");

  await activityService.log(organizationId, {
    entityType: "task",
    entityId: taskId,
    action: "updated",
    metadata: { fields: Object.keys(input) },
  });

  return data[0] as Task;
}

// --- Raccourci : marquer comme terminee ---

export async function completeTask(organizationId: string, taskId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "done" as const, completed_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Task not found");

  await activityService.log(organizationId, {
    entityType: "task",
    entityId: taskId,
    action: "completed",
  });

  return data[0] as Task;
}

// --- Suppression ---

export async function deleteTask(organizationId: string, taskId: string) {
  const supabase = await createServerSupabaseClient();

  // Log avant suppression
  await activityService.log(organizationId, {
    entityType: "task",
    entityId: taskId,
    action: "deleted",
  });

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", taskId);

  if (error) throw error;
}
