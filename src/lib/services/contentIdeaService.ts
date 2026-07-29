import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentIdea } from "@/types/database";
import type {
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  ContentIdeaSearchInput,
} from "@/lib/schemas/content";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// --- Liste paginee avec recherche et filtres ---

export async function getContentIdeas(organizationId: string, params?: ContentIdeaSearchInput) {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("content_ideas")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (params?.query) {
    query = query.ilike("title", `%${escapeLike(params.query)}%`);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.priority) {
    query = query.eq("priority", params.priority);
  }
  if (params?.planned_format) {
    query = query.eq("planned_format", params.planned_format);
  }
  if (params?.owner_id) {
    query = query.eq("owner_id", params.owner_id);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as ContentIdea[]) ?? [], count: count ?? 0 };
}

// --- Detail ---

export async function getContentIdea(organizationId: string, ideaId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_ideas")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", ideaId)
    .is("deleted_at", null);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as ContentIdea;
}

// --- Creation ---

export async function createContentIdea(
  organizationId: string,
  userId: string,
  input: CreateContentIdeaInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_ideas")
    .insert({ ...input, organization_id: organizationId, owner_id: input.owner_id ?? userId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content idea creation failed");

  const idea = data[0] as ContentIdea;
  await activityService.log(organizationId, {
    entityType: "content_idea",
    entityId: idea.id,
    action: "created",
    actorId: userId,
  });
  return idea;
}

// --- Mise a jour ---

export async function updateContentIdea(
  organizationId: string,
  userId: string,
  ideaId: string,
  input: UpdateContentIdeaInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_ideas")
    .update(input)
    .eq("organization_id", organizationId)
    .eq("id", ideaId)
    .is("deleted_at", null)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Content idea not found");

  await activityService.log(organizationId, {
    entityType: "content_idea",
    entityId: ideaId,
    action: "updated",
    actorId: userId,
    metadata: { fields: Object.keys(input) },
  });
  return data[0] as ContentIdea;
}

// --- Suppression (soft-delete) ---

export async function deleteContentIdea(organizationId: string, userId: string, ideaId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("content_ideas")
    .update({ deleted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", ideaId);

  if (error) throw error;

  await activityService.log(organizationId, {
    entityType: "content_idea",
    entityId: ideaId,
    action: "deleted",
    actorId: userId,
  });
}
