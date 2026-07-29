import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentScript } from "@/types/database";
import type { UpsertContentScriptInput } from "@/lib/schemas/content";
import * as activityService from "./activityService";

// --- Lecture du script d'un contenu ---

export async function getScript(organizationId: string, contentPieceId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_scripts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("content_piece_id", contentPieceId);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as ContentScript;
}

// --- Upsert (un script par contenu) ---

export async function upsertScript(
  organizationId: string,
  userId: string,
  input: UpsertContentScriptInput,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("content_scripts")
    .upsert({ ...input, organization_id: organizationId }, { onConflict: "content_piece_id" })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Script upsert failed");

  await activityService.log(organizationId, {
    entityType: "content_piece",
    entityId: input.content_piece_id,
    action: "script_updated",
    actorId: userId,
  });
  return data[0] as ContentScript;
}
