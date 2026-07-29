// Types pour le moteur de synchronisation email

// --- Interface driver (pattern Strategy) ---

export interface EmailProviderDriver {
  testConnection(credentials: DecryptedCredentials): Promise<boolean>;
  fetchNewEmails(
    credentials: DecryptedCredentials,
    syncCursor: string | null,
    maxResults?: number,
  ): Promise<FetchResult>;
  exchangeAuthCode?(authCode: string, redirectUri: string): Promise<OAuthTokens>;
  refreshAccessToken?(refreshToken: string): Promise<OAuthTokens>;
  sendEmail?(credentials: DecryptedCredentials, message: OutgoingEmail): Promise<SentEmailResult>;
}

// --- Resultats de fetch ---

export interface FetchResult {
  emails: RawEmail[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RawEmail {
  message_id: string;
  thread_id?: string;
  in_reply_to?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  snippet?: string;
  direction: "inbound" | "outbound";
  received_at: string;
  is_read: boolean;
  folder: string;
  has_attachments: boolean;
  headers?: Record<string, string>;
  participants: RawParticipant[];
}

export interface RawParticipant {
  role: "from" | "to" | "cc" | "bcc";
  email_address: string;
  display_name?: string;
}

// --- OAuth ---

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
}

// --- Credentials dechiffrees ---

export interface DecryptedCredentials {
  provider: "gmail" | "microsoft" | "imap_smtp";
  oauth?: OAuthTokens;
  imap?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
}

// --- Email sortant ---

export interface OutgoingEmail {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  in_reply_to?: string;
  references?: string;
  thread_id?: string;
}

// --- Resultat d'envoi ---

export interface SentEmailResult {
  provider_message_id: string;
  thread_id?: string;
}

// --- Erreur provider non disponible ---

export class ProviderNotAvailableError extends Error {
  constructor(
    public readonly provider: string,
    public readonly operation: string,
  ) {
    super(`${provider} ${operation} is not yet available. Coming soon.`);
    this.name = "ProviderNotAvailableError";
  }
}

// --- Resultat de synchronisation ---

export interface SyncResult {
  channelId: string;
  newEmails: number;
  matchedParticipants: number;
  errors: string[];
}
