// Stub Microsoft Graph conserve pour stabiliser l'interface des fournisseurs.
// Le fournisseur reste indisponible tant que l'integration OAuth et mail n'est pas implementee.

import type {
  EmailProviderDriver,
  DecryptedCredentials,
  FetchResult,
  OAuthTokens,
  OutgoingEmail,
  SentEmailResult,
} from "./types";
import { ProviderNotAvailableError } from "./types";

export class MicrosoftDriver implements EmailProviderDriver {
  /** Teste la connexion — retourne toujours false (stub) */
  async testConnection(_credentials: DecryptedCredentials): Promise<boolean> {
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

  /** Envoi d'email — non disponible (stub) */
  async sendEmail(
    _credentials: DecryptedCredentials,
    _message: OutgoingEmail,
  ): Promise<SentEmailResult> {
    throw new ProviderNotAvailableError("microsoft", "send");
  }

  /** Echange code OAuth → tokens — non disponible (stub) */
  async exchangeAuthCode(_authCode: string, _redirectUri: string): Promise<OAuthTokens> {
    throw new ProviderNotAvailableError("microsoft", "oauth");
  }

  /** Rafraichit le token d'acces — non disponible (stub) */
  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    throw new ProviderNotAvailableError("microsoft", "refresh");
  }
}
