import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailParticipant } from "@/types/email";
import type { Contact, Company } from "@/types/database";

// --- Matching des participants emails vers contacts et societes ---

/** Extrait le domaine d'une adresse email */
function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

// --- Match un participant vers un contact par adresse email ---

async function findContactByEmail(
  organizationId: string,
  emailAddress: string,
): Promise<Contact | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .ilike("email", emailAddress)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Contact;
}

// --- Match une societe par domaine ---

export async function matchByDomain(
  organizationId: string,
  emailAddress: string,
): Promise<Company | null> {
  const domain = extractDomain(emailAddress);
  if (!domain) return null;

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .ilike("domain", domain)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0] as Company;
}

// --- Match les participants d'un email ---

export async function matchParticipants(organizationId: string, emailId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Recuperer les participants non encore matches
  const { data: participants, error } = await supabase
    .from("email_participants")
    .select("*")
    .eq("email_id", emailId)
    .is("contact_id", null);

  if (error) throw error;
  if (!participants || participants.length === 0) return;

  for (const participant of participants as EmailParticipant[]) {
    const contact = await findContactByEmail(organizationId, participant.email_address);

    // Mettre a jour seulement si on trouve un match contact
    if (contact) {
      const { error: updateError } = await supabase
        .from("email_participants")
        .update({ contact_id: contact.id })
        .eq("id", participant.id);

      if (updateError) throw updateError;
    }
  }
}

// --- Match en batch pour plusieurs emails ---

export async function matchParticipantsBatch(
  organizationId: string,
  emailIds: string[],
): Promise<void> {
  for (const emailId of emailIds) {
    await matchParticipants(organizationId, emailId);
  }
}

// --- Re-match tous les participants non lies ---

export async function reMatchAll(organizationId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  // Recuperer tous les participants non matches
  // On filtre par org via une jointure implicite avec emails
  const { data: unmatchedParticipants, error } = await supabase
    .from("email_participants")
    .select("id, email_address, email_id")
    .is("contact_id", null);

  if (error) throw error;
  if (!unmatchedParticipants || unmatchedParticipants.length === 0) return 0;

  let matchCount = 0;

  for (const participant of unmatchedParticipants) {
    const contact = await findContactByEmail(organizationId, participant.email_address);

    if (contact) {
      const { error: updateError } = await supabase
        .from("email_participants")
        .update({ contact_id: contact.id })
        .eq("id", participant.id);

      if (!updateError) matchCount++;
    }
  }

  return matchCount;
}
