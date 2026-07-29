// Driver Gmail — utilise l'API REST Gmail v1 (pas de SDK googleapis)

import type {
  EmailProviderDriver,
  DecryptedCredentials,
  FetchResult,
  RawEmail,
  RawParticipant,
  OAuthTokens,
  OutgoingEmail,
  SentEmailResult,
} from "./types";
import { buildMimeMessage, encodeBase64Url } from "./mime-builder";
import type { GmailMessage, GmailMessagePart } from "./gmail-helpers";
import { getHeader, parseAddressList, extractBody } from "./gmail-helpers";
import type { GmailListResponse, GmailHistoryResponse } from "./gmail-helpers";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GmailDriver implements EmailProviderDriver {
  async testConnection(credentials: DecryptedCredentials): Promise<boolean> {
    const token = credentials.oauth?.access_token;
    if (!token) return false;
    const res = await fetch(`${GMAIL_API}/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  async fetchNewEmails(
    credentials: DecryptedCredentials,
    syncCursor: string | null,
    maxResults = 50,
  ): Promise<FetchResult> {
    const token = credentials.oauth?.access_token;
    if (!token) throw new Error("No OAuth access token");

    if (!syncCursor) return this.initialSync(token, maxResults);
    return this.incrementalSync(token, syncCursor, maxResults);
  }

  // --- Sync initiale : messages des 30 derniers jours ---
  private async initialSync(token: string, maxResults: number): Promise<FetchResult> {
    const url = `${GMAIL_API}/users/me/messages?q=newer_than:30d&maxResults=${maxResults}`;
    const listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);

    const listData = (await listRes.json()) as GmailListResponse;
    const messageRefs = listData.messages ?? [];
    const emails: RawEmail[] = [];
    let latestHistoryId: string | null = null;

    for (const ref of messageRefs) {
      const msg = await this.fetchFullMessage(token, ref.id);
      if (!msg) continue;
      if (!latestHistoryId || msg.historyId > latestHistoryId) {
        latestHistoryId = msg.historyId;
      }
      emails.push(this.parseMessage(msg));
    }

    return { emails, nextCursor: latestHistoryId, hasMore: !!listData.nextPageToken };
  }

  // --- Sync incrementale : via history API ---
  private async incrementalSync(
    token: string,
    historyId: string,
    maxResults: number,
  ): Promise<FetchResult> {
    const url =
      `${GMAIL_API}/users/me/history?startHistoryId=${historyId}` +
      `&historyTypes=messageAdded&maxResults=${maxResults}`;
    const histRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // 404 = historyId trop ancien, fallback sur sync initiale
    if (histRes.status === 404) return this.initialSync(token, maxResults);
    if (!histRes.ok) throw new Error(`Gmail history failed: ${histRes.status}`);

    const histData = (await histRes.json()) as GmailHistoryResponse;
    const messageIds = new Set<string>();
    for (const entry of histData.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        messageIds.add(added.message.id);
      }
    }

    const emails: RawEmail[] = [];
    for (const id of messageIds) {
      const msg = await this.fetchFullMessage(token, id);
      if (msg) emails.push(this.parseMessage(msg));
    }

    return { emails, nextCursor: histData.historyId, hasMore: !!histData.nextPageToken };
  }

  // --- Charge un message complet ---
  private async fetchFullMessage(token: string, messageId: string): Promise<GmailMessage | null> {
    const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as GmailMessage;
  }

  // --- Parse un message Gmail en RawEmail ---
  private parseMessage(msg: GmailMessage): RawEmail {
    const headers = msg.payload.headers ?? [];
    const { text, html } = extractBody(msg.payload);
    const participants: RawParticipant[] = [
      ...parseAddressList(getHeader(headers, "From"), "from"),
      ...parseAddressList(getHeader(headers, "To"), "to"),
      ...parseAddressList(getHeader(headers, "Cc"), "cc"),
      ...parseAddressList(getHeader(headers, "Bcc"), "bcc"),
    ];
    const direction = msg.labelIds?.includes("SENT") ? "outbound" : "inbound";

    return {
      message_id: getHeader(headers, "Message-ID") ?? msg.id,
      thread_id: msg.threadId,
      in_reply_to: getHeader(headers, "In-Reply-To"),
      subject: getHeader(headers, "Subject"),
      body_text: text,
      body_html: html,
      snippet: msg.snippet,
      direction,
      received_at: getHeader(headers, "Date") ?? new Date().toISOString(),
      is_read: !msg.labelIds?.includes("UNREAD"),
      folder: this.labelToFolder(msg.labelIds),
      has_attachments: this.checkAttachments(msg.payload),
      participants,
    };
  }

  // --- Mapping labels Gmail → dossier ---
  private labelToFolder(labels: string[]): string {
    if (labels?.includes("SENT")) return "sent";
    if (labels?.includes("DRAFT")) return "drafts";
    if (labels?.includes("TRASH")) return "trash";
    if (labels?.includes("SPAM")) return "spam";
    return "inbox";
  }

  // --- Verifie la presence de pieces jointes ---
  private checkAttachments(part: GmailMessagePart): boolean {
    if (part.body.size > 0 && part.mimeType !== "text/plain" && part.mimeType !== "text/html") {
      if (part.headers?.some((h) => h.name.toLowerCase() === "content-disposition")) return true;
    }
    return part.parts?.some((p) => this.checkAttachments(p)) ?? false;
  }

  // --- Envoi d'email via Gmail API ---
  async sendEmail(
    credentials: DecryptedCredentials,
    message: OutgoingEmail,
  ): Promise<SentEmailResult> {
    const token = credentials.oauth?.access_token;
    if (!token) throw new Error("No OAuth access token");

    // Recuperer l'adresse email du compte via le profil Gmail
    const profileRes = await fetch(`${GMAIL_API}/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) throw new Error(`Gmail profile fetch failed: ${profileRes.status}`);
    const profile = (await profileRes.json()) as { emailAddress: string };

    // Construire le message MIME
    const mime = buildMimeMessage({
      from: profile.emailAddress,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      body_text: message.body_text,
      body_html: message.body_html,
      in_reply_to: message.in_reply_to,
      references: message.references,
    });
    const raw = encodeBase64Url(mime);

    // Envoyer via l'API Gmail
    const response = await fetch(`${GMAIL_API}/users/me/messages/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw, threadId: message.thread_id }),
    });
    if (!response.ok) throw new Error(`Gmail send failed: ${response.status}`);

    const data = (await response.json()) as { id: string; threadId: string };
    return { provider_message_id: data.id, thread_id: data.threadId };
  }

  // --- Echange code OAuth → tokens ---
  async exchangeAuthCode(authCode: string, redirectUri: string): Promise<OAuthTokens> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: authCode,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`OAuth code exchange failed: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return this.normalizeTokenResponse(data);
  }

  // --- Rafraichit un access token expire ---
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`OAuth refresh failed: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return {
      ...this.normalizeTokenResponse(data),
      refresh_token: (data.refresh_token as string) ?? refreshToken,
    };
  }

  // --- Normalise la reponse token Google ---
  private normalizeTokenResponse(data: Record<string, unknown>): OAuthTokens {
    const expiresIn = (data.expires_in as number) ?? 3600;
    return {
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string,
      token_type: (data.token_type as string) ?? "Bearer",
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }
}
