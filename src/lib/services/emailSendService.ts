// Service d'envoi d'emails — compose, envoie via le driver, persiste en DB

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/utils/encryption";
import { GmailDriver } from "@/lib/services/email-sync/gmail-driver";
import type { DecryptedCredentials, OutgoingEmail } from "@/lib/services/email-sync/types";
import type { ConnectedAccount, Email } from "@/types/email";
import * as emailMatchingService from "./emailMatchingService";
import * as activityService from "./activityService";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize";

// --- Helpers internes ---

function getDriver(provider: string) {
  if (provider === "gmail") return new GmailDriver();
  throw new Error(`Send not supported for provider: ${provider}`);
}

function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - 5 * 60 * 1000 < Date.now();
}

/** Charge le compte, dechiffre et rafraichit le token si necessaire */
async function loadAccountWithCredentials(organizationId: string, accountId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", accountId);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Connected account not found");

  const account = data[0] as ConnectedAccount;
  let credentials = JSON.parse(decrypt(account.credentials_encrypted)) as DecryptedCredentials;

  // Rafraichir le token si expire
  if (credentials.oauth && isTokenExpired(credentials.oauth.expires_at)) {
    const driver = getDriver(account.provider);
    if (!driver.refreshAccessToken) throw new Error("Driver does not support token refresh");
    credentials.oauth = await driver.refreshAccessToken(credentials.oauth.refresh_token);
    const encrypted = encrypt(JSON.stringify(credentials));
    await supabase
      .from("connected_accounts")
      .update({ credentials_encrypted: encrypted })
      .eq("id", account.id);
  }

  return { account, credentials };
}

// --- Compose et envoie un nouvel email ---

interface ComposeInput {
  account_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text: string;
  body_html?: string;
}

export async function composeAndSend(
  organizationId: string,
  userId: string,
  input: ComposeInput,
): Promise<string> {
  const { account, credentials } = await loadAccountWithCredentials(
    organizationId,
    input.account_id,
  );
  const driver = getDriver(account.provider);
  if (!driver.sendEmail) throw new Error("Driver does not support sending");

  const outgoing: OutgoingEmail = {
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    body_text: input.body_text,
    body_html: input.body_html,
  };

  const result = await driver.sendEmail(credentials, outgoing);

  // Persister l'email envoye en DB
  const supabase = await createServerSupabaseClient();
  const { data: channels } = await supabase
    .from("email_channels")
    .select("id")
    .eq("connected_account_id", account.id)
    .limit(1);

  const channelId = channels?.[0]?.id;
  if (!channelId) throw new Error("No email channel found for this account");

  const { data: emails, error } = await supabase
    .from("emails")
    .insert({
      organization_id: organizationId,
      channel_id: channelId,
      message_id: result.provider_message_id,
      thread_id: result.thread_id ?? null,
      subject: input.subject,
      body_text: input.body_text,
      body_html: input.body_html ? sanitizeEmailHtml(input.body_html) : null,
      snippet: input.body_text.substring(0, 150),
      direction: "outbound" as const,
      received_at: new Date().toISOString(),
      is_read: true,
      folder: "sent" as const,
      has_attachments: false,
    })
    .select("id");

  if (error) throw error;
  const emailId = emails?.[0]?.id;
  if (!emailId) throw new Error("Failed to save sent email");

  // Inserer les participants
  const participants = [
    {
      email_id: emailId,
      role: "from" as const,
      email_address: account.email_address,
      display_name: account.display_name,
    },
    ...input.to.map((addr) => ({
      email_id: emailId,
      role: "to" as const,
      email_address: addr,
      display_name: null,
    })),
    ...(input.cc ?? []).map((addr) => ({
      email_id: emailId,
      role: "cc" as const,
      email_address: addr,
      display_name: null,
    })),
    ...(input.bcc ?? []).map((addr) => ({
      email_id: emailId,
      role: "bcc" as const,
      email_address: addr,
      display_name: null,
    })),
  ];
  await supabase.from("email_participants").insert(participants);

  // Matching des participants vers les contacts
  await emailMatchingService.matchParticipants(organizationId, emailId);

  // Log d'activite
  await activityService.log(organizationId, {
    entityType: "contact",
    entityId: emailId,
    action: "email_sent",
    actorId: userId,
    metadata: { to: input.to, subject: input.subject },
  });

  return emailId;
}

// --- Repondre a un email existant ---

interface ReplyInput {
  email_id: string;
  body_text: string;
  body_html?: string;
  reply_all: boolean;
}

export async function replyToEmail(
  organizationId: string,
  userId: string,
  input: ReplyInput,
): Promise<string> {
  const supabase = await createServerSupabaseClient();

  // Charger l'email original avec ses participants
  const { data: origEmails, error: origErr } = await supabase
    .from("emails")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", input.email_id);

  if (origErr) throw origErr;
  if (!origEmails || origEmails.length === 0) throw new Error("Original email not found");
  const original = origEmails[0] as Email;

  const { data: origParticipants } = await supabase
    .from("email_participants")
    .select("*")
    .eq("email_id", original.id);

  // Determiner le compte connecte (via channel)
  const { data: channels } = await supabase
    .from("email_channels")
    .select("id, connected_account_id")
    .eq("id", original.channel_id ?? "");

  if (!channels || channels.length === 0) throw new Error("No channel found for this email");
  const accountId = channels[0].connected_account_id;

  // Construire les destinataires
  const fromParticipant = origParticipants?.find((p) => p.role === "from");
  const to = fromParticipant ? [fromParticipant.email_address] : [];

  let cc: string[] = [];
  if (input.reply_all) {
    const toAddrs =
      origParticipants?.filter((p) => p.role === "to").map((p) => p.email_address) ?? [];
    const ccAddrs =
      origParticipants?.filter((p) => p.role === "cc").map((p) => p.email_address) ?? [];
    cc = [...toAddrs, ...ccAddrs];
  }

  // Prefixer le sujet si necessaire
  const subject = original.subject?.startsWith("Re: ")
    ? original.subject
    : `Re: ${original.subject ?? ""}`;

  return composeAndSend(organizationId, userId, {
    account_id: accountId,
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject,
    body_text: input.body_text,
    body_html: input.body_html,
  });
}
