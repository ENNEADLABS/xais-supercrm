import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/database";

// --- Recuperation de l'organisation ---

export async function getOrganization(organizationId: string): Promise<Organization> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("organizations").select("*").eq("id", organizationId);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Organisation introuvable");

  return data[0];
}

// --- Mise a jour du nom de l'organisation ---

export async function updateOrganization(
  organizationId: string,
  input: { name: string },
): Promise<Organization> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("organizations")
    .update({ name: input.name, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Échec de la mise à jour");

  return data[0];
}
