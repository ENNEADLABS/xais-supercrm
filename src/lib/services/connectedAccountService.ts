import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ConnectedAccount, ConnectedAccountSafe } from "@/types/email";
import type { ConnectAccountInput } from "@/lib/schemas/email";
import { encrypt } from "@/lib/utils/encryption";
import * as activityService from "./activityService";

// --- Supprime les credentials chiffres pour l'affichage ---

function toSafe(account: ConnectedAccount): ConnectedAccountSafe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { credentials_encrypted, ...safe } = account;
  return safe;
}

// --- Liste des comptes connectes d'une organisation ---

export async function getAccounts(organizationId: string): Promise<ConnectedAccountSafe[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data as ConnectedAccount[]) ?? []).map(toSafe);
}

// --- Detail d'un compte ---

export async function getAccount(
  organizationId: string,
  accountId: string,
): Promise<ConnectedAccountSafe | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", accountId);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return toSafe(data[0] as ConnectedAccount);
}

// --- Connexion d'un nouveau compte ---

export async function createAccount(
  organizationId: string,
  userId: string,
  input: ConnectAccountInput,
): Promise<ConnectedAccountSafe> {
  const supabase = await createServerSupabaseClient();

  // Chiffrement des credentials
  const credentialsEncrypted = encrypt(JSON.stringify(input.credentials));

  const { data, error } = await supabase
    .from("connected_accounts")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      provider: input.provider,
      email_address: input.email_address,
      display_name: input.display_name ?? null,
      credentials_encrypted: credentialsEncrypted,
      status: "connected" as const,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Account creation failed");

  const account = data[0] as ConnectedAccount;

  // Creer un canal par defaut (inbound_only)
  await supabase.from("email_channels").insert({
    connected_account_id: account.id,
    organization_id: organizationId,
    sync_mode: "inbound_only",
    is_active: true,
  });

  // Log d'activite
  await activityService.log(organizationId, {
    entityType: "contact", // Pas de type email_account dans EntityType
    entityId: account.id,
    action: "email_account_connected",
    actorId: userId,
    metadata: { provider: input.provider, email: input.email_address },
  });

  return toSafe(account);
}

// --- Deconnexion d'un compte ---

export async function disconnectAccount(organizationId: string, accountId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Mettre le statut a disconnected
  const { error: updateError } = await supabase
    .from("connected_accounts")
    .update({ status: "disconnected" as const })
    .eq("organization_id", organizationId)
    .eq("id", accountId);

  if (updateError) throw updateError;

  // Desactiver les canaux associes
  const { error: channelError } = await supabase
    .from("email_channels")
    .update({ is_active: false })
    .eq("connected_account_id", accountId)
    .eq("organization_id", organizationId);

  if (channelError) throw channelError;
}

// --- Suppression d'un compte (cascade) ---

export async function deleteAccount(
  organizationId: string,
  accountId: string,
  userId?: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", accountId);

  if (error) throw error;

  await activityService.log(organizationId, {
    entityType: "contact",
    entityId: accountId,
    action: "email_account_deleted",
    actorId: userId ?? null,
  });
}

// --- Mise a jour du statut de sync ---

export async function updateSyncStatus(
  organizationId: string,
  accountId: string,
  status: "connected" | "disconnected" | "error",
  syncError?: string | null,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("connected_accounts")
    .update({
      status,
      sync_error: syncError ?? null,
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}
