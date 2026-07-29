# 0007 — Emails : drivers Strategy, Gmail d'abord, Microsoft/IMAP en stubs

- **Statut** : Accepté
- **Date** : 2026-06-13 (documenté rétroactivement ; décision initiale ~2026-03/04)
- **Décideurs** : mainteneur du projet

## Contexte

Le CRM doit synchroniser et envoyer des emails depuis plusieurs fournisseurs
(Gmail, Microsoft 365, IMAP/SMTP). Implémenter les trois d'un coup retarderait la
livraison ; il faut une architecture extensible mais livrer de la valeur vite.

## Options considérées

- **A — Tout implémenter d'emblée** (Gmail + Microsoft Graph + IMAP/SMTP).
- **B — Interface commune (pattern Strategy) + un seul provider réel d'abord.**
  `EmailProviderDriver` (testConnection, fetchNewEmails, sendEmail, OAuth…),
  Gmail complet, les autres en stubs qui lèvent `ProviderNotAvailableError`.

## Décision

**Option B.** `lib/services/email-sync/` définit `EmailProviderDriver` ;
`GmailDriver` est complet (API REST Gmail, OAuth, sync incrémentale via history
API, envoi MIME) ; `MicrosoftDriver` et `ImapDriver` sont des **stubs V2**
documentés (endpoints/ libs cibles en commentaires). `syncOrchestrator` est
agnostique du provider et déduplique par `message_id`. Tokens chiffrés AES-256-GCM.

## Conséquences

- Positives : valeur livrée vite (Gmail), ajout d'un provider = implémenter une
  interface connue sans toucher à l'orchestrateur ni au schéma. Les stubs sont
  testés (ils doivent lever proprement).
- Négatives / dette acceptée : l'UI propose Microsoft/IMAP comme « bientôt
  disponible » — risque d'attente utilisateur. Sécurité email = surface sensible
  (XSS stocké géré par `sanitizeEmailHtml`, à auditer avant scale).
- À revisiter si : demande client forte pour Microsoft 365 (implémenter
  `MicrosoftDriver` via Graph API + delta sync).
