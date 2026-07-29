import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Email, EmailParticipant, EmailWithParticipants, EmailThread } from "@/types/email";
import type { EmailSearchInput } from "@/lib/schemas/email";
import { escapeLike } from "@/lib/utils/format";

// Lectures des emails (les mutations / compteurs vivent dans emailService).

// --- Attache les participants a une liste d'emails ---

async function attachParticipants(emails: Email[]): Promise<EmailWithParticipants[]> {
  if (emails.length === 0) return [];
  const supabase = await createServerSupabaseClient();

  const emailIds = emails.map((e) => e.id);
  const { data: participants, error } = await supabase
    .from("email_participants")
    .select("*")
    .in("email_id", emailIds);

  if (error) throw error;

  // Grouper les participants par email_id
  const participantsByEmail = new Map<string, EmailParticipant[]>();
  for (const p of (participants as EmailParticipant[]) ?? []) {
    const list = participantsByEmail.get(p.email_id) ?? [];
    list.push(p);
    participantsByEmail.set(p.email_id, list);
  }

  return emails.map((email) => ({
    ...email,
    participants: participantsByEmail.get(email.id) ?? [],
  }));
}

// --- Liste paginee avec filtres ---

export async function getEmails(
  organizationId: string,
  params?: EmailSearchInput,
): Promise<{ data: EmailWithParticipants[]; count: number }> {
  const supabase = await createServerSupabaseClient();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("emails")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  // Filtres
  if (params?.folder) query = query.eq("folder", params.folder);
  if (params?.direction) query = query.eq("direction", params.direction);
  if (params?.is_read !== undefined) query = query.eq("is_read", params.is_read);
  if (params?.date_from) query = query.gte("received_at", params.date_from);
  if (params?.date_to) query = query.lte("received_at", params.date_to);

  // Filtre par account_id : passer par les channels du compte
  if (params?.account_id) {
    const { data: channels } = await supabase
      .from("email_channels")
      .select("id")
      .eq("connected_account_id", params.account_id)
      .eq("organization_id", organizationId);

    const channelIds = (channels ?? []).map((c) => c.id);
    if (channelIds.length === 0) return { data: [], count: 0 };
    query = query.in("channel_id", channelIds);
  }

  // Recherche texte sur le sujet
  if (params?.query) {
    query = query.ilike("subject", `%${escapeLike(params.query)}%`);
  }

  // Filtre par contact : sous-requete sur email_participants
  if (params?.contact_id) {
    const { data: participantEmails } = await supabase
      .from("email_participants")
      .select("email_id")
      .eq("contact_id", params.contact_id);

    const emailIds = (participantEmails ?? []).map((p) => p.email_id);
    if (emailIds.length === 0) return { data: [], count: 0 };
    query = query.in("id", emailIds);
  }

  query = query.order("received_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const emails = await attachParticipants((data as Email[]) ?? []);
  return { data: emails, count: count ?? 0 };
}

// --- Detail d'un email ---

export async function getEmail(
  organizationId: string,
  emailId: string,
): Promise<EmailWithParticipants | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", emailId);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const emails = await attachParticipants([data[0] as Email]);
  return emails[0];
}

// --- Thread complet (emails groupes par thread_id) ---

export async function getEmailThread(
  organizationId: string,
  threadId: string,
): Promise<EmailThread | null> {
  const supabase = await createServerSupabaseClient();

  // Recuperer les emails du thread
  const { data: emailsData, error } = await supabase
    .from("emails")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("thread_id", threadId)
    .order("received_at", { ascending: true });

  if (error) throw error;
  if (!emailsData || emailsData.length === 0) return null;

  const emails = await attachParticipants(emailsData as Email[]);

  // Construire le thread compose
  const allParticipants = new Set<string>();
  let unreadCount = 0;
  for (const email of emails) {
    if (!email.is_read) unreadCount++;
    for (const p of email.participants) {
      allParticipants.add(p.email_address);
    }
  }

  const lastEmail = emails[emails.length - 1];

  return {
    thread_id: threadId,
    subject: lastEmail.subject ?? "",
    emails,
    last_received_at: lastEmail.received_at,
    participant_count: allParticipants.size,
    unread_count: unreadCount,
  };
}
