import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task, EntityType } from "@/types/database";
import type { TaskSearchInput } from "@/lib/schemas/task";
import { escapeLike } from "@/lib/utils/format";

// Lectures des taches (CQRS-lite : les mutations vivent dans taskService).

// --- Liste paginee avec recherche et filtres ---

export async function getTasks(organizationId: string, params?: TaskSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  // Recherche texte libre sur le titre
  if (params?.query) {
    query = query.ilike("title", `%${escapeLike(params.query)}%`);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.priority) {
    query = query.eq("priority", params.priority);
  }

  if (params?.assigned_to) {
    query = query.eq("assigned_to", params.assigned_to);
  }

  if (params?.entity_type) {
    query = query.eq("entity_type", params.entity_type);
  }

  if (params?.entity_id) {
    query = query.eq("entity_id", params.entity_id);
  }

  // Filtre en retard : due_date < now ET status pas done/cancelled
  if (params?.overdue) {
    query = query
      .lt("due_date", new Date().toISOString())
      .not("status", "in", '("done","cancelled")');
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Task[]) ?? [], count: count ?? 0 };
}

// --- Detail d'une tache ---

export async function getTask(organizationId: string, taskId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", taskId);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Task;
}

// --- Taches d'une entite (lien polymorphe) ---

export async function getTasksForEntity(
  organizationId: string,
  entityType: EntityType,
  entityId: string,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });

  if (error) throw error;
  return (data as Task[]) ?? [];
}

// --- Taches en retard ---

export async function getOverdueTasks(organizationId: string, limit = 10) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .lt("due_date", new Date().toISOString())
    .in("status", ["todo", "in_progress"])
    .order("due_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data as Task[]) ?? [];
}

// --- Compteurs par statut ---

export async function getTaskCountsByStatus(organizationId: string) {
  const supabase = await createServerSupabaseClient();

  const statuses = ["todo", "in_progress", "done", "cancelled"] as const;
  const counts: Record<string, number> = {};

  // Requete par statut
  for (const status of statuses) {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", status);

    if (error) throw error;
    counts[status] = count ?? 0;
  }

  return counts;
}
