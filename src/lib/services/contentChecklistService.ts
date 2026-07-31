import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentChecklistItem, Database } from "@/types/database";
import type { CreateChecklistItemInput, UpdateChecklistItemInput } from "@/lib/schemas/content";

// --- Checklist d'un contenu ---

export async function getChecklist(organizationId: string, contentPieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_checklist_items")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("content_piece_id", contentPieceId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ContentChecklistItem[]) ?? [];
}

// --- Creation ---

export async function createChecklistItem(organizationId: string, input: CreateChecklistItemInput) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_checklist_items")
    .insert({ ...input, organization_id: organizationId })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Checklist item creation failed");
  return data[0] as ContentChecklistItem;
}

// --- Mise a jour (label, ordre, coche) ---

export async function updateChecklistItem(
  organizationId: string,
  itemId: string,
  input: UpdateChecklistItemInput,
) {
  const supabase = await createServerSupabaseClient();

  const updateData: Database["public"]["Tables"]["content_checklist_items"]["Update"] = {
    ...input,
  };
  // done_at suit l'etat coche
  if (input.is_done === true) {
    updateData.done_at = new Date().toISOString();
  } else if (input.is_done === false) {
    updateData.done_at = null;
  }

  const { data, error } = await supabase
    .from("content_checklist_items")
    .update(updateData)
    .eq("organization_id", organizationId)
    .eq("id", itemId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Checklist item not found");
  return data[0] as ContentChecklistItem;
}

// --- Suppression (hard-delete : composant enfant) ---

export async function deleteChecklistItem(organizationId: string, itemId: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("content_checklist_items")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", itemId);

  if (error) throw error;
}
