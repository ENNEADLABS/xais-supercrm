import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EntityType, Tag } from "@/types/database";

// --- Input pour la creation d'un tag ---

interface CreateTagInput {
  name: string;
  color: string;
  entity_type: EntityType;
}

// --- Liste des tags ---

export async function getTags(organizationId: string, entityType?: EntityType) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("tags")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Tag[]) ?? [];
}

// --- Creation d'un tag ---

export async function createTag(organizationId: string, input: CreateTagInput) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({ ...input, organization_id: organizationId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Tag creation failed");
  return data[0];
}

// --- Suppression d'un tag ---

export async function deleteTag(organizationId: string, tagId: string) {
  const supabase = await createServerSupabaseClient();

  // Verifier que le tag appartient a l'org
  const { data: tags } = await supabase
    .from("tags")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", tagId);

  if (!tags || tags.length === 0) throw new Error("Tag not found");

  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw error;
}

// --- Assigner un tag a un contact ou une societe ---

export async function assignTag(entityId: string, tagId: string, type: "contact" | "company") {
  const supabase = await createServerSupabaseClient();

  if (type === "contact") {
    const { error } = await supabase
      .from("contact_tags")
      .insert({ contact_id: entityId, tag_id: tagId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("company_tags")
      .insert({ company_id: entityId, tag_id: tagId });
    if (error) throw error;
  }
}

// --- Retirer un tag d'un contact ou une societe ---

export async function removeTag(entityId: string, tagId: string, type: "contact" | "company") {
  const supabase = await createServerSupabaseClient();

  if (type === "contact") {
    const { error } = await supabase
      .from("contact_tags")
      .delete()
      .eq("contact_id", entityId)
      .eq("tag_id", tagId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("company_tags")
      .delete()
      .eq("company_id", entityId)
      .eq("tag_id", tagId);
    if (error) throw error;
  }
}
