import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, OrganizationMember, MemberRole } from "@/types/database";

// --- Detection des comptes robot (bots API, cf. apiKeyService) ---
// Un membre porteur d'une cle API active n'est pas un humain : changer son
// role ou le supprimer casserait silencieusement le bot (la cle resterait
// affichee "Active" dans Settings alors que toute ecriture echouerait en RLS).

async function findActiveApiKeyLabel(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("label")
    .eq("robot_user_id", userId)
    .is("revoked_at", null);

  if (error) throw error;
  return data && data.length > 0 ? data[0].label : null;
}

// --- Recuperation des membres de l'organisation ---

export async function getMembers(organizationId: string): Promise<OrganizationMember[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// --- Comptage des admins ---

export async function getAdminCount(organizationId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("role", "admin");

  if (error) throw error;
  return data?.length ?? 0;
}

// --- Ajout d'un membre (V1 simplifie : par user_id) ---

export async function addMember(
  organizationId: string,
  userId: string,
  role: MemberRole,
): Promise<OrganizationMember> {
  const supabase = await createServerSupabaseClient();

  // Verifier que le membre n'existe pas deja
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (existing && existing.length > 0) {
    throw new Error("Cet utilisateur est déjà membre de l'organisation");
  }

  const { data, error } = await supabase
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: userId, role })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Échec de l'ajout du membre");

  return data[0];
}

// --- Modification du role d'un membre ---

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: MemberRole,
): Promise<OrganizationMember> {
  const supabase = await createServerSupabaseClient();

  // Recuperer le membre actuel
  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (!members || members.length === 0) {
    throw new Error("Membre introuvable");
  }

  const currentMember = members[0];

  // Proteger les comptes robot (bots API)
  const botLabel = await findActiveApiKeyLabel(supabase, currentMember.user_id);
  if (botLabel) {
    throw new Error(`Ce membre est le bot "${botLabel}" — révoquez sa clé API pour le retirer`);
  }

  // Proteger le dernier admin
  if (currentMember.role === "admin" && newRole !== "admin") {
    const adminCount = await getAdminCount(organizationId);
    if (adminCount <= 1) {
      throw new Error("Impossible de retirer le dernier administrateur");
    }
  }

  const { data, error } = await supabase
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Échec de la mise à jour du rôle");

  return data[0];
}

// --- Suppression d'un membre ---

export async function removeMember(
  organizationId: string,
  memberId: string,
  currentUserId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Recuperer le membre a supprimer
  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (!members || members.length === 0) {
    throw new Error("Membre introuvable");
  }

  const member = members[0];

  // Interdire de se supprimer soi-meme
  if (member.user_id === currentUserId) {
    throw new Error("Vous ne pouvez pas vous retirer vous-même");
  }

  // Proteger les comptes robot (bots API)
  const botLabel = await findActiveApiKeyLabel(supabase, member.user_id);
  if (botLabel) {
    throw new Error(`Ce membre est le bot "${botLabel}" — révoquez sa clé API pour le retirer`);
  }

  // Proteger le dernier admin
  if (member.role === "admin") {
    const adminCount = await getAdminCount(organizationId);
    if (adminCount <= 1) {
      throw new Error("Impossible de supprimer le dernier administrateur");
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}
