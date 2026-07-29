"use client";

import { useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput, EmptyState } from "@/components/crm";
import { useTasks, useCompleteTask, useDeleteTask } from "@/lib/hooks/useTasks";
import type { TaskStatus, TaskPriority } from "@/types/database";

import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskForm } from "./TaskForm";
import { TasksPagination } from "./TasksPagination";

/** Labels pour le filtre statut */
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
];

/** Labels pour le filtre priorite */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];

/** Formate une date pour l'affichage */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

/** Verifie si une tache est en retard */
function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === "done" || status === "cancelled") return false;
  return new Date(dueDate) < new Date();
}

/**
 * Page principale des taches avec recherche, filtres et pagination.
 */
export function TasksPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const perPage = 25;

  const { data, isLoading } = useTasks({
    query,
    status,
    priority,
    overdue: overdueOnly || undefined,
    page,
    per_page: perPage,
  });

  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  // Reinitialiser la page quand les filtres changent
  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tâches</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-72">
          <SearchInput
            value={query}
            onChange={handleQueryChange}
            placeholder="Rechercher une tâche..."
          />
        </div>

        <select
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value || undefined) as TaskStatus | undefined);
            setPage(1);
          }}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={priority ?? ""}
          onChange={(e) => {
            setPriority((e.target.value || undefined) as TaskPriority | undefined);
            setPage(1);
          }}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          aria-label="Filtrer par priorité"
        >
          <option value="">Toutes les priorités</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(1);
            }}
            className="size-4 rounded border"
          />
          En retard seulement
        </label>
      </div>

      {/* Tableau ou etat vide */}
      {isLoading ? (
        <TasksTableSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Aucune tâche"
          description="Créez votre première tâche pour organiser votre travail."
          action={{ label: "Nouvelle tâche", href: "#" }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    {/* Checkbox de completion */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => task.status !== "done" && completeTask.mutate(task.id)}
                        disabled={task.status === "done" || task.status === "cancelled"}
                        className={cn(
                          "flex size-5 items-center justify-center rounded border",
                          task.status === "done"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 hover:border-gray-400",
                        )}
                        aria-label="Marquer comme terminée"
                      >
                        {task.status === "done" && <Check className="size-3" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium",
                          task.status === "done" && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      <TaskPriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          isOverdue(task.due_date, task.status) && "font-medium text-red-600",
                        )}
                      >
                        {formatDate(task.due_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => deleteTask.mutate(task.id)}
                        className="text-muted-foreground hover:text-red-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TasksPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

/** Squelette de chargement */
function TasksTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
