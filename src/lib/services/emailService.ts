import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailFolder } from "@/types/email";

// Mutations et compteurs des emails (les lectures vivent dans emailQueries).

// --- Marquer comme lu/non lu ---

export async function markAsRead(
  organizationId: string,
  emailIds: string[],
  isRead: boolean,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("emails")
    .update({ is_read: isRead })
    .eq("organization_id", organizationId)
    .in("id", emailIds);

  if (error) throw error;
}

// --- Deplacer vers un dossier ---

export async function moveToFolder(
  organizationId: string,
  emailIds: string[],
  folder: EmailFolder,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("emails")
    .update({ folder })
    .eq("organization_id", organizationId)
    .in("id", emailIds);

  if (error) throw error;
}

// --- Compteur d'emails non lus ---

export async function getUnreadCount(organizationId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_read", false)
    .eq("folder", "inbox");

  if (error) throw error;
  return count ?? 0;
}

// --- Compteurs par dossier ---

export async function getFolderCounts(organizationId: string): Promise<Record<string, number>> {
  const folders: EmailFolder[] = ["inbox", "sent", "archive", "trash", "drafts"];
  const supabase = await createServerSupabaseClient();
  const counts: Record<string, number> = {};

  // Requetes paralleles pour chaque dossier
  const results = await Promise.all(
    folders.map((folder) =>
      supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("folder", folder),
    ),
  );

  for (let i = 0; i < folders.length; i++) {
    if (results[i].error) throw results[i].error;
    counts[folders[i]] = results[i].count ?? 0;
  }

  return counts;
}
