import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchTasks,
  fetchTask,
  fetchTasksForEntity,
  createTaskAction,
  updateTaskAction,
  completeTaskAction,
  deleteTaskAction,
  fetchOverdueTasks,
  fetchTaskCountsByStatus,
} from "@/lib/actions/task";
import type { CreateTaskInput, UpdateTaskInput, TaskSearchInput } from "@/lib/schemas/task";
import type { EntityType } from "@/types/database";

// --- Liste paginee des taches ---

export function useTasks(params?: TaskSearchInput) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => fetchTasks(params),
  });
}

// --- Detail d'une tache ---

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask(id!),
    enabled: !!id,
  });
}

// --- Taches d'une entite ---

export function useTasksForEntity(entityType: EntityType, entityId: string) {
  return useQuery({
    queryKey: ["tasks", "entity", entityType, entityId],
    queryFn: () => fetchTasksForEntity(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
}

// --- Creation ---

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTaskAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la tâche");
    },
  });
}

// --- Mise a jour ---

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTaskAction(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la tâche");
    },
  });
}

// --- Completion ---

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => completeTaskAction(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche terminée");
    },
    onError: () => {
      toast.error("Erreur lors de la complétion de la tâche");
    },
  });
}

// --- Suppression ---

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTaskAction(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la tâche");
    },
  });
}

// --- Taches en retard ---

export function useOverdueTasks() {
  return useQuery({
    queryKey: ["tasks", "overdue"],
    queryFn: () => fetchOverdueTasks(),
  });
}

// --- Compteurs par statut ---

export function useTaskCounts() {
  return useQuery({
    queryKey: ["tasks", "counts"],
    queryFn: () => fetchTaskCountsByStatus(),
  });
}
