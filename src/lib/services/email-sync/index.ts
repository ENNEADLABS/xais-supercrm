// Barrel exports — module email-sync

export { GmailDriver } from "./gmail-driver";
export { MicrosoftDriver } from "./microsoft-driver";
export { ImapDriver } from "./imap-driver";
export { syncChannel, syncAllChannels } from "./syncOrchestrator";

export { ProviderNotAvailableError } from "./types";

export type {
  EmailProviderDriver,
  FetchResult,
  RawEmail,
  RawParticipant,
  OAuthTokens,
  DecryptedCredentials,
  SyncResult,
  OutgoingEmail,
  SentEmailResult,
} from "./types";
export { buildMimeMessage, encodeBase64Url } from "./mime-builder";
