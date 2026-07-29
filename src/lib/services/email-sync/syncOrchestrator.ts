// Orchestrateur de synchronisation email
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/utils/encryption";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize";
import { GmailDriver } from "./gmail-driver";
import { MicrosoftDriver } from "./microsoft-driver";
import { ImapDriver } from "./imap-driver";
import type { EmailProviderDriver, SyncResult, DecryptedCredentials, RawEmail } from "./types";

const DRIVERS: Record<string, () => EmailProviderDriver> = {
  gmail: () => new GmailDriver(),
  microsoft: () => new MicrosoftDriver(),
  imap_smtp: () => new ImapDriver(),
};

function getDriver(provider: string): EmailProviderDriver {
  const factory = DRIVERS[provider];
  if (!factory) throw new Error(`Unknown email provider: ${provider}`);
  return factory();
}

function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - 5 * 60 * 1000 < Date.now();
}

export async function syncChannel(channelId: string): Promise<SyncResult> {
  const result: SyncResult = { channelId, newEmails: 0, matchedParticipants: 0, errors: [] };
  const supabase = await createServerSupabaseClient();

  // 1. Charger le channel + connected_account
  const { data: channels, error: channelErr } = await supabase
    .from("email_channels")
    .select("*, connected_accounts(*)")
    .eq("id", channelId);

  if (channelErr || !channels || channels.length === 0) {
    result.errors.push(`Channel not found: ${channelId}`);
    return result;
  }

  const channel = channels[0];
  const account = (channel as Record<string, unknown>).connected_accounts as Record<
    string,
    unknown
  >;
  if (!account) {
    result.errors.push("Connected account not found");
    return result;
  }
  const provider = account.provider as string;
  const organizationId = channel.organization_id;

  // 2. Dechiffrer les credentials
  let credentials: DecryptedCredentials;
  try {
    const decrypted = decrypt(account.credentials_encrypted as string);
    credentials = JSON.parse(decrypted) as DecryptedCredentials;
  } catch {
    result.errors.push("Failed to decrypt credentials");
    return result;
  }

  // 3. Rafraichir le token OAuth si expire
  const driver = getDriver(provider);
  if (credentials.oauth && isTokenExpired(credentials.oauth.expires_at)) {
    try {
      if (!driver.refreshAccessToken) {
        throw new Error("Driver does not support token refresh");
      }
      const newTokens = await driver.refreshAccessToken(credentials.oauth.refresh_token);
      credentials.oauth = newTokens;

      const encrypted = encrypt(JSON.stringify(credentials));
      await supabase
        .from("connected_accounts")
        .update({ credentials_encrypted: encrypted })
        .eq("id", account.id as string);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown refresh error";
      result.errors.push(`Token refresh failed: ${msg}`);
      await supabase
        .from("connected_accounts")
        .update({ status: "error", sync_error: msg })
        .eq("id", account.id as string);
      return result;
    }
  }

  // 4. Fetch les nouveaux emails
  let fetchResult;
  try {
    fetchResult = await driver.fetchNewEmails(credentials, channel.sync_cursor);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown fetch error";
    result.errors.push(`Fetch failed: ${msg}`);
    await supabase
      .from("connected_accounts")
      .update({ status: "error", sync_error: msg })
      .eq("id", account.id as string);
    return result;
  }

  // 5. Inserer les emails (deduplication par message_id via contrainte unique)
  for (const rawEmail of fetchResult.emails) {
    try {
      const inserted = await insertEmail(supabase, rawEmail, channelId, organizationId);
      if (inserted) result.newEmails++;
    } catch {
      result.errors.push(`Insert failed for message: ${rawEmail.message_id}`);
    }
  }

  // 6. Mettre a jour le curseur et la date de sync
  const now = new Date().toISOString();
  if (fetchResult.nextCursor) {
    await supabase
      .from("email_channels")
      .update({ sync_cursor: fetchResult.nextCursor, last_sync_at: now })
      .eq("id", channelId);
  }
  await supabase
    .from("connected_accounts")
    .update({ last_sync_at: now, status: "connected", sync_error: null })
    .eq("id", account.id as string);

  return result;
}

async function insertEmail(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  raw: RawEmail,
  channelId: string,
  organizationId: string,
): Promise<boolean> {
  const { data: emails, error } = await supabase
    .from("emails")
    .upsert(
      {
        organization_id: organizationId,
        channel_id: channelId,
        thread_id: raw.thread_id ?? null,
        message_id: raw.message_id,
        in_reply_to: raw.in_reply_to ?? null,
        subject: raw.subject ?? null,
        body_text: raw.body_text ?? null,
        body_html: raw.body_html ? sanitizeEmailHtml(raw.body_html) : null,
        snippet: raw.snippet?.substring(0, 150) ?? null,
        direction: raw.direction,
        received_at: raw.received_at,
        is_read: raw.is_read,
        folder: raw.folder,
        has_attachments: raw.has_attachments,
        headers: raw.headers ?? null,
      },
      { onConflict: "organization_id,message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error || !emails || emails.length === 0) return false;
  const emailId = emails[0].id;
  const participantRows = raw.participants.map((p) => ({
    email_id: emailId,
    role: p.role,
    email_address: p.email_address,
    display_name: p.display_name ?? null,
  }));

  if (participantRows.length > 0) {
    await supabase.from("email_participants").insert(participantRows);
  }

  return true;
}

export async function syncAllChannels(organizationId?: string): Promise<SyncResult[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("email_channels").select("id").eq("is_active", true);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data: channels, error } = await query;
  if (error || !channels) return [];

  const results: SyncResult[] = [];
  for (const channel of channels) {
    results.push(await syncChannel(channel.id));
  }
  return results;
}
