import { randomBytes, randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateRawKey, hashApiKey, keyPrefixFor } from "@/lib/utils/apiAuth";
import type { ApiKey, Database } from "@/types/database";

// --- Generation d'une cle API pour les integrations externes ---

interface GeneratedApiKey {
  rawKey: string;
  apiKey: Omit<ApiKey, "key_hash">;
}

// Toutes les lectures renvoyees au client excluent key_hash (meme hygiene que
// la cle brute : le hash ne sert qu'a la resolution serveur, jamais a l'UI).
const API_KEY_COLUMNS =
  "id, organization_id, robot_user_id, label, key_prefix, created_by, created_at, last_used_at, revoked_at";

export async function generateApiKey(
  organizationId: string,
  label: string,
  createdByUserId: string,
): Promise<GeneratedApiKey> {
  // Seul usage du service-role de tout le chantier : creation ponctuelle du
  // compte robot (admin.createUser), jamais sur le chemin d'ecriture bot.
  const serviceClient = createServiceRoleClient();

  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: `robot-${randomUUID()}@bots.internal`,
    password: randomBytes(32).toString("hex"), // jamais reutilise (auth = JWT signe, pas mot de passe)
    email_confirm: true,
    user_metadata: { full_name: label },
  });
  if (userError) throw userError;
  const robotUserId = userData.user.id;

  // Compensation : les etapes suivantes ne sont pas transactionnelles (l'API
  // Auth n'est pas du SQL) — tout echec apres createUser doit supprimer le
  // robot, sinon il reste orphelin (voire membre de l'org sans cle associee,
  // invisible dans l'UI et nettoyable uniquement en SQL).
  try {
    await cleanupAutoCreatedOrganization(serviceClient, robotUserId);

    const { error: memberError } = await serviceClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: robotUserId, role: "member" });
    if (memberError) throw memberError;

    const rawKey = generateRawKey();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        organization_id: organizationId,
        robot_user_id: robotUserId,
        label,
        key_prefix: keyPrefixFor(rawKey),
        key_hash: hashApiKey(rawKey),
        created_by: createdByUserId,
      })
      .select(API_KEY_COLUMNS);

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Échec de la création de la clé API");

    return { rawKey, apiKey: data[0] };
  } catch (error) {
    await rollbackRobotUser(serviceClient, robotUserId, organizationId);
    throw error;
  }
}

/**
 * Best-effort : supprime les organisations residuelles du robot (l'org
 * auto-creee par handle_new_user si cleanupAutoCreatedOrganization n'a pas
 * tourne) puis le compte robot — les FK ON DELETE CASCADE nettoient
 * membership et api_keys. GARDE CRITIQUE : ne jamais toucher l'organisation
 * cible, dont le robot peut deja etre membre au moment de l'echec.
 */
async function rollbackRobotUser(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  robotUserId: string,
  targetOrganizationId: string,
): Promise<void> {
  try {
    const { data: memberships } = await serviceClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", robotUserId);

    for (const { organization_id } of memberships ?? []) {
      if (organization_id !== targetOrganizationId) {
        await serviceClient.from("organizations").delete().eq("id", organization_id);
      }
    }

    await serviceClient.auth.admin.deleteUser(robotUserId);
  } catch (rollbackError) {
    // Robot orphelin a nettoyer manuellement — signale, sans masquer l'erreur d'origine
    Sentry.captureException(rollbackError);
  }
}

export async function revokeApiKey(organizationId: string, apiKeyId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: keys, error: keyError } = await supabase
    .from("api_keys")
    .select("id, robot_user_id, revoked_at")
    .eq("id", apiKeyId)
    .eq("organization_id", organizationId);

  if (keyError) throw keyError;
  if (!keys || keys.length === 0) throw new Error("Clé API introuvable");
  if (keys[0].revoked_at) return; // deja revoquee : idempotent (double-clic UI)

  const { data: updated, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", apiKeyId)
    .eq("organization_id", organizationId)
    .select("id");

  if (error) throw error;
  if (!updated || updated.length === 0) throw new Error("Échec de la révocation de la clé");

  // Defense in depth : detache le robot de l'organisation. Meme un JWT forge
  // pour ce robot (fuite du secret JWT) ne resoudrait plus aucune organisation
  // via get_user_org_id(). Le compte auth.users reste (trace d'audit api_keys
  // conservee — un deleteUser cascaderait sur la ligne api_keys revoquee).
  const { error: memberError } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", keys[0].robot_user_id);

  if (memberError) throw memberError;
}

export async function listApiKeys(organizationId: string): Promise<Omit<ApiKey, "key_hash">[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select(API_KEY_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * handle_new_user() (trigger sur auth.users) auto-cree une organisation +
 * membership admin + tenant_config pour tout nouvel utilisateur, y compris
 * le compte robot. Sans ce nettoyage, le robot serait membre de 2
 * organisations et get_user_org_id() (LIMIT 1 sans ORDER BY) resoudrait au
 * hasard — trouve en testant contre Postgres local (curl + auth.uid()).
 * ON DELETE CASCADE sur organizations supprime membership + tenant_config.
 */
async function cleanupAutoCreatedOrganization(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  robotUserId: string,
): Promise<void> {
  const { data: junkMemberships, error: junkError } = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", robotUserId);
  if (junkError) throw junkError;

  for (const { organization_id } of junkMemberships ?? []) {
    const { error: deleteOrgError } = await serviceClient
      .from("organizations")
      .delete()
      .eq("id", organization_id);
    if (deleteOrgError) throw deleteOrgError;
  }
}

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(url, serviceKey);
}
