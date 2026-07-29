// ============================================================================
// Types metier Email
// Derives du schema DB (connected_accounts, email_channels, emails, email_participants)
// ============================================================================

import type { Database } from "./database";

// ----------------------------------------------------------------------------
// Types derives du schema
// ----------------------------------------------------------------------------

export type ConnectedAccount = Database["public"]["Tables"]["connected_accounts"]["Row"];
export type ConnectedAccountInsert = Database["public"]["Tables"]["connected_accounts"]["Insert"];
export type EmailChannel = Database["public"]["Tables"]["email_channels"]["Row"];
export type Email = Database["public"]["Tables"]["emails"]["Row"];
export type EmailInsert = Database["public"]["Tables"]["emails"]["Insert"];
export type EmailParticipant = Database["public"]["Tables"]["email_participants"]["Row"];

// ----------------------------------------------------------------------------
// Enums applicatifs
// ----------------------------------------------------------------------------

export type EmailProvider = "gmail" | "microsoft" | "imap_smtp";
export type EmailAccountStatus = "connected" | "disconnected" | "error";
export type EmailDirection = "inbound" | "outbound";
export type EmailParticipantRole = "from" | "to" | "cc" | "bcc";
export type EmailFolder = "inbox" | "sent" | "archive" | "trash" | "drafts";

// ----------------------------------------------------------------------------
// Types composes
// ----------------------------------------------------------------------------

/** Email avec ses participants (pour l'affichage en liste et detail) */
export interface EmailWithParticipants extends Email {
  participants: EmailParticipant[];
}

/** Thread email complet (conversation groupee) */
export interface EmailThread {
  thread_id: string;
  subject: string;
  emails: EmailWithParticipants[];
  last_received_at: string;
  participant_count: number;
  unread_count: number;
}

/** ConnectedAccount sans credentials (pour le frontend — jamais exposer les tokens) */
export type ConnectedAccountSafe = Omit<ConnectedAccount, "credentials_encrypted">;

/** Input pour creer un connected account */
export interface ConnectAccountInput {
  provider: EmailProvider;
  email_address: string;
  display_name?: string | null;
  credentials: Record<string, unknown>;
}

/** Thread avec ses emails charges (alias pour compatibilite) */
export type EmailThreadWithEmails = EmailThread;
