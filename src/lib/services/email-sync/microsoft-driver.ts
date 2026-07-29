// Stub Microsoft driver — sera implemente quand l'integration Graph API sera prete
// Endpoints a utiliser en V2 :
//   - GET /me/messages         — lister les messages
//   - GET /me/messages/{id}    — details d'un message
//   - POST /me/sendMail        — envoyer un email
//   - POST /oauth2/v2.0/token  — echange code OAuth / refresh
//   - GET /me/mailFolders/delta — sync incrementale

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
    // TODO V2 : GET https://graph.microsoft.com/v1.0/me avec Bearer token
    return false;
  }

  /** Recupere les emails — retourne toujours un resultat vide (stub) */
  async fetchNewEmails(
    _credentials: DecryptedCredentials,
    _syncCursor: string | null,
    _maxResults?: number,
  ): Promise<FetchResult> {
    // TODO V2 : GET https://graph.microsoft.com/v1.0/me/messages
    //   - Sync initiale : ?$top=50&$orderby=receivedDateTime desc
    //   - Sync incrementale : /me/mailFolders/inbox/messages/delta
    return { emails: [], nextCursor: null, hasMore: false };
  }

  /** Envoi d'email — non disponible (stub) */
  async sendEmail(
    _credentials: DecryptedCredentials,
    _message: OutgoingEmail,
  ): Promise<SentEmailResult> {
    // TODO V2 : POST https://graph.microsoft.com/v1.0/me/sendMail
    throw new ProviderNotAvailableError("microsoft", "send");
  }

  /** Echange code OAuth → tokens — non disponible (stub) */
  async exchangeAuthCode(_authCode: string, _redirectUri: string): Promise<OAuthTokens> {
    // TODO V2 : POST https://login.microsoftonline.com/common/oauth2/v2.0/token
    throw new ProviderNotAvailableError("microsoft", "oauth");
  }

  /** Rafraichit le token d'acces — non disponible (stub) */
  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    // TODO V2 : POST https://login.microsoftonline.com/common/oauth2/v2.0/token
    //   avec grant_type=refresh_token
    throw new ProviderNotAvailableError("microsoft", "refresh");
  }
}
