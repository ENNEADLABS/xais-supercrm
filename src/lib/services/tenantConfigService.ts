import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, TenantConfig, PipelineStage, Json } from "@/types/database";

// --- Configuration par defaut pour les nouveaux tenants ---

const DEFAULT_CONFIG: TenantConfig = {
  currency: "EUR",
  locale: "fr-FR",
  quote_prefix: "DEV",
  invoice_prefix: "FAC",
  pipeline_stages: [
    { id: "new", label: "Nouveau", color: "#6B7280", order: 0 },
    { id: "qualifying", label: "Qualification", color: "#3B82F6", order: 1 },
    { id: "proposal", label: "Proposition", color: "#F59E0B", order: 2 },
    { id: "negotiation", label: "Négociation", color: "#8B5CF6", order: 3 },
    { id: "won", label: "Gagné", color: "#10B981", order: 4 },
    { id: "lost", label: "Perdu", color: "#EF4444", order: 5 },
  ],
  probability_map: { new: 10, qualifying: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 },
  default_vat_rate: 2000,
  payment_terms_days: 30,
};

// --- Recuperation de la config tenant ---

/** Retourne la config du tenant, ou la config par defaut si non trouvee.
 * `client` optionnel : par defaut la session cookie courante (cf. contactService.ts). */
export async function getTenantConfig(
  organizationId: string,
  client?: SupabaseClient<Database>,
): Promise<TenantConfig> {
  const supabase = client ?? (await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("tenant_config")
    .select("config")
    .eq("organization_id", organizationId);

  if (error) throw error;
  if (!data || data.length === 0) return DEFAULT_CONFIG;

  return data[0].config as unknown as TenantConfig;
}

// --- Acces aux stages du pipeline ---

/** Retourne les stages du pipeline, tries par ordre */
export async function getPipelineStages(organizationId: string): Promise<PipelineStage[]> {
  const config = await getTenantConfig(organizationId);
  return [...config.pipeline_stages].sort((a, b) => a.order - b.order);
}

// --- Probabilite par stage ---

/** Retourne la probabilite associee a un stage, 0 si non trouve */
export async function getProbabilityForStage(
  organizationId: string,
  stageId: string,
): Promise<number> {
  const config = await getTenantConfig(organizationId);
  return config.probability_map[stageId] ?? 0;
}

// --- Mise a jour partielle de la config ---

/** Met a jour la config du tenant en fusionnant avec l'existante */
export async function updateTenantConfig(
  organizationId: string,
  partialConfig: Partial<TenantConfig>,
): Promise<TenantConfig> {
  const supabase = await createServerSupabaseClient();
  const current = await getTenantConfig(organizationId);
  const merged = { ...current, ...partialConfig };

  // Upsert : creer si absent, mettre a jour sinon
  const { data, error } = await supabase
    .from("tenant_config")
    .upsert(
      {
        organization_id: organizationId,
        config: merged as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    )
    .select("config");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Échec de la mise à jour de la config");

  return data[0].config as unknown as TenantConfig;
}

// --- Mise a jour de la config pipeline ---

/** Met a jour les stages et la probability_map avec verification de coherence */
export async function updatePipelineConfig(
  organizationId: string,
  stages: PipelineStage[],
  probabilityMap: Record<string, number>,
): Promise<TenantConfig> {
  // Verifier que chaque stage a une entree dans la probability_map
  const stageIds = stages.map((s) => s.id);
  for (const id of stageIds) {
    if (!(id in probabilityMap)) {
      throw new Error(`Stage "${id}" n'a pas de probabilité définie`);
    }
  }

  return updateTenantConfig(organizationId, {
    pipeline_stages: stages,
    probability_map: probabilityMap,
  });
}

// --- Mise a jour de la config commerciale ---

/** Met a jour uniquement les champs commerciaux de la config */
export async function updateCommercialConfig(
  organizationId: string,
  fields: {
    quote_prefix: string;
    invoice_prefix: string;
    default_vat_rate: number;
    payment_terms_days: number;
    currency: string;
  },
): Promise<TenantConfig> {
  return updateTenantConfig(organizationId, fields);
}

// --- Onboarding ---

/** Verifie si l'onboarding est termine */
export async function isOnboardingComplete(organizationId: string): Promise<boolean> {
  const config = await getTenantConfig(organizationId);
  return config.onboarding_completed === true;
}

/** Marque l'onboarding comme termine */
export async function markOnboardingComplete(organizationId: string): Promise<void> {
  await updateTenantConfig(organizationId, { onboarding_completed: true });
}
