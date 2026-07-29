import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, EntityType, Json } from "@/types/database";

// --- Parametres pour le log d'activite ---

interface LogActivityParams {
  entityType: EntityType;
  entityId: string;
  action: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

// --- Service d'activite (log d'audit) ---
// `client` optionnel : par defaut la session cookie courante (cf. contactService.ts).

/** Insere une entree dans la table activities */
export async function log(
  organizationId: string,
  params: LogActivityParams,
  client?: SupabaseClient<Database>,
): Promise<void> {
  const supabase = client ?? (await createServerSupabaseClient());

  const { error } = await supabase.from("activities").insert({
    organization_id: organizationId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor_id: params.actorId ?? null,
    metadata: (params.metadata ?? {}) as Json,
  });

  if (error) throw error;
}

/** Recupere les activites d'une entite, triees par date desc */
export async function getActivities(
  organizationId: string,
  entityType: EntityType,
  entityId: string,
  limit = 50,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
