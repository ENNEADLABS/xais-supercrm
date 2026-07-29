"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as taskService from "@/lib/services/taskService";
import * as taskQueries from "@/lib/services/taskQueries";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskSearchInput,
} from "@/lib/schemas/task";
import type { EntityType } from "@/types/database";

// --- Lecture liste paginee ---

export async function fetchTasks(params?: TaskSearchInput) {
  const { organizationId } = await getAuthContext();
  return taskQueries.getTasks(organizationId, params);
}

// --- Lecture detail ---

export async function fetchTask(taskId: string) {
  const { organizationId } = await getAuthContext();
  return taskQueries.getTask(organizationId, taskId);
}

// --- Taches d'une entite ---

export async function fetchTasksForEntity(entityType: EntityType, entityId: string) {
  const { organizationId } = await getAuthContext();
  return taskQueries.getTasksForEntity(organizationId, entityType, entityId);
}

// --- Creation ---

export async function createTaskAction(input: CreateTaskInput) {
  const { organizationId, userId } = await requireMember();
  const validated = createTaskSchema.parse(input);
  const task = await taskService.createTask(organizationId, userId, validated);
  revalidatePath("/tasks");
  return task;
}

// --- Mise a jour ---

export async function updateTaskAction(taskId: string, input: UpdateTaskInput) {
  const { organizationId } = await requireMember();
  const validated = updateTaskSchema.parse(input);
  const task = await taskService.updateTask(organizationId, taskId, validated);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return task;
}

// --- Marquer comme terminee ---

export async function completeTaskAction(taskId: string) {
  const { organizationId } = await requireMember();
  const task = await taskService.completeTask(organizationId, taskId);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return task;
}

// --- Suppression ---

export async function deleteTaskAction(taskId: string) {
  const { organizationId } = await requireMember();
  await taskService.deleteTask(organizationId, taskId);
  revalidatePath("/tasks");
}

// --- Taches en retard ---

export async function fetchOverdueTasks(limit?: number) {
  const { organizationId } = await getAuthContext();
  return taskQueries.getOverdueTasks(organizationId, limit);
}

// --- Compteurs par statut ---

export async function fetchTaskCountsByStatus() {
  const { organizationId } = await getAuthContext();
  return taskQueries.getTaskCountsByStatus(organizationId);
}
