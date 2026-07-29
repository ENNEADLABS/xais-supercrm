import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactChannelInput } from "@/lib/schemas/contact";

// Type manuel (non généré) — à régénérer après `npx supabase gen types typescript --local`
export interface ContactChannel {
  id: string;
  organization_id: string;
  contact_id: string;
  type: "email" | "phone";
  value: string;
  label: "work" | "personal" | "mobile" | "other" | null;
  created_at: string;
}

// --- Lecture ---

export async function getContactChannels(
  organizationId: string,
  contactId: string,
): Promise<ContactChannel[]> {
  const supabase = await createServerSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contact_channels pas encore dans les types générés
  const { data, error } = await (supabase as any)
    .from("contact_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ContactChannel[];
}

// --- Ajout ---

export async function addContactChannel(
  organizationId: string,
  contactId: string,
  input: ContactChannelInput,
): Promise<ContactChannel> {
  const supabase = await createServerSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contact_channels pas encore dans les types générés
  const { data, error } = await (supabase as any)
    .from("contact_channels")
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      type: input.type,
      value: input.value,
      label: input.label ?? null,
    })
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Channel creation failed");

  return data[0] as ContactChannel;
}

// --- Suppression ---

export async function removeContactChannel(
  organizationId: string,
  channelId: string,
  contactId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contact_channels pas encore dans les types générés
  const { error } = await (supabase as any)
    .from("contact_channels")
    .delete()
    .eq("id", channelId)
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId);

  if (error) throw error;
}
