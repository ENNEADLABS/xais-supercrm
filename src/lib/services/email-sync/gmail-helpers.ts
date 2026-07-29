// Helpers et types internes pour le driver Gmail

import type { RawParticipant } from "./types";

// --- Types internes Gmail API ---

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  headers?: GmailHeader[];
  body: { data?: string; size: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  historyId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailMessagePart;
}

export interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
}

export interface GmailHistoryResponse {
  history?: { messagesAdded?: { message: { id: string } }[] }[];
  historyId: string;
  nextPageToken?: string;
}

// --- Helpers ---

/** Decode base64url (standard Gmail) en string UTF-8 */
export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Extrait la valeur d'un header par nom (case-insensitive) */
export function getHeader(headers: GmailHeader[], name: string): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/** Parse "Display Name <email@example.com>" → { display_name, email_address } */
function parseEmailAddress(raw: string): { display_name?: string; email_address: string } {
  const match = raw.match(/^(?:"?(.+?)"?\s)?<?([^\s<>]+@[^\s<>]+)>?$/);
  if (!match) return { email_address: raw.trim() };
  return {
    display_name: match[1]?.trim() || undefined,
    email_address: match[2].toLowerCase(),
  };
}

/** Parse une liste d'adresses separees par des virgules */
export function parseAddressList(
  raw: string | undefined,
  role: RawParticipant["role"],
): RawParticipant[] {
  if (!raw) return [];
  // Split sur virgule mais pas dans les guillemets
  return raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((addr) => {
    const { display_name, email_address } = parseEmailAddress(addr.trim());
    return { role, display_name, email_address };
  });
}

/** Extrait recursivement le body text/plain et text/html du payload */
export function extractBody(part: GmailMessagePart): { text?: string; html?: string } {
  if (part.mimeType === "text/plain" && part.body.data) {
    return { text: decodeBase64Url(part.body.data) };
  }
  if (part.mimeType === "text/html" && part.body.data) {
    return { html: decodeBase64Url(part.body.data) };
  }
  if (part.parts) {
    let text: string | undefined;
    let html: string | undefined;
    for (const sub of part.parts) {
      const result = extractBody(sub);
      if (result.text) text = result.text;
      if (result.html) html = result.html;
    }
    return { text, html };
  }
  return {};
}
