// Stub IMAP/SMTP driver — sera implemente avec imapflow + nodemailer
// Librairies prevues en V2 :
//   - imapflow     — connexion IMAP moderne (idle, fetch, search)
//   - nodemailer   — envoi SMTP
//   - mailparser   — parsing des messages MIME
// Pas d'OAuth pour IMAP — authentification directe (host/port/user/pass)

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
    // Verification que les credentials IMAP sont presentes
    if (!credentials.imap) return false;

    // TODO V2 : utiliser imapflow pour se connecter au serveur
    //   const client = new ImapFlow({ host, port, secure, auth: { user, pass } })
    //   await client.connect()
    //   await client.logout()
    return false;
  }

  /** Recupere les emails — retourne toujours un resultat vide (stub) */
  async fetchNewEmails(
    _credentials: DecryptedCredentials,
    _syncCursor: string | null,
    _maxResults?: number,
  ): Promise<FetchResult> {
    // TODO V2 : utiliser imapflow pour lister les messages
    //   const client = new ImapFlow(...)
    //   await client.connect()
    //   const lock = await client.getMailboxLock('INBOX')
    //   for await (const msg of client.fetch({ since: lastSync }, { envelope: true, source: true }))
    return { emails: [], nextCursor: null, hasMore: false };
  }

  /** Envoi d'email via SMTP — non disponible (stub) */
  async sendEmail(
    credentials: DecryptedCredentials,
    _message: OutgoingEmail,
  ): Promise<SentEmailResult> {
    // Verification que les credentials SMTP sont presentes
    if (!credentials.smtp) {
      throw new ProviderNotAvailableError("imap_smtp", "send (no SMTP credentials)");
    }

    // TODO V2 : utiliser nodemailer pour envoyer
    //   const transport = nodemailer.createTransport({ host, port, secure, auth })
    //   const info = await transport.sendMail({ from, to, subject, text, html })
    throw new ProviderNotAvailableError("imap_smtp", "send");
  }
}
