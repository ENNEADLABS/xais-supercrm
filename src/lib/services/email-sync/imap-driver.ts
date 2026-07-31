// Stub IMAP/SMTP conserve pour stabiliser l'interface des fournisseurs.
// Le fournisseur reste indisponible tant que la connexion et l'envoi ne sont pas implementes.

import type {
  EmailProviderDriver,
  DecryptedCredentials,
  FetchResult,
  OutgoingEmail,
  SentEmailResult,
} from "./types";
import { ProviderNotAvailableError } from "./types";

export class ImapDriver implements EmailProviderDriver {
  /** Teste la connexion IMAP — verifie les credentials puis retourne false (stub) */
  async testConnection(credentials: DecryptedCredentials): Promise<boolean> {
    if (!credentials.imap) return false;
    return false;
  }

  /** Recupere les emails — retourne toujours un resultat vide (stub) */
  async fetchNewEmails(
    _credentials: DecryptedCredentials,
    _syncCursor: string | null,
    _maxResults?: number,
  ): Promise<FetchResult> {
    return { emails: [], nextCursor: null, hasMore: false };
  }

  /** Envoi d'email via SMTP — non disponible (stub) */
  async sendEmail(
    credentials: DecryptedCredentials,
    _message: OutgoingEmail,
  ): Promise<SentEmailResult> {
    if (!credentials.smtp) {
      throw new ProviderNotAvailableError("imap_smtp", "send (no SMTP credentials)");
    }
    throw new ProviderNotAvailableError("imap_smtp", "send");
  }
}
